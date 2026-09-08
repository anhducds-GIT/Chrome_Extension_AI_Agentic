@echo off
REM ============================================================================
REM  Chay-may-chu-HNX.cmd — bat may chu Bridge cho extension HNX Fetch.
REM
REM  VI SAO CAN RIENG CAI NAY: extension HNX Fetch noi giao thuc "hnx-fetch.bridge",
REM  con may chu cua Scouter noi "duc-scouter.bridge". Ghep cap bang tep cua Scouter
REM  thi tep hop le nhung BAT TAY VAN KHONG THANH — va bang ben chi bao "Mat ket noi",
REM  giong het luc chua bat may chu.
REM
REM  DUNG:
REM    · Keo tha tep ghep cap (.json) vao file nay, HOAC
REM    · Chay:  Chay-may-chu-HNX.cmd "<duong-dan-pairing.json>" "<thu-muc-ghi>"
REM
REM  Khong dua thu muc ghi thi no dung thu muc "du-lieu-ra" canh tep ghep cap.
REM  Thu muc ghi KHONG duoc chua tep ghep cap — may chu se tu choi khoi dong neu co,
REM  vi file.read doc duoc moi tep duoi vung ghi, tuc la token doc duoc qua day.
REM ============================================================================
setlocal
if "%~1"=="" (
  echo.
  echo   Thieu tep ghep cap.
  echo   Keo tha tep pairing .json vao file nay, hoac chay:
  echo     Chay-may-chu-HNX.cmd "duong-dan\pairing.json" "thu-muc-ghi"
  echo.
  pause
  exit /b 2
)
set "PAIRING=%~1"
set "ROOT=%~2"
if "%ROOT%"=="" set "ROOT=%~dp1du-lieu-ra"
if not exist "%ROOT%" mkdir "%ROOT%"
echo May chu HNX Fetch  ·  ghep cap: %PAIRING%
echo Vung ghi: %ROOT%
echo Dong cua so nay de tat may chu.
echo.
node "%~dp0hnx-fetch-host.mjs" --pairing "%PAIRING%" --root "%ROOT%"
if errorlevel 1 pause
endlocal
