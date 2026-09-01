---
kind: brief
status: active
ttl_days: 30
---

# BRIEF — Phiên S1-HOÀN-TẤT

> Dán vào Claude Code. Một phiên, một commit, một push. Không làm gì ngoài brief này.

## Mở phiên
1. Đọc `AGENTS.md` gốc repo, rồi `DASHBOARD.md`. Ghi tên phiên vào `.agents/claims.json` cho `_root`.
2. **Kiểm nền ngay:** `node scripts/session-check.mjs --as s1-complete`
   - ĐỎ → DỪNG, báo nguyên văn lỗi, không sửa gì.
   - XANH → làm tiếp.
   Lý do: các đợt push docs qua API (31/08 và 01/09) đã bỏ qua cổng. Phải xác nhận repo còn xanh.

## Bối cảnh
Audit 2026-09-01 [ĐO]: 5 file nghiên cứu 31/08 ĐÃ ở `docs/studies/`. Còn thiếu 4 món dưới.

## Việc cần làm — đúng 4 món
1. `docs/studies/ROADMAP-CLEAN-AND-TEMPLATE-V1.md`: thêm frontmatter đầu file, đúng ba trường,
   không sửa gì khác: `kind: study` · `status: active` · `ttl_days: 180`.
2. `docs/studies/SEND-TO-OTHER-REPOS.md`: frontmatter đang 4 trường — XÓA dòng `created`. Giữ đúng 3.
3. `git mv docs/studies/archive docs/archive` (2 file). Roadmap S1 quy định archive ở `docs/archive/`.
4. Tạo `docs/_TEMPLATE-study.md`: frontmatter 3 trường + khung tiêu đề + dòng nhắc
   "Con số luôn lấy từ nguồn máy sinh, không gõ tay". Dưới 25 dòng.

## Cấm
KHÔNG đụng `drafts/` cũ (đó là S6) · KHÔNG đụng `evidence/`, `Pilot-*`, `Batch-*` ·
KHÔNG sửa thân bài file docs nào.

## Đóng phiên — đúng thứ tự
```bash
node scripts/build-dashboard.mjs
git add -A && git commit -m "S1 complete: frontmatter 3 fields, docs/archive, study template"
node scripts/session-check.mjs --as s1-complete
node scripts/safe-push.mjs --as s1-complete
```
Ghi 1 dòng vào `HANDOFF.md` root. Báo cáo: kết quả session-check + danh sách file đổi.

## Đức nghiệm thu
- ROADMAP có frontmatter 3 trường · SEND-TO-OTHER-REPOS hết dòng `created`
- `docs/archive/` có 2 file, `docs/studies/archive/` biến mất
- `docs/_TEMPLATE-study.md` tồn tại · `drafts/` không bị đụng
