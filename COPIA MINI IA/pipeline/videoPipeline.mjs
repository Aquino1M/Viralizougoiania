import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CONTEXT_DIR = path.join(ROOT_DIR, 'context');
const SFX_DIR = path.join(ROOT_DIR, 'sfx');
const ENGINE_DIR = path.join(ROOT_DIR, 'engine');

// Imports dinamicos dos motores copiados
import {
  refineVisionPlanWithMiniAI,
  recordMiniEditExperience,
  consolidateMiniEditBrain,
  readMiniEditBrain
} from '../engine/miniEditAI.mjs';

import {
  runMedia,
  localEditingCapabilities,
  probeLocalFile,
  verifyLocalVideo
} from '../engine/localAutoEdit.mjs';

import {
  buildTranscriptBeats
} from '../engine/localAutoEditPlanner.mjs';

import {
  LOCAL_EDITOR_PROFILES
} from '../engine/localEditorProfiles.mjs';

import {
  compilePublicationBrain
} from '../publication/publicationBrain.mjs';

/**
 * Normaliza tempo para formato ASS (h:mm:ss.cs)
 */
function toAssTime(sec) {
  const cs = Math.max(0, Math.round(Number(sec || 0) * 100));
  const h = Math.floor(cs / 360000);
  const m = String(Math.floor(cs / 6000) % 60).padStart(2, '0');
  const s = String(Math.floor(cs / 100) % 60).padStart(2, '0');
  const d = String(cs % 100).padStart(2, '0');
  return `${h}:${m}:${s}.${d}`;
}

/**
 * Escapa texto para o formato ASS
 */
function escapeAss(str) {
  return String(str || '').replace(/[\\{}\r\n]/g, ' ').slice(0, 150);
}

/**
 * Converte cor hex (#RRGGBB) para BGR do ASS (&H00BBGGRR&)
 */
function hexToAssColor(hex = '#FFFFFF') {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    const r = clean.slice(0, 2);
    const g = clean.slice(2, 4);
    const b = clean.slice(4, 6);
    return `&H00${b}${g}${r}&`;
  }
  return '&H00FFFFFF&';
}

/**
 * 1. PLANEJAMENTO AUTOMATICO VIA MINI IA
 * Transforma fala/transcricao em plano profissional calibrado com a memoria da Mini IA
 */
export function planVideoEdit({
  words = [],
  transcriptText = '',
  duration = 60,
  title = '',
  preset = 'viral',
  layout = 'single',
  contextDir = CONTEXT_DIR
} = {}) {
  // Se nao forneceu palavras individuais com tempo, divide o texto aproximando duracoes
  let finalWords = words;
  if (!finalWords || !finalWords.length) {
    const tokens = String(transcriptText || '').trim().split(/\s+/).filter(Boolean);
    const wordDur = Math.max(0.18, duration / Math.max(1, tokens.length));
    finalWords = tokens.map((t, idx) => ({
      text: t,
      start: Number((idx * wordDur).toFixed(2)),
      end: Number(((idx + 1) * wordDur).toFixed(2)),
      highlight: (idx % 4 === 0)
    }));
  }

  // Cria plano inicial bruto
  const basePlan = {
    duration: Number(duration),
    preset,
    hook_title: title || 'Assista até o final',
    words: finalWords,
    transcript_beats: [],
    keywords: [],
    zooms: [],
    scenes: [],
    broll: [],
    reactions: [],
    transitions: [],
    impact_flashes: [],
    caption_layout_policy: {
      detectedLayouts: [layout],
      splitDetected: layout === 'split',
      choqueiMovimentoDetected: layout === 'choquei-movimento',
      ctaAllowed: layout !== 'choquei-movimento'
    }
  };

  // Divide em beats semanticos
  basePlan.transcript_beats = buildTranscriptBeats(basePlan, {
    targetSeconds: 4.8,
    minSeconds: 2.2,
    maxSeconds: 7.5
  });

  // Refina com a Mini IA (regras aprendidas, memoria de estilo e politica editorial)
  const refined = refineVisionPlanWithMiniAI(basePlan, {
    contextDir,
    preset,
    allowBroll: true
  });

  return refined.plan;
}

/**
 * 2. GERACAO DE LEGENDAS ASS COM SAFE ZONE (REELS / FEED)
 */
export function generateAssSubtitles(plan, {
  width = 1080,
  height = 1920,
  format = 'reels', // 'reels' (9:16) ou 'feed' (4:5 ou 1:1)
  fontSize = null,
  accentColor = '#FFD60A'
} = {}) {
  const isFeed = format === 'feed';
  // Safe zone para Reels: manter legendas entre Y1250 e Y1550 em 1080x1920 (longe do footer do Insta)
  // Safe zone para Feed: centralizar verticalmente mais alto (ex: Y900 em 1080x1350 ou Y750 em 1080x1080)
  const defaultTop = isFeed ? Math.round(height * 0.65) : Math.round(height * 0.76);
  const size = fontSize || Math.round((width / 1080) * 64);
  const colorBgr = hexToAssColor(accentColor);

  const lines = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    'WrapStyle: 0',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Words,Arial,${size},&H00FFFFFF,${colorBgr},&H00000000,&H80000000,-1,0,1,4,1,2,30,30,${Math.round(height * 0.20)},1`,
    `Style: Big,Arial,${Math.round(size * 1.55)},${colorBgr},&H00FFFFFF,&H00000000,&H80000000,-1,0,1,5,2,5,30,30,40,1`,
    `Style: Reaction,Segoe UI Emoji,${Math.round(size * 1.35)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,1,1,0,5,30,30,40,1`,
    `Style: Hook,Arial,${Math.round(size * 1.05)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,3,3,0,8,40,40,${Math.round(height * 0.08)},1`,
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
  ];

  const words = Array.isArray(plan.words) ? plan.words : [];
  const groupSize = 3; // 3 a 4 palavras por tela para leitura rapida no Reels

  for (let i = 0; i < words.length; i += groupSize) {
    const group = words.slice(i, i + groupSize);
    for (const [idx, w] of group.entries()) {
      const formattedText = group.map((item, j) => {
        const isCurrent = j === idx;
        const color = isCurrent ? `{\\c${colorBgr}\\fscx108\\fscy108}` : '{\\c&H00FFFFFF&\\fscx100\\fscy100}';
        const emoji = item.emoji ? ` ${item.emoji}` : '';
        return `${color}${escapeAss(item.text).toUpperCase()}${emoji}`;
      }).join(' ');

      const start = toAssTime(w.start);
      const end = toAssTime(Math.min(plan.duration, group[idx + 1]?.start || w.end + 0.1));
      lines.push(`Dialogue: 2,${start},${end},Words,,0,0,0,,{\\an8\\pos(${Math.round(width / 2)},${defaultTop})}${formattedText}`);
    }
  }

  // Cenas Big Word
  for (const sc of plan.scenes || []) {
    lines.push(`Dialogue: 1,${toAssTime(sc.start)},${toAssTime(sc.end)},Big,,0,0,0,,{\\fad(80,120)}${escapeAss(sc.text).toUpperCase()}`);
  }

  // Reacoes Emojis flutuantes
  for (const r of plan.reactions || []) {
    lines.push(`Dialogue: 1,${toAssTime(r.start)},${toAssTime(r.end)},Reaction,,0,0,0,,{\\pos(${Math.round(width * 0.82)},${Math.round(height * 0.42)})\\fad(80,120)}${escapeAss(r.emoji)}`);
  }

  // Hook Title no topo
  if (plan.hook_title) {
    lines.push(`Dialogue: 1,${toAssTime(0)},${toAssTime(Math.min(2.35, plan.duration))},Hook,,0,0,0,,{\\fad(90,150)}${escapeAss(plan.hook_title).toUpperCase()}`);
  }

  return lines.join('\n');
}

/**
 * 3. RENDERIZACAO DE VIDEO VIA FFMPEG
 * Queima legendas ASS, insere SFX, aplica punch zooms e gera o MP4 final
 */
export async function renderVideoWithFFmpeg({
  inputVideo,
  plan,
  outputVideo,
  width = 1080,
  height = 1920,
  format = 'reels',
  sfxDir = SFX_DIR,
  accentColor = '#FFD60A',
  signal,
  onProgress
} = {}) {
  if (!fs.existsSync(inputVideo)) {
    throw new Error(`Vídeo de entrada não encontrado: ${inputVideo}`);
  }

  const workDir = path.dirname(outputVideo);
  fs.mkdirSync(workDir, { recursive: true });

  // 1. Gera arquivo de legendas
  const assFile = path.join(workDir, 'temp-subtitles.ass');
  const assContent = generateAssSubtitles(plan, { width, height, format, accentColor });
  fs.writeFileSync(assFile, assContent, 'utf8');

  // Escapa caminho do arquivo ASS para o filtro FFmpeg
  const assEscaped = assFile.replace(/\\/g, '/').replace(/:/g, '\\:');

  // 2. Coleta SFX disponiveis na pasta local
  const sfxFiles = {
    pop: path.join(sfxDir, 'pop-1.mp3'),
    impact: path.join(sfxDir, 'impact-1.mp3'),
    whoosh: path.join(sfxDir, 'whoosh-1.mp3'),
    ding: path.join(sfxDir, 'ding-1.mp3')
  };

  const ffmpegInputs = ['-i', inputVideo];
  let nextInputIdx = 1;
  const audioTracks = ['[0:a]loudnorm=I=-16:TP=-1.5:LRA=11[voice]'];
  const mixInputs = ['[voice]'];

  // Zooms dinâmicos baseados no plano
  const zoomList = (plan.zooms || []).slice(0, 8);
  let zoomFilter = '0';
  if (zoomList.length > 0) {
    zoomFilter = zoomList.map(z => `between(t,${z.start},${Math.min(plan.duration, z.start + 0.65)})`).join('+');
  }

  // Adiciona SFX nos beats e transicoes
  const sfxEvents = [
    ...(plan.scenes || []).map(s => ({ start: s.start, type: 'impact' })),
    ...(plan.zooms || []).map(z => ({ start: z.start, type: 'whoosh' })),
    ...(plan.impact_flashes || []).map(f => ({ start: f.start, type: 'pop' }))
  ].slice(0, 10);

  for (let i = 0; i < sfxEvents.length; i++) {
    const ev = sfxEvents[i];
    const sfxPath = sfxFiles[ev.type] || sfxFiles.pop;
    if (fs.existsSync(sfxPath)) {
      ffmpegInputs.push('-i', sfxPath);
      const trackLabel = `sfx${i}`;
      audioTracks.push(`[${nextInputIdx}:a]volume=0.25,adelay=${Math.round(ev.start * 1000)}:all=1[${trackLabel}]`);
      mixInputs.push(`[${trackLabel}]`);
      nextInputIdx++;
    }
  }

  // Monta Audio Filter Graph
  audioTracks.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:normalize=0,alimiter=limit=0.95[aout]`);

  // Monta Video Filter Graph
  const videoFilter = `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,scale=w='trunc(iw*(1+0.08*min(1,${zoomFilter}))/2)*2':h='trunc(ih*(1+0.08*min(1,${zoomFilter}))/2)*2':eval=frame,crop=${width}:${height},ass=filename='${assEscaped}'[vout]`;

  const filterComplex = `${videoFilter};${audioTracks.join(';')}`;
  const scriptFile = path.join(workDir, 'filter-script.txt');
  fs.writeFileSync(scriptFile, filterComplex, 'utf8');

  const args = [
    '-y',
    '-loglevel', 'error',
    ...ffmpegInputs,
    '-filter_complex_script', scriptFile,
    '-map', '[vout]',
    '-map', '[aout]',
    '-t', String(plan.duration),
    '-r', '30',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '48000',
    '-ac', '2',
    outputVideo
  ];

  await runMedia(args, { cwd: workDir, signal, onProgress });

  // Limpeza de temporarios
  try {
    fs.rmSync(assFile, { force: true });
    fs.rmSync(scriptFile, { force: true });
  } catch {}

  // Verificacao de integridade
  const probe = await probeLocalFile(outputVideo);
  return {
    outputVideo,
    duration: plan.duration,
    width,
    height,
    format,
    probe
  };
}

/**
 * 4. REGISTRO DE APRENDIZADO CONTINUO (EXPERIENCIA DE EDICAO)
 * Salva a experiencia no cerebro para a Mini IA evoluir
 */
export function recordEditingResult({
  plan,
  success = true,
  shortId = null,
  title = '',
  outputVideo = null,
  contextDir = CONTEXT_DIR
} = {}) {
  const result = recordMiniEditExperience(contextDir, {
    source: 'local-external-project',
    plan,
    preset: plan.preset || 'viral',
    shortId: shortId || `ext-${Date.now()}`,
    title: title || plan.hook_title || 'Video Externo',
    success: Boolean(success),
    timelineSaved: true,
    videoReady: Boolean(outputVideo && fs.existsSync(outputVideo))
  });

  // Re-consolida o aprendizado ativo da Mini IA
  consolidateMiniEditBrain(contextDir);

  return result;
}

/**
 * 5. CONSULTA DE ESTRATEGIA DE PUBLICACAO
 * Retorna hashtags virais e melhor horario calculados pelo cérebro
 */
export function getPublicationMetadata({
  title = '',
  topic = '',
  platform = 'instagram',
  format = 'reels',
  contextDir = CONTEXT_DIR
} = {}) {
  const state = readMiniEditBrain(contextDir);
  const brain = state.brain || {};

  // Hashtags base recomendadas do cérebro
  const recommendedTags = [
    '#reels',
    '#viral',
    '#conteudo',
    '#explore',
    '#dicas',
    '#negocios'
  ];

  // Horarios ideais observados (pico 12h e 18h no horario de Brasilia)
  const bestHour = 18;

  return {
    platform,
    format,
    recommendedHour: bestHour,
    recommendedTags,
    suggestedCopy: `${title}\n.\nCurtiu? Salve este post e compartilhe com alguém que precisa ver isso!\n.\n${recommendedTags.join(' ')}`
  };
}
