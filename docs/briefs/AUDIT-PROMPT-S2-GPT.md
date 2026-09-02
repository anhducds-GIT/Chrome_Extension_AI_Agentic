---
kind: brief
status: active
ttl_days: 30
---

# PROMPT AUDIT S2 — dán cho GPT (đọc repo qua GitHub connector)

> Đức chỉ cần copy **toàn bộ khối trong khung** dưới đây, dán vào chat GPT có GitHub connector.
> Không cần đính kèm gì thêm — GPT tự đọc repo.
> Vì sao là GPT chứ không phải Codex: xem mục "Ghi chú" cuối file.

---

```
Bạn là auditor độc lập. Chế độ NO WRITE — chỉ đọc, không tạo PR, không sửa file, không commit.

Repo: anhducds-GIT/Chrome_Extension_AI_Agentic
Commit cần audit: 829d644  (commit ngay trước nó: f2e45f9)
Neo đối chiếu: đọc trạng thái tại commit a909db7 (HEAD lúc giao việc).

BỐI CẢNH — đọc trước khi phán

`scripts/build-dashboard.mjs` là một BỘ SINH. Nó đọc repo rồi phát ra các artifact máy sinh.
Trước commit này nó phát ra một file (`DASHBOARD.md`). Sau commit này nó phát ra ba:
`DASHBOARD.md`, `llms.txt`, `repo-map.json`.

Một cổng kiểm (`scripts/session-check.mjs`, phép kiểm 7) chạy bộ sinh với cờ `--check-head`:
nó dựng lại toàn bộ artifact TỪ CÂY GIT HEAD rồi so với bản ĐÃ COMMIT. Lệch là cổng đỏ.
Hệ quả: bất kỳ chỗ nào không tất định, hoặc bất kỳ chỗ nào đọc trạng thái chưa commit từ
working tree, đều biến thành một cổng đỏ giáng xuống đầu phiên AI mở repo kế tiếp.

Đây là phiên S2 của `docs/studies/ROADMAP-CLEAN-AND-TEMPLATE-V1.md`. Hợp đồng của
`repo-map.json` được quy định ở mục C1 của `docs/studies/REPO-STRUCTURE-SPEC-V1.md` — hãy
đọc mục đó và đối chiếu, đừng tin mô tả trong commit message.

BA LỜI TUYÊN BỐ CẦN CÔNG KÍCH

Tác giả (Claude Code) khẳng định ba điều. Việc của bạn là tìm chỗ sai, không phải gật đầu.

1. "Trạng thái sống không bao giờ lọt vào artifact."
   `.agents/claims.json` ghi phiên AI nào đang giữ package nào; giá trị `owner` của nó đổi
   vài lần mỗi phiên. Tác giả nói artifact chỉ dùng TẬP KHOÁ của file đó (package nào có
   mục), không dùng giá trị `owner`.
   → Tìm bất kỳ đường nào để một giá trị `owner`, hoặc bất kỳ trạng thái theo-phiên nào,
     chui được vào `DASHBOARD.md`, `llms.txt`, hay `repo-map.json`.

2. "Artifact tất định."
   Chạy bộ sinh hai lần tại cùng một commit phải ra byte giống hệt, kể cả trên một bản
   clone mới khi ba file sinh chưa tồn tại trên đĩa.
   → Tìm đầu vào còn sót có thể đổi giữa hai lần chạy cùng commit: đồng hồ hệ thống, thứ tự
     đọc thư mục, locale, dấu phân cách đường dẫn, thứ tự khoá object, CRLF/LF, giá trị đọc
     từ working tree thay vì HEAD.

3. "Không lớp bảo vệ nào bị làm yếu."
   Commit này sửa ba thứ đã có trong `tests/build-dashboard-smoke.mjs`: một biểu thức
   `doesNotMatch` ở phép kiểm 11, hàm trợ giúp `checkHarness`, và fixture tích hợp Gate 7.
   → Tự phán độc lập xem có edit nào xoá mất phạm vi kiểm đã có. Mục đích gốc của phép kiểm
     11 là: "artifact chỉ chứa sự thật đã commit; trạng thái working tree không được lọt vào".

BÁC BỎ LỜI TUYÊN BỐ VỀ MUTATION

Tác giả chạy 10 mutation và khẳng định BẮT ĐƯỢC CẢ 10. Hai trong số đó (đọc `owner` từ
claims theo package bao ngoài; bỏ điều kiện `status === "active"` khỏi luật tài liệu quá
hạn) đã THOÁT ở vòng đầu, và tác giả sửa TEST chứ không sửa mutation. Hãy giả định tác giả
dừng lại quá sớm.

→ Đề xuất ÍT NHẤT HAI mutation vẫn sẽ THOÁT bộ test này: một thay đổi hành vi thật trong
  `build-dashboard.mjs` mà không assertion nào trong suite bắt được. Ghi rõ edit chính xác.
  Trong đó phải có ít nhất một mutation kiểu XOÁ CHỖ GỌI (gỡ một hàm kiểm ra khỏi đường
  chạy) chứ không phải đổi logic bên trong hàm — lớp mutation đó đã từng thoát suite của
  repo này.

KIỂM THÊM

- `compareRepoMap` xoá `generated_at` và `generated_commit` trước khi so. Bộ lọc đó rộng quá
  hay hẹp quá? Có regression thật nào nấp được sau nó không?
- `collectDocs` / `daysBetween`: luật "tài liệu quá hạn" lấy ngày commit cuối chạm vào file,
  so với ngày commit HEAD. Múi giờ, file thiếu, file chưa từng commit, `ttl_days` vắng mặt
  hoặc không phải số — hỏng ở đâu?
- `childPath`: commit này vá `createHeadDeps` ghép sai thành `"/docs"` khi đường dẫn tương
  đối là `""`. Vá đã đủ chưa, và `git ls-tree HEAD:` (đường dẫn rỗng) có thật sự hợp lệ không?
- `topLevelOwnership` phán "đã khai" bằng `key === name || key.startsWith(name + "/")`.
  Va chạm tiền tố? Thư mục tên `work` với khoá claim `workers/x`?
- `firstSentence` cắt ở 160 ký tự. Nó có thể phát ra một link markdown gãy hoặc một dấu
  backtick lẻ vào ô bảng không?
- Giá trị chảy vào ô bảng markdown `| ... |`. Mọi đường dẫn đã được escape chưa?
- `repo-map.json` có đúng hợp đồng ở mục C1 của REPO-STRUCTURE-SPEC-V1 không? Khoá nào thừa,
  khoá nào thiếu, khoá nào sai kiểu?

CÁCH TRẢ LỜI

Cụ thể. Mỗi phát hiện phải trích nguyên văn dòng code và nói rõ đường dẫn + số dòng. Thứ nào
không kiểm chứng được từ những gì bạn đọc được thì NÓI THẲNG là không kiểm chứng được —
đoán mò có rào đón còn tệ hơn câu "không kiểm chứng được".

Gắn nhãn cho mỗi khẳng định: [ĐO] tự chạy/tự đếm được · [ĐỌC] đọc thẳng code · [DÒ] tìm theo
tên (loại này phải tự đánh dấu là cần kiểm lại).

Cấu trúc:
1. PHÁT HIỆN — đánh số, nặng trước. Mỗi mục: mức độ (CAO/TRUNG BÌNH/THẤP), dòng trích nguyên
   văn, vì sao sai, và một đầu vào hoặc chuỗi thao tác cụ thể làm nó hỏng.
2. MUTATION THOÁT ĐƯỢC — edit chính xác bạn đề xuất, và vì sao suite bỏ lọt.
3. PHÁN TỪNG LỜI TUYÊN BỐ — đứng vững hay bị bác, kèm lý do.
4. TỔNG — dòng CUỐI CÙNG trong câu trả lời chỉ được chứa đúng một trong ba từ: OK /
   CONDITIONAL / REJECTED. Dùng CONDITIONAL khi code đúng nhưng một lớp bảo vệ chưa được test
   ghim — trường hợp đó KHÔNG phải là hỏng, đánh nó thành hỏng là vô ích.
```

---

## Ghi chú cho Đức (không dán vào GPT)

**Vì sao cần GPT audit dù Codex cũng đang chạy.** Luật vàng 4 đòi kiểm chứng độc lập. Ở phiên
S2, Claude Code vừa viết code vừa viết test — tự chấm bài mình thì không tính. Hai auditor độc
lập nhau thì phát hiện của cái này soi được điểm mù của cái kia.

**Điểm mạnh riêng của GPT ở việc này:** nó đọc repo qua GitHub connector nên thấy được **toàn
bộ ngữ cảnh** — `REPO-STRUCTURE-SPEC-V1.md`, lịch sử commit, các file khác — trong khi Codex
chỉ thấy đúng những file được chép vào thư mục audit. Câu hỏi "repo-map.json có đúng hợp đồng
mục C1 không" chỉ GPT trả lời được đầy đủ.

**Kỹ thuật đã dùng trong prompt, đừng bỏ khi sửa lại:**
- Nêu thẳng lời tuyên bố rồi bảo nó **bác bỏ**. Kinh nghiệm repo này: auditor sắc hơn hẳn khi
  phản biện một khẳng định cụ thể so với khi lùng sục tự do.
- Nói trước rằng **hai mutation đã thoát** và tác giả có thể đã dừng sớm — mở đường cho nó
  không cần lịch sự.
- Bắt buộc có **mutation kiểu xoá chỗ gọi**. Repo này từng có 8 mutation xanh hết vì tất cả
  đều đổi ruột một hàm mà test gọi thẳng; xoá đúng dòng NỐI hàm đó vào đường chạy thì cả suite
  vẫn xanh.
- Cho sẵn lựa chọn **CONDITIONAL**. Không có nó, auditor trả FAIL cho những lớp phòng thủ đúng
  nhưng chưa được ghim, và Đức đọc thành "hỏng".
