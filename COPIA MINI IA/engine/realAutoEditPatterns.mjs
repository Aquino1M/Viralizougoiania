// Padrões observados em Vision Plans/timelines do editor Real fornecidos pelo usuário.
// São usados como alvo estrutural, não como promessa de igualdade visual ou desempenho.

export const REAL_AUTO_EDIT_PATTERN_VERSION='har-patterns-2026-09-30-v2-18-plans-70-timelines';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const round=v=>Math.round(v*100)/100;

export const OBSERVED_AUTO_EDIT_PATTERNS=Object.freeze({
  viral:Object.freeze({samples:6,avgDuration:35,per60:{keywords:8.57,zooms:5.14,scenes:5.14,broll:0,reactions:0,personMattes:5.14,shots:6.86,silences:3.43},sceneTypes:{bigword:18},behindRate:1}),
  clean:Object.freeze({samples:6,avgDuration:54.98,per60:{keywords:7.41,zooms:5.36,scenes:4.28,broll:1.14,reactions:1.14,personMattes:3.37,shots:9.63,silences:9.76},sceneTypes:{bigword:23},behindRate:.83}),
  cinematic:Object.freeze({samples:6,avgDuration:48.82,per60:{keywords:5.85,zooms:3.66,scenes:5.26,broll:.74,reactions:1.46,personMattes:5.06,shots:6.11,silences:6.14},sceneTypes:{bigword:24,list:1},behindRate:.97}),
  pop:Object.freeze({samples:0,avgDuration:45,per60:{keywords:7,zooms:5,scenes:5,broll:1,reactions:1.5,personMattes:4,shots:7,silences:6},sceneTypes:{bigword:4},behindRate:.35}),
  editorial:Object.freeze({samples:0,avgDuration:45,per60:{keywords:6.5,zooms:2.5,scenes:4.5,broll:.7,reactions:.5,personMattes:4,shots:6,silences:7},sceneTypes:{bigword:4},behindRate:.8}),
  meme:Object.freeze({samples:0,avgDuration:45,per60:{keywords:8,zooms:6,scenes:5,broll:4,reactions:2,personMattes:0,shots:8,silences:5},sceneTypes:{bigword:3,bubbles:1,symbol:1},behindRate:0}),
  neon:Object.freeze({samples:0,avgDuration:45,per60:{keywords:7,zooms:5,scenes:4,broll:.5,reactions:1,personMattes:8,shots:7,silences:6},sceneTypes:{bigword:3,symbol:1},behindRate:.85}),
  brainrot:Object.freeze({samples:0,avgDuration:45,per60:{keywords:8,zooms:6,scenes:5,broll:0,reactions:2,personMattes:8,shots:8,silences:5},sceneTypes:{bigword:3,bubbles:1,symbol:1},behindRate:.8})
});

export const OBSERVED_TIMELINE_EFFECTS=Object.freeze({
  transitionIds:Object.freeze({kenBurns:111,punchZoom:37,crashZoom:35,glitch:24,zoomOut:19,zoomIn:11,slideUp:8,pushRight:8,flash:8,chromaShift:4,blur:2,shake:2,whipPan:1}),
  animationIds:Object.freeze({'scene-behind-bigword':45,'impact-flash':36,'hook-bar':26,'scene-bigword':22}),
  filterIds:Object.freeze({'bw-noir':45,saturado:12,'faded-film':2,vintage:1,drama:1}),
  captionTemplates:Object.freeze({'after-effects-246':158,'green-fresh':151,'after-effects-47':46,'after-effects-248':30})
});

export function observedEffectPalette({limit=12}={}){
  const ranked=obj=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([id,count])=>({id,count}));
  return {version:REAL_AUTO_EDIT_PATTERN_VERSION,transitions:ranked(OBSERVED_TIMELINE_EFFECTS.transitionIds),animations:ranked(OBSERVED_TIMELINE_EFFECTS.animationIds),filters:ranked(OBSERVED_TIMELINE_EFFECTS.filterIds),captions:ranked(OBSERVED_TIMELINE_EFFECTS.captionTemplates)};
}

export const OBSERVED_STYLE_TIMELINE_RECIPES=Object.freeze({
  viral:Object.freeze({samples:2,duration:57.925,captionTemplate:'after-effects-246',keywordColor:'#3DFF6E',punchZoom:4,kenBurns:7,transitions:Object.freeze({crashZoom:6,glitch:3,flash:3,zoomOut:1,zoomIn:1,shake:1}),animations:Object.freeze({'scene-behind-bigword':4,'impact-flash':3,'hook-bar':1}),filters:Object.freeze({'bw-noir':4,saturado:1})}),
  clean:Object.freeze({samples:1,duration:33.034,captionTemplate:'after-effects-47',keywordColor:'#FFD23F',punchZoom:4,kenBurns:6,transitions:Object.freeze({zoomOut:1,pushRight:1}),animations:Object.freeze({'scene-bigword':3,'hook-bar':1}),filters:Object.freeze({})}),
  editorial:Object.freeze({samples:1,duration:34.733,captionTemplate:'after-effects-248',keywordColor:'#D13F34',punchZoom:1,kenBurns:2,transitions:Object.freeze({chromaShift:2,zoomOut:1,blur:1,pushRight:1}),animations:Object.freeze({'scene-behind-bigword':3,'hook-bar':1}),filters:Object.freeze({'bw-noir':3,'faded-film':1})})
});

export function observedStyleRecipe(preset='viral',duration=45){
  const raw=OBSERVED_STYLE_TIMELINE_RECIPES[preset];
  if(!raw)return null;
  const scale=Math.max(.2,Number(duration||0)/raw.duration),scaleCount=n=>Math.max(0,Math.round(Number(n||0)*scale));
  const transitionPattern=[];for(const [id,count] of Object.entries(raw.transitions||{}))for(let i=0;i<scaleCount(count);i++)transitionPattern.push(id);
  return {preset,samples:raw.samples,confidence:raw.samples>=2?'medium':'low',captionTemplate:raw.captionTemplate,keywordColor:raw.keywordColor,punchZoom:scaleCount(raw.punchZoom),kenBurns:scaleCount(raw.kenBurns),transitionPattern,animations:Object.fromEntries(Object.entries(raw.animations||{}).map(([k,v])=>[k,scaleCount(v)])),filters:Object.fromEntries(Object.entries(raw.filters||{}).map(([k,v])=>[k,scaleCount(v)]))};
}
export const REAL_SFX_RULES=Object.freeze({
  targetPer60:Object.freeze({restrained:6,standard:10,rich:14}),
  db:Object.freeze({pop:-14,click:-14,ding:-12,whoosh:-12,swipe:-12,riser:-12,shutter:-12,impact:-8,scratch:-6}),
  minimumGapSeconds:.25
});

export function patternTargets(preset='viral',duration=45){
  const profile=OBSERVED_AUTO_EDIT_PATTERNS[preset]||OBSERVED_AUTO_EDIT_PATTERNS.viral;
  const scale=Math.max(.15,Number(duration||0)/60);
  const count=key=>Math.max(key==='broll'||key==='reactions'?0:1,Math.round((profile.per60[key]||0)*scale));
  return {
    preset,duration:Number(duration)||0,samples:profile.samples,
    confidence:profile.samples>=5?'high':profile.samples>=2?'medium':profile.samples===1?'low':'inferred',
    keywords:clamp(count('keywords'),3,16),zooms:clamp(count('zooms'),1,12),scenes:clamp(count('scenes'),1,9),
    broll:clamp(count('broll'),0,5),reactions:clamp(count('reactions'),0,4),personMattes:clamp(count('personMattes'),0,12),
    shots:clamp(count('shots'),1,16),silences:clamp(count('silences'),0,20),behindRate:profile.behindRate
  };
}

const rows=v=>Array.isArray(v)?v:Object.values(v||{});
function nearScore(actual,target,{zeroOk=true}={}){
  actual=Number(actual)||0;target=Number(target)||0;
  if(target===0)return zeroOk?(actual===0?1:.65):.8;
  return clamp(1-Math.abs(actual-target)/Math.max(target,1),0,1);
}

export function scorePlanAgainstObservedPattern(plan={}){
  const preset=String(plan.preset||'viral').toLowerCase(),targets=patternTargets(preset,Number(plan.duration)||45),counts={
    keywords:rows(plan.keywords).length,zooms:rows(plan.zooms).length,scenes:rows(plan.scenes).length,broll:rows(plan.broll).length,reactions:rows(plan.reactions).length,personMattes:rows(plan.person_mattes).length,shots:rows(plan.shots).length,silences:rows(plan.silences).length
  };
  const weights={keywords:.14,zooms:.14,scenes:.18,broll:.11,reactions:.07,personMattes:.12,shots:.10,silences:.04};
  let total=0;for(const [k,w] of Object.entries(weights))total+=nearScore(counts[k],targets[k])*w;
  const beats=rows(plan.transcript_beats),coverage=Number(plan?.planner?.coveragePct);const transcriptScore=Number.isFinite(coverage)?clamp(coverage/90,0,1):(beats.length?1:.5);total+=transcriptScore*.1;
  const score=Math.round(clamp(total*100,0,100));
  return {version:REAL_AUTO_EDIT_PATTERN_VERSION,preset,score,counts,targets,samples:targets.samples,confidence:targets.confidence,transcriptCoveragePct:Number.isFinite(coverage)?round(coverage):null};
}

export function patternPromptHint(preset='viral',duration=45){
  const t=patternTargets(preset,duration);
  return {version:REAL_AUTO_EDIT_PATTERN_VERSION,confidence:t.confidence,samples:t.samples,target_counts:{keywords:t.keywords,zooms:t.zooms,scenes:t.scenes,broll:t.broll,reactions:t.reactions},behind_scene_ratio:round(t.behindRate),note:'Alvos estruturais derivados de amostra pequena de Auto Edits capturados; priorize significado e sincronização da transcrição sobre atingir números exatos.'};
}
