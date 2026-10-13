@echo off
setlocal
cd /d "%~dp0"
title Viralizougoiania - Servidor Local
color 0E

echo ======================================================
echo          VIRALIZOUGOIANIA - ABRIR SITE
echo ======================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado neste computador.
  echo Instale a versao LTS em: https://nodejs.org/
  echo Depois execute este arquivo novamente.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] NPM nao foi encontrado.
  echo Reinstale o Node.js LTS e tente novamente.
  pause
  exit /b 1
)

rem Corrige automaticamente o .env.local criado pelas versoes antigas.
rem Placeholders do Supabase NAO podem ser usados como configuracao real.
if exist ".env.local" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='.env.local'; $lines=Get-Content -LiteralPath $p; $clean=$lines ^| Where-Object { $_ -notmatch '(?i)^SUPABASE_URL=https://SEU-PROJETO\.supabase\.co/?$' -and $_ -notmatch '(?i)^SUPABASE_SERVICE_ROLE_KEY=SEU_SERVICE_ROLE_KEY$' -and $_ -notmatch '(?i)^ADMIN_PASSWORD=troque-esta-senha$' -and $_ -notmatch '(?i)^SESSION_SECRET=troque-por-uma-chave-longa-e-aleatoria$' }; Set-Content -LiteralPath $p -Value $clean -Encoding UTF8" >nul 2>nul
  echo [OK] Configuracao local verificada.
) else (
  echo # Configuracao local do Viralizougoiania> ".env.local"
  echo ADMIN_PASSWORD=admin123>> ".env.local"
  echo SESSION_SECRET=viralizougoiania-local-dev-secret>> ".env.local"
  echo.>> ".env.local"
  echo # Supabase e opcional no computador. Configure apenas com dados REAIS.>> ".env.local"
  echo # SUPABASE_URL=https://SEU-ID-REAL.supabase.co>> ".env.local"
  echo # SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_REAL>> ".env.local"
  echo [OK] .env.local criado para uso local sem Supabase.
)

if not exist "node_modules\next\package.json" (
  echo [1/2] Instalando dependencias na primeira execucao...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERRO] Nao foi possivel instalar as dependencias.
    echo Verifique sua internet e execute o BAT novamente.
    pause
    exit /b 1
  )
) else (
  echo [1/2] Dependencias ja instaladas.
)

if not exist "public\logos" mkdir "public\logos"
if exist "C:\Users\Aquino\.gemini\antigravity-ide\brain\d5396812-fe0c-45aa-9024-57e5752b1e04\.user_uploaded\media_1791847748374.png" (
  copy /y "C:\Users\Aquino\.gemini\antigravity-ide\brain\d5396812-fe0c-45aa-9024-57e5752b1e04\.user_uploaded\media_1791847748374.png" "public\logos\logo-viralizou-branca.png" >nul 2>nul
  copy /y "C:\Users\Aquino\.gemini\antigravity-ide\brain\d5396812-fe0c-45aa-9024-57e5752b1e04\.user_uploaded\media_1791847748374.png" "public\logo-viralizou-branca.png" >nul 2>nul
) else if exist "C:\Users\Aquino\.gemini\antigravity-ide\brain\d93440ff-fe58-40ed-94a4-6ff085a0a199\.user_uploaded\media_1791812215943.png" (
  copy /y "C:\Users\Aquino\.gemini\antigravity-ide\brain\d93440ff-fe58-40ed-94a4-6ff085a0a199\.user_uploaded\media_1791812215943.png" "public\logos\logo-viralizou-branca.png" >nul 2>nul
  copy /y "C:\Users\Aquino\.gemini\antigravity-ide\brain\d93440ff-fe58-40ed-94a4-6ff085a0a199\.user_uploaded\media_1791812215943.png" "public\logo-viralizou-branca.png" >nul 2>nul
)
if exist "C:\Users\Aquino\.gemini\antigravity-ide\brain\d5396812-fe0c-45aa-9024-57e5752b1e04\.user_uploaded\media_1791847748387.png" (
  copy /y "C:\Users\Aquino\.gemini\antigravity-ide\brain\d5396812-fe0c-45aa-9024-57e5752b1e04\.user_uploaded\media_1791847748387.png" "public\logos\logo-viralizou-preta.png" >nul 2>nul
  copy /y "C:\Users\Aquino\.gemini\antigravity-ide\brain\d5396812-fe0c-45aa-9024-57e5752b1e04\.user_uploaded\media_1791847748387.png" "public\logo-viralizou-preta.png" >nul 2>nul
) else if exist "C:\Users\Aquino\.gemini\antigravity-ide\brain\d93440ff-fe58-40ed-94a4-6ff085a0a199\.user_uploaded\media_1791812270897.png" (
  copy /y "C:\Users\Aquino\.gemini\antigravity-ide\brain\d93440ff-fe58-40ed-94a4-6ff085a0a199\.user_uploaded\media_1791812270897.png" "public\logos\logo-viralizou-preta.png" >nul 2>nul
  copy /y "C:\Users\Aquino\.gemini\antigravity-ide\brain\d93440ff-fe58-40ed-94a4-6ff085a0a199\.user_uploaded\media_1791812270897.png" "public\logo-viralizou-preta.png" >nul 2>nul
)

where ffmpeg >nul 2>nul
if errorlevel 1 (
  if not exist "tools\ffmpeg.exe" (
    echo [Configurando FFmpeg para videos, Reels e WhatsApp...]
    if not exist "tools" mkdir "tools"
    curl.exe -L -s -o "tools\ffmpeg.exe" "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-win32-x64" >nul 2>nul
  )
)

if exist "public\logos\Viralizou_Goiania_logo_animada_transparente.webm" (
  if not exist "public\logos\logo-viralizou-animada.gif" (
    echo [Gerando GIF a partir de Viralizou_Goiania_logo_animada_transparente.webm...]
    tools\ffmpeg.exe -y -i "public\logos\Viralizou_Goiania_logo_animada_transparente.webm" -filter_complex "[0:v]fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=reserve_transparent=on:transparency_color=00000000[p];[s1][p]paletteuse=alpha_threshold=128" "public\logos\logo-viralizou-animada.gif" >nul 2>nul
  )
) else if exist "logo em gif.mp4" (
  if not exist "public\logos\logo-viralizou-animada.gif" (
    echo [Convertendo logo em gif.mp4 para GIF transparente...]
    if not exist "public\logos" mkdir "public\logos"
    tools\ffmpeg.exe -y -i "logo em gif.mp4" -filter_complex "[0:v]colorkey=0x75e052:0.28:0.10,despill=type=green:mix=0.55,fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=reserve_transparent=on:transparency_color=00ff00[p];[s1][p]paletteuse=alpha_threshold=128" "public\logos\logo-viralizou-animada.gif" >nul 2>nul
  )
)

echo [2/2] Iniciando o Viralizougoiania...
echo.
echo Site:  http://localhost:3000
echo Admin: http://localhost:3000/admin
echo Senha local padrao: admin123
echo.
echo Modo local funciona SEM Supabase usando os arquivos da pasta data.
echo Para desligar o servidor, feche esta janela ou pressione CTRL+C.
echo ======================================================

start "" cmd /c "timeout /t 4 /nobreak >nul & start \"\" http://localhost:3000"
call npm run dev

if errorlevel 1 (
  echo.
  echo O servidor foi encerrado com erro.
  pause
)
endlocal
