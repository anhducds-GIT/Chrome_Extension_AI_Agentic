# Sổ nợ hạ tầng repo — việc AI tìm ra khi đang làm

> **Đây không phải `IDEAS.md`.** Hai quyển, hai chủ, Đức chốt ngày 2026-09-06:
>
> | Quyển | Của ai | Ghi gì |
> |---|---|---|
> | `IDEAS.md` | **Đức** | ý tưởng Đức nêu — hướng đi, thứ muốn có |
> | `BACKLOG.md` (file này) | **AI** | nợ hạ tầng AI vấp phải khi làm: cổng kiểm, bộ sinh, bảng quyền, script |
>
> Vì sao tách: đo ngày 06/09, `IDEAS.md` có 19 mục thì **14 là AI tự ghi** — ý tưởng của Đức
> bị lấn. Và không phải AI chọn sai chỗ: gốc repo **không có sổ nợ nào**, còn `IDEAS.md` là
> quyển duy nhất ở gốc ghi được **không cần xin khoá**. Nó là chỗ duy nhất đi được.
> File này là chỗ đúng, và nó **cũng được miễn khoá** — nếu không thì AI sẽ lách về `IDEAS.md`
> và bệnh chỉ đổi chỗ. Đề bài: [`docs/briefs/BRIEF-TACH-SO-Y-TUONG-01.md`](docs/briefs/BRIEF-TACH-SO-Y-TUONG-01.md).

## Luật của sổ — đọc hết trước khi ghi

### 1. Cửa vào và cửa ra đều là THÊM DÒNG Ở CUỐI

Sổ này là một **cuốn sổ cái**, không phải một bảng để sửa. Mở một mục: thêm khối mới ở **cuối
file**. Đóng một mục: thêm **một dòng** ở cuối file, không sửa khối cũ.

Vì sao quan trọng: file này nằm trong `append_only_exempt` của `.repo-structure.json`, nên
**thêm dòng ở cuối thì miễn khoá `_root`**, còn **sửa dòng cũ thì không**. Nếu đóng một mục mà
phải sửa khối cũ thì cửa ra đắt hơn cửa vào nhiều lần — và đo ngày 06/09 ở `IDEAS.md` cho thấy
kết quả của chuyện đó: **cửa vào dùng 20 lần, cửa ra dùng 1 lần**. Sổ cái làm hai cửa bằng giá.

### 2. Mở một mục thì PHẢI khai sẵn ĐÓNG KHI NÀO

Trường `đóng khi:` là **bắt buộc**, và cổng kiểm đếm nó. Không khai được điều kiện đóng thì mục
đó **chưa đủ chín để ghi vào sổ** — nó là một cảm giác, không phải một việc.

Điều kiện đóng phải thuộc **một trong hai dạng**, để người sau đọc là biết ngay ai mở được cửa:

| Dạng | Viết thế nào | Ai đóng được |
|---|---|---|
| `lệnh:` | `đóng khi: lệnh: node tests/foo.mjs xanh` | bất kỳ AI nào — chạy lệnh, xanh là đóng |
| `đức:` | `đóng khi: đức: chốt có tách khối AUTO không` | chỉ Đức, bằng một câu |

Đừng viết `đóng khi: khi nào xong` — đó là không khai. Cổng chỉ đếm được **có trường hay
không**; hai dạng trên là để **mắt người** đọc ra được ai mở cửa. Cả hai lớp đều cần.

### 3. Hình dạng một mục — chép nguyên khối này rồi điền

```
## N-xx · <một câu nói vấn đề, không nói giải pháp>

- **đóng khi:** lệnh: <lệnh chạy được>        (hoặc)  đức: <câu Đức phải chốt>
- **mở:** 2026-09-06 · lane `<tên-lane>`
- **vùng:** `_code` / `_root` / `_docs` / `workers/<gói>`
- **vì sao:** <bằng chứng thật — số đo, ca hỏng, đường dẫn. Đừng đoán.>
```

Số thứ tự `N-xx` lấy tiếp số lớn nhất đang có, không dùng lại số cũ.

### 4. Đóng một mục — một dòng ở cuối file

```
- **ĐÓNG N-xx** · 2026-09-07 · lane `<tên-lane>` · <bằng chứng: lệnh đã xanh, hoặc câu Đức chốt>
```

Không xoá khối cũ, không sửa khối cũ. Muốn biết mục nào còn mở thì lấy tập `N-xx` đã mở trừ đi
tập `N-xx` đã đóng — máy làm được, người đọc cũng làm được.

### 5. Cái gì KHÔNG ghi vào đây

- Ý tưởng của Đức → `IDEAS.md`.
- Nợ của **một gói worker** → `BACKLOG.md` của chính gói đó, không phải sổ này. Sổ này chỉ nhận
  nợ về **hạ tầng dùng chung**: `scripts/` · `tests/` · cổng kiểm · bộ sinh · bảng quyền · luật.
- Việc đã có nhà (brief, ADR, mục nợ của gói) → đừng chép lại. Chép là đẻ ra nguồn sự thật thứ hai.

### 6. Tự kiểm bằng máy

```bash
npm run test:backlog   # đếm mục N- và mục nào thiếu `đóng khi:`; thiếu là mã lỗi 1
npm test               # chuỗi suite gốc, có phép kiểm trên ở cuối
```

Cổng đóng phiên (`node scripts/session-check.mjs --as <phiên>`) chạy chuỗi `npm test` từng lệnh
một, nên **thiếu `đóng khi:` là cổng ĐỎ và không được báo xong.**

Phép kiểm chỉ soi mục `## N-`. **14 mục `## Y-` chuyển từ `IDEAS.md` được miễn** — chúng ra đời
trước luật này, và sửa chúng là sửa chữ của phiên khác (mục 1). Mục `Y-` nào được đụng tới lần
sau thì mới phải khai `đóng khi:`.

---

## Mục chuyển từ `IDEAS.md` — 2026-09-06, 14 mục, nguyên văn

> Dời **không sửa một chữ nào**, kể cả số hiệu `Y-nn`: các mục này trỏ chéo lẫn nhau và được
> `HANDOFF.md` nhắc tên. Đổi số là làm gãy mọi tham chiếu đó.

## Y-03 · Trường "Đức cần làm" trong hồ sơ trạng thái

- **bậc:** đang xây
- **nguồn:** phát hiện khi dựng bảng trạng thái 2026-09-02
- **chủ:** `claude-y03`
- **phạm vi:** hồ sơ trạng thái, bộ sinh, bản mẫu, phép kiểm. **Cấm** đụng gói
  `duc-auto-gg-flow-video` — phiên khác đang giữ.
- **việc kế:** GIAI ĐOẠN 2 — chuyển `human_action` thành **bắt buộc** cho đơn vị còn sống.
  **Điều kiện tiên quyết ĐÃ ĐỦ** (đo 04/09): 4/5 đơn vị đã khai, và cái duy nhất còn thiếu là
  `duc-auto-gemini/v0.1.0` — **bản đã nghỉ**, tức không thuộc diện "còn sống". Việc còn lại
  thuần tuý là bật bắt buộc trong lược đồ + phép kiểm; chủ `claude-y03` chốt thời điểm.

> **Bản 02/09 của dòng này nêu sai hai gói** (`duc-auto-gg-flow-video` và `duc-auto-chatgpt`)
> là "còn thiếu". Đo lại ngày 04/09: **cả hai đã khai**. Sửa sau khi audit độc lập chỉ ra rằng
> bảng đang bắt Đức chờ một chặn đã tự tan — mà Đức thì chỉ đọc bảng, không đọc lại từng hồ sơ.
- **vì sao:** Ba việc đang chờ Đức nhưng chữ đó nằm lẫn trong câu mô tả. Bảng không được đoán
  từ chữ (luật vàng 1), nên ô "Đức cần làm" bỏ trống — trong khi nó đúng là ô Đức cần nhất.
- **đã xong giai đoạn 1:** trường `human_action` có trong lược đồ và bản mẫu, ba đơn vị đã
  khai, bảng hiện đủ việc **và** thừa nhận số đơn vị chưa khai. Không thể bắt buộc ngay vì
  **không đòi hỏi được một trường mà người khai khác chưa có** — luật chung của mọi lần đổi
  lược đồ.
- **ghi minh bạch một va chạm quyền:** lúc tôi điền, `duc-auto-chatgpt` đang trống chủ (đã
  kiểm trước khi nhận). Giữa phiên, Đức giao gói đó cho `claude-surface-fix`. Nên commit của
  tôi có **một dòng** trong `STATUS.md` của gói họ. Tôi **cố ý không gỡ lại**: gỡ là đụng gói
  của họ lần thứ hai, cho một dòng dữ liệu vốn đúng. Ghi ra đây để phiên sau không tưởng là
  tôi lách luật.

## Y-05 · Viết lại chữ trong hồ sơ cho mắt Đức đọc

- **bậc:** đang xây
- **nguồn:** phát hiện khi dựng bảng trạng thái 2026-09-02
- **chủ:** `claude-y05`
- **phạm vi:** hồ sơ trạng thái của `_root` và `duc-auto-gemini`, cộng cổng kiểm cấu trúc.
  **Cấm** đụng `duc-auto-chatgpt` và `duc-auto-gg-flow-video` — phiên khác đang giữ.
- **việc kế:** **3 chỗ còn lại thuộc hai gói do phiên khác giữ** — chủ của chúng phải tự viết
  lại. B15 giờ tự nhắc mỗi lần họ chạy cổng, không cần ai đi dặn
- **đã xong:** thêm phép kiểm **B15** (mức cảnh báo) cưỡng chế luật vàng 5, và viết lại chữ
  của gemini v0.2.0. B15 tìm ra 4 chỗ vi phạm; còn 3
- **vì sao:** Đức mở bảng thấy *"CAN DUC RELOAD EXTENSION roi chay mot chuoi de do pacing_ms"*.
  Bảng chỉ hiện lại nguyên văn nguồn. **Luật vàng 5 đã quy định "chữ operator nhìn thấy:
  tiếng Việt"** — nên đây không phải yêu cầu mới, mà là một luật đang bị vi phạm. Bảng vừa
  làm nó lộ ra, vì trước giờ chưa ai đọc mấy trường đó bằng mắt người.

## Y-06 · Luật nói "dòng cuối", máy chỉ cần "có mặt"

- **bậc:** ý tưởng
- **nguồn:** bắt được 2026-09-04 khi phiên `claude-dashboard` tự vi phạm chính luật đó
- **việc kế:** cho bộ kiểm nhãn lane đòi **đúng dòng cuối**, kèm phép ghim dựng được ca hỏng:
  một commit có `Lane:` ở giữa lời commit thì phải ĐỎ. Cần Đức chốt trước khi sửa — nhãn lane
  là luật attribution, thuộc nhóm phải hỏi
- **phạm vi khi làm:** bộ kiểm nhãn trong `scripts/safe-push.mjs` + phép ghim của nó.
  **Cấm** sửa lịch sử commit cũ để làm đẹp — commit cũ nằm lẫn với commit của phiên khác,
  viết lại là viết lại việc của họ
- **vì sao:** luật mục 2 viết *"MỌI commit phải có **dòng cuối** `Lane: <tên-phiên>`"*, nhưng
  bộ kiểm chỉ tìm nhãn **có mặt ở đâu đó**. Nên một commit **qua được cổng mà vẫn sai luật**.
  Chuyện này không phải giả thuyết: ngày 04/09 tôi sửa lời commit để khai một việc, dán đoạn
  khai **vào sau** dòng `Lane:`, và nhãn thôi là dòng cuối. `safe-push` vẫn nhận; `git` thì
  **không đọc ra nhãn nữa** (`%(trailers:key=Lane)` trả rỗng).
- **và đây là chỗ đau thật:** nhãn lane sinh ra để `safe-push` biết commit nào của ai. Công cụ
  nào đọc nhãn bằng bộ phân tích trailer chuẩn của `git` sẽ **không thấy** commit đó thuộc về
  ai — tức đúng cái tình huống 26/08 mà nhãn được đặt ra để chặn: đoán sai chủ, rồi âm thầm
  cuốn việc người khác lên remote.
- **hai bản sao của một luật thì sẽ lệch nhau.** Luật ở `AGENTS.md` là chữ; luật ở bộ kiểm là
  mã. Chúng đã lệch. Vá bộ kiểm, đừng nới chữ.

> Quan sát về **giành khoá không dừng được người đang làm** KHÔNG ghi thành entry mới —
> nó thuộc [[Y-02]], vốn đã theo dõi "push cuốn theo nhau" và cuộc đua độ tươi artifact.
> Đức chốt 04/09: mở vòng thiết kế đó **sau khi** bảng trạng thái ổn định. Số đo để dành:
> khoá `_code` đổi chủ **ba lần trong dưới một tiếng** ngày 04/09, không lần nào bên bị lấy
> được thông báo, và lúc bị lấy vẫn có **6 file đang sửa dở** của chủ cũ nằm trong thư mục.

## Y-07 · Cổng đỏ giả vì suite chậm — độ tin của cổng, không phải lỗi của bảng

- **bậc:** ý tưởng
- **nguồn:** đo được 2026-09-04 khi cổng đỏ một lần mà không ai sai gì
- **việc kế:** giảm thời gian `tests/build-overview-smoke.mjs`, hoặc nới hạn giờ mỗi suite
  trong cổng — chọn đường nào là việc của executor sau khi đo, đừng chốt trước ở đây
- **phạm vi khi làm:** `scripts/build-overview.mjs` (chỗ gọi `collectModel`) và/hoặc phần đặt
  hạn giờ trong `scripts/session-check.mjs`. **Cấm** đụng nội dung phép kiểm của bảng — bảng
  đã qua audit độc lập PASS ngày 04/09 và **không mở lại chỉ vì cổng từng hết giờ**
- **vì sao:** ngày 04/09 cổng báo ĐỎ ở mục "Test xanh". Chạy lại suite đó riêng: **15 xanh,
  0 đỏ, 129 giây**. Tức đỏ vì **hết giờ dưới tải**, không phải vì code sai. Cùng lượt đó có
  `ETIMEDOUT` ở một bộ sinh khác — dấu hiệu máy đang chạy nhiều phiên song song.
- **đây mới là chỗ đau, không phải 129 giây:** một cổng **đỏ giả** dạy người ta bỏ qua màu đỏ.
  Cổng chỉ có giá trị khi đỏ luôn có nghĩa. Mất niềm tin vào cổng thì mọi luật cưỡng chế bằng
  cổng đều mất theo — mà repo này cưỡng chế gần như mọi thứ bằng cổng.
- **nguyên nhân đã biết, chưa vá:** `collectModel` chạy lại từ đầu mỗi lượt sinh (~9 giây),
  và suite gọi hơn mười lượt. Chữa bằng nhớ đệm. **Không tự vá trong luồng Dashboard** vì đó
  là mã dùng chung với chính cổng — bán kính rộng hơn, phải là việc riêng.
- **đo trước khi sửa:** đếm số lượt `collectModel` thật và hạn giờ mỗi suite mà cổng đang đặt.
  Con số trong ghi chú này là đo ngày 04/09 trên một máy đang tải; số trên máy rảnh sẽ khác.

## Y-08 · Cặp đối chiếu thứ tư cho `state-check`: `STATUS.md` ↔ Log của chính gói đó

- **bậc:** ý tưởng
- **nguồn:** brief `STATE-DRIFT-01` mục 1, ca số 2 — đo được 04/09
- **việc kế:** Đức chốt có làm không; làm thì viết brief riêng cho executor
- **vì sao:** brief `STATE-DRIFT-01` liệt kê HAI ca hỏng cùng họ, nhưng Đức cố ý chốt phạm vi
  hẹp còn BA cặp — nên `scripts/state-check.mjs` (đã xong 04/09) bắt được ca 1 (khoá trên máy
  ≠ trên `origin/main`) mà **không** bắt được ca 2: `STATUS.md` của gói ưu tiên #1 ghi F-14
  "chưa chứng minh" và F-26 "cần Đức chốt", trong khi Log của chính gói đó (lượt 18, 02/09)
  nói cả hai đã đóng. Bản đồ việc ở gốc repo đọc `STATUS.md` nên hiển thị sai theo.
- **vì sao chưa làm ngay:** hai cặp kia so **máy với máy** (file ↔ git), so được chính xác.
  Cặp này so **văn xuôi với văn xuôi** — Log là chữ người viết tự do, nên phép so sẽ phải dò
  theo tên mã việc, tức là hạng `[DÒ]`. Dò theo tên trong repo này đã cho kết luận sai bốn lần
  trong một ngày. Thêm một cặp hay báo oan vào một cổng đang tin được là cách nhanh nhất làm
  mất giá trị cả cổng — cùng lý lẽ với Y-07.
- **phạm vi khi làm:** `scripts/state-check.mjs` + `tests/state-check-smoke.mjs` (khoá `_code`).
  **Cấm** đụng ba cặp đã có, và cấm biến lệnh này thành siêu-auditor — ranh giới ở brief mục 3.

## Y-09 · Luật song song nói "hai khoá khác nhau = chạy song song được", nhưng bộ sinh làm hai khoá dính nhau

- **bậc:** ý tưởng
- **nguồn:** gặp thật 04/09, phiên `claude-dieu-phoi` — `safe-push` từ chối đúng luật
- **việc kế:** Đức chốt có làm không; làm thì viết brief riêng
- **vì sao:** hôm nay `_docs` (tôi, viết brief) và `_code` (executor, sửa bộ sinh) chạy song
  song — đúng luật, hai khoá khác nhau, không file nào chồng nhau. Nhưng `safe-push` của tôi
  bị **TỪ CHỐI**: `scripts/build-overview.mjs` đang sửa dở chưa commit, mà nó là thứ **phán xử**
  độ tươi của artifact, nên cổng coi kết quả sinh ra không đáng tin. Từ chối đó là ĐÚNG — không
  phải bug. Nhưng nó có nghĩa: **ai giữ khoá chứa bộ sinh thì chặn đường xuất bản của mọi khoá
  khác**, suốt thời gian họ chưa commit. Luật mục 1 không nói điều này ở đâu cả.
- **vì sao chưa làm ngay:** ba đường, cả ba đều có giá, chưa đo được cái nào rẻ hơn:
  (a) ghi luật ra `MULTIFLOW.md` và sống chung — phiên nào sắp push thì hỏi phiên giữ `_code`
  commit trước; rẻ nhất, nhưng thành một phép bắt tay bằng miệng, tức là loại luật máy không
  kiểm được và sớm muộn bị bỏ qua. (b) cho `safe-push` chỉ từ chối khi phần đang sửa dở **thật
  sự** ảnh hưởng artifact — nghe hợp lý nhưng phải hiểu được nội dung diff của bộ sinh, tức
  hạng `[DÒ]`, và nới một cổng đang tin được là cách nhanh nhất làm mất nó. (c) tách bộ sinh ra
  khoá riêng — làm 6 khoá thành 7, mà chính lý do tách `_root` thành ba khoá 02/09 là để **giảm**
  điểm nghẽn, không phải thêm.
- **phạm vi khi làm:** tuỳ đường chốt — (a) `docs/protocols/MULTIFLOW.md` (`_docs`) ·
  (b) `scripts/safe-push.mjs` + test (`_code`, và đây là **sửa cơ chế đa phiên** nên bắt buộc
  có đột biến kiểm theo `MULTIFLOW.md`) · (c) `.repo-structure.json` (`_root`).
- **đo trước khi sửa:** đếm trong lịch sử thật xem đã có bao nhiêu lượt push bị từ chối đúng vì
  lý do này. Hôm nay là lượt đầu tiên tôi thấy — một ca không đủ để đổi cơ chế.

## Y-10 · Bảng chỉ nói được ba trạng thái luồng; "bị chặn" và "chờ bằng chứng" chưa có nguồn

- **bậc:** ý tưởng
- **nguồn:** gặp thật 04/09, phiên `claude-exec-orchv2` khi làm vùng CÔNG VIỆC HIỆN TẠI
- **việc kế:** Đức chốt có thêm một trường vào hồ sơ trạng thái không; chốt rồi mới sửa bộ sinh
- **vì sao:** Đức nêu năm trạng thái. Ba cái làm được ngay vì có nguồn máy đọc được
  (`CHỜ ĐỨC` · `ĐANG CHẠY` · `XONG`). Hai cái còn lại — **bị chặn** và **chờ bằng chứng** —
  hôm nay repo **không có trường nào** phân biệt được chúng với "đang chạy". Cách duy nhất
  không cần trường mới là dò văn xuôi việc kế, và dò theo chữ đúng là cái đã cho kết luận sai
  bốn lần trong một ngày ở bảng đối chiếu hai nhánh. Nên bảng cố ý dừng ở ba.
- **phạm vi khi làm:** một trường mới trong `STATUS.template.md` + hồ sơ từng gói (khoá của
  từng chủ gói, và `_root`), rồi bộ sinh + phép ghim (`_code`). Hai bước, hai khoá — không
  làm chung một lượt được.

## Y-11 · Ba con số "trượt" của Assistant chưa đếm được, vì nhật ký là văn xuôi tự do

- **bậc:** ý tưởng
- **nguồn:** gặp thật 04/09, phiên `claude-exec-orchv2` khi làm vùng SỨC KHOẺ ASSISTANT
- **việc kế:** Đức chốt một **dạng nhãn cố định** cho dòng nhật ký từng phiên
- **vì sao:** Đức muốn thấy ba con số: trượt vai · trượt trạng thái Đức phải bắt · bảng để cũ.
  Hồ sơ gói Assistant chốt rằng nhãn từng câu hỏi ghi vào dòng nhật ký, và **cấm lập sổ đếm
  riêng**. Dòng nhật ký là văn xuôi tự do, nên hôm nay chỉ có hai đường và cả hai đều sai: dò
  văn xuôi (ra số sai, im lặng) hoặc lập sổ đếm (phạm luật). Bảng vì thế **nói thẳng là chưa
  đếm được** thay vì in ba số 0 mà không ai biết là đúng hay chỉ là chưa ai đếm.
- **phạm vi khi làm:** dạng nhãn khai ở hồ sơ gói Assistant (`_docs`), rồi bộ đếm + phép ghim
  (`_code`). Đức chốt dạng nhãn trước, không AI nào tự đặt.

## Y-12 · Suite gốc mất hơn hai phút, và gần hết thời gian nằm ở một hàm

- **bậc:** ý tưởng
- **nguồn:** đo thật 04/09, phiên `claude-exec-orchv2` — **một lượt sinh bảng tốn ~12 giây**,
  suite gọi nó hơn mười lần
- **việc kế:** Đức chốt có đáng làm không; làm thì đo trước xem 12 giây đó nằm ở đâu
- **vì sao:** mỗi phép ghim mới cần một bản bảng khác là **12 giây cộng thêm vào cổng đóng
  phiên của MỌI phiên sau**. Chuyện đó tạo áp lực ngược lên chất lượng: người viết test sẽ gộp
  fixture lại cho nhanh, và fixture gộp thì một ca có thể che ca khác. Đã phải gộp một lần
  trong chính phiên này.
- **vì sao chưa làm ngay:** **chưa đo được** cái gì chậm. Thử tắt phép đếm commit trong bộ sinh
  thì thời gian **không giảm**, nên nghi ngờ đầu tiên đã sai. Đoán tiếp mà không đo là đúng
  cái luật vàng cấm.
- **phạm vi khi làm:** `scripts/` + `tests/` (`_code`). Chạm bộ sinh bảng thì phải giữ đúng
  tính tất định — sinh hai lần vẫn phải ra y hệt.

## Y-15 · Bảng chủ sở hữu nói ai ĐƯỢC PHÉP sửa, nhưng không giữ được file trên đĩa

- **bậc:** ý tưởng
- **nguồn:** sự cố thật 2026-09-05, do chính phiên điều phối gây ra
- **việc kế:** Đức chốt có làm không; làm thì viết brief riêng
- **vì sao:** bốn cơ chế đa phiên đều giả định mỗi phiên **chỉ chạm file của mình**. Không cơ
  chế nào cưỡng chế điều đó — chúng kiểm ở **cổng**, tức lúc đóng phiên và lúc push, chứ không
  kiểm lúc `git add`. Một lượt `git add -A` của phiên A gom trọn file đang sửa dở của phiên B,
  và **cả bốn cơ chế đều không thấy gì bất thường**: nhãn lane vẫn đúng, khoá vẫn đúng chủ,
  cổng vẫn xanh.
- **đã xảy ra thật, không phải giả định:** ngày 05/09 một lượt `git add -A` của phiên điều phối
  cuốn theo bản bộ sinh **đang bị làm hỏng cố ý** cho một lượt đột biến kiểm. Bảng sinh ra từ
  bản hỏng đó mang một dòng CSS **tái sinh đúng loại bug đã vá**, và nằm trên remote một lúc
  trước khi executor tự phát hiện.
- **chỗ trớ trêu, và là lý do nó sẽ tái diễn:** **càng làm đúng kỷ luật thử phá thì cửa sổ bị
  cuốn càng rộng** — thử phá bắt buộc để file hỏng trên đĩa vài chục giây mỗi vòng. Một phiên
  chạy 16 lượt đột biến là mở cửa sổ đó 16 lần.
- **đã vá phần rẻ nhất:** sổ tay vai điều phối nay cấm `git add -A`, bắt kê đường dẫn cụ thể.
  Nhưng đó là **luật cho một vai**, không phải cơ chế — vai khác vẫn làm được, và luật nào máy
  không kiểm được thì sớm muộn cũng bị bỏ qua.
- **vì sao chưa làm ngay:** ba đường đều có giá, chưa đo được cái nào rẻ hơn. (a) một phép kiểm
  lúc commit, canh xem commit có chạm file thuộc vùng người khác đang giữ không — đúng chỗ, đúng
  lúc, nhưng phải chạy ở mọi commit và làm chậm mọi lượt. (b) executor làm việc trong cây riêng
  — sạch nhất, nhưng `MULTIFLOW.md` mục 7 **cấm** `git worktree add` sau một tai nạn đã có, và
  hôm nay còn sót `.git/worktrees/c` gây `Permission denied` mỗi lượt commit. (c) sống chung
  bằng luật cho từng vai — rẻ nhất, và là thứ vừa làm, nhưng không cưỡng chế được.
- **phạm vi khi làm:** tuỳ đường — (a) `scripts/` + `tests/` (`_code`, và là **sửa cơ chế đa
  phiên** nên bắt buộc có đột biến kiểm) · (b) `docs/protocols/MULTIFLOW.md` (`_docs`) ·
  (c) đã xong.
- **đo trước khi sửa:** đếm trong lịch sử thật xem đã có bao nhiêu commit chạm file thuộc vùng
  người khác đang giữ. Hôm nay biết chắc **một** ca; nếu chỉ có một thì luật vai là đủ.

## Y-16 · Cổng xuất bản khoá chéo: một lane giữ `_root` là mọi lane khác không đẩy được

- **bậc:** ý tưởng
- **nguồn:** đo thật 2026-09-05, hai lane độc lập cùng bị chặn trong một buổi
- **việc kế:** Đức chốt có tách khối AUTO của `FEATURE-PARITY.md` thành artifact miễn khoá không
- **hiện tượng:** lane `claude-gpt-no` và lane `claude-flow-no` đều làm xong, cổng đóng phiên
  gần xanh, nhưng **cổng xuất bản từ chối** vì `FEATURE-PARITY.md` lạc hậu so với HEAD. Cả hai
  đều **không tự sửa được**: file đó nằm ở gốc repo nên cần `_root`, mà `_root` đang do lane thứ
  ba giữ. Hai lane không hề chạm gốc repo vẫn bị chặn bởi một lane thứ ba.
- **vì sao nó là khoá chéo chứ không phải xui:** ba điều kiện gặp nhau. (1) Cổng xuất bản đòi
  mọi artifact máy sinh phải tươi. (2) `FEATURE-PARITY.md` **cố ý KHÔNG** nằm trong danh sách
  miễn khoá — vì mục 2 của nó là chữ của người. (3) Artifact đó **lạc hậu do commit của lane
  khác**, không phải do lane bị chặn. Ba cái này đúng riêng lẻ; ghép lại thành một cửa mà lane
  bị chặn không có đường nào tự mở.
- **vì sao ba artifact kia không bị:** `DASHBOARD.md` · `llms.txt` · `repo-map.json` · bảng HTML
  đã được miễn khoá từ 03/09, đúng vì lý do này. `FEATURE-PARITY.md` bị bỏ lại vì nó **trộn**
  chữ người và số máy trong cùng một file.
- **hướng nghĩ tới, chưa đo:** tách khối `<!-- AUTO:X -->` ra file riêng, để phần máy sinh vào
  danh sách miễn khoá còn mục 2 (chữ người) ở lại `_root`. Giá phải trả: thêm một file, và
  người đọc phải nhìn hai chỗ.
- **đường vòng đang dùng:** phiên điều phối nhận `_root` sau cùng, chạy hết bộ sinh, rồi đẩy
  một lượt cho mọi lane. Chạy được, nhưng nó biến phiên điều phối thành nút cổ chai bắt buộc —
  đúng cái giá mà `ADR-0004` đã ghi ra là biết trước.
- **phạm vi khi làm:** `scripts/feature-parity.mjs` + `.repo-structure.json` (`_code`) và
  `FEATURE-PARITY.md` (`_root`). **Là sửa cơ chế đa phiên** → bắt buộc có đột biến kiểm.

## Y-17 · Repo không có `.gitattributes`, nên test xanh trên máy này có thể đỏ trên máy khác

- **bậc:** nghỉ
- **nguồn:** bug thật, bắt được 2026-09-05 trong lúc chạy đột biến kiểm cho `F-06`
- **việc kế:** không còn việc — Đức chốt 06/09, làm xong cùng ngày, lane `claude-eol`
- **ĐÍNH CHÍNH sau khi đo thật 06/09 — chiều của bug ngược với mô tả bên dưới.** Trong git
  **không có file CRLF nào**: đo được **1084 LF / 0 CRLF / 218 nhị phân**. Thủ phạm là
  `core.autocrlf=true` **đặt trên máy này**, nên `git checkout` **viết ra đĩa** bản CRLF từ một
  blob LF. Trên đĩa lúc đó: **963 LF / 89 CRLF / 32 lẫn lộn** — tức 120 file trên đĩa khác với
  chính bản của chúng trong git. Triệu chứng mô tả bên dưới thì đúng nguyên văn (checkout xong
  là đỏ), chỉ có nguyên nhân là ngược. Bài học đi kèm: phép đo đầu tiên **nói dối** — `perl`
  đọc STDIN ở chế độ text trên Windows nên nó nuốt sạch `\r` và báo 0 CRLF ở cả hai phía; con
  số chỉ tin được sau khi đếm byte bằng Node.
- **hệ quả tốt:** vì kho đã sạch, `git add --renormalize .` viết lại **0 file**. Không có diff
  khổng lồ, không lane nào phải rebase, và **0/453 file vùng bằng chứng** bị chạm — nỗi lo lớn
  nhất của mục này hoá ra không tồn tại.
- **kiểm chiều ngược (bằng chứng đã chữa được bệnh):** `rm content.js && git checkout -- content.js`
  → trước khi vá đĩa ra **CR=1781**, sau khi vá **CR=0**. Sau đó đưa cả 120 file lệch về LF:
  đĩa nay **1084 LF / 0 CRLF / 0 lẫn lộn**, `git status` sạch — tức không một byte nào trong
  git thay đổi.
- **mô tả gốc, giữ nguyên để đối chiếu:** `content.js` của gói Flow Video nằm trong git dưới dạng **CRLF**,
  trong khi bản trên đĩa là **LF**. Phép thử `content-image-static.mjs` đòi `,\n` sát nhau nên
  nó **xanh trên máy đang làm việc**, nhưng **đỏ ngay sau bất kỳ lượt `git checkout content.js`
  nào, và đỏ với mọi người clone repo về**. Đã vá tại chỗ (nới thành `,\r?\n`) và đã kiểm cả
  hai chiều — nhưng đó là vá một phép thử, không phải vá gốc bệnh.
- **vì sao nó nguy hiểm hơn vẻ ngoài:** đây là loại xanh giả tệ nhất — nó xanh với người sửa
  và đỏ với người kiểm. Cùng gốc với bẫy anchor `^`/`$` đã cắn nhiều lần, và cùng gốc với vụ
  suite bộ khung xanh tại chỗ mà đỏ với người clone (đã vá ở bộ khung 05/09 bằng đúng cách này).
- **bản vá gốc:** thêm `.gitattributes` ở gốc repo với `* text=auto eol=lf`. Bộ khung
  `Ark_Repo_Harness` đã làm đúng thế và đo được: **75 LF / 21 CRLF trước → 97 LF / 0 CRLF sau**.
- **~~vì sao phải hỏi Đức~~ — lo hão, đã đo:** dự đoán là "diff khổng lồ chạm mọi file, mọi lane
  phải rebase". Thực tế commit chạm **đúng 1 file** (`.gitattributes`, 23 dòng thêm). Đức đã
  chốt 06/09 lúc bảng khoá trống hoàn toàn.
- **~~chưa đo~~:** hai gói ChatGPT và Gemini **không** có quả mìn này — không gói nào có, vì
  trong git không có file CRLF nào cả.
- **phạm vi đã làm:** `.gitattributes` ở gốc repo (`_root`).

## Y-18 · Phép kiểm "không phụ thuộc đồng hồ" báo đỏ oan khi hai lane commit cùng lúc

- **bậc:** nghỉ
- **nguồn:** gặp thật 2026-09-05, lane `claude-moc-da-xong`, một lần đỏ rồi tự xanh lại
- **việc kế:** không còn việc — đã vá 05/09, đo: lệch 50 byte trước, 0 byte sau
- **hiện tượng:** phép kiểm sinh trang **hai lần** rồi so từng byte, để bắt mọi chỗ lỡ dùng
  đồng hồ hệ thống. Nhưng trang suy từ **HEAD**, mà HEAD **di chuyển được giữa hai lượt sinh**
  khi lane khác commit xen vào. Lần gặp: lệch 46 byte, hai lane khác commit lúc 20:32 và 20:38.
  Chạy lại trên cây yên tĩnh thì xanh ngay.
- **vì sao đáng ghi:** đây **không** phải bug của trang. Đó là một phép kiểm **đỏ oan đúng lúc
  nhiều lane chạy song song** — tức đúng lúc nó gây thiệt hại nhất. Và nó đỏ theo kiểu khó bác
  bỏ: chạy lại thì xanh, nên phiên gặp phải sẽ mất thời gian đi tìm một lỗi không tồn tại, hoặc
  tệ hơn là **quen với việc chạy lại cho tới khi xanh** — mà đó chính là thói quen phép kiểm này
  sinh ra để chặn.
- **hướng nghĩ tới, chưa đo:** ghim HEAD một lần ở đầu phép kiểm rồi sinh cả hai lượt từ đúng
  mã băm đó, thay vì đọc HEAD hai lần. Nếu đúng thì đây là sửa một dòng.
- **phạm vi khi làm:** `tests/build-overview-smoke.mjs` (`_code`). **Là sửa cơ chế đa phiên**
  (cổng xuất bản) → bắt buộc có đột biến kiểm.
- **liên quan:** cùng họ với `Y-16` — cả hai đều là cơ chế đúng khi một lane chạy, và sai khi
  nhiều lane chạy. Bốn cơ chế đa phiên được thiết kế cho **xung đột ghi**; hai mục này là
  **xung đột đọc**, một loại chưa ai tính tới.

## Y-19 · `npm test` KHÔNG nuốt mã lỗi — cái nuốt là `$?` trong PowerShell

- **bậc:** nghỉ
- **nguồn:** đo thật 2026-09-05, lane `claude-ghim-do`, phần B của đề bài Y-18
- **việc kế:** không còn việc — mục này ghi lại số đo để lần sau không ai đi tìm lại
- **nỗi lo ban đầu:** một lượt `npm test` đỏ (có file test ném AssertionError) lại được báo
  là "exited with code 0". Nếu đúng thì mọi câu "cổng xanh" đều chưa đủ tin.
- **cách đo:** cố tình cho `tests/repo-structure-smoke.mjs` ném ngay dòng đầu, chạy
  `npm test`, đọc mã lỗi ở cả hai vỏ lệnh, rồi khôi phục file và xác nhận `git diff --quiet`.
- **kết quả:** chuỗi `&&` dừng đúng chỗ file ném; **bash `$?` = 1**, **PowerShell
  `$LASTEXITCODE` = 1**, **PowerShell `$?` = False**. Suite KHÔNG nuốt mã lỗi. Cổng vẫn tin được.
- **thứ THẬT SỰ nuốt, và đây mới là chỗ đáng nhớ:** trong PowerShell, `$?` nói về **câu lệnh
  liền trước**, không phải về lệnh ngoài gần nhất. Đo được ngay trong lượt này: viết
  `npm test *> log; "LASTEXITCODE=$LASTEXITCODE"; "DOLLAR=$?"` thì `$?` trả **True** dù npm
  vừa trả 1 — vì câu lệnh liền trước `$?` lúc đó là một chuỗi ký tự, và chuỗi thì luôn thành
  công. Đúng một dòng chen vào giữa là mã lỗi biến mất khỏi tầm mắt.
- **luật rút ra:** trong PowerShell đọc `$LASTEXITCODE` cho lệnh ngoài (npm, node, git), và
  nếu buộc phải dùng `$?` thì chộp nó vào biến **ngay câu lệnh kế tiếp**, không chen gì vào giữa.
- **liên quan:** `Y-18` đã vá xong cùng phiên — mốc đọc nay ghim một lần trong `createHeadDeps`,
  nên HEAD nhích giữa hai lượt sinh không còn làm phép ghim đỏ oan (đo: lệch 50 byte trước khi
  vá, 0 byte sau khi vá). Ô `bậc` của `Y-18` cần đổi sang `nghỉ`, nhưng đó là sửa giữa file
  nên phiên giữ `_root` làm.

---

## Mục mở từ 2026-09-06 — mỗi mục PHẢI có `đóng khi:`

> **Viết mục mới XUỐNG DƯỚI CÙNG file này, sau dòng cuối hiện có.** Chèn vào giữa thì cổng
> đóng phiên đỏ, vì miễn trừ khoá chỉ áp cho phần thêm ở cuối.

## N-01 · Phép kiểm `đóng khi:` chưa có test ghim, nên nó có thể bị gỡ mà không ai biết

- **đóng khi:** lệnh: node tests/backlog-check-smoke.mjs xanh
- **mở:** 2026-09-06 · lane `claude-tach-so`
- **vùng:** `_code`
- **vì sao:** luật mục 2 của sổ này được cưỡng chế bằng một lệnh trong `scripts.test` của
  `package.json`. Lệnh đó chặn thật — đã đo: bỏ trường `đóng khi:` khỏi một mục thì cổng ĐỎ.
  Nhưng **không có phép ghim nào** canh chính lệnh đó: xoá nó khỏi `package.json` là luật biến
  mất trong im lặng và mọi test vẫn xanh. `MULTIFLOW.md` mục 5 gọi đúng tên chuyện này —
  *"một chốt không có test ghim thì nó chỉ là bình luận"*. Lane `claude-tach-so` không mở được
  vì `tests/` là khoá `_code`, và khoá đó đang có chủ khác.
- **cách làm khi tới lượt:** chuyển lệnh một dòng trong `package.json` thành
  `scripts/backlog-check.mjs`, thêm `tests/backlog-check-smoke.mjs` ghim **cả hai chiều** (thiếu
  trường thì đỏ · đủ trường thì xanh), rồi đột biến kiểm theo `MULTIFLOW.md` mục 5.

## N-02 · Đóng một mục là thêm dòng, nhưng chưa có gì gấp sổ lại để biết mục nào còn mở

- **đóng khi:** đức: chốt có cần bảng đếm mục còn mở của sổ này không
- **mở:** 2026-09-06 · lane `claude-tach-so`
- **vùng:** `_code`
- **vì sao:** luật mục 4 làm cửa ra rẻ ngang cửa vào bằng cách đóng mục bằng **một dòng thêm ở
  cuối** thay vì sửa khối cũ. Cái giá của lựa chọn đó: đọc mắt thường không ra ngay mục nào còn
  mở — phải lấy tập `N-xx` đã mở trừ tập `N-xx` đã đóng. Hôm nay sổ có 2 mục nên trừ bằng mắt là
  đủ; tới khoảng chục mục thì không. Việc gấp sổ đúng chỗ là bộ sinh bảng (`_code`), và
  `BRIEF-TACH-SO-Y-TUONG-01` mục 6 đã cố ý xếp nó sang lượt khác.
- **đo trước khi làm:** đếm số mục `## N-` chưa có dòng `ĐÓNG` tương ứng. Dưới 10 thì chưa cần xây.

## N-03 · Bảng trạng thái không đọc `BACKLOG.md` ở gốc repo, nên 14 mục vừa biến khỏi bảng

- **đóng khi:** lệnh: node scripts/build-overview.mjs xanh và trang có khối sổ nợ gốc repo
- **mở:** 2026-09-06 · lane `claude-tach-so`
- **vùng:** `_code`
- **vì sao:** đo ngay trong lượt tách sổ. `scripts/build-overview.mjs` gom sổ nợ bằng
  `trackedPaths().filter(p => p.endsWith("/BACKLOG.md"))` — có dấu `/` ở đầu, nên nó chỉ thấy sổ
  nợ **của từng gói worker**, không thấy `BACKLOG.md` ở gốc repo. Hệ quả đo được: sinh lại trang
  ở HEAD trước khi tách là **127.557 byte, 19 ý tưởng**; sau khi tách là **86.673 byte, 5 ý
  tưởng** — 14 mục rời `IDEAS.md` và **không xuất hiện lại ở đâu trên bảng**. Đức mở bảng sẽ
  thấy repo bỗng nhẹ đi 14 việc, mà thật ra không việc nào đóng cả.
- **cách làm khi tới lượt:** bỏ dấu `/` trong bộ lọc, hoặc thêm `BACKLOG.md` gốc thành một nguồn
  riêng có nhãn *"nợ hạ tầng repo"*. Kèm phép ghim: sổ nợ gốc có N mục thì bảng phải hiện N.
- **KHÔNG gộp vào lượt tách sổ:** `BRIEF-TACH-SO-Y-TUONG-01` mục 6 và mục 8 cấm đúng chuyện này —
  sửa bộ sinh là khoá `_code`, và khoá đó đang có chủ khác.
