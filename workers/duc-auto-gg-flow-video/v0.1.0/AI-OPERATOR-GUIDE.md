# AI OPERATOR GUIDE — Duc Auto GG Flow Video (V0.1)

> Đọc file này ĐẦU TIÊN nếu bạn là AI vận hành/debug extension này. Nền tảng vận hành
> giống hệt nhánh Gemini — đọc `workers/duc-auto-gemini/v0.2.0/AI-OPERATOR-GUIDE.md`
> cho playbook đầy đủ và bảng lỗi. File này CHỈ ghi khác biệt của nhánh Flow.

## Khác biệt so với nhánh Gemini

| Món | Gemini | Nhánh này |
|---|---|---|
| Host Bridge | `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gemini\`, cổng 32148 | `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gg-flow-video\`, cổng **32149** |
| Pairing | `duc-auto-gemini-bridge-pairing-v1.json` | `duc-auto-gg-flow-video-bridge-pairing-v1.json` (cùng thư mục host, KHÔNG commit) |
| Khởi động host | `START-BRIDGE_Gemini_Extension.cmd` | `START-BRIDGE_GG_Flow_Video.cmd` |
| Method dùng được | đầy đủ | **Đầy đủ từ 2026-08-27**; gate executor/approval/validation của từng method vẫn áp dụng. `diagnostics.evidence_submit` được giữ làm debug tool, trần 3 lượt/trang |
| Trần trial dev | ≤30 job | **≤3 video** (Đức chốt 27/08: 3 × 15 credits); phải bật toggle **Chế độ phát triển (Dev Mode)** trong side panel |
| Trang đích | gemini.google.com | `https://labs.google/fx/tools/flow/*` |

## Gọi Bridge

```bash
cd "C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gg-flow-video" && node bridge-cli.mjs ping --pairing duc-auto-gg-flow-video-bridge-pairing-v1.json
```

Raw RPC (dom_probe):

```bash
node "workers/duc-auto-gg-flow-video/v0.1.0/scripts/bridge-rpc.mjs" diagnostics.dom_probe
```

(`bridge-rpc.mjs` đọc pairing theo đường dẫn — xem đầu file script; nếu nó khoá cứng
đường dẫn host Gemini thì sửa/truyền tham số trước khi dùng.)

## Thứ tự thao tác sau khi Đức reload Extension (đo thật 28/08)

Reload extension **đóng side panel**, và mọi lệnh chạm trang đều phải đi qua panel. Nên
sau mỗi lần reload, luôn theo đúng ba bước này — hỏi Đức một lần cho cả ba, đừng hỏi ba lần:

1. Đức bấm **⟳** extension.
2. Đức **F5 tab Flow** (Ctrl+R). Bắt buộc: reload extension làm content script trong tab
   đang mở thành mồ côi, `dom_probe` sẽ trả `HARD_STOP: receiver unavailable`.
3. Đức **mở side panel SAU CÙNG** (bấm icon extension).

**Thứ tự này không đảo được, và đây là chỗ đã trả giá 28/08.** Panel gắn theo tab: F5 tab
làm ĐÓNG panel. Nên nếu mở panel trước rồi mới F5 — kể cả AI tự F5 bằng `chat.reload` — thì
panel biến mất và mọi lệnh sau đó trả `EXECUTOR_UNAVAILABLE`. Đo thật: một lượt gọi
`chat.reload` xong thì 22 lệnh liên tiếp đều trượt, panel không tự quay lại.

Hệ quả cho AI: **sau khi Đức reload extension, ĐỪNG gọi `chat.reload`.** Tab đã được Đức F5
rồi. `chat.reload` chỉ dùng giữa phiên đang chạy ổn định, khi panel đang mở và ta chấp nhận
mất panel.

Bẫy đã dẫm: ngay sau reload có một khe vài giây mà `session.hello` còn trả
`executor.available: true` trong khi panel đã đóng. Gọi lại lần nữa sẽ thấy `false`.
**Đừng tin một lần đọc duy nhất** — `available:true` rồi `EXECUTOR_UNAVAILABLE` ngay sau đó
nghĩa là panel đóng, không phải Bridge hỏng.

## Nhiều profile Chrome cùng nối Bridge — từ 2026-08-28 KHÔNG phải tắt extension nữa

Host giữ được nhiều kết nối cùng lúc, mỗi profile báo danh bằng tên Đức đặt trong side panel
(ô **"Tên hồ sơ Chrome này"**). Thiết kế: `docs/studies/BRIDGE-MULTIPROFILE-DESIGN-V1.md` gốc repo.

**Luật vận hành, theo đúng thứ tự:**

1. Mở phiên: gọi `bridge.sessions` (CLI: `node bridge-cli.mjs sessions --pairing ...`) để xem
   AI đang nói chuyện được với những profile nào. Kết quả có `instance_id`, `label` (tên Đức
   đặt), `legacy` (true = extension bản cũ chưa báo danh).
2. **Có ≥2 kết nối → MỌI lệnh phải nêu đích**: `--target <tên|instance_id>` (cả `bridge-cli.mjs`
   lẫn `scripts/bridge-rpc.mjs`). Quên là host TỪ CHỐI bằng `TARGET_AMBIGUOUS` kèm danh sách —
   nó không bao giờ tự chọn. Đúng 1 kết nối thì như cũ, không cần `--target`.
3. **Probe và run phải CÙNG MỘT `--target`.** Mọi phản hồi chuyển tiếp đều có dấu
   `served_by: {instance_id, label}` — thấy `served_by` đổi giữa probe và run là DỪNG.
4. `TARGET_NOT_CONNECTED` (retryable) = đích có tên nhưng đang offline, thường là service
   worker ngủ; báo thức 30s sẽ nối lại — đợi rồi gọi lại, đừng đổi đích.
5. Hai profile trùng tên → `TARGET_AMBIGUOUS` kèm `instance_id` từng ứng viên; nhắm bằng
   `instance_id`, và nhờ Đức đổi tên một trong hai trong panel.

## BẮT BUỘC trước mọi `run.trial`: kiểm vân tay runtime

Từ 2026-08-28, content script khai một chuỗi vân tay và `diagnostics.dom_probe` trả nó về:

```
runtime_contract: "flow04-composer-cluster-submit-v2"
```

**Chuỗi này ĐỔI mỗi khi cách chọn nút gửi đổi** — `...-v1` là bản còn nhận nhầm
`add_2 Create`, nên nếu probe trả `v1` thì đó là bản CŨ CÓ LỖI, không phải bản mới.

Side panel cũng ghim đúng chuỗi đó và `run.trial` sẽ tự từ chối bằng
`VALIDATION_FAILED / RUNTIME_CONTRACT_MISMATCH` nếu tab đang chạy content script cũ.

**Nhưng phép tự kiểm đó nằm TRONG extension, nên nó chỉ bắt được "tab chưa F5", không bắt
được "cả extension còn là bản cũ".** Một side panel cũ thì không có phép kiểm nào để mà
chạy. Vì vậy AI vận hành phải tự kiểm một bước, mỗi phiên, TRƯỚC lệnh ghi đầu tiên:

1. Gọi `diagnostics.dom_probe`.
2. **Xem `ok` TRƯỚC, rồi mới xem `runtime_contract`.** Hai thứ này dễ nhìn giống nhau mà ý
   nghĩa ngược hẳn — đã suýt đọc nhầm ngày 28/08:
   - `ok:false` + `INTERNAL_ERROR` → **đọc `error.details.message`, đừng dừng ở mã lỗi.**
     Đo 02/09: cả ba hồ sơ trả `INTERNAL_ERROR` với chi tiết `"Open the Google Flow project
     tab as the active tab."` — extension SỐNG và trả lời bình thường, chỉ là tab Flow không
     phải tab đang xem. Mã lỗi trần nghe như hỏng nặng; chi tiết mới là câu trả lời thật.
     Cũng không kết luận gì về phiên bản.
   - `ok:false` + `EXECUTOR_UNAVAILABLE` → side panel chưa mở hoặc service worker đang ngủ.
     **Không kết luận gì về phiên bản cả** — probe chưa hề chạm tới trang. Nhờ Đức mở side
     panel, đợi 15–30s rồi gọi lại. (Chính vỏ lỗi này từng bị lưu nhầm thành "bằng chứng":
     `evidence/F1-snapshot-7-high-demand-banner-20260827.json`.)
   - `ok:true` mà **thiếu hẳn `runtime_contract`** → probe chạy thật và trả về dữ liệu trang,
     nhưng là BẢN CŨ. Dừng. Không gọi `run.trial`.
   - `ok:true` + đúng `flow04-composer-cluster-submit-v2` → bản mới, chạy tiếp.
   - `ok:true` + chuỗi khác → bản không khớp, xử lý như bản cũ.

   Cách kiểm chéo nhanh khi nghi ngờ: nhìn một phần tử bất kỳ trong `buttons`. Bản mới nút nào
   cũng có `in_composer_cluster` và `chain`; bản cũ thì không có hai trường đó.
   **ĐÍNH CHÍNH 02/09:** dòng này trước ghi `in_composer_form` — SAI, không có trường tên đó.
   Bản v2 đặt tên là `in_composer_cluster` (khớp chính tên contract `composer-cluster`), và
   nhãn nút nằm ở `txt`, không phải `label`. Đo thật trên hồ sơ `kaito`: contract trả đúng
   `v2` nhưng kiểm chéo theo tên cũ lại báo "bản cũ" — tức phép kiểm chéo tự nó tạo báo
   động giả, đúng loại bẫy làm người vận hành dừng oan.

3. **Bản cũ thì F5 tab Flow TRƯỚC, đừng vội reload lại extension.** `dom_probe` do content
   script trả lời, mà content script trong một tab đã mở sẵn vẫn là bản cũ cho tới khi tab được
   nạp lại — kể cả khi extension đã reload thành công. F5 xong mà `runtime_contract` vẫn thiếu
   thì lúc đó mới là extension chưa reload thật.
4. Nhìn `composer_scope_resolved`. `false` = không xác định được đúng một composer trong
   đúng một form → mọi lệnh chạy sẽ fail closed, đừng tốn một job để biết điều đó.
5. Gọi `session.hello` 5–6 lần, `extension_id` phải ổn định. **CẢNH BÁO — phép này KHÔNG
   phân biệt được profile** (đo thật 28/08): extension nạp dạng unpacked lấy ID từ ĐƯỜNG DẪN
   thư mục, nên mọi profile nạp cùng một thư mục đều có **cùng một `extension_id`**.
   `extension_id` ổn định 6/6 lần vẫn có thể là ba profile khác nhau thay phiên trả lời.
   Nó chỉ loại được trường hợp hai extension KHÁC THƯ MỤC. Muốn biết có mấy profile đang
   nạp extension này, đọc `Secure Preferences` của từng profile Chrome (chỉ đọc):

   ```bash
   node -e "const fs=require('fs'),path=require('path');const ID='<extension_id>';const base=process.env.LOCALAPPDATA+'\Google\Chrome\User Data';for(const d of fs.readdirSync(base)){const f=path.join(base,d,'Secure Preferences');if(!fs.existsSync(f))continue;const raw=fs.readFileSync(f,'utf8');if(!raw.includes(ID))continue;const e=JSON.parse(raw)?.extensions?.settings?.[ID];console.log(d,'->',e&&e.path);}"
   ```
6. **Đúng MỘT tab Flow đang mở, và không đổi tab giữa lúc kiểm và lúc chạy.** Mọi lệnh
   Bridge gửi tới *tab đang active*, nên phép kiểm ở bước 1–3 kiểm tab lúc đó, không phải
   tab sẽ nhận job nếu Đức bấm sang tab khác ở giữa. Hai tab Flow (một tab đã F5, một tab
   chưa) là đúng cái bẫy đã làm hỏng lượt 28/08. Đóng bớt cho còn một tab.

## Bảng lỗi nhánh Flow (thêm dòng khi gặp lỗi thật)

| Triệu chứng | Nguyên nhân thật | Xử lý |
|---|---|---|
| `run.trial` trả lỗi Dev Mode/toggle | Toggle **Chế độ phát triển (Dev Mode)** trong side panel đang tắt | Đức bật toggle trước khi gọi; trần 3 job vẫn luôn áp dụng |
| `diagnostics.evidence_submit` báo hết lượt | Debug primitive đã chạm trần 3 lượt của lần nạp trang hiện tại | Không bypass; dùng runner thật hoặc nạp lại trang khi đúng phạm vi debug được duyệt |
| Lệnh đọc lúc được lúc báo `FORBIDDEN/bootstrap_locked`, capability đổi qua lại giữa bản cũ/mới | Hai Chrome profile cùng pair vào cổng 32149; host chỉ giữ kết nối extension đến sau cùng nên hai runtime giành nhau | **ĐÃ VÁ 28/08 (multi-profile routing, xem mục riêng ở đầu guide):** host giữ mọi kết nối, lệnh nhắm đích bằng `--target`. Cách cũ (tắt extension profile thừa) chỉ còn cần khi host chưa được cập nhật. Luật "không gửi lại lệnh ghi khi chưa xác định lần trước có chạy hay không" vẫn nguyên |
| Job thứ 2/3 chạy nối tiếp lỗi `Create button not found` ở `PRE_SUBMIT`, trong khi DOM probe vẫn thấy composer | Flow có lúc tháo nút submit prompt lúc composer rỗng rồi remount sau khi React nhận chữ; kiểm nút trước khi gõ là quá sớm | Bản vá FLOW-04 cho phép gõ trước, nhưng vẫn bắt buộc `waitForSendButtonReady()` sau gõ và zero click nếu nút không trở lại. Reload Extension trước khi kiểm chứng bản vá |
| Sau khi gõ prompt, `Create` biến mất và xuất hiện nút `Upgrade`; ledger cũ báo `Send button did not become ready` | Tài khoản đã hết credit. FLOW-04 đo thật 28/08: 2 nút `Upgrade` visible/enabled thay `Create`, zero `PROMPT_SUBMITTED`, zero retry | Bản vá nhận diện mẫu này thành `GENERATION_LIMIT_REACHED` và dừng trước click. Không retry, không đổi tài khoản, không bypass. Sau khi sửa `.js`, Đức reload Extension rồi mới kiểm chứng live |
| Prompt đã gõ nhưng runner báo `Send button did not become ready`; probe vẫn thấy nút enabled `add_2 Create` | **CHẨN ĐOÁN CŨ SAI — đã đính chính 28/08.** Ghi ban đầu là "Flow đổi icon `arrow_forward` → `add_2`". KHÔNG PHẢI. Hai nút **cùng tồn tại** trong một cụm (trace hop 2). `add_2 Create` là nút **thêm media**, luôn enabled; `arrow_forward Create` là nút gửi thật, **disabled khi ô prompt rỗng**. Lúc đó ô prompt rỗng nên nút gửi disabled, chứ nút không hề đổi tên | Nút gửi **chỉ có một nhãn**: `arrow_forward Create`. Nút disabled nghĩa là chưa gõ được chữ vào composer — đi sửa đường gõ, **đừng đi tìm nút khác**. **BỔ SUNG 02/09 (F-18):** đo lượt F4R2 cho thấy chữ CÓ vào DOM (composer `valueLen:172`) mà nút vẫn disabled — nên câu "chưa gõ được chữ" chưa đủ. Hướng sửa vẫn là đường gõ, nhưng nguyên nhân là gõ không đúng cách React/Lexical chấp nhận, chứ không phải không gõ được. Bằng chứng: `evidence/F4R2-KET-QUA.md`. **PHẢN CHỨNG 03/09: đừng đi viết lại đường gõ.** FLOW-01 (27/08) gõ được vào ĐÚNG composer đó và nút ĐÃ sáng (`typing_path: "input_events"`, `create_button: "enabled"` — `evidence/F1-EVIDENCE-NOTES.md`). Vậy đây là **hồi quy**, không phải bài chưa giải; bốn ứng viên khác biệt liệt ở F-18 trong `BACKLOG.md`. Bấm `add_2 Create` mở bảng media và không sinh gì cả (đã trả giá một lượt chạy). **ĐÍNH CHÍNH THỨ HAI, 02/09 — bỏ luôn câu "chữ đã vào DOM":** `valueLen` KHÔNG đo cái ta tưởng. Ngày 27/08 (ngày chạy được) composer đọc ra **28** ở cả năm snapshot — trước khi gõ, 4 giây sau khi submit, và sau khi video xong. Số đứng yên qua cả ba trạng thái thì không phải prompt, mà là `textContent` cố định của phần tử. Nên `172` = 145 (prompt) + hằng số ~27 → prompt **đã vào thật**. Đừng đi soi `selectNodeContents`. Bằng chứng + bảng đọc kết quả lượt sau: `evidence/F18-PHAN-TICH-BANG-CHUNG-20260902.md` |
| Chạy từ giao diện Image mở bảng media (`Meo Story / All / Images / Videos`) rồi ledger vẫn chuyển `SUBMITTED`, nhưng prompt còn nguyên và không có video mới | Adapter đã chọn nhầm nút `add_2 Create` cấp trang thay vì nút submit trong đúng form composer; Bridge chập chờn giữa runtime cũ/mới làm thiếu tiền kiểm phiên bản | Gọi `run.stop`, không retry mù. **ĐÍNH CHÍNH 28/08:** cách sửa ghi ở đây lúc đầu ("chỉ nhận nút Create trong form chứa composer") là SAI — đo thật cho thấy composer **không có `<form>` cha**, làm vậy sẽ từ chối mọi job. Cách đúng: nút gửi chỉ có một nhãn `arrow_forward Create`, và tìm trong **cụm điều khiển của composer** (tầng cha đầu tiên có nút). `run.trial` kiểm `runtime_contract` trước khi ghi history/chạy |
| Job dừng `PRE_SUBMIT` với `WRONG_GENERATION_MODE` (không thấy nút Video, hoặc bấm rồi mà mode không đổi) | **`element.click()` không ăn với nhóm nút cấu hình của Flow** (class `flow_tab_slider_trigger`). Đo 28/08 hai lượt: chip không mở được bảng; và khi bảng mở sẵn thì bấm đúng `videocam Video` mode vẫn không đổi. Cùng `.click()` đó vẫn bấm được `arrow_forward Create` | Nhờ Đức **tự đặt Video mode bằng tay** trước khi chạy. Mode đã là Video thì runner bỏ qua khâu này, chạy bình thường. Chi tiết + cách phân biệt nguyên nhân: **F-14** trong `BACKLOG.md`. Cả hai lượt hỏng đều 0 credit, `retry_count=0` |
| Chip cấu hình đang để `x2`/`x3`/`x4` | Flow sẽ sinh nhiều video một lượt. Luật gán chỉ nhận **đúng 1 id mới**, nhiều hơn thì trả `OUTPUT_AMBIGUOUS` và không nhận cái nào — **credit vẫn bị tiêu** | **Đọc chip TRƯỚC khi chạy.** Không phải `x1` thì nhờ Đức đổi về `x1` rồi mới chạy. Runner chưa tự kiểm việc này (**F-15**) |
| `dom_probe` trả `ok:true` nhưng THIẾU `runtime_contract`, dù Đức vừa reload extension và tab đã F5 | Extension được nạp trong **NHIỀU profile Chrome cùng lúc** (đo thật 28/08: 3 profile — Default, Profile 10, Profile 4 — cùng nạp từ một thư mục). Host chỉ giữ kết nối của extension pair SAU CÙNG, mà đó có thể là profile Đức KHÔNG bấm reload. `extension_id` giống hệt nhau ở cả ba nên `session.hello` không phát hiện ra | **ĐÃ VÁ 28/08 (multi-profile routing, xem mục riêng ở đầu guide):** gọi `bridge.sessions` để thấy đủ các profile, rồi `--target` đúng profile Đức vừa reload; `served_by` trên phản hồi xác nhận đúng runtime trả lời. TUYỆT ĐỐI vẫn không chạy job khi thiếu `runtime_contract` |

## Chạy nhiều video qua nhiều tài khoản — giao thức cho AI điều phối (Đức chốt 02/09)

**Bối cảnh Đức đặt ra:** "unlimited credit" nghĩa là Đức có nhiều tài khoản free và sẽ đổi
sang tài khoản khác khi tài khoản cũ cạn. **Không chạy liên tiếp không nghỉ** — chạy ngắt
quãng, xen giữa là đổi tài khoản.

### Phép tính, và vì sao trần là 7

| | |
|---|---|
| Tài khoản free | **50 credit** |
| Video 360p | **7 credit** |
| Một tài khoản đủ | **7 video** (49/50) |

`MAX_TRIAL_JOBS = 7` được đặt **đúng bằng ngân sách một tài khoản**, không phải một con số
tròn trịa. Một chuỗi đầy kết thúc vừa lúc tài khoản cạn.

⚠️ **Con số này gắn với 360p.** Ở 720p một video tốn 15, một tài khoản chỉ đủ **3**, và job
thứ 4 trở đi của chuỗi sẽ chạm tường credit. Hỏng an toàn (dừng cứng, 0 chi), nhưng mất công
lập kế hoạch. **Đọc độ phân giải trên chip trước khi xếp chuỗi.**

### Vòng lặp chuẩn

1. `bridge.sessions` → xem hồ sơ nào đang nối, lấy đúng nhãn.
2. `diagnostics.dom_probe --target <nhãn>` → kiểm vân tay runtime, `composer_scope_resolved`,
   không blocker, và **chip phải là `x1`** (chip `x2` trở lên → `OUTPUT_AMBIGUOUS` mà credit
   thì đã tiêu — F-15). **Lưu probe này vào `evidence/` TRƯỚC khi chạy.**
3. `jobs.add` với **≤7 job**, **mỗi job một prompt khác nhau** (luật Đức 02/09 — đừng dùng lại
   prompt cũ, kể cả để so lượt-với-lượt; tôi đã đề xuất ngoại lệ đó và bị bác).
4. `run.trial` với `max_retries=0`, rồi poll `run.status`.
5. Xong chuỗi → đọc `ledger.read`, kiểm `typing_path` / `composer_len_before|after` / quy gán
   **từng job**.
6. **Nghỉ.** `MIN_TRIAL_INTERVAL_SEC = 300` cưỡng chế tối thiểu 5 phút giữa hai chuỗi. Đừng
   tìm cách lách nó.
7. Muốn chạy tiếp → **nhờ Đức đổi hồ sơ Chrome**, rồi quay lại bước 1 với nhãn mới.

### Khi chạm tường credit (`GENERATION_LIMIT_REACHED`)

Đây là **dừng cứng**: không retry, không chi thêm, cả mẻ dừng. Đúng thiết kế — tường được
kiểm **trước** cú bấm Create duy nhất, nên job dừng ở đó không bị trừ credit.

AI phải làm đúng ba việc, theo thứ tự:

1. **Chụp hiện trường ngay**: `diagnostics.dom_probe --target <nhãn>` lưu vào `evidence/`. Đây
   là bằng chứng DOM của tường credit ở đúng cấu hình đang chạy — F-09 mới chỉ đo một lần
   ngày 28/08 ở 720p, chưa ai đo ở 360p.
2. **Đọc sổ cái** và ghi lại job nào chạy được trước khi cạn — đó là số credit thật còn lại
   của tài khoản đó lúc bắt đầu, thông tin không lấy được bằng cách nào khác.
3. **Báo Đức đổi hồ sơ**, nêu rõ hồ sơ nào đã cạn. **Không tự đổi tài khoản, không tự thử
   lại trên hồ sơ khác** — đổi tài khoản là việc của Đức.

### Nhịp thao tác — đừng làm nhanh hơn

Đức yêu cầu 02/09: thao tác thong thả như người, đừng nhập ở tốc độ máy, đừng refresh dồn dập.
Đã cài ba quãng nghỉ ngẫu nhiên trong `provider-adapter.js` (`HUMAN_PACING`): trước khi dò
composer, sau khi gõ, và trước khi bấm. Chúng được ghi vào sổ cái ở trường `pacing_ms` nên
đọc lại được thực tế đã nghỉ bao lâu.

**Đừng hạ các quãng này xuống để chạy nhanh hơn**, và đừng gọi `chat.reload` liên tục để "cho
chắc" — có test ghim (`tests/human-pacing-static.mjs`) và một phép kiểm đòi quãng nghỉ tối
thiểu 400 ms.
