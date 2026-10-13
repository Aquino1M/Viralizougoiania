@echo off
chcp 65001 >nul
title GERAR ZIP - COPIA MINI IA
echo ================================================================
echo   CRIANDO ARQUIVO ZIP DA MINI IA
echo ================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path '%~dp0*' -DestinationPath '%~dp0..\COPIA MINI IA.zip' -Force"

echo.
echo Concluido! Arquivo criado em: "%~dp0..\COPIA MINI IA.zip"
echo.
pause
