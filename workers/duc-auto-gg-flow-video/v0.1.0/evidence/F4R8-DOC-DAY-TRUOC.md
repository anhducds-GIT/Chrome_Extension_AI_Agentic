# Đọc trước khi dùng file F4R8 — tôi mắc lại đúng lỗi của F4R7

`F4R8-run-trial-response-20260902.json` là một **phản hồi TỪ CHỐI**, không phải lượt chạy thành
công. Nội dung: `INVALID_PARAMS` — *"expected an integer from 20 to 30"* — tức lệnh bị chính
lớp Bridge chặn vì `bridge-core.js` còn giữ bản sao cũ của nhịp giữa hai job. Tôi commit nó ở
`7434fa6` rồi ghi đè bằng phản hồi thành công.

**Phản hồi ĐƯỢC CHẤP NHẬN nằm ở `F4R8-run-trial-response-ACCEPTED-20260902.json`** (`delay_sec:
90`, `run_id 20260902-1138`). Đó mới là lượt sinh ra 4 video của F4R8.

## Vì sao mắc lại dù vừa rút kinh nghiệm ở F4R7

Lần trước tôi rút ra luật *"kiểm `ok:true` TRƯỚC KHI ghi vào `evidence/`"* — rồi **chỉ áp cho
probe**. Response của `jobs.add` / `run.trial` tôi vẫn ghi thẳng bằng `> file`.
**Một luật chỉ áp cho một loại lệnh thì không phải một luật.**

## Luật đúng, áp cho MỌI phản hồi Bridge

Ghi ra chỗ tạm trước → kiểm `ok === true` → rồi mới chép vào `evidence/`.
Phản hồi từ chối **vẫn đáng lưu**, nhưng phải mang tên nói rõ nó là từ chối — đừng mang tên của
thứ nó không phải.

## Và một luật nữa, học từ chính lần sửa này

`evidence/` là **chỉ THÊM** theo nghĩa chặt: **kể cả thêm dòng vào một file đã commit cũng bị
cổng kiểm chặn.** Tôi định ghi phần đính chính này vào cuối `F4R7-DOC-DAY-TRUOC.md` và bị từ
chối. Muốn đính chính một file bằng chứng đã commit thì **viết một file mới trỏ tới nó**, như
file này đang làm.
