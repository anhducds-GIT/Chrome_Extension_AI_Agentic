---
kind: study
status: active
ttl_days: 180
---

# PROGRAM-MAP-V1

> **Bảy luồng việc Đức nhớ, đối chiếu với repo.** Đo tại 2026-08-31, commit `b5430f9`.
> **Kết luận:** cả 7 đều có thật. Không thiếu luồng lớn nào. Nhưng **thứ tự đánh số đang
> che mất quan hệ phụ thuộc** — luồng 6 không phải việc thứ sáu, nó là nền của 5 và 7.

---

## 1. Bảy luồng — bằng chứng đo được

| # | Đức nhớ | Bằng chứng trong repo | Trạng thái |
|---|---|---|---|
| 1 | 3 extension đang build | ChatGPT `B-01…B-27` · Gemini `G-01…G-11` · Flow Video `F-01…F-12` | ✅ đang chạy |
| 2 | Nghiên cứu capacity | `PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md` **1.265 dòng**, 5 mặt phẳng năng lực (Observation · Actuation · Topology · Artifact/Evidence · Local processing), phân loại `PROVEN/LIKELY/GATED/NEEDS PROOF/CLOSED` + 14 file `EXP-02…EXP-15` | ⚠️ **đang đẻ file nhanh nhất** |
| 3 | Chuẩn hoá seed | `XLSX_TEMPLATE_GOVERNANCE.md` (47 dòng, tự khai "SSOT") + `DAC_XLSX_RUN_PLAN_V1.md` **nhân bản ở cả 3 gói** + `F-07` mở rộng schema cho video | ⚠️ **nợ chưa đặt tên** |
| 4 | Nâng cấp platform Agentic | `PLATFORM-V01` → `V02A` → `V02B` → `V02C-BRIEF` (feature-parity.mjs) + Bridge | ✅ đang chạy |
| 5 | Kênh tương tác & theo dõi khi hệ nở ra | `DASHBOARD.md` + `FEATURE-PARITY.md` (khối `AUTO:`) — đã có nền, thiếu cổng vào | 🟡 làm một nửa |
| 6 | Chuẩn hoá trước khi dữ liệu phình | `RESTRUCTURE-PLAN-V1` — 7 giai đoạn, chưa bắt đầu | ⬜ chưa khởi động |
| 7 | Template tái sử dụng | Chưa có gì | ⬜ chờ 6 xong |

---

## 2. Bảy luồng thực ra là ba loại khác nhau

Đây là chỗ đánh số 1→7 gây hiểu nhầm. Chúng không nằm cùng một mặt phẳng.

| Loại | Luồng | Bản chất | Nếu dừng lại thì sao |
|---|---|---|---|
| **SẢN PHẨM** | 1 · 2 · 3 | Tạo ra giá trị trực tiếp cho Đức | Mất tiến độ, không mất tài sản |
| **HẠ TẦNG** | 4 · 5 | Giúp sản phẩm chạy nhanh hơn | Sản phẩm chạy chậm dần |
| **KỶ LUẬT** | 6 · 7 | Giữ cho hệ không sụp khi nở ra | **Nợ tích luỹ, tới lúc không sửa được** |

Loại KỶ LUẬT có một tính chất riêng: **càng để lâu càng đắt.** Sản phẩm hoãn một tuần thì
mất một tuần. Kỷ luật hoãn một tuần thì phải dọn thêm số file của một tuần đó.

---

## 3. Quan hệ phụ thuộc — thứ đang bị che

```
        ┌─ 1. Ba extension ─────────────► tiếp tục, không chặn ai
        │
        ├─ 2. Capacity study ──┐
        │                      ├──────► 4. Platform (nuôi bằng phát hiện)
        ├─ 3. Chuẩn seed ──────┘
        │
        └─ 6. CHUẨN HOÁ ───┬──────────► 5. Kênh theo dõi (cần cổng vào)
           (nền móng)      │
                           └──────────► 7. Template (không thể nhân bản
                                           thứ chưa chuẩn hoá)
```

**Ba kết luận từ sơ đồ:**

1. **Luồng 6 chặn cả 5 và 7.** Làm 5 trước 6 thì phải làm lại; làm 7 trước 6 thì nhân bản
   một thiết kế chưa thử — sai ở mọi repo tương lai cùng lúc.
2. **Luồng 1 không chặn ai và không bị ai chặn.** Chạy song song được, cứ để chạy.
3. **Luồng 2 và 3 nuôi luồng 4.** Nhưng cả hai đang tạo nợ nhanh hơn tốc độ luồng 6 dọn.

---

## 4. Hai rủi ro cụ thể, có số

### Rủi ro A — Luồng 2 là nguồn phình lớn nhất

`drafts/` có 29 file. Trong đó **15 file thuộc luồng 2** (`EXP-02` → `EXP-15` +
`PHASE-1-SYNTHESIS` 1.265 dòng + `CHROME_BRIDGE_CAPABILITY_REACH_STUDY`).

Không file nào có ngày hết hạn, chủ sở hữu, hay trạng thái. Nghiên cứu vẫn đang tiếp diễn,
nghĩa là con số này **chỉ tăng**.

**Đề xuất:** không dừng nghiên cứu. Nhưng **đóng băng việc thêm file mới vào `drafts/`**
cho tới khi GĐ 5 (draft có hạn sử dụng) xong. File nghiên cứu mới trong lúc chờ thì đặt tạm
ở `docs/studies/` với frontmatter đầy đủ ngay từ đầu.

### Rủi ro B — Luồng 3 chưa được nâng lên tầng platform

`DAC_XLSX_RUN_PLAN_V1.md` tồn tại ở **cả ba gói**. Ba bản. Không có gì buộc chúng khớp nhau.
Và `XLSX_TEMPLATE_GOVERNANCE.md` — file tự khai là "nguồn sự thật duy nhất" cho seed —
chỉ nằm trong gói `duc-auto-chatgpt`, không phải ở tầng platform.

Đây là **đúng cái bệnh `PLATFORM.md` sinh ra để chữa**, nhưng lần này ở tầng dữ liệu seed
thay vì tầng tài liệu. Chưa ai đặt tên cho nó nên chưa ai sửa.

**Đề xuất:** nâng governance seed lên `docs/SEED-GOVERNANCE.md` ở gốc repo, ba gói trỏ link.
Đưa vào GĐ 7 như một món riêng.

---

## 5. Thứ tự đề xuất

| Ưu tiên | Luồng | Làm gì | Vì sao thứ tự này |
|---|---|---|---|
| **1** | 6 | `RESTRUCTURE-PLAN-V1` GĐ 1→3 | Nền móng. Rẻ nhất khi làm sớm nhất. |
| **2** | 1 | Ba extension chạy tiếp bình thường | Không chặn ai. Đừng dừng. |
| **3** | 2 | Nghiên cứu tiếp, **ngừng đổ vào `drafts/`** | Chặn nguồn phình lớn nhất |
| **4** | 6 | GĐ 4→6, kết thúc bằng bài test một dòng | Bật chặn, không thể tạo nợ mới |
| **5** | 5 | Kênh theo dõi = Khối C của DASHBOARD | Đã có nền từ GĐ 1 |
| **6** | 3 | Nâng seed governance lên platform | Trả nợ đã đặt tên |
| **7** | 4 | Platform V0.3 dựa trên phát hiện của luồng 2 | Có nền vững mới mở rộng |
| **8** | 7 | Template tái sử dụng | Chỉ nhân bản thứ đã chứng minh |

**Không có luồng nào bị huỷ.** Chỉ đổi thứ tự và chặn một nguồn phình.

---

## 6. Điều quan trọng nhất trong tài liệu này

Đức vừa liệt kê 7 luồng **từ trí nhớ**. Không sai luồng nào — nhưng đó chính là vấn đề.

Bảy luồng này phải nằm trong repo, không nằm trong đầu Đức. Cụ thể: **Khối C của
`DASHBOARD.md`** (GĐ 1 + GĐ 5 của kế hoạch tái cơ cấu) phải máy sinh ra đúng bảng ở mục 1,
gom từ các `BACKLOG.md` và frontmatter của file trong `docs/`.

Khi đó, câu hỏi *"tôi đang có những việc gì"* trở thành **một lần mở file**, không phải
một lần nhớ lại. Và khi Đức quên, hệ thống không quên.

Đó cũng là bài kiểm tra thật cho toàn bộ dự án tái cơ cấu:

> Sau GĐ 5, mở `DASHBOARD.md` phải thấy đúng 7 luồng này — máy sinh, không ai gõ tay.

---

## 7. Việc kế tiếp

Một việc: **GĐ 1 của `RESTRUCTURE-PLAN-V1`** — sinh `llms.txt` + `repo-map.json` + Khối A, D.

Mọi thứ khác chờ. Kể cả luồng 7 mà Đức đang muốn làm — template chỉ có nghĩa sau khi
chuẩn đã chạy thật ở một repo.
