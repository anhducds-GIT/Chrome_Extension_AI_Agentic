# TASK B-01 — 5 hướng giải quyết throttle giữa job (PARALLEL)

- Topology: PARALLEL — lý do: không gian đáp án mở, cần nhiều phương án độc lập để so.
- Kênh: XLSX → MD digest · Vòng: 1 (+1 delta) · Trần: 5×100 từ + ranking
- Mục tiêu đo: contract compliance (đúng 5 option, đúng schema, đúng trần, có END marker).
- Bối cảnh thật: khoảng nghỉ 12–24s giữa job thành ~11 phút khi side panel không ở tiền cảnh (đã đo live 28/08). Đây là việc package ChatGPT đã chọn làm tiếp theo.
- Gate 0: [ ] Đức đã duyệt

## PROMPT (gửi nguyên khối, task_type=text_reasoning)

Context: A Chrome MV3 extension runs batched jobs against a web app.
Between jobs it waits 12-24s via setTimeout in a side panel document.
When the panel is not foreground, Chrome throttles timers and the real
gap becomes ~11 minutes. Constraint: no new extension permissions;
a local Node host connected via loopback WebSocket already exists.

Propose EXACTLY 5 distinct mechanisms to make inter-job delays reliable.
For each, use this schema:
### OPTION <n>: <name>
- Mechanism (<=40 words)
- Why it beats setTimeout (<=30 words)
- Risk (<=30 words)
Then add:
## SELF-RANKING (order the 5, one line of reasoning each)
Last line must be exactly:
END_OF_RESPONSE
