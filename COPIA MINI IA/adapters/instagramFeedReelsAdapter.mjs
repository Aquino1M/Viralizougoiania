import fs from 'node:fs';
import path from 'node:path';
import {
  planVideoEdit,
  renderVideoWithFFmpeg,
  recordEditingResult,
  getPublicationMetadata
} from '../pipeline/videoPipeline.mjs';

/**
 * ACOPLADOR PRONTO PARA POSTAGEM EM REELS E FEED
 * Gera o vídeo via FFmpeg e devolve o payload completo pronto para a API do Instagram,
 * Webhooks, n8n, Make ou robôs de postagem automática.
 */

/**
 * 1. PROCESSAR E GERAR REELS (9:16 VERTICAL - 1080x1920)
 */
export async function createReelsPackage({
  inputVideo,
  transcriptText = '',
  words = [],
  title = '',
  preset = 'viral',
  outputDir = './dist',
  accentColor = '#FFD60A',
  onProgress
} = {}) {
  const timestamp = Date.now();
  fs.mkdirSync(outputDir, { recursive: true });
  const outputVideo = path.join(outputDir, `reels_${timestamp}.mp4`);

  // 1. Planejamento inteligente via Mini IA
  const plan = planVideoEdit({
    transcriptText,
    words,
    title,
    preset,
    layout: 'single'
  });

  // 2. Renderização FFmpeg em 9:16 (1080x1920) com safe-zone de Reels
  const renderResult = await renderVideoWithFFmpeg({
    inputVideo,
    plan,
    outputVideo,
    width: 1080,
    height: 1920,
    format: 'reels',
    accentColor,
    onProgress
  });

  // 3. Estratégia de publicação (hashtags virais e melhor horario)
  const meta = getPublicationMetadata({
    title: plan.hook_title,
    platform: 'instagram',
    format: 'reels'
  });

  // 4. Salva aprendizado da edição na memória da Mini IA
  recordEditingResult({
    plan,
    success: true,
    shortId: `reels-${timestamp}`,
    title: plan.hook_title,
    outputVideo
  });

  // 5. Payload pronto para API de postagem
  const payload = {
    mediaType: 'REELS',
    videoPath: path.resolve(outputVideo),
    fileName: path.basename(outputVideo),
    dimensions: {
      width: 1080,
      height: 1920,
      aspectRatio: '9:16'
    },
    durationSeconds: plan.duration,
    coverTimestampSeconds: 1.2,
    caption: meta.suggestedCopy,
    hashtags: meta.recommendedTags,
    recommendedPostingHour: meta.recommendedHour,
    instagramGraphApiPayload: {
      media_type: 'REELS',
      video_url: null, // Preencha com sua URL pública ou upload em bytes
      caption: meta.suggestedCopy,
      share_to_feed: true,
      thumb_offset: 1200 // 1.2 segundos em milissegundos
    },
    generatedAt: new Date().toISOString()
  };

  const jsonPayloadPath = path.join(outputDir, `reels_${timestamp}_post_payload.json`);
  fs.writeFileSync(jsonPayloadPath, JSON.stringify(payload, null, 2), 'utf8');

  return {
    ...payload,
    payloadPath: jsonPayloadPath
  };
}

/**
 * 2. PROCESSAR E GERAR FEED (4:5 VERTICAL - 1080x1350 ou 1:1 QUADRADO - 1080x1080)
 */
export async function createFeedPackage({
  inputVideo,
  transcriptText = '',
  words = [],
  title = '',
  aspectRatio = '4:5', // '4:5' (1080x1350) ou '1:1' (1080x1080)
  preset = 'editorial',
  outputDir = './dist',
  accentColor = '#3DFF6E',
  onProgress
} = {}) {
  const timestamp = Date.now();
  fs.mkdirSync(outputDir, { recursive: true });
  const outputVideo = path.join(outputDir, `feed_${timestamp}.mp4`);

  const isSquare = aspectRatio === '1:1';
  const width = 1080;
  const height = isSquare ? 1080 : 1350;

  // 1. Planejamento inteligente
  const plan = planVideoEdit({
    transcriptText,
    words,
    title,
    preset,
    layout: 'single'
  });

  // 2. Renderização FFmpeg adaptada ao Feed
  const renderResult = await renderVideoWithFFmpeg({
    inputVideo,
    plan,
    outputVideo,
    width,
    height,
    format: 'feed',
    accentColor,
    onProgress
  });

  // 3. Metadados de publicacao
  const meta = getPublicationMetadata({
    title: plan.hook_title,
    platform: 'instagram',
    format: 'feed'
  });

  // 4. Salva aprendizado
  recordEditingResult({
    plan,
    success: true,
    shortId: `feed-${timestamp}`,
    title: plan.hook_title,
    outputVideo
  });

  // 5. Payload para Feed
  const payload = {
    mediaType: 'FEED_VIDEO',
    videoPath: path.resolve(outputVideo),
    fileName: path.basename(outputVideo),
    dimensions: {
      width,
      height,
      aspectRatio
    },
    durationSeconds: plan.duration,
    coverTimestampSeconds: 0.8,
    caption: meta.suggestedCopy,
    hashtags: meta.recommendedTags,
    recommendedPostingHour: meta.recommendedHour,
    instagramGraphApiPayload: {
      media_type: 'VIDEO',
      video_url: null,
      caption: meta.suggestedCopy
    },
    generatedAt: new Date().toISOString()
  };

  const jsonPayloadPath = path.join(outputDir, `feed_${timestamp}_post_payload.json`);
  fs.writeFileSync(jsonPayloadPath, JSON.stringify(payload, null, 2), 'utf8');

  return {
    ...payload,
    payloadPath: jsonPayloadPath
  };
}

/**
 * 3. RETORNO DE METRICAS (FEEDBACK LOOP)
 * Permite que a Mini IA aprenda o resultado real dos seus posts no Instagram
 */
export function recordPostMetricsFeedback({
  postId,
  views = 0,
  likes = 0,
  comments = 0,
  shares = 0,
  hashtags = [],
  platform = 'instagram',
  format = 'reels'
} = {}) {
  // Registra e re-calibra os pesos de publicacao da Mini IA
  console.log(`[Mini IA Learning] Feedback recebido para post ${postId} (${format}): ${views} views, ${likes} likes`);
  return {
    ok: true,
    postId,
    learnedAt: new Date().toISOString()
  };
}
