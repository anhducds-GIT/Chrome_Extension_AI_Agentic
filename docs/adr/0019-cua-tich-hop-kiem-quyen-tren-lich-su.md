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

### ⑴ Không có NGĂN thật ở cửa tích hợp, và ADR này khai điều đó thay vì hứa

Ba đường ngăn thật, cả ba không dùng được ở đây:

| Đường | Vì sao không |
|---|---|
| Hook `pre-receive` phía máy chủ | GitHub thường không cho hook tuỳ ý (chỉ bản Enterprise) |
| Branch protection + required status check | **Có** trên GitHub, nhưng cần CI mỗi lượt push — repo này **cố ý không có** |
| Một tiến trình điều phối thường trú | hạ tầng mới, ngược hướng tinh gọn Đức chốt 07/09 |

Nên vế *"ngăn tại cửa tích hợp"* của ADR-0018 bị **rút**. Thứ đạt được thật:

> **Phát hiện ở mọi nơi, và đúng MỘT đường đẩy mà mọi phiên buộc phải đi.**

`AGENTS.md` mục 0 đã cấm `git push` trần và bắt dùng `safe-push.mjs`. Nên chỗ cắm phép kiểm là
**trong `safe-push`**. Cưỡng chế ở đây là **luật cộng cổng, không phải mật mã**: một phiên cố ý đi
vòng thì vẫn đi vòng được. Khai ra chứ không che — vì một thiết kế tự nhận là "ngăn" mà thực ra chỉ
"phát hiện" sẽ khiến lượt sau tin sai chỗ.

### ⑵ Phép kiểm bắt ca của Codex: soi LỊCH SỬ SỰ KIỆN giữa hai mốc

Mỗi lần cấp quyền, sổ sự kiện ghi **SHA tại thời điểm cấp**. Kết quả của A mang theo SHA đó.

Cửa tích hợp hỏi đúng một câu: **giữa SHA cấp quyền và HEAD, có sự kiện thu hồi nào cho vùng này
không?**

A rebase thì sự kiện thu hồi của B **nằm giữa hai mốc** — bị bắt. **Rebase không xoá được sự kiện,
nó chỉ đổi chỗ sự kiện.** Đó là lý do phép kiểm phải soi *khoảng lịch sử*, không soi *quan hệ
fast-forward*.

Điều kiện bắt buộc kèm theo: **phép kiểm phải chạy lại sau MỌI lượt rebase**, trên gốc mới. Chạy
một lần rồi rebase là quay lại đúng lỗ này.

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

Năm ca. Ba ca đầu từ ADR-0018, ca ④ là ca Codex vừa bác được, ca ⑤ là chỗ mù chéo.

1. Hai bên xin đồng thời → đúng một bên nhận, bên kia **nhận từ chối**.
2. Phiên cũ quay lại ghi bằng quyền cũ → bị từ chối, kèm lý do đọc được.
3. Thu hồi xảy ra đúng lúc tích hợp → không lọt kết quả cũ.
4. **Quyền cũ SAU KHI REBASE** → bị bắt bằng phép soi khoảng lịch sử, không bằng fast-forward.
5. Trạng thái tích hợp đã đổi khiến kết quả của A không còn tương thích → **không được nhận mà
   không kiểm lại**.

Ca ④ là ca chịu tải: nó là ca duy nhất đã bác được một thiết kế đã viết ra.

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
