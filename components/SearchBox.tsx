"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function SearchIcon(){
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}

export default function SearchBox(){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const inputRef=useRef<HTMLInputElement>(null);
  const router=useRouter();

  function toggle(){
    const next=!open;
    setOpen(next);
    if(next) setTimeout(()=>inputRef.current?.focus(),0);
  }

  function submit(e:FormEvent){
    e.preventDefault();
    const q=query.trim();
    if(!q){inputRef.current?.focus();return;}
    setOpen(false);
    router.push(`/buscar?q=${encodeURIComponent(q)}`);
  }

  return <div className="searchControl">
    <button className="roundIcon" type="button" aria-label={open?"Fechar pesquisa":"Pesquisar notícias"} aria-expanded={open} onClick={toggle}><SearchIcon/></button>
    {open&&<form className="searchPanel" onSubmit={submit}>
      <label htmlFor="site-search">Pesquisar no Viralizougoiania</label>
      <div className="searchFieldRow">
        <input ref={inputRef} id="site-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Digite o assunto da notícia..." autoComplete="off"/>
        <button type="submit" className="searchSubmit">Pesquisar</button>
      </div>
      <small>Busque por título, assunto, bairro, editoria ou palavra da matéria.</small>
    </form>}
  </div>;
}
