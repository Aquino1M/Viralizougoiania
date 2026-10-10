# Auxiliar do Instagram logado

Esta extensão resolve o caso em que o Instagram entrega o Reel somente dentro do navegador já autenticado.

## Instalação no Chrome/Edge

1. Baixe e extraia o ZIP da extensão. Se ela já estiver instalada, substitua os arquivos pela versão nova e clique em **Recarregar** na página da extensão.
2. Acesse `chrome://extensions` (ou `edge://extensions`).
3. Ative **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta `tools/instagram-downloader-extension`.
6. Entre na sua conta pessoal em [instagram.com](https://www.instagram.com/) uma vez no mesmo perfil do navegador e mantenha essa sessão ativa.
7. Volte ao Painel Editorial, cole o link e use **Baixar usando sessão do Instagram**. A extensão busca o vídeo em uma aba de segundo plano e a fecha ao terminar.

A extensão não armazena sua senha nem envia cookies ao servidor do Viralizougoiania. Ela usa a sessão que o próprio Chrome/Edge já mantém, captura o arquivo de mídia e salva o vídeo no seu computador. Se a sessão expirar ou o Instagram exigir uma confirmação, será necessário entrar novamente no site.

## Importante

O Instagram pode usar diferentes CDNs e formatos. O auxiliar tenta primeiro as URLs de vídeo observadas pelo navegador e, em seguida, o elemento `video`/recursos públicos da página.
