# F4R2 — Trial runner lượt 2 (2026-09-02): đường chạy THÔNG, dừng ở nút gửi

**Phiên:** `claude-flow04` · **Hồ sơ Chrome:** `kaito` · **Cổng Bridge:** 32149
**Credit tiêu: 0.** Video trước trial 15 → sau trial 15.

## Vì sao có lượt này

Việc ưu tiên #1 (FLOW-04) bị ghi là chờ Đức "nạp workbook". Đức từ chối nạp tay và giao
AI tự triển khai. **Hoá ra không cần nạp:** `jobs.add` tự tạo workbook trong bộ nhớ khi
side panel chưa có workbook nào (`sidepanel.js:2635`, `applyBridgeJobsAdd`). Workbook sinh
ra: `Bridge-2026-09-02T06-28__results__v01.xlsx`.

**Đây là điều đáng ghi nhất của lượt này:** cả `STATUS.md`, `DASHBOARD.md` và `llms.txt`
đều đang bảo Đức phải nạp XLSX bằng tay. Không phải. Một dòng `jobs.add` là đủ.

## Tiền kiểm (toàn lệnh đọc, làm trước khi tốn credit)

| Phép kiểm | Kết quả |
|---|---|
| Vân tay runtime | `ok:true` + `runtime_contract = flow04-composer-cluster-submit-v2` → bản mới |
| Surface | `CONVERSATION`, `surface_allowed:true`, URL là trang project Flow thật |
| Composer | `composerFound:true`, `sendFound:true`, `composer_scope_resolved:true` (2 hop) |
| Blocker | `generationLimitBlocker:null`, `securityBlocker:null`, `generating:false` |
| Chip chế độ | `Video · 360p · 10s crop_16_9 x1` — Đức đã đặt sẵn bằng tay |
| Matcher chế độ | `VIDEO_MODE_SUMMARY_PATTERN` **nhận** đúng chuỗi chip trên → không vướng F-11 |

## Kết quả chạy

`run.trial` với đúng **1** job, `timeout_sec=300`, `delay_sec=25`, `max_retries=0`.
`run_id = 20260902-0628-bridge-2026-09-02t06-28`.

| Job | Kết quả | Pha dừng | Submit | Retry |
|---|---|---|---:|---:|
| Q001 | **FAILED** | `PRE_SUBMIT` / `runtime_stage: SENDING` | 0 | 0 |

Ledger: `error = "Send button did not become ready. Gemini DOM may have changed."`,
`attempt_count=1`, `retry_count=0`, `failure_type=OTHER`.

**Lớp bảo vệ chạy đúng:** dừng TRƯỚC submit, không click mù, không retry, 0 credit,
số video không đổi. Đây là fail-closed đúng thiết kế.

## Đo được gì mới về cái lỗi này

Bảng lỗi trong `AI-OPERATOR-GUIDE.md` (dòng 150) đã có đúng ca này, và kết luận:
*"nút disabled nghĩa là chưa gõ được chữ vào composer"*.

**Số đo lượt này nói kết luận đó chưa đủ.** Probe ngay sau khi hỏng:

- composer (`[contenteditable="true"][role="textbox"]`) có **`valueLen: 172`** — KHÔNG rỗng.
- `arrow_forward Create` vẫn **`disabled: true`**.
- Lúc tiền kiểm, cùng nút đó cũng `disabled:true` — mà theo dòng 150 thì disabled ⇔ ô rỗng,
  nên suy ra composer lúc ấy rỗng. Vậy trong lượt chạy, chữ **đã vào DOM (0 → 172)** nhưng
  nút gửi **vẫn không mở**.

Nghĩa là: đường gõ có ghi được ký tự vào DOM, nhưng Flow (React/Lexical) không ghi nhận,
nên nút Create không bao giờ enable. **Sửa "đường gõ" là đúng hướng, nhưng không phải vì
"chưa gõ được chữ" — mà vì gõ không đúng cách trình soạn thảo chấp nhận.**

**Một số chưa giải thích được, ghi ra để không ai tưởng đã hiểu hết:** prompt tôi nạp dài
**145** ký tự, composer đo được **172** — lệch **27**. Có thể là chữ còn sót từ trước, có
thể là node Lexical thêm vào. **Tôi không có `valueLen` lúc tiền kiểm để so** (probe đầu
tôi in ra bị cắt, không lưu file) — đó là lỗ hổng bằng chứng của lượt này. Lượt sau: lưu
nguyên văn probe TRƯỚC khi chạy.

## Hai chỗ sổ tay sai, đã vá cùng lượt

1. Phép kiểm chéo bản mới ghi trường `in_composer_form` — **không có trường tên đó**. Bản v2
   đặt là `in_composer_cluster`, và nhãn nút nằm ở `txt` chứ không phải `label`. Kiểm chéo
   theo tên cũ báo "bản cũ" trong khi contract trả đúng `v2` → báo động giả.
2. Mục vân tay runtime chỉ mô tả `EXECUTOR_UNAVAILABLE`. Thực tế cả ba hồ sơ trả
   `INTERNAL_ERROR` với `error.details.message = "Open the Google Flow project tab as the
   active tab."` — extension sống, chỉ là tab Flow không phải tab đang xem. **Mã lỗi trần
   nghe như hỏng nặng; chi tiết mới là câu trả lời.**

## Nợ mới

**F-18** trong `BACKLOG.md` — Đức đã biết lỗi này và chốt để debug sau (02/09).

## File thô

`F4R2-*-20260902.json` cùng thư mục: params + response của `jobs.add` và `run.trial`,
`queue.list` trước trial, `run.status` cuối, `ledger.read` (kèm prompt), probe sau khi hỏng,
và log poll `F4R2-run-status-poll-20260902.log`.
