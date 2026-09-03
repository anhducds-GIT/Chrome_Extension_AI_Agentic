# Sổ ý tưởng — phòng chờ của cả repo

> **Đây KHÔNG phải roadmap thứ hai.** Sổ này là **phòng chờ**: chỗ một ý tưởng nằm khi nó
> *chưa có nhà*. Có nhà rồi thì nó rời sổ này.
>
> Vì sao cần: repo đang có 58 mục nợ trong các `BACKLOG.md`, nhưng đó là **sổ của kỹ sư** —
> mã lỗi, race condition, đồng hồ bị bóp. Ý tưởng của Đức không có chỗ nào để nằm, nên nó
> chỉ tồn tại trong đầu và trong chat. Bảng trạng thái vì thế có một ô trống không lấp được.

## Luật của sổ — đọc hết trước khi ghi

1. **Ghi vào đây khi ý tưởng chưa có nhà.** Đã có nhà thì **đừng chép lại** — chép là đẻ ra
   nguồn sự thật thứ hai, đúng cái bệnh cả repo này chữa.

2. **Bốn cửa ra.** Một ý tưởng rời phòng chờ theo **một** trong bốn đường:
   - thành một đơn vị có `STATUS.md` riêng · thành một phiên trong roadmap · thành một mục nợ
     trong `BACKLOG.md` của gói → điền `nhà:` trỏ tới đó, và nó **biến khỏi bảng** (nếu còn
     hiện thì bảng đếm hai lần một việc);
   - **hoặc làm xong luôn tại đây** → đổi `bậc` thành `đã chứng minh` và **để nguyên trong
     sổ**. Nó vẫn hiện trên bảng ở bậc cuối, để Đức thấy việc đã chạy tới đâu.

   > Cửa thứ tư này thiếu ở bản đầu của luật, và Y-04 là ca đầu tiên không lọt vào cửa nào —
   > nó không đi đâu cả, nó **xong**. Vá luật thay vì nhét bừa nó vào một cửa sai.

3. **Hai trường bắt buộc: `bậc` và `việc kế`.** Còn lại tuỳ. **Đức cứ viết một câu** — AI
   chuẩn hoá lại. Đừng để cái sổ này thành thủ tục, vì thủ tục thì Đức sẽ không ghi.

4. **Đang xây thì PHẢI khai `chủ` và `phạm vi`.** Đây chính là thứ cho phép chạy nhiều việc
   song song mà không giẫm chân: `phạm vi` nói được đụng gì và **cấm đụng gì**. Không khai
   thì hai phiên AI sẽ cùng sửa một chỗ — chuyện đã xảy ra thật ngày 25–26/08.

5. **Ý tưởng chết thì KHÔNG xoá** — đổi `bậc` thành `nghỉ` và ghi một câu vì sao. Xoá là mất
   lý do, rồi sáu tháng sau có người đề xuất lại đúng cái đã bị bác.

## Bậc — dùng đúng bốn giá trị này

`ý tưởng` · `đang xây` · `đã chứng minh` · `nghỉ`

Bốn bậc khớp với thanh bậc trên bảng trạng thái. **Đừng tự thêm bậc mới** — thêm là bảng
hiển thị sai.

---

## Y-01 · MVP: dùng Claude Code điều phối GPT

- **bậc:** ý tưởng
- **nguồn:** Đức nêu 2026-09-02
- **việc kế:** Đức mô tả rõ hơn phạm vi thử — xem ba câu chưa rõ ở dưới
- **vì sao:** Hiện GPT làm việc qua GitHub connector và Đức phải tự chuyển tiếp giữa hai bên.
  Nếu Claude Code điều phối được GPT thì bớt được Đức khỏi vòng lặp.
- **chưa rõ, cần Đức nói:** ① thử trên việc gì · ② Claude Code "điều phối" nghĩa là gọi GPT
  qua đâu (Đức dán tay, hay có kênh khác) · ③ đo thế nào là MVP đạt

> Tôi cố ý **không tự bịa chi tiết** cho ý tưởng này. Đức mới nêu một dòng, và ba câu trên là
> ba thứ quyết định nó là việc một ngày hay việc một tuần.

## Y-02 · Protocol làm nhiều việc song song

- **bậc:** đang xây
- **nguồn:** Đức nêu 2026-09-02
- **chủ:** `claude-y02`
- **phạm vi:** `scripts/claim.mjs` (file mới) · `tests/claim-smoke.mjs` (file mới) ·
  `docs/studies/` · khai báo trong bản đồ file. **CẤM đụng `session-check.mjs` và
  `repo-structure.mjs`** — xem lý do hoãn A2 ở dưới.
- **việc kế:** Còn **hai vấn đề chưa chốt phương án**, cả hai cần Đức chọn một câu:
  ① push cuốn theo commit người khác (mục 5 của khảo sát) ·
  ② **vấn đề 3, mới phát hiện 20:45** — phép kiểm độ tươi artifact so với TOÀN repo, nên bất kỳ
  phiên nào commit cũng làm artifact của mình cũ. Khuyến nghị **C3**: cho `safe-push` tự sinh
  lại rồi đẩy ngay, cửa sổ đua co về mili-giây và không bỏ lớp bảo vệ nào (mục 5b)
- **vì sao:** Đức có nhiều ý tưởng và **không đủ thời gian làm lần lượt**. Mỗi phiên AI phải
  tự biết: làm gì · cập nhật gì · **cấm đụng gì**.

- **đã xong A1:** `node scripts/claim.mjs --take|--release` thay cho việc sửa bảng quyền bằng
  tay. Nó **từ chối** nhận gói người khác đang giữ, **từ chối** trả quyền hộ, và ghi rồi đọc
  lại để kiểm. 5 phép kiểm ghim, trong đó một phép chạy thật và xác nhận *lần cướp quyền không
  ghi một chữ nào*.

- **đã xong A2 (02/09, sau khi audit K1 lắng):** gốc repo chia làm bốn khoá theo trường
  `steward` vốn đã có trong `areas`. Cổng đóng phiên xét **theo từng khoá**: nhận thiếu khoá
  nào thì nó gọi tên khoá đó ra. Kèm một miễn trừ có điều kiện cho `HANDOFF.md` — vì luật mục 7
  bắt mọi phiên ghi Log ở gốc, nên **không miễn là tự chặn luật của mình**; nhưng chỉ miễn khi
  chỉ thêm dòng.
- **A2 tự chứng minh ngay trong lượt làm nó:** cổng lần lượt bắt tôi nhận `_code`, rồi
  `_template` (vì sinh lại bộ khung), và tôi trả `_docs` ngay khi không cần. Trước A2 thì cả ba
  việc đó dùng chung một khoá và không ai thấy gì.
- **A2 KHÔNG chữa vấn đề 2 và 3.** Ghi rõ ở đây để không ai tưởng đã xong: A1 chữa quyền bị ghi
  đè, A2 chữa quyền bị chặn. Push cuốn theo nhau và cuộc đua độ tươi artifact vẫn còn nguyên.

- **số đo đặt ra bài toán:** 127 commit/ngày · 77% chạm `_root` · 63 lần ghi bảng quyền · 21
  nhãn phiên từ 01/09. Khảo sát đầy đủ và bốn phương án kèm giá:
  `docs/studies/PARALLEL-WORK-DESIGN-V0.md`

## Y-03 · Trường "Đức cần làm" trong hồ sơ trạng thái

- **bậc:** đang xây
- **nguồn:** phát hiện khi dựng bảng trạng thái 2026-09-02
- **chủ:** `claude-y03`
- **phạm vi:** hồ sơ trạng thái, bộ sinh, bản mẫu, phép kiểm. **Cấm** đụng gói
  `duc-auto-gg-flow-video` — phiên khác đang giữ.
- **việc kế:** GIAI ĐOẠN 2 — chuyển `human_action` thành **bắt buộc** cho đơn vị còn sống, khi
  mọi đơn vị đã khai. **Hai gói còn thiếu, và cả hai đang do phiên khác giữ** nên chủ của
  chúng phải tự điền: `duc-auto-gg-flow-video` (`claude-f18-evidence`) và `duc-auto-chatgpt`
  (`claude-surface-fix`, Đức giao 02/09)
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

## Y-04 · Bảng trạng thái sinh ngay trong repo

- **bậc:** đã chứng minh
- **nguồn:** Đức nêu 2026-09-02
- **việc kế:** Không còn gì. Bộ sinh đã nằm trong repo, có lệnh chạy riêng và 6 phép kiểm
- **kết quả:** Bản ra cố ý KHÔNG commit — nó để publish, và trang tự in ngày sinh rồi bật cờ
  đỏ sau 7 ngày, nên cũ thì nhìn thấy là cũ
- **vì sao:** Bản đầu đã chạy được và đang là artifact, nhưng bộ sinh **nằm ngoài repo** nên
  không đi theo template và không ai cưỡng chế được độ tươi.

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
