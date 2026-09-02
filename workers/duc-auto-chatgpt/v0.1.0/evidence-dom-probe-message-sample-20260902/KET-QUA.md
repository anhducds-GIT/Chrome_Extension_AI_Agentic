# Nghiệm thu live — `dom_probe` thôi mù chữ trên trang

**Ngày:** 2026-09-02 · **Lỗi:** #5 trong `AI-OPERATOR-GUIDE.md` · **Backlog:** B-32

Thư mục này là **bằng chứng, không sửa**. Ba file JSON là payload thô của
`diagnostics.dom_probe`, chép nguyên không cắt.

## Trước khi vá — hai profile, hai hội thoại khác nhau

| | `01-` `anhducds_multi work flow` | `02-` `kaito` |
|---|---|---|
| `articleSample` | `[]` | `[]` |
| `assistantCount` | 3 | 1 |
| `data-turn` | `assistant x3, user x2` | `user x1, assistant x1` |
| `truncated` | `false` | `false` |
| payload | 7.780 byte | 7.404 byte |

Nắp payload là 65.536 byte, nên **nhánh bóp payload không hề chạy** — trường rỗng
không phải vì bị cắt cho vừa. Lượt hội thoại **có** trên trang, chỉ là selector
`article` không còn khớp gì. Probe mù một nửa mà tự báo khoẻ.

## Sau khi vá — cùng profile, sau khi Đức reload extension

File `03-`. `served_by` xác nhận đúng nhãn `anhducds_multi work flow`.

```
messageSampleDiag: {
  status: "OK",
  selector: "[data-turn], [data-message-author-role], [data-message-id], [data-turn-id], article",
  matched: 10, sampled: 4, with_text: 4
}
```

`messageSample[].txtHead` nay có **chữ thật của trang**, cả tiếng Việt có dấu:
`"K2 bản 2 — tôi nhận cả 2 correction của bạn..."`. Trường `articleSample` đã
biến mất khỏi payload (tên cũ nói dối về selector của chính nó).

## Một điều cần biết khi đọc `matched`

`matched: 10` cho một trang có **5 lượt**, không phải 10 lượt. Mỗi lượt trên
ChatGPT có **hai** tầng cùng khớp: khung ngoài mang `data-turn` +
`data-testid="conversation-turn-N"`, và khối trong mang `data-message-author-role`
+ `data-message-id`. Cả hai đều là container hợp lệ nên đều được đếm.

Hệ quả thực tế: 4 mẫu chữ phủ **2 lượt**, không phải 4 lượt.

Đây là **cố ý giữ nguyên, không phải lỗi**: khi một tầng marker chết, thứ cần
thấy chính là tầng nào còn sống — và mẫu trên hiển thị rõ hai tầng cạnh nhau
trong `attrs`. Muốn đếm số lượt thì đọc `assistantCount` và
`attributeValues["data-turn"]`, đừng đọc `matched`.

## Cách chạy lại (0 credit)

```
node bridge-cli.mjs dom-probe --pairing <đường-dẫn-pairing> --target "<nhãn profile>"
```

Đỏ cờ nếu thấy `status: "NO_CONTAINER_MATCHED"` — ChatGPT đã đổi marker lần nữa.
Khi đó đọc `attributeValues` trong **cùng** payload rồi dựng lại selector,
**đừng đoán** (luật vàng 1).
