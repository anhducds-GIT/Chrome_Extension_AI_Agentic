# GÓI VIỆC CODEX — A · Ba luồng chuỗi chạy song song trên ba sub-profile

> Gói này là **toàn bộ** bối cảnh. Đừng đọc thêm file nào để "hiểu dự án".
> Người đặt hàng: Đức. Người soạn gói: lane `claude-gpt-chay-het-job`, 12/09/2026.
> Tên lane đề nghị cho bạn: **`codex-song-song-3-luong`**.

## Đức muốn gì, nguyên văn

> *"Trong script để bắt GPT, tôi muốn add thêm cả trường sub profile: tab đang mở. Bởi vì ta
> đã từng xây dựng tính năng tối đa 3 sub profile, do đó sẽ có tối đa 3 phiên GPT sẽ cùng chạy
> script. → tôi nghĩ ta cần 3 luồng script chạy được song song."*

## Đã đo sẵn cho bạn — đừng đo lại

| câu hỏi | trả lời đo được | nguồn |
|---|---|---|
| Host có chặn 3 lượt song song không? | **Không.** `MAX_INFLIGHT = 32` toàn cục, 3 luồng dùng 3. | `bridge-host.mjs:9,391` |
| Host có định tuyến theo profile không? | **Có.** Ghế theo `instance_id`, lượt của profile khác không đụng nhau. | `bridge-host.mjs:159-163,215` |
| `--target` đã có chưa? | **Có rồi**, cả ở `chuoi-reasoning.mjs` lẫn `bridge-cli.mjs`. | `chuoi-reasoning.mjs:300,384` |
| `chon-profile.mjs` đã hỏi được tab đang mở chưa? | **Có** — `system.ping` trả `result.chatgpt.url`. | `chon-profile.mjs:186-196` |

**⇒ Bridge và host KHÔNG phải sửa. Đừng đụng vào `bridge-host.mjs` và `bridge-cli.mjs`.**
Toàn bộ việc nằm ở lớp bộ chạy chuỗi và lớp vỏ `.bat`.

## Bốn lỗ hổng thật, đã xác minh trong mã

### ⑴ Khoá "một bản chạy" đang khoá NHẦM KHOÁ — nguy hiểm nhất

`chuoi-reasoning.mjs:357` tạo `DANG-CHAY.json` trong **thư mục nhật ký**, mà thư mục nhật ký
lấy tên từ `--nhan`. Nên **hai chuỗi khác tên vẫn chồng lên nhau trên cùng một profile**.
Chính `chay-chuoi.bat` đã tự thú: *"Khoa hien chi khoa theo thu muc nhat ky (B-64), nen hai
chuoi khac ten van chay chong len nhau duoc."*

Vì sao chồng lên nhau là hỏng — đọc nguyên văn khối B-61 ở `chuoi-reasoning.mjs:357`:
đọc-lại-thấy-đã-bay chứng minh **MỘT** lượt gửi đã bay, **không** chứng minh **LƯỢT CỦA TÔI**
đã bay. Một tiến trình thì hai câu đó trùng nhau; hai tiến trình thì không.

**Phải sửa thành:** khoá theo **cặp (profile, hội thoại)**, không theo thư mục nhật ký.
Ba profile khác nhau ⇒ ba khoá khác nhau ⇒ chạy song song được. Hai chuỗi khác tên trỏ cùng
một profile+hội thoại ⇒ đụng khoá ⇒ bản thứ hai thoát mã 3, đúng như hôm nay.

Giữ nguyên `wx` — đó là phép kiểm-và-tạo nguyên tử của hệ tệp, và nó là lý do khoá này đúng.
Giữ nguyên việc trả khoá ở `exit`/`SIGINT`/`SIGTERM`.

Lưu ý: hội thoại chỉ biết được sau **lượt đọc đầu** khi không khai `--url`. Nên khoá hai thì:
khoá theo profile ngay lúc khởi động, rồi siết thêm hội thoại khi ghim được. Đừng để một
khoảng trống nào mà hai bản chạy cùng lọt qua.

### ⑵ `lan-truoc.txt` là MỘT tệp dùng chung — ba luồng ghi đè nhau

`chuoi-reasoning.mjs:411` ghi `lan-truoc.txt` ở **gốc** kho nhật ký. Ba luồng chạy cùng lúc
thì luồng cuối thắng, và lần sau Đức mở `chay-chuoi.bat` sẽ thấy thông số của **nhầm profile**
— rồi bấm Enter "dùng lại thông số này" và chạy vào nhầm chỗ.

**Phải sửa thành:** một tệp cho mỗi profile, ví dụ `lan-truoc-<target>.txt`.
`chay-chuoi.bat` đọc theo profile đang chọn. Giữ nguyên bộ lọc `sachChoBat` (`% ! " CR LF`) —
tệp này do một cái tên người gõ đẻ ra, và sinh mã chạy được từ chữ người gõ là cửa tiêm lệnh.
Giữ nguyên dạng `khoá=giá trị`, **không** sinh ra `.cmd`.

### ⑶ Trường Đức xin: sub-profile ↔ TAB ĐANG MỞ

Hôm nay `chon-profile.mjs` hỏi tab đang ở đâu **chỉ cho profile đã chọn**, và hỏi **sau khi**
đã chọn (`batUrl`, dòng 186). Đức muốn thấy nó **trong menu, cho mọi profile, trước khi chọn**
— vì với 3 profile cùng nối, "profile nào" và "tab nào" là **một câu hỏi**, không phải hai.

**Phải sửa thành:** menu hiện mỗi dòng là `<số>. <nhãn profile> — đang ở <hội thoại|chưa phải
hội thoại|không hỏi được>`.

Ba ràng buộc **không được phá**:

- `system.ping` có thể hết giờ. Ping hỏng cho một profile thì dòng đó ghi "không hỏi được"
  và menu **vẫn hiện đủ** — đừng dựng một cửa bắt buộc trên một RPC có thể hết giờ, comment
  ở `chon-profile.mjs:183` đã nói đúng điều này.
- Ping cả 3 profile thì làm **song song**, đừng nối tiếp — 3 lần hết giờ nối tiếp là Đức ngồi
  chờ 90 giây trước một cái menu.
- Giữ `--tu-kiem` xanh. Nó nằm trong `npm test` (`chon-profile.mjs --tu-kiem`).

### ⑷ Chưa có cách khởi động 3 luồng

Cần một vỏ mới (đề nghị `chay-3-luong.bat`, cạnh hai tệp `.bat` hiện có) làm đúng việc này:
hỏi/nhận danh sách profile, rồi mở **một cửa sổ riêng cho mỗi luồng**, mỗi luồng một thư mục
nhật ký riêng, mỗi luồng một `--target` riêng.

`dung-chuoi.bat` phải dừng được **tất cả** (đặt cờ `DUNG` vào mọi thư mục nhật ký đang chạy).
Giữ nguyên nguyên tắc **đặt cờ, không giết tiến trình** — bộ chạy có thể đang ở giữa một lượt
gửi, và giết ngang thì không ai biết tin nhắn đã bay chưa.

**Luật viết `.bat` ở repo này, đã trả giá thật — chép lại kẻo tái phạm:**
- **Không dùng khối ngoặc** `( … )` quanh `if`: trong khối, biến bành trướng lúc **phân tích**,
  trước khi `call` chạy, nên `%ERRORLEVEL%` luôn ra 0. Đã hỏng thật.
- **Ngoặc kép mọi `echo` có đường dẫn.** Tên chuỗi của Đức có `&` (*"HNX audit & fill"*), và
  `cmd` đọc `&` là dấu nối lệnh. Đã hỏng thật 12/09.
- `pause` / `set /p` làm mất `errorlevel` — giữ lại mã thật trước khi gọi chúng.

### ⑸ Bộ chạy PHỚT LỜ một HARD_STOP tiện ích đã khai — bắt tại trận 12/09

Quan sát live lúc 05:31–05:37Z, chuỗi *"Mo rong Scouter"* trên profile `kaito`:
`chat.read` hỏng liên tục, bộ chạy in *"đọc hỏng 41 lượt liên tiếp (INTERNAL_ERROR) — chưa rõ
vì sao"* và **cứ 4 giây thử lại**. `system.ping` cùng lúc trả lời **ngay** và nói rõ:

```json
{"state":"HARD_STOP","failure_type":"RECEIVER_LOST","composer_found":false,"url":null,
 "halt_instruction":{"retry":"No -- hard stop, whole batch stops",
   "meaning":"The extension lost its connection to the ChatGPT tab, composer, or content receiver."}}
```

Tiện ích **nói thẳng là đừng thử lại** — nguyên văn: *"auto-retrying would just fail every
remaining job in the queue back-to-back without producing anything."* Bộ chạy không đọc trường
đó. Nó có nhánh riêng cho `WRONG_SURFACE` (dòng ~440) mà **không có nhánh nào cho
`RECEIVER_LOST` / `state: HARD_STOP`**, nên nó đốt trọn 60 phút ngân sách vào một lỗi tiện ích
đã phân loại là **chết cứng**: 60 phút ÷ 4 giây ≈ **900 lượt đọc**.

Ba việc phải sửa, **cả ba đều nhỏ**:

- **Hỏi `system.ping` khi đọc hỏng lặp lại**, không chỉ khi `WRONG_SURFACE`. Ping là cửa duy
  nhất còn trả lời ở trạng thái này — chính nó vừa chứng minh điều đó. Ngưỡng đề nghị: sau 3
  lượt đọc hỏng liên tiếp.
- **`state === "HARD_STOP"` ⇒ DỪNG**, in nguyên văn `halt_instruction.meaning` và
  `halt_instruction.retry`, ghi nhật ký, thoát. Đừng dịch lại, đừng đoán hộ — tiện ích đã viết
  sẵn câu tiếng Việt trong đó.
- **Giãn nhịp thử lại.** 4 giây phẳng, không trần, không giãn dần. Đề nghị giãn dần tới ~30
  giây và **trần số lượt đọc hỏng liên tiếp**, độc lập với trần phút.

**Và in `details.debug`.** `sidepanel.js:707` cố ý gửi nguyên nhân thật cho agent nội bộ qua
`error.details.debug`; bộ chạy chỉ in `diagnosis` + `remedy` nên **vứt đúng câu trả lời đi**,
rồi in "chưa rõ vì sao". Thêm `debug` vào dòng in đó.

### ⑹ Lượt đọc hỏng KHÔNG được ghi nhật ký

Sau 5 phút hỏng liên tục, `nhat-ky.jsonl` có **đúng một dòng** `BAT_DAU`. Bộ chạy ghi
`SAI_TRANG`, `CANH_TAB`, `BAT_DAU` — nhưng **không ghi lượt đọc hỏng**. Nên nhìn nhật ký thì
một bản chạy đang nện 900 lượt **không phân biệt được** với một bản chạy đã treo chết. Đó đúng
là câu hỏi Đức từng hỏi, và nhịp tim in ra màn hình không cứu được: đóng cửa sổ là mất.

Ghi một dòng `DOC_HONG` — **có tiết chế**, cùng nhịp với dòng in màn hình (lượt 1, 11, 21…),
đừng ghi cả 900 dòng. Kèm `code`, `diagnosis`, `debug`, và `docHong`.

## ĐÃ ĐO XONG 12/09 — trần vật lý là CÓ THẬT, và nó ở lớp thấp hơn tôi tưởng

Ping ba profile, ba lượt, xen kẽ:

```
lượt 1   kaito KHÔNG trả lời 10466ms · anhducds KHÔNG trả lời 10278ms · Ark trả lời  283ms
lượt 2   kaito trả lời        237ms · anhducds KHÔNG trả lời 10270ms · Ark trả lời  233ms
lượt 3   kaito KHÔNG trả lời 10260ms · anhducds trả lời      8533ms · Ark trả lời  241ms
```

Đọc ra ba điều:

- **10,26–10,47 giây là một TRẦN CỨNG, không phải độ tản.** Nguồn: `deadline_ms` mặc định
  `10000` ở `bridge-transport-loopback.js:164`.
- **`Ark` luôn trả lời trong ~240ms** — vì nó **không có tab ChatGPT** nào để soi. Panel khoẻ;
  cái chậm là lượt **với tới tab**.
- **`kaito` và `anhducds` lật qua lật lại** giữa ~240ms và hết giờ. Lượt 8533ms của `anhducds`
  cho thấy nó không nhị phân — nó **chậm**, và đôi khi chậm quá hạn.

**Ba profile là ba cửa sổ Chrome, và chỉ một cửa sổ ở tiền cảnh.** Nên với 3 luồng song song,
**hai luồng bất kỳ lúc nào cũng đang đọc một tab bị bóp**, và mỗi lượt đọc của chúng tốn trọn
10 giây rồi trả về hết giờ. Đây chính là phép đo 11/09 (*"tab bị che thì chữ đứng im"*) hiện ra
ở tầng thăm dò.

**Hệ quả cho gói này, nói thẳng:** 3 luồng song song **không** nhanh gấp 3. Có thể còn **chậm
hơn** chạy nối tiếp, vì hai luồng nền sẽ đốt ngân sách phút vào những lượt đọc hết giờ.

Trước khi viết một dòng mã song song nào, **phải trả lời câu này**: nâng `deadline_ms` cho lượt
ĐỌC (ví dụ 25 giây) thì tab nền có trả lời được không? Nếu có thì song song khả thi; nếu không
thì nó không khả thi ở kiến trúc này, và **báo Đức điều đó có giá hơn là viết ra một tính năng
trông chạy được**. Đừng đụng `deadline_ms` của `chat.say` (30000) — xem lý do ở mục ⑸.

## Cái trần vật lý — ĐO, đừng đoán, và báo số

`chay-chuoi.bat` ghi một phép đo live ngày 11/09: tab **hiện** thì chữ chạy 13 → 909 → 1096
ký tự trong 5 giây; tab **bị che** thì **đứng im ngay**. Chrome bóp đường stream của tab nền.

Ba profile là ba cửa sổ Chrome, và **chỉ một cửa sổ được ở tiền cảnh**. Nên 3 luồng song song
**không** nhanh gấp 3. Bộ chạy vẫn chạy được (nó nạp lại để đọc), nhưng mỗi vòng của luồng
nền tốn thêm một lượt nạp lại.

**Việc của bạn:** đo thật, và báo lại con số *"3 luồng song song xong N vòng trong T phút,
so với 3 lượt nối tiếp là T′ phút"*. Nếu số đo nói song song **không** thắng, hãy nói thẳng —
báo một kết quả xấu đúng sự thật có giá hơn một tính năng trông đẹp.

## Ba cửa phải hỏi Đức, không được tự đi qua

1. **Chạy live trên trang thật.** Gói này viết mã và chạy test **khô**. Muốn chạy thật 3 luồng
   trên chatgpt.com thì **hỏi Đức trước** — đó là một pilot live mới.
2. **Xoá file.** Không xoá gì. Có file thừa thì báo.
3. **Đổi một luật an toàn** (trần vòng `TRAN_VONG = 30`, quy tắc không tự gửi lại, khoá
   một-bản-chạy, exact-once `--request-id`). Thấy cần đổi thì **dừng và hỏi**.

## Luật repo bạn phải theo

```bash
node scripts/claim.mjs --take workers/duc-auto-chatgpt --as codex-song-song-3-luong --task "3 luồng chuỗi song song + trường tab theo profile"
```

- Vùng của lane khác là **CHỈ ĐỌC**.
- `--soat` **bắt buộc** trước mỗi `git commit`:
  `node scripts/claim.mjs --soat --as codex-song-song-3-luong`
- Mọi commit kết bằng hai dòng: `Lane: codex-song-song-3-luong` và dòng `Co-Authored-By:` của bạn.
- **Không bao giờ** `git push` trần. Chỉ `node scripts/safe-push.mjs --as codex-song-song-3-luong`.
- **Không bao giờ** `git checkout` / `reset` / `stash` lên file trạng thái sống, nhất là
  `.agents/claims.json`. Muốn xem bản cũ thì `git show HEAD:<file>`.
- Kho này **CÔNG KHAI**: không token, không mật khẩu, không tệp ghép cặp lọt vào repo. Đường
  dẫn ghép cặp nằm ở biến môi trường `DUC_PAIRING`, đừng gõ cứng vào mã.
- Trả khoá khi xong: `node scripts/claim.mjs --release workers/duc-auto-chatgpt --as codex-song-song-3-luong`

## Nghiệm thu — bạn tự chạy, máy chấm

Mỗi thay đổi hành vi phải có **phép ghim**, và phép ghim phải qua **đột biến kiểm**: bẻ dòng
mã mà nó canh, chạy lại, bài **phải đỏ**. Bài không đỏ khi bị bẻ là bài vô nghĩa.

**Cảnh báo đã trả giá:** nếu mỏ neo đột biến không khớp, lượt "đã đột biến" thật ra **chưa đột
biến**, và nó in ra "XANH — không bắt được" trông y hệt một phép kiểm yếu. **Đếm số lần mỏ neo
khớp, khớp 0 lần thì báo hỏng**, đừng đọc kết quả.

```bash
node workers/duc-auto-chatgpt/v0.1.0/tests/run-all.mjs     # phải 136/136 trở lên
node workers/duc-auto-chatgpt/v0.1.0/duc-auto-chatgpt-loopback-bridge-host-v1/chon-profile.mjs --tu-kiem
npm test                                                    # phải thoát 0
node scripts/check-bootstrap.mjs                            # CHAN: không có
node scripts/session-check.mjs --as codex-song-song-3-luong
```

**Một suite nặng một lúc.** Chạy hai suite cùng lúc trong một worktree thì git đụng nhau và
cổng báo `GIT_HONG` — đỏ giả. Đỏ thì chạy lại **một mình** trước khi tin.

## Tự audit — và vì sao nó không phải tự ký nghiệm thu

Luật repo: **"KHÔNG ĐƯỢC TỰ KÝ NGHIỆM THU BẢN SỬA CỦA CHÍNH MÌNH."** Nên "Codex tự audit"
được làm bằng **hai ghế tách rời**, không phải bằng việc bạn tự chấm mình:

- **Ghế 1 (bạn, người viết):** chạy hết các cổng máy ở trên. Cổng máy là **máy chấm**, không
  phải bạn chấm — nên nó hợp lệ.
- **Ghế 2 (một phiên Codex MỚI, bối cảnh sạch):** phiên đó **chỉ đọc `git diff`**, không đọc
  lịch sử chat của bạn, và trả lời đúng bảng dưới. Phiên đó không sửa gì; nó chỉ phán.

Câu hỏi cho ghế 2 — trả lời **ĐẠT / KHÔNG ĐẠT + một câu lý do**, không viết văn:

| # | câu hỏi |
|---|---|
| 1 | Khoá một-bản-chạy có khoá theo **(profile, hội thoại)** không, hay vẫn theo thư mục nhật ký? |
| 2 | Có khoảng trống nào giữa lúc khởi động và lúc ghim hội thoại mà **hai bản chạy cùng lọt** không? |
| 3 | `wx` còn nguyên không? Khoá còn được trả ở `exit`/`SIGINT`/`SIGTERM` không? |
| 4 | Ba luồng ghi `lan-truoc` có đè lên nhau nữa không? Bộ lọc `% ! " CR LF` còn không? |
| 5 | Menu có hiện tab đang mở cho **mọi** profile không? Ping hỏng một profile thì menu **còn hiện đủ** không? |
| 6 | Ping 3 profile có chạy **song song** không, hay nối tiếp? |
| 7 | `TRAN_VONG`, quy tắc không-tự-gửi-lại, `--request-id` exact-once — có cái nào bị đổi không? |
| 8 | Có phép ghim mới nào **không đỏ** khi bẻ dòng mã nó canh không? Mỏ neo đột biến khớp mấy lần? |
| 9 | Có `.bat` nào dùng khối ngoặc quanh `if`, hoặc `echo` đường dẫn không ngoặc kép không? |
| 10 | Có token / mật khẩu / đường dẫn ghép cặp nào lọt vào repo không? |

## Báo cáo cuối — viết tiếng Việt CÓ DẤU, gửi Đức

Đúng sáu mục, không hơn:

1. **Làm được gì** — mỗi lỗ hổng ⑴⑵⑶⑷ một dòng.
2. **Số đo song song** — N vòng, T phút song song so với T′ phút nối tiếp. Không đo được thì
   nói không đo được, đừng đoán.
3. **Bảng 10 câu của ghế 2**, nguyên văn.
4. **Cổng máy** — dán dòng phán quyết cuối của từng lệnh nghiệm thu.
5. **Chỗ tôi không chắc** — thứ bạn đoán chứ không đo được.
6. **Cần Đức chốt gì** — nếu có. Không có thì ghi "không".

Đức sẽ đọc báo cáo này và quyết. **Không tự chạy live, không tự merge, không tự push quá
`safe-push`.**
