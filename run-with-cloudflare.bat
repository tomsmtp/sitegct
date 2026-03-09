@echo off
REM ============================================
REM Script para rodar o Backend com Cloudflare
REM ============================================

echo.
echo [*] Iniciando o Backend com Cloudflare Tunnel...
echo.

REM Verifica se cloudflared.exe existe
where cloudflared.exe >nul 2>nul
if errorlevel 1 (
    echo [ERRO] cloudflared.exe nao foi encontrado no PATH
    echo [INFO] Baixe em: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation
    pause
    exit /b 1
)

REM Verifica se Node.js esta instalado
where node >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Node.js nao foi encontrado no PATH
    echo [INFO] Instale Node.js de https://nodejs.org
    pause
    exit /b 1
)

REM Inicia o servidor Express em uma nova janela
echo [*] Iniciando servidor Express na porta 3001...
start "Backend Server" cmd /k "node back_end.js"

REM Aguarda o servidor iniciar
timeout /t 3 /nobreak

echo.
echo [*] Iniciando Cloudflare Tunnel com URL FIXA e permanente...
echo [*] Aguarde alguns segundos...
echo.

REM Inicia tunnel automatico - gera URL fixa na primeira vez
REM Proximas execucoes reutiliza a mesma URL
cloudflared.exe tunnel --url http://localhost:3001

pause
