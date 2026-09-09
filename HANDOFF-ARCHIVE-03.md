# HANDOFF lưu trữ — HANDOFF.md, 6 mục cũ

> **Đây là phần đuôi đã cắt của [`HANDOFF.md`](HANDOFF.md) cạnh file này.**
> Sinh bằng `node scripts/handoff.mjs --cat HANDOFF.md --giu 20` theo
> [ADR-0008](docs/adr/0008-nhat-ky-phien.md) — cắt ngày 2026-09-09.
>
> Cắt theo **vị trí trong file**, không theo ngày (bất biến ⑵ của ADR): file kia giữ **20
> mục cuối**, 6 mục trước đó nằm ở đây — **nguyên văn, không sửa một chữ**.
>
> **Dựng lại bản gốc:** thay khối con trỏ trong `HANDOFF.md` (phần giữa dòng `## Log` và
> tiêu đề `##` đầu tiên) bằng toàn bộ phần dưới dấu `ARCHIVE-BODY-START` ở đây — ra đúng bản
> gốc **từng byte**. SHA-256 bản gốc trước khi cắt: `b54ca28e770453e80dcbb97026b179365c5770fa42b89f925e23cf43e9f2ffa7`.
>
> **Chỉ đọc.** Ghi Log mới thì ghi vào `HANDOFF.md`, đừng ghi vào đây.

<!-- ARCHIVE-BODY-START -->

<!-- HANDOFF-THANG: 2026-09 -->

<!-- HANDOFF-CUT-POINTER: ADR-0008 -->
> **40 mục cũ hơn đã dời sang [`HANDOFF-ARCHIVE-02.md`](HANDOFF-ARCHIVE-02.md)** — cùng thư mục này,
> nguyên văn, không mất chữ nào. File này giữ **20 mục cuối** (ADR-0008). Cần đào lịch sử
> xa hơn thì mở file đó và đi tiếp theo con trỏ trong nó; ghi Log mới thì vẫn ghi vào cuối
> file này.
<!-- /HANDOFF-CUT-POINTER -->

## 2026-09-09 · claude-luat-rasoat — ba nơi luật cuối, sáu vế chết máy không thấy

Đức mở khoá cả ba vùng `duc-auto-*` (*"tất cả tôi đều mở freeze khóa để triển khai nếu bạn cần"*),
chuyển từng vùng một bằng `--restamp --duc-duyet`. **Đóng N-55 · N-56 · N-57.**

**Phép ④ của `rule-compile.mjs` 3 → 0**, 19 nơi chứa luật đã rà hết — thêm
`docs/_TEMPLATE-adr.md`, trước nay **không khai nên vô hình với bộ biên dịch**, và đúng trong đó
có luật chết. 12 nhóm phép ③ nay đều mang lý do viết tay.

**Sáu vế chết tìm bằng MẮT, máy không thấy cái nào** — chúng **mâu thuẫn** với sổ cái chứ không
*trích* sổ cái, nên phép ① mù với chúng. Nặng nhất hai cái: `gg-flow` luật 3 ghi `run.trial`
trần **3 job** trong khi mã và luật 2 của **cùng file** nói **7** — con số về TIỀN; và `gemini`
luật 8 cấm harness, chết **24/08** bởi chính `ADR-0022` tên là *"Sửa luật 8 AGENTS.md"*, nằm sai
**16 ngày** (nhánh ChatGPT sửa ngay hôm đó). Ba cái còn lại: `gemini` luật 7 thiếu `run.trial` · luật 1 bảo vệ
ba thư mục không tồn tại · cụm *"ADR Accepted KHÔNG sửa"* ở **bốn** file, chết bởi ADR-0026 ⑵.

**N-55:** gói video lần đầu có `docs/adr/` — 10 ADR, `decisions.md` thành mục lục, B12 xanh.
Sau đó trích đủ vào `AGENTS.md` nên mồ côi của gói về **0** (tổng 109 → 100).

**N-56 chữa cả gốc rễ:** `STATUS.template.md` nay nói rõ đường dẫn trong `current_focus`/`next_step`
tính **từ gốc repo**, vì bộ sinh chép nguyên văn hai trường đó lên `DASHBOARD.md`.

**Món nợ tự khai đã trả:** luật *chọn nhãn cấu hình* lên tầng repo → **ADR-0028**.

**Hai chỗ tôi làm sai, nói thẳng.** ➀ `--restamp --duc-duyet` đóng dấu **hai** khoá chứ không một —
nó ghi *tôi* đã lấy khoá `duc-auto-chatgpt` của lane `claude-gpt-chay-het-job`, chỉ vì lượt nhận
hợp lệ của họ chưa commit. Đã trả lại nguyên văn bốn trường từ `git show HEAD:` → **N-59**.
➁ Mục `Vế đã chết` tôi viết bằng văn xuôi nên bộ đo **không thấy gì và báo SẠCH** — đúng hình
dạng bệnh chính nó sinh ra để bắt. Khuôn bắt buộc nay ghi ở `RULE-COMPILER.md` mục 5.

**Còn mở:** phép ② **100 mồ côi** ở hai sổ `chatgpt`/`gemini` → **N-58** — không phải nhiễu:
bốn chốt `run.trial` của Đức nằm trong đó và chúng ĐANG SỐNG.

## 2026-09-07 · claude-dieu-phoi — lõi hai vai đã vượt sáu ca; một cờ chờ Đức

**Lõi đã xong ở bộ khung** (đẩy rồi, `Ark_Repo_Harness` @ `b3bbfc5`): `scripts/quyen.mjs` +
`tests/quyen-sau-ca.mjs`. **41 phép kiểm xanh · 10/10 đột biến bị bắt** · `npm test` xanh · cổng
đóng phiên XANH TOÀN BỘ. Chín ca, kể cả ca ④ chịu tải và một ca hợp lệ đi hết được.

**Đổi một chốt của ADR-0019 ⑵.** Sổ quyền đặt trên **ref riêng** `refs/ark/quyen`, ngoài lịch sử
`main` — nên rebase `main` không chạm được nó, và ca *"quyền cũ sau fetch + rebase"* thành **không
thể xảy ra về cấu trúc**, không cần soi khoảng lịch sử. Lượt tích hợp cũng là sự kiện trên chính
ref đó, nên lượt kiểm và lượt ghi là **một lượt đẩy** — đóng lỗ TOCTOU.

**Đo được, và nó bác vế ⑴ của ADR-0019 lần thứ hai** — lần này theo chiều ngược với brief §0.
Brief đo repo Extension rồi tôi khái quát cho cả hai; **sai**. Repo bộ khung
(`Ark_Repo_Harness_Template`) **ĐANG có** branch protection cổ điển trên `main`:
`required_status_checks: ["cong-kiem"]`, `strict: true`, `allow_force_pushes: false`. Workflow
`.github/workflows/cong-kiem.yml` đã chạy **87 lượt**. Tức **bên thứ ba độc lập không phải xây
mới — nó đã có sẵn.**

Chỗ hở là **một cờ**: `enforce_admins: false`. Lượt đẩy hôm nay in ra
`remote: Bypassed rule violations for refs/heads/main` — nghĩa là hàng rào có thật nhưng tài khoản
admin đi vòng qua được, và mọi phiên AI đều đẩy bằng tài khoản đó. Nên hiện tại nó là **trang trí**.

**CHỜ ĐỨC — một quyết định, và ĐỪNG tự bật.** Bật `enforce_admins` sẽ **chặn mọi lượt đẩy** cho tới
khi `cong-kiem` báo xong (nay đang `pending`), nên bật sai lúc là tự khoá cả hai vai ra ngoài.
Repo Extension thì **không có lớp nào** (`protection` 404 · `rulesets` rỗng) — hai repo khác nhau,
đừng suy từ cái này sang cái kia.

**Chưa làm, cố ý** (brief mục 6): chưa nối `quyen.mjs` vào `claim.mjs`, chưa vào `template/`, chưa
thêm bước kiểm quyền vào `cong-kiem.yml` — bước đó chỉ có nghĩa sau khi lõi thành đường ghi thật.

## 2026-09-07 · claude-bo-sinh — cắt thời gian bộ sinh bảng, 9,7s → 3,6s

**Vì sao làm việc này trước.** Đức hỏi *"cổng kiểm cost nhiều thời gian, có cách improve không"*,
và một phiên trước đó chạy hết một tiếng. Đo ra: **~40 phút của tiếng đó là ngồi chờ máy**, và
gốc là bộ sinh bảng chậm — nó chạy trong cổng đóng phiên, trong phép kiểm của chính nó, và trong
`bang-trang-thai/`, nên mỗi giây ở đây bị nhân lên nhiều lần mỗi phiên. Đức chốt: sửa bộ sinh trước.

**Chẩn đoán bằng đồng hồ, không bằng phỏng đoán.** 277 lượt gọi git / 8.922ms một lượt sinh. Hai
nhóm ăn **58%**, cả hai vì cùng một lý do — **một tiến trình git cho MỖI đường dẫn**:
`log -1` **107 lượt / 4.139ms** · `cat-file -t` **40 lượt / 1.098ms**.

**Vá.** Hai bản đồ gộp, dựng lười, neo vào cùng mốc `moc()` đã ghim: một lượt
`git log --name-only` cả lịch sử (**152ms**) và một lượt `ls-tree -r -t` (**75ms**).

| | Trước | Sau |
|---|---|---|
| bộ sinh một lượt | 9.746ms | **3.584ms** |
| `build-dashboard-smoke` | 88s | **66s** |
| `bang-ba-cua-smoke` | 27s | **16s** |
| `harness-smoke` | 25s | **16s** |
| `check-bootstrap-smoke` | 22s | **16s** |
| `build-overview-smoke` | 20s | **11s** |
| `npm test` cả repo | 240s | **192s** |

**Bằng chứng không đổi hành vi:** ra **giống từng byte** cả ba file máy sinh (`cmp`), `npm test`
xanh toàn bộ.

**Đường dự phòng đã được KIỂM, không phải để trang trí.** Repo có 2 commit merge, mà
`git log --name-only` mặc định không liệt kê file của commit merge — nên bản đồ có thể thiếu, và
chỗ thiếu thì vẫn gọi git cho đúng đường dẫn đó. Kiểm bằng cách **làm hỏng cả hai bản đồ**: chạy
mất 8,4s (đúng tốc độ cũ) và ra vẫn giống từng byte.

**Chưa làm, và vì sao.** Phần còn lại (~280 lượt `git show`, ~30ms mỗi lượt) là phí khởi động tiến
trình **rải mỏng**, không chỗ nào trội — `lineDate` chỉ 13 lượt / 514ms. Gộp tiếp cần một tiến
trình git **thường trú** (`cat-file --batch`), tức thêm máy móc và thêm một kiểu hỏng mới. Chưa đáng.

## 2026-09-07 · claude-dong-bang — cưỡng chế cờ `frozen`, cổng bỏ suite ba gói đóng băng

**Làm gì.** Giới hạn ① Đức chốt 07/09. Cờ `frozen` khai từ hôm nay mà chính
`.repo-structure.json` tự khai *"chưa cổng nào đọc nó"* — nên gỡ cờ đi thì không test nào đỏ.
Nay cổng đọc nó qua `frozenFrom()` + `chonSuiteBoDongBang()` trong `scripts/repo-structure.mjs`.

**Số đo.** Suite bốn đơn vị của ba gói đóng băng **41,1 giây** mỗi phiên (chatgpt 17,4 ·
gemini v0.2.0 12,5 · flow 9,7 · gemini v0.1.0 1,6); gói **SỐNG** `duc-scouter` **1,5 giây**.
Cổng giữ `_code` + `_root`: **188 giây**, không có cờ thì **~229 giây**.
Ghim: `tests/frozen-suite-smoke.mjs` 11 phép kiểm · đột biến **7/7 bị bắt**.

**Hai vế giữ lại bảo vệ** — phạm vi là *chọn đúng suite*, không phải *bỏ ba suite*:
chạm vào gói đóng băng thì suite của nó **chạy lại ngay**, và **fail-closed** khi không đo chắc
được ai chạm gì (`origin/main` không phân giải thì danh sách commit chưa đẩy rỗng oan).

**Kiểm chứ không giả định:** phép chống trôi dạt ba gói nằm trong suite của **chính Scouter**
(`scouter-transport-smoke.mjs` mục ⑫, đọc `HEAD:` cả ba `bridge-pairing-core.js`) — gói SỐNG, vẫn
chạy mọi lượt. `scripts.test` **giữ nguyên** cả bốn suite: cổng đọc chính danh sách đó rồi mới
chọn, xoá khỏi đó là xoá luôn đường "chạm thì chạy lại". Ghim ở file RIÊNG vì lượt sửa này sửa
chính cổng — ADR-0019 ⑸.

**Một con số tôi báo SAI, sửa lại:** tôi nói cổng *"55s → 36s"* sau khi cắt bộ sinh. Cả hai lượt
đo đó **không giữ khoá gốc**, nên cổng **không chạy suite gốc repo** — không so được với lượt có
giữ khoá. Cắt bộ sinh là thật (9,7s → 3,6s, ra giống từng byte), nhưng con số 36 giây thì sai.

## 2026-09-07 · claude-dong-bang-2 — vá lỗ Codex #19: gói đóng băng dẫn ra `scripts/`

**Codex bác đúng.** Tôi viết *"gói không đổi thì suite chỉ có thể xanh"* — quá mạnh. Thứ NGOÀI
gói vẫn đổi được, và **không phải rủi ro lý thuyết**: đo 07/09,
`workers/duc-auto-gemini/v0.2.0/tests/root-suite-covers-workers-static.mjs` **import**
`scripts/repo-structure.mjs`, và nó canh đúng việc *"danh sách suite gốc có phủ hết worker"*.
Lượt sửa cờ `frozen` hôm nay **sửa chính danh sách đó** trong khi cổng **bỏ qua** phép kiểm ấy.
Chạy tay: 95/95 xanh — **xanh vì may, không vì thiết kế.**

**Vá.** `PHU_THUOC_CHUNG_DONG_BANG` = `scripts/` · `package.json` · `.repo-structure.json`. Chạm
bất kỳ chỗ nào trong đó thì **chạy hết**, kể cả suite gói đóng băng. Chạm chỗ khác (docs, worker
khác) thì vẫn bỏ được — có phép kiểm riêng cho vế này, vì *"chạy hết cho chắc"* sẽ ăn hết phần
tiết kiệm mà không ai thấy.

**Và một phép ghim CHỐNG MỤC**, vì hằng số thì mục được: phép kiểm dò import của cả ba gói đóng
băng và **ĐỎ** nếu có gói nào dẫn ra chỗ chưa khai. Biến *"mục âm thầm"* thành *"cổng đỏ"*.

**Số đo.** Ghim 11 → **14 phép kiểm**. Đột biến 7/7 → **10/10 bị bắt**. Cổng lượt này **không in
dòng "bỏ qua"** — vì tôi chạm `scripts/` nên bốn suite đóng băng đã chạy lại, đúng hành vi mới.

**Hai chỗ vấp, ghi để lượt sau đỡ mất thời gian.** ⑴ Một phép kiểm cũ của tôi dùng
`scripts/session-check.mjs` làm *"chạm chỗ khác"* — chỗ đó nay **là** vùng chung, nên nó đo sai
thứ nó muốn đo; đã sửa dữ liệu thử. ⑵ Cổng đỏ `eol-lf-smoke` vì **bốn file CRLF trong
`workers/duc-scouter/`** — cây làm việc của phiên khác, không phải của tôi. Cổng chặn tôi vì tôi
còn file sửa dở nên nó **không quy trách nhiệm được**; commit xong là nó tự quy đúng người và cho
qua. **Đừng đi sửa file của lane khác** — chỉ cần commit phần mình.

---

## 2026-09-08 · `claude-cua-kiem` — ADR-0019: ranh giới vùng↔đường dẫn ĐÓNG, và một câu chữa bị sửa

**Làm gì.** Cập nhật ADR-0019 theo việc đã chạy ở bộ khung, không phải theo dự định. Chi tiết đầy
đủ ở `docs/adr/0005-lam-viec-song-song.md`; đây chỉ là con trỏ:

- **Mục ⑵c: "còn hở" → ĐÃ ĐÓNG.** Lõi quyền bắt buộc `--ban-do` + `--con-lai`, quy mọi đường dẫn
  trong khoảng `coSo..sha` về một khoá theo khối `areas`, từ chối nếu có đường dẫn thuộc vùng khác.
  Trước đó phiên Codex khai vùng `wrong-area` cho một thay đổi ở `product.txt` và **đi qua được**.
- **Câu treo đã trả lời: kết quả chạm NHIỀU vùng thì ai duyệt — KHÔNG AI.** Một kết quả, một vùng.
- **Mục ⒞: sửa một câu ADR này viết HAI LẦN và sai cả hai lần.** `enforce_admins` cộng một bước đọc
  sổ quyền trong CI **không** đóng được khe đẩy `main`. Ứng viên còn lại là merge queue, **chưa đo**.

**Số đo.** Ở bộ khung: `node tests/quyen-sau-ca.mjs` → **97 đạt · 0 sai** (trước 79), 15 ca. Bộ đột
biến 27 cái đang chạy lúc ghi dòng này; số cuối vào nhật ký bộ khung, không vào đây.

**Lượt đẩy.** Tôi **không** đẩy: phiên `claude-scouter-s06` đẩy trước và **cuốn theo commit
`b0f12f59` của tôi** lên `fd2d941f`. Ghi ra vì ADR-0005 bắt kể tên lane bị cuốn theo — lần này tôi
là bên **bị** cuốn, không phải bên cuốn.

**Còn mở, đừng đọc hẹp hơn.** `--as` vẫn là tên tự khai · đẩy `main` bỏ qua cửa thì mã VẪN vào ·
chưa bật cờ GitHub nào. Bản xem được chờ Đức duyệt:
`_run-qua-dem-20260907/DE-XUAT-CO-GITHUB--CHO-DUC-DUYET.md`.

