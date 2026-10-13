const rows=v=>Array.isArray(v)?v:Object.values(v||{});
const map=v=>Array.isArray(v)?Object.fromEntries(v.filter(Boolean).map(x=>[x.id,x])):(v||{});
const num=(v,f=null)=>v!=null&&Number.isFinite(Number(v))?Number(v):f;
const text=v=>String(v??'').trim();

function sourceVideoIds(timeline={}){
  return new Set(rows(timeline.assets).filter(a=>a?.sourceVideoReference).map(a=>a.id));
}
function sourceTimeToTimeline(timeline={},seconds=0){
  const fps=num(timeline.fps,30),items=rows(timeline.items),ids=sourceVideoIds(timeline),s=num(seconds,0);
  const base=items.find(x=>x?.type==='video'&&x.id!=='layout-frozen-frame'&&ids.has(x.assetId)&&s>=num(x.videoStartFromInSeconds,0)&&s<num(x.videoStartFromInSeconds,0)+num(x.durationInFrames,0)/fps*num(x.playbackRate,1));
  return base?num(base.from,0)/fps+(s-num(base.videoStartFromInSeconds,0))/num(base.playbackRate,1):s;
}

export function normalizeRealBrollSuggestions(raw,timeline={}){
  const payload=raw?.broll_suggested||raw?.data?.broll_suggested||raw?.data||raw||{};
  let suggestions=Array.isArray(payload?.suggestions)?payload.suggestions:[];
  if(!suggestions.length&&Array.isArray(payload?.keywords)&&Array.isArray(payload?.videos)){
    suggestions=payload.keywords.map(k=>({keyword:typeof k==='string'?k:k?.keyword,startMs:k?.startMs,endMs:k?.endMs,reason:k?.reason,videos:payload.videos.filter(v=>v?.keyword===(typeof k==='string'?k:k?.keyword))}));
  }
  const assets=rows(timeline.assets),items=rows(timeline.items),out=[];
  for(const [index,s] of suggestions.entries()){
    const v=Array.isArray(s?.videos)?s.videos[0]:null;if(!v)continue;
    const url=text(v.hd_url||v.url);if(!url)continue;
    const sourceStart=num(s.startMs,0)/1000,sourceEnd=num(s.endMs,s.startMs)/1000;
    if(!(sourceEnd>sourceStart))continue;
    const start=sourceTimeToTimeline(timeline,sourceStart),duration=Math.max(1/(num(timeline.fps,30)),Math.min(2,sourceEnd-sourceStart));
    const existing=assets.find(a=>[a?.remoteUrl,a?.playbackUrl,a?.url].filter(Boolean).includes(url));
    out.push({id:`real-broll-${text(v.pexels_id)||index}`,type:'video',url,label:text(s.keyword||v.keyword||'B-roll').slice(0,100),reason:text(s.reason||'').slice(0,240),duration:num(v.duration,10),width:num(v.width,num(timeline.compositionWidth,1080)),height:num(v.height,num(timeline.compositionHeight,1920)),start,end:start+duration,sourceStart,sourceEnd,alreadyOnTimeline:Boolean(existing&&items.some(x=>x?.assetId===existing.id)),source:'B-roll IA do Real',credit:text(v.photographer)||null,licenseUrl:text(v.pexels_url)||null,pexelsId:text(v.pexels_id)||null,remoteFileKey:v.pexels_id?`broll/${v.pexels_id}.mp4`:null});
  }
  return out;
}

export function normalizeRealLibraryItems(payload,{folders={}}={}){
  const root=payload?.data??payload,items=Array.isArray(root)?root:(Array.isArray(root?.items)?root.items:[]),out=[];
  for(const row of items){
    const d=row?.data||{},url=text(d.url||row?.url);if(!url)continue;
    const mime=text(d.mime_type||row?.mime_type).toLowerCase(),type=mime.startsWith('video/')?'video':mime.startsWith('image/')?'image':mime.startsWith('audio/')?'audio':null;if(!type)continue;
    const folderId=text(row?.folder_id),folder=folders[folderId]||null;
    out.push({id:`real-library-${text(row.id)||out.length}`,realLibraryId:text(row.id)||null,type,url,label:text(row.name||d.filename||'Biblioteca Real').slice(0,140),reason:folder?`Biblioteca Real · ${folder}`:'Biblioteca Real',folderId:folderId||null,folderName:folder||null,duration:num(d.duration??d.duration_s, type==='video'?10:null),width:num(d.width,null),height:num(d.height,null),mimeType:mime,alreadyOnTimeline:false,source:'Biblioteca do Real',remoteFileKey:text(d.filename)||null});
  }
  return out;
}

export function officialPlanRoot(payload={}){
  const root=payload?.data?.data??payload?.data??payload??{};
  return root?.plan&&typeof root.plan==='object'?root.plan:(root?.vision_plan&&typeof root.vision_plan==='object'?root.vision_plan:(root?.status&&root?.source?root.plan||null:null));
}

export function officialPlanLibrary(plan={}){
  const out=[];
  for(const [i,b] of rows(plan?.broll).entries()){
    const url=text(b?.video_url||b?.image_url||b?.url||b?.remoteUrl||b?.playback_url||b?.playbackUrl);if(!url)continue;
    const type=b?.video_url||/\.mp4(?:$|\?)/i.test(url)?'video':'image';
    out.push({id:`official-plan-${i}`,type,url,label:text(b.concept||b.prompt||'B-roll do Vision Plan').slice(0,120),reason:'Recurso já existente no Vision Plan do Real',duration:num(b.duration,type==='video'?3:null),width:num(b.width,null),height:num(b.height,null),start:num(b.start,null),end:num(b.end,null),alreadyOnTimeline:false,source:'Vision Plan existente do Real',remoteFileKey:text(b.remote_file_key||b.remoteFileKey)||null});
  }
  return out;
}

export function mergeOfficialPlanResources(plan,official={}){
  if(!official||typeof official!=='object')return plan;
  const merged=structuredClone(plan),copy=['person_mattes','person_matte_full','segments','faces','shots','silences','voice_lufs'];
  for(const key of copy)if(official[key]!=null&&(Array.isArray(official[key])?official[key].length:true))merged[key]=structuredClone(official[key]);
  merged.real_editor_resources={music:official.music?structuredClone(official.music):null,music_options:official.music_options?structuredClone(official.music_options):{},sfx_kit:official.sfx_kit?structuredClone(official.sfx_kit):{}};
  // Aprende somente a estrutura do plano oficial existente. Não copia cenas/zooms/keywords automaticamente:
  // o planner local ainda precisa justificá-los pela transcrição atual.
  merged.learned_pattern={
    source:'Vision Plan existente do Real',preset:text(official.preset)||null,
    target_counts:{keywords:rows(official.keywords).length,zooms:rows(official.zooms).length,scenes:rows(official.scenes).length,broll:rows(official.broll).length,reactions:rows(official.reactions).length,person_mattes:rows(official.person_mattes).length,shots:rows(official.shots).length,silences:rows(official.silences).length},
    scene_types:Object.fromEntries([...new Set(rows(official.scenes).map(x=>text(x?.type||x?.scene_type||x?.kind||'bigword').toLowerCase()).filter(Boolean))].map(k=>[k,rows(official.scenes).filter(x=>text(x?.type||x?.scene_type||x?.kind||'bigword').toLowerCase()===k).length])),
    has_full_person_matte:Boolean(official.person_matte_full),
    music_moods:Object.keys(official.music_options||{}),
    sfx_families:Object.keys(official.sfx_kit||{})
  };
  merged.official_plan_reused=true;
  merged.official_plan_preset=text(official.preset)||null;
  const omissions=Array.isArray(merged.omissions)?merged.omissions:[];
  merged.omissions=omissions.filter(x=>!/Recorte novo da pessoa/i.test(String(x)));
  if(!rows(merged.person_mattes).length&&!merged.person_matte_full)merged.omissions.push('Nenhum recorte de pessoa reutilizável foi encontrado no Vision Plan existente.');
  return merged;
}

function tokens(value=''){
  return [...new Set(String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2))];
}
export function rankRealLibrary(plan,library=[],limit=40){
  const focus=tokens([plan?.central_topic,plan?.hook_title,...rows(plan?.keywords).map(x=>x.text),...rows(plan?.words).filter((_,i)=>i%8===0).map(x=>x.text)].filter(Boolean).join(' '));
  return [...library].map((x,i)=>{const hay=tokens(`${x.label||''} ${x.reason||''} ${x.folderName||''}`),overlap=focus.filter(t=>hay.some(h=>h.includes(t)||t.includes(h))).length,priority=x.source==='B-roll IA do Real'?100:x.source==='Vision Plan existente do Real'?80:x.source==='B-roll da timeline'?70:x.source==='Biblioteca do Real'?40:20;return {x,score:priority+overlap*12-(x.alreadyOnTimeline?50:0)-i*.001};}).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.x);
}
