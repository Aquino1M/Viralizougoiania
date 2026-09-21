@echo off
setlocal
cd /d "%~dp0"
title Viralizougoiania - Corrigir configuracao local
color 0A

echo ======================================================
echo      CORRIGIR ERRO DE SUPABASE / FETCH FAILED
echo ======================================================
echo.

echo Feche antes a janela do servidor do Viralizougoiania.
echo.

if exist ".env.local" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='.env.local'; $lines=Get-Content -LiteralPath $p; $clean=$lines ^| Where-Object { $_ -notmatch '(?i)^SUPABASE_URL=https://SEU-PROJETO\.supabase\.co/?$' -and $_ -notmatch '(?i)^SUPABASE_SERVICE_ROLE_KEY=SEU_SERVICE_ROLE_KEY$' -and $_ -notmatch '(?i)^ADMIN_PASSWORD=troque-esta-senha$' -and $_ -notmatch '(?i)^SESSION_SECRET=troque-por-uma-chave-longa-e-aleatoria$' }; Set-Content -LiteralPath $p -Value $clean -Encoding UTF8"
) else (
  echo ADMIN_PASSWORD=admin123> ".env.local"
  echo SESSION_SECRET=viralizougoiania-local-dev-secret>> ".env.local"
)

if exist ".next" (
  echo Limpando cache do Next.js...
  rmdir /s /q ".next"
)

echo.
echo [OK] Configuracao corrigida.
echo Agora execute ABRIR_SITE.bat novamente.
echo O site local vai usar data\posts.json e data\categories.json.
echo.
pause
endlocal
