@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Khong tim thay Node.js tren may nay.
  echo   Bang song can Node de sinh trang. Cai Node roi chay lai file nay.
  echo.
  pause
  exit /b 1
)
echo Dang sinh bang song...
node "bang-song/mot-luot.mjs"
if errorlevel 1 (
  echo.
  echo   Sinh bang that bai. Doc dong loi o tren.
  echo.
  pause
  exit /b 1
)
start "" "bang-song\BANG.html"
exit /b 0
