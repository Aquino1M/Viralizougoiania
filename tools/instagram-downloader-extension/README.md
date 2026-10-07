# Auxiliar do Instagram logado

Esta extensão resolve o caso em que o Instagram entrega o Reel somente dentro do navegador já autenticado.

## Instalação no Chrome/Edge

1. Baixe ou abra esta pasta no computador.
2. Acesse `chrome://extensions` (ou `edge://extensions`).
3. Ative **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta `tools/instagram-downloader-extension`.
6. Mantenha o Instagram logado normalmente.
7. Volte ao Painel Editorial e use **Baixar usando Instagram logado**.

A extensão não lê senha nem envia cookies para o servidor do Viralizougoiania. Ela observa a mídia que o navegador autorizado já carrega na página do Instagram e dispara o download no próprio PC.

## Importante

O Instagram pode usar diferentes CDNs e formatos. O auxiliar tenta primeiro as URLs de vídeo observadas pelo navegador e, em seguida, o elemento `video`/recursos públicos da página.
