---
status: Accepted
adr: 0017
date: 2026-09-07
deciders: Đức
supersedes: 0004
---

# ADR-0017 — Hai vai Assistant song song, thay thế mô hình một cửa của ADR-0004

## Bối cảnh

Đức chốt 07/09: *"tôi muốn bạn kiến trúc sao cho phiên extension develop có thể chạy song song
với AI assistant, thay vì khóa cứng … không ai phải chờ ai"*, và sau đó: *"tôi muốn reasoning để
tái xây dựng lại kiến trúc 2 AI Assistant và thực thi nó trước, tất cả các open task ko phải ưu
tiên số một."*

**[ADR-0004](0004-mot-cua-assistant-re-nhanh-va-giu-bao-cao-song.md) chốt điều ngược lại, và nó
chốt bằng một phép đo.** Đo 04–05/09, 18 lane chạm repo:

| Nhóm | Lane | Commit | Số lần Đức bị hỏi |
|---|---|---|---|
| Executor do phiên điều phối tạo | 9 | 46 | **0** |
| Phiên Đức mở tay | 6 | 25 | **chặn nhau 3 lần/ngày, lần nào cũng Đức vào gỡ** |
| Phiên điều phối | 1 | 44 | — |

**Đo lại 07/09 tái lập đúng kết quả đó.** Ba lần phiên điều phối phải nhờ Đức dán một dòng, cả
ba đều là khoá của chat Đức mở tay: một chat giữ `_docs` bốn giờ, một chat **đã tắt** mà còn cầm
khoá ba giờ. Còn sáu lane phiên điều phối tự giao thì hỏi Đức **0 câu** về khoá.

Nên ADR này **không** bác phép đo cũ. Nó nhận rằng phép đo đó chỉ ra **cái ngưỡng phải vượt**, và
ADR-0004 đã viết ngưỡng đó bằng đúng một câu:

> *"Bảng quyền chặn đúng, nhưng nó **chỉ chặn được, không quyết hộ ai nhường ai** — nên nhiều cửa
> sổ song song làm mọi người cùng chậm, và người phải phân xử là Đức."*

**Đó là yêu cầu chịu tải của cả kiến trúc này.** Hai vai cần cơ chế **quyết ai nhường**, không
phải thêm một cơ chế chặn. Không có nó thì mô hình hai vai tái lập "3 lần chặn một ngày, Đức phân
xử", và ta chỉ đổi tên vấn đề.

### Ba phát hiện đo được trong lượt thiết kế, và cả ba đổi thiết kế

**⑴ `HARD ROLE FIREWALL` chưa bao giờ ngăn được một lượt ghi.**
`tests/role-firewall-smoke.mjs` (288 dòng, 13/13 xanh) đọc **ba file Markdown** — `ORCHESTRATOR.md`
· `AGENTS.md` · `PROMPTS.md` — rồi kiểm frontmatter, câu cấm và chuỗi năm mục. Nó là **bộ kiểm tài
liệu**, không phải lớp chặn ghi. Kiểm kê đúng của hệ hiện tại:

| Tầng | Đang có |
|---|---|
| Hướng dẫn hành vi | ✅ văn xuôi, cộng bộ kiểm rằng văn xuôi còn nguyên |
| Phát hiện vi phạm | ✅ **một phần** — bảng khoá + nhãn `Lane:` + phép kiểm K2, **sau khi đã ghi** |
| Ngăn ghi thực sự | ❌ **không có gì** |

Hệ quả: đổi mô hình vai **rẻ** (không có lớp chặn runtime nào phải tháo), nhưng cũng nghĩa là
**firewall chạy được nhờ sự tự nguyện của MỘT bên duy nhất**. Thiết kế hai vai không được giả
định nó đã hoạt động.

**⑵ Bảng quyền đã lệch giữa hai bản với CHỈ MỘT checkout.**
`state-check` bắt được 07/09: khoá `_code` **trên đĩa trống**, trên `origin/main` **còn chủ** — lane
trả khoá sau khi đẩy, nên chính lượt trả khoá chưa được công bố. Với **hai** checkout, lệch này
thành chuyện thường trực, không phải ngoại lệ.

**⑶ Chỗ tranh chấp thật không nằm ở "hai bên muốn ghi một file".**
Trong 101 commit chạm một gói, chỉ **2** cũng chạm vùng gốc và **0** chạm `docs/`. Ba lần bị chặn
thật trong ngày đều là: cổng chung đỏ vì việc lane khác · `safe-push` cuốn commit lane khác · công
cụ lỗi giữa lượt sửa của lane khác. **Không lần nào là xung đột cùng file.**

Nhưng **đừng đọc ⑶ thành "khoá dư thừa"** — không va chạm có thể chính là vì khoá đã ngăn. Muốn
kết luận phải đo **các lượt ghi BỊ NGĂN**, và phải phân loại từng lượt: xung đột cùng file · phụ
thuộc hành vi (A sửa hàm, B sửa chỗ gọi) · chặn quá rộng. Chưa ai ghi dữ liệu đó, nên câu hỏi này
**để mở**. Thêm nữa, những lần AI thấy có chủ rồi **tự tránh** thì không xuất hiện trong bất kỳ
log từ chối nào.

## Quyết định

**Hai vai Assistant song song, mỗi vai tự thực thi trong phạm vi của mình.**
Cấu trúc bốn lớp: **hai vai → hai môi trường làm việc → một nguồn điều phối → một đường tích hợp
có kiểm tra.** Giao tiếp và tiếp quản nối vào cấu trúc đó.

### ⑴ Hai vai, phân theo TRÁCH NHIỆM rồi mới ánh xạ xuống đường dẫn

| | Assistant **HỆ THỐNG** | Assistant **SẢN PHẨM** |
|---|---|---|
| Chịu trách nhiệm | bộ khung, công cụ, môi trường, năng lực vận hành của cả đội | kế hoạch, phát triển, debug, nghiệm thu sản phẩm |
| Sở hữu | cổng kiểm, bộ sinh, bảng, luật chung, hạ tầng đa phiên | mã sản phẩm, **và tài liệu yêu cầu + kiến trúc của sản phẩm** |
| Viết luật chung | **có** | đề xuất qua ADR |

**Thứ tự "trách nhiệm trước, đường dẫn sau" là phần của quyết định.** Vẽ ranh giới bằng thư mục
(`docs/` cho Hệ thống, `workers/` cho Sản phẩm) là sai: tài liệu yêu cầu và kiến trúc sản phẩm
phải do Sản phẩm sở hữu, nếu không Hệ thống lại thành **cửa bắt buộc cho mọi lượt sửa tài liệu** —
đúng cái cửa ADR này tồn tại để phá.

### ⑵ Hai môi trường làm việc

Mỗi vai một checkout riêng. Lý do: **checkout chung thử được giao tiếp nhưng không chứng minh được
thực thi độc lập** — mà độc lập chính là điều kiến trúc này tồn tại để đạt. Thử trên checkout chung
là chứng minh sai câu hỏi.

**Checkout riêng KHÔNG phải sandbox.** Nó giảm nhiễu chéo do vô tình; nó **không** ngăn một vai
truy cập checkout của vai kia, và nó **không** tự chữa cổng chung đỏ sau tích hợp. Ai đọc ADR này
mà tưởng nó là ranh giới cưỡng chế thì đã đọc sai.

### ⑶ Một nguồn điều phối, và nó là SỔ SỰ KIỆN CHỈ THÊM

Nguồn điều phối phải trả lời được bốn câu: **quyền hiện hành của ai · ai được cập nhật và cập nhật
kiểu gì · mỗi nhiệm vụ gắn với vai/phiên/checkout/thế hệ nào · không đọc được nguồn thì việc gì
phải dừng.**

**Bảng quyền dạng bảng-sửa-được không trả lời được câu thứ hai.** `claim.mjs` hiện **đọc-sửa-ghi**
(2 chỗ), và chính hình dạng đó đã gây ra một quyền **bị ghi đè im lặng** ngày 02/09 cùng vụ lệch
đĩa-vs-remote ngày 07/09. Với hai checkout, hai lượt cập nhật ghi đè nhau là chuyện sẽ xảy ra.

**Nên nguồn điều phối đổi hình dạng: một sổ CHỈ THÊM các sự kiện quyền** (nhận · trả · thu hồi ·
đổi ưu tiên). Quyền hiện hành **suy ra bằng cách đọc gộp sổ**, không lưu sẵn.

Repo này **đã tự phát hiện ra nguyên lý đó rồi và chưa áp cho bảng quyền**: `HANDOFF.md`,
`BACKLOG.md`, `IDEAS.md` được miễn khoá **đúng vì thêm dòng ở cuối thì không bao giờ đụng nhau**, và
mọi artifact máy sinh đều **suy hoàn toàn từ HEAD** thay vì lưu sẵn. Hai lượt thêm không bao giờ
ghi đè nhau — đó là cùng một khám phá, áp vào chỗ đắt nhất còn lại.

**Ưu tiên đi cùng sổ đó, không thành một file Đức phải tự sửa.** Đức quyết ưu tiên; **lưu và phân
phối quyết định là việc của hệ thống.** Một tên file không được thành cửa xin phép mới.

### ⑷ Một đường tích hợp có kiểm tra — và ĐÂY là chỗ duy nhất được NGĂN

Mọi chỗ khác: **phát hiện**. Chỗ này: **từ chối trước khi ghi vào trạng thái chung**.

Lý do là một lỗ cụ thể của phương án "chỉ phát hiện": phiên A giữ thế hệ 7, bị thay bằng B ở thế hệ
8. A quay lại, **ghi vào vùng chung rồi mới chạy cổng**. Cổng đỏ là đúng — nhưng **thay đổi của B
có thể đã mất**. Kiểm sau khi ghi không bảo vệ được dữ liệu đã bị ghi đè.

Nên: **A được phép tiếp tục làm trong checkout riêng của nó, nhưng đường tích hợp TỪ CHỐI mọi kết
quả mang quyền cũ.** Quyền mang **số thế hệ**; thu hồi thì tăng số; kết quả mang số cũ bị chặn tại
cửa tích hợp kèm câu *"khoá của bạn đã bị thu hồi lúc X, lý do Y"* — để phiên vừa mất quyền đọc
được lý do, vì nó chỉ đọc thông báo chứ không chạy lệnh của người thu hồi.

**Tài nguyên dùng chung khác — Chrome profile, Bridge, debugger, thư mục đầu ra — không được đường
tích hợp bảo vệ.** Chúng cần cách phối hợp riêng, và ADR này **không** giải chúng. Nói ra để không
ai tưởng đã xong.

### ⑸ Luật nhường, ba quyết định tách rời

1. **Quyền ghi** theo trách nhiệm đã phân ở ⑴.
2. **Thứ tự xử lý** theo ưu tiên Đức giao, đọc từ nguồn ở ⑶ — **không theo tên vai**. Một luật kiểu
   *"sản phẩm luôn thắng"* mâu thuẫn ngay với chỉ thị hiện hành của Đức, vốn xếp việc kiến trúc
   **trên** việc sản phẩm.
3. **Chuyển quyền chỉ tại điểm bàn giao an toàn** — không giật quyền giữa thao tác.

Bốn ca cụ thể:

- Sản phẩm cần sửa hạ tầng → **gửi yêu cầu** cho Hệ thống, không tự lấy vùng.
- Việc ưu tiên cao đến khi Hệ thống đang ghi → Hệ thống **bàn giao tại điểm an toàn**.
- Hai việc cùng ưu tiên → theo thứ tự nhận, **có cơ chế chống một việc chờ mãi**.
- Phiên im lặng → **không suy ra đã chết**. Thu hồi được, nhưng phải qua cửa ⑷.

## Hệ quả

**Được, và đo được:** Sản phẩm không đọc ~108 KB luật quản trị nữa, dùng ngân sách ngữ cảnh cho
sản phẩm. Không ai chờ một cửa duy nhất viết đề bài.

**KHÔNG được — nói rõ để khỏi kỳ vọng sai:** *không* nhiều lượt nghiệm thu live hơn. Ngày 07/09 có
**9 mục chờ tay Đức**; chỗ nghẽn chịu tải là **tay Đức**, không phải vai hệ thống. Kiến trúc này
mua **thông lượng suy nghĩ**, không mua **thông lượng nghiệm thu**.

**Mất, ba cái, đều thật:**

- **Hai checkout thì hai vai trôi dạt được**, và tích hợp thành một việc mới — tức hạ tầng mới, đúng
  thứ Đức vừa bảo cắt. ADR này trả giá đó bằng cách bắt khai **luật tích hợp và chỗ ghim phiên bản**
  ngay trong thiết kế, không để nó thành việc phát sinh.
- **Chia vai làm mất năng lực đối chiếu ngang.** Ngày 07/09 có **chín** con số sai bị bắt, và cả
  chín bị bắt vì **một** cái đầu đọc ngang rồi thấy chúng không khớp — năm con trong đó là số của
  chính phiên điều phối. Chia đôi thì mất năng lực đó. Và **đối chiếu bằng cách xem hai lần cùng
  một phép đo thì vô dụng**: hai bảng cùng đọc một nguồn sai vẫn khớp nhau hoàn hảo. Thứ thật sự
  bắt được chín con số ấy là **đo lại bằng một ĐƯỜNG KHÁC**.
- **`ORCHESTRATOR.md` 568 dòng phải thành hai hồ sơ vai, và tổng phải NHỎ HƠN 568.** Giới hạn "một
  luật vào thì một luật ra" (`AGENTS.md` mục 3) áp cho chính lượt này. Hai vai mà tổng luật tăng
  thì ta nhân đôi đúng cái vừa đo là gánh nặng: **2.003 dòng luật-là-chữ cho 28 chốt máy**.

## Nghiệm thu — bốn tình huống, và cả bốn đã xảy ra thật ngày 07/09

Bản đầu phải chứng minh **một vòng phối hợp trọn vẹn**, không phải "có thêm hai hồ sơ vai".

1. **Sản phẩm cần một năng lực hệ thống chưa có** → gửi yêu cầu → Hệ thống nhận → Sản phẩm làm tiếp
   phần độc lập → Hệ thống trả → Sản phẩm kiểm lại phần bị ảnh hưởng.
   *(Đã xảy ra: bộ sinh lỗi cú pháp chặn lane khác sinh artifact.)*
2. **Một vai cầm quyền rồi im** → luật nhường tự quyết, **Đức không phân xử lần nào**.
   *(Đã xảy ra: bốn giờ, Đức phải vào ba lần. Đây là tình huống CHỊU TẢI.)*
3. **Một phiên mất giữa chừng** → phiên mới tiếp được **vai và việc đang dở**, gồm cả yêu cầu chưa
   xử lý và bằng chứng — không chỉ mô tả vai.
   *(Đã xảy ra: một lane chết vì hết hạn mức; một chat tắt còn cầm khoá ba giờ.)*
4. **Thay đổi hệ thống làm cổng đỏ cho vai kia** → phân biệt được lỗi đã commit với nhiễm từ cây làm
   việc. **Cơ chế này ĐÃ CÓ** (`chayLaiTrenHead()` + `quyTrachNhiemSuite()` trong
   `scripts/session-check.mjs`) — đừng viết lại.

Tình huống ② là tình huống chịu tải: ba cái kia đã có cơ chế một phần, ② thì **chưa có gì**, và nó
chính là câu ADR-0004 để lại.

## Chỗ dễ làm sai

- **Đừng để hai mô hình cùng sống.** ADR này thay thế ADR-0004; repo đã trả giá cho việc một luật
  nằm ở hai chỗ trả hai câu khác nhau (02/09).
- **Đừng sửa `role-firewall-smoke.mjs` trước khi luật thay thế được viết ra.** Luật vàng 3 cấm nới
  phép ghim cho dễ. Firewall **không bị bỏ** — nó đổi từ *"vai điều phối không code"* thành *"mỗi vai
  không ghi vào vùng của vai kia"*. Vẫn là một tường, dựng ở chỗ khác.
- **Đừng gọi checkout riêng là isolation.** Xem ⑵.
- **Đừng dựng hệ đo mới trước khi kiến trúc chạy.** Đo **cùng công việc**, bằng hồ sơ đã có.
- **Một vai đang rảnh là trạng thái bình thường.** Đầu ra không cần hỗ trợ thì đừng tạo việc cho vai
  kia để đủ hình thức "hai Assistant".

## Trạng thái

Accepted
