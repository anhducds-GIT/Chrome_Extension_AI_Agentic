---
kind: study
status: superseded
ttl_days: 180
---

# Implementation Brief — Extension Operation Platform V0.1

> **Trạng thái:** chờ Đức duyệt giao cho đội code (dự kiến: Codex).
> **Chốt bởi:** Đức + GPT + Claude, 2026-08-26 (3 vòng reasoning, GPT audit 2 vòng).
> **Người viết brief:** Claude (`claude-platform-1`) — vai architect/điều phối, KHÔNG code.
> **Người code brief này KHÔNG được tự mở rộng phạm vi.** Thiếu gì → hỏi, hoặc ghi vào mục
> "Câu hỏi còn treo" cuối file. Phát sinh ý tưởng → BACKLOG, không làm.

## 1. Bài toán, một đoạn

Repo có 3 extension nhưng không có chỗ nào trả lời nhanh cho Đức: *có gì, trạng thái ra sao,
đã kiểm chứng chưa, dùng làm gì, tiếp theo làm gì, đọc sâu ở đâu*. Hai lần trong ngày 26/08,
tài liệu gõ tay đã nói sai (BACKLOG B-07 lạc hậu; dashboard artifact sai 4 con số sau 1 ngày).
V0.1 giải bằng: **một file trạng thái chuẩn cho mỗi extension (STATUS.md) + một dashboard do
máy sinh ra từ repo, không ai gõ tay**.

## 2. Năm nguyên tắc bắt buộc (vi phạm = audit fail)

1. **Máy sinh được thì máy sinh.** `DASHBOARD.md` là output của script, không bao giờ sửa tay.
   Số đo được (version, số method, số file test) lấy thẳng từ repo lúc sinh, không chép tay.
2. **Verified phải có bằng chứng, và commit mới ≠ verified.** Generator KHÔNG suy diễn
   `last_verified` từ git log. Nó chỉ đọc lời khai trong STATUS, và **báo đỏ (exit 1) nếu
   `evidence_ref` không tồn tại trên đĩa**. Không bằng chứng = không sinh được dashboard.
   Thêm hai luật GPT chốt 2026-08-26: (a) `last_verified_commit` phải là **full SHA 40 ký tự**
   và generator phải **resolve được** nó trong repo (`git rev-parse --verify <sha>^{commit}`),
   không resolve được → exit 1; (b) generator **máy đo** cờ `changed_since_verified` — code của
   package có bị sửa SAU mốc verify không — để operator không nhìn "Verified 26/08" mà tưởng
   bản hiện tại đã được kiểm.
3. **STATUS là SSOT của *trạng thái vận hành*, không phải của toàn bộ kiến thức.**
   Frontmatter = danh tính + lifecycle + lời khai verified + con trỏ. Kiến trúc chi tiết,
   capabilities dài, troubleshooting → chỉ LINK sang README/HANDOFF/AI-OPERATOR-GUIDE.
   STATUS mà phình thành README thứ hai = fail ranh giới schema.
4. **Output deterministic.** Không `Date.now()`, không giờ hệ thống, không format phụ thuộc
   locale. Dấu thời gian duy nhất = SHA của HEAD + committer date của HEAD. Chạy hai lần trên
   cùng cây → hai file giống hệt từng byte. (Lý do: V0.2 sẽ có `--check` so bản sinh với bản
   commit; có timestamp runtime thì mỗi lần build là một diff giả.)
5. **Không thêm dependency.** Node thuần, ESM, tự viết parser frontmatter (~30 dòng, chỉ cần
   `key: value` phẳng). Đúng quy ước repo: "Tests are dependency-free Node scripts".

## 3. Deliverables — đúng 7 món, không hơn

| # | File | Là gì |
|---|---|---|
| 1 | `PLATFORM.md` (gốc) | Mục đích platform · registry 3 extension · luồng chuẩn · vai trò Orchestrator/Maintainer dưới dạng **checklist** (map sang cơ chế đã có: AGENTS.md + claims + session-check) · cách thêm Extension #003 · roadmap · Log (chỉ thêm dòng) |
| 2 | `STATUS.template.md` (gốc) | Template cho Extension #003+, frontmatter mẫu + hướng dẫn từng trường |
| 3 | `workers/duc-auto-chatgpt/v0.1.0/STATUS.md` | SSOT vận hành pilot 1 (dữ liệu thật ở mục 5) |
| 4 | `workers/duc-auto-gemini/v0.2.0/STATUS.md` | SSOT vận hành pilot 2 (dữ liệu thật ở mục 5) |
| 5 | `scripts/build-dashboard.mjs` | Generator deterministic (spec ở mục 6) |
| 6 | `DASHBOARD.md` (gốc, sinh ra) | Output của #5, commit kèm — banner "SINH TỰ ĐỘNG — ĐỪNG SỬA TAY, sinh lại: `node scripts/build-dashboard.mjs`" |
| 7 | `tests/build-dashboard-smoke.mjs` | Test ghim (spec ở mục 7) + nối vào `npm test` trong `package.json`, thêm script `"dashboard"` |

**Chưa làm trong V0.1** (đã chốt, đừng đụng): agent daemon/automation engine · skill bundle
mới · gắn `--check` vào `session-check.mjs` (đổi cổng kiểm = Đức duyệt riêng ở V0.2) ·
`scripts/feature-parity.mjs` (B-06) · BACKLOG.md cho Gemini · STATUS.md cho Observer.

## 4. Schema frontmatter — `extension-status/v1`

Frontmatter YAML phẳng giữa hai dòng `---`. Parser chỉ cần hiểu `key: value` một tầng,
bỏ qua dòng trống và `#` comment. Giá trị có thể bọc `"..."`.

```yaml
---
schema: extension-status/v1        # bắt buộc, đúng chuỗi này
id: duc-auto-chatgpt               # bắt buộc, trùng tên thư mục package
name: Duc Auto ChatGPT             # bắt buộc
lifecycle: active                  # bắt buộc, enum: idea|building|active|paused|archived|experimental|unclassified
version_source: workers/duc-auto-chatgpt/v0.1.0/manifest.json   # bắt buộc — generator ĐỌC version từ đây, cấm gõ tay
last_verified: 2026-08-26          # bắt buộc nếu lifecycle=active — ngày kiểm chứng gần nhất
last_verified_commit: 00d1f99b44bd490cac079da5e803917346571a26
                                   # FULL SHA 40 ký tự (người khai). Generator resolve bằng
                                   # `git rev-parse --verify <sha>^{commit}` — không tồn tại → exit 1.
                                   # Dashboard hiển thị rút gọn 7 ký tự.
last_verified_how: "Pilot-14 live 3/3 + idempotency 5/5 phép đo"   # một dòng, cách kiểm chứng
evidence_ref: workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md
                                   # bắt buộc nếu có last_verified — generator kiểm file TỒN TẠI, không có → exit 1
current_focus: "..."               # bắt buộc — 1 câu: việc đang mở quan trọng nhất
ref_readme: workers/duc-auto-chatgpt/v0.1.0/README.md       # con trỏ canonical, ít nhất ref_readme + ref_handoff
ref_handoff: workers/duc-auto-chatgpt/v0.1.0/HANDOFF.md
ref_runbook: ...                   # tuỳ chọn
ref_backlog: ...                   # tuỳ chọn
---
```

Phần thân dưới frontmatter (cho mắt Đức, tiếng Việt, NGẮN): Ý tưởng ban đầu · Mục đích ·
Giới hạn đã biết · các mục còn lại chỉ là câu dẫn + link. Mọi `ref_*` và `evidence_ref` đều
được generator kiểm tồn tại.

## 5. Dữ liệu thật cho 2 STATUS pilot — KHÔNG tự chế lại

Các con số dưới đây do Claude đối chiếu từ HANDOFF/evidence ngày 26/08. Người code chỉ việc
dùng; nghi ngờ thì kiểm lại theo đường dẫn, không được thay bằng suy đoán.

**duc-auto-chatgpt** (v0.1.0, manifest version thật là `0.3.0` — vì thế mới có luật
`version_source`): lifecycle `active` · last_verified `2026-08-26` @
`00d1f99b44bd490cac079da5e803917346571a26`, how =
"Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo",
evidence = `Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md` · current_focus =
"B-14…B-18 đang mở; việc thật không chạy qua trần 90s của run.trial (B-17)" ·
ref_backlog = `BACKLOG.md` của package.

**duc-auto-gemini** (v0.2.0, manifest version `0.2.0`): lifecycle `active` · last_verified
`2026-08-26` @ `dd3c736b64206a357e6aa83f85c6e62a9fde43f7`, how =
"Trial live cặp run.stop/chat.reload 9/9 bước, khoá RUN_ACTIVE
chứng minh thật", evidence = `evidence-stop-reload-20260826/README.md` · current_focus =
"Reload extension để nạp bản vá lời nhắn; chưa có BACKLOG.md riêng; nợ GPT 6 tính năng +
3 method (xem FEATURE-PARITY.md)". Không có ref_backlog — đúng sự thật, đừng bịa.

**Observer V0** (gốc repo, `manifest.json` gốc, version `0.1.0`): KHÔNG có STATUS.md trong
V0.1. Registry vẫn phải hiện nó — lifecycle hiển thị `unclassified`, ghi chú "chưa khai
STATUS — việc mở". Tài sản trong repo không được biến mất khỏi registry.

## 6. Spec generator `scripts/build-dashboard.mjs`

**Input (đọc thẳng từ repo, không tham số bắt buộc):**
- `.agents/claims.json` → ai đang giữ gì.
- Quét `workers/*/*/STATUS.md` → parse frontmatter.
- Với mỗi STATUS: đọc `version_source` → lấy `version` + `name` manifest; đếm method Bridge =
  số lần xuất hiện `registryEntry({` trong `bridge-core.js` cùng thư mục (cách đếm này đã
  dùng trong FEATURE-PARITY.md, [ĐO]); đếm file test = số `*.mjs` trong `tests/` cùng thư mục.
- `manifest.json` gốc → dòng registry cho Observer.
- `git rev-parse --short HEAD` + `git log -1 --format=%cd --date=format:%Y-%m-%d` → dấu sinh.

**Validate — sai một điều là exit 1, in rõ sai gì bằng tiếng Việt:**
- `schema` ≠ `extension-status/v1` · thiếu trường bắt buộc · `lifecycle` ngoài enum.
- `evidence_ref` hoặc bất kỳ `ref_*` nào trỏ tới file không tồn tại.
- `version_source` không tồn tại hoặc không parse được JSON.
- Có `last_verified` mà thiếu `evidence_ref` (lời khai không bằng chứng).
- `last_verified_commit` không đúng dạng 40 ký tự hex, HOẶC không resolve được trong repo
  (`git rev-parse --verify <sha>^{commit}`). Lời khai trỏ vào commit ma = fail.

**Máy đo `changed_since_verified` — cờ chống "verified giả tươi":**
- Với mỗi STATUS có `last_verified_commit`: chạy
  `git log <sha>..HEAD --name-only -- <thư-mục-package>` và đếm các commit chạm **file ảnh
  hưởng hành vi**: đuôi `.js .mjs .json .html .css` trong package.
- **Loại khỏi phép đếm:** mọi file `.md`, và mọi đường dẫn khớp vùng bằng chứng
  (`evidence*/`, `Pilot-*/`, `pilot-*/`, `Batch-*/` — cùng regex với session-check). Không lọc
  thì cờ kêu oan ngay ngày đầu: chính commit thêm STATUS.md/HANDOFF đã "chạm package".
- Kết quả lên dashboard: cột "Code đổi sau kiểm chứng?" = `KHÔNG` hoặc `CÓ (N commit)` [ĐO].
  `CÓ` không chặn build — nó là tín hiệu cho Đức biết lời khai verified đã cũ so với code.
- Thư mục version có `manifest.json` nhưng KHÔNG có STATUS.md → **không im lặng**: vẫn hiện
  dòng registry với nhãn "CHƯA KHAI STATUS" (Observer thuộc diện này; các bản cũ như
  `duc-auto-gemini/v0.1.0` cũng vậy — hiện diện, gắn nhãn, không chặn build).

**Output `DASHBOARD.md`:** banner đừng-sửa-tay + lệnh sinh lại · dòng "Sinh tại commit
`<sha>` (<ngày commit>)" và ghi CHÚ RÕ: *đây là lúc sinh trang, KHÔNG phải lúc kiểm chứng* ·
bảng registry: Extension | Version [ĐO] | Lifecycle [KHAI] | Method Bridge [ĐO] | File test
[ĐO] | Kiểm chứng cuối (ngày @ commit 7 ký tự, cách kiểm) [KHAI+bằng chứng, link] |
**Code đổi sau kiểm chứng?** [ĐO] | Đang giữ (claims) | Việc đang mở | Đọc sâu (link STATUS)
· cuối trang: chú giải [ĐO]/[KHAI] (kế thừa quy ước FEATURE-PARITY.md). Xuống dòng `\n` (LF),
tự đảm bảo byte-stable.

## 7. Test ghim `tests/build-dashboard-smoke.mjs` — tối thiểu 6 ca

Generator phải export các hàm lõi (`parseStatus`, `validateStatus`, `buildDashboard`) để test
gọi được với fixture trong bộ nhớ/thư mục tạm, không phá repo thật. Các lệnh git bọc sau
hàm tiêm được (inject) để test không phụ thuộc lịch sử repo thật.

1. **Parse:** frontmatter mẫu (đúng schema) parse ra đủ trường, đúng giá trị.
2. **Bằng chứng thiếu → đỏ:** STATUS có `last_verified` + `evidence_ref` trỏ file không tồn
   tại → validate fail, thông báo nêu tên file. Đây là luật "verified phải có bằng chứng"
   được máy hoá — ca test quan trọng nhất, không được bỏ.
3. **Deterministic:** chạy build 2 lần trên cùng input → output giống hệt từng byte.
4. **STATUS thiếu → rõ ràng:** thư mục có manifest mà không có STATUS → output chứa nhãn
   "CHƯA KHAI STATUS", không crash, không im lặng.
5. **Commit ma → đỏ:** `last_verified_commit` sai dạng (không phải 40 hex) hoặc không resolve
   được → validate fail, thông báo nêu SHA.
6. **Lọc của `changed_since_verified` đúng chiều:** thay đổi chỉ gồm `.md`/vùng bằng chứng
   → `KHÔNG`; thay đổi có `.js` trong package → `CÓ (N)`. Cả hai chiều đều phải có assert.

Chạy toàn bộ qua `node tests/build-dashboard-smoke.mjs`, nối vào chuỗi `npm test`.

## 8. Quy trình cho phiên code (theo hiến pháp repo, tóm lại cho khỏi lật)

1. Đọc `AGENTS.md` gốc → brief này → `HANDOFF.md` của 2 worker (phần cuối).
2. Ghi claim: `_root` + `workers/duc-auto-chatgpt` + `workers/duc-auto-gemini` (nhãn riêng
   của bạn; chỉ được lấy khi Đức đã duyệt giao brief này).
3. Làm 7 deliverables. Khai file mới: STATUS.md vào Bản đồ file trong AGENTS.md của TỪNG
   package; PLATFORM.md/DASHBOARD.md/brief vào bảng "Sổ tay mở khi cần" của AGENTS.md gốc.
4. Ghi 1 dòng Log vào HANDOFF.md của mỗi package đã đụng.
5. `node scripts/build-dashboard.mjs` → commit DASHBOARD.md sinh ra.
6. `node scripts/session-check.mjs --as <nhãn-của-bạn>` → phải XANH TOÀN BỘ.
7. Commit và push được tự làm khi việc xong trọn vẹn + cổng kiểm xanh + audit độc lập PASS
   (luật mới, Đức chốt 2026-08-26 — xem AGENTS.md mục 2). Luôn dùng
   `node scripts/safe-push.mjs --as <nhãn>`; safe-push từ chối vì cuốn commit phiên khác
   → dừng, hỏi Đức.

## 9. Definition of Done V0.1

- [ ] 7 deliverables tồn tại, đúng spec mục 4–7.
- [ ] `npm test` xanh (suite cũ + smoke mới), `session-check` xanh toàn bộ.
- [ ] `DASHBOARD.md` trả lời được 6 câu của Đức: có gì / trạng thái / đã kiểm chứng chưa /
      dùng làm gì / tiếp theo làm gì / đọc sâu ở đâu.
- [ ] Không sửa một dòng nào trong `*.js` của extension, `session-check.mjs`, `safe-push.mjs`.
- [ ] Audit độc lập (Claude) PASS — checklist mục 10.
- [ ] Đức duyệt → push.

## 10. Checklist audit độc lập (Claude sẽ chạy sau khi code xong)

- Ranh giới schema: STATUS có chép nội dung README/HANDOFF không, hay chỉ trỏ. (Yêu cầu
  riêng của GPT: audit schema boundary, không chỉ "code chạy được".)
- Luật verified: sửa tạm `evidence_ref` thành đường dẫn ma → generator có đỏ thật không.
- Determinism: tự chạy 2 lần, diff bằng máy.
- Mutation check: phá từng luật validate → test tương ứng có đỏ không (test xanh khi luật
  đã bị phá = test giả).
- `git diff --stat` toàn phiên: không file nào ngoài danh sách mục 3 + khai báo mục 8.3–8.4.

## 11. Câu hỏi còn treo (không chặn V0.1)

1. Artifact dashboard cũ (bản claude-gemini-4, đang kẹt force-publish): sau khi có
   `DASHBOARD.md`, trang artifact nên sinh lại từ nó hay cho nghỉ? — Đức quyết.
2. V0.2: gắn `--check` vào session-check (EXPECTED_CHECKS 6→7) — đổi cổng kiểm, Đức duyệt riêng.
3. V0.2: `scripts/feature-parity.mjs` (B-06 bước 1–2) và BACKLOG.md cho Gemini.
4. V0.2: đóng các protocol lặp lại (create-extension / close-session) thành skill.
