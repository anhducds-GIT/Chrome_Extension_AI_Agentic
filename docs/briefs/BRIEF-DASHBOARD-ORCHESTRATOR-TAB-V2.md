---
kind: brief
status: active
ttl_days: 90
---

# BRIEF `DASH-ORCH-V2` — tab "AI điều phối" đổi từ trạng thái hệ Assistant sang chỗ Đức điều hành

> **Cho executor.** Đề bài đã chốt (Đức, 2026-09-04, sau khi tự audit bản V1).
> Bản V1 nằm ở [`BRIEF-DASHBOARD-ORCHESTRATOR-TAB.md`](BRIEF-DASHBOARD-ORCHESTRATOR-TAB.md) —
> **đọc mục 2 và mục 4 của nó trước**, hai mục đó còn nguyên hiệu lực và bản này không nhắc lại.
> Nó nay mang `status: superseded`: đọc để lấy **ràng buộc**, không phải để làm lại từ đầu.
> Phiên điều phối đứng ngoài triển khai (luật `ROLE-DRIFT-01`): sửa bộ sinh là việc executor.

## 1. Vì sao đổi — Đức nói thẳng chỗ sai

*"Tab AI điều phối hiện tại đang hiển thị **hạ tầng của Assistant**, chứ chưa hiển thị **thông
tin giúp Đức điều hành dự án**."*

Ba bằng chứng Đức đưa, và cả ba đều đúng:

1. Khối to nhất của tab là 6 khoá BẬN/MỞ. Nhưng chính bộ sinh phải **lọc dòng khoá khỏi phép so
   độ tươi** vì chúng đổi quá thường xuyên — tức nó tự thừa nhận đây là ảnh chụp, không phải
   trạng thái đáng tin nhất để ra quyết định. Đặt nó ở vị trí số 1 là sai thứ tự.
2. Khối ba mốc gói Assistant đổi vài tuần một lần. Không đáng một card to mỗi ngày.
3. V1 được thiết kế là *"status của hệ Assistant"*. Cái Đức cần là *"chỗ để làm việc cùng
   Assistant"*. Đó là hai thứ khác nhau, không phải cùng một thứ trình bày khác.

**Mental model mới, ghi ra để về sau không trượt lại:**

> Bảng **không** cố trả lời mọi câu hỏi. Bảng = **trạng thái cần nhìn thường xuyên**.
> Hỏi sâu và kiểm chứng theo yêu cầu là việc của Assistant trong chat.

Mở tab ra, Đức phải trả lời được đúng bốn câu: *Tôi cần làm gì? · Việc chính đang ở đâu? ·
Có gì bất thường? · Assistant có đang làm tốt việc của nó?*

## 2. Bốn vùng, theo đúng thứ tự này

Thứ tự **là** một phần đề bài. Vùng 1 trên cùng, vùng 4 dưới cùng và gập lại.

### Vùng 1 · CẦN ĐỨC — trên cùng, không gập

Chỉ những thứ Đức **phải hành động hoặc phải quyết**. Không lẫn việc AI tự làm được.

Nguồn dữ liệu **đã có, đừng tạo mới**: trường `human_action` trong frontmatter mỗi
`STATUS.md`. Phép kiểm `B15` đã cưỡng chế trường này là tiếng Việt có dấu, viết cho mắt Đức —
tức nó vốn được sinh ra đúng cho chỗ này.

Mỗi việc một dòng: **đơn vị** · **cần Đức làm gì**. Đơn vị có link nhảy sang tab `Extension`.

Đức mô tả bốn cột `việc · cần làm gì · vì sao · ảnh hưởng nếu chưa làm`. **Hai cột sau chưa có
nguồn máy đọc được** — và gõ tay vào bộ sinh chính là "database thứ hai" mà Đức cấm. Cách xử:

- Đọc thêm một trường **tuỳ chọn** `blocked_if_skipped` trong cùng frontmatter `STATUS.md`.
  Có thì render thành dòng phụ mờ dưới việc; **không có thì không render gì**, không bịa,
  không để chỗ trống trông như lỗi.
- **KHÔNG** sửa `STATUS.template.md`, **KHÔNG** sửa `STATUS.md` của bất kỳ worker nào trong
  lượt này. Bốn file đó thuộc khoá khác — thêm trường là việc của chủ gói, làm sau, không khoá.
  Hôm nay trường vắng ở cả bốn đơn vị, và tab vẫn phải trông đúng khi nó vắng.

Không đơn vị nào có `human_action` → in một dòng "Không có việc nào đang chờ Đức", đừng ẩn cả
vùng. Vùng trống **là** một thông tin.

### Vùng 2 · CÔNG VIỆC HIỆN TẠI — mỗi luồng đúng một dòng

Một dòng cho mỗi đơn vị đang sống. Sắp theo `priority_rank` tăng dần (1 lên đầu).

Mỗi dòng: **tên (link)** · **badge trạng thái** · **gate tiếp theo**.

Trạng thái suy ra, **không** khai tay — ba giá trị làm được ngay:

| Trạng thái | Suy ra khi |
|---|---|
| `CHỜ ĐỨC` | có `human_action` — thắng mọi trạng thái khác |
| `ĐANG CHẠY` | `lifecycle: building` hoặc `active`, và không có `human_action` |
| `XONG` | `lifecycle: superseded` (và mọi giá trị nghỉ khác) |

`BLOCKED` và `CHỜ EVIDENCE` Đức có nêu, nhưng repo hôm nay **không có trường nào phân biệt
được chúng với `ĐANG CHẠY`**. Dò văn xuôi `next_step` để đoán là đúng cái đã sai bốn lần trong
một ngày ở `FEATURE-PARITY.md`. **Vậy: hiện thực ba trạng thái trên, hai cái kia để dành.**
Muốn đủ năm thì cần một trường mới trong `STATUS.md` — ghi `IDEAS.md`, đừng tự thêm.

"Gate tiếp theo" lấy từ `next_step`, **rút gọn tới câu đầu** (cắt ở `. ` hoặc `— `, tuỳ cái nào
tới trước), tối đa ~110 ký tự, thêm `…` nếu cắt. Bản đầy đủ đã có ở tab `Extension` — dòng này
chỉ là mồi để bấm sang, **không** phải chỗ chứa lần thứ hai.

### Vùng 3 · SỨC KHOẺ ASSISTANT — nhỏ, nhưng là nơi soi chính tôi

Hai dòng có nguồn máy đọc được, làm ngay:

- **Mốc pilot** — lấy từ bảng mục 2 của `docs/protocols/ASSISTANT-V0.1.md` (dòng
  `ASSISTANT PILOT`). Y hệt cách V1 đang đọc, giữ nguyên cơ chế.
- **Đề bài đang mở** — đếm từ frontmatter `status:` của `docs/briefs/BRIEF-*.md`. Cơ chế đã có
  ở V1, giữ nguyên. Kèm danh sách mã đang mở, một dòng.

  **Đổi tên tiêu đề khối này** từ *"Sai lệch đã ghi nhận của chính tôi"* sang **"Đề bài đang mở
  của chính tôi"**. Lý do: cùng một cơ chế đếm cả defect thật (`ROLE-DRIFT-01`) lẫn đề bài
  cải tiến (`DASH-ORCH-V2`), mà gọi một đề bài cải tiến là "sai lệch" thì sai. Phân biệt được
  hai loại thì cần thêm trường — không làm, đổi tiêu đề là đủ đúng.

**Ba dòng đếm trượt: Đức ĐÃ CHỐT định dạng — xem [mục 8](#8-hai-điều-đức-chốt-thêm-04-09).**
Làm luôn lượt này, theo đúng bốn token ở đó, và đọc kỹ câu về chữ **"đã ghi nhận"**.

### Vùng 4 · HẠ TẦNG — gập lại, dưới cùng

Bọc trong `<details>`, **mặc định đóng**. Chứa:

- Bảng khoá BẬN/MỞ — **y nguyên V1**, kể cả câu giải thích "ảnh chụp lúc sinh" và câu "cố ý
  không nói ai đang giữ". Chỉ đổi chỗ đứng, không đổi nội dung.
- Ba mốc gói Assistant thu thành **một chip** duy nhất, ví dụ `Assistant v0.1 · PILOT` — tên
  mốc đang chạy đọc từ hồ sơ mốc, không gõ tay. Bỏ card riêng.

## 3. Ba cái bẫy trong file này — đọc trước khi gõ

1. **`KHOA_PREFIX` phải vẫn ở ĐẦU DÒNG.** Phép so độ tươi lọc bằng `line.startsWith(KHOA_PREFIX)`
   trong `scripts/build-overview.mjs`. Chuyển bảng khoá vào `<details>` mà thụt lề trước prefix
   là **mọi lượt đổi bận↔mở lại làm bảng lệch**, và không test nào hiện có bắt được — nó chỉ
   hiện ra lúc ai đó bị `safe-push` từ chối. Giữ đúng dạng `${KHOA_PREFIX}` rồi mới tới khoảng
   trắng và `<div`.
2. **Đừng chạm CSS của `[role="tabpanel"]`.** Một dòng `[role="tabpanel"][hidden]{display:none}`
   là thứ đang giữ cho 9 tab đổi được — bug `DASH-TAB-01` sống ẩn suốt từ commit dựng tab đầu
   tiên, cả 8 tab hỏng mà không ai thấy. Thêm `<details>` thì vô hại; thêm bất kỳ `display` mới
   cho `[role="tabpanel"]` thì hỏng lại.
3. **Đừng gọi `what-next.mjs` hay `state-check.mjs` từ bộ sinh.** Hai cái đó đọc trạng thái sống;
   bảng suy hoàn toàn từ HEAD. Cần dữ liệu gì thì đọc thẳng file đã commit.

## 4. KHÔNG làm

- **KHÔNG** thêm file dữ liệu mới, **KHÔNG** thêm trường vào `STATUS.md` của worker nào,
  **KHÔNG** sửa `STATUS.template.md`. Vùng 1 đọc trường tuỳ chọn và chịu được khi nó vắng.
- **KHÔNG** thêm logic agent, không thêm vùng thứ năm. Thấy đáng thêm → `IDEAS.md`.
- **KHÔNG** sửa `DASHBOARD.html` bằng tay. Nó là artifact máy sinh.
- **KHÔNG** sửa `session-check.mjs` · `safe-push.mjs` · `claim.mjs` · `what-next.mjs` ·
  `state-check.mjs` · `build-dashboard.mjs`.
- **KHÔNG** đưa gì phụ thuộc **giờ đồng hồ lúc sinh** vào trang.
- **KHÔNG** tạo hook/cron/automation tự chạy.
- Luật trang dành cho Đức, giữ nguyên: **không SHA · không đường dẫn · không phần trăm · không
  lời máy tự khen**. Chữ Đức thấy là tiếng Việt có dấu; mã lỗi giữ tiếng Anh.

## 5. Xong khi nào

1. Tab hiện đúng **bốn vùng theo đúng thứ tự**, mở bằng trình duyệt thấy đúng, vùng 4 gập.
2. **Sinh hai lần liên tiếp ra kết quả y hệt** (tất định).
3. Test ghim trong suite gốc + **thử phá** (sửa cho sai → phải ĐỎ). Tối thiểu ghim được:
   - bốn vùng có mặt, và **vùng `CẦN ĐỨC` đứng trước vùng công việc** trong HTML;
   - vùng 1 đọc từ `human_action`, và **render đúng khi trường `blocked_if_skipped` vắng**;
   - trạng thái suy đúng cả ba nhánh, và **`human_action` thắng `lifecycle`**;
   - vùng 2 sắp theo `priority_rank`;
   - `KHOA_PREFIX` vẫn ở đầu mỗi dòng khoá **sau khi** đã vào `<details>`;
   - **không** rò tên phiên giữ khoá ra trang.
   Báo số thật, kể cả số lượt thoát ban đầu.
4. Cổng đóng phiên XANH TOÀN BỘ. Sinh lại `DASHBOARD.html`.
5. Log vào `HANDOFF.md` gốc, commit có nhãn `Lane:`, đẩy bằng `safe-push.mjs`. Bị từ chối vì
   cuốn theo việc phiên khác → **DỪNG và báo**, đừng tự `--carry`.
6. Trả khoá — **lượt push riêng**, sau khi đã push việc.

**Phép thử cuối:** đổi `human_action` của một đơn vị thành rỗng (sửa tạm, hoàn nguyên sau), sinh
lại, mở ra: đơn vị đó phải **rời** vùng `CẦN ĐỨC` và badge ở vùng 2 phải đổi từ `CHỜ ĐỨC` sang
`ĐANG CHẠY`. Nhớ hoàn nguyên — và đừng commit lượt sửa tạm đó.

## 6. Khoá cần giữ

Chỉ `_code` (`scripts/` + `tests/`). `DASHBOARD.html` là artifact miễn khoá; `HANDOFF.md` gốc
miễn khi chỉ thêm dòng ở cuối. **Không nhận `_root`, không nhận khoá gói nào** — nếu thấy cần,
tức là đã trượt ra ngoài đề bài: dừng và báo.

## 7. Câu hỏi thì hỏi Đức

Brief thiếu gì thì hỏi Đức một câu ngắn. Phiên điều phối cố ý đứng ngoài.

## 8. Hai điều Đức chốt thêm (04/09)

Hai câu ở mục 2 và mục 3 đã có trả lời. Cả hai **thêm vào phạm vi lượt này**, không để vòng sau.

### 8a · Gộp `CONTENT-TRUTH-01` — phạm vi CỰC HẸP

Đức chốt gộp, lý do: *"dashboard phải giúp Đức ra quyết định đúng. Một chip `ĐÃ CHỨNG MINH`
nhưng evidence đã cũ làm dashboard mới đẹp hơn nhưng vẫn nguy hiểm."* Và vì cùng
`build-overview.mjs`, cùng khoá `_code` — chờ vòng hai chỉ thêm một lần bàn giao và một lần
rủi ro phiên chết giữa chừng (hôm nay đã năm ca).

Đề bài đầy đủ ở [`BRIEF-CONTENT-TRUTH-01.md`](BRIEF-CONTENT-TRUTH-01.md) — **đọc cả file**,
nó đã hẹp sẵn và đã liệt kê hai cái bẫy ký tự vô hình đáng đọc. Ba điều cần nhấn:

- **Được làm đúng defect 4:** đơn vị có `lastVerified` và `changedCount > 0` thì trang phải nói
  rõ **bằng chứng thuộc bản cũ hơn N commit**, hiện **cùng chỗ với chip trạng thái**, không giấu
  trong toggle. Chữ Đức muốn thấy: đại ý **"CHỨNG MINH CŨ · CẦN KIỂM LẠI"**.
- **KHÔNG mở thành hệ provenance mới.** Đức nói thẳng câu này. Dữ liệu đã có ở `row.changedCount`
  trong model hiện tại — không nối thêm nguồn nào, không thêm trường nào.
- **Defect 5 và defect 6 của brief đó vẫn KHOÁ.** Mục 7 của nó ghi rõ Đức chỉ chốt defect 4.
  Lượt này không đổi.

Xong thì đổi frontmatter `BRIEF-CONTENT-TRUTH-01.md` sang `status: done` — nhưng file đó thuộc
`_docs`, **không phải khoá của bạn**: báo lại, đừng tự sửa.

### 8b · Định dạng Log để đếm được — bốn token, một bộ từ vựng

Vẫn dùng chính `HANDOFF.md` ở gốc repo, **không lập sổ mới** (đúng luật `ASSISTANT-V0.1.md`
mục 5). Mỗi sự cố của Assistant là **đúng một dòng máy đọc**:

```text
AssistantEvent: ROLE-DRIFT
AssistantEvent: STATE-DRIFT-CAUGHT-BY-DUC
AssistantEvent: DASHBOARD-STALE
AssistantEvent: UNKNOWN
```

Luật Đức chốt, năm điều, **đủ cả năm mới đúng**:

1. **Bộ từ vựng cố định, đúng bốn token trên.** Token lạ → **NÉM lỗi có tên**, đừng bỏ qua im
   lặng: một token gõ sai mà bị bỏ qua thì đúng cái sự cố đó biến mất khỏi số đếm.
2. **Đếm khớp token chính xác, KHÔNG dò văn xuôi.** Neo bằng **một dòng** (`^AssistantEvent: X$`),
   đừng khớp nhiều dòng — repo này đã bị CRLF làm hỏng neo nhiều dòng bốn lần trong một ngày.
3. **Assistant KHÔNG tự ghi `ANSWERED` / `PASS`.** Chỉ ghi sự cố. Đây là bộ đếm lỗi, **không
   phải điểm** — cố ý, để Assistant không có đường nào tự làm đẹp số của mình.
4. Bảng hiện đúng ba dòng: **`Trượt vai · N` · `Sai lệch Đức phải bắt · N` · `Bảng cũ · N`**
   (chữ tiếng Việt có dấu; ba tên trên là gợi ý, giữ nghĩa là được). `UNKNOWN` đếm riêng nếu
   muốn, nhưng **không** gộp vào ba dòng này.
5. **Chữ phải là "đã ghi nhận", không được là "0 lỗi".** Đây là chỗ dễ sai nhất và Đức nêu
   riêng: `N = 0` chỉ có nghĩa **chưa ai ghi nhận sự cố nào**, không có nghĩa không có sự cố.
   Viết "0 lỗi" là biến một khoảng trống dữ liệu thành một lời tự khen — mà lời máy tự khen thì
   trang này cấm sẵn.

**Có dữ liệu thật để kiểm, không phải kiểm với số 0:** `HANDOFF.md` gốc đã có sẵn ba dòng
`AssistantEvent:` ghi lùi cho ba sự cố thật hôm nay (một trượt vai, một sai lệch Đức bắt, một
bảng cũ). Phép ghim của bạn phải đọc ra đúng ba cái đó, và phải **ĐỎ** khi bạn thử xoá một dòng.
