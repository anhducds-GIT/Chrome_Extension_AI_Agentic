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

- **bậc:** đang xây
- **nguồn:** Đức nêu 2026-09-02
- **chủ:** `claude-gpt-kenh`
- **phạm vi:** gói `duc-auto-chatgpt` (Bridge + extension). **Cấm** đụng trần 90 giây và
  cooldown 5 phút — đó là luật an toàn, đổi phải hỏi Đức.
- **việc kế:** **một vòng chạy trên VIỆC THẬT của Đức.** Ứng viên đo được: chính vòng audit
  Đức đang làm tay — ngày 04/09 Đức dán prompt cho GPT rồi dán kết quả về **ba lượt** trong
  một phiên. Cần Đức bấm ba công tắc trước (xem dưới), và cần Đức duyệt vì là chạy trên trang
  thật (luật mục 2).
- **vì sao:** Hiện GPT làm việc qua GitHub connector và Đức phải tự chuyển tiếp giữa hai bên.
  Nếu Claude Code điều phối được GPT thì bớt được Đức khỏi vòng lặp.

**Ba câu "chưa rõ" của bản 02/09 nay còn MỘT — hai câu kia đã có số đo live 04/09:**

| Câu | Trạng thái |
|---|---|
| ② gọi GPT qua đâu? | **Đã trả lời.** `jobs.add` → `run.trial` → `chat.read`; `jobs.add` tự dựng workbook trong bộ nhớ nên **không cần XLSX**. Hai vòng khép kín đo được **41 giây** và **~49 giây**, đọc về 1.953 và 1.926 ký tự, không bị cắt |
| ③ đo thế nào là đạt? | **Phần lớn đã trả lời** — hai vòng khép kín chính là mốc. Còn thiếu: một vòng trên việc thật |
| ① thử trên việc gì? | **Vẫn cần Đức chốt.** Đề xuất: vòng audit nói trên |

- **chặn thật, chỉ Đức mở được:** ba công tắc trên máy Đức — mở session · chọn thư mục đích ·
  bật chế độ phát triển. Không AI nào làm hộ được.
- **hai giới hạn đã đo, đừng hứa quá:** chờ **5 phút** giữa hai lượt thử (`TRIAL_COOLDOWN_ACTIVE`,
  thật, không đi vòng được) · trần cứng **90 giây** mỗi lượt. Hai vòng vừa rồi **chưa chạm trần**,
  nên câu hỏi đổi luật an toàn về cái trần đó **tự tan** — ai định mở lại phải có ca chạm trần thật.
- **cùng gói, không thuộc Y-01:** `B-36` (P1, chưa vá) — 36 file tên-GUID trong thư mục Tải về
  của Đức; nội dung luôn đúng, chỉ cái tên bị Chrome đặt. Ba phép kiểm canh nó đều tĩnh nên
  không bắt được.

> Bản 02/09 cố ý không bịa chi tiết vì Đức mới nêu một dòng. Bản này **không bịa thêm gì** —
> mọi con số ở trên là đo live ngày 04/09, nguồn ở Log cuối `workers/duc-auto-chatgpt/v0.1.0/HANDOFF.md`.

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

## Y-04 · Bảng trạng thái sinh ngay trong repo

- **bậc:** đã chứng minh
- **nguồn:** Đức nêu 2026-09-02
- **việc kế:** Không còn gì. Bộ sinh đã nằm trong repo, có lệnh chạy riêng và 6 phép kiểm
- **kết quả:** `DASHBOARD-Chrome-Extension-AI-Agentic.html` **được commit vào repo** (03/09) — nhờ vậy bất kỳ AI nào cũng
  sinh lại rồi commit được, không phải nhờ riêng một AI đăng hộ. Cổng so bảng đã commit với
  trạng thái repo mỗi phiên nên nó **không thể âm thầm cũ**. Trang tự bật dải đỏ khi Đức mở nó
  vào **một ngày khác ngày sinh** — tính lúc XEM, không lúc sinh.

> **Bản 02/09 của dòng này nói NGƯỢC** — nó ghi "cố ý KHÔNG commit, để publish" và "cờ đỏ sau
> 7 ngày". Cả hai đã sai từ 03/09, và cờ 7 ngày bị xoá hẳn ngày 04/09 vì là code chết (bản
> commit luôn có tuổi 0 nên nhánh đó chưa từng chạy). Sửa ngày 04/09 sau khi audit độc lập
> chỉ ra rằng **một bảng tự mô tả hai kiểu vận hành khác nhau** thì Đức đọc cái nào cũng sai.
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

## Y-13 · Assistant coi cả HAI repo là một địa bàn, và làm chủ sức khoẻ của bộ khung

- **bậc:** ý tưởng
- **nguồn:** Đức nêu 04/09: *"tôi muốn nó có thể nắm được cả các thông tin liên quan đến migrate
  repo, nắm vững các protocol và sẽ là người điều phối, dọn dẹp, nâng cấp repo template đó."*
- **việc kế:** Đức chốt **một câu** ở phần "chỗ vướng" dưới đây; chốt xong mới viết brief
- **vì sao:** hôm nay Assistant chỉ biết MỘT repo. `state-check` và `what-next` đều đọc repo
  chúng đang đứng, và `repo-map.json` — thứ được khai là "hợp đồng cross-repo" — **không có một
  chữ nào về repo khác**, đã kiểm 04/09. Nên lúc hai repo cùng chạy (đúng tình huống chiều
  04/09: gói Assistant port sang bộ khung trong khi bộ khung có phiên khác giữ cả bốn khoá),
  Assistant phải `cd` sang đó đọc tay từng lệnh. Việc đó làm được, nhưng nó không phải năng lực
  của gói — nó là tôi gõ tay, và cái gõ tay thì phiên sau không thừa hưởng.

**Ba phần trong câu của Đức KHÔNG bằng nhau — đo rồi mới thấy:**

1. **"nắm vững protocol"** — gần như xong sẵn. Bộ khung có `AGENTS.md` riêng và Assistant đã
   đọc nó đúng cách khi làm chặng A. Không cần xây gì, chỉ cần ghi thành luật mở phiên.
2. **"nắm thông tin migrate repo"** — đây là phần phải XÂY thật: một cặp đối chiếu **giữa hai
   repo**, không phải trong một repo. Ví dụ cụ thể đã có ngay hôm nay: bộ khung phát hành bản
   `1.2.20`, còn repo Extension **không có chỗ nào khai nó đang dùng bản nào** — nên câu "repo
   này có tụt lại sau bộ khung không" hiện KHÔNG ai trả lời được bằng máy.
3. **"điều phối, dọn dẹp, nâng cấp"** — chỗ vướng, xem dưới.

**Chỗ vướng — CẦN ĐỨC CHỐT MỘT CÂU, không tự quyết được:**

`ORCHESTRATOR.md` mục 4 (`HARD ROLE FIREWALL`) ghi: vai điều phối **KHÔNG code, KHÔNG debug,
KHÔNG đề xuất patch**, không có ngoại lệ "sửa nhỏ". Luật đó ra đời vì defect `ROLE-DRIFT-01`
mà **chính Đức bắt được** cùng ngày. Chữ *"dọn dẹp, nâng cấp"* nếu hiểu là Assistant tự sửa
code bộ khung thì **mở lại đúng cánh cửa vừa đóng**.

Hai cách hiểu, và chúng ra hai gói việc khác nhau:

- **(A) Assistant làm CHỦ, executor làm TAY** — Assistant sở hữu sức khoẻ bộ khung: biết nó nợ
  gì, quyết thứ tự, viết brief, kiểm chứng lại kết quả; **mọi lượt sửa code do executor làm**.
  Firewall giữ nguyên, không sửa một dòng luật. Đây là cách hôm nay đã chạy thật với chặng A.
- **(B) Assistant tự sửa bộ khung** — phải sửa firewall, và phải định nghĩa được một đường biên
  máy kiểm được giữa "hạ tầng được sửa" và "product không được sửa". Chưa ai định nghĩa được
  đường đó, và `role_scope: control-plane` trong hợp đồng máy đọc hiện **không** phân biệt hai
  loại repo.

- **vì sao chưa làm ngay:** mốc pilot của v0.1 **chưa đạt** (ba sự cố đã ghi nhận, mỗi tiêu chí
  tương ứng đòi bằng không). Thêm địa bàn thứ hai vào một gói chưa trơn ở địa bàn thứ nhất là
  nhân đôi chỗ vướng trước khi biết chỗ vướng ở đâu — đúng lý lẽ đã dựng ra mốc pilot.
- **phạm vi khi làm:** phần (2) là `scripts/` + `tests/` ở **cả hai repo** (khoá `_code` mỗi bên)
  cộng một trường khai phiên bản bộ khung ở repo Extension (`_root`). Phần (1) là
  `docs/protocols/ORCHESTRATOR.md` (`_docs`). Phần (3) tuỳ câu Đức chốt.
- **đo trước khi sửa:** đếm xem trong một ngày có bao nhiêu lần Assistant thật sự phải trả lời
  một câu **bắc qua hai repo**. Ngày 04/09 tôi đếm được **hai** lần. Hai lần chưa đủ để xây một
  cơ chế; nhưng nếu nhiều ngày đều thế thì đủ.

**Y-13 · phần 3 ĐÃ CHỐT (Đức, 04/09):** cách **(A)** — Assistant làm chủ, executor làm tay,
firewall giữ nguyên không sửa một dòng. Đức nói: *"có thể không trực tiếp làm, nhưng sẽ điều
phối để các AI agent khác làm."* Kèm một điều Đức nêu mà bản Y-13 đầu chưa thấy: bộ khung
**khác bản chất** — lõi code · rule · hook · lịch sử audit · lịch sử migrate — nên ở đó gần như
mọi thứ là hạ tầng, **không có phần product để làm ranh giới**. Đó là lý lẽ làm cách (B) yếu đi
chứ không mạnh lên: biên mất điểm tựa thì ngoại lệ "được sửa hạ tầng" ăn hết luật.
Ghi thành quyết định bất biến: [`docs/adr/0003-assistant-dieu-phoi-ca-bo-khung.md`](docs/adr/0003-assistant-dieu-phoi-ca-bo-khung.md).
Luật vận hành: `docs/protocols/ORCHESTRATOR.md` mục 0c.
**Phần 1 và phần 2 vẫn mở** — phần 2 chờ pilot v0.1 đạt. Và mục 0c **chưa có phép kiểm máy**:
cần sửa `tests/role-firewall-smoke.mjs`, tức khoá `_code`, một lượt khác.

**Y-09 · ĐÃ CHỐT VÀ ĐÃ LÀM (Đức chốt 05/09, làm xong 05/09 — phiên `claude-exec-pushgate`).**
Đức chọn **hướng (b)**: cho cổng xuất bản chỉ từ chối khi tình trạng cây làm việc **thật sự**
làm sai thứ sắp công bố. Cách làm hoá ra không cần "hiểu nội dung diff của bộ sinh" như bản ghi
cũ lo — thứ sắp công bố là **HEAD**, nên quan toà cũng phải là bộ sinh **ở HEAD**. Nay cả hai
cổng chép HEAD ra một bản tạm rồi chạy bộ sinh ở đó, và cây làm việc thôi không còn là đầu vào
của phép kiểm độ tươi nữa. Không thêm cờ bỏ qua, không thêm biến môi trường, không thêm khoá
thứ bảy.

**Phần chặn ĐÚNG giữ nguyên từng chữ:** artifact đã commit lệch với HEAD thì vẫn không ai đẩy
được. Hai vế kéo ngược nhau đó nay đều có phép ghim chạy được, nằm cạnh nhau trong cùng một
fixture — đạt vế này mà mất vế kia thì suite đỏ.

**Đo lại sau khi sửa, số thật:**
- Số chỗ trong bộ máy còn từ chối vì "bộ sinh đang sửa dở": **0** (trước là 2 — cổng đóng phiên
  và cổng xuất bản, mỗi chỗ một bản sao của cùng một luật).
- Ca dựng thật trên chính repo này: làm bẩn một bộ sinh rồi đẩy ba commit không liên quan →
  **đẩy được**. Trước bản này là bị từ chối.
- Đột biến kiểm: **5 lượt**, cả 5 đều làm suite ĐỎ đúng khẳng định của mình.
- Một phép ghim **ngược** bị phát hiện và lật lại: suite cũ đang ghim đúng cái hành vi chặn oan
  ("bộ sinh sửa dở thì PHẢI từ chối"). Không lật thì bản vá này không thể xanh — và nếu ai đó
  lật bằng cách xoá phép ghim thì mất luôn vế đối chứng.
- Còn nợ, ghi ra chứ không giấu: nhánh "không dựng được bản chụp HEAD → chặn" vẫn **chưa có
  phép ghim** (nhánh cũ nó thay thế cũng chưa từng có).

**Nhà:** `docs/briefs/BRIEF-PUSH-GATE-01.md` · luật vận hành: `docs/protocols/MULTIFLOW.md`
mục 4 bất biến ⑤ và bảng mã lỗi.

## Y-14 · Rà lại lõi và nội dung cả repo để AI không nạp phải rác

- **bậc:** ý tưởng
- **nguồn:** Đức nêu 2026-09-05
- **việc kế:** **CHƯA LÀM** — Đức chốt để sau khi xong gói Assistant và nợ kỹ thuật
- **vì sao:** mỗi phiên AI mở ra là nạp một lượng tài liệu cố định trước khi làm được gì. Tài
  liệu chết, tài liệu trùng, tài liệu nói ngược nhau đều bị nạp y như tài liệu sống — và cái
  nói ngược thì tệ hơn cái chết, vì AI tin nó. Đo được trong ngày 04–05/09: **bốn** chỗ tài
  liệu nói theo luật cũ sau một lần đổi luật, và **ba brief đã ship xong vẫn khai `status:
  active`** nên bảng báo chúng còn mở.
- **vì sao chưa làm ngay:** rà nội dung khi gói Assistant còn đang đổi là rà một thứ đang động —
  sẽ phải rà lại. Và nợ kỹ thuật (bảng đang đếm 62 mục) có thể tự xoá bớt một phần rác khi đóng.
- **phạm vi khi làm:** chủ yếu `_docs` và `_root`. Có thể chạm `.repo-structure.json` (khai hạn
  rà) nên cần `_root`.
- **đo trước khi sửa:** đếm số tài liệu quá hạn rà mà cổng cấu trúc đang cảnh báo, và đếm số
  file `status: active` mà thực tế đã xong. Hai con số đó là kích thước thật của đống rác;
  đừng rà theo cảm giác.
- **cẩn thận:** đây là loại việc rất dễ biến thành viết lại cả repo. Ranh giới nên đặt trước:
  **xoá và gộp thì được, viết lại nội dung đang đúng thì không.**

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

- **bậc:** ý tưởng
- **nguồn:** bug thật, bắt được 2026-09-05 trong lúc chạy đột biến kiểm cho `F-06`
- **việc kế:** **Đức chốt** — bản vá gốc viết lại kiểu xuống dòng của mọi file trong repo
- **bug thật đã bắt được:** `content.js` của gói Flow Video nằm trong git dưới dạng **CRLF**,
  trong khi bản trên đĩa là **LF**. Phép thử `content-image-static.mjs` đòi `,\n` sát nhau nên
  nó **xanh trên máy đang làm việc**, nhưng **đỏ ngay sau bất kỳ lượt `git checkout content.js`
  nào, và đỏ với mọi người clone repo về**. Đã vá tại chỗ (nới thành `,\r?\n`) và đã kiểm cả
  hai chiều — nhưng đó là vá một phép thử, không phải vá gốc bệnh.
- **vì sao nó nguy hiểm hơn vẻ ngoài:** đây là loại xanh giả tệ nhất — nó xanh với người sửa
  và đỏ với người kiểm. Cùng gốc với bẫy anchor `^`/`$` đã cắn nhiều lần, và cùng gốc với vụ
  suite bộ khung xanh tại chỗ mà đỏ với người clone (đã vá ở bộ khung 05/09 bằng đúng cách này).
- **bản vá gốc:** thêm `.gitattributes` ở gốc repo với `* text=auto eol=lf`. Bộ khung
  `Ark_Repo_Harness` đã làm đúng thế và đo được: **75 LF / 21 CRLF trước → 97 LF / 0 CRLF sau**.
- **vì sao phải hỏi Đức:** lượt đó **viết lại kiểu xuống dòng của mọi file trong repo** trong
  một commit. Không mất dữ liệu, nhưng nó là một diff khổng lồ chạm mọi file, và mọi lane đang
  có việc dở sẽ phải rebase. Chọn thời điểm là việc của Đức, không phải của AI.
- **chưa đo:** hai gói ChatGPT và Gemini có cùng quả mìn này không. Cách đo rẻ nhất: ép CRLF
  toàn gói rồi chạy suite của gói đó, xem có phép thử nào đỏ lên.
- **phạm vi khi làm:** `.gitattributes` ở gốc repo (`_root`).

## Y-18 · Phép kiểm "không phụ thuộc đồng hồ" báo đỏ oan khi hai lane commit cùng lúc

- **bậc:** nghỉ
- **nguồn:** gặp thật 2026-09-05, lane `claude-moc-da-xong`, một lần đỏ rồi tự xanh lại
- **việc kế:** không còn việc — đã vá 05/09 (`20a60f0`), đo: lệch 50 byte trước, 0 byte sau
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
