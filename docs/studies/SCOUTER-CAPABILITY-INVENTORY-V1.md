---
kind: study
status: active
ttl_days: 120
---

# Kiểm kê năng lực trước khi xây Scouter — V1

> Đề bài: `BRIEF-SCOUTER-INVENTORY-01` — **xoá khỏi cây làm việc 2026-09-08** (không gì ngoài
> mục lục trỏ tới nó); đọc lại: `git show 522a22400fd3:docs/briefs/BRIEF-SCOUTER-INVENTORY-01.md`.
> Quyết định gốc: [ADR-0009](../adr/0007-scouter.md) mục ⑺.
> Đo ngày **2026-09-06** bởi phiên `claude-scouter-kk`. Không viết một dòng code nào.
>
> **Mọi con số trong file này do tôi tự chạy lệnh mà ra.** Không con số nào chép từ
> `FEATURE-PARITY.md`, `DASHBOARD.md`, hay tài liệu cũ trong repo — luật 3 của brief.

## Câu hỏi

Scouter đáng xây tới đâu? Để trả lời được, phải biết hai thứ trên **một danh sách đếm được**:
ba worker đang có gì (trục A), và Chrome cho phép gì mà repo này chưa hề chạm tới (trục B).

---

## Đọc bảng này thế nào — bốn loại dòng, tin được KHÁC NHAU

| Ký hiệu | Nghĩa | Tin được tới đâu |
|---|---|---|
| **[ĐO]** | Máy đếm được, tôi tự chạy lệnh | Chắc |
| **[ĐỌC]** | Tôi mở file ra đọc thẳng thân hàm | Chắc |
| **[TL]** | Đọc tài liệu Chrome hiện hành (06/09/2026) | Chắc về *Chrome cho phép gì*, chưa chứng minh trong repo này |
| **[DÒ]** | Tìm theo tên hàm / tên hằng | **CÓ THỂ SAI — phải kiểm lại trước khi hành động** |

**Ba lần công cụ đo của chính tôi báo sai trong buổi này**, ghi ra để người sau đừng tin số mù:

1. Đếm `chrome.alarms` ra **0** ở cả ba worker → sai. Ba worker gọi qua tham số được bơm vào
   (`chromeApi.alarms`, `alarms.create`), không gọi thẳng `chrome.alarms`. Sửa regex mới ra 12.
2. Đếm method Bridge: ba file tạm bị **trùng tên** (`basename` của hai đường dẫn đều là `v0.1.0`),
   nên hợp của ba tập ra 21 trong khi một tập đã có 23. Sửa tên file mới ra 25.
3. Dò khoá tab ở nhánh ChatGPT ra **0 file** → sai. ChatGPT **có** khoá tab, nhưng nằm thẳng
   trong `sidepanel.js` dưới tên `boundTabId`, không tách thành core riêng.

Cả ba đúng bằng luật 2 của brief: **đếm ra 0 thì nghi công cụ trước, đừng kết luận.**

---

## Việc này đứng trên vai gì — và cái gì ở đây là MỚI

Repo đã có **17 file nghiên cứu** về năng lực trình duyệt, viết ngày 28/08: `EXP-02` → `EXP-15`,
`CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0`, `PHASE1-FACTUAL-CORRECTIONS-2026-08-28`, và bản tổng
hợp `PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0` (chia năng lực thành 5 mặt phẳng). **Đây không phải
việc làm lại.**

| Chỗ cần đào sâu | Mở file |
|---|---|
| Bấm bằng CDP khác bấm bằng JS chỗ nào | `EXP-14-INPUT-SEMANTICS-BROWSER-INPUT-REACH-STUDY-V0.md` (đã xoá 08/09 — `git show a3b67a96a92e:docs/studies/EXP-14-INPUT-SEMANTICS-BROWSER-INPUT-REACH-STUDY-V0.md`) |
| Cây trợ năng + DOMSnapshot + CSS | `EXP-12-ACCESSIBILITY-DOMSNAPSHOT-CSS-SEMANTIC-OBSERVATION-STUDY-V0.md` (đã xoá 08/09 — `git show a3b67a96a92e:docs/studies/EXP-12-ACCESSIBILITY-DOMSNAPSHOT-CSS-SEMANTIC-OBSERVATION-STUDY-V0.md`) |
| Bơm adapter động bằng `userScripts` | `EXP-09-USER-SCRIPTS-DYNAMIC-ADAPTER-DELIVERY-STUDY-V0.md` (đã xoá 08/09 — `git show a3b67a96a92e:docs/studies/EXP-09-USER-SCRIPTS-DYNAMIC-ADAPTER-DELIVERY-STUDY-V0.md`) |
| Tài liệu ẩn `offscreen` | `EXP-10-OFFSCREEN-BROWSER-PROCESSING-RUNTIME-STUDY-V0.md` (đã xoá 08/09 — `git show a3b67a96a92e:docs/studies/EXP-10-OFFSCREEN-BROWSER-PROCESSING-RUNTIME-STUDY-V0.md`) |
| Mạng: DNR / webRequest / CDP | `EXP-11-NETWORK-CONTROL-PLANE-DNR-WEBREQUEST-VS-CDP-STUDY-V0.md` (đã xoá 08/09 — `git show a3b67a96a92e:docs/studies/EXP-11-NETWORK-CONTROL-PLANE-DNR-WEBREQUEST-VS-CDP-STUDY-V0.md`) |
| Cookie / storage / IndexedDB của phiên đăng nhập | `EXP-07-AUTHENTICATED-SESSION-COOKIE-STORAGE-IDB-REACH-STUDY-V0.md` (đã xoá 08/09 — `git show a3b67a96a92e:docs/studies/EXP-07-AUTHENTICATED-SESSION-COOKIE-STORAGE-IDB-REACH-STUDY-V0.md`) |
| Khung con và target lồng nhau | `EXP-04-NESTED-FRAME-WORKER-TARGET-REGISTRY-STUDY-V0.md` (đã xoá 08/09 — `git show a3b67a96a92e:docs/studies/EXP-04-NESTED-FRAME-WORKER-TARGET-REGISTRY-STUDY-V0.md`) |
| Chụp bằng chứng | `EXP-13-EVIDENCE-CAPTURE-RUNTIME-STUDY-V0.md` (đã xoá 08/09 — `git show a3b67a96a92e:docs/studies/EXP-13-EVIDENCE-CAPTURE-RUNTIME-STUDY-V0.md`) |
| Bản tổng hợp 5 mặt phẳng | [PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0](PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md) |

**Ba thứ ở file này là mới, và đó là toàn bộ lý do nó tồn tại:**

1. **Đo repo, không đo Chrome.** Loạt EXP trả lời *"Chrome cho phép gì"*. **Không file nào đếm
   xem repo này thật sự dùng bao nhiêu.** Con số 7/34 và 3/27 ở mục 1.1 chưa từng có ở đâu.
2. **Trục A chưa từng được lập.** Chưa ai kiểm kê năng lực của ba worker theo kiểu "bóc ra dùng
   lại được sạch hay không", và chưa ai dùng **mã băm ba bản** làm bằng chứng cho câu đó.
3. **Chưa có bảng nào xếp ô `SEED` / `ADAPTER`.** Loạt EXP viết trước ADR-0009 nên chúng không
   biết đến ranh giới seed/adapter — ranh giới đó mới chốt ngày 06/09.

---

# PHẦN 1 — CHO ĐỨC ĐỌC

## 1.1 Trả lời thẳng câu Đức nêu

> *"Các extension worker mà ta đã build chỉ mới sử dụng một phần nhỏ của năng lực Extension."*

**Đúng. Ba worker đang dùng khoảng một phần năm những cửa Chrome mở cho một tác nhân duyệt web —
và cửa mạnh nhất thì gần như chưa mở.**

Cách đếm, vì con số này vô nghĩa nếu không nói đếm kiểu gì — **[ĐO]**:

| Đếm cái gì | Có bao nhiêu | Repo dùng | Tỉ lệ |
|---|---:|---:|---:|
| Nhóm API của Chrome Extension, chép từ trang tham chiếu chính thức 06/09 | 85 | 7 | ~8% |
| …bỏ đi nhóm không dính tác nhân duyệt web (ChromeOS · doanh nghiệp · máy in · giọng nói · devtools panel) | 34 | 7 | **~21%** |
| Miền của giao thức debug (CDP) mà Chrome mở cho extension | 27 | 3 | ~11% |
| Câu lệnh CDP thật sự chạy trong code sản phẩm | — | 7 | — |

Bảy nhóm đang dùng: `alarms` · `debugger` · `downloads` · `runtime` · `sidePanel` · `storage` · `tabs`.
Ba miền CDP đang dùng: `DOM` · `Runtime` · `Target` — và **cả ba chỉ có ở extension Observer ở gốc repo,
không có ở worker nào.**

**Một câu quan trọng hơn tỉ lệ:** con số 21% còn đang *nói tốt* cho ba worker. Thứ chúng thiếu
không phải là những nhóm API vặt, mà là **cách bấm nút**. Hôm nay ba worker bấm nút bằng
JavaScript giả lập sự kiện; Chrome có sẵn đường bấm bằng chuột và bàn phím thật của trình duyệt,
và **chưa dòng code sản phẩm nào trong repo dùng đường đó**.

## 1.2 Mười năng lực quan trọng nhất chưa có

Xếp theo giá trị với Scouter. Mỗi cái một câu, không thuật ngữ.

| # | Năng lực chưa có | Nó cho Scouter làm được gì mà hôm nay không làm được |
|---:|---|---|
| **1** | **Bấm và gõ như người thật** | Hôm nay extension "giả vờ" bấm bằng JavaScript. Trang nào kiểm tra kỹ là biết ngay và bỏ qua. Chrome có một đường khác: bấm qua chính đường chuột/bàn phím của trình duyệt. Đây là ranh giới giữa "chạy được vài trang" và "chạy được trang bất kỳ". **Chưa ai đo tận mắt** — xem 4.1, cần một phép thử nhỏ trước khi tin. |
| **2** | **Tự vào một trang mới mà không phải sửa file rồi cài lại** | Hôm nay mỗi worker chỉ chạy trên đúng danh sách trang gõ cứng trong `manifest.json`; thêm một trang là phải sửa file và nạp lại tiện ích. Scouter với `<all_urls>` bơm được code vào bất kỳ trang nào ngay lúc chạy. Không có cái này thì "một adapter một URL" của ADR-0009 không thể tự sinh ra. |
| **3** | **Đọc trang theo cách người khiếm thị đọc** | Chrome giữ sẵn một bản mô tả trang bằng *vai trò và tên nút* ("nút Gửi", "ô nhập lời nhắc") thay vì bằng class CSS rối rắm. Bản này ổn định hơn selector rất nhiều — trang đổi giao diện thì class đổi, nhưng "nút Gửi" vẫn là "nút Gửi". Đây là thuốc thật cho luật vàng số 1 "không đoán selector". |
| **4** | **Tự chụp màn hình trang** | Hôm nay muốn biết trang đang hiện gì thì phải nhờ mắt Đức. Scouter chụp được ảnh trang và cả ảnh riêng một nút — bằng chứng nhìn thấy được, không phải lời AI kể lại. |
| **5** | **Nghe được trang nói chuyện với máy chủ** | Hôm nay biết "trang xong chưa" bằng cách nhìn DOM đoán. Nghe được request/response thì biết chính xác lúc nào trang thật sự trả kết quả, và biết trang báo lỗi gì bên trong. Hết cảnh chờ mù 90 giây. |
| **6** | **Biết trang đã tải xong hay đang chuyển trang** | Hôm nay chờ bằng cách hỏi đi hỏi lại DOM. Chrome báo thẳng các mốc "bắt đầu tải · tải xong · chuyển trang", kể cả khung con bên trong. Chờ đúng mốc thì nhanh hơn và không bao giờ hớ. |
| **7** | **Chụp một phát toàn bộ cấu trúc trang** | Hôm nay lấy cây DOM phải gọi từng nút một, trang lớn là hàng trăm lượt gọi. Chrome có một lệnh trả về cả trang trong một lần. Nhanh hơn nhiều bậc, và là nguyên liệu tốt để sinh adapter. |
| **8** | **Có chỗ chạy nền không bị Chrome bóp** | Vòng chạy job hôm nay nằm trong bảng bên (side panel). Chrome bóp bộ đếm giờ của cửa sổ không nhìn thấy — đã đo thật ngày 28/08: khoảng nghỉ 12 giây biến thành ~11 phút. Chrome cho phép mở một trang nền ẩn không bị bóp. Đây là bệnh cũ có thuốc sẵn mà chưa uống. |
| **9** | **Phím tắt dừng khẩn dùng được cả khi bảng đã đóng** | Hôm nay muốn dừng phải mở đúng bảng bên rồi bấm nút. Chrome cho đăng ký phím tắt toàn trình duyệt. Với một thứ có `<all_urls>` và bấm được nút, cái phanh phải luôn trong tầm tay. |
| **10** | **Nhìn được trạng thái đăng nhập và bộ nhớ của trang** | Cookie, localStorage, IndexedDB của trang — Chrome cho đọc. Nó trả lời được câu "trang này đang đăng nhập bằng tài khoản nào, phiên còn sống không" trước khi Scouter bấm bất cứ nút nào. **Cái này mạnh và cũng nguy hiểm nhất trong mười cái** — xem 1.3. |

## 1.3 Ba câu cảnh báo, không phải để doạ

**⑴ Bảy trong mười thứ trên đi qua cùng một cửa: `chrome.debugger`.** Cửa đó chỉ mở cho **một
tab tại một thời điểm**, và tab đó **hiện dải băng vàng "… đang gỡ lỗi trình duyệt này"** suốt
thời gian cắm. Không giấu được, và ADR-0009 đã ghi là không nên giấu. Nếu Đức thấy dải băng
vàng phiền, thì mười năng lực trên rút xuống còn ba.

**⑵ Món số 10 đọc được mọi tab đang mở, gồm mọi trang Đức đang đăng nhập.** ADR-0009 đã ghi
thẳng cái mất này. Tôi chỉ thêm một điều đo được: **chính sách che dữ liệu vẫn đang treo** —
`workers/duc-scouter/v0.1.0/scripts/observer-probes.mjs` tự khai `status: "ĐỀ XUẤT — Đức chưa chốt"` **[ĐỌC]**. Xây tới
món 10 mà chưa gỡ treo là ghi dữ liệu đăng nhập xuống đĩa theo một luật chưa ai duyệt.

**⑶ Kiểm kê này KHÔNG nói Scouter đáng làm hơn 31 mục nợ đang mở.** Nó chỉ nói Scouter *làm được
gì*. Số nợ đo hôm nay **[ĐO]**: 23 mục mở ở ChatGPT · 8 ở Gemini · 0 ở GG Flow Video, cộng
**11 mục đang chờ chính Đức chốt**. Cân hai thứ là việc của Đức, không phải của bảng.

---

# PHẦN 2 — CÁCH ĐO

Chạy từ gốc repo, ngày 06/09/2026. Ai muốn kiểm lại thì chạy đúng mấy câu này.

```bash
# Nhóm API Chrome mà repo đụng tới (BẮT cả đường bơm qua tham số — xem bẫy ⑴ ở trên)
grep -rhoE "(chrome|chromeApi|browser)\.[a-zA-Z]+" --include=*.js workers/ observer-engine.js popup.js \
  | sed 's/^chromeApi\./chrome./' | sort -u

# Câu lệnh CDP thật sự có trong code (rồi lọc tay: cái nào ở tests/ là ca kiểm âm, không tính)
grep -rhoE "\"[A-Z][A-Za-z]+\.[a-zA-Z]+\"" --include=*.js --include=*.mjs . --exclude-dir=node_modules

# Method Bridge của từng worker — nhớ đặt tên file tạm KHÁC NHAU, xem bẫy ⑵
grep -oE 'registryEntry\(\{ *name: *"[^"]+"' workers/<gói>/bridge-core.js | sed 's/.*"\(.*\)"/\1/' | sort -u

# File nào giống hệt nhau ở cả ba worker = năng lực đã tự chứng minh là không dính nhà cung cấp
md5sum workers/*/v*/<tên-file>.js

# Sổ nợ đang mở
node scripts/what-next.mjs
```

Nguồn tài liệu Chrome đã tra (bắt buộc theo mục 7 của brief):
`developer.chrome.com/docs/extensions/reference/api` (danh sách nhóm API) ·
`developer.chrome.com/docs/extensions/reference/api/debugger` (miền CDP mở/đóng cho extension) ·
`chromedevtools.github.io/devtools-protocol` (danh sách miền CDP).

---

# PHẦN 3 — TRỤC A: BA WORKER ĐANG THẬT SỰ CÓ GÌ

## 3.1 Quy mô — [ĐO]

| Gói | File `.js` | Dòng | Method Bridge |
|---|---:|---:|---:|
| `duc-auto-chatgpt/v0.1.0` | 35 | 13.719 | 23 |
| `duc-auto-gemini/v0.2.0` | 34 | 10.837 | 19 |
| `duc-auto-gg-flow-video/v0.1.0` | 34 | 12.111 | 21 |
| Observer ở gốc repo (`observer-engine.js` + `popup.js` + `workers/duc-scouter/v0.1.0/scripts/observer-probes.mjs`) | 3 | 727 | — |

Hợp của ba tập method Bridge: **25**.

## 3.2 Thước đo độ dính, và vì sao chọn nó

Cột "bóc ra dùng lại được sạch hay không" là cột dễ nói bừa nhất. Tôi dùng **một bằng chứng máy
đo được thay cho cảm nhận**: so mã băm của cùng một file ở cả ba gói.

**Một file giống hệt từng byte ở ba nhà cung cấp khác nhau thì nó đã tự chứng minh là không dính
nhà cung cấp** — không cần ai đọc và tuyên bố. File khác nhau thì tôi mở ra đọc và ghi rõ *khác
ở chỗ nào*.

Giới hạn của thước này, ghi thẳng: giống hệt chứng minh **không dính NHÀ CUNG CẤP**, nó **không**
chứng minh không dính **BÀI TOÁN**. Sáu file giống hệt bên dưới đều nói về "sinh ảnh từ workbook
XLSX". Sạch với Gemini/ChatGPT/Flow, chưa chắc sạch với một trang bất kỳ.

## 3.3 Sáu năng lực đã tự chứng minh là sạch — [ĐO] mã băm + [ĐỌC] nội dung

Giống hệt từng byte ở cả ba gói:

| Năng lực | File | Nó làm gì | Ô |
|---|---|---|---|
| Danh tính một lượt thử | `attempt-identity-core.js` | Gắn `job_id` + `attempt_id` cho mỗi lần thử, và chốt định dạng của `attempt_id`. Không có nó thì không quy được kết quả về đúng lượt nào. | `SEED v0.1` |
| Chuỗi bằng chứng liên tục | `audit-chain-core.js` | Chạy tiếp một lần chạy dở mà file audit cũ mất → **dừng và bắt người xác nhận**, không bịa dữ liệu quá khứ. | `SEED v0.1` |
| Bắt tay Bridge | `bridge-pairing-core.js` | Kiểm file ghép cặp: buộc host `127.0.0.1`, token đúng 32 byte, endpoint đúng đường dẫn cố định. Sai một chỗ là từ chối. | `SEED v0.1` |
| Không làm hai lần | `reconciliation-core.js` | Trước khi gửi lại, kiểm xem lượt cũ có thật sự đẻ ra output không, dựa trên **bằng chứng đã ghi lúc đó** chứ không dựa trên trang lúc này. | `SEED v0.1` |
| Làm lại có phép | `recreate-core.js` | Chạy lại một job đã xong phải qua phê duyệt, và **giữ lại danh tính của file cũ bị thay** thay vì xoá dấu vết. | `SEED v1` |
| Trạng thái vòng chạy | `run-state-core.js` | Chuyển `status`/`phase` thô thành một tên trạng thái người đọc được, và tìm job kế tiếp đủ điều kiện. | `SEED v0.1` |

## 3.4 Năng lực có ở cả ba nhưng ba bản đã trôi khác nhau — [ĐO] mã băm khác + [ĐỌC]

Đây là danh sách đắt nhất: **năng lực thì chung, mà đã có ba bản.** Đúng cái bệnh ADR-0009 mục ⑵
nói phải tránh khi làm Scouter.

| Năng lực | File | Ghi chú đọc được | Ô |
|---|---|---|---|
| Cửa Bridge (bảng method + kiểm tham số) | `bridge-core.js` | 798–1022 dòng, ba bản khác nhau. 25 method hợp lại, **19 method có ở cả ba** (đúng bằng toàn bộ tập của Gemini — nhánh đó không có method nào riêng). Khung `registryEntry` giống nhau; nội dung từng method dính nhà cung cấp. | `SEED v0.1` (khung) · `ADAPTER` (từng method) |
| Vận chuyển Bridge qua WebSocket `127.0.0.1` | `bridge-transport-loopback.js` | 498–945 dòng. Cả ba đã có lớp ổn định kết nối (`armKeepaliveDeadline` có ở cả ba — **[ĐO]**, và đây là chỗ `FEATURE-PARITY.md` đã lạc hậu: nó ghi Flow chưa có). Nối lại bằng `chrome.alarms`, không bằng `setTimeout` — vì service worker ngủ. | `SEED v0.1` |
| Định tuyến lệnh Bridge | `bridge-router-core.js` | Gemini và Flow giống hệt nhau; ChatGPT khác. | `SEED v0.1` |
| Đề xuất hàng đợi chờ người duyệt | `bridge-proposal-core.js` | Gemini và Flow giống hệt; ChatGPT khác. AI đề xuất → người bấm duyệt → mới chạy. | `SEED v1` |
| Luật thử lại + bảng loại lỗi | `runner-core.js` | 16 loại lỗi, trong đó **đúng ba loại là dừng cả loạt**: `SECURITY_HARD_STOP`, `GENERATION_LIMIT_REACHED`, `RECEIVER_LOST`. Còn lại tự thử lại rồi bỏ qua để hàng đợi chạy tiếp. Ba bản khác nhau ở danh sách loại lỗi. | `SEED v0.1` |
| Bảng mã lỗi cho người vận hành | `halt-instructions-core.js` | Khung phân nhóm Hard Stop / Recoverable là chung; **chữ mô tả từng lỗi dính nhà cung cấp** ("Gemini đã đạt giới hạn ảnh"). | `SEED v0.1` (khung) · `ADAPTER` (chữ) |
| Checkpoint / lưu mốc | `checkpoint-core.js` | ChatGPT 225 dòng, Gemini và Flow 68 dòng và giống hệt nhau → **ChatGPT đã đi trước hai nhánh kia rất xa ở món này**. | `SEED v1` |
| Tiếp tục lần chạy dở | `resume-core.js` | Sinh `run_id` từ tên workbook + mốc thời gian; ba bản khác nhau. | `SEED v1` |
| Nơi lưu + đặt tên file ra | `output-location-core.js` | Chống đường dẫn thoát thư mục, lọc ký tự `chrome.downloads` từ chối. Có một bình luận đáng đọc: dấu gạch nối không escape từng tạo ra một dải ký tự nuốt cả `*` và `"`. | `SEED v1` |
| Hồ sơ thư mục lưu (IndexedDB) | `output-profile-core.js` | Gemini và Flow giống hệt nhau **và vẫn mang tên CSDL `duc-auto-chatgpt-output-profiles-v1`** — bằng chứng đọc được của một lượt chép nguyên xi. | `SEED v1` |
| Chẩn đoán kế hoạch trước khi chạy | `plan-diagnostics-core.js` | 194 dòng ở cả ba, nội dung khác. Soát workbook + file tham chiếu trước khi tốn credit. | `SEED v1` |
| Bảng duyệt trước khi chạy | `orchestrator-review-core.js` | Gom chẩn đoán thành checklist `OK / WARNING / BLOCKER`. | `SEED v1` |
| Bền hoá phê duyệt | `approval-persistence-core.js` | Chuỗi `snapshot → apply → audit → checkpoint → commit`, hỏng bước nào thì `rollback`. ChatGPT 60 dòng, hai nhánh kia 24 dòng. | `SEED v1` |
| Bằng chứng ảnh | `image-evidence-core.js` | ChatGPT 144 dòng, Gemini/Flow 65. Lọc ứng viên ảnh: phải `ready` + `visible` + không phải ảnh người dùng đưa vào. | `ADAPTER` |
| Sẵn sàng nhận việc mới | `chat-readiness-core.js` | 19–25 dòng. Sáu trạng thái, `HARD_STOP` chặn mọi thứ. Nhỏ nhưng là cái van chính. | `SEED v0.1` (khung) |
| Chữ tiếng Việt cho người vận hành | `operator-messages-core.js` · `operator-glossary-core.js` | Mã lỗi giữ tiếng Anh làm định danh, chỉ dịch cái người đọc trên màn hình. Đúng luật vàng 5. | `SEED v1` |
| Đọc/ghi XLSX + kiểm cấu hình | `xlsx-codec.js` · `xlsx-run-plan-core.js` | 363–370 dòng. **Không dính nhà cung cấp, nhưng dính chặt bài toán "chạy theo workbook".** | `KHÔNG CẦN` cho seed |
| Adapter nhà cung cấp | `provider-adapter.js` | ChatGPT 227 · Gemini 186 · Flow 548 dòng. Toàn bộ selector và thứ tự thao tác của một trang. | `ADAPTER` |
| Mã chạy trên trang | `content.js` | 1.078–1.781 dòng. Trộn lẫn năng lực chung và hiểu biết riêng của trang. | `ADAPTER` (cần bóc, xem 5.1) |
| Bảng bên | `sidepanel.js` | **5.102–6.233 dòng mỗi bản.** Đây là chỗ nợ lớn nhất — xem 5.2. | (xem 5.2) |

## 3.5 Năng lực chỉ một hoặc hai gói có — [ĐO] + [ĐỌC]

| Năng lực | Ai có | Nó chữa bệnh gì | Ô |
|---|---|---|---|
| **Khoá tab + khoá hội thoại cho một lần chạy** | ChatGPT (`boundTabId` trong `sidepanel.js`) · Gemini (`tab-lock-core.js`) · **Flow KHÔNG có** | Không khoá thì đổi tab giữa chừng là prompt bay sang tab khác và ảnh của hội thoại khác bị nhận nhầm làm output. **[ĐỌC]** Flow `sidepanel.js:2551` vẫn `chrome.tabs.query({active:true})` mỗi lần gửi. | `SEED v0.1` |
| **Khoảng nghỉ giữa job không bị Chrome bóp** | Chỉ ChatGPT (`interjob-delay-core.js`) | **[ĐỌC]** Bình luận đầu file ghi số đo thật: nghỉ 12 giây thành ~11 phút vì Chrome bóp bộ đếm giờ của tài liệu bị ẩn. Chữa bằng mốc thời gian thật + `chrome.alarms`. Hai nhánh kia còn nguyên bệnh. | `SEED v0.1` |
| **Nhịp tim vòng chạy** | Chỉ Flow (`run-liveness-core.js`) | **[ĐỌC]** Chuỗi 7 job đứng im 22 phút mà mọi lớp đều báo bình thường. Chữa bằng nhịp do **chính vòng lặp job** đập ra, mỗi nhịp tự khai trần chờ của mình. Bình luận đầu file ghi rõ vì sao `setInterval` trong panel không phát hiện được. | `SEED v0.1` |
| **Quyết định thao tác fail-closed** | Gemini + Flow (`content-decision-core.js`, giống hệt nhau) | Mọi cú bấm đi qua một cổng: có blocker (huỷ · bảo mật · hết quota · người bấm dừng) thì **ném lỗi trước khi bấm**. Đếm phần tử mới bằng danh tính node, không bằng phép trừ số đếm. | `SEED v0.1` |
| **Chế độ phát triển + trần chạy thử** | Gemini + Flow (`dev-trial-core.js`) · ChatGPT làm cách khác (`assertTrialDevMode`) | Trần gõ cứng, không phải tuỳ chỉnh. Cho AI tự khởi động một lượt chạy nhỏ mà không mở đường cho lượt chạy thật. | `SEED v0.1` |
| Poll A/B "thích ảnh nào hơn" | Chỉ ChatGPT (`ab-poll-core.js`) | Riêng của ChatGPT. | `ADAPTER` |
| Output dạng văn bản | Chỉ ChatGPT (`text-output-core.js`) | Nhận kết quả chữ chứ không chỉ ảnh. | `SEED v1` |
| Nhiều phiên làm việc trong một profile | Chỉ ChatGPT (`bridge-workspace-core.js`) | Trần 3 phiên, mỗi phiên buộc vào một tab. **ADR-0009 mục ⑷ chốt Scouter chỉ chạy một URL** → chưa cần. | `KHÔNG CẦN` ở v0.1 · `SEED v1` khi có thứ thật để nhân bản |

## 3.6 Kết luận trục A, một câu

Ba worker có sẵn **một bộ luật an toàn chín** (danh tính lượt thử · không làm hai lần · phân loại
lỗi · dừng khẩn · bằng chứng) — đó là thứ đáng bóc lên seed nhất, và **sáu file đã tự chứng minh
là bóc được sạch**. Cái chúng **không** có là năng lực nền tảng của Chrome: chúng chỉ biết một
cách bấm nút, và cách đó là cách yếu nhất trong ba cách Chrome cho.

---

# PHẦN 4 — TRỤC B: CHROME CHO PHÉP GÌ MÀ REPO CHƯA DÙNG

**Luật của phần này (brief mục 2):** mỗi dòng phải trả lời *"nó cho Scouter làm được việc gì mà
hôm nay không làm được?"*. Không trả lời được → `KHÔNG CẦN`, và đó là kết quả tốt.

## 4.1 Ba cách bấm nút Chrome cho, ta mới dùng cách yếu nhất — [ĐỌC] + [TL]

Đây là phát hiện chính của cả kiểm kê. Ghi riêng vì nó không phải một dòng trong bảng.

| Cách | Chuyện gì xảy ra | Trang biết được không | Repo dùng chưa |
|---|---|---|---|
| **① Sự kiện giả lập trong trang** | `element.click()`, `new KeyboardEvent(...)`, `document.execCommand("insertText")` | **Biết.** Sự kiện mang cờ `isTrusted: false`. Trang chỉ cần một dòng là lọc sạch. | **Đang dùng, và chỉ dùng cái này** — **[ĐỌC]** `content.js` nhánh Gemini dòng 188 · 196 · 413 · 426 · 831 |
| **② Chuột và bàn phím thật của trình duyệt** | `Input.dispatchMouseEvent` · `Input.dispatchKeyEvent` · `Input.insertText` qua `chrome.debugger` | Sự kiện sinh ra từ tầng trình duyệt chứ không từ trong trang. Tài liệu nói `isTrusted: true`, **nhưng xem cảnh báo bên dưới**. | **CHƯA — [ĐO]** ba chuỗi này chỉ xuất hiện ở `workers/duc-scouter/v0.1.0/tests/observer-probes-smoke.mjs` và `workers/duc-scouter/v0.1.0/scripts/observer-mutation-check.mjs`, đều là **ca kiểm âm** (kiểm rằng lệnh ghi bị TỪ CHỐI). Không có ở code sản phẩm. |
| **③ Người thật bấm** | — | — | Đây là cái Scouter tồn tại để thay |

**Cảnh báo, và nó quan trọng:** repo này **đã nghiên cứu đúng câu hỏi này** ngày 28/08 —
`EXP-14-INPUT-SEMANTICS-BROWSER-INPUT-REACH-STUDY-V0.md` (đã xoá 08/09 — `git show a3b67a96a92e:docs/studies/EXP-14-INPUT-SEMANTICS-BROWSER-INPUT-REACH-STUDY-V0.md`). Kết luận của nó, chép nguyên:
`trusted-event prediction = STRONGLY SOURCE-SUPPORTED` · `current live isTrusted/userActivation
behavior = MICRO-PROOF REQUIRED`. Nghĩa là: **tài liệu nói vậy, chưa ai trong repo này đo tận
mắt trên Chrome hiện hành.** Tôi giữ nguyên mức đó, không nâng lên thành sự thật — nâng lên là
đúng cái bẫy [DÒ] mà `FEATURE-PARITY.md` đã dính bốn lần trong một ngày.

**Vì sao đây vẫn là dòng số 1 của mục 1.2:** cách ① là toàn bộ vốn liếng tương tác của ba worker
sau nhiều tháng. Nó chạy được với Gemini, ChatGPT và Flow vì ba trang đó chưa chặn. Nó **không
phải một năng lực chung**, nó là một may mắn. Scouter được ADR-0009 giao nhiệm vụ "học một trang
bất kỳ" thì phải có cách ② — và **phép thử `isTrusted` mà EXP-14 gọi là MICRO-PROOF nên là việc
code đầu tiên của Scouter**, vì nếu nó ra `false` thì cả dòng số 1 đổ, và đổ sớm thì rẻ.

## 4.1.1 Phép đo đã chạy — ngày 06/09, và nó ĐẠT — [ĐO]

> Mục 4.1 ở trên viết ngày 06/09 buổi sáng, lúc chỗ này còn là `MICRO-PROOF REQUIRED`.
> Chiều cùng ngày phiên `claude-scouter-do` chạy phép đo. **Đoạn dưới là số đo thật, không
> phải tài liệu.** Mục 4.1 giữ nguyên chữ cũ — nó là bản ghi của lúc chưa biết.

**Câu trả lời: có.** Cú bấm đi qua đường điều khiển của trình duyệt được trang nhìn thấy y như
cú bấm của tay người — trên Chrome 152.0.7977.76, đo ngày 06/09/2026.

Chạy lại:

```bash
node workers/duc-scouter/v0.1.0/scripts/scouter-input-trust-probe.mjs
```

Nó tự dựng trang thử và một hồ sơ Chrome trống trong thư mục tạm, đo, rồi xoá. **Không đụng
trang thật, không tốn credit, không cần Đức duyệt.** Mã thoát: `0` đạt · `1` không đạt ·
`2` phép đo không chạy được (khác hẳn "không đạt" — đừng ghi mã 2 vào bảng này).

### Bốn đường bấm, đo trên cùng một nút

| Đường bấm | `isTrusted` | Cổng hoạt động của trình duyệt mở không |
|---|---|---|
| Sự kiện giả lập trong trang (`dispatchEvent`) | **false** | không |
| `HTMLElement.click()` — cách ba worker đang dùng | **false** | không |
| Chuột thật của trình duyệt qua `chrome.debugger` | **true** | **có** |
| Tay người thật | — | **CHƯA ĐO** — không tự động hoá được |

Gõ phím cùng một kết quả: `Input.dispatchKeyEvent` cho `keydown` mang `isTrusted: true` **và**
làm ô nhập dài thêm thật. `Input.insertText` (CDP đánh dấu THỬ NGHIỆM) cũng chạy được, nhưng
**không tính điểm** — thử nghiệm thì có thể biến mất ở bản Chrome sau.

### Chỗ phép đo này khác EXP-14, và vì sao chỗ đó đáng tiền

EXP-14 dừng ở suy luận từ mã nguồn Chromium. Lặp lại suy luận đó thì không thêm được gì. Nên
phép đo chạy **hai đường**, và chỉ đường thứ hai tính điểm:

| Đường | Là gì | Vai |
|---|---|---|
| `cdp` | phiên CDP thẳng | đối chứng |
| `ext` | `chrome.debugger` gọi từ **bên trong một extension thật** | **đường Scouter sẽ dùng — tính điểm** |

Hai đường ra kết quả **giống hệt nhau**. Nhưng nếu chỉ đo đường `cdp` thì ta vẫn đang suy luận
"chắc `chrome.debugger` cũng thế", và suy luận đúng là thứ EXP-14 đã có rồi.

### Ba cái bẫy gặp thật, ghi ra để người sau khỏi mất buổi chiều

⑴ **`--load-extension` đã CHẾT từ Chrome 137.** Trang extension trả `ERR_BLOCKED_BY_CLIENT`, và
`--disable-features=DisableLoadExtensionCommandLineSwitch` **không** mở lại được. Đường còn lại
mà Chrome hiện hành thừa nhận là lệnh CDP `Extensions.loadUnpacked`, và lệnh đó chỉ có khi chạy
`--remote-debugging-pipe` kèm `--enable-unsafe-extension-debugging`. Hai cờ đó chỉ để **cài**
được extension thử; chúng không đụng gì tới ngữ nghĩa của cú bấm.

⑵ **Chrome chỉ cho MỘT khách gỡ lỗi cắm vào một tab.** Đường `cdp` phải rời tab trước, không thì
`chrome.debugger.attach` của đường `ext` trả *"Another debugger is already attached"*. Đây cũng
chính là lý do ADR-0009 mục ⑷ chốt "một Scouter một URL".

⑶ **Service worker của extension ngủ ngay sau khi cài**, nên nó không có mặt trong danh sách
target lúc ta đi tìm. Lượt chạy đầu của phép đo mắc đúng ở đây và báo "không tìm thấy extension"
— trong khi extension vẫn ổn. Cách vòng qua: mở một **trang** của extension rồi gọi từ đó.

### Nó có nghĩa gì với 24 mục còn lại

Món đắt nhất trong danh sách là **thật**. Thứ tự `SEED v0.1` của ADR-0010 giữ nguyên, không phải
xếp lại. Ba câu vẫn đúng và đừng ai bỏ qua:

- `isTrusted: true` **không** đồng nghĩa với "trang không phát hiện được". Trang còn nhiều dấu
  hiệu khác (dải băng cảnh báo của Chrome là một, và ADR-0009 đã ghi là không giấu được).
- Đo trên **một** bản Chrome, **một** máy. Nó là số đo, không phải lời hứa của Google — chạy lại
  lệnh trên khi lên bản Chrome mới.
- Cú bấm **của tay người thật** vẫn CHƯA ĐO, vì không tự động hoá được. Ba đường còn lại đo rồi.

## 4.2 Miền CDP — Chrome mở 27, repo dùng 3 — [TL] + [ĐO]

Chrome mở cho extension 27 miền: `Accessibility` `Audits` `CacheStorage` `Console` `CSS`
`Database` `Debugger` `DOM` `DOMDebugger` `DOMSnapshot` `Emulation` `Fetch` `IO` `Input`
`Inspector` `Log` `Network` `Overlay` `Page` `Performance` `Profiler` `Runtime` `Storage`
`Target` `Tracing` `WebAudio` `WebAuthn`.

Repo dùng 3, tất cả nằm ở Observer gốc: `DOM` · `Runtime` · `Target`. Bảy câu lệnh:
`DOM.enable` · `DOM.getDocument` · `DOM.querySelectorAll` · `DOM.describeNode` ·
`Target.getTargetInfo` · `Runtime.enable` · `Runtime.evaluate`.

| Miền | Cho Scouter làm được gì mà hôm nay không làm được | Ô |
|---|---|---|
| **`Input`** | Bấm và gõ như tay người (4.1 ②). Không có nó thì Scouter chỉ chạy được trên trang dễ tính. | **`SEED v0.1`** |
| **`Accessibility`** | `getFullAXTree` trả về trang theo *vai trò + tên* ("button: Gửi"). Bền hơn selector CSS qua các lần trang đổi giao diện, và là thứ nên **ghi vào adapter** thay vì ghi selector. Thuốc thật cho luật vàng 1. | **`SEED v0.1`** |
| **`Page`** | Chụp màn hình (`captureScreenshot`), điều hướng (`navigate`), tải lại, và các mốc vòng đời để **chờ đúng lúc** thay vì hỏi lại DOM. Hôm nay chờ bằng polling. | **`SEED v0.1`** |
| **`DOMSnapshot`** | `captureSnapshot` lấy cả cây DOM + vị trí + kiểu dáng trong **một lượt**. Hôm nay Observer gọi `describeNode` từng nút một. Đây là nguyên liệu tốt nhất để sinh adapter tự động. | **`SEED v0.1`** |
| **`Network`** | Nghe request/response của trang: biết trang thật sự trả kết quả lúc nào, và đọc được lỗi trang tự báo. Thay được phần lớn việc đoán bằng DOM. | `SEED v1` |
| **`Target`** (dùng thêm) | Hôm nay chỉ dùng `getTargetInfo`. `setAutoAttach` cho phép với vào **khung con và iframe chéo miền** — chỗ selector hay chết mà không ai biết vì sao. | `SEED v1` |
| **`Storage`** · **`CacheStorage`** · **`Database`** | Đọc cookie / localStorage / IndexedDB của trang: trả lời "phiên đăng nhập còn sống không" trước khi bấm. **Chỉ mở sau khi Đức chốt chính sách che dữ liệu.** | `SEED v1` (chặn bởi 1.3⑵) |
| **`Emulation`** | Giả lập kích thước màn hình, thiết bị, múi giờ. Trang responsive đổi hẳn DOM theo bề rộng — adapter dò ở một cỡ có thể sai ở cỡ khác. | `SEED v1` |
| **`Log`** · **`Console`** | Đọc lỗi trang tự in ra. Rẻ, và thường nói thẳng vì sao thao tác vừa rồi không ăn. | `SEED v1` |
| **`Fetch`** | Chặn và sửa request giữa đường. Mạnh, nhưng là **sửa hành vi trang**, không phải học trang. | `KHÔNG CẦN` — vượt xa việc "học một trang", và mở ra cửa hỏng khó lần |
| **`Overlay`** | Vẽ khung highlight lên phần tử. Đẹp khi quay video minh hoạ, không giúp Scouter làm được việc gì mới. | `KHÔNG CẦN` |
| **`CSS`** | Đọc kiểu dáng đã tính. Phần lớn việc cần thì `DOMSnapshot` đã trả kèm. | `KHÔNG CẦN` ở v0.1 |
| **`Debugger`** · **`Profiler`** · **`Tracing`** · **`Performance`** | Đặt breakpoint, đo hiệu năng, dựng hồ sơ CPU. Dành cho người sửa lỗi trang, không dành cho tác nhân dùng trang. | `KHÔNG CẦN` |
| **`WebAudio`** · **`WebAuthn`** · **`Audits`** · **`Inspector`** · **`IO`** · **`DOMDebugger`** | Không dính việc "học và điều khiển một trang". | `KHÔNG CẦN` |

## 4.3 API extension — 85 nhóm, repo dùng 7 — [TL] + [ĐO]

Bỏ ra 51 nhóm không dính tác nhân duyệt web trên Windows (ChromeOS · doanh nghiệp · máy in ·
giọng nói · panel devtools · dấu trang · lịch sử · v.v.), còn **34 nhóm liên quan**. Repo dùng 7.

**Đã dùng (7):** `alarms` · `debugger` · `downloads` · `runtime` · `sidePanel` · `storage` · `tabs`.

**27 nhóm liên quan mà repo CHƯA hề gọi một dòng nào — [ĐO]:**

| Nhóm | Cho Scouter làm được gì mà hôm nay không làm được | Ô |
|---|---|---|
| **`scripting`** | `executeScript` bơm code vào **bất kỳ tab nào ngay lúc chạy**. Hôm nay mỗi worker chỉ chạy trên danh sách trang gõ cứng trong `manifest.json`; thêm trang là sửa file + nạp lại. Đây là **điều kiện cần** để "một adapter một URL" của ADR-0009 tồn tại. | **`SEED v0.1`** |
| **`offscreen`** | Một tài liệu ẩn có DOM, **không bị Chrome bóp bộ đếm giờ**. Chữa tận gốc bệnh đã đo ngày 28/08 (12 giây → ~11 phút) mà `interjob-delay-core.js` mới chỉ vá được triệu chứng. Cũng là chỗ đúng để đặt vòng chạy job, thay cho bảng bên. | **`SEED v0.1`** |
| **`commands`** | Phím tắt toàn trình duyệt → **dừng khẩn dùng được cả khi bảng bên đã đóng**. Với một thứ có `<all_urls>` và bấm được nút, cái phanh phải luôn trong tầm tay. | **`SEED v0.1`** |
| **`webNavigation`** | Báo mốc "bắt đầu tải · DOM xong · tải xong · chuyển trang bằng history API", **kể cả khung con**. Không cần cắm debugger. Rẻ hơn `Page` cho phần lớn việc chờ. | **`SEED v0.1`** |
| **`notifications`** | Báo cho Đức khi cần người: hết quota, gặp CAPTCHA, chuỗi chết. Hôm nay Đức phải tự mở bảng ra xem. | `SEED v1` |
| **`windows`** | Mở một cửa sổ riêng cho Scouter làm việc, tách khỏi cửa sổ Đức đang dùng. Với `<all_urls>` + `debugger`, tách vật lý là hàng rào rẻ nhất. | `SEED v1` |
| **`idle`** | Biết máy đang có người ngồi hay không. Quyết định "chạy tiếp hay chờ người" mà không cần hỏi. | `SEED v1` |
| **`cookies`** | Đọc trạng thái đăng nhập của một trang **trước khi** cắm debugger. Rẻ hơn nhiều so với đường `Storage` của CDP. **Chặn bởi chính sách che dữ liệu chưa chốt.** | `SEED v1` (chặn bởi 1.3⑵) |
| **`permissions`** | Xin quyền **lúc chạy** thay vì khai hết trong manifest. Nó là **phương án hẹp hơn `<all_urls>`** mà Đức đã được trình bày và **đã từ chối** (ADR-0009 mục ⑴). Ghi ở đây để người sau không đề xuất lại. | `KHÔNG CẦN` — Đức đã chốt hướng rộng |
| **`userScripts`** | Chạy script tuỳ biến trong thế giới riêng, không cần khai trước. Chồng lấn phần lớn với `scripting`; thêm một cửa nữa là thêm một chỗ phải canh. | `KHÔNG CẦN` ở v0.1 |
| **`tabGroups`** | Gom tab thành nhóm. Đẹp mắt, không mở ra việc mới. | `KHÔNG CẦN` |
| **`tabCapture`** · **`desktopCapture`** | Quay video tab hoặc màn hình. `Page.captureScreenshot` đủ cho bằng chứng; quay video là kho dữ liệu lớn và nhạy cảm mà chưa ai hỏi. | `KHÔNG CẦN` |
| **`declarativeNetRequest`** · **`webRequest`** | Chặn/sửa/đọc request ở tầng extension. Trùng việc với `Network`/`Fetch` của CDP, và `webRequest` bản chặn đã bị MV3 siết. | `KHÔNG CẦN` |
| **`contextMenus`** · **`action`** · **`i18n`** | Chuột phải, nút thanh công cụ, đa ngữ. Chuyện giao diện, không phải năng lực. (`action` **có khai trong cả 6 manifest** nhưng **không dòng code nào gọi `chrome.action.*`** — **[ĐO]**.) | `KHÔNG CẦN` |
| **`management`** · **`identity`** · **`proxy`** · **`privacy`** · **`browsingData`** · **`contentSettings`** · **`power`** · **`pageCapture`** · **`dom`** · **`declarativeContent`** | Không trả lời được câu "Scouter làm được gì mới nhờ nó". | `KHÔNG CẦN` |

## 4.4 Năng lực web nền tảng — đã dùng, ghi lại để đừng xây lại — [ĐO]

Không phải nhóm API extension, nhưng là năng lực thật và ba worker **đã dùng**:

| Năng lực | Ai dùng | Ô |
|---|---|---|
| Chọn thư mục thật trên đĩa và ghi file (`showDirectoryPicker` + `createWritable`) | Cả ba (`sidepanel.js` + `output-location-core.js`) | `SEED v1` |
| Lưu hồ sơ vào IndexedDB | Cả ba (`output-profile-core.js`) | `SEED v1` |
| WebSocket tới `127.0.0.1` (đường sống của Bridge) | Cả ba (`bridge-transport-loopback.js`) | `SEED v0.1` |

## 4.5 Chrome KHÔNG cho — ghi ra để không ai đi xây thứ không tồn tại — [TL]

| Muốn làm | Chrome trả lời |
|---|---|
| Extension tự ghi đè code của chính nó | **Không có cửa nào.** ADR-0009 mục ⑸ đã ghi. Chân chạy của vòng tự hoàn thiện phải nằm ở Bridge: Bridge ghi xuống đĩa → `chrome.runtime.reload()`. |
| Hai debugger cùng cắm vào một tab | **Không.** Một tab một debugger. Chính vì vậy ADR-0009 mục ⑷ chốt "một Scouter một URL" — nó bỏ luôn bài toán tranh tab. Và nếu Đức đang mở DevTools trên tab đó, Scouter **không cắm được**. |
| Giấu dải băng "đang gỡ lỗi trình duyệt này" | **Không.** Nó là dải băng của Chrome, không phải của trang. |
| Chạm vào `chrome://`, Chrome Web Store, trang của extension khác | **Không**, kể cả với `<all_urls>`. |
| Dùng miền `Security` · `ServiceWorker` · `SystemInfo` qua `chrome.debugger` | **Không** — Chrome khoá riêng mấy miền này với extension. |
| Chắc chắn `chrome.debugger` luôn dùng được | **Không.** Chính sách doanh nghiệp (`ExtensionSettings`) chặn được, và lúc đó lỗi trả về là `"Host access is restricted by policy."` Máy của Đức hôm nay không bị, nhưng seed phải xử lý lỗi này chứ không được coi là không thể xảy ra. |

---

# PHẦN 5 — CHƯA PHÂN LOẠI ĐƯỢC

Brief mục 3 dặn: gặp dòng khó xử thì ghi ra kèm lý do, đừng nhét bừa vào một ô cho đủ bảng.
Ba dòng dưới đây **tôi cố ý không xếp ô**.

## 5.1 `content.js` — năng lực và hiểu biết-về-trang đang dính vào nhau

1.078 dòng (Gemini) đến 1.781 dòng (Flow). Trong cùng một file có **cả hai loại**: luật chung
(chờ, thử lại, chống bấm hai lần) nằm cạnh selector riêng của trang. Xếp `ADAPTER` thì mất phần
năng lực; xếp `SEED` thì kéo theo selector của Gemini vào seed dùng chung.

**Không xếp được nếu chưa mở file ra bóc.** Bóc là việc của lượt sau và **là việc code** — ngoài
phạm vi lượt này (brief mục 7). Ghi lại ở đây làm đề bài cho lượt đó.

## 5.2 `sidepanel.js` — 5.102 đến 6.233 dòng mỗi bản, ba bản

**Đây là khối nợ lớn nhất của cả trục A**, và tôi không dám nói nó chứa gì. **[ĐO]** ba file cộng
lại 16.411 dòng — hơn phân nửa toàn bộ mã ba worker.

Đã đọc được ba điều rời rạc: khoá tab của ChatGPT nằm ở đây (`boundTabId`, dòng 3035–3068);
Flow **không** khoá tab (dòng 2550–2554); `showDirectoryPicker` nằm ở đây. Ba mảnh đó nói rằng
trong này có **năng lực thật chưa được bóc ra core**.

Đọc hết 16.411 dòng là một lượt làm việc riêng. **Không đoán, không xếp ô.**

## 5.3 Chính sách che dữ liệu — treo từ ADR-0007, chặn ba dòng của trục B

`workers/duc-scouter/v0.1.0/scripts/observer-probes.mjs` tự khai `status: "ĐỀ XUẤT — Đức chưa chốt"` **[ĐỌC]**. Ba dòng
trục B phụ thuộc vào nó: `Storage`/`CacheStorage`/`Database` của CDP, và `cookies` của extension.

Xếp `SEED v1` thì hàm ý sẽ làm; xếp `KHÔNG CẦN` thì sai vì nó có giá trị thật. Nên: **`SEED v1`
kèm một cái chặn** — không viết dòng code nào cho ba món đó trước khi Đức gỡ treo.

---

# Kết luận

**Ba worker đang dùng khoảng một phần năm những cửa Chrome mở cho một tác nhân duyệt web.**
Nhưng con số không phải điều quan trọng nhất tìm được.

**Điều quan trọng nhất:** thứ ba worker có nhiều là **luật an toàn** — chín, đã trả giá, và sáu
file đã tự chứng minh là bóc ra dùng lại được sạch. Thứ chúng gần như không có là **năng lực nền
tảng của trình duyệt**: chúng chỉ biết một cách bấm nút, và đó là cách yếu nhất trong ba cách
Chrome cho.

Nên nếu chép nguyên ba worker sang seed, Scouter sẽ thừa hưởng **kỷ luật của chúng và cả trần
thấp của chúng** — đúng như Đức lo trong brief mục 1.

## Số đếm để Đức cân

Bảng này **đếm từ chính file này** — chạy lại được, không gõ tay **[ĐO]**:

```bash
awk -F'|' '/^\|/ && NF>2 {c=$(NF-1); if (c ~ /SEED|ADAPTER|KHÔNG CẦN/) print c}' \
  docs/studies/SCOUTER-CAPABILITY-INVENTORY-V1.md | sort | uniq -c
```

| | `SEED v0.1` | `SEED v1` | `ADAPTER` | `KHÔNG CẦN` | Số dòng |
|---|---:|---:|---:|---:|---:|
| **Trục A — repo ĐÃ CÓ** (mục 3.3 · 3.4 · 3.5 · 4.4) | 17 | 14 | 6 | 2 | 36 |
| **Trục B — repo CHƯA CÓ** (mục 4.2 · 4.3) | 8 | 9 | 0 | 12 | 29 |
| **Cộng** | **25** | **23** | **6** | **14** | **65** |

(39 nhãn trên 36 dòng ở trục A vì **3 dòng mang hai ô** — khung vào seed, chữ xuống adapter.)

Đọc bảng này một câu: **bản đầu tiên của seed là 25 mục, trong đó 17 mục đã có sẵn ở ba worker
(5 bóc sạch được ngay) và 8 mục phải xây mới từ năng lực Chrome.**

Thêm ba con số ngoài bảng:

- **3 mục chưa phân loại được** (PHẦN 5), trong đó `sidepanel.js` là **16.411 dòng chưa ai đọc hết**.
- **3 mục `SEED v1` bị chặn** bởi chính sách che dữ liệu Đức chưa chốt.
- Đối trọng: **31 mục nợ đang mở** ở ba worker, cộng **11 mục đang chờ chính Đức chốt**.

## Việc tiếp theo

**Đúng một việc: Đức nhìn PHẦN 1 rồi chốt Scouter làm tới đâu** — dừng ở 25 mục `SEED v0.1`,
hay đi tiếp tới `SEED v1`. Chốt xong mới viết brief cho lượt code đầu tiên. Kiểm kê này không đề
xuất kiến trúc và không tự chọn thay Đức (brief mục 7).
