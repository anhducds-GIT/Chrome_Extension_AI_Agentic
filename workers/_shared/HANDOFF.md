# HANDOFF — `workers/_shared/`

> Nhật ký của vùng mã dùng chung. Luật của vùng: `AGENTS.md` cạnh file này.
> Ghi thêm ở CUỐI, không sửa mục cũ. Trần một mục: 2.600 byte.

## Log

## 2026-09-08 · `claude-scouter-s06` — vùng này ra đời, và bộ khung chưa lường trước nó

**Việc.** Đức chốt Scouter phải có host Bridge RIÊNG, để sau này nhân bản seed sang nhiều
extension. Nhưng chép một bản host như ba gói `duc-auto-*` thì quay lại đúng bệnh cũ — đo được:
`bridge-host.mjs` có **3 bản chép, KHÁC NHAU cả ba** (461/451/450 dòng), và 11 dòng khác biệt
chính là **cái bắt tay hai chiều**. Một bản vá an toàn làm ở một bản, không bao giờ tới hai bản
kia.

Nên đường đi là luật sẵn có của repo (`AGENTS.md` gốc mục 3, luật 2): lõi vào đây, mỗi extension
một host **mỏng**. Luật có từ trước; **vùng này thì tới hôm nay mới có nhà**.

**Hai file, và vì sao chúng tách nhau.** `websocket-core.mjs` chép nguyên vẹn từ bản đóng băng —
đo mã băm thì cả ba gói giống hệt nhau, nên không có gì để hoà giải. `bridge-host-core.mjs` thì
tham số hoá **đúng hai thứ**: tên giao thức (bản cũ gõ cứng ở bốn chỗ) và một móc `methodTaiCho`
cho method do chính máy chủ trả lời.

**Phép ghim đáng nói:** tách lõi thì câu hỏi không phải *"code mới có chạy không"* mà *"tách ra
có làm rơi hành vi nào không"*. `tuong-duong-voi-ban-goc.mjs` hỏi **cả bản gốc lẫn bản mới cùng
một câu, 29 ca**, rồi so đáp án. Bản gốc **đóng băng** — chính điều đó làm nó thành mốc tốt.

**Bộ đo đột biến tự tìm ra một lỗ:** cái bắt tay hai chiều — lý do chính khiến lõi được tách —
**không có phép ghim hành vi nào**. Nay có `bat-tay-hai-chieu.mjs`, nối THẬT qua socket.

**Bộ khung chưa lường trước một vùng dùng chung.** Mở nó phải đi qua đường sửa tay `claims.json`
rồi `--restamp` — đúng thao tác luật cảnh báo nặng nhất. Đã chụp chủ sở hữu trước/sau: không
khoá nào bị đổi chủ. Chi tiết ba cửa đã đóng và điều kiện đóng: `N-41` ở `BACKLOG.md` gốc.

**Đo.** Suite của vùng chạy trong `workers/duc-scouter/v0.1.0/tests/run-all.mjs` (quét theo hình
dạng `_shared/*/tests/*.mjs`). Đột biến: `X1..X4` trong `scouter-mutation-check.mjs`, giết 4/4.

<!-- HANDOFF-THANG: 2026-09 -->

---

## 2026-09-08 · `claude-scouter-s06` — thêm bộ sinh tệp ghép cặp

**Vì sao vào `_shared` chứ không vào một gói:** nó phải sinh ra thứ mà `validatePairing()` chấp
nhận, và hàm đó ở ngay cạnh. Để bộ sinh ở một gói thì gói kia sẽ chép — đúng bệnh giới hạn ② của
`AGENTS.md` cấm. Ở đây nó **tự kiểm bằng chính hàm máy chủ dùng**, nên không thể sinh ra tệp mà
máy chủ từ chối. Lượt thử đầu chứng minh ngay: bản đầu sinh token dạng hex và bị chính
`validatePairing` chặn (nó đòi base64url 43 ký tự).

**Chỗ đáng nhớ nhất của lượt này: chốt an toàn của chính tôi đã hỏng CÂM.** Chốt ⑴ là *"không
ghi vào trong kho mã"* — tệp ghép cặp chở token. Lượt thử đầu nó **không nổ**, và bộ sinh đã đặt
một tệp có token thẳng vào gốc repo (chưa từng được track, đã xoá ngay).

Nguyên nhân: gốc repo tính bằng cách tự gỡ `URL.pathname`, mà trên Windows chuỗi đó là
`/C:/WORKING%20ZONE/...` — **dấu cách còn ở dạng `%20`**, nên đường dẫn dựng ra không khớp thư
mục thật và phép so luôn trả *"nằm ngoài repo"*. Đã chuyển sang `fileURLToPath`.

Phép ghim `tests/tao-tep-ghep-cap-smoke.mjs` vì thế **không so chuỗi** — nó chạy thật tệp lệnh,
xem có tệp nào rơi vào repo không, và cố ý thử một đường dẫn **có dấu cách**.

Bài học chung, không riêng tệp này: **một chốt hỏng câm tệ hơn không có chốt** — không có thì
người ta còn cẩn thận.

**Việc kế:** không có.

---

## 2026-09-08 · `claude-scouter-s06` — Codex kiểm chứng bộ sinh, tìm ra 5 chỗ, cả 5 đều thật

Đức chốt giao `H-06` cho Codex CLI. Đây là lượt **bên khác kiểm bên sửa** đầu tiên của gói này,
và nó trả tiền ngay.

**Codex không chạy được trên máy này** — sandbox hỏng (`apply deny-read ACLs`), đúng lỗi đã ghi
trong sổ tay. Nó báo `FAIL` kèm câu *"FAIL là chưa đủ bằng chứng để nghiệm thu, không phải kết
luận mã có lỗi"* — đúng cách một bên kiểm chứng nên nói khi không đo được. Chuyển sang **đọc mã**:
nạp thẳng nội dung qua stdin, chế độ chỉ-đọc. Lần này nó trả 5 chỗ, và **cả 5 đều có thật**.

**Ba lỗ ở chốt "không ghi vào kho mã", cùng một gốc — so đường dẫn mà chuẩn hoá chưa đủ sâu:**
đường dẫn mở rộng `\?\C:\...` · tên tệp bắt đầu bằng `..` · junction trỏ vào repo. Cái đầu
**đã lọt thật**: tôi đo lại và một tệp có token rơi vào gốc repo. Vá bằng: gỡ tiền tố mở rộng,
giải tới **tổ tiên tồn tại sâu nhất**, và so theo **đoạn** đường dẫn chứ không theo tiền tố chuỗi.

**Một lỗ ở chốt "không ghi đè":** `existsSync` rồi `writeFileSync` là hai lượt, giữa chúng có khe.
Nay ghi bằng cờ `wx` — hệ điều hành từ chối, không còn khe.

**Một lỗ trong CHÍNH PHÉP GHIM, và đây là cái đáng sợ nhất.** `GOC_REPO` của nó lùi ba cấp từ
`tests/` nên chỉ tới `workers/`. Tức phép ghim chỉ chứng minh bộ sinh không ghi được vào
`workers/` — nó **không đỏ**, nó **đo ít hơn nó tự khai**. Một phép ghim như thế còn tệ hơn không
có, vì nó phát ra sự yên tâm mà nó không đỡ nổi.

**Đo sau khi vá:** 12 đường tấn công, chặn 12. Sinh tệp thật rồi bật máy chủ thật:
`HTTP 200 · EXTENSION_OFFLINE`.

Hai bẫy thoát chuỗi gặp lại trong lượt này, ghi để lần sau nhận ra sớm: một regex bị nuốt dấu
gạch ngược nên bộ tách chỉ tách theo gạch xuôi; và một phép ghim soi chữ `Math.random` thì đỏ vì
đọc **chính lời dặn** trong chú thích của mã. Cả hai chữa bằng cách bỏ regex, dùng `includes`.

---

## 2026-09-08 · `claude-scouter-s06` — luật NHÀ CHUNG của Bridge, ghim vào MÃ chứ không chỉ vào chữ

Đức chốt: mọi thứ thuộc Bridge nằm dưới `C:\WORKING ZONE\Chrome Extension Bridge\<tên-gói>\`,
và **"lỗi này gặp vài lần rồi"**.

**Chuyện đáng ghi nhất: quy ước đó ĐÃ TỒN TẠI từ trước.** Bốn gói cũ đều nằm đúng chỗ, đúng hình
dạng — tệp ghép cặp mang tên gói, bộ khởi động `START-BRIDGE_*`, vùng ghi là thư mục con. Vậy mà
sáng nay chính tôi vẫn đặt một tệp ghép cặp vào `C:\Users\<user>\HNX-Bridge\`.

Nên chẩn đoán đúng **không** phải "AI cẩu thả". Nó là: **một quy ước chỉ nằm trong văn xuôi thì
phụ thuộc vào việc người đọc có mở đúng trang đó không.** Thêm một dòng tài liệu nữa sẽ hỏng lại
theo đúng cách cũ.

Nên luật này thành **giá trị mặc định của công cụ**: hằng số `NHA_BRIDGE`, hàm `duongGhepCapChuan()`,
và cờ `--goi <tên-gói>` tự dựng đúng đường + tự tạo thư mục con. Cờ `--ra` vẫn còn cho ca có lý do
riêng, và nó **không** tự tạo thư mục — gõ nhầm một ký tự mà tự tạo thư mục là đặt token ở chỗ
không ai nhìn tới. Phép ghim khối ⑸ canh cả bốn vế, kể cả *câu hướng dẫn có in ra nhà chung không*.

**Chưa làm được, đã ghi sổ (`N-46`):** khai vào bản đồ **gốc repo** (`.repo-structure.json` +
`AGENTS.md` gốc). Cả `_root` lẫn `_docs` đang do phiên khác giữ. Đó mới là chỗ AI đọc đầu tiên,
nên phiên không đụng gói `_shared` sẽ vẫn không thấy luật — chính là cách lỗi này tái diễn.

**Một bẫy thoát chuỗi dính BA lần trong ngày:** dấu gạch ngược trong chuỗi bị nuốt, làm
`NHA_BRIDGE` thành `C:WORKING ZONEChrome Extension Bridge`. Cách chữa đã thành thói quen: dựng
bằng `String.fromCharCode(92)`, và với văn bản dài thì viết ra tệp rồi đọc vào, đừng nhúng.

---

## 2026-09-08 · `claude-scouter-s06` — N-46 đóng: luật đường dẫn vào bản đồ gốc, và bộ sinh ĐỌC nó

Khoá `_root` trống, Đức bảo làm luôn. Ba việc.

**⑴ Khai vào bản đồ gốc.** Khối `thu_muc_ngoai_repo` mới trong `.repo-structure.json`, kèm một
dòng ở bảng sổ tay của `AGENTS.md` gốc — chỗ AI đọc đầu tiên mỗi phiên. Trước đó luật chỉ nằm ở
`workers/_shared/AGENTS.md`, nên phiên không đụng gói này sẽ không bao giờ thấy.

**⑵ Bộ sinh nay ĐỌC bản đồ, không gõ cứng.** Đây là phần tôi làm hơn mục nợ yêu cầu, và có lý do:
gõ cứng thêm một chỗ là dựng **bản sao thứ hai của một luật**. Repo này đã trả giá đúng thế ngày
02/09 — hai bản của một danh sách miễn trừ trả hai câu khác nhau cho cùng một tệp. Thiếu khai báo
thì bộ sinh **ném**, không đoán một đường mặc định: một bộ sinh tự bịa đường dẫn là đúng cái bệnh
khối này sinh ra để chữa.

**⑶ Phép ghim canh hai chiều, và có vế đối chứng.** Sửa mã quên bản đồ → đỏ. Sửa bản đồ mã không
theo → đỏ. Và thêm một vế ít ai nghĩ tới: **bốn gói cũ trong nhà chung phải thật sự đúng hình
dạng đã khai**. Một luật khai ra mà thực tế không theo thì nó là chữ, không phải mô tả — và loại
sai đó không bao giờ tự đỏ. Đã thử phá: đổi đường dẫn trong bản đồ thì phép ghim **ĐỎ**.

**Một chỗ vấp đáng ghi:** lượt đầu tôi splice chuỗi JSON và dấu gạch ngược bị nuốt — tệp thành
JSON hỏng. JSON cần **hai** gạch ngược cho một gạch thật, tức chuỗi nguồn cần **bốn**. Phục hồi
bằng `git checkout` (chỉ có sửa của tôi trong tệp đó, đã kiểm `git diff --stat` trước), rồi dựng
lại bằng `String.fromCharCode(92)`. Cùng một bẫy đã dính bốn lần trong ngày; cách chữa duy nhất
đáng tin là **đừng gõ dấu gạch ngược vào chuỗi nguồn bao giờ nữa**.

**Về giới hạn ⑦** (*một luật vào thì một luật ra*): dòng mới ở `AGENTS.md` đi theo nhánh *"đo
được nó đã nổ mấy lần"* — Đức nói gặp vài lần, lần gần nhất 08/09 do chính phiên này. `AGENTS.md`
nay **390** dòng.

## 2026-09-09 · `claude-luat-rasoat` — `AGENTS.md` của vùng còn dạy một luật đã chết

Rà theo bộ biên dịch luật mới ([ADR-0027](../../docs/adr/0027-bo-bien-dich-luat.md)). Hai chỗ sai:

- Mục *"Ba gói đóng băng KHÔNG dùng lõi này"* viết **"Luật cấm sửa gói đóng băng"**. Vế đó
  **chết 08/09**: [ADR-0021](../../docs/adr/0021-goi-extension.md) ⑴ bỏ hẳn trần số gói, mở băng
  cả năm gói, `frozen` nay là **danh sách rỗng**. Không còn luật nào cấm sửa ba gói đó. Lý do
  thật khiến chúng chưa chuyển sang lõi chung là ADR-0021 ⑶ — Đức **chấp nhận** rủi ro token
  trần, tức một **lựa chọn**, không phải một điều cấm. Đổi tiêu đề thành *"CHƯA dùng lõi này"*.
- Câu mở đầu dẫn *"`AGENTS.md` gốc mục 3, luật 2"* — luật *cấm cài một tính năng hai lần* nay là
  **giới hạn ②** của mục 4. Sửa.

**Không đụng mã, không đụng phép ghim.** Bài học chung ghi ở gốc: trỏ tới `AGENTS.md` phải kèm
**TÊN** mục, vì số mục chỉ là vị trí và lượt cắt 402 → 252 dòng hôm nay làm hỏng 8 lượt trỏ.

## 2026-09-09 · `claude-nen-luat` — vùng này nhận `LUAT-CORE.md`, nguồn của mọi `PHIEN.md`

Đức chốt trần **2.000–3.000 token** cho một phiên đụng gói, và gọi việc giữ nó ở đó là *"mục tiêu
của việc compile"* ([ADR-0035](../../docs/adr/0035-mot-file-cho-mot-phien-gap.md)).

**Thêm `LUAT-CORE.md` vào vùng này** — phần luật **mọi** phiên gói phải biết trước khi gõ: hỏi Đức
trước · không bao giờ · bốn lệnh khoá/cổng/đẩy · chỗ mở khi cần. **951 token.**
`rule-compile.mjs --sinh` chép nguyên khối này vào `PHIEN.md` của từng gói, kèm luật riêng của gói
và bản chắt trạng thái.

**Sửa lõi ở đây, đừng sửa `PHIEN.md`** — lượt sinh sau nuốt mất. Và nhớ: sửa một dòng ở đây là sửa
cho **cả bốn gói** cùng lúc, nên nó rẻ hơn nhưng cũng rộng hơn.

**Không đụng mã, không đụng phép ghim của vùng.**
