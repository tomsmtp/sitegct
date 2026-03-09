@echo off
REM Script para iniciar o servidor backend
setlocal enabledelayedexpansion

echo ========================================
echo Iniciando Servidor Backend Gestao Graos
echo ========================================

cd /d "%~dp0"

node back_end.js

pause
