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

- **nhóm:** <một mã trong danh sách cố định — xem mục 7>
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

### 7. Trường `nhóm:` — mục này đang chữa bệnh gì

Bảng trạng thái lồng các luồng đang chạy **theo nhóm vấn đề**, để Đức đọc ra ngay "việc này
đang giải quyết chuyện gì" mà không phải đọc tên khoá. Lane khai **mã việc** lúc nhận vùng
(`--task "N-05"`), bảng tra sang sổ này, lấy câu tiếng Việt có dấu ở tiêu đề và nhóm ở đây.

Danh sách nhóm là **cố định**, khai ở khối `nhom_van_de` của `.repo-structure.json`:

| Mã | Nhóm |
|---|---|
| `bang` | Bảng trạng thái nói sai hoặc nói thiếu |
| `cong` | Cổng kiểm và phép ghim — độ tin của cổng |
| `song-song` | Nhiều phiên chạy song song giẫm chân nhau |
| `so-sach` | Sổ sách và chữ cho Đức đọc |
| `nen` | Nền repo — môi trường, tốc độ, thói quen công cụ |

**Đừng gõ một mã ngoài danh sách** — bảng không nhận, mục rơi về *"Chưa xếp nhóm"*. Thấy thiếu
một nhóm thật thì thêm vào file cấu hình, đừng thêm vào sổ: phân loại mọc tự do thì sau ba
tuần có 19 nhóm cho 19 mục, tức là không phân loại gì cả.

---

## Mục chuyển từ `IDEAS.md` — 2026-09-06, 14 mục, nguyên văn

> Dời **không sửa một chữ nào**, kể cả số hiệu `Y-nn`: các mục này trỏ chéo lẫn nhau và được
> `HANDOFF.md` nhắc tên. Đổi số là làm gãy mọi tham chiếu đó.

## Y-03 · Trường "Đức cần làm" trong hồ sơ trạng thái

- **nhóm:** bang
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

- **nhóm:** so-sach
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

- **nhóm:** cong
- **bậc:** ý tưởng
- **nguồn:** bắt được 2026-09-04 khi phiên `claude-dashboard` tự vi phạm chính luật đó
- **việc kế:** cho bộ kiểm nhãn lane đòi **đúng dòng cuối**, kèm phép ghim dựng được ca hỏng:
  một commit có `Lane:` ở giữa lời commit thì phải ĐỎ. Cần Đức chốt trước khi sửa — nhãn lane
  là luật attribution, thuộc nhóm phải hỏi
- @Đức:chốt Nhãn phiên có bắt buộc phải là dòng cuối của lời commit không — đây là luật quy trách nhiệm, thuộc nhóm phải hỏi Đức.
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

- **nhóm:** cong
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

- **nhóm:** cong
- **bậc:** ý tưởng
- **nguồn:** brief `STATE-DRIFT-01` mục 1, ca số 2 — đo được 04/09
- **việc kế:** Đức chốt có làm không; làm thì viết brief riêng cho executor
- @Đức:chốt Có làm cặp đối chiếu thứ tư cho cổng nhất quán trạng thái không.
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

- **nhóm:** song-song
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

- **nhóm:** bang
- **bậc:** ý tưởng
- **nguồn:** gặp thật 04/09, phiên `claude-exec-orchv2` khi làm vùng CÔNG VIỆC HIỆN TẠI
- **việc kế:** Đức chốt có thêm một trường vào hồ sơ trạng thái không; chốt rồi mới sửa bộ sinh
- @Đức:chốt Có thêm một trường vào hồ sơ trạng thái để bảng nói được "bị chặn" và "chờ bằng chứng" không.
- **vì sao:** Đức nêu năm trạng thái. Ba cái làm được ngay vì có nguồn máy đọc được
  (`CHỜ ĐỨC` · `ĐANG CHẠY` · `XONG`). Hai cái còn lại — **bị chặn** và **chờ bằng chứng** —
  hôm nay repo **không có trường nào** phân biệt được chúng với "đang chạy". Cách duy nhất
  không cần trường mới là dò văn xuôi việc kế, và dò theo chữ đúng là cái đã cho kết luận sai
  bốn lần trong một ngày ở bảng đối chiếu hai nhánh. Nên bảng cố ý dừng ở ba.
- **phạm vi khi làm:** một trường mới trong `STATUS.template.md` + hồ sơ từng gói (khoá của
  từng chủ gói, và `_root`), rồi bộ sinh + phép ghim (`_code`). Hai bước, hai khoá — không
  làm chung một lượt được.

## Y-11 · Ba con số "trượt" của Assistant chưa đếm được, vì nhật ký là văn xuôi tự do

- **nhóm:** bang
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

- **nhóm:** nen
- **bậc:** ý tưởng
- **nguồn:** đo thật 04/09, phiên `claude-exec-orchv2` — **một lượt sinh bảng tốn ~12 giây**,
  suite gọi nó hơn mười lần
- **việc kế:** Đức chốt có đáng làm không; làm thì đo trước xem 12 giây đó nằm ở đâu
- @Đức:chốt Có đáng bỏ công tăng tốc bộ kiểm không, hay chấp nhận cổng đóng phiên chạy hơn hai phút.
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

- **nhóm:** song-song
- **bậc:** ý tưởng
- **nguồn:** sự cố thật 2026-09-05, do chính phiên điều phối gây ra
- @Đức:chốt Có làm cơ chế chặn một phiên gom nhầm file đang sửa dở của phiên khác không.
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

- **nhóm:** song-song
- **bậc:** ý tưởng
- **nguồn:** đo thật 2026-09-05, hai lane độc lập cùng bị chặn trong một buổi
- **việc kế:** Đức chốt có tách khối AUTO của `FEATURE-PARITY.md` thành artifact miễn khoá không
- @Đức:chốt Có tách phần máy sinh của bảng đối chiếu hai nhánh ra thành artifact miễn khoá không.
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

- **nhóm:** nen
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

- **nhóm:** song-song
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

- **nhóm:** nen
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

- **nhóm:** cong
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

- **nhóm:** so-sach
- **đóng khi:** đức: chốt có cần bảng đếm mục còn mở của sổ này không
- @Đức:chốt(TACH-SO-Y-TUONG-01) Có cần một chỗ gấp sổ nợ lại để thấy ngay mục nào còn mở không.
- **mở:** 2026-09-06 · lane `claude-tach-so`
- **vùng:** `_code`
- **vì sao:** luật mục 4 làm cửa ra rẻ ngang cửa vào bằng cách đóng mục bằng **một dòng thêm ở
  cuối** thay vì sửa khối cũ. Cái giá của lựa chọn đó: đọc mắt thường không ra ngay mục nào còn
  mở — phải lấy tập `N-xx` đã mở trừ tập `N-xx` đã đóng. Hôm nay sổ có 2 mục nên trừ bằng mắt là
  đủ; tới khoảng chục mục thì không. Việc gấp sổ đúng chỗ là bộ sinh bảng (`_code`), và
  `BRIEF-TACH-SO-Y-TUONG-01` mục 6 đã cố ý xếp nó sang lượt khác.
- **đo trước khi làm:** đếm số mục `## N-` chưa có dòng `ĐÓNG` tương ứng. Dưới 10 thì chưa cần xây.

## N-03 · Bảng trạng thái không đọc `BACKLOG.md` ở gốc repo, nên 14 mục vừa biến khỏi bảng

- **nhóm:** bang
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


- **ĐÓNG N-03** · 2026-09-06 · lane `claude-bang-n03` · `node tests/build-overview-smoke.mjs` xanh, có phép ghim T17. Bảng trước bản vá đếm 44 mục nợ và **không thấy sổ này**; sau bản vá đếm 61 — thêm đúng 17 mục đang mở của sổ gốc. Bắt thêm một lỗi phụ trong cùng lượt: `N-02` mang tên *"Đóng một mục là thêm dòng…"* bị đếm là đã đóng chỉ vì tiêu đề mở đầu bằng chữ "Đóng" (bảng in 16, sổ có 17) — sổ gốc nay đóng mục **chỉ** bằng dòng `ĐÓNG` thêm ở cuối, đúng luật mục 4 của chính nó. Đột biến kiểm: 4/4 bị bắt.
- **ĐÓNG N-01** · 2026-09-06 · lane `claude-bang-n03` · `node tests/backlog-check-smoke.mjs` xanh (8 phép). Lệnh một dòng trong `package.json` nay là `scripts/backlog-check.mjs`; phép ghim canh **cả hai chiều** (thiếu trường thì đỏ · đủ thì xanh) **và canh chính `package.json`** — gỡ bộ kiểm khỏi cổng thì phép ghim đỏ. Đột biến kiểm: 6/6 bị bắt, gồm cả hai đột biến "gỡ khỏi cổng".

## N-04 · Bộ sinh bảng lấy tiêu đề trang từ TÊN THƯ MỤC, nên sinh trong worktree là đóng dấu sai

- **nhóm:** bang
- **đóng khi:** lệnh: node scripts/build-overview.mjs chạy trong một worktree tên bất kỳ vẫn ra tiêu đề đúng, và có phép ghim canh điều đó
- **mở:** 2026-09-06 · lane `claude-assistant`
- **vùng:** `_code`
- **vì sao:** gặp thật 06/09. Lane `claude-don-so` phải sinh bảng trong một worktree riêng (vì
  lane khác đang sửa dở bộ sinh, sinh tại chỗ sẽ nuốt việc chưa xong của họ vào artifact). Bộ
  sinh suy tiêu đề trang từ tên thư mục đang đứng, nên nó đóng `<title>w1</title>` vào file đã
  commit. Lane tự bắt được khi đối chiếu và amend.
- **vì sao nó đáng vá chứ không phải chuyện lẻ:** sinh trong worktree là **cách đúng** khi nhiều
  lane cùng chạy — nó chính là thứ tránh được ca `Y-15` (hai lane ghi đè bản trên đĩa của nhau).
  Một bộ sinh phạt người làm đúng thì sớm muộn sẽ có người làm sai để cho nhanh.
- **cách đo:** sinh hai lần, một lần trong repo chính một lần trong worktree đặt tên khác, rồi
  so hai file. Khác nhau ở đâu ngoài tiêu đề cũng là phát hiện.

## N-05 · `git commit -o <file>` KHÔNG chặn được việc cuốn sửa đổi của lane khác trên CÙNG file

- **nhóm:** dephien
- **đóng khi:** có phép ghim hoặc hook cảnh báo khi commit một file đang mang sửa đổi chưa commit của lane khác
- **mở:** 2026-09-06 · lane `claude-assistant`
- **vùng:** `_code`
- **vì sao:** gặp thật 06/09, hai lần trong một buổi. Luật `git commit -o <đường-dẫn>` được dặn
  trong mọi bản giao việc hôm nay, và nó **có tác dụng thật** — nó chặn cuốn theo *file khác*
  đang nằm trong index chung. Nhưng nó **không** chặn cuốn theo *sửa đổi của lane khác trên
  chính file đó*: `-o` giới hạn đường dẫn, rồi lấy trọn nội dung cây làm việc của đường dẫn ấy.
- **ca thật:** phiên điều phối commit `BACKLOG.md` (thêm mục `N-04`) trong lúc lane
  `claude-dang-lam` đang sửa dở cùng file (17 dòng `nhóm:`). Nội dung vào HEAD nguyên vẹn,
  **không mất gì**, nhưng mang nhãn lane sai — tức truy nguồn hỏng, đúng thứ nhãn `Lane:` sinh ra
  để giữ.
- **vì sao nó không hiếm:** ba file ở gốc repo được MIỄN khoá khi chỉ thêm dòng ở cuối
  (`IDEAS.md`, `BACKLOG.md`, `HANDOFF.md`). Miễn khoá nghĩa là **nhiều lane cùng ghi vào chúng
  một cách hợp lệ** — nên đây là chỗ va chạm được thiết kế ra chứ không phải tai nạn.
- **cách đo:** trước khi commit một đường dẫn, so nội dung cây làm việc với `git stash list` /
  `git diff HEAD -- <file>` và xem phần thêm có nằm ngoài đoạn mình vừa viết không.
- **KHÔNG phải cách sửa:** bỏ miễn khoá cho ba file đó. Miễn khoá tồn tại vì không có nó thì
  không lane nào ghi Log được — đo ngày 02/09: 19% lượt nhận `_root` chỉ để làm một việc hành
  chính rồi trả ngay.

## N-06 · Bốn trong năm file `bridge-*.js` KHÔNG giống nhau giữa ba worker — đề bài Scouter đang tin ngược lại

- **nhóm:** so-sach
- **đóng khi:** `BRIEF-SCOUTER-SEED-01.md` mục 2 sửa lại câu về sáu file, hoặc có một dòng đo trong bảng kiểm kê nói rõ file `bridge-*.js` nào bóc sạch được
- **mở:** 2026-09-06 · lane `claude-scouter-do`
- **vùng:** `_docs`
- **vì sao:** `BRIEF-SCOUTER-SEED-01.md` mục 2 dặn lane làm việc ② *"đọc `bridge-*.js` trước,
  đừng phát minh lại"*, rồi đưa lý do: *"Bảng kiểm kê đo được 6 file **giống hệt nhau từng byte**
  ở cả ba worker — đó là bằng chứng đọc được rằng chúng không dính nhà cung cấp."* Hai câu đó
  đứng cạnh nhau nên đọc ra thành *"năm file `bridge-*.js` bóc sang dùng lại được"*. **Không phải
  vậy.**
- **đo được, `md5sum` 06/09** — trong năm file `bridge-*.js`, **đúng một** file giống hệt cả ba:

  | file | giống hệt cả ba? |
  |---|---|
  | `bridge-pairing-core.js` (43 dòng) | **có** |
  | `bridge-core.js` (798–1022 dòng) | không — **ba bản khác nhau** |
  | `bridge-transport-loopback.js` (498–945 dòng) | không — **ba bản khác nhau** |
  | `bridge-router-core.js` | không — ChatGPT lệch |
  | `bridge-proposal-core.js` | không — ChatGPT lệch |

  Chạy lại:

  ```bash
  cd workers && for f in bridge-core.js bridge-pairing-core.js bridge-proposal-core.js \
      bridge-router-core.js bridge-transport-loopback.js; do
    md5sum duc-auto-gemini/v0.2.0/$f duc-auto-chatgpt/v0.1.0/$f duc-auto-gg-flow-video/v0.1.0/$f
  done
  ```

- **bảng kiểm kê KHÔNG sai — brief đọc gộp hai bảng.** Sáu file giống hệt nhau nằm ở mục 3.3, và
  chỉ **một** trong sáu là `bridge-*` (`bridge-pairing-core.js`); năm cái kia là
  `attempt-identity-core.js` · `audit-chain-core.js` · `reconciliation-core.js` ·
  `recreate-core.js` · `run-state-core.js`. Bốn file `bridge-*` còn lại nằm ở mục **3.4** —
  bảng có tiêu đề là *"năng lực có ở cả ba nhưng ba bản đã trôi khác nhau"*, và mục đó tự gọi
  mình là **"danh sách đắt nhất"**.
- **vì sao nó đáng vá chứ không phải chuyện chữ nghĩa:** lane làm việc ② sẽ mở `bridge-core.js`
  mong thấy một file trung tính bóc sang là chạy, và gặp **ba bản đã trôi khác nhau** — đúng cái
  bệnh ADR-0009 mục ⑵ dựng ra để tránh. Chọn nhầm một bản rồi chép, là Scouter thành **bản trôi
  thứ tư**. Việc thật ở đây là **bóc lấy phần khung** (mục 3.4 ghi: `registryEntry` giống nhau,
  nội dung từng method dính nhà cung cấp), không phải chép file.
- **KHÔNG phải cách sửa:** đi hợp nhất ba bản `bridge-core.js` trong lượt này. Đó là việc lớn,
  chưa ai chốt, và nó không nằm trong `SEED v0.1`.

---

## N-07 · Trang bảng vẫn bảo Đức "Nhờ AI làm mới bảng" — nay Đức tự làm được, câu đó thành sai

- **nhóm:** bang
- **đóng khi:** lệnh: `node scripts/build-overview.mjs` sinh ra trang không còn câu bảo Đức đi nhờ
  AI, mà chỉ ra thư mục `bang-trang-thai/`
- **mở:** 2026-09-06 · lane `claude-ba-cua`
- **vùng:** `_code` (bộ sinh) + sinh lại artifact ở `_root`
- **vì sao:** đoạn JS trong trang bật cờ khi bảng quá 7 ngày và in *"Nhờ AI: Làm mới bảng trạng
  thái."* Từ hôm nay Đức có ba cửa tự làm, nên câu đó chỉ dẫn Đức đi đúng cái đường mà lượt này
  vừa xoá bỏ — và nó là chữ Đức đọc, không phải chữ máy.
- **vì sao KHÔNG sửa trong lượt này:** sửa bộ sinh thì bản HTML đã commit ở gốc repo lệch HEAD
  ngay, nên phải sinh lại và commit kèm. Việc đó không nằm trong `BRIEF-BANG-BA-CUA-01`, và
  lượt này cố ý không chạm một byte nào của bộ sinh — chính vì thế mà bốn artifact đã commit
  không đổi và không phiên nào bị chặn đẩy oan.
- **đỡ tạm ở đâu:** băng thông báo mà ba cửa chèn nằm NGAY TRÊN cờ đó và nói mốc sinh thật, nên
  Đức không bị dẫn sai — chỉ là có hai câu nói về cùng một chuyện.

## N-11 · Hai bảng trạng thái, Đức không biết mở cái nào

- **nhóm:** bang
- **đóng khi:** lệnh: node tests/build-overview-smoke.mjs xanh, và phép ghim canh được dòng đầu của bản chụp ở gốc repo có câu tự khai là bản chụp kèm đường sang bản sống
- **mở:** 2026-09-06 · lane `claude-assistant`
- **vùng:** `_code`
- **vì sao:** Đức báo thẳng 06/09: *"tôi thấy có 2 dashboard nên bị confuse."* Sau khi dựng
  `bang-trang-thai/`, repo có hai file HTML nội dung gần như giống nhau:
  `DASHBOARD-Chrome-Extension-AI-Agentic.html` ở gốc (đã commit) và `bang-trang-thai/BANG.html`
  (sinh tại chỗ, không commit).
- **lỗi ở bản giao việc, không phải ở lane:** `BRIEF-BANG-BA-CUA-01` viết *"gom vào một thư mục"*
  nhưng **không nói file nào là bảng chính**. Lane sinh file thứ hai để tránh làm bẩn artifact đã
  commit — đúng với ràng buộc được giao.
- **KHÔNG gộp làm một được, và đây là lý do:** hai file có ràng buộc ngược nhau. Bản ở gốc phải
  **nằm yên trong git** để GPT audit qua GitHub và AI phiên khác đọc được mà không chạy gì. Bản
  sống phải **được ghi đè liên tục** — mà ghi đè vào file đã commit thì mỗi cú nhấp của Đức làm
  bẩn cây làm việc của mọi lane đang chạy, và với chế độ tự chạy thì nó bẩn liên tục.
- **cách làm khi tới lượt:** bản chụp ở gốc tự khai ngay dòng đầu rằng nó là bản chụp, kèm đường
  nhấp đúp sang bản sống. Bản sống khai nó là bản sống kèm mốc sinh. **Đừng trông cậy vào việc
  Đức nhớ** — link cũ còn nằm trong lịch sử trình duyệt và trong tin nhắn cũ.
- **liên quan:** cùng họ với `N-07` (trang vẫn bảo Đức đi nhờ AI làm mới). Cả hai là *trang nói
  sai cách Đức dùng nó*.

## N-09 · Khoá bị giữ mà vùng chưa bị chạm — chặn phiên khác mà không ai thấy

- **nhóm:** dephien
- **đóng khi:** `claim.mjs --list`, khối "Đang làm gì" trên bảng, và cổng đóng phiên đều nói được "đang giữ mà chưa chạm vùng", có phép ghim và đột biến kiểm
- **mở:** 2026-09-06 · lane `claude-assistant`
- **vùng:** `_code` + `_docs` + `_root`
- **đề bài:** `docs/briefs/BRIEF-K2-KHOA-RANH-01.md`
- **vì sao:** Đức nêu 06/09 sau khi một phiên khác phải đứng chờ. Đo được: lane
  `claude-codex-ngan` giữ **ba** khoá worker **14 phút** với **0 commit và 0 file bị sửa** trong
  cả ba vùng.
- **nguyên nhân là bản giao việc, không phải lane:** mọi brief ngày 06/09 mở đầu bằng *"Nhận
  khoá trước"*, trong khi lane dành 5–20 phút đầu chỉ để ĐỌC — mà đọc thì không cần khoá.
- **cố ý KHÔNG sửa:** luật *trả khoá sau khi đẩy*. Bốn lane giữ khoá gần một tiếng sáng 06/09 là
  vì bị chặn đẩy, và đó là hành xử ĐÚNG. Bệnh thật ở đó là `Y-16`.
- **cấm khi làm:** máy tự nhả khoá của lane khác · để phép kiểm này ĐỎ (lane đọc kỹ 30 phút là
  lane tốt; chặn nó là dạy mọi lane ghi bừa một byte để giữ khoá cho hợp lệ).

- **ĐÓNG N-07** · 2026-09-06 · lane `claude-n07` · `node scripts/build-overview.mjs` sinh ra trang
  **không còn một câu nào bảo Đức đi nhờ AI** — quét cả trang, tìm được ba chỗ và sửa cả ba: dải đỏ
  ở đầu trang, thẻ *Làm mới bảng* ở tab đầu, khối *Câu để dán cho AI* ở tab Vận hành. Chữ mới chỉ ra
  ba cửa nhấp đúp trong `bang-trang-thai/`. Gỡ luôn `readRefreshLine` — không còn chỗ nào dùng.
  Phép ghim: khối 5b của `tests/build-overview-smoke.mjs`, ghim **cả hai chiều** (ba câu cũ phải mất,
  bốn tên cửa phải có), ĐỎ trước khi vá và XANH sau khi vá; hai lượt sinh trên cùng HEAD ra giống hệt
  từng byte.

## N-08 · `git checkout` một file trạng thái sống xoá khoá của phiên khác, và không lớp nào chặn

- **nhóm:** dephien
- **đóng khi:** lệnh: node tests/claims-checkout-smoke.mjs xanh — có lớp chặn hoặc phát hiện được lượt `git checkout` ghi đè bảng quyền đang sống

**Xảy ra thật 06/09** (`claude-flow-active`): chạy `git checkout .agents/claims.json` để bỏ một
bản sửa tay của chính mình. Bản đã commit không mang các lượt nhận khoá **chưa commit** của hai
phiên đang chạy, nên một lệnh xoá trắng **bốn khoá** (`workers/duc-auto-gemini`,
`workers/duc-auto-chatgpt` của `claude-codex-ngan`; `_root`, `_code` của `claude-n07`).
Đã khôi phục trong một phút và đóng lại dấu niêm phong — nhưng chỉ vì tôi tình cờ kiểm lại.

`claim.mjs` giữ *đường ghi* và dấu niêm phong bắt được *sửa tay*, nhưng lượt này **đi qua git**,
nên dấu vẫn khớp với bản commit và không gì kêu. Hai phiên kia sẽ không bao giờ được báo.

**Đóng khi:** cổng đóng phiên (hoặc `claim.mjs`) phát hiện được trường hợp bảng quyền trên đĩa
**mất** một chủ so với lượt đọc gần nhất mà không có bản ghi `--release` tương ứng — và nói ra
tên khoá bị mất. Đo được bằng cách dựng lại đúng kịch bản trên: nhận khoá, `git checkout`, chạy cổng.

## N-10 · "Vùng chưa bị chạm" KHÔNG chứng minh được lane đang rảnh

- **nhóm:** dephien
- **đóng khi:** `BRIEF-K2-KHOA-RANH-01` sửa xong định nghĩa tín hiệu, và luật nói rõ điều kiện được phép nhả khoá hộ lane khác
- **mở:** 2026-09-06 · lane `claude-assistant`
- **vùng:** `_docs` (sửa brief) + `_code` (khi làm)
- **ca thật, và phiên điều phối là người gây ra:** 06/09, lane `claude-codex-ngan` giữ khoá
  `workers/duc-auto-gg-flow-video` 14 phút. Phiên điều phối đo `git log` + `git status` thấy
  **0 commit, 0 file bị sửa trong vùng**, kết luận khoá rảnh, và **nhả hộ**. Lane đó **đang làm
  thật**: nó dựng bản viết ngắn 4 mục trong một thư mục tạm NGOÀI repo và chỉ ghi vào repo ở
  bước cuối. Nó phải hoàn nguyên phần đã xong.
- **vì sao nó phá chính thiết kế đang chờ làm:** `BRIEF-K2-KHOA-RANH-01` định nghĩa "khoá rảnh"
  đúng bằng hai vế vừa đo sai. Một lane làm nghiêm túc suốt 14 phút vẫn cho ra chữ ký "rảnh" —
  **tín hiệu này báo dương giả với đúng loại lane cẩn thận nhất**: loại dựng thử ngoài repo, đo,
  rồi mới ghi.
- **hai chỗ phải sửa trong brief:**
  ① Tín hiệu chỉ được gọi là *"chưa thấy dấu vết trong repo"*, KHÔNG được gọi là *"đang rảnh"*.
  Chữ dùng trên bảng phải nói đúng thứ đo được, không nói thứ suy ra.
  ② **Cấm nhả khoá hộ một lane còn đang chạy, dù đo thấy gì.** Chỉ được nhả khi lane đó đã báo
  xong, hoặc Đức chốt. Repo không có cách nào nhìn thấy việc lane làm ngoài repo, nên mọi suy
  luận "nó rảnh" đều là đoán.
- **cái giá của hai chiều, để cân cho đúng:** giữ khoá thừa làm một phiên khác chờ — thấy được,
  sửa được. Nhả nhầm làm mất việc đang dở — **không thấy được cho tới khi lane báo về**.

## N-12 · Sổ miễn khoá không có ai cấp số, nên hai lane cùng chọn một mã

- **nhóm:** dephien
- **đóng khi:** lệnh: node scripts/backlog-check.mjs xanh và nó BÁO ĐỎ khi có hai mục trùng mã
- **mở:** 2026-09-06 · lane `claude-assistant`
- **vùng:** `_code`
- **ca thật:** 06/09 hai lane cùng ghi mục `N-08` vào `BACKLOG.md` gốc trong vòng vài phút —
  một mục của phiên điều phối, một của `claude-flow-active`. Cả hai đều **đã vào HEAD**. Không
  lớp nào báo, và `backlog-check` chỉ đếm mục thiếu trường, không đếm mục trùng mã: nó gộp hai
  khối thành một mã rồi báo mã đó thiếu trường, làm người đọc đi sửa nhầm khối.
- **vì sao nó sẽ còn xảy ra:** ba sổ ở gốc repo (`IDEAS.md`, `BACKLOG.md`, `HANDOFF.md`) **cố ý**
  miễn khoá cho thao tác thêm dòng — không có nó thì không lane nào ghi được Log. Miễn khoá
  nghĩa là **nhiều lane cùng ghi hợp lệ**, và cả hai cùng đọc thấy "số kế tiếp là 08".
- **KHÔNG phải cách sửa:** bỏ miễn khoá. Đo 02/09: 19% lượt nhận khoá gốc chỉ để làm một việc
  hành chính rồi trả ngay.
- **cách rẻ nhất:** đừng cấp số tập trung — chỉ cần **phát hiện trùng** rồi báo đỏ, người sửa mất
  30 giây. Cấp số tập trung là dựng một cái khoá thứ hai cho đúng thứ vừa được miễn khoá.

**Ghi chú N-10 · tiến độ 2026-09-06 · nửa đầu XONG** (không phải một mục mới — xem dòng ĐÓNG ở cuối sổ)

- `BRIEF-K2-KHOA-RANH-01` đã sửa: tín hiệu đổi tên thành **"chưa thấy dấu vết trong repo"**, thêm
  mục 2b **cấm nhả khoá hộ lane khác dựa trên phép đo** (ba đường hợp lệ, không có đường thứ tư),
  ca `claude-codex-ngan` được đánh dấu là **dương giả** thay vì bằng chứng, và nghiệm thu nay ghim
  **đúng chữ** — chỗ nào in ra "rảnh" thì phép ghim ĐỎ.
- **Còn nợ để đóng hẳn:** câu cấm đó phải vào `AGENTS.md` mục 1 (vùng `_root`), vì đó là chỗ phiên
  điều phối đọc và cũng là chỗ nó đã làm sai. Việc này đi kèm lượt làm `K2` chứ không tách riêng.

**Ghi chú N-06 · 2026-09-06** (không phải một mục mới — xem dòng ĐÓNG ở cuối sổ)

- `BRIEF-SCOUTER-SEED-01` mục 2 đã sửa: bỏ câu "6 file giống hệt nhau", thay bằng **bảng đo thật
  năm file** (một file trùng cả ba · hai file Gemini = Flow Video nhưng ChatGPT khác · hai file
  cả ba khác nhau), kèm câu lệnh để lượt sau tự đo lại, và một câu dặn thẳng: chép bản Gemini vì
  nó gần tay nhất là **đẻ ra bản trôi dạt thứ tư**.
- Mục 1 của brief cũng được đóng dấu **XONG — ĐẠT** cho phép đo `isTrusted`, để lượt sau không
  chạy lại phép đo đã có kết quả.

## N-13 · Nút CHAT ZOOM ở gói Flow Video hỏi câu hỏi của runner, nên tự xám trên trang Flow hợp lệ

- **mở:** 2026-09-06 · lane `claude-gemini-hoan-thien`
- **vùng:** `workers/duc-auto-gg-flow-video` (KHÔNG phải vùng tôi — chỉ ghi, không tự sửa)
- **đóng khi:** cổng của nút phóng to trong `sidepanel.js` của gói Flow Video hỏi origin thay vì
  hỏi đúng đường dẫn công cụ, có phép ghim canh đúng chỗ đó, và đột biến đổi nó về
  `isProviderUrl` làm suite gói đó ĐỎ.
- **ca thật:** Đức báo "chat zoom bị lỗi" 06/09. Lane `claude-flow-active` đã vá **phần chẩn
  đoán** ở gói Flow (`7506264`) và ghi rõ *"đây mới là bản vá chẩn đoán, chưa phải bản vá gốc
  bệnh"*. Tôi vá gói Gemini cùng ngày và **tìm ra gốc bệnh**: cổng nút phóng to gọi
  `isProviderUrl` — câu hỏi của runner, *"một run có được phép gõ vào tab này không"* — nên nó
  đòi đúng **mặt** trang. Nút phóng to chỉ gọi `chrome.tabs.setZoom`: không gửi gì, không gõ gì.
- **vì sao gói Flow gần như chắc chắn dính y hệt:** `isChatGPTUrl` của nó cũng ủy quyền cho
  `isProviderUrl`, mà predicate đó đòi `^https://labs.google/fx/<locale>tools/flow`. Miền
  `labs.google` còn chứa nhiều trang khác; đứng ở bất kỳ trang nào trong đó là nút xám.
- **số đo bên Gemini, để lượng hoá:** 6 trên 10 hình dạng địa chỉ Gemini thường gặp bị chặn —
  trang gốc, một Gem, hội thoại chia sẻ, trang cài đặt. Nhánh ChatGPT hỏi câu origin và chạy tốt.
- **cách sửa đã dùng ở Gemini, chép sang được:** thêm `isProviderOrigin` vào adapter (giữ danh
  sách host ở MỘT chỗ, không gõ cứng regex vào `sidepanel.js`) rồi cho cổng nút phóng to hỏi câu
  đó. Vẫn đòi `https` + đúng host, nên không mở đường zoom nhầm cửa sổ.

## N-14 · Phép kiểm zoom di sản fork là đồ chết ở CẢ BA gói — đã đo, không phải nghi

- **mở:** 2026-09-06 · lane `claude-gemini-hoan-thien`
- **vùng:** `workers/duc-auto-chatgpt` + `workers/duc-auto-gg-flow-video` (gói Gemini đã xử lý)
- **đóng khi:** không gói nào còn một phép kiểm zoom tự định nghĩa lại logic trong chính file
  test; mỗi gói có một phép kiểm trích thân hàm thật từ `sidepanel.js` rồi chạy, và đột biến vào
  `sidepanel.js` làm nó ĐỎ.
- **ca thật:** `tests/chatgpt-zoom-control-smoke.mjs` **nằm trong gói Gemini** tự định nghĩa lại
  `isChatGPTUrl` bằng regex của **ChatGPT**, rồi tự viết lại `simulateZoomSync` và
  `simulateSetZoom` ngay trong file test. Nó khẳng định `https://chatgpt.com/` là địa chỉ hợp lệ —
  trong gói Gemini. **Đo bằng máy:** chạy 9 đột biến vào `sidepanel.js` của gói Gemini, nó XANH
  cả 9. Lane `claude-flow-active` tìm ra cùng chuyện ở gói Flow và mở `F-28` bên đó.
- **đã làm ở gói Gemini:** thay bằng `tests/zoom-control-smoke.mjs` — trích thân hàm thật rồi
  chạy trong sandbox; đột biến **11/11** bị bắt. File chết **chưa xoá**: xoá file cần Đức duyệt.
- **một cái bẫy để phiên sau khỏi mất giờ:** sân khấu giả phải cho nút khởi đầu ở trạng thái
  **TẮT**, đúng như `sidepanel.html` ship. Cho nó khởi đầu BẬT thì đột biến xoá lệnh bật nút vẫn
  XANH — đã dính đúng lượt viết phép kiểm mới, phát hiện được nhờ chạy đột biến chứ không nhờ đọc.

**Ghi chú N-10 · 2026-09-06** (không phải một mục mới — xem dòng ĐÓNG ở cuối sổ)

- Nửa sau đã xong: `AGENTS.md` mục 1 nay có một gạch đầu dòng **cấm nhả khoá hộ lane khác dựa
  trên phép đo**, kèm ba đường hợp lệ để một khoá được trả và một câu kể ca thật 06/09. Đặt ngay
  trước dòng *"muốn giành vùng người khác đang giữ → hỏi Đức"* vì hai luật đó cùng một họ.
- Cả hai điều kiện trong `đóng khi:` đã đạt → mục này đóng.

## N-15 · Nối `claim.mjs` vào một ống làm cú TỪ CHỐI của nó biến mất

- **mở:** 2026-09-06 · lane `claude-gemini-hoan-thien`
- **vùng:** `_code`
- **đóng khi:** lệnh: có phép ghim chứng minh một lượt `--take` bị từ chối vẫn làm hỏng cả chuỗi
  lệnh khi được nối ống — hoặc `AGENTS.md` mục 1 có một dòng cấm nối `claim.mjs` vào ống.
- **ca thật, tôi vừa dính:** chạy
  `node scripts/claim.mjs --take _root --as <phiên> ... | tail -3 && git commit ...`.
  Lệnh nhận khoá **TỪ CHỐI** đúng như phải thế (`_root` vừa bị lane khác nhận). Nhưng mã thoát
  của một đường ống là mã thoát của lệnh **CUỐI** — tức `tail`, luôn là 0. Nên `&&` vẫn chạy, và
  `git commit` ghi vào một file thuộc vùng tôi **không** có quyền.
- **vì sao nó nguy hiểm hơn vẻ ngoài:** `claim.mjs` được thiết kế rất cẩn thận để từ chối đúng
  lúc, và nó đã từ chối đúng. Lớp bảo vệ chạy hoàn hảo rồi bị **một ký tự `|` nuốt mất**. Ai đọc
  màn hình cũng thấy chữ `TU_CHOI` — nhưng vào lúc đó lệnh sau đã chạy xong rồi.
- **cách rẻ nhất:** không phải sửa `claim.mjs`. Một dòng luật ở `AGENTS.md` mục 1 — *"đừng nối
  `claim.mjs` vào ống; muốn cắt bớt chữ thì chạy riêng rồi mới chạy lệnh sau"* — là đủ, vì chỗ
  hỏng nằm ở thói quen gõ lệnh chứ không nằm trong script.

## N-16 · Scouter rải trên hai khoá đông nhất repo — đã có ADR, chờ lượt chuyển

- **nhóm:** dephien
- **đóng khi:** lệnh: node scripts/claim.mjs --list hiện `workers/duc-scouter`, và không còn file `observer-*` / `scouter-*` nào ở gốc repo, `scripts/` hay `tests/`
- **mở:** 2026-09-06 · lane `claude-assistant`
- **vùng:** `_root` + `_code` (lượt chuyển) — sau đó là `workers/duc-scouter`
- **đo được 06/09:** sáu file extension ở gốc repo thuộc `_root`; ba phép dò trong `scripts/` và
  ba phép ghim trong `tests/` thuộc `_code`. Nghĩa là **xây Scouter chiếm cả hai khoá đông nhất
  cùng lúc** — `_root` (77% commit chạm) và `_code` (khoá của cổng kiểm, bộ sinh, và `bang-trang-thai/`).
- **Đức chốt:** tách khoá như mọi extension khác → [ADR-0013](docs/adr/0013-scouter-ra-nha-rieng-co-khoa-rieng.md).
  Chỗ đặt `workers/duc-scouter/v0.1.0/`, khoá `workers/duc-scouter`.
- **cách làm đã viết sẵn:** mục 0 của `BRIEF-SCOUTER-SEED-01` — sáu bước, `git mv` chứ không
  copy-rồi-xoá, và **trả `_root` + `_code` ngay sau khi chuyển** trước khi sang việc xây.

- **ĐÓNG N-06** · 2026-09-06 · lane `claude-assistant` · `BRIEF-SCOUTER-SEED-01` mục 2 nay là **bảng đo `md5sum` thật của năm file `bridge-*.js`** thay cho câu "6 file giống hệt nhau", kèm câu lệnh để lượt sau tự đo lại và một câu dặn thẳng rằng chép bản Gemini là đẻ ra bản trôi dạt thứ tư. Đo lại 06/09: đúng **một** file (`bridge-pairing-core.js`) giống hệt cả ba worker.
- **ĐÓNG N-10** · 2026-09-06 · lane `claude-assistant` · cả hai điều kiện đạt. ⑴ `BRIEF-K2-KHOA-RANH-01`: tín hiệu đổi tên thành **"chưa thấy dấu vết trong repo"**, mục 2b mới **cấm nhả khoá hộ lane khác dựa trên phép đo** (ba đường hợp lệ), ca `claude-codex-ngan` đánh dấu là **dương giả**, nghiệm thu ghim đúng chữ — in ra "rảnh" thì phép ghim ĐỎ. ⑵ `AGENTS.md` mục 1 có gạch đầu dòng cùng luật đó, đặt cạnh luật "muốn giành vùng thì hỏi Đức".
- **GHI CHÚ SỔ** · 2026-09-06 · lane `claude-assistant` · ba khối tiêu đề tôi vừa thêm cho `N-06` và `N-10` (*"tiến độ"*, *"đóng"*, *"ĐÓNG"*) là **sai hình dạng** — luật mục 4 của sổ này nói đóng mục là **một dòng `- **ĐÓNG N-xx**` ở cuối**, không phải một khối `##` mới. Khối `##` mới mang lại mã cũ nên bảng đếm nó thành mục đang mở, và bảng đã báo thừa 2 mục nợ trước khi có hai dòng trên. Không sửa khối cũ (luật mục 1) — để lại làm bản ghi. **Đây đúng là ca mà `N-12` nói tới**: sổ miễn khoá không có ai canh hình dạng lúc ghi.

## N-13 · cập nhật 2026-09-06 · HẠ MỨC — có thật, nhưng KHÔNG phải cái Đức gặp

- **đóng khi:** lệnh: đóng cùng lúc với mục `N-13` gốc ở trên — `git grep -n "isProviderUrl" workers/duc-auto-gg-flow-video/v0.1.0/sidepanel.js` không còn trỏ vào cổng của nút phóng to.
- **Đức báo 06/09:** nút phóng to ở gói Flow Video **đã dùng được**. Nên mục `N-13` ở trên
  **nói quá**: nó viết như một lỗi đang cắn, thực ra là một lỗi **nằm chờ**.
- **Đo lại trên `origin/main` cùng ngày, không tin báo cáo:** gói Flow **chỉ có bản vá chẩn
  đoán** (`7506264`). Cổng vẫn `return window.DacProviderAdapter.isProviderUrl(url)`, và
  `ORIGIN.urlPatterns` vẫn đòi `^https://labs.google/fx/<locale>tools/flow`. **Không dòng nào
  của gốc bệnh được sửa.**
- **Ghép hai điều đó lại thì ra kết luận đúng:** cổng chặt vẫn còn, nhưng nó **cho qua** đúng
  trang Đức thật sự dùng — trang công cụ Flow. Nó chỉ cắn khi tab đang xem là một trang
  `labs.google` KHÁC. Nên đây là nợ **mức thấp**, không phải việc chặn đường.
- **Vì sao vẫn giữ mở thay vì đóng:** `labs.google` là miền chứa nhiều công cụ FX; đứng ở bất kỳ
  cái nào khác là nút xám không lý do rõ ràng. Cách sửa đã có sẵn và đã chạy ở gói Gemini —
  thêm `isProviderOrigin` vào adapter rồi cho cổng hỏi câu đó. Điều kiện đóng ở mục gốc giữ nguyên.
- **Bài học cho chính tôi:** tôi suy ra "gần như chắc chắn dính" từ việc đọc code, và phần đọc
  code thì **đúng** — cổng đúng là hỏi nhầm câu. Cái tôi suy sai là **mức độ**: từ "code có lỗi"
  nhảy sang "Đức đang gặp lỗi này" mà không có một phép đo nào nối hai chỗ đó. Đúng loại suy diễn
  mà nhãn **[DÒ]** ở sổ các gói sinh ra để cảnh báo.

- **GHI CHÚ SỔ** · 2026-09-06 · lane `claude-assistant` · `N-12` vừa xảy ra **lần thứ hai trong một ngày**: tôi ghi một mục `N-13`, mà lane `claude-gemini-hoan-thien` đã dùng số đó trước. Mục của tôi đổi thành `N-16`. Trong cùng lượt, ba khối `##` sai hình dạng tôi thêm cho `N-06`/`N-10` đã **đỏ cổng đóng phiên với mọi phiên** (`backlog-check`: 4 mục thiếu `đóng khi:`) — nên chúng được hạ khỏi cấp tiêu đề thành dòng ghi chú, chữ giữ nguyên. Bài học: *"để lại làm bản ghi"* không phải một lựa chọn khi cái để lại **chặn người khác đóng phiên**.

## N-17 · `npm run test:worker` mang tên chung nhưng trỏ cứng vào MỘT gói

- **mở:** 2026-09-06 · lane `claude-gemini-hoan-thien`
- **vùng:** `_root` (`package.json`)
- **đóng khi:** lệnh: `npm run test:worker` bị xoá hẳn (và README nào nhắc nó thì trỏ thẳng vào
  `run-all.mjs` của gói mình) — hoặc nó nhận tên gói làm tham số thay vì đóng cứng một đường dẫn.
- **ca thật, đã đo:** `README.md` của gói **Gemini** viết *"`npm run test:worker` runs only this
  worker"*. Đọc `package.json`: lệnh đó là `node workers/duc-auto-chatgpt/v0.1.0/tests/run-all.mjs`
  — **gói ChatGPT**. Ai tin câu đó sẽ chạy nhầm suite rồi kết luận nhánh Gemini xanh **trong khi
  nó chưa chạy một dòng nào**.
- **phạm vi đã đo, không đoán:** `grep -rn "test:worker" workers/*/*/README.md` → chỉ **hai** chỗ
  nhắc tới nó. README gói ChatGPT nói câu y hệt và với gói đó thì câu ấy **ĐÚNG**. Hai gói còn
  lại không nhắc. Nên đây là một lỗ **hẹp**, không phải bốn chỗ hỏng.
- **vì sao vẫn đáng ghi:** đúng con bệnh mà `G-09` đã đóng ở tầng `npm test` — *xanh giả về mặt
  phủ*. `G-09` vá được lớp đó và có phép ghim canh, nhưng `test:worker` là lệnh **thứ hai** trỏ
  cứng vào một gói, mang một cái tên nghe như dùng chung, và **không lớp nào canh nó**.
- **đã làm ở gói Gemini:** README nay đưa lệnh chạy thẳng và nói rõ `test:worker` KHÔNG chạy gói
  này. Đó là vá phần chữ — cái tên vẫn còn gây hiểu nhầm cho tới khi ai giữ `_root` xử lý.

## N-09 · Bộ sinh bảng gãy vì đơn vị GỐC bị dọn đi mà chỗ khai chưa theo — chặn push MỌI lane

**Đo 06/09** (`claude-flow-active`, phát hiện khi bị `safe-push` từ chối):
`node scripts/build-dashboard.mjs` **không sinh được**, báo
`DASHBOARD_READ_FAILED` với nguyên văn:
`fatal: path 'manifest.json' does not exist in <HEAD>`.

Nguyên nhân: commit `6a4f9b6` (*feat(scouter): nhà riêng theo ADR-0013*) dọn Scouter ra
`workers/duc-scouter/v0.1.0/` và **xoá `STATUS.md` + `manifest.json` ở gốc repo**. Nhưng bộ
sinh vẫn đọc một **đơn vị GỐC** cố định (`statusPath = "STATUS.md"` trong
`scripts/build-dashboard.mjs`), rồi theo `version_source` của nó sang `manifest.json` gốc —
file nay đã không còn.

**Vì sao nó không chỉ là chuyện của một lane:** `safe-push` từ chối đẩy khi bản sinh không
khớp HEAD. Bộ sinh không chạy được thì **không lane nào đẩy được**, kể cả lane không đụng gì
tới Scouter. Lúc ghi mục này commit `6a4f9b6` **chưa lên origin**, nên hỏng mới ở local — đẩy
nó lên trước khi vá là mang cái chặn đó cho mọi phiên.

Không tự sửa: `scripts/` là `_code` và gốc repo là `_root`, cả hai đều có chủ khác. Lane
`claude-flow-active` **giữ khoá gói mình và giữ commit chưa đẩy**, đúng luật mục 1.

**Đóng khi:** `node scripts/build-dashboard.mjs` chạy trọn trên một cây sạch không có
`STATUS.md`/`manifest.json` ở gốc, và có phép ghim canh trường hợp repo **không có** đơn vị
gốc — `.repo-structure.json` đã lường trước chuyện này (`root_dir null = repo không có đơn vị
con`), nên đường ngược lại cũng cần được khai chứ không gõ cứng.

## N-10 · Trang bảng phụ thuộc ĐỒNG HỒ — đúng cái bệnh `AGENTS.md` viết ra để cấm

**Đo 06/09** (`claude-flow-active`). Sinh lại `DASHBOARD-Chrome-Extension-AI-Agentic.html`
hai lần cách nhau ít phút, **không dữ liệu nào đổi**, mà file vẫn khác đúng 2 dòng:

```
cũ : <span class="mn">Nhận vùng dưới một giờ</span>
mới: <span class="mn">Nhận vùng 1 giờ trước</span>
```

Trang nhúng **tuổi của lượt nhận khoá tính theo đồng hồ**. Chính `AGENTS.md` đã viết về file
này: *"Nội dung suy hoàn toàn từ HEAD, cố ý … nếu nó phụ thuộc giờ đồng hồ thì sang ngày mới
là mọi phiên bị chặn push dù không dữ liệu nào đổi."* Luật đúng, nhưng thực tế không theo —
và nó nổ ở quy mô **giờ**, không phải ngày, nên nó nổ thường xuyên hơn nhiều.

**Hậu quả đo được:** `safe-push` đòi bản sinh khớp HEAD. Sinh xong, commit, chạy `safe-push`
— nếu đồng hồ vượt một mốc trong khoảng đó thì **lại lệch**. Ngày 06/09 lane này thử đúng ba
lượt liên tiếp và không lượt nào qua. Không lane nào đẩy được một cách tin cậy, và không ai
làm gì sai cả.

**Nặng thêm vì hai chuyện cộng dồn cùng lúc:**
① `feature-parity.mjs` đếm số dòng từ **cây làm việc**, nên nó lệch ngay khi một lane khác
đang sửa dở một file — kể cả file chẳng liên quan gì tới lane đang đẩy.
② nhiều lane commit liên tục, nên HEAD là mục tiêu di động: sinh theo HEAD xong thì HEAD đã
khác. Ba thứ này chồng lên nhau biến cổng xuất bản thành một cuộc đua mà ai cũng thua.

**Đóng khi:** sinh trang hai lần cách nhau vài giờ trên cùng một HEAD cho ra file **giống hệt
từng byte**, và có phép ghim canh điều đó (sinh hai lần với đồng hồ giả cách nhau 26 giờ, so
băm). Tuổi tương đối muốn hiện thì để đoạn JS trong trang tự tính lúc MỞ trang — đúng cách
trang này đang làm với ngày sinh, chứ không nướng sẵn vào file.

**Chưa tự sửa:** `scripts/` là `_code`. Đức đã chốt cho `claude-flow-active` mượn `_code`
(06/09), nhưng lúc kiểm thì lane `claude-scouter-seed` **đang sửa dở** `scripts/build-dashboard.mjs`
và `tests/build-dashboard-smoke.mjs` trong chính vùng đó. Nhận khoá lúc ấy là giẫm chân thật,
nên lane này dừng lại và báo Đức thay vì dùng quyền vừa được cho.

## N-10 · ĐÍNH CHÍNH + ĐÃ VÁ 06/09 (`claude-flow-active`, Đức chốt cho mượn `_code`)

**Chẩn đoán ban đầu của mục N-10 ở trên là SAI, và sai theo hướng đổ lỗi nhầm chỗ.** Tôi viết
*"trang phụ thuộc đồng hồ"*. Đọc code thì `tuoiTuMoc` **không** đọc đồng hồ hệ thống — nó lấy
giờ commit của HEAD trừ giờ nhận khoá, và chú thích dài ngay trên nó giải thích rõ vì sao cố ý
làm vậy. Chốt đó **đúng** và tôi giữ nguyên.

Chỗ sai nằm cao hơn một tầng và tinh hơn: **nướng chuỗi tuổi vào file** làm file phụ thuộc
**giờ commit của HEAD** — mà chính việc commit file đó lại sinh ra một HEAD mới. Tự tham chiếu.
Nó chỉ nổ khi tuổi vừa vượt một mốc (60 phút / 24 giờ), nên nó im lặng phần lớn thời gian rồi
chặn mọi lane đúng lúc không ai ngờ.

**Vá:** khối luồng nay mang **mốc nhận nguyên văn** từ bảng chủ sở hữu, không mang chuỗi tuổi.
Trang hiện *"Nhận vùng lúc 2026-09-06 14:10"*. Hàm `tuoiTuMoc` và mọi khẳng định của nó
**giữ nguyên** — không gỡ lớp bảo vệ nào, chỉ thôi nướng kết quả vào file.

**Ghim:** `tests/build-overview-smoke.mjs` — cùng dữ liệu, hai mốc sinh cách nhau **26 giờ**,
khối luồng phải **giống hệt**; và không dòng luồng nào được mang chuỗi tuổi đã nướng sẵn.
Đây đúng là câu hỏi mà bộ ghim cũ chưa từng hỏi: nó kiểm hàm deterministic, không kiểm
**artifact** deterministic.

## N-11 · Đường dẫn thư mục lọt lên bảng qua ô "việc cho Đức"

**Đo 06/09** (`claude-flow-active`, gặp khi chạy suite gốc sau lúc mượn `_code`):
`tests/build-overview-smoke.mjs` **ĐỎ** với
`bang KHONG duoc chua duong dan thu muc (khop /workers//)`.

Nguồn: trường `human_action` của `workers/duc-scouter/v0.1.0/STATUS.md` viết nguyên một đường
dẫn thư mục vào câu dành cho Đức đọc. Bộ sinh chép thẳng câu đó lên bảng, và phép kiểm bắt.
Luật vàng 5 nói chữ Đức đọc phải là chữ cho người; đường dẫn kho mã thì không phải.

**Không tự sửa:** `workers/duc-scouter` là vùng của lane `claude-scouter-seed`, đang có chủ.
Lỗi này có TRƯỚC lượt mượn `_code`, nên nó cũng đang đỏ với chính lane đang giữ vùng đó.

**Đóng khi:** `human_action` của gói Scouter nói việc bằng chữ cho người ("nạp lại tiện ích từ
thư mục mới"), không kèm đường dẫn; và `node tests/build-overview-smoke.mjs` xanh.

## N-18 · Sửa code trong một gói worker làm `FEATURE-PARITY.md` lệch — mà sinh lại nó cần `_root`

- **mở:** 2026-09-06 · lane `claude-gemini-hoan-thien`
- **vùng:** `_root` (`.repo-structure.json` hoặc `scripts/feature-parity.mjs`)
- **đóng khi:** lệnh: một lane chỉ giữ khoá gói worker của mình **đẩy được** sau khi sửa code làm
  đổi các con số trong khối `AUTO:` — không phải mượn `_root`, và không phải nhờ lane khác.
- **thế kẹt, đã gặp HAI LẦN trong ngày 06/09:** sửa code trong `workers/duc-auto-gemini` làm các
  khối `AUTO:` của `FEATURE-PARITY.md` lệch (số dòng file, số method Bridge). Cổng xuất bản
  **từ chối đẩy** cho tới khi sinh lại. Nhưng `FEATURE-PARITY.md` **cố ý không** nằm trong danh
  sách bốn artifact miễn khoá, nên sinh lại nó phải giữ `_root` — mà `_root` là khoá đông nhất
  repo. Kết quả: **một lane worker không tự đẩy được việc của chính mình.**
- **vì sao lý do loại trừ nó vẫn ĐÚNG:** mục 2 của file đó là chữ của người, và luật hiện tại bảo
  vệ đúng chỗ đó. Vấn đề không phải luật sai, mà là luật đang khoá **cả file** trong khi thứ bộ
  sinh chạm tới chỉ là các khối `AUTO:`.
- **hai đường, chưa chọn:**
  ① Cho `feature-parity.mjs` một chế độ **chỉ ghi trong khối `AUTO:`** và khai nó vào danh sách
    miễn khoá theo chế độ đó. Đúng bản chất, nhưng phải chứng minh nó **không thể** chạm mục 2 —
    cần một phép ghim đột biến, không chỉ một lời hứa.
  ② Tách các khối `AUTO:` ra một file riêng và `FEATURE-PARITY.md` chỉ trỏ sang. Đơn giản hơn về
    cưỡng chế, nhưng làm người đọc phải mở hai file để thấy một bức tranh.
- **cách chữa cháy hiện tại, và vì sao nó không đủ:** hỏi Đức từng lượt. Đức đã chốt một lượt
  ngày 06/09 (giữ lần ghi đó, vì gỡ ra thì chặn đẩy CẢ REPO kể cả lane đang giữ `_root`). Nhưng
  hỏi từng lượt là một cái thuế lặp lại, và nó rơi đúng vào Đức — người bận nhất.

## N-12 · Cổng xuất bản chặn lane A vì artifact của lane B — và lane A không được phép sửa

**Đo 06/09** (`claude-flow-active`). `safe-push` từ chối: `FEATURE-PARITY.md` lệch vì lane
Gemini vừa đổi code, nên bảng đối chiếu tính năng cần sinh lại. Nhưng file đó **đòi khoá
`_root`** (mục 2 của nó là chữ của người), mà `_root` đang có chủ khác. Lane đang muốn đẩy
không sửa được, và cũng không nên giành.

Khác N-10 ở chỗ: N-10 là artifact **tự** bất ổn, vá được. Đây là artifact ổn định nhưng nằm
**sau một khoá mà lane bị chặn không giữ**. Không lane nào làm gì sai cả.

Cách đi vòng hiện tại: giữ khoá, giữ commit, chờ lane kia đẩy — đúng luật mục 1, nhưng nó
biến thứ tự đẩy thành thứ tự ngẫu nhiên giữa các lane.

**Đóng khi:** hoặc bộ sinh đối chiếu tính năng vào danh sách miễn khoá như bốn artifact kia
(cần tách mục 2 ra file riêng trước — mục 2 là lý do duy nhất nó chưa được miễn), hoặc
`safe-push` phân biệt được "artifact lệch vì việc CỦA BẠN" với "lệch vì việc của lane khác"
và chỉ chặn ở ca thứ nhất.

- **CẬP NHẬT Y-12 + Y-07** · 2026-09-07 · lane `claude-assistant` · **Đức đã chốt: ĐÁNG LÀM.** Câu chờ Đức ở `Y-12` (*"có đáng bỏ công tăng tốc bộ kiểm không"*) coi như đã trả lời — hai mục này nhập làm một lượt, đừng mở mục mới. **Số cũ trong hai mục đã lạc hậu nặng**: `Y-12` ghi *"suite hơn hai phút, một lượt sinh ~12 giây"*, `Y-07` ghi *"129 giây"*. Đo lại 06/09 (phiên `claude-scouter-seed`) ra con số khác hẳn — **cổng đóng phiên ~10 phút**, `tests/build-overview-smoke.mjs` **392 giây (hơn 70% cổng)**, `tests/build-dashboard-smoke.mjs` **99 giây**, một lượt `buildOverview` trên repo thật **21 giây** và phép ghim gọi lại **7 lần**. Hai hướng nghi, **đo lại trước khi tin**: ⑴ bảy lượt dựng cùng một mô hình trên deps đã ghim vào một commit thì cho kết quả giống hệt nhau — dựng một lần rồi dùng lại có thể cắt phần lớn 392 giây; ⑵ vì sao MỘT lượt đã mất 21 giây. **Ràng buộc cứng của Đức:** cấm làm yếu phép ghim để nó nhanh lên — số phép kiểm và số vế được ghim phải **giữ nguyên hoặc tăng**, chứng minh bằng đếm trước/sau, và phải chạy đột biến kiểm. Vùng: `_code`.

- **THÊM VÀO N-12** · 2026-09-07 · lane `claude-assistant` · Trùng mã nay là **bốn cặp**, không phải một: `N-08` ×2 · `N-13` ×2 · `N-09` ×2 · `N-10` ×3. Lane `claude-flow-active` mở năm khối mang mã đã có chủ (dòng 861 · 887 · 923 · 944 · 984) và cả năm thiếu `đóng khi:` — **cổng đóng phiên ĐỎ với MỌI phiên**. Nên `backlog-check` cần thêm một vế nữa: **mọi dòng báo lỗi phải kèm SỐ DÒNG của đúng khối bị lỗi**. Hiện nó chỉ in mã, mà một mã có thể ở hai chỗ, nên người đọc đi sửa nhầm khối — đã xảy ra thật 06/09. Nói gọn: **bộ kiểm phải đếm theo KHỐI, không theo MÃ**; gộp theo mã là chính nó đang giả định điều mà `N-12` nói là sai.

## ĐÓNG · N-09 (2026-09-07, `claude-scouter-seed`) — bộ sinh bảng chịu được gốc repo không còn là đơn vị

Vá ở commit `87545f1`. Ba chỗ, và cả ba là cùng một câu: **gốc repo có thể không phải đơn vị nào**.
Không còn marker thì ⑴ phần đo version bỏ trống thay vì ném · ⑵ không đếm thành "thiếu STATUS"
nữa (đó là khoản nợ **không ai đóng được** — không có gì ở đó để khai) · ⑶ không hiện trên bảng
của Đức, và mẫu số của `llms.txt` đếm theo số **đơn vị** chứ không phải số hàng.
Phép ghim `E7b` trong `tests/build-dashboard-smoke.mjs` ghim **cả hai chiều**: mất marker thì
không ném/không đếm nợ/không lên bảng · còn marker thì y hệt như cũ. Suite dashboard 99/99.

Kèm theo, phát hiện muộn hơn cùng một gốc bệnh: fixture của `tests/build-overview-smoke.mjs`
cắm dấu `@Đức` vào `STATUS.md` **ở gốc repo**, nên nó chết bằng
`fatal: path 'STATUS.md' does not exist in <HEAD>` ngay khi file đó được dọn đi. Đã sửa để
fixture chọn một đơn vị THẬT khác GPT, chọn theo thứ tự đường dẫn nên lượt nào cũng ra một file.

Điều kiện đóng của chính mục này (`build-dashboard.mjs` chạy trọn trên cây không có
`STATUS.md`/`manifest.json` ở gốc, và có phép ghim canh) đã đạt cả hai vế.

- **ĐỔI MÃ N-09 → N-19** · 2026-09-07 · lane `claude-k2-vung-mien-khoa` · khối *"Bộ sinh bảng gãy vì đơn vị GỐC bị dọn đi mà chỗ khai chưa theo"* (`claude-flow-active`, 06/09) trùng mã với `N-09` *"Khoá bị giữ mà vùng chưa bị chạm"*. Chữ khối cũ giữ nguyên — luật mục 1 của sổ; từ nay đọc khối đó là `N-19`. · **đóng khi:** lệnh: node scripts/build-dashboard.mjs chạy được, không báo `DASHBOARD_READ_FAILED`
- **ĐỔI MÃ N-10 → N-20** · 2026-09-07 · lane `claude-k2-vung-mien-khoa` · khối *"Trang bảng phụ thuộc ĐỒNG HỒ"* (`claude-flow-active`, 06/09) trùng mã với `N-10` *"Vùng chưa bị chạm KHÔNG chứng minh được lane đang rảnh"*. Từ nay đọc khối đó là `N-20`. · **đóng khi:** lệnh: sinh trang hai lần trên cùng một HEAD ra file giống hệt từng byte, và node tests/build-overview-smoke.mjs canh được điều đó (nguyên văn điều kiện trong khối)
- **ĐỔI MÃ N-10 → N-21** · 2026-09-07 · lane `claude-k2-vung-mien-khoa` · khối *"ĐÍNH CHÍNH + ĐÃ VÁ 06/09"* là bản đính chính của `N-20` ở trên, nhưng nó được ghi thành một khối `##` mang lại mã cũ nên sổ đếm nó thành mục thứ ba cùng mã. Từ nay đọc khối đó là `N-21`. · **đóng khi:** lệnh: node tests/build-overview-smoke.mjs xanh — khối luồng sinh với hai mốc cách nhau 26 giờ phải giống hệt nhau
- **ĐỔI MÃ N-11 → N-22** · 2026-09-07 · lane `claude-k2-vung-mien-khoa` · khối *"Đường dẫn thư mục lọt lên bảng qua ô việc cho Đức"* (`claude-flow-active`, 06/09) trùng mã với `N-11` *"Hai bảng trạng thái, Đức không biết mở cái nào"*. Từ nay đọc khối đó là `N-22`. · **đóng khi:** lệnh: `human_action` của gói Scouter nói việc bằng chữ cho người, không kèm đường dẫn, và node tests/build-overview-smoke.mjs xanh
- **ĐỔI MÃ N-12 → N-23** · 2026-09-07 · lane `claude-k2-vung-mien-khoa` · khối *"Cổng xuất bản chặn lane A vì artifact của lane B"* (`claude-flow-active`, 06/09) trùng mã với `N-12` *"Sổ miễn khoá không có ai cấp số"*. Từ nay đọc khối đó là `N-23`. · **đóng khi:** lệnh: hoặc bộ sinh đối chiếu tính năng vào danh sách miễn khoá, hoặc safe-push phân biệt được artifact lệch vì việc CỦA BẠN với lệch vì việc của lane khác (nguyên văn điều kiện trong khối)
- **ĐỔI MÃ N-13 → N-24** · 2026-09-07 · lane `claude-k2-vung-mien-khoa` · khối *"cập nhật 2026-09-06 · HẠ MỨC"* là bản cập nhật của `N-13`, nhưng ghi thành khối `##` mang lại mã cũ. Từ nay đọc khối đó là `N-24`.
- **GHI CHÚ SỔ** · 2026-09-07 · lane `claude-k2-vung-mien-khoa` · sáu dòng `ĐỔI MÃ` trên là **cửa ra của `N-12`**, và chúng chỉ THÊM ở cuối — không một chữ nào của khối cũ bị sửa. Đo lúc mở phiên: sổ có **24 khối `## N-`** nhưng chỉ **18 mã**, tức **6 khối trùng mã**; và `node scripts/backlog-check.mjs` ở HEAD đã **ĐỎ sẵn** (5 mục thiếu `đóng khi:`) — tức `npm test` đang hỏng với MỌI lane, không riêng ai. Sáu dòng trên gỡ cả hai.

- **CHỐT Y-12 + Y-07** · 2026-09-07 · lane `claude-assistant` · Đức chốt lần hai, nguyên văn: *"cần improve để tăng tốc, skip nếu có thể và không ảnh hưởng lớn"* — áp cho **cả hai** mục. Chữ *"skip"* này đứng cạnh ràng buộc Đức đưa ở lượt trước (*"KHÔNG được làm yếu phép ghim, số phép kiểm và số vế được ghim phải giữ nguyên hoặc tăng"*), nên ghi rõ cách đọc để executor không phải đoán lúc 3 giờ sáng: **skip = bỏ VIỆC LẶP, không phải bỏ PHÉP KIỂM.** Bảy lượt dựng lại cùng một mô hình trên `deps` đã ghim vào một commit cho kết quả giống hệt nhau; dựng một lần rồi dùng lại là bỏ sáu lượt việc thừa mà **không đổi một phép kiểm nào** — thoả cả hai câu cùng lúc, và đó là chỗ 392 giây nằm. Nếu đo ra một phép kiểm thật sự không tăng tốc được và giá trị thấp thì executor **ĐỀ XUẤT, không tự bỏ**: bỏ một phép kiểm là quyết định của Đức. Nghiệm thu vẫn là **đếm trước/sau** (số phép kiểm · số vế) và **đột biến kiểm** chứng minh phép ghim còn ghim đúng thứ nó đang ghim.
- **ĐÓNG N-13** · 2026-09-07 · lane `claude-flow-zoom` · cả ba điều kiện đạt, và **đọc code xác nhận trước khi sửa** chứ không tin suy luận trong sổ — gói Flow dính đúng y hệt gói Gemini. ⑴ cổng nút phóng to trong `sidepanel.js` nay hỏi `isProviderOrigin` (https + đúng host), `isProviderUrl` **giữ nguyên** cho runner và có ca ghim riêng chống nới nó theo; ⑵ phép ghim canh đúng chỗ đó: `workers/duc-auto-gg-flow-video/v0.1.0/tests/zoom-control-smoke.mjs` — nạp adapter THẬT vào `vm` rồi trích thân hàm thật ra khỏi `sidepanel.js`; ⑶ đột biến đổi cổng về `isProviderUrl` làm suite gói **ĐỎ** (con M01 trong bảng 16 con). Suite gói 102/102.
- **ĐÓNG N-24** · 2026-09-07 · lane `claude-flow-zoom` · cùng lượt với `N-13` như `đóng khi:` của nó đòi. `git grep -n "isProviderUrl" workers/duc-auto-gg-flow-video/v0.1.0/sidepanel.js` nay chỉ còn trỏ vào **cổng của runner** (dòng 2552) và ba dòng chú thích giải thích vì sao hai câu hỏi phải tách nhau — không dòng nào là cổng của nút phóng to.
- **TIẾN N-14 (chưa đóng)** · 2026-09-07 · lane `claude-flow-zoom` · gói Flow Video đã có phép kiểm trích thân hàm thật: đột biến 16 con vào `sidepanel.js` + `provider-adapter.js`, phép ghim mới bắt **16/16**, còn `tests/chatgpt-zoom-control-smoke.mjs` bắt **0/16** — **số đo tại chính gói Flow**, không còn là suy từ gói Gemini. **Chưa đóng vì hai lẽ:** ⑴ file chết ở gói Flow **chưa xoá** — xoá file cần Đức duyệt, đã ghi thành một câu hỏi duy nhất trong `BACKLOG.md` của gói (mục `F-28`); ⑵ gói `workers/duc-auto-chatgpt` chưa ai soi. Một con thoát ở lượt đầu và nó đáng: bỏ `btn.disabled = true` khỏi `lockZoomButtons` mà suite vẫn xanh, vì **mọi** ca đều khởi đầu từ nút đã TẮT nên đường khoá không hề được canh — bẫy anh em với bẫy đã ghi trong mục này, chỉ khác chiều. Đã thêm ca đi từ trạng thái ĐANG BẬT; phiên nào làm gói ChatGPT thì chép cả hai ca.

## N-19 · `git commit --amend` sửa nhầm lịch sử của lane khác — HEAD đổi chủ giữa hai lệnh

- **nhóm:** dephien
- **đóng khi:** lệnh: `node scripts/session-check.mjs` có một phép kiểm cảnh báo khi HEAD mang nhãn `Lane:` của phiên khác, hoặc `AGENTS.md` mục 1 có một câu cấm `--amend` khi HEAD không phải commit của mình
- **mở:** 2026-09-07 · lane `claude-assistant`
- **vùng:** `_code` + `_root`
- **ca thật, tự lane đó báo về:** 07/09 lane `claude-gemini-g08` chạy `git commit --amend` để sửa
  commit của chính nó. Nhưng giữa lúc nó soạn commit và lúc nó gõ lệnh, lane `claude-flow-zoom`
  đã commit — nên **HEAD lúc đó là `54ca40e`, commit của lane kia**, và `--amend` viết đè lên
  lịch sử của họ. Lane phát hiện ngay, `git reset --mixed 54ca40e` khôi phục **đúng SHA gốc**,
  bản bị sửa chưa từng ra remote. Đã kiểm chứng độc lập: `54ca40e` còn nguyên trên remote.
- **vì sao nó sẽ còn xảy ra:** `--amend` không hỏi commit đó của ai, nó chỉ sửa **HEAD**. Trong
  repo một nhánh nhiều lane, **HEAD đổi chủ bất cứ lúc nào** — không có gì báo, và lệnh vẫn chạy
  thành công. Đây là cùng một họ với `N-15`: một thao tác nguy hiểm đi qua trót lọt vì không ai
  hỏi câu "cái này của ai".
- **cách rẻ nhất:** không cấm `--amend` (nó hữu ích thật, và luật đã bắt sửa nhãn `Lane:` hỏng
  bằng đúng lệnh đó). Chỉ cần **hỏi một câu trước khi chạy**: HEAD có mang nhãn của mình không.
  Một dòng trong `AGENTS.md`, và nếu rẻ thì một phép kiểm ở cổng.
- **đừng nhầm với `N-08`:** `N-08` là `git checkout` xoá **trạng thái sống**; mục này là `--amend`
  viết đè **lịch sử**. Hai lệnh khác nhau, cùng một gốc: lane không kiểm quyền sở hữu trước khi ghi.
- **ĐỔI MÃ N-19 → N-20** · 2026-09-07 · lane `claude-assistant` · khối *"`git commit --amend` sửa nhầm lịch sử của lane khác"* trùng mã với lượt đổi mã mà `claude-k2-vung-mien-khoa` vừa ghi ở dòng trên. Từ nay đọc khối đó là `N-20`. Ghi chú cho người sau: bộ kiểm trùng mã **vừa bắt đúng lượt ghi này, trong vòng vài phút** kể từ lúc nó được dựng — mã `N-19` bị chọn trùng vì tôi đếm tiêu đề `##` mà **lượt đổi mã không phải tiêu đề**. Đó là ca thật thứ năm của `N-12` trong hai ngày, và là ca đầu tiên bị máy bắt thay vì người phát hiện sau.
- **LỖ TRONG CHÍNH BỘ GỠ TRÙNG** · 2026-09-07 · lane `claude-assistant` · Dòng `ĐỔI MÃ N-19 → N-20` tôi vừa ghi **không có tác dụng**, và đây là một lỗ thật của cơ chế vừa dựng, không phải tôi ghi sai. `docMucDaGo()` đánh số lần gặp theo **mã GỐC của tiêu đề**, nên một dòng `ĐỔI MÃ X → Y` chỉ áp được cho **khối thứ n mang mã X trong tiêu đề**. Ở đây va chạm nằm giữa ⑴ một khối đã được đổi *sang* `N-19` và ⑵ một tiêu đề vốn là `N-19` — khối ⑵ là khối **đầu tiên** mang mã đó nên nó luôn `n === 0` và không dòng đổi mã nào chạm tới được. Nói gọn: **mã ĐÍCH của một lượt đổi có thể va chạm, mà cơ chế append-only không gỡ nổi va chạm đó.** Cách gỡ đúng, để lượt sau làm: cho `docMucDaGo()` đánh số theo **mã SAU KHI ĐÃ ÁP các lượt đổi trước**, chứ không theo mã gốc — rồi thêm một phép ghim đúng ca này. Trong lúc chưa có, va chạm kiểu này phải sửa tiêu đề (cần khoá `_root`). Vùng: `_code`. Thuộc `N-12`.
- **ĐÓNG PHẦN GÓI ChatGPT của `N-14`** · 2026-09-07 · lane `claude-gpt-don-no` · gói ChatGPT có đúng cùng phép kiểm chết (`tests/chatgpt-zoom-control-smoke.mjs` tự định nghĩa lại `isChatGPTUrl` / `simulateZoomSync` / `simulateSetZoom` ngay trong file test). Đã thay bằng `tests/zoom-control-smoke.mjs` — trích thân hàm thật từ `sidepanel.js` (`ZOOM_LEVELS` → hết `setChatZoom`) rồi chạy trong `node:vm`; **13/13 đột biến vào `sidepanel.js` bị bắt**, 0 mỏ neo hỏng. File chết **chưa xoá** (xoá file cần Đức duyệt) — đầu file nay ghi rõ nó là đồ chết và chỉ sang bản thay thế. Cái bẫy sân-khấu-khởi-đầu-BẬT mà N-14 dặn: dính đúng như dự báo — đột biến "bỏ `btn.disabled = false` ở đường tốt" và "quên tắt nút đang sáng khi rời tab" đều lọt lưới ở vòng thử phá đầu, chỉ đỏ sau khi thêm ca "đang BẬT rồi mới rời sang tab lạ". **Còn lại của `N-14`: gói `duc-auto-gg-flow-video`** (mở riêng thành `F-28` bên đó) — mục này chưa đóng.
- **ĐÓNG N-09** · 2026-09-07 · lane `claude-k2-vung-mien-khoa` · tín hiệu **"chưa thấy dấu vết trong repo"** hiện ở ba chỗ: `node scripts/claim.mjs --list` (một cột) · `node scripts/what-next.mjs` mục B (kèm câu *"HỎI, đừng nhả"*) · cổng đóng phiên (**VÀNG, không chặn**, và nó nói với chính lane đang giữ khoá, kèm câu lệnh tự trả). Một phép đo dùng chung: `dauVetTheoVung` trong `scripts/repo-structure.mjs`. Phép ghim `tests/dau-vet-vung-smoke.mjs` (9 mục) canh **chữ** (in ra "rảnh"/"nhàn"/"không làm gì" là ĐỎ), canh **mức** (so hai lượt cổng, nền phải xanh — vàng không được đổi mã thoát), và canh **cấm máy tự nhả khoá** (ba lượt đo không sửa bảng quyền một byte nào). Git hỏng → `KHONG_DO_DUOC`, không rơi về "chưa thấy". Đột biến kiểm 14/14 bị bắt. **Cố ý KHÔNG đưa lên bảng HTML** (khác brief mục 2): bảng bị `safe-push` so với bản sinh từ HEAD, mà chính lượt commit bảng lại chạm gốc repo nên nó tự đổi đầu vào của mình và chặn mọi lane — đúng bệnh `N-20`; `what-next.mjs` thay chỗ vì nó sống, chỉ đọc, không đòi khoá nào.
- **ĐÓNG N-12** · 2026-09-07 · lane `claude-k2-vung-mien-khoa` · `node scripts/backlog-check.mjs` nay **ĐỎ khi hai khối cùng mang một mã** (mã thoát 1), và phép ghim `tests/backlog-check-smoke.mjs` canh cả hai chiều. Không dựng bộ cấp số tập trung — đó là dựng một cái khoá thứ hai cho đúng thứ vừa được miễn khoá. Cửa ra rẻ ngang cửa vào: **một dòng thêm ở cuối** `- **ĐỔI MÃ N-xx → N-yy**`, mang luôn `đóng khi:` cho mã mới, không sửa một chữ nào của khối cũ; đổi sang một mã đang có người dùng thì **vẫn ĐỎ**. Đo lúc mở phiên: sổ có 24 khối `## N-` nhưng chỉ 18 mã, và `backlog-check` ở HEAD **đã thoát 1 sẵn** — tức `npm test` đang hỏng với mọi lane mà không ai báo.
- **ĐÓNG N-15** · 2026-09-07 · lane `claude-k2-vung-mien-khoa` · `AGENTS.md` mục 1 có một dòng cấm nối `claim.mjs` vào ống, kèm chỗ sửa (chạy riêng, xem kết quả, rồi mới chạy lệnh sau). Phép ghim trong `tests/claim-smoke.mjs` giữ hai vế: ⑴ chạy thật một lượt `--take` bị từ chối qua ống và chứng minh mã thoát của cả chuỗi vẫn là **0** — cái bẫy còn nguyên, và bảng quyền vẫn không đổi chủ; ⑵ canh chính dòng luật đó **trong mục 1**, vì một luật không ai canh thì biến mất trong im lặng (bài học N-01). Không sửa `claim.mjs`: mã thoát bị nuốt ở tầng shell, ngoài tầm với của tiến trình node.
- **ĐỔI MÃ N-20 → N-26** · 2026-09-07 · lane `claude-k2-vung-mien-khoa` · nối tiếp dây đổi của khối *"`git commit --amend` sửa nhầm lịch sử của lane khác"*: `claude-assistant` đã ghi `N-19 → N-20`, nhưng `N-20` cũng đã bị lượt `N-10 → N-20` của tôi chiếm mất, nên nó vẫn trùng. Từ nay đọc khối đó là `N-26`. Khối *"Trang bảng phụ thuộc ĐỒNG HỒ"* giữ `N-20`.
- **VÁ LỖ TRONG BỘ GỠ TRÙNG** · 2026-09-07 · lane `claude-k2-vung-mien-khoa` · lỗ mà `claude-assistant` mô tả ở trên **đã vá**, cùng phiên: `docMucDaGo()` nay đánh số lần gặp theo **mã ĐÃ GIẢI**, không theo mã gốc của tiêu đề, nên các lượt đổi **nối đuôi được** (`N-09 → N-19 → N-20 → N-26`) và mã đích va chạm nay gỡ được **vẫn bằng một dòng thêm ở cuối** — không phải sửa tiêu đề, không cần khoá `_root`. Mỗi dòng đổi dùng đúng một lần nên dây đổi vòng tròn cũng cạn rồi dừng. Phép ghim: mục 13 của `tests/backlog-check-smoke.mjs` dựng đúng ca này (một khối đổi *sang* `X` va vào một tiêu đề vốn là `X`), và nó ĐỎ trên bản cũ. Đây là ca thật thứ sáu của `N-12` trong hai ngày, và là ca thứ hai liên tiếp do máy bắt.
- **CÒN NỢ SAU N-09** · 2026-09-07 · lane `claude-k2-vung-mien-khoa` · `docs/protocols/MULTIFLOW.md` **chưa** được cập nhật cho tín hiệu *"chưa thấy dấu vết trong repo"*: khoá `_docs` có chủ khác suốt phiên, và tôi **không nhả khoá hộ** (luật mục 1). Việc còn lại, cho lane nào giữ `_docs` tiếp: ⑴ chép vào mục 3 luật *"nhận khoá ngay TRƯỚC lượt ghi đầu tiên, một lane một khoá worker"* (đã có ở `AGENTS.md` mục 1); ⑵ thêm vào mục 4 hoặc mục 5 một dòng nói tín hiệu này là **VÀNG, không bao giờ ĐỎ**, và ba đường hợp lệ để một khoá được trả. **đóng khi:** lệnh: `grep -n "chưa thấy dấu vết" docs/protocols/MULTIFLOW.md` có kết quả, và mục 3 của file đó nói "nhận khoá ngay trước lượt ghi đầu tiên".
- **ĐÓNG NỢ MULTIFLOW của N-09** · 2026-09-07 · lane `claude-k2-vung-mien-khoa` · `_docs` trống chủ cuối phiên nên tôi nhận và làm nốt: `docs/protocols/MULTIFLOW.md` mục 3 nay nói *"bước nhận khoá nằm ngay TRƯỚC lượt ghi đầu tiên"* + *"một lane, một khoá worker"*, và điều cấm đầu tiên là **đừng nối `claim.mjs` vào ống**; mục 4 có **bất biến ⑥** — máy hiện ra, người hỏi, máy không bao giờ tự nhả khoá, kèm ba ràng buộc hợp đồng (chữ · mức VÀNG · ba đường hợp lệ) và lý do bảng HTML cố ý không mang tín hiệu này; mục 5 có cái bẫy thứ tư của đột biến kiểm: **nền của repo thử phải XANH trước, nếu không phép so rỗng nghĩa** (đo thật 07/09, một đột biến thoát sạch đúng vì thế). Đổi *"năm bất biến"* thành *"sáu"* ở `AGENTS.md` và `docs/README.md`. Kiểm: `grep -n "chưa thấy dấu vết" docs/protocols/MULTIFLOW.md` có kết quả.
- **ĐÓNG N-14** · 2026-09-07 · lane `claude-assistant` · **Đức duyệt xoá file chết ở gói ChatGPT** (07/09: *"ok xóa file chết gói GPT"*). Đã `git rm workers/duc-auto-chatgpt/v0.1.0/tests/chatgpt-zoom-control-smoke.mjs`, suite gói **114 → 113** và gỡ dòng khai của nó khỏi Bản đồ file. Cùng với lượt xoá ở gói Flow Video hôm nay (`F-28`, suite 102 → 101), **cả ba gói nay không còn phép kiểm zoom nào tự định nghĩa lại logic trong chính file test**. Số đo cuối: bản thay thế bắt **13/13** ở gói ChatGPT · **16/16** ở gói Flow · **11/11** ở gói Gemini; ba file chết bắt **0/9**, **0/16**, **0/16**. Hai file chết đã xoá, gói Gemini không còn file đó từ trước.
- **ĐÓNG CÂU HỎI ALIAS của `B-20`** · 2026-09-07 · lane `claude-assistant` · **Đức chốt: *"Alias: tôi tạm thời chưa cần."*** Nghĩa là **để yên, không gỡ, không nối**. Ba bản sao của logic khớp alias (`runner-core` · `plan-diagnostics-core` · `bridge-proposal-core`) ở lại y nguyên, và mã lỗi `DUPLICATE_ALIAS` cùng phép ghim đang neo vào nó cũng ở lại. Lý do chọn đường này thay vì gỡ: gỡ một bản thì Check Plan và lượt chạy thật nói khác nhau; gỡ cả ba thì phải bỏ `DUPLICATE_ALIAS`, mà mã đó là một trong sáu mã `bridge-plain-failure-classification-smoke.mjs` đang ghim cho `B-16`. Tức là dọn một chỗ thừa **vô hại** bằng cách đụng vào một phép ghim **đang canh việc khác** — lỗ hơn lãi. Cái giữ cho nó không âm thầm trôi dạt là chuông `tests/reference-alias-dead-code-static.mjs` (8/8 đột biến đỏ) mà lane `claude-gpt-don-no` đã dựng: ba bản lệch nhau là báo đỏ. **Mở lại khi nào Đức cần đặt tên ngắn cho ảnh mẫu thật** — lúc đó là nối một ô nhập, không phải gỡ.
- **N-18 · CA THẬT THỨ BA, và lần đầu ở gói ChatGPT** · 2026-09-07 · lane `claude-tran-900` · Nâng trần `run.trial` lên 900 giây (ADR-0015) đụng `sidepanel.js` + `bridge-core.js` của `workers/duc-auto-chatgpt`, làm khối `AUTO:MODULES` của `FEATURE-PARITY.md` lệch **đúng một dòng máy sinh** (dòng 134, `| sidepanel.js | 6274 → 6293 |`). Cổng đóng phiên **XANH TOÀN BỘ**; `safe-push` **TỪ CHỐI** — và nó từ chối vì một con số nằm giữa `<!-- AUTO:MODULES START/END -->`, tức đúng phần mà không một chữ nào của người nằm trong đó. Tôi **không tự đi nhận `_root`** (khoá đang trống, nhưng phiên điều phối giao rõ là báo lại chứ đừng tự lấy), nên **giữ khoá `workers/duc-auto-chatgpt`, 3 commit nằm chờ chưa đẩy**. Số đo mới cho mục này: lượt chặn lần này **không** phải vì lane khác — nó là artifact lệch vì việc CỦA CHÍNH lane bị chặn, tức đúng ca mà đường ① (chế độ chỉ-ghi-trong-`AUTO:` + khai miễn khoá) gỡ được trọn vẹn, còn `N-23` thì không đụng tới. · **đóng khi:** đã có ở khối `N-18` gốc phía trên, không đổi.
