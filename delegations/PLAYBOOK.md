# PLAYBOOK — Delegation CC → ChatGPT Web (v0.1)

Phiên bản: 0.1 · Trần file: 250 dòng · Mọi thay đổi = diff có bằng chứng, Đức duyệt (xem SELF-IMPROVE.md)

## 1. Vòng delegation chuẩn

1. CC chọn topology theo mục 2, viết `delegations/<id>/TASK.md` (kèm 1 dòng lý do chọn).
2. **Gate 0:** Đức duyệt TASK.md. Chưa duyệt = không dispatch.
3. CC dispatch qua bridge-cli, `task_type=text_reasoning`. Đức bấm Run (tab phải ở sẵn MỘT hội thoại, không phải trang chủ — xem AI-OPERATOR-GUIDE của package ChatGPT).
4. Extension ghi Result XLSX (verbatim + SHA-256, exact-once).
5. CC parse XLSX → kiểm output contract → sinh `RESULT-DIGEST.md` (4 mục delta, ≤3.000 ký tự) → ghi `RUN-LOG.json`.
6. Đức điền `duc_verdict` (1 câu).

## 2. 7 topology — chọn theo HÌNH DẠNG của unknown, không theo tên task

| Topology | Unknown có hình gì | Kênh mặc định |
|---|---|---|
| EXPAND | Chưa biết có những khả năng nào | MD digest |
| PARALLEL | Nhiều phương án khả thi, cần so | MD digest |
| DECOMPOSE | Hệ quá lớn, cần chia lớp | MD digest |
| HYPOTHESIS→PROOF | Có lỗi/hiện tượng, chưa rõ nguyên nhân | MD digest |
| COVERAGE | Không biết thiếu chỗ nào, cần quét đủ | JSON-in-XLSX / Sheet |
| ITERATIVE CRITIQUE | Artifact có rồi, chưa đủ tốt | MD digest |
| VERIFY | Claim có rồi, chưa đáng tin — tái kiểm độc lập | MD digest |

Luật kèm:
- Một job = một phase = một topology. Chuyển phase là việc CC lập kế hoạch, không nhét nhiều phase vào một delegation.
- ITERATIVE CRITIQUE phải lặp TRONG MỘT TURN của GPT ("draft, tự phê, nộp bản sửa — trong một câu trả lời"). Round-trip thật vẫn theo trần vòng.
- Debug/lỗi: dùng HYPOTHESIS→PROOF, cấm dùng EXPAND (đốt usage).

## 3. Kênh trả kết quả

| Kênh | Dùng khi | Luật |
|---|---|---|
| XLSX → MD digest | Narrative: kết luận, audit, thiết kế, prompt | Digest là VAN, không phải kênh transport |
| JSON-in-XLSX | Bảng/danh sách dữ kiện có cấu trúc | GPT trả MỘT khối JSON thuần, CC parse máy móc |
| Google Sheet | Bảng lớn nhiều dòng, hoặc Đức muốn tự mở xem | 1 job = 1 spreadsheet mới `delegation-<id>` · CC đọc theo range cụ thể · digest xong → archive |
| GPT ghi repo | CHỈ `delegations/inbox/` | Dữ liệu thô chưa tin, CC kiểm trước khi dùng |

KHÔNG có kênh "shared mutable state". SSOT = repo + XLSX ledger.

## 4. Output contract — bắt buộc trong mọi brief

- GPT chỉ trả lời theo heading định sẵn trong prompt.
- Mỗi mục có trần từ. Cấm mở bài, kết bài, disclaimer.
- Dòng cuối bắt buộc: `END_OF_RESPONSE`.
- Thiếu marker / sai schema / vượt trần → CC REJECT round, không digest, ghi violations vào RUN-LOG.

## 5. Trần vòng & luật rác

- Mặc định 1 vòng. Vòng 2 CHỈ khi thiếu đúng một mục contract, dùng delta-brief (chỉ hỏi phần thiếu). Không có vòng 3 — vòng 3 là việc của Đức.
- Mỗi vòng phải kết thúc bằng artifact + quyết định. Không quyết định = noise, không feed tiếp.
- Kênh rỗng sau digest: Sheet archive, inbox dọn. Repo chỉ giữ TASK + DIGEST + RUN-LOG.

## 6. Value gate — turn đáng tồn tại nếu đạt ≥1 tiêu chí

giảm unknown · loại bỏ một phương án · tạo evidence mới · tăng coverage · phát hiện contradiction · artifact tốt lên đo được · tạo decision hành động được.
CC ghi vào RUN-LOG turn đạt tiêu chí NÀO. Không đạt = noise.

## 7. Digest — 4 mục delta, ≤3.000 ký tự

`NEW FACTS · NEW DECISIONS · EVIDENCE POINTERS · OPEN QUESTIONS`
Nguyên văn GPT không lưu file riêng — đã nằm trong Result XLSX ledger, digest chỉ trỏ tới.

## 8. VÙNG ĐÓNG BĂNG — CC không được đề xuất nới (chỉ Đức chủ động mở)

1. Gate 0 trước mọi dispatch
2. Đức bấm Run (policy bridge-core giữ nguyên)
3. Trần vòng 1+1 delta
4. Trần digest 3.000 ký tự
5. Kênh rỗng sau digest
6. Sheet không làm shared state
7. GPT chỉ ghi `delegations/inbox/`
8. Không permission mới · output GPT là báo cáo cần kiểm chứng, không phải bằng chứng (luật 4 AGENTS.md)
