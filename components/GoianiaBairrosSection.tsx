"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import NewsCard from "@/components/NewsCard";
import type { Post } from "@/lib/types";

interface Props {
  posts: Post[];
}

const BAIRROS_GOIANIA = [
  { id: "todos", name: "Todos os Bairros", icon: "📍" },
  { id: "bueno", name: "Setor Bueno", icon: "🏢" },
  { id: "campinas", name: "Campinas", icon: "🛍️" },
  { id: "marista", name: "Setor Marista", icon: "☕" },
  { id: "noroeste", name: "Região Noroeste", icon: "🏘️" },
  { id: "jardim-goias", name: "Jardim Goiás", icon: "🌳" },
  { id: "centro", name: "Centro Histórico", icon: "🏛️" },
  { id: "oeste", name: "Setor Oeste", icon: "🌲" },
  { id: "aparecida", name: "Aparecida de Goiânia", icon: "🚨" },
];

export default function GoianiaBairrosSection({ posts }: Props) {
  const [selectedBairro, setSelectedBairro] = useState<string>("todos");

  const filteredPosts = useMemo(() => {
    if (selectedBairro === "todos") {
      return posts.slice(0, 6);
    }

    const query = selectedBairro.replace("-", " ");
    const matches = posts.filter((p) => {
      const text = `${p.title} ${p.excerpt || ""} ${p.category} ${p.city || ""}`.toLowerCase();
      if (selectedBairro === "noroeste") {
        return text.includes("noroeste") || text.includes("finsocial") || text.includes("curitiba");
      }
      if (selectedBairro === "jardim-goias") {
        return text.includes("jardim goiás") || text.includes("jardim goias") || text.includes("flamboyant");
      }
      if (selectedBairro === "aparecida") {
        return text.includes("aparecida") || text.includes("garavelo") || text.includes("buriti");
      }
      return text.includes(query);
    });

    return matches.length > 0 ? matches.slice(0, 6) : posts.slice(0, 3);
  }, [posts, selectedBairro]);

  const activeBairroObj = BAIRROS_GOIANIA.find((b) => b.id === selectedBairro);

  return (
    <section className="section goianiaBairrosSection" id="filtro-bairros">
      <div className="container">
        <div className="sectionHead">
          <div>
            <span className="sectionLabel">📍 Radar da Capital</span>
            <h2>Goiânia e seus Bairros</h2>
            <p className="bairroSubtitle">
              Escolha seu setor e acompanhe na hora o que aconteceu perto da sua casa ou trabalho:
            </p>
          </div>
          <Link href="/categoria/bairros" className="verMaisBairros">
            Ver todas do seu bairro <span>→</span>
          </Link>
        </div>

        {/* Barra de Filtro Rápido por Bairro */}
        <div className="bairrosFilterBar" role="tablist" aria-label="Bairros de Goiânia">
          {BAIRROS_GOIANIA.map((b) => {
            const isActive = selectedBairro === b.id;
            return (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`bairroPillBtn ${isActive ? "active" : ""}`}
                onClick={() => setSelectedBairro(b.id)}
              >
                <span className="bairroIcon">{b.icon}</span>
                <span className="bairroName">{b.name}</span>
              </button>
            );
          })}
        </div>

        {/* Indicador do filtro ativo */}
        {selectedBairro !== "todos" && (
          <div className="activeFilterNotice">
            <span>
              Filtrando matérias de: <b>{activeBairroObj?.name}</b>
            </span>
            <button type="button" onClick={() => setSelectedBairro("todos")}>
              Limpar filtro ✕
            </button>
          </div>
        )}

        {/* Grid de Cards dos Bairros */}
        <div className="cardGrid">
          {filteredPosts.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
