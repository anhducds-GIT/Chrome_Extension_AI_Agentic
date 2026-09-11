@echo off
rem ============================================================================
rem  DUNG MOT CHUOI DANG CHAY — dat co dung, khong giet tien trinh.
rem
rem     dung-chuoi.bat            -> liet ke cac chuoi dang co, roi hoi
rem     dung-chuoi.bat ark-luat   -> dung chuoi ten "ark-luat"
rem
rem  Thu muc goc chua nhat ky doi bang bien moi truong DUC_CHUOI_SO.
rem
rem  Vi sao dat co chu khong giet: bo chay co the dang o giua mot luot GUI. Giet
rem  ngang thi khong ai biet tin nhan da bay chua, va do dung la cho khong duoc
rem  doan. Dat co thi no dung o dau luot ke tiep, ghi day du nhat ky, tra khoa.
rem  Cham nhat khoang 15 giay.
rem ============================================================================
setlocal
chcp 65001 > nul

if "%DUC_CHUOI_SO%"=="" set "DUC_CHUOI_SO=%USERPROFILE%\Documents\chuoi-gpt"

set "NHAN=%~1"
if "%NHAN%"=="" (
  echo.
  echo   Cac chuoi da tung chay trong %DUC_CHUOI_SO%:
  if exist "%DUC_CHUOI_SO%" ( for /d %%D in ("%DUC_CHUOI_SO%\*") do echo     %%~nxD ) else ( echo     (chua co chuoi nao^) )
  echo.
  set /p "NHAN=Ten chuoi muon dung: "
)
if "%NHAN%"=="" (
  echo Chua chon chuoi nao. Khong lam gi.
  echo.
  pause
  exit /b 2
)

set "SO=%DUC_CHUOI_SO%\%NHAN%"
if not exist "%SO%" (
  echo Khong thay thu muc nhat ky cua chuoi "%NHAN%":
  rem Ngoac kep: ten chuoi cua Duc co `&` ("HNX audit & fill"), va `echo` khong ngoac thi cmd
  rem doc `&` la DAU NOI LENH roi chay nua sau nhu mot lenh. Do 12/09 o chay-chuoi.bat.
  echo   "%SO%"
  echo Co the ten go sai, hoac chuoi do chua chay lan nao.
  echo.
  pause
  exit /b 2
)

echo dung > "%SO%\DUNG"
echo Da dat co dung cho chuoi "%NHAN%".
echo No se dung o dau luot doc ke tiep, cham nhat khoang 15 giay.
echo.
pause
