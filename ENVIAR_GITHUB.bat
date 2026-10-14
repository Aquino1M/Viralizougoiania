@echo off
setlocal
cd /d "%~dp0"
title Viralizougoiania - Enviar para o GitHub e Vercel
color 0B

echo ======================================================
echo       ENVIAR ATUALIZACOES PARA O GITHUB E VERCEL
echo ======================================================
echo.

if not exist "public\logos" mkdir "public\logos"
if exist "C:\Users\Aquino\.gemini\antigravity-ide\brain\d5396812-fe0c-45aa-9024-57e5752b1e04\.user_uploaded\media_1791847748374.png" (
  copy /y "C:\Users\Aquino\.gemini\antigravity-ide\brain\d5396812-fe0c-45aa-9024-57e5752b1e04\.user_uploaded\media_1791847748374.png" "public\logos\logo-viralizou-branca.png" >nul 2>nul
  copy /y "C:\Users\Aquino\.gemini\antigravity-ide\brain\d5396812-fe0c-45aa-9024-57e5752b1e04\.user_uploaded\media_1791847748374.png" "public\logo-viralizou-branca.png" >nul 2>nul
  echo [OK] Logo branca original verificada e copiada.
)
if exist "C:\Users\Aquino\.gemini\antigravity-ide\brain\d5396812-fe0c-45aa-9024-57e5752b1e04\.user_uploaded\media_1791847748387.png" (
  copy /y "C:\Users\Aquino\.gemini\antigravity-ide\brain\d5396812-fe0c-45aa-9024-57e5752b1e04\.user_uploaded\media_1791847748387.png" "public\logos\logo-viralizou-preta.png" >nul 2>nul
  copy /y "C:\Users\Aquino\.gemini\antigravity-ide\brain\d5396812-fe0c-45aa-9024-57e5752b1e04\.user_uploaded\media_1791847748387.png" "public\logo-viralizou-preta.png" >nul 2>nul
  echo [OK] Logo preta original verificada e copiada.
)

if exist "public\logos\logo-viralizou-intro.gif" if not exist "public\logos\logo-viralizou-animada.gif" (
  copy /y "public\logos\logo-viralizou-intro.gif" "public\logos\logo-viralizou-animada.gif" >nul 2>nul
  echo [OK] Logo animada GIF sincronizada em public\logos.
)
if exist "C:\Users\Aquino\.gemini\antigravity-ide\brain\05f1ad7a-878c-43ff-9525-efe8bcdf74ea\.user_uploaded\media_1791933403602.png" (
  copy /y "C:\Users\Aquino\.gemini\antigravity-ide\brain\05f1ad7a-878c-43ff-9525-efe8bcdf74ea\.user_uploaded\media_1791933403602.png" "public\logos\logo-circular-vermelha.png" >nul 2>nul
  echo [OK] Logo circular vermelha verificada e copiada.
)

echo.
git status --short
echo.
echo [1/3] Adicionando arquivos modificados (git add -A)...
git add -A

set COMMIT_MSG=%*
if "%COMMIT_MSG%"=="" set COMMIT_MSG=feat: Instagram no lugar de YouTube, preview 100% sem corte, controle de altura Bacci e TVT, e filtros de cor no preview ao vivo

echo.
echo [2/3] Criando commit...
git commit -m "%COMMIT_MSG%"

echo.
echo [3/3] Enviando para o GitHub (git push origin main)...
git push origin main

if errorlevel 1 (
  echo.
  echo [ERRO] Ocorreu uma falha no envio para o GitHub.
  echo Se o git pedir autenticacao, faca o login ou use o Git Credential Manager.
) else (
  echo.
  echo ======================================================
  echo [SUCESSO] Codigo enviado com sucesso para o GitHub!
  echo A Vercel iniciara o deploy automaticamente agora.
  echo ======================================================
)

echo.
pause
