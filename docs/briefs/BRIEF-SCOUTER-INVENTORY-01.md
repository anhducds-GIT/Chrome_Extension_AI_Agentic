---
kind: brief
status: active
ttl_days: 60
---

# BRIEF `SCOUTER-INVENTORY-01` — Kiểm kê năng lực trước khi xây Scouter

Quyết định gốc: [ADR-0009](../adr/0009-scouter-thay-observer-cua-tuong-tac.md). **Đọc ADR trước.**
Mục ⑺ của nó chốt: việc đầu tiên **không phải viết code**, mà là bảng kiểm kê này.

**Không viết một dòng code nào trong lượt này. Không đụng `manifest.json`.** Ra khỏi lượt này
là **một file tài liệu**, không phải một bản vá.

## 1. Vì sao có việc này

Đức cần cân hai thứ trên **một danh sách đếm được**, không phải trên ước lượng của AI:
Scouter v1 đáng làm tới đâu, so với 46 mục nợ đang mở.

Và Đức nêu một điều mà bảng phải trả lời được:

> *"Các extension worker mà ta đã build chỉ mới sử dụng một phần nhỏ của năng lực Extension."*

Nếu đúng, thì chép nguyên năng lực của ba worker sang seed là **chép cả cái trần thấp của
chúng**. Nên bảng phải có **hai trục**, không phải một.

## 2. Hai trục bắt buộc

### Trục A — ba worker đang thật sự có gì

Ba worker: `duc-auto-chatgpt` · `duc-auto-gemini` · `duc-auto-gg-flow-video`.

Mỗi năng lực một dòng: **tên · nằm ở file nào · gói nào có gói nào không · bóc ra dùng lại
được sạch hay dính chặt với nhà cung cấp.**

Cột cuối là cột đắt nhất và cũng là cột dễ nói bừa nhất. **Không đoán độ dính** — mở file ra
đọc, và ghi ra bằng chứng đã đọc gì.

### Trục B — Chrome cho phép gì mà ta CHƯA dùng

Đây là trục Đức yêu cầu, và nó là **nửa quan trọng hơn** của việc này.

Liệt kê năng lực nền tảng của Chrome Extension MV3 mà một tác nhân duyệt web có thể dùng, rồi
đánh dấu cái nào repo này **chưa hề chạm tới**. Bao gồm — nhưng **đừng dừng ở** — các miền của
giao thức debug (CDP), và các API extension quanh: tab và cửa sổ · chèn script · mạng · cookie ·
lưu trữ · tải file · bảng bên · tài liệu ẩn · hẹn giờ · phím tắt · thông báo · ghi màn hình.

Danh sách trên là **điểm bắt đầu, không phải điểm đến**. Tự tra tài liệu Chrome hiện hành và
bổ sung. Một năng lực bị bỏ sót ở bước này là một năng lực Scouter sẽ không bao giờ có.

**Mỗi dòng trục B phải trả lời: nó giúp Scouter làm được việc gì mà hôm nay không làm được?**
Không trả lời được thì đánh dấu "không cần" — và đó là một kết quả tốt, không phải thất bại.

## 3. Kết luận mỗi dòng phải rơi vào đúng một ô

| Ô | Nghĩa |
|---|---|
| `SEED v0.1` | phải có ngay ở bản đầu |
| `SEED v1` | vào seed, nhưng để sau |
| `ADAPTER` | thuộc hiểu biết riêng của một trang, không vào seed |
| `KHÔNG CẦN` | kèm một câu vì sao |

Ranh giới seed/adapter đã chốt ở ADR-0009 mục ⑵ và ⑶: **năng lực** vào seed, **hiểu biết về
một trang cụ thể** vào adapter. Gặp dòng khó xử thì ghi vào mục "chưa phân loại được" kèm lý
do — đừng nhét bừa vào một ô cho đủ bảng.

## 4. Cách làm — ba luật, đã trả giá mới có

1. **Ghi rõ mỗi dòng được xác lập bằng cách nào:** `[ĐO]` máy đếm · `[ĐỌC]` mở code ra đọc ·
   `[DÒ]` tìm theo tên hàm. Ba loại tin được khác nhau. Dò theo tên đã cho kết luận sai bốn
   lần trong một ngày ở repo này. **Dòng `[DÒ]` phải ghi rõ là chưa kiểm chứng.**
2. **Đếm một thứ mà ra 0 thì coi như công cụ đo hỏng**, cho tới khi chứng minh ngược lại. Repo
   này đã bị cắn nhiều lần bởi phép đo khớp 0 chỗ mà báo cáo như thể đã kiểm xong.
3. **Không viết con số vào bảng nếu không tự chạy ra nó.** Số chép lại từ tài liệu cũ trong
   repo đã sai 4/4 lần khi kiểm lại.

## 5. Ra cái gì

Một file: `docs/studies/SCOUTER-CAPABILITY-INVENTORY-V1.md`, theo bản mẫu
`docs/_TEMPLATE-study.md`.

Trong đó, phần **Đức đọc** phải nằm ở đầu và gói gọn:

- **Mười năng lực quan trọng nhất chưa có**, xếp theo giá trị, mỗi cái một câu tiếng Việt
  không thuật ngữ.
- **Một câu trả lời thẳng** cho câu Đức nêu: ba worker đang dùng bao nhiêu phần năng lực có
  thể dùng — kèm cách đếm, vì con số này vô nghĩa nếu không nói đếm kiểu gì.

Phần sau mới là bảng chi tiết cho AI đọc.

## 6. Khoá và đóng phiên

Nhận `_docs`. Không nhận khoá nào khác — lượt này không sửa code, nếu bạn thấy mình cần
`_code` thì bạn đang làm sai phạm vi.

```
node scripts/claim.mjs --take _docs --as <tên-phiên> --task "kiem ke nang luc Scouter"
```

Commit phải có dòng cuối `Lane: <tên-phiên>`. Dùng `git commit -o <đường-dẫn>`, không dùng
`git commit` trần — nhiều lane chung một working tree. Chạy
`node scripts/session-check.mjs --as <tên-phiên>` phải XANH TOÀN BỘ. Đẩy bằng
`node scripts/safe-push.mjs --as <tên-phiên>`. **Trả khoá SAU khi đẩy.** Ghi một dòng Log vào
`HANDOFF.md` gốc (chỉ thêm ở cuối).

## 7. Cấm

- Cấm viết code, cấm sửa `manifest.json`, cấm đổi tên thư mục.
- Cấm đề xuất kiến trúc Scouter — việc này là **đếm**, không phải **thiết kế**.
- Cấm chạy live trên trang thật.
- Cấm kết luận "đủ rồi" ở trục B mà không tra tài liệu Chrome hiện hành.
