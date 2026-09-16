# GÓI VIỆC CODEX — B · Hồi sinh 8 bộ kiểm đang cách ly (N-65)

> Gói này là **toàn bộ** bối cảnh. Đọc thêm đúng **một** file: `drafts/N-65-DO-GIA-HOI-SINH.md`
> (bảng đo tên nhập đã mất). Đừng đọc thêm gì khác để "hiểu dự án".
> Người soạn gói: lane `claude-gpt-chay-het-job`, 12/09/2026.
> Tên lane đề nghị cho bạn: **`codex-hoi-sinh-n65`**.

## Chuyện gì

Migrate 10/09 thêm bộ kiểm mới mà không xoá bộ kiểm cũ. `npm test` chết ngay bài đầu nên
18/31 bài không ai chạy suốt ba ngày — trong ba ngày đó **bốn lớp bảo vệ chết không tiếng kêu**.
12/09 chuỗi test được nối lại (`npm test` thoát 0); 8 bài không hồi sinh kịp bị đưa vào
`npm run test:chet`, **không xoá** — xoá phải hỏi Đức.

**Cả 8 bài chết ở dòng `import`, chưa một phép khẳng định nào được chạy.** 73% số dòng ghim
vào các module vẫn còn gần như nguyên vẹn. Xem bảng đo trong `drafts/N-65-DO-GIA-HOI-SINH.md`.

## Việc, theo thứ tự. KHÔNG được đảo.

### BƯỚC 1 — MUA CON SỐ (làm trước, commit riêng)

Với **7** bài (tất cả trừ `build-overview-smoke`): sửa **chỉ dòng `import`** theo bảng đổi tên
dưới đây. **Không sửa một phép khẳng định nào ở bước này.** Rồi chạy từng bài và **đếm** xem
bao nhiêu khối khẳng định thật sự đỏ.

| tên cũ | nay ở đâu |
|---|---|
| `CHUA_THAY_DAU_VET`, `dauVetTheoVung`, `dauVetThuan`, `mocMs` | `scripts/claim.mjs`: `DAU_VET, xetDauVet, noiDauVet, doDauVet, mocCoGio` |
| `laTrongVungDongBang` | `scripts/what-next.mjs`: `daDongBang` |
| `PHU_THUOC_CHUNG_DONG_BANG`, `chonSuiteBoDongBang` | `scripts/repo-structure.mjs`: `frozenFrom` |
| `adrScopeOf` | `scripts/check-bootstrap.mjs`: `isAdrPath` + `soHieuAdr` + `nhaCuaSoHieu` |
| `BASELINE`, `baselineDaNiemPhong`, `canDayTruocKhiTra`, `khoaBiDoiChu`, `kiemKhoaKhaiDuoc` | không còn — thay bằng `DAU_VET` + `cuaIndex` / `xetCuaIndex` / `napCuaIndex` |
| `CHUA_DAY`, `commitChuaDay` | không còn ở `repo-structure.mjs` — **tìm chủ mới trước khi vá**, đừng đoán |
| `fileScriptCanChep`, `DEFAULT_UNITS` (ở `build-dashboard-smoke`) | `DEFAULT_UNITS` nay ở `scripts/repo-structure.mjs`; `fileScriptCanChep` **không còn** |
| `CHI_SO_KY_THUAT` và 43 tên khác | `build-overview.mjs` đã viết lại — **bước 3**, không phải bước này |

Bảng này là **gợi ý dò đường, không phải chân lý**. Mỗi lần đổi tên phải **đọc hàm mới** xem
nó có làm đúng việc hàm cũ làm không. Tên trùng không có nghĩa là hành vi trùng.

**Báo lại đúng dạng này, một dòng một bài** — đây là sản phẩm của bước 1:

```
claim-smoke: 48 khối, 3 đỏ  — (đỏ: khối 12 "từ chối khi lane khác giữ", …)
```

**Commit bước 1 riêng.** 7 bài vẫn ở `test:chet`, chưa đưa vào `npm test`.

### BƯỚC 2 — SỬA PHẦN THẬT SỰ ĐỎ

Chỉ sửa những khối bước 1 đếm ra. Mỗi khối, trả lời được **một** trong hai:

- **Hành vi đã đổi có chủ đích** ⇒ sửa phép khẳng định cho khớp, và **ghi vào comment lý do**:
  đổi ở đâu, ADR/backlog nào chốt. Không tìm được chỗ chốt ⇒ **đó là hồi quy, không phải phép
  kiểm cũ** ⇒ **DỪNG và báo Đức**, đừng sửa phép kiểm cho xanh.
- **Hành vi hỏng thật** ⇒ sửa **mã nguồn**, không sửa phép kiểm.

> **Luật không được phá:** *"Không bao giờ làm yếu một lớp bảo vệ để cổng xanh."*
> Vá `import` cho qua cửa mà không hiểu phép khẳng định chính là cách đẻ ra **một bài kiểm xanh
> vì lý do sai** — đúng thứ vừa làm repo mất ba ngày.

### BƯỚC 3 — `build-overview-smoke`: CHỜ ĐỨC

**44/47 tên nhập đã mất.** Bộ sinh đã viết lại từ đầu. **Đừng đụng vào bài này cho tới khi
Đức trả lời.** Đề xuất đang chờ Đức chốt: bỏ 2.516 dòng cũ, viết mới ~80 dòng giữ đúng phép
Đức đặt hàng — *"bảng không được lộ chi tiết kỹ thuật"* — cộng phép so sánh tất định.

Đức nói **có**: trước khi viết, kiểm `tests/bang-song.mjs` và `tests/bang-ba-cua-smoke.mjs` xem
đã phủ phần nào chưa, **đừng ghim trùng**. Đức nói **không**: viết lại đủ theo API hiện tại.
Đức chưa nói gì: **để nguyên trong `test:chet`**, báo cáo ghi rõ là đang chờ.

### BƯỚC 4 — ĐƯA LẠI VÀO `npm test`

Bài nào xanh **và qua đột biến kiểm** thì chuyển từ `test:chet` sang `test` trong `package.json`.

`tests/dau-suite-smoke.mjs` cưỡng chế **hai chiều**: mọi tệp trong `tests/` phải nằm ở **đúng
một** chuỗi, **và** mọi bài trong `test:chet` phải **thật sự đỏ**. Sửa xong mà quên chuyển
sang `test` cũng **đỏ**. Đừng gỡ phép này.

`test:chet` rỗng thì xoá luôn khoá `test:chet` khỏi `package.json`, và cập nhật `dau-suite-smoke`
cho khớp.

## Đột biến kiểm — bắt buộc, và cái bẫy đã trả giá

Mỗi bài trước khi được vào `npm test`: **bẻ dòng mã mà nó canh, chạy lại, bài phải ĐỎ.**

**Bẫy:** mỏ neo đột biến không khớp thì lượt "đã đột biến" thật ra **chưa đột biến**, và nó in
"XANH — không bắt được" trông y hệt một phép kiểm yếu. **Đếm số lần mỏ neo khớp; khớp 0 lần
thì báo hỏng**, đừng đọc kết quả. Đã dính thật trong repo này.

### BƯỚC 5 — VÁ LỖ N-64 Ở TOOL THỨ HAI (phát hiện 12/09, chặn thật)

`.repo-structure.json` khai `drafts/` trong `nhap_dung_chung`, và note của chính nó viết:

> *"Khai steward `_root` để B3 có một mục, nhưng quyền THẬT nằm ở khối `nhap_dung_chung`:
> **không quy file ở đây cho lane đang giữ `_root`**."*

`scripts/session-check.mjs` tuân luật đó (3 chỗ gọi `nhapDungChung`).
**`scripts/claim.mjs` có 0 chỗ** — nên `--soat`, `--sua` và `cuaIndex` làm đúng cái note cấm.

Hậu quả đo được 12/09: lane `claude-scouter-udine` giữ `_root`, và mọi lane khác **không commit
được vào `drafts/`** — `--soat` bắt buộc trước mọi `git commit`, nên nó chặn thật. Mà `drafts/`
là **chỗ duy nhất** agent được tự ghi không cần hỏi (CLAUDE.md toàn cục). `--sua` cũng từ chối:
*"giữ cả vùng nghĩa là được ghi mọi file trong đó — khoá file không chen vào giữa được."*

**Sửa ở `soatDanHang`** (`scripts/claim.mjs:362`), **không sửa ở chỗ gọi**: `cuaIndex` gọi qua
nó, nên vá một chỗ là cả hai cửa đúng. Hàm đã có **hai** danh sách miễn (`maySinh`, `mienKhoa`);
đây là danh sách thứ ba, cùng hình dạng. Lấy từ `nhapDungChungFrom(cauTruc)` ở
`scripts/repo-structure.mjs` — hàm đã có sẵn, đừng viết lại.

Ba vế phải giữ:
- File ở `nhap_dung_chung` **không** bị quy cho chủ `_root`.
- Nhưng vẫn bị quy cho **khoá file** nếu có ai khoá đúng file đó (`tam[d].owner`).
- `--sua` phải **nhận được** khoá file trong `nhap_dung_chung` dù `_root` có chủ.

Phép ghim: dựng fixture có lane A giữ `_root`, lane B dàn một file `drafts/…` ⇒ `--soat` phải
**xanh**. `tests/khoa-dau-vet.mjs` ca 14 đang **đếm** số chỗ lọc ở `session-check.mjs` — thêm
phép đếm tương tự cho `claim.mjs`, để lần sau khôi phục nửa vời là đỏ ngay.

## Luật repo

```bash
node scripts/claim.mjs --take tests --as codex-hoi-sinh-n65 --task "N-65 hồi sinh 8 bộ kiểm cách ly"
```

Bước 5 đụng `scripts/claim.mjs` (vùng `_root`) — **nhận thêm khoá `_root`, hoặc chờ lane đang
giữ nó trả**. Đừng ghi đè lane khác.

- Vùng của lane khác là **CHỈ ĐỌC**. `workers/duc-scouter` đang có lane khác làm — đừng đụng.
- `--soat` **bắt buộc** trước mỗi `git commit`: `node scripts/claim.mjs --soat --as codex-hoi-sinh-n65`
- Commit kết bằng `Lane: codex-hoi-sinh-n65` và dòng `Co-Authored-By:` của bạn.
- **Không** `git push` trần. Chỉ `node scripts/safe-push.mjs --as codex-hoi-sinh-n65`.
- **Không** `git checkout` / `reset` / `stash` lên file trạng thái sống, nhất là
  `.agents/claims.json`. Xem bản cũ thì `git show HEAD:<file>`.
- **Không xoá file nào.** Kể cả `build-overview-smoke` — chờ Đức.
- Commit **giới hạn đường dẫn** (`git commit -- <đường dẫn của tôi>`): lane khác có thể stage
  file bất cứ lúc nào, và việc của họ sẽ đi dưới nhãn Lane của bạn.
- **Một suite nặng một lúc.** Hai suite cùng lúc trong một worktree ⇒ git đụng nhau ⇒ cổng báo
  `GIT_HONG` ⇒ **đỏ giả**. Đỏ thì chạy lại **một mình** trước khi tin.
- Trả khoá khi xong.

## Cổng máy — chạy hết

```bash
npm test                                  # phải thoát 0
npm run test:chet                         # mọi bài còn lại phải VẪN ĐỎ
node tests/dau-suite-smoke.mjs
node scripts/check-bootstrap.mjs          # CHAN: không có
node scripts/session-check.mjs --as codex-hoi-sinh-n65
```

## Tự audit — hai ghế tách rời

Luật repo: **"KHÔNG ĐƯỢC TỰ KÝ NGHIỆM THU BẢN SỬA CỦA CHÍNH MÌNH."** Nên:

- **Ghế 1 (bạn):** chạy hết cổng máy ở trên. Cổng máy là **máy chấm**, hợp lệ.
- **Ghế 2 (một phiên Codex MỚI, bối cảnh sạch):** chỉ đọc `git diff`, không đọc chat của bạn.
  Trả lời **ĐẠT / KHÔNG ĐẠT + một câu**, không viết văn:

| # | câu hỏi |
|---|---|
| 1 | Có phép khẳng định nào bị **nới lỏng hoặc xoá** để bài xanh không? Liệt kê từng cái. |
| 2 | Mỗi phép khẳng định bị sửa có **ghi lý do + chỗ chốt** (ADR/backlog) không? Cái nào không có? |
| 3 | Có chỗ nào sửa **mã nguồn** chỉ để bài xanh, thay vì vì mã sai không? |
| 4 | Từng bài hồi sinh: bẻ dòng nó canh thì có **ĐỎ** không? Mỏ neo khớp mấy lần? |
| 5 | `dau-suite-smoke` còn cưỡng chế **cả hai chiều** không? |
| 6 | Có bài nào chuyển sang `npm test` mà **thật ra chưa chạy phép nào** (rỗng, `skip`, `return` sớm) không? |
| 7 | Có file nào bị **xoá** không? |
| 8 | Có commit nào cuốn theo file của lane khác không? |

## Báo cáo cuối — tiếng Việt CÓ DẤU, gửi Đức

1. **Bảng bước 1** — mỗi bài: bao nhiêu khối, bao nhiêu đỏ. Đây là con số Đức đang đợi.
2. **Bài nào đã về `npm test`**, bài nào còn ở `test:chet` và **vì sao**.
3. **Lớp bảo vệ nào tìm lại được** — bài nào đỏ thật vì mã hỏng thật, không phải vì API đổi.
4. **Bảng 8 câu của ghế 2**, nguyên văn.
5. **Chỗ tôi không chắc.**
6. **Cần Đức chốt gì** — ít nhất là bước 3 nếu Đức chưa trả lời.
