@echo off
rem CUA (3) BAT — cho bang tu sinh lai moi lan bat may.
rem Duc duyet tuong minh 06/09 (BRIEF-BANG-BA-CUA-01 muc 5).
rem Dung thu muc Startup CUA NGUOI DUNG: khong can quyen quan tri, khong dich vu he thong.
rem Go bang cach nhap dup Tat-tu-chay.cmd.
chcp 65001 > nul
title Bang trang thai - bat tu chay
set "MUC=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\bang-trang-thai.vbs"
> "%MUC%" echo ' Tu sinh boi Bat-tu-chay.cmd. Go bang Tat-tu-chay.cmd.
>> "%MUC%" echo On Error Resume Next
>> "%MUC%" echo Set fso = CreateObject("Scripting.FileSystemObject")
>> "%MUC%" echo If Not fso.FileExists("%~dp0may-chu.mjs") Then WScript.Quit
>> "%MUC%" echo CreateObject("WScript.Shell").Run "cmd /c node ""%~dp0may-chu.mjs""", 0, False
if not exist "%MUC%" echo KHONG GHI DUOC MUC KHOI DONG. Thu chay lai file nay.
if not exist "%MUC%" pause
if not exist "%MUC%" exit /b 1
rem Goi THANG wscript, khong qua `start`: chinh muc khoi dong nay da chay bang wscript, va
rem `start` long them mot lop lam no khong len duoc luc chay thu 06/09. Lenh nay tra ve ngay
rem vi ban than muc khoi dong chay tien trinh nen roi thoat.
"%SystemRoot%\System32\wscript.exe" "%MUC%"
echo.
echo DA BAT. Tu bay gio moi lan bat may, bang se tu sinh lai trong nen.
echo.
echo Xem bang: nhap dup Xem-bang.cmd, hoac mo http://127.0.0.1:4747/
echo Bang tu noi no dang song hay da tat, ngay dong dau tien.
echo Muon go: nhap dup Tat-tu-chay.cmd.
echo.
pause
exit /b 0
