@echo off
rem ============================================================================
rem  DUNG MOT CHUOI DANG CHAY — dat co dung, khong giet tien trinh.
rem
rem  CACH NHANH NHAT KHONG PHAI TEP NAY: trong chinh cua so dang chay, bam "d".
rem  Cua so do BIET no la chuoi nao, nen khong phai go lai mot cai ten. Tep nay
rem  danh cho luc cua so da dong, hoac chuoi chay khong co cua so.
rem
rem     dung-chuoi.bat            -> liet ke CO TRANG THAI, chon BANG SO
rem     dung-chuoi.bat ark-luat   -> dung chuoi ten "ark-luat"
rem
rem  Thu muc goc chua nhat ky doi bang bien moi truong DUC_CHUOI_SO.
rem
rem  Vi sao CHON BANG SO chu khong go ten — Duc neu 12/09: "phai go tay ten luong
rem  dan den sai", va "rat nhieu luong da khong con chay nua nhung van thay trong
rem  list, gay confuse". Ten chuoi cua Duc co dau tieng Viet, co dau cach, co ca
rem  `&`; kho nhat ky dang co "HNX" va "HNX " (thua dung mot dau cach) dung canh
rem  nhau. Go tay mot trong hai la dung nham, hoac khong dung gi ca. Bay gio danh
rem  sach noi ro cai nao DANG CHAY, va cai ten khong di qua ban phim nua.
rem
rem  Vi sao dat co chu khong giet: bo chay co the dang o giua mot luot GUI. Giet
rem  ngang thi khong ai biet tin nhan da bay chua, va do dung la cho khong duoc
rem  doan. Dat co thi no dung o dau luot ke tiep, ghi day du nhat ky, tra khoa.
rem  Cham nhat khoang 15 giay.
rem
rem  KHONG dung khoi ngoac quanh `if` trong tep nay: trong khoi, bien banh truong
rem  ngay luc PHAN TICH, nen `%ERRORLEVEL%` doc ra 0 gia. Da do that.
rem  Moi `echo` co duong dan deu NGOAC KEP: ten chuoi cua Duc co `&`, va cmd doc
rem  `&` la dau noi lenh roi chay nua sau nhu mot lenh. Da do that 12/09.
rem ============================================================================
setlocal
chcp 65001 > nul

if "%DUC_CHUOI_SO%"=="" set "DUC_CHUOI_SO=%USERPROFILE%\Documents\chuoi-gpt"
if "%DUC_CHUOI_HOME%"=="" ( set "HOME_CHUOI=%~dp0" ) else ( set "HOME_CHUOI=%DUC_CHUOI_HOME%\" )
set "BO_LIET_KE=%HOME_CHUOI%liet-ke-chuoi.mjs"
set "TEP_CHON=%TEMP%\dung-chuoi-%RANDOM%%RANDOM%.txt"

set "NHAN=%~1"
if not "%NHAN%"=="" goto :coTen

if not exist "%BO_LIET_KE%" goto :khongCoBoLietKe
echo.
echo   Cac chuoi trong kho nhat ky:
call :chonChuoi
if "%NHAN%"=="" goto :chuaChon
goto :coTen

rem Khong co bo liet ke thi van phai dung duoc — in tho danh sach thu muc nhu truoc.
:khongCoBoLietKe
echo.
echo   (khong thay "%BO_LIET_KE%" — liet ke tho, khong co trang thai)
if exist "%DUC_CHUOI_SO%" ( for /d %%D in ("%DUC_CHUOI_SO%\*") do echo     %%~nxD ) else ( echo     (chua co chuoi nao^) )
echo.
set /p "NHAN=Ten chuoi muon dung: "
if "%NHAN%"=="" goto :chuaChon

:coTen
set "SO=%DUC_CHUOI_SO%\%NHAN%"
if not exist "%SO%" goto :khongThay

echo dung > "%SO%\DUNG"
echo.
echo Da dat co dung cho chuoi "%NHAN%".
echo No se dung o dau luot doc ke tiep, cham nhat khoang 15 giay.
echo.
echo Lan sau nhanh hon: bam "d" ngay trong cua so dang chay.
echo.
pause
exit /b 0

:khongThay
echo Khong thay thu muc nhat ky cua chuoi "%NHAN%":
echo   "%SO%"
echo Co the ten go sai, hoac chuoi do chua chay lan nao.
echo.
pause
exit /b 2

:chuaChon
echo Chua chon chuoi nao. Khong lam gi.
echo.
pause
exit /b 2

rem --------------------------------------------------------------------------
rem Chon trong mot CHUONG TRINH CON, khong trong mot khoi ngoac — cung ly do da
rem ghi o dau tep. Phep kiem la "co tep ket qua khong", khong phai doc errorlevel.
:chonChuoi
node "%BO_LIET_KE%" --so "%DUC_CHUOI_SO%" --ra "%TEP_CHON%"
if not exist "%TEP_CHON%" goto :eof
for /f "usebackq delims=" %%L in ("%TEP_CHON%") do set "NHAN=%%L"
del /q "%TEP_CHON%" 2>nul
goto :eof
