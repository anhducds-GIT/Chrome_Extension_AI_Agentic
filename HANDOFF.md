# HANDOFF — gốc repo (`_root`)

> Nhật ký việc ở **gốc repo**: AGENTS.md, DASHBOARD, FEATURE-PARITY, `docs/`, `scripts/`.
> Việc trong `workers/*` ghi ở HANDOFF.md của package đó, không ghi vào đây.
> **Chỉ thêm dòng, mới nhất ở cuối.**

## Log

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

## 2026-09-08 · `claude-ext-n29` → `n05` → `n33` — cụm ① và ③ đóng hết, sổ nợ **12 → 3**

Bốn mục đóng trong một lượt, và **cả bốn đóng được là nhờ khoá mức file vừa cài**.

| Mã | Chốt | Số |
|---|---|---|
| `N-29` | Việc chờ Đức nay một nguồn: dấu `@Đức` gắn vào **chính dòng `human_action`** | `--can-duc` ra **0** gói lệch · khối *"từ hồ sơ"* **4 → 1** |
| `N-40` | `--soat` chặn file đã dàn ngoài quyền ghi, **thoát 3** (điều kiện chỉ đòi cảnh báo) | — |
| `N-05` | Sổ **miễn khoá** nay bị soi bằng `appendOnlyAtEof` — sửa dòng cũ là ĐỎ | thử hai chiều: thêm cuối → 0 · sửa dòng cũ → 3 |
| `N-33` | `writeFileSync` **không nguyên tử**; mọi lượt ghi bảng nay là ghi-tạm-rồi-`rename` | bảng bị ghi **63 lượt/ngày**, nên khe đó gặp thật |

**Đột biến kiểm 9/9 ĐỎ**, neo khớp 9/9, nền xanh. Ghim `claim-smoke` **18 → 28**.

**Hai chỗ tôi CỐ Ý không làm:**

⑴ **Bước ⑶ của `N-29`** (*bỏ `human_action` khỏi đường nuôi bảng*) — `build-overview-smoke` có
một phép ghim đặt đúng chỗ đó: *"nuốt nguồn hồ sơ là ĐỎ"*. Gỡ nguồn thứ hai là gỡ đúng lớp bảo
vệ ấy (luật vàng 3). Đổi lại ta được thứ mạnh hơn: **một cổng** báo đỏ, thay cho **một dòng**
trên bảng hy vọng có người nhìn thấy.

⑵ **`duc-auto-gemini`** — lane `claude-gemini-crlf` giữ khoá. Và không cần: `N-29` đã đối chiếu
và kết luận gói đó an toàn.

**Một chỗ suýt hỏng, đáng ghi:** bộ đo đột biến **để lại một đột biến trong cây làm việc**. Một
lượt ghi trả `UNKNOWN` (khoá file thoáng qua trên Windows) và lượt ghi trong `finally` **hỏng y
hệt**. Suite đỏ sau đó vì một lý do không ai đoán ra. Nếu lượt kế là commit thì nó vào thẳng
HEAD. **Hoàn nguyên phải được KIỂM, không chỉ được THỬ** — đã mở `N-47`.

**Còn 3 mục, và cả ba KHÔNG phải việc AI làm tiếp được:** `N-36` (chờ Đức chốt ADR-0023) ·
`N-45` (gói đã mở băng nhưng lane khác đang giữ khoá) · `N-47` (mở hôm nay).

> **Bổ sung cùng ngày:** đóng `N-47` — tôi ghi mục đó **sai**, hai bộ đo đột biến trong repo đã chống đúng chỗ tôi vấp và chống kỹ hơn. Cái hỏng là bộ đo **nháp** tôi dựng ngoài repo cho nhanh. Mở `N-48`: khoá mức file bị cổng kéo ngược về khoá vùng ở lượt đẩy — gặp thật ngay lượt đầu dùng cơ chế mới. Sổ nợ còn **3**.

> **Sửa hồ sơ cùng ngày:** tôi **đóng `N-40` sớm**. Lane `claude-gpt-no-ky-thuat` chứng minh live rằng `--soat` không đủ — nó đo đúng *tại thời điểm nó chạy*, còn chỗ hở là **cửa sổ giữa `--soat` và `git commit`**. Nửa còn lại đi tiếp ở `N-49`, và nó **cần Đức chốt** (bản vá duy nhất nằm trong lượt commit là một `pre-commit` hook, mà cài chung thì phải đổi `core.hooksPath` của cả repo).

## 2026-09-08 · `claude-ext-hook` — chốt `commit-msg`, và sổ nợ xuống **2**

Đức uỷ quyền chọn cả `N-49` lẫn `N-48`.

**`N-49` — chọn CÀI HOOK, và chọn `commit-msg` chứ không `pre-commit`.** Lý do không phải sở
thích: `--soat` cần biết bạn là lane nào, mà chỗ **duy nhất** ghi tên lane là nhãn `Lane:` trong
thông điệp — chỉ `commit-msg` đọc được nó. Index ở đó vẫn đúng là index sắp commit.

**Ba chốt fail-open, cố ý:** không có `node` · không thấy nhãn · lỗi lạ → **cho qua**. Chỉ mã 3
(vi phạm thật) mới chặn. Hook chạy trên mọi lượt commit của mọi lane — một hook hỏng là cả repo
không commit được, và cái giá đó lớn hơn cái nó canh. `--no-verify` để mở: một chốt không thể
vượt lúc khẩn thì nó sẽ bị gỡ hẳn.

**Thử thật hai chiều:** commit hợp lệ đi qua · commit mang một file ngoài quyền ghi **bị chặn và
không commit nào được tạo**.

**`N-48` — chọn đường ⑴, và KHÔNG xoá phép kiểm.** Lúc mở mục tôi đoán nó sẽ thành bản sao của
phép kiểm nhãn `Lane:`; đo lại thì không. Sau khi nới, **hai đường đỏ còn nguyên, cả hai là mồ
côi thật**: file đang sửa trong cây làm việc (chưa có nhãn nào) · commit chưa đẩy không nhãn.
Kiểm ngay trong phiên: `session-check.mjs` còn sửa dở → ĐỎ đúng đường ⑴; commit xong → xanh.

Phép kiểm đó **nhận thêm một việc thay vì đẻ ra phép thứ 17**: canh `core.hooksPath`. Cùng một
câu hỏi *ai chịu trách nhiệm cho lượt ghi này*, chỉ khác mốc thời gian. Và **chỉ đòi khi repo CÓ
hook** — đòi vô điều kiện làm đỏ mọi repo tạm của kho thử, đúng cái bẫy đã cắn bốn lần hôm nay.

**Còn 2 mục, cả hai KHÔNG phải việc AI làm tiếp được:** `N-36` (chờ Đức chốt ADR-0023) và `N-45`
(một byte trong gói lane khác đang giữ khoá).

## 2026-09-08 · `claude-ext-hook` → `claude-ext-don` — sổ nợ **1**, và kho chữ xuống lượt hai

**Đức chốt bỏ `N-36`.** Sổ nợ hạ tầng còn **1 mục** (`N-45`, và đó là việc của lane khác).

**Vì sao bỏ, để phiên sau không mở lại:** giả thuyết *"ít khoá thì ít luật, ít phép kiểm, chạy
nhanh hơn"* đã **đo và sai** — 16 phép kiểm chỉ **1** duyệt qua từng khoá · 139 dòng luật mục 1
chỉ **3** dòng là bảng khoá · thời gian lệch **0,0158 ms** trên một vòng suite 100 giây. Còn cái
giá thì thật: gộp ba khoá gốc làm cặp commit khác lane bị chặn **172 → 364 (+112%)**, đổi lại
tiết kiệm ~81 cặp lệnh trong 7 ngày. **Số khoá là dữ liệu, không phải mã.**

**Dọn kho chữ lượt hai:** xoá cả tầng `docs/archive/` — 15 hồ sơ, 2.967 dòng, tất cả
`status: superseded`. `docs/` **17.838 → 14.938**; không kể ADR **15.265 → 12.335**, thước cóc hạ
theo. Lý lẽ giữ chúng là *"bản ghi có thật"* — vẫn đúng, nhưng **git đã là chỗ giữ bản ghi có
thật**. Đường lấy lại in ngay tại đầu mục cũ.

**Một chỗ suýt để lại:** `delegations/A-01/TASK.md` bảo một AI khác đi đọc một file vừa bị xoá —
một lượt giao việc hỏng nếu để nguyên. Xoá file thì phải đi tìm ai đang trỏ tới nó, không chỉ
sửa mục lục.

**Đo cho lượt tối ưu kế:** suite **101,9 giây**, trong đó `build-dashboard-smoke` chiếm **~70s** —
nó dựng **20 repo tạm** và chạy cổng **30 lượt**. Cắt nó là cắt lưới đỡ của chính cổng, nên
**không đụng**. Chỗ còn lại đáng cắt là `docs/` (12.335 so với đích 8.000), không phải suite.

## 2026-09-08 · `claude-ext-don2` — kho chữ **26.104 → 12.396** (−52%), và một cái sàn đo được

**Ba lượt dọn trong ngày:** 14 hồ sơ `EXP-*` (8.310 dòng) · cả tầng `docs/archive/` (2.967) ·
18 hồ sơ mồ côi (2.538). `docs/` **26.104 → 12.396**, từ 110 xuống **65 file**. Thước cóc hạ
theo cả ba lượt; chỗ đã hạ không quay lại được.

**Một phép dò của tôi SAI, và nó suýt xoá nhầm 7 hồ sơ.** Bản đầu dò tên **kèm đuôi `.md`**, mà
`AGENTS.md` và các sổ tay nhắc tên brief **không có đuôi**. Nó báo 26 file mồ côi; đo lại bỏ đuôi
ra thì còn **19**. Bảy hồ sơ đang được luật trỏ tới suýt bị coi là rác. **Một danh sách xoá phải
được kiểm lại bằng một phép dò thứ hai khác cách.**

**Và đây là số Đức cần để chốt:** đích **8.000** của giới hạn ③ **nằm dưới sàn cứng 9.578**.

| Phần không cắt được | Dòng |
|---|---|
| `docs/adr/` — bất biến, B12 cưỡng chế | 2.603 |
| Hồ sơ bị **ADR / `evidence/`** trích dẫn — nguồn trích không sửa được | 4.863 |
| `docs/protocols/` — sổ tay đang dùng | 1.045 |
| Hồ sơ bị `AGENTS.md` / sổ tay trỏ tới | 687 |
| `README` + bản mẫu | 380 |

Còn ~2.800 dòng cắt được mà **không** chạm sàn, nhưng vài hồ sơ trong đó **đang được dùng thật**
— `ORCHESTRATOR.md` bảo *"chép nó, đừng viết lại từ đầu"*, `IDEAS.md` khai một brief là **nhà**
của một ý tưởng. Xoá chúng là làm hỏng thứ đang chạy. Mở `N-51` để Đức chốt con số.

> **Lượt đẩy dùng `--carry`, cuốn theo 1 commit của lane `claude-gpt-chay-het-job`** (ADR-0005 duyệt thường trực; đổi lại phải kể tên lane bị cuốn — đây là dòng đó).

## 2026-09-09 · `claude-ext-don2` — trần `docs/` đang ĐO SAI THỨ, và số chỉ vào việc của chính tôi

Đức từ chối nâng trần: *"nâng trần tôi sợ làm AI khó triển khai công việc, ta cần tìm cách
optimize."* Đo lại thì đúng — nhưng chỗ tối ưu **không nằm ở `docs/`**.

| Nhóm | Dòng | Ai đọc |
|---|---|---|
| `docs/` | 12.396 / 65 file | mở **1–3 file** theo việc |
| `AGENTS.md` | **402** | **mọi AI, mọi phiên** |
| `HANDOFF.md` | **2.001** (60 mục) | **mọi phiên** |

Cắt `docs/` từ 26.104 → 12.396 hôm qua **không giảm một dòng nào** của cái phải nạp. Đúng bài học
*"đo đúng cái người ta than, đừng đo cái dễ đếm"*.

**Và số chỉ thẳng vào việc tôi vừa làm.** `AGENTS.md` **278 → 402 dòng (+45%)** trong hai ngày,
phần lớn do chính tôi viết 08/09 — trong khi **giới hạn ⑦ của chính file đó** cấm: *"một luật vào
thì một luật ra"*, và ví dụ nó nêu là `296 → 291`. Tôi thêm luật mà không lấy luật nào ra. Ba khối
tôi thêm **đều đã có ADR đầy đủ**, nên hiến pháp chỉ cần câu lệnh + một dòng vì sao.

**Chỗ rẻ nhất chưa ai đụng:** `HANDOFF.md` giữ **60 mục** trong khi ADR-0008 chốt **20** — vượt gấp
ba, **không phép kiểm nào kêu**. Bẫy: `handoff.mjs --rotate` xoay theo **THÁNG** (ADR-0011), mà cả
60 mục đều `2026-09` nên nó dời **0 dòng**; cơ chế của ADR-0008 **chưa bao giờ được cài**. Cắt còn
20 mục gỡ ~**1.400 dòng** khỏi đúng chỗ đắt nhất.

Mở `N-52` (AGENTS phình) và `N-53` (HANDOFF 60 mục). Sổ nợ **4 mục**.

**Đức chốt 09/09:** cho phép mở khoá `duc-auto-gg-flow-video`, **nhưng chưa triển khai** — đang làm
gói GPT. Ghi rõ hai vế: khoá **được phép chuyển**, nhưng **chưa nhận lúc này** — nhận rồi ngồi lên
nó là đúng thói quen mà khoá mức file vừa bỏ.

Roadmap cho phiên sau: `_run-qua-dem-20260907/ROADMAP-EXTENSION-09-09-v2.md`.

## 2026-09-09 · `claude-ext-nap-gon` — nhóm luôn-nạp **2.410 → 896 dòng** (−63%)

ĐỢT 1 của `ROADMAP-EXTENSION-09-09-v2.md`: cắt chỗ **mọi phiên bắt buộc nạp**, không cắt chỗ dễ
đếm. Chi tiết ở hai dòng đóng `N-53` · `N-52` cuối `BACKLOG.md`.

**`N-53`** — `HANDOFF.md` **2.033 → 589 dòng** (60 mục → 20). ADR-0008 chốt 20 từ 06/09 nhưng cơ
chế **chưa bao giờ được cài**: `--rotate` xoay theo THÁNG (ADR-0011), mà cả 60 mục đều `2026-09`
nên nó dời **0 dòng** rồi in một câu nghe như thành công. Thêm `handoff.mjs --cat --giu`; 40 mục
cũ sang `HANDOFF-ARCHIVE-02.md` nguyên văn, ghép lại dựng đúng bản gốc **từng byte**. Cổng nay
đếm thật: `HANDOFF_QUA_DAY`.

**`N-52`** — `AGENTS.md` **402 → 300 dòng**, kèm thước cóc `agents.tran_dong`. **Không luật nào bị
bỏ**: thứ bị cắt là *đo bao nhiêu, vấp ngày nào*, và mỗi thứ đó đều đã có nhà ở ADR hoặc
MULTIFLOW mục 4.

**Lỗ hổng vá kèm:** `--soat` bỏ qua HẲN sổ miễn khoá, nên lượt cắt mà ADR-0008 cho phép tường minh
không qua nổi phép soát dù giữ đủ khoá — cửa duy nhất còn lại là `--no-verify`. Nay **giữ khoá
thì viết lại được**: miễn khoá nghĩa là *không cần khoá*, không nghĩa là *có khoá cũng không được*.

**Ba lỗi của tôi, ghi ra để phiên sau khỏi trả lại:**

⑴ Phép kiểm bất biến bản đầu **XANH trên một file ra rỗng sạch mục** — nó ghép từ các mảnh rời,
trong khi `moi` sót cả phần giữ lại. **Kiểm cái mình GHI, đừng kiểm cái mình định ghi.**

⑵ Tôi chạy `git stash` / `pop`, mà `.agents/claims.json` nằm trong đó — **đúng thứ luật cấm**, và
lane GPT đang commit trong cùng phút ấy. Kiểm lại: không thấy thiệt hại, **nhưng đó là may chứ
không phải đúng**. Muốn so với HEAD thì `git show HEAD:<file>`, đừng dọn cả cây làm việc chung.

⑶ Ba lượt sửa hỏng vì dấu huyền và dấu chéo ngược đi qua ống bash — viết ra `.cjs` rồi chạy.

**Số:** 4/4 đột biến bị bắt · một phiên nay nạp **1.442–1.801 dòng** thay vì 2.956–3.315.
`N-51` còn mở, chờ Đức chốt số cho giới hạn ③.

> **Lượt đẩy dùng `--carry`, cuốn theo 6 commit của lane `claude-gpt-chay-het-job`** — ADR-0005 duyệt thường trực; đổi lại phải kể tên lane bị cuốn theo, đây là dòng đó.

## 2026-09-09 · `claude-ext-luat` — rà soát toàn repo, gỡ 5 chỗ luật đá nhau

Đức bác cách làm cũ (*"rà soát lại hoàn toàn chứ không vá ngắn hạn"*) và mở đường gộp luật
(ADR-0026). Chi tiết ở `BACKLOG.md`: dòng đóng `N-51` và mục `N-54`.

**Đo trước khi xoá.** Repo **136 MB**, trong đó **121,8 MB là ảnh** (190 file) — repo PUBLIC, clone tốn 165 MB; **53,5 MB là bản sao y hệt**. Chữ 206.877 dòng: test 26% · mã extension 25% ·
bằng chứng 17% · còn lại 30%. `docs/` **0 hồ sơ mồ côi**, `scripts/` đúng **1 hằng chết**.
Phần tôi dọn ba ngày qua là 10% khối lượng và đã hết chỗ;
**92% nằm trong ba gói `duc-auto-*`, cả ba đang có lane khác giữ khoá.**

**Năm chỗ luật đá nhau, đã đánh dấu chết kèm lý do:** khoá (ADR-0023 *"quá 30 phút → nhường"* vs
ADR-0025 *"chỉ HỎI, không nhả hộ"*) · nhật ký (0008 số mục · 0011 xoay tháng · 0012 *"tuổi không
phải tiêu chí"*) · trần gói (0021 vs 0024) · 0018 `Accepted` mà trỏ sang 0019 `Proposed`. Ổ khoá
đã cắn thật: một phiên đọc câu cũ rồi áp cho khoá **của chính mình**, trong khi cả hai câu nói về
khoá **của người khác**. Đức chốt giữ **ADR-0008**.

**B12 đổi câu hỏi, không bị gỡ:** từ *"thân ADR có đổi không"* sang *"số hiệu nào từng cấp mà nay
không file nào nhận"*. Rủi ro khi gộp 26 file còn 8 không phải chữ bị sửa — git giữ đủ — mà là
**một quyết định biến mất không ai thấy**. Chính phép kiểm bắt hai lỗi mô hình của tôi.

**`AGENTS.md` 300 → 254 dòng, phi-ASCII 16% → 1%**, chín nhóm, mỗi luật một dòng kèm ADR. Phép
so chống mất luật báo **17 thứ rơi** lượt đầu, ba nhóm là thật; vá xong còn **0**.

**Ba lỗi của tôi:** ⑴ xoá một dòng `.gitignore` vì đọc nó là "không làm gì" — nó vô hiệu với file
ĐÃ theo dõi nhưng vẫn chặn file MỚI, bỏ đi làm 4 mục lạ hiện trong `git status` của mọi lane.
**Dòng cấu hình "vô dụng" phải kiểm bằng cách BỎ RA rồi xem gì đổi.** ⑵ dòng đóng sổ nợ viết sai
mẫu (`**ĐÓNG N-51 · …**` thay vì `**ĐÓNG N-51** · …`) nên **không đóng gì** mà đọc y hệt dòng
đúng. ⑶ một dòng mở đầu `- **ĐÓNG N-45` viết để dẫn giải — may là sai mẫu; đã xoá.

Chờ Đức: **122 MB ảnh** · **chuyển khoá ba gói**.

## 2026-09-09 · `claude-adr-gop` — N-54: 27 ADR gộp còn 9 file chủ đề

Đức chốt: *"gộp, xóa, sử dụng decision mới nhất, bỏ các cái cũ đã bị obsolete để ko gây confuse…
phân nhóm cho chúng, giữ luật bằng tiếng việt để tôi cùng đọc bản cuối."*

**Một chủ đề = một file = một câu trả lời.** Trước đó 27 file xếp theo thứ tự thời gian, và không
chỗ nào nói cái nào đang có hiệu lực — chính hình dạng đó đẻ ra năm chỗ mâu thuẫn. Chín nhóm liệt
kê ở `docs/README.md`.

**Nghiệm thu:** B12 XANH — **151 số hiệu từng cấp, 0 mất, 0 trùng**. Bảy vế chết cắt còn một dòng
mỗi vế kèm tên quyết định thay nó. **81 liên kết trong 30 file** đã vá.

**Hai tên file cố ý giữ nguyên** (`0000`, `0015`): đo trước thì thấy chúng bị trích **118 và 6 lần
từ ba gói `duc-auto-*`**, vùng tôi không sửa được liên kết. **Cố ý không vá** liên kết trong
`HANDOFF-ARCHIVE-*` và `evidence/`: chúng kể chuyện quá khứ, lúc đó tên file đúng là tên đó.

**Một chỗ tôi KHÔNG tự hoà giải:** ADR-0004 chia vai *Hệ thống / Sản phẩm*, còn `AGENTS.md` mục 6
chạy cặp *Giữ lõi / Phát & thu* — hai cách chia khác nhau, và lần đổi 08/09 không có quyết định
nào ghi lại. **Chờ Đức chốt cặp nào đứng.**

**Sửa một chỗ tôi đánh dấu sai lượt trước:** ADR-0023 bị tôi ghi là bác bỏ toàn bộ, nhưng vế ⑶
(*"khoá thuộc về CHAT"*) **vẫn sống** — nó chính là giới hạn ⑦. Chỉ vế ⑴ chết.

**Ngôn ngữ: Đức đảo lại trong ngày.** Sáng chốt tiếng Anh cho rẻ token, chiều chốt lại tiếng Việt
*"để tôi cùng đọc bản cuối"*. Lý do sau nặng hơn: **một bộ luật Đức không đọc được là một bộ luật
Đức không kiểm được.** `AGENTS.md` viết lại lần hai; phần tiết kiệm còn giữ là phần **cắt ngắn và
phân nhóm**, không phụ thuộc ngôn ngữ — **402 → 252 dòng, 30.520 → 19.331 ký tự (−37%)**.
Bài học: **hỏi ai sẽ ĐỌC một tài liệu trước khi tối ưu nó cho ai sẽ NẠP nó.**

Sổ nợ còn **1 mục mở**: `N-45`.

> **Lượt đẩy dùng `--carry`, cuốn theo 5 commit của lane `claude-gpt-chay-het-job`** — ADR-0005 vế ⑶ duyệt thường trực; đổi lại phải kể tên lane bị cuốn theo, đây là dòng đó.

## 2026-09-09 · `claude-luat-rasoat` — bản đồ NƠI CHỨA LUẬT: 18.743 dòng, mới rà 8%

Đức: *"cần rà soát các nơi chứa luật, tương tự như bên repo template đang làm."* Đo trước, sửa sau.

**Bản đồ chín nhóm** (dòng · đã rà): hiến pháp gốc 262 ✅ · ADR gốc 950 ✅ · sổ tay quy trình
1.041 ❌ · điều hướng gốc 1.032 (2/6) · cấu hình mang luật 240 ❌ · luật từng gói 1.835 ❌ ·
ADR từng gói 4.819 ❌ · giao việc 2.457 ❌ · nghiên cứu 6.107 ❌. **Chỉ 8% từng được đọc lại.**

**Hai sổ tay đã đầy chỗ chết sau lượt gộp ADR:** `HANDOFF.md` §3 vẫn dạy *"xoay file theo tháng"*
trong khi luật hiện hành cắt **theo SỐ MỤC** — viết lại; xoay theo tháng hạ xuống một khối cảnh
báo. `MULTIFLOW.md` thiếu hẳn khoá FILE (cơ chế mặc định từ 08/09) — bổ sung, kèm **chứa nhau hai
chiều** và **hai mốc trả khác nhau**: khoá file trả lúc hết phiên, khoá vùng trả sau khi đẩy.

**12 liên kết chết** đã vá: 2 ADR Scouter dùng `../../../../` ở chỗ cần 5 tầng, 9 liên kết `EXP-*`
trỏ vào hồ sơ đã xoá 08/09. *Phép kiểm liên kết đầu tôi viết báo 18 lỗi giả vì bỏ qua phạm vi thư
mục — đúng lỗi mô hình mà B12 vừa dạy tôi hôm nay. Viết lại theo đường dẫn đầy đủ mới ra 12 thật.*

**Máy canh mới bắt đúng việc thật.** `HANDOFF_QUA_DAY` (trần 25 mục) nổ ở
`workers/duc-scouter/v0.1.0/HANDOFF.md` — **26 mục**. Cắt còn 20 bằng
`handoff.mjs --cat … --giu 20`, 6 mục sang `HANDOFF-ARCHIVE-01.md`, SHA-256 `d04a7a4d…`, ghép lại
kiểm hai đường. Đây là lần đầu một phép canh viết hôm qua chặn một file không phải file nó sinh ra.

**Thước cóc `docs/` nâng 9.793 → 9.803, có lý do viết ra:** gọt trước 34 dòng, phần còn lại là
`docs/README.md` mọc thêm mục lục ADR — chi phí bắt buộc để 9 file gộp tra được. `docs/adr` đồng
thời **giảm 1.798 dòng** nhưng thước cố ý không đếm ADR nên phần giảm đó không bù vào.

**Mở hai mục sổ nợ ở vùng lane khác giữ:** `N-55` (`gg-flow-video/decisions.md` — 142 dòng, 8
quyết định **không số hiệu**, B12 không thấy) và `N-56` (`chatgpt/STATUS.md` trích ADR gói bằng
đường dẫn gốc → liên kết chết trên bảng).

## 2026-09-09 · `claude-luat-rasoat` — BỘ BIÊN DỊCH LUẬT, và 15/18 nơi chứa luật đã rà

Đức chốt: *"cần một bộ rule compiler… mọi rule mới được append vào ledger, nhưng KHÔNG append
trực tiếp vào active rules"* → [ADR-0027](docs/adr/0027-bo-bien-dich-luat.md) ·
`docs/protocols/RULE-COMPILER.md` · `scripts/rule-compile.mjs` · cổng phép kiểm 17 · ghim 19 ca.

**Repo đã có HAI NỬA mà không có mối nối:** sổ cái chỉ-thêm (B12 canh) và bản hiệu lực có thước
cóc — không gì kiểm bản hiệu lực **đúng với** sổ cái. Bốn phép, chỉ `TRICH_VE_CHET` là ĐỎ; ba
phép kia là *mùi*, và một cổng đỏ vì mùi là một cổng sẽ bị tắt.

**Lượt chạy đầu bắt ngay hai chỗ đang dạy mô hình CHẾT từ 07/09** (*một cửa*, 0004 bị 0017 thay):
`AGENTS.md` mục 7 và `ORCHESTRATOR.md` mục 0d.

**Rà tay 15/18 nơi** (còn 3 gói `duc-auto-*`, lane khác giữ khoá → `N-57`). Máy không thấy, mắt
thấy: `_shared` còn dạy *"cấm sửa gói đóng băng"* (chết 08/09) · `PROMPTS.md` §3 còn dạy khoá
VÙNG là mặc định (đổi sang khoá FILE 08/09) · `PLATFORM.md` khai **3 extension** trong khi repo
có **6**, kèm Observer V0 đã ngừng tồn tại 06/09 · `ASSISTANT-V0.1.md` khai hai mốc sai.

**Lượt gộp ADR hôm qua ĐÁNH RƠI BA VẾ** (`0020 ⑶` `0020 ⑷` `0019 ⑷⑸`) mà B12 vẫn xanh tuyệt đối
— **nó canh SỐ HIỆU, không canh NỘI DUNG VẾ**. Đã khôi phục; cách chữa là một bước NGƯỜI.

**Cắt AGENTS.md 402 → 252 làm hỏng 8 lượt trỏ theo SỐ MỤC.** Từ nay trỏ tới `AGENTS.md` phải kèm
**TÊN** mục: số hiệu ADR là danh tính, số mục chỉ là vị trí.

**Tôi commit một file test RỖNG 0 byte và mọi lớp đều xanh** — lệnh Python mở file để GHI trước
khi đọc. Đã khôi phục; `chay-test.mjs` nay **từ chối chạy** suite dưới 200 byte.

**Xoá 3 hồ sơ đã chết** (1.006 dòng): `TOKEN-DIET-V0` · `SEND-TO-OTHER-REPOS` ·
`BRIEF-OBSERVER-V1`. `PLATFORM.md` 231 → 101. **Thước cóc `docs/` 9.803 → 9.185.**

**Kho nhớ của phiên cũng đi qua sáu bước đó** (ADR-0027 ⑸): 39 → 38 mục.

## 2026-09-09 · `claude-luat-rasoat` — ba nơi luật cuối, sáu vế chết máy không thấy

Đức mở khoá cả ba vùng `duc-auto-*`, chuyển từng vùng bằng `--restamp --duc-duyet`.
**Đóng N-55 · N-56 · N-57** — chi tiết từng mục ở ba dòng `ĐÓNG` cuối `BACKLOG.md`.

**Phép ④ của `rule-compile.mjs` 3 → 0**, 19 nơi chứa luật đã rà hết — thêm `docs/_TEMPLATE-adr.md`,
trước nay **không khai nên vô hình với bộ biên dịch**, và đúng trong đó có luật chết. 12 nhóm phép
③ nay đều mang lý do viết tay.

**Sáu vế chết tìm bằng MẮT, máy không thấy cái nào** — chúng **mâu thuẫn** với sổ cái chứ không
*trích* sổ cái, nên phép ① mù. Nặng nhất hai cái: `gg-flow` luật 3 ghi `run.trial` trần **3 job**
trong khi mã và luật 2 của **cùng file** nói **7** — con số về TIỀN; và `gemini` luật 8 cấm
harness, chết **24/08** bởi chính `ADR-0022` tên là *"Sửa luật 8 AGENTS.md"*, nằm sai **16 ngày**.

**Đức chốt cặp vai** cho repo này: **Hệ thống / Sản phẩm** → **ADR-0029**. Cả hai vai đều code
được; Sản phẩm giữ mã mọi extension + Scouter xuyên suốt chạy và debug, kèm kiến trúc của chính
nó; *"Phát & thu"* thuộc repo bộ khung. Hết cờ ⚠ treo từ 08/09.
Món nợ gói video tự khai đã trả: luật *chọn nhãn cấu hình* lên tầng repo → **ADR-0028**.

**Ba chỗ tôi làm sai.** ⑴ `--restamp --duc-duyet` đóng dấu **hai** khoá chứ không một — nó ghi
*tôi* đã lấy khoá của lane `claude-gpt-chay-het-job`, chỉ vì lượt nhận hợp lệ của họ chưa commit;
đã trả lại nguyên văn từ `git show HEAD:` → **N-59**. ⑵ Mục `Vế đã chết` viết văn xuôi thì bộ đo
**không thấy gì và báo SẠCH** — khuôn bắt buộc nay ở `RULE-COMPILER.md` mục 5. ⑶ Gom 12 khoá file
cùng lúc dù cổng đã nhắc; Đức bắt được, đã trả sạch.

**`--carry` cuốn 2 commit của lane `claude-gpt-chay-het-job`** (B-43, việc của họ). Họ lấy lại khoá
`duc-auto-chatgpt` lúc 03:50 theo chốt của Đức; một dòng luật chết còn lại trong gói đó tôi **hoàn
nguyên và giao lại** qua sổ nợ.

**Còn mở:** phép ② **100 mồ côi** ở hai sổ `chatgpt`/`gemini` → **N-58**, không phải nhiễu: bốn
chốt `run.trial` của Đức nằm trong đó và chúng ĐANG SỐNG.

## 2026-09-09 · `claude-luat-rasoat` (lượt 2) — phép ② về 0, và bốn phép đều sạch

**Đóng N-58.** Phép ② `QUYET_DINH_MO_COI`: **100 → 0**. Soi từng cái trong 100, không lấp bằng
cửa miễn trừ — **67 luật đang sống** vào bản hiệu lực hai gói (mục mới *Sổ cái của gói*, nhóm theo
chủ đề) · **27 bản ghi lịch sử** khai `mo_coi_co_y` · **6 thật sự đã chết** đánh dấu đúng khuôn.

**Nghi ngờ lúc mở mục đã được xác nhận: đó không phải nhiễu.** Trong đám mồ côi có luật đang ràng
buộc mà ai chỉ đọc `AGENTS.md` sẽ không bao giờ biết — `gemini` ADR-0046 ghim **CẤM dựng lại** hai
ngõ cụt đã bị bằng chứng bác bỏ; `chatgpt` ADR-0042 *việc thật KHÔNG chạy qua `run.trial`* và
ADR-0045 *text quá 32.767 ký tự thì DỪNG, không lưu gì*.

**Bộ đo nhận thêm dạng NHÓM cho `mo_coi_co_y`** — một lý do chung, một danh sách số hiệu. 27 câu
lý do gần giống nhau chép 27 lần là **giả vờ đã suy nghĩ 27 lần**. Cố ý **không** làm dạng *"cả sổ
này miễn"*: nhóm vẫn phải liệt kê từng số, nên quyết định mới thêm sau vẫn kêu. Ghim cả hai chiều.

**Cấu trúc tìm ra khi đối chiếu hai sổ:** `gemini 0001–0015` và `chatgpt 0001–0016` là **cùng một
chuỗi quyết định lệch nhau đúng một số** — lịch sử trước lúc fork, chép đôi. Từ `0016` trở đi mới
là lịch sử riêng. Đây là chỗ nên nhìn kỹ ở lượt cải tổ tới.

**Đức chuyển khoá `duc-auto-chatgpt`** sau khi báo lane `claude-gpt-chay-het-job` đã dừng.

**Bốn phép nay: ① 0 · ② 0 · ③ 12 (đều có lý do viết tay) · ④ 0.** Không còn gì trong sổ nợ hạ tầng
thuộc về bộ biên dịch luật.

## 2026-09-09 · `claude-luat-rasoat` (lượt 3) — trần đo bằng KÝ TỰ, và một khuyến nghị tôi rút lại

Đức giao quyền lead về nén luật, rồi hỏi **trần bao nhiêu thì phù hợp**.

**Không có con số chuẩn nào của hãng để dẫn** — Anthropic khuyên `CLAUDE.md` giữ ngắn nhưng không
công bố trần dòng. Nên trần suy từ số đo của repo và từ chính lời Đức (*25–50 active rules*):
**ĐÍCH 8.000 ký tự** mỗi phiên. [ADR-0031](docs/adr/0031-tran-do-bang-ky-tu.md).

**Ba thước cũ sai HAI chỗ.** Sai **đơn vị**: lượt nén buổi sáng giảm **32% dòng mà chỉ 7% ký tự**
— tôi cắt chữ ngắn rồi thêm chữ đặc. Sai **chỗ**: thước "bề mặt luật" đo 19 nơi cộng lại, con số
**không phiên nào trả**. Hoá đơn thật: mọi phiên trả `CLAUDE.md`+`AGENTS.md`; phiên đụng gói trả
thêm `AGENTS.md` của gói. Đổi sang `luat.nap`, đơn vị ký tự; bỏ `agents.tran_dong` và
`luat.tran_dong_ban_hieu_luc`.

**Nén thật:** mục 7 chiếm **35%** `AGENTS.md` và **không phải luật** — nó là bảng chỉ đường.
Nạp mỗi phiên **20.530 → 17.684 ký tự** (~9.300 → ~8.038 token).

**Bước ⑥ về tay máy** ([ADR-0030](docs/adr/0030-rule-compiler-v1.md)): `rule-compile.mjs --sinh`,
hai lượt sinh ra y hệt từng byte. Đích khai ở `luat.khoi_sinh`, không suy từ đường dẫn.

**Hai chỗ tôi sai, và cách sai đáng nhớ hơn cái sai.** ⑴ Khuyên *"lane kia phải port
`reconciliation-core.js` sang Gemini"* — **sai**, Gemini không hề có `text_reasoning`, port là
nhét mã chết. Tôi phán trước khi kiểm. ⑵ Viết `new RegExp(` + "`" + `\b${t}\b` + "`" + `)` — `\b`
trong template literal là **ký tự backspace**, lần thứ ba của cùng họ lỗi trong một ngày.

**Việc lớn nhất còn lại KHÔNG phải chuyện luật:** hai lượt đẩy bị chặn trong một giờ vì lane khác
sửa dở trên **cùng một cây git**. `ADR-0017 ⑵` (*mỗi vai một checkout riêng*) đã `Accepted` từ
07/09 và **chưa bao giờ được làm** — `git worktree list` trả về đúng một cây. Ghi thành **N-62**,
cần Đức chốt. Bốn phép của bộ biên dịch **đều XANH** trong khi vế này bị bỏ hai ngày: nó soi
*chữ với chữ*, không soi *chữ với thế giới*.

## 2026-09-09 · `claude-nen-luat` — gói nặng nhất −70%, và một lỗ của chính bộ đo

**`chatgpt/AGENTS.md` 43.783 → 12.944 ký tự**, dưới đích 8.000-của-một-gói… không, vẫn trên, nhưng
đã rời khỏi chỗ *5,5× quá đích*. Gói nặng nhất giờ là gemini (24.765).

**Chỗ mỡ, đo được:** bảng *Bản đồ file* chiếm **64%** cả file; riêng **19 hàng `tests/*` = 19.371
ký tự (44%)**. Mỗi hàng chép lại docblock của chính phép kiểm đó. Hai lý do cắt, không phải một:
cổng (`session-check`, phép *File mới đã khai vào Bản đồ file*) chỉ so **tên cấp cao**, và bảng
**chưa bao giờ đủ** — 19 hàng cho **125** file test trên đĩa. Nó chưa từng là chỉ mục, chỉ là 19
chỗ ai đó tiện tay viết dài.

**Sổ cái về tay máy.** Gắn `nhom:` cho 52 ADR, `luat.khoi_sinh` trỏ `docs/adr/` → `decisions.md`
(không trỏ `AGENTS.md`: khối sinh ra dài ~7.500 ký tự, đắt hơn cả cái nó thay). Bảng gõ tay cũ đã
mục — nó dừng ở `0049` khi trên đĩa có 52. **Phép ② QUYET_DINH_MO_COI: 9 → 0, cả repo về 0.**

**Lượt gắn đó lôi ra một lỗ của chính bộ đo.** Hai sổ cái là fork của nhau, nên hai khối máy sinh
chép đôi nhau: phép ③ nhảy **2 → 19 nhóm**, và **không nhóm nào có cửa ra** — ba lựa chọn của
`RULE-COMPILER.md` mục 4 (gộp · trỏ · nói vì sao) đều vô nghĩa với thứ máy vừa tự sinh. Vá ở
`dongLuat`: bỏ qua dòng nằm giữa hai mốc khối sinh. Ghim **cả hai chiều** — trong khối thì câm,
sau khi khối đóng thì vẫn kêu; một cái mốc lạc chỗ mà tắt luôn phép đo thì tệ hơn.

**Chuyển chứ không xoá:** COUNCIL → `drafts/TEMPLATE-COUNCIL.md`; chuyện của Pilot-13 và Pilot-17 →
`README.md` trong chính thư mục đó (thêm, không sửa — chúng là bằng chứng).

**`AGENTS.md` gốc 17.255 → 16.245**, và đây là chỗ phải nói thẳng: mục 1 và mục 4 vừa rút hết
chuyện kể, mục 7 rút từ lượt trước, **nhưng chỉ giảm 6%**. Còn ~345 ký tự một luật so với đích
~150. Phần thừa **không còn là chỉ mục hay chuyện kể — nó là chính các câu luật**. Đi tiếp là
**bỏ bớt luật**, và đó là ngân sách của Đức chứ không phải việc AI tự quyết. Ghi vào Làn 2.

## 2026-09-09 · `claude-nen-luat` (lượt 2) — cả ba sổ cái về tay máy, Làn 1 đóng

**`luat.khoi_sinh` nay phủ cả ba gói, và cả ba trỏ vào `decisions.md` — không trỏ `AGENTS.md`.**
Lý do đo được: khối sinh ra dài **5.700–7.500 ký tự**, tức **đắt hơn cả cái nó thay**. Nó thuộc về
file COMPANION (mở khi cần), không thuộc file CORE (nạp mỗi phiên đụng gói). Gemini theo đó:
`AGENTS.md` **24.765 → 19.045**.

**Bước ⑥ bắt được chỗ trôi đầu tiên của chính nó.** Bảng gõ tay của `gg-flow-video` khai `ADR-0003`
là còn sống, trong khi chính ADR đó đã khai `- **0003 — …**` **chết từ 05/09**. Không ai gõ sai —
bảng chỉ đơn giản không được cập nhật, đúng thứ máy sinh sinh ra để chặn.

**Bốn phép: ① 0 · ② 0 · ③ 1 · ④ 0.** ② về 0 trên **cả repo**, lần đầu.

**Chỗ tôi phải nói thẳng, vì nó đổi hướng của Làn 2.** Ba lượt nén hôm nay cắt được nhiều là nhờ
cắt **chỉ mục** và **chuyện kể** — hai thứ không phải luật. `AGENTS.md` gốc thì hết cả hai loại đó
rồi: mục 1 và mục 4 vừa rút sạch chuyện kể mà **chỉ giảm 6%** (17.255 → 16.245). Còn **~345 ký tự
một luật** so với đích ~150 của [ADR-0031](docs/adr/0031-tran-do-bang-ky-tu.md) ⑵. Phần thừa **là
chính các câu luật**. Đi tiếp từ đây là **bỏ bớt luật** — ngân sách của Đức, không phải việc AI tự
quyết. Đã ghi vào Làn 2 thay cho một lời hứa sẽ-nén-tiếp mà tôi không giữ được.

**Khoá:** vùng `workers/duc-auto-chatgpt` được lane `claude-gpt-chay-het-job` lấy giữa phiên bằng
`--restamp --duc-duyet` kèm câu chốt của Đức (*"tiếp đi"*) — đường hợp lệ thứ ba, phần việc của tôi
trong vùng đó đã commit xong trước đó. Không tranh.

## 2026-09-09 · `claude-nen-luat` (lượt 3) — audit bác kết luận của tôi, và một cú đẩy nhầm

**Tôi đẩy nhầm.** Heredoc **không đóng ngoặc** (`<<PY`) làm bash chạy mọi backtick trong đoạn
Python — một trong số đó là `safe-push.mjs`. **8 commit lên `origin/main` lúc tôi chưa định đẩy**,
gồm **`afd00d2f` của lane `claude-gpt-chay-het-job`** — lượt `--carry` bắt buộc kể tên, tôi kể ở
đây. Không hỏng gì: `safe-push` là công cụ đúng và điều kiện của nó đều đạt, không force, không sửa
lịch sử. Nhưng là hành động ra ngoài tôi không chọn. **Luôn `<<'EOF'`.**

**Đức đổi cách đặt trần:** *"nhỏ hơn ngưỡng margin 30–40%"*, và mở uỷ quyền sang **tái tổ chức
kiến trúc luật**.

**Kết luận lượt 2 của tôi SAI, Codex bác đúng.** Tôi viết *"phần thừa là chính các câu luật, đi
tiếp là bỏ bớt luật"*. Sai — tôi mới chạm trần của việc **xoá chuyện kể**. Cửa còn lại: **chuyển
THỦ TỤC xuống Tầng 2 kèm CÒ NẠP BẮT BUỘC**, giữ bất biến ở Tầng 1. Chuyển thủ tục mà vẫn giữ bất
biến **không phải xoá luật**. Riêng cửa đó: `AGENTS.md` **16.245 → 6.427**; nạp mỗi phiên
**16.674 → 6.588**, dưới trần 8.000, còn **1.388** nữa tới đích 5.200.

**Audit còn tìm ra bảy chỗ mâu thuẫn có sẵn** — nguy hiểm hơn độ dài, vì lượt nén sau sẽ "dọn"
đúng chúng. Cách đọc đúng từng chỗ: **ADR-0033 ⑸**.

**Hai chỗ audit dạy tôi mà tôi không tự thấy:** bảng mục 7 **tự mô tả sai** (nói "chỉ đường" trong
khi ba hàng mang luật thật), và thước gói đo **một file** thay vì đo **bó** — nên chuyển luật qua
lại giữa gốc và gói làm con số đẹp lên mà hoá đơn y nguyên. Đã sửa cả hai.

**Một phép ghim của chính tôi đo sai chuyện:** nó khẳng định `dich < tran`, tức đo *khoảng cách hôm
nay*, nên **đỏ đúng lúc thước lặn xuống dưới đích** — đỏ lúc thành công. Thay bằng ghim thứ tự
`bien < dich`.

**Hai nợ chưa ghi được vào `BACKLOG.md`** (lane khác giữ khoá file đó): không phép kiểm nào canh
chuỗi *chỗ cũ → bất biến → đích → cò* của một lượt chuyển (ADR-0033 ⑶); và `_root` không nhận được
khi lane khác giữ **một** khoá file bên trong, nên commit gốc chưa đẩy kẹt cổng.

## 2026-09-09 · `claude-nen-luat` (lượt 4) — con voi là `HANDOFF.md`, không phải file luật

**Đức hỏi trần 9–10k token; đo ra mới thấy tôi nén sai chỗ cả ngày.** Một phiên đụng gói trả
**24.000–30.500 token**, trong đó **`HANDOFF.md` của gói là 14.600–22.100 — khoảng 70%**. Thước ký
tự dựng cùng ngày chỉ đo `AGENTS.md` nên báo *"8.900, dưới trần"*. **Đo sai chỗ, lần thứ hai.**

**Chữa bằng một dòng luật** (ADR-0034): mục 1 đọc `STATUS.md` thay cho cuối `HANDOFF.md` —
`STATUS.md` vốn đã là trang trạng thái một-trang. **24.000–30.500 → 8.500–11.600 token.**

**Rút lại một đề xuất của chính tôi:** hạ trần mục nhật ký 2.600 → 1.200 byte. Con số 2.600 **được
đo**, nằm trong một khoảng trống của phân bố. **Đè một con số đoán lên một con số đã đo là làm hỏng
phép đo, không phải nén.**

**Phần "hook permanently":** `nap.mo_phien_goi` khai danh sách file mục 1 bắt đọc, cổng đọc danh
sách đó thay vì gõ cứng, một phép ghim đối chiếu hai chiều. Đột biến **3/3** — con đầu **thoát** ở
bản đầu vì tôi đối chiếu cả mục 1 thay vì đúng câu *"Mở:"*, nên thêm `BACKLOG.md` vẫn xanh (mục 1
nhắc nó, nhưng để nói *ghi vào đâu*). Thu hẹp về đúng câu → 3/3 đỏ.

**`CLAUDE.md` toàn cục 2.351 → 1.874 ký tự** (Đức duyệt). Giữ ranh giới *phải hỏi Đức* dù repo
cũng nói — **trùng lặp đang chạy tốt**: project chưa có `AGENTS.md` thì đó là sàn an toàn duy nhất. **Nâng `docs.tran_dong_khong_ke_adr`
9.185 → 9.340** (cửa ra thứ ba của cổng): `docs/` +119 dòng, file luật **−440**, ròng **−321** —
số đo và lý lẽ ở `docs._vi_sao_nang_0909`.

**Prompt audit** — 6 phát hiện, áp 4. Bề mặt luật **sạch** ở nhóm prompt cũ. Phát hiện thật là
**thiếu chữ**: 40/75 mô tả method Bridge ≤ 1 câu, và `run.trial` — method duy nhất tiêu credit —
không mang nắp cứng nào; chúng chỉ ở `AGENTS.md`, thứ tác nhân ngoài **không bao giờ nạp**.

**Khoá:** trả hộ lane `claude-gpt-chay-het-job` theo lời Đức *"phiên GPT đã dừng"* — **nó nhận lại
vùng 3 phút sau**. Dừng tay ở gói đó, hai hunk Bridge chưa áp. Trước đó cứu được một mục sổ nợ họ
viết xong chưa commit, và chính ghi chú đó chặn tôi khỏi dùng `--restamp`.

## 2026-09-09 · `claude-nen-luat` (lượt 5) — MỘT file cho một phiên gói, và trần chặn ở lượt sinh

**Đức chốt 2.000–3.000 token, và gọi việc giữ nó ở đó là *"mục tiêu của việc compile"*.** Nén tay
không tới được: riêng phần nền đã **3.901 token**, và chỗ rò lớn nhất là **`@AGENTS.md` trong
`CLAUDE.md`** — nó nạp cả hiến pháp vào **mọi** phiên, kể cả phiên chỉ sửa một selector. B10 không
đòi cái `@` đó, nên tháo được.

**[ADR-0035](docs/adr/0035-mot-file-cho-mot-phien-gap.md):** `CLAUDE.md` thành bộ định tuyến hai
cửa; phiên gói đọc đúng **`PHIEN.md`** — máy sinh, tự chứa = lõi luật chung
(`workers/_shared/LUAT-CORE.md`) + `## Luật vàng` của gói + bản chắt trạng thái từ `STATUS.md`.

| Gói | Sáng nay | Giờ |
|---|---:|---:|
| gg-flow-video · scouter | 26.194 · 23.374 | **2.711** · **2.711** |
| gemini | 30.487 | **2.580** |

**Trần CỨNG, và đây là chỗ khác mọi thước trước:** 6.600 ký tự, đo **cả bó**, **chặn ở lượt sinh** —
vượt là bộ sinh **từ chối ghi** và thoát 1. Thước cóc thì báo đỏ rồi ai đó nâng nó lên; **hôm nay
chính tôi nâng một cái**, có lý do, nhưng vẫn là nâng. Trần này không có đường đó — muốn thêm một
luật thì phải bỏ một luật, tức giới hạn ⑧ từ chữ thành cơ chế.

**Đột biến 4/4:** nhồi 1.500 ký tự → từ chối **và** `PHIEN.md` không bị ghi đè · gỡ trần → ghim ĐỎ ·
nới trần lên 20.000 → ghim ĐỎ · bỏ phần nền khỏi công thức cổng → ghim ĐỎ. Cổng và bộ sinh nay cộng
**cùng một công thức**, và có một phép ghim canh đúng điều đó.

**Dedupe làm việc thật:** bốn luật đầu của gemini trùng nguyên nghĩa với lõi → gộp còn một dòng trỏ
về lõi.

**`--carry`: lượt đẩy này cuốn theo **mọi commit chưa đẩy** của lane `claude-gpt-chay-het-job`** —
`5cd84c4` `1ed666f` `fe56961` `8513daa` `c7d59c1` tại lúc đẩy. Kể tên theo ADR-0005 ⑶. **Lane đó
đang CHẠY**, không dừng như tưởng, nên con số có thể lớn hơn: bản ghi thật là
`git log origin/main..HEAD` ngay trước lượt đẩy.

**Gói `duc-auto-chatgpt` KHÔNG sinh được: 3.912 token, quá trần 912.** Phần thừa đã biết chính xác
(khối biện minh ADR-0032 đã nhận về + bốn luật trùng lõi), vùng đang có lane khác giữ. Hệ quả cần
nhớ: chừng nào nó còn quá trần thì `--sinh` **luôn thoát 1** — đừng dùng mã thoát để suy ra lỗi mới.
