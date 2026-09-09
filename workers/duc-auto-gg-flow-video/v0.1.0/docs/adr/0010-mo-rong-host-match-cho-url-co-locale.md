---
status: Accepted
adr: 0010
date: 2026-09-02
deciders: Đức
source_section: "2026-09-02 — Mở rộng host match cho URL có locale (Đức duyệt trong chat)"
migrated_from: workers/duc-auto-gg-flow-video/v0.1.0/decisions.md
nhom: bridge-va-thuc-thi
---

# ADR-0010 — Mở rộng host match cho URL có locale

## Bối cảnh

**Vì sao:** đo thật trên hồ sơ `Bình` — Flow phục vụ cùng một dự án ở **cả hai** dạng:

```
https://labs.google/fx/tools/flow/project/<id>
https://labs.google/fx/vi/tools/flow/project/<id>     ← giao diện tiếng Việt
```

Pattern cũ chỉ khớp dạng thứ nhất. Trên Chrome đặt tiếng Việt, Chrome **không tiêm content
script**, panel báo `composer_found: false`, và triệu chứng nổi lên là **`RECEIVER_LOST`** —
một mã lỗi chỉ thẳng vào "mất kết nối với tab". Ba lượt hỏi đáp mới lần ra thủ phạm là một
đoạn `/vi/` trên thanh địa chỉ.

## Quyết định

**Chốt:** thêm `https://labs.google/fx/*/tools/flow/*` vào `host_permissions` **và**
`content_scripts.matches` của `manifest.json`, cạnh pattern cũ. Đây là **quyền mới**, nên theo
`AGENTS.md` gốc mục 3 (*Phải hỏi Đức trước*) phải hỏi Đức — đã hỏi, Đức duyệt:
*"làm luôn đi, sửa cả manifest lẫn adapter."*

**Ranh giới đã cân nhắc, và vì sao hai lớp cố ý KHÁC nhau:**

- **Manifest buộc phải rộng.** Match pattern của Chrome chỉ có `*`, và `*` nuốt cả dấu gạch
  chéo — không có cách nào nói "đúng một đoạn". Nên `fx/*/tools/flow/*` cũng khớp
  `fx/bất/kỳ/đường/nào/tools/flow/*`.
- **Adapter thì siết.** `provider-adapter.js` chỉ nhận **đúng một** đoạn, và đoạn đó phải có
  dạng mã ngôn ngữ (`vi`, `en`, `pt-BR`). Manifest quyết định script **có được nạp** không;
  adapter mới là cổng quyết định trang đó **có phải Flow thật** không.

Nới lớp một mà quên siết lớp hai là biến một sự nới lỏng kỹ thuật thành lỗ hổng thật — có test
ghim đúng điều đó (`tests/flow-locale-url-static.mjs`, mục cuối), và mutation `S2` dựng lại
chính kịch bản ấy đã bị bắt.

**Không nới thêm gì khác:** vẫn dưới `labs.google`, vẫn phải kết thúc bằng `/tools/flow/*`.
Phép kiểm từ chối mọi match pattern rộng hơn mức này.

## Hệ quả

Nới vế ⑵ của [ADR-0001](0001-ba-chot-khai-sinh-package-flow-00.md) (*không xin rộng hơn*) một
cách có kiểm soát: quyền rộng ra ở lớp manifest, nhưng cổng quyết định thì siết lại ở adapter,
nên bề mặt thật **không** rộng thêm.

## Trạng thái

Accepted.

> Tách ra từ `workers/duc-auto-gg-flow-video/v0.1.0/decisions.md` ngày 2026-09-09 (N-55).
> Chỉ đổi HÌNH DẠNG, không đổi một chữ nội dung quyết định.
