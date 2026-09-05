---
kind: brief
status: active
ttl_days: 60
---

# BRIEF `TOKEN-PROTOCOL-01` — Ngân sách ngữ cảnh: đo được, chặn được, đi theo được sang repo khác

> **Đề bài CHUNG cho hai repo.** Đức triển khai song song `Ark_Repo_Harness` và
> `Chrome_Extension_AI_Agentic` ngày 06/09. **Công cụ và luật xây MỘT LẦN ở bộ khung**
> ([ADR-0006](../adr/0006-goi-assistant-phat-hanh-tu-bo-khung.md): bộ khung phát hành, repo này
> tiêu thụ). Repo này **áp dụng**, không phát hành.
>
> File này nằm ở đây vì nó là **đơn đặt hàng**, không phải bản cài đặt. Xây bản cài đặt ở đây
> rồi "đồng bộ ngược sau" là đúng cái bẫy ADR-0006 đã cảnh báo — lần đồng bộ ngược đó không
> bao giờ xảy ra.

## 1. Vì sao — số đo thật, không phải cảm giác

Đo ở `Chrome_Extension_AI_Agentic` ngày 06/09 (`docs/studies/TOKEN-DIET-V0.md`):

| | Token |
|---|---|
| Nạp **tự động** mỗi phiên | ≈ **11.978** |
| Luật mục 0 kéo thêm — phiên điều phối | ≈ **137.800** |
| Bốn `HANDOFF.md` cộng lại | **276.862** |
| `HANDOFF.md` gốc tăng mỗi ngày | **+23.000** |

Con số cuối là con số quan trọng nhất. Nó nói: **đây không phải một mức cần hạ, đây là một đà
cần chặn.** Hạ một lần rồi thôi thì sáu tuần nữa quay lại chỗ cũ.

Và một chỗ đáng nhớ: **`AGENTS.md` mục 6 chiếm 52,3% file luật** (4.985 token) trong khi chính
nó mở đầu bằng *"Không đọc trước. Tới việc nào thì mở sổ tay đó."* Hơn nửa hiến pháp là thứ tự
nó khai là không cần đọc — nhưng nó nằm trong đường nạp tự động nên **mọi phiên đều nạp**, kể
cả phiên chỉ hỏi một câu.

## 2. Ba thứ phải xây, và thứ ba là thứ quyết định

**⑴ Ngân sách khai được.** Mỗi repo khai trần token cho đường nạp tự động, ở
`.repo-structure.json`. Khai trong file, không gõ cứng trong script — repo khác có hình dạng
khác. Repo không khai thì dùng mặc định của bộ khung.

**⑵ Phép đo.** Một công cụ đếm **đúng thứ AI thật sự nạp**, không đếm cả repo:
- đường nạp tự động (`CLAUDE.md` và mọi `@` include, đệ quy);
- đường luật bắt đọc lúc mở phiên, **tính riêng cho từng vai** — số của phiên điều phối khác
  hẳn số của executor một gói, và gộp lại là giấu mất chỗ tốn nhất.

Cách ước tính token phải **khai ra**, không giấu trong code. Sai số chấp nhận được, nhưng **hệ
số phải nhất quán qua các lượt đo** — nếu không thì không so sánh được hai ngày với nhau, mà so
sánh mới là thứ bắt được đà tăng.

**⑶ Cổng chặn.** Vượt trần thì cổng đóng phiên **ĐỎ**.

Không có ⑶ thì ⑴ và ⑵ chỉ là lời khuyên. `AGENTS.md` mục 7 đã viết: *"Luật nào không kiểm được
bằng máy thì sớm muộn cũng bị bỏ qua."* Ngày 06/09 câu đó được chứng minh **hai lần trong một
buổi** ở repo Chrome Extension — một luật đúng nằm trong quyển sổ sai người đọc, ba lane cùng
vi phạm mà không ai cố tình.

## 3. Luật chống chính việc dọn dẹp

**Cắt để tiết kiệm token mà làm mất một luật là LỖ, không phải lãi.**

Đây không phải lời khuyên đạo đức, nó là kết quả đo được. Ngày 06/09 ở repo Chrome Extension:
một luật **đúng, đã tồn tại từ hai ngày trước**, nằm trong sổ tay của riêng một vai. Ba lane
khác đọc hiến pháp, không thấy luật, và **cả ba cùng vi phạm** — mỗi lane đều hành xử đúng theo
những gì nó được đọc.

Nên mọi đề xuất cắt phải trả lời được **một câu**:

> Cắt xong thì luật đó **còn đến tay người cần đọc không?**

Ba việc trông như rác mà bài đo khuyên **không** làm, ghi ra vì bản năng dọn dẹp sẽ muốn làm:

- **Xoá file mồ côi tiết kiệm đúng 0 token.** Không ai trỏ tới thì không ai mở. Xoá vì lý do
  khác thì được, nhưng **đừng ghi vào sổ tiết kiệm token**.
- **Gộp hai file trùng 71% tiết kiệm ≈0 token.** Đáng làm để chống trôi dạt, không đáng ghi vào
  sổ này.
- **Bỏ hẳn một mục mục lục là rủi ro cao nhất.** Mục 6 trỏ 42 đường dẫn, `docs/README.md` chỉ
  trùng 2 — bỏ nó là 40 đường dẫn biến mất khỏi tầm mắt mọi phiên.

**Cách đúng để cắt mục lục: dời, kèm con trỏ, và chứng minh con trỏ đọc được.** Không phải xoá.

## 4. Dọn định kỳ

Ngân sách chỉ giữ được nếu có nhịp rà. Đề xuất, chưa chốt:

- Cổng đóng phiên báo **VÀNG** khi qua 80% trần, **ĐỎ** khi vượt.
- Bảng trạng thái hiện **một dòng**: token nạp tự động hôm nay, và **so với lần đo trước** —
  con số một mình không nói gì, xu hướng mới nói.
- Mỗi lượt cắt lớn ghi một ADR. Dời chữ cũ của phiên khác **không** nằm trong miễn trừ
  "chỉ thêm dòng ở cuối", nên nó cần một câu duyệt của Đức, mỗi lần.

## 5. Đi theo được sang repo khác

Đây là lý do việc này thuộc bộ khung. Repo dựng từ bộ khung phải có sẵn:
ngân sách mặc định · công cụ đo · cổng chặn · và luật ở mục 3.

**Đừng để repo mới thừa hưởng con số của repo cũ.** Trần phải là giá trị khai trong
`.repo-structure.json` của chính repo đó; mặc định của bộ khung là điểm bắt đầu, không phải
điểm đến.

## 6. Nghiệm thu

1. Chạy công cụ đo trên **cả hai** repo, ra số, và **hai lượt chạy trên cùng HEAD ra số giống hệt**.
2. Hạ trần xuống dưới mức hiện tại → cổng đóng phiên **ĐỎ**. Nâng lên → xanh.
3. **Đột biến kiểm:** gỡ phép chặn → phép ghim ĐỎ · đảo điều kiện → ĐỎ · repo không khai trần →
   dùng mặc định chứ không sập.
4. Dựng một repo mới từ bộ khung, **không sửa dòng nào**: công cụ chạy được ngay.
5. Con số **không phụ thuộc đồng hồ hệ thống** — nếu không, sang ngày mới là mọi lane bị chặn
   push dù không dữ liệu nào đổi.

## 7. Cấm

- Cấm xây bản cài đặt ở repo Chrome Extension rồi "đồng bộ ngược sau".
- Cấm gõ cứng trần token trong script.
- Cấm đếm cả repo rồi gọi đó là chi phí ngữ cảnh — chỉ đếm thứ thật sự được nạp.
- Cấm gộp số của các vai làm một.
