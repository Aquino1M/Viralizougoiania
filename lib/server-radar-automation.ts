import { createPost, getCategories, getPostIdentityIndex, getPosts, publishAllScheduledNow, publishDuePosts, reclassifyExternalPosts, updatePost } from "@/lib/storage";
import { buildEditorialExcerpt, formatViralizouArticle, needsEditorialRepair } from "@/lib/rewrite";
import { slugify } from "@/lib/slug";
import type { ImportedNews, Post, PostStatus } from "@/lib/types";
import { getAutomationState, saveAutomationState, saveRadarSnapshot, type RadarSnapshotItem } from "@/lib/automation-state";
import { classifyEditorial } from "@/lib/category-classifier";
import { syncBrasileiraoData } from "@/lib/football-sync";
import { hasBrokenEncoding, readResponseTextSmart, repairMojibake } from "@/lib/text-encoding";
import { refreshAudienceSnapshot } from "@/lib/audience-analytics";

type RadarGroup = "goias" | "brasil" | "futebol" | "fofocas";
type RadarSource = { name:string; feedUrl:string; hosts:string[]; group:RadarGroup; category?: "Futebol" | "Fofocas" };

const SOURCES: RadarSource[] = [
  { name:"G1 Goiás", feedUrl:"https://g1.globo.com/rss/g1/go/goias/", hosts:["g1.globo.com"], group:"goias" },
  { name:"A Redação", feedUrl:"https://aredacao.com.br/feed/", hosts:["aredacao.com.br","www.aredacao.com.br"], group:"goias" },
  { name:"Diário de Goiás", feedUrl:"https://diariodegoias.com.br/feed/", hosts:["diariodegoias.com.br","www.diariodegoias.com.br"], group:"goias" },
  { name:"Curta Mais", feedUrl:"https://curtamais.com.br/goiania/feed/", hosts:["curtamais.com.br","www.curtamais.com.br"], group:"goias" },
  { name:"Dia Online", feedUrl:"https://diaonline.ig.com.br/feed/", hosts:["diaonline.ig.com.br"], group:"goias" },
  { name:"Metrópoles Goiás", feedUrl:"https://www.metropoles.com/distrito-federal/entorno/feed", hosts:["metropoles.com","www.metropoles.com"], group:"goias" },
  { name:"Goiás 24 Horas", feedUrl:"https://goias24horas.com.br/feed/", hosts:["goias24horas.com.br","www.goias24horas.com.br"], group:"goias" },

  { name:"G1 Brasil", feedUrl:"https://g1.globo.com/rss/g1/", hosts:["g1.globo.com"], group:"brasil" },
  { name:"CNN Brasil", feedUrl:"https://www.cnnbrasil.com.br/feed/", hosts:["cnnbrasil.com.br","www.cnnbrasil.com.br"], group:"brasil" },
  { name:"Metrópoles", feedUrl:"https://www.metropoles.com/feed", hosts:["metropoles.com","www.metropoles.com"], group:"brasil" },
  { name:"Folha de S.Paulo", feedUrl:"https://feeds.folha.uol.com.br/emcimadahora/rss091.xml", hosts:["folha.uol.com.br","feeds.folha.uol.com.br"], group:"brasil" },
  { name:"UOL Notícias", feedUrl:"https://rss.uol.com.br/feed/noticias.xml", hosts:["uol.com.br","rss.uol.com.br"], group:"brasil" },
  { name:"G1 Política", feedUrl:"https://g1.globo.com/rss/g1/politica/", hosts:["g1.globo.com"], group:"brasil" },
  { name:"G1 Economia", feedUrl:"https://g1.globo.com/rss/g1/economia/", hosts:["g1.globo.com"], group:"brasil" },
  { name:"Agência Brasil", feedUrl:"https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml", hosts:["agenciabrasil.ebc.com.br"], group:"brasil" },

  { name:"GE Brasileirão", feedUrl:"https://ge.globo.com/rss/ge/futebol/brasileirao-serie-a/", hosts:["ge.globo.com"], group:"futebol", category:"Futebol" },
  { name:"GE Futebol", feedUrl:"https://ge.globo.com/rss/ge/futebol/", hosts:["ge.globo.com"], group:"futebol", category:"Futebol" },
  { name:"GE Goiás & Clubes", feedUrl:"https://ge.globo.com/rss/ge/go/", hosts:["ge.globo.com"], group:"futebol", category:"Futebol" },
  { name:"Metrópoles Futebol", feedUrl:"https://www.metropoles.com/esportes/futebol/feed", hosts:["metropoles.com","www.metropoles.com"], group:"futebol", category:"Futebol" },
  { name:"Gazeta Esportiva", feedUrl:"https://www.gazetaesportiva.com/feed/", hosts:["gazetaesportiva.com","www.gazetaesportiva.com"], group:"futebol", category:"Futebol" },
  { name:"UOL Esporte", feedUrl:"https://rss.uol.com.br/feed/esporte.xml", hosts:["uol.com.br","rss.uol.com.br"], group:"futebol", category:"Futebol" },
  { name:"Lance Futebol Nacional", feedUrl:"https://www.lance.com.br/futebol-nacional/feed", hosts:["lance.com.br","www.lance.com.br"], group:"futebol", category:"Futebol" },
  { name:"Lance Brasileirão", feedUrl:"https://www.lance.com.br/brasileirao/feed", hosts:["lance.com.br","www.lance.com.br"], group:"futebol", category:"Futebol" },

  { name:"Portal LeoDias", feedUrl:"https://portalleodias.com/feed", hosts:["portalleodias.com","www.portalleodias.com"], group:"fofocas", category:"Fofocas" },
  { name:"Revista Quem", feedUrl:"https://revistaquem.globo.com/rss/quem/", hosts:["revistaquem.globo.com"], group:"fofocas", category:"Fofocas" },
  { name:"Metrópoles Celebridades", feedUrl:"https://www.metropoles.com/celebridades/feed", hosts:["metropoles.com","www.metropoles.com"], group:"fofocas", category:"Fofocas" },
  { name:"Hugo Gloss", feedUrl:"https://hugogloss.uol.com.br/feed/", hosts:["hugogloss.uol.com.br"], group:"fofocas", category:"Fofocas" },
  { name:"UOL Famosos", feedUrl:"https://rss.uol.com.br/feed/entretenimento.xml", hosts:["uol.com.br","rss.uol.com.br"], group:"fofocas", category:"Fofocas" },
  { name:"OFuxico • A Fazenda", feedUrl:"https://ofuxico.com.br/reality-show/a-fazenda/feed/", hosts:["ofuxico.com.br","www.ofuxico.com.br"], group:"fofocas", category:"Fofocas" }
];

const STOP=new Set(["de","da","do","das","dos","a","o","as","os","e","em","no","na","nos","nas","um","uma","para","por","com","que","se","ao","aos","goias","goiás","goiania","goiânia"]);

function decodeEntities(value=""){
  const named:Record<string,string>={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",hellip:"…",mdash:"—",ndash:"–"};
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi,function(_,code:string){
    if(code[0]==="#"){const hex=code[1]&&code[1].toLowerCase()==="x";const n=Number.parseInt(code.slice(hex?2:1),hex?16:10);return Number.isFinite(n)?String.fromCodePoint(n):"";}
    return named[code.toLowerCase()]||"&"+code+";";
  });
}
function cleanText(value=""){return repairMojibake(decodeEntities(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/<br\s*\/?>/gi,"\n").replace(/<\/(?:p|div|li|h[1-6]|section|article)>/gi,"\n").replace(/<[^>]+>/g," ")).replace(/\s*\n\s*/g,"\n").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").replace(/\[\s*(?:…|\.{3}|&hellip;)\s*\]/gi,"").trim());}
function tag(block:string,name:string){const safe=name.replace(/[.*+?^$()|[\]\\]/g,"\\$&");const m=block.match(new RegExp("<"+safe+"\\b[^>]*>([\\s\\S]*?)<\\/"+safe+">","i"));return m&&m[1]?m[1]:"";}
function absoluteUrl(value:string,base:string){try{return new URL(value,base).toString();}catch{return "";}}
function safeIso(value=""){if(!value||Number.isNaN(Date.parse(value)))return null;return new Date(value).toISOString();}
function feedLink(block:string){const m=block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);return m&&m[1]?m[1]:cleanText(tag(block,"link"));}
function feedImage(block:string,base:string){
  const ms=[block.match(/<media:content\b[^>]*url=["']([^"']+)["'][^>]*>/i),block.match(/<media:thumbnail\b[^>]*url=["']([^"']+)["'][^>]*>/i),block.match(/<enclosure\b[^>]*url=["']([^"']+)["'][^>]*type=["']image\//i),block.match(/<img\b[^>]*src=["']([^"']+)["']/i)];
  for(const m of ms)if(m&&m[1])return absoluteUrl(m[1],base);return "";
}
function canonicalUrl(raw:string){try{const u=new URL(raw);u.hash="";["utm_source","utm_medium","utm_campaign","utm_content","utm_term","output"].forEach(k=>u.searchParams.delete(k));return u.toString().replace(/\/$/,"").toLowerCase();}catch{return raw.split("#")[0].split("?")[0].replace(/\/$/,"").toLowerCase();}}
function titleTokens(title:string){return slugify(title).split("-").filter(w=>w.length>2&&!STOP.has(w));}
function titleSimilarity(a:string,b:string){const aa=new Set(titleTokens(a)),bb=new Set(titleTokens(b));if(!aa.size||!bb.size)return 0;let common=0;aa.forEach(w=>{if(bb.has(w))common++;});return common/Math.max(aa.size,bb.size);}
function isAllowedArticleUrl(raw:string,source:RadarSource){try{const u=new URL(raw);if(u.protocol!=="http:"&&u.protocol!=="https:")return false;const host=u.hostname.toLowerCase();return source.hosts.some(h=>{const base=h.replace(/^www\./,"");return host===h||host===base||host.endsWith("."+base);});}catch{return false;}}
async function fetchText(url:string,timeout=9000){const res=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(timeout),headers:{"User-Agent":"Mozilla/5.0 (compatible; ViralizougoianiaBot/2.0; +https://viralizougoiania.vercel.app)","Accept-Language":"pt-BR,pt;q=0.9",Accept:"text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.7"}});if(!res.ok)throw new Error("HTTP "+res.status);return await readResponseTextSmart(res,3000000);}

async function fetchSource(source:RadarSource):Promise<ImportedNews[]>{
  const xml=await fetchText(source.feedUrl,10000);
  const blocks=xml.match(/<item\b[\s\S]*?<\/item>/gi)||xml.match(/<entry\b[\s\S]*?<\/entry>/gi)||[];
  const items:ImportedNews[]=[];
  for(const block of blocks.slice(0,30)){
    const title=cleanText(tag(block,"title"));const link=absoluteUrl(feedLink(block),source.feedUrl);
    if(!title||!link||!isAllowedArticleUrl(link,source))continue;
    const desc=cleanText(tag(block,"description")||tag(block,"summary"));
    const encoded=cleanText(tag(block,"content:encoded")||tag(block,"content"));
    const sourceText=encoded.length>desc.length?encoded:desc;
    const pub=cleanText(tag(block,"pubDate")||tag(block,"published")||tag(block,"updated"));
    const category=source.category||classifyEditorial({title,excerpt:sourceText,source_name:source.name,source_url:link});
    const excerpt=buildEditorialExcerpt(desc||sourceText,title,240);
    items.push({title,excerpt:excerpt||title,content:"",source_content:sourceText,category,image_url:feedImage(block,source.feedUrl),image_credit:"Foto: Reprodução / "+source.name,video_url:"",source_name:source.name,source_url:link,source_author:"",published_at:safeIso(pub)});
  }
  return items;
}

function dedupeIncoming(items:ImportedNews[],posts:Array<Pick<Post,"slug"|"title"|"source_url">>){
  const postUrls=new Set(posts.map(p=>p.source_url?canonicalUrl(p.source_url):"").filter(Boolean));
  const postSlugs=new Set(posts.map(p=>p.slug));const result:ImportedNews[]=[];const urls=new Set<string>(),slugs=new Set<string>();
  const sorted=items.slice().sort((a,b)=>+new Date(b.published_at||0)-+new Date(a.published_at||0));
  for(const item of sorted){
    if(!item.image_url||item.image_url.trim().length<10)continue;
    const url=canonicalUrl(item.source_url),slug=slugify(item.title);
    if(!url||postUrls.has(url)||urls.has(url)||postSlugs.has(slug)||slugs.has(slug))continue;
    if(posts.some(p=>titleSimilarity(p.title,item.title)>=0.86)||result.some(p=>titleSimilarity(p.title,item.title)>=0.86))continue;
    urls.add(url);slugs.add(slug);result.push(item);
  }
  return result;
}
async function parallelMap<T,R>(items:T[],concurrency:number,worker:(item:T,index:number)=>Promise<R>){const out=new Array<R>(items.length);let cursor=0;async function runner(){while(true){const index=cursor++;if(index>=items.length)return;out[index]=await worker(items[index],index);}}await Promise.all(Array.from({length:Math.min(concurrency,items.length)},()=>runner()));return out;}

async function repairSavedEncoding(posts:Post[],items:ImportedNews[],errors:string[]){
  const freshByUrl=new Map<string,ImportedNews>();
  for(const item of items){
    const key=canonicalUrl(item.source_url||"");
    if(key&&!freshByUrl.has(key))freshByUrl.set(key,item);
  }

  const candidates=posts.flatMap(post=>{
    const broken=[post.title,post.excerpt,post.content,post.source_content,post.seo_title,post.seo_description].some(hasBrokenEncoding);
    if(!broken||!post.source_url)return[];
    const fresh=freshByUrl.get(canonicalUrl(post.source_url));
    return fresh?[{post,fresh}]:[];
  });

  if(!candidates.length)return 0;

  const results=await parallelMap(candidates,4,async({post,fresh})=>{
    const sourceText=repairMojibake(fresh.source_content||fresh.excerpt||fresh.title||"");
    const cleanTitle=repairMojibake(fresh.title||"");
    const cleanExcerpt=repairMojibake(fresh.excerpt||"");
    const patch:Record<string,unknown>={
      source_name:post.source_name||fresh.source_name,
      source_url:post.source_url,
    };
    let changed=false;

    if(hasBrokenEncoding(post.title)&&cleanTitle&&!hasBrokenEncoding(cleanTitle)){patch.title=cleanTitle;changed=true;}
    if(hasBrokenEncoding(post.excerpt)&&cleanExcerpt&&!hasBrokenEncoding(cleanExcerpt)){patch.excerpt=cleanExcerpt;changed=true;}
    if(hasBrokenEncoding(post.source_content)&&sourceText&&!hasBrokenEncoding(sourceText)){patch.source_content=sourceText;changed=true;}
    if(hasBrokenEncoding(post.seo_title)&&cleanTitle&&!hasBrokenEncoding(cleanTitle)){patch.seo_title=cleanTitle;changed=true;}
    if(hasBrokenEncoding(post.seo_description)&&cleanExcerpt&&!hasBrokenEncoding(cleanExcerpt)){patch.seo_description=cleanExcerpt;changed=true;}

    if(hasBrokenEncoding(post.content)&&sourceText&&!hasBrokenEncoding(sourceText)){
      patch.content=formatViralizouArticle({
        title:(patch.title as string)||post.title,
        excerpt:(patch.excerpt as string)||post.excerpt,
        sourceText,
        sourceName:fresh.source_name||post.source_name||"Fonte",
        category:post.category,
      });
      changed=true;
    }

    if(!changed)return false;
    try{
      await updatePost(post.id,patch);
      return true;
    }catch(e){
      errors.push("Correção de acentuação: "+(e instanceof Error?e.message:"falha ao atualizar"));
      return false;
    }
  });
  return results.filter(Boolean).length;
}
async function repairSavedEditorialFormatting(posts:Post[],errors:string[]){
  const candidates=posts.filter((post)=>Boolean(post.source_name||post.source_url)&&needsEditorialRepair(post)).slice(0,50);
  if(!candidates.length)return 0;

  const results=await parallelMap(candidates,6,async(post)=>{
    const sourceText=post.source_content||post.content||post.excerpt||post.title;
    const excerpt=buildEditorialExcerpt(post.excerpt||sourceText,post.title,240);
    const content=formatViralizouArticle({
      title:post.title,
      excerpt:post.excerpt,
      sourceText,
      sourceName:post.source_name,
      category:post.category,
    });
    try{
      await updatePost(post.id,{
        excerpt:excerpt||post.excerpt,
        content:content||post.content,
        seo_description:buildEditorialExcerpt(post.seo_description||post.excerpt||sourceText,post.title,240),
      });
      return true;
    }catch(e){
      errors.push("Formatação editorial: "+(e instanceof Error?e.message:"falha ao atualizar"));
      return false;
    }
  });
  return results.filter(Boolean).length;
}

type ServerQueueMode="1_per_10m"|"2_per_10m"|"3_per_10m"|"50_per_10m"|"50_per_1m"|"1_per_category"|"3_per_category";

function planSchedule(items:ImportedNews[],posts:Post[],intervalMinutes:number,queueMode:ServerQueueMode){
  const future=posts.filter(p=>p.status==="scheduled"&&p.published_at&&new Date(p.published_at).getTime()>Date.now()).sort((a,b)=>+new Date(a.published_at||0)-+new Date(b.published_at||0));
  let baseTime=Date.now();if(future.length)baseTime=Math.max(baseTime,+new Date(future[future.length-1].published_at||0));
  const planned:Array<{item:ImportedNews;publishedAt:string}>=[];

  if(queueMode==="1_per_category"||queueMode==="3_per_category"){
    const perCategory=queueMode==="3_per_category"?3:1;
    const groups=new Map<string,ImportedNews[]>();
    for(const item of items){const cat=item.category||"Goiânia";if(!groups.has(cat))groups.set(cat,[]);groups.get(cat)!.push(item);}
    let step=1,hasMore=true;
    while(hasMore){
      hasMore=false;
      groups.forEach(list=>{
        for(let i=0;i<perCategory;i++){
          const item=list.shift();
          if(!item)break;
          hasMore=true;
          planned.push({item,publishedAt:new Date(baseTime+step*intervalMinutes*60000).toISOString()});
        }
      });
      if(hasMore)step++;
    }
    return planned;
  }

  const perSlot=(queueMode==="50_per_1m"||queueMode==="50_per_10m")?50:queueMode==="3_per_10m"?3:queueMode==="2_per_10m"?2:1;
  items.forEach((item,index)=>{
    const step=Math.floor(index/perSlot)+1;
    planned.push({item,publishedAt:new Date(baseTime+step*intervalMinutes*60000).toISOString()});
  });
  return planned;
}

export type AutomationRunResult={ok:boolean;skipped?:boolean;reason?:string;found:number;newItems:number;added:number;published:number;resetPublished?:number;reclassified:number;audience?:{updatedAt:string;pageviewsToday:number;articleViewsToday:number}|null;football:{updated:boolean;round:number;fixtures:number;updatedAt:string|null};sourceCounts:Record<string,number>;errors:string[];startedAt:string;finishedAt:string;};

export async function runServerRadarAutomation(options:{force?:boolean}={}):Promise<AutomationRunResult>{
  const startedAt=new Date().toISOString();const state=await getAutomationState();
  const emptyFootball={updated:false,round:0,fixtures:0,updatedAt:null as string|null};
  if(!options.force&&!state.enabled)return{ok:true,skipped:true,reason:"paused",found:0,newItems:0,added:0,published:0,reclassified:0,football:emptyFootball,sourceCounts:{},errors:[],startedAt,finishedAt:new Date().toISOString()};
  if(!options.force&&state.running_until&&new Date(state.running_until).getTime()>Date.now())return{ok:true,skipped:true,reason:"already-running",found:0,newItems:0,added:0,published:0,reclassified:0,football:emptyFootball,sourceCounts:{},errors:[],startedAt,finishedAt:new Date().toISOString()};
  const queueMode:ServerQueueMode=(state.queue_mode==="50_per_10m"?"50_per_1m":state.queue_mode) as ServerQueueMode;
  const intervalMinutes=queueMode==="50_per_1m"?1:Math.max(1,Number(state.interval_minutes||1));
  await saveAutomationState({running_until:new Date(Date.now()+8*60000).toISOString(),last_run_at:startedAt,last_error:""});
  const errors:string[]=[];let found=0,newItems=0,added=0,published=0,resetPublished=0,reclassified=0;const sourceCounts:Record<string,number>={goias:0,brasil:0,futebol:0,fofocas:0};let football=emptyFootball;let audience:null|{updatedAt:string;pageviewsToday:number;articleViewsToday:number}=null;
  try{
    const recat=await reclassifyExternalPosts();reclassified=recat.changed;

    // Publica toda a fila antiga uma única vez para começar do zero.
    if(Number(state.queue_reset_version||0)<1){
      try{
        resetPublished=await publishAllScheduledNow();
        published+=resetPublished;
        await saveAutomationState({
          queue_mode:"50_per_1m",
          interval_minutes:1,
          queue_reflow_version:1,
          queue_reset_version:1,
        });
      }catch(e){
        errors.push("Reset da fila: "+(e instanceof Error?e.message:"falha ao publicar fila antiga"));
      }
    }

    const released=await publishDuePosts();published+=released.length;

    // Mesma execução do GitHub Actions atualiza também o resumo de audiência.
    try{
      audience=await refreshAudienceSnapshot();
    }catch(e){
      errors.push("Audiência: "+(e instanceof Error?e.message:"falha ao atualizar"));
    }
    const [posts,postIdentityIndex,categories,sourceResults,footballResult]=await Promise.all([
      getPosts({includeDrafts:true}),
      getPostIdentityIndex(),
      getCategories({includeInactive:false}),
      Promise.allSettled(SOURCES.map(fetchSource)),
      syncBrasileiraoData().then(data=>({ok:true as const,data})).catch(error=>({ok:false as const,error}))
    ]);
    const all:ImportedNews[]=[];
    const radarSnapshotItems:RadarSnapshotItem[]=[];
    sourceResults.forEach((result,index)=>{
      const src=SOURCES[index];
      if(result.status==="fulfilled"){
        all.push(...result.value);
        sourceCounts[src.group]=(sourceCounts[src.group]||0)+result.value.length;
        for(const item of result.value){
          radarSnapshotItems.push({
            title:item.title,
            excerpt:item.excerpt||"",
            category:item.category,
            image_url:item.image_url||"",
            video_url:item.video_url||"",
            source_name:item.source_name||src.name,
            source_url:item.source_url,
            source_author:item.source_author||"",
            published_at:item.published_at||null,
            radar_group:src.group,
          });
        }
      } else {
        errors.push(src.name+": "+(result.reason instanceof Error?result.reason.message:"falha no feed"));
      }
    });
    found=all.length;

    // Corrige automaticamente matérias antigas que foram salvas com �/Ã/Â,
    // usando a mesma URL da fonte e o texto recém-lido com o charset correto.
    await repairSavedEncoding(posts,all,errors);
    const formattedRepairs=await repairSavedEditorialFormatting(posts,errors);

    try {
      await saveRadarSnapshot({
        updated_at:new Date().toISOString(),
        items:radarSnapshotItems,
        source_counts:sourceCounts,
      });
    } catch (e) {
      errors.push("Radar snapshot: "+(e instanceof Error?e.message:"falha ao salvar"));
    }
    if(footballResult.ok){
      football={updated:true,round:footballResult.data.currentRound,fixtures:footballResult.data.fixtures.length,updatedAt:footballResult.data.updated_at};
    }else errors.push("Tabela/Jogos: "+(footballResult.error instanceof Error?footballResult.error.message:"falha na sincronização"));

    const categoryNames=new Set(categories.map(c=>c.name.toLowerCase()));const builtIn=new Set(["fofocas","fofoca","futebol"]);
    all.forEach(item=>{const cat=(item.category||"").toLowerCase();if(!cat||(!categoryNames.has(cat)&&!builtIn.has(cat)))item.category="Goiânia";});
    const unseen=dedupeIncoming(all,postIdentityIndex);newItems=unseen.length;const planned=planSchedule(unseen,posts,intervalMinutes,queueMode);
    const created=await parallelMap(planned,6,async plannedItem=>{
      const item=plannedItem.item;const sourceText=item.source_content||item.excerpt||item.title;
      const content=formatViralizouArticle({title:item.title,excerpt:item.excerpt,sourceText,sourceName:item.source_name,category:item.category});
      try{
        return await createPost({slug:slugify(item.title),title:item.title,excerpt:item.excerpt||item.title,content,source_content:sourceText,category:item.category||"Goiânia",city:"Goiânia",author:item.source_author?item.source_author+" | "+item.source_name:(item.source_name||"Redação"),image_url:item.image_url||"",image_credit:item.image_credit||("Foto: Reprodução / "+(item.source_name||"Fonte")),video_url:item.video_url||"",featured:false,status:"scheduled" as PostStatus,published_at:plannedItem.publishedAt,source_name:item.source_name||"",source_url:item.source_url||"",source_author:item.source_author||"",seo_title:item.title,seo_description:item.excerpt||item.title,seo_keywords:"Goiânia, Goiás, "+(item.category||"Goiânia")});
      }catch(e){errors.push("Agendamento: "+(e instanceof Error?e.message:"erro desconhecido"));return null;}
    });
    added=created.filter(Boolean).length;
    const finishedAt=new Date().toISOString();
    await saveAutomationState({running_until:null,last_success_at:finishedAt,next_run_at:new Date(Date.now()+10*60000).toISOString(),last_found:found,last_added:added,last_published:published,last_hydrated:formattedRepairs,last_reclassified:reclassified,last_football_sync:football.updatedAt,last_round:football.round,last_fixtures:football.fixtures,last_source_counts:sourceCounts,last_error:errors.join(" | ").slice(0,1500)});
    return{ok:true,found,newItems,added,published,resetPublished,reclassified,audience,football,sourceCounts,errors,startedAt,finishedAt};
  }catch(e){
    const message=e instanceof Error?e.message:"Erro inesperado";errors.push(message);const finishedAt=new Date().toISOString();
    try{await saveAutomationState({running_until:null,next_run_at:new Date(Date.now()+intervalMinutes*60000).toISOString(),last_error:errors.join(" | ").slice(0,1500)});}catch{}
    return{ok:false,found,newItems,added,published,resetPublished,reclassified,audience,football,sourceCounts,errors,startedAt,finishedAt};
  }
}
