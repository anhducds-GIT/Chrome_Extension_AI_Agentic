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

**Push thì KHÔNG dùng `git push`** — dùng:

```bash
node scripts/safe-push.mjs --as <tên-phiên-của-bạn>
```

Lý do: nhiều phiên AI dùng chung một thư mục git, nên `git push` của bạn **cuốn theo commit của
mọi phiên khác**. Ngày 26/08 chuyện này đã xảy ra thật — một phiên push và kéo theo 2 commit chưa
được Đức duyệt của phiên khác. `safe-push` liệt kê rõ sắp đẩy gì của ai, và từ chối nếu bạn đang
cuốn theo việc người khác. Push được tự làm khi đủ điều kiện ở mục 2 — không cần hỏi từng lần.

## 1. Ai giữ package nào — chống hai AI giẫm chân

Bảng chủ sở hữu là `.agents/claims.json`. **Một vùng chỉ có MỘT phiên AI được ghi tại một thời điểm.**

**Nhận và trả quyền bằng lệnh, đừng sửa file bằng tay:**

```bash
node scripts/claim.mjs --list
node scripts/claim.mjs --take <khoá> --as <tên-phiên> --task "một câu"
node scripts/claim.mjs --release <khoá> --as <tên-phiên>
```

Sửa tay là đọc-sửa-ghi, và ngày 02/09 đã có một quyền **bị ghi đè im lặng** vì thế: hai phiên
cùng đọc thấy "trống" rồi cùng ghi tên mình, người ghi sau thắng, người ghi trước không hề biết.
Lệnh này **từ chối** nhận vùng đã có chủ khác, **từ chối** trả quyền hộ người khác, và ghi rồi
đọc lại để kiểm.

- Vùng đang có chủ, mà chủ không phải bạn → **chỉ được đọc, tuyệt đối không sửa**.
- Vùng trống chủ → nhận rồi làm.
- **Nhận ngay TRƯỚC lượt ghi đầu tiên, không phải lúc mở phiên.** Đọc và đo thì không cần khoá,
  mà lane nào cũng mất 5–20 phút đầu để đọc. Cần khoá thứ hai giữa chừng thì **nhận thêm lúc
  cần** — đừng gom sẵn. Một lane, **một khoá worker**: việc trải ba nhánh thì làm ba lượt.
- Công cụ chỉ ra vùng bạn giữ mà **chưa thấy dấu vết trong repo** (`claim.mjs --list` ·
  `what-next.mjs` · cổng đóng phiên, mức **vàng**, không chặn). Câu đó nói **repo chưa thấy gì**
  — nó **không** nói lane đó rảnh, và nó **không bao giờ** đủ để nhả khoá hộ ai.
- **Trả quyền SAU khi đẩy, không phải sau khi commit.** Đẩy không được thì **giữ khoá** và báo
  lại, đừng trả cho "sạch sẽ". Cổng đóng phiên không soi cây làm việc, nó soi **commit chưa
  đẩy**: commit của bạn còn nằm đó mà vùng đã trống chủ thì cổng báo *"vùng gốc repo bị sửa
  nhưng chưa ai đứng tên"* — **đỏ với chính bạn ở lượt chạy sau**, và **đỏ với MỌI phiên nếu
  commit thiếu nhãn `Lane:`** (phép kiểm K2-1b trừ đi file chỉ bị chạm bởi commit mang nhãn của
  lane khác, nên phiên tên khác thì không đỏ). Ngày
  06/09 ba lane cùng bị chặn đẩy vì lý do ngoài tầm với, cùng trả khoá, và cả ba để lại đúng
  một mục đỏ cho phiên đến sau dọn. Giữ một khoá là chuyện nhỏ; để lại commit vô chủ là chuyện lớn.
- **Đừng nhả khoá HỘ lane khác vì đo thấy vùng "chưa bị chạm".** Repo chỉ thấy được thứ đã chạm
  repo, mà một lane cẩn thận thì dựng thử ngoài repo rồi mới ghi vào — nên `0 commit, 0 file sửa`
  **không** chứng minh lane đó đang rảnh. Ngày 06/09 phiên điều phối đo đúng như thế, nhả một
  khoá, và lane kia phải hoàn nguyên việc đã xong. Ba đường hợp lệ để một khoá được trả: **chính
  lane đó trả** · **lane đó báo đã xong** · **Đức chốt chuyển** (`--restamp --duc-duyet`). Thấy
  khoá nằm lâu thì **hỏi**, đừng nhả.
- **Đừng nối `claim.mjs` vào ống.** Mã thoát của một đường ống là mã thoát của lệnh **cuối**,
  nên `claim.mjs --take … | tail -3 && git commit …` chạy tiếp cả khi lệnh nhận khoá đã **TỪ
  CHỐI** — đã xảy ra 06/09, và lượt commit đó ghi vào vùng của lane khác. Muốn cắt bớt chữ thì
  **chạy riêng, xem kết quả, rồi mới chạy lệnh sau**.
- Muốn giành vùng người khác đang giữ → **hỏi Đức**, không tự lấy. Đức chốt rồi thì ghi lại
  bằng `--restamp --as <phiên> --duc-duyet "<câu chốt>"`; không có câu chốt thì lệnh **từ chối**,
  kể cả khi bạn đã sửa tay xong (Đức chốt 04/09 — trước đó đây chỉ là lời khuyên, và một khoá
  đã bị lấy khỏi tay phiên đang làm dở đúng bằng đường đó).

**Gốc repo chia làm NHIỀU khoá** (từ 02/09) — trước đó một khoá `_root` che cả bảy thư mục gốc,
nên hai việc không hề chồng nhau vẫn chặn nhau:

| Khoá | Che gì |
|---|---|
| `_docs` | `docs/` |
| `_code` | `scripts/` + `tests/` |
| `_root` | phần còn lại và các file ở tầng ngoài cùng |

Nhận đúng vùng mình đụng, không nhận cả gốc repo. Cổng đóng phiên sẽ nói tên khoá còn thiếu.
Ai chia vùng thì khai `steward` trong khối `areas` của `.repo-structure.json`.

**Năm artifact máy sinh KHÔNG đòi khoá nào** (bốn từ 03/09, cái thứ năm từ 07/09):
`DASHBOARD.md` · `llms.txt` · `repo-map.json` · `DASHBOARD-Chrome-Extension-AI-Agentic.html` ·
`FEATURE-PARITY-AUTO.md`. Không có gì của ai trong đó để mất — chạy lại bộ sinh là ra y hệt, và đo ngày
02/09 thấy **19% lượt nhận `_root` tồn tại CHỈ để chạy một bộ sinh rồi trả ngay**. Danh sách khai
ở khối `generated` của `.repo-structure.json`.

`FEATURE-PARITY.md` **cố ý không** nằm trong đó — mục 2 của nó là chữ của người, nên chạm nó
vẫn phải giữ `_root`. Chi tiết ở mục 6.

**File được MIỄN chia làm HAI LOẠI, và điều kiện khác nhau:**

- **Miễn vô điều kiện:** `.agents/claims.json`. Nhận/trả quyền là thao tác hành chính — không
  miễn thì không ai trả lại được quyền, vì chính thao tác trả cũng bị coi là sửa file gốc.
- **Miễn KHI CHỈ THÊM DÒNG Ở CUỐI:** `HANDOFF.md` gốc (luật mục 7 bắt MỌI phiên ghi Log),
  `IDEAS.md` (Đức chốt 04/09 — vai điều phối là vai ghi ý tưởng nhiều nhất, mà sổ nằm ở gốc nên
  nó phải xếp hàng sau `_root`, khoá đông nhất), và `BACKLOG.md` gốc (Đức chốt 06/09 — sổ nợ hạ
  tầng của AI, tách khỏi `IDEAS.md` là sổ ý tưởng của Đức). Sửa hay xoá dòng cũ là viết lại chữ
  của phiên khác, và cái đó **không** được miễn.

  **`BACKLOG.md` phải được miễn y hệt `IDEAS.md`, không kém một chút nào.** Đo 06/09: `IDEAS.md`
  có 19 mục thì 14 là AI tự ghi, vì gốc repo không có sổ nợ nào và `IDEAS.md` là quyển duy nhất ở
  gốc ghi được không cần khoá. Nếu sổ mới đòi khoá `_root` thì AI sẽ lách về `IDEAS.md` và ta chỉ
  **đổi chỗ** cái bệnh. Kèm theo: sổ đó **đóng mục bằng cách thêm một dòng ở cuối**, không sửa
  khối cũ — để cửa ra rẻ ngang cửa vào (ở `IDEAS.md` cửa vào dùng 20 lần, cửa ra 1 lần).

Danh sách loại thứ hai khai ở `append_only_exempt` trong `.repo-structure.json` — **sửa ở đó,
đừng sửa script**. Trước 04/09 nó bị gõ cứng ở cả `session-check.mjs` và `safe-push.mjs`, và hai
bản sao của một luật đã trả hai câu khác nhau cho cùng một file ngày 02/09.

Đây không phải hình thức. Ngày 25–26/08 đã suýt hỏng vì hai phiên AI cùng làm trên một repo, và
ngày 02/09 đo được **98 trong 127 commit (77%) chạm gốc repo** — một khoá duy nhất là điểm nghẽn
thật, không phải lý thuyết.

## 2. Ba việc PHẢI hỏi Đức trước

1. Thêm quyền (permission) mới cho extension
2. Chạy pilot live mới trên trang thật
3. Đổi luật an toàn (retry, halt, attribution, persistence, exact-once)

Ngoài ra, luật gốc của Đức: không gửi gì ra ngoài, không xoá file, không sửa dữ liệu gốc,
không tạo automation tự chạy — nếu chưa hỏi.

**Commit và push được tự làm** — Đức chốt 2026-08-26, áp cho MỌI AI — nhưng chỉ khi đủ
cả ba điều kiện:

1. việc đã hoàn tất trọn vẹn (việc dở dang thì KHÔNG push);
2. cổng kiểm `session-check.mjs` XANH TOÀN BỘ (và với code: đã qua audit độc lập);
3. đẩy bằng `safe-push.mjs`, không bao giờ `git push` trần.

Lý do Đức đổi luật: Đức không đọc được code local; GPT audit qua GitHub connector, nên
commit chưa push là **vô hình** với vòng kiểm tra chéo. Push sớm = được audit sớm.

**Từ 05/09 `--carry` KHÔNG còn phải hỏi** — Đức duyệt thường trực
([ADR-0005](docs/adr/0005-duyet-thuong-truc-cho-push-va-carry.md)): mô hình một cửa khiến các
lane chưa push gần như luôn là executor do chính phiên điều phối giao, và đo trong hai ngày
04–05/09 thì cửa đó **chặn 6 lượt mà lọc 0 lượt** — một cổng không lọc được gì thì nó là thuế,
không phải cổng. Đổi lại, **mọi lượt `--carry` phải kể tên lane bị cuốn theo trong nhật ký
phiên** — đó là thứ duy nhất còn lại để truy, vì lớp chắn cuối đã bỏ. Ba việc vẫn phải hỏi:
**force-push, sửa lịch sử, merge nhánh vào `main`**.

**MỌI commit phải có dòng cuối `Lane: <tên-phiên>`** — đúng tên bạn đưa cho `--as`, một dòng,
không dấu cách. Thiếu nhãn thì cổng đóng phiên ĐỎ **và `safe-push` từ chối đẩy** (từ 03/09) —
`--carry` không mở được cửa đó, vì nó duyệt "đẩy kèm việc của X" mà commit không nhãn thì không có X.

Vì sao: nhiều phiên chung một nhánh, nên `safe-push` phải biết commit nào của ai. Không nhãn
thì nó đoán theo **chủ vùng lúc chạy** — mà chủ đổi được sau lúc commit, nên nó quy sai **cả
hai chiều**: chặn oan việc bạn, hoặc **im lặng cuốn việc người khác lên remote** (đã xảy ra
26/08, xem mục 0). Nhãn là **nguồn gốc, không phải quyền** — ai được ghi vẫn do mục 1 quyết.
Nhãn hỏng (rỗng · có dấu cách · hai nhãn trong một commit) thì ĐỎ, không đoán; sửa bằng
`git commit --amend`.

## 3. Năm luật vàng — và bảy giới hạn cứng

**Bảy giới hạn Đức chốt 2026-09-07.** Lý do, **đo lại bảy ngày** (`--since=2026-08-31`, phân
loại ưu tiên mã extension trước): trong **738 commit** chỉ **78 (11%)** chạm mã extension chạy
thật, còn **468 (63%)** chạm tài liệu + sổ nợ và **142 (19%)** chạm artifact + bảng quyền. Hệ
đang tự bảo trì chính nó, nên từ nay **xoá là thắng, thêm là thua**.

> **Đừng dẫn lại câu *"hạ tầng lớn hơn mã sản phẩm"*** của bản giao việc gốc (44.239 > 38.136):
> đếm lại bằng Node ra hạ tầng **45.200** dòng, mã `workers/` **89.262** — sản phẩm **hơn gấp
> đôi**. Con số cũ sinh ra vì `wc -l` với hàng trăm đường dẫn **vượt trần đối số** rồi trả tổng
> của mẻ cuối. Bảy giới hạn dưới đây đứng trên **tỉ lệ commit**, không trên số dòng.

1. **Một gói sống một lúc.** Gói sống: `workers/duc-scouter`. Ba gói còn lại đóng băng (khai ở
   khối `frozen` của `.repo-structure.json`) — chỉ đọc, mã ở lại trên đĩa.
2. **Cấm cài một tính năng hai lần.** Cần ở hai gói → vào `workers/_shared/` trước. Bằng chứng:
   ba gói `duc-auto-*` là fork của nhau, **82.252 dòng** (không phải 37.601 như bản giao việc
   ghi), ba file `sidepanel.js` riêng dài **6.451 · 5.230 · 5.206** dòng — nên mỗi lỗi phải sửa
   ba lần, và 07/09 đúng ba lần (phép kiểm zoom di sản, `N-14`).
3. **`docs/` ≤ 8.000 dòng.** Nay **24.732** (`git ls-files 'docs/*' | xargs wc -l`). Cắt docs
   cần khoá `_docs`.
4. **Sổ nợ hạ tầng ≤ 15 mục** — Đức nâng trần 07/09, trước là 10. Đếm lại, đừng tin dòng này:
   `node scripts/backlog-check.mjs`. **Trần này KHÔNG có máy cưỡng chế** — công cụ chỉ đếm và in
   ra, cổng đóng phiên không đọc con số đó. Nói thẳng vì lượt nâng này sinh ra từ đúng chỗ mù ấy:
   một mục thứ 11 vào sổ mà **không gì đỏ lên**, và nếu người ghi không tự đọc trần thì trần đã
   vỡ trong im lặng. Ai vượt 15 thì **hỏi Đức**, đừng tự nâng tiếp.
5. **File test bắt 0 đột biến thì XOÁ.** Một phép kiểm không bắt được gì vẫn thu thuế mọi phiên.
6. **Song song thì tối đa 2 chat** — Đức nói rõ 07/09: *"lane ở đây tôi hiểu là 2 phiên chat với
   AI; trong 1 chat mà bạn manage cùng lúc 5 task chạy ngầm không giẫm chân nhau thì tôi vẫn
   ok"*. Nên **số tác vụ ngầm TRONG một chat không bị giới hạn**; bảng quyền chỉ để điều phối
   những bên **không nói được với nhau**. Bảy khoá dựng cho sáu chat → phải co lại (`N-36`).
7. **Một luật vào thì một luật ra.** Thêm luật vào file này phải **kể tên luật nó thay**, hoặc
   **đo được nó đã nổ mấy lần**. Mục này đổi lấy **chín dòng sổ tay** của ba gói đóng băng và
   **một khối bảng đối chiếu bị chép hai lần** (nó nói lại đúng điều dòng sổ tay đã nói) —
   `wc -l AGENTS.md`: **296 → 291**.

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

- `pilot-*/`, `Pilot-*/`, `Batch-*/`, `evidence/` — **bằng chứng vận hành**. Chỉ được THÊM mới,
  không sửa, không xoá, không tạo lại.
- Không bao giờ để token / mật khẩu / file pairing vào repo.
- Không bao giờ gán `.innerHTML` / `.outerHTML` / `insertAdjacentHTML`.

## 5. Vai từng AI — chia theo VIỆC, không chia theo hãng

**Đức chốt 08/09.** Bảng cũ chia việc theo tên hãng (Claude / Codex / Antigravity) — **đi ra**, vì
đo được nó phân việc cho hai bên **chưa từng ghi một dòng nào**. Đếm nhãn `Lane:` của mọi commit
14 ngày (`git log --since=2026-08-25 --format=%B | grep -oE "^Lane: \S+" | sort -u`): tất cả là
`claude-*`; `claude-codex-*` và `claude-gpt-*` là **phiên Claude làm việc với** Codex/GPT, không
phải Codex tự ghi. **Antigravity 0 · Codex 0.**

Thay bằng **HAI VAI, chia theo hướng đi của việc**. Vai là của **PHIÊN**, không của hãng: hãng nào
cũng đóng được vai nào, và một phiên đóng **đúng một vai** cho tới khi đóng phiên.

| Vai | Giữ gì | Việc chính | KHÔNG được |
|---|---|---|---|
| **Đức** | — | Chốt mọi thứ | — |
| **① Giữ lõi** | luật · bộ máy · trạng thái của repo này | mỗi bản vá kèm **một phép kiểm ghim** · xoá luật không nổ lần nào · giữ cổng kiểm còn răng | nới một lớp bảo vệ cho cổng xanh · **tự ký nghiệm thu việc của chính mình** |
| **② Phát & thu** | cửa duy nhất giữa repo này và bên ngoài | thi hành quy trình lên repo/gói khác · **mang chỗ vấp về** thành mục sổ nợ · tối ưu chính quy trình đó | sửa lõi để việc bên ngoài chạy được — chỗ vấp phải **về Vai ①** · báo một quy trình ĐẠT khi chưa chạy thật |

**Bất biến chịu tải: người SỬA không tự NGHIỆM THU bản sửa của mình.** Một tờ nghiệm thu do bên bị
kiểm ký là **lời tự khai, không phải hàng rào** — đúng luật mà `SELF_ATTESTATION` cưỡng chế trong
lõi quyền, nên đừng đọc nó thành lời khuyên.

**Đừng đọc thành "người sửa không được tìm lỗi".** Vai nào cũng được tìm lỗi ở bất kỳ đâu; tách
"ai tìm" khỏi "ai sửa" là cấm Vai ① soi chính lõi nó giữ. Thứ phải tách là **người ký** khỏi
**người sửa** (phiên Codex bác đúng chỗ này 08/09 — bản đầu của mục này viết sai).

**Bàn giao giữa hai vai chỉ có một hình dạng:** Vai ② ghi chỗ vấp vào `BACKLOG.md` (kèm trường
`đóng khi:`), Vai ① biến nó thành **bản vá cộng một phép kiểm ghim**. Không có đường nào khác —
Vai ② nhắn thẳng cho Vai ① *"sửa hộ tôi"* là mất dấu vết, và người đến sau không đọc được tin
nhắn. Đây là **vế duy nhất máy kiểm được** (`npm run test:backlog` đếm trường `đóng khi:`); phần
*"② phát hiện · ① sửa"* là **chữ, không phải luật** — nói thẳng ra để không ai tin nó đang được
cưỡng chế, và mục 7 vốn đã cảnh báo luật máy không kiểm được thì sớm muộn cũng bị bỏ qua.

**Hai vai có thể cùng lúc trong repo, nhưng KHÁC VÙNG** (mục 1). Trần song song vẫn là **2 chat**
(giới hạn ⑥) — hai vai vừa khớp trần đó, không phải trùng hợp.

> **Cố ý KHÔNG thêm:** một quy ước đặt tên `--as` theo vai. Không máy nào kiểm được nó, và mục 7
> nói luật máy không kiểm được thì sớm muộn cũng bị bỏ qua — thêm vào chỉ để có thêm một dòng.

**Cửa vào của từng AI** — cách file này đến được tay bạn:

| AI | Cách nạp | Đức phải làm gì |
|---|---|---|
| Claude | Tự đọc `CLAUDE.md` gốc → trỏ sang file này | Không phải làm gì |
| Codex | Tự đọc `AGENTS.md` gốc | Không phải làm gì |
| Antigravity | Dán **một câu mở màn**: *"Đọc AGENTS.md ở gốc repo trước khi làm gì."* | Dán 1 dòng mỗi phiên |

Antigravity đã được thử live 26/08: nó đọc file này, tự lần ra `.agents/claims.json`, và tự
kết luận "package có chủ rồi nên tôi chỉ được đọc" — dù không ai hỏi câu đó. Luật dùng được.
Nhưng chưa chứng minh được nó **tự** nạp lúc mở phiên, nên câu mở màn là bắt buộc: 3 giây,
miễn nhiễm với mọi thay đổi phiên bản, và nếu nó vốn tự nạp thì câu đó chỉ thừa vô hại.

## 6. Sổ tay mở khi cần — Tầng 2

Không đọc trước. Tới việc nào thì mở sổ tay đó.

| Khi bạn sắp… | Mở file |
|---|---|
| **Đụng ba gói ĐÃ ĐÓNG BĂNG** (`duc-auto-chatgpt` · `duc-auto-gemini` · `duc-auto-gg-flow-video`) | **Đừng đụng.** Đức chốt 07/09: một gói sống một lúc, và gói sống là `workers/duc-scouter`. Ba gói này chỉ được ĐỌC — mã ở lại trên đĩa (bằng chứng vận hành, mục 4 cấm xoá), sổ nợ và tài liệu của chúng **không cần mở nữa**. Sổ tay từng gói vẫn nằm trong gói. Danh sách khai ở khối `frozen` của `.repo-structure.json` |
| **Là phiên ĐIỀU PHỐI: Đức hỏi "đang có gì · làm gì tiếp · việc nào chạy song song được"** | `docs/protocols/ORCHESTRATOR.md` — sổ tay vai điều phối: đọc gì lúc mở phiên, luật song song, **HARD ROLE FIREWALL** (Đức chốt 04/09 — vai điều phối KHÔNG code, KHÔNG debug product, KHÔNG đề xuất patch; không có ngoại lệ "sửa nhỏ"), **luật nạp báo cáo năm mục** (`DONE → STATE CHANGE → BLOCKER → HUMAN DECISION → NEXT WORK` rồi DỪNG), **lối ra bàn giao cho executor**, khi nào phải hỏi Đức. Công cụ đi kèm: `node scripts/what-next.mjs` — bản đồ việc, **chỉ đọc, không đòi khoá nào**, giao ba nguồn mà trước đây không giao được với nhau (bảng quyền × sổ nợ từng gói × sổ ý tưởng) |
| **Biết Đức đã chốt gì, và vì sao** | **ADR** — mỗi quyết định một file bất biến. Luật: `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md` · bản mẫu: `docs/_TEMPLATE-adr.md` · quyết định của cả repo ở `docs/adr/`, của một gói ở `workers/<gói>/<phiên-bản>/docs/adr/`. `decisions.md` của package nay là **mục lục** trỏ sang ADR. ADR đã `Accepted` là bất biến, phép kiểm B12 cưỡng chế |
| **Sắp ghi một mục nhật ký, hoặc bị cổng chặn vì mục quá dài** | `docs/protocols/HANDOFF.md` — một mục chứa gì và KHÔNG chứa gì (lý do → ADR · việc còn nợ → `BACKLOG.md` · cách làm → brief), **trần 2.600 byte một mục** khai ở `.repo-structure.json` và cổng đóng phiên chặn **đúng mục bạn vừa thêm**, và cách xoay file theo tháng. Quyết định gốc: [ADR-0011](docs/adr/0011-handoff-chan-o-dau-vao-va-xoay-theo-thang.md). Công cụ: `node scripts/handoff.mjs --check` (đo) · `--rotate <file>` (xoay sang tháng mới) |
| Biết phiên trước làm tới đâu | `HANDOFF.md` của package (cuối file) · việc ở gốc repo: `HANDOFF.md` gốc — **cả bốn file nay chỉ giữ 20 mục cuối** (ADR-0008) |
| **Cần đào lịch sử xa hơn 20 mục** | `HANDOFF-ARCHIVE-01.md` **cạnh chính file `HANDOFF.md` đó** — gốc repo có `HANDOFF-ARCHIVE-01.md` giữ 62 mục cũ, ba worker mỗi gói một file cùng tên. **Nguyên văn, không sửa một chữ; chỉ đọc.** Ghép lại dựng được bản gốc giống hệt từng byte (bất biến ⑴ của ADR-0008, có SHA-256 in ngay đầu file lưu trữ). Ghi Log mới thì vẫn ghi vào cuối `HANDOFF.md` |
| **Biết nhánh mình đang thiếu tính năng gì so với nhánh kia** | **HAI file, đọc cùng nhau** ([ADR-0014](docs/adr/0014-tach-khoi-may-sinh-cua-bang-doi-chieu.md)): `FEATURE-PARITY.md` ở gốc repo là **chữ của người** — mục 2 (tính năng hành vi, có bằng chứng **[ĐỌC]**) và phần diễn giải; sửa nó thì phải giữ `_root`. `FEATURE-PARITY-AUTO.md` là **số của máy** — method Bridge, so module, nợ *method*; **SINH TỰ ĐỘNG, miễn khoá**, sinh lại: `node scripts/feature-parity.mjs` |
| **Mở phiên AI mới và cần hiểu repo trong một lần đọc** | `llms.txt` ở gốc repo — cổng vào chuẩn llmstxt.org, **SINH TỰ ĐỘNG**; bản đồ máy đọc đi kèm: `repo-map.json` (hợp đồng cross-repo, có `schema_version`). Sinh lại: `node scripts/build-dashboard.mjs` |
| **Muốn biết repo có extension nào, cái nào dùng được, đã kiểm chứng chưa** | `DASHBOARD.md` ở gốc repo — **SINH TỰ ĐỘNG, đừng sửa tay**; sinh lại: `node scripts/build-dashboard.mjs` |
| Hiểu cách vận hành nhiều extension trong một repo, hoặc thêm extension mới | `PLATFORM.md` ở gốc repo |
| Khai trạng thái cho một extension (mới hoặc cũ) | `STATUS.template.md` ở gốc repo → chép thành `STATUS.md` đặt cạnh `manifest.json` |
| **Muốn biết repo đang nợ gì về cấu trúc điều hướng** | `node scripts/check-bootstrap.mjs` — 15 phép kiểm B1…B15, mỗi dòng nói cả chỗ sai lẫn cách sửa. Thêm `--all` để xem hết. **Từ phiên S7 (2026-09-02) tám phép kiểm CHẶN THẬT:** `B1 B2 B3 B4 B5 B7 B10 B12` đỏ thì cổng đóng phiên đỏ theo, không được báo xong. Bảy phép kiểm còn lại (`B6 B8 B9 B11 B13 B14 B15`) vẫn chỉ cảnh báo. **B15 cưỡng chế luật vàng 5:** ba trường `current_focus` · `next_step` · `human_action` là chữ Đức đọc trên bảng, viết không dấu thì báo vàng. Danh sách chặn khai ở `bootstrap.blocking` trong `.repo-structure.json` — sửa ở đó, đừng sửa script |
| **Sửa hoặc vận hành Scouter** (dò trang · báo cáo qua Bridge · tự nạp lại mình) | `workers/duc-scouter/v0.1.0/AGENTS.md` — gói riêng từ 06/09 ([ADR-0013](docs/adr/0013-scouter-ra-nha-rieng-co-khoa-rieng.md)), khoá `workers/duc-scouter`. Nó **không** mang tiền tố `duc-auto-` vì nó không tự động hoá nhà cung cấp nào. Hai chỗ dễ vấp, đọc trước khi sửa: **selector không bao giờ được gõ vào seed** (ranh giới seed/adapter, ADR-0009 mục ⑵), và **cửa Bridge của nó bắt tay HAI CHIỀU** nên chỉ nối được với máy chủ bản ChatGPT — hai bản host cũ nhận token trần |
| **Tìm một tài liệu, hoặc tra đường dẫn `drafts/…` cũ nay nằm đâu** | `docs/README.md` — mục lục bốn tầng (studies · briefs · archive · adr), kèm bản đồ 33 đường dẫn cũ → mới. Thư mục `drafts/` ở gốc repo **đã biến mất** từ phiên S6 (2026-09-02) |
| Viết một file nghiên cứu mới trong `docs/studies/` | `docs/_TEMPLATE-study.md` — bản mẫu: frontmatter 3 trường (`kind`/`status`/`ttl_days`), số liệu lấy từ nguồn máy sinh · hồ sơ đã nghỉ nằm ở `docs/archive/`; mục lục: `docs/README.md` |
| **Lấy bộ chuẩn về dùng cho repo khác, hoặc sửa bộ chuẩn** | **KHÔNG CÒN Ở REPO NÀY.** Bộ khung đã dọn ra nhà riêng 03/09 theo ADR-0001: `https://github.com/anhducds-GIT/Ark_Repo_Harness`. Repo này nay là một **người dùng** của bộ khung, không phải nơi phát hành nó — sửa bộ khung thì sửa ở đó |
| **Sửa gói Assistant (vai điều phối): `what-next.mjs` · `state-check.mjs` · `ORCHESTRATOR.md` · suite ghim của chúng** | **BỘ KHUNG NAY LÀ NƠI PHÁT HÀNH, repo này là NGƯỜI TIÊU THỤ** (Đức chốt 05/09 — [ADR-0006](docs/adr/0006-goi-assistant-phat-hanh-tu-bo-khung.md)). Gói đã vào `template/` của bộ khung ở **bản 1.3.0**. **Cải tiến làm ở bộ khung TRƯỚC**, rồi mới về đây — làm ngược lại là đẻ ra hai bản khác nhau của cùng một gói, và bản nào cũng tự xưng là bản chuẩn |
| **Nhận hoặc trả quyền một gói** | `node scripts/claim.mjs --take <khoá> --as <phiên> --task "một câu"` · trả: `--release`. **Đừng sửa `claims.json` bằng tay nữa** — làm tay là đọc-sửa-ghi, và ngày 02/09 đã có một quyền bị ghi đè im lặng vì thế. Lệnh này TỪ CHỐI nếu gói đã có chủ khác, TỪ CHỐI trả quyền hộ người khác, và ghi rồi đọc lại để kiểm |
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
