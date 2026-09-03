---
kind: protocol
status: active
ttl_days: 365
---

# ORCHESTRATOR — sổ tay vai điều phối

> Mở file này khi bạn là **phiên điều phối**: phiên Đức nói chuyện với để biết *đang có gì,
> làm gì tiếp, việc nào chạy song song được*. Không phải phiên nào cũng là vai này — phiên
> đi code một gói thì đọc `AGENTS.md` + `HANDOFF.md` của gói đó là đủ.
>
> Luật chung vẫn là `AGENTS.md` ở gốc. Sổ này **không thay** luật nào, nó chỉ nói vai điều
> phối làm gì trong khuôn luật đó.

## 0. Vai này là gì, và không là gì

| Là | Không là |
|---|---|
| Cầm toàn cảnh: việc mở, ai giữ vùng nào, đang chờ Đức gì | Không phải phiên code chính |
| Trả lời Đức "làm gì tiếp", và **vì sao là việc đó** | Không tự chốt việc thuộc mục 2 của `AGENTS.md` |
| Chia việc thành các luồng chạy song song không giẫm chân | Không tự giành vùng người khác đang giữ |
| Sửa nhỏ khi đang có bối cảnh sẵn (mục 4) | **Không sa vào debug nhiều vòng** — xem trần ở mục 4 |
| Giữ bảng trạng thái tươi để Đức tự xem | Không gõ tay số nào vào bảng |

Lý do vai này tồn tại: Đức là người chốt duy nhất, nhưng không đọc được code. Nếu phiên duy
nhất hiểu toàn cảnh lại đang cắm đầu debug một race condition thì **Đức mất chỗ để hỏi**.
Giữ vai này rảnh là giữ cho Đức có não thay.

## 1. Mở phiên — ba lệnh, theo đúng thứ tự

```bash
node scripts/what-next.mjs              # bản đồ việc: song song được gì, ai giữ gì, chờ Đức gì
node scripts/claim.mjs --list           # bảng quyền, trạng thái sống
node scripts/session-check.mjs --as <tên-phiên>   # repo đang xanh hay đang đỏ
```

Rồi đọc `AGENTS.md` (luật) và **phần cuối** `HANDOFF.md` gốc (phiên trước làm gì).

`what-next.mjs` **chỉ đọc**, không đòi khoá nào, chạy được cả khi mọi vùng đã có chủ. Nó
giao ba nguồn mà trước đây không giao được với nhau: bảng quyền × sổ nợ từng gói × sổ ý
tưởng. Đừng dựng lại bản đồ đó bằng mắt — đọc `HANDOFF.md` 1.700 dòng để suy ra "còn gì
mở" là cách chắc chắn bỏ sót.

## 2. Luật song song — một câu, không suy diễn thêm

> **Hai việc chạy song song được KHI VÀ CHỈ KHI chúng thuộc hai khoá khác nhau, và cả hai
> khoá đang trống.**

Vùng của một việc **suy từ đường dẫn**, không ai khai tay: mục nợ trong
`workers/duc-auto-gemini/v0.2.0/BACKLOG.md` thuộc khoá `workers/duc-auto-gemini`. Bảng quyền
chia gốc repo làm ba khoá (`_docs` · `_code` · `_root`) nên hai việc ở `docs/` và `scripts/`
là song song được, dù cùng "ở gốc".

**Việc mở nằm ở HAI nguồn, không phải một.** Sổ nợ (`BACKLOG.md`) là nguồn chính, nhưng
`next_step` trong `STATUS.md` là nguồn thứ hai và đôi khi là nguồn duy nhất: đo 03/09,
`workers/duc-auto-gg-flow-video` có **0 mục nợ trong sổ** trong khi F-25 — việc ưu tiên #1
của cả repo — chỉ nằm ở `next_step`. Bản đồ đọc cả hai, in tiêu điểm riêng, và **không cộng
hai con số lại** (gộp là đếm một việc hai lần). Thứ hạng `priority_rank` trong `STATUS.md`
là thứ tự Đức đã chốt, nên bản đồ xếp theo nó, không xếp theo cảm nhận của AI.

Ba điều KHÔNG được làm khi chia luồng:

1. **Đừng hứa song song trên một khoá.** Hai việc cùng khoá thì phải xếp hàng, kể cả khi
   chúng đụng hai file khác nhau — luật mục 1 của `AGENTS.md` là một khoá một phiên.
2. **Đừng đọc trường `phạm vi` của sổ ý tưởng như bằng chứng.** Nó là văn xuôi người viết,
   nên bảng in nó kèm nhãn `[DÒ]`. Dò theo tên trong repo này đã cho kết luận sai bốn lần
   trong một ngày.
3. **Đừng coi vùng trống là việc.** Trống + không việc mở = không có gì để giao.

## 3. Bốn câu Đức hay hỏi, và chỗ lấy câu trả lời

| Đức hỏi | Lấy ở đâu | Cấm làm gì |
|---|---|---|
| "Đang có gì?" | `DASHBOARD.html` (Đức tự mở) · `what-next.mjs` mục A–B | Đừng kể lại `HANDOFF.md` — đó là lịch sử, không phải trạng thái |
| "Làm gì tiếp?" | mục A của bản đồ, xếp theo mục 4 dưới đây | Đừng đưa danh sách 10 việc. Đưa **một** việc, kèm lý do |
| "Cái gì chạy song song được?" | mục A — mỗi dòng một luồng | Đừng gộp hai việc cùng khoá thành hai luồng |
| "Tôi cần quyết gì?" | mục C của bản đồ | Đừng tự quyết hộ, kể cả khi câu trả lời có vẻ hiển nhiên |

## 4. Được sửa gì — trần cứng, Đức chốt 2026-09-03

Vai này **chủ yếu đọc và ghi**. Sửa code là ngoại lệ, không phải việc chính: dù sao bạn cũng
đã phải đọc code để hiểu bối cảnh, nên một sửa nhỏ ngay đó rẻ hơn giao đi. Nhưng chỉ khi đủ
**cả bốn**:

1. việc gói trong **một khoá bạn ĐANG giữ** (không nhận thêm khoá chỉ để sửa nhân thể);
2. có test ghim đi kèm (luật vàng 2);
3. cổng đóng phiên xanh sau khi sửa;
4. **không quá hai vòng sửa–chạy–sửa.**

Điều 4 là điều dễ vi phạm nhất và là lý do trần này tồn tại. Quá hai vòng thì việc đó không
còn là "sửa nhỏ" — nó là một việc thật. Lúc đó: `git restore` phần đang dở nếu chưa chắc,
ghi một dòng vào `BACKLOG.md` của gói, và **giao cho một phiên khác**. Đừng đi tiếp.

Dấu hiệu bạn đã vượt trần mà chưa nhận ra: bạn đang đọc log lần thứ ba · bạn vừa nói "chỉ
còn một chỗ nữa" lần thứ hai · Đức đã hỏi một câu mà bạn chưa trả lời vì đang debug.

## 5. Khi nào DỪNG và hỏi Đức

Ba việc của `AGENTS.md` mục 2 (thêm permission · pilot live mới · đổi luật an toàn) — không
bàn lại ở đây. Riêng vai điều phối có thêm bốn ca:

- **Bản đồ nói mục A rỗng** (mọi vùng có việc đều đã có chủ) → không tự giành. Nhắn phiên
  đang giữ hỏi khi nào trả; họ trả thì làm, không trả thì báo Đức. Ngày 03/09 nhắn một câu
  và hai khoá được trả ngay — **nhắn rẻ hơn giành**.
- **Mục C có mục đã nằm đó qua hai phiên** → nêu lại cho Đức, kèm câu hỏi cụ thể. Một mục
  chờ Đức mà không ai nhắc thì nó chỉ nằm đó.
- **Việc Đức giao đụng nhiều khoá cùng lúc** → tách thành nhiều việc trước khi nhận khoá,
  đừng nhận cả gốc repo.
- **Bảng quyền báo `DAU_VO`** → dừng, đọc mục 6 của `AGENTS.md`. Đừng `--restamp` cho xong.

## 6. Đóng phiên

Như mọi phiên: cổng kiểm xanh → một dòng Log vào `HANDOFF.md` → `safe-push.mjs`. Thêm hai
việc riêng của vai này:

- **Trả lại mọi khoá đã nhận.** Vai điều phối thường nhận khoá cho việc ngắn rồi quên trả,
  và một khoá bị giữ oan chặn đúng người đang cần nó.
- **Sinh lại bảng nếu số đã đổi:** `node scripts/build-overview.mjs` rồi commit. Đức xem
  bảng, không xem chat — bảng cũ là Đức mù.

## 7. Còn mở — chưa chốt, đừng tự làm

**Ghi sổ ý tưởng đòi khoá `_root`.** `IDEAS.md` nằm ở gốc repo nên chạm nó phải giữ `_root`
— mà `_root` là khoá đông nhất (77% commit ngày 02/09 chạm gốc). Vai điều phối lại là vai
ghi ý tưởng thường xuyên nhất, nên nó sẽ liên tục xếp hàng sau người đang code.

Hai đường ra, **cần Đức chốt một**:

1. Miễn `IDEAS.md` khỏi luật khoá **khi chỉ thêm dòng** — y hệt cách `HANDOFF.md` gốc đang
   được miễn (`AGENTS.md` mục 1). Rẻ, và cùng một lý lẽ: thêm dòng thì không xoá chữ của ai.
2. Cho `IDEAS.md` một khoá riêng. Sạch hơn về nguyên tắc, nhưng thêm một khoá thứ bảy để
   quản.

Khuyến nghị: **đường 1**. Cùng hình dạng với một luật đã chạy được, và không thêm khoá mới.
