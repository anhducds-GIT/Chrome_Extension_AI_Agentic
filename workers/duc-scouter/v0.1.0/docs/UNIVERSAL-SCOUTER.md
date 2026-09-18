# UNIVERSAL SCOUTER — SSOT của mốc V1

> **V1 ĐÓNG PHẠM VI ngày 18/09/2026.** Đọc **§V1** ngay dưới trước mọi thứ khác: nó nói V1 chứng
> minh được gì, còn thiếu gì, hoãn gì, và V2 bắt đầu ở đâu. Phần §0–§9 là **đường đi tới đó**,
> giữ nguyên vì nó ghi cách từng kết luận được đo — không phải một bản kế hoạch đang chạy.

**Đo:** 17–18/09/2026 · **Phiên:** `claude-universal-scouter` → `claude-v1`
**Chrome:** 153.0.8010.48

**Trạng thái 18/09:** Gap 3 và Gap 4 **ĐÃ TRIỂN KHAI VÀ CHẠY THẬT** · Gap 1 làm phần tối thiểu
(không đổi extension) · Gap 2 **cố ý CHƯA làm**, lý do đo được ở `G-107`.
Pilot E2E: [`pilots/vizcom-anhducds/`](../pilots/vizcom-anhducds/) — chọn đúng 1 trong 3 tài khoản
Vizcom, loại 2 cái kia, 0 lệnh ghi. Bốn dòng sổ mới: `G-104`…`G-107`.

> Tài liệu này thay thế mọi kết luận cũ về *"Vizcom chưa đọc được"*. Xem §0.

---

## §V1 — ĐÓNG PHẠM VI, 18/09/2026

**Tên mốc:** Universal Scouter V1 — Browser I/O Feasibility + Context-Efficient Workbench Control

**File này là SSOT của mốc.** Bằng chứng từng giả thuyết ở [`GIA-THUYET.md`](GIA-THUYET.md)
(sổ `G-xx`); số đo context ở [`CHI-PHI-CONTEXT.md`](CHI-PHI-CONTEXT.md); bản đồ Workbench ở
[`WORKBENCH-GRAPH.md`](WORKBENCH-GRAPH.md). **Đừng chép lại sự thật từ ba file đó sang đây** —
chép là sinh ra bản thứ hai, và hai bản sẽ lệch nhau.

### ĐÃ CHỨNG MINH — V1 đóng trên những câu này

| # | Câu | Ở đâu |
|---|---|---|
| ⑴ | Bridge → extension → CDP → tab là một đường I/O trình duyệt **chạy được**, và Side Panel **không** nằm trên đường dữ liệu | §1, §2 |
| ⑵ | Biên runtime thật là **ghế Scouter / profile Chrome**, địa chỉ là `instance_id`, **không bao giờ là nhãn** | `G-105` |
| ⑶ | Danh tính tài khoản **không** suy được từ URL — phải đọc từ TRANG, và đường không-đoán-selector là `scout.a11y` | `G-104` |
| ⑷ | `target_id` sống qua điều hướng SPA cùng nguồn **và** qua một lượt tải lại; chết khi **Bridge** nối lại. Hai sự kiện KHÁC nhau | §1.1, `G-132`, `G-133`, `G-118` |
| ⑸ | Graph Workbench là `source → prompt_block → outputs[]`; output vẽ **trong canvas**, không để lại node DOM | `G-123`, `G-131` |
| ⑹ | Nút Generate **giải động mỗi lượt**: đọc `button[id]` sống → khoanh khối → đọc chữ prompt → lấy nút CON. **Không cache React id** | `G-132`, `G-134` |
| ⑺ | Ghi an toàn đã chạy thật: **đúng một** khối được bấm, `outputs 2 → 3`, **0** lượt ghi sang ghế/tài khoản khác | `G-130`, `G-131` |
| ⑻ | Browser Context Burn giảm được rất lớn khi tách RAW/MODEL và lọc phía Node; ảnh ra ĐĨA thì **0 byte** vào context | `CHI-PHI-CONTEXT.md` §B–§D, `G-131` |
| ⑼ | Ngưỡng sống 1.500ms đo lại vẫn đứng: sống p90 87ms / max 282ms, chết ~20.020ms — hai cực cách ~70× | `G-107`, `G-111` |

### GIỚI HẠN ĐÃ BIẾT — đóng V1 **kèm** những câu này, không lờ đi

- **"Ngoài cùng bên phải = mới nhất"** mới có **n = 1**. Chưa phải luật (`G-131`).
- **Hai khối cùng một chữ prompt** thì không phân biệt được. Chưa đo, dựng được bằng tay bất cứ lúc nào (`G-134`).
- **Class styled-components** mới chứng minh bền qua *một* lượt remount, **chưa** qua một lượt đổi build thật (`G-132`).
- **Đường TREO của `scout.song`** chưa đo được trên máy thật — mới có phép ghim với đồ giả (`G-111`).
- **Trang có khung lồng (iframe)** chưa thử trang nào.
- **`scout.clear`** vẫn chưa tự kiểm (`S-27`).

### CHẶN, và nó là chặn THẬT — không chặn V1

> **Workbench thường không expose email identity.** Lượt Generate 18/09 chạy được là nhờ Đức
> trực tiếp chỉ thị, nên nó **KHÔNG** chứng minh autonomous account authorization.

V1 đóng **với** blocker này còn nguyên, và nói thẳng ra: V1 là *feasibility + control*, không
phải *autonomy*. Mọi lượt ghi trong V1 cần Đức mở cổng và chỉ thị.

### HOÃN SANG V2 — cố ý, không phải bỏ quên

| # | Việc | Vì sao hoãn |
|---|---|---|
| 1 | **Identity attestation**: `/files` → bind ghế/session → mang sang `/workbench`, kèm điều kiện vô hiệu hoá | Là câu hỏi mở của blocker trên. Cần một thí nghiệm sống, và cần Đức mở tài khoản thứ hai cùng profile |
| 2 | **Output topology** sâu hơn — thứ tự, danh tính từng output | `n = 1` hôm nay |
| 3 | **BCB_VISUAL** — chính sách nhìn cho đường ảnh | Cần ⑵ trước |
| 4 | **Vendor usage benchmark** | Tiêu credit Vizcom; Đức duyệt từng lượt |
| 5 | `scout.song` cho **đường treo** trên máy thật, và `scout.clear` tự kiểm (`S-27`) | Chưa gặp ca thật |

**V2 bắt đầu ở đúng một chỗ:** mục 1 — identity attestation. Thí nghiệm nhỏ nhất đã thiết kế
sẵn: *một ghế Scouter có chứa được hai tài khoản Vizcom khác nhau cùng lúc không* — cần Đức mở
thêm một tab Vizcom đăng nhập tài khoản khác trong **cùng** profile đang chạy Workbench.

### KHÔNG ĐỔI TRONG V1

Từ vựng method **đóng** (thêm một method = đổi luật an toàn, luật gói mục 4). Hợp đồng
**đúng-một** của bộ giải target **không nới**. Cổng ghi vẫn đóng mặc định, chỉ tay Đức mở.

---

## 0. HISTORICAL FALSE START — đã đóng, đừng mở lại

Trong phiên 17/09 tôi viết ba lần rằng **Vizcom không với tới được vì nó nằm ở profile không
có Scouter**. **Sai.**

Cái sai và cách nó sinh ra:

| | |
|---|---|
| Tôi đo | `scout.targets` trả `0` kết quả khớp `vizcom`, bốn lượt liền |
| Tôi kết luận | *"Vizcom nằm ở profile không có Scouter"* |
| Dữ liệu thật sự nói | *"không thấy"* — không nói **vì sao** không thấy |
| Nguyên nhân thật | Chrome **focus cửa sổ app đang mở ở profile khác** thay vì mở cửa sổ mới ở profile được chỉ định. `--profile-directory` **bị bỏ qua** khi Chrome đã chạy. Thứ tôi đo là một cửa sổ `Profile 6`. |

**Câu hỏi này nay ĐÃ ĐÓNG, không còn là UNKNOWN.** Bằng chứng ở §1.
Bài học vào sổ: `G-100`. Cùng họ với `G-99` — *đọc một lát cắt dữ liệu như thể nó là sự thật*.

---

## 1. CURRENT EVIDENCE

### 1.1 — Vizcom: discover + đọc **ĐẠT** (17/09, ghế `Scouter_blank` = profile `Default`)

```
Lượt bắt đầu (74ms sau khi mở cửa sổ app):
  target ĐÃ TỒN TẠI   id=A9966ABE… tab=2096832504  url=https://app.vizcom.com/
  title / h1 / button : matchCount = 0        ← DOM CÒN RỖNG, SPA chưa dựng
  scout.view          : viewport 2048×1078    ← nhưng renderer đã trả lời

Lượt đọc lại (sau khi trang dựng xong):
  ứng viên            : 1  (UNIQUE)
  url                 : https://app.vizcom.com/files/fc25a65d-…/recent
  title               : "Vizcom"   (matchCount = 1)
  button 28 · a 9 · [data-testid] 2 · canvas 0
  a11y                : 715 node, 317 node dùng được
                        role=button name="Vinfast VN Vinfast VN Enterprise plan"

Sau 20 giây, Đức tự bấm sang route khác trong chính app:
  url                 : https://app.vizcom.com/settings/organization/…/members
  target_id           : A9966ABE…   ← KHÔNG ĐỔI qua điều hướng SPA cùng nguồn
```

Toàn bộ **read-only**. Cổng ghi đóng suốt phiên.

**Ba điều rơi ra, và cả ba đi thẳng vào đặc tả:**

1. App window / PWA **không khác gì tab thường** dưới mắt `scout.targets`: loại `page`, có `tabId`.
2. `target_id` **sống qua điều hướng SPA cùng nguồn** — không phải đi tìm lại sau mỗi lần route đổi.
3. **Target sống ≠ trang đọc được.** Ở 74ms renderer trả lời `scout.view` bình thường trong khi
   `title` khớp **0**. Ai đọc con số đó mà không đợi sẽ kết luận *"trang trống"*. Đây là **trạng
   thái thứ ba**, không phải "chết" cũng không phải "dùng được" — và nó là gốc của Gap 2.

### 1.2 — Bốn pilot, tóm tắt

| Pilot | Kết quả | Bằng chứng ngắn |
|---|---|---|
| **A — Side Panel free** | **ĐẠT** | Bảng bên của Scouter = **0 target** ở cả hai ghế, mọi lượt đếm. Chứng cứ dương: ghế `Dummy_Scout` **thấy 2 bảng bên của extension khác** → dụng cụ nhìn được. Giữ im 65s → cả hai ghế `ping=online`. Ghế `Scouter_blank` nối liên tục **>8h35m**. |
| **B — Đa trang, một Scouter** | **ĐẠT MỘT PHẦN** | OK: Udin SPA 131ms · PhimMoi 157ms · `file://` 68ms. HỎNG: 2 tab Sheets + 1 Drive — **mọi lệnh CDP treo 20.000ms**, kể cả `Page.getLayoutMetrics`. |
| **C — PWA / app window** | **ĐẠT** | Vizcom (§1.1) + trang thử có kiểm soát: mở → target mới · đóng → target biến mất · id cũ → `PROBE_FAILED — No Chrome debug target with id` · mở lại → **id MỚI**. Không tái dùng id chết. |
| **D — Tách site adapter** | **ĐẠT** (nửa ĐỌC) | 4 trang · 2 ghế · 2 profile · 1 file descriptor 30 dòng · **0 dòng sửa** ở Scouter/Bridge/extension. Descriptor chạm `chrome.*`/`debugger`/Bridge: **0 lần** (đo sau khi bóc chú thích). Nửa GHI chưa chạy vì cổng ghi **chỉ tay người mở được** — chặn theo thiết kế. |

### 1.3 — Số liệu nền

| Đo | Giá trị |
|---|---|
| Profile trong Chrome của Đức | **11** |
| Profile có Scouter | **2** — `Default` (anhducds@gmail.com), `Profile 4` (kaito) |
| Target hai ghế thấy | 40 vs 19, **rời nhau hoàn toàn** |
| Từ vựng đóng | **24 method** — 12 đọc, 12 ghi |
| Mã trùng `duc-scouter` ↔ `udin-optic` | **4.857 dòng giống TỪNG BYTE** |
| Ambiguity thật | `chatgpt.com` **5 target** · `docs.google.com` **2 target** |
| Target chết | **3 / 17** tab ở ghế Default, **20s mỗi lệnh** |
| Runtime ngoài tầm | Electron (`claude`, `ChatGPT`, `Zalo`) · WebView2 (`msedgewebview2`) |

---

## 2. CORRECTED ARCHITECTURE

```
Local AI
  │
  ├─ Site Adapter (DỮ LIỆU)      ← origin · identity · selectors · workflow · success evidence
  ├─ Target Resolver (NODE)      ← discover → ghế → URL → liveness → identity → UNIQUE | fail-closed
  │
  ▼
Bridge (loopback + token)         ← transport · routing · ghế · vùng ghi. KHÔNG biết trang nào.
  │  target: <ghế>                ← TẦNG GPT BỎ SÓT HOÀN TOÀN
  ▼
Scouter instance — MỘT cho MỖI Chrome profile
  │  scout.* (24 method, từ vựng đóng)
  ▼
Chrome target trong ĐÚNG profile đó
     tab thường · app window / PWA   ← cả hai đều là type "page", có tabId
```

**Biên của hệ không phải extension — mà là PROFILE.**
`chrome.debugger.getTargets()` chỉ thấy profile mà extension được cài. *"Một Universal
Scouter"* là câu sai; đúng là *"một Scouter mỗi profile"*, và Bridge đã mô hình hoá sẵn
bằng khái niệm **ghế**.

**Ngoài phạm vi, chốt cứng:** Electron · WebView2 · native app. Chặn của Chrome, không sửa
được bằng kiến trúc. Đừng mở lại.

---

## 3. BỐN ĐẶC TẢ

> Quy ước chung cho cả bốn: **không nới `manifest`, không nới cổng ghi, không nới một lớp bảo
> vệ nào.** Chỗ nào buộc phải đổi luật an toàn thì ghi rõ **HỎI ĐỨC** ngay trong mục đó.

### GAP 1 — PROFILE / GHẾ IDENTITY

**Vấn đề.** Local AI không biết mỗi ghế thuộc profile Chrome nào, nên một lượt `scout.targets`
trả `0` **không phân biệt được** ba việc khác hẳn nhau: *trang không mở* · *trang mở ở profile
khác* · *trang mở ở profile này nhưng URL khác dự đoán*. Ngày 17/09 chính tôi đọc nhầm đúng
chỗ này và viết một kết luận sai vào báo cáo.

**Chặn cứng phải nói trước.** Chrome **không có API nào cho extension đọc tên thư mục profile
hay email tài khoản** mà không thêm quyền `identity` + `identity.email`. Thêm quyền là đổi
`manifest` → **ngoài phạm vi task này**. Nên đặc tả dưới đây **cố ý không đi tìm tên profile**.

**Thiết kế.** Máy cấp **định danh bền**; người cấp **ý nghĩa**, đúng một lần.

1. `system.capabilities` trả thêm ba trường:
   - `instance_id` — đã có sẵn trong `chrome.storage.local` (`INSTANCE_STORAGE_KEY`), máy sinh
     một lần rồi ở yên, **per-profile theo bản chất của `storage.local`**. Không sinh mới gì cả.
   - `instance_label` — nhãn Đức tự đặt (`Scouter_blank`, `Dummy_Scout`). Đã có, chỉ chưa trả.
   - `profile_dau_van` — vân tay profile: **hash ổn định của tập extension id** đọc được từ
     `scout.targets` (các target `worker` / `background_page` dạng `chrome-extension://<id>/…`),
     sắp xếp rồi băm. Không cần quyền mới. Dùng để **phát hiện nhầm ghế**, không dùng để đặt tên.
2. **Sổ ghế** — một tệp bản đồ do Đức điền **một lần**, nằm **NGOÀI repo** (cạnh tệp ghép cặp,
   vì nó nói về máy chứ không nói về mã):
   `instance_id → { profile_dir, tai_khoan, ghi_chu }`.
   AI **không bao giờ đoán** trường này; chưa có dòng nào thì báo *"ghế chưa khai"*, không suy diễn.
3. **Luật báo cáo — phần rẻ nhất và giá trị nhất của cả Gap 1.**
   Mọi câu trả lời dạng *"không tìm thấy trang"* **BẮT BUỘC** kèm: đã hỏi **những ghế nào**,
   mỗi ghế thấy **bao nhiêu target**. Một câu *"không thấy"* không nêu người quan sát là một
   câu **không có giá trị**, và đó chính là thứ đã sinh ra false start ở §0.

**Không làm:** thêm quyền `identity` · đoán profile từ URL đang mở · suy profile từ nhãn ghế.

---

### GAP 2 — TARGET LIVENESS + READINESS

**Vấn đề.** Ba trạng thái hiện đang **không phân biệt được**, và hai trong ba đã cắn hôm qua:

| Trạng thái | Triệu chứng đo được 17/09 | Hiện xử thế nào |
|---|---|---|
| **A — chết** (renderer không trả lời) | 3 tab Google: **mọi** lệnh CDP treo **20.000ms** rồi bỏ cuộc | tốn 20s mới biết |
| **B — sống nhưng CHƯA DỰNG** (SPA đang load) | Vizcom ở 74ms: `scout.view` OK, `title` khớp **0** | **đọc y hệt "trang trống"** |
| **C — dùng được** | Udin 131ms, PhimMoi 157ms | — |

**Thiết kế.**

**⑴ Phân biệt A khỏi B+C bằng một phép dò RẺ, hạn NGẮN.**
`createReadOnlySender(sendRaw, log, hanMs)` **đã nhận hạn làm tham số** — không phải sửa hình
dạng lớp bảo vệ, chỉ truyền một số khác.

- Method mới, read-only: `scout.song` — gửi đúng **một** lệnh getter thuần
  (`Page.getLayoutMetrics`, đã nằm trong danh sách method CDP cho phép từ `G-97`), hạn
  **1.500ms**, trả `{ song: true|false, ms }`. Không bao giờ ném; hết hạn là `song:false`.
- **HỎI ĐỨC.** Thêm một method là **đổi luật an toàn** (luật gói mục 4). Không tự thêm.
- Lý do 1.500ms chứ không phải một số tròn: ba lượt đo đạt hôm qua là **68 / 131 / 157ms**;
  1.500ms là **~10× lượt chậm nhất đã đo**, còn 20.000ms là **~127×**. Số này phải **đo lại**
  khi có thêm dữ liệu, đừng chép cứng vào kế hoạch.

**⑵ Phân biệt B khỏi C bằng vốn CÓ SẴN — không thêm gì.**
`scout.wait` (`state: "present"`, `timeout_ms` tuỳ chọn 100..30000) đã làm đúng việc này.
Readiness = `scout.wait` trên **chính selector danh tính** của adapter.
**Đừng dựng method mới cho B.**

**⑶ Thứ tự bắt buộc, và đây là hợp đồng:**

```
scout.song  (1.5s)  →  song:false  →  DỪNG, trả TARGET_KHONG_PHAN_HOI
                    →  song:true   →  scout.wait(selector danh tính, present)
                                    →  không thoả  →  TRANG_CHUA_DUNG_XONG
                                    →  thoả        →  chạy lệnh nặng
```

**Không làm:** đặt `CDP_HAN_MS` chung xuống thấp — nó đang bảo vệ `scout.wait`/`scout.network`
vốn **phải** chờ lâu. Hạn ngắn chỉ thuộc về phép dò sống.

---

### GAP 3 — IDENTITY-AWARE TARGET RESOLVER

**Vấn đề.** `timTab()` hiện khớp bằng **tiền tố URL** rồi trả luôn. Thiếu hai chặng: **liveness**
và **kiểm danh tính sau khi giải**. Hôm qua adapter của tôi phải tự đắp bước danh tính — tức
bước đó đang nằm sai tầng, và trang nào quên đắp là trang đó chạy mù.

**Chuỗi bắt buộc.**

```
① discover    scout.targets trên MỘT ghế đã nêu tên   (không bao giờ "ghế mặc định")
② lọc loại    type === "page"                          (bỏ worker/other/background_page)
③ lọc URL     theo origin/prefix của adapter
④ liveness    scout.song trên từng ứng viên            (Gap 2; chết thì LOẠI, không phải hỏng)
⑤ readiness   scout.wait(selector danh tính)           (Gap 2)
⑥ danh tính   scout.text(selector danh tính) phải CHỨA chuỗi adapter khai
⑦ kết         đúng MỘT sống sót → UNIQUE
              0 → TARGET_NOT_FOUND     · 2+ → TARGET_AMBIGUOUS
```

**Mã lỗi, và chúng phải PHÂN BIỆT ĐƯỢC nhau** — mỗi mã dẫn tới một hành động khác:

| Mã | Nghĩa | Người dùng làm gì |
|---|---|---|
| `GHE_CHUA_KHAI` | ghế không có trong sổ ghế | Đức điền sổ ghế |
| `TARGET_NOT_FOUND` | không target nào khớp URL **ở ghế đã hỏi** | mở trang, hoặc hỏi ghế khác |
| `TARGET_KHONG_PHAN_HOI` | khớp URL nhưng renderer chết | nạp lại tab |
| `TRANG_CHUA_DUNG_XONG` | sống, chưa dựng xong trong hạn chờ | chờ thêm / tăng `timeout_ms` |
| `DANH_TINH_LECH` | đúng URL, **sai trang** | adapter khai sai, hoặc trang đã đổi |
| `TARGET_AMBIGUOUS` | 2+ ứng viên sống sót | **DỪNG** — nêu đủ URL để người chọn |

**Cấm tuyệt đối, viết ra vì cả sáu đều là cám dỗ có thật:**
first-match · active-tab · tab đang xem · nhớ `target_id` giữa hai lượt chạy · đoán mờ khi
ambiguous · tự chọn hộ khi 2+ ứng viên.

**`target_id` được phép giữ TRONG một lượt chạy** — đo 17/09: id sống qua điều hướng SPA cùng
nguồn. **Không** được giữ qua hai lượt chạy: đóng/mở cho id mới, và id chết trả
`PROBE_FAILED — No Chrome debug target with id` (đã đo, fail-closed đúng).

**Chỗ đặt:** `workers/_shared/goi-bridge/` — **phía Node, không đụng extension, không đụng
`manifest`, không thêm method.** Rẻ nhất trong bốn gap.

---

### GAP 4 — SITE ADAPTER CONTRACT

**Vấn đề.** Pilot D chứng minh hình dạng chạy được, nhưng chưa có hợp đồng nên chưa có gì
chặn trang thứ hai lén nhét `chrome.*` hay lén sửa lõi.

**Hợp đồng — một trang mới khai ĐÚNG năm thứ, không hơn:**

| Trường | Là gì | Ví dụ đã chạy thật |
|---|---|---|
| `ghe` | ghế nào (→ profile nào) | `"Dummy_Scout"` |
| `origin` | tiền tố URL | `"https://vinfast.udinbv.com/"` |
| `danh_tinh` | `{ selector, chua }` — bằng chứng *"đúng trang"* | `{ selector: "title", chua: "Udin" }` |
| `buoc` | thứ tự bước, mỗi bước là **một** method `scout.*` + tham số | `{ method: "scout.query", selector: "button.account-button" }` |
| `bang_chung_xong` | đọc lại cái gì để biết **đã xong thật** | `{ selector: "…", chua: "…" }` |

**Bốn điều adapter TUYỆT ĐỐI không được có** — và cả bốn đều **ghim được bằng máy**:

1. `chrome.*` · `debugger` · CDP thô
2. toạ độ pixel tự do (`scout.click` suy toạ độ từ hộp phần tử đã khớp — luật gói mục 7)
3. lời gọi Bridge trực tiếp (adapter là **dữ liệu**; bộ chạy chung mới gọi)
4. selector chưa có bằng chứng DOM (phải ra từ `scout.page` / `scout.tree` thật — luật gói,
   *"Đừng đoán selector"*)

**Chiều ngược lại, ghim luôn:** không selector/origin nào của adapter được xuất hiện trong lõi
Scouter. Đã đo 17/09: **7/7 chuỗi, 0 lần** trong 8 file lõi.

**Bẫy đã vấp, viết ra để người sau khỏi vấp lại:** phép ghim *"file không chứa `chrome.`"*
**bóc chú thích trước rồi mới grep**. Bản đầu của tôi báo đỏ vì regex khớp vào **chính câu
chú thích** *"không gọi chrome.*"*. Cùng họ `detectors-match-your-own-prose`.

**Nửa GHI vẫn chặn theo thiết kế:** cổng ghi **chỉ tay người mở được**, không method Bridge
nào bật được nó. Adapter khai được bước ghi, nhưng chạy thì cần Đức bật công tắc. **Giữ nguyên.**

---

## 3b. ĐÃ TRIỂN KHAI ĐƯỢC GÌ, VÀ PILOT SỬA SPEC Ở ĐÂU

| Gap | Trạng thái | Pilot bác/sửa spec chỗ nào |
|---|---|---|
| **3 — resolver** | **XONG** · `_shared/goi-bridge/giai-target.mjs` · 14 phép ghim | Spec viết chuỗi 7 chặng. Pilot thêm **hai** thứ spec không có: ⑴ địa chỉ ghế phải là `instance_id` chứ không phải nhãn (`G-105`); ⑵ **hai** đường đọc danh tính — `scout.text` theo selector **và** `scout.a11y` — vì dấu hiệu phân biệt tài khoản nằm trong `StaticText`, chỗ `scout.page` không với tới (`G-104`) |
| **4 — hợp đồng adapter** | **XONG** · `_shared/adapters/` · 9 phép ghim | Spec liệt kê 4 điều cấm. Pilot thêm điều thứ **⑸ cấm neo vào hash styled-components** — đo được mọi `class` của Vizcom là hash đổi theo mỗi lượt build. Và chính bộ soát có một mẫu cấm **rỗng** (`G-106`) |
| **1 — ghế/profile** | **phần tối thiểu** | Spec dự tính thêm 3 trường vào `system.capabilities`. Pilot cho thấy **không cần đổi extension gì cả**: `bridge.sessions` đã trả `instance_id` + nhãn sẵn. Sổ ghế vẫn để ngoài repo, chưa ai điền |
| **2 — sống & sẵn sàng** | **CHƯA, cố ý** | Ngưỡng 1.500ms **sống sót phép đo** (`G-107`): sống ≤282ms, chết ~20.020ms, hai cực cách 70×. Nhưng cả hai ứng viên Vizcom đều sống, nên chưa trả lời được *"không có nó thì E2E hỏng ở đâu"* |

## 4. ACCEPTANCE TESTS

Mỗi phép phải **phân biệt được nhánh đúng với nhánh hỏng** — một phép xanh dưới cả hai bản là
một màu xanh giả.

### Gap 1

| # | Phép | Đạt khi |
|---|---|---|
| 1.1 | `system.capabilities` trên **hai** ghế | `instance_id` **khác nhau**, cả hai khác rỗng |
| 1.2 | Gọi lại cùng ghế sau khi nạp lại extension | `instance_id` **không đổi** |
| 1.3 | `profile_dau_van` hai ghế | **khác nhau** (đối chứng: cùng ghế hai lượt → **giống nhau**) |
| 1.4 | Hỏi một `instance_id` không có trong sổ ghế | `GHE_CHUA_KHAI`, **không** rơi về ghế mặc định |
| 1.5 | Resolver trả `TARGET_NOT_FOUND` | Câu trả lời **kèm** danh sách ghế đã hỏi + số target mỗi ghế |

### Gap 2

| # | Phép | Đạt khi |
|---|---|---|
| 2.1 | `scout.song` trên tab lành | `song:true`, **ms < 1.500** |
| 2.2 | `scout.song` trên tab chết (3 tab Google đã biết) | `song:false`, **ms ≤ ~1.600** — *đây là phép phân biệt chính: bản cũ tốn 20.000ms* |
| 2.3 | `scout.song` rồi `scout.query` trên cùng tab chết | tổng **< 2s** thay vì 40s |
| 2.4 | Mở một SPA rồi gọi ngay ở <200ms | `song:true` **và** `TRANG_CHUA_DUNG_XONG` — **hai** trạng thái khác nhau, không gộp làm một |
| 2.5 | Cùng SPA sau `scout.wait` | dùng được |
| 2.6 | `CDP_HAN_MS` chung | **vẫn 20000** — đối chứng chống nới lớp bảo vệ |

### Gap 3

| # | Phép | Đạt khi |
|---|---|---|
| 3.1 | `chatgpt.com` ở ghế Default (đã đo: 5 tab) | `TARGET_AMBIGUOUS`, liệt kê **đủ 5** URL |
| 3.2 | Origin không tồn tại | `TARGET_NOT_FOUND` |
| 3.3 | `vinfast.udinbv.com` ở ghế đúng | `UNIQUE` |
| 3.4 | Đúng URL, `danh_tinh.chua` cố tình sai | `DANH_TINH_LECH` — **không** trả UNIQUE |
| 3.5 | `target_id` của tab đã đóng | `PROBE_FAILED`, **không** nhắm sang tab khác |
| 3.6 | Điều hướng SPA cùng nguồn giữa lượt | `target_id` giữ nguyên, lệnh sau vẫn chạy |
| 3.7 | Ghế A hỏi trang chỉ mở ở ghế B | `TARGET_NOT_FOUND` **kèm** gợi ý *"thử ghế khác"* — không im lặng |

### Gap 4

| # | Phép | Đạt khi |
|---|---|---|
| 4.1 | grep descriptor (**đã bóc chú thích**) tìm `chrome.` `debugger` `goi(` | **0** |
| 4.2 | grep lõi Scouter tìm mọi `origin` + `selector` của mọi adapter | **0** |
| 4.3 | Descriptor thiếu `danh_tinh` | **từ chối lúc nạp**, không chạy rồi mới hỏng |
| 4.4 | Thêm một trang mới | **0 dòng** đổi ngoài file descriptor |
| 4.5 | Descriptor khai toạ độ pixel | **từ chối** |
| 4.6 | Đột biến: xoá bước kiểm `danh_tinh` khỏi resolver | **3.4 phải ĐỎ** — nếu vẫn xanh thì 3.4 là chốt rỗng |

---

## 5. FILES EXPECTED TO CHANGE

| Gap | Tệp | Kiểu |
|---|---|---|
| 1 | `workers/duc-scouter/v0.1.0/scripts/scouter-bridge-core.mjs` | thêm 3 trường vào `capabilities()` |
| 1 | `workers/duc-scouter/v0.1.0/scripts/scouter-seed-core.mjs` | đọc `INSTANCE_STORAGE_KEY` + nhãn, ghép vào câu trả lời |
| 1 | **ngoài repo**, cạnh tệp ghép cặp | sổ ghế `instance_id → profile` — **Đức điền** |
| 2 | `workers/duc-scouter/v0.1.0/scripts/scouter-bridge-core.mjs` | **1 registry entry mới** `scout.song` — **HỎI ĐỨC** |
| 2 | `workers/duc-scouter/v0.1.0/scripts/scouter-probes.mjs` | 1 phép dò, `hanMs = 1500` (tham số **đã có sẵn**) |
| 2 | `workers/duc-scouter/v0.1.0/scripts/scouter-seed-core.mjs` | 1 dòng ánh xạ method → phép dò |
| 3 | `workers/_shared/goi-bridge/goi-bridge.mjs` | `timTab` → `giaiTarget` 7 chặng |
| 3 | `workers/_shared/goi-bridge/tests/goi-bridge-smoke.mjs` | phép ghim 3.1–3.7 |
| 4 | `workers/duc-scouter/v0.1.0/docs/ADAPTER-CONTRACT.md` | hợp đồng (tài liệu) |
| 4 | `workers/_shared/goi-bridge/` | bộ nạp + soát descriptor |
| 4 | tests | phép ghim 4.1–4.6 |
| — | `workers/duc-scouter/v0.1.0/docs/GIA-THUYET.md` | `G-100`…`G-103` (bản này đã ghi) |
| — | `workers/duc-scouter/v0.1.0/STATUS.md` · `ROADMAP.md` | khi có mã, không phải bây giờ |

**KHÔNG đụng:** `manifest.json` · `sidepanel.*` · cổng ghi · `CDP_HAN_MS` chung · gói
`udin-optic` · gói `hnx-fetch` · ba gói `duc-auto-*`.

**Cảnh báo `G-93`:** `scouter-probes.mjs` và `scouter-seed-core.mjs` **giống TỪNG BYTE** với
bản trong `udin-optic`. Sửa ở đây là **làm trôi cặp đang bị ghim byte-đối-byte**
(`udin-optic/v0.1.0/tests/be-mat-hep-smoke.mjs` khối ⑷). Phải quyết **trước khi gõ dòng đầu**:
chép sang cả hai, hay để trôi có khai báo. Bản chép được phép trôi, **không được phép trôi mà
không ai biết**.

---

## 6. RISKS

| # | Rủi ro | Mức | Chặn bằng |
|---|---|---|---|
| R1 | `scout.song` bị dùng thành lối tắt bỏ qua `scout.wait` → *"sống"* đọc thành *"dùng được"* | **cao** | Hợp đồng §3 Gap 2 ⑶: sống chỉ là **điều kiện cần**. Phép 2.4 giữ hai trạng thái tách rời |
| R2 | Sửa `scouter-probes.mjs` làm trôi cặp byte-đối-byte với `udin-optic` | **cao** | Quyết trước khi gõ; ghim byte phải ĐỎ nếu trôi mà không khai |
| R3 | Sổ ghế thành tệp chết — Đức điền một lần rồi profile đổi | trung bình | `profile_dau_van` đổi thì **cảnh báo**, không im lặng dùng dòng cũ |
| R4 | `TARGET_AMBIGUOUS` gặp quá thường (5 tab ChatGPT) → người bực → ai đó "chữa" bằng first-match | **cao** | Viết thẳng vào §3 Gap 3 là **cấm**; phép 3.1 canh |
| R5 | Thêm `scout.song` là nới từ vựng; lần sau dễ thêm tiếp | trung bình | **HỎI ĐỨC** từng method, ghi vào `decisions.md`. Từ vựng đóng là lớp bảo vệ, không phải thủ tục |
| R6 | 1.500ms sai trên máy chậm / mạng chậm → loại nhầm tab lành | trung bình | Phép 2.1 in **ms thật**. Số này **đo lại**, đừng chép |
| R7 | Đặc tả nở thành "AI tự lái trình duyệt" | trung bình | Cổng ghi giữ nguyên: **chỉ tay người mở được**, trần 200 lượt |
| R8 | `profile_dau_van` trôi khi Đức cài/gỡ một extension bất kỳ | thấp–trung bình | Dùng để **cảnh báo**, không dùng làm khoá định danh. `instance_id` mới là định danh |

---

## 7. IMPLEMENTATION ORDER

Xếp theo **giá trị ÷ chi phí**, và theo **phụ thuộc**:

| Bậc | Việc | Vì sao đứng đây | Chặn bởi |
|---|---|---|---|
| **①** | **Gap 3 — resolver** (chặng ①②③⑥⑦, chưa cần liveness) | Phía Node thuần. **Không** đụng extension, **không** đụng `manifest`, **không** thêm method. Đóng ngay lỗ *first-match* và *danh tính lệch*. | — |
| **②** | **Gap 4 — hợp đồng adapter + phép ghim** | Cùng tầng Node. Biến kết quả Pilot D thành thứ **máy canh được**. | ① |
| **③** | **Gap 1 — ba trường vào `capabilities` + sổ ghế** | Đụng extension nhưng **không** thêm method, **không** thêm quyền. Đóng kiểu hỏng *"không thấy giả"* — kiểu hỏng đã làm chính tôi viết sai. | — (song song được với ①②) |
| **④** | **Gap 2 — `scout.song`** | **Chặn bởi một quyết định của Đức**, không phải bởi mã: thêm method = đổi luật an toàn. Đứng cuối vì ①②③ đã chạy được mà không có nó — chỉ chậm hơn ở tab chết. | **Đức chốt** |

Sau ① và ③, chèn chặng ④⑤ của resolver **khi** Gap 2 xong. Đừng viết chỗ trống chờ sẵn.

---

## 8. BLOCKER — cần Đức, không AI nào thay được

| # | Việc | Chặn gì |
|---|---|---|
| 1 | **Chốt có thêm `scout.song` không** (luật gói mục 4: thêm method = đổi luật an toàn) | Toàn bộ **Gap 2**, và chặng ④ của Gap 3 |
| 2 | Điền **sổ ghế** `instance_id → profile/tài khoản` — chỉ Đức biết ghế nào là tài khoản nào | Phần *ý nghĩa* của Gap 1. Phần *máy* chạy được trước |
| 3 | Bật công tắc đường ghi nếu muốn chạy nửa GHI của Pilot D | Nghiệm thu bước ghi của adapter |
| 4 | Cài Scouter vào `Profile 6` / `Profile 10` nếu muốn với tới Vizcom hai tài khoản kia | Chỉ mở rộng phạm vi; **không** chặn bốn gap |

**Khoá repo:** `_root` · `_docs` · `workers/duc-scouter` đều **free** lúc 18/09, nên bản này
land thẳng. Không tranh lock với lane nào.

---

## 9. UNKNOWN còn treo

Vizcom **không còn ở đây** — đã đóng ở §0/§1.1.

1. **Vì sao 3 tab Google không trả lời CDP** — bị Chrome đóng băng, hay Google chặn? Chưa phân
   biệt. Cần một tab Sheets **vừa mới mở** làm đối chứng. *Không chặn gap nào* — Gap 2 xử lý
   triệu chứng, và xử đúng dù nguyên nhân là gì.
2. **Trang có khung lồng (iframe)** — chưa thử trang nào có iframe thật.
3. **Ba gói `duc-auto-*`** — chưa đo bề mặt quyền so với Scouter. Không chặn gap nào.
