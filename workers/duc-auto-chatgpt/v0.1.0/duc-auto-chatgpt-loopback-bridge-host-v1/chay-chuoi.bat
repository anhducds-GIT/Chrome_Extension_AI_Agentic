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
rem  CHAY XONG THI NO HOI, khong bat go lai tu dau:
rem     [t] CHAY TIEP — doc nhat ky, noi tu luot gui cuoi, TRU so vong da gui
rem     [m] chay MOI cung thong so — dem lai tu vong 1
rem     [g] go lai tu dau
rem  Va moi luot chay ghi thong so vao "%DUC_CHUOI_SO%\lan-truoc.txt", nen mo lai cua so
rem  moi van khong phai dien lai.
rem
rem  CHINH BANG BIEN MOI TRUONG (khong phai sua tep nay):
rem     DUC_PAIRING    duong dan tep ghep cap
rem     DUC_TARGET     profile mac dinh khi goi thang ma khong khai
rem     DUC_URL        dia chi hoi thoai mac dinh, neu khong truyen tham so thu nam
rem     DUC_CHUOI_HOME thu muc chua chuoi-reasoning.mjs, neu khong nam canh tep nay
rem     DUC_CHUOI_SO   thu muc goc chua nhat ky (mac dinh: Documents\chuoi-gpt)
rem
rem  BON DIEU KIEN, THIEU MOT LA CHUOI DUNG NGAY:
rem     1. Tab Chrome dang MO dung hoi thoai muon chay.
rem     2. Hoi thoai do DA CO khoi "GIAO KEO NOI VONG" (xem AI-OPERATOR-GUIDE.md).
rem     3. Khong go them gi vao hoi thoai do trong luc chuoi chay.
rem     4. DE CUA SO CHROME KHONG BI CHE. Do live 11/09: tab HIEN thi chu chay
rem        13 -> 909 -> 1096 ky tu trong 5 giay; tab bi che thi no DUNG IM ngay.
rem        Chrome bop duong stream cua tab nen. Chuoi van chay (bo chay nap lai
rem        de doc), nhung moi vong mat them mot luot nap lai.
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

:hoiThongSo
rem NHO THONG SO LAN TRUOC. Duc neu 12/09: script chet thi khong phai dien lai tu dau.
rem Bo chay ghi "lan-truoc.txt" o GOC kho nhat ky moi luot chay — dang khoa=gia tri, KHONG
rem phai mot tep .cmd chay duoc: tep nay do mot cai ten NGUOI GO de ra, va sinh ma chay duoc
rem tu chu nguoi go la cua tiem lenh. O day chi doc bang for /f.
if not exist "%DUC_CHUOI_SO%\lan-truoc.txt" goto :goTay
echo.
echo   Thong so lan truoc:
for /f "usebackq tokens=1,* delims==" %%A in ("%DUC_CHUOI_SO%\lan-truoc.txt") do echo      %%A = %%B
set "DUNGLAI="
set /p "DUNGLAI=Dung lai thong so nay? [Enter = co / k = go moi]: "
if /i "%DUNGLAI%"=="k" goto :goTay
for /f "usebackq tokens=1,* delims==" %%A in ("%DUC_CHUOI_SO%\lan-truoc.txt") do set "%%A=%%B"
echo   -^> dung lai: chuoi "%NHAN%" · %VONG% vong · profile "%DICH%"
goto :dinhNghia

:goTay
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
rem Ngoac kep vi cung ly do: mot dia chi hoi thoai trong Project co the mang `&` o phan `?...`.
if not "%DIA_CHI%"=="" echo   hoi thoai da ghim: "%DIA_CHI%"
if "%DIA_CHI%"=="" echo   hoi thoai: ghim theo tab dang mo o luot doc dau
echo.

rem Truyen --url chi khi CO dia chi. Truyen mot chuoi rong thi bo chay doc co ke tiep lam
rem gia tri va bao "--url khong phai mot hoi thoai" — dung ngay o cua vao.
rem KHONG dung khoi ngoac: cung ly do da ghi o dau tep.
set "TIEP_CO="
if "%TIEP%"=="1" set "TIEP_CO=--tiep"
if "%DIA_CHI%"=="" goto :chayKhongUrl
node "%BO_CHAY%" --so-vong %VONG% --nhan "%NHAN%" --tran-phut %PHUT% --pairing "%DUC_PAIRING%" --target "%DICH%" --nhat-ky "%SO%" --url "%DIA_CHI%" %TIEP_CO%
goto :xongChay
:chayKhongUrl
node "%BO_CHAY%" --so-vong %VONG% --nhan "%NHAN%" --tran-phut %PHUT% --pairing "%DUC_PAIRING%" --target "%DICH%" --nhat-ky "%SO%" %TIEP_CO%
:xongChay
set "MA=%ERRORLEVEL%"

echo.
rem DONG NGOAC HAI DONG NAY. Do 12/09 voi ten chuoi that cua Duc — "HNX audit & fill":
rem `echo ... %SO%\nhat-ky.jsonl` khong ngoac thi cmd doc dau `&` la DAU NOI LENH, cat cau
rem lam doi, va CHAY `fill\nhat-ky.jsonl` nhu mot lenh. Tren man hinh hien ra
rem "The system cannot find the path specified." va "'fill' is not recognized" — hai cau
rem khong lien quan gi toi chuoi, lam nguoi doc di tim loi o cho khac. Ngoac kep lam `&`
rem thanh chu binh thuong. Moi cho khac trong tep nay von da ngoac.
echo Nhat ky: "%SO%\nhat-ky.jsonl"
echo Dung chuoi nay: dung-chuoi.bat "%NHAN%"
echo.
rem CHAY LAI MA KHONG PHAI GO LAI — Duc neu 12/09.
rem "Chay tiep" va "chay moi" la HAI viec khac nhau, va nham chung thi ton mot luot gui that:
rem chay moi tu so khong tren mot hoi thoai dang do se doc lai khoi minh VUA GUI truoc khi
rem chet, va gui no lan hai. `--tiep` doc cho dung tu nhat ky nen khong gap chuyen do.
echo   [t] CHAY TIEP tu cho vua dung — khong gui lai prompt da gui
echo   [m] chay MOI cung thong so — dem lai tu vong 1
echo   [g] go lai thong so tu dau
echo   [Enter] thoat
set "CHON="
set /p "CHON=Chon: "
if /i "%CHON%"=="t" goto :lapTiep
if /i "%CHON%"=="m" goto :lapMoi
if /i "%CHON%"=="g" goto :lapGo
rem `pause`/`set /p` lam mat errorlevel, nen goi tep nay tu mot script khac se doc duoc 0
rem gia va tuong la "chay xong binh thuong". Giu lai ma that.
exit /b %MA%

:lapTiep
set "TIEP=1"
echo.
goto :dinhNghia

:lapMoi
set "TIEP="
echo.
goto :dinhNghia

rem Go lai thi XOA HET thong so cu truoc. Giu lai mot nua la cach de nhat de chay nham mot
rem hoi thoai cu voi mot ten chuoi moi — va cai do khong hoan tac duoc.
:lapGo
set "NHAN="
set "VONG="
set "PHUT="
set "DICH="
set "DIA_CHI="
set "TIEP="
goto :hoiThongSo

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
