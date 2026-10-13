# 🎬 Pacote Portátil: Mini IA de Edição de Vídeo + SFX + Memória + Acoplador Reels & Feed

Este pacote é uma **cópia 100% autônoma e completa** da nossa **Mini IA de edição de vídeo**. Ele foi preparado para que você possa copiá-lo diretamente para qualquer outro projeto seu, gerar vídeos profissionais via **FFmpeg** com queima de legendas animadas, aplicação de zooms e efeitos sonoros sincronizados (SFX), e já acoplar o resultado final diretamente em sistemas de postagem automática no **Instagram Reels** e **Instagram Feed** (além de TikTok e YouTube Shorts).

---

## 📦 O que está incluído neste pacote

| Pasta / Recurso | Descrição |
|---|---|
| `context/` | **Memorial Completo da Mini IA**: Contém `mini-ai-brain.json` (cérebro v2 com aprendizado consolidado), `edit-experiences.jsonl` (histórico contínuo de experiências), `media-learning.json` (B-roll e áudios aprendidos), `editorial-policy.json` (política editorial de decisões positivas e negativas), `emoji-context.json` e `style-memory.json`. |
| `sfx/` | **Todos os Nossos SFX & Músicas**: Arquivos `.mp3` de impactos sonoros (`pop`, `whoosh`, `impact`, `ding`, `riser`, `swipe`, `camera-shutter`, `click`, `record-scratch`) e camas musicais de fundo (`cc0-chill-roof-tops`, `cc0-energetic-phonk-remix`, etc.) + `localEditorCatalog.json` calibrado com LUFS e durações exatas. |
| `engine/` | **Motor de Edição da Mini IA**: Código do `miniEditAI.mjs`, `localAutoEdit.mjs`, `localAutoEditPlanner.mjs`, `autoEditPlanMaterializer.mjs`, perfis de edição (`localEditorProfiles.mjs`) e gerador de legendas com detecção de beats. |
| `publication/` | **Cérebro de Publicação**: `publicationBrain.mjs` com inteligência de seleção de hashtags virais, tamanho ideal de legenda e horários de pico. |
| `pipeline/` | **Orquestrador de Vídeo**: Módulo simples com funções prontas: `planVideoEdit()`, `renderVideoWithFFmpeg()`, `generateAssSubtitles()` e `getPublicationMetadata()`. |
| `adapters/` | **Acoplador Feed & Reels**: `instagramFeedReelsAdapter.mjs` com funções prontas `createReelsPackage()` e `createFeedPackage()`, entregando o vídeo renderizado + payload JSON pronto para postagem. |
| `plans/` | **Planos de Edição de Exemplo**: Amostras reais de planos (`plan.json`, `before.json`, `timeline.json`) demonstrando a estrutura exata usada pela Mini IA. |
| `examples/` | **Scripts Prontos para Testar**: Exemplos de geração de Reels, Feed, teste do cérebro e integração de postagem automática. |

---

## ⚡ Pré-Requisitos

1. **Node.js** >= 20 instalado no sistema.
2. **FFmpeg** instalado e acessível no PATH do Windows/Linux (`ffmpeg -version`).

---

## 🚀 Como Acoplar no Seu Outro Projeto

### 1. Copiar a pasta
Basta copiar a pasta `COPIA MINI IA` (ou extrair o arquivo `COPIA MINI IA.zip`) para dentro da raiz do seu outro projeto.

### 2. Gerar um Reels (9:16 - 1080x1920) em 3 linhas
```javascript
import { createReelsPackage } from './COPIA MINI IA/adapters/instagramFeedReelsAdapter.mjs';

const resultado = await createReelsPackage({
  inputVideo: 'caminho/do/seu/video_bruto.mp4',
  transcriptText: 'Texto falado no vídeo para a Mini IA sincronizar as legendas e efeitos.',
  title: 'TÍTULO GANCHO DO VÍDEO',
  preset: 'viral', // 'viral', 'clean', 'cinematic', 'editorial', 'pop'
  outputDir: './saida_videos'
});

console.log('Vídeo Reels gerado:', resultado.videoPath);
console.log('Legenda e Hashtags prontas:', resultado.caption);
console.log('Payload JSON salvo em:', resultado.payloadPath);
```

### 3. Gerar um Vídeo para o Feed (4:5 ou 1:1)
```javascript
import { createFeedPackage } from './COPIA MINI IA/adapters/instagramFeedReelsAdapter.mjs';

const resultado = await createFeedPackage({
  inputVideo: 'caminho/do/seu/video_bruto.mp4',
  transcriptText: 'Texto falado no vídeo...',
  title: 'TÍTULO DO FEED',
  aspectRatio: '4:5', // '4:5' (1080x1350) ou '1:1' (1080x1080 quadrado)
  preset: 'editorial',
  outputDir: './saida_videos'
});
```

---

## 🤖 Como Funciona a Edição Via FFmpeg

1. **Análise de Fala e Beats**: A Mini IA divide a fala em beats semânticos de 2 a 5 segundos e detecta palavras-chave de energia alta.
2. **Reserva de Hook**: Os primeiros ~2,35 segundos são protegidos para não empilhar Big Word e manter a atenção no gancho inicial.
3. **Punch Zooms e Efeitos**: A Mini IA decide onde colocar zooms dinâmicos (8% a 10%), transições e efeitos de impacto.
4. **Legendas Dinâmicas (ASS)**: Queimadas direto no vídeo via filtro FFmpeg com safe-zone protegida (para não cobrir nem os botões nem o rodapé do Reels).
5. **Trilha Sonora e SFX**:
   - Voz normalizada para **-16 LUFS** (padrão de clareza para redes sociais).
   - Efeitos sonoros (`impact`, `whoosh`, `pop`, `ding`) posicionados no instante exato de cada corte.
   - Limitador de áudio final a 0.95 para impedir distorção.

---

## 📲 Integração Direta com Postagem Automática (Instagram Graph API)

O acoplador devolve um objeto pronto para envio direto à API do Instagram:

```json
{
  "mediaType": "REELS",
  "videoPath": "C:/projetos/saida/reels_1710000000.mp4",
  "caption": "TÍTULO GANCHO\n.\nCurtiu? Salve este post e compartilhe com alguém que precisa ver isso!\n.\n#reels #viral #conteudo #explore #dicas",
  "hashtags": ["#reels", "#viral", "#conteudo", "#explore", "#dicas"],
  "recommendedPostingHour": 18,
  "instagramGraphApiPayload": {
    "media_type": "REELS",
    "video_url": "https://seu-servidor.com/video.mp4",
    "caption": "...",
    "share_to_feed": true,
    "thumb_offset": 1200
  }
}
```

Para publicar via API oficial:
1. Faça o upload do vídeo para sua URL pública ou envie os bytes no container: `POST /{ig_user_id}/media`
2. Publique o container: `POST /{ig_user_id}/media_publish`

---

## 🧠 Como a Mini IA Continua Aprendendo no Outro Projeto

A Mini IA possui um **cérebro de aprendizado contínuo ativo**.
Toda vez que você edita um vídeo com sucesso:
- A experiência é registrada em `context/edit-experiences.jsonl`.
- Os perfis de estilo e as frequências de corte são refinados em `context/mini-ai-brain.json`.
- A Mini IA consolida o que funcionou e reduz o peso de edições repetitivas.

Quando o seu sistema de postagem coletar os números de visualizações e curtidas (após 24h):
```javascript
import { recordPostMetricsFeedback } from './COPIA MINI IA/adapters/instagramFeedReelsAdapter.mjs';

recordPostMetricsFeedback({
  postId: '12345',
  views: 24500,
  likes: 1200,
  comments: 85,
  shares: 210,
  hashtags: ['#reels', '#viral']
});
```
Isso recalibra o cérebro de publicação para que os próximos vídeos usem as hashtags e durações com melhor retorno comprovado!

---

## 🛠️ Como Testar Rapidamente

Abra o terminal na pasta `COPIA MINI IA` e rode:
```bash
node examples/testar-mini-ia.mjs
```
O script exibirá o estado atual do cérebro, total de experiências consolidadas e fará uma simulação de plano de edição.

---

## 🗜️ Como Recriar o Arquivo ZIP
Para gerar ou atualizar o arquivo `COPIA MINI IA.zip`:
- No Windows: Dê um duplo clique no arquivo `GERAR-ZIP.bat` (dentro desta pasta) ou `EXPORTAR-MINI-IA.bat` na raiz do projeto.
- Ou via linha de comando: `npm run gerar-zip`.
