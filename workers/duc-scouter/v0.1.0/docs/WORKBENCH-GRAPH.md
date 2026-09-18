# WORKBENCH LÀ BỀ MẶT CHÍNH — bản đồ graph và chi phí nhìn

**Đo:** 18/09 · ghế `99a6cade-…` (hồ sơ web Đức khai) · target `9B33CA1E…` ·
`/workbench/5c805df7-…` = *"Car trial 1"*
**Bằng chứng thô:** [`bcb-workbench-2026-09-18.txt`](../../pilots/vizcom-anhducds/bcb-workbench-2026-09-18.txt)
**Chạy lại:** `node workers/duc-scouter/pilots/vizcom-anhducds/do-bcb-workbench.mjs` — read-only.

---

## 0. PHÁT HIỆN LÀM ĐỔI CẢ CÂU HỎI

**Graph của Workbench không nằm trong DOM.** Sáu phép đếm, không cái nào là suy luận:

```
img 0 · [style*="background-image"] 0 · picture 0 · video 0 · [role="img"] 0
canvas 1                                  ← có thuộc tính `data-engine`
data-node-id 0 · data-id 0 · data-block-id 0 · draggable 0 · [class*="Node"] 0
scout.view: document 2048×1017 == viewport ⇒ graph KHÔNG nở ra DOM
```

Ảnh gốc, ảnh kết quả và mọi đường nối được **vẽ trong một `<canvas>`**. Thứ duy nhất có mặt
trong DOM là **lớp phủ của khối prompt** (`[class*="Workbench"]` ×30 — `WorkbenchContent__Container`,
`WorkbenchCanvas__StyledFileDropper`, tất cả đều hash styled-components).

> **Hệ quả:** với ảnh gốc và ảnh ra, `scout.shot` **không phải một cách tối ưu — nó là giác
> quan DUY NHẤT.** Ảnh Đức gửi không phải "tiền đề để tiết kiệm context"; ở ba lớp đối tượng
> đó nó là **nguồn duy nhất**. Đọc DOM bao nhiêu lần cũng không thấy chúng.

*Một lối giải thích tôi chưa loại hết được:* shadow DOM mà `scout.query` không xuyên. Bằng chứng
nghiêng về canvas — **20 phần tử `svg` ↔ đúng 20 node `role=image`**, quan hệ 1:1, và cả 20 node
ấy **không có tên**. Tức 20 node `image` là các **icon svg**, không phải tác phẩm.

---

## 1. WORKBENCH OBJECT MAP

```
TOOLBAR                                         CONFIRMED (một phần)
  ├── Library                                   CONFIRMED  [data-testid="asset-library-toolbar-button"]
  ├── `+` Insert + các nút khác                 MỘT NỬA    12 button KHÔNG TÊN, chỉ hash class
  ├── Export · Share                            CONFIRMED  a11y name, nhưng không selector
  └── 2 nút disabled · 2 combobox               CONFIRMED  button[disabled] (2) · button[aria-expanded] (2)

CANVAS  (một phần tử duy nhất, data-engine)
  │
  ├── SOURCE IMAGE NODE                         VISUAL-ONLY   không phần tử DOM nào
  │     │
  │     ├── PROMPT BLOCK 1                      CONFIRMED
  │     │     prompt  "Elegan nice coupe silver car"        CONFIRMED (đọc `value`)
  │     │     engine  "LEGACY" · "Describe" · "Render"      CONFIRMED (a11y name)
  │     │     GENERATE                          MỘT NỬA     a11y có tên, DOM không có selector
  │     │     └── outputs[]                     VISUAL-ONLY
  │     │
  │     └── PROMPT BLOCK 2                      CONFIRMED
  │           prompt  "Racing morden car colorful"          CONFIRMED
  │           GENERATE                          MỘT NỬA
  │           └── outputs[]                     VISUAL-ONLY
  │
  └── CẠNH NỐI  source → block → output         UNKNOWN
```

**Neo duy nhất dùng được cho khối prompt:** `textarea[placeholder="What are you creating?"]` —
khớp **2**, đúng một khối một cái.

---

## 2. SÁU CÂU HỎI — trả lời được ở đâu

| | Câu hỏi | Trạng thái | Bằng chứng |
|---|---|---|---|
| Q1 | đâu là khối ảnh GỐC | **VISUAL-ONLY** | 20 node `role=image`, **0 cái có tên**; `img`=0 |
| Q2 | đâu là khối prompt/render | **CONFIRMED** | 2 khối, `textarea[placeholder=…]` khớp 2 |
| Q3 | prompt viết gì | **CONFIRMED** | `value` = hai chuỗi prompt thật |
| Q4 | đâu là nút Generate | **MỘT NỬA** | a11y có 2 button tên `Generate`; DOM chỉ hash ⇒ **không selector hợp lệ để bấm** |
| Q5 | đâu là ảnh RA tương ứng | **VISUAL-ONLY** | không phần tử DOM nào |
| Q6 | map `source → block → outputs[]` | **UNKNOWN từ DOM** | không node id, không cạnh, và `style` **bị che** (ADR-0006) nên **quan hệ không gian cũng không đọc được** |

### Q4 của Đức: xác định output MỚI sau một lượt Generate

Đức hỏi bằng bốn đường. **Cả bốn đều đóng**, và đây là phép đo chứ không phải phán đoán:

| Đường | Vì sao đóng |
|---|---|
| quan hệ DOM | output **không có phần tử DOM** |
| quan hệ graph | không `data-node-id`, không cạnh trong DOM |
| thứ tự tạo | không có phần tử để mà có thứ tự |
| quan hệ không gian | `style` bị che bởi chính sách ADR-0006; **không method ĐỌC nào trả về hộp phần tử** |

**Còn đúng một đường: diff ảnh trước/sau bằng `scout.shot`.** Và tôi **không** giả định
*"ảnh ngoài cùng bên phải là ảnh mới nhất"* — chưa đo thì không viết.

---

## 3. CHI PHÍ NHÌN — đo được

| Mode | lượt | byte thô | **chữ cho AI** | ms | trả lời được |
|---|---|---|---|---|---|
| **A** đọc rộng (`page` + `a11y`) | 2 | 18.574 | **15.962** | 215 | Q2 Q3 Q4½ |
| **C** vị ngữ Node (cùng `a11y`, rút ở Node) | 1 | 9.213 | **620** | 33 | Q2 Q3 Q4½ **+ khai rõ Q1/Q5/Q6 không có trong DOM** |
| **B** ảnh + hỏi đúng một chỗ | 1 | 1.647 | **72** | 16 | chỉ Q2 |

**C giảm 96,1% chữ vào context so với A, với CÙNG lượng bằng chứng** — cùng đúng một lượt
`scout.a11y`. Thô chỉ giảm 9.361 B (do bỏ `scout.page`, thứ không thêm gì mà a11y chưa có).

Phí **tìm** bề mặt: **24.092 B / 5 lượt** — vẫn lớn hơn cả lượt đọc rộng, y như trên trang mẹ.

### `scout.shot` — giác quan duy nhất, và nó đắt nhất

```
bytes_tho 103.066 · jpeg quality 60 · bytes 77.121 · base64 TRẢ THẲNG TRONG PHONG BÌ · 192ms
```

Đây là method đắt nhất đã đo. **Nhưng base64 chỉ đi tới Node** — Node ghi ra tệp rồi đưa CC một
**đường dẫn**, thì CC đọc nó như một ẢNH (theo công thức tài liệu ~2.800 token) thay vì 103 KB
chữ. Không cần đổi extension; đây là việc của lớp Node.

---

## 4. BIỂU DIỄN NHỎ NHẤT — 620 chữ, đã chạy thật

```json
{"be_mat":"workbench","chi_trong_canvas":true,
 "khoi_prompt":[
   {"i":0,"prompt":"Elegan nice coupe silver car","nut_generate":"a11y:button[name=Generate]#0"},
   {"i":1,"prompt":"Racing morden car colorful","nut_generate":"a11y:button[name=Generate]#1"}],
 "anh_goc":"KHÔNG_CÓ_TRONG_DOM — vẽ trong canvas",
 "anh_ra":"KHÔNG_CÓ_TRONG_DOM — vẽ trong canvas",
 "canh_noi":"KHÔNG_CÓ_TRONG_DOM — vẽ trong canvas",
 "giac_quan_duy_nhat_cho_ba_dong_tren":"scout.shot"}
```

Ba dòng `KHÔNG_CÓ_TRONG_DOM` **đắt giá hơn cả phần dữ liệu**: chúng ngăn phiên sau đi đọc lại
15.962 chữ để rồi phát hiện đúng điều này. Một biểu diễn tốt phải khai cả chỗ nó **không** biết.

---

## 5. CHÍNH SÁCH NHÌN RIÊNG CHO WORKBENCH

| Đối tượng | Dùng gì | Đừng dùng gì |
|---|---|---|
| ảnh gốc · ảnh ra · cạnh nối | **`scout.shot`** (hoặc ảnh Đức gửi) — giác quan duy nhất | DOM/a11y: chúng không có ở đó |
| khối prompt · prompt text | `scout.a11y` **một lượt**, rút ở Node | `scout.page` (9,3 KB, không thêm gì) |
| tồn tại/số lượng khối | `scout.query` trên `textarea[placeholder=…]` (1,6 KB) | a11y toàn cây |
| còn sống | `scout.song` (73 B) | bất cứ gì khác |
| cấu trúc DOM | — | **`scout.tree` từ gốc `#document`**: tiêu hết hạn vào `HEAD` (77 con), `truncated:true` ở 60 node, **không bao giờ tới canvas** |

**Ảnh vẫn KHÔNG được dùng một mình cho:** danh tính tài khoản · quyền ghi · trạng thái ẩn ·
kiểm tra còn sống. Bốn thứ đó phải xác nhận trên dây. Ảnh là nguồn duy nhất cho **hình học
graph**, không phải cho **quyền**.

---

## 6. BA THAY ĐỔI ĐÁNG LÀM

| # | Thay đổi | Giá | Lợi đo được |
|---|---|---|---|
| **1** | Bộ rút gọn graph ở Node thành đường mặc định cho Workbench (đã có bản chạy) | Node-side, **không đụng extension** | **−96,1%** chữ: 15.962 → **620** |
| **2** | `scout.shot` ghi ra ĐĨA ở lớp Node rồi trả **đường dẫn**, không trả base64 lên context | Node-side, **không đụng extension** | **−103.066 B chữ** mỗi lượt nhìn; và đây là giác quan duy nhất cho canvas nên nó bị gọi nhiều |
| **3** | Đường gọi **theo chỉ số** cho neo lặp: `textarea[placeholder=…]` khớp 2, mà luật gói số 7 đòi khớp **đúng một** ⇒ **hôm nay không lệnh GHI nào chạm được khối prompt thứ hai** | **ĐỔI LUẬT AN TOÀN** — phải hỏi Đức, phải nạp lại extension | mở đường tự động hoá Workbench; hiện đang **chặn cứng** |

**Không làm:** thêm năng lực trình duyệt chỉ để giảm context · nhét bộ tóm tắt bằng AI giữa
trình duyệt và CC · che bằng chứng thô khi an toàn cần · giảm fail-closed.

### Chặn cứng thật sự, nói thẳng

Muốn CC bấm `Generate` của **đúng một** khối prompt thì cần **hai** thứ hôm nay chưa có:
⑴ một đường gọi tới nút đó (a11y biết tên, DOM không có selector); ⑵ đường gọi theo chỉ số cho
neo khớp nhiều. Không có hai thứ đó thì Workbench **đọc được nhưng không thao tác được** — và
đó là kết luận của phép đo, không phải một lựa chọn thận trọng.

---

## 7. BƯỚC KẾ TIẾP — một bước

Đo **diff `scout.shot` trước/sau một lượt Generate do ĐỨC bấm tay**: đó là phép đo duy nhất còn
thiếu để trả lời `outputs = N → N+1`, và nó không cần một lệnh ghi nào từ tôi.
