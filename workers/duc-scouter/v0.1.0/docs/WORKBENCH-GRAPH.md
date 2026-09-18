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
`WorkbenchCanvas__StyledFileDropper` — ~~"tất cả đều hash"~~: hash chỉ ở **ĐUÔI**, tên component ở đầu **ổn định và neo được**, xem §8).

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
  │     │     GENERATE                          CHẶN BỞI SỐ LƯỢNG  selector hợp lệ CÓ (§8), khớp 2 ⇒ không ghi được
  │     │     └── outputs[]                     VISUAL-ONLY
  │     │
  │     └── PROMPT BLOCK 2                      CONFIRMED
  │           prompt  "Racing morden car colorful"          CONFIRMED
  │           GENERATE                          CHẶN BỞI SỐ LƯỢNG (§8)
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
| Q4 | đâu là nút Generate | **CONFIRMED, VÀ BẤM ĐƯỢC** | `[class^="…__Img2Img-"]:has(button[id="<id-React>"]) button[class*="__GenerateButton"]` khớp **ĐÚNG MỘT**. Đã bấm thật 18/09 → §9. ~~"chỉ hash"~~ ~~"không selector nào khớp một, đây là số học"~~ — **cả hai đều SAI** |
| Q5 | đâu là ảnh RA tương ứng | **VISUAL-ONLY, đã xác nhận bằng diff ảnh** | không phần tử DOM nào ở lại; hàng output của khối đã bấm **2 → 3** (§9) |
| Q6 | map `source → block → outputs[]` | **CONFIRMED bằng ảnh, UNKNOWN từ DOM** | ảnh cho thấy rõ 1 source → 2 khối → mỗi khối một hàng output, và các nút `+`/`−` trên cạnh (`"Remove Connector"`). Từ DOM thì vẫn không: không node id, không cạnh, `style` bị che (ADR-0006) |

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
| **3** | Đường gọi **theo chỉ số** cho neo lặp: cả `textarea[placeholder=…]` lẫn `button[class*="…__GenerateButton"]` đều khớp **2**, mà luật số 7 đòi **đúng một** ⇒ **hôm nay không lệnh GHI nào chạm được khối prompt hay nút Generate** | **ĐỔI LUẬT AN TOÀN** — phải hỏi Đức, phải nạp lại extension | mở đường tự động hoá Workbench; hiện đang **chặn cứng** |

**Không làm:** thêm năng lực trình duyệt chỉ để giảm context · nhét bộ tóm tắt bằng AI giữa
trình duyệt và CC · che bằng chứng thô khi an toàn cần · giảm fail-closed.

### Chặn cứng thật sự, nói thẳng

Muốn CC bấm `Generate` của **đúng một** khối prompt thì cần **hai** thứ hôm nay chưa có:
⑴ một đường gọi tới nút đó (a11y biết tên, DOM không có selector); ⑵ đường gọi theo chỉ số cho
neo khớp nhiều. Không có hai thứ đó thì Workbench **đọc được nhưng không thao tác được** — và
đó là kết luận của phép đo, không phải một lựa chọn thận trọng.

---

## 7. ~~BƯỚC KẾ TIẾP — một bước~~ ĐÃ ĐO XONG 18/09, xem §9

~~Đo diff `scout.shot` trước/sau một lượt Generate do ĐỨC bấm tay: đó là phép đo duy nhất còn
thiếu để trả lời `outputs = N → N+1`, và nó không cần một lệnh ghi nào từ tôi.~~

**Gạch tại chỗ, không xoá** (18/09, đóng V1). Phép đo đã chạy — §9 và `G-131` — và chạy khác
cách viết ở đây: **tôi bấm**, không phải Đức, dưới cổng ghi Đức mở sẵn. Kết quả `outputs 2 → 3`
trên đúng khối được bấm. Giữ nguyên câu cũ vì nó ghi lại một giả định đã bị chính phép đo sửa:
*"không cần một lệnh ghi nào từ tôi"* — thực tế cần đúng một, và cái giá của nó là một credit
Vizcom. Đọc §9 để lấy con số; đừng chạy lại bước này.

---

## 8. SỬA MỤC 1/2/6 — nút Generate CÓ đường gọi hợp lệ (18/09 tối)

Ở trên tôi viết *"DOM chỉ hash styled-components ⇒ không có selector hợp lệ"*. **Sai.** Class
đầy đủ của hai nút:

```
Button__StyledButton-sc-1dj7csb-0  WorkbenchElementImg2Img__GenerateButton-sc-ukbsh3-2  jiRMPz fOFwsU
└── hash ở ĐUÔI ─────────────────┘└── tên component, ỔN ĐỊNH ────────────────────────┘
```

Nên `button[class*="WorkbenchElementImg2Img__GenerateButton"]` **không chứa `-sc-`** và **qua
luật ⑸**. Tôi đã đọc *"class chứa hash"* thành *"không neo được vào class"* — hai câu khác nhau,
và câu sai đã đóng một cửa đang mở (`G-127`).

**Bản đồ component của khối prompt** — 8 tên, đọc được, ổn định:

```
WorkbenchElementImg2Img                    ← khung khối
  ├ __Title · __TitleLeft · __TitleRight     "Render" · "LEGACY"
  ├ __Img2ImgToolbar
  ├ __Img2ImgPromptWrapper
  │   └ __Img2ImgTextArea                    ô prompt
  └ __GenerateButton                         Generate
```

Cũng đo được: **CSS `:has()` chạy** qua `scout.query` — `div:has(> textarea[…])` khớp 2.

### Chỗ chặn thật: SỐ LƯỢNG, không phải hash

Thử **18** biến thể — `:has()` · `:nth-child` · `:nth-of-type` · `:first/last-of-type` · tổ hợp
ancestor · sibling — **tất cả trả 2 hoặc 0**. Hai khối đối xứng hoàn hảo: cả hai là
`:nth-child(2)` của **cha riêng**, và CSS **không so được chữ trong `value`** nên không tách
được theo prompt. Lõi ghi ném `SELECTOR_AMBIGUOUS` khi khớp ≠ 1
(`scripts/scouter-actions-core.mjs:942`).

⇒ **Không lệnh GHI nào chạm được nút Generate hôm nay.** Đây là số học, không phải sự thận trọng.

Và danh tính vẫn đóng: `a[href="/settings/account/profile"]` trả text `"Đ"`, đúng một ký tự —
xác nhận `G-115` qua một kênh khác.

### Mở bằng đúng một thứ

Một **tham số CHỈ SỐ** cho lệnh ghi: chọn khớp thứ `n`, sau khi đã đọc `value` của đúng khối `n`
để **xác nhận bằng bằng chứng** chứ không đoán thứ tự. Đó là **đổi luật an toàn** (nới điều kiện
"khớp đúng một" của luật gói số 7) ⇒ **Đức chốt**, rồi nạp lại extension.

Không có nó, đường đo `outputs = N → N+1` vẫn chạy được — nhưng **Đức bấm tay, tôi chụp diff**.

---

## 9. ĐÃ BẤM GENERATE — 18/09, một lượt, do tôi bấm

Đức chỉ thị hai lần *"bạn tự bấm"*. Chạy:
`node workers/duc-scouter/pilots/vizcom-anhducds/bam-generate.mjs <thư-mục-ảnh>`

| | |
|---|---|
| neo | `[class^="WorkbenchElementImg2Img__Img2Img-"]:has(button[id=":r1eg:"]) button[class*="__GenerateButton"]` — khớp **1** |
| xác nhận đúng khối | đọc `value` ô prompt **trong cùng phạm vi** → `"Elegan nice coupe silver car"` |
| `scout.song` | `song:true`, 24ms |
| công tắc ghi | **ĐANG MỞ** — `{used:1, cap_per_unlock:200, remaining:199}` |
| `scout.click` | `da_kiem:false`, và lời tự khai đúng: *"đã bắn sự kiện chuột… KHÔNG kiểm được trang có phản ứng"* |
| bộ đếm | target đúng: 36 đọc · **1 GHI** · mọi target khác: **0** |
| chi phí | 42 lượt · 374.146 B thô — **0 byte ảnh vào context** (Node ghi ra tệp, chỉ đưa đường dẫn) |

### Kết quả đo

**Hàng output của đúng khối ấy: 2 → 3.** Ảnh mới nằm **ngoài cùng bên phải hàng đó**.

> ⚠ **n = 1.** Đây là MỘT phép đo. Chưa đủ để thành luật *"ngoài cùng bên phải = mới nhất"* —
> đúng cái tôi tự dặn đừng giả định ở §2. Muốn thành luật thì cần thêm lượt, và tốt nhất là một
> lượt trên khối KHÁC để xem hàng nào nhận ảnh.

**DOM không giữ lại gì.** a11y `total` **282 → 290** ở +3s và +6s, rồi **về đúng 282** ở +12s;
`img` giữ **1**, số khối giữ **2**, `svg` 26→27→26. Tức +8 node ấy là trạng thái **tạm** (tiến
trình/`status`), không phải output. Xác nhận lần nữa: **output vẽ trong canvas**, và **`scout.shot`
là giác quan duy nhất** để thấy nó.

### Ba điều rút ra cho kiến trúc

1. **`scout.click` không bao giờ tự chứng minh được kết quả.** Nó khai thẳng `da_kiem:false`.
   Với Workbench, xác nhận **bắt buộc** là một lượt chụp + so ảnh.
2. **Đường ảnh ra ĐĨA hoạt động.** Hai lượt `scout.shot` tốn ~206 KB trên dây và **0 byte**
   context. Khuyến nghị ⑵ của `CHI-PHI-CONTEXT.md` nay là mã đang chạy, không còn là đề xuất.
3. **Danh tính vẫn là lỗ hổng duy nhất còn lại.** Lượt ghi này chạy **không** chứng minh được
   tài khoản (`G-115`), chỉ dựa trên chỉ thị trực tiếp của Đức. Pilot **khai điều đó ra ở đầu
   mỗi lượt chạy** thay vì im lặng. Muốn tự động hoá thật thì phải đóng chỗ này trước.

---

## 10. `id` CÓ BỀN KHÔNG — thí nghiệm remount, 18/09, READ-ONLY

Đức hỏi đúng một câu: *dựa được vào `id` đã lưu, hay mỗi lượt phải giải động khối bằng bằng
chứng prompt rồi lấy nút Generate con hiện tại?*

Cách đo: đọc mapping → `scout.navigate` về **đúng URL cũ** (một lượt tải lại) → **giải lại
target từ đầu** → đọc lại. **1 lượt GHI duy nhất là lượt tải lại. Không bấm Generate. 0 credit.**

| | trước | sau |
|---|---|---|
| `id` khối *"Elegan nice coupe silver car"* | `:r1eg:` | **`:r1l:`** |
| `id` khối *"Racing morden car colorful"* | `:r1et:` | **`:r22:`** |
| class nút Generate | `…__GenerateButton-sc-ukbsh3-2 jiRMPz fOFwsU` | **y nguyên** |
| `target_id` | `9B33CA1E…` | **y nguyên** |
| mỗi phạm vi khớp Generate | 1 | **1** |
| chữ prompt | 2 chuỗi | **y nguyên** |

**Confound đã loại bằng phép đo.** Banner *"An updated version of the app is available"* đang
hiện, nên "id đổi" rất dễ bị đọc nhầm thành "app đổi build". Chuỗi class **giữ y nguyên** ⇒ lượt
đổi `id` **không** do build. Đây là chỗ dễ kết luận sai nhất của cả thí nghiệm.

### Trả lời — phân loại theo mức chắc chắn

**FACT**
- `id` **đổi** qua một lượt tải lại, dù build không đổi. ⇒ **không neo được vào `id` đã lưu.**
- Chuỗi class component **bền** qua lượt tải lại đó.
- Khoanh khối bằng `id` đọc sống cho **matchCount = 1** ở cả nút Generate lẫn ô prompt, cả
  trước và sau.
- Chữ prompt **bền** qua lượt remount.
- **`target_id` SỐNG qua một lượt tải lại trang** — id là của **cái tab**, không của tài liệu.

**INFERENCE**
- `id` có hình dạng React `useId` (`:r…:`), nên nó phụ thuộc thứ tự dựng cây ⇒ **mọi** lượt
  remount đều đổi nó, không riêng lượt tải lại. *Chỉ đo được ca tải lại.*
- Thứ tự `id` ↔ thứ tự prompt trùng nhau ở **cả hai** lượt đọc, nhưng **n = 1 lượt remount** —
  chưa đủ gọi là bền. **Đừng dựa vào thứ tự.**

**UNKNOWN**
- Hai khối **cùng một chữ prompt** thì phân biệt thế nào. Chưa đo, và dựng được bằng tay bất cứ
  lúc nào — đây là lỗ thật của cách neo theo chữ.
- Class có bền qua một lượt đổi build THẬT hay không. Lượt này class không đổi, nên **chưa đo
  được** vế đó (không rõ reload đã nạp bản mới chưa).

### LUỒNG ĐÚNG — và nó không cần thêm năng lực nào

```
mỗi lượt chạy:
  giải target (đừng cho rằng id cũ đã chết — G-133 — nhưng cũng đừng cache qua phiên)
  → scout.query 'button[id]'            đọc id SỐNG
  → khoanh khối: [class^="…__Img2Img-"]:has(button[id="<id>"])
  → scout.text  <khối> textarea         ĐỌC CHỮ để biết khối nào
  → lấy nút Generate CON của chính khối đó
```

**Không cache `id` qua lượt.** Và vì neo cuối cùng là **dữ liệu của người dùng**, phải đọc lại
chữ **ngay trước** mỗi lượt ghi: Đức sửa prompt là neo đổi ngay (`G-134`).
