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

**VIẾT Ở `Proposed`, ĐỔI SANG `Accepted` Ở MỘT LƯỢT RIÊNG. Đây là luật, không phải gợi ý.**

B12 chốt mốc bất biến ở **commit ĐẦU TIÊN** mà `status` thành `Accepted`. Viết ADR với
`status: Accepted` ngay từ commit đầu thì **không còn lượt nào để sửa chữ** — mọi lượt sửa
phần thân sau đó làm B12 ĐỎ với MỌI phiên, và cách duy nhất đúng luật là viết thêm một ADR
để đính chính một chữ, tức đẻ ra rác để dọn rác.

Gặp thật 07/09 với ADR-0018: một chữ sai (`Codey` thay vì `Codex`) trong commit đầu, không
đổi quyết định nào, và **không sửa được nữa**. B12 đã miễn sẵn cả frontmatter lẫn mục
`## Trạng thái`, nên lượt đổi `Proposed → Accepted` là hợp luật — chỉ là trước đây không ai
khai rằng phải đi qua cửa đó.

> **Mặt trái, biết trước:** một ADR nằm mãi ở `Proposed` là quyết định CHƯA chốt mà người
> sau đọc như đã chốt. Chưa có máy nào canh việc đó — đếm bằng tay khi cần:
> `grep -rn "^status:" docs/adr/ workers/*/*/docs/adr/ | grep -i proposed`

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
