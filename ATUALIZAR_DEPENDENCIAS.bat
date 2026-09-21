@echo off
cd /d "%~dp0"
title Viralizougoiania - Atualizar dependencias
echo Atualizando dependencias do projeto...
call npm install
if errorlevel 1 (
  echo.
  echo Ocorreu um erro. Verifique sua internet e o Node.js.
  pause
  exit /b 1
)
echo.
echo Dependencias prontas.
pause
