---
kind: hop-dong-vong-0
topic: luat-audit
theo: drafts/GPT-REASONING-8-ROUND-PROTOCOL-V1.md
chot_boi: Đức (chủ đề + 12 vòng, 2026-09-10) · CC soạn
created: 2026-09-10
---

# Hợp đồng vòng 0 — Rà soát toàn bộ luật của repo

> **GPT CẤM ghi vào thư mục `CC/`.** File này và các biên bản chốt hướng là ràng buộc, không
> phải nguyên liệu. GPT ghi ở `drafts/luat-audit/GPT/` và trên Google Sheet.

## Các trường

**`muc_tieu`**
Liệt kê **mọi luật đang ràng buộc** trong repo này thành một bảng, chấm xem luật nào có cưỡng
chế máy, rồi đề xuất cắt / gộp / viết lại / phân nhóm để Đức duyệt từng dòng.

**`san_pham`**
Một Google Sheet, một dòng một luật, các cột **đúng thứ tự này**:

| cột | nội dung |
|---|---|
| `ID` | `R-001`… — không đổi qua các vòng |
| `Nguồn` | `đường/dẫn.md:dòng` |
| `Luật` | nguyên văn rút gọn, ≤ 25 từ |
| `Nhóm` | do GPT tự đặt, nhưng phải nhất quán |
| `Loại` | BẮT BUỘC / KHUYẾN NGHỊ |
| `Cưỡng chế` | CỨNG / MỀM / RỖNG / CHƯA TÌM THẤY |
| `Bằng chứng` | `đường/dẫn.mjs:dòng` — **mã thực thi**, không phải chú thích |
| `Phạm vi đã tìm` | **bắt buộc khi cột trên là RỖNG hoặc CHƯA TÌM THẤY** |
| `Trùng với` | ID khác nói cùng một điều |
| `Mâu thuẫn với` | ID khác nói ngược |
| `Đề xuất` | GIỮ / GỘP / XOÁ / VIẾT LẠI / ĐỔI NHÓM |
| `Vì sao` | ≤ 20 từ |
| `Đức duyệt` | **để TRỐNG** — cột của Đức |

Mirror gọn trong `drafts/luat-audit/GPT/` mỗi vòng: đã làm gì, còn gì, link Sheet.

**`xong_la_gi`** — đo được, ba điều kiện cùng đúng:
1. Mọi dòng luật trong `moc_nguon` có mặt, hoặc được khai rõ là đã gộp vào ID nào.
2. Mọi ô `Cưỡng chế` = RỖNG / CHƯA TÌM THẤY đều có ô `Phạm vi đã tìm` **không rỗng**.
3. Mọi dòng có `Đề xuất`, và cột `Đức duyệt` trống sạch.

**`moc_nguon`** — commit **`1ea8b429`**. Không phải "mã trên `main`". `main` sẽ đổi trong lúc
chạy; nếu cần mốc mới thì CC ra mốc mới ở lần chốt hướng, không tự đổi giữa vòng.

**Phạm vi — 14 file, 2153 dòng, đo lúc `1ea8b429`:**
```
AGENTS.md · CLAUDE.md
workers/_shared/LUAT-CORE.md · workers/_shared/AGENTS.md
workers/duc-auto-chatgpt/v0.1.0/AGENTS.md · workers/duc-auto-gemini/v0.2.0/AGENTS.md
workers/duc-auto-gg-flow-video/v0.1.0/AGENTS.md · workers/duc-scouter/v0.1.0/AGENTS.md
workers/hnx-fetch/AGENTS.md                            (5 gói — gói này KHÔNG có thư mục v*/)
docs/protocols/*.md                                    (5 file, 1272 dòng)
```

> **Sửa tại Mốc ② (CC, 10/09).** Bản đầu ghi `13 file, 2281 dòng` — sai cả hai: glob
> `workers/*/AGENTS.md` quét trúng `_shared/AGENTS.md` lần hai (cộng dư 128 dòng) và đồng thời
> làm rơi `workers/hnx-fetch/AGENTS.md` (125 dòng). Nay liệt kê **thẳng tên từng file**, không
> để glob tự đếm nữa. `moc_nguon` `1ea8b429` **không đổi**. Xem `drafts/luat-audit/CC/MOC-2.md`.

**`ngoai_pham_vi`**
- `PHIEN.md` — **máy sinh** từ các file trên. Rà bản sinh là đếm hai lần.
- 154 ADR (19 gốc + 135 mức gói) — **chỉ đụng nếu còn dư vòng**, và khi đó chỉ trả lời đúng
  một câu: *ADR nào mâu thuẫn với luật đang hiệu lực*.
- Không sửa file nào trong repo ngoài `drafts/luat-audit/GPT/`. Không đề xuất kiến trúc.

**`chuan_bang_chung`**
- `CỨNG` = có mã **từ chối** khi vi phạm. Dẫn `file:dòng`.
- `MỀM` = có mã nhưng chỉ báo, hoặc chặn được nhưng có cửa thoát mở sẵn.
- Không được viết **"không có hook"**. Chỉ được viết *"không tìm thấy trong phạm vi đã tìm:
  `<liệt kê>`"*.
- **Không suy từ chú thích hay tài liệu.** Chỉ mã thực thi.

**`khong_biet_thi_sao`** — ghi `CHƯA TÌM THẤY` kèm phạm vi. Không đoán.

## Hai ví dụ — CC soạn, Đức xem lướt rồi bảo sai chỗ nào

*(Đức nói chưa cần bận tâm; tôi vẫn điền vì đây là chỗ V0 hỏng — không có mẫu thì "đúng khuôn"
và "dùng được" không phân biệt được.)*

**`mau_dat`** — một dòng đủ dùng:
> `R-014` · `AGENTS.md:71` · *"Mọi commit phải có `Lane:`"* · Nhóm: Git · BẮT BUỘC · **CỨNG** ·
> `scripts/session-check.mjs:412` từ chối khi commit chưa push thiếu nhãn · Phạm vi: — ·
> Trùng: `R-052` (`workers/_shared/AGENTS.md`) · Đề xuất: **GỘP** vào `R-014` · Vì sao: hai
> file nói cùng một điều, một chỗ sẽ lệch.

**`mau_khong_dat`** — trông y hệt, và vô dụng:
> `R-014` · `AGENTS.md` · *"Commit phải có nhãn lane"* · Nhóm: Git · BẮT BUỘC · **RỖNG** ·
> Bằng chứng: — · Phạm vi: — · Đề xuất: GIỮ · Vì sao: cần thiết.

Ba chỗ hỏng, và đều là chỗ pilot 10/09 đã hỏng thật: **thiếu số dòng** nên không kiểm lại được ·
chấm **RỖNG mà không khai đã tìm ở đâu** (đúng lỗi khiến `innerHTML` và `--soat` bị chấm sai) ·
**`Vì sao` không mang thông tin** nên Đức không có gì để duyệt.

## Nhịp — 12 vòng, CC vào 3 lần

- **Vòng 1–6:** dựng Sheet, đổ hết luật, chấm cưỡng chế.
- **Mốc ② (CC):** ở **tín hiệu đầu tiên**, chậm nhất sau vòng 6.
- **Vòng 7–12:** trùng lặp, mâu thuẫn, phân nhóm, đề xuất.
- **Mốc ③ (CC):** nghiệm thu theo `xong_la_gi`.

**12 là TRẦN.** Xong sớm thì dừng sớm — không có trần thì model có động cơ chế thêm việc.
**Số vòng do CC đếm, không do khối nối vòng quyết định.**

Kích hoạt mốc ② sớm nếu: một dòng mẫu trượt `mau_dat` · hai vòng liên tiếp không thêm gì kiểm
được · hết hạn mức đọc mà chưa gỡ xong phụ thuộc · không xác nhận được Sheet đã ghi.

## Ràng buộc cho GPT

- Tối đa **8 lượt đọc `@github`** mỗi vòng. Hết thì viết ngay bằng thứ đã đọc được.
- Ghi thẳng `main` được — **Đức chốt 10/09**: GPT chỉ tổng hợp và suy luận, không sửa mã.
  Kèm `Lane: gpt-web` trong commit message để phân biệt với commit tay của Đức.
- Chỉ ghi trong `drafts/luat-audit/GPT/`. **Không** đụng `CC/`, không đụng file nào khác.
- Repo **CÔNG KHAI**. Không token, không mật khẩu, không đường dẫn máy cá nhân.
