@echo off
setlocal
cd /d "%~dp0"
title Viralizougoiania - Converter Logo para GIF com Fundo Transparente
color 0A

echo ======================================================
echo    VIRALIZOUGOIANIA - GERAR LOGO ANIMADA TRANSPARENTE
echo ======================================================
echo.

set FFMPEG_CMD=
if exist "tools\ffmpeg.exe" (
  set "FFMPEG_CMD=tools\ffmpeg.exe"
) else (
  where ffmpeg >nul 2>nul
  if not errorlevel 1 (
    set "FFMPEG_CMD=ffmpeg"
  )
)

if "%FFMPEG_CMD%"=="" (
  echo [AVISO] FFmpeg nao encontrado em tools\ffmpeg.exe. Baixando versao portatil...
  if not exist "tools" mkdir "tools"
  curl.exe -L -o "tools\ffmpeg.exe" "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-win32-x64"
  set "FFMPEG_CMD=tools\ffmpeg.exe"
)

if not exist "public\logos" mkdir "public\logos"

rem 1. Verifica se o usuario ja forneceu o arquivo transparente oficial (WebM ou MOV)
if exist "public\logos\Viralizou_Goiania_logo_animada_transparente.webm" (
  echo [OK] Encontrada logo transparente nativa: Viralizou_Goiania_logo_animada_transparente.webm
  echo [1/1] Gerando GIF animado com transparencia total...
  "%FFMPEG_CMD%" -y -i "public\logos\Viralizou_Goiania_logo_animada_transparente.webm" -filter_complex "[0:v]fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=reserve_transparent=on:transparency_color=00000000[p];[s1][p]paletteuse=alpha_threshold=128" "public\logos\logo-viralizou-animada.gif"
  goto :sucesso
)

if exist "public\logos\Viralizou_Goiania_logo_animada_transparente.mov" (
  echo [OK] Encontrada logo transparente nativa: Viralizou_Goiania_logo_animada_transparente.mov
  echo [1/2] Gerando versao WebM leve com canal Alpha (VP9)...
  "%FFMPEG_CMD%" -y -i "public\logos\Viralizou_Goiania_logo_animada_transparente.mov" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -crf 24 -b:v 0 "public\logos\Viralizou_Goiania_logo_animada_transparente.webm"
  echo [2/2] Gerando GIF animado com transparencia total...
  "%FFMPEG_CMD%" -y -i "public\logos\Viralizou_Goiania_logo_animada_transparente.mov" -filter_complex "[0:v]fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=reserve_transparent=on:transparency_color=00000000[p];[s1][p]paletteuse=alpha_threshold=128" "public\logos\logo-viralizou-animada.gif"
  goto :sucesso
)

rem 2. Fallback caso apenas tenha o arquivo com fundo verde
if exist "logo em gif.mp4" (
  echo [OK] Removendo fundo verde de "logo em gif.mp4" via Chroma Key...
  "%FFMPEG_CMD%" -y -i "logo em gif.mp4" -filter_complex "[0:v]colorkey=0x75e052:0.28:0.10,despill=type=green:mix=0.55,fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=reserve_transparent=on:transparency_color=00ff00[p];[s1][p]paletteuse=alpha_threshold=128" "public\logos\logo-viralizou-animada.gif"
  "%FFMPEG_CMD%" -y -i "logo em gif.mp4" -filter_complex "[0:v]colorkey=0x75e052:0.28:0.10,despill=type=green:mix=0.55,scale=720:-1:flags=lanczos" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -crf 24 -b:v 0 "public\logos\Viralizou_Goiania_logo_animada_transparente.webm"
  goto :sucesso
)

echo [ERRO] Nao foi encontrado nenhum arquivo de logo (webm, mov ou mp4) em public\logos ou na raiz.
pause
exit /b 1

:sucesso
echo.
echo ======================================================
echo    [SUCESSO] LOGO ANIMADA TRANSPARENTE PRONTA!
echo ======================================================
echo.
echo Arquivos atualizados em public\logos\:
echo - Viralizou_Goiania_logo_animada_transparente.webm (WebM com Alpha)
echo - logo-viralizou-animada.gif (GIF transparente)
echo.
echo A logo ja esta ativa no Criador de Reels e Stories!
echo ======================================================
echo.
pause
endlocal
