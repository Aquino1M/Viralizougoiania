import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Correção inteligente de títulos de notícias com gramática, concordância e acentuação em Português (Brasil).
 * Usa Gemini API se configurado, LanguageTool e fallback com regras léxicas do jornalismo brasileiro.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const rawText = typeof body.text === "string" ? body.text.trim() : "";

    if (!rawText) {
      return NextResponse.json({ error: "Texto vazio para correção." }, { status: 400 });
    }

    let corrected = "";

    // 1. Tenta Gemini API se chave estiver presente
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `Você é um editor sênior de jornalismo brasileiro. Corrija rigorosamente os erros de português, gramática, acentuação, ortografia e pontuação do seguinte título de notícia ou arte para redes sociais.
Mantenha o mesmo sentido, tom de impacto e estilo. Se o texto estiver todo em caixa alta ou baixa, preserve a intenção editorial.
Retorne APENAS o texto final corrigido, sem aspas, sem introdução, sem marcadores e sem explicações.

Texto original:
"${rawText}"`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 150,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const candidate = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (candidate) {
            corrected = candidate.replace(/^["'«“]+|["'»”]+$/g, "").trim();
          }
        }
      } catch (err) {
        console.warn("[correct-title] Erro no Gemini, usando fallback:", err);
      }
    }

    // 2. Se não corrigiu com Gemini, tenta LanguageTool
    if (!corrected) {
      try {
        const ltParams = new URLSearchParams({
          text: rawText,
          language: "pt-BR",
        });
        const ltRes = await fetch("https://api.languagetool.org/v2/check", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: ltParams.toString(),
        });

        if (ltRes.ok) {
          const ltData = await ltRes.json();
          const matches = Array.isArray(ltData.matches) ? ltData.matches : [];
          if (matches.length > 0) {
            // Aplica substituições do final para o início para manter offsets válidos
            let textWorking = rawText;
            const sortedMatches = [...matches].sort((a, b) => b.offset - a.offset);
            for (const match of sortedMatches) {
              if (match.replacements && match.replacements.length > 0) {
                const bestRepl = match.replacements[0].value;
                const before = textWorking.slice(0, match.offset);
                const after = textWorking.slice(match.offset + match.length);
                textWorking = before + bestRepl + after;
              }
            }
            if (textWorking && textWorking !== rawText) {
              corrected = textWorking;
            }
          }
        }
      } catch (err) {
        console.warn("[correct-title] Erro no LanguageTool, usando fallback léxico:", err);
      }
    }

    // 3. Fallback inteligente de regras ortográficas em Português
    if (!corrected) {
      corrected = applyPortugueseLexicalCorrections(rawText);
    }

    // Limpeza final de pontuação e espaços duplos
    corrected = corrected
      .replace(/\s+/g, " ")
      .replace(/\s+([.,;:!?])/g, "$1")
      .trim();

    return NextResponse.json({
      success: true,
      original: rawText,
      corrected: corrected || rawText,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao corrigir texto" },
      { status: 500 }
    );
  }
}

/**
 * Corrige erros comuns de digitação, pontuação e acentuação da língua portuguesa
 */
function applyPortugueseLexicalCorrections(text: string): string {
  let result = text;

  const isUpper = text === text.toUpperCase() && text.length > 3;

  const dictionary: [RegExp, string][] = [
    [/\bnao\b/gi, "não"],
    [/\bvoce\b/gi, "você"],
    [/\bvoces\b/gi, "vocês"],
    [/\bpolitica\b/gi, "política"],
    [/\bpolitico\b/gi, "político"],
    [/\bpoliticos\b/gi, "políticos"],
    [/\bnoticia\b/gi, "notícia"],
    [/\bnoticias\b/gi, "notícias"],
    [/\bgoiania\b/gi, "Goiânia"],
    [/\bgoias\b/gi, "Goiás"],
    [/\bbrasileiro\b/gi, "brasileiro"],
    [/\bbrasil\b/gi, "Brasil"],
    [/\bjustica\b/gi, "justiça"],
    [/\beleicao\b/gi, "eleição"],
    [/\beleicoes\b/gi, "eleições"],
    [/\bpolicia\b/gi, "polícia"],
    [/\bcamara\b/gi, "câmara"],
    [/\bdebito\b/gi, "débito"],
    [/\bcredito\b/gi, "crédito"],
    [/\bja\b/gi, "já"],
    [/\bate\b/gi, "até"],
    [/\bapos\b/gi, "após"],
    [/\btambem\b/gi, "também"],
    [/\bso\b/gi, "só"],
    [/\bvideo\b/gi, "vídeo"],
    [/\bvideos\b/gi, "vídeos"],
    [/\baonde ele corrigi\b/gi, "onde ele corrige"],
    [/\bcorrigi\b/gi, "corrige"],
    [/\bpaciencia\b/gi, "paciência"],
    [/\blapada\b/gi, "lapada"],
    [/\bflavio\b/gi, "Flávio"],
    [/\bbolsonaro\b/gi, "Bolsonaro"],
    [/\blula\b/gi, "Lula"],
    [/\bvereador\b/gi, "vereador"],
    [/\btransparente\b/gi, "transparente"],
    [/\bpublico\b/gi, "público"],
    [/\bpublica\b/gi, "pública"],
    [/\banalise\b/gi, "análise"],
    [/\bhorario\b/gi, "horário"],
    [/\bfiscalizacao\b/gi, "fiscalização"],
    [/\boperacao\b/gi, "operação"],
    [/\bagora\b/gi, "agora"],
    [/\bveja\b/gi, "veja"],
    [/\burgente\b/gi, "URGENTE"],
    [/\bplantao\b/gi, "PLANTÃO"],
  ];

  for (const [regex, repl] of dictionary) {
    result = result.replace(regex, (match) => {
      if (isUpper) return repl.toUpperCase();
      // Preserva maiúscula se a primeira letra era maiúscula
      if (match[0] === match[0].toUpperCase()) {
        return repl[0].toUpperCase() + repl.slice(1);
      }
      return repl;
    });
  }

  // Capitalização da primeira letra de frases
  result = result.replace(/(^\s*|[.!?]\s+)([a-zà-ú])/g, (_, p1, p2) => p1 + p2.toUpperCase());

  if (isUpper) {
    result = result.toUpperCase();
  }

  return result;
}
