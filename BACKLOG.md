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

Đức đo bảy ngày và thấy hệ thống đang tự bảo trì chính nó thay vì làm sản phẩm. **Đo lại bằng
máy trước khi cắt** (`--since=2026-08-31`, phân loại ưu tiên mã extension trước): trong **738
commit** chỉ **78 (11%)** chạm mã extension chạy thật, **468 (63%)** chạm tài liệu + sổ nợ,
**142 (19%)** chạm artifact + bảng quyền. Kết luận của Đức đứng vững, và nặng hơn bản giao việc.

**Nhưng một con số của bản giao việc thì SAI, đừng dẫn lại:** câu *"hạ tầng 44.239 dòng lớn hơn
mã sản phẩm 38.136 dòng"*. Đếm lại bằng Node: hạ tầng (`scripts/ tests/ docs/ bang-trang-thai/`)
**45.200 dòng**; mã trong `workers/` (`.js .mjs .html .css`) **89.262 dòng**, trong đó **52.609
là mã chạy thật** và **36.653 là suite của chính các gói**. Sản phẩm **hơn gấp đôi** hạ tầng.
Con số cũ sinh ra vì `wc -l` với hàng trăm đường dẫn **vượt trần đối số** rồi trả tổng của mẻ
cuối — đúng cái bẫy đã cắn tôi một lượt trong phiên này. Nên lượt cắt này **đứng trên tỉ lệ
commit**, không đứng trên số dòng; và ở lượt này **xoá là thắng, thêm là thua**.

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

## N-35 · ADR-0017 đã viết xong nhưng CHƯA vào repo — vì đúng cái bệnh nó chữa

**[2026-09-07]** · Đức chốt kiến trúc *"không ai phải chờ ai"*. Vai điều phối viết xong nội dung
ADR-0017 (ba vế: khoá hết hạn khi có người chờ · vai điều phối không thể bị chặn · khoá thuộc về
CHAT chứ không thuộc từng tác vụ ngầm), nhưng **không ghi được vào `docs/adr/`**: khoá `_docs` do
chat Scouter giữ 4 giờ và chat đó **đang làm thật** (commit gần nhất cách 4 phút), nên lấy khoá
là lấy khỏi tay người đang làm.

**Đây là bằng chứng sống của chính vấn đề, không phải một sự cố.** Vế ⑵(a) của ADR đó nói *"tạo
file MỚI trong `docs/adr/` không cần khoá, vì tạo file không bao giờ đụng nhau — chỉ SỬA file mới
đụng"*. Nếu vế đó đã có hiệu lực thì lượt ghi này không bị chặn một giây nào.

Nội dung đang nằm ngoài repo, ở thư mục tạm của phiên điều phối. Chủ khoá `_docs` tiếp theo chép
vào `docs/adr/0017-khong-ai-phai-cho-ai.md` — **kiểm lại số 0017 chưa ai dùng trước khi chép**,
vì chính ADR đó cảnh báo trùng số là rủi ro đã đo được (mã sổ nợ trùng hai lần trong một ngày).

- **đóng khi:** lệnh: test -f docs/adr/0017-khong-ai-phai-cho-ai.md

## N-36 · Giới hạn "tối đa 2 lane" đo SAI đơn vị — Đức tính theo CHAT, không theo tác vụ ngầm

**[Đức làm rõ 2026-09-07]** · Nguyên văn: *"lane ở đây tôi hiểu là 2 phiên chat với AI, ví dụ
trong 1 chat với bạn, mà bạn có khả năng manage cùng lúc 5 task chạy ngầm mà không dẫm chân nhau
thì tôi vẫn ok, ko vấn đề gì."*

Nên giới hạn đúng là **tối đa 2 CHAT song song**, và trong một chat thì số tác vụ ngầm **không bị
giới hạn** miễn chúng không giẫm chân nhau.

**Chỗ này đổi kiến trúc, không chỉ đổi con số:** mọi đau ngày 07/09 là đau **giữa các chat** (chat
Scouter giữ `_docs` 4 giờ · một chat đã tắt còn cầm khoá 3 giờ), **không** phải giữa các tác vụ
ngầm của một chat. Bảng quyền tồn tại để điều phối những bên **không nói được với nhau**; một chat
và tác vụ ngầm của chính nó thì nói được, nên khoá ở đó là chi phí thuần. Vế ⑶ của ADR-0017 chốt
theo hướng này.

Hệ quả cần sửa ở `AGENTS.md` khi cắt luật: câu giới hạn phải nói **chat**, đừng nói **lane** — hai
chữ đó đã được dùng lẫn nhau và vai điều phối đã tự hãm sai chỗ vì đọc theo nghĩa hẹp.

- **đóng khi:** lệnh: grep -c "tối đa 2 chat" AGENTS.md ra 1

- **ĐỔI MÃ N-35 → N-37** · 2026-09-07 · lane `claude-assistant` · khối "ADR-0017 đã viết xong nhưng CHƯA vào repo" đọc là **N-37** từ nay — lane `claude-tinh-gon` dùng `N-35` cùng lúc trong lượt cắt sổ, khối đó tới trước nên giữ mã · **đóng khi:** lệnh: test -f docs/adr/0017-khong-ai-phai-cho-ai.md
- **ĐỔI MÃ N-36 → N-38** · 2026-09-07 · lane `claude-assistant` · khối "Giới hạn tối đa 2 lane đo SAI đơn vị" đọc là **N-38** từ nay — cùng lý do · **đóng khi:** lệnh: grep -c "tối đa 2 chat" AGENTS.md ra 1
- **ĐÓNG N-38** · 2026-09-07 · lane `claude-tinh-gon` · `grep -c "tối đa 2 chat" AGENTS.md` ra **1**. Giới hạn ⑥ ở mục 3 nay nói **chat**, dẫn nguyên văn câu Đức nói 07/09, và nói thẳng rằng số tác vụ ngầm trong một chat **không bị giới hạn** — kèm lý do: bảng quyền chỉ để điều phối những bên không nói được với nhau. `claude-assistant` bắt được đúng chỗ: tôi viết "lane" theo nghĩa hẹp trong khi Đức đo theo chat, và đó là đổi kiến trúc chứ không đổi con số.
- **ĐO THÊM CHO N-35** · 2026-09-07 · lane `claude-tinh-gon` · **cái giá thật của việc đóng băng chưa được cưỡng chế, đo trên máy này**: chuỗi `npm test` mà cổng đóng phiên chạy gọi suite của cả bốn bản gói đã đóng băng, mất **52,4 giây** mỗi lượt (`duc-auto-chatgpt/v0.1.0` 22,9s/115 phép · `duc-auto-gemini/v0.2.0` 15,3s/95 · `duc-auto-gg-flow-video/v0.1.0` 12,8s/101 · `duc-auto-gemini/v0.1.0` 1,4s/19) — trong khi gói **SỐNG** `duc-scouter` chỉ mất **2,3 giây / 8 phép**. Tức **330 trong 338 phép kiểm gói** và **96% thời gian** của phần đó là của mã không lane nào được sửa. Cả bốn đang XANH, nên đây là **thuế thời gian, chưa phải cửa chặn** — nhưng một phép kiểm mục ruỗng trong đó sẽ thành cửa chặn cho gói sống. Đo lại: `for p in ...; do node workers/$p/tests/run-all.mjs; done`. **Cấm gỡ suite khỏi đĩa** (mục 4 của `AGENTS.md`) — việc cần làm là cho cổng đọc khối `frozen` rồi bỏ qua, không phải xoá.

## N-39 · ADR sinh ra đã `Accepted` thì bất biến từ lúc chào đời — lỗi chính tả thành vĩnh viễn

**[gặp thật 2026-09-07 với ADR-0018]** · B12 chốt mốc bất biến ở **commit ĐẦU TIÊN** mà `status`
thành `Accepted`. Viết ADR với `status: Accepted` ngay từ commit đầu thì **không còn lượt nào để
sửa chữ**: mọi lượt sửa phần thân sau đó làm B12 ĐỎ với MỌI phiên.

Xảy ra: ADR-0018 lọt một chữ sai (`Codey` thay vì `Codex`) trong commit đầu. Không đổi quyết định
nào, nhưng **không sửa được nữa** — và cách duy nhất "đúng luật" là viết thêm một ADR để đính chính
một chữ, tức đẻ ra rác để dọn rác.

**Vá đúng chỗ, và nó rẻ:** ADR viết ở `status: Proposed`, soát, rồi mới đổi sang `Accepted`. B12
**đã miễn** cả frontmatter lẫn mục `## Trạng thái`, nên lượt đổi đó hợp luật sẵn — chỉ là chưa ai
khai rằng phải đi qua `Proposed`. Bản mẫu `docs/_TEMPLATE-adr.md` nên đặt sẵn `Proposed`.

Rủi ro của cách vá: một ADR nằm mãi ở `Proposed` thì nó là quyết định chưa chốt mà người sau đọc
như đã chốt. Nên nếu làm thì phải kèm phép đếm: ADR ở `Proposed` quá N ngày thì báo VÀNG.

- **đóng khi:** lệnh: grep -c "status: Proposed" docs/_TEMPLATE-adr.md ra 1

## N-40 · `git commit -a` của một lane cuốn theo file ĐÃ DÀN của lane khác

Luật hiện có chặn *push* cuốn theo commit người khác (`safe-push --carry`) nhưng **không chặn
*commit* cuốn theo file đã dàn**. Đã nổ thật 07/09: commit `27a88ce7` của `claude-dong-bang-2`
chứa 6 file của `claude-scouter-s06` — đúng loại sai mà nhãn `Lane:` sinh ra để chặn.

Không sửa lịch sử được (phải hỏi Đức), nên bản ghi đó ở lại sai vĩnh viễn.

- **đóng khi:** hoặc có một chốt khiến `git add` của lane này không bị lane kia commit hộ (ví
  dụ: cổng đóng phiên cảnh báo khi `git diff --cached` có file ngoài vùng mình giữ), hoặc Đức
  chốt chấp nhận rủi ro này và ghi một dòng lý do.

## N-41 · Mở một vùng dùng chung chỉ làm được bằng đường đáng ngờ nhất

Đã đi hết ba cửa khi mở `workers/_shared/` (07-08/09) và cả ba đều đóng: `claim.mjs --take` từ
chối khoá lạ và bảo *"khai ở .repo-structure.json trước"*; khai vào khối `areas` **vẫn đỏ**, vì
`areaOf()` coi mọi thư mục dưới `workers/` là một package cần khoá riêng trong `claims.json`;
và không lệnh nào tạo được khoá đó.

Nên người đầu tiên đi đường này phải **sửa tay `claims.json` rồi `--restamp`** — đúng thao tác
mà luật cảnh báo nặng nhất. Nó chạy được (đã chụp chủ sở hữu trước/sau, không khoá nào bị đổi
chủ), nhưng một đường hợp lệ mà **trông giống hệt một vụ cướp khoá** thì lần sau không ai phân
biệt được hai thứ đó.

- **đóng khi:** `claim.mjs` có một đường TẠO khoá mới (ví dụ `--khai-vung <khoá>`) chỉ chạy
  được khi khoá đó đã khai trong `.repo-structure.json`, và nó đóng dấu lại luôn — hoặc Đức
  chốt rằng mở vùng mới là việc hiếm đến mức không đáng tự động hoá, và ghi một dòng lý do.

## N-42 · Hai mục sổ nợ viết sai định dạng đã VÔ HÌNH với công cụ

Ghi lại vì nó là một chỗ mù của chính cuốn sổ, không phải một lỗi đánh máy.

Ngày 07/09 lane `claude-scouter-s06` ghi hai mục dạng gạch đầu dòng (`- **A-01**`) thay vì tiêu
đề `## N-<số>`. `backlog-check.mjs` cắt sổ theo tiêu đề, nên **không đếm, không kiểm trường
`đóng khi`, không báo gì cả** — số mục vẫn y nguyên sau khi thêm hai mục.

Hệ quả thật: dựa trên con số sai đó, lane này báo Đức rằng sổ *"nay 11 mục, vượt trần 10"* và
Đức nâng trần lên 15. Trần nâng thì vô hại, nhưng **lý do đưa ra là sai**. Một cuốn sổ im lặng
nuốt mục mới thì mọi quyết định dựa trên số mục của nó đều đáng ngờ.

- **đóng khi:** `backlog-check.mjs` ĐỎ khi thấy một dòng trông như mục nợ (`**X-NN**` ở đầu
  dòng, ngoài khối mã) mà không nằm dưới một tiêu đề `## N-<số>` nào — hoặc Đức chốt rằng chỉ
  cần một dòng nhắc trong luật của sổ là đủ.

## N-45 · Một byte điều khiển thô trong gói đóng băng làm git giấu mọi diff của tệp

`workers/duc-auto-gg-flow-video/v0.1.0/tests/halt-instructions-core-smoke.mjs` mang một byte
`0x08` (backspace) ở dòng 27. Hệ quả không phải mã chạy sai — Node đọc bình thường, suite của gói
đó vẫn xanh. Hệ quả là **git coi cả tệp là nhị phân**, nên `git diff` của nó chỉ in
`Bin … bytes`: mọi thay đổi về sau **bị giấu**, kể cả một bản vá làm yếu chốt halt.

Tìm ra khi dựng `tests/khong-byte-dieu-khien-smoke.mjs` (08/09), sau khi đúng bệnh này được phát
hiện ở hai tệp khác trong cùng ngày: `workers/hnx-fetch/v0.1.0/scripts/fetch-core.mjs` (một byte
NUL) và `tests/feature-parity-smoke.mjs` (hai byte NUL làm mốc tạm) — cả hai đã vá.

**KHÔNG tự sửa.** Gói đang đóng băng (`.repo-structure.json` khối `frozen`), luật mục 1 chỉ cho
đọc. Phép ghim mới **bỏ qua ba gói đóng băng** vì một phép ghim đòi sửa thứ không ai được sửa là
một phép ghim không lượt chạy nào làm xanh nổi.

- **mở:** 2026-09-08 · lane `claude-scouter-s06` (mã và tiêu đề đổi 08/09 bởi lane
  `claude-ext-cum5`: khối này viết theo hình dạng sổ GÓI nên **vô hình với công cụ** — đúng
  cái bệnh mà `N-42` ngay trên mô tả. Chữ trong thân giữ NGUYÊN VĂN, chỉ dòng tiêu đề và
  dòng `đóng khi` đổi hình dạng. Nó cũng đang mang trùng mã `N-42`.)
- **vùng:** `workers/duc-auto-gg-flow-video` — **đóng băng, chỉ đọc**
- **đóng khi:** đức: hoặc gói đó được mở băng vì một lý do khác và byte này được gỡ **trong
  chính lượt mở**, hoặc Đức chốt rằng ba gói đóng băng không cần đọc diff nữa và mục này rời sổ.

## N-43 · Repo này chưa có bộ chạy suite song song + dấu xác nhận, nên mỗi vòng vẫn tốn gấp ~4

- **nhóm:** cong
- **đóng khi:** lệnh: `node scripts/chay-test.mjs` chạy được và ghi `.ark-suite-stamp.json`, VÀ `node tests/dau-suite-smoke.mjs` xanh, VÀ cổng đóng phiên in `suite gốc repo: DÙNG LẠI DẤU` khi chạy ngay sau nó. Khoá cần: `_code` + `_root`.
- **mở:** 2026-09-08 · lane `claude-cua-kiem`
- **vùng:** `_code` (+ `_root` cho cấu hình)
- **vì sao:** Đo 08/09 ở repo này: chuỗi `npm test` **241,7s / 16 bước** (một bước chiếm 30%),
  và cổng đóng phiên **chạy lại toàn bộ chuỗi đó** — nên một vòng bình thường tốn khoảng
  **242 + 242 + 37 ≈ 8,5 phút**. Bộ khung đã vá xong và đo được **1.095s → 278s (nhanh 75%)**;
  repo này chưa nhận.
- **cách làm, đã chạy thật ở bộ khung bản 1.3.65 — chép sang, đừng nghĩ lại:**
  1. Chép `scripts/chay-test.mjs` và `tests/dau-suite-smoke.mjs` từ `Ark_Repo_Harness`.
  2. `package.json`: `test:tuan-tu` = chuỗi cũ; `test` = `node scripts/chay-test.mjs`.
  3. `.repo-structure.json`: thêm khối `test.serial` — khai suite nào đọc git của **cây làm việc
     chính**. Khai sót không nguy hiểm: bộ chạy tự chạy lại một mình mỗi suite đỏ.
  4. `.gitignore`: thêm `.ark-suite-stamp.json`.
  5. `session-check.mjs`: nhập `{ bamLenh, danhSachSuite, dauCay, docDau, xetDau }` và bọc nhánh
     `runRootSuite()` — xem đúng khối ấy trong bộ khung.
  6. **Cái bẫy đã cắn 4 lần:** cổng nhận thêm một phụ thuộc, nên **mọi kho thử chép danh sách
     script cố định phải chép thêm `chay-test.mjs`**. Ở repo này có **13 danh sách chép** —
     và **hai danh sách KHẲNG ĐỊNH** trông y hệt mà **không được đụng**
     (`repo-structure-smoke:313`, `dau-vet-vung-smoke:50`). Soát bằng máy, đừng bằng mắt.
- **vì sao lane mở mục này không tự làm nốt:** `_code` và `_docs` do lane `claude-scouter-s06`
  giữ và đang làm dở (nhận 7 phút trước lúc ghi mục này). Luật mục 1: chỉ được đọc.


- **ĐÓNG N-43** · 2026-09-08 · lane `claude-cua-kiem` · Bộ chạy song song + dấu xác nhận đã cài. **[ĐO]** chuỗi suite `241,7s → 93s`; cổng `~280s → 33s`; cả vòng `521s → 126s` (**nhanh 76
- **ĐÓNG N-43** · 2026-09-08 · lane `claude-cua-kiem` · Bộ chạy song song + dấu xác nhận đã cài. **[ĐO]** chuỗi suite 241,7s → 93s; cổng ~280s → 33s; cả vòng 521s → 126s (**nhanh 76%**). `node tests/dau-suite-smoke.mjs` xanh 7/7 với **11 cửa từ chối**, và cổng in `suite gốc repo: DÙNG LẠI DẤU`. Khác bản bộ khung ĐÚNG MỘT CHỖ: đường nhanh mang tên `npm run test:song-song`, còn `npm test` giữ nguyên chuỗi tuần tự — một phép ghim trong gói ĐÃ ĐÓNG BĂNG đọc thẳng `scripts.test` để bắt xanh giả, mà gói đóng băng thì chỉ-đọc.

- **ĐÓNG N-35** · 2026-09-08 · lane `claude-ext-dot0` · Cờ đóng băng nay có RĂNG ở CẢ HAI cửa. Nửa cổng đã có từ trước (`chonSuiteBoDongBang` + `tests/frozen-suite-smoke.mjs`); nửa còn thiếu là **bản đồ việc**, và đó mới là cửa nguy hiểm hơn — cổng chặn lúc đóng phiên, còn bản đồ là thứ AI đọc để CHỌN việc lúc MỞ phiên. **[ĐO 08/09]** trước bản vá: `node scripts/what-next.mjs` xếp `workers/duc-auto-chatgpt` vào *"CHẠY SONG SONG ĐƯỢC NGAY — ưu tiên #2, 22 việc mở"*, `grep -c frozen scripts/what-next.mjs` ra `0`. Sau bản vá: gói đó nằm ở mục riêng `B2 · ĐÃ ĐÓNG BĂNG — chỉ được ĐỌC dù KHÔNG có chủ`, mục A còn 2 luồng đều là gói sống. **Không ẩn gói đi** — ẩn hẳn thì nợ của nó vô hình. Kèm theo: cảnh báo *"đã đóng nhưng KHÔNG gạch ngang"* thôi trỏ vào gói đóng băng, vì **[ĐO]** cả bốn mã nó nhắc (`B-29` `B-16` `B-18` `G-14`) đều nằm trong gói đóng băng — 4/4 là lời mời đi sửa file không ai được sửa. Ghim: `tests/what-next-smoke.mjs` (đối chứng chưa khai · rời mục A · vẫn hiện · không nuốt gói cùng tiền tố · bản in phải NÓI ra). Đột biến: gỡ `!v.dongBang` thì suite đỏ.

- **ĐÓNG N-31** · 2026-09-08 · lane `claude-ext-dot0` · **Rộng hơn mô tả gốc, và đây là phần đáng ghi lại.** Mục gốc nói *"đếm hụt việc mở của MỘT gói"*; đo lại thì bộ đọc chỉ nhận tiêu đề `###`, nên **MỌI quyển sổ viết cấp `##` bị đọc thành RỖNG**. **[ĐO 08/09]** `workers/hnx-fetch` báo `0 việc mở` trong khi sổ có **3** mục thật (`H-02` `H-03` `H-06`) — bảng báo rỗng thì phiên điều phối đi tìm việc ở nơi khác trong khi việc nằm ngay đó. Bản vá: nhận cả `##` và `###`; hiểu quy ước *cửa ra rẻ ngang cửa vào* (`- **ĐÓNG X**` ở cuối sổ và tiêu đề `## ĐÓNG · X` đều là đóng, và **đúng luật nên không bị báo là khai sai**); đọc **hai lượt** vì dòng đóng nằm cuối sổ còn tiêu đề nằm đầu; một mã chỉ đếm một lần. Kiểm chéo: sổ Scouter có 7 tiêu đề `## MỞ` mà **0 mục còn mở** — khớp đúng câu cuối sổ đó tự khai *"Sổ nợ Scouter nay RỖNG"*. Ghim: 4 phép mới trong `tests/what-next-smoke.mjs` (20 → 24).

## N-44 · Sổ nợ gốc repo KHÔNG có mặt trên bản đồ việc

- **nhóm:** cong
- **mở:** 2026-09-08 · lane `claude-ext-dot0`
- **vùng:** `_code`
- **vì sao:** Phát hiện lúc đóng `N-31`. `what-next.mjs` chỉ quét sổ nợ nằm trong các **đơn vị**
  (gói có `manifest.json`), nên **[ĐO 08/09]** 11 mục nợ hạ tầng đang mở ở gốc repo **không hiện
  ở mục nào** của bảng — kể cả khi `_root` / `_code` trống chủ. Phiên điều phối đọc bảng sẽ thấy
  repo chỉ còn việc của gói, trong khi phần lớn nợ nằm ở gốc.
- **chỗ dễ vấp:** sổ gốc dùng quy ước `ĐỔI MÃ` mà `backlog-check.mjs` xử lý còn `what-next.mjs`
  thì không, nên hai bộ đếm ra **11 và 12** trên cùng một file. Nối vào thì phải dùng CHUNG một
  bộ đọc — hai bộ đọc cho một quyển sổ là cách chắc chắn để chúng nói khác nhau.
- **đóng khi:** lệnh: `node scripts/what-next.mjs` hiện mục nợ của `BACKLOG.md` gốc dưới đúng
  khoá của nó, và có một phép ghim dựng sổ có `ĐỔI MÃ` rồi kiểm con số khớp với `backlog-check.mjs`.

- **ĐÓNG N-42** · 2026-09-08 · lane `claude-ext-cum5` · `backlog-check.mjs` nay **ĐỎ** khi thấy một dòng trông như mục nợ mà công cụ không đếm được — hai hình dạng: gạch đầu dòng `- **A-01**` (ca 07/09) và hình dạng sổ GÓI `## MỞ · N-42` (ca tìm ra hôm nay). **[ĐO]** chạy lần đầu ra ngay **1 mục vô hình thật** ở dòng 502, đã nằm trong sổ từ 08/09 mà không lớp nào kêu. Vế khó không phải bắt được mà là **không bắt nhầm CỬA RA**: `- **ĐÓNG N-xx**` và `- **ĐỔI MÃ …**` chính là cách đóng mục của sổ này, bắt nhầm chúng là khoá luôn cửa ra — có phép ghim riêng cho vế đó, cùng một phép cho bản mẫu trong khối mã. Ghim: 5 phép mới ở `tests/backlog-check-smoke.mjs` (15 → 20), trong đó một phép ghim **đường dây** (`kiemSo` phải chở kết quả ra, và mã thoát phải đo nó) — một hàm đúng mà không ai gọi thì cổng vẫn im như cũ.

- **ĐÓNG N-39** · 2026-09-08 · lane `claude-ext-cum5` · Bản mẫu ADR khai `status: Proposed` trong khối chép, kèm **lý do** viết ngay cạnh: B12 chốt mốc bất biến ở commit ĐẦU TIÊN mà `status` thành `Accepted`, nên viết thẳng `Accepted` là đóng cửa sửa chữ ngay từ commit đầu (gặp thật với ADR-0018: chữ `Codey`). Ghim: `tests/check-bootstrap-smoke.mjs` (29 → 30) — ghim CẢ giá trị lẫn câu lý do, vì thiếu lý do thì người sau đọc `Proposed` như mặc định tuỳ tiện rồi sửa cho gọn. **CỐ Ý KHÔNG dựng máy đếm ADR nằm lâu ở `Proposed`**, dù chính mục này đề xuất: hôm nay đo được **đúng 1** ADR ở `Proposed` (`0019`), và một cỗ máy canh một con số bằng 1 là thuế thu trên mọi phiên để phòng một chuyện chưa xảy ra (luật mục 3 giới hạn ⑦). Bản mẫu ghi sẵn câu lệnh đếm tay và ghi rõ mặt trái, nên khi nào nó thành vấn đề thật thì mở lại mục mới có số đo.

- **ĐÓNG N-11** · 2026-09-08 · lane `claude-ext-cum5` · Hai bảng vẫn là hai file — **không gộp, cố ý**, vì ràng buộc của chúng ngược nhau (bản ở gốc phải NẰM YÊN trong git cho GPT audit; bản sống phải GHI ĐÈ liên tục, mà ghi đè vào file đã commit là làm bẩn cây làm việc của mọi lane). Thay vào đó **mỗi bản tự khai nó là bản nào**, ở hai chỗ: dòng đầu file (máy kiểm được) và dải mốc đầu trang (Đức nhìn thấy). Câu khai là **hằng số dùng chung** (`KHAI_BAN_CHUP` · `KHAI_BAN_SONG` ở `build-overview.mjs`) — gõ tay hai câu ở hai file là hai câu sẽ lệch nhau ở lượt sửa thứ ba. `bang-trang-thai/loi.mjs` đổi chuỗi, và **ném lỗi `KHAI_BAN_0` nếu không tìm thấy câu khai**: bộ sinh đổi chữ mà đây im lặng thì bản sống mang câu của bản chụp, tức bảo Đức đi nhấp đúp đúng cái vừa nhấp. Ghim: `tests/bang-ba-cua-smoke.mjs` 14 → 17 (dòng đầu · đổi HẾT chứ không chỉ chỗ đầu tiên · thiếu câu khai thì KÊU); `tests/build-overview-smoke.mjs` xanh 36/36.

- **ĐÓNG N-37** · 2026-09-08 · lane `claude-ext-cum5` · Nội dung ADR **không mất** — bản viết 07/09 còn nguyên trong thư mục tạm của phiên, đã vào repo tại `docs/adr/0005-lam-viec-song-song.md`. **Điều kiện đóng ghi trong mục này nay SAI, đọc kỹ chỗ này:** nó bảo `test -f docs/adr/0017-khong-ai-phai-cho-ai.md`, nhưng trong lúc bản nháp nằm ngoài repo thì **số 0017 đã thuộc về một ADR khác** (`0004-hai-vai-assistant.md`). Đây đúng thứ rủi ro mà vế ⑵(a) của chính ADR đó cảnh báo — tạo file không đụng nhau về nội dung nhưng **đụng nhau về số**. Lệnh đúng: `test -f docs/adr/0005-lam-viec-song-song.md`. **Vào ở `status: Proposed`, KHÔNG phải `Accepted`, và đây không phải thủ tục:** Đức đã nói vế ⑶ nguyên văn, nhưng **vế ⑴ (khoá hết hạn khi có người chờ) và ⑵ (tách khoá `AGENTS.md`) là thiết kế của AI**, cả hai đụng luật khoá — tức thứ `AGENTS.md` mục 2 bắt hỏi Đức. Đóng dấu `Accepted` cho chúng là để AI tự duyệt luật của chính mình. Hai chỗ đổi so với bản gốc được ghi thành một khối ngay đầu ADR, không sửa lén. **Việc còn lại của Đức:** đọc ba vế, chốt vế nào lấy vế nào bỏ, rồi đổi frontmatter sang `Accepted` ở một lượt riêng (B12 miễn frontmatter nên lượt đó hợp luật sẵn).

- **ĐÓNG N-44** · 2026-09-08 · lane `claude-ext-cum5` · Sổ nợ gốc repo nay có mặt trên bản đồ việc. **[ĐO]** trước: 8 mục mở ở gốc **không hiện ở mục nào**; sau: cả 8 hiện dưới khoá `_root`. Chỗ dễ vấp mà mục này đã chỉ ra và bản vá đi đúng đường đó: **dùng lại `backlog-check.mjs`, không viết bộ đọc thứ hai** — sổ gốc có quy ước `ĐỔI MÃ` mà chỉ bộ đọc kia hiểu, và hai bộ đã ra **11 và 12** trên cùng một file. Nay chúng KHÔNG THỂ lệch, vì chỉ còn một bộ; phép ghim dựng một sổ có `ĐỔI MÃ` + một dòng đóng rồi so **từng mã** giữa hai đường. Vùng suy từ **đường dẫn** như mọi sổ khác (`_root`), không suy từ trường `- **vùng:**`: đo được **4 trong 8 mục KHÔNG khai** và một mục khai **hai** khoá, nên đó là văn xuôi người viết — nó được in ra riêng một dòng kèm nhãn `[DÒ]` để người đọc tự kiểm. Ghim: `tests/what-next-smoke.mjs` 24 → 27, trong đó một phép ghim rằng `main()` thật sự có nối sổ gốc vào (một hàm đúng mà không ai gọi thì bản đồ vẫn im như cũ — chính là cách N-44 đã hỏng).

- **ĐÓNG N-41** · 2026-09-08 · lane `claude-ext-cum5` · `claim.mjs` nay có `--khai-vung <khoá> --as <phiên>`: tạo một ô **trống chủ** cho khoá mà `.repo-structure.json` đã công nhận **và** thư mục có thật trên đĩa. Trước cửa này, mở một vùng dùng chung chỉ làm được bằng **sửa tay `claims.json` rồi `--restamp`** — chạy được, nhưng một đường hợp lệ trông giống hệt một vụ cướp khoá. Ba chốt: hỏi **chính bộ quy vùng** (`stewardOf` của một file bên trong phải trả về đúng khoá đó) chứ không chép lại luật — hai bản sao của một luật đã trả hai câu khác nhau ngày 02/09; khoá đã có thì **báo sai, không ghi đè**; và **`--take` một khoá chưa khai vẫn là ngõ cụt** — cửa mới không nới lỏng cửa cũ, có phép ghim riêng cho vế đó. **ĐỘT BIẾN KIỂM (bắt buộc — đây là sửa cơ chế đa phiên, `MULTIFLOW.md` mục 5): 4/4 ĐỎ**, nền XANH trước và sau, neo khớp 4/4. Một lớp bị **BỎ ĐI thay vì giữ**: bản đầu chụp chủ sở hữu trước/sau rồi so, nhưng khoá đã được kiểm là chưa có nên lớp đó không đột biến nào giết được — theo đúng tiền lệ `PB2`, bỏ lớp thừa còn hơn giữ một dòng đỏ vĩnh viễn ai cũng học cách bỏ qua. Bất biến *"không chạm chủ của khoá nào"* vẫn được canh, ở phép ghim chạy THẬT. Ghim: `tests/claim-smoke.mjs` 16 → 18. Đã khai vào `AGENTS.md` mục 1.

## N-46 · Luật NHÀ CHUNG của Bridge chưa vào bản đồ gốc repo (2026-09-08, `claude-scouter-s06`)

Đức chốt 08/09: mọi thứ thuộc Bridge của mọi extension nằm dưới
`C:\WORKING ZONE\Chrome Extension Bridge\<tên-gói>\`, mỗi gói một thư mục con. Đức nói lỗi đặt
lung tung **đã gặp vài lần**, và yêu cầu lưu luật vào bản đồ thư mục.

**Đã làm được phần cưỡng chế:** hằng số `NHA_BRIDGE` + cờ `--goi` trong
`workers/_shared/bridge-host/tao-tep-ghep-cap.mjs` (công cụ tự đặt đúng chỗ, không phụ thuộc AI
có đọc đúng trang không), luật viết ở `workers/_shared/AGENTS.md`, phép ghim khối ⑸ canh cả bốn vế.

**Chưa làm được:** khai vào **bản đồ gốc repo** — `.repo-structure.json` (khối mới, ví dụ
`thu_muc_ngoai_repo`) và một dòng ở `AGENTS.md` gốc. Lý do: cả `_root` lẫn `_docs` đang do phiên
khác giữ lúc 08/09, và luật mục 1 cấm ghi vào vùng có chủ khác.

Đây là chỗ AI đọc ĐẦU TIÊN mỗi phiên, nên luật nằm ở gói `_shared` thì phiên không đụng gói đó sẽ
không bao giờ thấy — đúng cách lỗi này tái diễn.

- **đóng khi:** đức: hoặc `.repo-structure.json` có khối khai đường dẫn nhà chung của Bridge và `AGENTS.md` gốc có một dòng trỏ tới nó; hoặc Đức chốt rằng để luật ở `workers/_shared/AGENTS.md` là đủ.

- **ĐÓNG N-46** (2026-09-08, `claude-scouter-s06`) · Khoá `_root` vừa trống, Đức bảo làm luôn.
  Luật nay khai ở khối `thu_muc_ngoai_repo` của `.repo-structure.json`, và có **một dòng ở
  `AGENTS.md` gốc** — chỗ AI đọc đầu tiên mỗi phiên.

  Làm hơn một bước so với mục yêu cầu: **bộ sinh nay ĐỌC đường dẫn từ bản đồ** thay vì gõ cứng.
  Gõ cứng thêm một chỗ là dựng bản sao thứ hai của một luật, và repo này đã trả giá đúng thế ngày
  02/09 (hai bản của một danh sách miễn trừ trả hai câu khác nhau cho cùng một tệp). Thiếu khai
  báo thì bộ sinh **ném**, không đoán một đường mặc định — một bộ sinh tự bịa đường dẫn là đúng
  cái bệnh khối này sinh ra để chữa.

  Phép ghim khối ⑸ nay canh cả hai chiều (sửa mã quên bản đồ · sửa bản đồ mã không theo) và có
  thêm **vế đối chứng**: bốn gói cũ trong nhà chung phải thật sự đúng hình dạng đã khai — luật
  khai ra mà thực tế không theo thì nó là chữ, không phải mô tả. Đã thử phá: đổi đường dẫn trong
  bản đồ thì phép ghim **ĐỎ**.

  Về giới hạn ⑦ của `AGENTS.md` (*một luật vào thì một luật ra*): dòng mới này đi theo nhánh
  **"đo được nó đã nổ mấy lần"** — Đức nói lỗi đặt lung tung đã gặp vài lần, lần gần nhất là
  08/09 do chính phiên này.

- **ĐÓNG N-29** · 2026-09-08 · lane `claude-ext-n29` · Điều kiện đóng đạt: `node scripts/backlog-check.mjs --can-duc` ra **0 gói** có `human_action` khác rỗng mà cả gói không có dấu `@Đức` nào. Đã theo đúng thứ tự bắt buộc mà chính mục này đặt ra — **⑴ đặt dấu → ⑵ đo bằng nhau → ⑶ mới bỏ nguồn cũ** — chứ không cắt trước. Dấu gắn vào **chính dòng `human_action`** (cách `gg-flow-video` đã làm): đặt ở đó là làm hai cơ chế khớp nhau **bằng cấu trúc**, vì chính dòng ấy thành một dòng-có-dấu mà bộ đọc lấy được từ `STATUS.md`. Ba gói sửa: `hnx-fetch` (0 dấu, việc thật) · `duc-auto-chatgpt` (ca *MẤT MỘT PHẦN* — có dấu nhưng `human_action` nói việc khác) · `duc-scouter` (khai *"không có việc gì chờ Đức"* bằng một **câu**, mà lược đồ có sẵn giá trị `"không"` cho ca đó — một câu văn xuôi thì máy đọc thành **việc thật**, nên bảng đang treo một việc không tồn tại; lời dặn cho lúc quay lại chuyển sang `next_step`). `duc-auto-gemini` **không đụng**: lane `claude-gemini-crlf` đang giữ khoá, và **không cần** — chính `N-29` đã đối chiếu và kết luận gói đó an toàn. **[ĐO]** khối *"từ hồ sơ"* trên bảng **4 → 1**.

- **BƯỚC ⑶ CỦA N-29 — CỐ Ý KHÔNG LÀM, và đây là lý do** · 2026-09-08 · lane `claude-ext-n29` · Mục đó đòi *"`human_action` không còn nuôi ô đếm nào trên bảng"*. Nay bỏ được rồi, nhưng **không nên**: `tests/build-overview-smoke.mjs` có một phép ghim đặt đúng chỗ ấy — *"số nhãn HỒ SƠ = số hồ sơ còn lại → **nuốt nguồn hồ sơ là ĐỎ**"*. Gỡ nguồn thứ hai là gỡ đúng lớp bảo vệ đó, và luật vàng 3 cấm. Đổi lại ta được thứ mạnh hơn: **một cổng** báo đỏ khi có `human_action` không dấu, thay cho **một dòng trên bảng** hy vọng có người nhìn thấy. Cái giá còn lại là gói `gemini` hiện **một dòng thừa** cho tới khi lane của nó gắn dấu vào `STATUS.md` — và thừa là phía mà thiết kế này cố ý lệch về: *hai nguồn lệch thì thấy được, một nguồn thiếu thì không*.

- **ĐÓNG N-40** · 2026-09-08 · lane `claude-ext-n05` · `node scripts/claim.mjs --soat --as <phiên>` liệt kê file đã dàn **không thuộc quyền ghi** của bạn, và **thoát 3** — mạnh hơn cái mà điều kiện đóng đòi (nó chỉ đòi *cảnh báo*). Chạy NGAY TRƯỚC `git commit`; đã vào chuỗi bắt buộc ở `AGENTS.md` mục 0b. **Nói thẳng giới hạn:** nó là một **LỆNH, không phải một cổng** — cổng đóng phiên chạy lúc index đã rỗng nên nó không nhìn thấy gì, ai bỏ bước soát thì không lớp nào chặn. Đây là mức cao nhất máy làm được mà không dựng hook tự chạy (thứ phải hỏi Đức). Bù lại, thứ khiến nó khả thi là khoá mức file: trước đó *"vùng tôi giữ"* quá thô để nói file nào của ai.

- **ĐÓNG N-05** · 2026-09-08 · lane `claude-ext-n05` · Mục này khó hơn `N-40` vì file **nằm trong quyền ghi của bạn** — nó là ba quyển sổ **miễn khoá** (`BACKLOG.md` · `HANDOFF.md` · `IDEAS.md`), nơi nhiều lane cùng ghi một cách **hợp lệ**. Bản đầu của `--soat` bỏ qua hẳn nhóm đó, tức im lặng ở đúng chỗ nguy nhất. Nay: sổ miễn khoá được tách ra và soi bằng `appendOnlyAtEof` — **dùng lại đúng hàm** cổng đóng phiên và `safe-push` đang dùng, không đẻ bản sao thứ ba của một luật. Phần bạn dàn mà **sửa dòng cũ** thì `SOAT_SO_CHUNG` báo đỏ, vì chỉ có hai khả năng và cả hai đáng dừng: bạn phạm luật miễn khoá, hoặc `git commit -o <sổ>` đang cuốn dòng lane khác vừa viết. **Đã thử cả hai chiều:** chỉ thêm ở cuối → thoát 0; sửa một dòng cũ → thoát 3, gọi đúng tên sổ. Ghim `claim-smoke` 23 → 25. **Đột biến kiểm 7/7 ĐỎ** (M7 dựng lại đúng bản đầu — im lặng bỏ qua sổ miễn khoá — và nó bị giết).

## N-47 · Bộ đo đột biến để lại một đột biến trong cây làm việc khi lượt ghi hoàn nguyên hỏng

- **nhóm:** cong
- **mở:** 2026-09-08 · lane `claude-ext-n05`
- **vùng:** `_code`
- **vì sao:** Gặp thật hôm nay. Bộ đo đột biến ghi bản vá vào `scripts/claim.mjs` rồi hoàn
  nguyên trong `finally`. Một lượt ghi trả `UNKNOWN` (`errno -4094`, khoá file thoáng qua trên
  Windows) — và lượt ghi trong `finally` **hỏng y hệt**, nên một đột biến **nằm lại** trong cây
  làm việc. Suite đỏ sau đó vì một lý do không ai đoán ra: `phai neu ten nguoi dang giu file
  ben trong`. Mất vài phút mới lần ra, và nếu lượt sau là một lượt commit thì đột biến đó đi
  thẳng vào HEAD.
- **hoàn nguyên phải được KIỂM, không chỉ được THỬ:** ghi rồi đọc lại, không khớp thì thử lại
  và hét to. Đã vá trong bộ đo dùng hôm nay, nhưng đó là file nháp ngoài repo — hai bộ đo
  **trong** repo (`workers/hnx-fetch/v0.1.0/scripts/mutation-check.mjs` và
  `dot-bien-doc-lap-quyen.mjs` ở thư mục chạy đêm) chưa có chốt này.
- **họ hàng với một bệnh đã biết:** cùng họ với *neo không khớp thì báo SKIP* — bộ đo tự nói
  dối về chính nó. Loại đó không phép ghim nào bắt được, vì nó ở tầng công cụ đo.
- **đóng khi:** lệnh: `grep -c "readFileSync" <mỗi bộ đo đột biến>` cho thấy mỗi bộ đều đọc lại
  sau khi hoàn nguyên, và có một phép ghim dựng ca ghi-hỏng rồi kiểm bộ đo có hét không.

- **ĐÓNG N-33** · 2026-09-08 · lane `claude-ext-n33` · Chữa ở **gốc**, không chữa ở triệu chứng. Điều kiện đóng cho hai đường (đọc một lần rồi dùng lại · thử lại có giới hạn); đường thứ ba **rẻ hơn cả hai và đúng hơn**: `fs.writeFileSync` **không nguyên tử** — nó cắt file về 0 byte rồi ghi lại, nên có một khe vài chục micro-giây mà người đọc thấy file rỗng. Bảng quyền bị ghi **63 lượt một ngày** (đo 02/09), nên khe đó gặp được thật. Nay mọi lượt ghi đi qua `ghiBangNguyenTu`: ghi ra file tạm **cùng thư mục** rồi `rename` — cùng thư mục là cùng phân vùng, và `rename` cùng phân vùng là nguyên tử, nên người đọc thấy **hoặc bản cũ hoặc bản mới**, không bao giờ thấy nửa chừng. Kèm một lớp đọc thử lại (3 lượt, nghỉ 15 ms) làm dây bảo hiểm cho bản ghi của công cụ khác và của lượt sửa tay. **Thử lại KHÔNG nới lỏng gì**: một bảng hỏng thật thì hỏng ổn định, nên ba lượt ra cùng một lỗi và lỗi ấy vẫn được ném — có phép ghim riêng cho vế đó, và một đột biến (`M9`) dựng đúng ca *"thử lại nuốt cả một bảng hỏng thật"* đã bị giết. Ghim: `claim-smoke` 25 → 28. **Đột biến kiểm 9/9 ĐỎ**, neo khớp 9/9. **Chỗ CHƯA chữa:** triệu chứng thứ ba của mục này (`git show HEAD:… does not exist`) là git chạy đồng thời trên một cây làm việc, gốc khác hẳn — nó không nằm trong lượt này.

## N-48 · Khoá mức file bị cổng kéo ngược về khoá vùng ở lượt đẩy

- **nhóm:** song-song
- **mở:** 2026-09-08 · lane `claude-ext-n33`
- **vùng:** `_code`
- **gặp thật ngay lượt đầu dùng cơ chế mới (08/09):** làm cả phiên bằng khoá file, trả hết
  đúng luật, rồi cổng đóng phiên ĐỎ — *"Vùng gốc repo bị sửa nhưng chưa ai đứng tên: `_code`"*.
  Phải nhận lại khoá vùng chỉ để đẩy, tức **đi ngược đúng thứ ADR-0025 vừa bỏ**.
- **vì sao nó va nhau:** phép kiểm *Phạm vi trách nhiệm* hỏi *"vùng của commit CHƯA ĐẨY có ai
  đứng tên không"*. Khoá vùng trả **sau khi đẩy**, nên nó khớp. Khoá file trả **ngay sau khi
  ghi**, nên tới lúc cổng chạy thì không còn gì đứng tên — và đó là **đúng thiết kế**, không
  phải lỗi của ai.
- **chỗ đáng nghĩ, và là lý do KHÔNG vá vội:** nguồn gốc một commit hôm nay do **nhãn `Lane:`**
  mang, không do khoá. Phép kiểm này đã biết điều đó một nửa — nó *trừ đi file chỉ bị chạm bởi
  commit mang nhãn của lane KHÁC*. Cho nó trừ nốt commit mang nhãn của CHÍNH BẠN thì va chạm
  biến mất, **nhưng lúc ấy nó chỉ còn bắt commit KHÔNG NHÃN** — mà phép kiểm *Nhãn lane trong
  commit* đã bắt đúng cái đó rồi. Tức lối vá hiển nhiên nhất biến nó thành **phép kiểm thứ hai
  cho cùng một điều**, và luật mục 3 giới hạn ⑦ nói thẳng: một luật vào thì một luật ra.
- **ba đường, chưa chọn:** ⑴ trừ nốt nhãn của chính mình rồi **xoá** phép kiểm nếu nó thành
  trùng · ⑵ cho khoá file được **giữ tới lúc đẩy** khi commit chưa đẩy còn chạm file đó (mất vế
  "vài phút" của Đức) · ⑶ giữ nguyên và coi "nhận khoá vùng lúc đẩy" là một bước của quy trình
  đẩy (rẻ, nhưng hai lane cùng muốn đẩy thì lại xếp hàng — đúng cái vừa gỡ).
- **đây là sửa cơ chế đa phiên**, nên `MULTIFLOW.md` mục 5 bắt buộc đột biến kiểm, và nền của
  repo thử phải XANH trước khi so.
- **đóng khi:** đức: chốt một trong ba đường trên — hoặc lệnh: một phiên làm trọn vòng chỉ bằng
  `--sua`/`--xong`, không nhận khoá vùng nào, mà cổng đóng phiên vẫn XANH và `safe-push` vẫn đi.

- **ĐÓNG N-47** · 2026-09-08 · lane `claude-ext-n33` · **Tôi ghi mục này SAI, và cái sai đáng giữ lại hơn cái đúng.** Nó khẳng định hai bộ đo đột biến trong repo *"chưa có chốt này"*. Mở ra đọc thì ngược lại — chúng đã chống đúng cái tôi vừa vấp, và chống kỹ hơn: `ghiLi()` thử lại có lùi dần (30/80/200/500/1200 ms) **chỉ với lỗi chớp nhoáng** (`UNKNOWN` · `EBUSY` · `EPERM` · `EACCES`) và ném ngay với mọi lỗi khác · một **nhật ký** giữ nguyên byte gốc dạng base64 nên lượt sau `cuuLuotTruoc()` vớt lại được cả khi tiến trình bị **chém ngang** (`finally` không chạy) · một **khoá file** để hai bộ đo không giẫm nhau · và một **vế nền** bắt phép ghim phải xanh trước khi đo. Cả sáu đường ghi đều đi qua `ghiLi`, kể cả đường khôi phục. **Cái hỏng là bộ đo NHÁP của tôi, dựng ngoài repo cho nhanh** — nó có `finally` mà không kiểm lượt ghi hoàn nguyên có tới nơi không. Bài học không phải *"đi vá bộ đo"*, mà là: **repo đã có bộ đo tử tế, đừng dựng bộ nháp**. Kiểm lại: `grep -n "ghiLi(" workers/hnx-fetch/v0.1.0/scripts/mutation-runner.mjs` ra 6 chỗ. Ba bộ đo còn lại nằm trong `workers/duc-auto-chatgpt/v0.1.0/evidence-workspace-seats-20260903/` — **thư mục bằng chứng, mục 4 cấm sửa**, và không đụng tới.

- **ĐỔI CÁCH LÀM** · 2026-09-08 · lane `claude-ext-n33` · Từ nay cần đột biến kiểm thì **dùng `mutation-runner.mjs` của gói**, đừng dựng bộ nháp trong thư mục tạm. Lý do đo được hôm nay: bộ nháp thiếu ba chốt mà bộ thật đã có, và một trong ba chốt vắng mặt đã **để lại một đột biến trong cây làm việc** — nếu lượt kế là commit thì nó vào thẳng HEAD. Cố ý **không** thêm luật vào `AGENTS.md` cho việc này: mục 3 giới hạn ⑦ bắt một luật vào thì một luật ra, và một dòng ở đây rẻ hơn một dòng ở hiến pháp.

- **VÁ NGAY LƯỢT ĐẦU DÙNG THẬT** · 2026-09-08 · lane `claude-ext-n33` · `--soat` **báo oan** ba artifact máy sinh (`DASHBOARD.md` · `DASHBOARD-*.html` · `FEATURE-PARITY-AUTO.md`) — nó chỉ biết danh sách `append_only_exempt`, không biết khối `generated`, mà luật mục 1 khai rõ **năm artifact máy sinh không đòi khoá nào**. Bắt được vì tôi dùng chính nó để đóng phiên, không phải vì đọc lại code. Nay nó bỏ qua **hẳn** nhóm đó — không phải sổ nên cũng không soi append-only, vì bộ sinh viết lại cả file mỗi lượt và đó là hành vi đúng của nó. Ghim thêm một ca. **Một cỗ máy dựng ra để chống chặn oan mà tự chặn oan thì nó bị bỏ qua trong một ngày.**
- **N-40 · nổ LẦN NỮA 2026-09-08, live** (ghi bởi lane `claude-gpt-no-ky-thuat`; **mục vẫn MỞ**, dòng này chỉ thêm bằng chứng, không đóng gì) · Lượt commit **đầu tiên** của phiên tôi bị lane `claude-scouter-s06` cuốn vào commit **`bc77cd8e`** của họ. Trình tự đo được: tôi `git add workers/duc-auto-chatgpt/v0.1.0/BACKLOG.md` → chạy `claim.mjs --soat`, nó trả *"1 file đã dàn, tất cả đều thuộc quyền ghi"* và cho phép commit → lượt `git commit` của tôi trả mã **1** kèm *"no changes added to commit"*, vì trong khoảng giữa hai lệnh, commit của lane kia đã **mang file đã dàn của tôi đi**. Nội dung không mất (8 dòng của tôi có đủ trong `bc77cd8e`), nhưng nhãn `Lane:` của commit chứa việc của tôi là **của lane khác** — tức đúng cái mà nhãn `Lane:` sinh ra để chặn. **Không sửa lịch sử** (luật mục 2 bắt hỏi Đức). Ba chi tiết đáng giá cho ai đi vá mục này: ⑴ `--soat` **không đủ**, và không phải vì nó sai — nó đo đúng ở thời điểm nó chạy, rồi cửa sổ giữa `--soat` và `git commit` mới là chỗ hở, nên bản vá phải nằm **trong** lượt commit (hook) chứ không nằm **trước** nó; ⑵ triệu chứng lộ ra là **`git commit` trả mã 1 với "no changes added"**, thứ rất dễ đọc thành "tôi quên dàn file" — nên ai gặp thì kiểm `git log` của file đó trước khi dàn lại; ⑶ chuyện này xảy ra **đúng lúc** tôi đóng `B-12` của gói ChatGPT với lý do "việc này nay là `N-05`/`N-40` ở gốc" — nên `N-40` không phải nợ lý thuyết, và trần đo cũ (07/09, commit `27a88ce7`) nay có thêm một lần nữa. **đóng khi:** giữ nguyên điều kiện đã khai ở mục `N-40`.

- **SỬA HỒ SƠ — TÔI ĐÓNG `N-40` SỚM** · 2026-09-08 · lane `claude-ext-n33` · Dòng `- **ĐÓNG N-40**` tôi ghi vài giờ trước **vẫn đứng** (sổ này chỉ thêm dòng, không sửa dòng cũ), nhưng nó **đóng thiếu**, và tôi ghi ra đây thay vì để nó im. Tôi đóng dựa trên chữ của điều kiện — *"có một chốt khiến `git add` của lane này không bị lane kia commit hộ"* — và cho rằng `--soat` là chốt đó. Lane `claude-gpt-no-ky-thuat` chứng minh ngược lại **cùng ngày, live**: `--soat` trả *"tất cả đều thuộc quyền ghi"*, rồi lượt `git commit` ngay sau đó trả mã 1 *"no changes added"* — vì trong **cửa sổ giữa hai lệnh**, commit của lane thứ ba đã mang file đã dàn của họ đi. `--soat` không sai; nó đo đúng **tại thời điểm nó chạy**. Chỗ hở là khoảng thời gian, và một phép đo đứng TRƯỚC không bao giờ bịt được nó. Nửa còn lại đi tiếp ở `N-49`.

## N-49 · Bản vá N-40 phải nằm TRONG lượt commit, không nằm trước nó — và đó là một cái hook

- **nhóm:** song-song
- **mở:** 2026-09-08 · lane `claude-ext-n33`
- **vùng:** `_root` (cấu hình git) + `_code`
- **vì sao:** `--soat` (đóng `N-40` lượt trước) chặn được ca *"tôi dàn nhầm file của người
  khác"*, nhưng **không** chặn được ca ngược lại: **file của tôi bị lane khác cuốn đi** trong
  cửa sổ giữa `--soat` và `git commit`. Đo được **hai lần**: `27a88ce7` (07/09) và lượt live
  08/09 do lane `claude-gpt-no-ky-thuat` ghi lại ngay trên đây.
- **chỉ có một cơ chế nằm TRONG lượt commit:** một `pre-commit` hook. Không có đường thứ hai —
  mọi thứ khác đều là một lệnh chạy trước, tức lại đẻ ra đúng cửa sổ ấy.
- **VÀ ĐÂY LÀ CHỖ PHẢI HỎI ĐỨC, không phải chỗ tự làm.** Hai lý do, cả hai là luật:
  ⑴ hook nằm ở `.git/hooks`, **không đi theo git**, nên nó chỉ chạy trên máy ai cài — muốn nó
  áp cho mọi lane thì phải trỏ `core.hooksPath` sang một thư mục **được theo dõi**, tức đổi cấu
  hình git của cả repo;
  ⑵ luật gốc của Đức xếp *"tạo automation chạy tự động"* vào nhóm phải hỏi trước. Một hook
  chạy trên chính lượt commit của bạn thì gần ranh giới, nhưng nó **can thiệp vào một lệnh git
  ai cũng gõ hàng chục lần một ngày** — hỏng một chỗ là cả repo không commit được.
- **cái hook đó làm gì, để Đức chốt được bằng một câu:** trước khi commit đi qua, nó chạy đúng
  phép `--soat` đang có, và **từ chối** nếu index chứa file ngoài quyền ghi của lane. Không tự
  sửa gì, không tự bỏ file nào ra — chỉ dừng lại và in ra.
- **cái nó vẫn KHÔNG chữa, nói trước:** hook chạy trong tiến trình commit CỦA BẠN, nên nó không
  ngăn được lane khác `git commit -a` cuốn file của bạn — nó chỉ ngăn **bạn** cuốn của họ. Vế
  kia chỉ hết khi mỗi lane có cây làm việc riêng (`git worktree`), và đó là một quyết định lớn
  hơn hẳn, chưa ai cân.
- **đóng khi:** đức: chốt có cài hook chung hay không (và nếu có thì có đồng ý đổi
  `core.hooksPath` không) — hoặc chốt chấp nhận rủi ro và ghi một dòng lý do.

- **ĐÓNG N-49** · 2026-09-08 · lane `claude-ext-hook` · Đức uỷ quyền chọn. **Chọn: cài hook, và cài `commit-msg` chứ không `pre-commit`.** Lý do chọn `commit-msg`: `--soat` cần biết bạn là lane nào, mà chỗ DUY NHẤT ghi tên lane là nhãn `Lane:` trong thông điệp — chỉ `commit-msg` đọc được nó, và index ở đó vẫn đúng là index sắp commit nên phép đo không mất gì. **Ba chốt FAIL-OPEN, cố ý:** không có `node` → cho qua · không thấy nhãn `Lane:` → cho qua (merge/revert/squash tự sinh thông điệp không nhãn) · `claim.mjs` ném lỗi lạ → cho qua. **Chỉ mã 3 (vi phạm thật) mới chặn.** Hook chạy trên MỌI lượt commit của MỌI lane; một hook hỏng là cả repo không commit được, và cái giá đó lớn hơn cái nó canh. Cửa thoát `--no-verify` để mở — một chốt không thể vượt trong lúc khẩn thì nó sẽ bị gỡ hẳn. **Đã thử THẬT cả hai chiều:** commit hợp lệ đi qua; commit mang `scripts/state-check.mjs` ngoài quyền ghi bị chặn và **không commit nào được tạo**. Ghim ở `tests/check-bootstrap-smoke.mjs` (hook tồn tại · ba chốt fail-open · cổng canh việc hook ĐƯỢC CÀI). **Chỗ nó vẫn KHÔNG chữa, giữ nguyên lời đã hứa:** hook chạy trong tiến trình commit CỦA BẠN nên nó chỉ ngăn **bạn** cuốn của họ; ngăn chiều ngược lại thì mỗi lane phải có cây làm việc riêng, và đó là quyết định lớn hơn hẳn, chưa ai cân.

- **ĐÓNG N-48** · 2026-09-08 · lane `claude-ext-hook` · Đức uỷ quyền chọn. **Chọn đường ⑴ — trừ nốt nhãn của chính mình — và KHÔNG xoá phép kiểm**, vì đo lại thì nó không thành bản sao như tôi đoán lúc mở mục. Phép lọc đổi từ *"của lane KHÁC"* sang *"đã quy thuộc được cho MỘT lane nào đó"*: câu hỏi của phép kiểm là *commit chưa đẩy có ai chịu trách nhiệm không*, và từ 03/09 thứ trả lời câu đó là **nhãn `Lane:`**, không phải khoá. Sau khi nới, **hai đường đỏ còn nguyên và cả hai là mồ côi thật**: ⑴ file đang sửa trong **cây làm việc** (chưa commit nên chưa có nhãn nào) · ⑵ commit chưa đẩy **không nhãn hoặc nhãn hỏng**. Kiểm ngay trong phiên: khi `session-check.mjs` còn sửa dở trên đĩa, phép kiểm ĐỎ đúng đường ⑴; commit xong (có nhãn) thì xanh. Cùng lượt, phép kiểm này **nhận thêm một việc thay vì đẻ ra phép thứ 17**: nó canh `core.hooksPath` đã trỏ vào `.githooks` chưa — cùng một câu hỏi *ai chịu trách nhiệm cho lượt ghi này*, chỉ khác một đằng canh lúc commit, một đằng lúc đóng phiên. **Và chỉ đòi khi repo CÓ hook** — đòi vô điều kiện làm đỏ mọi repo tạm mà kho thử dựng lên, đúng cái bẫy *"cổng nhận thêm một phụ thuộc thì mọi kho thử phải biết"* đã cắn bốn lần ngày 08/09.

- **ĐO LẠI N-45 — MÔ TẢ TÁC HẠI TRONG MỤC ĐÓ SAI, và sự thật vừa nhẹ hơn vừa nặng hơn** · 2026-09-08 · lane `claude-ext-hook` · Mục nói tác hại là *"git coi cả tệp là nhị phân, nên `git diff` chỉ in `Bin … bytes` và mọi thay đổi về sau bị giấu"*. **Kiểm: sai.** Git chỉ coi một file là nhị phân khi thấy **byte NUL** trong 8.000 byte đầu; file này có `0x08` mà **không có NUL** (`node -e` kiểm: `NUL: false | 0x08: true`), và `git diff --numstat` giữa hai commit chạm nó trả **`15  2`** — số dòng thật, không phải dấu `-` của file nhị phân. Nhẹ hơn mô tả.

- **NHƯNG TÁC HẠI THẬT NẶNG HƠN, và mục đó không thấy** · 2026-09-08 · lane `claude-ext-hook` · Byte `0x08` **không nằm trong văn xuôi — nó nằm giữa một biểu thức chính quy**, ở đúng chỗ đáng ra phải là hai ký tự `\` + `b`: `assert.doesNotMatch(quaTai.meaning, /CAPTCHA.*yêu cầu|hết credit<BS>(?!.*KHÔNG)/, …)` (dòng 27, offset 1671). Hệ quả: **vế thứ hai của phép khẳng định CHẾT** — nó tìm một ký tự backspace sau chữ `credit`, thứ không bao giờ có trong văn bản thật. Chứng minh chạy được: với chuỗi mô tả sai *"Flow đang quá tải nên job hết credit và dừng."* thì bản đang chạy trả **`false` (BỎ SÓT)**, còn bản `\b` trả **`true` (bắt đúng)`**. Phép này canh việc **mô tả nhầm "quá tải" thành "hết credit"** — đúng câu Đức đọc lúc một job dừng và cần biết có mất tiền không. **Hôm nay chưa lộ ra** vì văn bản hiện tại có *"KHÔNG phải hết credit"* nên lookahead loại nó; tức phép kiểm đang xanh **vì văn bản đúng, không phải vì phép kiểm còn răng**. Đổi một chữ trong `meaning` là mất chốt mà không ai biết.

- **VIỆC CẦN LÀM cho N-45, gói gọn** · 2026-09-08 · lane `claude-ext-hook` · Một lượt sửa **hai ký tự**: thay byte `0x08` ở offset 1671 của `workers/duc-auto-gg-flow-video/v0.1.0/tests/halt-instructions-core-smoke.mjs` bằng `\b` — **dựng bằng `String.fromCharCode`/`new RegExp`, đừng gõ thẳng**, vì gõ thẳng là cách nó lọt vào lần đầu. Kèm **hai vế nghiệm thu**, thiếu vế hai thì lượt sửa vô nghĩa: ⑴ `node workers/duc-auto-gg-flow-video/v0.1.0/tests/run-all.mjs` xanh; ⑵ **chứng minh phép kiểm sống lại** — tạm đổi `meaning` thành một câu có *"hết credit"* mà KHÔNG có *"KHÔNG"*, xác nhận suite **ĐỎ**, rồi hoàn nguyên. Không có vế ⑵ thì không phân biệt được *"đã vá"* với *"vẫn chết mà xanh"*. **Khoá cần:** `workers/duc-auto-gg-flow-video` — lane `claude-flow-f28-f33` đang giữ, nên **việc này là của họ**, không phải của tôi. Mục `N-45` vẫn MỞ; dòng này chỉ thay mô tả tác hại bằng số đo đúng.

- **ĐO CHO N-36 — GỘP KHOÁ KHÔNG GIẢM LUẬT, VÀ LÀM CHẶN NHIỀU HƠN GẤP ĐÔI** · 2026-09-08 · lane `claude-ext-hook` · Đức hỏi *"nhiều khoá đồng nghĩa nhiều rule và nhiều check hơn phải không"*. Đo: **không**. ⑴ Cổng có **16 phép kiểm**, chỉ **1** phép duyệt qua từng khoá. ⑵ Mục 1 của `AGENTS.md` dài **139 dòng**, trong đó **3 dòng** là bảng liệt kê khoá — 136 dòng còn lại nói về *cơ chế* (nhận/trả, chứa nhau, niêm phong, miễn trừ), không đổi theo số khoá. ⑶ Thời gian: băm bảng 9 khoá so với 3 khoá lệch **0,0158 ms một lượt**, đặt cạnh một vòng suite **123 giây**. **Số khoá là DỮ LIỆU, không phải MÃ.**

- **VÀ CHIỀU NGƯỢC LẠI MỚI ĐẮT** · 2026-09-08 · lane `claude-ext-hook` · Gộp `_root`+`_docs`+`_code` thành một `_infra`: **[ĐO 7 ngày, 208 commit có nhãn chạm khoá gốc thật, đã trừ mọi file miễn khoá]** cặp commit khác lane cách nhau ≤1h — hôm nay chặn nhau **172**, sau khi gộp thành **364**, tức **+192 cặp (+112%)**. Được lại: trong 322 commit chạm khoá gốc chỉ **81 commit** chạm từ hai khoá trở lên, tức tiết kiệm ~81 cặp lệnh nhận/trả trong 7 ngày. **Đổi 81 lệnh lấy 192 lượt chặn là lỗ.** Chỗ đau chưa bao giờ là số khoá — là **thời gian giữ**, và khoá mức file đã gỡ 70% chỗ đó mà không bớt một ô nào.

- **MỘT LỖI ĐO CỦA CHÍNH TÔI, ghi ra vì nó sẽ lặp lại** · 2026-09-08 · lane `claude-ext-hook` · Hai lượt đo đầu cho ra **`0 cặp`** — con số gọn đến mức đáng ngờ, và nó sai. Hai nguyên nhân chồng nhau: ⑴ đếm cả `HANDOFF.md`/`BACKLOG.md`/`.agents/claims.json`, những file **vốn miễn khoá** nên không tạo va chạm nào — chúng làm gần như mọi commit trông như có chạm `_root`; ⑵ gộp `%b` với `--name-only` trong **một** lệnh `git log`, khiến bộ tách lấy nhầm dòng thân thành tên file. Bài học: **một con số quá gọn là một con số phải kiểm lại**, và phép đo va chạm phải trừ file miễn khoá trước — nếu không nó đo *đường dẫn*, không đo *quyền ghi*.

- **ĐÓNG N-36** · 2026-09-08 · lane `claude-ext-hook` · **Đức chốt: bỏ.** Mục đề xuất gộp 9 khoá xuống 3. Bỏ vì hai lý do đo được, không phải vì ngại việc. ⑴ **Tiền đề của nó đã mất:** viết sáng 07/09 khi ba gói `duc-auto-*` đang đóng băng, nên gộp ba gói chết thành một ô `_frozen` là hợp lý; chiều 08/09 Đức **mở băng cả ba** ([ADR-0024]) và ngay lúc đóng mục này **mỗi gói đang có một lane riêng làm việc trong đó** — gộp là ép ba lane xếp hàng sau một khoá. ⑵ **Lợi ích nó hứa không có thật:** giả thuyết *"ít khoá thì ít luật, ít phép kiểm, chạy nhanh hơn"* đã đo và **sai** — 16 phép kiểm chỉ **1** duyệt qua từng khoá; 139 dòng luật mục 1 chỉ **3** dòng là bảng khoá; thời gian lệch **0,0158 ms** trên một vòng suite **123 giây**. Còn cái giá thì thật: gộp ba khoá gốc làm cặp commit khác lane bị chặn **172 → 364 (+112%)**, đổi lại tiết kiệm ~81 cặp lệnh trong 7 ngày. **Chỗ đau chưa bao giờ là số khoá — là thời gian giữ**, và khoá mức file (ADR-0025) đã gỡ 70% chỗ đó mà không bớt một ô nào. Ba dòng đo đầy đủ ở ngay trên.

- **DỌN KHO CHỮ LƯỢT HAI — xoá cả tầng `docs/archive/`** · 2026-09-08 · lane `claude-ext-don` · **[ĐO]** `docs/` **17.838 → 14.938 dòng** (97 → 83 file); không kể ADR **15.265 → 12.335**. Thước cóc đã hạ theo, và chỗ đã hạ không quay lại được. Tầng đó giữ **15 hồ sơ, 2.967 dòng, tất cả `status: superseded`**. Lý lẽ giữ chúng ghi ngay trong `docs/README.md` là *"chúng là bản ghi có thật"* — **vẫn đúng, nhưng git ĐÃ là chỗ giữ bản ghi có thật**, nên một thư mục thứ hai chỉ cộng vào con số mà mọi phiên phải đọc. Đường lấy lại in ở đúng chỗ đầu mục cũ: `git show a3b67a96a92e:docs/archive/<tên-file>`. Ba chỗ chỉ đường tới thư mục đã mất cũng được sửa (`docs/README.md` · `AGENTS.md` mục 6 · `delegations/A-01/TASK.md` — chỗ này bảo một AI khác đi đọc một file không còn, tức một lượt giao việc hỏng nếu để nguyên). **Còn 12.335 so với đích 8.000 của giới hạn ③.**

## N-50 · Bộ sinh đối chiếu đọc CÂY LÀM VIỆC ở lượt ghi, nên một lane bị giam vì việc chưa commit của lane khác

- **nhóm:** song-song
- **mở:** 2026-09-08 · lane `claude-ext-don` · **và đóng ngay cùng lượt** (xem dòng dưới)
- **vùng:** `_code`
- **gặp thật, live:** tôi bị **từ chối đẩy** với `feature-parity.mjs không khớp với HEAD`. Nguyên
  nhân: lane khác có `workers/duc-auto-chatgpt/v0.1.0/sidepanel.js` **chưa commit** trên đĩa
  (6.652 dòng) trong khi HEAD là 6.569. Bộ sinh đọc **đĩa** nên ghi 6.652; cổng xuất bản so với
  **HEAD** nên từ chối. **Không có đường ra**: chạy lại bộ sinh bao nhiêu lượt cũng ra con số của
  đĩa, nên commit của tôi bị giam **cho tới khi lane khác commit xong**.
- **chính file đó tự khai điều nó vi phạm:** *"Cùng một HEAD phải luôn cho cùng một byte"*, và
  ghi rõ bài học của `N-21` — một artifact phụ thuộc thứ ngoài HEAD thì *"MỌI lane bị chặn đẩy dù
  không dữ liệu nào đổi"*. Nó có sẵn `createHeadDeps()` nhưng chỉ dùng cho `--check-head`.
- **đóng khi:** lệnh: `node scripts/feature-parity.mjs` cho ra cùng một byte bất kể cây làm việc
  bẩn hay sạch, và có một phép ghim chặn việc quay lại đọc đĩa ở lượt ghi.

- **ĐÓNG N-50** · 2026-09-08 · lane `claude-ext-don` · **Đọc HEAD để tính, ghi ra đĩa để lưu** — hai việc khác nhau, trước nay bị buộc chung vào một bộ `deps`. `createHeadDeps()` cố tình ném khi bị gọi `writeFile`, nên phải ghép tay: `{ readFile: doc.readFile, listFiles: doc.listFiles, writeFile: ghi.writeFile }`. **[ĐO]** trước: artifact ghi `6653` (số của đĩa) → cổng từ chối; sau: ghi `6570` (số của HEAD) → khớp. Ghim ở `tests/feature-parity-smoke.mjs` (19 → 20), có cả vế **chặn quay lại lối cũ**. **Chỗ chưa soi:** `build-dashboard.mjs` và `build-overview.mjs` đều đã có `createHeadDeps` — nhưng tôi chưa kiểm chúng dùng nó ở lượt GHI hay chỉ ở lượt kiểm. Cùng một bệnh có thể còn ở đó.

- **DỌN KHO CHỮ LƯỢT BA — 18 hồ sơ mồ côi** · 2026-09-08 · lane `claude-ext-don2` · **[ĐO]** `docs/` **14.938 → 12.396 dòng** (83 → 65 file). Cả ngày: **26.104 → 12.396, giảm 52%**. Tiêu chí cắt: *không gì trong repo trỏ tới nó ngoài chính mục lục* — brief của việc đã ship, kế hoạch đã thi hành xong, bản đồ đã bị `llms.txt`/`DASHBOARD.md` thay.

- **PHÉP DÒ CỦA TÔI SAI MỘT LẦN, và nó suýt xoá nhầm 7 hồ sơ** · 2026-09-08 · lane `claude-ext-don2` · Bản đầu dò tên **kèm đuôi `.md`**, mà `AGENTS.md` và các sổ tay nhắc tên brief **không có đuôi** (`BRIEF-BANG-BA-CUA-01`, không phải `…-01.md`). Kết quả: nó báo **26 file / 5.020 dòng** mồ côi; đo lại bỏ đuôi ra thì chỉ còn **19 file / 3.817 dòng**. Bảy hồ sơ đang được luật và sổ tay trỏ tới suýt bị coi là rác. Bài học: **dò theo tên thì phải dò cả dạng người ta thật sự viết**, và một danh sách xoá luôn phải kiểm lại bằng một phép dò thứ hai khác cách.

- **GIỮ LẠI `PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md` (1.279 dòng) dù nó mồ côi** · 2026-09-08 · lane `claude-ext-don2` · Nó là **thứ duy nhất còn lại** của 8.310 dòng hồ sơ `EXP-*` xoá sáng nay, và chính lượt xoá đó lấy nó làm lý do (*"kết luận của cả loạt đã được gộp vào đây"*). Xoá nó một lượt sau là làm rỗng chính lời biện minh vừa viết.

## N-51 · Đích 8.000 dòng của giới hạn ③ nằm DƯỚI sàn cứng của `docs/`

- **nhóm:** cong
- **mở:** 2026-09-08 · lane `claude-ext-don2`
- **vùng:** `_root` (giới hạn ③ nằm trong `AGENTS.md`)
- **[ĐO 08/09] sàn cứng — phần KHÔNG cắt được mà không làm gãy một trích dẫn:**

| Phần | Dòng | Vì sao không cắt được |
|---|---|---|
| `docs/adr/` | 2.603 | ADR đã `Accepted` là **bất biến**, B12 cưỡng chế |
| Hồ sơ bị **ADR / `evidence/`** trích dẫn | 4.863 | Nguồn trích **không sửa được**: ADR bất biến, `evidence/` chỉ-thêm |
| `docs/protocols/` | 1.045 | Sổ tay đang dùng |
| Hồ sơ bị `AGENTS.md` / sổ tay trỏ tới | 687 | Là mục điều hướng sống |
| `README` + bản mẫu | 380 | Mục lục và khuôn |
| **SÀN** | **9.578** | |

- **tức đích 8.000 thấp hơn sàn 1.578 dòng.** Đạt được nó chỉ bằng hai đường: **rút gọn văn**
  trong các hồ sơ đang bị trích (viết lại phân tích của người khác — đắt và dễ làm sai), hoặc
  **làm gãy trích dẫn từ ADR bất biến** (luật cấm).
- **hiện tại 12.396**, tức còn ~2.800 dòng nữa cắt được **mà không chạm sàn** — đó là nhóm chỉ
  bị file **sửa được** trỏ tới. Nhưng vài hồ sơ trong nhóm đó **đang được dùng thật**: sổ tay
  `ORCHESTRATOR.md` bảo *"chép nó, đừng viết lại từ đầu"* về một brief, và `IDEAS.md` khai một
  brief là **nhà** của một ý tưởng. Xoá chúng là làm hỏng thứ đang chạy, không phải dọn rác.
- **đóng khi:** đức: chốt con số của giới hạn ③ theo sàn đo được (đề nghị: **9.600**, kèm một
  dòng lý do trong `AGENTS.md`) — hoặc chốt rằng repo sẽ rút gọn văn để về 8.000 và giao việc đó.

- **ĐO LẠI CHO N-51 — trần 8.000 đang đo SAI THỨ, và đây là số** · 2026-09-09 · lane `claude-ext-don2` · Đức từ chối nâng trần (*"nâng trần tôi sợ làm AI khó triển khai công việc, ta cần tìm cách optimize"*) — đúng, và đo lại thì **con số đó không đo thứ làm AI chậm**. `docs/` là **12.396 dòng / 65 file**, nhưng một phiên chỉ mở **1–3 file** trong đó theo việc. Thứ **mọi phiên bắt buộc nạp**, dù muốn hay không, là: `AGENTS.md` **402 dòng** + `CLAUDE.md` 7 + phần cuối `HANDOFF.md` (**2.001 dòng**, 60 mục). Cắt `docs/` từ 26.104 xuống 12.396 **không giảm một dòng nào** của cái phải nạp. Đây đúng bài học *"đo đúng cái người ta than, đừng đo cái dễ đếm"*.

## N-52 · `AGENTS.md` phình 45% trong hai ngày, và chính giới hạn ⑦ của nó cấm điều đó

- **nhóm:** cong
- **mở:** 2026-09-09 · lane `claude-ext-don2`
- **vùng:** `_root`
- **[ĐO]** `git show <sha 07/09>:AGENTS.md | wc -l` = **278** · `wc -l AGENTS.md` = **402**.
  Tăng **+124 dòng (+45%)**, và **phần lớn là do chính tôi viết trong ngày 08/09** (khối khoá
  mức file, khối hook, ba lượt viết lại giới hạn ①③④).
- **giới hạn ⑦ của chính file đó nói:** *"Một luật vào thì một luật ra… Mục này đổi lấy chín
  dòng sổ tay… `wc -l AGENTS.md`: 296 → 291"*. Tôi thêm luật mà **không lấy luật nào ra**, và
  con số trong chính dòng đó nay sai gấp rưỡi.
- **vì sao nó đắt hơn `docs/`:** file này **mọi AI nạp mọi phiên**, trước cả khi biết mình
  sắp làm gì. Một dòng ở đây tốn hơn một trăm dòng trong `docs/studies/`.
- **chỗ cắt được, đã soi:** ba khối tôi thêm hôm qua đều có **ADR đầy đủ** kèm theo
  ([ADR-0025] khoá mức file · `N-49` hook · [ADR-0024] mở băng). Hiến pháp chỉ cần **câu lệnh
  và một dòng vì sao**; phần *đo được bao nhiêu, vấp ở đâu, cân những gì* thuộc về ADR — và
  mục 6 vốn đã có cột "mở sổ tay nào" để trỏ sang.
- **đóng khi:** lệnh: `wc -l AGENTS.md` ≤ **300**, và có một phép kiểm ĐỎ khi nó vượt — cùng
  kiểu thước cóc như `docs.tran_dong_khong_ke_adr` (B9 hiện chỉ cảnh báo VÀNG ở mốc 200, tức
  nó đã kêu suốt và không ai nghe; thay bằng thước cóc đặt ở con số HÔM NAY thì nó chỉ chặn
  PHÌNH, và đó là thứ người ta chịu nghe).

## N-53 · `HANDOFF.md` giữ 60 mục trong khi ADR-0008 bắt giữ 20 — không gì cưỡng chế

- **nhóm:** cong
- **mở:** 2026-09-09 · lane `claude-ext-don2`
- **vùng:** `_root` + `_code`
- **[ĐO]** `grep -c '^## ' HANDOFF.md` = **60 mục / 2.001 dòng**. ADR-0008 chốt **20 lượt**.
  Vượt **gấp ba**, và **không phép kiểm nào kêu** — đúng hình dạng *luật không máy nào canh*
  mà mục 7 của `AGENTS.md` cảnh báo, và là lần thứ ba trong repo này (trước đó: trần sổ nợ
  vỡ ở mục 11, và cờ đóng băng khai mà không cổng nào đọc).
- **công cụ hiện có KHÔNG làm được việc này:** `handoff.mjs --rotate` xoay theo **THÁNG**
  (ADR-0011), mà cả 60 mục đều là `2026-09` — nên nó dời **0 dòng**. Hai ADR, hai cơ chế
  khác nhau, và cái của ADR-0008 chưa bao giờ được cài.
- **cái giá:** 2.001 dòng này nằm trong nhóm **mọi phiên phải đọc** (phần cuối, nhưng phiên
  nào cũng cuộn ngược để hiểu bối cảnh). Cắt còn 20 mục là giảm khoảng **1.400 dòng** khỏi
  đúng chỗ đắt nhất — nhiều hơn cả lượt xoá 18 hồ sơ mồ côi, mà rủi ro thấp hơn hẳn.
- **đóng khi:** lệnh: `handoff.mjs` có đường cắt theo SỐ MỤC (không chỉ theo tháng), `HANDOFF.md`
  gốc còn ≤ 20 mục, phần cũ nguyên văn trong `HANDOFF-ARCHIVE-*.md`, và có phép ghim đối chứng
  **ghép lại dựng được bản gốc giống hệt từng byte** (bất biến ⑴ của ADR-0008).

- **ĐỨC CHO PHÉP MỞ KHOÁ `workers/duc-auto-gg-flow-video`, NHƯNG CHƯA LÀM** · 2026-09-09 · nguyên văn: *"tôi cho phép mở khóa gg flow, nhưng chưa triển khai, vì đang triển khai GPT extension"*. Ghi lại để phiên sau khỏi hỏi lại, và ghi rõ **hai vế**: ⑴ khoá đó **được phép chuyển** (lane `claude-flow-f28-f33` giữ 33h) — dùng `--restamp --duc-duyet` kèm chính câu trên; ⑵ **chưa nhận khoá lúc này**, vì nhận rồi ngồi lên nó là đúng thói quen mà khoá mức file vừa bỏ (ADR-0025: nhận NGAY TRƯỚC lượt ghi). Việc `N-45` chờ tới khi gói GPT xong.

- **ĐÓNG N-53** · 2026-09-09 · lane `claude-ext-nap-gon` · `HANDOFF.md` gốc **2.033 → 589 dòng** (60 mục → 20), 40 mục cũ sang `HANDOFF-ARCHIVE-02.md` **nguyên văn**. Ba vế nghiệm thu: ⑴ **ghép lại dựng đúng bản gốc từng byte** — SHA-256 `321bad9941eb42572b2f06bd4ebfa542f7371550e2dbbbfc571f9ae51430d7ad`, đo hai lần bằng hai đường khác nhau (bên trong lệnh, và một phép dựng lại độc lập đọc hai file trên đĩa); ⑵ đường cắt theo **SỐ MỤC** (`handoff.mjs --cat --giu`), tách hẳn khỏi `--rotate` xoay theo **THÁNG** — cả 60 mục đều `2026-09` nên `--rotate` dời 0 dòng, đó là lý do cơ chế ADR-0008 chưa bao giờ chạy; ⑶ cổng đóng phiên nay ĐẾM THẬT (`HANDOFF_QUA_DAY`, trần khai ở `handoff.tran_so_muc`) — chứng minh không rỗng ruột bằng cách hạ tạm trần xuống 5 và xem nó gọi đúng tên hai quyển. Phép ghim: `tests/handoff-smoke.mjs` khối (11), **4/4 đột biến bị bắt**. Một con bug thật bị chính phép ghim đó chặn lại trong lúc dựng: bản đầu của `catTheoSo` trả `moi = dau + conTro` (quên `thanMoi`) — file ra rỗng sạch mục, mà phép kiểm bất biến bản đầu vẫn XANH vì nó ghép từ các mảnh rời chứ không từ chuỗi sắp ghi ra đĩa. **Kiểm cái mình GHI, đừng kiểm cái mình định ghi.**

- **ĐÓNG N-52** · 2026-09-09 · lane `claude-ext-nap-gon` · `AGENTS.md` **402 → 300 dòng (−25%)**, và nay có máy canh: `agents.tran_dong` trong `.repo-structure.json`, gộp vào phép kiểm *"Kho chữ không phình"* của cổng đóng phiên (không đẻ phép kiểm thứ 17 — đẻ thêm là đẻ thêm một lượt sửa `EXPECTED_CHECKS` và một cái bẫy fixture, cùng cái bẫy đã cắn năm lần trong hai ngày). Chứng minh không rỗng ruột: hạ tạm thước xuống 250, cổng ĐỎ đúng câu `HIEN_PHAP_PHINH`. Chỗ cắt: khối *Khoá mức FILE* **125 → 27 dòng** (nhà của nó là ADR-0025), mục 3 **49 → 30**, mục 5 **50 → 33**, mục 0b và mục 2 rút gọn. **Không luật nào bị bỏ** — thứ bị cắt là *đo được bao nhiêu, vấp ngày nào, cân những gì*, và mỗi thứ đó đều đã có nhà: ADR được nhắc tên, hoặc `docs/protocols/MULTIFLOW.md` mục 4 (sáu bất biến kèm lý do từng cái). Cuối mục 1 để lại đúng một dòng trỏ sang. **B9 giữ nguyên, cố ý:** nó cảnh báo VÀNG ở mốc 200 cho **cả ba `AGENTS.md` của worker** — thước cóc mới chỉ canh file gốc, nên gỡ B9 là mất phần phủ đó.

- **N-51 — ĐO LẠI SAU ⓐ⓫: nhóm luôn-nạp giảm 51%, và đây là con số để Đức chốt** · 2026-09-09 · lane `claude-ext-nap-gon` · **[ĐO]** thứ **mọi phiên bắt buộc nạp** trước cả khi biết mình sắp làm gì: gốc repo `CLAUDE.md` 7 + `AGENTS.md` **300** + `HANDOFF.md` **589** = **896 dòng** (sáng nay là 2.410). Cộng thêm sổ tay + nhật ký của gói đang làm: `hnx-fetch` 546 · `chatgpt` 690 · `flow-video` 740 · `scouter` 886 · `gemini` 905. **Một phiên nạp 1.442–1.801 dòng**, xuống từ 2.956–3.315 — **giảm 51%**. Đối chiếu: `docs/` là **12.331 dòng / 65 file** nhưng một phiên chỉ mở **1–3 file** theo việc, và sàn cứng của nó là **9.578** nên đích 8.000 của giới hạn ③ nằm **dưới sàn 1.578 dòng** — một đích không đạt được thì bị bỏ qua. **Đề nghị Đức chốt:** đổi giới hạn ③ từ *"`docs/` ≤ 8.000"* sang *"nhóm luôn-nạp ≤ 1.500 dòng"* (gốc repo + MỘT gói), giữ thước cóc `docs.tran_dong_khong_ke_adr` làm chặn phụ. Máy canh đã có sẵn cả ba mảnh: `agents.tran_dong` (mới hôm nay), `handoff.tran_so_muc`, `docs.tran_dong_khong_ke_adr`. **đóng khi:** Đức chốt con số, và giới hạn ③ của `AGENTS.md` được viết lại theo đúng câu chốt đó.

- **ĐÓNG N-51** · Đức chốt đổi CÁCH ĐO, không đổi con số · 2026-09-09 · lane `claude-ext-luat` · Đức bác cả hướng đi ban đầu: *"tôi thiên về phương án mới: rà soát thủ công và eliminate các decision, luật trùng nhau… khi add rules, ta cần categorize nó và xếp nó đúng chỗ, hợp lý chứ ko ghi kiểu cứ thêm dần thêm dần -> phình vô hạn"*. Nên thay vì đề nghị một con số mới cho giới hạn ③, việc đã làm là **viết lại `AGENTS.md` thành bản đăng ký luật**: tiếng Anh, phân 9 nhóm, chỉ giữ **trạng thái cuối**, mỗi luật một dòng kèm ADR làm căn cứ. **[ĐO]** 300 → **254 dòng**, 30.520 → 20.6xx ký tự, phi-ASCII **16% → 1%** — tiếng Việt có dấu tách token nặng gấp ~2 lần tiếng Anh, mà đây là file mọi phiên đều nạp. Thước cóc `agents.tran_dong` hạ theo. **Phép kiểm chống mất luật, chạy được:** rút mọi thứ máy tra được (đường dẫn · lệnh · khoá cấu hình · số ADR · mã B) từ bản cũ và bản mới rồi so — lượt đầu báo **17 thứ rơi mất**, trong đó có thật ba nhóm: lệnh khoá VÙNG (`--list` `--take` `--release`), lệnh `--rotate`, và sáu ADR đang là căn cứ cho chính luật tôi vừa viết. Vá xong đo lại còn **0**.

## N-54 · Gộp 26 ADR theo CHỦ ĐỀ, không theo thứ tự thời gian

- **nhóm:** cong
- **mở:** 2026-09-09 · lane `claude-ext-luat`
- **vùng:** `_docs`
- **vì sao:** Đức chốt 09/09 — *"ADR đã accepted vẫn có thể sửa, phân nhóm, gộp, viết lại để có kiến trúc tốt hơn, AI đọc dễ hơn… nên được làm điều này hàng tuần"* ([ADR-0026]). Lượt này mới làm phần **gỡ mâu thuẫn** (5 chỗ) và **đổi máy canh** (B12 nay bắt mất quyết định). Phần **gộp** chưa làm.
- **[ĐO]** 27 ADR ở gốc repo, 2.676 dòng, xếp theo thứ tự thời gian. Chia theo chủ đề thì gom được về **~8 file**: khoá & song song (0018 0019 0023 0025) · nhật ký phiên (0008 0011 0012) · đẩy & duyệt (0005) · ranh giới bộ khung (0001 0002 0003 0006) · vai (0004 0017) · Scouter (0007 0009 0010 0013 0016 0020) · gói extension (0015 0021 0022 0024) · sổ & artifact (0000 0014 0026).
- **cái được:** một chủ đề một file nghĩa là **một câu trả lời**. Hôm nay muốn biết luật khoá thì phải đọc bốn file rồi tự đoán cái nào thắng — đúng chỗ đã sinh ra con nhầm 09/09.
- **bẫy:** gộp là **XOÁ file**, và `trackedPaths` không kể file đã xoá. B12 nay soi cả `pathsEver()` nên nó bắt được; **đừng gỡ vế đó**.
- **đóng khi:** lệnh: `ls docs/adr/*.md | wc -l` ≤ **10**, mỗi file gộp khai đủ `decides: [...]`, `node scripts/check-bootstrap.mjs` XANH ở B12 (0 chỗ mất, 0 chỗ trùng), và không số hiệu nào phải khai vào `adr.moved_out`.

- **ĐÓNG N-54** · 2026-09-09 · lane `claude-adr-gop` · **27 ADR gốc → 9 file chủ đề.** Một chủ đề = một file = một câu trả lời. Trước đó là 27 file xếp theo thứ tự thời gian, và không chỗ nào nói cái nào đang có hiệu lực — chính hình dạng đó đẻ ra năm chỗ mâu thuẫn. Nhóm: `0000` cách ghi quyết định · `0001` ranh giới bộ khung · `0004` mấy phiên Assistant · `0005` khoá/quyền/đẩy · `0007` Scouter · `0008` nhật ký phiên · `0014` bảng đối chiếu · `0015` trần đường thử · `0021` các gói extension. **Nghiệm thu:** B12 XANH — *151 số hiệu từng cấp, 0 mất, 0 trùng*, mỗi file khai trường `decides`. **Bảy vế chết bị cắt còn MỘT DÒNG mỗi vế** kèm tên quyết định thay nó, không kể lại. **81 liên kết trong 30 file đã vá**; cố ý KHÔNG chạm kho lưu trữ và `evidence/` (chỉ đọc — chúng kể chuyện quá khứ, lúc đó tên file đúng là tên đó) và ba gói `duc-auto-*` (lane khác giữ khoá; đo trước: chúng chỉ trỏ tới `0000` và `0015`, nên hai tên đó **cố ý giữ nguyên**). Mục lục cũ→mới ở `docs/README.md`. **Một chỗ KHÔNG tự hoà giải:** ADR-0004 chia vai *Hệ thống/Sản phẩm* còn `AGENTS.md` mục 6 chạy cặp *Giữ lõi/Phát & thu* — hai cách chia khác nhau, lần đổi 08/09 không có quyết định nào ghi lại; ghi cả hai kèm cảnh báo, **chờ Đức chốt**.

- **NGÔN NGỮ LUẬT: Đức đảo lại trong ngày, vế cuối là TIẾNG VIỆT** · 2026-09-09 · lane `claude-adr-gop` · sáng 09/09 Đức chốt *"dùng tiếng Anh để AI dễ đọc, tiết kiệm usage"*, và `AGENTS.md` được viết lại bằng tiếng Anh (402 → 254 dòng, phi-ASCII 16% → 1%). Chiều cùng ngày Đức đảo: *"giữ luật bằng tiếng việt để tôi cùng đọc bản cuối"*. **Vế tiếng Anh đã chết**, ghi ở ADR-0000 vế ⑷. Lý do nặng hơn tiền token: **một bộ luật Đức không đọc được là một bộ luật Đức không kiểm được**, mà Đức là người chốt duy nhất. **Phần tiết kiệm còn giữ nguyên là phần CẮT NGẮN và PHÂN NHÓM** — nó không phụ thuộc ngôn ngữ: `AGENTS.md` nay **252 dòng / 19.331 ký tự**, xuống từ 402 dòng / 30.520 ký tự sáng nay (**−37%**). Bài học ghi lại để phiên sau khỏi làm hai lần: **hỏi ai sẽ ĐỌC một tài liệu trước khi tối ưu nó cho ai sẽ NẠP nó.**

## N-55 · Tám quyết định của `duc-auto-gg-flow-video` chưa bao giờ có số hiệu

- **nhóm:** cong
- **mở:** 2026-09-09 · lane `claude-luat-rasoat`
- **vùng:** `workers/duc-auto-gg-flow-video` — **đang có lane khác giữ khoá**
- **[ĐO]** `decisions.md` của gói đó: **142 dòng · 0 liên kết tới ADR nào · 9 câu luật**. Hai gói kia đã chuyển sang ADR từ 02/09 (52 và 70 con trỏ); gói này thì chưa — ADR-0000 nói rõ vì sao: lúc chuyển đổi nó đang do phiên khác giữ, và định dạng văn xuôi của nó khác hẳn nên cần một bộ tách riêng.
- **vì sao đáng sửa:** phép kiểm B12 canh *"mọi số hiệu từng cấp còn nằm ở đúng một file"*. Tám quyết định không có số hiệu thì **B12 không nhìn thấy chúng** — xoá đi cũng không ai kêu. Đây là lỗ duy nhất còn lại trong sổ định danh sau lượt gộp `N-54`.
- **đóng khi:** `workers/duc-auto-gg-flow-video/v0.1.0/decisions.md` chỉ còn là **mục lục** trỏ sang `docs/adr/` của chính gói, mỗi quyết định một số hiệu, và `node scripts/check-bootstrap.mjs` vẫn XANH ở B12.

## N-56 · `STATUS.md` gói ChatGPT trỏ một ADR của gói bằng đường dẫn GỐC repo

- **nhóm:** cong
- **mở:** 2026-09-09 · lane `claude-luat-rasoat`
- **vùng:** `workers/duc-auto-chatgpt` — **đang có lane khác giữ khoá**
- **[ĐO]** `STATUS.md` viết `docs/adr/0050-chay-het-job-tru-ba-loai-dung-han.md`, nhưng ADR-0050 là quyết định **của gói**, nằm ở `workers/duc-auto-chatgpt/v0.1.0/docs/adr/`. Bộ sinh chép nguyên văn trường đó vào `DASHBOARD.md`, nên **liên kết chết xuất hiện trên bảng Đức đọc**.
- **chỗ dễ nhầm, ghi ra vì nó sẽ tái diễn:** số ADR đánh **theo từng thư mục** (ADR-0000 ⑴), nên `0050` ở gốc repo và `0050` trong một gói là hai quyết định khác nhau. Gốc repo hiện chỉ có tới `0021`.
- **đóng khi:** liên kết trong `STATUS.md` trỏ đúng đường dẫn của gói, và phép dò liên kết chết không còn báo `DASHBOARD.md`.

## N-57 · Ba `AGENTS.md` của `duc-auto-*` chưa ai rà, và 10 nhóm câu luật lặp giữa chúng

- **nhóm:** cong
- **mở:** 2026-09-09 · lane `claude-luat-rasoat`
- **vùng:** `workers/duc-auto-chatgpt` · `workers/duc-auto-gemini` · `workers/duc-auto-gg-flow-video` — **cả ba đang có lane khác giữ khoá**
- **[ĐO]** `node scripts/rule-compile.mjs` phép ④: ba nơi chứa luật này **CHƯA BAO GIỜ rà**. 15/18 nơi còn lại đã rà 09/09.
- **[ĐO]** phép ③ `LUAT_TRUNG`: **10 trong 12 nhóm** câu luật lặp là cặp `chatgpt` ↔ `gemini` — cùng vân tay, hai file khác nhau. Đó là bề mặt của giới hạn ② (*cấm cài một tính năng hai lần*): ba gói là fork của nhau nên một luật sửa ở một bản không tới hai bản kia.
- **hai cặp lặp KHÁC đã xử xong 09/09**, cách xử ghi lại làm tiền lệ: cả hai là lặp **cố ý** (`AGENTS.md` ↔ `MULTIFLOW.md` là tầng-1-luật ↔ tầng-2-tai-nạn; `hnx-fetch/AGENTS.md` ↔ `PROTOCOL.md` vì sổ đó tự đứng một mình) → **giữ cả hai và ghi lý do ngay tại dòng đó**, theo `docs/protocols/RULE-COMPILER.md` mục 4.
- **đừng làm gì trước khi lane kia trả khoá.** Khoá nằm lâu là lý do để **hỏi**, không phải để lấy.
- **đóng khi:** `node scripts/rule-compile.mjs` phép ④ báo **0 nơi quá hạn**, và mỗi nhóm còn lại của phép ③ hoặc đã gộp, hoặc mang một dòng nói vì sao cố ý giữ hai bản.

## N-58 · Hai sổ cái `chatgpt` và `gemini` có 100 quyết định không nơi luật nào mang

- **nhóm:** cong
- **mở:** 2026-09-09 · lane `claude-luat-rasoat`
- **vùng:** `workers/duc-auto-chatgpt` · `workers/duc-auto-gemini`
- **[ĐO]** `node scripts/rule-compile.mjs` phép ②: **41/51** ở gói ChatGPT và **59/67** ở gói Gemini mồ côi — `AGENTS.md` của hai gói không trích số hiệu nào của sổ cái chính chúng.
- **KHÔNG phải nhiễu, đã chứng minh 09/09.** Trong danh sách mồ côi của Gemini có `ADR-0027 · 0028 · 0031 · 0032` — bốn chốt của Đức về `run.trial`, một method **tiêu credit thật**, trần 30 job. Chúng mồ côi vì luật vàng 7 của gói **không hề nhắc method đó tồn tại**. Đã kéo vào bản hiệu lực cùng ngày. Còn 100 mục chưa ai soi kiểu đó.
- **đừng lấp bằng `mo_coi_co_y`.** Khai cố ý hàng loạt là tắt đúng phép kiểm vừa tìm ra bốn luật sống bị bỏ quên. Cửa đó dành cho quyết định **thật sự** chỉ là bối cảnh, mỗi cái một lý do viết tay.
- **cách làm, ước lượng theo lượt đã chạy cho gói video:** đọc từng ADR, hỏi *"đây là luật còn hiệu lực hay là bối cảnh lịch sử"*; luật còn hiệu lực thì trích vào `AGENTS.md` của gói, bối cảnh thì khai `mo_coi_co_y` kèm lý do. Gói video 10 quyết định mất ~1 lượt; hai gói này gấp 12 lần.
- **đóng khi:** phép ② báo **0** cho cả hai phạm vi, và mọi mục khai `mo_coi_co_y` đều mang một lý do viết tay riêng.

## N-59 · `--restamp --duc-duyet` gán nhầm xuất xứ cho khoá của lane KHÁC

- **nhóm:** cong
- **mở:** 2026-09-09 · lane `claude-luat-rasoat`
- **vùng:** `_code` (`scripts/claim.mjs`)
- **[ĐO]** Gặp thật 09/09. Tôi chuyển **một** khoá (`workers/duc-auto-gemini`) theo chốt của Đức rồi chạy `--restamp --duc-duyet`. Lệnh in **"Đã ghi xuất xứ cho 2 khoá đổi chủ"** và ghi `taken_by: claude-luat-rasoat` + câu chốt của Đức lên cả `workers/duc-auto-chatgpt` — một lượt nhận khoá **hợp lệ của chính lane `claude-gpt-chay-het-job`**, chỉ vì lượt nhận đó **chưa được commit**.
- **vì sao nguy hiểm:** bốn trường xuất xứ là **dấu vết duy nhất** để một lane biết ai đã lấy khoá của mình (`claim.mjs` mục 1 nói rõ nó ghi vào FILE chứ không chỉ in màn hình). Ghi sai vào đó là **vu cho một phiên khác một vụ cướp khoá không có thật**, và xoá mất xuất xứ đúng của họ. Tôi đã trả lại nguyên văn bốn trường từ `git show HEAD:.agents/claims.json`.
- **nguyên nhân:** `khoaBiDoiChu(moc.claims, parsed.claims, as)` so bảng đang có với **mốc niêm phong đã COMMIT**, nên mọi lượt đổi chủ chưa commit của MỌI lane đều bị quy cho phiên đang restamp. Nó không phân biệt *"tôi vừa đổi khoá này"* với *"lane khác đổi khoá kia từ mười tiếng trước"*.
- **cách chữa gợi ý, đừng tin ngay:** chỉ ghi xuất xứ cho khoá mà chủ mới **là chính `as`**; khoá đổi chủ giữa hai bên khác thì **in cảnh báo và TỪ CHỐI**, vì đó đúng là chuyện cần người nhìn. Kèm một phép ghim dựng lại đúng ca 09/09.
- **[ĐO] NỔ LẦN HAI, CHIỀU NGƯỢC LẠI, cùng ngày 09/09** — lane `claude-gpt-chay-het-job`. Một lượt `--restamp` để lấy `workers/duc-auto-chatgpt` đã dán `taken_by` + câu chốt của lane này lên **5 vùng** mà lane `claude-luat-rasoat` vừa **TRẢ**: `duc-auto-gemini`, `_root`, `_docs`, `_code`, `_shared`. Cả 5 đều `owner: null` nên **không khoá sống nào bị lấy** — nhưng bản ghi thì nói lane này đã nhận 5 vùng theo chốt của Đức, việc chưa từng xảy ra. Đã dọn: hoàn nguyên bốn trường xuất xứ từ `git show HEAD:.agents/claims.json`, **không** đụng trường `owner` (trạng thái sống của lane khác), rồi niêm phong lại bằng một lượt `--sua` bình thường — **không** restamp lần hai, vì restamp lần hai sẽ đóng dấu lại đúng 5 vùng đó.
  **Số đo này thêm một vế mà mô tả cũ chưa có:** một vùng bị **BỎ TRỐNG** cũng bị tính là *"đổi chủ khỏi tay phiên khác"*. Nên cách chữa phải nói rõ: chủ mới là `null` thì **không phải** một vụ đổi chủ, và phép ghim cần một mép riêng cho ca đó — thiếu mép ấy thì bản vá chỉ chặn được chiều lane-A-sang-lane-B mà vẫn để lọt chiều lane-A-trả-khoá.
- **đóng khi:** một phép ghim dựng ca ba-bên (mốc có A, đĩa có B ở khoá X và `as`=C ở khoá Y) chứng minh `--restamp` **chỉ** chạm khoá Y, và đột biến bỏ điều kiện đó làm phép ghim ĐỎ.

- **ĐÓNG N-55** · 2026-09-09 · lane `claude-luat-rasoat` · Gói `duc-auto-gg-flow-video` nay có `docs/adr/` với **10 ADR**, `decisions.md` thành mục lục, bản gốc đọc lại được ở `git show eb86e499:…`. `check-bootstrap.mjs` B12 XANH (143 ADR · 162 quyết định). Kèm hai thứ ngoài điều kiện đóng: `AGENTS.md` của gói trích đủ sổ cái nên mồ côi của nó về **0**, và luật vàng 6 (*fix nhỏ không cần audit độc lập*, ADR-0009) lần đầu vào bản hiệu lực.
- **ĐÓNG N-56** · 2026-09-09 · lane `claude-luat-rasoat` · `STATUS.md` gói ChatGPT nay trỏ `workers/duc-auto-chatgpt/v0.1.0/docs/adr/0050-…`; `DASHBOARD.md` sinh lại hết liên kết chết. Chữa cả **gốc rễ**: `STATUS.template.md` nay nói rõ đường dẫn trong `current_focus`/`next_step` tính **từ gốc repo** vì bộ sinh chép nguyên văn hai trường đó lên bảng — thân file thì vẫn dùng `../../../`.
- **ĐÓNG N-57** · 2026-09-09 · lane `claude-luat-rasoat` · Đức mở khoá cả ba vùng (*"tất cả tôi đều mở freeze khóa để triển khai nếu bạn cần"*). Phép ④ **3 → 0**, phép ③ cả 12 nhóm đều mang lý do viết tay. Rà tay tìm ra **sáu vế đã chết mà máy không thấy**, vì chúng mâu thuẫn với sổ cái chứ không *trích* sổ cái: gemini luật 8 (cấm harness, chết 24/08 bởi chính `ADR-0022` tên là *"Sửa luật 8 AGENTS.md"*, nằm sai **16 ngày**) · gemini luật 7 (thiếu hẳn `run.trial`) · gemini luật 1 (bảo vệ ba thư mục **không tồn tại** trong gói) · gg-flow luật 3 (trần trial **3** trong khi mã và luật 2 cùng file nói **7** — con số về TIỀN) · bảng vai hai gói (*"không được tự commit/push"*, đá với luật 6 của chính file) · và cụm *"ADR đã Accepted thì KHÔNG sửa, B12 cưỡng chế"* ở **bốn** file, chết từ 09/09 bởi ADR-0026 ⑵.
- **N-57 CÒN MỘT DÒNG cho lane giữ `workers/duc-auto-chatgpt`** · 2026-09-09 · lane `claude-luat-rasoat` · `AGENTS.md` gói đó, mục *Core / Companion*, còn dạy *"Đã `Accepted` thì KHÔNG sửa — đổi ý thì viết ADR mới… Phép kiểm B12 cưỡng chế."* **Chết 09/09**: [ADR-0026](docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md) ⑵ bỏ luật bất biến từng byte, và B12 nay hỏi *"có số hiệu nào biến mất không"*, không hỏi *"thân file có đổi không"*. Ba file kia (`gemini`, `gg-flow-video`, `docs/_TEMPLATE-adr.md`) đã sửa. **Tôi đã soạn bản vá nhưng HOÀN NGUYÊN nó**, vì lane `claude-gpt-chay-het-job` lấy lại khoá vùng lúc 03:50 theo chốt của Đức — vùng của họ thì việc này là của họ. Câu thay thế đúng nguyên văn nằm ở `workers/duc-auto-gemini/v0.2.0/AGENTS.md` cùng mục, chép sang là xong. **đóng khi:** dòng đó trong `workers/duc-auto-chatgpt/v0.1.0/AGENTS.md` không còn nói B12 cưỡng chế tính bất biến.
- **ĐÓNG N-58** · 2026-09-09 · lane `claude-luat-rasoat` · Phép ② **100 → 0**. Soi từng cái, không lấp bằng cửa miễn trừ: **67 luật đang sống** vào bản hiệu lực của hai gói (mục mới *Sổ cái của gói*, nhóm theo chủ đề) · **27 bản ghi lịch sử** khai `mo_coi_co_y` dạng nhóm · **6 thật sự đã chết** đánh dấu đúng khuôn máy đọc được (`gemini` 0019·0038·0039·0040, `chatgpt` 0027·0032). **Xác nhận nghi ngờ lúc mở mục:** trong đám mồ côi có những luật ai chỉ đọc `AGENTS.md` sẽ không bao giờ biết — `gemini` ADR-0046 ghim **CẤM dựng lại** hai ngõ cụt đã bị bằng chứng bác bỏ, `chatgpt` ADR-0042 *việc thật KHÔNG chạy qua `run.trial`*, và ADR-0045 *text quá 32.767 ký tự thì DỪNG, không lưu gì*. Bộ đo nhận thêm dạng **NHÓM** cho `mo_coi_co_y` — cố ý không có dạng "cả sổ này miễn", nhóm vẫn phải liệt kê từng số nên quyết định mới vẫn kêu.
- **ĐÓNG N-57 phần còn lại** · 2026-09-09 · lane `claude-luat-rasoat` · Dòng *"ADR đã Accepted thì KHÔNG sửa, B12 cưỡng chế"* trong `workers/duc-auto-chatgpt/v0.1.0/AGENTS.md` đã sửa. Đức báo lane `claude-gpt-chay-het-job` đã dừng (*"bên kia đã dừng rồi, bạn làm nốt đi"*) nên khoá vùng chuyển hợp lệ.

## N-60 · `reconciliation-core.js` trôi dạt giữa hai nhánh, làm ĐỎ suite của gói Gemini

- **nhóm:** cong
- **mở:** 2026-09-09 · lane `claude-luat-rasoat` (phát hiện) — **việc của lane `claude-gpt-chay-het-job`**
- **vùng:** `workers/duc-auto-chatgpt` (nguồn) · phép kiểm nằm ở `workers/duc-auto-gemini`
- **[ĐO]** `node workers/duc-auto-gemini/v0.2.0/tests/shared-modules-no-drift-static.mjs` **ĐỎ**: `reconciliation-core.js`. Nguyên nhân là commit **`478b24aa`** *(feat(gpt): B-43 vòng ba — F5 rồi ĐỌC LẠI)* của lane `claude-gpt-chay-het-job`, thêm khối đối soát chữ **~40 dòng** vào bản ChatGPT mà bản Gemini chưa có. Commit đó **chưa lên remote**.
- **hệ quả tức thì:** cổng đóng phiên ĐỎ ở phép *Test xanh*, nên **không lane nào đẩy được** cho tới khi xử — kể cả lane chỉ sửa tài liệu. Đo thật 09/09: lượt đẩy của `claude-luat-rasoat` bị chặn vì việc này.
- **tôi KHÔNG tự sửa, và đây là lý do:** phép kiểm cho ba đường ra — port thay đổi sang nhánh kia · đọc cả hai rồi hoà · **gỡ tên file khỏi danh sách SHARED kèm lý do**. Đường thứ ba là **nới một lớp bảo vệ cho cổng xanh**, đúng thứ `AGENTS.md` gốc mục 5 cấm. Hai đường đầu cần hiểu bản vá đang bay của lane kia, và `ADR-0066` của gói Gemini chốt sẵn: *"lỗi có ở nhánh kia thì ghi sổ, **KHÔNG sửa hộ**"*.
- **đóng khi:** `shared-modules-no-drift-static.mjs` XANH — hoặc bằng lượt port, hoặc bằng một dòng khai trong chính file test nói vì sao `reconciliation-core.js` được phép khác nhau, kèm ADR đứng sau nó.

## N-62 · `ADR-0017 ⑵` (*mỗi vai một checkout riêng*) đã chốt nhưng CHƯA BAO GIỜ được làm

- **nhóm:** cong
- **mở:** 2026-09-09 · lane `claude-luat-rasoat`
- **vùng:** `_root` (hạ tầng đa phiên) — **cần Đức chốt trước khi đổi**, nó đổi cách mọi phiên làm việc
- **[ĐO]** `git worktree list` trả về **đúng một** cây. Quyết định [ADR-0017 ⑵](docs/adr/0004-hai-vai-assistant.md) `Accepted` và **còn sống** (chỉ vế ⑶ ⑷ đã chết) nói *"mỗi vai một checkout riêng"*, kèm lý do: *"checkout chung không chứng minh được thực thi độc lập"*.
- **[ĐO] cái giá, đo trong MỘT GIỜ ngày 09/09** — hai lượt đẩy bị chặn, cả hai vì lane khác đang sửa dở trên **cùng một cây**: ⑴ `reconciliation-core.js` trôi dạt (`N-60`); ⑵ một dòng **chưa commit** trong `don-rac-tai-xuong.mjs` làm đỏ chính test của gói đó. Lane `claude-luat-rasoat` có **4 commit chỉ đụng tài liệu và luật**, không chạm một dòng mã sản phẩm nào, vẫn không đẩy được.
- **vì sao KHOÁ không chữa được:** khoá canh **ai được GHI**, còn suite đọc **cả cây**. Một lane tuân thủ khoá tuyệt đối vẫn làm đỏ cổng của lane khác chỉ bằng việc để một file sửa dở trên đĩa. `--soat` bịt cửa commit, không bịt cửa này.
- **chỗ CHƯA có máy nào canh, nói thẳng:** đây là một quyết định **nằm trong bản hiệu lực** mà **thực tế không khớp**. Bộ biên dịch soi *chữ với chữ*, không soi *chữ với thế giới* — cả bốn phép ① ② ③ ④ đều XANH trong khi vế này bị bỏ suốt hai ngày.
- **đóng khi:** `git worktree list` trả về **ít nhất hai** cây, **hoặc** `ADR-0017 ⑵` được đánh dấu chết kèm tên quyết định thay nó. Một trong hai — không được để nguyên như hiện nay.

## N-63 · `PHIEN.md` là file MỌI phiên gói nạp, nhưng KHÔNG phép kiểm nào canh nó còn tươi

- **nhóm:** cong
- **mở:** 2026-09-09 · lane `claude-nen-luat`
- **vùng:** `_code` + `_root` (`.repo-structure.json` → `generators` / `generated`)
- **[ĐO]** `generators` khai **ba** script (`build-dashboard.mjs` · `feature-parity.mjs` ·
  `build-overview.mjs`); `rule-compile.mjs` **không có trong đó**, và không một `PHIEN.md` nào
  nằm trong `generated`. Tức phép kiểm ⑺ *Sự thật máy sinh còn tươi* **không nhìn thấy** bốn file
  mà [ADR-0035](docs/adr/0035-mot-file-cho-mot-phien-gap.md) vừa biến thành **cửa vào duy nhất**
  của mọi phiên đụng gói.
- **[ĐO] đường hỏng cụ thể, gặp ngay hôm mở mục này:** `PHIEN.md` chắt bốn trường của `STATUS.md`.
  Lúc 17:16 lane `claude-gpt-chay-het-job` đang giữ khoá `STATUS.md` của gói chatgpt. Nó sửa xong
  và commit thì `PHIEN.md` **dạy trạng thái cũ**, cổng vẫn XANH, và phiên sau tin file đó — vì
  chính `PHIEN.md` nói *"đây là toàn bộ thứ cần để bắt đầu"*.
- **cái giá thứ hai, âm hơn:** trần CỨNG của bó chỉ nổ **lúc `--sinh` chạy**. Không ai chạy `--sinh`
  thì một `STATUS.md` phình ra không bị chặn ở đâu cả — trần biến thành thước cóc mà không ai
  tuyên bố hạ nó.
- **đừng làm vội, và đây là lý do:** thêm `rule-compile.mjs` vào `generators` sẽ làm ĐỎ cổng của
  **mọi lane** ngay khi một `PHIEN.md` lệch — kể cả lane không được phép sửa gói đó (đúng cái bẫy
  `K2-2` đã ghi trong `session-check.mjs`). Cần nghĩ phần quy trách nhiệm trước, không chỉ phần đo.
- **đóng khi:** sửa `STATUS.md` của một gói rồi **không** chạy `--sinh` thì cổng ĐỎ ở đúng lane
  chịu trách nhiệm cho gói đó — **hoặc** một dòng khai nói vì sao `PHIEN.md` cố ý không được canh,
  kèm ADR đứng sau.
- **[ĐO] 09/09 18:05 — một vế NỮA của cùng lỗ hổng, và nó thật hơn vế đầu:** `AGENTS.md` đã nén
  vào `main` (commit `1702ae5d`) trong khi `PHIEN.md` sinh từ nó **chưa bao giờ được commit** —
  gói có luật mới mà không có file mở phiên. Phép ⑺ không thấy vì `PHIEN.md` không nằm trong
  `generated`; phép ⒘ mới cũng không, vì nó so **đĩa với đĩa**, không so với `HEAD`. Nói cách
  khác: nay đã canh được *cũ*, chưa canh được *chưa vào git*.
- **đóng khi (bổ sung):** một `PHIEN.md` có trên đĩa mà không có trong `HEAD` cũng làm cổng ĐỎ ở
  đúng lane chịu trách nhiệm.

## N-64 · `drafts/` là nháp DÙNG CHUNG, nhưng bộ máy coi nó thuộc vùng `_root`

- **nhóm:** cong
- **mở:** 2026-09-09 · lane `claude-nen-luat`
- **vùng:** `_code` + `_root` (`.repo-structure.json`)
- **[ĐO] chặn thật, 09/09 18:30:** lane `claude-context-review` để
  `drafts/REVIEW-CONTEXT-COMPILER-V1.md` (chưa track) trong cây làm việc. Tôi đang giữ `_root` để
  cắt sổ, nên `quyTrachNhiemSuite` quy file đó cho tôi và trả `TOI_CON_SUA_DO: drafts/` →
  `role-firewall-smoke` ĐỎ → cổng ĐỎ → **không đẩy được**. File không phải của tôi, và tôi
  **không được** commit, xoá, hay `.gitignore` nó.
- **[ĐO] tiền đề sai nằm ngay trong chú thích của chính cái chốt:** *"chỉ tôi được ghi vào vùng
  tôi giữ, nên file bẩn trong đó LÀ CỦA TÔI"*. Đúng với mọi vùng **trừ** `drafts/` — `CLAUDE.md`
  toàn cục nói đó là **chỗ DUY NHẤT agent tự ghi không cần hỏi**, tức nhiều lane ghi vào cùng lúc
  theo đúng thiết kế.
- **đừng chữa bằng cách nới chốt.** Chốt đó đúng và cần; cái sai là bản đồ quyền sở hữu nhận vơ
  một thư mục cố ý dùng chung. Cửa đúng: khai `drafts/` **ngoài mọi vùng** trong
  `.repo-structure.json` (cùng họ với `append_only_exempt`), rồi `quyTrachNhiemSuite` bỏ qua nó.
- **liên quan:** `N-62` — cây làm việc dùng chung. Đây là lần thứ **ba** trong một ngày một lane
  bị chặn bởi file sửa dở của lane khác; hai lần trước đã ghi trong `N-62`.
- **đóng khi:** một lane khác để file nháp trong `drafts/` **không** làm đỏ cổng của lane đang
  giữ `_root`, **và** có phép ghim cho đúng ca đó.

### KHUNG-M1 · 42 ADR bị B12 nêu "đã Accepted mà thân bài bị sửa"

Lượt migrate lên khung **1.8.0** (09/09) mang theo B12 chặt hơn bản 0.3.0. Cổng cấu trúc nay
nêu **42 / 154 ADR** có thân bài đổi sau mốc `Accepted`. Đây là **nợ có thật**, không phải cổng
hỏng: ADR-0000 của chính repo này nói thân bài ADR đã Accepted là bất biến.

**đóng khi:** `node scripts/check-bootstrap.mjs` không còn dòng `B12 ADR-EDITED` nào — hoặc
repo chốt một cách xử lý khác và ghi vào `decisions.md` (ví dụ: ADR sửa thật thì viết ADR mới
khai `sua: <mã>`, đúng đường bộ biên dịch luật mở ra).

Xem: `node scripts/check-bootstrap.mjs --all | grep ADR-EDITED`

### KHUNG-M2 · Khai `luat.chu_de` để bật bộ biên dịch luật (B16)

Khung 1.8.0 mang `npm run luat` — bộ biên dịch luật: mỗi ADR khai đúng một `chu_de`, mỗi chủ đề
có đúng một `dau_moi`, nên hỏi "luật về chuyện X là gì" thì mở **một khối** thay vì đọc bốn file
rồi tự đoán. Repo này có **154 ADR**, chưa ADR nào khai `chu_de`.

B16 **cố ý để ở nhóm CẢNH BÁO**, không CHẶN — bật chặn khi đang đỏ là tự khoá repo.

**đóng khi:** `.repo-structure.json` khai `luat.chu_de`, mọi ADR còn hiệu lực có `chu_de`,
`npm run luat -- --soat` không còn VI_PHAM, và `B16` được thêm lại vào `bootstrap.blocking`.

### KHUNG-M3 · Trần token mỗi phiên: đo rồi siết

Khung 1.8.0 mang `npm run luat -- --nap` (Context Compiler) và `npm run can-nang` đo **token**
chứ không đo dòng. Ngân sách vừa khai `budget.tokenNap: 6000` — con số **lúc migrate**, chưa
phải con số của repo này.

**đóng khi:** đã chạy `npm run luat -- --nap` một lượt, hạ `tokenNap` xuống sát số thật cộng
biên 30%, và ghi số đo vào `HANDOFF.md`. Thước chỉ được SIẾT.
