---
status: Accepted
adr: 0001
decides: [0001, 0002, 0003, 0006]
date: 2026-09-02
last_reviewed: 2026-09-09
deciders: Đức
---

# ADR-0001 — Ranh giới bộ khung: cái gì ở đâu, và ai được sửa

> **File chủ đề.** Mang quyết định **0001** (02/09, bộ khung ra nhà riêng), **0002** (03/09, công
> cụ ở lại repo nhà), **0003** (04/09, Assistant điều phối chứ không code ở đó) và **0006** (05/09,
> gói Assistant phát hành từ bộ khung). Gộp 09/09.

## Bối cảnh

Chuẩn từng nằm trong một repo dự án, phát hành qua `sync_manifest.json` — thứ chưa bao giờ chạy
trọn. Mọi lần giữ hai bản của một chuẩn cho khớp nhau đều lệch **im lặng**: hai lần ngay trong
repo này ở quy mô nhỏ hơn nhiều (hai bản regex quy chủ 26/08; hai hàm quy vùng 02/09), và **cả
hai lần không ai biết**.

## Quyết định

### ⑴ Bộ khung ở repo riêng; repo này là NGƯỜI DÙNG

`https://github.com/anhducds-GIT/Ark_Repo_Harness`. Nó không thuộc dự án nào. **Project 3AI kết
thúc vai trò** — không cần sửa `sync_manifest.json`, không cần hoàn tất K-MIGRATE.

Bộ khung phải mang đủ tám thứ: harness · rules · structure · folder · dashboard · protocol audit ·
protocol migrate · khởi tạo repo mới.

### ⑵ Tám thứ đó là yêu cầu với HỆ THỐNG, không phải với từng bản sao

Một câu hỏi quyết định chỗ đứng: *repo đích có cần thứ này để tự sống không?*

| Ở LẠI REPO NHÀ | ĐI THEO BẢN TRÍCH |
|---|---|
| `assess.mjs` — đo một repo khác | năm công cụ vận hành (sinh bảng · hai cổng · đẩy an toàn · đọc cấu hình) |
| `init-repo.mjs` — dựng repo mới | luật ba tầng + bản mẫu |
| `build-template.mjs` — nguồn của chuẩn | suite hạt giống |
| hai sổ tay: kiểm một repo, chuyển repo lên chuẩn | cấu hình hình dạng repo |

Gọn trong một câu: **repo đích cần SỐNG THEO chuẩn, không cần PHÁT HÀNH chuẩn.** Nên đo và
migrate luôn chạy **từ repo nhà, trỏ sang repo đích**. Cố ý không có lệnh nào chạy bên trong repo
đích.

### ⑶ Assistant điều phối bộ khung, và không bao giờ tự sửa code ở đó

Đức: *"có thể không trực tiếp làm, nhưng sẽ điều phối để các AI agent khác làm."* Ở bộ khung,
Assistant làm đúng việc nó làm ở đây: cầm toàn cảnh nợ · quyết thứ tự · viết brief · giao
executor · kiểm chứng độc lập · giữ trạng thái khớp nguồn có thẩm quyền. Cả năm địa hạt của bộ
khung (lõi code · luật · hook · lịch sử audit · lịch sử migrate) đều trong tầm, không cái nào là
"ngoài phạm vi".

**Assistant tuyệt đối không nhận khoá ở bộ khung để tự sửa.** Nhận khoá ở đó chỉ để làm việc văn
bản của vai điều phối — brief, ADR, log — y như ở repo này.

### ⑷ Gói Assistant phát hành từ bộ khung; repo này tiêu thụ

Mọi cải tiến `what-next.mjs`, `state-check.mjs`, `ORCHESTRATOR.md` và suite ghim của chúng làm ở
**bộ khung trước**, phát hành ở đó, rồi mới về đây. Không bao giờ làm ngược.

## Hệ quả

**Được:** chỉ một nơi giữ chuẩn, nên hai nơi không thể nói khác nhau. S9 hết bị chặn, và làn B
(K-MIGRATE · K2 · K3 · K5 — đều dựng trên giả định Kho còn sống) rời hẳn lộ trình.

**Mất, nói thẳng:**

- **Bỏ một cơ chế phát hành đã hoàn chỉnh.** `sync_manifest.json` hỏng nhưng đầy đủ. Bản thay —
  kéo về kèm `harness_version` ghim ở mỗi repo — rẻ hơn nhưng **chưa có dòng code nào**.
- **Repo nhà thành điểm chết một mối.** Chấp nhận: nó là repo git (`git clone` là dự phòng), và
  N nguồn chuẩn là cái hỏng lớn hơn.
- **Cải tiến gói chậm hơn ở đây:** một lượt sửa thành ba bước.
- **Bàn giao là chỗ hỏng thật, không phải chi phí trên giấy:** ngày 04/09 có **sáu** phiên
  executor chết giữa chừng. Phiên duy nhất không mất gì là phiên được bảo *"commit từng bước"* —
  nên chỗ hỏng này có cách sống chung.

**Cám dỗ phải chống, ghi ra vì nó sẽ đến:** lúc gấp, đường nhanh nhất luôn là sửa thẳng ở repo
này rồi *"đồng bộ ngược sau"*. Lần nào cũng có lý do chính đáng, và **lần đồng bộ ngược đó sẽ
không bao giờ xảy ra** — đó là cách mọi bản fork bắt đầu. Gặp thì hỏi Đức.

**Chỗ chưa xong, biết trước để đừng tưởng đã có:**

- **Hai trong tám thứ CHƯA TỒN TẠI:** protocol audit (chỉ có một prompt cho một phiên) và
  protocol migrate / khởi tạo mới (không tài liệu, không script).
- **Không có đường nâng cấp ngược về repo này.** Bộ khung nâng cấp được repo dựng từ nó; repo này
  có trước. Mang thay đổi về là việc tay, chưa ai đo tốn bao nhiêu.
- **Hai bản gói đang lệch nhau CÓ CHỦ Ý** — bản ở bộ khung đã bóc định danh riêng và vá bẫy xuống
  dòng, bản ở đây chưa. Có gộp hay không thì **chưa ai quyết**.
- **Phải thu hoạch Project 3AI trước khi archive**, và đó là việc của GPT — Claude Code không đọc
  được repo khác.
- **Vế ⑶ chưa có phép kiểm máy.** `AGENTS.md` mục 8 nói luật nào máy không kiểm được thì sớm muộn
  bị bỏ qua. Viết nó cần sửa `tests/role-firewall-smoke.mjs`, tức cần khoá `_code` — một lượt khác.

## Trạng thái

Accepted.
