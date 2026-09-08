---
status: Rejected — superseded by ADR-0025 before acceptance
superseded_by: 0025
adr: 0023
date: 2026-09-07
deciders: Đức
---

# ADR-0023 — Không ai phải chờ ai: khoá hết hạn khi có người chờ, vai điều phối không bị chặn, khoá thuộc về CHAT

> **⚠ MỘT PHẦN CỦA ADR NÀY ĐÃ CHẾT — đọc khối này trước phần Quyết định.**
>
> **Vế ⑴ (khoá hết hạn, *"chưa thấy dấu vết > 30 phút → nhường"*) KHÔNG có hiệu lực.**
> [ADR-0025](0025-khoa-muc-file-giu-ngan-tra-ngay.md) ngày hôm sau chốt ngược lại: khoá của
> lane khác thì **chỉ được HỎI, tuyệt đối không nhả hộ**. ADR này chưa bao giờ được Accepted.
> 
> Hai câu ngược nhau này đã tốn thời gian thật ngày 09/09: một phiên đọc câu cũ rồi áp nó cho
> khoá của **chính mình**, trong khi cả hai câu đều nói về khoá của **người khác**.
> 
> **Vế ⑵(a) và ⑵(b) chưa bao giờ được cài** — không có khoá `_agents`, và `docs/adr/` không
> nằm trong `append_only_exempt`. Đừng đọc chúng thành luật đang chạy.
>
> Rà soát bộ luật 2026-09-09 ([ADR-0026](0026-adr-records-are-editable.md)). Phần còn lại của
> ADR này vẫn có hiệu lực.

> **HAI CHỖ ĐÃ ĐỔI SO VỚI BẢN VIẾT 07/09, ghi ra để không ai tưởng đây là bản gốc:**
>
> ⑴ **Số 0017 → 0023.** Bản viết 07/09 không vào được repo (khoá `_docs` có chủ khác — chính
> là bằng chứng sống của vấn đề nó mô tả), và trong lúc nó nằm ngoài repo thì số 0017 đã
> thuộc về [ADR-0017](0017-hai-vai-assistant-thay-the-mot-cua.md). Đây đúng thứ rủi ro mà
> vế ⑵(a) của chính nó cảnh báo: tạo file không đụng nhau về nội dung, nhưng **đụng nhau về
> số**.
>
> ⑵ **`Accepted` → `Proposed`.** Bản 07/09 chào đời ở `Accepted`, và ngày 08/09 điều đó bị
> cấm (mục nợ `N-39`): B12 chốt mốc bất biến ở commit ĐẦU TIÊN mang `Accepted`, nên một ADR
> chào đời ở `Accepted` là một ADR không sửa được một chữ nào nữa.
>
> **Vì sao nó nên ở `Proposed` chứ không chỉ vì thủ tục:** Đức đã nói vế ⑶ nguyên văn, nhưng
> **vế ⑴ và ⑵ là thiết kế của AI**, không phải câu của Đức — và cả hai đụng vào luật khoá,
> tức thứ `AGENTS.md` mục 2 bắt hỏi Đức. Đóng dấu `Accepted` cho chúng là để AI tự duyệt luật
> của chính mình. **Đức chốt xong thì đổi frontmatter sang `Accepted` ở một lượt riêng** —
> B12 miễn frontmatter nên lượt đó hợp luật sẵn.

## Bối cảnh

Đức nêu yêu cầu 07/09, nguyên văn: *"tôi muốn bạn kiến trúc sao cho phiên extension develop có
thể chạy song song với AI assistant, thay vì khóa cứng … ta cần phải vừa phát triển được và vừa
điều phối được mới đúng là tối ưu. không ai phải chờ ai."*

Hôm đó vai điều phối bị chặn hoàn toàn nhiều giờ: không viết được đề bài, không viết được quyết
định, không sửa được luật — vì `_docs` và `_root` do một chat khác giữ.

**Phép đo bác giả thuyết hiển nhiên.** Giả thuyết ban đầu: *"lane sản phẩm phải chạm tài liệu nên
nó chiếm khoá quản trị"*. Đo 375 commit trong 3 ngày, phân theo vùng bị chạm:

| Chạm vùng nào | Commit | Phần |
|---|---|---|
| **Chỉ vùng miễn khoá** | **163** | **43%** |
| Chỉ một gói | 87 | 23% |
| Chỉ `_docs` | 25 | 7% |
| Chỉ `_code` | 24 | 6% |

Và con số quyết định: trong **101** commit chạm một gói, chỉ **2** cũng chạm `_root`, và **0**
chạm `_docs`.

**Việc sản phẩm và việc quản trị gần như không ghi vào cùng chỗ. Phân vùng theo thư mục KHÔNG
sai** — nên vá bằng cách chia nhỏ thêm là vá sai bệnh.

Bệnh thật: một chat **cầm** khoá 3–4 giờ trong khi làm việc ở chỗ khác. Công cụ đã in ra đúng
điều đó — dòng chẩn đoán *"chưa thấy dấu vết trong repo"* — và mọi phiên bỏ qua nó.

> Chỗ nghẽn không phải *hai người cùng muốn ghi một chỗ*. Là **một người cầm chìa khoá phòng
> mình không vào.**

`AGENTS.md` mục 1 **đã** có luật *"nhận ngay TRƯỚC lượt ghi đầu tiên, không phải lúc mở phiên"*.
Luật đúng, **không ai theo**, và **không gì đo nó** — đúng hình dạng của một luật-là-chữ vô dụng,
loại mà repo này vừa đo được 2.003 dòng cho 28 chốt máy.

**Và Đức làm rõ một chỗ đổi cả kiến trúc:** *"lane ở đây tôi hiểu là 2 phiên chat với AI … trong
1 chat với bạn, mà bạn có khả năng manage cùng lúc 5 task chạy ngầm mà không dẫm chân nhau thì
tôi vẫn ok"*. Đơn vị Đức giới hạn là **chat**, không phải tác vụ ngầm. Chuyện này quan trọng vì
mọi đau hôm 07/09 là đau **giữa các chat**, không phải giữa các tác vụ ngầm của một chat.

## Quyết định

Ba vế. Vế ⑶ là vế Đức vừa mở ra và là vế tiết kiệm nhiều nhất.

### ⑴ Khoá hết hạn CHỈ KHI có người đang chờ

| Tình trạng khoá | Khi chat khác xin |
|---|---|
| Đang ghi (có commit trong 30 phút) | **giữ**, người xin chờ |
| **Chưa thấy dấu vết trong repo** > 30 phút | **nhường** |
| Có dấu vết nhưng > 2 giờ không commit | nhường, ghi lại một dòng vào bảng |

Đây **không thêm cơ chế nào** — nó cho một tín hiệu đã tồn tại một hệ quả. Trước ADR này dòng
*"chưa thấy dấu vết"* chỉ là chữ in ra màn hình.

**Vế "chỉ khi có người chờ" là phần của quyết định, không phải lời khuyên.** Không ai chờ thì cầm
bao lâu cũng vô hại, nên hết hạn vô điều kiện chỉ tạo ra rủi ro mà không mua được gì.

### ⑵ Vai điều phối không thể bị chặn — bằng cấu trúc, không bằng luật

**(a) Tạo file MỚI trong `docs/adr/` và `docs/briefs/` KHÔNG cần khoá.**

Nguyên lý: **tạo file không bao giờ đụng nhau, chỉ SỬA file mới đụng.** Hai chat tạo hai file
khác tên thì không có gì để mất. Sửa file đã có thì vẫn cần khoá — đó mới là chỗ chữ của người bị
ghi đè, và đó là lý do `FEATURE-PARITY.md` mục 2 vẫn đòi `_root` (ADR-0014).

Kèm bắt buộc, vì tạo file không đụng nhau về *nội dung* nhưng đụng nhau về *số*: **số ADR do vai
điều phối cấp**, và **một phép kiểm ở cổng: hai file ADR cùng số thì ĐỎ**. Không có vế thứ hai
thì (a) chỉ đổi một loại xung đột thành loại khác — ngày 07/09 mã sổ nợ trùng **hai lần trong một
ngày** (`N-19`, `N-30`), nên đây là rủi ro đã đo được, không phải giả định.

**(b) `AGENTS.md` tách thành khoá riêng, và chỉ vai điều phối nhận khoá đó.**

Chat sản phẩm **đọc** luật, không viết luật. Cần đổi luật thì đề xuất qua ADR — đó đã là quy
trình sẵn có, và `AGENTS.md` mục 2 vốn bắt đổi luật an toàn phải hỏi Đức.

Sau hai bước này, **mọi đường ghi của vai điều phối hoặc miễn khoá, hoặc nằm trên một khoá không
ai khác nhận.** Nó không bị chặn được nữa — không vì ai nhường, mà vì không còn cửa để chặn.
Chiều ngược lại cũng thông: chat sản phẩm cần khoá gói của nó, mà vai điều phối không bao giờ
nhận khoá đó.

### ⑶ Khoá thuộc về CHAT, không thuộc về từng tác vụ ngầm

**Bảng quyền tồn tại để điều phối những bên KHÔNG NÓI ĐƯỢC VỚI NHAU.** Hai chat không nói được
với nhau — cần khoá. Một chat và các tác vụ ngầm của chính nó thì **nói được**: chat là bên giao
việc, nó biết từng tác vụ sẽ chạm gì. Ở đó khoá là chi phí thuần.

Nên: **chủ khoá là tên CHAT.** Tác vụ ngầm kế thừa, không tự nhận và tự trả. Nhãn `Lane:` mang
tên chat; muốn phân biệt tác vụ nào thì ghi ở **dòng tiêu đề** commit, không ở nhãn.

Vì sao vế này đáng: đo 7 ngày, **130 commit (18%)** chỉ là nhận khoá · trả khoá · đóng dấu · sinh
lại bảng. Không một dòng sản phẩm. Riêng ngày 07/09 vai điều phối giao **sáu** tác vụ ngầm, mỗi
tác vụ tự nhận và tự trả khoá riêng — tức sáu lần lưu lượng nhận/trả cho việc mà **một** chủ khoá
là đủ.

## Hệ quả

**Được.** Vai điều phối và chat sản phẩm chạy song song thật, không ai chờ ai — đúng yêu cầu của
Đức. Và lưu lượng khoá tụt theo bậc, vì nó tính theo **số chat**, không theo số tác vụ ngầm.

**Mất — nói thẳng, cả ba vế đều có giá:**

**⑴ có thể cướp khoá của một chat cẩn thận.** Chính `AGENTS.md` mục 1 cảnh báo đúng chỗ này: *"một
lane cẩn thận dựng thử ngoài repo rồi mới ghi vào"* — nó **không** có dấu vết nhưng **đang** làm.
Ngày 06/09 chuyện tương tự xảy ra thật: một khoá bị nhả hộ vì có người đọc dòng chẩn đoán đó
thành *"phiên kia đang rảnh"*, và phiên kia phải hoàn nguyên việc đã xong. Vế *"chỉ khi có người
chờ"* là thứ mua lại rủi ro đó, nhưng nó **không xoá hết**: vẫn có cửa cho một lượt cướp khi thật
sự có hai bên cùng cần.

**⑵(a) mở một đường tạo file mà máy không canh nội dung.** Hai chat có thể tạo hai ADR nói ngược
nhau về cùng một chuyện. Phép kiểm trùng số bắt được **trùng số**, không bắt được **trùng chủ
đề**. Chưa có cách nào máy chặn, và đây là lỗ đã biết.

**⑶ làm xung đột trong cùng một chat trở nên VÔ HÌNH với máy.** Trước đây hai tác vụ ngầm cùng
vùng bị bảng quyền chặn; nay trách nhiệm chuyển hết sang chat. Nếu vai điều phối giao sai thì hai
tác vụ ghi đè nhau **và không gì báo**. Ngày 07/09 vai điều phối đã suýt giao trùng vùng hai lần.
Đây là cái giá thật của ⑶, và cách trả duy nhất là kỷ luật: **một tác vụ ngầm một vùng, một lúc.**

## Chỗ dễ làm sai, ghi ra để lượt sau đừng vấp

- **Đừng hiểu ⑴ thành "khoá tự hết hạn".** Nó **chỉ** hết hạn khi có bên khác xin. Bỏ vế đó là
  quay lại đúng vụ nhả-khoá-hộ ngày 06/09, lần này tự động hoá.
- **Đừng gộp `_docs`/`_code` vào một khoá lớn lúc chúng đang có chủ.** Gộp khoá là việc riêng, và
  làm lúc có chủ là lấy khoá khỏi tay người đang làm.
- **Đừng bỏ nhãn `Lane:`.** ⑶ đổi *giá trị* của nhãn (tên chat thay vì tên tác vụ), **không** bỏ
  nhãn. Commit không nhãn thì `safe-push` phải đoán theo chủ vùng lúc chạy, và ngày 26/08 nó đã
  im lặng cuốn việc của phiên khác lên remote đúng vì thế.
- **Đừng dùng ⑵(a) để tạo file ngoài `docs/adr/` và `docs/briefs/`.** Miễn khoá ở đây dựa trên
  một tính chất hẹp — file mới, tên do người cấp số quyết. Thư mục khác không có tính chất đó.

## Trạng thái

Proposed
