# PROMPTS.md — câu để Đức dán, cho bất kỳ AI nào

> Đức mở file này, chép một câu, dán cho AI đang mở. **Không phải nhớ lệnh, không phải nhớ tên file.**
>
> **Luật của chính file này:** mỗi câu ở đây phải chạy được với **cả ba AI** — Claude, Codex,
> Antigravity. Nên câu nào cũng chỉ nói **mục tiêu**, không nói tên công cụ. Phần thực thi là
> lệnh `node scripts/…`, và lệnh thì ai cũng chạy được.
>
> Câu nào chỉ một AI làm được thì **không được nằm ở đây** — nó phải nằm ở mục "Việc chỉ Claude
> làm được" ở cuối, và phải kèm cách làm thay bằng AI khác.

---

## Ba AI làm được gì — đo ngày 2026-09-03, không phỏng đoán

| | Claude | Codex | Antigravity |
|---|---|---|---|
| Đọc luật `AGENTS.md` lúc mở phiên | tự đọc qua `CLAUDE.md` | tự đọc | **cần Đức dán một câu mở màn** |
| Chạy lệnh `node scripts/…` | có | có | có |
| Nhận / trả quyền vùng | có | có | có |
| Chạy cổng đóng phiên, push | có | có | có |
| Sinh lại bảng trạng thái | có | có | có |
| **Đăng bảng lên claude.ai** | **chỉ Claude** | không | không |

**Cách đo:** `AGENTS.md` gốc có **0 chỗ** giả định công cụ riêng của Claude — mọi chỉ dẫn vận hành
đều là `node scripts/*.mjs`. Hai chỗ tìm kiếm bắt được trong sổ tay vận hành đều là dương tính giả
(`ARTIFACT PERSISTENCE FAILED` là **mã lỗi của trang Gemini**, không phải công cụ Claude).

**Hệ quả quan trọng:** việc đăng bảng lên claude.ai từng là điểm phụ thuộc Claude duy nhất. Từ
03/09 bảng có bản trong repo là `DASHBOARD-Chrome-Extension-AI-Agentic.html`, nên **bất kỳ AI nào cũng sinh lại rồi commit
được**, và Đức mở file trực tiếp. Đăng lên claude.ai giờ chỉ là tiện thêm, không còn là đường duy nhất.

---

## 0. Mở một phiên ĐIỀU PHỐI

**Dùng khi nào:** Đức muốn một AI cầm toàn cảnh để **Đức hỏi gì nó trả lời được ngay** — đang
có gì, một việc tới đâu, đang block gì, ai giữ vùng nào. Đây là phiên Đức nói chuyện với,
không phải phiên đi code. **Đức mở topic, nó không tự mở.**

```text
Bạn là phiên điều phối repo này. Đọc AGENTS.md ở gốc, rồi docs/protocols/ORCHESTRATOR.md,
rồi chạy bản đồ việc và cổng nhất quán trạng thái để tự kiểm. Xong thì nói lại cho tôi
đúng một câu: trạng thái có khớp không, lệch ở đâu nếu có. Rồi CHỜ TÔI HỎI.

Tôi là người mở topic, bạn không tự mở. Đừng tự đề xuất "việc kế", đừng kết lượt bằng
câu hỏi tôi "làm gì tiếp?", đừng kéo tôi sang việc tôi chưa hỏi. Tôi hỏi gì thì trả lời
đúng cái đó. Không chắc thì trả lời UNKNOWN, đừng đoán.
Sự thật trong repo đổi thì bạn sửa nguồn rồi sinh lại bảng — đừng ghi câu trả lời vào bảng.

Suốt phiên này bạn KHÔNG code, KHÔNG debug, KHÔNG đề xuất bản vá kỹ thuật — kể cả khi
tôi bảo làm; lúc đó hãy nói ra rằng việc này thuộc executor, viết brief rồi giao đi.
Khi tôi dán log hay báo cáo kỹ thuật vào, chỉ trích đúng năm mục rồi DỪNG:
DONE → STATE CHANGE → BLOCKER → HUMAN DECISION → NEXT WORK.
BLOCKER ghi triệu chứng thôi, đừng chẩn đoán nguyên nhân.
```

**AI sẽ chạy:** `node scripts/what-next.mjs` · `node scripts/claim.mjs --list` ·
`node scripts/state-check.mjs`
**Xong khi nào:** AI báo trạng thái khớp (hoặc nói đúng chỗ lệch) rồi **dừng, chờ Đức hỏi** —
không tự đưa ra việc kế.

> Bản đồ việc **chỉ đọc**, không đòi khoá nào — nên câu này chạy được kể cả lúc mọi vùng
> đang có chủ, và không chặn phiên nào đang làm.

> **Vì sao câu dán không còn bắt AI tự báo "việc kế":** Đức chốt 04/09. Câu cũ bắt AI nói bốn
> điều, trong đó có *"nên làm gì tiếp và vì sao là việc đó"* — nên mỗi lượt nó tự mở một topic
> và kéo Đức sang việc Đức chưa hỏi. Đó là lấy attention của đúng người mà vai này tồn tại để
> giữ rảnh. Đức vẫn hỏi được "làm gì tiếp?" bất cứ lúc nào, và sẽ nhận **một** việc kèm lý do
> — nhưng đó là câu Đức mở, không phải việc AI tự làm. Luật đầy đủ: mục 0b của
> `docs/protocols/ORCHESTRATOR.md`.

> **Vì sao câu dán phải nói cả luật năm mục:** ngày 04/09 phiên điều phối trượt sang debug
> extension đúng lúc Đức dán một báo cáo kỹ thuật vào. Câu dán cũ chỉ nói "không phải phiên
> đi code" — nó nói vai, nhưng không nói **phải xử lý thế nào** khi bối cảnh kỹ thuật ập
> tới. Luật đầy đủ ở mục 4 của `docs/protocols/ORCHESTRATOR.md`.

**Muốn xem thẳng bản đồ, không cần AI diễn giải:**

```text
Cho tôi xem bản đồ việc.
```

---

## 0b. Giao nhiều việc chạy cùng lúc

**Dùng khi nào:** Đức muốn nhiều AI chạy song song mà không sợ chúng giẫm chân nhau.

```text
Chia việc cho tôi thành các luồng chạy song song được. Mỗi luồng nói rõ: làm gì · vùng
nào · câu tôi dán cho AI của luồng đó. Luồng nào không thật sự song song được thì nói
thẳng là phải xếp hàng, đừng hứa.
```

**AI sẽ chạy:** `node scripts/what-next.mjs` (mục A = số luồng an toàn tối đa)
**Xong khi nào:** mỗi luồng có một vùng riêng, và không hai luồng nào cùng một vùng.

> Luật chỉ một câu: **hai việc song song được khi và chỉ khi chúng thuộc hai khoá khác
> nhau, và cả hai khoá đang trống.** Số luồng ở mục A là trần thật — hứa nhiều hơn là hứa
> hai AI cùng ghi một chỗ, và chuyện đó đã xảy ra ngày 25–26/08.

---

## 1. Mở phiên

**Dùng khi nào:** mỗi lần bắt đầu nói chuyện với một AI trong repo này.

```text
Đọc AGENTS.md ở gốc repo trước khi làm gì. Rồi đọc HANDOFF.md của phần bạn sắp đụng
(phần cuối file là trạng thái mới nhất). Nói lại cho tôi trong ba câu: bạn hiểu mình
được làm gì, không được làm gì, và vùng nào đang có chủ khác.
```

**AI sẽ chạy:** `node scripts/claim.mjs --list`
**Xong khi nào:** AI nói được tên vùng nó sắp làm, và vùng đó đang trống hay có chủ.

> Với **Antigravity** thì câu này là **bắt buộc** — nó chưa chứng minh được là tự nạp luật lúc mở
> phiên. Ba giây, và nếu nó vốn tự nạp thì câu này chỉ thừa vô hại.

---

## 2. Làm mới bảng trạng thái

**Dùng khi nào:** bảng bật dải đỏ ở đầu trang, hoặc Đức muốn xem số mới nhất.

```text
Làm mới bảng trạng thái: sinh lại rồi commit.
```

**AI sẽ chạy:** `node scripts/build-overview.mjs`
**Xong khi nào:** `DASHBOARD-Chrome-Extension-AI-Agentic.html` được commit, và mốc ngày ở đầu trang là hôm nay.

**Muốn xem thử mà không chạm repo:**

```text
Sinh bảng trạng thái ra một file tạm cho tôi xem, đừng commit.
```

---

## 3. Nhận hoặc trả quyền một vùng

**Dùng khi nào:** AI báo "vùng này có chủ khác" và Đức muốn xử lý.

**Xem ai đang giữ gì:**

```text
Cho tôi xem bảng quyền: vùng nào đang có chủ, ai giữ, giữ bao lâu rồi.
```

**Nhận một vùng:**

```text
Nhận quyền vùng <tên vùng>, ghi chú việc bạn sắp làm bằng một câu.
```

**Trả lại:**

```text
Xong việc ở vùng <tên vùng> thì trả quyền lại.
```

**AI sẽ chạy:** `node scripts/claim.mjs --list` · `--take <khoá> --as <phiên> --task "…"` · `--release`
**Xong khi nào:** lệnh in `đã nhận:` hoặc `đã trả:`.

> **Vùng có chủ khác thì AI KHÔNG được tự lấy** — lệnh sẽ từ chối, và đó là cố ý. Muốn lấy thì
> Đức chốt. Nhưng thử cách rẻ trước: nhờ AI **nhắn cho phiên đang giữ** hỏi khi nào trả. Ngày
> 03/09 làm thế và họ trả ngay, không phải giành.

---

## 4. Đóng phiên và đẩy lên GitHub

**Dùng khi nào:** AI báo đã làm xong một việc.

```text
Đóng phiên: chạy cổng kiểm. Đỏ thì chưa xong — sửa rồi chạy lại. Xanh toàn bộ thì
ghi một dòng Log vào HANDOFF rồi push. Đừng báo xong khi cổng còn đỏ.
```

**AI sẽ chạy:** `node scripts/session-check.mjs --as <phiên>` rồi `node scripts/safe-push.mjs --as <phiên>`
**Xong khi nào:** cổng in `XANH TOÀN BỘ`, và push in số commit đã đẩy.

**Nếu AI báo push bị từ chối vì sẽ cuốn theo việc phiên khác** — đó là đúng, không phải lỗi. Đức
chốt thì dán:

```text
Tôi đồng ý đẩy kèm commit của phiên kia. Push lại kèm cờ carry.
```

> `carry` **không** commit phần ai đang sửa. Việc chưa commit nằm nguyên trên máy. Nó chỉ có
> nghĩa: commit mà phiên kia **đã tự tay tạo** sẽ lên GitHub cùng, vì git đẩy cả nhánh chứ không
> đẩy lẻ từng commit.

**Kiểm chắc là đã lên thật** (đừng tin dòng "xong"):

```text
Hỏi thẳng GitHub xem commit của bạn đã lên chưa, đừng tin con trỏ trên máy.
```

---

## 5. Đức có một ý tưởng

**Dùng khi nào:** bất cứ lúc nào Đức nghĩ ra gì, kể cả khi còn mơ hồ.

```text
Tôi có một ý tưởng: <viết tự do, một câu cũng được>.
Ghi vào sổ ý tưởng cho tôi. Nếu còn thiếu thông tin thì hỏi tôi TỐI ĐA 3 câu ngắn.
```

**Xong khi nào:** ý tưởng có mã (Y-xx), có bậc, có việc kế, và hiện lên tab Ý tưởng của bảng.

---

## 6. Đức thấy một chỗ viết chưa rõ trên bảng

**Dùng khi nào:** Đức mở bảng và một mô tả đọc không hiểu.

**Cách nhanh nhất — không cần chép prompt:** bôi đen dòng đó ngay trên bảng rồi **để lại bình
luận**. Bình luận gắn đúng vào khối đó nên AI biết chính xác Đức đang nói mục nào.

**Nếu muốn dán câu:**

```text
Trên bảng trạng thái, mục <tên mục> viết chưa rõ. Sửa lại cho tôi đọc hiểu.
Nhớ: bảng đọc chữ từ file trong repo, nên phải sửa file rồi sinh lại bảng —
đừng sửa vào bảng.
```

**Xong khi nào:** file nguồn đã sửa, bảng sinh lại, và chữ mới hiện lên.

---

## 7. Nhờ một AI audit việc của AI khác

**Dùng khi nào:** một AI báo xong một việc quan trọng, và Đức muốn kiểm chéo.

```text
Kiểm chứng độc lập việc vừa xong. Đừng tin báo cáo — tự chạy lại phép kiểm, tự đọc
lại thay đổi. Trả lời ba câu: có phép kiểm nào ghim bản sửa này không · phép kiểm đó
có thật sự dựng được ca hỏng không · có lớp bảo vệ nào bị gỡ để test xanh không.
```

**Xong khi nào:** AI trả lời được cả ba câu, kèm bằng chứng chạy thật.

> Câu thứ hai là câu đáng giá nhất. Ngày 03/09 tìm được **ba** phép kiểm không dựng được ca hỏng
> — chúng xanh cả khi bug còn nguyên.

---

## 8. Ghi lại một quyết định Đức vừa chốt

**Dùng khi nào:** Đức vừa chốt một điều mà phiên sau cần biết.

```text
Tôi chốt: <quyết định>. Ghi lại thành một bản ghi quyết định, nêu rõ bối cảnh, quyết
định, và hệ quả. Đã chốt thì không sửa nữa, chỉ thay bằng bản mới.
```

**Xong khi nào:** có một file quyết định mới, và nó hiện ở tab Nhật ký của bảng.

---

## 9. Đức nghi trạng thái đang lệch — "cái AI vừa nói có thật không?"

**Dùng khi nào:** một AI vừa báo "đã trả khoá", "đã xong", "đã cập nhật bảng" — và Đức muốn
biết điều đó có đúng ở chỗ NGƯỜI KHÁC nhìn thấy hay không, chứ không chỉ đúng trên máy nó.

```text
Trước khi tôi tin, hãy đối chiếu trạng thái bạn vừa báo với nguồn có thẩm quyền, rồi
nói lại cho tôi đúng một trong ba câu: mọi thứ khớp · lệch ở những chỗ này (kể ra
từng chỗ, bên nào nói gì) · không đối chiếu được vì lý do gì. Không đối chiếu được
thì đừng nói là khớp. Và đừng tự sửa cho khớp — báo cho tôi trước.
```

**AI sẽ chạy:** `node scripts/state-check.mjs --as <tên-phiên>`
**Xong khi nào:** AI trả lời đúng một trong ba câu, và nếu lệch thì kể ra **từng chỗ**,
không phải một con số.

> Vì sao có mục này: ngày 04/09 một phiên báo "đã trả ba khoá". Trên máy đúng là trống — nhưng
> lượt trả **chưa được đẩy lên**, nên chỗ mà GPT và các AI khác nhìn vào vẫn ghi là đang bị giữ.
> **Đức là người phát hiện.** Câu này để lần sau máy phát hiện trước.

> Lệnh đó **chỉ đọc, không đòi khoá nào**, và **không tự sửa gì** — nó in ra lệnh sửa để
> người chạy tự quyết. Cố ý: một cổng tự dọn dẹp bằng chứng của chính thứ nó phải phát hiện
> là cổng vô dụng.

---

## Việc chỉ Claude làm được — và cách làm thay

| Việc | Vì sao | Làm thay bằng gì |
|---|---|---|
| Đăng bảng lên claude.ai | Codex và Antigravity không có công cụ đó | Bất kỳ AI nào chạy `node scripts/build-overview.mjs` rồi commit; Đức mở `DASHBOARD-Chrome-Extension-AI-Agentic.html` trực tiếp |
| Trả lời bình luận trên bảng | cùng lý do | Đức chép nội dung bình luận vào chat của AI đang mở |

Đúng hai việc. Mọi thứ khác trong repo này là lệnh dòng, và lệnh thì cả ba AI chạy như nhau.
