# TASK C-01 — Bảng dữ kiện: cơ chế timer/keep-alive MV3 (COVERAGE, JSON-in-XLSX)

- Topology: COVERAGE — lý do: output bản chất là bảng dữ kiện có nguồn, cần quét đủ các cơ chế.
- Kênh: JSON-in-XLSX · Vòng: 1 (+1 delta)
- Mục tiêu đo: CC parse JSON máy móc thành công KHÔNG đọc văn · số dòng · source_url thật.
- Gate 0: [ ] Đức đã duyệt

## PROMPT (gửi nguyên khối, task_type=text_reasoning)

Research current (2026) Chrome MV3 documented behavior for keeping
scheduled work reliable when documents are hidden. Respond ONLY with
a single JSON object, no markdown fences, no prose, matching exactly:
{"rows":[{"mechanism":"","min_interval":"","survives_hidden_doc":true,
"survives_sw_kill":true,"permission_needed":"","source_url":"","note":""}],
"row_count":0}
Cover at least: chrome.alarms, offscreen document, dedicated worker,
host-side scheduling via WebSocket, side panel focus.
Max 8 rows. "note" <=25 words each.
Last line after the JSON must be exactly:
END_OF_RESPONSE
