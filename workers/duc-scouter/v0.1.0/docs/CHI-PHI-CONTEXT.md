# CHI PHÍ CONTEXT TRÌNH DUYỆT — đo 18/09 trên Vizcom thật

**Phiên:** `claude-universal-scouter` · **Bề mặt đo:** `app.vizcom.com/files/<org>/recent` (trang mẹ)
**Bằng chứng thô:** [`../../pilots/vizcom-anhducds/bcb-trang-me-2026-09-18.txt`](../../pilots/vizcom-anhducds/bcb-trang-me-2026-09-18.txt)
**Chạy lại:** `node workers/duc-scouter/pilots/vizcom-anhducds/do-bcb.mjs` — read-only, chạy đúng trên
bề mặt nào đang mở.

> **Token thật: UNKNOWN.** Bộ đo ở Node không đọc được usage của runtime, và nó **không** nhân một
> hệ số rồi gọi đó là token. Mọi con số dưới đây là **byte** và **chữ**, đo được.

---

## A. ĐƯỜNG CƠ SỞ — CC đang nhận bao nhiêu

Một lượt trả lời câu hỏi *"trang có phơi `anhducds@gmail.com` không?"* theo lối đọc rộng:

| | lượt gọi | byte thô | **chữ vào context** | ms |
|---|---|---|---|---|
| tìm bề mặt (`bridge.sessions` + `scout.targets` × 4 ghế) | 5 | **23.080** | — | — |
| `scout.page` + `scout.a11y` rồi đổ nguyên cho AI | 2 | 23.366 | **14.180** | 255 |

**Tỉ lệ hữu ích: 43 / 14.180 = 0,3% — THẤP.** Câu trả lời cần 43 chữ; AI phải đọc 14.180.

---

## B. ĐỐT NHIỀU NHẤT — cùng một target, cùng một trang

| method | byte thô | node | ms |
|---|---|---|---|
| **`scout.targets`** (một ghế 44 tab) | **16.577** | 44 | 6 |
| **`scout.a11y`** (limit 1500) | **14.400** | 131 | 59 |
| `scout.tree` (depth 4, max 50) | 10.501 | — | 21 |
| `scout.page` (limit 200) | 8.966 | 23 | 42 |
| `scout.query` (`[data-testid]`) | 1.568 | 2 | 24 |
| `scout.text` (1 selector) | 961 | 1 | 12 |
| `scout.view` | 244 | — | 37 |
| **`scout.song`** | **73** | — | 32 |

**Phát hiện đắt nhất của cả phép đo, và nó không phải `a11y`:**
`scout.targets` tốn **23.080 byte cho MỘT lượt giải target**, vì bộ giải hỏi **hết** ghế và một
ghế của Đức đang mở 44 tab. Con số đó **không tỉ lệ với việc phải làm — nó tỉ lệ với số tab Đức
đang mở**. Tức chặng *tìm* tốn hơn chặng *đọc*, và nó sẽ tệ dần theo ngày làm việc của Đức.

Bậc rẻ nhất (`song` · `view` · `text` · `query`) **rẻ hơn 9–200 lần** bậc đắt.

---

## C. BENCHMARK — ba cách nhìn, cùng một câu hỏi

| Ca | Mode | lượt | byte thô | **chữ cho AI** | ms | hữu ích | kết luận |
|---|---|---|---|---|---|---|---|
| A · email | A đọc rộng | 2 | 23.366 | **14.180** | 255 | THẤP 43/14180 | giải được |
| A · email | **B vị ngữ Node** | 1 | 14.400 | **89** | 39 | CAO 89/89 | **giải được, y hệt** |
| A · email | D ảnh + hỏi đúng chỗ | — | — | — | — | — | không chạy¹ |
| B · ô prompt | A đọc rộng | 2 | 23.366 | 14.180 | 82 | THẤP | không có trên bề mặt này |
| B · ô prompt | B vị ngữ Node | 1 | 14.400 | 48 | 42 | CAO | không có trên bề mặt này |
| B · ô prompt | **D ảnh + hỏi đúng chỗ** | 1 | **874** | **72** | **23** | CAO | không có trên bề mặt này |
| C · Render | A / B | 2 / 1 | 23.366 / 14.400 | 14.180 / 48 | 68 / 37 | THẤP / CAO | không có trên bề mặt này |
| C · Render | D | — | — | — | — | — | không chạy² |

¹ Ảnh **chỉ ra** email ở khối người dùng góc dưới trái, nhưng **không** sinh ra một selector ổn
định cho nó — và đoán selector là thứ luật gói cấm. Ảnh thu hẹp không gian tìm; nó không tự
thành một neo.
² Ảnh thấy rõ nút `Generate` xanh, nhưng quét DOM cho thấy nút đó **chỉ có hash
styled-components**. Hợp đồng luật ⑸ cấm neo vào hash. **Biết nó ở đâu mà dây vẫn không có
đường gọi hợp lệ** — đây là giới hạn của Vizcom, không phải của Scouter.

**Tổng cả ba ca:** A **42.540** chữ · B **185** chữ · D **72** chữ.
Thô: A 70.098 B · B 43.200 B.

---

## D. TIẾT KIỆM — đo được, không ước lượng

| | giảm chữ-vào-context | giảm byte thô |
|---|---|---|
| B so với A | **99,4 – 99,7 %** | 8.966 B mỗi ca (bỏ `scout.page`) |
| D so với A *(khi có neo ngữ nghĩa)* | **99,5 %** | **22.492 B — rẻ hơn 27 lần** |

Chỗ tiết kiệm lớn nhất **không nằm ở dây, nó nằm ở chỗ rút gọn**: cùng một `scout.a11y`, cùng
14.400 byte về Node, mà đưa cho AI **89 chữ** thay vì **14.180**. Rút gọn ở Node **không** giảm
một byte thô nào — và đó chính là lý do phải in tách hai con số.

### Ảnh KHÔNG miễn phí — và đây là chỗ dễ kết luận sai nhất

Ba ảnh Đức gửi, theo **công thức tài liệu** `tokens ≈ (rộng × cao) / 750`, mỗi ảnh ~2.000×1.050
→ **~2.800 token/ảnh, ~8.400 token cho ba ảnh**. Đây là **ƯỚC LƯỢNG theo công thức**, không phải
usage đo được — và đơn vị của nó (token) khác đơn vị các số trên (chữ), nên **không so trực tiếp
được**.

Hệ quả thực dụng: một ảnh **không tự động rẻ hơn** một lượt đọc rộng. Nó rẻ khi **dùng lại cho
nhiều câu hỏi**, hoặc khi Đức **vốn đã gửi** nó. Số câu hỏi tối thiểu để ảnh có lãi: **CHƯA ĐO**.

---

## E. CHẤT LƯỢNG — có mất bằng chứng không

**Không.** Ca A: Mode A và Mode B trả **cùng một kết luận, cùng một chuỗi bằng chứng**
(`["anhducds@gmail.com","anhducds@gmail.com"]`). Mode B **vẫn** khai `total_nodes` và
**`truncated`** — tức nó không giấu nhát cắt (`G-119`).

Ba chỗ **không được đổi** để lấy tiết kiệm, và bộ đo không đổi cái nào:

- **fail-closed**: rút gọn xảy ra SAU khi resolver đã quyết; nó không tham gia quyết định.
- **cách ly tài khoản**: bộ đo read-only, mọi lượt GHI bị **ném** — 0 lượt ghi cả ba tài khoản.
- **bằng chứng thô khi an toàn cần**: `so[]` giữ metadata từng lượt; muốn xem lại nguyên phong bì
  thì gọi lại, không phải tin bản rút gọn.

---

## F. CHÍNH SÁCH NHÌN — V1

Thang giác quan, **đi từ trên xuống, dừng ở bậc đầu tiên trả lời được**:

| Bậc | Công cụ | Giá đo được |
|---|---|---|
| **L0** | ảnh Đức gửi / bối cảnh thị giác đã biết | ~2.800 token/ảnh *(ước lượng)* |
| **L1** | `scout.targets` (metadata) · `scout.song` | 73 B – 16,6 KB ⚠ |
| **L2** | `scout.query` · `scout.text` (vị ngữ đúng chỗ) | 961 – 1.568 B |
| **L3** | `scout.page` phạm vi hẹp | 8.966 B |
| **L4** | a11y **theo nhánh con** | **KHÔNG TỒN TẠI** — xem G |
| **L5** | `scout.a11y` toàn cây | 14.400 B |

**Ba luật:**

1. **Luôn rút gọn ở Node trước khi đưa cho AI.** Không đổ nguyên phong bì `a11y`/`page`/`tree`
   vào context. Đây là chỗ tiết kiệm 99%, và nó không cần một method mới nào.
2. **Gọi L5 thì phải ghi `WHY_FULL_A11Y`** — *"câu nào không trả lời được ở L0–L3?"*. Không trả
   lời được câu đó thì không được gọi toàn cây.
3. **Ảnh là TIỀN ĐỀ THỊ GIÁC, không phải nguồn sự thật sống.** Không dùng ảnh một mình cho: danh
   tính tài khoản · quyền ghi · trạng thái ẩn · kiểm tra còn sống. Bốn thứ đó phải xác nhận trên dây.

---

## G. BA THAY ĐỔI ĐÁNG LÀM — theo thứ tự lợi/giá

| # | Thay đổi | Giá | Lợi đo được |
|---|---|---|---|
| **1** | Bộ vị ngữ ở Node thành đường MẶC ĐỊNH cho mọi pilot (`do-chi-phi.mjs` đã có hình dạng) | Node-side, **không đụng extension, không thêm method** | **−99,4%** chữ vào context |
| **2** | Thêm `root_selector` cho `scout.a11y` → mở bậc **L4** | **ĐỔI LUẬT AN TOÀN** — sửa một method đang có ⇒ **phải hỏi Đức**, và cần nạp lại extension | cắt cả byte THÔ, không chỉ chữ; hiện L4 rỗng nên mọi câu hỏi rơi xuống L5 |
| **3** | Nhớ tạm `target_id` + URL theo ghế trong một lượt chạy, thay vì hỏi lại hết ghế | Node-side, phải **hết hiệu lực khi nối lại Bridge** (`G-118`) | **−23.080 B** mỗi lượt giải target; càng nhiều tab càng lãi |

**Không làm:** thêm năng lực trình duyệt chỉ để giảm context · nhét một bộ tóm tắt bằng AI giữa
trình duyệt và CC · che bằng chứng thô khi an toàn cần nó · giảm fail-closed.

### Primitive thật sự còn thiếu — đúng hai

1. **a11y theo nhánh con (L4).** `scout.a11y` chỉ nhận `target_id` + `limit`; không có tham số
   gốc. Nên bậc L4 trong thang trên **là một ô trống**, và mọi câu hỏi ngữ nghĩa rơi thẳng xuống
   L5 toàn cây.
2. **Vị ngữ theo CHỮ ở phía extension.** Hôm nay muốn biết *"chuỗi X có trên trang không"* thì
   phải kéo cả cây về rồi tìm ở Node. Rút gọn ở Node cứu được **chữ vào context**, không cứu
   được **byte thô**.

Cả hai đều là **đổi luật an toàn**. Ghi ra để Đức chốt, **chưa làm**.

---

## H. BƯỚC KẾ TIẾP — một bước

Đức mở **workbench** rồi chạy lại `do-bcb.mjs` một lượt: ca B và ca C hiện báo
`KHÔNG_CÓ_TRÊN_BỀ_MẶT_NÀY` vì trang mẹ không có ô prompt lẫn nút Render, nên phần benchmark
của hai ca đó vẫn còn trống.
