---
kind: guide
status: active
ttl_days: 365
---

# Bản mẫu ADR

> Chép file này thành `NNNN-mo-ta-ngan-khong-dau.md` trong thư mục ADR đúng tầng.
> Luật đầy đủ: [docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md](adr/0000-ghi-nhan-quyet-dinh-kien-truc.md).

**Đặt ở đâu:**

| Quyết định của… | Thư mục |
|---|---|
| một package | `workers/<gói>/<phiên-bản>/docs/adr/` |
| cả repo | `docs/adr/` ở gốc |

**Đánh số** liên tục trong phạm vi TỪNG thư mục, bắt đầu `0001` (gốc repo bắt đầu `0000`).

---

Phần dưới là nội dung cần chép:

```markdown
---
status: Proposed
adr: NNNN
date: YYYY-MM-DD
deciders: <ai chốt — nếu không có thì ghi "không ghi lại">
---

# ADR-NNNN — <một câu, nói đúng cái đã chốt>

## Bối cảnh

<Chuyện gì đang xảy ra khiến phải quyết? Ràng buộc nào có thật? Số đo nào đã có?>

## Quyết định

<Chốt cái gì. Viết ở thể khẳng định: "Dùng X", không phải "nên dùng X".>

## Hệ quả

<Đổi lại được gì, mất gì, ai phải làm gì khác đi từ nay. Cả mặt xấu — một ADR chỉ
nói mặt tốt là một ADR chưa viết xong.>

## Trạng thái

Proposed | Accepted | Superseded by ADR-NNNN | Deprecated
```

## Bốn mục, không nhiều hơn

Chuẩn Nygard. Thêm mục thứ năm là bắt đầu viết báo cáo, và báo cáo thì không ai đọc lại.
Không có thông tin cho một mục thì ghi thẳng **"không ghi lại"** — đừng bịa, đừng bỏ trống.
