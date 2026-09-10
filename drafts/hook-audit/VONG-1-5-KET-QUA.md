# Kết quả kiểm toán hook — Vòng 1–5

> **ĐÃ BỊ THAY THẾ — ĐỪNG TRÍCH BẢNG DƯỚI NHƯ SỰ THẬT.** Đây là sản phẩm của lượt pilot
> 5 vòng ngày 10/09, giữ lại làm bản ghi lịch sử. CC kiểm lại **ba** kết luận sắc nhất và
> **hai sai**, cả hai đều là câu khẳng định VẮNG MẶT:
>
> - `innerHTML` chấm **RỖNG** → sai. `tests/artifact-integrity-smoke.mjs:71` có
>   `assert.doesNotMatch(…, /\.innerHTML\s*=/)` chạy thật trong suite. GPT audit từ gốc repo
>   nên không thấy ghim **mức gói**.
> - `--soat` chấm **RỖNG** → sai. `core.hooksPath = .githooks`, và `.githooks/commit-msg` gọi
>   `claim.mjs --soat`, chặn bằng mã thoát 3. Hạng đúng là **MỀM** (có ba đường fail-open).
>
> Nên tỷ lệ *"~26% có cưỡng chế"* dưới đây là **chặn dưới, đo sai phía an toàn** — số thật
> cao hơn, chưa biết cao bao nhiêu.
>
> Bản kiểm toán đang có hiệu lực là chuỗi `luat-audit` (Sheet 747 luật, phạm vi 14 file tại
> commit `1ea8b429`) — xem `drafts/luat-audit/CC/HOP-DONG.md` và `MOC-2.md`.

Phạm vi: đối chiếu luật root trong `AGENTS.md` / `CLAUDE.md` với enforcement đã tìm thấy trong repo `anhducds-GIT/Chrome_Extension_AI_Agentic` trên `main` qua 5 vòng kiểm toán. Đây là bản ghi kết quả audit, chưa phải kế hoạch sửa.

## Phân hạng 27 nhóm luật

| # | Luật / nhóm luật | Phân hạng | Bằng chứng / hook đã thấy |
|---|---|---|---|
| 1 | Mở đúng `PHIEN.md` hoặc root `AGENTS.md`; không preload nguồn sâu hơn | RỖNG | `AGENTS.md`; `CLAUDE.md` |
| 2 | Một việc một lúc; phát sinh ngoài scope ghi `BACKLOG.md` | RỖNG | `AGENTS.md` |
| 3 | Đóng phiên phải thêm Log vào `HANDOFF.md` | CỨNG | `AGENTS.md`; `scripts/session-check.mjs` |
| 4 | Quyết định mới của Đức thành ADR; lỗi live mới vào bảng lỗi gói | RỖNG | `AGENTS.md` |
| 5 | Ownership / claim / file-lock / fingerprint phải hợp lệ | CỨNG | `AGENTS.md`; `scripts/session-check.mjs`; `scripts/claim.mjs` được `session-check.mjs` import |
| 6 | Vùng bằng chứng chỉ được append, không sửa lịch sử cũ | CỨNG | `AGENTS.md`; `scripts/session-check.mjs`; `scripts/repo-structure.mjs` được dùng cho append-only check |
| 7 | Khi `DAU_VO`: xem diff, hỏi Đức, không restamp để lách | MỀM | `AGENTS.md`; `scripts/session-check.mjs` phát hiện fingerprint lệch nhưng chưa chứng minh được cách xử lý sau đó bị cưỡng chế |
| 8 | `--soat` bắt buộc trước `git commit` | RỖNG | `AGENTS.md`; chưa tìm thấy executable hook ngoài lời luật trong phạm vi audit |
| 9 | Không `git checkout` / `reset` / `stash` state sống | RỖNG | `AGENTS.md`; chưa tìm thấy hook chặn lệnh trực tiếp |
| 10 | Cổng đỏ = chưa xong; final suite phải xanh trên trạng thái cuối | CỨNG | `AGENTS.md`; `scripts/session-check.mjs`; `scripts/chay-test.mjs` |
| 11 | Mọi commit phải có `Lane: <session>` | CỨNG | `AGENTS.md`; `scripts/session-check.mjs`; `scripts/repo-structure.mjs` có logic đọc lane |
| 12 | Không dùng raw `git push`; phải qua `safe-push.mjs` | MỀM | `AGENTS.md`; `scripts/safe-push.mjs` kiểm push khi wrapper được gọi, nhưng audit chưa chứng minh raw `git push` bị chặn ở boundary Git |
| 13 | `--carry` chỉ hợp lệ theo điều kiện và phải ghi lane bị cuốn vào nhật ký | MỀM | `AGENTS.md`; `scripts/safe-push.mjs` có logic carry / foreign lane; chưa chứng minh nghĩa vụ nhật ký được cưỡng chế đầy đủ |
| 14 | `--amend` chỉ commit của chính lane mình và chưa push | RỖNG | `AGENTS.md`; chưa tìm thấy executable enforcement trong phạm vi audit |
| 15 | Không để token / mật khẩu / pairing file lọt repo | CỨNG | `AGENTS.md`; `scripts/session-check.mjs` secret scan |
| 16 | Không dùng `.innerHTML` / `.outerHTML` / `insertAdjacentHTML` | RỖNG | `AGENTS.md`; chưa tìm thấy static/runtime blocker trong phạm vi audit |
| 17 | Selector phải có DOM evidence thật; Scouter không gõ selector vào seed | RỖNG | `AGENTS.md`; chưa tìm thấy hook kiểm quan hệ selector ↔ evidence |
| 18 | Không tin báo cáo AI khác; tự rerun test và tự đọc diff | RỖNG | `AGENTS.md`; chưa tìm thấy executable proof-of-independent-review hook |
| 19 | Mọi patch phải kèm phép ghim | RỖNG | `AGENTS.md`; test suite tồn tại nhưng chưa chứng minh patch-to-pin contract được enforce |
| 20 | Người sửa không tự ký nghiệm thu bản sửa của mình | RỖNG | `AGENTS.md`; chưa tìm thấy signer/fixer separation hook |
| 21 | HARD ROLE FIREWALL cho chế độ điều phối | CHƯA ĐỦ BẰNG CHỨNG | `AGENTS.md`; chưa xác minh được executable role firewall trong phạm vi audit |
| 22 | Product cần hạ tầng phải gửi yêu cầu BACKLOG, không tự lấy vùng | CHƯA ĐỦ BẰNG CHỨNG | `AGENTS.md`; chưa xác minh được hook phân biệt intent Product/System |
| 23 | Tối đa 2 chat song song; concurrent roles phải khác vùng | CHƯA ĐỦ BẰNG CHỨNG | `AGENTS.md`; ownership có hook nhưng giới hạn số chat chưa được chứng minh |
| 24 | Không implement cùng một feature hai lần; dùng `_shared/` khi dùng chung | CHƯA ĐỦ BẰNG CHỨNG | `AGENTS.md`; chưa xác minh deterministic duplicate-feature detector |
| 25 | Context / docs / debt / loaded-context phải nằm trong budget/cap | CỨNG | `AGENTS.md`; `scripts/session-check.mjs`; `scripts/rule-compiler.mjs`; `.repo-structure.json` |
| 26 | Các mục “đọc trước khi làm” ở mục 8 phải được tuân thủ | CHƯA ĐỦ BẰNG CHỨNG | `AGENTS.md`; chưa xác minh loader/hook chứng minh file đã được đọc trước hành động |
| 27 | Các hành vi bắt buộc hỏi Đức trước (permission, live pilot, safety rule, history rewrite/merge và luật gốc dữ liệu/automation) | CHƯA ĐỦ BẰNG CHỨNG | `AGENTS.md`; chưa xác minh approval gate máy cho toàn bộ nhóm này |

## Tổng hợp

- CỨNG: 7 nhóm
- MỀM: 3 nhóm
- RỖNG: 11 nhóm
- CHƯA ĐỦ BẰNG CHỨNG: 6 nhóm
- Tổng: 27 nhóm

## CHƯA TÌM THẤY

Các điểm audit chưa chứng minh được bằng code thực thi trong phạm vi 5 vòng:

- Một boundary ở Git có thể chặn người dùng/AI chạy raw `git push`, thay vì chỉ cung cấp `scripts/safe-push.mjs` như wrapper an toàn.
- Hook cưỡng chế `--soat` trước commit và policy `--amend` own+unpushed.
- Hook chặn `checkout` / `reset` / `stash` trên các file state sống.
- Static/runtime enforcement cho họ API DOM bị cấm: `.innerHTML`, `.outerHTML`, `insertAdjacentHTML`.
- Contract máy nối selector với `diagnostics.dom_probe` evidence và nối patch với phép ghim.
- Cơ chế máy chứng minh reviewer/signer khác fixer hoặc AI đã tự rerun test + đọc diff.
- Enforcement thực thi cho Orchestrator hard role firewall, Product→infra handoff, và giới hạn tối đa 2 chat.
- Detector deterministic cho “không implement feature hai lần”.
- Cơ chế chứng minh các tài liệu bắt buộc đã được đọc trước hành động tương ứng.
- Approval gate máy bao phủ toàn bộ nhóm hành vi phải hỏi Đức trước.

Ghi chú: “CHƯA TÌM THẤY” nghĩa là chưa có đủ bằng chứng trong phạm vi audit đã thực hiện; không đồng nghĩa chắc chắn hook không tồn tại ở nơi chưa được kiểm.