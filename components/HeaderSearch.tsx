"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

function SearchIcon(){
  return <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}

export default function HeaderSearch(){
  const [open,setOpen]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    if(open) requestAnimationFrame(()=>inputRef.current?.focus());
  },[open]);

  useEffect(()=>{
    function onKey(e:KeyboardEvent){
      if(e.key==="Escape") setOpen(false);
    }
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[]);

  function onSubmit(e:FormEvent<HTMLFormElement>){
    const value=inputRef.current?.value.trim()||"";
    if(!value){
      e.preventDefault();
      setOpen(true);
      inputRef.current?.focus();
    }
  }

  return <form action="/busca" method="GET" className={"headerSearchForm "+(open?"mobileSearchOpen":"")} role="search" onSubmit={onSubmit}>
    <input ref={inputRef} type="search" name="q" placeholder="Buscar notícia, time, bairro..." aria-label="Buscar notícias"/>
    {open&&<button type="button" className="searchCloseBtn" aria-label="Fechar busca" onClick={()=>setOpen(false)}>×</button>}
    <button
      type="submit"
      className="searchSubmitBtn"
      aria-label="Pesquisar"
      onClick={(e)=>{
        if(!open && typeof window!=="undefined" && window.matchMedia("(max-width: 620px)").matches){
          e.preventDefault();
          setOpen(true);
        }
      }}
    >
      <SearchIcon/>
    </button>
  </form>;
}
