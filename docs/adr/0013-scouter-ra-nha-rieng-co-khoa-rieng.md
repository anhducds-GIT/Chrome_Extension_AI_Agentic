---
status: Accepted
adr: 0013
date: 2026-09-06
deciders: Đức
---

# ADR-0013 — Scouter ra nhà riêng trong `workers/`, có khoá riêng như mọi extension khác

## Bối cảnh

Đức hỏi 06/09:

> *"Scouter tôi cũng muốn tách khoá tương tự như các extension, vì về bản chất nó là 1
> extension đúng không?"*

Đúng. Và đo ra thì tình trạng hôm nay **tệ hơn câu hỏi**: Scouter không phải nằm sai một khoá,
nó nằm **rải trên hai khoá đông nhất repo**.

| Phần của Scouter | Đang ở | Thuộc khoá |
|---|---|---|
| `manifest.json` · `popup.html` · `popup.css` · `popup.js` · `observer-engine.js` · `STATUS.md` | gốc repo | **`_root`** |
| `scripts/observer-probes.mjs` · `scripts/observer-mutation-check.mjs` · `scripts/scouter-input-trust-probe.mjs` | `scripts/` | **`_code`** |
| `tests/observer-engine-smoke.mjs` · `tests/observer-probes-smoke.mjs` · `tests/scouter-input-trust-smoke.mjs` | `tests/` | **`_code`** |

`_root` là khoá đông nhất (đo 02/09: 77% commit chạm gốc repo). `_code` là khoá của cổng đóng
phiên và bộ sinh — vùng mà `bang-trang-thai/` **ngừng sinh bảng** khi có ai giữ. Nên xây Scouter
theo hình dạng hôm nay là **chiếm cả hai khoá đông nhất cùng lúc**, cho một việc không liên quan
tới cái nào trong hai.

Ba worker kia không có bệnh đó vì chúng nằm trong `workers/`, mà khối `areas` của
`.repo-structure.json` khai `workers/` là `ownership_mode: per-package` với
`claim_prefix: "workers/"`. Mỗi gói **tự có khoá**, không ai phải xin phép ai.

Ràng buộc ngược lại, ghi ra để không bị bất ngờ: `BRIEF-OBSERVER-V1` mục 6 **cấm chuyển thư mục
Observer**, lý do là *"chỗ đặt chưa quyết, và chuyển chỗ giữa lúc đang xây làm mọi diff sau đó
không đọc được"*. Cấm đó đúng lúc nó được viết. ADR này là câu quyết còn thiếu, nên nó **gỡ**
cấm đó — và gỡ đúng lúc, vì việc ② (xây seed) **chưa có một dòng code nào**. Chuyển bây giờ là
chuyển một thư mục tĩnh ba tuần không ai sửa; chuyển sau là chuyển giữa lúc đang xây.

## Quyết định

**Scouter thành một package trong `workers/`, có khoá riêng, theo đúng sáu bước "Thêm Extension"
của `PLATFORM.md` mục 6.**

- Chỗ đặt: **`workers/duc-scouter/v0.1.0/`**. Khoá sinh ra theo `claim_prefix`:
  **`workers/duc-scouter`**.
- **Cả ba nhóm file ở bảng trên đều chuyển**, kể cả bốn phép dò và hai phép ghim. Chuyển nửa vời
  là giữ nguyên bệnh: gói vẫn phải xin `_code` mỗi lần sửa một phép dò.
- Việc chuyển là **bước ① của lượt xây seed**, cùng một lane, không tách phiên. Lane đó nhận
  `_root` + `_code` cho riêng bước chuyển, khai khoá mới, **trả cả hai ngay sau khi chuyển xong**,
  rồi xây seed dưới khoá của chính nó.
- Không đổi tên `duc-auto-*` của ba gói kia. Scouter không tự động hoá một nhà cung cấp nào nên
  nó không mang tiền tố đó — đây là chủ ý, không phải quên.

## Hệ quả

**Được.** Xây Scouter thôi chạm `_root` và `_code`. Nghĩa là nó **chạy song song được** với việc
hạ tầng và với ba gói worker — bốn việc, bốn khoá, không ai xếp hàng sau ai. Đây đúng là thứ Đức
đòi ở `BRIEF-K2-KHOA-RANH-01`, và lần này giải quyết được ở **hình dạng repo** chứ không phải ở
lời nhắc trong bản giao việc.

Kèm theo, gần như miễn phí: gói tự có `AGENTS.md` · `HANDOFF.md` · `BACKLOG.md` · `STATUS.md`
riêng như ba gói kia, nên bảng trạng thái tự đếm nó thành một Extension (`units.marker` là
`manifest.json`, `depth: 2`).

Và nó mở đường cho tầng adapter của ADR-0009: mỗi adapter về sau là một gói `workers/…`, tự có
khoá. Nếu để seed ở gốc repo thì adapter đầu tiên sẽ phải phát minh lại chỗ đặt.

**Mất — bốn chỗ, và ba trong bốn là đường dẫn cứng.**

1. `package.json` trỏ tới **ba** phép ghim đó ở **hai** chỗ — `test` và `test:observer`. Suite
   gốc **đỏ ngay lượt chạy đầu** nếu chuyển file mà quên một trong hai. Dễ thấy, dễ sửa.
2. **Sáu tài liệu** trỏ tới đường dẫn cũ và **phải sửa**: `README.md` ·
   `docs/briefs/BRIEF-OBSERVER-V1.md` · `docs/briefs/BRIEF-SCOUTER-SEED-01.md` ·
   `docs/studies/SCOUTER-CAPABILITY-INVENTORY-V1.md` ·
   `docs/studies/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md` ·
   `docs/audits/AUDIT-OBSERVER-PROBES-CODEX-01.md`.
   Ba file nữa cũng trỏ nhưng **CẤM sửa**: `HANDOFF.md` gốc và hai `HANDOFF-ARCHIVE-01.md` —
   chữ cũ của phiên khác (luật mục 1), và file lưu trữ là bất biến (ADR-0008). Con trỏ chết ở đó
   là cái giá phải chịu, không phải cái để dọn.
   Đo lại trước khi tin con số này: `grep -rln "observer-engine\|observer-probes\|observer-mutation\|scouter-input-trust" --include=*.md .`
3. Mọi lịch sử `git log` của năm file đó vẫn tra được, nhưng phải thêm `--follow`. Ai quên thì
   thấy một file "mới sinh 06/09" và tưởng chưa có lịch sử.
4. Đức phải **nạp lại extension** trong Chrome từ đường dẫn mới nếu đã từng nạp bản ở gốc repo.
   Bản cũ ở gốc repo sẽ không còn.

**Chỗ dễ làm ẩu, nói trước:** chuyển bằng `git mv`, không phải copy-rồi-xoá. Copy-rồi-xoá làm
git mất dấu đổi tên và mọi `--follow` sau đó vô dụng.

## Trạng thái

Accepted
