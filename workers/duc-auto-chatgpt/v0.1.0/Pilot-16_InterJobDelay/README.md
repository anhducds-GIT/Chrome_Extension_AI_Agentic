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

## Đo trên trang thật — ĐÃ XONG 2026-08-28

Trial `trial-e99addeb-7780-41fe-9cbe-05fb33a5f59d`, 2 job `text_reasoning`, **2/2 SUCCESS**,
khoảng nghỉ đặt **cố định 12 giây** (min=max=12 để số không mơ hồ), `max_retries: 0`.
**Cửa sổ Chrome bị che suốt từ trước khi chạy tới hết run** — Đức xác nhận. Tức đo đúng điều
kiện sinh ra bug, không phải điều kiện dễ.

Tách từ nhật ký JSONL (`evidence/live-trial-audit-20260828.jsonl`), mốc 0 = `JOB_SUCCESS` Q001:

| Mốc | Lệch |
|---|---|
| `JOB_SUCCESS` Q001 | +0,0 s |
| checkpoint ghi xong | +0,7 s |
| `RECONCILE_START` Q002 — **hết khoảng nghỉ** | **+12,7 s** |
| `RECONCILE_RESULT` — ChatGPT idle | +19,0 s |
| `PROMPT_SUBMISSION_RESERVED` Q002 | +19,0 s |

**Khoảng nghỉ thật = 12,0 giây, cấu hình 12 giây.** Tổng `completed_at` Q001 →
`submitted_at` Q002 = **20 giây**, trong đó 6,3 giây là nghỉ an toàn (cấu hình 6).

Trước bản vá, cùng điều kiện đó, riêng khoảng nghỉ 12 giây đo được **288 giây**.

### Một chi tiết giải thích vì sao bug này ẩn được lâu

Cùng lúc panel bị che, nghỉ an toàn 6 giây **trong content script** vẫn đo đúng **6,3 giây**.
Không mâu thuẫn: Chrome bóp nặng **chuỗi timer nối nhau** (nesting cao) — đúng hình dạng vòng
lặp 12 nhịp `await sleep(1000)` cũ — chứ không bóp một `sleep()` đơn lẻ gọi từ message handler.

Nên mọi lớp cooldown vẫn trông bình thường trong khi khoảng nghỉ đã phồng gấp hàng chục lần.
**Đừng dùng "cooldown vẫn đúng giờ" để kết luận "không bị bóp".** Đây cũng là lý do B-29 đóng
lại mà không cần vá.

### Còn một mảnh nhỏ, nói rõ cho khỏi tưởng đã kín

Trạng thái "panel bị che" là **lời Đức**, không phải thứ artifact tự tố giác. Không có dòng nào
trong JSONL ghi `document.visibilityState`, nên một phiên sau đọc lại file này không thể tự kiểm
điều đó. Muốn kín hoàn toàn thì ghi thêm số nhịp (`ticks`) mà module trả về vào audit — panel
hiện cho 12 nhịp/12 giây, panel bị che cho ~7 — lúc đó chính con số tự nói nó chạy ở chế độ nào.
Chưa làm, vì nó là đổi hợp đồng audit chứ không phải phần của fix này.

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
| `live-trial-audit-20260828.jsonl` | **Nhật ký run thật** — 42 event, chứa mọi mốc của bảng trên |
| `live-trial-results-v10-20260828.xlsx` | Sổ cái run thật, 2/2 SUCCESS |
