@echo off
rem CUA (3) TAT — go muc khoi dong va bao ban dang chay tu dung.
rem Khong giet tien trinh theo ten: tren may nay con co tien trinh node cua phien AI dang lam viec.
chcp 65001 > nul
title Bang trang thai - tat tu chay
set "MUC=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\bang-trang-thai.vbs"
set "CO=0"
if exist "%MUC%" set "CO=1"
if exist "%MUC%" del "%MUC%"
echo dung > "%~dp0DUNG.txt"
echo.
if "%CO%"=="0" echo KHONG CO muc khoi dong nao - von da tat san.
if "%CO%"=="1" if not exist "%MUC%" echo DA GO muc khoi dong. Bat may lan sau se khong con gi chay.
if "%CO%"=="1" if exist "%MUC%" echo VAN CON MUC KHOI DONG - xoa khong duoc. Thu chay lai file nay.
echo Ban dang chay (neu co) se tu dung trong khoang 30 giay.
echo.
echo Muon bat lai: nhap dup Bat-tu-chay.cmd.
echo.
pause
exit /b 0
