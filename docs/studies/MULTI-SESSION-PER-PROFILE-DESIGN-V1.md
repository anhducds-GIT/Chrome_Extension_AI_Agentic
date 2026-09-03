---
kind: study
status: active
ttl_days: 180
---

# Nhiều phiên làm việc có tên trong MỘT profile Chrome — thiết kế V1 (ĐÃ DUYỆT 03/09)

> Đức yêu cầu 02/09: "làm tiếp tính năng có nhiều ID trong 1 chrome profile để có thể
> gọi tên nhiều phiên làm việc song song trên cùng 1 tài khoản chrome."
>
> **Đức trả lời 4 câu ngày 03/09** — bản ghi chính thức:
> `workers/duc-auto-chatgpt/v0.1.0/docs/adr/0046-…`: (1) duyệt **hướng A**, tên có hiệu
> lực NGAY khi lưu, không reset gì; (2) **ChatGPT trước**, Gemini/Flow chưa làm vội —
> debug xong mới migrate; (3) **trần 3** phiên song song; (4) làm **cả hai chiều**,
> "tương tác y hệt hiện tại, chỉ thêm ID tách 3 nhánh" — không chia hai bước phê duyệt.
> Bước 1 đã thành code: commit `54160a2` (ghế workspace + method chạm tab bind theo
> phiên; khoá một-run-một-lúc giữ nguyên).

## Câu hỏi

Trên MỘT profile Chrome đang mở nhiều tab GPT Web, làm sao để mỗi tab (mỗi luồng
reasoning) là một "ghế" có tên riêng trên Bridge, chạy song song, không giẫm nhau?

## Hiện trạng — vì sao hôm nay chưa làm được ([ĐỌC] từ code, 02/09)

1. Một profile = MỘT ghế: một service worker, một socket, một `instance_id`
   (`bridge-transport-loopback.js` — khối instance đọc từ `chrome.storage.local`,
   kho chung của cả profile).
2. Executor là side panel, và runner gửi lệnh tới **tab đang active** — không có khái
   niệm "job này thuộc tab kia" (`AI-OPERATOR-GUIDE.md` gg-flow, mục "Đúng MỘT tab").
3. Hàng đợi + run state + ledger là MỘT bộ cho cả profile (`chrome.storage.local`,
   không namespace theo tab). Chân panel ghi rõ: *Sequential only*.

Tức là rào không nằm ở Bridge (host đã chịu nhiều ghế từ 02/09) mà nằm ở **executor
và kho trạng thái trong extension**.

## Ba phương án đã cân

### A. Mỗi tab một "workspace" — N socket từ một profile ← ĐỀ XUẤT

Extension mở **một socket riêng cho mỗi workspace**. Mỗi workspace = một tab được
Đức gắn tên (ví dụ `gpt-kichban`, `gpt-research`) trong panel. Mỗi socket báo danh
bằng `instance_id` riêng (dẫn xuất: id profile + tên workspace) — **host giữ nguyên,
không sửa một dòng nào**: với host, một workspace trông y hệt một profile.

- Được: tái dùng TOÀN BỘ lớp multi-profile vừa xây (routing, fail-closed, `served_by`,
  `bridge.sessions`, nút Lưu tên). Host, CLI, giao thức: không đổi.
- Phải làm ở extension: (1) bảng workspace trong panel (tạo/xoá/gắn tab);
  (2) lệnh chạm trang đi tới **tabId của workspace** thay vì tab active
  (`chrome.tabs.sendMessage(tabId, …)` — content script đã có sẵn ở mọi tab khớp);
  (3) **tách hàng đợi + run state + ledger theo workspace** (namespace trong
  storage) — đây là phần nặng và là phần đụng luật an toàn.
- Rủi ro chính: tab bị đóng/điều hướng → workspace mồ côi. Xử fail-closed: socket
  của workspace đó tự ngắt, host trả `TARGET_NOT_CONNECTED`, không bao giờ "trôi"
  sang tab khác.

### B. Một socket, đa "session con" trong giao thức — LOẠI

Nới giao thức để một kết nối khai nhiều session con. Host, CLI, schema, cả ba worker
đều phải sửa; mọi lợi ích của B đều đạt được bằng A với chi phí thấp hơn. Loại.

### C. Giữ nguyên: mỗi luồng một profile Chrome — mốc so sánh

Đang chạy tốt hôm nay. Nhược điểm thật với cách Đức làm việc: N profile = N cửa sổ
Chrome, N lần đăng nhập, nặng máy. A đáng làm nếu Đức thật sự chạy nhiều luồng
trên một tài khoản thường xuyên; C vẫn là đường lui an toàn.

## Vì sao phải hỏi trước khi code ([ĐỌC] AGENTS.md §2.3)

Tách hàng đợi/run-state/ledger theo workspace là đổi kiến trúc của các lớp
**exact-once, attribution, persistence** — ba lớp thuộc danh sách "đổi luật an toàn
phải hỏi Đức". Cụ thể phải thiết kế lại: mỗi workspace một ledger + một khoá
RUN_ACTIVE riêng; attribution (ảnh/text sinh ra thuộc job nào) phải gắn theo tab.

## Cần Đức duyệt — 4 câu, trả lời ngắn là đủ

1. **Duyệt hướng A?** (host giữ nguyên; extension thêm workspace theo tab)
2. **Phạm vi bước 1:** chỉ nhánh **ChatGPT** trước (nơi Đức cần nhiều reasoning
   song song), Gemini/Flow sau khi mẫu chạy ổn?
3. **Trần song song trong một profile:** đề xuất **≤3 workspace** (một tài khoản GPT
   Web bị rate-limit phía OpenAI; chạy quá nhiều luồng một tài khoản là tự bóp mình).
4. **Giai đoạn hoá:** bước A1 CHỈ ĐỌC (workspace + dom_probe theo tab — 0 rủi ro,
   không đụng luật an toàn) → Đức thấy chạy được → bước A2 mới tách hàng đợi/ledger
   (phần đụng exact-once, có brief + audit riêng)?

Nếu Đức muốn nhìn số trước: bước A1 tự nó đã hữu ích (soi song song nhiều tab bằng
`--target`), và chưa cần duyệt luật an toàn nào.

## Kết luận

Làm được, không đụng host, nhưng phần tách hàng đợi/ledger theo workspace là việc
đổi luật an toàn thật sự — nên đi hai bước (A1 chỉ đọc → A2 ghi), mỗi bước một
brief + test ghim + audit như nếp cũ.

## Việc tiếp theo

~~Đức trả lời 4 câu ở mục "Cần Đức duyệt"~~ — **đã trả lời 03/09, xem đầu file.**
Bước 1 đã ship (`54160a2`). Việc còn lại của hướng này: thiết kế + brief riêng cho
**N run đồng thời** (tách hàng đợi / run-state / ledger theo phiên — phần đụng
exact-once thật sự; "cả hai chiều" đã được duyệt nhưng miếng này vẫn cần brief + test
ghim + audit như nếp cũ trước khi code).
