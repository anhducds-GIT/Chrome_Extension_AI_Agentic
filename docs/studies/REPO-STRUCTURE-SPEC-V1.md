---
kind: spec
status: rfc
version: 1.0
created: 2026-08-31
review_deadline: 2026-09-14
---

# REPO-STRUCTURE-SPEC-V1

> **Trạng thái: RFC — đang lấy phản hồi.** Chưa phải chuẩn bắt buộc.
> Gửi cho các repo khác review trước khi đóng băng thành v1.0-final.
>
> **Bài toán:** một phiên AI mới vào repo phải hiểu ngay chuyện gì đang xảy ra,
> không quét toàn bộ cây thư mục, không hỏi chủ repo câu nào.
>
> **Nguyên tắc gốc:** *mỗi câu AI phải hỏi con người = một trường dữ liệu còn thiếu trong repo.*
> Không sửa bằng cách dặn AI đọc kỹ hơn. Sửa bằng cách bổ sung trường và bắt cổng kiểm chặn khi trống.

---

## 0. Cách đọc tài liệu này

| Phần | Áp cho | Bắt buộc? |
|---|---|---|
| **CORE** (mục 2) | Mọi repo | Bắt buộc — 10 điểm |
| **PROFILE** (mục 3) | Theo loại repo | Chọn đúng một |
| **KHÔNG ÁP** (mục 5) | — | Biết để khỏi ép nhầm |

Repo khác nhau thì `.repo-structure.json` khác nhau, nhưng **script kiểm giống hệt nhau**.
Script đọc cấu hình, không viết cứng tên file. Đó là điều cho phép dùng lại.

---

## 1. Bốn tầng — luật phân loại

Phân theo **vòng đời**, không phân theo chủ đề.

| Tầng | Bản chất | Ai ghi | Nhịp đổi | Được xoá? |
|---|---|---|---|---|
| **LAW** | Luật, vai, kiến trúc, hướng dẫn | Người | Vài tháng | Có, qua PR |
| **STATE** | Trạng thái, việc đang mở, bàn giao | Người | Mỗi phiên | Có |
| **GENERATED** | Số đo, bản đồ, bảng tổng | **Máy** | Mỗi build | Máy ghi đè |
| **EVIDENCE** | Bằng chứng, log, quyết định đã chốt | Bất biến | Chỉ thêm | **Không bao giờ** |

Hai luật con:
- Không trộn hai tầng vào một file.
- Không để hai file cùng tầng nói cùng một điều.

**Nguyên tắc số một:** thứ gì máy đếm được thì máy đếm. Con số, trạng thái, ngày tháng
không bao giờ gõ tay vào tài liệu.

---

## 2. CORE — mười điểm bắt buộc

### C1 · Cổng vào máy sinh — `llms.txt`

File ở gốc repo, theo định dạng llmstxt.org: một `#` tiêu đề · một `>` blockquote tóm tắt ·
các mục `##` chứa danh sách link, **mỗi link kèm một dòng mô tả**.

Vì sao chọn định dạng này: các công cụ AI phổ biến tự tìm `/llms.txt` khi được trỏ vào
một nguồn. Chủ repo không phải dán đường dẫn nữa.

Máy sinh. Không gõ tay. Mục tiêu độ dài: dưới 50 dòng.

### C2 · Hiến pháp ngắn — `AGENTS.md`

Chuẩn mở, nhiều hãng công cụ AI cùng hỗ trợ. Cascade: gốc repo → thư mục con, file gần nhất thắng.

- **Dưới 200 dòng.** File này nạp vào *mọi* phiên; mỗi dòng thừa cạnh tranh sự chú ý.
- File riêng của từng hãng (`CLAUDE.md`, `.cursor/rules`, `copilot-instructions.md`)
  chỉ là **stub mỏng trỏ về `AGENTS.md`**, không phải bản thứ hai.
- **Luật nào cần cưỡng chế thì đưa vào cổng kiểm, đừng viết dài hơn trong tài liệu.**

### C3 · Bảng trạng thái máy sinh — `DASHBOARD.md`

Bắt buộc có bốn khối:

- **A · "Bắt đầu từ đâu"** — đặt trên cùng. Việc ưu tiên #1 (mã · gói · link · chủ hiện tại) ·
  phiên gần nhất làm gì (ngày · commit · link bàn giao) · link `AGENTS.md`.
- **B · Registry** — có gì trong repo, cái nào đang sống.
- **C · Việc đang mở, đã xếp ưu tiên** — gom từ các file việc-đang-mở.
- **D · Sức khoẻ điều hướng `[ĐO]`** — đếm nợ: bao nhiêu đơn vị chưa khai trạng thái ·
  link chết trong file cổng · thư mục chưa khai chủ · tài liệu quá hạn.

Khối D làm **nợ điều hướng nhìn thấy được**. Không nhìn thấy thì không ai trả.

### C4 · Độ sâu điều hướng tối đa 3

```
llms.txt  →  DASHBOARD.md  →  STATUS  →  chi tiết
```

Phải đọc tới file thứ tư mới hiểu chuyện gì đang xảy ra = thiết kế hỏng, cổng cảnh báo.

### C5 · Schema trạng thái có trường bắt buộc

Mỗi đơn vị công việc (package, module, dịch vụ) có một file trạng thái, khai tối thiểu:

| Trường | Bắt buộc khi | Chặn câu hỏi nào |
|---|---|---|
| `id` · `name` | luôn | "cái này là gì" |
| `lifecycle` | luôn | "còn sống không" |
| `owner` | luôn | "của ai" |
| `superseded_by` | khi `lifecycle: superseded` | "bản nào còn dùng" |
| `next_step` | luôn | "làm gì tiếp" |
| `last_verified` + `last_verified_commit` | khi có kiểm chứng | "số liệu còn tươi không" |
| `depends_on` | khi có phụ thuộc | "đụng cái này ảnh hưởng gì" |

`lifecycle` chỉ nhận: `active` · `building` · `paused` · `superseded` · `archived`.
**Không có giá trị `unclassified`** — đó chính là chỗ thông tin rò rỉ ra thành câu hỏi cho người.

### C6 · Quyết định bất biến — `docs/adr/`

Chuẩn ADR (Nygard): một file một quyết định, đánh số tăng dần, bốn mục
**Bối cảnh · Quyết định · Hệ quả · Trạng thái**.

Đã `Accepted` thì **không bao giờ sửa, không bao giờ xoá**. Đổi ý = viết ADR mới,
ADR cũ chuyển `Superseded by ADR-NNNN`, hai bên trỏ nhau.

Vì sao không dùng một file `decisions.md` gộp: file gộp thì sẽ bị sửa đè. Sáu tháng sau
không ai biết ngày đó quyết gì và vì sao.

### C7 · Vòng đời tài liệu — frontmatter

Mọi file trong `docs/` mở đầu bằng:

```yaml
---
kind: brief          # brief | study | spec | guide | adr
status: active       # active | done | superseded
created: 2026-08-31
ttl_days: 30         # brief 30 · study 180 · guide 365
last_reviewed: 2026-08-31
---
```

Dùng `ttl_days` (tương đối) thay vì ngày hết hạn tuyệt đối — tương đối không mục khi copy file.

Cổng cảnh báo **vàng** khi quá hạn mà `status` vẫn `active`. Không tự xoá, chỉ nhắc.
Đây là thứ chặn thư mục nháp phình vô hạn.

### C8 · Cổng kiểm — `check-structure` + `.repo-structure.json`

Schema máy đọc là **một nguồn sự thật**; cả tài liệu lẫn script đều đọc từ đó.

Phép kiểm tối thiểu:

| # | Kiểm | Mức |
|---|---|---|
| G1 | Đơn vị công việc thiếu file trạng thái | ĐỎ |
| G2 | `lifecycle: superseded` mà thiếu `superseded_by` | ĐỎ |
| G3 | Thư mục top-level chưa khai chủ | ĐỎ |
| G4 | Link trong file cổng trỏ tới file không tồn tại | ĐỎ |
| G5 | File tầng GENERATED bị sửa tay | ĐỎ |
| G6 | File tầng EVIDENCE bị sửa hoặc xoá | ĐỎ |
| G7 | Gốc repo vượt số file tài liệu cho phép | ĐỎ |
| G8 | Cùng một tên file tài liệu ở hai nơi | ĐỎ |
| G9 | Đường dẫn mới có dấu cách hoặc ký tự ngoài ASCII | ĐỎ |
| G10 | Hiến pháp vượt giới hạn dòng | 🟡 |
| G11 | Tài liệu quá `ttl_days` | 🟡 |
| G12 | File cổng cũ hơn commit gần nhất của file trạng thái | 🟡 |

**Thông báo lỗi phải nói cả chỗ sai lẫn chỗ đúng.** Đây là chi tiết quyết định thành bại —
AI đọc thông báo là tự sửa được, không cần người nhắc:

```
✗ G7 ROOT-EXTRA: REPORT-2026-08-30.md
    → chuyển tới: docs/briefs/REPORT-2026-08-30.md
    → hoặc thêm vào .repo-structure.json > root.allowed nếu là file luật lâu dài
```

Nối vào quy trình đóng phiên, chạy trước khi đẩy code lên.

### C9 · Miễn trừ đường dẫn cũ — `grandfathered`

`.repo-structure.json` có một khối liệt kê đường dẫn có trước ngày áp chuẩn. Cổng bỏ qua chúng.

Đây là mấu chốt cho phép **áp chuẩn ngay hôm nay** mà không phải đụng một byte nào của
dữ liệu cũ. Chuẩn chỉ chặn cái mới. Cái cũ đóng băng.

Không có khối này thì áp chuẩn = phải dọn hàng chục thư mục trong ngày đầu = không ai làm.

### C10 · Nhãn độ tin cậy khi báo cáo

Mọi báo cáo của AI phải gắn nhãn nguồn thông tin:

| Nhãn | Nghĩa | Tin được tới đâu |
|---|---|---|
| `[ĐO]` | Máy đếm, không qua tay người | Chắc |
| `[ĐỌC]` | Mở mã nguồn đọc thẳng thân hàm | Chắc |
| `[DÒ]` | Tìm theo từ khoá | **Có thể sai** |
| `[KHAI]` | Người tự khai | Cần bằng chứng đi kèm |

Cảnh báo `[DÒ]`: tìm-theo-từ-khoá chỉ tìm được thứ mình đã nghĩ ra để tìm.
*"Không tìm thấy tên"* ≠ *"không có tính năng"*.

Điểm này không có trong bất kỳ chuẩn ngành nào. Nó giải một bệnh riêng của AI agent:
kết quả tìm kiếm rỗng bị hiểu nhầm thành kết luận.

---

## 3. PROFILE — chọn đúng một

CORE áp cho mọi repo. Phần này khác nhau theo loại.

### P1 · Monorepo nhiều gói

```
├─ llms.txt · AGENTS.md · README.md · DASHBOARD.md      (gốc ≤ 6 file .md)
├─ docs/  studies/ briefs/ archive/ adr/
├─ .agents/claims.json
├─ scripts/  tests/
└─ packages/<ten>/<phien-ban>/
   ├─ AGENTS.md · README.md · STATUS.md                 (gốc gói ≤ 3 file .md)
   ├─ docs/   bàn giao · việc đang mở · hướng dẫn · adr/
   ├─ src/  tests/
   └─ evidence/
```

Đơn vị công việc = mỗi thư mục phiên bản. Bắt buộc `.agents/claims.json`.

### P2 · Ứng dụng đơn

Bỏ tầng `packages/`. Đơn vị công việc = mỗi module chính trong `src/`.
File trạng thái đặt ở gốc. `claims.json` tuỳ chọn nếu chỉ một agent ghi.

### P3 · Repo nghiên cứu / tài liệu

`docs/` là thân chính, không phải phụ. Bắt buộc chặt C7 (`ttl_days`) vì đây là loại repo
phình nhanh nhất. Có thể bỏ C5 nếu không có "đơn vị công việc" rõ ràng —
nhưng phải thay bằng một chỉ mục máy sinh.

### P4 · Repo hạ tầng / script

Chặt nhất ở C6 (ADR) vì mọi thay đổi đều có hệ quả vận hành.
`evidence/` chứa log chạy thật, không phải ảnh chụp màn hình.

---

## 4. Ngưỡng số — điều chỉnh được

Ba con số dưới đây là đề xuất, không phải chân lý. Điều quan trọng là **có một con số cố định**
để cổng kiểm chặn được.

| Ngưỡng | Đề xuất | Nới được tới |
|---|---|---|
| File `.md` ở gốc repo | 6 | 8 |
| File `.md` ở gốc mỗi gói | 3 | 5 |
| Số dòng hiến pháp | 200 | 300 |

---

## 5. KHÔNG áp — biết để khỏi ép nhầm

| Thứ | Vì sao không |
|---|---|
| Khung phân loại tài liệu theo mục đích học tập (tutorial / how-to / reference / explanation) | Khung đó **tự nói rõ nó không dành cho** tài liệu quy trình nội bộ: sổ tay vận hành, quyết định kiến trúc, ghi chú họp. Ép vào là cách nhanh nhất làm méo nó. |
| Sinh tài liệu ngữ cảnh bằng AI hàng loạt | Nghiên cứu 2026 cho thấy file ngữ cảnh do mô hình sinh ra **làm giảm hiệu năng agent và tăng chi phí** — agent làm theo hướng dẫn thừa một cách trung thành. |
| Thêm tài liệu để chữa bệnh thiếu điều hướng | Repo nguồn của spec này có 148 file tài liệu và AI vào vẫn không biết bắt đầu từ đâu. Thừa tài liệu, thiếu điều hướng. |
| Dùng cơ chế duyệt PR làm khoá ghi | Cơ chế duyệt PR là để **duyệt**, không phải để **khoá quyền ghi**. Nhiều agent cùng ghi một thư mục cần khoá riêng. |

---

## 6. Bài test nghiệm thu

Spec này coi là đạt ở một repo khi thoả cả ba:

1. **Test một dòng.** Mở phiên AI hoàn toàn mới, dán đúng:
   *"Đọc `llms.txt` ở gốc repo X rồi làm theo."*
   AI phải nói được: repo có gì · việc ưu tiên #1 là gì · đọc file nào tiếp —
   **không hỏi lại câu nào.**

2. **Test không quét.** AI không cần lấy toàn bộ cây thư mục để hiểu ngữ cảnh.
   Chỉ đọc file cổng + tối đa hai file được trỏ tới.

3. **Test số câu hỏi.** Đếm số câu AI phải hỏi người trong ba phiên liên tiếp.
   Mục tiêu **0**. Mỗi câu hỏi phát sinh → mở một mục việc để bổ sung trường tương ứng.

Ghi kết quả ba test vào `evidence/` như mọi phép đo khác.

---

## 7. Trạng thái RFC

Spec này chưa đóng băng. Đang lấy phản hồi từ nhiều repo cùng lúc, có chủ ý:
chuẩn được kiểm ở nhiều bối cảnh trước khi cố định thì ít phải sửa về sau.

Repo nào review xong thì trả lời theo mẫu ở `PROMPT-PACK-REPO-REVIEW`.
Hết hạn phản hồi thì tổng hợp, chốt v1.0-final, rồi mới dựng repo template.
