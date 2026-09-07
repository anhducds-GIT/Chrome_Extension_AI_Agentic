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

**Ba chỗ BỘ KHUNG vấp khi mở một vùng dùng chung lần đầu, ghi ra vì người sau sẽ vấp lại:**
⑴ `claim.mjs` từ chối khoá lạ, bảo khai `.repo-structure.json` trước;
⑵ khai vào `areas` **vẫn đỏ**, vì `areaOf()` coi mọi thư mục dưới `workers/` là một package cần
khoá trong `claims.json`;
⑶ đường duy nhất còn lại là **sửa tay rồi `--restamp`** — đúng thao tác mà luật cảnh báo nặng
nhất. Đã làm, và đã chụp chủ sở hữu trước/sau để chứng minh không khoá nào bị đổi chủ. Ghi thành
`A-02` ở `BACKLOG.md` gốc; không tự vá vì `scripts/` thuộc `_code`.

**Đo.** Suite của vùng chạy trong `workers/duc-scouter/v0.1.0/tests/run-all.mjs` (quét theo hình
dạng `_shared/*/tests/*.mjs`). Đột biến: `X1..X4` trong `scouter-mutation-check.mjs`, giết 4/4.
