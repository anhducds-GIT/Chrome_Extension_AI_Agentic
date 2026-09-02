---
schema: extension-status/v2
id: extension-observer-v0
name: Extension Observer V0
lifecycle: idea
owner: claude
priority_rank: 4
next_step: "Quyết định: nuôi tiếp hay cho nghỉ. Nếu nuôi thì chuyển vào workers/observer-v0/v0.1.0/ theo phiên S8; nếu không thì khai archived."
human_action: "Quyết định Extension Observer V0: nuôi tiếp hay cho nghỉ. Chỉ Đức chốt được."
version_source: manifest.json
current_focus: "Chưa từng chạy pilot nào. Đây là mã quan sát ở gốc repo, còn nằm ngoài cấu trúc workers/ — phiên S8 sẽ chuyển nó vào đúng chỗ."
ref_readme: README.md
ref_handoff: HANDOFF.md
---

# Extension Observer V0

Đơn vị ở **gốc repo** — `manifest.json` nằm ở tầng ngoài cùng, không nằm trong `workers/`.

**Vì sao `lifecycle: idea`, không phải `building`.** Nó chưa từng chạy pilot, chưa có bằng
chứng vận hành, và không phiên nào đang phát triển nó. Khai `building` là nói quá.

**Vì sao không khai `last_verified`.** Không có gì để kiểm chứng — chưa chạy lần nào. Luật
của repo: khai `last_verified` thì phải có `evidence_ref` trỏ tới bằng chứng thật.

Việc đang mở nằm ở `next_step` phía trên. Nó không chặn ai.
