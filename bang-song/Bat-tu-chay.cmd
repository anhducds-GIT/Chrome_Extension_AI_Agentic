@echo off
chcp 65001 >nul
setlocal
set "GOC=%~dp0.."
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHIM=%STARTUP%\ArkBangSong.vbs"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Khong tim thay Node.js. Cai Node roi chay lai file nay.
  echo.
  pause
  exit /b 1
)

> "%SHIM%" echo ' Bang song cua Ark_Repo_Harness — tu chay luc bat may.
>> "%SHIM%" echo ' Go bang cach chay Tat-tu-chay.cmd trong thu muc bang-song, hoac xoa file nay.
>> "%SHIM%" echo Set fso = CreateObject("Scripting.FileSystemObject")
>> "%SHIM%" echo goc = "%GOC%"
>> "%SHIM%" echo If Not fso.FolderExists(goc) Then WScript.Quit 0
>> "%SHIM%" echo Set sh = CreateObject("WScript.Shell")
>> "%SHIM%" echo sh.CurrentDirectory = goc
>> "%SHIM%" echo On Error Resume Next
>> "%SHIM%" echo sh.Run "node bang-song\may-chu.mjs", 0, False

if not exist "%SHIM%" (
  echo   Khong ghi duoc vao thu muc Startup. Chua bat duoc.
  pause
  exit /b 1
)

echo.
echo   DA BAT. Tu lan bat may sau, bang song tu chay ngam.
echo   Xem bang: http://127.0.0.1:4747/
echo   Muon go: chay Tat-tu-chay.cmd trong chinh thu muc nay.
echo.
echo   Dang mo luon mot ban ngay bay gio...
start "" /min cmd /c "cd /d "%GOC%" && node bang-song\may-chu.mjs --mo"
exit /b 0
