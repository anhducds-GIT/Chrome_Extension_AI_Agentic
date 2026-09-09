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

## Làn 1 — Rule Compiler V1 · **ĐÃ CHỐT VÀ ĐÃ CHẠY 09/09**

Đức giao quyền lead: *"Việc tổng hợp rules, tự động complie & control sẽ do AI chủ động hoàn toàn…
tôi phân quyền lead cho bạn… việc của tôi chỉ là giữ các giới hạn."*
[ADR-0030](docs/adr/0030-rule-compiler-v1.md) chốt theo uỷ quyền đó.

**Đã có:** bước ⑥ *compile* chuyển sang máy — `node scripts/rule-compile.mjs --sinh` tái tạo khối
danh sách từ sổ cái, **hai lượt sinh ra y hệt từng byte**. Thước cóc thứ ba
`luat.tran_dong_ban_hieu_luc` đo **cả 19 nơi chứa luật cộng lại** — hai thước cũ chỉ đo `AGENTS.md`
và `docs/`, không cái nào thấy 695 dòng của hai gói fork.

**Một câu KHÔNG tự quyết, và nói rõ vì sao:** ranh giới *"fix nhỏ"* của
`duc-auto-gg-flow-video` ADR-0009. Nó không phải việc nén luật — nó là **luật an toàn**
(`AGENTS.md` gốc mục 3 vế ③), và uỷ quyền của Đức là về nén, không về nới an toàn. **Chờ Đức.**

**đóng khi:** lượt nén y hệt đã áp cho `duc-auto-chatgpt` (đang có lane khác giữ khoá vùng), và
`luat.khoi_sinh` phủ cả ba gói `duc-auto-*`.

## Làn 2 — Nén bản hiệu lực xuống ĐÍCH 8.000 ký tự (`Y-14`)

Đức 09/09 giao quyền lead: *"AI chủ động hoàn toàn… miễn là đúng direction & đúng budget."*
Trần và đích: [ADR-0031](docs/adr/0031-tran-do-bang-ky-tu.md). **Đo bằng KÝ TỰ, đừng đo bằng dòng**
— một lượt nén đã giảm 32% dòng mà chỉ 7% ký tự.

Số sống lấy bằng cổng (`session-check.mjs`, phép *Kho chữ không phình*). Ngày 09/09:

| Ai trả | Hôm nay | Đích |
|---|---:|---:|
| Mọi phiên (`CLAUDE.md` + `AGENTS.md`) | 17.684 | **8.000** |
| Gói nặng nhất (`chatgpt/AGENTS.md`) | 43.783 | **8.000** |

**Mục tiêu tiếp theo, đã đo:** `chatgpt/AGENTS.md` **5,5× quá đích**, phần lớn là bảng *Bản đồ
file* với mô tả test dài. **Cùng bệnh với mục 7 của `AGENTS.md` gốc** — đó là **chỉ mục, không
phải luật** — và mục 7 đã chữa xong làm tiền lệ: rút mỗi hàng còn trigger + file + một mệnh đề.

**Cửa ra rẻ nhất, dùng lại mỗi lần:** chuyển phần **kể chuyện** (đo bao nhiêu, ai vấp, ngày nào)
sang ADR — ADR nạp theo yêu cầu nên **miễn phí** với mọi phiên; bản hiệu lực giữ một câu luật cộng
một liên kết. `AGENTS.md` đang tốn **~194 token một luật**, gấp 3–5 lần cái một câu cần.

**Hai chỗ cấu trúc còn nguyên, cần Đức một câu mỗi chỗ:**

1. **Hai sổ cái là cùng một chuỗi chép đôi** — `gemini 0001–0015` ≡ `chatgpt 0001–0016`, lệch đúng
   một số hiệu. Lịch sử trước lúc fork, tồn tại hai bản.
2. **Ba gói `duc-auto-*` là fork của nhau** (giới hạn ②); `G-08` đo được tám module **giống hệt
   từng byte** giữa hai nhánh.

**đóng khi:** cả hai con số trên bảng đạt đích, và mỗi chỗ cấu trúc hoặc đã gộp hoặc mang một dòng
nói vì sao cố ý giữ hai bản.

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
