---
kind: protocol
status: active
---

# MULTIFLOW — nhiều phiên AI cùng làm trên một repo

> **Đọc file này khi:** bạn sắp làm việc trong repo này cùng lúc với AI khác, hoặc bạn sắp
> **sửa** một trong bốn cơ chế bên dưới. Luật ngắn nằm ở `AGENTS.md` mục 1 và mục 2 — file này
> giải thích **vì sao** luật đó có hình dạng như vậy, và **phải làm gì khi muốn đổi nó**.
>
> Viết cho hai loại người đọc: Đức (không code) đọc mục 1–3; AI sắp sửa cơ chế đọc hết.

## 1. Vấn đề, nói bằng tiếng người

Ba bốn phiên AI cùng mở trên **một thư mục**, **một nhánh git**. Không phải mỗi phiên một bản
sao — cùng một chỗ. Nên ba chuyện xảy ra mà không ai thấy:

1. **Hai phiên sửa cùng một file.** Người lưu sau ghi đè người lưu trước, người trước không biết.
2. **Một phiên đẩy lên GitHub thì cuốn theo việc của mọi phiên khác.** Git đẩy cả nhánh, không
   đẩy riêng phần của bạn.
3. **Một phiên lưu file dở làm test của phiên khác đỏ**, và phiên kia bị chặn không đóng được
   việc — dù họ không làm gì sai.

Cả ba đã xảy ra thật, không phải lo xa. Cơ chế trong file này là bốn cái chốt cho ba chuyện đó.

## 2. Bốn cơ chế, mỗi cái trả lời một câu

| Cơ chế | Trả lời câu | Sống ở đâu |
|---|---|---|
| **Bảng chủ sở hữu** | *ai được sửa vùng nào?* | `.agents/claims.json` + `scripts/claim.mjs` |
| **Nhãn `Lane:` trên commit** | *commit này của ai?* | thông điệp commit + `laneFromMessage` |
| **Cổng đóng phiên** | *việc của tôi xong thật chưa?* | `scripts/session-check.mjs` |
| **Cổng xuất bản** | *thứ tôi sắp đẩy có sạch không?* | `scripts/safe-push.mjs` |

Hai cái đầu là **dữ liệu**. Hai cái sau là **người canh cửa** đọc dữ liệu đó.

Điều quan trọng nhất về hai cái đầu, và nó dễ nhầm: **bảng chủ sở hữu nói ai được GHI; nhãn
`Lane:` nói việc đó của AI LÀM.** Hai câu khác nhau. Quyền đổi chủ được sau lúc commit, nên quy
commit theo "ai đang giữ vùng lúc chạy" thì sai **cả hai chiều** — chặn oan việc bạn, hoặc im
lặng đẩy việc người khác lên. Đó là lý do nhãn phải nằm **trong commit**, chỗ không đổi được.

## 3. Một ngày làm việc — năm bước

```bash
node scripts/claim.mjs --list                                   # 1. xem vùng nào trống
node scripts/claim.mjs --take <khoá> --as <phiên> --task "..."   # 2. nhận vùng mình sắp đụng
#    ... làm việc, commit với dòng cuối `Lane: <phiên>` ...      # 3.
node scripts/session-check.mjs --as <phiên>                     # 4. cổng đóng phiên, phải XANH
node scripts/safe-push.mjs --as <phiên>                         # 5. đẩy, rồi --release vùng
```

Ba điều **không** được làm, và mỗi điều là một tai nạn thật:

- **Đừng sửa `.agents/claims.json` bằng tay.** Sửa tay là đọc-sửa-ghi, và hai phiên cùng đọc
  thấy "trống" sẽ cùng ghi tên mình. Dùng lệnh.
- **Đừng `git push` trần.** Nó cuốn theo commit của mọi phiên khác.
- **Đừng bỏ dòng `Lane:`.** Thiếu nhãn thì cả cổng đóng phiên và cổng xuất bản đều từ chối.
- **Đẩy KHÔNG được thì GIỮ khoá, đừng trả.** Bước 5 viết "đẩy, rồi `--release`" — hai vế đó
  theo đúng thứ tự đó, không phải hai việc rời. Cổng đóng phiên không soi cây làm việc, nó soi
  **commit chưa đẩy**: commit của bạn còn nằm đó mà vùng đã không còn chủ thì cổng báo
  *"vùng gốc repo bị sửa nhưng chưa ai đứng tên"* — **đỏ với chính bạn ở lượt chạy sau**, và
  **đỏ với MỌI phiên nếu commit thiếu nhãn `Lane:`** (K2-1b trừ đi file chỉ bị chạm bởi commit
  mang nhãn lane khác).
  Ngày 06/09 ba lane cùng bị chặn đẩy vì lý do ngoài tầm với, cùng trả khoá cho
  "sạch sẽ", và cả ba để lại đúng một mục đỏ cho phiên đến sau dọn.
  Đẩy được rồi mới trả. Không đẩy được thì **giữ khoá và báo lại** — giữ một khoá là chuyện nhỏ,
  để lại commit vô chủ mới là chuyện lớn.

## 4. Năm bất biến — và vì sao từng cái tồn tại

Đây là phần **phải đọc trước khi sửa bất cứ thứ gì** ở mục 2. Mỗi bất biến sinh ra từ một lần
hỏng thật; gỡ nó ra là mời lại đúng lần hỏng đó.

**① Một vùng, một chủ, tại một thời điểm.** Vùng có chủ mà chủ không phải bạn thì **chỉ đọc**.
Muốn giành thì hỏi Đức — và khi Đức chốt, câu chốt phải được **ghi vào bảng**, không phải in ra
màn hình. Vì người cần đọc câu đó là phiên vừa **mất** khoá, mà họ không chạy lệnh; họ chỉ đọc
bảng.

**② Đóng dấu, đừng so hai ảnh chụp.** Bảng có một dấu băm nội dung; sửa tay làm dấu vỡ và mọi
phiên đều thấy. Vì sao không so trạng thái cũ với mới: "trả rồi nhận" và "ghi đè" cho ra **cùng
một diff**. Ảnh chụp không phân biệt được hai chuyện đó, nên phép kiểm kiểu ấy chỉ báo oan.
*Ngoại lệ có chủ ý:* `--restamp` **có** so — nhưng nó chỉ chạy sau khi đã có sửa tay và Đức đã
phân xử, tức không nằm trên đường đi thường ngày. Đặt phép so lên đường thường ngày mới là cái sai.

**③ Mốc so phải là bản niêm phong LÀNH gần nhất, không phải bản mới nhất.** Nếu lấy bản mới nhất
thì một lượt `git commit` biến trạng thái đã bị sửa tay thành mốc hợp lệ — cửa sau tốn đúng một
lệnh. Nay bản có dấu không khớp bị bỏ qua và phép so lùi tiếp về mốc lành.

**④ "Không biết" phải là ĐỎ, không phải "không sao".** Đây là bất biến bị vi phạm nhiều nhất, và
luôn theo cùng một hình dạng: một `catch` trả về giá trị rỗng, rồi chỗ khác đọc giá trị rỗng đó
thành "không có vấn đề". Cổng không đỏ — cổng **biến thành không làm gì**, và nó trông y hệt
"đã đạt". Mọi lỗi đọc git, mọi cấu hình không phân giải được, mọi ảnh chụp không dựng được: đều
phải chặn. Ngoại lệ duy nhất là **bootstrap thật** — repo chưa từng có trạng thái để mà mất.

**⑤ Đỏ của phiên khác không được chặn bạn; đỏ của bạn thì phải chặn.** Suite chạy trên một cây
làm việc dùng chung, nên file sửa dở của người khác làm test của bạn đỏ. Cách phân biệt: chụp
HEAD ra một chỗ tạm rồi chạy lại đúng suite đó ở đó. Đỏ ở đó = thật. Xanh ở đó = nhiễm từ cây
làm việc. **Nhưng nếu vùng bạn đang giữ còn file sửa dở thì KHÔNG được dùng "HEAD xanh" để miễn**
— làm thế là tự miễn cho lỗi của chính mình bằng đúng cái chốt sinh ra để chặn nó.

Ảnh chụp đó phải **biết git**, không chỉ biết file: bản chép trần không có `.git`, nên suite nào
gọi git sẽ chết vì thiếu git rồi bị quy oan thành "regression đã commit". Và nó phải đúng **cả
hai mốc** — HEAD là commit đang xét, `origin/main` là mốc thật của repo gốc. Bản clone trần đặt
mốc thứ hai bằng HEAD, và cái sai đó **im lặng**: suite vẫn chạy, vẫn xanh, chỉ so với mốc sai.

**Độ tươi artifact đi ĐÚNG con đường này từ 05/09 (PUSH-GATE-01), và nó KHÔNG có vế "đỏ của
bạn thì chặn bạn".** Vì chủ thể của phép kiểm đó không phải cây làm việc mà là **HEAD** — thứ
sắp công bố. Nên bộ sinh đang sửa dở của bất kỳ ai, kể cả của chính bạn, không còn là đầu vào:
nó chỉ được kiểm sau khi đã commit, và lúc đó nó đã nằm trong HEAD. Trước 05/09 hai cổng đều
xử ca này bằng cách TỪ CHỐI TIN, và đo được **4 lượt chặn oan trong một ngày** cho một lane
không hề chạm bộ sinh — nặng nhất là lúc phiên kia chạy đột biến kiểm, vì mỗi vòng bẩn file vài
chục giây. Một chi tiết đã trả giá lúc dựng: **thư mục ảnh chụp phải giữ nguyên tên thư mục
repo**, vì bộ sinh suy danh tính repo từ tên thư mục khi cấu hình không khai.

## 5. Muốn ĐỔI cơ chế — đọc mục này trước

**Luật một dòng: một chốt không có test ghim thì nó chỉ là bình luận.**

Không phải khẩu hiệu. Đếm được trong một ngày làm việc: **bốn** lần một chốt vừa viết ra hoá ra
không có tác dụng gì, và cả bốn lần test đều đang xanh. Cách duy nhất phát hiện là **đột biến
kiểm** — cố ý làm hỏng chốt rồi xem có test nào đỏ không.

Ba cái bẫy đã tự cắn, ghi ra để đừng ai mất công đạp lại:

1. **Ghim hàm không thay được ghim đường đi.** Hàm trả về đúng, mà nơi gọi nó lờ đi thì cũng như
   không. Đột biến "gỡ chốt trong `main()`" không làm đỏ một test nào — vì test chỉ gọi hàm.
2. **Test có thể ghim NGƯỢC.** Một khối test đã khẳng định đúng cái fail-open là hành vi hợp lệ,
   trong khi chú thích ngay trên nó viết ngược lại. Cái đó tệ hơn không có test, vì nó làm lỗ
   trông như đã kiểm chứng.
3. **Ghim một chiều là chưa đủ.** Phải có cả vế "chặn đúng thứ cần chặn" và vế "KHÔNG chặn thứ
   hợp lệ". Thiếu vế hai thì một bản "luôn từ chối" vẫn qua sạch.

**Quy trình khi sửa một cơ chế:**

1. Nhận đúng vùng chứa nó (`scripts/` + `tests/` là khoá `_code`).
2. Sửa. Thêm ca ghim **hành vi**, không ghim chuỗi nguồn.
3. **Đột biến:** làm hỏng chốt vừa viết → phải có test đỏ. Không đỏ = chốt là bình luận, quay lại
   bước 2.
4. Chạy `npm test` **bằng tay**. Đừng chỉ tin dòng tổng kết của cổng: nếu commit của bạn đã được
   lane khác đẩy đi thì bạn "không chịu trách nhiệm" vùng nào, và phép kiểm test **xanh rỗng**.
5. Nếu thêm/bớt một phép kiểm của cổng: sửa `EXPECTED_CHECKS` trong `session-check.mjs` **và**
   con số ghim trong `tests/check-bootstrap-smoke.mjs`, kèm một dòng lý do. Lớp đó tồn tại vì
   cách dễ nhất để "làm cổng xanh" là lặng lẽ xoá một phép kiểm.
6. Đổi luật an toàn (quy thuộc, chặn, retry, exact-once) → **hỏi Đức trước**. Không tự đổi.

**Đừng viết số đo vào file này.** Số đo mục ruỗng: đo hôm nay, sai sau ba ngày, và không ai biết
nó đã sai. Cần số thì chạy lệnh:

```bash
npm test                                     # có bao nhiêu ca ghim, có xanh không
node scripts/session-check.mjs --as <phiên>   # cổng đang có mấy phép kiểm, đỏ ở đâu
node scripts/claim.mjs --list                 # ai đang giữ gì, giữ bao lâu
node scripts/what-next.mjs                    # bản đồ việc, chỉ đọc
```

## 6. Gặp lỗi thì làm gì

| Cổng nói | Nghĩa là | Làm gì |
|---|---|---|
| `TU_CHOI` | vùng đó người khác đang giữ | chỉ đọc; muốn giành thì hỏi Đức |
| `DAU_VO` | bảng quyền bị sửa tay | `git diff .agents/claims.json` → khoá của bạn có bị đổi chủ không → hỏi Đức. **Đừng restamp cho xong việc** |
| `TU_CHOI_DONG_DAU` | đang đóng dấu cho một vụ đổi chủ | Đức chốt rồi thì `--restamp --as <phiên> --duc-duyet "<câu chốt>"` |
| `KHONG_CO_MOC_SO` | không tìm được mốc niêm phong lành | `git log -- .agents/claims.json`; vướng thì hỏi Đức |
| `LANE_THIEU_NHAN` | commit chưa push thiếu `Lane:` | `git commit --amend` thêm dòng cuối |
| `TOI_CON_SUA_DO` | vùng bạn giữ còn file chưa commit | commit đi rồi chạy lại |
| `REGRESSION_DA_COMMIT` | đỏ này có thật trong HEAD | sửa; **không** phải nhiễm từ phiên khác |
| `NHIEM_TU_CAY_LAM_VIEC` | đỏ đến từ file sửa dở của lane khác | không chặn bạn; ai commit nó thì cổng của họ chặn |
| `KHONG_TRICH_DUOC_HEAD` | không dựng được ảnh chụp | fail-closed có chủ ý; xem git có lành không |
| `KHONG_DUNG_DUOC_ANH_CHUP_HEAD` | không chép nổi HEAD ra chỗ tạm để kiểm artifact | không kiểm được thì không đẩy; xem git có lành không |
| *từ chối push, "cuốn theo việc của phiên khác"* | commit người khác nằm dưới commit bạn | chờ họ push, **hoặc** hỏi Đức rồi `--carry` |

## 7. Cố ý KHÔNG làm

Ghi lại để đừng ai "cải tiến" vào đúng mấy chỗ này:

- **Không tự đòi lại khoá quá hạn.** Phiên chạy dài là bình thường, và `claimed_at` không được
  chạm lại trong lúc làm — nên "cũ" không đồng nghĩa "chết". Tuổi khoá là **số liệu để bạn hỏi**,
  không phải giấy phép để giành. Tự đòi lại là biến một tai nạn thành tính năng.
- **Không `git worktree add`.** Nó ghi vào `.git/worktrees` của repo gốc — state dùng chung mà
  hai phiên chạy cùng lúc giẫm nhau. Ảnh chụp phải là bản tạm, sống vài giây rồi xoá.
- **Không để cổng xuất bản tự sinh rồi tự commit.** Biến công cụ ĐẨY thành công cụ VIẾT, và một
  commit bạn không gõ là một commit bạn không đọc. Nó từ chối, và đưa đúng câu lệnh.
- **Không hộp cát thường trú cho từng phiên.** Ảnh chụp tạm đã đủ cho nhu cầu chẩn đoán; chưa
  có số đo nào đòi hơn thế.

## 8. Đọc thêm

| Cần gì | Mở file |
|---|---|
| Luật ngắn, bản chính thức | `AGENTS.md` mục 1 và mục 2 |
| Vì sao các phiên va nhau, các phương án đã cân | `docs/studies/PARALLEL-WORK-DESIGN-V0.md` |
| Vai điều phối: đọc gì, giao việc thế nào | `docs/protocols/ORCHESTRATOR.md` |
| Câu để Đức dán cho bất kỳ AI nào | `PROMPTS.md` |
| Quyết định nào Đức đã chốt, và vì sao | `docs/adr/` |
