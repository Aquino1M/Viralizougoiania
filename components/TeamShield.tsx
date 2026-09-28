"use client";

import React from "react";
import { FOOTBALL_TEAMS, type FootballTeam } from "@/lib/football-data";

interface TeamShieldProps {
  code: string;
  size?: number;
  className?: string;
  showName?: boolean;
}

export default function TeamShield({ code, size = 38, className = "", showName = false }: TeamShieldProps) {
  const team = FOOTBALL_TEAMS.find((t) => t.code.toUpperCase() === code.toUpperCase()) || {
    code: code.toUpperCase(),
    name: code,
    primaryColor: "#334155",
    secondaryColor: "#ffffff",
  };

  const primary = team.primaryColor;
  const secondary = team.secondaryColor;

  return (
    <div
      className={`teamShieldWrap ${className}`}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))",
          transition: "transform 0.2s ease",
        }}
      >
        {/* Borda externa com gradiente e formato de escudo */}
        <defs>
          <linearGradient id={`grad-${team.code}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary === "#ffffff" ? primary : secondary} />
          </linearGradient>
          <filter id={`shadow-${team.code}`} x1="-10%" y1="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Formato de Escudo Circular Arredondado */}
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="18"
          fill="#ffffff"
          stroke={`url(#grad-${team.code})`}
          strokeWidth="2.5"
        />

        {/* Fundo do emblema com a cor primária */}
        <circle cx="20" cy="20" r="15" fill={primary} />

        {/* Detalhe estético / anel secundário */}
        <circle
          cx="20"
          cy="20"
          r="13.5"
          fill="none"
          stroke={secondary}
          strokeWidth="1.2"
          opacity="0.85"
        />

        {/* Sigla do Clube centralizada */}
        <text
          x="20"
          y="23.5"
          textAnchor="middle"
          fill={secondary === "#000000" ? "#ffffff" : secondary}
          fontSize={team.code.length > 3 ? "9" : "10.5"}
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-0.5px"
        >
          {team.code}
        </text>
      </svg>
      {showName && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#1e293b",
            letterSpacing: "-0.2px",
            textTransform: "uppercase",
          }}
        >
          {team.code}
        </span>
      )}
    </div>
  );
}
