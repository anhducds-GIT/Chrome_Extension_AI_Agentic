---
status: Accepted
adr: 0022
date: 2026-09-08
deciders: Đức
---

# ADR-0022 — Chấp nhận rủi ro token trần ở hai Bridge đang đóng băng

## Bối cảnh

**[ĐO 07/09]** `bridge-host.mjs` có ba bản chép trong repo, khác nhau cả ba (461 · 451 · 450
dòng, ba mã băm). Mười một dòng mà bản `duc-auto-chatgpt` có mà hai bản kia không có **chính
là cái bắt tay hai chiều**: máy chủ phải chứng minh nó biết token TRƯỚC khi extension đưa
token ra.

Nghĩa là `duc-auto-gemini` và `duc-auto-gg-flow-video` **đưa token ra ngay khi socket mở**.
Trên loopback, một tiến trình chiếm được cổng trước là lấy được token.

Cả hai gói **đang đóng băng** (`.repo-structure.json` khối `frozen`), và luật mục 1 của
`AGENTS.md` chỉ cho đọc. Nên chỗ hở này nằm trong sổ nợ Scouter dưới mã `S-11` từ 07/09, với
đúng hai đường ra: mở băng để sửa, hoặc ghi một dòng lý do chấp nhận rủi ro.

Lõi dùng chung `workers/_shared/bridge-host/` **đã có** cái bắt tay đó, kèm phép ghim nối thật
qua socket (`bat-tay-hai-chieu.mjs`) và hai con đột biến `X3` `X4`. Hai gói sống — `duc-scouter`
và `hnx-fetch` — đều dùng lõi chung, nên **chỗ hở không lan sang việc đang làm**.

## Quyết định

**Chấp nhận rủi ro.** Hai gói đóng băng giữ nguyên bản Bridge cũ; không mở băng để vá.

Ba lý do, theo thứ tự sức nặng:

1. **Ranh giới tấn công là loopback trên máy cá nhân của Đức.** Kẻ khai thác được nó đã phải
   chạy được mã tuỳ ý trên chính máy đó — lúc ấy token Bridge là thứ nhỏ nhất họ lấy được.
2. **Mở băng đắt hơn chỗ hở.** Chuyển hai gói sang lõi chung là đụng cửa Bridge của hai
   extension đang cài thật, rồi phải đóng băng lại — và bản thân lượt mở băng là con đường
   những vệt trôi mới đi vào.
3. **Chỗ hở không lan.** Mọi việc từ nay chạy trên hai gói sống, và cả hai đã có bắt tay hai chiều.

`S-11` **rời sổ nợ**. Đức chốt rõ: *"S11 ok chấp nhận, và bỏ khỏi list để không bị hỏi lại"*.

## Hệ quả

- **Mất:** hai gói đóng băng vĩnh viễn mang một chỗ hở đã biết. Ai đọc mã của chúng sẽ gặp lại
  chỗ đó và không thấy dấu vết nào trong sổ nợ — đó là lý do ADR này tồn tại, và là **chỗ duy
  nhất** còn ghi lại nó.
- **Được:** không ai hỏi lại `S-11` nữa, và sổ nợ Scouter ngắn đi một mục.
- **Đổi lại một điều kiện:** quyết định này gắn với chữ *"đóng băng"*. **Mở băng một trong hai
  gói vì bất cứ lý do gì thì ADR này hết hiệu lực** — gói được mở phải chuyển sang
  `workers/_shared/bridge-host/` trong chính lượt mở đó, đừng mở ra rồi để đấy.
- Không ai phải làm gì khác đi từ hôm nay.

## Trạng thái

Accepted
