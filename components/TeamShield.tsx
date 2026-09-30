"use client";

import React from "react";
import { FOOTBALL_TEAMS } from "@/lib/football-data";

interface TeamShieldProps {
  code: string;
  size?: number;
  className?: string;
  showName?: boolean;
}

export default function TeamShield({
  code,
  size = 38,
  className = "",
  showName = false,
}: TeamShieldProps) {
  const normalizedCode = code.toUpperCase();
  const team = FOOTBALL_TEAMS.find((t) => t.code.toUpperCase() === normalizedCode);
  const label = team?.name || normalizedCode;

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
      <span
        className="teamShieldImageBox"
        style={{
          width: size,
          height: size,
        }}
      >
        <img
          className="teamShieldImage"
          src={`/api/football/badge/${encodeURIComponent(normalizedCode)}`}
          alt={`Escudo do ${label}`}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </span>

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
          {normalizedCode}
        </span>
      )}
    </div>
  );
}
