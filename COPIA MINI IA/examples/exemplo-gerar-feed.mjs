import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFeedPackage } from '../adapters/instagramFeedReelsAdapter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * EXEMPLO: GERAR CORTE 4:5 OU 1:1 PARA O FEED DO INSTAGRAM VIA FFMPEG
 */
async function main() {
  console.log('--- Iniciando criacao de pacote para Instagram Feed ---');

  const videoEntrada = path.join(__dirname, 'video-bruto-exemplo.mp4');
  const pastaDestino = path.join(__dirname, '..', 'dist');

  const falaDoVideo = 'O mercado digital mudou completamente. Se você não tem consistência e velocidade na produção de conteúdo, você simplesmente fica para trás.';

  console.log('Video:', videoEntrada);
  console.log('Fala:', falaDoVideo);

  /*
  // Descomente quando tiver o arquivo de video real pronto para renderizar:
  const resultado = await createFeedPackage({
    inputVideo: videoEntrada,
    transcriptText: falaDoVideo,
    title: 'O MERCADO MUDOU',
    aspectRatio: '4:5', // '4:5' (1080x1350) ou '1:1' (1080x1080)
    preset: 'editorial',
    outputDir: pastaDestino,
    accentColor: '#3DFF6E',
    onProgress: (prog) => {
      console.log(`Renderizando Feed: ${(prog * 100).toFixed(1)}%`);
    }
  });

  console.log('\n[FEED VIDEO GERADO]:', resultado.videoPath);
  console.log('[LEGENDA SUGERIDA]:\n', resultado.caption);
  console.log('[PAYLOAD JSON PRONTO]:', resultado.payloadPath);
  */

  console.log('\n[NOTA]: O formato 4:5 ocupa a area maxima do Feed no Instagram sem cortes.');
}

main().catch(console.error);
