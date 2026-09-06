---
kind: brief
status: active
ttl_days: 90
---

# BRIEF `K2-KHOA-RANH-01` — Khoá bị giữ mà không làm gì: hiện nó ra, và đừng nhận khoá quá sớm

Đức nêu ngày 06/09, sau khi một phiên khác phải đứng chờ:

> *"Việc giữ khoá lâu này tôi muốn highlight và fix, đây là issue nếu ta muốn chạy song song
> nhiều tác vụ. Cùng lúc bạn chạy ngầm nhiều quá, mà toàn giữ khoá không làm gì."*

## 1. Ba nguyên nhân khác nhau — nhập làm một là sửa sai chỗ

**① Nhận khoá quá SỚM.** Mọi bản giao việc ngày 06/09 mở đầu bằng *"Nhận khoá trước"*. Nhưng
lane dành **5–20 phút đầu để ĐỌC** — hiến pháp, brief, sổ nợ, code. **Đọc không cần khoá.** Nên
khoá nằm rảnh **do cấu trúc bản giao việc**, không phải do lane lười.

Ca đo được: lane `claude-codex-ngan` giữ **ba** khoá worker **14 phút** với **0 commit và 0 file
bị sửa** trong cả ba vùng. Nó đang đọc, đúng như được bảo.

**② Giữ khoá khi bị chặn đẩy — cái này ĐÚNG, đừng sửa.** Luật *trả khoá sau khi đẩy* tồn tại vì
trả sớm để lại commit vô chủ. Sáng 06/09 bốn lane cùng giữ khoá gần một tiếng vì đúng lý do đó.
Bệnh thật là cái chặn chúng đẩy — mục `Y-16`, cổng xuất bản khoá chéo. **Sửa chỗ này là sửa sai
chỗ.**

**③ Phiên điều phối mở quá nhiều lane cùng lúc**, trong đó vài lane vừa mở đã xếp hàng chờ khoá
của lane khác — không làm gì được, nhưng trên bảng trông y hệt "đang chạy".

**Brief này chỉ chữa ① và ③.** Đừng đụng ②.

## 2. Việc — hiện ra, không chặn

`K2` hiện kiểm **quy thuộc**: commit này của ai, vùng này ai đứng tên. Nó **không** biết một khoá
đang bị giữ mà chẳng ai làm gì, vì nó chỉ nhìn commit, không nhìn thời gian giữ.

Thêm một tín hiệu, và nó rẻ vì cả hai vế đều có sẵn:

> **Khoá đang giữ mà VÙNG CHƯA BỊ CHẠM** — không commit nào chạm vùng đó kể từ lúc nhận khoá,
> **và** không file nào trong vùng bị sửa trên đĩa.

Hiện ở **ba chỗ**, vì ba người đọc khác nhau:

| Chỗ | Ai đọc | Phải nói gì |
|---|---|---|
| `claim.mjs --list` | mọi AI | thêm một cột: đã chạm vùng chưa |
| Khối "Đang làm gì" trên bảng | **Đức** | *"giữ 14 phút · CHƯA CHẠM VÙNG"* thay vì chỉ *"giữ 14 phút"* |
| Cổng đóng phiên | lane đang chạy | **VÀNG**, kèm câu nhắc trả khoá nếu chưa cần |

**VÀNG, không ĐỎ. Đây là ràng buộc, không phải gợi ý.** Có ca hợp lệ: một lane đọc kỹ 30 phút
trước khi sửa một dòng là lane **tốt**. Chặn nó là dạy mọi lane **ghi bừa một byte để giữ khoá
cho hợp lệ** — và lúc đó phép kiểm biến thành thứ ngược lại chính nó.

**Cấm tự nhả khoá bằng máy.** Một lane sắp ghi mà bị rút khoá thì mất việc. Máy **hiện ra**,
người điều phối **quyết** — cách đó đã chạy thật ngày 06/09: đo thấy 0 commit 0 sửa đổi, nhả một
khoá, phiên đang chờ đi tiếp được ngay.

## 3. Việc thứ hai — sửa luật nhận khoá

`AGENTS.md` mục 1 và `docs/protocols/MULTIFLOW.md` nay phải nói rõ:

- **Nhận khoá ngay TRƯỚC lượt ghi đầu tiên**, không phải lúc mở phiên. Đọc và đo thì không cần
  khoá.
- **Một lane, một khoá worker.** Việc văn bản trải ba nhánh thì làm ba lượt. Ngày 06/09 một lane
  ôm ba khoá worker cho một việc sửa văn bản và chặn một phiên khác — **lỗi ở bản giao việc, do
  phiên điều phối viết**.
- Cần khoá thứ hai giữa lượt thì **nhận thêm lúc cần**, đừng gom sẵn từ đầu.

Chữ này phải ngắn. `AGENTS.md` đang là 27 KB và mục 6 chiếm hơn nửa — thêm một đoạn dài vào đó
là đổi một bệnh lấy một bệnh khác.

## 4. Đây là cơ chế đa phiên → ĐỘT BIẾN KIỂM BẮT BUỘC

`docs/protocols/MULTIFLOW.md` mục 5. Ít nhất:

- Khoá vừa nhận, vùng chưa chạm → **báo vàng**.
- Vùng có file bị sửa trên đĩa → **không** báo.
- Vùng có commit sau lúc nhận khoá → **không** báo.
- Gỡ phép kiểm → phép ghim **ĐỎ**.
- Đổi vàng thành đỏ → phép ghim **ĐỎ** (mức nghiêm trọng là phần của hợp đồng, không phải chi tiết).

**Đếm số chỗ mỏ neo của bạn khớp. Ra 0 thì DỪNG** — công cụ đo hỏng, không phải "không có gì
phải sửa". Ngày 06/09 chuyện này xảy ra với **sáu lane khác nhau** trong repo này.

## 5. Nghiệm thu

1. Dựng ca thật: nhận một khoá, không sửa gì → cả ba chỗ ở mục 2 đều nói "chưa chạm vùng".
2. Sửa một file trong vùng đó → cả ba chỗ thôi báo.
3. Bảng **suy hoàn toàn từ HEAD** cho phần commit, đọc đĩa cho phần sửa đổi — **cấm phụ thuộc
   đồng hồ hệ thống**. Hai lượt sinh trên cùng HEAD ra giống hệt từng byte.
4. Cổng đóng phiên XANH TOÀN BỘ (vàng không chặn).
5. Chữ Đức đọc: **tiếng Việt có dấu** (`B15`).

## 6. Khoá và đóng phiên

`_code` (`claim.mjs`, `session-check.mjs`, `build-overview.mjs`, phép ghim) và `_docs`
(`MULTIFLOW.md`) và `_root` (`AGENTS.md`).

**Nhận từng khoá lúc cần, đừng gom cả ba từ đầu** — brief này nói về đúng chuyện đó, nên làm
ngược lại là tự bác chính mình.

Commit có dòng cuối `Lane: <tên-phiên>` · `git commit -o <đường-dẫn>` · cổng XANH TOÀN BỘ · sinh
lại artifact rồi commit trước khi đẩy · đẩy bằng `safe-push.mjs` · **trả khoá SAU khi đẩy**.

## 7. Cấm

- Cấm để phép kiểm này ĐỎ.
- Cấm máy tự nhả khoá của lane khác.
- Cấm đụng luật "trả khoá sau khi đẩy" (nguyên nhân ②).
- Cấm viết một đoạn dài vào `AGENTS.md`.
