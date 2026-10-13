import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReelsPackage } from '../adapters/instagramFeedReelsAdapter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * EXEMPLO: GERAR CORTE VERTICAL 9:16 PARA REELS VIA FFMPEG + MINI IA
 */
async function main() {
  console.log('--- Iniciando criacao de pacote para Instagram Reels ---');

  // Substitua pelo caminho do seu video bruto (mp4)
  const videoEntrada = path.join(__dirname, 'video-bruto-exemplo.mp4');
  const pastaDestino = path.join(__dirname, '..', 'dist');

  // Texto falado no video (ou passe a lista de palavras transcritas)
  const falaDoVideo = 'Você ainda tá perdendo tempo editando manualmente? A nossa Mini IA corta, coloca efeito, sincroniza SFX e já deixa pronto pro Reels.';

  console.log('Video:', videoEntrada);
  console.log('Fala:', falaDoVideo);

  /*
  // Descomente quando tiver o arquivo de video real pronto para renderizar:
  const resultado = await createReelsPackage({
    inputVideo: videoEntrada,
    transcriptText: falaDoVideo,
    title: 'PARE DE PERDER TEMPO',
    preset: 'viral',
    outputDir: pastaDestino,
    accentColor: '#FFD60A',
    onProgress: (prog) => {
      console.log(`Renderizando Reels: ${(prog * 100).toFixed(1)}%`);
    }
  });

  console.log('\n[REELS GERADO]:', resultado.videoPath);
  console.log('[LEGENDA RECOMENDADA]:\n', resultado.caption);
  console.log('[PAYLOAD JSON PRONTO]:', resultado.payloadPath);
  */

  console.log('\n[NOTA]: Para renderizar um video real, aponte `inputVideo` para seu arquivo MP4 e instale o FFmpeg no sistema.');
}

main().catch(console.error);
