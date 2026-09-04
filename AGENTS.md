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

(`_template` đã bỏ ngày 03/09 — bộ khung dọn ra nhà riêng theo ADR-0001, không còn `template/`.)

Nhận đúng vùng mình đụng, không nhận cả gốc repo. Cổng đóng phiên sẽ nói tên khoá còn thiếu.
Ai chia vùng thì khai `steward` trong khối `areas` của `.repo-structure.json`.

**Bốn artifact máy sinh KHÔNG đòi khoá nào** (từ 03/09): `DASHBOARD.md` · `llms.txt` ·
`repo-map.json` · `DASHBOARD.html`. Không có gì của ai trong đó để mất — chạy lại bộ sinh là ra y hệt, và đo ngày
02/09 thấy **19% lượt nhận `_root` tồn tại CHỈ để chạy một bộ sinh rồi trả ngay**. Danh sách khai
ở khối `generated` của `.repo-structure.json`. `FEATURE-PARITY.md` **cố ý không** nằm trong đó:
mục 2 của nó là chữ của người, nên chạm nó vẫn phải giữ `_root`.

**File được MIỄN chia làm HAI LOẠI, và điều kiện khác nhau:**

- **Miễn vô điều kiện:** `.agents/claims.json`. Nhận/trả quyền là thao tác hành chính — không
  miễn thì không ai trả lại được quyền, vì chính thao tác trả cũng bị coi là sửa file gốc.
- **Miễn KHI CHỈ THÊM DÒNG Ở CUỐI:** `HANDOFF.md` gốc (luật mục 7 bắt MỌI phiên ghi Log) và
  `IDEAS.md` (Đức chốt 04/09 — vai điều phối là vai ghi ý tưởng nhiều nhất, mà sổ nằm ở gốc nên
  nó phải xếp hàng sau `_root`, khoá đông nhất). Sửa hay xoá dòng cũ là viết lại chữ của phiên
  khác, và cái đó **không** được miễn.

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

Hai ngoại lệ vẫn phải hỏi: (a) safe-push từ chối vì sắp cuốn theo commit của phiên khác —
đẩy hộ việc người khác không nằm trong luật này; (b) force-push, sửa lịch sử, merge nhánh
vào `main`.

**MỌI commit phải có dòng cuối `Lane: <tên-phiên>`** — đúng tên bạn đưa cho `--as`, một dòng,
không dấu cách. Thiếu nhãn thì cổng đóng phiên ĐỎ **và `safe-push` từ chối đẩy** (từ 03/09) —
`--carry` không mở được cửa đó, vì nó duyệt "đẩy kèm việc của X" mà commit không nhãn thì không có X.

Vì sao: nhiều phiên chung một nhánh, nên `safe-push` phải biết commit nào của ai. Không nhãn
thì nó đoán theo **chủ vùng lúc chạy** — mà chủ đổi được sau lúc commit, nên nó quy sai **cả
hai chiều**: chặn oan việc bạn, hoặc **im lặng cuốn việc người khác lên remote** (đã xảy ra
26/08, xem mục 0). Nhãn là **nguồn gốc, không phải quyền** — ai được ghi vẫn do mục 1 quyết.
Nhãn hỏng (rỗng · có dấu cách · hai nhãn trong một commit) thì ĐỎ, không đoán; sửa bằng
`git commit --amend`.

## 3. Năm luật vàng

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

## 5. Vai từng AI

| AI | Việc chính | Không được |
|---|---|---|
| **Đức** | Chốt mọi thứ | — |
| **Claude** | Kiến trúc, phản biện, audit độc lập, điều phối, vận hành Bridge | Push khi cổng kiểm chưa xanh |
| **Codex** | Code theo brief, audit độc lập | Tự mở rộng phạm vi ngoài brief |
| **Antigravity** | Dựng UI, tạo giao diện | Sửa lớp an toàn / runner / bridge |

Ba AI có thể cùng lúc trong repo, nhưng **khác package** (mục 1).

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
| Vận hành / debug extension Gemini qua Bridge | `workers/duc-auto-gemini/v0.2.0/AI-OPERATOR-GUIDE.md` |
| Sửa code worker Gemini | `workers/duc-auto-gemini/v0.2.0/AGENTS.md` |
| Sửa code worker ChatGPT | `workers/duc-auto-chatgpt/v0.1.0/AGENTS.md` |
| Xem lỗi thật đã gặp trên trang, đừng chẩn đoán lại từ đầu | bảng lỗi trong `AI-OPERATOR-GUIDE.md` |
| Hiểu schema workbook XLSX | `DAC_XLSX_RUN_PLAN_V1.md` của package |
| **Là phiên ĐIỀU PHỐI: Đức hỏi "đang có gì · làm gì tiếp · việc nào chạy song song được"** | `docs/protocols/ORCHESTRATOR.md` — sổ tay vai điều phối: đọc gì lúc mở phiên, luật song song, **HARD ROLE FIREWALL** (Đức chốt 04/09 — vai điều phối KHÔNG code, KHÔNG debug product, KHÔNG đề xuất patch; không có ngoại lệ "sửa nhỏ"), **luật nạp báo cáo năm mục** (`DONE → STATE CHANGE → BLOCKER → HUMAN DECISION → NEXT WORK` rồi DỪNG), **lối ra bàn giao cho executor**, khi nào phải hỏi Đức. Công cụ đi kèm: `node scripts/what-next.mjs` — bản đồ việc, **chỉ đọc, không đòi khoá nào**, giao ba nguồn mà trước đây không giao được với nhau (bảng quyền × sổ nợ từng gói × sổ ý tưởng) |
| **Biết Đức đã chốt gì, và vì sao** | **ADR** — mỗi quyết định một file bất biến. Luật: `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md` · bản mẫu: `docs/_TEMPLATE-adr.md` · quyết định của cả repo ở `docs/adr/`, của một gói ở `workers/<gói>/<phiên-bản>/docs/adr/`. `decisions.md` của package nay là **mục lục** trỏ sang ADR. ADR đã `Accepted` là bất biến, phép kiểm B12 cưỡng chế |
| Biết phiên trước làm tới đâu | `HANDOFF.md` của package (cuối file) · việc ở gốc repo: `HANDOFF.md` gốc |
| **Biết nhánh mình đang thiếu tính năng gì so với nhánh kia** | `FEATURE-PARITY.md` ở gốc repo |
| **Mở phiên AI mới và cần hiểu repo trong một lần đọc** | `llms.txt` ở gốc repo — cổng vào chuẩn llmstxt.org, **SINH TỰ ĐỘNG**; bản đồ máy đọc đi kèm: `repo-map.json` (hợp đồng cross-repo, có `schema_version`). Sinh lại: `node scripts/build-dashboard.mjs` |
| **Muốn biết repo có extension nào, cái nào dùng được, đã kiểm chứng chưa** | `DASHBOARD.md` ở gốc repo — **SINH TỰ ĐỘNG, đừng sửa tay**; sinh lại: `node scripts/build-dashboard.mjs` |
| Hiểu cách vận hành nhiều extension trong một repo, hoặc thêm extension mới | `PLATFORM.md` ở gốc repo |
| Khai trạng thái cho một extension (mới hoặc cũ) | `STATUS.template.md` ở gốc repo → chép thành `STATUS.md` đặt cạnh `manifest.json` |
| **Muốn biết repo đang nợ gì về cấu trúc điều hướng** | `node scripts/check-bootstrap.mjs` — 15 phép kiểm B1…B15, mỗi dòng nói cả chỗ sai lẫn cách sửa. Thêm `--all` để xem hết. **Từ phiên S7 (2026-09-02) tám phép kiểm CHẶN THẬT:** `B1 B2 B3 B4 B5 B7 B10 B12` đỏ thì cổng đóng phiên đỏ theo, không được báo xong. Bảy phép kiểm còn lại (`B6 B8 B9 B11 B13 B14 B15`) vẫn chỉ cảnh báo. **B15 cưỡng chế luật vàng 5:** ba trường `current_focus` · `next_step` · `human_action` là chữ Đức đọc trên bảng, viết không dấu thì báo vàng. Danh sách chặn khai ở `bootstrap.blocking` trong `.repo-structure.json` — sửa ở đó, đừng sửa script |
| Sắp code Extension Operation Platform V0.1 (STATUS/DASHBOARD) | `docs/archive/PLATFORM-V01-IMPLEMENTATION-BRIEF.md` — đề bài đã chốt, không tự mở rộng · prompt mở phiên: `docs/archive/PLATFORM-V01-ONBOARDING-PROMPT.md` (đã thực thi xong, giữ làm bản ghi) |
| Sắp triển khai Extension Google Flow (video) | `docs/studies/FLOW-EXT-COORDINATION-PLAN.md` — kế hoạch điều phối 5 checkpoint (FLOW-00 đã chốt 27/08) |
| Vận hành / sửa worker GG Flow Video | `workers/duc-auto-gg-flow-video/v0.1.0/AGENTS.md` · vận hành Bridge: `AI-OPERATOR-GUIDE.md` cùng thư mục |
| Vận hành Bridge khi NHIỀU profile Chrome cùng nối (`bridge.sessions`, `--target`, `served_by`) | Thiết kế: `drafts/BRIDGE-MULTIPROFILE-DESIGN-V1.md` (Đức duyệt hướng A 28/08) · đã thành code Ở CẢ BA worker 02/09 (gg-flow-video → gemini → chatgpt, mỗi nhánh có audit + mutation riêng) — luật vận hành: mục "Nhiều profile" trong `AI-OPERATOR-GUIDE.md` của từng worker |
| **Tìm một tài liệu, hoặc tra đường dẫn `drafts/…` cũ nay nằm đâu** | `docs/README.md` — mục lục bốn tầng (studies · briefs · archive · adr), kèm bản đồ 33 đường dẫn cũ → mới. Thư mục `drafts/` ở gốc repo **đã biến mất** từ phiên S6 (2026-09-02) |
| Viết một file nghiên cứu mới trong `docs/studies/` | `docs/_TEMPLATE-study.md` — bản mẫu: frontmatter 3 trường (`kind`/`status`/`ttl_days`), số liệu lấy từ nguồn máy sinh · hồ sơ đã nghỉ nằm ở `docs/archive/`; mục lục: `docs/README.md` |
| **Lấy bộ chuẩn về dùng cho repo khác, hoặc sửa bộ chuẩn** | **KHÔNG CÒN Ở REPO NÀY.** Bộ khung đã dọn ra nhà riêng 03/09 theo ADR-0001: `https://github.com/anhducds-GIT/Ark_Repo_Harness`. Repo này nay là một **người dùng** của bộ khung, không phải nơi phát hành nó — sửa bộ khung thì sửa ở đó |
| **Nhận hoặc trả quyền một gói** | `node scripts/claim.mjs --take <khoá> --as <phiên> --task "một câu"` · trả: `--release`. **Đừng sửa `claims.json` bằng tay nữa** — làm tay là đọc-sửa-ghi, và ngày 02/09 đã có một quyền bị ghi đè im lặng vì thế. Lệnh này TỪ CHỐI nếu gói đã có chủ khác, TỪ CHỐI trả quyền hộ người khác, và ghi rồi đọc lại để kiểm |
| **Cổng báo `DAU_VO` — bảng quyền bị sửa tay** | Từ 03/09 bảng có **dấu niêm phong**, và sửa tay làm dấu vỡ. Lý do: lệnh trên giữ *đường ghi*, nhưng không gì giữ chính file — ngày 03/09 cả bốn khoá gốc bị đổi chủ một lượt đi vòng qua lệnh, và phiên đang làm dở không hề biết. Dấu vỡ thì `claim.mjs` **từ chối ghi** (mã 3) và cổng đóng phiên **ĐỎ với MỌI phiên** — cố ý, vì người cần biết nhất là người vừa BỊ mất khoá, mà họ chỉ chạy cổng chứ không chạy lệnh. Gặp thì: `git diff .agents/claims.json` → khoá của bạn có bị đổi chủ không → có thì **hỏi Đức** (luật mục 1) → chốt xong mới `node scripts/claim.mjs --restamp --as <phiên>`. **Đừng restamp cho xong việc** — làm thế là đóng dấu hợp lệ cho vụ sửa tay và xoá luôn tang chứng. Sửa văn xuôi `_doc` / `_labels` KHÔNG làm vỡ dấu. **Từ 04/09 câu "đừng restamp cho xong việc" không còn chỉ là lời khuyên:** nếu lượt sửa đó CHUYỂN CHỦ một khoá khỏi tay người khác, `--restamp` **từ chối** (mã 3) cho tới khi bạn đưa `--duc-duyet "<câu chốt của Đức>"` — và câu đó được ghi **vào bảng** (`taken_from` · `taken_by` · `duc_decision`), không phải in ra màn hình. Lý do: ngày 04/09 một khoá bị lấy khỏi tay phiên đang làm dở đúng bằng đường sửa-tay-rồi-restamp, kèm một `taken_from` **viết tay** — trường đó công cụ chưa bao giờ sinh, nên nó không chứng minh gì cả. Người cần đọc câu chốt là phiên vừa mất khoá, mà họ chỉ đọc bảng chứ không chạy lệnh |
| **Hiểu vì sao nhiều phiên hay va nhau, và các phương án đã cân** | `docs/studies/PARALLEL-WORK-DESIGN-V0.md` — đo thật ngày 02/09: 127 commit/ngày, 77% chạm `_root`, 63 lần ghi bảng quyền. Tách **hai vấn đề khác nhau**: quyền bị ghi đè (bug, đã vá bằng lệnh trên) và push cuốn theo commit người khác (hệ quả của một nhánh, chưa chốt phương án) |
| **Đức cần một câu để dán cho AI, không muốn nhớ lệnh** | `PROMPTS.md` ở gốc repo — mỗi flow một khối: *dùng khi nào · câu để dán · AI sẽ chạy lệnh gì · xong khi nào*. **Luật của file đó: mỗi câu phải chạy được với CẢ BA AI**, nên câu nào cũng chỉ nói mục tiêu, không nói tên công cụ. Câu nào chỉ một AI làm được thì phải xuống mục cuối kèm cách làm thay. Đầu file có bảng **đo thật 03/09** về việc ba AI làm được gì |
| **Xem bảng trạng thái mà không cần AI đăng hộ** | `DASHBOARD.html` ở gốc repo — **SINH TỰ ĐỘNG, đừng sửa tay**. Mở trực tiếp bằng trình duyệt. Sinh lại: `node scripts/build-overview.mjs`. Nội dung **suy hoàn toàn từ HEAD**, cố ý: nó nằm trong khối `generators` nên cổng kiểm nó mỗi phiên, và nếu nó phụ thuộc giờ đồng hồ thì sang ngày mới là **mọi phiên bị chặn push** dù không dữ liệu nào đổi. Việc báo cũ do đoạn JS trong trang tự tính lúc MỞ trang. Trước 03/09 bảng chỉ tồn tại dạng artifact trên claude.ai — tức là điểm phụ thuộc Claude duy nhất của cả hệ; file này xoá bỏ chỗ đó |
| **Đức có một ý tưởng, hoặc muốn biết đang có những hướng nào chờ làm** | `IDEAS.md` ở gốc repo — **phòng chờ**, không phải roadmap thứ hai. Hai trường bắt buộc: `bậc` và `việc kế`. Đang xây thì PHẢI khai `chủ` + `phạm vi` — đó là thứ cho phép nhiều phiên chạy song song mà không giẫm chân. Ý tưởng có nhà rồi thì rời sổ (điền `nhà:`), đừng chép lại |
| **Sinh bảng trạng thái cho Đức xem** | `node scripts/build-overview.mjs <file-ra.html>` — trang trực quan, sinh từ cùng nguồn với `DASHBOARD.md` nên ba trang không thể nói khác nhau. **Bản ra KHÔNG commit**: nó để publish, và tự in ngày sinh + bật cờ đỏ khi quá 7 ngày. Cấm trong trang: SHA · đường dẫn · phần trăm · lời máy tự khen |

**Về `FEATURE-PARITY.md`:** bảng tính năng GPT ↔ Gemini. Nó ở **gốc repo** vì nói về cả hai
nhánh — sửa nó thì phải đang giữ `_root`.

> **NỬA FILE NÀY DO MÁY SỞ HỮU (từ 2026-08-27).** Mọi thứ nằm giữa `<!-- AUTO:X START -->` và
> `<!-- AUTO:X END -->` là **máy sinh** — mục 1 (method Bridge), mục 3 (module), và nợ *method*
> ở mục 4. **Sửa tay trong đó sẽ mất trắng ở lần sinh sau.** Sinh lại / kiểm:
> ```bash
> node scripts/feature-parity.mjs           # sinh
> node scripts/feature-parity.mjs --check    # chỉ kiểm, không ghi
> ```
> **Mục 2 (hành vi) thì ngược lại: của NGƯỜI, và máy bị cấm đụng vào.** Dò theo tên hàm đã cho
> kết luận sai bốn lần trong một ngày. Muốn thêm dòng hành vi thì phải mở code đọc, gắn nhãn
> **[ĐỌC]**, kèm bằng chứng.
>
> Và một luật nhỏ nhưng đã trả giá: **đừng viết văn của người chung dòng với số của máy** —
> một câu diễn giải đã bị nuốt mất đúng vì nằm chung dòng với con số. Mỗi dòng ghi rõ được xác lập
bằng cách nào (**[ĐO]** máy đếm · **[ĐỌC]** đọc thẳng code · **[DÒ]** tìm theo tên), vì ba loại
đó tin được khác nhau: dò theo tên đã cho hai kết quả sai trong một buổi. **Dòng [DÒ] phải kiểm
lại trước khi hành động.** Port tính năng sang nhánh kia thì đọc file này trước, đừng đọc
`BACKLOG.md` — danh sách port trong backlog đã lạc hậu một lần (ghi Gemini thiếu `run.stop`
trong khi nó đã có).

## 7. Đóng phiên — ghi lại 3 thứ

1. Một dòng Log vào `HANDOFF.md` của package: làm gì, kết quả số, còn gì mở.
2. Quyết định mới của Đức → `decisions.md`.
3. Gặp lỗi mới trên trang thật → thêm 1 dòng vào bảng lỗi của sổ tay, **và** cân nhắc thêm
   1 phép kiểm vào `scripts/session-check.mjs`.

> Luật nào không kiểm được bằng máy thì sớm muộn cũng bị bỏ qua. Đó là lý do có cổng kiểm.
