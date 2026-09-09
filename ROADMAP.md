# ROADMAP — làn nào trước, và cái gì đóng nó

> **Đây là THỨ TỰ, không phải trạng thái.** Trạng thái sống lấy bằng một lệnh — đừng tin con số
> nào gõ trong file này, vì file này sẽ cũ:
>
> ```bash
> node scripts/what-next.mjs
> ```
>
> Mỗi làn có **một điều kiện đóng đo được**. Làn không có điều kiện đóng thì không phải làn, nó
> là một mong muốn. Việc phát sinh trong lúc làm → `BACKLOG.md`; ý tưởng mới → `IDEAS.md`.
> Thứ tự dưới đây theo chốt của Đức; chỗ nào Đức đã nói ra thì trích nguyên văn.

## Làn 1 — Chốt Rule Compiler V1 · **chờ Đức, chặn các làn khác về mặt luật**

Đức 09/09: *"đây là điểm quan trọng nhất để chốt các rules."*

Thiết kế đã soạn: [ADR-0030](docs/adr/0030-rule-compiler-v1.md) — **Proposed, chưa chốt**. Vấn đề
nó giải: câu của Đức *"active rules luôn là một bản compiled được TÁI TẠO từ ledger"* hiện **chưa
được thi hành** — bản hiệu lực vẫn viết tay, máy chỉ soi. 67 lượt trích gõ tay ngày 09/09 sẽ mục
ngay khi có ADR tiếp theo.

**Ba câu cần Đức trả lời** (nằm cuối ADR-0030): có sinh bước ⑥ bằng máy không · khối máy sinh nằm
trong `AGENTS.md` hay thành file riêng · ranh giới *"fix nhỏ"* của ADR-0009 gói video, treo từ 02/09.

**đóng khi:** ADR-0030 chuyển `Accepted` hoặc `Rejected` kèm lý do. Nếu `Accepted` thì thêm:
`node scripts/rule-compile.mjs --sinh` chạy lại hai lần cho ra **byte y hệt**, và một phép ghim
chứng minh sửa tay trong khối máy sinh bị bắt.

## Làn 2 — Cải tổ và dọn gốc repo (`Y-14`)

Đức 09/09: *"quay lại review việc cải tổ & clean gốc."* Mục `Y-14` trong `IDEAS.md` là chỗ ghi ý
định gốc; điều kiện Đức đặt lúc mở nó — *sau khi xong gói Assistant và nợ kỹ thuật* — **nay Đức đã
đưa lên trước**, ghi ra để đừng ai tưởng tôi bỏ qua thứ tự cũ.

Ba chỗ đã đo được, đáng nhìn trước:

1. **Hai sổ cái là cùng một chuỗi chép đôi.** `duc-auto-gemini 0001–0015` ≡ `duc-auto-chatgpt
   0001–0016`, **lệch đúng một số hiệu** — lịch sử trước lúc fork, tồn tại hai bản với hai số
   khác nhau. Từ `0016` trở đi mới là lịch sử riêng.
2. **12 nhóm `LUAT_TRUNG` còn nguyên.** Ngày 09/09 tôi trả lời chúng bằng *"cố ý, đây là lý do"*
   chứ chưa gộp cái nào. Đó là chỗ đáng cãi nhất.
3. **Ba gói `duc-auto-*` là fork của nhau** (giới hạn ②) và mỗi lỗi thường có ba bản sao.
   `G-08` đã đo: tám module **giống hệt từng byte** giữa hai nhánh.

**đóng khi:** Đức chốt một câu cho mỗi chỗ trên — gộp, hay giữ hai bản kèm lý do — và
`node scripts/rule-compile.mjs` phép ③ phản ánh đúng câu chốt đó.

## Làn 3 — Đóng nợ gói ChatGPT, tới MVP

Thứ tự này là của Đức, ghi ở `Y-15`: *đóng nợ kỹ thuật gói GPT trước, rồi mới* tới vòng
Claude Code ↔ GPT dùng thật.

Gói này đang có nhiều việc mở nhất và **đang có lane khác giữ khoá** — đọc thì tự do, ghi thì
không. MVP bị chặn ở đúng một chỗ, khai trong `STATUS.md` của gói: **B-36**, panel đóng rồi mở lại
vẫn bắt Đức chọn thư mục đích bằng tay.

**đóng khi:** `B-36` đóng, và `node scripts/backlog-check.mjs` cho gói đó dưới trần.

## Làn 4 — `duc-auto-gg-flow-video` chạy được một job thật

Gói `building`, chưa từng khai kiểm chứng. `STATUS.md` nói rõ nó đang **chờ Flow hết quá tải** —
đây là làn **chặn bởi bên ngoài**, không chặn bởi người.

**đóng khi:** một job video chạy trọn vòng trên trang thật, bằng chứng vào `evidence/`, và
`STATUS.md` khai `last_verified` + `evidence_ref`.

## Làn 5 — `duc-auto-gemini` về không còn việc mở

Còn ba việc, và **không việc nào AI làm tiếp được một mình**: `G-01` và `G-02` chờ Đức reload
extension để nghiệm thu live; `G-08` là việc gộp mã, thuộc Làn 2.

**đóng khi:** `G-01` và `G-02` có bằng chứng live, `G-08` theo câu chốt của Làn 2.

## Làn 6 — Nợ hạ tầng ở gốc

Hai mục, cả hai nhỏ và độc lập: **`N-45`** một byte điều khiển thô trong gói video (chờ Làn 4 mở
khoá vùng), **`N-59`** `--restamp --duc-duyet` gán nhầm xuất xứ cho khoá của lane khác — nó **vu
cho một phiên khác một vụ cướp khoá không có thật**, nên đáng sửa sớm dù nhỏ.

**đóng khi:** `node scripts/backlog-check.mjs` báo 0 mục mở ở gốc.

## Đang DỪNG — đừng tự khởi động lại

- **`duc-scouter`** — Đức chốt tạm dừng 08/09. Quay lại thì việc kế ghi sẵn trong `STATUS.md` của gói.
- **Dọn 122 MB ảnh trùng** và **chuyển khoá ba gói** — Đức chốt *"ảnh & khoá giữ nguyên"*.

## Chờ Đức, không ai làm thay được

Danh sách sống ở khối **C** của `node scripts/what-next.mjs`, và mỗi mục có trường `việc kế` ngay
trong `IDEAS.md`. Đừng chép chúng xuống đây — chép là đẻ ra bản thứ hai sẽ lệch.
