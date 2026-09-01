# SELF-IMPROVE — Protocol tự cải thiện delegation (v0.1)

Nguyên tắc lõi: **thời điểm HỌC và thời điểm SỬA LUẬT là hai đồng hồ khác nhau.**
Trí nhớ của hệ = PLAYBOOK hiện hành + git history. Không kho ghi chú nào sống quá một kỳ review.

## 1. Đồng hồ 1 — Ghi ngay (≤30 giây)

Gặp bài học ở BẤT KỲ phiên nào (delegation hay việc hàng ngày) → ghi 1 dòng vào `LESSON-INBOX.md`:

`<ngày> · <nguồn: run-id hoặc "phiên thường"> · <quan sát được, không phải cảm giác> · <class> · <gợi ý sửa, tuỳ chọn>`

Ghi xong quay lại việc ngay. KHÔNG sửa PLAYBOOK giữa kỳ.
Trần inbox: 20 dòng. Đầy = chuông báo review sớm, không phải phép xoá bừa.

## 2. Ngoại lệ duy nhất được sửa ngay

Chỉ **BRIEF-class trong chính task đang chạy**: đề bài tồi → sửa TASK, chạy delta round.
Đó là sửa task hiện tại, không phải sửa luật chung.

## 3. Failure tree — phân loại TRƯỚC khi sửa

| failure_class | Nghĩa | Sửa ở đâu |
|---|---|---|
| BRIEF | GPT hiểu sai vì đề bài tồi | Sửa TASK, delta round (ngay) |
| CONTRACT | GPT không tuân schema/trần | Đề xuất diff PLAYBOOK (kỳ review) |
| ROUTING | Chọn sai topology/kênh | Đề xuất diff PLAYBOOK (kỳ review) |
| CHANNEL | Kênh hỏng: capture, parse, Sheet | Việc kỹ thuật → BACKLOG.md package, đi cổng repo bình thường |
| PLATFORM | Lỗi trang thật/extension | Bảng lỗi AI-OPERATOR-GUIDE.md (cơ chế sẵn có) |

Self-improve chỉ tự trị ở tầng prompt/routing. Sửa code, đổi luật an toàn → cổng cũ của repo.

## 4. Đồng hồ 2 — Kỳ review (gắn weekly review của Đức; MVP: retro sớm sau Job C)

1. CC đọc inbox + toàn bộ RUN-LOG kỳ đó.
2. Dòng lặp ≥2 lần (hoặc 1 lần nghiêm trọng) → 0–2 **diff đề xuất** trên PLAYBOOK.
   Mỗi diff kèm: dòng inbox nào là bằng chứng · số đo nào kỳ vọng tốt lên.
3. Dòng không thuộc PLAYBOOK → định tuyến: PLATFORM → AI-OPERATOR-GUIDE · CHANNEL → BACKLOG · luật an toàn → hỏi Đức cổng cũ.
4. Đức duyệt diff (~1 phút) → merge → **inbox xoá về 0**.

PLAYBOOK trần 250 dòng: muốn thêm luật khi đầy → phải gộp/bỏ luật khác trong cùng diff.
So trend giữa các `playbook_version`: compliance rate · tỉ lệ nén · số round trung bình.

## 5. RUN-LOG.json — mỗi run bắt buộc, máy đọc

```json
{"id":"", "playbook_version":"0.1", "topology":"", "channel":"",
 "rounds":1, "contract_ok":true, "violations":[],
 "chars_returned":0, "chars_ingested":0,
 "value_criteria_met":[], "failure_class":null, "duc_verdict":""}
```

`duc_verdict` là trường DUY NHẤT Đức điền (1 câu). Chi phí của Đức mỗi run = bấm Run + 1 câu.

## 6. Vùng đóng băng

Xem PLAYBOOK.md mục 8. Self-improve tối ưu BÊN TRONG khung, không ăn mòn khung.
