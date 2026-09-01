---
kind: brief
status: active
created: 2026-08-31
ttl_days: 60
---

# GỬI CHO REPO KHÁC — MỘT KHỐI DÁN DUY NHẤT

Copy toàn bộ khối dưới đây. Dán vào chat AI của repo cần review. Không cần đính kèm gì thêm.

---

```
Bạn đang làm việc trong repo này. Dưới đây là một chuẩn cấu trúc repo đang ở trạng thái RFC
(chưa đóng băng). Tôi đang review chuẩn này ở nhiều repo cùng lúc trước khi chốt.

Nhiệm vụ của bạn gồm HAI PHẦN, làm cả hai trong lượt này.

════════════════════════════════════════════════════════════════
PHẦN I — CHUẨN ĐỀ XUẤT (đọc trước khi làm gì)
════════════════════════════════════════════════════════════════

BÀI TOÁN: một phiên AI mới vào repo phải hiểu ngay chuyện gì đang xảy ra, không quét toàn
bộ cây thư mục, không hỏi chủ repo câu nào.

NGUYÊN TẮC GỐC: mỗi câu AI phải hỏi con người = một trường dữ liệu còn thiếu trong repo.
Không sửa bằng cách dặn AI đọc kỹ hơn. Sửa bằng cách bổ sung trường dữ liệu và bắt cổng
kiểm chặn khi trường đó trống.

--- BỐN TẦNG: phân theo VÒNG ĐỜI, không phân theo chủ đề ---
LAW       luật, vai, kiến trúc, hướng dẫn   | người ghi | đổi vài tháng | xoá được qua PR
STATE     trạng thái, việc mở, bàn giao      | người ghi | đổi mỗi phiên | xoá được
GENERATED số đo, bản đồ, bảng tổng           | MÁY ghi   | đổi mỗi build | máy ghi đè
EVIDENCE  bằng chứng, log, quyết định đã chốt| bất biến  | chỉ thêm      | KHÔNG BAO GIỜ xoá
Luật con: không trộn hai tầng vào một file; không để hai file cùng tầng nói cùng một điều.
Nguyên tắc số một: thứ gì máy đếm được thì máy đếm. Con số/trạng thái/ngày không gõ tay.

--- MƯỜI ĐIỂM CORE (bắt buộc mọi repo) ---

C1 CỔNG VÀO MÁY SINH — hai file, cùng một lần sinh, cùng nguồn dữ liệu.
   (a) llms.txt ở gốc repo, theo định dạng llmstxt.org: một "#" tiêu
   đề, một ">" blockquote tóm tắt, các mục "##" chứa danh sách link, mỗi link kèm MỘT DÒNG
   mô tả. Máy sinh, không gõ tay, dưới 50 dòng. Lý do chọn định dạng này: công cụ AI phổ
   biến tự tìm /llms.txt, chủ repo không phải dán đường dẫn nữa.
   (b) repo-map.json — HỢP ĐỒNG MÁY ĐỌC, là giao diện cross-repo: một hệ điều phối cấp cao
   chỉ đọc file này, không đọc gì khác. Bắt buộc có: schema_version (số nguyên — thiếu nó thì
   mọi hệ đọc file này sẽ vỡ khi một repo nâng cấp trước) · generated_at · generated_commit ·
   profile · entry_point · units[] (id/path/lifecycle/owner/next_step/last_verified/
   last_verified_commit/superseded_by) · active_work (id/unit/title/claim) ·
   health (units_without_status / dead_links / undeclared_dirs / draft_debt).

C2 HIẾN PHÁP NGẮN — AGENTS.md (chuẩn mở, cascade gốc repo → thư mục con, file gần nhất
   thắng). DƯỚI 200 DÒNG: file này nạp vào MỌI phiên, mỗi dòng thừa cạnh tranh sự chú ý.
   File riêng từng hãng (CLAUDE.md, .cursor/rules, copilot-instructions.md) chỉ là stub
   mỏng trỏ về AGENTS.md, không phải bản thứ hai. Luật nào cần cưỡng chế thì đưa vào cổng
   kiểm, đừng viết dài hơn trong tài liệu.

C3 BẢNG TRẠNG THÁI MÁY SINH — bốn khối bắt buộc:
   A "Bắt đầu từ đâu" đặt trên cùng: việc ưu tiên #1 (mã · đơn vị · link · chủ hiện tại) ·
     phiên gần nhất làm gì (ngày · commit · link bàn giao) · link hiến pháp.
   B Registry: có gì trong repo, cái nào đang sống.
   C Việc đang mở đã xếp ưu tiên, gom từ các file việc-đang-mở.
   D "Sức khoẻ điều hướng": đếm nợ — đơn vị chưa khai trạng thái · link chết trong file
     cổng · thư mục chưa khai chủ · tài liệu quá hạn.
   Khối D làm nợ điều hướng NHÌN THẤY ĐƯỢC. Không nhìn thấy thì không ai trả.

C4 ĐỘ SÂU ĐIỀU HƯỚNG TỐI ĐA 3 — llms.txt → bảng trạng thái → file trạng thái → chi tiết.
   Phải đọc tới file thứ tư mới hiểu = thiết kế hỏng.

C5 SCHEMA TRẠNG THÁI CÓ TRƯỜNG BẮT BUỘC — mỗi đơn vị công việc (package/module/service)
   có một file trạng thái khai tối thiểu: id · name · lifecycle · owner · next_step ·
   superseded_by (khi lifecycle=superseded) · last_verified + last_verified_commit ·
   depends_on. Giá trị lifecycle chỉ nhận: active | building | paused | superseded |
   archived. KHÔNG có giá trị "unclassified" — đó chính là chỗ thông tin rò rỉ ra ngoài
   thành câu hỏi cho con người.

C6 QUYẾT ĐỊNH BẤT BIẾN — docs/adr/, chuẩn ADR: một file một quyết định, đánh số tăng dần,
   bốn mục Bối cảnh · Quyết định · Hệ quả · Trạng thái. Đã Accepted thì KHÔNG BAO GIỜ sửa,
   KHÔNG BAO GIỜ xoá. Đổi ý = viết ADR mới, cái cũ chuyển "Superseded by ADR-NNNN", hai bên
   trỏ nhau. Lý do không dùng một file decisions.md gộp: file gộp thì sẽ bị sửa đè, sáu
   tháng sau không ai biết ngày đó quyết gì và vì sao.

C7 VÒNG ĐỜI TÀI LIỆU — mọi file trong docs/ mở đầu bằng ĐÚNG BA TRƯỜNG gõ tay:
   kind (study|brief|spec|guide) · status (active|done|superseded) ·
   ttl_days (brief 30 · study 180 · guide 365).
   KHÔNG thêm id (đường dẫn file đã là id duy nhất), created / last_reviewed (lịch sử phiên
   bản đã biết), owner (suy từ commit), task_id (chỉ thêm khi hệ quản lý task đã tồn tại —
   trỏ tới thứ chưa có là tạo nợ). Trường nào máy suy được thì không gõ tay.
   Dùng ttl_days TƯƠNG ĐỐI thay vì ngày hết hạn tuyệt đối — tương đối không mục khi copy file.
   DRAFT LÀ NỢ, KHÔNG PHẢI RÁC: mỗi file nháp tạo một nghĩa vụ phải xử lý về sau.
   draft_debt = số file status:active đã quá ttl_days. Một con số, máy đếm, hiện ở Khối D.
   KHÔNG cần sổ đăng ký nháp thủ công — scanner đọc frontmatter là đủ.

C8 CỔNG KIỂM + SCHEMA MÁY ĐỌC — một file cấu hình JSON là nguồn sự thật duy nhất; cả tài
   liệu lẫn script đều đọc từ đó. Phép kiểm tối thiểu:
   G1 đơn vị công việc thiếu file trạng thái .............. ĐỎ
   G2 lifecycle=superseded mà thiếu superseded_by ......... ĐỎ
   G3 thư mục top-level chưa khai chủ ..................... ĐỎ
   G4 link trong file cổng trỏ tới file không tồn tại ..... ĐỎ
   G5 file tầng GENERATED bị sửa tay ...................... ĐỎ
   G6 file tầng EVIDENCE bị sửa hoặc xoá .................. ĐỎ
   G7 gốc repo vượt số file tài liệu cho phép ............. ĐỎ
   G8 cùng một tên file tài liệu ở hai nơi ................ ĐỎ
   G9 đường dẫn mới có dấu cách hoặc ký tự ngoài ASCII .... ĐỎ
   G10 hiến pháp vượt giới hạn dòng ....................... VÀNG
   G11 tài liệu quá ttl_days .............................. VÀNG
   G12 file cổng cũ hơn commit gần nhất của file trạng thái VÀNG
   G13 file MỚI trong docs/ thiếu frontmatter ba trường ..... ĐỎ  ← cổng chặn nguồn
   G14 việc đã đóng nhưng file nháp chưa được phân loại ..... VÀNG
   G13 quan trọng nhất bảng: chặn ở lúc TẠO rẻ hơn dọn ở lúc PHÌNH nhiều lần. Đây là điểm
   duy nhất trong vòng đời tài liệu được phép chặn cứng.
   THÔNG BÁO LỖI PHẢI NÓI CẢ CHỖ SAI LẪN CHỖ ĐÚNG — đây là chi tiết quyết định thành bại,
   vì AI đọc thông báo là tự sửa được, không cần người nhắc. Ví dụ:
     ✗ G7 ROOT-EXTRA: REPORT-2026-08-30.md
         → chuyển tới: docs/briefs/REPORT-2026-08-30.md
         → hoặc thêm vào cấu hình nếu đây là file luật lâu dài
   Nối vào quy trình đóng phiên, chạy trước khi đẩy code lên.

C9 MIỄN TRỪ ĐƯỜNG DẪN CŨ (grandfathered) — file cấu hình có một khối liệt kê đường dẫn có
   trước ngày áp chuẩn; cổng bỏ qua chúng. Đây là mấu chốt cho phép áp chuẩn NGAY HÔM NAY
   mà không đụng một byte nào của dữ liệu cũ. Chuẩn chỉ chặn cái mới, cái cũ đóng băng.
   Không có khối này thì áp chuẩn = phải dọn hàng chục thư mục ngày đầu = không ai làm.

C10 NHÃN ĐỘ TIN CẬY KHI BÁO CÁO — mọi báo cáo của AI gắn nhãn nguồn:
   [ĐO] máy đếm, không qua tay người — chắc
   [ĐỌC] mở mã nguồn đọc thẳng thân hàm — chắc
   [DÒ] tìm theo từ khoá — CÓ THỂ SAI
   [KHAI] người tự khai — cần bằng chứng đi kèm
   Cảnh báo [DÒ]: tìm-theo-từ-khoá chỉ tìm được thứ mình đã nghĩ ra để tìm. "Không tìm
   thấy tên" KHÔNG bằng "không có tính năng".

--- PROFILE: chọn đúng MỘT ---
P1 MONOREPO NHIỀU GÓI: gốc repo ≤6 file .md; mỗi packages/<tên>/<phiên bản>/ có ≤3 file .md
   ở gốc gói (hiến pháp cục bộ · README · file trạng thái), phần còn lại xuống docs/ của gói;
   bắt buộc có cơ chế khoá ghi cho nhiều agent. Đơn vị công việc = mỗi thư mục phiên bản.
P2 ỨNG DỤNG ĐƠN: bỏ tầng packages/. Đơn vị công việc = mỗi module chính trong src/. File
   trạng thái đặt ở gốc. Khoá ghi tuỳ chọn nếu chỉ một agent ghi.
P3 REPO NGHIÊN CỨU / TÀI LIỆU: docs/ là thân chính. Bắt buộc chặt C7 vì đây là loại repo
   phình nhanh nhất. Có thể bỏ C5 nếu không có đơn vị công việc rõ ràng, nhưng phải thay
   bằng một chỉ mục máy sinh.
P4 REPO HẠ TẦNG / SCRIPT: chặt nhất ở C6 vì mọi thay đổi đều có hệ quả vận hành.
   evidence/ chứa log chạy thật, không phải ảnh chụp màn hình.
P5 CONTROL PLANE — repo mà SẢN PHẨM CỦA NÓ LÀ ĐIỀU PHỐI CÁC REPO KHÁC (orchestrator, radar
   toàn cục, hệ chạy tự động cross-repo). Đơn vị công việc = một repo BÊN NGOÀI, không phải
   thư mục bên trong. Bắt buộc khai depends_on trỏ sang repo khác kèm schema_version mong đợi.
   Bắt buộc C6. evidence/ chứa log các lần điều phối. LUẬT RIÊNG QUAN TRỌNG NHẤT: trường nào
   tính được từ repo-map.json của repo con thì KHÔNG ĐƯỢC nằm ngoài tầng GENERATED — vi phạm
   là tạo nguồn sự thật thứ hai, chắc chắn lệch. Repo Control Plane chỉ ghi tay ĐÚNG MỘT FILE:
   danh sách repo cần theo dõi. Mọi thứ khác derive.

--- NGƯỠNG SỐ (điều chỉnh được, nhưng phải CÓ một con số cố định) ---
File .md ở gốc repo: 6 (nới tới 8) | File .md ở gốc mỗi gói: 3 (nới tới 5)
Số dòng hiến pháp: 200 (nới tới 300)

--- KHÔNG ÁP — biết để khỏi ép nhầm ---
· Khung phân loại tài liệu theo mục đích học tập (tutorial/how-to/reference/explanation):
  khung đó tự nói rõ nó KHÔNG dành cho tài liệu quy trình nội bộ — sổ tay vận hành, quyết
  định kiến trúc, ghi chú họp. Ép vào là cách nhanh nhất làm méo nó.
· Sinh tài liệu ngữ cảnh bằng AI hàng loạt: file ngữ cảnh do mô hình sinh ra làm GIẢM hiệu
  năng agent và TĂNG chi phí — agent làm theo hướng dẫn thừa một cách trung thành.
· Thêm tài liệu để chữa bệnh thiếu điều hướng: repo nguồn của chuẩn này có 148 file tài
  liệu và AI vào vẫn không biết bắt đầu từ đâu. Thừa tài liệu, thiếu điều hướng.
· Dùng cơ chế duyệt PR làm khoá ghi: cơ chế duyệt là để DUYỆT, không phải để KHOÁ QUYỀN GHI.
· Gom mọi thứ điều khiển vào một thư mục control/: không giảm thời gian AI làm quen (AI đọc
  file cổng, không duyệt thư mục), không rõ hơn, không giảm trùng lặp, chi phí sửa mọi đường
  dẫn trong script thì cao. Cấu trúc vật lý chỉ đổi khi có LỢI ÍCH ĐO ĐƯỢC. Nhất quán về
  LOGIC quan trọng hơn nhất quán về HÌNH THỨC.
· Sổ đăng ký nháp thủ công: frontmatter + scanner cho cùng kết quả, không tốn công giữ sổ.
· Bảng điều khiển dạng ứng dụng tương tác khi số đơn vị theo dõi còn ít: không có link ổn
  định, phải sinh lại mỗi phiên, và CŨ MÀ VẪN TRÔNG ĐẸP. Một file bảng trạng thái máy sinh
  render tốt trên điện thoại, link vĩnh viễn, luôn khớp phiên bản.

--- VÒNG ĐỜI DỌN DẸP: bốn nhịp, chỉ MỘT nhịp chặn cứng ---
Khi TẠO file ....... bắt buộc ba trường frontmatter ................ ĐỎ, CHẶN (G13)
Khi ĐÓNG một việc .. mỗi file nháp chọn đúng một: PROMOTE (thành tài liệu chính thức) /
                     EVIDENCE (bất biến) / ARCHIVE (giữ, không active). Còn việc dở thì mở
                     một mục backlog mới có chủ ............................ VÀNG, nhắc (G14)
HÀNG TUẦN 2 phút ... mở Khối D, CHỈ NHÌN, KHÔNG DỌN ...................... không chặn
HÀNG THÁNG ......... rà TTL quá hạn, nháp cũ, file mồ côi, trùng lặp, ref chết, file máy sinh
                     thừa, việc mở quá lâu. Xoá/di chuyển lớn cần người duyệt.
Vì sao chỉ BA lựa chọn khi đóng việc, không phải năm: xoá và lưu trữ trong hệ quản lý phiên
bản thực chất là một, không gì mất đi; "chuyển giao" không phải trạng thái của file mà là
hành động tạo một mục backlog mới, ghi ở chỗ khác.
Vì sao "khi đóng việc" chỉ NHẮC, không CHẶN: muốn chặn thì máy phải nhận biết được sự kiện
"việc đã đóng". Repo nào chưa có sự kiện đó thì cổng chặn không bao giờ chạy — xây cổng cho
sự kiện không tồn tại là xây rồi bỏ. Chặn ở NGUỒN (G13) rẻ hơn và luôn chạy được.

════════════════════════════════════════════════════════════════
PHẦN II — VIỆC BẠN PHẢI LÀM
════════════════════════════════════════════════════════════════

BƯỚC 1 — KHẢO SÁT BẰNG BẰNG CHỨNG THẬT
Lấy cây thư mục trước, rồi đọc file cần thiết. KHÔNG suy đoán từ tên file.
Gắn nhãn [ĐO]/[ĐỌC]/[DÒ]/[KHAI] cho mọi con số. Không đề xuất giải pháp trước khi đọc file.

BƯỚC 2 — TRẢ LỜI ĐÚNG MẪU DƯỚI ĐÂY. Không thêm mục, không bớt mục.

## 1. Repo này là gì
3-4 câu: mục đích, ai đang làm, đang ở giai đoạn nào.

## 2. Số đo hiện trạng [ĐO]
| Chỉ số | Giá trị |
| Tổng file | |
| Tổng thư mục | |
| File tài liệu (.md) | |
| File .md ở gốc repo | |
| Đơn vị công việc (package/module/service) | |
| Đơn vị đã khai trạng thái | |
| Thư mục top-level chưa rõ chủ | |
| Đường dẫn có dấu cách hoặc ký tự ngoài ASCII | |
| Tên file tài liệu bị trùng ở nhiều nơi | |

## 3. Đối chiếu 10 điểm CORE
Bảng: # | Điểm | Hiện trạng | Đánh giá (ĐÃ CÓ / MỘT PHẦN / CHƯA CÓ / KHÔNG HỢP) | Ghi chú
Đủ C1 đến C10. C2 ghi số dòng thực tế. C4 ghi độ sâu thực tế. C5 ghi trường nào thiếu.
C9 ước lượng số đường dẫn cần miễn trừ.
**Điểm tương thích: N/10** — đếm số điểm ĐÃ CÓ hoặc MỘT PHẦN.

## 4. PROFILE phù hợp
Chọn P1/P2/P3/P4/P5 kèm lý do 2-3 câu. Nêu chỗ cần điều chỉnh so với profile chuẩn.
Nếu không profile nào hợp, nói rõ và mô tả loại repo này.

## 5. Điểm KHÔNG hợp — BẮT BUỘC CÓ
Nêu ít nhất MỘT điểm trong chuẩn mà bạn cho là không hợp với repo này, kèm lý do cụ thể từ
bối cảnh repo. Đề xuất thay thế nếu có.
Nếu thật sự không tìm được điểm nào, phải giải thích vì sao. Câu trả lời "chuẩn tốt, đồng ý
hết" KHÔNG được chấp nhận.

## 6. Ba việc rẻ nhất làm được ngay
Bảng: # | Việc | Chạm file nào | Rủi ro | Người KHÔNG BIẾT CODE nghiệm thu bằng cách nào
Tiêu chí "rẻ": xong trong một phiên, không đụng dữ liệu bằng chứng, không sửa mã sản xuất.

## 7. Kế hoạch di trú
Ràng buộc bắt buộc:
 (a) Chủ repo KHÔNG đọc được code. Mọi tiêu chí nghiệm thu phải nhìn thấy được trên giao
     diện web của kho mã: mở file nào, thấy con số nào, bấm link nào. Tiêu chí kiểu "test
     xanh" hay "code sạch hơn" KHÔNG được chấp nhận.
 (b) Một phiên một giai đoạn. Không gộp.
 (c) KHÔNG đổi tên, di chuyển, hay xoá bất cứ thứ gì thuộc tầng EVIDENCE. Dùng cơ chế
     miễn trừ grandfathered thay vì dọn.
 (d) Không làm yếu lớp bảo vệ đang có để cổng kiểm xanh.
 (e) Giai đoạn nào chạm mã sản xuất phải tách riêng, không trộn với việc di chuyển tài liệu.
 (f) Giai đoạn ĐẦU TIÊN phải là giai đoạn CHẶN NGUỒN PHÌNH, không phải giai đoạn dọn dẹp —
     dọn trước khi chặn nguồn thì dọn xong lại đầy.
Với mỗi giai đoạn ghi: mục tiêu · ai làm · sửa file nào · sinh file nào · CẤM đụng gì ·
chủ repo nhìn thấy gì khi xong · một khối brief dán sẵn để copy-paste thẳng vào chat AI.

## 8. Danh sách grandfathered
Liệt kê cụ thể đường dẫn cần miễn trừ vĩnh viễn, kèm lý do nhóm.

## 9. Bài test nghiệm thu cuối
Cụ thể hoá cho repo này: câu một dòng dán vào chat AI mới là gì, và ba điều AI phải trả lời
được là gì (repo có gì · việc ưu tiên #1 là gì · đọc file nào tiếp). Đạt = AI trả lời được
cả ba mà KHÔNG hỏi lại câu nào.

## 10. Việc chủ repo phải quyết
Chỉ liệt kê việc THẬT SỰ cần con người quyết: đánh đổi sản phẩm, việc chạm dữ liệu thật,
việc đổi luật an toàn. Mọi thứ khác bạn tự quyết và ghi rõ đã quyết theo căn cứ nào.

## 11. Câu hỏi bạn phải hỏi tôi
Liệt kê mọi câu bạn muốn hỏi mà không tự trả lời được bằng repo. Với MỖI câu, ghi rõ:
trường dữ liệu nào còn thiếu khiến bạn phải hỏi. (Đây là phép đo quan trọng nhất — mỗi câu
hỏi là một trường thiếu, không phải một thiếu sót của con người.)

## 12. Artifact trích được cho template dùng chung
Giai đoạn nào sinh ra file tái sử dụng được ở repo khác. Ghi rõ phần nào phải thay đổi khi
mang sang repo khác, phần nào giữ nguyên.

KẾT THÚC BÁO CÁO. Không viết code, không sửa file nào trong phiên này. Chỉ khảo sát và lập kế hoạch.
```

---

## Sau khi thu báo cáo — điền bảng này

| Repo | Profile | Điểm CORE | Điểm không hợp đã nêu | Số câu hỏi phải hỏi |
|---|---|---|---|---|
| Chrome_Extension_AI_Agentic | P1 | | | |
| | | | | |
| | | | | |

Ba cột cuối đáng đọc nhất:

- **Điểm không hợp** — nếu nhiều repo cùng phản đối một điểm CORE thì điểm đó phải sửa, không phải các repo phải theo.
- **Số câu hỏi** — repo nào hỏi nhiều nhất thì thiếu dữ liệu nhiều nhất.
- Nếu **mọi repo đều đạt 9-10/10** thì chuẩn quá dễ, chưa đòi hỏi gì. Xem lại.
