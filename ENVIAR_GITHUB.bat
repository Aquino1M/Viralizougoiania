@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Viralizougoiania - Enviar para o GitHub e Vercel
color 0B

echo ======================================================
echo       ENVIAR ATUALIZACOES PARA O GITHUB E VERCEL
echo ======================================================
echo.

if not exist "public\logos" mkdir "public\logos"

if exist "public\logos\logo-viralizou-intro.gif" if not exist "public\logos\logo-viralizou-animada.gif" (
  copy /y "public\logos\logo-viralizou-intro.gif" "public\logos\logo-viralizou-animada.gif" >nul 2>nul
  echo [OK] Logo animada GIF sincronizada em public\logos.
)

echo [1/3] Verificando alteracoes locais...
git status --short
echo.

echo [2/3] Preparando arquivos (git add -A)...
git add -A

set "COMMIT_MSG=%*"
if "%COMMIT_MSG%"=="" (
  set "COMMIT_MSG=update: sincronizacao automatica com Vercel (%date% %time%)"
)

git diff-index --quiet HEAD --
if errorlevel 1 (
  echo Criando commit com alteracoes encontradas...
  git commit -m "%COMMIT_MSG%"
) else (
  echo Nenhuma alteracao pendente nos arquivos.
  echo Forcando novo commit de deploy para a Vercel atualizar...
  git commit --allow-empty -m "deploy: acionar atualizacao e novo build na Vercel (%date% %time%)"
)

echo.
echo [3/3] Enviando para o GitHub (git push origin main)...
git push origin main

if errorlevel 1 (
  echo.
  echo ======================================================
  echo [ERRO] Falha ao enviar para o GitHub.
  echo Verifique sua conexao ou faca login no GitHub.
  echo ======================================================
) else (
  echo.
  echo ======================================================
  echo [SUCESSO] Codigo enviado com sucesso para o GitHub!
  echo A Vercel ja iniciou o novo deploy automaticamente.
  echo ======================================================
)

echo.
pause
