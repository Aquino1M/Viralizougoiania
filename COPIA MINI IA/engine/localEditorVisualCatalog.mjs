// Catálogo público observado nos arquivos do editor fornecidos pelo usuário.
// Mantém somente URLs públicas/estáveis, sem tokens ou cookies.
export const REAL_BRAINROT_BASE_URL='https://cdn.realoficial.com.br/brainrots_30s';
export const REAL_BRAINROT_CATEGORIES=Object.freeze([
  {name:'carros',path:'cars',count:10,width:405,height:720},
  {name:'minecraft',path:'minecraft',count:34,width:405,height:720},
  {name:'relax',path:'sats',count:42,width:405,height:720},
  {name:'subway',path:'subway',count:6,width:405,height:720},
  {name:'areia',path:'sand',count:368,width:405,height:720},
  {name:'fortnite',path:'fortnite',count:5,width:405,height:720},
  {name:'hipnoze',path:'hipnoze',count:4,width:405,height:720},
  {name:'trackmania',path:'trackmania',count:5,width:720,height:405}
]);

function hashText(value=''){
  let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;
}
export function deterministicBrainrotVideos(seed='real-hub',count=6,{maxCategories=5}={}){
  const cats=REAL_BRAINROT_CATEGORIES.slice(0,Math.max(1,maxCategories));let h=hashText(seed),out=[];
  for(let i=0;i<count;i++){
    const cat=cats[(h+i*7)%cats.length],n=1+((h>>>((i%4)*4))+i*13)%cat.count;
    out.push({url:`${REAL_BRAINROT_BASE_URL}/${cat.path}/${n}.mp4`,category:cat.name,path:cat.path,index:n,width:cat.width,height:cat.height,duration:30});
    h=(Math.imul(h^n,1103515245)+12345)>>>0;
  }
  return out;
}
