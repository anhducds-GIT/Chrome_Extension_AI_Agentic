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
