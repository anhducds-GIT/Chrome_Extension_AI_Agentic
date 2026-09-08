---
status: Accepted
adr: 0005
decides: [0005, 0018, 0019, 0023, 0025]
date: 2026-09-05
last_reviewed: 2026-09-09
deciders: Đức
---

# ADR-0005 — Làm việc song song: khoá, quyền, và đẩy

> **File chủ đề.** Mang quyết định **0005** (05/09, duyệt thường trực cho push), **0018** (07/09,
> cấp quyền nguyên tử bằng ref git), **0019** (07/09, `Proposed` — cửa tích hợp kiểm quyền),
> **0023** (07/09, không ai phải chờ ai) và **0025** (08/09, khoá mức file). Gộp 09/09.
>
> **Đang chạy thật hôm nay: vế ⑴ ⑵ ⑶.** Vế ⑷ và ⑸ đã thiết kế, chưa chạy — đọc dòng trạng thái
> của từng vế trước khi tin.

## Bối cảnh

Nhiều phiên AI dùng chung **một cây làm việc và một nhánh**. Hai tai nạn có thật, cả hai đều im
lặng: một quyền bị ghi đè do đọc-sửa-ghi (02/09), và một lượt push cuốn theo hai commit chưa
duyệt của phiên khác (26/08).

## Quyết định

### ⑴ Mặc định là khoá FILE; khoá vùng là ngoại lệ — ĐANG CHẠY

- **⑴a** `--sua <đường-dẫn>… --as <phiên>` trước lượt ghi, `--xong --het --as <phiên>` ngay sau.
  Khoá vùng vẫn còn, dùng khi thật sự sửa khắp vùng.
- **⑴b Chỉ đọc thì không khoá gì.** Không đổi luật — nay có đường thay thế đủ rẻ để không ai còn
  cớ nhận cả vùng "cho chắc".
- **⑴c Chứa nhau HAI CHIỀU.** Vùng có chủ khác → khoá file bị từ chối. Bên trong còn khoá file của
  người khác → nhận cả vùng bị từ chối. Thiếu một chiều là hai lane cùng tin mình được ghi, và
  không lớp nào kêu.
- **⑴d Cổng đóng phiên ĐỎ nếu còn treo khoá file.** Mốc là *hết phiên*, **không** phải *đã đẩy* —
  đây là chỗ khác khoá vùng, đừng lẫn. Khoá vùng trả sau khi đẩy vì commit chưa đẩy trong vùng vô
  chủ để lại mục đỏ cho phiên sau. Khoá file **không mang trách nhiệm truy nguồn** — nhãn `Lane:`
  mang — nên nó chỉ cần biến mất khi bạn ngừng gõ.
- **⑴e `--soat --as <phiên>` bắt buộc trước `git commit`.** Nó liệt kê file đã dàn mà bạn không có
  quyền ghi.
- **⑴f Dấu niêm phong phủ cả khối khoá file, nhưng KHÔNG đổi dấu khi khối rỗng.** Băm thẳng
  `{claims, tam}` là làm mọi bảng đang tồn tại báo `DAU_VO` ngay lượt sau — một cải tiến không
  được phép làm cổng của người khác đỏ vì chuyện họ không liên quan.

**Vì sao khoá file — [ĐO 7 ngày]:** 2.628 cặp commit khác lane, cùng vùng, cách nhau ≤ 1 giờ —
trong đó **1.839 cặp (70%) không đụng file nào chung**. Bảy phần mười lượt chặn là chặn oan.

### ⑵ Khoá thuộc về CHAT, không thuộc từng tác vụ ngầm — ĐANG CHẠY

Đây là giới hạn ⑦ của `AGENTS.md`. Bảng quyền tồn tại để điều phối những bên **không nói được với
nhau**. Hai chat thì không; một chat và tác vụ ngầm của chính nó thì **nói được** — chat là bên
giao việc, nó biết từng tác vụ sẽ chạm gì. Ở đó khoá là chi phí thuần.

Nên **chủ khoá là tên CHAT**. Tác vụ ngầm kế thừa, không tự nhận và tự trả. Nhãn `Lane:` mang tên
chat; phân biệt tác vụ thì ghi ở **dòng tiêu đề** commit.

**[ĐO 7 ngày]:** 130 commit (18%) chỉ là nhận khoá · trả khoá · đóng dấu · sinh lại bảng, không
một dòng sản phẩm. Riêng 07/09 vai điều phối giao **sáu** tác vụ ngầm, mỗi tác vụ tự nhận và tự
trả — sáu lượt cho việc mà một chủ khoá là đủ.

### ⑶ Đẩy được duyệt sẵn; cuốn theo cũng được, đổi lại phải để dấu vết — ĐANG CHẠY

Không phải hỏi Đức từng lượt. Ba điều kiện của `AGENTS.md` mục 2 **vẫn nguyên**: việc hoàn tất
trọn vẹn · cổng XANH TOÀN BỘ · đẩy bằng `safe-push.mjs`, không bao giờ `git push` trần. **Mọi lượt
`--carry` phải kể tên lane bị cuốn theo trong nhật ký phiên.**

Ba việc **không** nằm trong duyệt này: **force-push, sửa lịch sử, merge nhánh vào `main`**.

Kèm hai luật báo cáo: **mỗi lượt trả lời kết bằng hàng đợi việc**, và **hết việc thì nói thẳng là
hết** — không để một dòng "đang chạy" đứng lại khi không còn gì chạy.

### ⑷ Cấp quyền nguyên tử = một ref git — ĐÃ DUYỆT, CHƯA XÂY

`claim.mjs` hôm nay vẫn đọc-sửa-ghi. Vế này là thiết kế đang chờ xây.

Sổ chỉ thêm giữ **lịch sử** quyền (ai nhận, trả, thu hồi, lúc nào, vì sao) và xoá bỏ đọc-sửa-ghi.
Nó **không cấp** quyền. Câu *"thêm cuối thì không bao giờ đụng nhau"* đúng với **nội dung**, không
đúng với **ràng buộc độc quyền**.

Nguyên thuỷ nguyên tử là **một ref git**: `git push` tới một ref là compare-and-swap. Nhận quyền =
thêm sự kiện rồi đẩy; đẩy được là có quyền, bị từ chối là thua cuộc đua. Thứ tự = lịch sử của ref.
Báo thành công **sau khi remote nhận**.

**Fail-closed:** không tới được remote thì không nhận được quyền, nên phải dừng — một quyền cấp
bằng phỏng đoán tệ hơn không có quyền. Đọc quyền vẫn dùng bản địa phương, nhưng đó là **bản nhớ
tạm**, không phải nguồn thẩm quyền.

**Ba ca nghiệm thu, phải qua cả ba trước khi chuyển hồ sơ vai:** hai bên xin đồng thời → đúng một
bên nhận được · phiên cũ ghi bằng quyền cũ → bị từ chối tại cửa tích hợp kèm lý do · thu hồi xảy
ra đúng lúc tích hợp → không lọt kết quả mang quyền cũ. **Xây ở bộ khung trước**
([ADR-0001](0001-ranh-gioi-bo-khung.md) ⑷).

**Bốn chỗ dễ làm sai:** coi "đọc lại sau khi ghi" là bằng chứng an toàn (nó bắt sửa tay, không bắt
cuộc đua) · gọi sổ chỉ thêm là cơ chế cấp quyền · tách lượt đổi quyền khỏi lượt cập nhật trạng
thái chung · thay `git push` bằng khoá file cục bộ (chạy được vì hai checkout cùng máy, nhưng
không cho lịch sử và im lặng sai ngay khi có checkout thứ ba).

### ⑸ Cửa tích hợp — `Proposed`, chờ Đức

Vế này thay ⑷ trên giấy, nhưng **tới khi Đức duyệt thì ⑷ vẫn là thiết kế đứng**. Nó chờ vì cần Đức
bật một cờ branch-protection trên GitHub — thứ chỉ Đức đổi được.

- **Ngăn thật thì CÓ ĐƯỜNG.** Bản đầu viết *"không có ngăn thật trên git đặt ở GitHub"* — sai:
  `Ark_Repo_Harness_Template` đã có `required_status_checks: ["cong-kiem"]`, `strict: true`, cấm
  force-push, workflow đã chạy **87 lượt**. Câu *"repo này cố ý không có CI"* chỉ đúng với repo
  Extension.
- **Một status check chỉ là hàng rào thật nếu thứ GỬI trạng thái không phải thứ ĐANG BỊ kiểm.**
  Hai vai tự gửi "đạt" cho chính mình là tự khai.
- **Chỗ hở là đúng MỘT cờ: `enforce_admins: false`.** Lượt đẩy 07/09 in ra `Bypassed rule
  violations for refs/heads/main` — hàng rào có thật, nhưng tài khoản admin đi vòng qua được, và
  mọi phiên AI đẩy bằng tài khoản đó. **Hiện tại nó là trang trí.** Thứ tự đúng: nối lõi thành
  đường ghi thật → thêm bước kiểm quyền vào `cong-kiem.yml` → **rồi** Đức bật cờ.
- **Sổ quyền ra ref riêng `refs/ark/quyen`, ngoài lịch sử `main`.** Rebase `main` không chạm được
  nó — về cấu trúc, không phải nhờ soi khoảng lịch sử. Và lượt tích hợp cũng là sự kiện trên chính
  ref đó, nên kiểm quyền và ghi kết quả là **một lượt đẩy**.
- **Đọc HẸP vế trên.** Nó đóng khe **trong phạm vi sổ**, không đóng khe giữa sổ và `main`. Phiên
  Codex chạy được chuỗi A-được-ghi-nhận → B-thu-hồi-A → A-đẩy-vào-`main` ngày 07/09 và cả ba bước
  đều thành công. **Được ghi nhận KHÁC đã tích hợp.**
- **Bắt buộc điền là chưa đủ — phải kiểm điều đã điền.** Audit độc lập tìm ba đường đưa kết quả
  không hợp lệ qua cửa: bỏ trống nền → nền **bắt buộc** · khai một nền mà chính nó không chứa →
  nền phải là **tổ tiên** của commit kết quả · SHA bịa ra → kiểm cả hai SHA là commit thật. Cộng
  một chỗ fail-open: sổ quyền **hỏng** bị hiểu thành sổ **trống**.

Tới lúc đó, thứ đang có là: **phát hiện ở mọi nơi, cộng đúng MỘT đường đẩy mọi phiên buộc phải đi**
(`safe-push.mjs`). Đó là **luật cộng cổng, không phải mật mã**.

## Vế đã chết

- **0023 ⑴ — *"chưa thấy dấu vết > 30 phút → nhường khoá"*.** Chết: 0025 hôm sau chốt ngược lại —
  khoá của lane khác chỉ là lý do để **HỎI**. Đã tốn thời gian thật 09/09.
- **0023 ⑵ — *"`AGENTS.md` có khoá riêng"* và *"tạo file mới trong `docs/adr/` không cần khoá"*.**
  Chưa bao giờ được cài; không có khoá `_agents`, `docs/adr/` không nằm trong `append_only_exempt`.

## Hệ quả

**Được:** 70% lượt chặn cùng-vùng biến mất. Một vòng hỏi–đáp mỗi lượt push biến mất — đo hai ngày:
cửa đó chặn 6 lượt, lọc 0 lượt. Một cổng không lọc được gì thì nó là thuế.

**Mất, và đây là cái mất thật:** ngoại lệ `--carry` sinh ra từ một tai nạn có thật. Bỏ nó là bỏ
**lớp chắn cuối** trước việc đẩy nhầm commit của người khác. Còn lại hai thứ: `safe-push` vẫn
**liệt kê** sắp đẩy gì của ai, và mọi lượt cuốn theo phải được **kể tên trong nhật ký**. Không còn
ai chặn — chỉ còn dấu vết để truy. Điều đó chấp nhận được **chỉ khi mô hình một cửa còn đúng**:
lane chưa push là executor do chính phiên điều phối giao. **Đức mở nhiều phiên tay cùng lúc thì
tiền đề mất, và vế ⑶ phải xem lại.**

**Chỗ không được bảo vệ:** khoá file làm số người ghi đồng thời **TĂNG**, nên hai lỗi cuốn commit
(`git commit -a`, `git commit -o`) nổ **dày hơn** — đó là lý do ⑴e là bắt buộc chứ không phải lời
khuyên. Và tài nguyên dùng chung ngoài git không nằm trong bất cứ vế nào ở trên.

## Trạng thái

⑴ ⑵ ⑶ Accepted, đang chạy · ⑷ Accepted, chưa xây · ⑸ Proposed, chờ Đức.
