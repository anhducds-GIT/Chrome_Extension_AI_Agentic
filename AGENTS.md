# AGENTS.md — Hiến pháp repo (đọc đầu tiên, mọi AI)

> Đây là **Tầng 1**: luật chung, cố tình giữ ngắn 1 trang. Đọc hết trước khi gõ dòng đầu tiên.
> Chi tiết kỹ thuật KHÔNG nằm ở đây — xem mục "Sổ tay mở khi cần" bên dưới.
> Chủ dự án là **Đức** (non-tech, tiếng Việt, câu ngắn). Đức là người chốt duy nhất.

## 0. Ba việc phải làm, theo đúng thứ tự

1. **Mở phiên:** đọc file này → đọc `AGENTS.md` của package mình sắp đụng → đọc `HANDOFF.md`
   của package đó (phần cuối = trạng thái mới nhất).
2. **Làm việc:** một việc một lúc. Phát sinh việc ngoài phạm vi → ghi vào `BACKLOG.md`, không tự làm.
3. **Đóng phiên:** chạy cổng kiểm dưới đây. Đỏ thì chưa xong.

```bash
node scripts/session-check.mjs --as <tên-phiên-của-bạn>
```

Không được báo "xong" khi cổng kiểm chưa xanh. Không được tự sửa cổng kiểm cho nó xanh.

### 0b. THỨ TỰ ĐÓNG PHIÊN — sai thứ tự là tự nhân đôi thời gian

`--sua → sửa → --soat → commit → --xong → sinh lại artifact → commit → npm run test:song-song → cổng → safe-push`

- **`npm run test:song-song` chạy SAU commit.** Bộ chạy để lại một *dấu xác nhận* buộc vào HEAD +
  băm cây làm việc; cổng thấy dấu còn hiệu lực thì **không chạy lại suite**. Commit sau khi chạy
  là đổi cây → dấu hỏng → cổng chạy lại từ đầu. Đo cùng cơ chế ở bộ khung: **1.095 → 278 giây**.
- **Trong lúc làm đừng chạy đủ bộ** — `node scripts/chay-test.mjs --chi <tên-suite>`, cố ý KHÔNG
  ghi dấu. Đủ bộ chạy **một lần**, ở cuối.
- **Đừng đổi `scripts.test`** — nó vẫn là chuỗi TUẦN TỰ, cố ý: một phép ghim trong `duc-auto-*`
  đọc thẳng trường đó để bắt "xanh giả".
- **Bộ sinh nào ghi vào một sổ CÓ RÀNG BUỘC thì chạy MỘT LẦN, sau khi suite xanh.**

**Push thì KHÔNG dùng `git push`** — `git push` của bạn cuốn theo commit của **mọi phiên khác**
đang dùng chung thư mục git này (đã xảy ra thật 26/08). Dùng:

```bash
node scripts/safe-push.mjs --as <tên-phiên-của-bạn>
```

## 1. Ai giữ package nào — chống hai AI giẫm chân

Bảng chủ sở hữu là `.agents/claims.json`. **Một vùng chỉ có MỘT phiên AI được ghi tại một
thời điểm**, và mọi thao tác đi qua lệnh — đừng sửa file bằng tay.

```bash
node scripts/claim.mjs --list
node scripts/claim.mjs --take <khoá> --as <tên-phiên> --task "một câu"
node scripts/claim.mjs --release <khoá> --as <tên-phiên>
node scripts/claim.mjs --khai-vung <khoá> --as <tên-phiên>   # mở MỘT VÙNG MỚI
```

### Khoá mức FILE — giữ ngắn, trả ngay (Đức chốt 08/09)

**Mặc định từ nay là khoá FILE, không phải khoá vùng.** Nhận ngay TRƯỚC lượt ghi, trả ngay SAU.
**Chỉ đọc thì không cần gì cả.** Còn nhận cả vùng khi bạn thật sự sửa khắp nó.

```bash
node scripts/claim.mjs --sua <đường-dẫn> [<đường-dẫn>…] --as <phiên>   # trước khi ghi
node scripts/claim.mjs --soat --as <phiên>                            # trước git commit
node scripts/claim.mjs --xong --het --as <phiên>                      # ngay sau khi ghi xong
git config core.hooksPath .githooks                                   # một lượt, xong cho mọi lane
```

Vì sao: **[ĐO 7 ngày]** 2.628 cặp commit khác lane, cùng vùng, cách nhau ≤ 1 giờ — **1.839 cặp
(70%) không đụng file nào chung**. Bảy phần mười lượt chặn hôm nay là chặn oan. Cân nhắc đầy đủ
ở [ADR-0025](docs/adr/0025-khoa-muc-file-giu-ngan-tra-ngay.md).

- **Chứa nhau hai chiều.** Vùng có chủ khác → khoá file bị từ chối; bên trong còn khoá file của
  người khác → nhận cả vùng bị từ chối.
- **Khoá FILE trả lúc HẾT PHIÊN. Khoá VÙNG trả SAU KHI ĐẨY.** Hai loại khoá, hai mốc, đừng lẫn.
  Cổng đóng phiên ĐỎ nếu bạn còn treo khoá file. Đẩy không được thì **giữ khoá vùng** và báo
  lại — commit chưa đẩy mà vùng đã trống chủ thì cổng đỏ với phiên đến sau.
- **`--soat` bắt buộc trước `git commit`.** Nó vá chỗ khoá không chữa được: hai lane dùng chung
  MỘT cây git, nên `git commit -a` cuốn file lane khác vừa dàn (`N-40`) và `git commit -o` cuốn
  sửa đổi của họ trên chính file đó (`N-05`). Chốt `commit-msg` chạy nó ngay trong lượt commit,
  bịt cửa sổ giữa soát và commit (`N-49`); nó **fail-open** ba chỗ và chỉ chặn khi vi phạm thật.
  Kẹt thì `git commit --no-verify` rồi **nói ra trong nhật ký phiên**.


- Vùng đang có chủ, mà chủ không phải bạn → **chỉ được đọc, tuyệt đối không sửa**.
- **Nhận ngay TRƯỚC lượt ghi đầu tiên, không phải lúc mở phiên.** Cần khoá thứ hai giữa chừng
  thì nhận thêm lúc cần — đừng gom sẵn. Một lane, **một khoá worker**.
- **Đừng nhả khoá hộ lane khác**, kể cả khi cổng nêu tên nó là quá hạn hay "chưa thấy dấu vết
  trong repo". Câu đó nói **repo chưa thấy gì**, nó không nói lane đó rảnh. Ba đường hợp lệ để
  một khoá được trả: **chính lane đó trả** · **lane đó báo đã xong** · **Đức chốt chuyển**
  (`--restamp --as <phiên> --duc-duyet "<câu chốt>"`). Thấy khoá nằm lâu thì **hỏi**, đừng nhả.
  Không có câu chốt thì `--restamp` từ chối, kể cả khi bạn đã sửa tay xong.
- **Đừng sửa `claims.json` bằng tay.** Sửa tay là đọc-sửa-ghi, và một quyền đã bị ghi đè im lặng
  vì thế. Mở một vùng mới thì dùng `--khai-vung`, đừng sửa tay rồi `--restamp` — hai thứ đó
  trông giống hệt nhau ở lượt đọc sau (`N-41`).
- **Đừng nối `claim.mjs` vào ống.** Mã thoát của một đường ống là mã thoát của lệnh **cuối**, nên
  `claim.mjs --take … | tail -3 && git commit …` chạy tiếp cả khi lệnh nhận khoá đã **TỪ CHỐI**.

**Gốc repo chia làm NHIỀU khoá** — nhận đúng vùng mình đụng, không nhận cả gốc. Cổng đóng phiên
nói tên khoá còn thiếu. Ai chia vùng thì khai `steward` trong khối `areas` của `.repo-structure.json`.

| Khoá | Che gì |
|---|---|
| `_docs` | `docs/` |
| `_code` | `scripts/` + `tests/` |
| `_root` | phần còn lại và các file ở tầng ngoài cùng |

**Năm artifact máy sinh KHÔNG đòi khoá nào:** `DASHBOARD.md` · `llms.txt` · `repo-map.json` ·
`DASHBOARD-Chrome-Extension-AI-Agentic.html` · `FEATURE-PARITY-AUTO.md`. Chạy lại bộ sinh là ra
y hệt nên không có gì của ai trong đó để mất; danh sách khai ở khối `generated`.
`FEATURE-PARITY.md` **cố ý không** nằm trong đó — mục 2 của nó là chữ của người (xem mục 6).

**File được MIỄN chia làm HAI LOẠI:**

- **Miễn vô điều kiện:** `.agents/claims.json` — không miễn thì chính thao tác trả quyền cũng bị
  coi là sửa file gốc.
- **Miễn KHI CHỈ THÊM DÒNG Ở CUỐI:** `HANDOFF.md` gốc · `IDEAS.md` · `BACKLOG.md` gốc. Ba quyển
  này mọi lane đều phải ghi, nên bắt xếp hàng sau `_root` là tự chặn luật của mình. **Sửa hay
  xoá dòng cũ thì KHÔNG được miễn** — nhưng nếu bạn đang **giữ khoá** đúng file đó thì được, vì
  miễn khoá nghĩa là "không cần khoá", không nghĩa là "có khoá cũng không được". Cửa RA của sổ
  cũng chỉ là **thêm một dòng ở cuối**, đừng sửa khối cũ.

Danh sách loại thứ hai khai ở `append_only_exempt` trong `.repo-structure.json` — **sửa ở đó,
đừng sửa script**: hai bản sao của một luật đã trả hai câu khác nhau cho cùng một file.

> **Vì sao từng luật trên tồn tại, kèm ngày nó nổ và số đo:** `docs/protocols/MULTIFLOW.md` mục 4
> (sáu bất biến) và các ADR được nhắc tên. Ở đây cố ý chỉ giữ **luật và câu lệnh** — giới hạn ⑦.


## 2. Ba việc PHẢI hỏi Đức trước

1. Thêm quyền (permission) mới cho extension
2. Chạy pilot live mới trên trang thật
3. Đổi luật an toàn (retry, halt, attribution, persistence, exact-once)

Ngoài ra, luật gốc của Đức: không gửi gì ra ngoài, không xoá file, không sửa dữ liệu gốc,
không tạo automation tự chạy — nếu chưa hỏi.

**Commit và push được tự làm** (Đức chốt 26/08, áp cho MỌI AI) — nhưng chỉ khi đủ cả ba: ⑴ việc
hoàn tất trọn vẹn, việc dở dang thì KHÔNG push · ⑵ cổng kiểm XANH TOÀN BỘ, và với code thì đã qua
audit độc lập · ⑶ đẩy bằng `safe-push.mjs`. Lý do Đức đổi luật: Đức không đọc được code local, GPT
audit qua GitHub connector, nên commit chưa push là **vô hình** với vòng kiểm tra chéo.

**`--carry` KHÔNG phải hỏi** ([ADR-0005](docs/adr/0005-duyet-thuong-truc-cho-push-va-carry.md)) —
đổi lại, **mọi lượt `--carry` phải kể tên lane bị cuốn theo trong nhật ký phiên**; đó là thứ duy
nhất còn lại để truy. Ba việc vẫn phải hỏi: **force-push, sửa lịch sử, merge nhánh vào `main`**.

**MỌI commit phải có dòng cuối `Lane: <tên-phiên>`** — đúng tên bạn đưa cho `--as`, một dòng,
không dấu cách. Thiếu nhãn thì cổng ĐỎ **và `safe-push` từ chối đẩy**; `--carry` không mở được cửa
đó, vì nó duyệt "đẩy kèm việc của X" mà commit không nhãn thì không có X. Nhãn là **nguồn gốc,
không phải quyền** — ai được ghi vẫn do mục 1 quyết. Không nhãn thì `safe-push` phải đoán theo chủ
vùng *lúc chạy*, mà chủ đổi được sau lúc commit, nên nó quy sai **cả hai chiều**: chặn oan việc
bạn, hoặc im lặng cuốn việc người khác lên remote. Nhãn hỏng thì ĐỎ, không đoán —
`git commit --amend`.

## 3. Năm luật vàng — và bảy giới hạn cứng

**Bảy giới hạn Đức chốt 2026-09-07.** Lý do, **đo lại bảy ngày**: trong **738 commit** chỉ **78
(11%)** chạm mã extension chạy thật, còn **468 (63%)** chạm tài liệu + sổ nợ và **142 (19%)** chạm
artifact + bảng quyền. Hệ đang tự bảo trì chính nó, nên từ nay **xoá là thắng, thêm là thua**.
Bảy giới hạn dưới đây đứng trên **tỉ lệ commit**, không trên số dòng — đừng dẫn lại câu *"hạ tầng
lớn hơn mã sản phẩm"* của bản giao việc gốc, đếm lại thì mã `workers/` **hơn gấp đôi** hạ tầng.

1. **KHÔNG CÒN TRẦN SỐ GÓI — Đức mở băng toàn bộ 08/09**, cả năm gói đều SỐNG
   ([ADR-0024](docs/adr/0024-mo-bang-toan-bo-nam-goi.md)). Cơ chế đóng băng **không bị gỡ**:
   khối `frozen` để rỗng, không xoá — nó là công tắc Đức bật lại được. Cái mất, biết trước:
   trần này là thứ duy nhất chặn số gói phình, nay **giới hạn ⑥ và ② phải gánh thay** — đừng
   nới tiếp cái nào trong hai.
2. **Cấm cài một tính năng hai lần.** Cần ở hai gói → vào `workers/_shared/` trước. Ba gói
   `duc-auto-*` là fork của nhau (**82.252 dòng**, ba `sidepanel.js` riêng dài 6.451 · 5.230 ·
   5.206), nên mỗi lỗi phải sửa ba lần — 07/09 đúng ba lần (`N-14`).
3. **`docs/` ≤ 8.000 dòng — ĐÍCH, và một THƯỚC CÓC canh đường đi.** Đích là chữ của Đức; thứ
   **máy canh** là `docs.tran_dong_khong_ke_adr` — con số của HÔM NAY, không kể ADR. Cổng ĐỎ khi
   vượt, và tự nhắc HẠ con số khi bạn đã dưới thước ≥ 50 dòng. Vì sao không canh thẳng 8.000: một
   phép kiểm đỏ với MỌI phiên trong nhiều tuần là một phép kiểm sẽ bị gỡ. Cắt docs cần khoá `_docs`.
4. **Sổ nợ hạ tầng ≤ 15 mục.** Đếm lại, đừng tin dòng này: `node scripts/backlog-check.mjs`.
   Vượt trần thì cổng ĐỎ; cửa ra là **đóng một mục** — thêm dòng `- **ĐÓNG <mã>** · …` ở CUỐI sổ.
   Trần khai ở `backlog.tran`, **hỏi Đức trước** khi đổi. Cho tới 07/09 mục này tự khai *"không
   có máy cưỡng chế"* và nó vỡ đúng chỗ mù ấy: trần phải nâng 10 → 15 **sau khi đã vỡ**.
5. **File test bắt 0 đột biến thì XOÁ.** Một phép kiểm không bắt được gì vẫn thu thuế mọi phiên.
6. **Song song thì tối đa 2 chat.** Đức nói rõ 07/09: *"lane ở đây tôi hiểu là 2 phiên chat với
   AI; trong 1 chat mà bạn manage cùng lúc 5 task chạy ngầm không giẫm chân nhau thì tôi vẫn ok"*
   — nên **số tác vụ ngầm TRONG một chat không bị giới hạn**.
7. **Một luật vào thì một luật ra.** Thêm luật vào file này phải **kể tên luật nó thay**, hoặc
   **đo được nó đã nổ mấy lần**. Và nay có máy canh: `agents.tran_dong` trong
   `.repo-structure.json`, cùng kiểu thước cóc như ③ — cổng ĐỎ khi file này DÀI RA. Vì sao cần:
   giới hạn này ra đời 07/09 với `wc -l` **291**, và trong hai ngày file phình lên **402** mà
   không gì kêu. **Chỗ để kể chuyện là ADR, không phải đây** — hiến pháp giữ luật và câu lệnh.

### Năm luật vàng

1. **Không đoán selector.** Mọi selector phải có bằng chứng DOM thật. Cần bằng chứng mới →
   gọi `diagnostics.dom_probe` qua Bridge, đừng mượn mắt Đức.
2. **Mỗi fix một test ghim.** Suite không chạm DOM thật, nên fixture bằng chứng là vàng.
3. **Không làm yếu lớp bảo vệ đã có** để cho test xanh. Sửa bug được; gỡ bảo vệ thì không.
4. **Kiểm chứng độc lập mọi báo cáo của AI khác.** Tự chạy lại test, tự đọc lại diff.
   Agent phụ báo "xong" không phải bằng chứng.
5. **Viết cho mắt Đức đọc.** Đức đọc không hiểu = lỗi hệ thống, viết lại đơn giản hơn.
   Chữ operator nhìn thấy: tiếng Việt. Mã lỗi (CODE): tiếng Anh.

## 4. Vùng cấm sửa

- `pilot-*/`, `Pilot-*/`, `Batch-*/`, `evidence/` — **bằng chứng vận hành**: chỉ được THÊM mới, không sửa, không xoá, không tạo lại.
- Không bao giờ để token / mật khẩu / file pairing vào repo.
- Không bao giờ gán `.innerHTML` / `.outerHTML` / `insertAdjacentHTML`.

## 5. Vai từng AI — chia theo VIỆC, không chia theo hãng

**Đức chốt 08/09 ([ADR-0017](docs/adr/0017-hai-vai-assistant-thay-the-mot-cua.md)).** Bảng cũ chia
việc theo tên hãng (Claude / Codex / Antigravity) — **đi ra**, vì đếm nhãn `Lane:` của mọi commit
14 ngày thì **Antigravity 0 · Codex 0**: nó phân việc cho hai bên chưa từng ghi một dòng nào.

Thay bằng **HAI VAI, chia theo hướng đi của việc**. Vai là của **PHIÊN**, không của hãng: hãng nào
cũng đóng được vai nào, và một phiên đóng **đúng một vai** cho tới khi đóng phiên.

| Vai | Giữ gì | Việc chính | KHÔNG được |
|---|---|---|---|
| **Đức** | — | Chốt mọi thứ | — |
| **① Giữ lõi** | luật · bộ máy · trạng thái của repo này | mỗi bản vá kèm **một phép kiểm ghim** · xoá luật không nổ lần nào · giữ cổng kiểm còn răng | nới một lớp bảo vệ cho cổng xanh · **tự ký nghiệm thu việc của chính mình** |
| **② Phát & thu** | cửa duy nhất giữa repo này và bên ngoài | thi hành quy trình lên repo/gói khác · **mang chỗ vấp về** thành mục sổ nợ · tối ưu chính quy trình đó | sửa lõi để việc bên ngoài chạy được — chỗ vấp phải **về Vai ①** · báo một quy trình ĐẠT khi chưa chạy thật |

**Bất biến chịu tải: người SỬA không tự NGHIỆM THU bản sửa của mình.** Một tờ nghiệm thu do bên bị
kiểm ký là **lời tự khai, không phải hàng rào** — đúng luật mà `SELF_ATTESTATION` cưỡng chế trong
lõi quyền. Nhưng **đừng đọc thành "người sửa không được TÌM lỗi"**: vai nào cũng được tìm lỗi ở
bất kỳ đâu; thứ phải tách là **người ký** khỏi **người sửa**.

**Bàn giao giữa hai vai chỉ có một hình dạng:** Vai ② ghi chỗ vấp vào `BACKLOG.md` (kèm trường
`đóng khi:`), Vai ① biến nó thành **bản vá cộng một phép kiểm ghim**. Nhắn thẳng *"sửa hộ tôi"* là
mất dấu vết. Đây là **vế duy nhất máy kiểm được** (`npm run test:backlog`); phần *"② phát hiện ·
① sửa"* là **chữ, không phải luật** — nói thẳng ra để không ai tin nó đang được cưỡng chế.

**Hai vai có thể cùng lúc trong repo, nhưng KHÁC VÙNG** (mục 1), và vừa khớp trần 2 chat của
giới hạn ⑥.

**Cửa vào của từng AI** — cách file này đến được tay bạn:

| AI | Cách nạp | Đức phải làm gì |
|---|---|---|
| Claude | Tự đọc `CLAUDE.md` gốc → trỏ sang file này | Không phải làm gì |
| Codex | Tự đọc `AGENTS.md` gốc | Không phải làm gì |
| Antigravity | Dán **một câu mở màn**: *"Đọc AGENTS.md ở gốc repo trước khi làm gì."* | Dán 1 dòng mỗi phiên |

Antigravity thử live 26/08: nó đọc file này và tự kết luận "package có chủ rồi nên tôi chỉ được
đọc". Luật dùng được — nhưng chưa chứng minh được nó **tự** nạp lúc mở phiên, nên câu mở màn là
bắt buộc.

## 6. Sổ tay mở khi cần — Tầng 2

Không đọc trước. Tới việc nào thì mở sổ tay đó.

| Khi bạn sắp… | Mở file |
|---|---|
| **Đụng ba gói `duc-auto-*`** (`chatgpt` · `gemini` · `gg-flow-video`) | **Làm được, từ 08/09** — Đức mở băng ([ADR-0024](docs/adr/0024-mo-bang-toan-bo-nam-goi.md)). Sổ tay từng gói nằm TRONG gói: `workers/<gói>/<phiên-bản>/AGENTS.md`, sổ nợ và `HANDOFF.md` cạnh nó. Đọc trước khi sửa — ba gói là **fork của nhau** (giới hạn ②), nên một lỗi thường có ba bản sao, và vá một bản là để lại hai. Còn ai đang đóng băng gói nào không thì xem khối `frozen` của `.repo-structure.json`, đừng tin dòng này |
| **Là phiên ĐIỀU PHỐI: Đức hỏi "đang có gì · làm gì tiếp · việc nào chạy song song được"** | `docs/protocols/ORCHESTRATOR.md` — sổ tay vai điều phối: đọc gì lúc mở phiên, luật song song, **HARD ROLE FIREWALL** (Đức chốt 04/09 — vai điều phối KHÔNG code, KHÔNG debug product, KHÔNG đề xuất patch; không có ngoại lệ "sửa nhỏ"), **luật nạp báo cáo năm mục** (`DONE → STATE CHANGE → BLOCKER → HUMAN DECISION → NEXT WORK` rồi DỪNG), **lối ra bàn giao cho executor**, khi nào phải hỏi Đức. Công cụ đi kèm: `node scripts/what-next.mjs` — bản đồ việc, **chỉ đọc, không đòi khoá nào**, giao ba nguồn mà trước đây không giao được với nhau (bảng quyền × sổ nợ từng gói × sổ ý tưởng) |
| **Biết Đức đã chốt gì, và vì sao** | **ADR** — mỗi quyết định một file bất biến. Luật: `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md` · bản mẫu: `docs/_TEMPLATE-adr.md` · quyết định của cả repo ở `docs/adr/`, của một gói ở `workers/<gói>/<phiên-bản>/docs/adr/`. `decisions.md` của package nay là **mục lục** trỏ sang ADR. ADR đã `Accepted` là bất biến, phép kiểm B12 cưỡng chế |
| **Sắp ghi một mục nhật ký, hoặc bị cổng chặn vì mục quá dài** | `docs/protocols/HANDOFF.md` — một mục chứa gì và KHÔNG chứa gì (lý do → ADR · việc còn nợ → `BACKLOG.md` · cách làm → brief), **trần 2.600 byte một mục** khai ở `.repo-structure.json` và cổng đóng phiên chặn **đúng mục bạn vừa thêm**, và cách xoay file theo tháng. Quyết định gốc: [ADR-0011](docs/adr/0011-handoff-chan-o-dau-vao-va-xoay-theo-thang.md). Công cụ: `node scripts/handoff.mjs --check` (đo) · `--rotate <file>` (xoay sang tháng mới) |
| Biết phiên trước làm tới đâu | `HANDOFF.md` của package (cuối file) · việc ở gốc repo: `HANDOFF.md` gốc — **cả bốn file nay chỉ giữ 20 mục cuối** (ADR-0008) |
| **Cần đào lịch sử xa hơn 20 mục** | `HANDOFF-ARCHIVE-*.md` **cạnh chính file `HANDOFF.md` đó** — gốc repo có `HANDOFF-ARCHIVE-01.md` (62 mục, cắt 06/09) và `HANDOFF-ARCHIVE-02.md` (40 mục, cắt 09/09); ba worker mỗi gói một file cùng tên. Chúng nối thành **chuỗi**: `-02` mang theo con trỏ trỏ về `-01`, cứ thế đi ngược. Cắt tiếp: `node scripts/handoff.mjs --cat <file> --giu 20`. **Nguyên văn, không sửa một chữ; chỉ đọc.** Ghép lại dựng được bản gốc giống hệt từng byte (bất biến ⑴ của ADR-0008, có SHA-256 in ngay đầu file lưu trữ). Ghi Log mới thì vẫn ghi vào cuối `HANDOFF.md` |
| **Biết nhánh mình đang thiếu tính năng gì so với nhánh kia** | **HAI file, đọc cùng nhau** ([ADR-0014](docs/adr/0014-tach-khoi-may-sinh-cua-bang-doi-chieu.md)): `FEATURE-PARITY.md` ở gốc repo là **chữ của người** — mục 2 (tính năng hành vi, có bằng chứng **[ĐỌC]**) và phần diễn giải; sửa nó thì phải giữ `_root`. `FEATURE-PARITY-AUTO.md` là **số của máy** — method Bridge, so module, nợ *method*; **SINH TỰ ĐỘNG, miễn khoá**, sinh lại: `node scripts/feature-parity.mjs` |
| **Mở phiên AI mới và cần hiểu repo trong một lần đọc** | `llms.txt` ở gốc repo — cổng vào chuẩn llmstxt.org, **SINH TỰ ĐỘNG**; bản đồ máy đọc đi kèm: `repo-map.json` (hợp đồng cross-repo, có `schema_version`). Sinh lại: `node scripts/build-dashboard.mjs` |
| **Muốn biết repo có extension nào, cái nào dùng được, đã kiểm chứng chưa** | `DASHBOARD.md` ở gốc repo — **SINH TỰ ĐỘNG, đừng sửa tay**; sinh lại: `node scripts/build-dashboard.mjs` |
| Hiểu cách vận hành nhiều extension trong một repo, hoặc thêm extension mới | `PLATFORM.md` ở gốc repo |
| Khai trạng thái cho một extension (mới hoặc cũ) | `STATUS.template.md` ở gốc repo → chép thành `STATUS.md` đặt cạnh `manifest.json` |
| **Muốn biết repo đang nợ gì về cấu trúc điều hướng** | `node scripts/check-bootstrap.mjs` — 15 phép kiểm B1…B15, mỗi dòng nói cả chỗ sai lẫn cách sửa. Thêm `--all` để xem hết. **Từ phiên S7 (2026-09-02) tám phép kiểm CHẶN THẬT:** `B1 B2 B3 B4 B5 B7 B10 B12` đỏ thì cổng đóng phiên đỏ theo, không được báo xong. Bảy phép kiểm còn lại (`B6 B8 B9 B11 B13 B14 B15`) vẫn chỉ cảnh báo. **B15 cưỡng chế luật vàng 5:** ba trường `current_focus` · `next_step` · `human_action` là chữ Đức đọc trên bảng, viết không dấu thì báo vàng. Danh sách chặn khai ở `bootstrap.blocking` trong `.repo-structure.json` — sửa ở đó, đừng sửa script |
| **Lấy dữ liệu phái sinh HNX hằng ngày, hoặc sửa gói đó** | `workers/hnx-fetch/PROTOCOL.md` — sổ tay vận hành **tự đứng một mình**, viết cho AI không phải Claude Code: fetch · đối chiếu · kiểm toàn vẹn · bảng mã lỗi. Luật gói ở `workers/hnx-fetch/AGENTS.md`, khoá `workers/hnx-fetch`. Tách khỏi Scouter 08/09 ([ADR-0021](docs/adr/0021-hnx-fetch-tach-thanh-extension-rieng.md)). Chỗ dễ hiểu nhầm: extension này **không có quyền `debugger`** nên nó không bấm được gì — cần bấm thì đó là việc của Scouter |
| **Sửa hoặc vận hành Scouter** (dò trang · báo cáo qua Bridge · tự nạp lại mình) | `workers/duc-scouter/v0.1.0/AGENTS.md` — gói riêng từ 06/09 ([ADR-0013](docs/adr/0013-scouter-ra-nha-rieng-co-khoa-rieng.md)), khoá `workers/duc-scouter`. Nó **không** mang tiền tố `duc-auto-` vì nó không tự động hoá nhà cung cấp nào. Hai chỗ dễ vấp, đọc trước khi sửa: **selector không bao giờ được gõ vào seed** (ranh giới seed/adapter, ADR-0009 mục ⑵), và **cửa Bridge của nó bắt tay HAI CHIỀU** nên chỉ nối được với máy chủ bản ChatGPT — hai bản host cũ nhận token trần |
| **Tìm một tài liệu, hoặc tra đường dẫn `drafts/…` cũ nay nằm đâu** | `docs/README.md` — mục lục bốn tầng (studies · briefs · archive · adr), kèm bản đồ 33 đường dẫn cũ → mới. Thư mục `drafts/` ở gốc repo **đã biến mất** từ phiên S6 (2026-09-02) |
| Viết một file nghiên cứu mới trong `docs/studies/` | `docs/_TEMPLATE-study.md` — bản mẫu: frontmatter 3 trường (`kind`/`status`/`ttl_days`), số liệu lấy từ nguồn máy sinh · hồ sơ đã nghỉ thì **xoá**, git giữ hộ (`docs/archive/` bỏ 08/09); mục lục: `docs/README.md` |
| **Lấy bộ chuẩn về dùng cho repo khác, hoặc sửa bộ chuẩn** | **KHÔNG CÒN Ở REPO NÀY.** Bộ khung đã dọn ra nhà riêng 03/09 theo ADR-0001: `https://github.com/anhducds-GIT/Ark_Repo_Harness`. Repo này nay là một **người dùng** của bộ khung, không phải nơi phát hành nó — sửa bộ khung thì sửa ở đó |
| **Sửa gói Assistant (vai điều phối): `what-next.mjs` · `state-check.mjs` · `ORCHESTRATOR.md` · suite ghim của chúng** | **BỘ KHUNG NAY LÀ NƠI PHÁT HÀNH, repo này là NGƯỜI TIÊU THỤ** (Đức chốt 05/09 — [ADR-0006](docs/adr/0006-goi-assistant-phat-hanh-tu-bo-khung.md)). Gói đã vào `template/` của bộ khung ở **bản 1.3.0**. **Cải tiến làm ở bộ khung TRƯỚC**, rồi mới về đây — làm ngược lại là đẻ ra hai bản khác nhau của cùng một gói, và bản nào cũng tự xưng là bản chuẩn |
| **Nhận hoặc trả quyền một gói** | `node scripts/claim.mjs --take <khoá> --as <phiên> --task "một câu"` · trả: `--release`. **Đừng sửa `claims.json` bằng tay nữa** — làm tay là đọc-sửa-ghi, và ngày 02/09 đã có một quyền bị ghi đè im lặng vì thế. Lệnh này TỪ CHỐI nếu gói đã có chủ khác, TỪ CHỐI trả quyền hộ người khác, và ghi rồi đọc lại để kiểm |
| **Đặt một tệp ghép cặp, bộ khởi động, hay vùng ghi của Bridge — BẤT KỲ gói nào** | **Đừng tự chọn chỗ.** Mọi thứ thuộc Bridge nằm dưới `C:\WORKING ZONE\Chrome Extension Bridge\<tên-gói>\`, khai ở khối `thu_muc_ngoai_repo` của `.repo-structure.json` — **sửa ở đó, đừng gõ cứng vào mã**. Dùng `node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --goi <tên-gói>`: nó đọc bản đồ và tự đặt đúng chỗ. Vùng ghi **luôn là thư mục CON**, vì `file.read` đọc được mọi tệp dưới vùng ghi — trỏ vào chính thư mục gói là để token đọc được qua dây. Quy ước này đã tồn tại từ trước và **vẫn bị đặt sai vài lần** (08/09 lần gần nhất), nên nó nay là mặc định của công cụ chứ không chỉ là dòng chữ này |
| **Cổng báo `DAU_VO` — bảng quyền bị sửa tay** | Từ 03/09 bảng có **dấu niêm phong**, và sửa tay làm dấu vỡ. Lý do: lệnh trên giữ *đường ghi*, nhưng không gì giữ chính file — ngày 03/09 cả bốn khoá gốc bị đổi chủ một lượt đi vòng qua lệnh, và phiên đang làm dở không hề biết. Dấu vỡ thì `claim.mjs` **từ chối ghi** (mã 3) và cổng đóng phiên **ĐỎ với MỌI phiên** — cố ý, vì người cần biết nhất là người vừa BỊ mất khoá, mà họ chỉ chạy cổng chứ không chạy lệnh. Gặp thì: `git diff .agents/claims.json` → khoá của bạn có bị đổi chủ không → có thì **hỏi Đức** (luật mục 1) → chốt xong mới `node scripts/claim.mjs --restamp --as <phiên>`. **Đừng restamp cho xong việc** — làm thế là đóng dấu hợp lệ cho vụ sửa tay và xoá luôn tang chứng. Sửa văn xuôi `_doc` / `_labels` KHÔNG làm vỡ dấu. **Từ 04/09 câu "đừng restamp cho xong việc" không còn chỉ là lời khuyên:** nếu lượt sửa đó CHUYỂN CHỦ một khoá khỏi tay người khác, `--restamp` **từ chối** (mã 3) cho tới khi bạn đưa `--duc-duyet "<câu chốt của Đức>"` — và câu đó được ghi **vào bảng** (`taken_from` · `taken_by` · `duc_decision`), không phải in ra màn hình. Lý do: ngày 04/09 một khoá bị lấy khỏi tay phiên đang làm dở đúng bằng đường sửa-tay-rồi-restamp, kèm một `taken_from` **viết tay** — trường đó công cụ chưa bao giờ sinh, nên nó không chứng minh gì cả. Người cần đọc câu chốt là phiên vừa mất khoá, mà họ chỉ đọc bảng chứ không chạy lệnh |
| **Sắp làm cùng lúc với AI khác, hoặc sắp SỬA một trong bốn cơ chế đa phiên** | `docs/protocols/MULTIFLOW.md` — cơ chế nhiều phiên song song **và cách bảo trì nó**: bốn cơ chế (bảng chủ sở hữu · nhãn `Lane:` · cổng đóng phiên · cổng xuất bản), một ngày làm việc 5 bước, **sáu bất biến kèm lý do từng cái**, quy trình đổi cơ chế (có **đột biến kiểm** bắt buộc — đếm được 4 lần trong một ngày một chốt vừa viết ra hoá ra vô tác dụng mà test vẫn xanh), bảng tra mã lỗi, và mục "cố ý KHÔNG làm". Mục 1–3 viết cho Đức đọc. **Cố ý không chứa số đo** — số mục ruỗng, nên nó chỉ đưa câu lệnh để tự đo |
| **Hiểu vì sao nhiều phiên hay va nhau, và các phương án đã cân** | `docs/studies/PARALLEL-WORK-DESIGN-V0.md` — đo thật ngày 02/09: 127 commit/ngày, 77% chạm `_root`, 63 lần ghi bảng quyền. Tách **hai vấn đề khác nhau**: quyền bị ghi đè (bug, đã vá bằng lệnh trên) và push cuốn theo commit người khác (hệ quả của một nhánh, chưa chốt phương án) |
| **Đức cần một câu để dán cho AI, không muốn nhớ lệnh** | `PROMPTS.md` ở gốc repo — mỗi flow một khối: *dùng khi nào · câu để dán · AI sẽ chạy lệnh gì · xong khi nào*. **Luật của file đó: mỗi câu phải chạy được với CẢ BA AI**, nên câu nào cũng chỉ nói mục tiêu, không nói tên công cụ. Câu nào chỉ một AI làm được thì phải xuống mục cuối kèm cách làm thay. Đầu file có bảng **đo thật 03/09** về việc ba AI làm được gì |
| **Xem bảng trạng thái mà không cần AI đăng hộ** | `DASHBOARD-Chrome-Extension-AI-Agentic.html` ở gốc repo — **SINH TỰ ĐỘNG, đừng sửa tay**. Mở trực tiếp bằng trình duyệt. Sinh lại: `node scripts/build-overview.mjs`. Nội dung **suy hoàn toàn từ HEAD**, cố ý: nó nằm trong khối `generators` nên cổng kiểm nó mỗi phiên, và nếu nó phụ thuộc giờ đồng hồ thì sang ngày mới là **mọi phiên bị chặn push** dù không dữ liệu nào đổi. Việc báo cũ do đoạn JS trong trang tự tính lúc MỞ trang. Trước 03/09 bảng chỉ tồn tại dạng artifact trên claude.ai — tức là điểm phụ thuộc Claude duy nhất của cả hệ; file này xoá bỏ chỗ đó |
| **AI vấp một chỗ hỏng về HẠ TẦNG repo khi đang làm việc khác** | `BACKLOG.md` ở gốc repo — **sổ nợ hạ tầng của AI**, tách khỏi `IDEAS.md` ngày 06/09. Miễn khoá y như `IDEAS.md`, và **cửa ra cũng chỉ là thêm một dòng ở cuối**. Trường `đóng khi:` là **bắt buộc** và cổng đếm nó (`npm run test:backlog`): không khai được điều kiện đóng thì mục đó chưa đủ chín để ghi. Nợ của MỘT gói worker thì vẫn về `BACKLOG.md` của gói đó |
| **Đức có một ý tưởng, hoặc muốn biết đang có những hướng nào chờ làm** | `IDEAS.md` ở gốc repo — **phòng chờ**, không phải roadmap thứ hai. Hai trường bắt buộc: `bậc` và `việc kế`. Đang xây thì PHẢI khai `chủ` + `phạm vi` — đó là thứ cho phép nhiều phiên chạy song song mà không giẫm chân. Ý tưởng có nhà rồi thì rời sổ (điền `nhà:`), đừng chép lại |
| **Sắp cho Scouter bấm nút, hoặc nghi ngờ trang phát hiện được cú bấm của máy** | `node workers/duc-scouter/v0.1.0/scripts/scouter-input-trust-probe.mjs` — phép đo ① của Scouter, **đã chạy 06/09 và ĐẠT** trên Chrome 152: bấm qua `chrome.debugger` cho `isTrusted: true` và mở được cổng hoạt động, còn `element.click()` mà ba worker đang dùng thì không. Nó tự dựng trang thử trong thư mục tạm, **không đụng trang thật**. Số đo đầy đủ kèm ba cái bẫy gặp thật: mục 4.1.1 của `docs/studies/SCOUTER-CAPABILITY-INVENTORY-V1.md`. Mã thoát 2 nghĩa là phép đo KHÔNG CHẠY được — khác hẳn "không đạt", đừng ghi nó vào bảng kiểm kê |
| **Đức muốn tự xem bảng mà KHÔNG phải nhờ AI** | `bang-trang-thai/` ở gốc repo — **ba cửa, một thư mục, một lõi** (`BRIEF-BANG-BA-CUA-01`, Đức nêu 06/09): ① nhấp đúp `Xem-bang.cmd` · ② `Mo-may-chu.cmd` mở máy chủ tại chỗ (chỉ nghe `127.0.0.1`, **không có đường ghi nào**), trong trang có nút Làm mới · ③ `Bat-tu-chay.cmd` / `Tat-tu-chay.cmd` cài–gỡ mục tự chạy lúc khởi động Windows (thư mục Startup của người dùng, **không cần quyền quản trị** — Đức duyệt tường minh 06/09). Lõi chung: `bang-trang-thai/loi.mjs`. **Bốn chốt an toàn, phép ghim `tests/bang-ba-cua-smoke.mjs` cưỡng chế cả bốn:** phiên nào đang giữ `_code` thì NGỪNG sinh và **trang nói rõ vì sao** (bộ sinh nằm trong vùng đó, có thể đang sửa dở) · chỉ sinh bảng HTML, **cấm** chạy bộ sinh đối chiếu tính năng · không commit / đẩy / nhận khoá — cả thư mục không chạy một lệnh hệ điều hành nào · gộp nhịp 30 giây, không sinh theo từng sự kiện file. Bản ra `BANG.html` **không commit** (đã cho vào `.gitignore`); bản đã commit ở gốc repo vẫn là việc của phiên AI lúc đóng phiên. Câu để dán cho Đức: mục cùng tên trong `PROMPTS.md` |
| **Sinh bảng trạng thái cho Đức xem** | `node scripts/build-overview.mjs <file-ra.html>` — trang trực quan, sinh từ cùng nguồn với `DASHBOARD.md` nên ba trang không thể nói khác nhau. **Bản ra KHÔNG commit**: nó để publish, và tự in ngày sinh + bật cờ đỏ khi quá 7 ngày. Cấm trong trang: SHA · đường dẫn · phần trăm · lời máy tự khen |

**Về bảng đối chiếu GPT ↔ Gemini — HAI file, đừng tìm số ở file chữ** ([ADR-0014](docs/adr/0014-tach-khoi-may-sinh-cua-bang-doi-chieu.md)):
`FEATURE-PARITY.md` là chữ của **NGƯỜI** (mục 2 hành vi, có bằng chứng **[ĐỌC]**) → phải giữ
`_root`. `FEATURE-PARITY-AUTO.md` là số của **MÁY, toàn bộ** → **miễn khoá**, sinh lại bằng
`node scripts/feature-parity.mjs` (`--check` chỉ kiểm, không ghi). Sửa tay file máy là mất trắng
ở lần sinh sau. Cả hai ở gốc repo vì nói về cả hai nhánh.

> **Máy bị cấm đụng mục 2.** Dò theo tên hàm đã cho kết luận sai bốn lần trong một ngày, nên
> thêm dòng hành vi thì phải mở code đọc, gắn nhãn **[ĐỌC]**, kèm bằng chứng. Mỗi dòng khai rõ
> được xác lập bằng cách nào — **[ĐO]** máy đếm · **[ĐỌC]** đọc thẳng code · **[DÒ]** tìm theo
> tên — vì ba loại đó tin được khác nhau; **dòng [DÒ] phải kiểm lại trước khi hành động**. Và
> **đừng viết văn của người chung dòng với số của máy**: một câu diễn giải đã bị nuốt mất đúng
> vì nằm chung dòng với con số. Port tính năng sang nhánh kia thì đọc hai file trên, đừng đọc
> `BACKLOG.md` — danh sách port trong backlog đã lạc hậu một lần.

## 7. Đóng phiên — ghi lại 3 thứ

1. Một dòng Log vào `HANDOFF.md` của package: làm gì, kết quả số, còn gì mở.
2. Quyết định mới của Đức → `decisions.md`.
3. Gặp lỗi mới trên trang thật → thêm 1 dòng vào bảng lỗi của sổ tay, **và** cân nhắc thêm
   1 phép kiểm vào `scripts/session-check.mjs`.

> Luật nào không kiểm được bằng máy thì sớm muộn cũng bị bỏ qua. Đó là lý do có cổng kiểm.
