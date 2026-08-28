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

## BẮT BUỘC trước mọi `run.trial`: kiểm vân tay runtime

Từ 2026-08-28, content script khai một chuỗi vân tay và `diagnostics.dom_probe` trả nó về:

```
runtime_contract: "flow04-image-video-create-scope-v1"
```

Side panel cũng ghim đúng chuỗi đó và `run.trial` sẽ tự từ chối bằng
`VALIDATION_FAILED / RUNTIME_CONTRACT_MISMATCH` nếu tab đang chạy content script cũ.

**Nhưng phép tự kiểm đó nằm TRONG extension, nên nó chỉ bắt được "tab chưa F5", không bắt
được "cả extension còn là bản cũ".** Một side panel cũ thì không có phép kiểm nào để mà
chạy. Vì vậy AI vận hành phải tự kiểm một bước, mỗi phiên, TRƯỚC lệnh ghi đầu tiên:

1. Gọi `diagnostics.dom_probe`.
2. Nhìn `runtime_contract`:
   - đúng `flow04-image-video-create-scope-v1` → bản mới, chạy tiếp;
   - **thiếu hẳn trường này** → extension đang chạy là BẢN CŨ. Dừng. Nhờ Đức reload
     Extension rồi F5 tab Flow. Không gọi `run.trial`;
   - chuỗi khác → bản không khớp, xử lý như trên.
3. Nhìn `composer_scope_resolved`. `false` = không xác định được đúng một composer trong
   đúng một form → mọi lệnh chạy sẽ fail closed, đừng tốn một job để biết điều đó.
4. Gọi `session.hello` 5–6 lần, `extension_id` phải ổn định. Hai profile cùng pair vào
   cổng 32149 là nguyên nhân thật đã gặp của "lúc cũ lúc mới" (xem bảng lỗi bên dưới).
5. **Đúng MỘT tab Flow đang mở, và không đổi tab giữa lúc kiểm và lúc chạy.** Mọi lệnh
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
| Prompt đã gõ nhưng runner báo `Send button did not become ready`; probe vẫn thấy nút enabled `add_2 Create` | Flow đổi icon semantic của nút từ `arrow_forward` sang `add_2`; matcher cũ quá hẹp nên dừng trước click | Adapter chỉ nhận đúng hai nhãn đã đo: `arrow_forward Create` và `add_2 Create`; vẫn từ chối `Create project`/`Recreate`. Đức reload Extension trước live verify |
| Chạy từ giao diện Image mở bảng media (`Meo Story / All / Images / Videos`) rồi ledger vẫn chuyển `SUBMITTED`, nhưng prompt còn nguyên và không có video mới | Adapter đã chọn nhầm nút `add_2 Create` cấp trang thay vì nút submit trong đúng form composer; Bridge chập chờn giữa runtime cũ/mới làm thiếu tiền kiểm phiên bản | Gọi `run.stop`, không retry mù. Sửa selector để chỉ nhận đúng một nút Create trong form chứa đúng một composer; `run.trial` phải kiểm `runtime_contract` qua DOM probe trước khi ghi history/chạy. Chỉ thử lại sau khi test xanh, Đức reload Extension và Bridge ổn định một profile |
