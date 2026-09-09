# ROADMAP — làn nào trước, và cái gì đóng nó

> **Đây là THỨ TỰ, không phải trạng thái.** Trạng thái sống lấy bằng một lệnh — đừng tin con số
> nào gõ trong file này, vì file này sẽ cũ:
>
> ```bash
> node scripts/what-next.mjs
> ```
>
> Mỗi làn có **một điều kiện đóng đo được**. Làn không có điều kiện đóng thì không phải làn, nó
> là một mong muốn. Việc phát sinh trong lúc làm → `BACKLOG.md`; ý tưởng mới → `IDEAS.md`.
> Thứ tự dưới đây theo chốt của Đức; chỗ nào Đức đã nói ra thì trích nguyên văn.

## Làn 1 — Rule Compiler V1 · **ĐÓNG 09/09**

Đức giao quyền lead: *"Việc tổng hợp rules, tự động complie & control sẽ do AI chủ động hoàn toàn…
tôi phân quyền lead cho bạn… việc của tôi chỉ là giữ các giới hạn."*
[ADR-0030](docs/adr/0030-rule-compiler-v1.md) chốt theo uỷ quyền đó.

**Đã có:** bước ⑥ *compile* chuyển sang máy — `node scripts/rule-compile.mjs --sinh` tái tạo khối
danh sách từ sổ cái, **hai lượt sinh ra y hệt từng byte**.

**ĐÓNG 09/09 chiều.** `luat.khoi_sinh` phủ **cả ba** gói `duc-auto-*`, và cả ba trỏ vào
`decisions.md` chứ không vào `AGENTS.md` — khối sinh ra dài 5.700–7.500 ký tự, **đắt hơn cả cái nó
thay**, nên nó thuộc về file COMPANION (đọc khi cần), không thuộc file CORE (nạp mỗi phiên đụng gói).

Lượt gắn đó trả về hai thứ ngoài dự tính:

- **Một lỗ của chính bộ đo.** Hai sổ cái fork của nhau sinh ra hai khối chép đôi → phép ③ nhảy
  **2 → 19 nhóm**, và **không nhóm nào có cửa ra**: ba lựa chọn của `RULE-COMPILER.md` mục 4 đều
  vô nghĩa với thứ máy vừa tự sinh. Vá ở `dongLuat`, ghim cả hai chiều.
- **Một chỗ trôi mà bước ⑥ sinh ra để chặn.** Bảng gõ tay của `gg-flow-video` đang khai `ADR-0003`
  là còn sống, trong khi chính ADR đó đã khai `- **0003 — …**` chết từ 05/09.

**Một câu KHÔNG tự quyết, và nói rõ vì sao:** ranh giới *"fix nhỏ"* của
`duc-auto-gg-flow-video` ADR-0009. Nó không phải việc nén luật — nó là **luật an toàn**
(`AGENTS.md` gốc mục 3 vế ③), và uỷ quyền của Đức là về nén, không về nới an toàn. **Chờ Đức.**

## Làn 2 — Nén bản hiệu lực xuống ĐÍCH có biên (`Y-14`)

Đức 09/09 giao quyền lead — *"AI chủ động hoàn toàn… miễn là đúng direction & đúng budget"* — và
đặt lại cách tính đích: *"mục tiêu không phải đạt ngưỡng, mà phải **nhỏ hơn ngưỡng margin
30–40%**, vì sau này sẽ tiếp tục phình ra."* Ba con số cho mỗi thước:
[ADR-0033](docs/adr/0033-tran-co-bien-va-bay-cho-mau-thuan-trong-ban-hieu-luc.md) ⑴.
**Đừng tin con số dưới đây** — cổng in ra số sống.

| Ai trả | 09/09 sáng | 09/09 chiều | ĐÍCH | Trần |
|---|---:|---:|---:|---:|
| Mọi phiên (`CLAUDE.md` + `AGENTS.md`) | 20.530 | **6.588** | **5.200** | 8.000 |
| Bó nặng nhất (gốc + một gói) | 64.313 | **20.869** | **10.400** | 16.000 |

**Đã đóng: nạp mỗi phiên xuống dưới TRẦN, còn 1.388 ký tự nữa là tới ĐÍCH.**
`chatgpt` 43.783 → 12.944 · `gemini` 19.045 → 9.443 · gốc 17.255 → 6.427.

**Bốn cửa ra, xếp theo cái cắt được nhiều nhất — dùng lại mỗi lượt:**

1. **Chỉ mục thì để MÁY giữ.** Bảng *Bản đồ file* của một gói nuốt 55–64% cả file; riêng các hàng
   `tests/*` chép lại docblock của chính phép kiểm đó. Cổng chỉ so **tên cấp cao**.
2. **Sổ cái thì để `--sinh` giữ**, và để nó ở `decisions.md` (companion) chứ không ở `AGENTS.md`.
3. **Kể chuyện thì chuyển, không xoá** — sang ADR, hoặc sang chính file người đọc sẽ mở.
4. **Thủ tục thì chuyển xuống Tầng 2 KÈM MỘT CÒ NẠP BẮT BUỘC.** Đây là cửa mà tôi đã bỏ sót và
   **một lượt audit độc lập (Codex) bác bỏ kết luận sai của tôi** mới lôi ra được: chuyển thủ tục
   mà vẫn giữ bất biến ở Tầng 1 **không phải là xoá luật**. Riêng cửa này đưa `AGENTS.md` gốc từ
   16.245 xuống 6.427 mà không mất một lớp bảo vệ nào trong 13 mục audit yêu cầu giữ.

**Chỗ còn lại, và nó không còn là việc nén:**

- **1.388 ký tự cuối của phần gốc.** Mỗi dòng còn lại là một bất biến riêng; cắt tiếp là **bỏ bớt
  luật**. Cần một lượt rà nữa để xem có luật nào đã được cổng cưỡng chế hoàn toàn (cửa ra thứ tư
  của `RULE-COMPILER.md` mục 2) — đó là cách duy nhất còn lại mà không mất bảo vệ.
- **Bó của gói còn 2× quá đích.** `duc-scouter` (14.281) và `gg-flow-video` (11.885) chưa qua lượt
  nén nào; `chatgpt` còn mục *Luật vàng* mang khối biện minh đã chuyển sang
  [ADR-0032](docs/adr/0032-ba-goi-giu-luat-rieng-gan-giong-nhau.md) ở nhánh Gemini nhưng **chưa gỡ
  ở nhánh này** — lane khác đang giữ khoá vùng.

**Hai chỗ cấu trúc còn nguyên, cần Đức một câu mỗi chỗ:**

1. **Hai sổ cái là cùng một chuỗi chép đôi** — `gemini 0001–0015` ≡ `chatgpt 0001–0016`.
2. **Ba gói `duc-auto-*` là fork của nhau**; `G-08` đo được tám module **giống hệt từng byte**.

**đóng khi:** cả hai con số trên bảng đạt **ĐÍCH** (không phải trần), và mỗi chỗ cấu trúc hoặc đã
gộp hoặc mang một dòng nói vì sao cố ý giữ hai bản.

## Làn 3 — Đóng nợ gói ChatGPT, tới MVP

Thứ tự này là của Đức, ghi ở `Y-15`: *đóng nợ kỹ thuật gói GPT trước, rồi mới* tới vòng
Claude Code ↔ GPT dùng thật.

Gói này đang có nhiều việc mở nhất và **đang có lane khác giữ khoá** — đọc thì tự do, ghi thì không.
**Cập nhật 09/09:** `STATUS.md` của gói khai **MVP KHÔNG còn bị chặn ở B-36** — vòng chat 0 cú bấm đã
chạy trọn, nghiệm thu live. Việc còn lại của làn này là **B-43** và phần còn lại của ADR-0050.
**Đừng tin dòng này** — đọc `STATUS.md` của gói, nó mới tươi.

**đóng khi:** `B-36` đóng, và `node scripts/backlog-check.mjs` cho gói đó dưới trần.

## Làn 4 — `duc-auto-gg-flow-video` chạy được một job thật

Gói `building`, chưa từng khai kiểm chứng. `STATUS.md` nói rõ nó đang **chờ Flow hết quá tải** —
đây là làn **chặn bởi bên ngoài**, không chặn bởi người.

**đóng khi:** một job video chạy trọn vòng trên trang thật, bằng chứng vào `evidence/`, và
`STATUS.md` khai `last_verified` + `evidence_ref`.

## Làn 5 — `duc-auto-gemini` về không còn việc mở

Còn ba việc, và **không việc nào AI làm tiếp được một mình**: `G-01` và `G-02` chờ Đức reload
extension để nghiệm thu live; `G-08` là việc gộp mã, thuộc Làn 2.

**đóng khi:** `G-01` và `G-02` có bằng chứng live, `G-08` theo câu chốt của Làn 2.

## Làn 6 — Nợ hạ tầng ở gốc

Hai mục, cả hai nhỏ và độc lập: **`N-45`** một byte điều khiển thô trong gói video (chờ Làn 4 mở
khoá vùng), **`N-59`** `--restamp --duc-duyet` gán nhầm xuất xứ cho khoá của lane khác — nó **vu
cho một phiên khác một vụ cướp khoá không có thật**, nên đáng sửa sớm dù nhỏ.

**đóng khi:** `node scripts/backlog-check.mjs` báo 0 mục mở ở gốc.

## Đang DỪNG — đừng tự khởi động lại

- **`duc-scouter`** — Đức chốt tạm dừng 08/09. Quay lại thì việc kế ghi sẵn trong `STATUS.md` của gói.
- **Dọn 122 MB ảnh trùng** và **chuyển khoá ba gói** — Đức chốt *"ảnh & khoá giữ nguyên"*.

## Chờ Đức, không ai làm thay được

Danh sách sống ở khối **C** của `node scripts/what-next.mjs`, và mỗi mục có trường `việc kế` ngay
trong `IDEAS.md`. Đừng chép chúng xuống đây — chép là đẻ ra bản thứ hai sẽ lệch.
