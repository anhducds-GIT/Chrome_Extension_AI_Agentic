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

**VIẾT THẮNG `Accepted` KHI ĐỨC ĐÃ CHỐT** — không đi qua `Proposed` nữa, và
**hồ sơ sửa được** (gộp, phân nhóm, rút gọn). Cái không được là **đổi điều đã quyết mà
không có quyết định mới đứng sau**, và **bỏ hẳn một số hiệu khỏi sổ** — B12 chặn cái sau.
Bảng đủ bốn ca: [ADR-0026](adr/0000-ghi-nhan-quyet-dinh-kien-truc.md) ⑵.

> **Vế đã chết.** Đoạn này từng **bắt buộc** viết ở `Proposed` rồi đổi sang `Accepted` ở một
> lượt riêng, vì *"B12 chốt mốc bất biến ở commit ĐẦU TIÊN"*. **Chết 09/09** (ADR-0026 ⑵). Cửa hai
> bước đó nay chỉ tốn thêm một commit — tốn thật 09/09 ở lượt tách 10 ADR gói `duc-auto-gg-flow-video`.

**Mục `## Vế đã chết` phải đúng khuôn `- **NNNN [vế] — …**`** — văn xuôi thì
`rule-compile.mjs` **không thấy gì và báo SẠCH**. Chi tiết: `protocols/RULE-COMPILER.md` mục 5.

Phần dưới là nội dung cần chép:

```markdown
---
status: Accepted
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
