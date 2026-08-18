@echo off
REM Avvia il server locale e POI apre il browser.
cd /d "%~dp0"

set "PY="
where py >nul 2>&1
if %errorlevel%==0 set "PY=py"

if not defined PY (
  where python >nul 2>&1
  if not errorlevel 1 set "PY=python"
)

if not defined PY goto :senzapython

echo Avvio il server su http://localhost:5173
start "Dashboard Serie - SERVER (non chiudere questa finestra)" %PY% -m http.server 5173

REM aspetto due secondi che il server sia in ascolto, poi apro il browser
ping -n 3 127.0.0.1 >nul
start "" http://localhost:5173/index.html
goto :eof

:senzapython
echo Python non trovato: apro il file direttamente nel browser.
echo La dashboard funziona lo stesso, ma non si installa come app.
start "" "%~dp0index.html"
pause
