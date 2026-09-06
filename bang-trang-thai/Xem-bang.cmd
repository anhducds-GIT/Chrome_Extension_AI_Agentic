@echo off
rem CUA (1) — NHAP DUP LA XONG: sinh lai bang, mo bang, roi bien mat.
rem Hong thi noi bang tieng Viet trong mot cua so doc duoc, khong nhay roi tat.
chcp 65001 > nul
title Bang trang thai
echo Dang sinh lai bang...
node "%~dp0loi.mjs"
if errorlevel 1 echo.
if errorlevel 1 echo KHONG MO DUOC BANG.
if errorlevel 1 echo Thuong la mot trong hai ly do:
if errorlevel 1 echo   - May chua cai Node.js. Cai xong nhap dup lai file nay.
if errorlevel 1 echo   - Thu muc repo da bi doi cho hoac doi ten.
if errorlevel 1 echo.
if errorlevel 1 pause
if errorlevel 1 exit /b 1
start "" "%~dp0BANG.html"
exit /b 0
