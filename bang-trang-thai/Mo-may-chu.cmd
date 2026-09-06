@echo off
rem CUA (2) — MAY CHU TAI CHO: mo mot lan, trong trang co nut "Lam moi ngay".
rem May chu nghe CHI o 127.0.0.1 va KHONG co duong ghi nao.
rem Muon tat: dong cua so den ten "Bang trang thai".
chcp 65001 > nul
title Bang trang thai - dang mo may chu
where node > nul 2>&1
if errorlevel 1 echo.
if errorlevel 1 echo KHONG TIM THAY NODE.JS TREN MAY NAY.
if errorlevel 1 echo Cai Node.js xong roi nhap dup lai file nay.
if errorlevel 1 echo.
if errorlevel 1 pause
if errorlevel 1 exit /b 1
start "Bang trang thai" cmd /c node "%~dp0may-chu.mjs"
echo Dang doi may chu san sang...
rem Duong dan DAY DU, co ly do: neu chi goi `timeout` thi khi PATH co mot ban `timeout` khac
rem (Git Bash cai kem mot ban) thi lenh nay hong. Da hong that luc chay thu 06/09.
"%SystemRoot%\System32\timeout.exe" /t 3 /nobreak > nul
start "" http://127.0.0.1:4747/
exit /b 0
