---
kind: brief
status: done
ttl_days: 90
---

# BRIEF `PUSH-GATE-01` — cổng xuất bản chặn oan các lane không liên quan

> **Cho executor.** Hướng đã chốt: Đức chọn **hướng (b)** của `IDEAS.md` mục `Y-09`, ngày 2026-09-05.
> Phiên điều phối đứng ngoài triển khai (luật `ROLE-DRIFT-01`). Brief này **cố ý không kèm bản vá** —
> mục 4 của `ORCHESTRATOR.md` cấm điều đó, và có lý do: brief kèm sẵn lời giải thì executor đi
> kiểm lời giải của phiên điều phối thay vì đi tìm nguyên nhân.

## 1. Triệu chứng — quan sát được, không suy diễn

`node scripts/safe-push.mjs --as <lane>` **từ chối đẩy** khi một file bộ sinh đang sửa dở trong
cây làm việc, **kể cả khi**:

- lane đang đẩy giữ một khoá **khác** với khoá chứa file sửa dở;
- các commit sắp đẩy đã hoàn tất, đã có nhãn lane, và không liên quan gì tới file đó;
- artifact đã commit **đang khớp** với HEAD.

Câu từ chối nguyên văn:

```
TỪ CHỐI PUSH — sự thật máy sinh chưa khớp với thứ bạn sắp đẩy:
  scripts/build-overview.mjs đang sửa dở chưa commit — nó là thứ phán xử, nên kết quả không đáng tin.
```

## 2. Số đo thật — ngày 2026-09-05, một ngày làm việc

- **4 lượt** lane `claude-dieu-phoi` bị từ chối đúng vì lý do này. Không lượt nào lane đó chạm
  vào file bộ sinh.
- Lượt cuối lộ ra chỗ nặng hơn ba lượt trước: file bộ sinh bẩn vì phiên kia đang chạy **thử phá**
  (đọc diff thấy đúng một dòng bị thay: một lời gọi hàm đổi thành hằng số, rồi hoàn nguyên).
  Thử phá chạy **nhiều vòng**, mỗi vòng bẩn file vài chục giây.
- Hệ quả đo được: một vòng chờ-tới-khi-sạch **trượt hai lần liên tiếp** — sạch được một nhịp,
  kịp sinh lại bảng và commit, tới lượt push thì đã bẩn lại.

**Câu tóm gọn của defect:** *càng làm đúng kỷ luật thử phá, càng khoá cửa xuất bản của người khác.*
Một phiên chạy 30 lượt mutation là đóng cửa 30 lần.

Ba lần trước tôi đã ghi vào sổ với kết luận "một ca chưa đủ để đổi cơ chế". Bốn ca trong một
ngày, cộng với chỗ nặng vừa nêu, là lý do Đức chốt sửa.

## 3. Yêu cầu — nói bằng KẾT QUẢ, không nói bằng cách làm

Cổng phải từ chối **chính xác hơn**: chỉ từ chối khi tình trạng cây làm việc **thật sự** khiến
thứ sắp công bố sai.

**Và tuyệt đối không được yếu đi.** Bảo đảm hiện có phải giữ nguyên, phát biểu như sau:

> Không ai đẩy được một nhánh mà artifact đã commit **không khớp** với HEAD.

Đó là bảo đảm đáng giá — nó có thật, nó đã cứu repo này (03/09 một dòng phụ thuộc giờ đồng hồ
suýt làm mọi phiên bị chặn), và **nó không được đổi**. Việc của bạn là bỏ phần chặn oan, không
phải nới phần chặn đúng.

## 4. Ràng buộc — đọc hết trước khi gõ dòng đầu

1. **`safe-push.mjs` là MỘT TRONG BỐN CƠ CHẾ ĐA PHIÊN.** `docs/protocols/MULTIFLOW.md` bắt mọi
   thay đổi cơ chế đa phiên phải kèm **đột biến kiểm**. Đây không phải lời khuyên: đã đếm được
   **4 lần trong một ngày** một chốt vừa viết ra hoá ra vô tác dụng mà test vẫn xanh.
   **Đọc `MULTIFLOW.md` mục quy trình đổi cơ chế trước khi sửa.**
2. **KHÔNG thêm cờ bỏ qua.** Không `--skip-artifact-check`, không biến môi trường, không tuỳ
   chọn "tôi biết tôi đang làm gì". Một cổng có cửa sau thì sớm muộn ai cũng đi cửa sau, và lúc
   đó nó thôi là cổng. Nếu bạn thấy chỉ còn cách đó → **DỪNG và báo**, đó là câu Đức trả lời.
3. **Cùng một luật đang sống ở HAI CHỖ, và chúng đang trả lời KHÁC NHAU.** `session-check.mjs`
   cũng có phép kiểm độ tươi artifact, nhưng ở đó nó **không chặn** (in `[BỎ ]` và nói rõ là
   đang đòi sai người), còn ở `safe-push.mjs` thì **chặn**. Kiểm lại điều này bằng mắt bạn trước
   khi làm gì. Repo này đã trả giá đúng một lần cho hai bản sao của một luật: `append_only_exempt`
   từng gõ cứng ở cả hai script và **trả hai câu khác nhau cho cùng một file** ngày 02/09. Nếu
   sửa mà để hai chỗ lệch nhau thêm nữa thì bạn vừa dựng lại đúng cái bẫy đó.
4. **KHÔNG** sửa `claim.mjs`, `what-next.mjs`, `state-check.mjs`, hay bất kỳ bộ sinh nào
   (`build-dashboard.mjs`, `build-overview.mjs`, `feature-parity.mjs`).
5. **KHÔNG** đụng `template/` hay repo bộ khung. Bộ khung có bản `safe-push` riêng; đồng bộ sang
   đó là việc khác, không phải lượt này.
6. **KHÔNG** tạo hook/cron/automation tự chạy.

## 5. Xong khi nào — cả hai chiều đều phải dựng được ca thật

Hai điều kiện dưới đây **kéo ngược nhau**. Chỉ đạt một cái là chưa xong — đạt cái đầu mà mất
cái sau là đã làm hỏng cổng.

1. **Hết chặn oan, chứng minh bằng ca dựng thật:** làm bẩn một file bộ sinh trong cây làm việc,
   rồi từ một lane **khác** đẩy các commit đã hoàn tất và không liên quan → **phải đẩy được**.
2. **Chặn đúng vẫn còn, chứng minh bằng ca dựng thật:** làm cho artifact đã commit **lệch** với
   HEAD, rồi thử đẩy → **phải vẫn bị từ chối**, và câu từ chối vẫn nói rõ phải chạy bộ sinh nào.

Suy luận không tính. Cả hai phải là ca chạy được, và phải nằm trong suite.

3. **Đột biến kiểm bắt buộc** (mục 4.1). Với mỗi phép ghim mới: sửa code cho sai thật → suite
   phải ĐỎ → **và đỏ đúng khẳng định đó**, không phải đỏ vì lý do khác. Cách kiểm rẻ nhất một
   phép ghim có thật hay không: **đổi ngược bản vá; suite vẫn xanh nghĩa là phép ghim đó chưa
   tồn tại.** Báo số thật, **kể cả số lượt thoát ở vòng đầu**.
4. Cổng đóng phiên XANH TOÀN BỘ.
5. Cập nhật `IDEAS.md` mục `Y-09`: ghi đã chốt hướng (b), đã làm, và **đo lại** — đếm trong lịch
   sử thật xem còn lượt từ chối nào cùng loại không.
6. Log vào `HANDOFF.md` gốc. Commit có dòng cuối `Lane: <tên-phiên>`. Đẩy bằng `safe-push.mjs`.
   Bị từ chối vì cuốn theo việc phiên khác → **DỪNG và báo**, đừng tự `--carry`.
7. Trả khoá — **lượt push riêng**.

## 6. Khoá cần giữ

`_code` (cho `scripts/safe-push.mjs` + `tests/`) và `_docs` nếu bạn chạm `MULTIFLOW.md`.
`IDEAS.md` và `HANDOFF.md` gốc được miễn khoá **khi chỉ thêm dòng ở cuối** — sửa dòng cũ của
`IDEAS.md` thì cần `_root`, nên nếu phải sửa mục `Y-09` tại chỗ thì **báo, đừng tự nhận `_root`**.

Cả ba khoá gốc lúc viết brief này đang do một phiên khác giữ. Kiểm bằng
`node scripts/claim.mjs --list`; có chủ khác thì **DỪNG và báo**, đừng giành.

## 7. Hai cái bẫy đã cắn nhiều lần trong repo này

- **`\b` trong regex JS không dùng được với tiếng Việt** — `\b` dựa trên `[A-Za-z0-9_]` nên cạnh
  `Đ`/`ế` không có biên nào, regex khớp rỗng **mà im lặng**.
- **Ký tự vô hình.** Neo bản vá bằng ký tự xuống dòng Unix trên file CRLF thì báo *"không có gì
  khớp"* — trông y hệt *"không có gì phải sửa"*. Đã cắn 5 lần trong ngày 04/09, trong đó 3 lần
  làm một lượt thử phá **thoát lưới mà không ai biết**. Neo bằng một dòng, và kiểm lại số lần
  khớp thay vì tin là đã khớp.

## 8. Câu hỏi thì hỏi Đức

Phiên điều phối cố ý đứng ngoài. Brief thiếu gì thì hỏi Đức một câu ngắn.
