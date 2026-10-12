@echo off
setlocal
cd /d "%~dp0"
title Viralizougoiania - Instalador Oficial do FFmpeg
color 0A

echo ======================================================
echo    INSTALADOR OFICIAL DO FFMPEG - VIRALIZOUGOIANIA
echo ======================================================
echo.
echo Este utilitario garante que todos os videos gerados fiquem:
echo  1. Em MP4 oficial (H.264 / AAC)
echo  2. 100%% compativeis com WhatsApp, Instagram e iPhone
echo  3. Sem travamento de legendas e com duracao correta
echo.

if not exist "tools" mkdir "tools"

if exist "tools\ffmpeg.exe" (
  echo [OK] FFmpeg ja esta instalado em tools\ffmpeg.exe!
  echo Nenhuma acao necessaria.
  echo.
  pause
  exit /b 0
)

echo [1/2] Baixando binario ffmpeg.exe oficial para a pasta tools...
echo Aguarde alguns instantes (download de aprox. 35 MB)...
echo.

curl.exe -L -f --progress-bar -o "tools\ffmpeg.exe" "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-win32-x64"

if errorlevel 1 (
  echo.
  echo [AVISO] Falha no download direto via curl. Tentando via winget...
  winget install Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
)

if exist "tools\ffmpeg.exe" (
  echo.
  echo ======================================================
  echo [SUCESSO] FFmpeg instalado com sucesso em tools\ffmpeg.exe!
  echo Todos os videos agora sairao em MP4 perfeito para WhatsApp!
  echo ======================================================
) else (
  echo.
  echo [AVISO] O arquivo nao foi salvo em tools\ffmpeg.exe.
  echo Verifique sua conexao com a internet.
)

echo.
pause
