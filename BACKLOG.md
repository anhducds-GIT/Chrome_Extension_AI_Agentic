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

Phép kiểm chỉ soi mục `## N-`. **Mọi mục đang mở đều là `N-`** — 14 mục `## Y-` chuyển từ
`IDEAS.md` ngày 06/09 đã rời sổ trong lượt tinh gọn 07/09; bản ghi lượt cắt ở cuối file.

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

## Lượt cắt 2026-09-07 — sổ nợ 32 mục mở → 8, Đức chốt tường minh

Đức đo bảy ngày và thấy hệ thống đang tự bảo trì chính nó thay vì làm sản phẩm: **400 trong
725 commit (55%)** chạm tài liệu + sổ nợ, **68 (9%)** chạm mã extension; hạ tầng **44.239
dòng** lớn hơn mã sản phẩm **38.136 dòng**. Nên Đức chốt cắt thật, và ở lượt này **xoá là
thắng, thêm là thua**.

**Luật cắt đã áp cho từng mục một:** mục không chặn một lane nào hôm nay thì **xoá**, không
hoãn, không "để lại làm bản ghi" — vì một mục vô hại vẫn thu thuế đọc của mọi phiên sau.
Sổ này bình thường **chỉ thêm dòng ở cuối**; lượt này là **ngoại lệ có Đức duyệt tường minh**,
và lane cắt đang giữ `_root`. Chữ của khối được giữ **không sửa một byte** — mỗi khối còn lại
là nguyên văn, kể cả tiêu đề và mã.

**Đo lại trước khi cắt, và số trong bản giao việc SAI:** bản giao việc nói 59 mục. Đếm thật:
sổ có **47 khối tiêu đề** (33 khối `## N-` sau khi áp các dòng `ĐỔI MÃ`, 14 khối `## Y-`),
trong đó **32 mục đang mở** — 20 `N-` và 12 `Y-`. Lệnh đếm lại:

```bash
node scripts/backlog-check.mjs          # dem khoi `## N-` va bao ma trung
grep -c "^## N-\|^## Y-" BACKLOG.md     # dem khoi tieu de
```

### Sáu mục ĐƯỢC GIỮ, và vì sao từng mục

| Mã | Chặn ai hôm nay |
|---|---|
| `N-05` | ba sổ ở gốc repo miễn khoá, nên nhiều lane ghi cùng file là **hợp lệ** — gặp thật hai lần trong một buổi 06/09 |
| `N-11` | **Đức tự nêu**: *"tôi thấy có 2 dashboard nên bị confuse"*; lane refactor bảng đang làm đúng vùng này |
| `N-29` | gộp ô "Đức cần làm" ngay hôm nay là **mất im lặng** một việc thật của gói Scouter — gói duy nhất còn sống |
| `N-30` | `--restamp --duc-duyet` ghi câu chốt sai chỗ vào bảng quyền, gặp **hai lần trong một phiên** 07/09; và đường đó vừa được dùng thật hôm nay để chuyển `_root` |
| `N-31` | `what-next.mjs` báo gói Scouter **rảnh** khi nó có 2 việc mở — phiên điều phối đọc bảng sẽ giao sai việc |
| `N-33` | cổng đóng phiên đỏ **không lặp lại được**, và cổng đỏ thì luật cấm đẩy — nó giam commit của cả repo |

**Hai mã đọc khác hôm nay:** khối `N-30` (restamp) và `N-31` (`what-next`) từng phải mang mã
`N-31` và `N-34` vì va chạm với những khối nay đã bị cắt. Va chạm mất thì mã về đúng tiêu đề
gốc của chúng. Nhật ký ngày 07/09 nhắc `N-31` (restamp) và `N-34` — đọc là `N-30` và `N-31`.

### Hai mươi sáu mục ĐÃ XOÁ, xếp theo lý do

**Đã xong rồi, chỉ còn là bản ghi (11):** `Y-07` `Y-12` (bộ kiểm đã tăng tốc, 640 → 17 giây) ·
`Y-17` `Y-18` `Y-19` (cả ba tự khai `bậc: nghỉ` · *"không còn việc"*) · `N-19` (đã có dòng
`ĐÓNG N-09`) · `N-20` `N-21` (`N-21` tự khai *"ĐÃ VÁ 06/09"*) · `N-16` (Scouter đã ra nhà
riêng theo ADR-0013, `workers/duc-scouter` có trong bảng quyền) · `N-32` (đo lại: `grep -c
"AUTO:.* START" FEATURE-PARITY.md` ra **0**, `grep -c FEATURE-PARITY-AUTO` ra **4** — đúng hai
vế điều kiện đóng của chính nó) · `N-22` (đo lại: `human_action` của gói Scouter **không còn
đường dẫn nào**).

**Fix đã land ở chỗ khác, mục thành bản sao thứ hai (3):** `Y-16` `N-18` `N-23` — cả ba là
cùng một bệnh *"cổng xuất bản khoá chéo vì `FEATURE-PARITY.md` cần `_root`"*, và ADR-0014 đã
tách nửa máy sinh ra `FEATURE-PARITY-AUTO.md` **miễn khoá**. Giữ ba mục nói về một cửa đã mở
là ba lần đọc cho không việc gì.

**Luật đã viết ra chỗ khác, mục chỉ là chú thích (3):** `N-08` (cấm `git checkout` file trạng
thái sống — đã ở `AGENTS.md` mục 1) · `N-26` (`git commit --amend` khi HEAD đổi chủ) ·
`Y-06` (nhãn `Lane:` phải là dòng cuối).

**Tự khai "một ca chưa đủ để đổi cơ chế" (2):** `Y-09` `Y-15` — cả hai viết sẵn trong mục
rằng phép đo hiện có đúng **một** ca, và một ca thì luật cho từng vai là đủ.

**Nợ của gói đã ĐÓNG BĂNG, nên không lane nào chạm (2):** `N-17` (`npm run test:worker` trỏ
cứng vào gói ChatGPT) · `N-28` (mục sổ nợ không có mã, ở gói Flow Video và Gemini).

**Việc chăm sóc bảng và sổ, không chặn ai (5):** `Y-03` `Y-05` `Y-08` `Y-10` `Y-11`.

**Tự vô hiệu sau lượt cắt này (1):** `N-02` — nó tự khai *"đo trước khi làm: đếm số mục chưa
đóng; **dưới 10 thì chưa cần xây**"*. Sau lượt này sổ có 8 mục, nên điều kiện của chính nó nói
đừng làm.

**Không mục nào bị viết lại thành chữ của tôi.** Xoá hẳn hoặc giữ nguyên văn — không có cửa
thứ ba, vì sửa nội dung mục của phiên khác là loại nợ tệ nhất trong ba loại.

---

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

## N-29 · Gộp "Đức cần làm" về một nguồn sẽ LÀM MẤT việc của Scouter nếu gộp ngay

**[ĐO 2026-09-07, trước khi refactor IA của bảng]** · Đề bài refactor bảng (Đức chuyển 07/09) yêu
cầu *"NEEDS ĐỨC: một SSOT duy nhất, dùng cơ chế `@Đức:bấm` / `@Đức:chốt`"*. Đích đúng. Nhưng
**làm ngay hôm nay là mất dữ liệu**, và đây là số đo:

| Cơ chế | Đếm được |
|---|---|
| Dấu `@Đức:bấm` / `@Đức:chốt` trong ba sổ | **17** (7 bấm · 10 chốt) |
| `human_action` khác rỗng trong `STATUS.md` | **4 trong 5 gói** |

Bốn `human_action` đó đối chiếu từng cái với dấu trong sổ:

- `duc-auto-gg-flow-video` — có dấu ngay trong `STATUS.md`. **An toàn.**
- `duc-auto-gemini` — không có dấu ở `STATUS.md`, nhưng `BACKLOG.md` của gói có **2** dấu trỏ đúng
  việc đó (bốn điều kiện một hồ sơ). **An toàn.**
- `duc-auto-chatgpt` — `BACKLOG.md` có **1** dấu (`B-09`). Nhưng `human_action` nói việc KHÁC (nạp
  lại tiện ích trên từng hồ sơ + gắn tab BRIDGE). **MẤT MỘT PHẦN.**
- `duc-scouter` — **KHÔNG một dấu `@Đức` nào trong cả gói.** `human_action` của nó là một việc
  thật và còn hiệu lực: *"nạp lại extension — manifest đổi (thêm quyền hẹn giờ) nên bản đang chạy
  không tự cập nhật"*. Gộp ngay là **việc này biến mất khỏi bảng, im lặng**.

Chú thích trong `scripts/build-overview.mjs` (dòng ~1741) đã lường đúng chuyện này và nói thẳng
rằng hai chỗ *"có thể đếm khác vùng này trong một thời gian"* — nhưng nó viết lúc **chưa mục nào
được đánh dấu**. Nay 17 mục đã có dấu, nên giai đoạn chuyển tiếp **đóng được** — chỉ là phải
chuyển trước, đừng cắt trước.

**Thứ tự bắt buộc:** ⑴ đặt dấu `@Đức:bấm` vào dòng mục thật cho hai việc còn thiếu (Scouter · nửa
còn thiếu của ChatGPT) → ⑵ đo lại, hai cơ chế phải đếm **bằng nhau** → ⑶ mới bỏ `human_action`
khỏi đường nuôi bảng. Cắt trước bước ⑵ là làm ra một SSOT **thiếu**, mà một nguồn duy nhất nói
thiếu thì tệ hơn hai nguồn nói lệch: hai nguồn lệch thì thấy được, một nguồn thiếu thì không.

**đóng khi:** ⑴ hai cơ chế đếm bằng nhau, có số in ra · ⑵ `human_action` không còn nuôi ô đếm nào
trên bảng · ⑶ có một phép ghim ĐỎ khi một `STATUS.md` có `human_action` khác rỗng mà gói đó không
có dấu `@Đức` nào — tức phép ghim canh đúng cái lỗ vừa đo được, chứ không chỉ canh số.

- **đóng khi:** lệnh: node scripts/backlog-check.mjs --can-duc ra 0 goi co human_action khac rong ma khong co dau @Duc

## N-30 · `--restamp --duc-duyet` đóng câu chốt lên MỌI khoá lệch mốc, không chỉ khoá vừa đổi

**[ĐO 2026-09-07, gặp HAI lần trong một phiên]** · Lệnh nhận **một** câu `--duc-duyet` rồi ghi câu
đó vào `duc_decision` của **từng** khoá mà nó thấy đổi chủ so với bản niêm phong lành gần nhất
(vòng `for (const d of doiChu)` trong `scripts/claim.mjs`). Nên khi hai khoá được chuyển ở hai
lượt khác nhau, vì hai lý do khác nhau, mà lượt đầu chưa kịp thành mốc lành thì **câu chốt của
lượt sau đè lên xuất xứ của lượt trước**.

Xảy ra thật: chuyển `_root` (lý do: land nốt ADR-0014 đang chặn 26 commit) rồi chuyển `_code`
(lý do: Đức cho khoá để refactor bảng). Sau lượt hai, `_root.duc_decision` **nói về `_code`**.

**Vì sao nó đắt chứ không chỉ lệch chữ:** trường đó tồn tại đúng để **phiên vừa mất khoá đọc
được lý do**, vì họ chỉ đọc bảng chứ không chạy lệnh — chú thích trong chính script nói thế. Một
câu chốt sai chỗ khiến phiên mất `_root` đọc được một lý do **không liên quan tới mình**, và đó
tệ hơn không có câu nào: không có thì họ đi hỏi, có mà sai thì họ tin.

Vòng ngoài cũng không cứu được: mốc so sánh là **bản niêm phong lành gần nhất**, nên sửa tay rồi
commit **không** hạ số khoá "đổi chủ" về 0 — phải đóng dấu lại, và lượt đóng dấu lại chính là lượt
ghi đè. Cách duy nhất đi qua hôm nay là viết một câu phủ **cả hai** lượt, tức chấp nhận cả hai
khoá mang chung một câu.

**Hướng sửa (đề xuất, chưa làm — script nằm ở `_code`):** cho `--duc-duyet` nhận dạng
`<khoá>=<câu>` lặp được, và **từ chối** khi số câu không khớp số khoá đổi chủ. Fail-closed đúng
tinh thần chỗ này: thà bắt gõ thêm còn hơn ghi một xuất xứ sai vào bảng.

- **đóng khi:** lệnh: node tests/claim-restamp-smoke.mjs xanh voi ca hai khoa doi chu mang hai cau chot khac nhau

## N-31 · `what-next.mjs` đếm hụt việc mở của một gói, nên bảng báo gói đó rảnh

**[ĐO 2026-09-07]** `node scripts/what-next.mjs` báo `workers/duc-scouter — 0 việc mở` trong khi
`grep -c "^## MỞ" workers/duc-scouter/v0.1.0/BACKLOG.md` ra **2**. Nó chỉ đọc mục nằm trong khối
`P1`/`P2`, nên mục dạng `## MỞ · S-xx` — hình dạng mà luật *"đóng mục bằng cách thêm một dòng ở
cuối"* đẻ ra — không được đếm.

Cái giá: phiên điều phối đọc bảng sẽ tưởng gói đó rảnh và đi giao việc khác.

- **đóng khi:** lệnh: `node scripts/what-next.mjs` đếm cả hai dạng mục, và có một phép ghim dựng
  một sổ nợ chứa cả hai dạng rồi kiểm con số ra đúng. Khoá cần: `_code`.

## N-33 · Cổng đóng phiên trả kết quả ĐỎ SAI khi nhiều lane cùng ghi file gốc repo

**[ĐO 2026-09-07, lúc có 6 lane cùng chạy]** Chạy `session-check.mjs` năm lượt liên tiếp: số mục
đỏ **nhấp nháy giữa 1 và 2**, và phép kiểm đỏ nào cũng XANH khi chạy riêng ngay sau đó. Ba câu
báo lỗi quan sát được, cả ba sai sự thật tại thời điểm đọc:

- `CHUA_DONG_DAU: .agents/claims.json thiếu trường _fingerprint` — đọc trực tiếp 5 lượt đều thấy
  `6f1d02faa74caa28`;
- `Repo chưa có .repo-structure.json` — file có, và `tests/repo-structure-smoke.mjs` xanh 17/17;
- `git show HEAD:FEATURE-PARITY-AUTO.md does not exist in HEAD` — có trong HEAD, commit `daa276c`.

**Vì sao đắt:** cổng đỏ thì luật cấm báo xong và cấm đẩy, nên một lượt đỏ SAI **giam commit của
cả repo** — đúng lúc đo có 20+ commit của 6 lane chưa đẩy. Và nó dạy sai: phiên gặp nó sẽ đi sửa
một thứ không hỏng, hoặc tệ hơn — `--restamp` cho xong việc, đúng cái `AGENTS.md` cấm.

Khác `N-30`: `N-30` là một phép ghim hỏng thật, đỏ ổn định. Mục này là đỏ **không lặp lại được**.

- **đóng khi:** lệnh: cổng đọc mỗi file gốc một lần vào đầu lượt rồi dùng lại bản đã đọc, hoặc
  thử lại có giới hạn khi đọc hụt — và có một phép ghim dựng cảnh file bị ghi giữa chừng rồi
  kiểm cổng KHÔNG báo đỏ. Khoá cần: `_code`.

## N-35 · Cờ đóng băng đã khai nhưng chưa cổng nào đọc, nên nó chưa chặn được gì

- **nhóm:** cong
- **đóng khi:** lệnh: node scripts/session-check.mjs bỏ qua suite của gói khai trong khối `frozen`, và có một phép ghim ĐỎ khi gỡ một gói khỏi danh sách đó. Khoá cần: `_code`.
- **mở:** 2026-09-07 · lane `claude-tinh-gon`
- **vùng:** `_code`
- **vì sao:** Đức chốt 07/09 đóng băng ba gói (`duc-auto-chatgpt` · `duc-auto-gemini` ·
  `duc-auto-gg-flow-video`) và giữ **một** gói sống (`workers/duc-scouter`). Cờ đã khai ở khối
  `frozen` của `.repo-structure.json`, đúng chỗ — không gõ cứng vào script. Nhưng **[ĐO
  07/09]** `grep -rl frozen scripts/ tests/` ra **0 file**: không cổng nào đọc cờ đó, và không
  phép ghim nào canh nó. Nghĩa là hôm nay xoá cả khối `frozen` đi thì **không test nào đỏ**.
- **vế đắt nhất của "đóng băng" chưa được cưỡng chế:** ba gói đóng băng vẫn phải **không làm
  phiên khác đỏ hay chậm**. Hôm nay suite của chúng vẫn nằm trong chuỗi `npm test` mà cổng
  đóng phiên chạy, nên một phép kiểm mục ruỗng trong gói đã đóng băng vẫn chặn được lane đang
  làm gói sống — đúng thứ việc đóng băng sinh ra để cắt.
- **vì sao lane khai cờ không tự làm nốt:** cưỡng chế nằm ở `scripts/` + `tests/`, tức khoá
  `_code`, và khoá đó có chủ khác đang chạy. Khai cờ là phần làm được không cần khoá của họ.

## N-36 · Bảy khoá được dựng cho NHIỀU lane, nhưng Đức chốt tối đa hai lane

- **nhóm:** song-song
- **đóng khi:** lệnh: node scripts/claim.mjs --list ra đúng ba khoá, và `tests/claim-smoke.mjs` xanh với bảng ba khoá. Khoá cần: `_root` (khai `areas`) + `_code` (phép ghim) — **và cả `_docs` lẫn `_code` phải TRỐNG CHỦ lúc bật**, xem dưới.
- **mở:** 2026-09-07 · lane `claude-tinh-gon`
- **vùng:** `_root` + `_code`
- **vì sao:** chi phí một bảng khoá là **số khoá × số lane**. Bảy khoá (`_root` · `_docs` ·
  `_code` + bốn khoá gói) được chia ngày 02/09 và 06/09 để nhiều lane không giẫm chân — hợp lý
  khi có sáu lane. Đức chốt 07/09 **tối đa hai lane song song**; với hai lane thì bảy khoá là
  thuế đọc và bốn cửa xin quyền cho không mấy va chạm. Hình dạng đề xuất, ba khoá:
  `_infra` (`scripts/` + `tests/` + `docs/` + file tầng ngoài cùng) · `workers/duc-scouter`
  (gói sống, giữ nguyên) · `_frozen` (ba gói đóng băng, chỉ đọc, không ai nhận).
- **CHƯA BẬT, và đây là lý do — đừng bật hộ:** gộp `_docs` và `_code` vào `_infra` lúc hai khoá
  đó **đang có chủ và hai lane đó đang chạy** là **lấy khoá khỏi tay người đang làm**, đúng
  việc `AGENTS.md` mục 1 bắt phải hỏi Đức. Lane mở mục này cố ý **không khai cấu trúc mới vào
  `areas`** ở lượt của mình: một bảng khoá khai ba khoá mà vận hành bảy khoá là **hai nguồn sự
  thật về quyền ghi**, và cái đó tệ hơn bảy khoá.
- **điều kiện bật, đủ cả ba:** ⑴ `_docs` và `_code` trống chủ (`node scripts/claim.mjs --list`)
  · ⑵ khai `areas` trong `.repo-structure.json` và sửa bảng khoá ở `AGENTS.md` mục 1 **trong
  cùng một lượt** · ⑶ có đột biến kiểm — đây là **sửa cơ chế đa phiên**, nên `MULTIFLOW.md`
  mục 5 bắt buộc đột biến kiểm, và nền của repo thử phải XANH trước khi so.

---

- **BẢN GHI LƯỢT CẮT** · 2026-09-07 · lane `claude-tinh-gon` · Đức duyệt tường minh cho lượt
  xoá dòng cũ. **[ĐO]** mục đang mở **32 → 8** · dòng của file **1.377 → xem `wc -l`** ·
  `node scripts/backlog-check.mjs` **0 thiếu `đóng khi:`, 0 mã trùng** trước và sau. Sáu mục
  giữ lại là nguyên văn; hai mục mới (`N-35` `N-36`) là nợ do chính lượt tinh gọn đẻ ra và
  không giấu: cờ đóng băng chưa ai cưỡng chế, và bảng khoá chưa gộp được vì hai khoá đang có
  chủ. Danh sách 26 mã đã xoá kèm lý do từng nhóm ở khối *"Lượt cắt 2026-09-07"* trên.

- **ĐÓNG N-30** · 2026-09-07 · claude-bang-ia · Sổ mẫu Gate 7 nay commit đủ **năm** artifact, và tên artifact thứ năm **nhập từ hằng số `PARITY_AUTO_FILE` của bộ sinh** chứ không gõ cứng. Kèm theo: khối "artifact cũ đã commit" trước đây làm cũ `FEATURE-PARITY.md` — từ ADR-0014 bộ sinh không đọc file đó một lần nào, nên khối ấy sẽ ghim rỗng; nay nó làm cũ đúng file máy. **[ĐO]** `node tests/build-dashboard-smoke.mjs`: thoát mã **1 → 0**, **100/100 PASS**. Số phép kiểm **100 → 100**, số vế khẳng định **463 → 463** — không gỡ một lớp canh nào. Commit `15d4d43` (dòng đóng này ghi lại lần hai: lượt tỉa sổ `d47f650` của lane khác đã cuốn mất dòng đóng đầu).

- **LÀM RÕ DÒNG `ĐÓNG N-30` NGAY TRÊN** · 2026-09-07 · lane `claude-tinh-gon` · Dòng đó của
  lane `claude-bang-ia` là **đúng việc của họ và đúng luật** — nhưng nó trỏ vào khối `N-30`
  *"phép ghim `build-dashboard-smoke` dựng sổ mẫu THIẾU artifact thứ năm"*, mà khối ấy đã bị
  lượt cắt xoá đi (nó đã đóng rồi). Khối `## N-30` **còn lại trong sổ là khối khác**:
  *"`--restamp --duc-duyet` đóng câu chốt lên MỌI khoá lệch mốc"*, và nó **VẪN ĐANG MỞ** —
  điều kiện đóng của nó là `node tests/claim-restamp-smoke.mjs` xanh với hai khoá đổi chủ mang
  hai câu chốt khác nhau, chưa ai chạy. **Đừng đọc dòng trên thành "N-30 đã đóng".**
  Vì sao không sửa dòng của họ: luật mục 1 của sổ. Vì sao không đổi mã khối restamp: cửa
  `ĐỔI MÃ` chỉ áp được cho khối **thứ hai trở đi** mang một mã, mà khối restamp nay là khối
  **đầu tiên** — đúng cái lỗ đã ghi trong `scripts/backlog-check.mjs`. Một dòng làm rõ là cửa
  rẻ nhất còn mở.
