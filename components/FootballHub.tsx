"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type { Post } from "@/lib/types";
import { FOOTBALL_TEAMS, BRASILEIRAO_STANDINGS, ROUND_FIXTURES, type FootballTeam, type StandingRow, type MatchFixture } from "@/lib/football-data";
import TeamShield from "@/components/TeamShield";
import NewsCard from "@/components/NewsCard";

import type { StoredFootballData } from "@/lib/football-sync";

interface FootballHubProps {
  posts: Post[];
  liveData?: StoredFootballData | null;
}

export default function FootballHub({ posts, liveData }: FootballHubProps) {
  const [selectedTeamCode, setSelectedTeamCode] = useState<string | null>(null);
  const standings: StandingRow[] = liveData?.standings && liveData.standings.length > 0 ? liveData.standings : BRASILEIRAO_STANDINGS;
  const fixtures: MatchFixture[] = liveData?.fixtures && liveData.fixtures.length > 0 ? liveData.fixtures : ROUND_FIXTURES;
  const [currentRound, setCurrentRound] = useState<number>(liveData?.currentRound || 26);
  const updatedAt = liveData?.updated_at || "";

  // Ordenação com os mais populares na frente
  const sortedTeams = useMemo(() => {
    return [...FOOTBALL_TEAMS].sort((a, b) => a.popularRank - b.popularRank);
  }, []);

  const selectedTeam = useMemo(() => {
    if (!selectedTeamCode) return null;
    return FOOTBALL_TEAMS.find((t) => t.code === selectedTeamCode) || null;
  }, [selectedTeamCode]);

  // Filtragem das notícias quando um time é selecionado
  const filteredPosts = useMemo(() => {
    if (!selectedTeam) return posts;
    const keywords = selectedTeam.keywords.map((k) => k.toLowerCase());
    return posts.filter((p) => {
      const searchTarget = `${p.title} ${p.excerpt} ${p.seo_keywords || ""}`.toLowerCase();
      return keywords.some((kw) => searchTarget.includes(kw));
    });
  }, [posts, selectedTeam]);

  // Rodadas disponíveis
  const fixturesForRound = useMemo(() => {
    return fixtures.filter((f) => f.round === currentRound);
  }, [fixtures, currentRound]);

  return (
    <div className="footballHub">
      {/* 1. SELEÇÃO DE TIMES: MAIS POPULARES NA FRENTE */}
      <section className="footballTeamSelectorSection">
        <div className="container">
          <div className="footballSectionHeader">
            <div>
              <span className="footballEyebrow">⚽ CAMPEONATO BRASILEIRO & CLUBES</span>
              <h2 className="footballSectionTitle">ESCOLHA SEU TIME</h2>
            </div>
            {selectedTeamCode && (
              <button
                type="button"
                className="footballResetFilterBtn"
                onClick={() => setSelectedTeamCode(null)}
              >
                ✕ Ver Todos os Clubes
              </button>
            )}
          </div>

          <div className="footballTeamsScroller">
            <div className="footballTeamsList">
              {sortedTeams.map((team) => {
                const isSelected = selectedTeamCode === team.code;
                return (
                  <button
                    key={team.id}
                    type="button"
                    className={`footballTeamItem ${isSelected ? "active" : ""}`}
                    onClick={() => {
                      if (selectedTeamCode === team.code) {
                        setSelectedTeamCode(null);
                      } else {
                        setSelectedTeamCode(team.code);
                      }
                    }}
                    title={`${team.name} (${team.code})`}
                  >
                    <div className="footballTeamShieldBox">
                      <TeamShield code={team.code} size={42} />
                    </div>
                    <span className="footballTeamCode">{team.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. MINI TABELA ATÉ O 10 COM SCROLL + RODADA DE JOGOS */}
      <section className="footballStandingsSection">
        <div className="container">
          <div className="footballStandingsGrid">
            {/* Coluna da Esquerda: Mini Tabela de Classificação */}
            <div className="footballStandingsCard">
              <div className="footballCardHeader">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="footballCardIcon">🏆</span>
                    <div>
                      <h3 className="footballCardTitle">Classificação Brasileirão Série A</h3>
                      <p className="footballCardSubtitle">
                        Mini tabela interativa • Role o scroll para ver até o 20º colocado
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="liveAutoSyncBadge" title="Tabela e jogos atualizados pelo mesmo Piloto 24/7 que atualiza o Radar e a fila">
                      <span className="liveDot"></span> Servidor 24/7 ativo: GitHub Actions • ciclo único a cada 10 min
                    </span>
                    {updatedAt && (
                      <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>
                        Atualizado {new Date(updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabela com scroll suave sem travar */}
              <div className="footballTableWrapper">
                <table className="footballTable">
                  <thead>
                    <tr>
                      <th className="thPos">#</th>
                      <th className="thTeam">Clube</th>
                      <th className="thNum" title="Pontos">P</th>
                      <th className="thNum" title="Jogos disputados">J</th>
                      <th className="thNum" title="Vitórias">V</th>
                      <th className="thNum" title="Empates">E</th>
                      <th className="thNum" title="Derrotas">D</th>
                      <th className="thNum" title="Saldo de Gols">SG</th>
                      <th className="thNum" title="Aproveitamento">%</th>
                      <th className="thRecent" title="Últimos 5 jogos">Recentes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => {
                      // Determinar a zona da tabela
                      let zoneClass = "";
                      if (row.position <= 4) zoneClass = "zoneLibertadores";
                      else if (row.position <= 6) zoneClass = "zonePreLibertadores";
                      else if (row.position <= 12) zoneClass = "zoneSulAmericana";
                      else if (row.position >= 17) zoneClass = "zoneRebaixamento";

                      const isSelected = selectedTeamCode === row.teamCode;

                      return (
                        <tr
                          key={row.position}
                          className={`${zoneClass} ${isSelected ? "rowSelected" : ""}`}
                          onClick={() => setSelectedTeamCode(row.teamCode)}
                          style={{ cursor: "pointer" }}
                        >
                          <td className="tdPos">
                            <span className="posIndicator"></span>
                            <span className="posNumber">{row.position}º</span>
                          </td>
                          <td className="tdTeam">
                            <div className="teamInfoCell">
                              <TeamShield code={row.teamCode} size={24} />
                              <span className="teamNameShort">{row.teamCode}</span>
                              <span className="teamNameFull">{row.teamName}</span>
                            </div>
                          </td>
                          <td className="tdNum tdPoints"><b>{row.points}</b></td>
                          <td className="tdNum">{row.played}</td>
                          <td className="tdNum">{row.won}</td>
                          <td className="tdNum">{row.drawn}</td>
                          <td className="tdNum">{row.lost}</td>
                          <td className="tdNum">{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
                          <td className="tdNum tdPercentage">{row.percentage}%</td>
                          <td className="tdRecent">
                            <div className="recentDots">
                              {row.recentForm.map((f, i) => (
                                <span
                                  key={i}
                                  className={`recentDot ${f === "W" ? "dotWin" : f === "D" ? "dotDraw" : "dotLoss"}`}
                                  title={f === "W" ? "Vitória" : f === "D" ? "Empate" : "Derrota"}
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legenda compacta das zonas */}
              <div className="footballTableLegend">
                <span className="legendItem">
                  <span className="legendDot dotLibertadores"></span> Libertadores (1º ao 4º)
                </span>
                <span className="legendItem">
                  <span className="legendDot dotPreLibertadores"></span> Pré-Libertadores (5º e 6º)
                </span>
                <span className="legendItem">
                  <span className="legendDot dotSulAmericana"></span> Sul-Americana (7º ao 12º)
                </span>
                <span className="legendItem">
                  <span className="legendDot dotRebaixamento"></span> Rebaixamento (17º ao 20º)
                </span>
              </div>
            </div>

            {/* Coluna da Direita: Rodada de Jogos */}
            <div className="footballFixturesCard">
              <div className="footballFixturesHeader">
                <button
                  type="button"
                  className="roundNavBtn"
                  onClick={() => setCurrentRound((r) => Math.max(1, r - 1))}
                  title="Rodada anterior"
                >
                  ‹
                </button>
                <div className="roundTitle">
                  <b>{currentRound}ª Rodada</b>
                  <span>Campeonato Brasileiro</span>
                </div>
                <button
                  type="button"
                  className="roundNavBtn"
                  onClick={() => setCurrentRound((r) => Math.min(38, r + 1))}
                  title="Próxima rodada"
                >
                  ›
                </button>
              </div>

              <div className="footballFixturesList">
                {fixturesForRound.length > 0 ? (
                  fixturesForRound.map((fixture) => (
                    <div key={fixture.id} className="fixtureMatchCard">
                      <div className="fixtureMeta">
                        <span>{fixture.dateStr} • {fixture.timeStr}</span>
                        <span className="fixtureStadium">📍 {fixture.stadium}</span>
                      </div>

                      <div className="fixtureScoreRow">
                        {/* Time Mandante */}
                        <div className="fixtureTeam homeTeam">
                          <span className="fixtureTeamCode">{fixture.homeTeamCode}</span>
                          <TeamShield code={fixture.homeTeamCode} size={28} />
                        </div>

                        {/* Placar Central */}
                        <div className="fixtureScoreBox">
                          <span className="fixtureScore">
                            {fixture.homeScore !== undefined ? fixture.homeScore : "-"}
                          </span>
                          <span className="fixtureX">x</span>
                          <span className="fixtureScore">
                            {fixture.awayScore !== undefined ? fixture.awayScore : "-"}
                          </span>
                        </div>

                        {/* Time Visitante */}
                        <div className="fixtureTeam awayTeam">
                          <TeamShield code={fixture.awayTeamCode} size={28} />
                          <span className="fixtureTeamCode">{fixture.awayTeamCode}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty" style={{ padding: 24, fontSize: 13 }}>
                    Nenhum jogo cadastrado para a {currentRound}ª rodada.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MATÉRIAS DE FUTEBOL POSTADAS NO SITE (SEM REDIRECIONAR) */}
      <section className="footballNewsSection">
        <div className="container">
          <div className="footballNewsHeader">
            <div>
              <span className="footballEyebrow">
                {selectedTeam ? `NOTÍCIAS DO ${selectedTeam.name.toUpperCase()}` : "COBERTURA COMPLETA"}
              </span>
              <h2 className="footballSectionTitle">
                {selectedTeam ? `Últimas notícias do ${selectedTeam.name}` : "Notícias do Futebol no Viralizougoiania"}
              </h2>
            </div>
            <span className="footballPostCount">
              {filteredPosts.length} {filteredPosts.length === 1 ? "matéria" : "matérias"}
            </span>
          </div>

          {filteredPosts.length > 0 ? (
            <div className="cardGrid">
              {filteredPosts.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: 40 }}>
              {selectedTeam ? (
                <>
                  <p>Ainda não há matérias publicadas especificamente sobre o <b>{selectedTeam.name}</b>.</p>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ marginTop: 12 }}
                    onClick={() => setSelectedTeamCode(null)}
                  >
                    Ver todas as matérias de Futebol
                  </button>
                </>
              ) : (
                <p>Nenhuma matéria de Futebol cadastrada ainda. Utilize o Radar no painel para importar as últimas novidades!</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
