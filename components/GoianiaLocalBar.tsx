"use client";

import React, { useState } from "react";
import Link from "next/link";
import TeamShield from "@/components/TeamShield";

export default function GoianiaLocalBar() {
  const [activeTab, setActiveTab] = useState<"clima-transito" | "futebol">("clima-transito");

  return (
    <aside className="goianiaLocalBar" aria-label="Painel Goiânia em Tempo Real">
      <div className="container localBarContainer">
        {/* Toggle dos Cards */}
        <div className="localBarTabs">
          <button
            type="button"
            className={`localBarTabBtn ${activeTab === "clima-transito" ? "active" : ""}`}
            onClick={() => setActiveTab("clima-transito")}
          >
            <span className="liveDotSmall" />
            <span>🚗 Trânsito & Clima da Capital</span>
          </button>
          <button
            type="button"
            className={`localBarTabBtn ${activeTab === "futebol" ? "active" : ""}`}
            onClick={() => setActiveTab("futebol")}
          >
            <span>⚽ Trio Goiano (Goiás · Vila · Dragão)</span>
          </button>
        </div>

        {/* CONTEÚDO: CLIMA & TRÂNSITO */}
        {activeTab === "clima-transito" && (
          <div className="localBarWeatherTraffic">
            {/* Clima de Goiânia */}
            <div className="localWeatherCard">
              <div className="weatherIcon">☀️</div>
              <div className="weatherInfo">
                <div className="weatherTop">
                  <strong className="weatherTemp">31°C</strong>
                  <span className="weatherCity">Goiânia</span>
                </div>
                <div className="weatherDetails">
                  <span className="weatherHumidity">💧 Umidade: <b>38%</b> (Atenção à hidratação)</span>
                  <span className="weatherCondition">Céu aberto · Típico calor goiano</span>
                </div>
              </div>
            </div>

            {/* Alertas de Trânsito dos Pontos Críticos */}
            <div className="localTrafficRow">
              <div className="trafficPill moderate">
                <span className="trafficDot" />
                <span className="trafficLabel">Eixo Anhanguera</span>
                <span className="trafficStatus">Fluxo moderado</span>
              </div>
              <div className="trafficPill normal">
                <span className="trafficDot" />
                <span className="trafficLabel">Viaduto T-63</span>
                <span className="trafficStatus">Livre</span>
              </div>
              <div className="trafficPill normal">
                <span className="trafficDot" />
                <span className="trafficLabel">Jamel Cecílio</span>
                <span className="trafficStatus">Normal</span>
              </div>
              <div className="trafficPill warning">
                <span className="trafficDot" />
                <span className="trafficLabel">BR-153 (Flamboyant)</span>
                <span className="trafficStatus">Lentidão</span>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO: FUTEBOL DOS TIMES GOIANOS */}
        {activeTab === "futebol" && (
          <div className="localBarFootball">
            {/* Goiás E.C. */}
            <div className="teamCard goias">
              <div className="teamHeader">
                <TeamShield code="GOI" size={24} />
                <span className="teamName">Goiás E.C.</span>
              </div>
              <div className="teamMatch">
                <span className="matchStatus live">ÚLTIMO JOGO</span>
                <span className="matchScore">Goiás <b>2 × 1</b> Goianão</span>
                <span className="matchNext">Próx: Vila Nova (Clássico)</span>
              </div>
            </div>

            {/* Vila Nova F.C. */}
            <div className="teamCard vilanova">
              <div className="teamHeader">
                <TeamShield code="VIL" size={24} />
                <span className="teamName">Vila Nova</span>
              </div>
              <div className="teamMatch">
                <span className="matchStatus scheduled">PRÓXIMO JOGO</span>
                <span className="matchScore">Vila Nova vs Anápolis</span>
                <span className="matchNext">Amanhã · 16h no OBA</span>
              </div>
            </div>

            {/* Atlético-GO */}
            <div className="teamCard atletico">
              <div className="teamHeader">
                <TeamShield code="ACG" size={24} />
                <span className="teamName">Atlético-GO</span>
              </div>
              <div className="teamMatch">
                <span className="matchStatus scheduled">RODADA</span>
                <span className="matchScore">Dragão vs Goiatuba</span>
                <span className="matchNext">Quarta · 19h30 no Accioly</span>
              </div>
            </div>

            <Link href="/categoria/esportes" className="teamHubLink">
              Tabela Completa & Notícias ➔
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
