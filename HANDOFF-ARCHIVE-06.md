# HANDOFF lưu trữ — HANDOFF.md, 7 mục cũ

> **Đây là phần đuôi đã cắt của [`HANDOFF.md`](HANDOFF.md) cạnh file này.**
> Sinh bằng `node scripts/handoff.mjs --cat HANDOFF.md --giu 20` theo
> [ADR-0008](docs/adr/0008-nhat-ky-phien.md) — cắt ngày 2026-09-09.
>
> Cắt theo **vị trí trong file**, không theo ngày (bất biến ⑵ của ADR): file kia giữ **20
> mục cuối**, 7 mục trước đó nằm ở đây — **nguyên văn, không sửa một chữ**.
>
> **Dựng lại bản gốc:** thay khối con trỏ trong `HANDOFF.md` (phần giữa dòng `## Log` và
> tiêu đề `##` đầu tiên) bằng toàn bộ phần dưới dấu `ARCHIVE-BODY-START` ở đây — ra đúng bản
> gốc **từng byte**. SHA-256 bản gốc trước khi cắt: `008f7d85efb38ec27cbfec215d0aa7171911524586adee77fa331885c78f7dfa`.
>
> **Chỉ đọc.** Ghi Log mới thì ghi vào `HANDOFF.md`, đừng ghi vào đây.

<!-- ARCHIVE-BODY-START -->

<!-- HANDOFF-THANG: 2026-09 -->

<!-- HANDOFF-CUT-POINTER: ADR-0008 -->
> **1 mục cũ hơn đã dời sang [`HANDOFF-ARCHIVE-05.md`](HANDOFF-ARCHIVE-05.md)** — cùng thư mục này,
> nguyên văn, không mất chữ nào. File này giữ **20 mục cuối** (ADR-0008). Cần đào lịch sử
> xa hơn thì mở file đó và đi tiếp theo con trỏ trong nó; ghi Log mới thì vẫn ghi vào cuối
> file này.
<!-- /HANDOFF-CUT-POINTER -->

## 2026-09-08 (tối) · claude-cua-kiem · N-43 đóng: một vòng 8,5 phút → dưới 2,5

**Đo trước, không đoán.** Chuỗi suite repo này **241,7s / 16 bước**, và cổng đóng phiên **chạy
lại toàn bộ chuỗi đó** — một vòng bình thường ≈ **8,5 phút**, nửa sau không kiểm thêm gì.

| | Trước | Sau |
|---|---|---|
| chuỗi suite | 241,7s | **93s** (song song, 21 luồng + 5 chạy riêng) |
| cổng đóng phiên | ~280s | **33s** (đọc dấu, không chạy lại) |
| **cả vòng** | **521s** | **126s — nhanh 76%** |

**Dấu xác nhận KHÔNG phải cửa sau.** Buộc vào HEAD + băm `git status --porcelain -uall` + danh
sách suite + môi trường (bản Node) + hạn 30 phút. Sửa một byte ở bất kỳ file nào, kể cả file chưa
track, là dấu hết hiệu lực. Suite đỏ thì bộ chạy **xoá dấu**. Dấu trong `.gitignore` nên không
mượn được của máy khác. Đường chạy đầy đủ còn nguyên. Ghim: `tests/dau-suite-smoke.mjs`, **11 cửa
từ chối** + soi rằng cổng thật sự gọi và rẽ nhánh.

**`npm test` VẪN là chuỗi tuần tự — cố ý, và đây là chỗ tôi phải đổi cách làm.** Ban đầu tôi trỏ
`test` sang bộ chạy. Một phép ghim **trong gói ĐÃ ĐÓNG BĂNG** đọc thẳng `scripts.test` để bắt
"xanh giả" liền đỏ. Gói đóng băng thì **chỉ-đọc** — nên tôi đổi cách của mình, không đổi luật của
nó: đường nhanh mang tên riêng `npm run test:song-song`.

**Bẫy phụ thuộc, lần thứ tư trong ngày:** cổng nhận thêm `chay-test.mjs`, nên **13 danh sách kho
thử** phải chép thêm file đó — và **hai danh sách KHẲNG ĐỊNH trông y hệt**
(`repo-structure-smoke:313` đòi script đi qua cửa quy vùng chung · `dau-vet-vung-smoke:50` đòi
dùng hằng `CHUA_THAY_DAU_VET`) **không được đụng**. Chèn nhầm vào đó là biến khẳng định đúng thành
**khẳng định sai được đóng dấu hợp lệ**. Soát bằng máy: mọi chỗ chèn phải có `copyFileSync` ngay
dưới.

**Lượt đẩy này dùng `--carry`, cuốn theo 1 commit của lane `claude-scouter-s06`** (`733840a`).
Đức xác nhận lane đó đã xong và họ đã tự trả hết khoá trước lúc tôi nhận.

**Còn mở:** không có gì của phiên này.

## 2026-09-08 · `claude-ext-dot0` — ĐỢT 0: bản đồ việc thôi nói sai (N-35, N-31)

**Làm gì:** hai lỗi khiến `what-next.mjs` — thứ AI đọc để CHỌN việc lúc mở phiên — báo sai.

**Kết quả bằng số.** ⑴ Trước: bảng xếp `workers/duc-auto-chatgpt` (Đức đã đóng băng) vào
*"chạy song song được ngay, ưu tiên #2, 22 việc mở"*; `grep -c frozen scripts/what-next.mjs` = `0`.
Sau: gói đó ở mục riêng `B2 · ĐÃ ĐÓNG BĂNG`, mục A còn 2 luồng và cả hai là gói sống.
⑵ Trước: `workers/hnx-fetch` báo `0 việc mở`, sổ thật có `3`. Sau: đúng 3 (`H-02` `H-03` `H-06`).
⑶ Cảnh báo *"đóng mà chưa gạch"* thôi trỏ vào gói đóng băng — cả 4 mã nó nhắc đều nằm trong
gói cấm sửa. ⑷ Ghim `tests/what-next-smoke.mjs` 20 → 24 phép; đột biến gỡ `!v.dongBang` thì đỏ.
⑸ Sổ nợ 12 → 11 mục mở / trần 15.

**Chỗ roadmap viết sai, sửa lại ở đây:** roadmap giao *"gạch bốn mã B-29 B-16 B-18 G-14, 2 phút"*.
Cả bốn nằm trong `duc-auto-chatgpt` và `duc-auto-gemini` — **gói đã đóng băng, chỉ được đọc**.
Gạch chúng là sửa file cấm. Thuốc đúng là gỡ lời mời, không phải đi sửa. Cùng bệnh với N-35.

**Còn mở:** `N-44` (mới) — sổ nợ gốc repo vẫn không có mặt trên bản đồ; 11 mục mở ở gốc vô hình
với phiên điều phối. Và một dòng `ĐÓNG N-43` bị cắt cụt giữa câu nằm ở cuối `BACKLOG.md` (lượt
trước, lane `claude-cua-kiem`) — **cố ý không sửa**: sổ miễn khoá KHI CHỈ THÊM DÒNG, sửa dòng cũ
thì không được miễn. Nó vô hại vì dòng đầy đủ nằm ngay dưới.

## 2026-09-08 · claude-scouter-s06 · ghi nhận lượt `--carry`

Luật ADR-0005: mọi lượt `--carry` phải kể tên lane bị cuốn theo. Lượt đẩy này cuốn theo commit
của **`claude-ext-dot0`** (và trước đó một lượt cuốn theo **`claude-cua-kiem`**). Cả hai đều là
phiên đang chạy song song trong cùng thư mục git, không phải commit vô chủ.

Kèm một chuyện đáng biết cho phiên sau: `claude-cua-kiem` chạy `git add -A` và **cuốn phần sửa
của tôi** ở `workers/duc-scouter` + `workers/hnx-fetch` vào commit `c7580447` mang nhãn của họ.
Nội dung nguyên vẹn, nhưng nhãn `Lane:` của hai lượt sửa đó chỉ sai người. Cách tránh:
`git add <đường dẫn của mình>`, đừng `-A`.

## 2026-09-08 · `claude-ext-cum5` — ĐỢT 2: bốn mục nợ, gom theo bệnh chứ không theo mã

**Làm gì:** đóng `N-42` · `N-39` · `N-11` · `N-37`. Sổ nợ **12 → 8 mục mở** / trần 15.

**Kết quả bằng số.**

- `N-42` — `backlog-check.mjs` nay ĐỎ khi thấy dòng trông như mục nợ mà nó không đếm được.
  Chạy lần đầu ra ngay **1 mục vô hình thật** (dòng 502, nằm trong sổ từ 08/09, không lớp nào
  kêu). Đã hoá thành `N-45`. Ghim 15 → 20.
- `N-39` — bản mẫu ADR chào đời ở `Proposed`, kèm lý do. Ghim 29 → 30.
- `N-11` — hai bảng **không gộp** (ràng buộc ngược nhau), mà mỗi bản tự khai nó là bản nào, ở
  dòng đầu (máy) và dải mốc (mắt Đức). Ghim 14 → 17.
- `N-37` — bản nháp ADR 07/09 **không mất**, vào repo tại `docs/adr/0005-lam-viec-song-song.md`.

**Ba chỗ tôi CỐ Ý không làm, và lý do — đọc trước khi ai đó làm hộ:**

⑴ **`N-36` (gộp bảy khoá còn ba): chưa đủ điều kiện.** Điều kiện ⑴ của chính mục đó đòi hai
khoá trống chủ, mà hình dạng đề xuất còn gộp ba gói đóng băng thành `_frozen` — hai trong ba
gói ấy **đang có lane giữ**. Gộp là lấy khoá khỏi tay họ.

⑵ **Không dựng máy đếm ADR nằm lâu ở `Proposed`**, dù `N-39` đề xuất: đo được **đúng 1**. Một
cỗ máy canh con số bằng 1 là thuế thu trên mọi phiên (giới hạn ⑦). Bản mẫu ghi câu lệnh đếm tay.

⑶ **ADR-0023 vào ở `Proposed`, không `Accepted`.** Đức nói vế ⑶ nguyên văn, nhưng vế ⑴ và ⑵ là
thiết kế của AI và cả hai đụng luật khoá — thứ mục 2 bắt hỏi Đức. Tự đóng dấu là AI tự duyệt
luật của chính mình.

**Việc của Đức:** đọc ba vế của ADR-0023, chốt lấy/bỏ vế nào. Đó là thứ mở khoá cho `N-36`.

## 2026-09-08 · `claude-ext-cum5` — ĐỢT 2 (tiếp): sổ nợ 12 → 6, và ba mục CHẶN LẠI

**Làm gì:** đóng thêm `N-44` và `N-41`. Cả ngày: **8 mục đóng**, sổ **12 → 6 mở** / trần 15.

- `N-44` — sổ nợ gốc repo lên bản đồ việc. Trước: 8 mục mở ở gốc **không hiện ở mục nào**.
  Dùng lại `backlog-check.mjs` chứ không viết bộ đọc thứ hai — hai bộ đã ra **11 và 12** trên
  cùng một file. Ghim 24 → 27.
- `N-41` — `claim.mjs --khai-vung`. Trước: mở một vùng mới chỉ làm được bằng **sửa tay
  `claims.json` rồi `--restamp`**, một đường hợp lệ trông giống hệt một vụ cướp khoá.
  **Đột biến kiểm 4/4 ĐỎ**, nền xanh trước/sau, neo khớp 4/4.

**Ba mục tôi CHẶN LẠI, kèm điều kiện mở — đừng làm hộ khi chưa đủ:**

| Mã | Chặn ở đâu |
|---|---|
| `N-29` | Bước ⑴ đòi đặt dấu `@Đức` vào **hai gói**: một **đóng băng** (chỉ đọc), một **lane khác đang giữ**. Cả hai cửa đóng, không phải một |
| `N-36` | Hình dạng đề xuất gộp ba gói đóng băng thành `_frozen`, mà **hai trong ba đang có lane giữ**. Gộp là lấy khoá khỏi tay họ |
| `N-05` + `N-40` | Cụm ① — sửa đúng cơ chế nhiều lane đang dùng. Lúc ghi dòng này có **3 lane khác** đang chạy. Làm lúc chỉ còn một lane |

**Số cho lượt dọn kho chữ, đo lúc đóng phiên** (`git ls-files` + đếm dòng):
`docs/` **26.104 dòng / 110 file**, trần khai là 8.000. Trong đó ADR **2.424 dòng** (bất biến,
không cắt được) · `docs/studies/` **15.378 dòng / 31 file**, và **31/31 khai `status: active`** —
tức chưa hồ sơ nào từng được khai là xong. Riêng 14 file `EXP-*` (~8.300 dòng, cùng ngày 02/09)
đã được gộp vào `PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md`. **Cắt thật là XOÁ FILE, nên chờ Đức.**

## 2026-09-08 · `claude-ext-mobang` — Đức mở băng, dọn kho chữ, và protocol dọn là một PHÉP KIỂM

**Làm gì:** năm việc Đức chốt trong một lượt.

⑴ **MỞ BĂNG TOÀN BỘ** ([ADR-0024]). Cả năm gói sống trở lại; giới hạn ① của `AGENTS.md` đi ra.
Khối `frozen` để **rỗng, không gỡ** — đóng băng là công tắc Đức bật lại được, và cái đắt là
*cách làm* (đã ghim, đã vào bản đồ việc mục B2), không phải danh sách.

⑵ **Gạch ba mã** `B-29 B-16 B-18` trong `duc-auto-chatgpt` — việc bị chặn từ sáng vì gói đóng
băng. Còn `G-14` ở gói `gemini`: lane `claude-gemini-crlf` đang giữ khoá, **không đụng**.

⑶ **Xoá 14 hồ sơ `EXP-*`** (8.310 dòng, Đức duyệt). `docs/` **26.104 → 17.838**. Chúng **không
rời git** — mục lục và file tổng hợp đều mang câu lệnh đọc lại: `git show 96a241ef743e:<đường-dẫn>`.

⑷ **Protocol dọn = phép kiểm, KHÔNG phải tài liệu mới.** Đức hỏi *"nếu chưa có ta nên xây dựng
đúng không?"* — có, nhưng một tài liệu dạy cách dọn tài liệu cộng vào đúng con số nó định cắt.
Cổng **14 → 15 phép kiểm**: *"Kho chữ không phình"*, thước cóc `docs.tran_dong_khong_ke_adr`
= **15.265** (không kể ADR). Nó **không đòi ai dọn, chỉ chặn phình**; dọn thêm thì hạ con số,
và cổng tự nhắc khi đã dưới thước ≥ 50 dòng.

**Vì sao không để máy canh thẳng đích 8.000:** một phép kiểm đỏ với MỌI phiên nhiều tuần liền
là một phép kiểm sẽ bị gỡ. Chính giới hạn ④ của repo này đã phải nâng trần **sau khi** vỡ.

⑸ **ADR-0024 sinh ở `Proposed` rồi đổi sang `Accepted` ở lượt commit RIÊNG** — lần đầu luật
`N-39` (lập chiều nay) được dùng thật. Gộp hai lượt là khoá luôn đường sửa chữ.

**Cái mất, ghi ra để bảy ngày nữa còn kiểm được:** trần số gói là thứ duy nhất chặn số mặt phải
bảo trì, và nó vừa biến mất. Số 07/09 vẫn đúng: **63% commit** là tài liệu + sổ nợ. Nếu tỉ lệ đó
không giảm thì phanh phải quay lại — và lần đó phải kèm số, không kèm cảm giác.

> **Lượt đẩy này dùng `--carry`, cuốn theo 1 commit của lane `claude-scouter-s06`** (ADR-0005 duyệt thường trực; đổi lại là phải kể tên lane bị cuốn — đây là dòng đó).

## 2026-09-08 · `claude-ext-khoafile` — khoá mức FILE: giữ ngắn, trả ngay

**Đức chốt:** *"chỉ giữ khóa đúng ở file mà AI đó đang sửa … trả ngay trước và sau khi AI sửa.
Nếu chỉ đọc ko cần giữ khóa."*

**Đo trước khi làm, và linh cảm ban đầu của tôi NGƯỢC LẠI.** Bảng *"file bị hai lane chạm nhiều
nhất"* có bốn cái đầu là `HANDOFF.md` · `BACKLOG.md` · `claims.json` · `AGENTS.md` — **ba trong
bốn vốn đã miễn khoá**, nên thoạt trông khoá mịn hơn chẳng gỡ được gì. Đếm đủ thì ngược hẳn:

| 7 ngày · 895 commit | Số |
|---|---|
| Cặp commit khác lane, ≤ 1 giờ, **cùng vùng** | 2.628 |
| ├ dùng chung ít nhất một FILE — không gỡ được | 789 (30%) |
| └ **khác file hoàn toàn — GỠ ĐƯỢC** | **1.839 (70%)** |

File/commit: trung vị **2**, p90 **7**. Nên `--sua` nhận cả mẻ một lệnh.

**Cài:** `--sua <đường-dẫn>…` · `--xong [--het]` · `--soat`. Chứa nhau hai chiều. Một mẻ là một
lượt (vướng một file thì cả mẻ không ghi). Trả xong thì **xoá hàng**. Cổng **15 → 16 phép**:
*"Khoá file đã trả hết"* — mốc là **hết phiên**, không phải *đã đẩy* (khoá file không mang
trách nhiệm truy nguồn, nhãn `Lane:` mang). **Đột biến kiểm 6/6 ĐỎ**, neo khớp 6/6, nền xanh.
Ghim `claim-smoke` 18 → 23.

**Cái nó KHÔNG chữa, và nó làm chỗ đó XẤU ĐI — chép cả vế này khi port:** khoá không giữ file,
**git giữ**. `git commit -a` vẫn cuốn file lane khác vừa dàn (`N-40`). Khoá vùng trước đây
**serial hoá** hai lane nên lỗi đó ít có dịp nổ; khoá file bỏ đúng sự serial hoá ấy. `--soat`
mua lại, và nó **chỉ là một lệnh, không phải một cổng** — cổng chạy lúc index đã rỗng.

**Bộ khung CHƯA nhận được**, và lý do đáng ghi: lúc làm, cả **bốn khoá** của `Ark_Repo_Harness`
đều có chủ, và repo đó **không khai `append_only_exempt`** nên không ghi nổi một dòng vào sổ nợ
của nó. Bản giao việc để ở `_run-qua-dem-20260907/GIAO-BO-KHUNG--KHOA-MUC-FILE.md`, Đức dán.
Đây đúng là bệnh mà việc này chữa: cần sửa **một file**, bị chặn vì người khác giữ **cả vùng**.

