---
kind: brief
status: active
ttl_days: 60
---

# BRIEF `CAT-HANDOFF-GOC-01` — Cắt đuôi `HANDOFF.md` gốc, và đo xem cắt tay có giữ được không

Cơ chế và bốn bất biến đã chốt ở [ADR-0008](../adr/0008-cat-duoi-handoff-giu-hai-muoi-luot.md).
**Đọc ADR trước.** Đó là câu duyệt của Đức cho việc dời chữ cũ của phiên khác — việc này không
có câu duyệt nào khác.

## 1. Vì sao lại là file này

Đo ngày 06/09 (tự chạy lại được bằng `wc -c` và `grep -c "^## "`):

| File | Kích thước | Mục |
|---|---|---|
| **`HANDOFF.md` gốc** | **290 KB** | **66** |
| `BACKLOG.md` gốc | 42 KB | — |
| `docs/protocols/ORCHESTRATOR.md` | 37 KB | — |
| `AGENTS.md` | 27 KB | — |

Nó **to gấp gần 7 lần file kế tiếp**. Mọi thứ khác trên đường nạp cộng lại còn chưa bằng nửa nó.
Ba `HANDOFF.md` của worker đã cắt sáng 06/09 rồi; đây là file cuối cùng chưa cắt.

## 2. Việc

**Giữ 20 mục cuối tại chỗ. 46 mục cũ hơn dời sang file lưu trữ cạnh nó. Để lại con trỏ.**

Bốn bất biến của `ADR-0008` là **điều kiện để việc này được phép làm**, không phải lời khuyên:

1. **Không mất một byte.** Nối file lưu trữ với phần còn lại phải dựng lại được bản gốc **giống
   hệt từng byte**. Chứng minh bằng băm, và đưa con số vào báo cáo. Đây là bất biến duy nhất
   khiến việc này khác với xoá.
2. **Cắt theo VỊ TRÍ trong file, không theo NGÀY.** Log không xếp theo thứ tự thời gian — đo
   được ở gói ChatGPT ngày 06/09. "20 lượt gần nhất theo ngày" là câu **không xác định được**.
3. **Con trỏ ở lại, đặt chỗ đọc được.**
4. **File lưu trữ khai vào Bản đồ file** (`AGENTS.md` mục 4). Không khai = không tồn tại.

**Kiểm hình dạng file trước khi cắt.** `ADR-0008` đo được bốn `HANDOFF.md` có **hai hình dạng
khác nhau**, và một phép cắt chỉ biết một hình dạng sẽ **chạy qua, báo thành công, và không cắt
được gì** — đúng loại xanh giả repo này đã gặp nhiều lần. File gốc hôm nay có 66 mục `##`, nhưng
**tự kiểm lại**, đừng tin con số trong brief này.

## 3. Việc thứ hai, và nó mới là việc quyết định lâu dài

`ADR-0008` để ngỏ: *"Chưa quyết: có tự động hoá việc cắt định kỳ không. Nếu đà tăng giữ nguyên
thì sáu tuần nữa sẽ phải cắt lại."*

**Số đo ngày 06/09 nói ước tính đó sai một bậc:** ba `HANDOFF.md` worker cắt xong sáng 06/09 còn
**100 KB**; đến chiều cùng ngày đã **124 KB**. **+24 KB trong một ngày.**

Đơn vị là **ngày**, không phải tuần. Nghĩa là **cắt tay một lần không giữ được** — sáu tuần nữa
quay lại chỗ cũ là kịch bản lạc quan.

Việc của bạn ở mục này: **đo lại con số đó cho chắc** (tự chạy, đừng chép), rồi **đề xuất** cách
giữ — cổng cảnh báo khi vượt ngưỡng? cắt tự động? một phép kiểm trong cổng đóng phiên? — và
**báo lại, đừng tự chốt**. Tự động hoá một thao tác viết lại chữ của phiên khác là việc cần Đức
duyệt riêng.

## 4. Luật chống chính việc dọn dẹp

**Cắt để tiết kiệm token mà làm mất một luật là LỖ, không phải lãi.**
(`docs/briefs/BRIEF-TOKEN-PROTOCOL-01.md` mục 3.)

Mọi đề xuất cắt phải trả lời được một câu: **cắt xong thì thứ đó còn đến tay người cần đọc
không?** `HANDOFF.md` không chứa luật, nó chứa lịch sử — nên câu trả lời ở đây là "có, qua con
trỏ". Nhưng đừng mang lý lẽ này sang file khác mà không hỏi lại câu đó.

## 5. Nghiệm thu

1. Dựng lại được bản gốc **giống hệt từng byte** — có băm chứng minh.
2. Số mục trước và sau khớp: 20 ở lại + N dời = tổng cũ. **Đếm, đừng ước.**
3. Con trỏ đọc được, file lưu trữ đã khai vào Bản đồ file.
4. **Đếm số chỗ mỏ neo của bạn khớp. Ra 0 thì DỪNG** — công cụ đo hỏng, không phải "không có gì
   phải cắt". Ngày 06/09 chuyện này xảy ra với **ba lane khác nhau** trong repo này.
5. Cổng đóng phiên XANH TOÀN BỘ.

## 6. Khoá và đóng phiên

```
node scripts/claim.mjs --take _root --as <tên-phiên> --task "CAT-HANDOFF-GOC-01"
```

Dời dòng cũ **không** nằm trong miễn trừ "chỉ thêm dòng ở cuối", nên phải giữ `_root` suốt lượt.

Commit có dòng cuối `Lane: <tên-phiên>` · `git commit -o <đường-dẫn>` · cổng XANH TOÀN BỘ · sinh
lại artifact rồi commit trước khi đẩy · đẩy bằng `safe-push.mjs` · **trả khoá SAU khi đẩy**.

**Đừng chạy bộ sinh khi `_code` đang có chủ khác đang sửa dở bộ sinh** — sinh ra bảng từ mã nửa
vời. Việc này đã xảy ra thật ngày 06/09, hai lần.

## 7. Cấm

- Cấm xoá bất cứ dòng nào — đây là **dời**, không phải xoá.
- Cấm cắt theo ngày.
- Cấm tự chốt việc tự động hoá ở mục 3.
- Cấm mang lý lẽ "cắt được" sang `AGENTS.md`, `ORCHESTRATOR.md` hay `MULTIFLOW.md` — ba file đó
  chứa **luật**, và mục 4 áp thẳng vào chúng.
