# HANDOFF-ARCHIVE-02 — `workers/duc-auto-chatgpt/v0.1.0/HANDOFF.md`

> **Bản dài nguyên văn của các mục đã được viết ngắn trong `HANDOFF.md` cạnh file này.**
> Đổi chỗ ngày 2026-09-06 theo [ADR-0011](../../../docs/adr/0011-handoff-chan-o-dau-vao-va-xoay-theo-thang.md)
> mục ⑶ (Đức duyệt) và [ADR-0012](../../../docs/adr/0012-handoff-loc-theo-noi-dung-khong-loc-theo-ngay.md),
> phiên `claude-codex-ngan`.
>
> **Nguyên văn, không sửa một chữ, không xoá một dòng.** Viết ngắn là **đổi chỗ chi tiết**, không
> phải xoá: mọi số đo, mọi vòng audit, mọi lần tác giả tự đính chính kết luận sai đều ở đây. Các
> mục xếp theo đúng thứ tự chúng vốn nằm trong file gốc.
>
> SHA-256 của `HANDOFF.md` **trước** lượt đổi chỗ: `e068861a47229370b35148f3037af87a42484d0a11dfc444fd0c30dad5866764`.
> SHA-256 của phần thân dưới đây: `f02a3dc11afced1ce7305bb265e927baf0417e2f5d7ec28897b12a3499587e02`.
> Ghép phần thân đó vào đúng chỗ các mục tương ứng trong `HANDOFF.md` là dựng lại được bản gốc
> **giống hệt từng byte** — đã đo, không phải lời hứa.
>
> **Chỉ đọc.** Ghi Log mới thì ghi vào `HANDOFF.md`, đừng ghi vào đây.

<!-- ARCHIVE-BODY-START -->
## Log

## 2026-09-02 — `claude-surface-fix`: vá lỗ hổng surface (Đức giao gói)

**Triệu chứng Đức nêu:** chạy từ trang chủ `chatgpt.com/` thì hỏng, muốn từ sau không bị chặn nữa.

**Sổ tay đang ghi SAI nguyên nhân.** Bảng lỗi #2 nói *"cú điều hướng xoá mốc gán kết quả trong
bộ nhớ content script"*. Đọc code thì nguyên nhân sớm hơn và tầm thường hơn nhiều — **hai lỗi
tách bạch**:

1. **Mô hình sai.** `surface()` trả `CONVERSATION` cho **mọi** url chatgpt.com, kể cả trang chủ.
   Chú thích cũ tự giải thích: *"mọi URL hội thoại đều là cùng một surface"* — đúng với hội
   thoại, nhưng quên trang chủ không phải hội thoại.
2. **Có luật mà không nối dây.** `surfaceAllowed` được gọi **đúng một chỗ trong cả nhánh**:
   dòng in ra của `dom_probe`. Nó không chặn gì. Đo thật cùng ngày: `ping` trả `state: READY`
   khi tab ở trang chủ — tôi suýt tin con số đó mà gửi.

**Đây là lỗ hổng NGANG HÀNG, không phải bài toán mới.** Cả `gemini` lẫn `gg-flow-video` đã nối
dây này từ trước; chú thích của gemini mô tả đúng cùng một lỗi (*"gửi từ /images khiến tab ĐIỀU
HƯỚNG sang /app/<id>"*), giải xong từ 25/08. Nhánh này là cái duy nhất còn hở.

**Đã vá — port, không sáng chế:**

| Điểm | Trước | Sau |
|---|---|---|
| `surface()` | mọi url = hội thoại | phân biệt theo đường dẫn: `/c/<id>` = hội thoại, còn lại = `LAUNCHER` |
| `surfaceAllowedNow()` | không có | có, trong `content.js` |
| readiness | không hỏi surface | hỏi — `ping` thôi nói READY ở trang chủ |
| trước khi gửi | không chặn | ném `WRONG_SURFACE` **trước tác dụng phụ đầu tiên** |

`/g/<gpt>/c/<id>` của GPT tuỳ chỉnh vẫn được cho qua — đã ghim.

**PHÁT HIỆN ĐÁNG GIÁ NHẤT: suite đang ghim chính cái lỗi.** `tests/provider-adapter-static.mjs`
có sẵn dòng `assert.equal(adapter.surfaceAllowed("https://chatgpt.com/"), true)`. Lỗi sống dai
**không phải vì không ai kiểm**, mà vì **phép kiểm khẳng định hành vi sai**. Đã sửa dòng đó và
ghi rõ lý do ngay tại chỗ. Bài học: lỗi nào sống dai thì đọc phép kiểm đang bảo vệ nó.

**Mức bằng chứng, nói thẳng:** `/c/<id>` là hội thoại và `/` thì không — **[ĐO]** live 02/09 hồ
sơ kaito. Mọi đường dẫn chatgpt.com khác bị xếp `LAUNCHER` là **[DÒ]**, chưa đo. Chọn có chủ
đích: chặn nhầm tốn một câu thông báo rõ ràng và một cú bấm; cho qua nhầm tốn một lượt sinh và
một lỗi hết-giờ không nói gì. Gặp dạng hội thoại không có `/c/` thì nới **kèm probe chứng minh**.

**Số:** suite 98/98. Đột biến: 8 lượt, **1 THOÁT rồi được vá** (mốc thứ tự ban đầu chỉ so với
lúc gõ chữ; nay so với **tác dụng phụ đầu tiên**, và mốc phải là LỜI GỌI chứ không phải tên hàm
— `indexOf` bắt trúng chỗ khai báo nằm sớm hơn).

**CHƯA kiểm chứng LIVE.** Bản vá nằm trong `content.js`, cần Đức **reload extension** rồi F5 tab
thì mới có hiệu lực. Nghiệm thu: để tab ở trang chủ → `ping` phải thôi trả `READY`.

**Không đụng `STATUS.md`** — đó là việc của phiên `claude-y03` đang giữ `_root` và `gemini`.

### Vòng 2 cùng ngày — đo live cho thấy bản vá vòng 1 CHƯA ĐỦ

Đức reload extension và chuyển tab về trang chủ. Đo:

| Đo trên `https://chatgpt.com/` | Kết quả |
|---|---|
| `surface` | `LAUNCHER` ✅ (bản cũ trả `CONVERSATION`) |
| `surface_allowed` | `false` ✅ |
| **`ping` → `chatgpt.state`** | **`READY` ❌ — vẫn sai** |

**Tôi đã nối dây thiếu, đúng cái lỗi tôi vừa phê phán.** Vòng 1 nối `surfaceAllowedNow()` vào
hai chỗ gọi `DacChatReadiness.evaluate`, nhưng **đường của `ping` không đi qua đó**: handler
`DAC_PING` trong `content.js` trả thẳng `composerFound` thô, và side panel tự tính `state` từ
các trường đó.

**Vòng 2 vá ba mắt xích còn thiếu — và mỗi mắt đều được đo, không đoán:**

1. `DAC_PING` nay báo thêm `surfaceAllowed`. **Cố ý KHÔNG bóp méo `composerFound` thành false:**
   side panel đang ánh xạ `!composerFound` → `RECEIVER_LOST`, mà mã đó bảo operator *reload tab*
   — sai thuốc. Thứ họ cần là *mở một cuộc hội thoại*.
2. Side panel có nhánh riêng `WRONG_SURFACE`, đặt **trước** nhánh `RECEIVER_LOST`. Content
   script bản cũ không có trường này sẽ trả `undefined`, và nhánh cố ý chỉ bắt `=== false`.
3. `runner-core.js`: khai `WRONG_SURFACE` vào danh mục chuẩn **và** thêm luật phân loại theo
   tiền tố. **Thiếu luật phân loại thì cả lớp bảo vệ im lặng không chạy** — thông điệp rơi
   xuống nhánh cuối thành `OTHER`, mà `OTHER` thì ĐƯỢC RETRY, nên khai "hard stop" trở thành
   vô nghĩa. Đây là mắt xích tôi suýt bỏ qua lần thứ ba.

Thêm nhóm hướng dẫn `WRONG_SURFACE` vào bảng Halt (11 → 12 nhóm), nói rõ **chưa gửi gì, chưa
tốn lượt nào** — nếu không operator sẽ tưởng vừa mất một lượt sinh và ngần ngại chạy lại.

**Ghim cả chuỗi ba mắt xích** (phân loại → hard stop → không retry) chứ không ghim từng mảnh:
hỏng một mắt là hỏng cả. Suite 98/98, **2/2 đột biến bị bắt**.

**Bài học lặp lại lần thứ ba trong một phiên:** khai một luật ở một chỗ rồi tưởng là xong.
Lần sau, với mọi luật mới, phải liệt kê **mọi đường đi tới nó** rồi mới báo xong — `ping`,
`runPrompt`, `dom_probe` là ba đường khác nhau và chúng không dùng chung mã.

**CẦN RELOAD LẦN NỮA** — vòng 2 sửa `content.js`, `sidepanel.js`, `runner-core.js`.
Nghiệm thu: trên trang chủ, `ping` phải trả `failure_type: WRONG_SURFACE` thay vì `READY`.

---

## 2026-09-02 · phiên `claude-y02-probe-article` — `dom_probe` thôi mù chữ trên trang

**Làm gì:** vá trường duy nhất trong payload `diagnostics.dom_probe` có chữ của trang.
Nó dựng từ `document.querySelectorAll("article")`, mà ChatGPT đã rời `<article>` từ lâu.

**Số đo, tự chạy lại chứ không nhận báo cáo:** hai profile (`anhducds_multi work flow`,
`kaito`), hai hội thoại khác nhau, `served_by` xác nhận đúng nhãn cả hai lần. Kết quả giống
nhau: `articleSample: []` · `assistantCount: 3` và `1` · `data-turn` trả `assistant/user`
đầy đủ · `truncated: false` · payload 7.780 và 7.404 byte trên nắp 65.536. Tức **không**
phải bị cắt cho vừa nắp, và **không** phải trang trống — selector chết, im lặng.

**Nó sống một tuần trong chính hồ sơ bằng chứng:** `Pilot-13_References/evidence/`
`dom-probe-baseline-before-run.json` ngày 26/08 đã ghi `articleSample: []` ngay cạnh
`assistantCount: 7`.

**Vá thế nào:** một định nghĩa, hai người đọc — `MESSAGE_TURN_SELECTOR` (`data-turn` đứng
đầu) cho mẫu **chữ**; `MESSAGE_DISCOVERY_SELECTOR` = selector đó **cộng** `[data-testid]`,
chỉ để dò tên attribute. `[data-testid]` **không** được đọc chữ: trên trang thật nó khớp cả
hàng sidebar và nút bấm, và mẫu chữ không được báo "New chat" như thể là nội dung hội thoại.
Trường đổi tên `articleSample` → `messageSample`: tên cũ nói dối về selector của chính nó.

**Và nay nó lên tiếng** — `messageSampleDiag` với 4 trạng thái phân biệt được ba tình huống
trước đây trông giống nhau: `OK` · `MATCHED_BUT_NO_TEXT` · `NO_CONTAINER_MATCHED` · và
`DROPPED_FOR_SIZE`. Cái cuối là **đường im lặng thứ hai vào cùng một hiểu nhầm**: nhánh bóp
payload xoá trắng mẫu chữ mà không nói gì. Kèm `selector` · `matched` · `sampled` ·
`with_text` để người đọc sau thấy thứ đã thử.

**Kiểm phép kiểm cũ trước khi sửa** (bài học lỗi #2 của sổ tay): grep cả gói —
**không một test nào nhắc `articleSample`**, kể cả để khẳng định nó được phép rỗng. Không
phải nới lỏng gì để bản vá xanh. Nên ghi lại: một lỗi sống dai vì phép kiểm khẳng định sai
(lỗi #2), hoặc vì **trường quan trọng không có phép kiểm nào** (lỗi #5). Cái thứ hai khó
thấy hơn — grep không trả gì thì trông như sạch.

**Ghim:** `tests/dom-probe-message-sample-smoke.mjs`. Nó **không grep mã**, nó **chạy chính
đoạn đã ship** — cắt khối mã ra khỏi `content.js` rồi thực thi trong `vm` trên 3 DOM giả
dựng theo số đo live, cộng một lượt chạy thật nhánh bóp payload. Suite **99/99 xanh**.
**3/3 đột biến bị bắt:** trả selector về `'article'` → sai ở case live; ép status luôn `OK`
→ sai ở case selector chết; bỏ dòng `DROPPED_FOR_SIZE` → sai ở nhánh nắp payload.

**Không đụng vào:** `sanitizeLedgerJob` trong `bridge-proposal-core.js` — lớp che
`response_text` là ranh giới attribution có chủ đích, đổi phải hỏi Đức.

**Còn mở:** B-32 (nghiệm thu trên trang thật) và B-33 (ba nhánh kia có cùng lỗi không).

**CẦN ĐỨC RELOAD EXTENSION** — `chrome://extensions` → Reload, trên **cả ba** profile đang
nối (`Bình`, `kaito`, `anhducds_multi work flow`). Reload tab là **không đủ**: đã thử
`chat.reload` trên `kaito` lúc 13:44, probe sau đó vẫn trả trường cũ `articleSample` —
đúng như lỗi #1 của sổ tay đã ghi. Nghiệm thu không tốn credit: chạy lại `dom-probe`, phải
thấy `messageSampleDiag.status: "OK"` và `messageSample[].txtHead` có chữ thật của trang.

### Bổ sung cùng ngày — nghiệm thu live sau khi Đức reload extension

Đức reload xong. Chạy lại `dom-probe` trên `anhducds_multi work flow`, `served_by` xác nhận
đúng nhãn: `messageSampleDiag` trả `status: "OK"` · `matched: 10` · `sampled: 4` ·
`with_text: 4`, và `txtHead` có **chữ thật của trang, tiếng Việt còn nguyên dấu**. Trường cũ
`articleSample` đã biến mất khỏi payload. **B-32 đóng.**

Payload thô trước và sau lưu ở `evidence-dom-probe-message-sample-20260902/` — hai profile
lúc còn lỗi, một profile sau khi vá, kèm `KET-QUA.md`.

**Một điều học được lúc nghiệm thu, đã ghi vào sổ tay:** `matched: 10` trên trang có **5**
lượt. Mỗi lượt ChatGPT có **hai** tầng cùng khớp — khung ngoài mang `data-turn`, khối trong
mang `data-message-author-role`. Nên 4 mẫu chữ chỉ phủ **2** lượt. **Giữ nguyên có chủ
đích:** khi một tầng marker chết thì thứ cần thấy chính là tầng nào còn sống, và `attrs`
hiển thị rõ hai tầng cạnh nhau. Ai muốn đếm số lượt thì đọc `assistantCount`, đừng đọc
`matched` — đã ghi đúng câu đó vào bảng lỗi #5 để người sau không phải đoán.

**Còn mở:** B-33 (worker gemini và gg-flow-video có cùng lỗi selector chết không — gói khác,
chủ khác). Và commit của phiên này **chưa push**: `safe-push` từ chối vì bên dưới có 9 commit
của ba phiên khác, đúng luật ngoại lệ (a) ở mục 2 của `AGENTS.md`.
- 2026-09-02 · `claude-bridge-multiprofile` · **Port nút "Lưu tên" + bộ vá sanitize label từ Gemini.**
  `DAC_BRIDGE_LABEL_SET`: sanitize → lưu → cycle đúng socket profile này → lần nối mới (đi trọn
  challenge → proof → auth) báo danh tên mới tức thì. Sanitize cả ba bản sao (transport, panel,
  host): chặn 256 ký tự TRƯỚC khi quét (O(cap)), lọc thêm C1 U+0080–U+009F, quét surrogate mồ côi
  ở nấc cắt. Test `bridge-profile-label-save-smoke.mjs` bản chuyển thể (mọi kết nối giả đi qua
  challenge; ghim hành vi cho cả parseInstance của host); 5/5 mutation đỏ. Suite 100/100.
  Mẫu gốc đã qua 2 vòng audit Codex bên Gemini cùng ngày; diff bên này là cùng khuôn.
- 2026-09-02 · `claude-bridge-multiprofile` · Bổ khuyết theo audit port nút Lưu tên (2 MED, 0 lỗi sản xuất — 2 INFO xác nhận code đúng): thêm ca proof SAI ngay sau chu kỳ đổi tên → vẫn fail-closed, token không rời máy; premature auth_ok + cổng authSent đã được ghim từ trước ở test async. Hạn chế ghi nhận trung thực: thứ tự chặn-trước-quét của sanitize không ghim được bằng outcome test (đã xác nhận tĩnh ở 2 vòng audit bên Gemini); bản sao sanitize trong panel chỉ ghim wiring. Suite 100/100.
- 2026-09-03 · `claude-bridge-multiprofile` · **Phiên làm việc theo tab — bước 1 ship** (`54160a2`, ADR-0046: Đức duyệt hướng A, trần 3, cả hai chiều, ChatGPT trước). Một profile gắn tên tối đa 3 tab ChatGPT; mỗi phiên một ghế Bridge riêng đi trọn bắt tay challenge→proof→auth (instance_id = mã phiên, label = tên phiên); host/CLI/giao thức không đổi. Method chạm tab (`dom_probe`, `system.ping`, `chat.reload`, `run.trial`) bind vào tab CỦA phiên gọi; khoá một-run-một-lúc giữ nguyên. Panel: khối "Phiên làm việc theo tab" (gắn/gỡ/đổi tên, hiệu lực NGAY). Test 3 lớp mới `bridge-workspace-seats-smoke.mjs`; 13/13 mutation đỏ. Ghế hồ sơ giữ nguyên hành vi: 5 test transport cũ xanh nguyên vẹn.
- 2026-09-03 · `claude-bridge-multiprofile` · **Vá audit Codex vòng 1** (`821eefa` — 4 HIGH, 1 MED, 1 LOW, đều lỗi thật): đổi pairing giờ đóng ghế workspace NGAY trong khối đồng bộ + chốt `pairingAtProof` (hết cửa gửi token MỚI cho host mới chứng minh token CŨ); dấu phiên `chrome.storage.session` — mở Chrome mới là vô hiệu liên kết tab (tab_id không sống qua phiên trình duyệt), gõ đúng tên cũ + Gắn tab là phiên trở lại đúng mã; từ chối workspace_id nhái instance_id profile; thêm `tabs.onReplaced`; serialize đọc identity (hết mint 2 id lần đầu); file test hết byte điều khiển thô. 5 pin hồi quy mới, 5/5 mutation đỏ.
- 2026-09-03 · `claude-bridge-multiprofile` · **Vá audit Codex vòng 2** (`a7a5201` — 3 HIGH trong chính lớp vá): `loadPairing()` với pairing đổi trên đĩa cũng là rollover (đóng đồng bộ rồi cycle); vô hiệu liên kết TRƯỚC, trồng dấu SAU khi store ghi xong (crash-consistent) + mặc định fail-closed khi không đọc được dấu; `onRemoved`/`onReplaced`/rời-trang đóng ghế đồng bộ trong callback, không qua hàng đợi. 4 pin mới, 4/4 mutation đỏ. **Vòng 3 audit: PASS** — không lỗi mới. Bằng chứng đủ 3 vòng + 3 harness mutation (22/22 đỏ): `evidence-workspace-seats-20260903/`. Suite 101/101 (dòng "102/102" trong message `54160a2` là đếm nhầm). Còn mở: (a) MỘT lần thấy `bridge-multiprofile-transport-async-smoke` đỏ khi chạy suite ngay sau loạt mutation dưới tải, 8 lần chạy lại đều xanh — nghi flake nhịp 5ms, theo dõi thêm; (b) N run đồng thời cần brief riêng (tách queue/ledger theo phiên — ADR-0046 đã duyệt chiều ghi nhưng miếng exact-once vẫn phải có brief + audit riêng); (c) Gemini/Flow migrate SAU khi GPT chạy ổn (lời Đức 03/09).
- 2026-09-03 · `claude-bridge-multiprofile` · **Vòng 4: kiểm 5 bất biến GPT nêu + vá 2 lỗi thật.** Đức duyệt carry, đã push 17 commit (kèm 11 của phiên k2-design) → GPT audit được qua GitHub, trả về 5 bất biến; Codex kiểm trên code thật: INV-1 (target theo từng RPC) HELD + thêm test RPC đồng thời chéo ghế trả lời ngược thứ tự; INV-2 (ghế = định tuyến tab, kho chung) HELD + mục 6 sổ tay; INV-3 PARTIALLY → **VÁ**: `run.stop` trong cửa sổ chưa-bind không gửi DAC_ABORT vào tab active nữa (cờ dừng cục bộ tự đủ); INV-4 "ghế phải bám hội thoại" = khác THIẾT KẾ đã chốt (ghế bám tab, run bám hội thoại — ADR-0046) → mục 8 sổ tay nói thẳng; INV-5 → **VÁ THẬT**: `seatEpoch` vô hiệu continuation connect cũ (Codex dựng được interleaving "kiểm tab A xong chiếm ghế đã gắn sang tab B đang rời trang" → thành test 2d). Mutation MC1+MC3 đỏ. Suite 101/101. B-34 (gom control queue) + B-35 (N run đồng thời) vào backlog. Bằng chứng: `evidence-workspace-seats-20260903/AUDIT-r4-*` + `NOTES-R4-GPT-INVARIANTS.md`.
- 2026-09-03 · `claude-bridge-multiprofile` · **Vòng 5: route lease** — GPT xác nhận 2 vá vòng 4, bắt thêm HIGH thật: RPC đang bay giữ snapshot tab cũ, Đức gắn lại phiên giữa chừng thì `run.trial`/`chat.reload` vẫn hành động lên tab cũ (socket guard chỉ chặn response, không chặn side-effect). Vá: `leaseHolds` trong workspace-core + `resolveWorkspaceTab` đọc lại kho bền tại thời điểm hành động (một chỗ nghẽn phủ cả 4 method chạm tab); panel nạp workspace-core. 2 ca đua GPT yêu cầu thành test predicate + pin tĩnh dây nối; mutation MD1+MD2 đỏ. Codex vòng 5 CONDITIONAL PASS — điều kiện duy nhất là ghi trung thực cửa sổ check-to-act còn sót (một round-trip tabs.get, thay cho 30s trước đây) → đã ghi vào comment + `NOTES-R5-ROUTE-LEASE.md`. Suite 101/101.
- 2026-09-03 · `claude-bridge-multiprofile` · **Vòng 6 (GPT REVISE vòng 5): lease xuống CUỐI resolver + race test thật.** (1) `resolveWorkspaceTab` giờ đọc lease SAU `tabs.get` + kiểm origin — khe check-to-act từ "một round-trip tabs.get" co còn lát cắt cross-process, không còn await nội bộ nào trong khe. (2) `tests/bridge-workspace-lease-race-smoke.mjs`: harness vm ĐẦU TIÊN thực thi sidepanel.js thật (DOM/chrome stub, nạp theo đúng thứ tự script của sidepanel.html, vào bằng DacBridgeExecutorTestHooks) — treo `tabs.get(101)`, rebind phiên sang 102 bằng đúng thao tác ghi kho của SW, nhả: `chat.reload` không reload 101, `run.trial` không bind 101 (đi qua dev-mode + latch thật), `dom_probe` không probe 101, ca đối chứng không-race chạy xuyên suốt. Mutation ME1 (lease luôn true) + ME2 (dời lease ngược về trước tabs.get — layout vòng 5) đều làm race test đỏ. Suite 102/102. Harness này cũng là nền cho các test panel-hành-vi sau này (trước giờ panel chỉ test tĩnh).
- 2026-09-03 · `claude-bridge-multiprofile` · **GPT chốt PASS — bước 1 Workspace Seats ĐÓNG BĂNG.** GPT xác nhận vòng 6 đạt cả hai điều kiện (lease cuối resolver; race test hành vi thật), không HIGH/MAJOR mới, và chỉ đạo dừng hardening để tránh over-engineer. Phán quyết + giới hạn bằng chứng ghi ở `evidence-workspace-seats-20260903/VERDICT-STEP1-PASS-FREEZE.md`. Tổng bước 1: 6 vòng audit, 32 mutation đỏ, suite 102/102. Việc kế = pilot vận hành thật — PHẢI Đức duyệt trước (luật mục 2); các bước đề xuất nằm trong `next_step` của STATUS.md. Sau pilot ổn mới tới B-35 (N run đồng thời) rồi migrate Gemini/Flow (thứ tự Đức chốt).
- 2026-09-03 · `claude-gpt-kenh` · **`chat.read` — bridge đọc được nội dung hội thoại về máy.** Số đo mở đầu: quét TOÀN BỘ payload `dom_probe`, trường chữ dài nhất là cái URL (114 ký tự) — mẫu chữ cắt ở 60 ký tự, chỉ 4 khung, mà mỗi lượt ChatGPT khớp hai tầng khung nên phủ đúng **2 lượt**. Cố ý KHÔNG nới `dom_probe`: bắt một trường soi-cấu-trúc chở nội dung thì cái vỡ trước là chẩn đoán, đúng cách lỗi #5 sống được một tuần. Thêm method read-only riêng, 4 tầng (`content.js` hàm thuần + handler · `bridge-core.js` validator + registry · `sidepanel.js` dispatch theo ghế phiên · `bridge-cli.mjs` cả hai bản, đã đối chiếu giống nhau); không lấy chốt mutation nên đọc được trong lúc run đang chạy. **Suite của repo bắt 3 lỗi của tôi, cả 3 đúng:** `provider-adapter-static` chặn lưới dò selector đóng cứng tên attribute (sửa thành quét trung tính `*` nắp 400 — cũng đúng hơn về chức năng, vì lưới dựng từ marker đã biết sẽ chết đúng lúc cần nó nhất); `bridge-method-registry` chặn `deadline_ms: 15000` và `idempotent: true` trên method read-only; purity của `bridge-core.js` chặn chữ `window` trong description. **Nghiệm thu live** trên ghế `MVP_GPT Chat debug` sau khi Đức reload: `status: OK`, `matched: 5`, `with_text: 5`, đọc trọn 5 lượt tiếng Việt có dấu — bằng chứng thô `evidence-chat-read-20260903/`. **Chính số đo live lộ ra một lỗ tôi tự tạo:** hai nắp an toàn khi đứng riêng nhưng nhân nhau ra ~2 MB trên trần envelope 1 MB (`bridge-host.mjs:8`) → thêm nắp tổ hợp `limit x max_chars_per_turn <= 200000`, **từ chối ở cửa vào** chứ không cắt bớt lượt (câu trả lời ngắn mà trông đầy đủ tệ hơn một lỗi nói "hỏi ít thôi"). `tests/chat-read-smoke.mjs` ghim cả hai: 7/7 rồi 4/4 mutation đỏ. Suite 102 → **103/103**. Còn mở: (a) nắp tổ hợp **chưa nghiệm thu live** — bản trong RAM lúc chụp là bản trước khi có nắp, nên file `02-…-cho-qua.json` là bằng chứng của lỗ chứ không phải của tính năng, cần một lần reload nữa; (b) nửa **GỬI** vẫn chỉ có `run.trial` với trần cứng 90 giây (lỗi #4) — ba đường đi (method `chat.send` mới · nới trần · để timeout rồi `chat.read` lấy sau) đều chạm luật an toàn nên là việc Đức chốt, không tự làm.
- 2026-09-04 · `claude-gpt-kenh` · **Kênh CC↔GPT đóng vòng thật, 2 loop tự động.** Đường gửi KHÔNG phải `chat.send` mới (tôi đã kết luận sai một lần rồi tự sửa): nó là `jobs.add` → `run.trial` → `chat.read`, và `jobs.add` tự dựng workbook trong bộ nhớ (`sidepanel.js:3270` gọi `createWorkbook`) nên không cần file XLSX nào. Loop 1: `trial-b5309b27`, SUCCESS **41 giây** — DƯỚI trần 90s, nên đường "để timeout rồi đọc sau" chưa cần dùng và câu hỏi đổi luật an toàn tự tan. Loop 2: `trial-12ca3fe3`, SUCCESS ~49 giây. Cả hai đọc về bằng `chat.read`, 1.953 và 1.926 ký tự, `truncated: false`. Cửa `TRIAL_COOLDOWN_ACTIVE` 5 phút giữa hai trial là thật — chờ, không đi vòng. **Chặn phải nhờ Đức mở (3 công tắc chỉ Đức bấm được):** mở session · chọn thư mục đích · bật chế độ phát triển. Cái thứ hai là cái mở nghẽn: có thư mục thật thì sổ audit ghi bằng File System Access, không đi qua Chrome Downloads, nên **B-36 rời khỏi đường đi** — đo được `checkpoint.verified: true` thay cho `PERSISTENCE_FILENAME_MISMATCH`. **B-36 mới, P1, chưa vá:** 36 file tên-GUID trong Downloads của Đức từ 09/07 tới 04/09, gồm cả file 28/08 tức SAU khi B-13 được ghi "đã đóng"; nội dung file luôn đúng, chỉ cái tên bị Chrome đặt. Ba phép kiểm canh nó đều TĨNH nên không bắt được. Đức đo trong console SW: `{api: 'object', listener: true}` → loại giả thuyết "API không tồn tại"; determiner có chạy mà trượt lúc khớp. **GPT sửa tôi một chỗ và nó đúng:** giữ `generated_commit` trong `REPO_MAP_VOLATILE_KEYS` là ĐÚNG, bỏ ra sẽ tự tham chiếu (sinh tại A → commit thành B → đóng dấu lại B → commit C, vô hạn) — chính comment `build-dashboard.mjs:56` đã nói thế, nên "lệch 19 commit" tôi nêu ở loop 2 là hệ quả của một thiết kế đúng, không phải bug. **Lỗ thật còn lại, hẹp hơn:** `artifact_url` và `renderer_version` không có ở đâu cả; `DASHBOARD.md` CÓ dấu `STAMP_PREFIX` (`98aa37b`) còn `DASHBOARD.html` KHÔNG có dấu nào; và hai file máy sinh cùng repo đang khai hai commit nguồn cách nhau 19 commit (`DASHBOARD.md` 98aa37b vs `repo-map.json` f5e3b13) — với người audit chỉ đọc GitHub thì đó là xuất xứ nhập nhằng. **Phản biện tôi CHƯA gửi được:** cổng tươi hiện có đã sinh lại tại HEAD (`createHeadDeps`) rồi so với bản đã commit, nên mọi thay đổi đầu vào HAY renderer có ảnh hưởng đầu ra đều bị bắt sẵn — tôi bị chính nó chặn hôm nay; cổng "stale" GPT đề xuất cho loop 3 có thể dư. **Chặn:** loop 3 nằm ở `scripts/` + gốc repo = vùng `_root`/`_code`, đang do `claude-dieu-phoi` và `claude-dashboard` giữ; và 2 commit lane khác (`f326c11`, `8980fc2`) nằm trước 2 commit của tôi (`98aa37b`, `b824a23`) nên push là carry — cần Đức chốt (luật mục 2 hàng 2). GPT cũng khuyên không carry.
- 2026-09-04 · `claude-gpt-kenh` · **B-36 ĐÃ VÁ, chờ nghiệm thu live.** Cách phát biểu bản vá quan trọng hơn bản vá: tôi **không** đo được Chrome đang kích nhánh nào, đo được là **mã có HAI nhánh im lặng mất tên** và cả hai đều dựng nổi ca hỏng — nên không cần biết Chrome cư xử ra sao mới gọi cả hai là lỗi. Bản vá đổi **bằng chứng sở hữu** từ `item.byExtensionId` sang **phiếu giữ tên**: phiếu khớp URL là bằng chứng mạnh hơn, vì chỉ extension này tạo nổi blob URL trên origin của nó và phiếu chỉ được trồng ngay trước `downloads.download` trong cùng một lượt. Tra phiếu TRƯỚC, nhường chỉ khi không có phiếu dùng được; thêm nhánh đi vòng hẹp cho URL lệch, chỉ nhận khi đủ ba điều (blob origin của chính mình · còn đúng MỘT phiếu còn hạn · phiếu cũng trỏ origin ấy). **Phép kiểm hành vi mới** `tests/download-name-determiner-behaviour.mjs`: cắt khối đặt tên khỏi `background.js` và CHẠY, với `chrome` giả và **đồng hồ do harness cầm** — chỗ này là bắt buộc, vì vòng thử phá ĐẦU TIÊN có 2/8 đột biến lọt lưới (nhận phiếu quá hạn, nhận khi có nhiều phiếu), tức hai bất biến tôi viết bằng chữ mà chưa dựng nổi ca hỏng; sửa PHÉP KIỂM chứ không sửa mã, rồi mới đủ **8/8 đỏ**. **Một phép kiểm cũ phải viết lại và đó là bài học riêng:** `download-name-determiner-static.mjs` khẳng định determiner PHẢI chứa `item.byExtensionId !== chrome.runtime.id` — nó ghim CÁCH LÀM, mà cách làm chính là con bug, nên vá xong là nó đỏ. Một phép kiểm khẳng định sự tồn tại của bug là bức tường chặn đường sửa bug. Viết lại thành bất biến sống được qua bản vá (sở hữu do phiếu quyết định · phải còn đường nhường · KHÔNG được quay lại gác bằng `byExtensionId`), dời phần kiểm KẾT QUẢ sang phép kiểm hành vi. Suite 103 → **104/104**. Cổng đóng phiên XANH TOÀN BỘ. Còn mở: (a) **nghiệm thu live** — cần Đức reload extension rồi chạy một mutation Bridge với đích ghi là Chrome Downloads (KHÔNG chọn thư mục); đạt = file mang đúng tên `<base>__audit.jsonl`, không phải GUID; (b) 4 commit của tôi vẫn chưa push, trước mặt có commit lane khác nên đẩy là carry — cần Đức chốt.
- 2026-09-04 · `claude-gpt-kenh` · **Nghiệm thu live B-36: BẢN VÁ KHÔNG GIỮ ĐƯỢC.** Đức reload, panel về trạng thái trống nên `jobs.add` tự mặc định về chế độ Chrome Downloads — đúng nhánh cần đo. Vẫn `PERSISTENCE_FILENAME_MISMATCH: requested 'Bridge-2026-09-03T18-41__audit.jsonl' but Chrome reported '16f87e2b-…'`. Số file GUID trong Downloads **36 → 37**; nội dung file vẫn đúng (793 byte, `run_id 20260903-1841-…`). Nên hai giả thuyết tôi mô hình hoá (byExtensionId trống · khoá URL lệch) **không phải nguyên nhân**, hoặc không phải nguyên nhân duy nhất. **Giữ bản vá** vì nó bịt hai đường im lặng mất tên thật có trong mã, có 8/8 mutation ghim, và phép kiểm hành vi mới vẫn là thứ ba phép kiểm tĩnh cũ không làm được — nhưng **KHÔNG được đọc nó thành bản vá cho B-36**. Đã ghi vào B-36: ba khả năng còn lại và MỘT phép đo đọc-thuần phân biệt được cả ba (`typeof takeExpectedDownloadName` + `[...expectedDownloadNames]` trong console service worker; không tạo file, không tác dụng phụ). Nếu phiếu đã bị tiêu mà tên vẫn GUID thì đây là lớp lỗi khác hẳn: determiner có đề xuất mà Chrome bỏ qua — nghi determiner của extension khác (Gemini/Flow, cùng mã) thắng theo luật "cài sau thắng". **Không vá tiếp trước khi có con số đó** — vá mò lần nữa là thêm mã vào chỗ không hỏng. Bài học tự ghi: tôi đã dựng 8 ca hỏng cho một mô hình mà chưa kiểm mô hình đó có đúng không; mutation test chứng minh phép kiểm bắt được lỗi CỦA MÔ HÌNH, không chứng minh mô hình khớp thực tế.
- 2026-09-04 · `claude-gpt-kenh` · **B-36 chẩn đoán lật ngược: determiner KHÔNG được tuân.** Đức đo trong console service worker: `{patched: 'function', tickets: []}` — mã đang chạy LÀ bản vá, và phiếu giữ tên **đã bị tiêu** trong khi file trên đĩa mang tên `16f87e2b-…`. Phiếu bị tiêu chỉ có thể nghĩa là determiner đã khớp và đã gọi `suggest({filename})`. Vậy Chrome **bỏ qua đề xuất**, và lỗi không nằm trong logic khớp của extension. **Một câu SAI trong mã đã nuôi bug này 8 tuần:** `background.js` ghi *"A filename determiner has final say"* — số đo bác bỏ. Câu đó chỉ determiner ra làm chỗ sửa, nên một file GUID trên đĩa đọc thành "determiner cần chỉnh" thay vì "determiner không được tuân". Đã thay bằng số đo và giữ nguyên đoạn đính chính đầy đủ để người sau không phải suy lại. **Ứng viên còn lại:** blob được tạo ở side panel (`sidepanel.js:5221`) rồi CHUỖI url truyền sang service worker nơi `downloads.download` chạy — blob URL gắn ngữ cảnh; nội dung giải được nhưng đặt tên có thể không. Đã ghi vào B-36 phép đo phân biệt (tạo blob NGAY TRONG service worker, không trồng phiếu) cùng bảng hai nhánh việc: nếu tên dính thì vá hẹp (truyền BYTES thay vì blob URL); nếu vẫn GUID thì Chrome Downloads không đặt tên nổi artifact và phải thôi phụ thuộc nó — mà đổi mặc định bootstrap `sidepanel.js:1629` là đổi quyết định Đức chốt 25/08 nên phải hỏi Đức.

- 2026-09-05 · `claude-gpt-no` · **B-22 + B-23 đóng** (`b8ce8ec`, `c9829f9`). **B-22 — huỷ tới trước job không còn bị `runPrompt()` xoá trắng.** Cùng race G-01 của Gemini, nguyên văn dòng code: `STATE.abortRequested = false` ở đầu `runPrompt()` xoá trắng một `DAC_ABORT` tới TRƯỚC `DAC_RUN_IMAGE_JOB`, và prompt vẫn bay (bên Gemini đo thật 26/08: STOP_REQUESTED_BEFORE_SUBMIT 14:20:36 → PROMPT_SUBMITTED 14:20:37, đúng một giây sau). Vá theo attempt: `STATE.abortedAttempt` nhớ attempt vừa bị dừng, dòng reset chỉ giữ cờ cho đúng attempt đó; thêm một cửa huỷ ngay đầu khối `try` — huỷ trước là huỷ HẲN, chưa gõ chữ vào composer. `DAC_ABORT` trần giữ nguyên ngữ nghĩa cũ, và `abortRequested` vẫn dựng lên TOÀN CỤC nên một lệnh dừng lệch danh tính VẪN dừng attempt đang bay (fail-closed, cố ý). Side panel: `stop()` và `bridgeRunStop()` gửi kèm `job_id`+`attempt_id`; `run()` kiểm lại cờ dừng ngay sau `await gateNextJob` rồi settle trung thực USER_STOP — gate đã ghi RECONCILING trước khi await, nên một `break` trần sẽ bỏ rơi dòng sổ ở trạng thái ấy. **Chỗ KHÔNG chép được từ Gemini, và backlog đã cảnh báo đúng:** nhánh này có `flushRunCheckpoint` giữ chỗ TRƯỚC khi gửi, nên bất biến "chỉ một await từ RUNNING tới send" của bên đó không áp được. Thay bằng bất biến THỨ TỰ: `attempt_id` + `setCurrent` phải xong trước khoảng flush, để một Stop rơi vào đó vẫn nêu tên ĐÚNG attempt sắp gửi. **B-23 — `response_sha256` nay được ĐỌC, không chỉ được GHI.** Backlog dự báo phải đổi cả chuỗi `classify`/`validSavedAttribution` sang async; **không làm thế**: `plan()` được gọi từ 14 chỗ trong `sidepanel.js`, đổi hết là một diện tích rủi ro lớn cho một phép so sánh nhỏ. Băm TRƯỚC một lượt (`verifyResponseHashes(workbook, hashText)` — hàm băm được TIÊM VÀO, nên module giữ thuần và phép so dùng ĐÚNG hàm đã ghi dấu), cất phán quyết vào một `WeakMap` khoá theo chính workbook. **WeakMap chứ không phải một trường trên job**, và đó là điểm mấu chốt: trường trên job có thể bị codec ghi ngược ra XLSX, và lúc đó người sửa file chỉ cần thêm một cột để tự cấp cho mình dấu đạt — đúng cái việc phép kiểm này sinh ra để chặn. Cửa gánh: `authoritativeValidate()`, chỗ hẹp nhất mà cả nút Run lẫn `run.trial` của Bridge đều đi qua, đặt TRƯỚC phép kiểm blocker nên một ô bị sửa rớt theo đúng đường `RESUME_BLOCKED` sẵn có, không thêm cổng thứ hai; cùng phép băm ở Check Plan để bảng không nói "xanh" rồi nút Run mới nói "chặn". **Phạm vi nói thật:** chưa băm lại thì nhánh text rơi về phép kiểm hình dạng cũ (đủ cho bảng hiển thị — không run nào khởi động được trên hàng chưa băm lại, vì cửa trên là bắt buộc); nhánh **ảnh vẫn không** có kiểm toàn vẹn nội dung, nó chỉ so tên file xin với tên file nhận — không phải bước lùi, và không phải việc của lượt này. **Số đo:** suite gói 104 → **107/107**; đột biến **16/17 đỏ** (9/10 cho B-22, 7/7 cho B-23). Cái không đỏ, ghi trung thực: bỏ dòng dọn `abortedAttempt` trong `finally`. `attempt_id` có phần ngẫu nhiên nên không bao giờ lặp, nên dòng đó là phòng xa và **không quan sát được** ở ranh giới này; giữ lại cho khớp nhánh Gemini chứ không viết một test giả cho nó. **CẦN ĐỨC RELOAD EXTENSION** ở `chrome://extensions` trước khi thử live (luật vàng 5 của gói). **Còn mở — chưa nghiệm thu live:** cả hai bản vá mới chỉ có bằng chứng harness. Nghiệm thu B-22 KHÔNG tốn credit: bấm Stop ngay trước khi job đầu được gửi, sổ phải ghi STOP_REQUESTED_BEFORE_SUBMIT mà **không** có PROMPT_SUBMITTED theo sau. Nghiệm thu B-23 cũng không tốn credit: mở Result XLSX của một run text đã xong, sửa một chữ trong ô câu trả lời mà giữ nguyên số ký tự, nạp lại làm ledger resume rồi bấm Check Plan — phải thấy `RESUME_RESPONSE_HASH_MISMATCH` nêu đích danh job đó, và Run bị chặn.

- 2026-09-05 · `claude-gpt-no` · **Kiểm chứng độc lập lại chính hai bản vá trên, sau khi phiên bị ngắt giữa chừng.** Luật vàng 4 nói báo cáo của AI khác không phải bằng chứng, và một phiên bị ngắt giữa chừng thì chính nó cũng là “AI khác” — nên tôi **không chạy lại bộ đột biến của nó**, mà tự thiết kế một bộ **12 đột biến khác**, chọn điểm phá bằng cách đọc thẳng diff của `b8ce8ec` và `c9829f9`. Kết quả: **11/12 đỏ**. B-22 (7/8): trả lại dòng reset trần · gỡ cửa huỷ sớm · bỏ danh tính ở handler · bỏ fail-closed · nút Stop gửi `DAC_ABORT` trần · `bridgeRunStop` gửi trần · bỏ phép kiểm `stopRequested` sau `await gateNextJob`. B-23 (4/4): hash lệch không còn trượt · phép so luôn đúng · phán quyết không tới được `classify` · **gỡ cửa băm bắt buộc trong `authoritativeValidate()`** — cái cuối quan trọng nhất vì nó chứng minh chỗ gánh thật sự có bị ghim, không phải chỉ ghim riêng module. **Con số sống sót duy nhất trùng đúng cái phiên trước đã tự khai là không đỏ** (bỏ dòng dọn `abortedAttempt` trong `finally`) — tức báo cáo cũ không giấu điểm yếu, và tôi xác nhận lại kết luận của nó: `attempt_id` có phần ngẫu nhiên nên dòng ấy không quan sát được ở ranh giới này. Suite gói **107/107** chạy lại sau khi khôi phục toàn bộ đột biến; ba file nguồn (`content.js` · `sidepanel.js` · `resume-core.js`) sạch tuyệt đối so với HEAD. **Không đổi một dòng mã nào ở lượt này** — lượt này chỉ để trả lời một câu: hai bản vá đã commit có thật sự được ghim không. Có. **Còn mở, không đổi:** cả hai vẫn chưa nghiệm thu live — cần Đức reload extension rồi chạy hai phép thử **không tốn credit** đã mô tả ở dòng Log ngay trên.

- **2026-09-06 · claude-gpt-b · B-29 + B-18 ghi lại dấu đóng · B-16 vá MỘT chỗ cho cả họ · B-11 chặn ở luật retry.**
  **Việc 1 — sổ nợ nói đúng số.** `B-29` (đã đo 28/08, không cần vá) và `B-18` (đã cân, chọn giữ nguyên) đều đã
  quyết xong nhưng bộ đếm vẫn tính là mở, vì nó chỉ nhận dấu đóng khi dấu đó là chữ **đầu tiên** của tiêu đề
  (`isDone` trong `scripts/build-overview.mjs` — luật cố ý, để không đóng oan mục viết "gỡ khoá sau khi việc kia
  xong"). Viết lại đúng hai tiêu đề, giữ nguyên toàn bộ chữ giải thích phía sau. Nợ gói ChatGPT **27 → 25**, đo
  bằng chính `debtByUnit`. Không đụng `B-19` · `B-27` · `B-36` · `B-07` — bốn mục đó trông giống đã đóng nhưng
  là việc mở thật.
  **Việc 2 — `B-16` và `B-11` có cùng gốc bệnh không?** Đo rồi: **cùng một nửa, khác một nửa.**
  *Cùng:* cả hai là `Error` trần rơi vào **đúng MỘT chỗ giặt trắng** — `bridgeError()` trong `sidepanel.js` chỉ
  nhận ra `BridgeProtocolError` và `ProposalError`, còn lại thành `INTERNAL_ERROR`. Đã vá **ở chính chỗ đó**
  (`classifyPlainFailure()` trong `bridge-core.js`, gọi TRƯỚC nhánh giặt trắng), không vá hai chỗ gọi.
  Và vá **cả họ sáu mã** mà `prepare()` ném ra, không riêng cái backlog gọi tên: `MISSING_REFERENCE` ·
  `AMBIGUOUS_REFERENCE` · `DUPLICATE_REFERENCE` · `DUPLICATE_ALIAS` · `MAX_INPUT_IMAGES` · `INVALID_TASK_TYPE`.
  Danh sách **liệt kê từng cái**, cố ý — luật "cứ CHỮ HOA rồi dấu hai chấm là lỗi người sửa được" sẽ gắn nhãn
  người-sửa-được cho một bug nội bộ thật, và đẩy chữ nội bộ tuỳ ý ra dây. **Không đổi `retryable`**:
  `INTERNAL_ERROR` và `VALIDATION_FAILED` cùng `retryable: false`, nên bản vá chỉ đổi *mã và câu chỉ đường*.
  *Khác — và đây là chỗ `B-11` DỪNG, chưa vá:* câu lỗi của nó (`Open an XLSX workbook first.`) **không mang mã
  nào** để nhận ra, và mã đúng theo chính mục backlog là `WORKBOOK_NOT_LOADED` — mã đó `retryable: true`. Tức vá
  `B-11` là **lật `retryable` false → true trên dây**, chạm **luật retry**, phải hỏi Đức (`AGENTS.md` gốc mục 2).
  Cơ chế đã đứng sẵn; Đức chốt xong thì phần code còn lại nhỏ.
  **Ghim:** `tests/bridge-plain-failure-classification-smoke.mjs` — **không grep mã**, nó **cắt chính hàm
  `bridgeError()` đã ship** ra khỏi `sidepanel.js` rồi chạy trong `node:vm`, ở **cả hai** trạng thái công tắc Chế
  độ phát triển (vá mà chỉ sống khi công tắc BẬT là không vá gì cả — người vận hành thật chạy với công tắc TẮT).
  `sidepanel.js` là file CRLF nên chỗ cắt chuẩn hoá xuống LF trước **và đếm số lần khớp, bằng 0 thì dừng hẳn** —
  anchor hỏng trên file CRLF đọc y hệt "không có gì để sửa". Suite gói **108/108 xanh**. **8/8 đột biến đỏ**,
  gồm cái độc nhất: **dời lời gọi xuống SAU nhánh giặt trắng** — chữ còn nguyên, hành vi chết.
  Ghi lại một cái **lọt lưới**: đột biến đầu tôi thử (dời lời gọi lên trên `console.error`) vẫn xanh — và đúng,
  nó không phá gì cả. Một lượt "đột biến xanh" đọc gần y hệt một lượt "ghim yếu", nên phải đọc kỹ đột biến của
  chính mình trước khi tin nó.
  **Còn mở:** `B-16` **chưa nghiệm thu live** — cần Đức reload extension ở `chrome://extensions` rồi gọi
  `jobs.add` với một token ảnh chưa nạp; **không tốn credit ChatGPT nào**. Chờ thấy `VALIDATION_FAILED` kèm tên
  file thiếu và chữ `references.add`, thay cho `INTERNAL_ERROR`.

- **2026-09-06 · `claude-handoff-cat` · cắt đuôi file này theo ADR-0008: giữ 20 lượt cuối, 124 lượt cũ sang `HANDOFF-ARCHIVE-01.md`.**
  Cắt theo **vị trí trong file**, không theo ngày — log gói này không xếp theo thứ tự thời gian (`08-22` → `08-24` → `08-22`), nên
  "20 lượt gần nhất theo ngày" là câu không xác định được. Tìm được **144 mục** (142 gạch đầu dòng + 2 tiêu đề `##`).
  **246,6 KB → 45,6 KB** (lưu trữ 202,6 KB). Không xoá một chữ, không sửa một chữ — chỉ dời chỗ.
  **Bất biến ⑴ đo bằng máy:** ghép `HANDOFF-ARCHIVE-01.md` (phần sau dấu `ARCHIVE-BODY-START`) vào đúng chỗ con trỏ trong file này
  dựng lại bản gốc **giống hệt từng byte**. SHA-256 `4e7fb8d53a63c382c180defba9c7d003d426fd048d7b062d43d1ec25ce3c40e2` cả hai chiều.
  Đối chiếu thêm với `git show HEAD:` — bản trong git là LF còn cây làm việc là CRLF (`core.autocrlf=true`, chênh đúng 684 byte = 684 dòng CRLF);
  chuẩn hoá về LF thì hai băm bằng nhau (`16dbbe96…`). Chênh đó là bộ lọc của git, có từ trước, không phải chữ mất.
  Đã khai `HANDOFF-ARCHIVE-01.md` vào Bản đồ file của `AGENTS.md` (bất biến ⑷). `STATUS.md` `ref_handoff` **vẫn đúng** — file này vẫn là nơi giữ trạng thái.
  Không đụng `scripts/`, `docs/`, `HANDOFF.md` gốc repo; **không sinh lại artifact máy** (phiên điều phối sinh một lượt cho cả ba lane).
- 2026-09-06 · `claude-retry-law` · **B-19 + B-11 đóng trọn — luật gửi lại sau khi đã gửi, và `run.trial` thiếu workbook**
  (brief `docs/briefs/BRIEF-RETRY-LAW-01.md`; ADR-0047 + ADR-0048; Đức chốt cả hai ngày 06/09).
  **ĐO TRƯỚC, VÁ SAU** — đúng thứ `B-19` để ngỏ: lớp đối soát trong run
  (`reconcileSubmittedAttempt` → `DAC_RECONCILE_IMAGE_JOB` → `waitForCompletion` lần hai) có **đúng một**
  phán quyết dương, *"có ảnh quy được về attempt này"*, và phán quyết đó rẽ thẳng sang `finishDetectedOutput()`
  chứ không bao giờ tới đường thử lại. Ba lối ra còn lại đều là "không chứng minh được": transport chết
  (đối soát **không chạy**) · lệch danh tính (đối soát **từ chối** chạy) · hết giờ không thấy gì.
  `verifyExistingOutput()` — hàm DUY NHẤT phán được *"ảnh này thuộc lượt gửi kia"* — có **0** chỗ gọi trên
  đường chạy tự động; nó chỉ chạy khi người vận hành bấm nút. **Số ca đối soát khẳng định được *"lượt gửi đó
  không tạo ra kết quả nào"*: 0** → luật của Đức tự thu về "chặn hẳn sau khi đã gửi", đúng tình huống brief
  đã ghi trước, nên không hỏi lại.
  **Vá:** `submissionMayExist()` trong `runner-core.js` là chỗ DUY NHẤT trả lời *"lượt gửi này có thể đã bay
  chưa"* — phase đã sau lúc gửi, **hoặc** cờ `submission_uncertain` còn bật. `canRetry()` từ chối khi nó đúng;
  `resolveJobFailure()` cho những ca đó vào nhánh `markInterrupted` + dừng batch, **không** phải `FAILED`
  (resume-core đọc `FAILED` là `SAFE_FAILED` = "bỏ qua an toàn", mà một prompt đã bay thì chưa an toàn để bỏ
  qua; `INTERRUPTED` xếp job vào `AMBIGUOUS_SUBMITTED`, nơi có nút đối soát thủ công và nút tạo lại).
  Vòng chạy **bật** cờ ở mốc đặt chỗ gửi — ghi TRƯỚC khi prompt có thể bay — và chỉ **tắt** khi receiver trả
  lời ĐÚNG danh tính attempt này và nói nó chưa gửi. Đó là chỗ đảo mặc định: từ "không biết thì gửi lại" sang
  "không biết thì DỪNG". `interruptedStatus()` đổi `&&` thành `||` cho khớp hành vi thật của funnel.
  **Không đụng đường thử lại trước lúc gửi** (cổng sẵn sàng, đính ảnh tham chiếu hỏng) — đó là phần lớn lượt
  thử lại thật, và chặn cả chỗ đó là làm hỏng tính năng chứ không phải siết an toàn.
  **B-11:** một lời gọi `requireBridgeWorkbook()` (helper có sẵn) đặt ngay TRƯỚC `authoritativeValidate()`
  trong `bridgeRunTrial()` → `WORKBOOK_NOT_LOADED` / `retryable: true` thay cho `INTERNAL_ERROR` giấu nguyên
  nhân sau công tắc Chế độ phát triển. Đặt SAU `bindRunTab(...)` là **cố ý**: cửa lease của phiên-theo-tab
  (ADR-0046) phải trả lời trước, và `bridge-workspace-lease-race-smoke.mjs` chứng minh chỗ đó.
  **Kiểm hai chiều:** hai phép ghim mới ĐỎ trên code trước khi vá, XANH sau khi vá; **10/10 đột biến đỏ**
  (gồm "tắt cờ vô điều kiện", "bật cờ sau lời gọi gửi", và "dời `requireBridgeWorkbook` xuống sau
  `authoritativeValidate` — chữ còn nguyên, hành vi chết"). Vòng thử phá đầu để lọt 1 đột biến vì phép kiểm
  đọc theo VÙNG chứ không theo DÒNG; đã siết lại rồi mới tính. Suite gói: **110/110 xanh**.
  Ba phép ghim cũ phải sửa vì chúng ghi **luật đã bị đảo**, không phải vì chúng chặt: `p1-attempt-state-smoke`
  (dòng *"Đức chose smooth-to-completion over avoiding a possible duplicate image"* — đúng quyết định bị đảo),
  `v03-operational-core-smoke`, và một dòng grep tĩnh trong `generation-limit-smoke` (`if (hardStop) {` →
  `if (hardStop || mayHaveSubmitted) {`; bất biến của nó không đổi).
  **Không chạy live trên trang thật.** Cần Đức **reload extension** ở `chrome://extensions` trước lần chạy tới.
  Không đụng `scripts/`, `docs/`, `HANDOFF.md` gốc repo; không sinh lại artifact máy.


## 2026-09-06 — `claude-don-so`: `B-36` — tiêu đề nói "chờ nghiệm thu", nghiệm thu đã chạy và đã hỏng

**Không sửa một dòng mã nào.** Lượt này chỉ làm cho sổ khớp sự thật.

**Vấn đề, gọn một câu:** tiêu đề `B-36` ghi *"ĐÃ VÁ 2026-09-04, CHỜ NGHIỆM THU LIVE"*, nên **đọc
lướt là tưởng chưa ai thử**. Thực tế nghiệm thu **đã chạy đúng ngày 04/09 và THẤT BẠI**, rồi một
phép đo trong console cùng ngày còn **lật ngược chẩn đoán**. Thân mục ghi đủ cả hai chuyện; chỉ
tiêu đề là lạc hậu. Và tiêu đề là thứ duy nhất lọt lên bảng.

**Kiểm lại bằng nhật ký trước khi sửa, không tin đề bài.** Ba dòng Log ngày 04/09 của
`claude-gpt-kenh` nói liền mạch: (a) bản vá đổi bằng chứng sở hữu từ `item.byExtensionId` sang
**phiếu giữ tên**, suite 104/104, 8/8 mutation đỏ; (b) Đức reload rồi chạy — vẫn
`PERSISTENCE_FILENAME_MISMATCH`, số file GUID trong Downloads **36 → 37**, nên hai giả thuyết đã
mô hình hoá **không phải nguyên nhân**; (c) đo trong console service worker ra
`{patched: 'function', tickets: []}` — mã đang chạy **là** bản vá và phiếu **đã bị tiêu**, tức
determiner có khớp, có gọi `suggest({filename})`, mà **Chrome bỏ qua đề xuất**. Lỗi nằm **ngoài**
logic khớp của extension.

**Sửa gì.** Viết lại tiêu đề cho khớp cả bốn sự kiện (đo → vá → nghiệm thu hỏng → chẩn đoán lật),
và thêm ngay dưới nó một khối *"đọc một dòng cho nhanh"*: mục **vẫn mở, vẫn P1**; bản vá **giữ
lại** vì nó bịt hai đường mất tên thật có trong mã, nhưng **đừng đọc nó thành đã sửa B-36**; việc
còn lại là **một phép đo đọc-thuần** (tạo blob ngay trong service worker) và **không vá tiếp
trước khi có con số đó**. Toàn bộ thân mục giữ nguyên — cả bản vá, cả hai giả thuyết đã bị bác,
cả lần tác giả tự khai kết luận sai. Đó là phần đắt nhất của mục này.

**Dấu `@Đức` — kiểm lại loại, và nó vốn đã đúng.** Dấu **BẤM** của `B-36` đặt cho *phép đo trong
console service worker*, **không** cho lượt nghiệm thu. Nghiệm thu đã chạy xong rồi, nên nếu dấu
gắn vào đó thì nó đang mời Đức làm lại một việc đã làm. Không đổi dấu.

**`STATUS.md`: một chỗ nữa quét ra.** Ô `current_focus` liệt kê việc còn mở là *"B-14…B-21, B-34,
B-35"* — **thiếu hẳn B-36**, đúng cái mục P1 chặn mọi mutation Bridge khi đích ghi rơi về Chrome
Downloads. Bảng đọc thẳng ô này, nên gói trông nhẹ hơn thực tế. Đã thêm B-36 vào ô đó kèm đường
đi vòng vẫn dùng được (chọn một thư mục đích trong Side Panel thì đường ghi không qua Chrome
Downloads nữa). Không đụng `next_step` và `human_action` — hai ô đó nói về pilot phiên-theo-tab,
vẫn đúng.

**Không đóng mục nào ở gói này**, nên nợ ChatGPT giữ nguyên **22** — đo bằng chính `debtByUnit`.
Không đụng `B-19` · `B-27` · `B-07`: lượt `claude-gpt-b` ngày 06/09 đã soi ba mục đó và kết luận
chúng **trông giống đã đóng nhưng là việc mở thật**; tôi đọc lại và xác nhận, không lật.
