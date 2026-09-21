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
};

export default function NewsRadar({ onImport }: { onImport: (item: ImportedNews) => void }) {
  const [sources,setSources]=useState<Source[]>([]);
  const [items,setItems]=useState<Item[]>([]);
  const [selected,setSelected]=useState("all");
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [importing,setImporting]=useState("");
  const [error,setError]=useState("");
  const [updatedAt,setUpdatedAt]=useState("");

  async function load(){
    setLoading(true);setError("");
    const r=await fetch("/api/news-radar",{cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    setLoading(false);
    if(!r.ok){setError(d.error||"Não foi possível carregar o radar.");return;}
    setSources(d.sources||[]);
    setItems(d.items||[]);
    setUpdatedAt(d.updated_at||"");
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
      <div><h1>Radar Goiás</h1><div style={{color:"#68736e",fontSize:13}}>Acompanhe manchetes de Goiás e Goiânia em vários veículos e leve uma delas direto ao editor.</div></div>
      <button className="btn secondary" onClick={load} disabled={loading}>{loading?"Atualizando...":"↻ Atualizar"}</button>
    </div>

    <div className="radarNotice"><b>Importação com crédito:</b> ao importar, o painel preenche título, resumo, imagem, autor/data quando disponíveis e registra o nome e o link da fonte. A notícia abre como rascunho para revisão editorial.</div>

    <div className="radarSources">
      <button className={selected==="all"?"radarSource active":"radarSource"} onClick={()=>setSelected("all")}><span>Todos</span><b>{items.length}</b></button>
      {sources.map(source=><button key={source.id} className={selected===source.id?"radarSource active":"radarSource"} onClick={()=>setSelected(source.id)}>
        <span>{source.name}</span><b>{source.count}</b>{source.error&&<small>indisponível</small>}
      </button>)}
    </div>

    <div className="radarTools">
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filtrar as manchetes..."/>
      <span>{updatedAt?"Atualizado "+new Date(updatedAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):""}</span>
    </div>

    {error&&<div className="notice error">{error}</div>}
    {loading?<div className="empty">Buscando notícias de Goiás e Goiânia...</div>:
      filtered.length?<div className="radarList">{filtered.map(item=><article className="radarItem" key={item.url}>
        <div className="radarSourceMark">{item.source_name.slice(0,1).toUpperCase()}</div>
        <div className="radarItemBody">
          <div className="radarItemMeta"><span>{item.source_name}</span><span>{item.scope==="goiania"?"Goiânia":"Goiás"}</span></div>
          <h3>{item.title}</h3>
          <div className="actions">
            <button className="btn" disabled={Boolean(importing)} onClick={()=>importItem(item)}>{importing===item.url?"Importando...":"Importar notícia"}</button>
            <a className="btn secondary" href={item.url} target="_blank" rel="noreferrer">Abrir fonte</a>
          </div>
        </div>
      </article>)}</div>:<div className="empty">Nenhuma manchete encontrada com esse filtro.</div>}
  </section>;
}
