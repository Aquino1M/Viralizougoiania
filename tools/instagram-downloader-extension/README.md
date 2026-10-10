# Auxiliar do Instagram logado

Esta extensão resolve o caso em que o Instagram entrega o Reel somente dentro do navegador já autenticado.

## Instalação no Chrome/Edge

1. Baixe ou abra esta pasta no computador.
2. Acesse `chrome://extensions` (ou `edge://extensions`).
3. Ative **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta `tools/instagram-downloader-extension`.
6. Entre na sua conta pessoal em [instagram.com](https://www.instagram.com/) no mesmo navegador.
7. Volte ao Painel Editorial, cole o link e use **Baixar usando Instagram logado**.

A extensão não lê nem envia sua senha ou cookies ao servidor do Viralizougoiania. Ela abre o Reel no mesmo navegador, captura o arquivo de mídia carregado pela sua sessão e salva o vídeo no seu computador. Se o Instagram pedir login, entre na sua conta e tente novamente.

## Importante

O Instagram pode usar diferentes CDNs e formatos. O auxiliar tenta primeiro as URLs de vídeo observadas pelo navegador e, em seguida, o elemento `video`/recursos públicos da página.
