@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Khong tim thay Node.js tren may nay. Cai Node roi chay lai file nay.
  echo.
  pause
  exit /b 1
)
echo Dang mo may chu tai cho. Dong cua so nay la tat may chu.
REM Trinh duyet do chinh may chu mo, vi chi no biet cong that sau khi ne va cham.
node "bang-song/may-chu.mjs" --mo
pause
exit /b 0
