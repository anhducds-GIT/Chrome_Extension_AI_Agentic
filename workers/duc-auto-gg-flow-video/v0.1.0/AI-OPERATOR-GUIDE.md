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
   - `ok:false` + `EXECUTOR_UNAVAILABLE` → side panel chưa mở hoặc service worker đang ngủ.
     **Không kết luận gì về phiên bản cả** — probe chưa hề chạm tới trang. Nhờ Đức mở side
     panel, đợi 15–30s rồi gọi lại. (Chính vỏ lỗi này từng bị lưu nhầm thành "bằng chứng":
     `evidence/F1-snapshot-7-high-demand-banner-20260827.json`.)
   - `ok:true` mà **thiếu hẳn `runtime_contract`** → probe chạy thật và trả về dữ liệu trang,
     nhưng là BẢN CŨ. Dừng. Không gọi `run.trial`.
   - `ok:true` + đúng `flow04-composer-cluster-submit-v2` → bản mới, chạy tiếp.
   - `ok:true` + chuỗi khác → bản không khớp, xử lý như bản cũ.

   Cách kiểm chéo nhanh khi nghi ngờ: nhìn một phần tử bất kỳ trong `buttons`. Bản mới nút nào
   cũng có `in_composer_form` và `chain`; bản cũ thì không có hai trường đó.

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
| Lệnh đọc lúc được lúc báo `FORBIDDEN/bootstrap_locked`, capability đổi qua lại giữa bản cũ/mới | Hai Chrome profile cùng pair vào cổng 32149; host chỉ giữ kết nối extension đến sau cùng nên hai runtime giành nhau | Chỉ giữ profile có tab Flow cần chạy được pair; profile còn lại bấm **Ngắt kết nối** Bridge hoặc tắt extension. Không gửi lại lệnh ghi khi chưa xác định lần trước có chạy hay không |
| Job thứ 2/3 chạy nối tiếp lỗi `Create button not found` ở `PRE_SUBMIT`, trong khi DOM probe vẫn thấy composer | Flow có lúc tháo nút submit prompt lúc composer rỗng rồi remount sau khi React nhận chữ; kiểm nút trước khi gõ là quá sớm | Bản vá FLOW-04 cho phép gõ trước, nhưng vẫn bắt buộc `waitForSendButtonReady()` sau gõ và zero click nếu nút không trở lại. Reload Extension trước khi kiểm chứng bản vá |
| Sau khi gõ prompt, `Create` biến mất và xuất hiện nút `Upgrade`; ledger cũ báo `Send button did not become ready` | Tài khoản đã hết credit. FLOW-04 đo thật 28/08: 2 nút `Upgrade` visible/enabled thay `Create`, zero `PROMPT_SUBMITTED`, zero retry | Bản vá nhận diện mẫu này thành `GENERATION_LIMIT_REACHED` và dừng trước click. Không retry, không đổi tài khoản, không bypass. Sau khi sửa `.js`, Đức reload Extension rồi mới kiểm chứng live |
| Prompt đã gõ nhưng runner báo `Send button did not become ready`; probe vẫn thấy nút enabled `add_2 Create` | **CHẨN ĐOÁN CŨ SAI — đã đính chính 28/08.** Ghi ban đầu là "Flow đổi icon `arrow_forward` → `add_2`". KHÔNG PHẢI. Hai nút **cùng tồn tại** trong một cụm (trace hop 2). `add_2 Create` là nút **thêm media**, luôn enabled; `arrow_forward Create` là nút gửi thật, **disabled khi ô prompt rỗng**. Lúc đó ô prompt rỗng nên nút gửi disabled, chứ nút không hề đổi tên | Nút gửi **chỉ có một nhãn**: `arrow_forward Create`. Nút disabled nghĩa là chưa gõ được chữ vào composer — đi sửa đường gõ, **đừng đi tìm nút khác**. Bấm `add_2 Create` mở bảng media và không sinh gì cả (đã trả giá một lượt chạy) |
| Chạy từ giao diện Image mở bảng media (`Meo Story / All / Images / Videos`) rồi ledger vẫn chuyển `SUBMITTED`, nhưng prompt còn nguyên và không có video mới | Adapter đã chọn nhầm nút `add_2 Create` cấp trang thay vì nút submit trong đúng form composer; Bridge chập chờn giữa runtime cũ/mới làm thiếu tiền kiểm phiên bản | Gọi `run.stop`, không retry mù. **ĐÍNH CHÍNH 28/08:** cách sửa ghi ở đây lúc đầu ("chỉ nhận nút Create trong form chứa composer") là SAI — đo thật cho thấy composer **không có `<form>` cha**, làm vậy sẽ từ chối mọi job. Cách đúng: nút gửi chỉ có một nhãn `arrow_forward Create`, và tìm trong **cụm điều khiển của composer** (tầng cha đầu tiên có nút). `run.trial` kiểm `runtime_contract` trước khi ghi history/chạy |
| `dom_probe` trả `ok:true` nhưng THIẾU `runtime_contract`, dù Đức vừa reload extension và tab đã F5 | Extension được nạp trong **NHIỀU profile Chrome cùng lúc** (đo thật 28/08: 3 profile — Default, Profile 10, Profile 4 — cùng nạp từ một thư mục). Host chỉ giữ kết nối của extension pair SAU CÙNG, mà đó có thể là profile Đức KHÔNG bấm reload. `extension_id` giống hệt nhau ở cả ba nên `session.hello` không phát hiện ra | Nhờ Đức **tắt/gỡ extension ở các profile thừa**, chỉ để đúng một profile có tab Flow. Rồi reload extension ở profile đó + F5 tab. Kiểm lại bằng `runtime_contract`. TUYỆT ĐỐI không chạy job khi còn thiếu trường này — bản cũ sẽ bấm nhầm nút `add_2 Create` cấp trang |
