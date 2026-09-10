@echo off
rem ============================================================================
rem  CHAY MOT CHUOI REASONING TREN GPT WEB
rem
rem  NHAP DOI, khong go gi -> no hoi ten chuoi / so vong / tran phut, roi CHO
rem  CHON profile tu danh sach cac profile dang that su noi Bridge.
rem
rem  Hoac goi thang, cac tham so deu co the bo qua:
rem     chay-chuoi.bat <nhan> [so-vong] [tran-phut] [target] [dia-chi-hoi-thoai]
rem
rem     chay-chuoi.bat ark-luat
rem     chay-chuoi.bat ark-luat 12
rem     chay-chuoi.bat ark-luat 12 240
rem     chay-chuoi.bat ark-luat 12 240 Ark
rem     chay-chuoi.bat ark-luat 12 240 Ark https://chatgpt.com/c/<id>
rem
rem  THAM SO THU NAM la DIA CHI HOI THOAI, va no la thu dang khai nhat. Khong khai thi bo
rem  chay ghim dung tab dang mo o luot doc dau — tien, nhung mo nham tab la go nham hoi
rem  thoai, va cai do khong hoan tac duoc. Che nhap doi thi no HOI, khong phai go tay.
rem
rem  CUA THOAT cho moi co la, ke ca co them sau nay:
rem     chay-chuoi.bat -- --nhan x --so-vong 3 --tu-turn abc123 --target y
rem  Sau "--" moi thu duoc chuyen NGUYEN VAN cho chuoi-reasoning.mjs.
rem
rem  DUNG GIUA CHUNG: nhap doi dung-chuoi.bat <nhan>, hoac dong cua so.
rem
rem  CHINH BANG BIEN MOI TRUONG (khong phai sua tep nay):
rem     DUC_PAIRING    duong dan tep ghep cap
rem     DUC_TARGET     profile mac dinh khi goi thang ma khong khai
rem     DUC_URL        dia chi hoi thoai mac dinh, neu khong truyen tham so thu nam
rem     DUC_CHUOI_HOME thu muc chua chuoi-reasoning.mjs, neu khong nam canh tep nay
rem     DUC_CHUOI_SO   thu muc goc chua nhat ky (mac dinh: Documents\chuoi-gpt)
rem
rem  BA DIEU KIEN, THIEU MOT LA CHUOI DUNG NGAY:
rem     1. Tab Chrome dang MO dung hoi thoai muon chay.
rem     2. Hoi thoai do DA CO khoi "GIAO KEO NOI VONG" (xem AI-OPERATOR-GUIDE.md).
rem     3. Khong go them gi vao hoi thoai do trong luc chuoi chay.
rem
rem  MOT LUC MOT CHUOI TREN MOT PROFILE. Khoa hien chi khoa theo thu muc nhat ky
rem  (B-64), nen hai chuoi khac ten van chay chong len nhau duoc. Doi chuoi thi
rem  chay dung-chuoi.bat <ten-cu> truoc.
rem
rem  Tep nay chi la vo boc. Moi loi nhan tieng Viet do cac tep .mjs in ra.
rem ============================================================================
setlocal
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
set "TEP_CHON=%TEMP%\chon-profile-%RANDOM%%RANDOM%.txt"
set "TEP_URL=%TEMP%\chon-url-%RANDOM%%RANDOM%.txt"

rem --- Cua thoat: "--" thi chuyen nguyen van phan con lai cho bo chay ----------
rem KHONG dung khoi ngoac o day: trong khoi, `%ERRORLEVEL%` banh truong ngay luc
rem PHAN TICH, tuc truoc khi `call` chay, nen ma thoat luon ra 0. Da do that.
if not "%~1"=="--" goto :thuong
call :thoatRa %*
exit /b %MA%
:thuong

set "NHAN=%~1"
set "VONG=%~2"
set "PHUT=%~3"
set "DICH=%~4"
set "DIA_CHI=%~5"
if "%DIA_CHI%"=="" set "DIA_CHI=%DUC_URL%"

if not "%NHAN%"=="" goto :dinhNghia

echo.
echo   Ten chuoi dung de dat ten thu muc nhat ky. Vi du: ark-luat
set /p "NHAN=Ten chuoi [chuoi]: "
set /p "VONG=So vong toi da [8]: "
set /p "PHUT=Tran thoi gian, phut [180]: "

rem Profile thi CHON, khong GO. Go tay la cho de sai nhat: lech mot ky tu thi
rem Bridge nhan khong ra, va loi hien ra MUON, sau khi da cho ca mot vong. Menu
rem con cho thay profile nao dang THAT SU noi — thu ma go tay khong noi duoc.
rem Danh sach do chinh HOST tra loi, khong phai trang, nen goi no khong gianh
rem panel voi mot chuoi dang chay.
call :chonProfile
if "%DICH%"=="" (
  echo.
  echo Chua chon duoc profile nao. Dung, khong chay gi.
  echo.
  pause
  exit /b 2
)
echo.

:dinhNghia
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

rem Nhac lai truoc khi chay: profile la thu de nham nhat, va nham thi phai doi
rem het mot vong moi biet.
echo   chuoi "%NHAN%" · %VONG% vong · tran %PHUT% phut · profile "%DICH%"
if not "%DIA_CHI%"=="" echo   hoi thoai da ghim: %DIA_CHI%
if "%DIA_CHI%"=="" echo   hoi thoai: ghim theo tab dang mo o luot doc dau
echo.

rem Truyen --url chi khi CO dia chi. Truyen mot chuoi rong thi bo chay doc co ke tiep lam
rem gia tri va bao "--url khong phai mot hoi thoai" — dung ngay o cua vao.
if "%DIA_CHI%"=="" (
  node "%BO_CHAY%" --so-vong %VONG% --nhan "%NHAN%" --tran-phut %PHUT% --pairing "%DUC_PAIRING%" --target "%DICH%" --nhat-ky "%SO%"
) else (
  node "%BO_CHAY%" --so-vong %VONG% --nhan "%NHAN%" --tran-phut %PHUT% --pairing "%DUC_PAIRING%" --target "%DICH%" --nhat-ky "%SO%" --url "%DIA_CHI%"
)
set "MA=%ERRORLEVEL%"

echo.
echo Nhat ky: %SO%\nhat-ky.jsonl
echo Dung chuoi nay: dung-chuoi.bat %NHAN%
echo.
pause
rem `pause` lam mat errorlevel, nen goi tep nay tu mot script khac se doc duoc 0
rem gia va tuong la "chay xong binh thuong". Giu lai ma that.
exit /b %MA%

rem --------------------------------------------------------------------------
rem Chon profile trong mot CHUONG TRINH CON, khong trong mot khoi ngoac. Trong
rem khoi ngoac, `if errorlevel` da mot lan khong chan duoc mot lan thoat 2 — bo
rem chay van khoi dong voi profile mac dinh. Ra day thi luong dieu khien thang,
rem va phep kiem la "co tep ket qua khong", khong phai doc errorlevel.
rem Cung mot luot hoi tra loi HAI cau: profile nao, va hoi thoai nao. Cau thu hai la BAT DIA
rem CHI — khong khai thi bo chay ghim dung tab dang mo, va mo nham tab la go nham hoi thoai,
rem cai do khong hoan tac duoc. Khong bat duoc thi tep %TEP_URL% vang mat va chay nhu cu.
:chonProfile
node "%HOME_CHUOI%chon-profile.mjs" --pairing "%DUC_PAIRING%" --ra "%TEP_CHON%" --ra-url "%TEP_URL%"
rem Khong dung khoi ngoac — cung ly do da ghi o dau tep: trong khoi, moi thu banh truong luc
rem PHAN TICH. Luong dieu khien thang thi khong co gi de banh truong nham.
if not exist "%TEP_URL%" goto :khongCoUrl
for /f "usebackq delims=" %%U in ("%TEP_URL%") do set "DIA_CHI=%%U"
del /q "%TEP_URL%" 2>nul
:khongCoUrl
if not exist "%TEP_CHON%" goto :eof
for /f "usebackq delims=" %%L in ("%TEP_CHON%") do set "DICH=%%L"
del /q "%TEP_CHON%" 2>nul
goto :eof

rem Chuyen nguyen van moi tham so sau "--" cho bo chay.
:thoatRa
shift
set "CON_LAI="
:gomTiep
if "%~1"=="" goto :chayThang
set "CON_LAI=%CON_LAI% %1"
shift
goto :gomTiep
:chayThang
node "%BO_CHAY%" %CON_LAI% --pairing "%DUC_PAIRING%"
set "MA=%ERRORLEVEL%"
echo.
pause
rem Khong `exit /b` o day — de ben goi tra ma. `MA` song chung pham vi.
goto :eof
