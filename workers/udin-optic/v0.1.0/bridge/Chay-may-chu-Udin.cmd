@echo off
REM ============================================================================
REM  Chay-may-chu-Udin.cmd — bat may chu Bridge cho extension Udin Optic.
REM
REM  VI SAO CAN RIENG CAI NAY: extension Udin Optic noi giao thuc "udin-optic.bridge",
REM  con may chu cua Scouter noi "duc-scouter.bridge". Ghep cap bang tep cua Scouter
REM  thi tep hop le nhung BAT TAY VAN KHONG THANH — va bang ben chi bao "Mat ket noi",
REM  giong het luc chua bat may chu. Do la cai bay hnx-fetch da mat mot buoi vi no.
REM
REM  DUNG:
REM    · Keo tha tep ghep cap (.json) vao file nay, HOAC
REM    · Chay:  Chay-may-chu-Udin.cmd "<duong-dan-pairing.json>" "<thu-muc-ghi>"
REM
REM  Khong dua thu muc ghi thi no dung thu muc "anh-ra" canh tep ghep cap.
REM  Thu muc ghi KHONG duoc chua tep ghep cap — may chu se tu choi khoi dong neu co,
REM  vi file.read doc duoc moi tep duoi vung ghi, tuc la token doc duoc qua day.
REM ============================================================================
setlocal
if "%~1"=="" (
  echo.
  echo   Thieu tep ghep cap.
  echo   Keo tha tep pairing .json vao file nay, hoac chay:
  echo     Chay-may-chu-Udin.cmd "duong-dan\pairing.json" "thu-muc-ghi"
  echo.
  pause
  exit /b 2
)
set "PAIRING=%~1"
set "ROOT=%~2"
REM  Vung ghi lay theo thu tu: tham so thu 2  >  vung-ghi.txt canh tep ghep cap  >  anh-ra.
REM  Doi sang o D: thi tao mot tep "vung-ghi.txt" canh tep ghep cap, trong do MOT DONG
REM  duy nhat la duong dan, vi du:  D:\Udin\ket-xuat
REM  Tep do nam NGOAI repo, nen no khong bao gio bi git nuot, va moi may mot duong khac nhau.
if "%ROOT%"=="" if exist "%~dp1vung-ghi.txt" set /p ROOT=<"%~dp1vung-ghi.txt"
if defined ROOT set "ROOT=%ROOT:"=%"
if "%ROOT%"=="" set "ROOT=%~dp1anh-ra"
if not exist "%ROOT%" mkdir "%ROOT%"
echo May chu Udin Optic  ·  ghep cap: %PAIRING%
echo Vung ghi: %ROOT%
echo Dong cua so nay de tat may chu.
echo.
node "%~dp0udin-optic-host.mjs" --pairing "%PAIRING%" --root "%ROOT%"
if errorlevel 1 pause
endlocal
