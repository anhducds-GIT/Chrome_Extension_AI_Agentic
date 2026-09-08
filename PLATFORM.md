# PLATFORM.md — vận hành nhiều extension trong một repo

> **Đọc file này khi:** muốn biết repo có những extension nào, cái nào dùng được, và thêm cái
> mới thì làm sao. Luật chung ở [`AGENTS.md`](AGENTS.md) — **file này không chép lại luật**.
>
> **Rà 09/09 và cắt 231 → 96 dòng.** Ba chỗ đang dạy sai bị bỏ, không phải sửa: bảng registry
> gõ tay (mục 3 cũ) — nó là bản chép của `DASHBOARD.md` và đã rữa, đúng cái bệnh nguyên tắc số
> 1 của chính file này cấm · roadmap V0.2 và các quyết định 27/08 về **Observer V0** — Observer
> đã thành Scouter và dọn sang gói riêng ([ADR-0013](docs/adr/0007-scouter.md)) nên cả khối đó
> nói về một thứ không còn tồn tại · sổ Log 58 dòng — chuyện đã xảy ra thuộc `HANDOFF.md`, đọc
> lại bằng `git log -- PLATFORM.md`.

## 1. Nguyên tắc số 1 — thứ gì máy đếm được thì máy đếm

Thử trả lời "repo có gì, tới đâu rồi" bằng tài liệu gõ tay thì **hỏng hai lần trong đúng một
ngày (26/08)**: sổ nợ ghi Gemini còn thiếu hai lệnh trong khi đã port xong, và một trang gõ tay
sai **bốn con số** sau đúng một ngày. Không ai cố ghi sai — chỉ là không có gì buộc chữ phải
chạy theo mã.

Và nó hỏng **lần thứ ba** ngày 09/09, ở chính file này: bảng registry gõ tay còn khai **3
extension** trong khi repo có **sáu đơn vị**, và còn liệt kê Observer V0 — thứ đã ngừng tồn tại
từ 06/09. Một bảng gõ tay chỉ có hai kết cục: hoặc trùng với bảng máy, hoặc sai.

## 2. Platform gồm đúng hai thứ

| Thứ | Ai viết | Là gì |
|---|---|---|
| `STATUS.md` trong mỗi extension | **người** | Lời khai trạng thái vận hành: đang sống hay ngủ, kiểm chứng lần cuối bằng gì, việc đang mở, đọc sâu ở đâu |
| [`DASHBOARD.md`](DASHBOARD.md) ở gốc repo | **máy** | Bảng tổng, sinh từ các `STATUS.md` + đo thẳng từ repo. **Không bao giờ gõ tay** |

```bash
node scripts/build-dashboard.mjs      # sinh lại DASHBOARD.md
```

**Repo có gì → mở [`DASHBOARD.md`](DASHBOARD.md).** Đó là danh sách duy nhất, và nó tươi vì máy
sinh. File này cố ý **không** giữ một bảng thứ hai.

### Ranh giới, đọc kỹ chỗ này

`STATUS.md` là nguồn sự thật của **trạng thái vận hành** — KHÔNG phải của toàn bộ kiến thức.
Kiến trúc, cách dùng, bảng lỗi, hướng dẫn dài vẫn ở `README.md` / `HANDOFF.md` /
`AI-OPERATOR-GUIDE.md` của gói; STATUS **chỉ trỏ link tới**.

Lý do không phải thẩm mỹ: hai chỗ nói cùng một điều thì sớm muộn nói khác nhau — đúng cái bệnh
platform này sinh ra để chữa. Một STATUS phình thành README thứ hai là đã hỏng.

## 3. Đóng phiên — một bước thêm cho platform

Thứ tự đầy đủ ở [`AGENTS.md`](AGENTS.md) mục 0a. Platform thêm đúng một việc, **trước** khi
chạy đủ bộ test:

- Trạng thái đổi thì **cập nhật `STATUS.md`**: kiểm chứng mới → sửa `last_verified` +
  `last_verified_commit` + `evidence_ref`; việc mở đổi → sửa `current_focus`.
- Rồi `node scripts/build-dashboard.mjs` và commit `DASHBOARD.md` sinh ra.

> **Vì sao bộ sinh chạy SAU commit chứ không trước.** Phép kiểm "Sự thật máy sinh còn tươi" so
> **HEAD với HEAD** — nó hỏi *"bản đã commit có khớp với repo đã commit không?"*. Chạy trước khi
> commit thì HEAD chưa có việc mới và cổng vô nghĩa.
>
> Đổi lại, nó **miễn nhiễm với việc đang làm dở** — của bạn lẫn của phiên khác. Đó là chủ đích:
> ngày 27/08 một file `.js` chưa commit trong gói Gemini làm cả hai cổng đỏ, tức phiên đang làm
> ChatGPT bị chặn vì việc của người khác.
>
> **"Ai đang giữ gì" thì đọc `node scripts/claim.mjs --list`, KHÔNG đọc `DASHBOARD.md`.** Bảng
> quyền đổi nhiều lần trong một buổi; nhét nó vào một artifact được commit thì mỗi lượt nhận/trả
> lại làm trang cũ đi.

## 4. Việc của người giữ một extension — checklist

Đây **không** phải vai mới. Hai vai của repo ở [`AGENTS.md`](AGENTS.md) mục 6, và **vai là của
PHIÊN chứ không của hãng** — hãng nào cũng đóng được vai nào. Danh sách dưới chỉ gọi tên bó
việc mà `AGENTS.md` đã bắt làm, để không ai quên nửa nào.

- [ ] `STATUS.md` khớp sự thật. Đặc biệt: `current_focus` có đúng là việc đang mở lớn nhất không.
- [ ] Khai "đã kiểm chứng" thì **kèm bằng chứng có thật**. Bộ sinh từ chối lời khai không bằng
      chứng — nó **đỏ**, không phải cảnh báo cho qua.
- [ ] Cột "Code đổi sau kiểm chứng?" hiện `CÓ` → hoặc kiểm chứng lại và cập nhật mốc, hoặc nói
      thẳng trong `current_focus` rằng lời khai đã cũ.
- [ ] Mọi file/thư mục mới → khai một dòng vào **Bản đồ file** trong `AGENTS.md` của gói.
- [ ] Mỗi bản vá kèm một phép ghim. **Không nới lớp bảo vệ đã có để cho test xanh.**
- [ ] Quyết định mới của Đức → **một ADR** (`docs/adr/` cho cả repo, `workers/<gói>/…/docs/adr/`
      cho một gói). Repo này **không dùng `decisions.md`**.
- [ ] Nhận và trả quyền **bằng lệnh** `claim.mjs`, không sửa `.agents/claims.json` bằng tay.

## 5. Thêm một extension mới

1. Dựng thư mục có `manifest.json`, đặt ở `workers/<tên>/<vX.Y.Z>/`.
2. Chép [`STATUS.template.md`](STATUS.template.md) → `STATUS.md`, đặt **cạnh `manifest.json`**, điền.
3. Khai `STATUS.md` vào **Bản đồ file** trong `AGENTS.md` của gói.
4. Mở khoá riêng cho gói: `node scripts/claim.mjs --khai-vung workers/<tên> --as <phiên>`.
5. `node scripts/build-dashboard.mjs` → nó **đỏ và nói rõ sai gì** nếu khai thiếu hoặc khai vào
   file ma. Xanh thì commit `DASHBOARD.md` sinh ra.
6. Gói có sổ tay riêng thì thêm một dòng vào bảng mục 7 của [`AGENTS.md`](AGENTS.md) gốc.

Bỏ bước 2 vẫn chạy được — extension sẽ hiện trên dashboard với nhãn **"CHƯA KHAI STATUS"**. Đó
là cố ý: quên khai thì lộ ra, không im lặng biến mất.

## 6. Còn nợ — một món, mức THẤP

**Khác hoa/thường trong `version_source` trên Windows** bị từ chối dù đường dẫn trỏ đúng chỗ.
**Fail-closed** nên không bao giờ sinh ra số sai, chỉ phiền người khai.
