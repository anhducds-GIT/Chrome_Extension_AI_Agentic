# Pilot-16 · Khoảng nghỉ giữa hai job bị Chrome bóp

**Ngày:** 2026-08-28 · **Phiên:** `claude-chatgpt-interjob-delay` (Claude Code, Opus 5)

Đây **không phải pilot chạy trên chatgpt.com**. Đây là chỗ chứa **số đo** cho một bug thời
gian, cộng với script để chạy lại. Không tốn lượt ChatGPT nào.

---

## Bệnh, nói cho mắt Đức đọc

Đặt khoảng nghỉ giữa hai job là 12 giây. Đo thật ngày 28/08 thì mất **khoảng 11 phút**.

Lý do: **Chrome bóp đồng hồ của cửa sổ nó cho là "không ai đang xem"**. Side panel là một
trang, nên khi cửa sổ chứa nó bị cửa sổ khác che, Chrome đánh thức nó thưa hẳn đi. Code cũ
đếm nhịp — "chờ 12 lần, mỗi lần 1 giây" — nên **đếm nhịp không còn là đếm thời gian**.

Với batch 30 job, 20 phút chờ biến thành khoảng 5 tiếng rưỡi. Đó là thứ đang chặn Đức chạy
batch thật.

## Số đo (Chrome 151 thật, khoảng nghỉ đặt 12 giây)

**Harness B — đo trong `sidepanel.html` THẬT của extension THẬT.** Đây là bảng đáng tin nhất,
vì nó gọi đúng module đang ship, đúng cách `sidepanel.js` gọi:

| Cách chờ | Panel HIỆN | Panel BỊ CHE |
|---|---|---|
| **Bản cũ** — đếm 12 nhịp `sleep(1000)` | 12,06 s | **288,04 s · gấp 24 lần** |
| **Bản vá** — mốc thời gian + `chrome.alarms` | 12,007 s | **12,007 s · gấp 1,00** |

Module tự khai `waited_ms: 12006`, `reason: "elapsed"` — khớp đồng hồ ngoài, không lệch sổ.
Đồng hồ đếm ngược trên màn hình: **12 nhịp** khi panel hiện (đúng mỗi giây), **7 nhịp** khi
panel bị che — tổng thời gian vẫn đúng. Nhịp là hiển thị, mốc là đồng hồ.

**Harness A — extension probe dựng riêng**, đặt 5 cách chờ cạnh nhau để biết *nửa nào* của
bản vá làm việc:

| Cách chờ | Panel HIỆN | Panel BỊ CHE |
|---|---|---|
| Đếm 12 nhịp `sleep(1000)` | 12,06 s | **276,98 s · gấp 23 lần** |
| **Chỉ mốc thời gian, KHÔNG alarm** | 12,00 s | **59,98 s · gấp 5 lần** |
| **Mốc + `chrome.alarms` (trong trang)** | 12,00 s | **12,005 s · gấp 1,00** |
| Mốc + alarm đặt ở service worker | — | 12,017 s · gấp 1,00 |
| Mốc + `setTimeout` ở service worker | — | 12,004 s · gấp 1,00 |

Bảng A là chỗ tách được công của từng nửa: **chỉ mốc thời gian** đã cắt từ ~4,6 phút xuống
~60 giây (chặn thiệt hại ở một nhịp thức), **thêm alarm** mới về đúng 12 giây.

Ba điều đáng ghi, vì chúng phủ định ba giả định sai dễ mắc:

1. **Không phải ChatGPT chậm, không phải treo.** Cùng một đoạn code: hiện 12,06 s, bị che
   276,98 s. Chỉ khác một biến duy nhất là trang có bị che hay không.
2. **`chrome.alarms` KHÔNG bị chặn ở 30 giây.** Tài liệu Chrome nói alarm tối thiểu 30 giây —
   điều đó áp cho extension đã đóng gói. Extension này nạp dạng unpacked, và alarm 12 giây
   nổ đúng ở 12,005 s. *Nếu* sau này đóng gói thì bản vá **không vỡ**: mốc thời gian vẫn là
   thẩm quyền, khoảng nghỉ chỉ dài ra ~30 giây, không quay về 11 phút.
3. **Mức bóp không cố định.** Cùng buổi đo được cả ~23 s/nhịp và ~60 s/nhịp — Chrome bóp chặt
   dần theo thời gian bị che. Nên không có con số "gấp N lần" nào để bù trừ; phải bỏ hẳn cách
   đếm nhịp.

## Bản vá là gì

`interjob-delay-core.js` (mới). Hai nửa, thiếu nửa nào cũng không được:

- **Mốc thời gian là thẩm quyền.** Chờ tới `lúc-bắt-đầu + số-giây`, chứ không đếm nhịp.
- **`chrome.alarms` là cái đánh thức.** Sự kiện alarm do tiến trình trình duyệt gửi, không đi
  qua hàng đợi timer bị bóp.

Thứ tự đó có chủ ý: **alarm chỉ ĐÁNH THỨC, mốc mới QUYẾT ĐỊNH**. Khoảng nghỉ là một lớp bảo
vệ chống gửi quá nhanh, nên một cái alarm nổ sớm (hoặc sót lại từ lần chờ trước) **không bao
giờ được rút ngắn** khoảng nghỉ. Dài hơn thì an toàn; ngắn hơn thì không.

**Không xin quyền mới.** `"alarms"` đã có trong `manifest.json` từ trước.

## Đã kiểm bằng gì

- `tests/interjob-delay-core-smoke.mjs` — dựng một **đồng hồ ảo** mô phỏng đúng kiểu bóp của
  Chrome, vì không thể tái hiện nó bằng cách ngồi chờ. Ghim 8 nhóm tính chất, trong đó:
  không bao giờ ngắn hơn cấu hình · alarm nổ sớm không rút ngắn được · mất alarm thì vẫn
  đúng, chỉ kém đúng giờ (chặn trên 61 s) · Dừng vẫn ăn · không quay vòng nóng · mọi đường ra
  đều tắt alarm.
- **Mutation test 5 phát** — phá lại bản vá 5 cách khác nhau, cả 5 đều bị test bắt. Suite
  xanh không phải bằng chứng; đây mới là.
- Toàn bộ suite worker: 95 xanh / 0 đỏ.
- Harness B: nạp **extension thật** vào Chrome thật, mở `sidepanel.html` **thật** thành tab bị
  che, gọi thẳng module trong đó. Xác nhận panel thật có nạp module, `chrome.alarms` với tới
  được từ panel, và số đo ở trên.

## Việc còn lại cho Đức — CHƯA đo lại trên trang thật

Bản vá đã đo trong panel thật, nhưng **chưa chạy hết một run có ChatGPT**. Theo luật repo
(AGENTS.md mục 2), chạy pilot live mới **phải Đức duyệt**. Cần đúng 4 việc:

1. **Reload extension** ở `chrome://extensions` (đã sửa file `.js`).
2. Mở tab ChatGPT **ở sẵn MỘT CUỘC HỘI THOẠI** (`/c/<id>`), không phải trang chủ — lỗi #2
   trong `AI-OPERATOR-GUIDE.md`. Vừa reload thì nạp lại content script (`chat.reload` hoặc F5)
   — lỗi #1.
3. Chạy **2–3 job**, `delay_min_sec: 12`, `delay_max_sec: 24`, `max_retries: 0`. Trong lúc
   chạy, **cố tình để cửa sổ khác che side panel suốt khoảng nghỉ** — đó chính là điều kiện
   sinh ra bug.
4. Đọc số trong audit JSONL: khoảng cách từ `completed_at` của job N tới `submitted_at` của
   job N+1. **Đạt** = 12–24 giây cộng thêm nghỉ an toàn. **Chưa đạt** = còn hàng phút → nghi
   B-29 (đồng hồ trong content script) trước, đừng nghi lại bản vá này.

## Chạy lại số đo (không cần ChatGPT, không cần tay Đức)

Script trong `evidence/` là **bản chép để đọc** (`.txt`), không phải bản chạy được — bản chạy
nằm ở scratchpad của phiên và dùng đường dẫn tuyệt đối của máy Đức. Muốn dựng lại thì cần
biết đúng một điều đã tốn thời gian tìm ra:

> **`--load-extension` đã CHẾT ở Chrome 151.** Cờ `--disable-features=DisableLoadExtension‑
> CommandLineSwitch` cũng không cứu được. Cách còn dùng được: mở Chrome với
> `--remote-debugging-port` + `--enable-unsafe-extension-debugging`, rồi gọi CDP
> `Extensions.loadUnpacked`.

Hai cái bẫy khác đã trả giá, ghi lại để phiên sau không mất giờ:

- Chrome trả `webSocketDebuggerUrl` **theo header `Host` bạn gửi**. Gửi `Host: 127.0.0.1` thì
  nó trả URL **mất số cổng**, và `net.connect` báo `EADDRNOTAVAIL` rất khó hiểu. Gửi
  `Host: 127.0.0.1:<port>`.
- **Service worker MV3 bị kết liễu là mất hết biến module.** Probe đầu tiên đứng im 17 phút
  đúng vì nó nhớ `tabId` trong biến, rồi alarm đánh thức worker mới với `tabId = null`. Dùng
  `chrome.runtime.sendMessage` phát quảng bá, đừng nhắm vào một tab đã nhớ.

## Nội dung `evidence/`

| File | Là gì |
|---|---|
| `harness-A-probe-extension-20260828.jsonl` | Nhật ký số đo thô của harness A (extension probe dựng riêng) |
| `harness-A-probe.js.txt` | Trang probe: 5 kiểu đồng hồ đặt cạnh nhau, đo bằng `Date.now()` |
| `harness-A-sw.js.txt` | Service worker của probe: dựng tab bị che, vượt mốc 5 phút, tiếp sức alarm |
| `harness-B-real-extension-check.mjs.txt` | Harness B: nạp extension THẬT, mở `sidepanel.html` thật thành tab bị che, đo module thật |
| `harness-B-real-extension-results.json` | Số đo thô của harness B |
| `harness-B-real-extension-run.log` | Nhật ký chạy harness B, có mốc giờ từng bước |
| `mutation-test-20260828.txt` | 5 phát phá bản vá và test bắt được cái nào |
