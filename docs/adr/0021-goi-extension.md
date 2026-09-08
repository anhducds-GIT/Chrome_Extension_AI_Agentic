---
status: Accepted
adr: 0021
decides: [0021, 0022, 0024]
date: 2026-09-08
last_reviewed: 2026-09-09
deciders: Đức
---

# ADR-0021 — Các gói extension: bao nhiêu gói được sống, và tách gói thế nào

> **File chủ đề.** Mang quyết định **0021** (08/09, HNX Fetch tách gói riêng), **0022** (08/09,
> chấp nhận rủi ro token ở hai Bridge đóng băng) và **0024** (08/09, mở băng toàn bộ). Gộp 09/09.

## Quyết định

### ⑴ KHÔNG CÒN TRẦN SỐ GÓI — cả năm gói đều sống

Đức chốt 08/09: *"tôi mở băng để chuẩn bị làm các extension đó."* Năm gói: `duc-scouter` ·
`hnx-fetch` · `duc-auto-chatgpt` · `duc-auto-gemini` · `duc-auto-gg-flow-video`.

**Cơ chế đóng băng Ở LẠI, danh sách để rỗng.** `frozen` trong `.repo-structure.json` thành `[]`,
**không** bị gỡ khỏi cấu hình và **không** bị gỡ khỏi mã. Ba chỗ đọc nó — cổng đóng phiên (bỏ
suite), bản đồ việc (mục `B2 · ĐÃ ĐÓNG BĂNG`), phép ghim `tests/frozen-suite-smoke.mjs` — giữ
nguyên. Đóng băng là **công tắc**, Đức bật lại được bằng một dòng cấu hình. Cái đắt là *cách làm*,
không phải danh sách.

**Cái mất, biết trước:** trần này là thứ duy nhất chặn số gói phình. Nay chặn nằm ở **giới hạn ⑦
của `AGENTS.md` (tối đa 2 chat song song)** và **giới hạn ② (cấm cài một tính năng hai lần)**.
Hai cái đó vừa nhận thêm tải — **không nới thêm cái nào trong hai.**

### ⑵ Tách gói khi nó HẸP HƠN gói cũ ở mọi chiều đo được

HNX Fetch là extension riêng: `workers/hnx-fetch/`, khoá riêng cùng tên, giao thức riêng
`hnx-fetch.bridge`.

**Đây không phải fork thứ tư.** Fork là *hai bản của một thứ*; đây là *hai thứ khác nhau*:

| | Scouter | HNX Fetch |
|---|---|---|
| quyền `debugger` | có | **không** |
| bấm · gõ · cây DOM · ảnh chụp | có | **không có** |
| vùng đích | `<all_urls>` | `hnx.vn` + máy chủ tại chỗ |
| lệnh Bridge | 15 | **4** |
| việc | dò trang bất kỳ | lấy dữ liệu một trang, mỗi ngày |

Ba gói `duc-auto-*` thì ngược lại: cùng bề mặt, cùng năng lực, khác nhau **chỉ ở những chỗ đã trôi
mất đồng bộ**. Đó mới là fork.

**Cắt chứ không tắt.** `bridge-core.mjs` và `fetch-core.mjs` bị **xoá** 11 lệnh, không phải chặn
bằng cờ. Manifest **không khai quyền `debugger`**, vùng đích hẹp về `hnx.vn` + `127.0.0.1` thay
cho `<all_urls>`. Hai tệp chép nguyên văn (`transport.mjs` · `journal-core.mjs`) có phép ghim so
**từng byte** với bản gốc bên Scouter.

### ⑶ Chấp nhận rủi ro token trần ở hai Bridge cũ

Hai gói từng đóng băng giữ nguyên bản Bridge cũ (nhận token trần, không bắt tay hai chiều);
**không mở băng chỉ để vá.** Ba lý do, theo thứ tự sức nặng:

1. **Ranh giới tấn công là loopback trên máy cá nhân của Đức.** Kẻ khai thác được nó đã phải chạy
   được mã tuỳ ý trên chính máy đó — lúc ấy token Bridge là thứ nhỏ nhất họ lấy được.
2. **Mở băng đắt hơn chỗ hở.** Chuyển hai gói sang lõi chung là đụng cửa Bridge của hai extension
   đang cài thật — và bản thân lượt mở băng là con đường những vệt trôi mới đi vào.
3. **Chỗ hở không lan.** Việc mới chạy trên gói đã có bắt tay hai chiều.

`S-11` **rời sổ nợ**. Đức chốt rõ: *"S11 ok chấp nhận, và bỏ khỏi list để không bị hỏi lại"*.

## Vế đã chết

- **0021 ⑵ — *"trần một gói sống nâng lên HAI"*.** Chết cùng ngày: 0024 bỏ hẳn trần (vế ⑴ ở trên).

## Hệ quả

**Được:** làm được cả năm gói. Và có một tiêu chí đo được để phân biệt *tách gói đúng* với *fork*
— hẹp hơn ở mọi chiều thì tách, cùng bề mặt thì gộp.

**Mất:** không còn con số nào chặn số gói. Nếu giới hạn ⑦ hoặc ② bị nới thì repo mất luôn cả ba
lớp cùng lúc — đó là lý do vế ⑴ nói thẳng đừng nới.

**Còn nợ:** hai Bridge cũ vẫn nhận token trần. Đã chấp nhận, đã rời sổ nợ, **nhưng nó vẫn đúng
như thế** — ai mở lại hai gói đó thì đây là chỗ đầu tiên nên nhìn.

## Trạng thái

Accepted.
