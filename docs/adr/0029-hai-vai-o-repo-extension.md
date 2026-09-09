---
status: Accepted
adr: 0029
decides: [0029]
date: 2026-09-09
last_reviewed: 2026-09-09
deciders: Đức
---

# ADR-0029 — Hai vai ở repo Extension: **Hệ thống / Sản phẩm**, và cả hai đều code được

## Bối cảnh

Từ 08/09 repo chạy **hai cặp vai cùng lúc** mà không cặp nào được chốt:

- [ADR-0017](0004-hai-vai-assistant.md) ⑴ chia **Hệ thống / Sản phẩm**.
- `AGENTS.md` mục 6 chạy **Giữ lõi / Phát & thu** — chưa quyết định nào ghi lại lần đổi đó.

Vai ① của hai cặp trùng nhau. Khác biệt nằm trọn ở **vai ②**, và câu hỏi thật là **ai sở hữu mã
của các extension**: cặp 0017 trả lời rõ (*Sản phẩm* viết mã), cặp mục 6 **không trả lời** —
*Phát & thu* giữ biên giới ra ngoài, nó không viết sản phẩm. Đo được hệ quả: ba lane đang giữ
khoá ngày 09/09 (`claude-flow-f28-f33`, `claude-gemini-crlf`, `claude-gpt-chay-het-job`) đều
đang viết mã sản phẩm, và **dưới cặp mục 6 không lane nào mang vai nào**.

## Quyết định

Đức chốt 09/09, nguyên văn bốn ý:

> *"đây là câu hỏi cho riêng extension repo phải ko?"* · *"cả 2 vai đều code được khi cần & khi
> thấy có gì cần thay đổi."* · *"Mã của tất cả extension nằm ở Vai sản phẩm nhiều hơn, trong quá
> trình chạy & debug. + control kiến trúc của bản thân nó."* · *"tính năng phát, thu là thiên về
> repo template hơn, ở repo extension sản phẩm lại là xây dựng code extension & Scouter."*

### ⑴ Cặp **Hệ thống / Sản phẩm** đứng — trong phạm vi repo NÀY

Quyết định này **có phạm vi**, và Đức nêu phạm vi trước khi trả lời. Repo bộ khung
(`Ark_Repo_Harness`) tự chọn cặp của nó; đừng chép ngược sang đó.

### ⑵ Vai KHÔNG phải hàng rào cấm gõ code

**Cả hai vai đều code được** khi thấy cần. Vai nói **ai sở hữu** và **ai ký nghiệm thu**, không
nói ai được gõ. Bất biến chịu tải vẫn nguyên: **người SỬA không tự NGHIỆM THU bản sửa của mình**
(`SELF_ATTESTATION`) — và nó độc lập với vai.

### ⑶ Sản phẩm sở hữu mã extension, XUYÊN SUỐT chạy và debug, kèm kiến trúc của chính nó

Không chỉ lúc viết. *"Trong quá trình chạy & debug"* là phần Đức nói rõ, và nó đóng cửa mô hình
*"Hệ thống bàn giao rồi Sản phẩm chỉ vận hành"*. **Kiến trúc của chính sản phẩm cũng thuộc Sản
phẩm** — nên tài liệu yêu cầu và thiết kế của một gói không phải xin phép Hệ thống.

### ⑷ *Phát & thu* thôi là một VAI ở đây

Nó *"thiên về repo template hơn"*. Ở repo này, việc của vai ② là **xây dựng mã extension và
Scouter**. Phần *mang chỗ vấp bên ngoài về thành mục sổ nợ* vẫn giữ, nhưng nó là **một VIỆC** mà
vai nào cũng làm, **không phải một vai** — cửa `BACKLOG.md` kèm trường `đóng khi:` không đổi.

## Hệ quả

**Được:** hết một cờ ⚠ treo từ 08/09, và ba lane đang chạy có tên vai đúng. Câu *"ai sửa được mã
gói này"* trả lời được mà không phải đọc hai bản chia vai rồi đoán.

**Mất, và biết trước:** ranh giới *"kiến trúc của chính nó"* sẽ có ca xám — một đổi thay trong
gói mà kéo theo cổng kiểm chung. Đức chưa chốt câu chữ cho ca đó, và **đừng suy diễn**: gặp thì
hỏi, đúng bước ④ của `docs/protocols/RULE-COMPILER.md`.

**Vế bị thay:** cặp **Giữ lõi / Phát & thu** ở `AGENTS.md` mục 6 (08/09 → 09/09) — chết. Ghi ở
mục `Vế đã chết` của [ADR-0017](0004-hai-vai-assistant.md).

## Trạng thái

Accepted.
