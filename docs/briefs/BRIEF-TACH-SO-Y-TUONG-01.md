---
kind: brief
status: active
ttl_days: 60
---

# BRIEF `TACH-SO-Y-TUONG-01` — Tách sổ ý tưởng của Đức khỏi nợ hạ tầng do AI tìm ra

Đức nêu ngày 06/09: `IDEAS.md` có 19 mục, phần lớn là AI tự ghi, **lấn át ý tưởng của Đức**.
Và Đức nêu tiếp một điều đúng hơn nữa: nhóm AI ghi vào **mở rất nhiều mà chưa đóng** — nên nó
là **nợ kỹ thuật**, và cơ chế sinh / xử lý / đóng của nó cần được rà lại, *"nếu không sẽ bị
phình và chồng chất công việc, chạy mãi không hết."*

## 1. Số đo — chạy ngày 06/09, tự chạy lại được

| | |
|---|---|
| Tổng mục | **19** |
| Do **Đức** nêu | **5** |
| Do **AI** tìm ra khi làm việc | **14** |
| Lần một mục **rời sổ** | **1** trên 20 lần thêm |
| Lần điền `nhà:` — cửa ra chính thức mà luật quy định | **0** |

19 mục trong 4 ngày, khoảng **5 mục/ngày**. Cửa vào dùng 20 lần, cửa ra dùng 1 lần, và **cơ chế
rời sổ mà luật quy định thì chưa ai dùng lần nào**.

Lệnh để đo lại:

```bash
grep -c "^## Y-" IDEAS.md
git log -p --no-color -- IDEAS.md | grep -c "^+## Y-"
git log -p --no-color -- IDEAS.md | grep -c "^-## Y-"
git log -p --no-color -- IDEAS.md | grep -c '^+.*\*\*nhà:\*\*'
```

## 2. Nguyên nhân — cấu trúc, không phải thói quen

**Repo không có `BACKLOG.md` ở gốc.** Ba gói worker đều có sổ nợ riêng; phát hiện về **hạ tầng
repo** (cổng kiểm, bộ sinh, bảng quyền, script) **không có sổ nào để nằm**.

Và `IDEAS.md` là quyển **duy nhất ở gốc mà AI ghi được không cần xin khoá** — nó nằm trong
`append_only_exempt` của `.repo-structure.json`.

Nên nó thành chỗ đổ. Không phải AI chọn sai: **đó là chỗ duy nhất đi được.**

## 3. Đức đã chốt: hai quyển riêng

`IDEAS.md` chỉ còn **ý tưởng của Đức**. Nợ hạ tầng do AI tìm ra sang một sổ nợ ở gốc repo.

## 4. Bốn yêu cầu — cái thứ hai mới là cái quyết định

**⑴ Sổ mới ở gốc repo, và nó PHẢI được miễn khoá y như `IDEAS.md`.**

Khai vào `append_only_exempt` của `.repo-structure.json`, cùng điều kiện: **miễn khi chỉ thêm
dòng ở cuối**, sửa/xoá dòng cũ thì không miễn.

Đây là chi tiết sống còn. Nếu ghi vào sổ mới phải xin khoá `_root` thì AI sẽ lách về
`IDEAS.md`, và ta chỉ **đổi chỗ** cái bệnh. **Động cơ gây bệnh phải bị gỡ, không phải triệu
chứng.**

**⑵ Mở một mục thì phải khai sẵn ĐÓNG KHI NÀO.**

Đây là thứ biến một đống thành một hàng đợi, và là việc quan trọng nhất trong brief này.
Không khai được điều kiện đóng thì mục đó **chưa đủ chín để ghi vào sổ** — nó là một cảm giác,
không phải một việc.

Bạn thiết kế cách cưỡng chế. Ràng buộc: phải **kiểm được bằng máy** — `AGENTS.md` mục 7 ghi
*"luật nào không kiểm được bằng máy thì sớm muộn cũng bị bỏ qua"*, và con số 0 ở mục 1 là bằng
chứng tươi cho câu đó.

**⑶ Cửa ra phải rẻ hơn cửa vào.** Hôm nay vào là thêm dòng (miễn khoá), ra là sửa dòng cũ
(**không** miễn khoá, cần `_root`). Cửa ra đắt gấp nhiều lần cửa vào — đó là lý do đủ để giải
thích con số 1/20, không cần đổ cho ai lười. Đề xuất cách làm cửa ra rẻ ngang cửa vào, **rồi
báo lại**; đừng tự nới miễn trừ, vì đó là đụng cơ chế đa phiên.

**⑷ Dời 14 mục AI sang sổ mới, giữ 5 mục của Đức ở lại.** Việc này **sửa dòng cũ của phiên
khác** nên không nằm trong miễn trừ — nó cần khoá `_root`, và brief này chính là câu duyệt.
Không được mất một mục nào: đếm trước, đếm sau, hai số phải khớp.

## 5. Đụng cơ chế đa phiên → ĐỘT BIẾN KIỂM BẮT BUỘC

Sửa `append_only_exempt` là sửa một trong bốn cơ chế đa phiên (`docs/protocols/MULTIFLOW.md`
mục 5). Bắt buộc:

- Gỡ phép chặn → phép ghim phải **ĐỎ**.
- Sổ mới bị sửa dòng cũ mà không giữ khoá → cổng phải **ĐỎ**.
- Sổ mới chỉ thêm dòng ở cuối → cổng **XANH**.
- **Đếm số chỗ mỏ neo của bạn khớp. Ra 0 thì DỪNG** — công cụ đo hỏng, không phải "không có gì
  phải sửa". Ngày 06/09 một bộ đo ở repo này mù 3/10 con vì mỏ neo viết `\n` mà file là CRLF.

## 6. Việc để lại lượt sau, đừng làm ở lượt này

**Bảng phải hiện DÒNG CHẢY, không hiện TỒN KHO.** Con số "19" không nói gì; thứ nói lên vấn đề
là *tuần này mở mấy · đóng mấy · mục cũ nhất treo bao lâu*. Việc đó sửa bộ sinh → khoá `_code`
→ lượt riêng, xếp sau `BRIEF-BANG-CAN-DUC-01`.

## 7. Khoá và đóng phiên

```
node scripts/claim.mjs --take _root --as <tên-phiên> --task "tach so y tuong khoi no ha tang"
```

Chỉ cần `_root`. Thấy mình cần `_code` thì DỪNG và báo — nghĩa là phạm vi đã trượt.

Commit phải có dòng cuối `Lane: <tên-phiên>`. Dùng `git commit -o <đường-dẫn>`. Cổng phải
XANH TOÀN BỘ. Đẩy bằng `safe-push.mjs`. **Trả khoá SAU khi đẩy.** Ghi Log vào `HANDOFF.md` gốc.

**Có lane khác đang chạy song song.** Cổng đỏ ở vùng bạn KHÔNG đụng thì **đừng vá** — chạy lại
một lần, còn đỏ ngoài vùng của bạn thì báo lại và giữ khoá. Vá thứ không hỏng là cách hỏng thật.

## 8. Cấm

- Cấm để mất một mục nào khi dời.
- Cấm nới miễn trừ khoá cho thao tác sửa dòng cũ mà chưa báo lại.
- Cấm sửa nội dung ý tưởng khi dời — dời nguyên văn.
- Cấm gộp việc sửa bộ sinh vào lượt này.
