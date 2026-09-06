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


> **Nợ hạ tầng do AI tìm ra thì KHÔNG ghi vào đây** — nó có sổ riêng từ 2026-09-06:
> [`BACKLOG.md`](BACKLOG.md) ở gốc repo, cũng được miễn khoá, cũng chỉ thêm dòng ở cuối.
> Ngày 06/09 sổ này có 19 mục thì 14 là AI tự ghi; 14 mục đó đã dời sang `BACKLOG.md`
> **nguyên văn, giữ nguyên số hiệu `Y-nn`**. Đề bài: `docs/briefs/BRIEF-TACH-SO-Y-TUONG-01.md`.

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
- @Đức:bấm Bật ba công tắc trên máy Đức: mở session, chọn thư mục đích, bật chế độ phát triển.
- @Đức:chốt Chọn việc thật để chạy thử một vòng, và duyệt lượt chạy đó vì nó chạy trên trang thật.
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
