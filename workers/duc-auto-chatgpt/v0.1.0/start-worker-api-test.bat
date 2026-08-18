@echo off
setlocal

cd /d "%~dp0"

echo.
echo Starting Worker API Test server from:
echo %CD%
echo.
echo This window must remain open while using the test page.
echo Closing this terminal stops the localhost server.
echo.

where python >nul 2>&1
if not errorlevel 1 goto :run_python

where py >nul 2>&1
if not errorlevel 1 goto :run_py

echo ERROR: Python was not found.
echo Install Python for Windows, or enable the Python launcher (py), then run this file again.
pause
exit /b 1

:run_python
start "" /b powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process 'http://localhost:8123/worker-api-test.html'"
python -m http.server 8123
goto :server_stopped

:run_py
start "" /b powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process 'http://localhost:8123/worker-api-test.html'"
py -m http.server 8123

:server_stopped
echo.
echo Worker API Test server stopped.
pause
