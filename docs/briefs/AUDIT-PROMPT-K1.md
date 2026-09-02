---
kind: brief
status: active
ttl_days: 30
---

# ĐỀ BÀI AUDIT ĐỘC LẬP — K1: tách bộ khung ra khỏi repo

> Dán trọn file này cho một AI khác (Codex / GPT / phiên Claude mới). **Đừng tóm tắt hộ nó.**
> Mục tiêu không phải xác nhận tôi đúng, mà là **tìm chỗ tôi sai**.

## Bối cảnh trong ba câu

Repo này đã được chuẩn hoá qua bảy phiên và đạt bài test nghiệm thu (một AI lạ đọc `llms.txt`
là tự vào việc, không hỏi câu nào). Chủ dự án chốt tách bộ khung đó thành **template độc lập**
để nhân bản sang các repo khác (ADR-0001). K1 là bước tách.

## Cái gì đã đổi

| | |
|---|---|
| Commit đầu | `8b20c88` |
| Commit cuối | `bae0483` |
| File mới | `scripts/repo-structure.mjs` · `scripts/build-template.mjs` · `tests/repo-structure-smoke.mjs` · `tests/template-null-repo.mjs` · `docs/_TEMPLATE-brief.md` · `template/` (18 file) |
| Suite | 225 → 233 |

**Ba việc, theo thứ tự:**

1. **Gỡ hình dạng repo ra khỏi bộ máy.** Trước K1, bốn script đóng cứng `"workers"` (thư mục
   đơn vị), `"manifest.json"` (file đánh dấu), `/^workers\//` (tiền tố quyền), và
   `"extension-observer-v0"` (id dự phòng). Nay đọc từ `.repo-structure.json`.
2. **Gom về một nguồn.** `repo-structure.mjs` giữ phần suy ra; phần đọc để mỗi bên tự làm, vì
   bộ sinh đọc HEAD còn cổng đóng phiên đọc cây làm việc.
3. **Trích `template/` bằng bộ sinh**, không chép tay. `--check` phát hiện lệch.

## Hai điều tôi tuyên bố — hãy tự kiểm, đừng tin

### Tuyên bố 1: tham số hoá KHÔNG làm đổi kết quả

Bộ máy cũ và mới, cùng một HEAD, sinh ra `DASHBOARD.md` + `llms.txt` + `repo-map.json`
**giống hệt từng byte**.

```bash
mkdir -p /tmp/k1 && git show 30fea52:scripts/build-dashboard.mjs > /tmp/k1/old.mjs
# chạy bản cũ và bản mới trên cùng một HEAD, so ba file sinh ra
```

### Tuyên bố 2: repo RỖNG + bộ khung → cổng kiểm 0 đỏ, 0 vàng

```bash
npm run test:template     # dựng repo git trống, thả template vào, chạy cổng
```

## Ưu tiên soi — đây là nơi tôi hay sai nhất

**① Phép kiểm rỗng nghĩa.** Trong chính phiên này tôi đã viết **ba** phép kiểm không phân biệt
được hai nhánh, và tự bắt được cả ba bằng đột biến:

- fixture không có `workers/` nên đột biến "lùi `root_dir: null` về workers" thoát;
- không có ca đường dẫn hai gạch chéo nên `slash <= 0` → `slash < 0` thoát;
- template vốn đã sạch tên dự án nên xoá sạch bộ dò vẫn thoát (thiếu mẫu đối chứng dương).

**Giả định là còn cái thứ tư.** Cách soi: với mỗi `assert` dạng *"không có X"*, hỏi *fixture này
có dựng nổi ca CÓ X không?* Nếu không thì phép kiểm đó là trang trí.

**② Bộ trích có mang nhầm gì không.** Luật: bộ máy và bộ luật thì ĐI; bản đồ địa phương, trạng
thái, **trang máy sinh** và bằng chứng thì Ở LẠI. Chép nhầm nhóm sau là mọi repo cùng hiển thị
trạng thái của repo gốc — hỏng im lặng, bảng vẫn đẹp.

**③ Bộ trích có bỏ sót gì không.** Ngược lại: thứ gì cần mà không đi theo? Phép thử repo rỗng
bắt được ba lỗi loại này (thiếu `STATUS.md` gốc; README sai thứ tự; bản đồ mục 6 để rỗng làm
chính `README.md` rơi ra ngoài điều hướng). **Còn lỗi thứ tư không?**

**④ `lawForTemplate()` cắt theo mốc tiêu đề `## 6.` → `## 7.`.** Đánh số lại các mục trong
`AGENTS.md` là bộ trích cắt sai. Nó có ném lỗi thay vì cắt bừa không? Có đủ không?

**⑤ Fail-closed có thật không.** `unitsFrom` / `claimPrefixesFrom` phải NÉM khi khai sai, không
lặng lẽ lùi về mặc định. Thử tự chế vài cấu hình dị dạng.

**⑥ `areaOf` gom hai bản regex từng lệch nhau.** Ca đường dẫn tiếng Việt có dấu là gốc lỗi thật
ngày 26/08. Còn ca nào hai bản cũ trả lời khác nhau mà tôi gộp sai không?

## Cách báo cáo

Mỗi phát hiện gồm: **file:dòng · điều gì sai · kịch bản hỏng cụ thể · mức độ**.

- **NẶNG** — sai dữ liệu, mất bảo vệ, hoặc template mang thứ không được mang
- **VỪA** — phép kiểm rỗng nghĩa, fail-open, thông báo lỗi dẫn sai đường
- **NHẸ** — chữ nghĩa, đặt tên, chỗ trùng lặp

**Không tin bất kỳ con số nào trong file này.** Tự chạy `npm test`, tự đọc lại diff. Một AI khác
báo "xong" không phải bằng chứng — đó là luật vàng số 4 của repo này, và nó áp cho cả tôi.

## Đã biết trước, không cần báo lại

- `template/` còn nằm trong repo này. Đó là bãi tập kết theo ADR-0001, chưa dời.
- Bộ khung mang nhãn `0.1.0-unproven`: **chưa từng migrate sang một repo khác loại**. Phép thử
  repo rỗng chứng minh nó *đủ*, không chứng minh nó *dùng được ở nơi khác*.
- Repo gốc còn 29 chỗ VÀNG (B6, B9) — nợ cũ, thuộc phiên khác.
- Bốn quy trình (audit · migrate · khởi tạo · nâng cấp) **chưa tồn tại**. Đó là khối K2.
