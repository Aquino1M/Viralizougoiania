
"use client";

import { useState } from "react";
import type { ReviewStatus, RewriteResult } from "@/lib/types";

type Props = {
  sourceContent: string;
  sourceName: string;
  sourceUrl: string;
  sourceAuthor?: string;
  sourcePublishedAt?: string;
  sourceComplete?: boolean;
  sourceWordCount?: number;
  sourceCaptureMethod?: string;
  sourceTitle: string;
  sourceExcerpt: string;
  articleSection?: string;
  categories: string[];
  content: string;
  reviewStatus: ReviewStatus;
  similarity?: number | null;
  onContentChange: (value: string) => void;
  onReviewChange: (value: ReviewStatus) => void;
  onRewrite: (result: RewriteResult) => void;
};

export default function RewriteWorkbench(props: Props) {
  const [rewriting,setRewriting]=useState(false);
  const [error,setError]=useState("");
  const [warnings,setWarnings]=useState<string[]>([]);
  const [metrics,setMetrics]=useState<{source:number;rewrite:number;completeness:number;similarity:number}|null>(null);

  async function rewrite(){
    setRewriting(true);
    setError("");
    setWarnings([]);

    const r=await fetch("/api/rewrite-news",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        source_name:props.sourceName,
        source_url:props.sourceUrl,
        source_author:props.sourceAuthor||"",
        source_published_at:props.sourcePublishedAt||null,
        source_content:props.sourceContent,
        source_title:props.sourceTitle,
        source_excerpt:props.sourceExcerpt,
        article_section:props.articleSection||"",
        source_complete:props.sourceComplete!==false,
        categories:props.categories,
      }),
    });

    const d=await r.json().catch(()=>({}));
    setRewriting(false);

    if(!r.ok){
      setError(d.error||"Não foi possível reescrever a matéria.");
      return;
    }

    setWarnings(d.warnings||[]);
    setMetrics({
      source:Number(d.source_word_count||0),
      rewrite:Number(d.rewrite_word_count||0),
      completeness:Number(d.completeness_ratio||0),
      similarity:Number(d.similarity||0),
    });
    props.onReviewChange("unreviewed");
    props.onRewrite(d as RewriteResult);
  }

  const sim=metrics?.similarity ?? props.similarity ?? 0;
  const simPct=Math.round(sim*100);
  const completenessPct=metrics?Math.round(metrics.completeness*100):null;

  return <div className="rewriteWorkbench">
    <div className="rewriteHeader">
      <div>
        <span className="sectionLabel">Apuração e reescrita</span>
        <h2>Original × Viralizougoiania</h2>
        <p>O texto da fonte fica visível apenas no painel. A publicação usa a versão da redação.</p>
      </div>
      <button type="button" className="btn rewriteButton" onClick={rewrite} disabled={rewriting||!props.sourceContent}>
        {rewriting?"Reescrevendo matéria completa...":"✨ Reescrever matéria completa"}
      </button>
    </div>

    <div className="sourceAudit">
      <span className={props.sourceComplete===false?"auditWarn":"auditOk"}>
        {props.sourceComplete===false?"⚠ Captura possivelmente incompleta":"✓ Corpo capturado"}
      </span>
      <span>{props.sourceWordCount||0} palavras na fonte</span>
      {props.sourceCaptureMethod&&<span>Método: {props.sourceCaptureMethod}</span>}
      {sim>0&&<span className={sim>0.08?"auditWarn":"auditOk"}>Semelhança exata: {simPct}%</span>}
      {completenessPct!==null&&<span>Cobertura de tamanho: {completenessPct}%</span>}
    </div>

    {error&&<div className="notice error">{error}</div>}
    {warnings.length>0&&<div className="rewriteWarnings"><b>Conferência antes de publicar</b>{warnings.map((w,i)=><span key={i}>• {w}</span>)}</div>}

    <div className="rewriteColumns">
      <div className="rewritePane sourcePane">
        <div className="rewritePaneHead"><b>Texto original da fonte</b><small>Referência interna • não vai para a página pública</small></div>
        <textarea value={props.sourceContent} readOnly aria-label="Texto original capturado da fonte"/>
        <div className="sourceAttribution">
          <b>{props.sourceName}</b>
          {props.sourceAuthor&&<span> • {props.sourceAuthor}</span>}
          <a href={props.sourceUrl} target="_blank" rel="noreferrer">Abrir matéria original ↗</a>
        </div>
      </div>

      <div className="rewritePane">
        <div className="rewritePaneHead"><b>Versão Viralizougoiania</b><small>Texto que será publicado</small></div>
        <textarea value={props.content} onChange={e=>{props.onContentChange(e.target.value);props.onReviewChange("unreviewed");}} placeholder="Clique em “Reescrever matéria completa” ou escreva a versão da redação." aria-label="Versão reescrita"/>
        <label className="reviewCheck">
          <input type="checkbox" checked={props.reviewStatus==="reviewed"} onChange={e=>props.onReviewChange(e.target.checked?"reviewed":"unreviewed")}/>
          <span><b>Revisada pelo jornalista</b><small>Confirme somente depois de comparar fatos, nomes, datas, números e contexto com a fonte.</small></span>
        </label>
      </div>
    </div>
  </div>;
}
