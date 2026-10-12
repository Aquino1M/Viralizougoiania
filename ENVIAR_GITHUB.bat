@echo off
setlocal
cd /d "%~dp0"
title Viralizougoiania - Enviar para o GitHub
color 0B

echo ======================================================
echo       ENVIAR ATUALIZACOES PARA O GITHUB
echo ======================================================
echo.

git status
echo.
echo [1/3] Adicionando arquivos modificados...
git add .

echo.
echo [2/3] Criando commit com as correcoes...
git commit -m "fix: correcoes de proporcao 9:16, compatibilidade whatsapp, duracao no windows e enquadramento"

echo.
echo [3/3] Enviando para o GitHub (main)...
git push origin main

if errorlevel 1 (
  echo.
  echo [AVISO] Se o git pedir autenticacao, faca o login ou use o Git Credential Manager.
) else (
  echo.
  echo ======================================================
  echo [SUCESSO] Codigo enviado com sucesso para o GitHub!
  echo ======================================================
)

echo.
pause
