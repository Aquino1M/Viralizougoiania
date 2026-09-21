import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { NEWS_SOURCES } from "@/lib/news-sources";

export const runtime = "nodejs";

const MAX_HTML=2_000_000;

function sourceFor(raw:string){
  let url:URL;
  try{url=new URL(raw);}catch{return null;}
  if(!["http:","https:"].includes(url.protocol))return null;
  const host=url.hostname.replace(/^www\./,"");
  const source=NEWS_SOURCES.find(s=>{
    const domain=s.domain.replace(/^www\./,"");
    if(host!==domain&&!host.endsWith("."+domain))return false;
    if(s.pathPrefixes?.length&&!s.pathPrefixes.some(prefix=>url.pathname.startsWith(prefix)))return false;
    return true;
  });
  return source?{source,url}:null;
}

function attr(tag:string,name:string){
  const safe=name.replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&");
  const m=tag.match(new RegExp(safe+"\\s*=\\s*([\\\"'])([\\s\\S]*?)\\1","i"));
  return m?.[2]||"";
}

function meta(html:string,key:string){
  const tags=html.match(/<meta\b[^>]*>/gi)||[];
  for(const tag of tags){
    const k=(attr(tag,"property")||attr(tag,"name")||attr(tag,"itemprop")).toLowerCase();
    if(k===key.toLowerCase())return attr(tag,"content");
  }
  return "";
}

function validIso(value:string){
  if(!value)return null;
  const n=Date.parse(value);
  return Number.isFinite(n)?new Date(n).toISOString():null;
}

function extractPublishedAt(html:string){
  const metaValue=
    meta(html,"article:published_time")||
    meta(html,"datePublished")||
    meta(html,"parsely-pub-date")||
    meta(html,"publish-date");
  const fromMeta=validIso(metaValue);
  if(fromMeta)return fromMeta;

  const jsonMatches=[
    ...html.matchAll(/["']datePublished["']\s*:\s*["']([^"']+)["']/gi),
    ...html.matchAll(/["']dateCreated["']\s*:\s*["']([^"']+)["']/gi),
  ];
  for(const m of jsonMatches){
    const iso=validIso(m[1]);
    if(iso)return iso;
  }

  const times=html.match(/<time\b[^>]*>/gi)||[];
  for(const tag of times){
    const iso=validIso(attr(tag,"datetime"));
    if(iso)return iso;
  }
  return null;
}

async function fetchTime(raw:string){
  const match=sourceFor(raw);
  if(!match)return {url:raw,published_at:null};

  try{
    const res=await fetch(match.url,{
      cache:"force-cache",
      signal:AbortSignal.timeout(9000),
      headers:{
        "User-Agent":"Mozilla/5.0 (compatible; Viralizougoiania-Radar/1.0)",
        "Accept-Language":"pt-BR,pt;q=0.9",
        Accept:"text/html,application/xhtml+xml",
      },
      next:{revalidate:300},
    });
    if(!res.ok)return {url:raw,published_at:null};
    const length=Number(res.headers.get("content-length")||0);
    if(length>MAX_HTML)return {url:raw,published_at:null};
    const html=(await res.text()).slice(0,MAX_HTML);
    return {url:raw,published_at:extractPublishedAt(html)};
  }catch{
    return {url:raw,published_at:null};
  }
}

async function inChunks<T,R>(items:T[],size:number,fn:(item:T)=>Promise<R>){
  const out:R[]=[];
  for(let i=0;i<items.length;i+=size){
    out.push(...await Promise.all(items.slice(i,i+size).map(fn)));
  }
  return out;
}

export async function POST(req:Request){
  if(!(await isAdmin()))return NextResponse.json({error:"Não autorizado"},{status:401});
  try{
    const body=await req.json();
    const urls:string[]=Array.isArray(body.urls)?body.urls.map((value:unknown)=>String(value)).filter((value:string)=>Boolean(value)).slice(0,50):[];
    if(!urls.length)return NextResponse.json({items:[]});
    const unique:string[]=[...new Set<string>(urls)];
    const items=await inChunks(unique,6,fetchTime);
    return NextResponse.json({items});
  }catch{
    return NextResponse.json({error:"Não foi possível consultar os horários."},{status:500});
  }
}
