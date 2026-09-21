"use client";

import { useEffect, useMemo, useState } from "react";
import type { ImportedNews } from "@/lib/types";

type Source = {
  id: string;
  name: string;
  url: string;
  scope: "goias" | "goiania";
  count: number;
  error?: string;
};

type Item = {
  id: string;
  title: string;
  url: string;
  source_id: string;
  source_name: string;
  source_url: string;
  scope: "goias" | "goiania";
  published_at?: string | null;
};

function exactTime(value?:string|null){
  if(!value)return "";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "";
  const now=new Date();
  const sameDay=d.toLocaleDateString("pt-BR")===now.toLocaleDateString("pt-BR");
  const time=d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  return sameDay?time:d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})+" • "+time;
}

function elapsed(value?:string|null){
  if(!value)return "";
  const d=new Date(value).getTime();
  if(!Number.isFinite(d))return "";
  const diff=Math.max(0,Date.now()-d);
  const min=Math.floor(diff/60000);
  if(min<1)return "agora";
  if(min<60)return "há "+min+" min";
  const hours=Math.floor(min/60);
  if(hours<24)return "há "+hours+(hours===1?" hora":" horas");
  const days=Math.floor(hours/24);
  if(days<7)return "há "+days+(days===1?" dia":" dias");
  return "";
}

export default function NewsRadar({ onImport }: { onImport: (item: ImportedNews) => void }) {
  const [sources,setSources]=useState<Source[]>([]);
  const [items,setItems]=useState<Item[]>([]);
  const [selected,setSelected]=useState("all");
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [loadingTimes,setLoadingTimes]=useState(false);
  const [importing,setImporting]=useState("");
  const [error,setError]=useState("");
  const [updatedAt,setUpdatedAt]=useState("");

  async function loadTimes(list:Item[]){
    const missing=list.filter(item=>!item.published_at).map(item=>item.url);
    if(!missing.length)return;
    setLoadingTimes(true);
    try{
      const r=await fetch("/api/news-radar/times",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({urls:missing})
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!Array.isArray(d.items))return;
      const times=new Map<string,string|null>(d.items.map((x:{url:string;published_at:string|null}):[string,string|null]=>[x.url,x.published_at]));
      setItems(current=>current.map(item=>times.has(item.url)?{...item,published_at:times.get(item.url)||null}:item));
    }finally{
      setLoadingTimes(false);
    }
  }

  async function load(){
    setLoading(true);setError("");
    const r=await fetch("/api/news-radar",{cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    setLoading(false);
    if(!r.ok){setError(d.error||"Não foi possível carregar o radar.");return;}
    const nextItems=(d.items||[]) as Item[];
    setSources(d.sources||[]);
    setItems(nextItems);
    setUpdatedAt(d.updated_at||"");
    void loadTimes(nextItems);
  }

  useEffect(()=>{load();},[]);

  const filtered=useMemo(()=>{
    const term=query.trim().toLowerCase();
    return items.filter(item=>{
      if(selected!=="all"&&item.source_id!==selected)return false;
      if(term&&!item.title.toLowerCase().includes(term))return false;
      return true;
    });
  },[items,selected,query]);

  async function importItem(item:Item){
    setImporting(item.url);setError("");
    const r=await fetch("/api/import-news",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({url:item.url,mode:"article"})
    });
    const d=await r.json().catch(()=>({}));
    setImporting("");
    if(!r.ok||!d.items?.[0]){setError(d.error||"Não foi possível importar essa matéria.");return;}
    onImport(d.items[0]);
  }

  return <section className="panel radarPanel">
    <div className="toolbar">
      <div><h1>Radar Goiás</h1><div style={{color:"#68736e",fontSize:13}}>Acompanhe manchetes de Goiás e Goiânia, capture a matéria completa para a bancada interna e leve tudo direto ao editor.</div></div>
      <button className="btn secondary" onClick={load} disabled={loading}>{loading?"Atualizando...":"↻ Atualizar"}</button>
    </div>

    <div className="radarNotice"><b>Importação completa com crédito:</b> o sistema abre a página da fonte, tenta capturar todos os parágrafos da matéria para referência interna, preserva autor/data/imagem/crédito e registra o link original. Depois, a bancada de reescrita cria a versão própria do Viralizougoiania.</div>

    <div className="radarSources">
      <button className={selected==="all"?"radarSource active":"radarSource"} onClick={()=>setSelected("all")}><span>Todos</span><b>{items.length}</b></button>
      {sources.map(source=><button key={source.id} className={selected===source.id?"radarSource active":"radarSource"} onClick={()=>setSelected(source.id)}>
        <span>{source.name}</span><b>{source.count}</b>{source.error&&<small>indisponível</small>}
      </button>)}
    </div>

    <div className="radarTools">
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filtrar as manchetes..."/>
      <span>{loadingTimes?"Consultando horários...":updatedAt?"Atualizado "+new Date(updatedAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):""}</span>
    </div>

    {error&&<div className="notice error">{error}</div>}
    {loading?<div className="empty">Buscando notícias de Goiás e Goiânia...</div>:
      filtered.length?<div className="radarList">{filtered.map(item=><article className="radarItem" key={item.url}>
        <div className="radarSourceMark">{item.source_name.slice(0,1).toUpperCase()}</div>
        <div className="radarItemBody">
          <div className="radarItemMeta"><span>{item.source_name}</span><span>{item.scope==="goiania"?"Goiânia":"Goiás"}</span></div>
          <h3>{item.title}</h3>
          <div className="actions">
            <button className="btn" disabled={Boolean(importing)} onClick={()=>importItem(item)}>{importing===item.url?"Capturando página...":"Importar matéria completa"}</button>
            <a className="btn secondary" href={item.url} target="_blank" rel="noreferrer">Abrir fonte</a>
          </div>
        </div>
        <div className="radarPublished">
          {item.published_at?<><span className="radarClock">◷</span><div><b>{exactTime(item.published_at)}</b><small>{elapsed(item.published_at)}</small></div></>:<><span className="radarClock muted">◷</span><div><b className="mutedText">{loadingTimes?"...":"Horário não informado"}</b></div></>}
        </div>
      </article>)}</div>:<div className="empty">Nenhuma manchete encontrada com esse filtro.</div>}
  </section>;
}
