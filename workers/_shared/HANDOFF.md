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
