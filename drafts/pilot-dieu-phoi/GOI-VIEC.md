# GÓI VIỆC — nghiệm thu artifact máy sinh

> Đây là **toàn bộ** bối cảnh bạn cần. Đừng đọc thêm file nào để "hiểu dự án".
> Bạn đang chạy một pilot đo **số lượt gọi model**. Mỗi lượt thừa là một lượt hỏng bài đo.

## Luật của phiên này

1. **Một bước = một lệnh.** Đừng giải thích. Đừng tóm tắt lại việc mình sắp làm.
2. **Không đọc nội dung artifact.** Chỉ đọc dòng phán quyết mà lệnh in ra.
3. **Không đọc file để hiểu bối cảnh.** Gói việc này là bối cảnh.
4. **Gói việc sai thì DỪNG và báo.** Không tự vá — vá là quay lại suy luận, và bài đo hỏng.

## Các bước

**⓪ Ghi mốc giờ** (dán vào báo cáo cuối):

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
```

**① Chạy nghiệm thu:**

```bash
node scripts/nghiem-thu-artifact.mjs
```

Đọc **dòng cuối**, và chỉ dòng cuối:

| dòng cuối bắt đầu bằng | nghĩa | làm gì |
|---|---|---|
| `DAT: … artifact đã đúng` | xong, không có gì để commit | sang bước ③ |
| `DAT (bộ sinh tất định) … đã CŨ` | artifact vừa được sinh lại | sang bước ② |
| `KHONG DAT: … không tất định` | **lỗi thật trong bộ sinh** | DỪNG, báo Đức, không commit |
| `KHONG DAT: … bộ sinh hỏng` | một bộ sinh chạy lỗi | DỪNG, báo Đức, không commit |

**② Commit đúng những tệp mà dòng cuối liệt kê** (không thêm tệp nào khác):

```bash
node scripts/claim.mjs --soat --as <tên-phiên>
```

Commit với thông điệp `chore(bang): sinh lai theo HEAD` và dòng cuối `Lane: <tên-phiên>`, rồi:

```bash
node scripts/safe-push.mjs --as <tên-phiên>
```

Push bị từ chối vì việc của lane khác thì **DỪNG và báo**, đừng tự thêm cờ.

**③ Đo và báo:**

```bash
node scripts/do-usage-phien.mjs --tu <mốc-giờ-ở-bước-⓪>
```

Báo đúng bốn dòng: `soLuot` · `docMoiLuot` · phán quyết ở bước ① · có commit hay không.

## Ngưỡng

| | |
|---|---|
| **ĐẠT** | ≤ 8 lượt gọi model, và phán quyết đúng khi kiểm tay |
| **KHÔNG ĐẠT** | > 15 lượt, **hoặc** phải đọc nội dung artifact mới quyết được |
| **vùng giữa** | 9–15: ghi rõ lượt nào thừa và vì sao |

**Rẻ mà phán quyết sai thì vẫn là KHÔNG ĐẠT.**

## Ghi kết quả

Vào `drafts/pilot-dieu-phoi/KET-QUA.md`, một lượt chạy một mục: ngày · mô hình · số lượt ·
token đọc mỗi lượt · phán quyết · lượt nào thừa.
