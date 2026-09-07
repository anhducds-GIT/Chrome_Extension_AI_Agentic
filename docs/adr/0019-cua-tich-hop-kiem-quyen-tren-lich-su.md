---
status: Proposed
adr: 0019
date: 2026-09-07
deciders: Đức
supersedes: 0018
---

# ADR-0019 — Cửa tích hợp kiểm quyền theo LỊCH SỬ SỰ KIỆN, không theo fast-forward; và không có ngăn thật trên git đặt ở GitHub

> **`Proposed`, cố ý.** [ADR-0018](0018-cap-quyen-nguyen-tu-bang-ref-git.md) sinh ra đã `Accepted`
> ngay commit đầu, nên một chữ sai trong nó **bất biến vĩnh viễn** (mục `N-39`). ADR này đi qua
> `Proposed` để còn sửa được trước khi chốt. Đổi sang `Accepted` khi Đức duyệt — phép kiểm B12 miễn
> frontmatter và mục `## Trạng thái`, nên lượt đổi đó hợp luật.

## Bối cảnh

ADR-0018 chốt rằng `git push` tới một ref là phép so-và-đổi, và kết luận:

> *"Kết quả mang thế hệ cũ thì lượt đẩy của nó không fast-forward so với lượt thu hồi đã vào trước,
> nên bị từ chối tại cửa."*

**Sai. Phiên Codex dựng thử bằng hai checkout và một remote git cục bộ, rồi bác được:**

1. A có quyền thế hệ 1.
2. B thu hồi A, nhận thế hệ 2, **đẩy thành công**.
3. A đẩy kết quả thế hệ 1 → **bị từ chối**.
4. A `fetch`, **rebase** lên lịch sử mới, đẩy lại → **THÀNH CÔNG**.

Remote lúc đó ghi chủ B thế hệ 2, **nhưng đã nhận kết quả của A thế hệ 1**.

**`git push` bảo vệ quan hệ LỊCH SỬ, không bảo vệ HIỆU LỰC QUYỀN.** Rebase làm lịch sử hợp lệ trong
khi quyền vẫn hết hiệu lực. So-và-đổi trên đầu ref là điều kiện **cần**, không **đủ**.

Đây là ví dụ một bài thử **dựng ra để bác** thiết kế, thay vì đi đường sạch rồi báo đạt. Ghi lại
cách nó được dựng, vì đó là cách duy nhất đã bác được thiết kế này.

## Quyết định

### ⑴ Ngăn thật thì CÓ ĐƯỜNG — vế cũ của mục này đã sai, và nó sai theo hướng bi quan

> **Sửa 07/09, sau khi xây và đo thật.** Bản đầu của mục này viết *"không có ngăn thật trên git
> đặt ở GitHub"*, và dựng một bảng ba dòng để chứng minh. **Dòng thứ hai của bảng đó sai.** ADR
> này còn `Proposed` đúng để sửa được những chỗ như thế.

| Đường | Sự thật, đo bằng `gh api` ngày 07/09 |
|---|---|
| Hook `pre-receive` phía máy chủ | Vẫn đúng: GitHub không cho hook tuỳ ý (chỉ bản Enterprise) |
| Branch protection + required status check | **CÓ, VÀ ĐÃ BẬT SẴN Ở REPO BỘ KHUNG.** `Ark_Repo_Harness_Template` có `required_status_checks: ["cong-kiem"]`, `strict: true`, cấm force-push; workflow `.github/workflows/cong-kiem.yml` đã chạy **87 lượt**. Câu *"repo này cố ý không có CI"* đúng với **repo Extension**, và tôi đã khái quát nó cho cả hai — sai |
| Một tiến trình điều phối thường trú | Vẫn đúng: hạ tầng mới, ngược hướng tinh gọn |

**Vế quyết định mà bản đầu chưa nêu:** một status check **chỉ là hàng rào thật nếu thứ GỬI trạng
thái không phải thứ ĐANG BỊ kiểm.** Hai vai tự gửi "đạt" cho chính mình là tự khai. Bên thứ ba ở
đây là workflow chạy trên máy GitHub — **không phải xây mới, nó đã có.**

**Chỗ hở là đúng MỘT cờ: `enforce_admins: false`.** Lượt đẩy 07/09 in ra
`remote: Bypassed rule violations for refs/heads/main` — hàng rào có thật, nhưng tài khoản admin
đi vòng qua được, và mọi phiên AI đẩy bằng tài khoản đó. Nên **hiện tại nó là trang trí.**

Bật cờ đó là **quyền của Đức, không phải của ADR này**, và bật sai nhịp thì **chặn mọi lượt đẩy**
cho tới khi `cong-kiem` báo xong. Thứ tự đúng: nối lõi thành đường ghi thật → thêm bước kiểm quyền
vào `cong-kiem.yml` → **rồi** Đức bật cờ.

Cho tới lúc đó, thứ đạt được vẫn là: **phát hiện ở mọi nơi, và đúng MỘT đường đẩy mà mọi phiên
buộc phải đi** (`safe-push.mjs`, `AGENTS.md` mục 0). Đó là **luật cộng cổng, không phải mật mã**.

### ⑵ Không soi khoảng lịch sử nữa — SỔ QUYỀN RA REF RIÊNG

> **Thay bản đầu của mục này.** Bản đầu dựng phép kiểm *"giữa SHA cấp quyền và HEAD có sự kiện thu
> hồi nào không"*. Nó chạy được, nhưng có cách rẻ hơn và mạnh hơn, tìm ra lúc xây.

Sổ quyền nằm trên **một ref riêng**, `refs/ark/quyen`, **ngoài lịch sử `main`**. Hai hệ quả:

1. **Rebase `main` không chạm được sổ quyền.** Nên ca ④ — ca duy nhất từng bác được một thiết kế
   đã viết ra — **không thể xảy ra về cấu trúc**, thay vì phải bắt bằng cách soi khoảng lịch sử.
   Không cần điều kiện *"phải chạy lại sau mọi lượt rebase"* nữa: không có gì để chạy lại.
2. **Lượt tích hợp cũng là một sự kiện trên chính ref đó.** Nên lượt kiểm quyền và lượt ghi kết
   quả là **một lượt đẩy** — git tuần tự hoá chúng, không có khe ở giữa.

**Đọc HẸP vế 2.** Nó đóng khe **trong phạm vi sổ**, không đóng khe giữa sổ và `main`. Phiên Codex
chạy được chuỗi này ngày 07/09 và cả ba lượt đều thành công: **A được ghi nhận kết quả → B thu hồi
quyền A → A đẩy mã vào `main`.** Bản đầu của phiên điều phối viết *"đóng lỗ TOCTOU"* không kèm giới
hạn, và câu đó **rộng hơn bằng chứng**.

> **Được ghi nhận KHÁC đã tích hợp.** Ghi nhận là chữ trong sổ; `main` là mã chạy thật. Chỗ đóng
> khe cuối cùng là vế ⑴ — cờ `enforce_admins` cộng một bước kiểm quyền trong `cong-kiem.yml`.

### ⑵b Bắt buộc điền là CHƯA ĐỦ — phải kiểm điều đã điền

Audit độc lập của phiên Codex (07/09, `44f0680`) tìm được ba đường đưa kết quả **không hợp lệ** qua
cửa, và cả ba đã tái hiện được bằng phép kiểm trước khi vá:

| Đường đi qua được | Vì sao | Vá bằng |
|---|---|---|
| Kết quả cũ, **bỏ trống** nền | nền là tuỳ chọn, thiếu thì hết kiểm | nền **bắt buộc** |
| Kết quả cũ, **khai một nền mà chính nó không chứa** | nền chỉ được so với lượt tích hợp trước | nền phải là **tổ tiên của chính commit kết quả** (`BASE_NOT_IN_RESULT`) |
| **SHA bịa ra** (`deadbeef…`) | không ai hỏi commit đó có thật không | kiểm cả hai SHA là commit thật (`UNKNOWN_COMMIT`) |

Và một chỗ **fail-open** khác: sổ quyền **hỏng** bị hiểu thành sổ **trống** — hàm đọc sổ trả về
danh sách rỗng khi không đọc được, nên một ref tồn tại mà thiếu file sổ làm công cụ vừa in lỗi vừa
**cấp quyền** ở thế hệ 1. Nay là `LEDGER_UNREADABLE`, mã thoát riêng, fail-closed.
**Vắng ref và sổ hỏng là hai chuyện khác nhau; chỉ quyền thật sự chưa khởi tạo mới được bắt đầu từ
trống.**

### ⑵c Còn hở, khai ra thay vì hứa: lõi KHÔNG kiểm đường dẫn

Phiên Codex khai vùng `wrong-area` cho một thay đổi ở `product.txt` và **đi qua được**. Nên tên
vùng trong sự kiện là **lời khai**, không phải điều đã kiểm.

Bịt chỗ này cần bản đồ **vùng → đường dẫn**, mà bản đồ đó nằm ở `.repo-structure.json` của **từng
repo**, còn lõi thì cố ý không biết repo nào. Nên nó là **việc kế tiếp**, không phải một dòng thêm
vào lõi. Và nó phải trả lời thêm một câu bản đầu chưa hỏi: **kết quả chạm nhiều vùng thì ai duyệt.**

### ⑶ Ca thứ năm — sửa điều kiện từ chối cho đúng

Điều kiện sai (bản của phiên điều phối): *"B đang sửa dở → chặn A."* Đó là **chặn quá rộng**: A vẫn
tích hợp được với phiên bản hợp đồng đã thống nhất, và cây làm việc bẩn của B không phải cơ sở để
chặn ai.

Điều kiện đúng: **trạng thái tích hợp đã đổi khiến kết quả của A không còn tương thích, mà A vẫn
được nhận vì không ai kiểm lại.**

### ⑷ Ngưỡng nghiệm thu — bốn vế cùng lúc, không phải một

Ngưỡng *"Đức phân xử 0 lần"* **lách được bằng cách đứng im**: hai vai không làm gì cũng đạt 0.

Ngưỡng đúng:

> **Hoàn thành đầu ra đã định · trong thời hạn đã định · không vi phạm quyền hoặc làm mất việc ·
> Đức phân xử 0 lần về điều phối.**

Một lượt đạt bốn vế này chứng minh **đạt lượt thử**. Nó **không** chứng minh mô hình mới tốt hơn mô
hình cũ trên mọi công việc — bài thử có **N = 1**, và không có cách làm N lớn hơn mà không đợi
nhiều ngày. Lúc báo cáo phải nói *"đạt lượt một"*, không nói *"kiến trúc đã được chứng minh"*.

### ⑸ Việc thử không được tự thay tiêu chuẩn chấm nó

Việc thử được chọn là *"cho cổng đọc cờ `frozen` rồi chọn đúng suite cần chạy"* — và nó **sửa chính
cổng kiểm**. Nên **bộ kiểm nghiệm thu kiến trúc phải ghim riêng**, ngoài cổng đang bị sửa.

Và **đừng mặc định "đạt = bỏ được ba suite"**. Phạm vi đúng là *chọn đúng suite mà vẫn giữ bảo vệ
cần thiết*. Nếu phân tích hợp đồng cho thấy phải **giữ một phần** kiểm thử thì đó **vẫn là kết quả
đúng** — cửa Bridge của Scouter học từ bản ChatGPT đã đóng băng, tức có phụ thuộc hành vi khác file.

## Hệ quả

**Được.** Ca mà Codex bác được ADR-0018 **bị bắt**, và bắt bằng dữ liệu đã có (sổ sự kiện + lịch sử
git), không cần máy chủ mới.

**Mất, ba cái:**

- **Không có ngăn thật.** Một phiên cố ý đi vòng `safe-push` vẫn ghi được. Kiến trúc này dựa vào
  luật, và luật thì hôm nay đo được là **2.003 dòng chữ cho 28 chốt máy** — tức chỗ yếu đã biết.
- **Phép kiểm phải chạy lại sau mỗi rebase**, nên nó thêm một bước vào đường đẩy vốn đã có bốn bước.
- **Hai checkout lấy đi một năng lực phát hiện đang có.** `chayLaiTrenHead()` soi **cây làm việc cục
  bộ** để phân biệt lỗi đã commit với nhiễm từ phiên khác — nó cứu thật ngày 07/09. Với hai
  checkout, A **không thấy** cây làm việc của B. Nhiễm chéo biến thành **mù chéo**, và ca ⑶ ở trên
  là chỗ duy nhất còn bắt được.

## Nghiệm thu

**Đã chạy, 07/09** — `Ark_Repo_Harness`, `tests/quyen-sau-ca.mjs`:
**52 phép kiểm xanh · 14/14 đột biến bị bắt · 9 ca.**
Sân thử là hai checkout + một remote git cục bộ trong thư mục tạm, ngoài cả hai repo.

| Ca | Kiểm gì |
|---|---|
| ① | Hai bên xin quyền → đúng một bên nhận, bên kia **nhận từ chối** |
| ①b | Đẩy bản sổ **cũ** → git từ chối (chốt so-và-đổi) |
| ② | Phiên **mất quyền** quay lại ghi → từ chối, kèm lúc nào · ai · câu chốt của Đức |
| ③ | Thu hồi chen giữa lượt kiểm và lượt ghi → không lọt |
| ③b | Chen **trong một kết nối đẩy** → server từ chối, `--force` không tắt được |
| ③c | Chen **sau `fetch`, trước lúc mở kết nối** → chỗ duy nhất `--force` phá được |
| ④ | **Quyền cũ sau `fetch` + `rebase`** → vẫn từ chối, vì sổ ở ref riêng |
| ④b | Cùng lane, **thế hệ cũ** → từ chối (chốt "còn là chủ" không bắt được ca này) |
| ⑤ | Đích đã đổi → từ chối; **và** checkout khác đang làm dở thì **KHÔNG** chặn |
| ⑥ | **Một ca hợp lệ đi hết được** |
| ⑦ | Thông tin kết quả phải khớp commit thật (ba đường của Codex) |
| ⑧ | Sổ **hỏng** làm hệ thống dừng, không thành sổ **trống** |
| ⑨ | Hai lượt nhận quyền **cạnh tranh thật** |

Ca ④ là ca chịu tải: nó là ca duy nhất đã bác được một thiết kế đã viết ra.

**Hai chỗ phép kiểm tự nó dạy lại, ghi ra vì cả hai đều là dạng "xanh mà không canh gì":**

- Ca ① ban đầu **mang tên sai**: nó gọi A rồi mới gọi B, nên nhãn *"đồng thời"* không đúng sự
  thật. Cơ chế vốn đúng — phép kiểm mới là thứ chưa chứng minh được điều nó nói. Ca ⑨ mới chen
  thật bằng hook `reference-transaction`.
- Đột biến `--force` **xanh cả 37 phép kiểm** ở lượt đầu, và điều đó bắt được một câu viết sai
  trong lõi: git bảo vệ **hai** cửa sổ khác nhau, và `--force` chỉ phá được cửa sổ thứ hai. Không
  có ca ③c thì lớp chịu toàn bộ việc phân xử **không có gì canh**.

**Ngoài phạm vi bộ kiểm này, chưa đạt:** chuỗi A-ghi-nhận → B-thu-hồi → A-đẩy-`main` (xem ⑵) và
ranh giới vùng → đường dẫn (xem ⑵c). Hai chỗ đó **chưa được nghiệm thu**, nên chưa được nối vào
`claim.mjs` để thay quy trình đang dùng.

**Nơi xây và nơi thử tách nhau** (phiên Codex đề xuất, nhận): mã dùng chung ở `Ark_Repo_Harness`
(ADR-0006); **hai checkout của chính repo này** là nơi hai vai vận hành thử; nghiệm thu cuối ở đây.
Lỗi thì sửa **ở bộ khung** rồi cập nhật bản ghim, không vá tại chỗ.

## Chỗ dễ làm sai

- **Đừng đọc "so-và-đổi trên ref" thành "đã an toàn".** Nó là điều kiện cần. Rebase đi qua nó.
- **Đừng gọi cửa tích hợp là lớp ngăn.** Xem ⑴.
- **Đừng chặn A vì cây làm việc của B bẩn.** Xem ⑶.
- **Đừng đo bài thử bằng một vế.** Xem ⑷.
- **Đừng để bản sửa tự chấm mình.** Xem ⑸.
- **Đừng báo "kiến trúc đã được chứng minh" sau một lượt.** N = 1.

## Trạng thái

Proposed
