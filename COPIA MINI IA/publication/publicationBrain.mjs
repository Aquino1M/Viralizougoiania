import { finiteMetric, evidenceLevel, outcomeSampleQuality, selectOutcomeForWindow, hashtagMatchesContext } from './recommendationIntegrity.mjs';
export const PUBLICATION_BRAIN_VERSION='publication-brain-v2-campaign-lock-24h';

const GENERIC=new Set(['#fyp','#fy','#foryou','#foryoupage','#viral','#trend','#trending','#explore','#explorepage','#reels','#shorts','#tiktok']);
const SOURCE_PRIOR={ai:17,viral:15,learned:14,mentor:8,topic:8,manual:100,required:100,'campaign-rule':100,unknown:5};

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function median(values=[]){const a=values.map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return 0;const i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;}
function mean(values=[]){const a=values.map(Number).filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0)/a.length:0;}
function normalizeTag(tag=''){let v=String(tag||'').trim().toLowerCase();if(!v)return '';if(!v.startsWith('#'))v=`#${v}`;return v.replace(/[^#\p{L}\p{N}_]/gu,'');}
function tokens(text=''){const stop=new Set(['para','como','mais','isso','esse','essa','sobre','pela','pelo','com','uma','uns','das','dos','que','por','de','do','da','em','no','na','the','and','for','with','this','that','from','you']);return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x.length>=3&&!stop.has(x));}
function unique(values=[]){const out=[],seen=new Set();for(const x of values){const k=String(x);if(!k||seen.has(k))continue;seen.add(k);out.push(x);}return out;}
function identityKeys(d={}){const out=[];if(d.measurementId)out.push(`m:${d.measurementId}`);if(d.deliveryId)out.push(`d:${d.deliveryId}`);if(d.remoteId)out.push(`r:${d.remoteId}`);if(d.projectId&&d.shortId)out.push(`s:${d.projectId}|${d.shortId}|${d.socialAccountId||''}|${d.platform||''}`);return out;}
function sourceListForTag(decision={},tag=''){const n=normalizeTag(tag),m=decision.measurement||{},pb=m.publicationBrain||{};const direct=(pb.candidates||[]).find(x=>normalizeTag(x?.tag)===n);if(direct?.sources?.length)return unique(direct.sources.map(String));const src=[];if((m.ai?.appliedHashtags||[]).some(x=>normalizeTag(x)===n))src.push('ai');if((m.viralMemory?.appliedHashtags||[]).some(x=>normalizeTag(x)===n))src.push('viral');if((m.hashtagLearning?.appliedTags||[]).some(x=>normalizeTag(x)===n))src.push('learned');if((m.hashtagLearning?.mentorTags||[]).some(x=>normalizeTag(x)===n))src.push('mentor');return src.length?src:['unknown'];}
function topicWords(decision={}){return unique(tokens([decision.clipTitle,decision.projectTitle,decision.measurement?.reachStrategy?.searchPhrase,decision.measurement?.publicationBrain?.topic].filter(Boolean).join(' '))).slice(0,24);}
function baselineKey(row={}){return `${String(row.platform||'unknown').toLowerCase()}|${row.socialAccountId||'all'}`;}
function rowHour(row={}){const d=new Date(row.publishedAt||row.ts||'');return Number.isNaN(d.getTime())?null:Number(new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',hourCycle:'h23'}).format(d));}
function lengthBucket(n=0){n=Math.max(0,Number(n)||0);return n<120?'short:<120':n<240?'medium:120-239':n<420?'long:240-419':'xl:420+';}
function titleLengthBucket(n=0){n=Math.max(0,Number(n)||0);return n<45?'short:<45':n<75?'medium:45-74':n<110?'long:75-109':'xl:110+';}

export function compilePublicationBrain({decisions=[],outcomes=[]}={}){
  const decisionByKey=new Map();for(const raw of decisions){const d=raw?.data||raw||{};for(const k of identityKeys(d))decisionByKey.set(k,d);}
  const exclusions={},grouped=new Map(),reject=reason=>{exclusions[reason]=(exclusions[reason]||0)+1;};
  for(const raw of outcomes){const out={...(raw?.data||raw||{}),observedAt:raw?.data?.observedAt||raw?.ts||raw?.observedAt};let decision=null;for(const k of identityKeys(out))if(decisionByKey.has(k)){decision=decisionByKey.get(k);break;}
    if(Number(out.milestoneHours)!==24){reject('janela_diferente');continue;}
    if(finiteMetric(out.views)===null){reject('metrica_ausente');continue;}
    if(outcomeSampleQuality(out.ageHours,24)!=='on-time'){reject('janela_nao_comparavel');continue;}
    if(!decision){reject('decisao_ausente');continue;}
    const platform=String(out.platform||decision.platform||decision.measurement?.publication?.platform||'').toLowerCase(),social=String(out.socialAccountId||decision.socialAccountId||''),remote=String(out.remoteId||decision.remoteId||''),published=out.publishedAt||decision.publishedAt;
    if(!['tiktok','instagram','youtube'].includes(platform)||!social||!remote){reject('identidade_incompleta');continue;}
    if(!published||!Number.isFinite(new Date(published).getTime())||out.publishedConfirmed===false){reject('publicacao_nao_confirmada');continue;}
    if((decision.platform&&decision.platform!==platform)||(decision.socialAccountId&&String(decision.socialAccountId)!==social)){reject('identidade_divergente');continue;}
    const key=`${platform}|${social}|${remote}`;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push({...out,platform,socialAccountId:social,remoteId:remote,publishedAt:published});
  }
  const uniqueOutcomes=[...grouped.values()].map(rows=>{if(rows.length>1)exclusions.coleta_repetida=(exclusions.coleta_repetida||0)+rows.length-1;return selectOutcomeForWindow(rows,24,{strict:true});});
  const samples=[];
  for(const out of uniqueOutcomes){let decision=null;for(const k of identityKeys(out)){if(decisionByKey.has(k)){decision=decisionByKey.get(k);break;}}if(!decision)continue;const views=finiteMetric(out.views),likes=finiteMetric(out.likes)||0,comments=finiteMetric(out.comments)||0,shares=finiteMetric(out.shares)||0,publishedAt=out.publishedAt,platform=out.platform,socialAccountId=out.socialAccountId,hashtags=unique((decision.hashtags||out.hashtags||[]).map(normalizeTag).filter(Boolean));const copyLength=Number(decision.measurement?.publication?.descriptionLength||0),titleLength=String(decision.clipTitle||'').length;samples.push({views,likes,comments,shares,engagement:views>0?(likes+comments+shares)/views:0,weight:1,platform,socialAccountId,launcherId:out.launcherId||decision.launcherId||null,publishedAt,hour:rowHour({publishedAt}),hashtags,decision,topics:topicWords(decision),captionTemplate:decision.measurement?.creative?.captionTemplate||out.creative?.captionTemplate||null,copySource:decision.measurement?.publicationBrain?.copySource||decision.measurement?.ai?.copySource||((decision.measurement?.ai?.appliedHashtags||[]).length?'ai':'unknown'),copyLength,copyLengthBucket:lengthBucket(copyLength),titleLength,titleLengthBucket:titleLengthBucket(titleLength)});}

  const baselineGroups=new Map();for(const s of samples){const k=baselineKey(s);if(!baselineGroups.has(k))baselineGroups.set(k,[]);baselineGroups.get(k).push(s.views);}const baselines={};for(const [k,v] of baselineGroups)baselines[k]=Math.max(1,median(v));for(const s of samples)s.normalizedViews=s.views/(baselines[baselineKey(s)]||1);

  const tagMap=new Map(),pairMap=new Map(),hourMap=new Map(),copyMap=new Map(),captionMap=new Map(),copyLengthMap=new Map(),titleLengthMap=new Map(),launcherMap=new Map(),platformMap=new Map();
  for(const s of samples){
    if(s.hour!=null){const k=`${s.platform}|${s.socialAccountId}|${s.hour}`;(hourMap.get(k)||hourMap.set(k,[]).get(k)).push(s);}
    if(s.copySource){(copyMap.get(s.copySource)||copyMap.set(s.copySource,[]).get(s.copySource)).push(s);}
    (copyLengthMap.get(s.copyLengthBucket)||copyLengthMap.set(s.copyLengthBucket,[]).get(s.copyLengthBucket)).push(s);
    (titleLengthMap.get(s.titleLengthBucket)||titleLengthMap.set(s.titleLengthBucket,[]).get(s.titleLengthBucket)).push(s);
    if(s.launcherId)(launcherMap.get(String(s.launcherId))||launcherMap.set(String(s.launcherId),[]).get(String(s.launcherId))).push(s);
    if(s.platform)(platformMap.get(String(s.platform))||platformMap.set(String(s.platform),[]).get(String(s.platform))).push(s);
    if(s.captionTemplate){(captionMap.get(s.captionTemplate)||captionMap.set(s.captionTemplate,[]).get(s.captionTemplate)).push(s);}
    for(const tag of s.hashtags){let x=tagMap.get(tag);if(!x){x={tag,samples:[],sources:new Set(),topics:new Map()};tagMap.set(tag,x);}x.samples.push(s);for(const src of sourceListForTag(s.decision,tag))x.sources.add(src);for(const t of s.topics)x.topics.set(t,(x.topics.get(t)||0)+1);}
    for(let i=0;i<s.hashtags.length;i++)for(let j=i+1;j<s.hashtags.length;j++){const a=s.hashtags[i],b=s.hashtags[j],k=[a,b].sort().join('|');if(!pairMap.has(k))pairMap.set(k,[]);pairMap.get(k).push(s);}
  }
  const globalNorm=Math.max(.01,median(samples.map(x=>x.normalizedViews))),globalEng=median(samples.map(x=>x.engagement));
  const profile=(rows=[])=>{const norm=rows.map(x=>x.normalizedViews),eng=rows.map(x=>x.engagement),views=rows.map(x=>x.views),n=rows.length,conf=n/(n+20),perf=median(norm)/(globalNorm||1),engLift=(median(eng)-globalEng);const raw=50+clamp((perf-1)*32,-28,28)+clamp(engLift*260,-10,10),score=Math.round(50+(raw-50)*(.25+.75*conf));return {posts:n,score:clamp(score,0,100),confidence:Math.round(conf*100)/100,evidence:evidenceLevel(n),medianViews:Math.round(median(views)),avgViews:Math.round(mean(views)),medianBaselineMultiple:Math.round(median(norm)*100)/100,engagementRatePct:Math.round(mean(eng)*10000)/100};};
  const tags=[...tagMap.values()].map(x=>{const byLauncher=new Map(),byPlatform=new Map(),byAudience=new Map();for(const s of x.samples){const audience=baselineKey(s);(byAudience.get(audience)||byAudience.set(audience,[]).get(audience)).push(s);if(s.launcherId){const k=String(s.launcherId);(byLauncher.get(k)||byLauncher.set(k,[]).get(k)).push(s)}if(s.platform){const k=String(s.platform);(byPlatform.get(k)||byPlatform.set(k,[]).get(k)).push(s)}}return {...profile(x.samples),tag:x.tag,sources:[...x.sources],topics:[...x.topics.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k])=>k),byAudience:Object.fromEntries([...byAudience.entries()].map(([k,v])=>[k,profile(v)])),byLauncher:Object.fromEntries([...byLauncher.entries()].map(([k,v])=>[k,profile(v)])),byPlatform:Object.fromEntries([...byPlatform.entries()].map(([k,v])=>[k,profile(v)]))};}).sort((a,b)=>b.score-a.score||b.posts-a.posts);
  const pairs=[...pairMap.entries()].map(([key,rows])=>{const [a,b]=key.split('|');return {...profile(rows),tags:[a,b]};}).filter(x=>x.posts>=2).sort((a,b)=>b.score-a.score||b.posts-a.posts).slice(0,80);
  const hours=[...hourMap.entries()].map(([key,rows])=>{const [platform,socialAccountId,hour]=key.split('|');return {...profile(rows),hour:Number(hour),platform,socialAccountId,timeZone:'America/Sao_Paulo'};}).sort((a,b)=>b.score-a.score||b.posts-a.posts);
  const copySources=[...copyMap.entries()].map(([key,rows])=>({...profile(rows),key})).sort((a,b)=>b.score-a.score);
  const captionTemplates=[...captionMap.entries()].map(([key,rows])=>({...profile(rows),key})).sort((a,b)=>b.score-a.score);
  const copyLengths=[...copyLengthMap.entries()].map(([key,rows])=>({...profile(rows),key})).sort((a,b)=>b.score-a.score),titleLengths=[...titleLengthMap.entries()].map(([key,rows])=>({...profile(rows),key})).sort((a,b)=>b.score-a.score),launchers=[...launcherMap.entries()].map(([key,rows])=>({...profile(rows),key})).sort((a,b)=>b.posts-a.posts),platforms=[...platformMap.entries()].map(([key,rows])=>({...profile(rows),key})).sort((a,b)=>b.posts-a.posts);return {version:PUBLICATION_BRAIN_VERSION,updatedAt:new Date().toISOString(),training:{integrityVersion:3,samples24h:samples.length,decisions:decisions.length,outcomes:outcomes.length,strictWindowHours:24,exclusions},baselines,tags,pairs,hours,copySources,copyLengths,titleLengths,captionTemplates,launchers,platforms};
}

function contextMatch(tag='',sourceText=''){return hashtagMatchesContext(tag,sourceText)?1:0;}
function tagProfile(model,tag){const n=normalizeTag(tag);return (model?.tags||[]).find(x=>normalizeTag(x.tag)===n)||null;}
function contextualTagProfile(profile,{platform='',socialAccountId=''}={}){if(!profile||!platform||!socialAccountId)return null;const audience=profile.byAudience?.[`${String(platform).toLowerCase()}|${socialAccountId}`];return audience?{...audience,scope:'social-account-platform'}:null;}

export function arbitratePublicationHashtags({model={},campaign=[],required=[],manual=[],candidates=[],limit=5,sourceText='',platform='',socialAccountId='',launcherId=''}={}){
  const cap=clamp(Math.round(limit??5),0,15),lockedCampaign=[],lockedOther=[],seen=new Set(),rejected=[];
  const pushLocked=(target,tag,source)=>{const n=normalizeTag(tag);if(!n||seen.has(n))return;seen.add(n);target.push({tag:n,source,score:100,reason:'locked'});};
  for(const t of [...campaign,...required])pushLocked(lockedCampaign,t,'campaign-rule');
  for(const t of manual)pushLocked(lockedOther,t,'manual');
  const keptLocked=[...lockedCampaign,...lockedOther.slice(0,Math.max(0,cap-lockedCampaign.length))];
  for(const x of lockedOther.slice(Math.max(0,cap-lockedCampaign.length)))rejected.push({...x,reason:'manual_limit'});
  const pool=new Map();
  for(const raw of candidates||[]){const tag=normalizeTag(typeof raw==='string'?raw:raw?.tag),sources=unique((typeof raw==='string'?['unknown']:(raw?.sources||[raw?.source||'unknown'])).map(String));if(!tag||seen.has(tag))continue;if(GENERIC.has(tag)){rejected.push({tag,sources,reason:'generic'});continue;}const p=tagProfile(model,tag),cp=contextualTagProfile(p,{launcherId,platform,socialAccountId}),relevance=contextMatch(tag,sourceText,p);if(relevance<=0){rejected.push({tag,sources,reason:'off_topic'});continue;}const sourceScore=Math.max(...sources.map(s=>SOURCE_PRIOR[s]??SOURCE_PRIOR.unknown)),history=cp?((Number(cp.score||50)-50)*.8*Math.max(.25,Number(cp.confidence||0))):0,exploration=cp?Math.max(0,4-Number(cp.posts||0)*.5):3,context=relevance*28,score=sourceScore+history+exploration+context,row=pool.get(tag)||{tag,sources:[],score:-999,profile:p,relevance};row.sources=unique([...row.sources,...sources]);if(score>row.score)row.score=score;row.profile=cp||p||row.profile;row.relevance=Math.max(row.relevance||0,relevance);pool.set(tag,row);}
  const selected=[...keptLocked];let ranked=[...pool.values()].sort((a,b)=>b.score-a.score||Number(b.profile?.posts||0)-Number(a.profile?.posts||0));
  while(selected.length<cap&&ranked.length){for(const r of ranked)r.dynamicScore=r.score;ranked.sort((a,b)=>b.dynamicScore-a.dynamicScore);const pick=ranked.shift();selected.push({...pick,score:Math.round((pick.dynamicScore||pick.score)*10)/10,reason:'publication-brain'});}
  const selectedSet=new Set(selected.map(x=>normalizeTag(x.tag)));for(const r of ranked)rejected.push({...r,reason:'ranked_out'});
  const recommendedHour=(model?.hours||[]).find(x=>Number(x.posts||0)>=5&&x.platform===platform&&String(x.socialAccountId)===String(socialAccountId))?.hour??null;
  const summary={version:model?.version||PUBLICATION_BRAIN_VERSION,samples24h:Number(model?.training?.samples24h||0),recommendedHour,platform,socialAccountId:socialAccountId||null,launcherId:launcherId||null,method:'24h normalized performance + engagement + semantic relevance + source evidence ; campaign rule is immutable and only free slots are arbitrated'};
  return {hashtags:selected.map(x=>x.tag),selected,rejected,candidates:[...pool.values()].map(x=>({tag:x.tag,sources:x.sources,score:Math.round(x.score*10)/10,historyScore:x.profile?.score??null,historyPosts:x.profile?.posts??0,confidence:x.profile?.confidence??0,relevance:Math.round((x.relevance||0)*100)/100})),summary};
}

export function publicPublicationBrain(model={}){return {version:model.version||PUBLICATION_BRAIN_VERSION,updatedAt:model.updatedAt||null,training:model.training||{},topTags:(model.tags||[]).slice(0,20),topPairs:(model.pairs||[]).slice(0,12),bestHours:(model.hours||[]).slice(0,8),copySources:model.copySources||[],copyLengths:model.copyLengths||[],titleLengths:model.titleLengths||[],captionTemplates:model.captionTemplates||[],launchers:model.launchers||[],platforms:model.platforms||[]};}
