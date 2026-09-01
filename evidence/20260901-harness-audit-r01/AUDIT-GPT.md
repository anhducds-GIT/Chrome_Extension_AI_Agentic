# AUDIT-GPT — Nguyên văn kết quả audit (2026-09-01, NO WRITE)

Neo: Project-3 commit `82db7f636346aebda70d788c3ad8b9c2f16e0fb9` · Chrome Extension commit `9f2759a15dc252e10451af280a354743a736f98f`.

Kết luận: Chưa được rollout cross-repo. Hướng hợp nhất A+B đúng, nhưng baseline cũ không tái lập được, manifest/checksum đang mâu thuẫn và cơ chế automation đề xuất xung đột luật hiện hành. [ĐO][ĐỌC]

## A. BẢNG KIỂM CHỨNG SỐ LIỆU

| Chỉ số | Khai [KHAI] | Kiểm lại | Kết quả |
|---|---|---|---|
| Tổng repo | 21 | 21; 20 có nội dung, 1 rỗng | Khớp có điều kiện [ĐO] |
| Repo có root AGENTS.md | 16/21 | 15/21 | Lệch [ĐO] |
| Repo có root .upstream.json | 5/21 | 5/21 | Khớp [ĐO] |
| Repo có root GEMINI.md | 1/21 | 1/21 | Khớp [ĐO] |
| Repo không governance | 4 | 4 có nội dung không governance + 1 rỗng | Khớp nếu loại repo rỗng [ĐO] |
| Điểm lệch 7 file × 17 repo | 43 | Không tái lập được: không định danh 7 file, 17 repo, thuật toán normalize | Không kiểm chứng được [ĐỌC] |
| Lệch tier LOCKED | 17 trên 9 repo | Không tái lập. Phép gần nhất từ 5 .upstream.json: 13/48 path lệch tại 4 repo | Không khớp phạm vi [ĐO] |
| Repo đạt chuẩn đầy đủ | 0 | 0/21 theo tiêu chí công khai | Khớp [ĐO] |
| Kích thước Kho | 116 file | 91 file + 24 thư mục | Lệch cách đếm [ĐO] |

4 repo có nội dung không governance: APK-BUILDER, CMF-Management-Spb-Library, StockAnalysis_Phan-tich-ky-thuat-AI, Pin_AI_Study. Repo rỗng: Dashboard-NAV-v1-antigravity. [ĐO]

Kiểm 4 lỗi cấu trúc: Permissions phân tán — đúng bản chất nhưng số 6 không tái lập (≥7 nguồn) [ĐỌC] · "Kho không có manifest tier" — SAI: `sync_manifest.json` 76 mục (21 LOCKED / 36 SEED / 19 owner_only), thiếu schema_version [ĐỌC][ĐO] · "Root lệch 4 LOCKED" — SAI: 21/21 path LOCKED không exact-match (11 khác nội dung, 10 thiếu); root không được đăng ký như repo con [ĐO] · AI_Operating_Rules_Universal.md lệch 9/9 — KHỚP [ĐO] · Dashboard treo partial_block_applied từ 2026-07-20 — KHỚP [ĐỌC].

`harness_parity_check.py` chưa tồn tại trên main của cả hai repo → số 43 và 17 không có verifier versioned để tái tạo. [ĐO]

## B. TRẢ LỜI Q1–Q9

Q1 ĐỒNG Ý — Hủy repo-template độc lập; promote artifact đã kiểm vào Kho tier SEED.
Q2 SỬA — Giữ phép kiểm navigation nhưng dùng trục tên riêng (navigation_conformance / BOOTSTRAP_VERIFIED), không gọi L3. Cổng đầy đủ = one-line + no-scan + questions test qua BA phiên mới.
Q3 SỬA — KHO/AGENTS.md ~199 dòng, sát trần. Không hard-block ngay; K2 đặt target ≤180 dòng, kiểm bằng máy.
Q4 SỬA — Registry duy nhất trong Kho, tier owner_only. P5 chỉ đọc, không giữ bản sao.
Q5 SỬA — Song song có điều kiện SAU K0. Track Chrome tuần tự nội bộ.
Q6 SỬA — PR script đúng, nhưng bắt buộc dry-run, idempotent, canary 2 repo, Đức duyệt từng PR. Marker và generator là hai bước riêng.
Q7 BÁC — Không áp frontmatter 3 trường cho MỌI tài liệu Kho. Chỉ áp lifecycle STATE/study/brief/spec/guide. LAW/GENERATED/EVIDENCE/ADR cần contract riêng.
Q8 SỬA — Giữ hai contract logic. Nhưng KHÔNG tạo HARNESS_MANIFEST.json song song sync_manifest.json; migrate/rename nguyên tử, thêm schema_version, cập nhật mọi consumer + checksum cùng commit.
Q9 ĐỒNG Ý — harness_version đủ làm cảnh báo, không đủ hard gate. Hard gate cần manifest digest, hash vùng marker, Git SHA, parity deterministic.

## C. PHẢN BIỆN THỨ TỰ

K1 tạo manifest mới → SSOT thứ hai; migrate nguyên tử thay thế · Audit trước verifier → không tái tạo được; commit verifier + pin scope trước baseline · Registry phải lên trước baseline rollout · K2 trước CAPTURE cuối (không sync nội dung sắp đổi) · "S1–S7 song song" quá rộng, chỉ song song theo lane sau K0 · Canary marker trước, generator sau · GitHub Action xếp rủi ro CAO cho tới khi canary + PR-only chứng minh an toàn · K7 cần ≥2 tuần VÀ đủ số lần chạy sạch.

## D. LỖ HỔNG MỚI

1. Version không SSOT: thư mục v1.0 · PACKAGE_MANIFEST.md v1.1 · manifest 1.6.1 [ĐỌC]
2. SHA256SUMS.txt hỏng: 87 mục, thiếu 27 file hiện hành, thừa 24 path chết [ĐO]
3. 10/13 path đang lệch vẫn khai status: synced [ĐO]
4. Bootstrap path mâu thuẫn: yêu cầu handoff.md nhưng thật ở state/HANDOFF.md; AI_ONBOARDING.json trỏ file không tồn tại [ĐỌC]
5. llms.txt bị đánh LOCKED dù là file máy sinh (placeholder) [ĐỌC]
6. Automation policy xung đột: manifest cấm automation nhưng an_sync_universal_rules.py mô tả như scheduled sync, thiếu dry-run/PR approval [ĐỌC]
7. Evidence test thiếu provenance: cần repo SHA, model/surface, prompt, response, thời điểm, kết quả của ba fresh sessions [ĐỌC]

Chrome repo: chưa có llms.txt, repo-map.json, .repo-structure.json, bootstrap checker, evidence folder dự kiến. 9 file docs/, chỉ 7 đúng frontmatter 3 trường → S1 chưa hoàn tất. [ĐO]

## E. THỨ TỰ CUỐI (14 bước)

1 K0 pin SHA + chốt migration/registry/manual-policy (Thấp, Đức duyệt) · 2 Migrate sync_manifest → contract có schema_version, sửa version/path/tier, regenerate checksum (Cao, duyệt) · 3 Commit harness_parity_check.py + fixture (TB) · 4 Baseline 21 repo theo SHA (Thấp) · 5 Đức phân loại registry active/archived/fork/exception (TB, duyệt) · 6A Chrome S1→S4 tuần tự (TB, nghiệm thu mỗi phiên) · 6B K2 gộp Permissions + sửa bootstrap path + ownership llms.txt (Cao, duyệt) · 7 Chrome S6→S7 + three-test; S5 sau S7 (TB, duyệt) · 8 Promote vào Kho SEED, hủy repo-template (TB, duyệt) · 9 CAPTURE diff root + active repos (Thấp) · 10 Đức duyệt từng diff (Cao) · 11 Marker script dry-run + PR 2 canary (Cao, duyệt từng PR) · 12 Action workflow_dispatch CAPTURE/PR-only, cấm cron/direct-push/overwrite (Cao, duyệt wave đầu) · 13 P5 radar (TB, cần ≥2 repo đạt) · 14 K7 tái cấu trúc (Cao, ≥2 tuần + chạy sạch + rollback đã thử).

## F. 14 QUYẾT ĐỊNH

(Đã chốt nguyên trạng 2026-09-01, ghi tại Project-3 `decisions.md` mục K0 — xem CROSSCHECK-CLAUDE.md cùng thư mục.)
