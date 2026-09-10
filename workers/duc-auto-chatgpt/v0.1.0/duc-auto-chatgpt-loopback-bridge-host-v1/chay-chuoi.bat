@echo off
rem ============================================================================
rem  CHAY MOT CHUOI REASONING TREN GPT WEB
rem
rem  NHAP DOI, khong go gi -> no HOI tung thu roi chay.
rem
rem  Hoac goi thang, cac tham so deu co the bo qua:
rem     chay-chuoi.bat <nhan> [so-vong] [tran-phut] [target]
rem
rem     chay-chuoi.bat ark-luat
rem     chay-chuoi.bat ark-luat 12
rem     chay-chuoi.bat ark-luat 12 240
rem     chay-chuoi.bat ark-luat 12 240 tai-khoan-khac
rem
rem  CUA THOAT cho moi co la, ke ca co them sau nay:
rem     chay-chuoi.bat -- --nhan x --so-vong 3 --tu-turn abc123 --target y
rem  Sau "--" moi thu duoc chuyen NGUYEN VAN cho chuoi-reasoning.mjs.
rem
rem  DUNG GIUA CHUNG: nhap doi dung-chuoi.bat <nhan>, hoac dong cua so.
rem
rem  CHINH BANG BIEN MOI TRUONG (khong phai sua tep nay):
rem     DUC_PAIRING    duong dan tep ghep cap        (mac dinh: duong dan duoi day)
rem     DUC_TARGET     nhan profile Chrome           (mac dinh: anhducds)
rem     DUC_CHUOI_HOME thu muc chua chuoi-reasoning.mjs, neu khong nam canh tep nay
rem     DUC_CHUOI_SO   thu muc goc chua nhat ky      (mac dinh: Documents\chuoi-gpt)
rem
rem  BA DIEU KIEN, THIEU MOT LA CHUOI DUNG NGAY:
rem     1. Tab Chrome dang MO dung hoi thoai muon chay.
rem     2. Hoi thoai do DA CO khoi "GIAO KEO NOI VONG" (xem AI-OPERATOR-GUIDE.md).
rem     3. Khong go them gi vao hoi thoai do trong luc chuoi chay.
rem
rem  Tep nay chi la vo boc. Moi loi nhan tieng Viet do chuoi-reasoning.mjs in ra.
rem ============================================================================
setlocal EnableDelayedExpansion
chcp 65001 > nul

if "%DUC_CHUOI_HOME%"=="" ( set "HOME_CHUOI=%~dp0" ) else ( set "HOME_CHUOI=%DUC_CHUOI_HOME%\" )
set "BO_CHAY=%HOME_CHUOI%chuoi-reasoning.mjs"
if not exist "%BO_CHAY%" (
  echo KHONG THAY BO CHAY:
  echo   %BO_CHAY%
  echo Dat bien moi truong DUC_CHUOI_HOME tro toi thu muc chua chuoi-reasoning.mjs.
  echo.
  pause
  exit /b 2
)

if "%DUC_PAIRING%"=="" set "DUC_PAIRING=C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-chatgpt\duc-auto-chatgpt-bridge-pairing-v1.json"
if "%DUC_TARGET%"=="" set "DUC_TARGET=anhducds"
if "%DUC_CHUOI_SO%"=="" set "DUC_CHUOI_SO=%USERPROFILE%\Documents\chuoi-gpt"

rem --- Cua thoat: "--" thi chuyen nguyen van phan con lai cho bo chay ----------
if "%~1"=="--" (
  set "CON_LAI=%*"
  set "CON_LAI=!CON_LAI:~3!"
  node "%BO_CHAY%" !CON_LAI! --pairing "%DUC_PAIRING%"
  echo.
  pause
  exit /b %errorlevel%
)

rem --- Khong co tham so thi HOI --------------------------------------------
set "NHAN=%~1"
set "VONG=%~2"
set "PHUT=%~3"
set "DICH=%~4"

if "%NHAN%"=="" (
  echo.
  echo   Ten chuoi dung de dat ten thu muc nhat ky. Vi du: ark-luat
  set /p "NHAN=Ten chuoi [chuoi]: "
  set /p "VONG=So vong toi da [8]: "
  set /p "PHUT=Tran thoi gian, phut [180]: "
  set /p "DICH=Profile Chrome [%DUC_TARGET%]: "
  echo.
)

if "%NHAN%"=="" set "NHAN=chuoi"
if "%VONG%"=="" set "VONG=8"
if "%PHUT%"=="" set "PHUT=180"
if "%DICH%"=="" set "DICH=%DUC_TARGET%"

if not exist "%DUC_PAIRING%" (
  echo KHONG THAY TEP GHEP CAP:
  echo   %DUC_PAIRING%
  echo Dat bien moi truong DUC_PAIRING neu no nam cho khac.
  echo.
  pause
  exit /b 2
)

rem Nhat ky nam NGOAI repo — de trong repo la moi lan chay lai lam ban cay lam viec.
set "SO=%DUC_CHUOI_SO%\%NHAN%"
if not exist "%SO%" mkdir "%SO%"

rem Xoa co dung con sot lai tu lan truoc, neu khong chuoi dung ngay luot dau.
if exist "%SO%\DUNG" del /q "%SO%\DUNG"

node "%BO_CHAY%" --so-vong %VONG% --nhan "%NHAN%" --tran-phut %PHUT% --pairing "%DUC_PAIRING%" --target "%DICH%" --nhat-ky "%SO%"
set "MA=%errorlevel%"

echo.
echo Nhat ky: %SO%\nhat-ky.jsonl
echo Dung chuoi nay: dung-chuoi.bat %NHAN%
echo.
pause
rem Giu ma thoat cua bo chay. `pause` lam mat errorlevel, nen goi tep nay tu mot
rem script khac se doc duoc 0 gia va tuong la "chay xong binh thuong".
exit /b %MA%
