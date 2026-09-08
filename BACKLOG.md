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

- **ĐÓNG N-37** · 2026-09-08 · lane `claude-ext-cum5` · Nội dung ADR **không mất** — bản viết 07/09 còn nguyên trong thư mục tạm của phiên, đã vào repo tại `docs/adr/0023-khong-ai-phai-cho-ai.md`. **Điều kiện đóng ghi trong mục này nay SAI, đọc kỹ chỗ này:** nó bảo `test -f docs/adr/0017-khong-ai-phai-cho-ai.md`, nhưng trong lúc bản nháp nằm ngoài repo thì **số 0017 đã thuộc về một ADR khác** (`0017-hai-vai-assistant-thay-the-mot-cua.md`). Đây đúng thứ rủi ro mà vế ⑵(a) của chính ADR đó cảnh báo — tạo file không đụng nhau về nội dung nhưng **đụng nhau về số**. Lệnh đúng: `test -f docs/adr/0023-khong-ai-phai-cho-ai.md`. **Vào ở `status: Proposed`, KHÔNG phải `Accepted`, và đây không phải thủ tục:** Đức đã nói vế ⑶ nguyên văn, nhưng **vế ⑴ (khoá hết hạn khi có người chờ) và ⑵ (tách khoá `AGENTS.md`) là thiết kế của AI**, cả hai đụng luật khoá — tức thứ `AGENTS.md` mục 2 bắt hỏi Đức. Đóng dấu `Accepted` cho chúng là để AI tự duyệt luật của chính mình. Hai chỗ đổi so với bản gốc được ghi thành một khối ngay đầu ADR, không sửa lén. **Việc còn lại của Đức:** đọc ba vế, chốt vế nào lấy vế nào bỏ, rồi đổi frontmatter sang `Accepted` ở một lượt riêng (B12 miễn frontmatter nên lượt đó hợp luật sẵn).

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
