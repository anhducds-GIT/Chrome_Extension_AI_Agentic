---
kind: protocol
status: active
ttl_days: 180
---

# QUY TRÌNH — đưa một repo đang sống lên chuẩn

> **Dùng khi nào:** đã chạy [KIEM-MOT-REPO.md](KIEM-MOT-REPO.md) và quyết định làm.
> **Khác với khởi tạo mới:** repo này **đã có việc, đã có lịch sử, đã có người dùng**. Nên luật
> nền của cả quy trình là: *thêm vào, đừng thay thế; và không bao giờ bật chặn khi đang đỏ.*

## Trạng thái của chính quy trình này

**Chưa từng chạy trên một repo thật khác nghề.** Nó viết từ một lần dựng repo mới và từ bảy
phiên chuẩn hoá chính repo này. Vài bước dưới đây **sẽ sai**, và lần chạy thật đầu tiên là để
tìm ra chúng — không phải để nghiệm thu.

Ai chạy lần đầu: ghi lại chỗ vấp **ngay tại đây**, đừng ghi vào nhật ký phiên. Một quy trình
không được sửa sau lần dùng đầu là một quy trình sẽ bị bỏ.

## Sáu bước, theo đúng thứ tự

### 1. Đo trước, và ghi lại con số

```bash
node scripts/assess.mjs <đường-dẫn-repo>
```

Chưa đo mà đã thả file vào là mất mốc so sánh — sau này không ai chứng minh được việc này có
đổi gì không.

### 2. Nhận quyền, hoặc dựng bảng quyền nếu chưa có

Repo đích chưa có `.agents/claims.json` thì thả bản hạt giống vào **trước tiên**. Bắt đầu sửa
khi chưa có bảng quyền là mở đường cho đúng lỗi mà cả cơ chế này sinh ra để chặn.

### 3. Thả nhóm MÁY — chép, không nghĩ

Năm công cụ cộng suite hạt giống. Không sửa gì trong lúc chép: sửa lúc này là tạo ngay một
nhánh thứ hai của bộ máy, và hai bản thì trôi khỏi nhau.

### 4. Khai hình dạng repo — đây là bước duy nhất phải NGHĨ

Trong `.repo-structure.json`:

- `repo.name` · `units.ten` — tên repo và **gọi một đơn vị công việc là gì** (Extension · Gói ·
  Dịch vụ · Tài liệu). Bỏ qua `units.ten` thì bảng gọi mọi thứ là "Đơn vị" — đúng nhưng vô hồn.
- `units` — đơn vị nằm ở đâu, sâu mấy tầng, file nào đánh dấu. Repo không có đơn vị con thì
  `root_dir: null`.
- `areas` — mỗi thư mục tầng ngoài cùng một dòng. **Chia ít thôi lúc đầu.** Chia nhỏ khi chưa
  biết ai làm gì là tự tạo tranh chấp; gộp lại sau dễ hơn tách ra.
- `bootstrap.blocking` — **để RỖNG.** Bật chặn khi repo đang đỏ là tự khoá repo ngay ở phiên
  đầu tiên. Chạy vài phiên cho sạch rồi mới bật dần.

### 5. Khai `scripts.test`, kể cả khi chưa có test của riêng repo

Suite hạt giống đi kèm bộ khung đã chạy được ngay. Không khai thì cổng đóng phiên **báo xanh mà
không chạy một dòng nào** — và nó sẽ im như thế mãi mãi.

### 6. Sinh trang, rồi mới chạy cổng

```bash
node scripts/build-dashboard.mjs   # SAU khi đã commit nguồn
node scripts/check-bootstrap.mjs
node scripts/session-check.mjs --as <nhãn-phiên>
```

**Thứ tự này không đổi được:** bộ sinh đọc hoàn toàn từ HEAD, nên sinh trước khi commit là dựng
lại từ một HEAD chưa có gì. Lỗi này đã xảy ra thật, và nó im lặng — trang vẫn sinh ra, chỉ là
nói về một quá khứ khác.

## Bốn cạm bẫy, cả bốn đều đã xảy ra thật

| Bẫy | Hậu quả |
|---|---|
| Bật `bootstrap.blocking` ngay từ đầu | Repo bị khoá ở phiên đầu tiên, không ai vào được |
| Chia `areas` quá nhỏ khi chưa biết ai làm gì | Tự tạo tranh chấp quyền cho một việc không hề chồng nhau |
| Sinh trang trước khi commit nguồn | Trang dựng từ HEAD cũ — **hỏng im lặng**, trang vẫn đẹp |
| Sửa bộ máy trong lúc chép sang | Hai nhánh của cùng một công cụ, và chúng sẽ trôi khỏi nhau |

## Nghiệm thu — bằng máy, không bằng lời

```bash
node scripts/assess.mjs <đường-dẫn-repo>     # mức 3 · chi phí 0/0/0
node scripts/session-check.mjs --as <nhãn>   # XANH TOÀN BỘ
```

Không đạt cả hai thì chưa xong. **Đừng nới cổng cho nó xanh** — sửa bug thì được, gỡ bảo vệ thì
không. Đó là luật vàng số 3, và nó áp cho cả người đang migrate.

## Việc KHÔNG thuộc quy trình này

- **Dọn nợ cũ của repo đích.** Đưa lên chuẩn là thêm một lớp, không phải viết lại repo. Thấy nợ
  thì ghi vào sổ việc-mở của repo đó rồi đi tiếp.
- **Đổi luật của repo đích cho giống repo nhà.** Mỗi repo có nghề riêng; phụ lục nghề sinh ra
  đúng để chỗ đó khác nhau mà vẫn chung một bộ luật gốc.
