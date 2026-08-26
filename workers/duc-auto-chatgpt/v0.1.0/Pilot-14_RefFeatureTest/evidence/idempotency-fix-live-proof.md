# Bằng chứng live: bản vá `idempotent` của `references.add`

> Đo 2026-08-26 sau khi Đức reload extension. Phiên `claude-chatgpt-3`.
> **Tốn 0 lượt quota** — không có run nào, chỉ mutation.

## Vá cái gì

Audit Antigravity vòng 1 (MEDIUM): `references.add` khai `idempotent: false`.
Lý lẽ ban đầu của tôi — "gọi lại cùng tên là *thay thế*, không phải no-op" — **đặt sai tầng**.
Cờ đó gate **replay ở tầng vận chuyển** trong `createDispatcher`: dedupe theo
`client_id`+`request_id`, và phát hiện `REQUEST_ID_REUSED`. Không liên quan ngữ nghĩa nghiệp vụ.

Sửa: `idempotent: true`.

## Xác minh reload đã vào

`system.capabilities` phục vụ **22 method**, và `references.add` khai `"idempotent": true`.

## Năm phép đo, năm khớp dự đoán

Bootstrap: `jobs.add` 1 job (không ảnh) → checkpoint **v1**.

| # | Gọi | Dự đoán | Đo được | |
|---|---|---|---|---|
| 1 | `proof-001`, payload A (REF-A) | nạp mới, version tăng | `added: [REF-A]`, `replaced: []`, **v2**, count 1 | ĐÚNG |
| 2 | **`proof-001`**, payload A (y hệt) | trả cache, **version KHÔNG tăng** | response y hệt, **v2**, count 1 | ĐÚNG |
| 3 | **`proof-001`**, payload B (khác) | `REQUEST_ID_REUSED` | `REQUEST_ID_REUSED` — "The client_id and request_id were already used with a different payload." | ĐÚNG |
| 4 | `proof-002`, payload B | nạp thật, version tăng | `added: [REF-B]`, **v3**, count 2 | ĐÚNG |
| 5 | `proof-003`, payload A lại | **thay thế** theo tên, count không đổi | `added: []`, `replaced: [REF-A]`, **v4**, count **2** | ĐÚNG |

## Vì sao đây là bằng chứng, không phải trùng hợp

Hành vi **trước** và **sau** bản vá phân biệt được rõ ràng:

- **Gọi 2 trước khi vá:** chạy lại handler → trả `replaced: [REF-A]` (sai, ảnh chỉ mới được thêm),
  đẩy checkpoint lên **v3**, và ghi thêm một event `BRIDGE_REFERENCES_ADDED` vào audit.
  **Sau khi vá:** version đứng ở **v2**, response y hệt lần đầu.
- **Gọi 3 trước khi vá:** `idempotent: false` **tắt hẳn** nhánh kiểm tra, nên không có lỗi nào —
  payload B lặng lẽ được nạp dưới cùng một `request_id`.
  **Sau khi vá:** `REQUEST_ID_REUSED`.

## Và bản vá không làm chết hành vi nghiệp vụ

Gọi 4 và 5 chứng minh lo ngại "để `true` thì không thay ảnh được nữa" là **không có cơ sở** —
đúng như lập luận khi sửa: một lần nạp có chủ đích mang `request_id` **mới**, nên replay store
không bao giờ khớp, và `applyBridgeReferencesAdd` vẫn thay thế theo tên như thiết kế.

## Chưa đo được, không giả vờ là đã đo

**Phát hiện 2** (snapshot `state.files`) **chưa xác minh live.** Muốn dựng phải làm persistence
hỏng đúng lúc đang ghi checkpoint. Nó có test static ghim (`bridge-references-add-static.mjs`) và
audit vòng 2 đã tự kiểm lập luận copy nông, nhưng **chưa từng chạy thật** — đúng luật của package
này thì nó vẫn là *lời tuyên bố*, không phải *bằng chứng*.
