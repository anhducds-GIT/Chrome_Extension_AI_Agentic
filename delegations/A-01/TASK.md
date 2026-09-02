# TASK A-01 — Audit độc lập PLATFORM-AI-ORCHESTRATOR-STUDY.md

- Topology: COVERAGE (mầm VERIFY) — lý do: tài liệu lớn cần quét đủ theo rubric, có ground truth là chính tài liệu trong repo.
- Kênh: XLSX → MD digest · Vòng: 1 (+1 delta nếu thiếu mục) · Trần: ~800 từ
- Mục tiêu đo: (1) câu trả lời dài ≥2.000 ký tự được bắt NGUYÊN VẸN vào Result XLSX; (2) tỉ lệ nén digest; (3) kết quả audit dùng được cho quyết định orchestrator đang mở.
- Gate 0: [ ] Đức đã duyệt

## PROMPT (gửi nguyên khối, task_type=text_reasoning)

Use your GitHub connector to read docs/archive/PLATFORM-AI-ORCHESTRATOR-STUDY.md
in repo anhducds-GIT/Chrome_Extension_AI_Agentic (branch main).
Audit it as an independent reviewer. Respond ONLY with:

## VERDICT (<=50 words)
## TOP RISKS (exactly 3, each <=80 words, cite section numbers)
## HIDDEN ASSUMPTIONS (exactly 3, each <=60 words)
## WHAT TO CUT FROM V0.3 (exactly 2, each <=60 words)
## ONE QUESTION FOR THE OWNER (<=40 words)

No intro, no conclusion. Last line must be exactly:
END_OF_RESPONSE
