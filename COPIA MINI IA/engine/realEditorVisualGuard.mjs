export const REAL_EDITOR_VISUAL_GUARD_VERSION='real-editor-visual-guard-v1';

const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const arr=v=>Array.isArray(v)?v:[];
const map=v=>Array.isArray(v)?Object.fromEntries(v.filter(Boolean).map((x,i)=>[String(x.id||i),clone(x)])):(v&&typeof v==='object'?clone(v):{});
const hubOwned=x=>String(x?._autoEditSource||'').startsWith('hub-');
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const isOpaqueBlack=v=>/^#000(?:000)?$/i.test(String(v||'').trim())||/^rgba?\(\s*0\s*,\s*0\s*,\s*0(?:\s*,\s*1(?:\.0+)?)?\s*\)$/i.test(String(v||'').trim());

function sourceVideoRows(timeline){
  const items=timeline?.items||{};
  return Object.values(items).filter(x=>x?.type==='video'&&!hubOwned(x)&&finite(x.durationInFrames)>0);
}

function referencedIds(tracks=[]){
  const out=new Set();
  for(const t of arr(tracks))for(const id of arr(t?.items))out.add(String(id));
  return out;
}

export function guardRealEditorTimeline(input,{baseline=null,stripUnsafeHubFilters=true}={}){
  const timeline=clone(input)||{};
  timeline.items=map(timeline.items);
  timeline.assets=map(timeline.assets);
  timeline.tracks=arr(timeline.tracks).map(clone);

  const base=baseline?clone(baseline):null;
  if(base){base.items=map(base.items);base.assets=map(base.assets);base.tracks=arr(base.tracks).map(clone);}

  const report={
    version:REAL_EDITOR_VISUAL_GUARD_VERSION,
    sourceVideoItemsBefore:sourceVideoRows(timeline).length,
    baselineVideoItems:base?sourceVideoRows(base).length:0,
    restoredVideoItems:0,
    restoredVideoAssets:0,
    restoredTrackRefs:0,
    unhiddenVideoTracks:0,
    repairedVideoGeometry:0,
    repairedVideoOpacity:0,
    transitionOverlaysSanitized:0,
    unsafeFiltersRemoved:0,
    removedFilterIds:[],
    sourceVideoItemsAfter:0,
    visibleSourceVideoItemsAfter:0,
    ok:false
  };

  if(base){
    const baseVideos=sourceVideoRows(base);
    for(const src of baseVideos){
      const id=String(src.id||''); if(!id)continue;
      if(!timeline.items[id]){timeline.items[id]=clone(src);report.restoredVideoItems++;}
      const assetId=String(src.assetId||'');
      if(assetId&&base.assets[assetId]&&!timeline.assets[assetId]){timeline.assets[assetId]=clone(base.assets[assetId]);report.restoredVideoAssets++;}
    }
    const sourceIds=new Set(baseVideos.map(x=>String(x.id||'')).filter(Boolean));
    for(const bt of base.tracks){
      const wanted=arr(bt?.items).map(String).filter(id=>sourceIds.has(id));
      if(!wanted.length)continue;
      let tt=timeline.tracks.find(x=>String(x?.id||'')===String(bt?.id||''));
      if(!tt){tt={...clone(bt),items:[]};timeline.tracks.push(tt);}
      tt.items=arr(tt.items).map(String);
      for(const id of wanted)if(timeline.items[id]&&!tt.items.includes(id)){tt.items.push(id);report.restoredTrackRefs++;}
      if(tt.hidden===true&&bt.hidden!==true){tt.hidden=false;report.unhiddenVideoTracks++;}
    }
  }

  const removed=new Set();
  if(stripUnsafeHubFilters){
    for(const [id,it] of Object.entries(timeline.items)){
      if(!hubOwned(it)||it?.type!=='filter')continue;
      const filterId=String(it.filterId||'').toLowerCase();
      if(!['saturado','bw-noir'].includes(filterId))continue;
      delete timeline.items[id];removed.add(String(id));report.unsafeFiltersRemoved++;report.removedFilterIds.push(filterId||'filter');
    }
  }

  for(const it of Object.values(timeline.items)){
    if(!hubOwned(it)||it?.type!=='transition')continue;
    if(it.overlayColor!=null&&isOpaqueBlack(it.overlayColor)){delete it.overlayColor;report.transitionOverlaysSanitized++;}
  }

  for(const t of timeline.tracks){
    t.items=arr(t.items).map(String).filter(id=>timeline.items[id]&&!removed.has(id));
  }
  timeline.tracks=timeline.tracks.filter(t=>arr(t.items).length>0||!hubOwned(t));

  const sourceRows=sourceVideoRows(timeline);
  const sourceIds=new Set(sourceRows.map(x=>String(x.id||'')).filter(Boolean));
  for(const it of sourceRows){
    const baseIt=base?.items?.[String(it.id||'')]||{};
    const deliberatelyHidden=baseIt.opacity===0;
    if(!(finite(it.opacity)>0)&&!deliberatelyHidden){it.opacity=finite(baseIt.opacity)>0?Number(baseIt.opacity):1;report.repairedVideoOpacity++;}
    for(const key of ['width','height'])if(!(finite(it[key])>0)){const fallback=finite(baseIt[key])||finite(timeline[key==='width'?'compositionWidth':'compositionHeight'])||1;it[key]=fallback;report.repairedVideoGeometry++;}
    if(finite(it.from)==null)it.from=finite(baseIt.from)||0;
    if(!(finite(it.durationInFrames)>0)&&finite(baseIt.durationInFrames)>0){it.durationInFrames=Number(baseIt.durationInFrames);report.repairedVideoGeometry++;}
  }

  for(const t of timeline.tracks){
    const hasSource=arr(t.items).some(id=>sourceIds.has(String(id)));
    const baseTrack=base?.tracks?.find(x=>String(x.id||'')===String(t.id||''));
    if(hasSource&&t.hidden===true&&baseTrack?.hidden!==true){t.hidden=false;report.unhiddenVideoTracks++;}
  }

  const refs=referencedIds(timeline.tracks.filter(t=>t.hidden!==true));
  const visible=sourceRows.filter(x=>refs.has(String(x.id||''))&&finite(x.opacity)>0&&finite(x.durationInFrames)>0&&finite(x.width)>0&&finite(x.height)>0);
  report.sourceVideoItemsAfter=sourceRows.length;
  report.visibleSourceVideoItemsAfter=visible.length;
  report.ok=sourceRows.length>0&&visible.length>0;
  return {timeline,report};
}
