export type LiveHeadline = {
  title: string;
  url: string;
  source: string;
  sourceKey: string;
  image: string;
  publishedText: string;
  team?: string;
};

export type StandingRow = {
  position: number;
  team: string;
  abbr: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  efficiency: number;
};

export type FootballTeam = {
  slug: string;
  name: string;
  short: string;
  aliases: string[];
};

export const FOOTBALL_TEAMS: FootballTeam[] = [
  {slug:"athletico",name:"Athletico-PR",short:"CAP",aliases:["athletico","athletico-pr","furacão"]},
  {slug:"atletico-mg",name:"Atlético-MG",short:"CAM",aliases:["atlético-mg","atletico-mg","galo"]},
  {slug:"bahia",name:"Bahia",short:"BAH",aliases:["bahia","esquadrão"]},
  {slug:"botafogo",name:"Botafogo",short:"BOT",aliases:["botafogo","glorioso"]},
  {slug:"chapecoense",name:"Chapecoense",short:"CHA",aliases:["chapecoense","chape"]},
  {slug:"corinthians",name:"Corinthians",short:"COR",aliases:["corinthians","timão","timao"]},
  {slug:"coritiba",name:"Coritiba",short:"CFC",aliases:["coritiba","coxa"]},
  {slug:"cruzeiro",name:"Cruzeiro",short:"CRU",aliases:["cruzeiro","raposa"]},
  {slug:"flamengo",name:"Flamengo",short:"FLA",aliases:["flamengo","mengão","mengao"]},
  {slug:"fluminense",name:"Fluminense",short:"FLU",aliases:["fluminense","tricolor carioca"]},
  {slug:"gremio",name:"Grêmio",short:"GRE",aliases:["grêmio","gremio","imortal"]},
  {slug:"internacional",name:"Internacional",short:"INT",aliases:["internacional","inter","colorado"]},
  {slug:"mirassol",name:"Mirassol",short:"MIR",aliases:["mirassol"]},
  {slug:"palmeiras",name:"Palmeiras",short:"PAL",aliases:["palmeiras","verdão","verdao"]},
  {slug:"red-bull-bragantino",name:"Red Bull Bragantino",short:"RBB",aliases:["bragantino","red bull bragantino","massa bruta"]},
  {slug:"remo",name:"Remo",short:"REM",aliases:["remo","clube do remo","leão azul"]},
  {slug:"santos",name:"Santos",short:"SAN",aliases:["santos","peixe"]},
  {slug:"sao-paulo",name:"São Paulo",short:"SAO",aliases:["são paulo","sao paulo","tricolor paulista"]},
  {slug:"vasco",name:"Vasco",short:"VAS",aliases:["vasco","vasco da gama","cruz-maltino"]},
  {slug:"vitoria",name:"Vitória",short:"VIT",aliases:["vitória","vitoria","leão da barra"]}
];

type PageSource = {
  key: string;
  name: string;
  url: string;
  host: string;
  pathHints?: string[];
  sourceType: "football" | "gossip";
};

function decodeEntities(value=""){
  const named:Record<string,string>={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",hellip:"…",mdash:"—",ndash:"–"};
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi,function(_,code:string){
    if(code[0]==="#"){
      const hex=code[1]&&code[1].toLowerCase()==="x";
      const n=Number.parseInt(code.slice(hex?2:1),hex?16:10);
      return Number.isFinite(n)?String.fromCodePoint(n):"";
    }
    return named[code.toLowerCase()]||"&"+code+";";
  });
}

function cleanText(value=""){
  return decodeEntities(value.replace(/<!--[\s\S]*?-->/g," ").replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," "))
    .replace(/\s+/g," ")
    .trim();
}

function absoluteUrl(raw:string,base:string){
  try{return new URL(raw,base).toString();}catch{return "";}
}

function normalizeHost(host:string){
  return host.toLowerCase().replace(/^www\./,"");
}

function sameHost(raw:string,host:string){
  try{
    const h=normalizeHost(new URL(raw).hostname);
    const base=normalizeHost(host);
    return h===base||h.endsWith("."+base);
  }catch{return false;}
}

function extractDate(context:string){
  const patterns=[
    /\b(\d{2}\/\d{2}\/\d{4}\s+\d{2}h\d{2})\b/,
    /\b(\d{2}\/\d{2}\/\d{4})\b/,
    /\b(\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2})\b/,
    /\b(há\s+\d+\s+(?:minutos?|horas?|dias?))\b/i
  ];
  for(const p of patterns){
    const m=context.match(p);
    if(m&&m[1])return cleanText(m[1]);
  }
  return "";
}

function extractImage(block:string,base:string){
  const patterns=[
    /<img\b[^>]*src=["']([^"']+)["']/i,
    /<img\b[^>]*data-src=["']([^"']+)["']/i,
    /<img\b[^>]*data-lazy-src=["']([^"']+)["']/i
  ];
  for(const p of patterns){
    const m=block.match(p);
    if(m&&m[1]){
      const u=absoluteUrl(m[1],base);
      if(u&&!/logo|avatar|icon|sprite|favicon/i.test(u))return u;
    }
  }
  return "";
}

function pathLooksUseful(url:string,source:PageSource){
  try{
    const path=new URL(url).pathname.toLowerCase();
    if(/\/(tag|autor|author|category|categorias|newsletter|assine|termos|politica-de-privacidade)\//.test(path))return false;
    if(source.pathHints&&source.pathHints.length&&!source.pathHints.some(h=>path.includes(h)))return false;
    return path.split("/").filter(Boolean).length>=2;
  }catch{return false;}
}

function extractHeadlines(html:string,source:PageSource,team?:FootballTeam,sourceAlreadyTeamBound=false){
  const items:LiveHeadline[]=[];
  const seen=new Set<string>();
  const anchor=/<a\b[^>]*href\s*=\s*(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let m:RegExpExecArray|null;
  while((m=anchor.exec(html))){
    const url=absoluteUrl(m[2],source.url);
    if(!url||!sameHost(url,source.host)||!pathLooksUseful(url,source))continue;
    const title=cleanText(m[3]);
    if(title.length<28||title.length>210)continue;
    if(/^(início|home|futebol|celebs|famosos|últimas|ver mais|mais notícias|tabela|classificação|times)$/i.test(title))continue;
    if(team&&!sourceAlreadyTeamBound){
      const low=title.toLocaleLowerCase("pt-BR");
      if(!team.aliases.some(a=>low.includes(a.toLocaleLowerCase("pt-BR"))))continue;
    }
    const canonical=url.split("#")[0];
    if(seen.has(canonical))continue;
    seen.add(canonical);
    const context=html.slice(m.index,Math.min(html.length,m.index+m[0].length+500));
    items.push({
      title,
      url:canonical,
      source:source.name,
      sourceKey:source.key,
      image:extractImage(m[3]+context,source.url),
      publishedText:extractDate(context),
      team:team?.name
    });
    if(items.length>=18)break;
  }
  return items;
}

async function fetchPage(source:PageSource,team?:FootballTeam,sourceAlreadyTeamBound=false){
  try{
    const res=await fetch(source.url,{
      headers:{
        "User-Agent":"Mozilla/5.0 (compatible; Viralizougoiania/1.0)",
        "Accept-Language":"pt-BR,pt;q=0.9",
        Accept:"text/html,application/xhtml+xml"
      },
      next:{revalidate:300},
      signal:AbortSignal.timeout(10000)
    });
    if(!res.ok)return [] as LiveHeadline[];
    const html=(await res.text()).slice(0,3000000);
    return extractHeadlines(html,source,team,sourceAlreadyTeamBound);
  }catch{
    return [] as LiveHeadline[];
  }
}

function dedupe(items:LiveHeadline[]){
  const out:LiveHeadline[]=[];
  const seenUrl=new Set<string>();
  const seenTitle=new Set<string>();
  for(const item of items){
    const title=item.title.toLocaleLowerCase("pt-BR").replace(/\s+/g," ").trim();
    if(seenUrl.has(item.url)||seenTitle.has(title))continue;
    seenUrl.add(item.url);seenTitle.add(title);out.push(item);
  }
  return out;
}

export async function getGossipHeadlines(sourceKey?:string){
  const sources:PageSource[]=[
    {key:"leodias",name:"Portal LeoDias",url:"https://portalleodias.com/famosos/",host:"portalleodias.com",pathHints:["/famosos/","/reality-shows/","/redes-sociais/","/tv/"],sourceType:"gossip"},
    {key:"uol",name:"UOL Splash Celebs",url:"https://www.uol.com.br/splash/celebs/",host:"uol.com.br",pathHints:["/splash/"],sourceType:"gossip"},
    {key:"fazenda",name:"OFuxico • A Fazenda",url:"https://ofuxico.com.br/a-fazenda/",host:"ofuxico.com.br",pathHints:["/a-fazenda/","/reality-show/a-fazenda/"],sourceType:"gossip"}
  ];
  const selected=sourceKey?sources.filter(s=>s.key===sourceKey):sources;
  const results=await Promise.all(selected.map(s=>fetchPage(s)));
  return dedupe(results.flat()).slice(0,36);
}

export async function getFootballHeadlines(teamSlug?:string){
  const team=teamSlug?FOOTBALL_TEAMS.find(t=>t.slug===teamSlug):undefined;
  const uolUrl=team?"https://www.uol.com.br/esporte/futebol/times/"+team.slug+"/":"https://www.uol.com.br/esporte/futebol/";
  const sources:PageSource[]=[
    {key:"ge",name:"ge",url:"https://ge.globo.com/futebol/",host:"ge.globo.com",pathHints:["/futebol/","/times/","/brasileirao-serie-a/"],sourceType:"football"},
    {key:"uol-futebol",name:"UOL Futebol",url:uolUrl,host:"uol.com.br",pathHints:["/esporte/futebol/"],sourceType:"football"},
    {key:"lance",name:"Lance!",url:"https://www.lance.com.br/futebol-nacional/mais-noticias",host:"lance.com.br",pathHints:["/futebol-nacional/","/brasileirao","/flamengo","/palmeiras","/corinthians","/santos","/vasco","/botafogo","/fluminense","/sao-paulo","/atletico-mineiro","/cruzeiro","/gremio","/internacional","/bahia"],sourceType:"football"}
  ];
  const results=await Promise.all(sources.map(s=>fetchPage(s,team,Boolean(team&&s.key==="uol-futebol"))));
  return dedupe(results.flat()).slice(0,42);
}

export async function getBrasileiraoTable():Promise<StandingRow[]>{
  const url="https://www.lance.com.br/tabela/brasileirao";
  try{
    const res=await fetch(url,{
      headers:{
        "User-Agent":"Mozilla/5.0 (compatible; Viralizougoiania/1.0)",
        "Accept-Language":"pt-BR,pt;q=0.9"
      },
      next:{revalidate:600},
      signal:AbortSignal.timeout(10000)
    });
    if(!res.ok)return [];
    const html=(await res.text()).slice(0,3500000);
    const headerIndex=html.search(/title=["']Pontos["']/i);
    const start=html.indexOf("<tbody",headerIndex>=0?headerIndex:0);
    const end=start>=0?html.indexOf("</tbody>",start):-1;
    if(start<0||end<0)return [];
    const body=html.slice(start,end+8);
    const rows=body.match(/<tr\b[\s\S]*?<\/tr>/gi)||[];
    const out:StandingRow[]=[];

    for(const row of rows){
      const img=row.match(/<img\b[^>]*alt=["']([^"']+)["']/i);
      const team=img&&img[1]?cleanText(img[1]):"";
      const cells=row.match(/<td\b[\s\S]*?<\/td>/gi)||[];
      if(!team||cells.length<10)continue;
      const first=cleanText(cells[0]);
      const posMatch=first.match(/(\d+)\s*°/);
      const nums=cells.slice(1,10).map(c=>Number(cleanText(c).replace(/[^\d-]/g,"")));
      if(!posMatch||nums.some(n=>!Number.isFinite(n)))continue;
      const abbrMatch=first.match(/\b([A-Z]{3})\s*$/);
      out.push({
        position:Number(posMatch[1]),
        team,
        abbr:abbrMatch?abbrMatch[1]:team.slice(0,3).toUpperCase(),
        points:nums[0],
        played:nums[1],
        wins:nums[2],
        draws:nums[3],
        losses:nums[4],
        goalsFor:nums[5],
        goalsAgainst:nums[6],
        goalDiff:nums[7],
        efficiency:nums[8]
      });
    }
    return out.slice(0,20);
  }catch{
    return [];
  }
}

export function postMatchesTeam(text:string,team?:FootballTeam){
  if(!team)return true;
  const low=text.toLocaleLowerCase("pt-BR");
  return team.aliases.some(a=>low.includes(a.toLocaleLowerCase("pt-BR")));
}
