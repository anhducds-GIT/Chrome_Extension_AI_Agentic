@echo off
chcp 65001 >nul
setlocal
set "SHIM=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\ArkBangSong.vbs"

if exist "%SHIM%" (
  del "%SHIM%"
  echo   Da go muc khoi dong. Lan bat may sau se khong con gi tu chay.
) else (
  echo   Khong co muc khoi dong nao dang bat.
)

rem Dung ban dang chay bang mot FILE CO, khong giet theo ten tien trinh.
rem Giet theo ten se giet luon tien trinh node cua mot phien AI dang lam viec.
echo dung > "%~dp0DUNG.txt"
echo   Da dat co dung. Ban dang chay se tu thoat trong vong 30 giay.
echo.
pause
exit /b 0
