---
kind: study
status: active
ttl_days: 60
---

# Chạy nhiều việc song song — khảo sát và phương án (Y-02)

> **Trạng thái:** khảo sát xong, **chờ Đức chốt phương án cho vấn đề 2.**
> Vấn đề 1 tôi làm được ngay, không cần Đức chốt.
>
> Viết vì Đức nói: *"tôi có rất nhiều ý tưởng & muốn triển khai song song, do đó cần xây dựng
> protocol để cùng lúc làm nhiều thứ & mỗi AI hiểu phải làm gì, cập nhật & constrain gì.
> Tôi không thể làm lần lượt từng thứ một vì không đủ thời gian."*

## 1. Đo được gì — ngày 2026-09-02

| Số đo | Giá trị |
|---|---:|
| Commit vào `main` trong một ngày | **127** |
| Hai commit liền nhau đổi sang vùng khác | **50 lần — 39%** |
| **Commit có chạm `_root`** | **98 / 127 — 77%** |
| Lần ghi `.agents/claims.json` trong ngày | **63** |
| Nhãn phiên khác nhau từ 01/09 | **21** |

Và va chạm tôi tự hứng trong một buổi: **1 lần quyền bị ghi đè**, **3 lần `safe-push` từ chối**.

## 2. Hai vấn đề KHÁC NHAU — gộp lại là chữa sai bệnh

Tôi vào việc này với phỏng đoán *"gốc là một thư mục một nhánh"*. Số đo cho thấy phỏng đoán đó
**đúng một nửa**, và nửa còn lại là chuyện khác hẳn. Ghi ra để không ai gộp lại lần nữa.

### Vấn đề 1 — Quyền bị ghi đè. Đây là một BUG.

`claims.json` được nhận quyền bằng **đọc → sửa → ghi** thủ công. Không có gì chặn hai phiên
cùng đọc thấy "trống" rồi cùng ghi tên mình: **người ghi sau thắng, người ghi trước không hề
biết**. Hôm nay tôi là người bị ghi đè.

Nghịch lý đáng nói: `claims.json` sinh ra để chống tranh chấp, mà **chính nó là tài nguyên bị
tranh chấp** và không được bảo vệ. 63 lần ghi trong một ngày.

### Vấn đề 2 — Push cuốn theo commit người khác. Đây KHÔNG phải bug.

Đây là **hệ quả toán học của một nhánh**: lịch sử git là một đường thẳng. Nếu commit của phiên
Y nằm **trước** commit của tôi, thì không có cách nào đẩy commit của tôi mà không đẩy của họ.
Không phải lỗi của `safe-push` — nó đang báo đúng.

**Và đây là chỗ tôi phải đính chính chính mình:** tôi đã định đề xuất "tách `_root` thành vùng
nhỏ hơn" để chữa cả hai. Sai. Tách vùng làm **giảm tranh chấp QUYỀN**, nhưng commit vẫn nằm
trên cùng một nhánh nên **push vẫn cuốn theo y như cũ**. Hai vấn đề, hai lời giải.

## 3. Vì sao `_root` chạm 77% commit — và điều đó nói gì

`_root` không phải "điểm nóng tình cờ". Nó là **cửa ải mọi phiên đều phải đi qua**: cổng đóng
phiên bắt sinh lại bốn trang máy sinh, mà bốn trang đó nằm ở gốc repo.

Nghĩa là: **một phiên chỉ sửa code trong một gói vẫn buộc phải nhận `_root`** ở cuối, chỉ để
ghi lại mấy file mà máy tự sinh. Tranh chấp đó là **nhân tạo** — nội dung bốn file ấy tất định,
suy ra được từ HEAD, không ai "sở hữu" nó theo nghĩa nào cả.

Lược đồ `areas` đã có sẵn khái niệm `ownership_mode` với hai giá trị `root` và `per-package`.
Thêm một giá trị thứ ba cho **thứ máy sở hữu** là mở rộng tự nhiên, không phải phát minh.

## 4. Phương án cho vấn đề 1 — làm được ngay, không cần Đức chốt

**A1 · Nhận quyền bằng một lệnh, và lệnh đó TỪ CHỐI nếu đã có chủ.**

Thay `node -e "…"` thủ công bằng `node scripts/claim.mjs --take <khoá> --as <phiên>`:
đọc, kiểm, ghi trong một lần; đã có chủ khác thì **thoát khác 0 và không ghi gì**.

| | |
|---|---|
| Giá | ~40 dòng + phép kiểm ghim. Không đổi luật an toàn |
| Được | Xoá sạch cả một lớp lỗi — lớp mà hôm nay đã xảy ra thật |
| Không được | Không giúp gì cho vấn đề 2 |

Nó không chống được đua tuyệt đối (hai lệnh chạy đúng cùng một micro-giây vẫn có thể chồng),
nhưng cửa sổ thu từ *"vài phút giữa lúc tôi đọc và lúc tôi ghi"* xuống *"vài mili-giây"*. Đó là
khác biệt giữa **thỉnh thoảng xảy ra** và **thực tế không xảy ra**.

## 4b. Phương án A2 — tách `_root` thành nhiều khoá. **Học được từ việc bị chặn thật.**

> Thêm vào 19:2x ngày 02/09, sau khi chính tôi bị chặn không ghi được tài liệu NÀY vào repo.
> Hai việc đã xong nằm chờ, chỉ vì một khoá.

**Chuyện xảy ra:** Đức cho phiên `claude-surface-fix` mượn `_root` để sửa 7 phát hiện của audit
độc lập K1. Đúng việc, đúng luật, phiên đó đang làm thật. Nhưng họ chỉ cần `scripts/` và
`STATUS.template.md` — còn tôi chỉ cần `docs/`. **Hai việc không hề chồng nhau, mà một khoá
chặn cả hai.**

**Số đo giải thích tại sao 77%:** khối `areas` trong `.repo-structure.json` **đã có** trường
`steward` riêng cho từng thư mục — lược đồ đã lường trước chuyện này. Nhưng cả **bảy** thư mục
gốc đều khai `steward: "_root"`. Nên `_root` không phải "một vùng"; nó là **bảy vùng bị bó vào
một cái khoá**.

| Đề nghị | Khoá |
|---|---|
| `docs/` | `_docs` — tài liệu, nghiên cứu, ADR |
| `scripts/` + `tests/` | `_code` — bộ máy và suite của gốc repo |
| `template/` | `_template` — bộ trích, vốn đã là chuyện riêng |
| còn lại + file gốc | `_root` |

| | |
|---|---|
| Giá | Sửa `areas` + thêm khoá vào `claims.json` + cổng kiểm phạm vi đọc theo `steward`. **Không đổi luật an toàn** |
| Được | Xoá phần lớn tranh chấp QUYỀN. Hôm nay nó sẽ xoá đúng cái đang chặn |
| Không được | **Không giúp gì cho vấn đề 2.** Commit vẫn trên một nhánh, push vẫn cuốn theo |
| Rủi ro | Tách quá nhỏ thì thành thủ tục: một phiên phải nhận bốn khoá. Nên chỉ tách theo đường **đã có trong `areas`**, đừng bịa thêm |

**Điểm quan trọng:** A2 rẻ hơn B4 rất nhiều, và nó chữa cái **đang** đau. B4 chữa cái đau **khi
push**. Hai cái đau khác nhau, đừng bắt một phương án chữa cả hai — đó đúng là lỗi tôi mắc ở
đầu tài liệu này.

## 5. Phương án cho vấn đề 2 — CẦN ĐỨC CHỐT

### B1 · Giữ nguyên: Đức duyệt `--carry` khi cần

| | |
|---|---|
| Giá | Hôm nay: **3 lần** xin duyệt. Không viết một dòng code nào |
| Được | Đức luôn thấy chính xác đang đẩy việc của ai |
| Không được | Tần suất tăng theo số phiên chạy song song. Sáu phiên thì sẽ nhiều hơn ba lần |

### B2 · Đẩy ngay khi xong, thu nhỏ cửa sổ

Đã là chính sách. Va chạm xảy ra vì phiên khác **giữ commit chưa đẩy** trong lúc tôi làm.

| | |
|---|---|
| Giá | Không |
| Được | Giảm tần suất |
| Không được | **Không xoá được vấn đề.** Phụ thuộc mọi phiên cùng kỷ luật, mà điều đó không kiểm được bằng máy |

### B3 · Mỗi phiên một nhánh + một thư mục làm việc riêng

Git có sẵn (`git worktree`). Push sạch tuyệt đối, **không bao giờ cuốn theo ai**.

| | |
|---|---|
| Được | Xoá hẳn vấn đề 2 |
| Giá 1 | **Gộp nhánh vào `main` là việc luật bắt phải hỏi Đức.** Đổi "3 lần duyệt carry" thành "N lần duyệt gộp" — **có thể nhiều việc hơn cho Đức, không ít hơn** |
| Giá 2 | `claims.json` thành mỗi nhánh một bản → mô hình quyền sở hữu phải nghĩ lại từ đầu |
| Giá 3 | Mỗi thư mục làm việc là một bản sao |

**Tôi không khuyên B3 một mình.** Nó là câu trả lời sách vở, nhưng phép tính về công của Đức
đi ngược mục tiêu.

### B4 · Nhánh riêng + gộp tự động có điều kiện ⭐

Như B3, nhưng gộp vào `main` **tự động** khi đủ ba điều: nhánh chỉ chạm vùng mình đã nhận ·
cổng đóng phiên xanh · gộp là tiến thẳng, không xung đột.

| | |
|---|---|
| Được | **Không carry, và cũng không phải duyệt gộp.** Zero công của Đức ở trạng thái bình thường |
| Giá 1 | **Đức phải duyệt MỘT LẦN cho cái luật này** — nó là "tạo automation tự chạy", luật hiện bắt hỏi |
| Giá 2 | Viết thật: khoảng một phiên làm việc, cộng phép kiểm ghim cho nhánh "gộp mà xung đột thì DỪNG" |
| Giá 3 | Vẫn phải giải bài `claims.json` mỗi nhánh một bản như B3 |

### Bảng chọn

| | Xoá vấn đề 2? | Công của Đức sau khi làm | Giá thực thi |
|---|---|---|---|
| **B1** giữ nguyên | Không | ~3 lần duyệt/ngày, tăng theo số phiên | Không |
| **B2** đẩy ngay | Không, chỉ giảm | Ít hơn B1, không đoán được bao nhiêu | Không |
| **B3** nhánh riêng | **Có** | Duyệt gộp mỗi lần — **có thể tệ hơn B1** | Trung bình |
| **B4** nhánh + gộp tự động | **Có** | **Gần như không** | Một phiên, và một lần Đức duyệt luật |

## 6. Khuyến nghị

**ĐÃ ĐỔI KHUYẾN NGHỊ 19:2x — vì tôi bị chặn thật trong lúc viết tài liệu này.**

**Làm A1 + A2** — cả hai sửa cái đang đau, rẻ, không đụng luật an toàn:

- **A1** xoá lớp lỗi "quyền bị ghi đè" (đã xảy ra thật hôm nay)
- **A2** xoá phần lớn tranh chấp quyền, kể cả cái đang chặn ngay lúc này

**Cho vấn đề 2 (push cuốn theo): B1 bây giờ, B4 sau.**

Bản đầu tôi viết *"B4 khi vượt ba phiên"*. Hôm nay **đã bốn phiên** — nhưng tôi vẫn xếp B4 sau
A2, vì A2 rẻ hơn nhiều lần và chữa cái đau **thường xuyên hơn**: quyền bị chặn xảy ra mỗi lần
hai phiên cùng cần gốc repo, còn push chỉ đau lúc đẩy. Làm cái rẻ và hay đau trước.

**Việc cần Đức:** một câu — *làm A1 + A2 luôn không?* (A1 không cần duyệt; A2 đụng khối `areas`
nên nó là chuyện cấu trúc, tôi muốn Đức biết trước khi sửa.)

## 7. Việc còn thiếu mà chưa phương án nào chạm tới

Đức muốn *"mỗi AI hiểu phải làm gì, cập nhật gì, constrain gì"*. Ba phần đó **đã có chỗ ở** rồi,
đừng dựng lại:

| Cần gì | Đã có ở đâu |
|---|---|
| làm gì | `IDEAS.md` → trường `việc kế` |
| constrain gì | `IDEAS.md` → trường `phạm vi` (bắt buộc khi bậc `đang xây`) |
| cập nhật gì | `AGENTS.md` mục 7 — đóng phiên ghi lại 3 thứ |
| ai đang làm | `IDEAS.md` → trường `chủ`, hiện trên bảng trạng thái |

**Cái thật sự còn thiếu là một chỗ nhìn tổng:** hiện phải mở `claims.json` mới biết ai giữ gì,
và `claims.json` **cố ý không được chép vào trang máy sinh** (nó là trạng thái sống, chép vào
thì trang mục theo từng lần nhận/trả quyền).

Đó là một bài thiết kế nhỏ còn mở, **không** thuộc A1 hay B1–B4.
