---
schema: extension-status/v2
id: udin-optic
name: Udin Optic
lifecycle: building
owner: claude-scouter-udine
priority_rank: 5
next_step: "VONG THAM CHIEU BAY CHANG (W1 -> NGUON -> CHON -> W2 -> W3 -> JPG -> W4), chay that 17/09. Lam ca hai ca cua Duc: --anh canvas:<mau src> cho anh Udin tu sinh, --anh <duong vung ghi> cho anh tu ngoai (tha bang scout.tha, KHONG hop thoai — do 0/14 va 0/11 lan dem). Danh tinh anh canvas la data-image-id (ADR-0009), KHONG phai src: src bi cat o 200 ky tu va hai anh khac han nhau cho ra hai chuoi y het. Duc khoanh pham vi 17/09: CHI hoan thien Udin — R2 va R3 (phuc vu Scouter) PARKED."
human_action: "khong"
version_source: workers/udin-optic/v0.1.0/manifest.json
lifecycle_note: "lan chay that dau tien 15/09 — xem HANDOFF muc 2026-09-15f"
current_focus: "CA HAI DIEM DUNG DA QUA: (1) Duc nap lai extension — XONG 17/09; (2) Duc ky Scouter v1 — XONG, ADR-0008. Duong ranh giu nguyen: 4 tep CO Y KHAC + tu-dong/ chay chieu Udin->Scouter; 7 tep CHEP BI GHIM chay chieu nguoc lai. Phep thu mot cau truoc moi viec: co can method Bridge MOI khong? Con mo: S-31 — Udin khong tu nap lai duoc (scout.reload bi cat o T21), nen moi lan sua ma extension deu phai nho Duc bam mot lan; mo lai la THEM MOT METHOD, tuc phai Duc chot. HAI LOI KHAI CUA LO TRINH DA BI BAC BO 16/09: (a) G-95 setZoom khong doi quyen tabs; (b) G-96 bang ben khong goi duoc bridge.sessions."
lam_duoc: "Chay viec sinh anh tren Udin tu dong lenh: vuot man cho, gui prompt, doi anh moi, roi lay anh ve dia. Bon chang W1..W4 deu co phep ghim."
khong_lam_duoc: "Khong tu chay. Khong do trang la: khong co scout.page, scout.tree, scout.a11y, scout.shot, scout.network — chung KHONG TON TAI o goi nay, khong phai bi chan. Khong goi mang tuy y: scout.fetch bi cat. Khong tu nap lai chinh no: scout.reload bi cat, do la viec cua seed Scouter. Manifest chi khai dung mot trang."
dung_the_nao: "Sinh tep ghep cap rieng bang tao-tep-ghep-cap.mjs --goi udin-optic, bat may chu Bridge cua goi nay, nap thu muc v0.1.0 vao Chrome, chon tep ghep cap o bang ben, roi bat cong tac Cho phep bam va go. Phanh khan: Ctrl+Shift+U (KHAC Scouter co y — trung phim thi mot goi mat phanh)."
ref_readme: workers/udin-optic/v0.1.0/README.md
ref_handoff: workers/udin-optic/v0.1.0/HANDOFF.md
ref_runbook: workers/udin-optic/v0.1.0/CHUOI-VIEC.md
---

# Udin Optic

Gói riêng trong `workers/` từ ngày 15/09 theo `T21`. Trước đó nó sống trong `pilots/` của chính
Scouter — nên câu *"Scouter là bộ đồ nghề chung"* vẫn là **lời khai**: không có gì ép hai bên rời
nhau. Tách ra là lúc đầu tiên câu đó bị bắt chứng minh.

## Vì sao là extension riêng, chứ không phải một gói script chạy trên Scouter

Đo ngày 15/09: tách ra theo kiểu extension đầy đủ nghĩa là **chép lại ~2.100 dòng** máy gắn
debugger và tổng hợp phím chuột (`scouter-probes.mjs` 1.181 · `scouter-actions-core.mjs` 938),
**gồm cả cái phanh**. Con số đó được đưa cho Đức trước khi làm, kèm đường thứ hai (gói script,
0 dòng chép, chạy trên extension Scouter).

Đức chốt đường extension riêng, với lý do không nằm trong phép đo của tôi:

> *"Vì sau này Scouter sẽ còn thay đổi nhiều, ngoài ra UI của Udin Extension cũng sẽ bị thay
> đổi cho phù hợp usecase, do đó tách riêng sẽ hợp lý hơn."*

Đó là lý lẽ **tách rời nhịp thay đổi**, và nó đúng: một bản chép *được phép trôi* không phải
fork — fork là hai bản trôi mà không ai biết.

**Nên cái giá đã trả được đặt một tấm lưới:** `tests/be-mat-hep-smoke.mjs` khối ⑷ băm **bảy tệp
chép** và **đỏ khi lệch**. Muốn khác thật thì khai vào `CO_Y_KHAC` kèm lý do — lúc đó nó là
quyết định có chữ ký, không phải một vệt trôi.

## Gói này hẹp hơn Scouter ở đâu — đo được, không phải lời khen

| | Duc Scouter | Udin Optic |
|---|---|---|
| lệnh Bridge | 24 | **12** |
| lệnh GHI | 11 | **5** |
| vùng đích | `<all_urls>` | **`vinfast.udinbv.com` + `127.0.0.1`** |
| gọi mạng tuỳ ý (`scout.fetch`) | có | **không tồn tại** |
| tự nạp lại (`scout.reload`) | có | **không tồn tại** |
| việc | dò trang bất kỳ | một việc, một trang |

Quyền `debugger` thì **giống nhau** — Udin phải bấm và gõ. Đó là chiều duy nhất gói này không
hẹp lại được, và cũng là lý do bảy tệp kia phải bị ghim.
