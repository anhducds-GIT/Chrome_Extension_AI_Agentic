---
kind: brief
status: active
ttl_days: 90
---

# BRIEF `DASH-ORCH-01` — tab "AI điều phối" trên bảng trạng thái

> **Cho executor.** Đề bài đã chốt (Đức, 2026-09-04). Phạm vi **cố ý hẹp** — mục 4 nói rõ
> những gì KHÔNG làm, và danh sách đó dài hơn danh sách phải làm. Đó là chủ ý.
> Phiên điều phối đứng ngoài triển khai (luật `ROLE-DRIFT-01`): sửa bộ sinh là việc executor.

## 1. Vì sao

Hôm nay Đức bắt được **hai** sai lệch mà hệ lẽ ra tự thấy — bằng cách đọc báo cáo trong chat.
Đức nói thẳng điều đáng giá nhất: *nhìn vào bảng là thấy được **AI đang thiếu gì** và **bảng
đang thiếu gì**.* Chat thì trôi; bảng thì ở đó.

Hiện bảng có 7 tab, và **không tab nào nói về chính vai điều phối**: Assistant đang ở mốc nào,
vùng nào còn trống để giao việc, đang chờ Đức những gì.

## 2. Ràng buộc kỹ thuật — đọc trước khi thiết kế, nó định hình cả tab

`DASHBOARD.html` **suy hoàn toàn từ HEAD**, cố ý. Nó nằm trong khối `generators` của
`.repo-structure.json` nên cổng kiểm nó mỗi phiên, và `safe-push` từ chối khi nó lệch. Ngày
03/09 đã suýt làm tê cả repo vì một dòng phụ thuộc giờ đồng hồ: sang ngày mới là **mọi phiên
bị chặn push** dù không dữ liệu nào đổi.

Và `DASHBOARD.md` khối A ghi rõ vì sao bảng **không chép** bảng quyền: *"trạng thái sống, cố
tình KHÔNG chép vào trang này để trang không mục theo từng lần nhận/trả quyền"* — đo 02/09:
**63 lượt ghi bảng quyền trong một ngày**.

**Đức gỡ đúng nút này bằng một câu:** không cần biết *ai* giữ, chỉ cần biết khoá nào **bận**,
khoá nào **mở**. Đổi chủ `A → B` không làm đổi `bận → bận`, nên phần lớn 63 lượt ghi kia
**không** còn làm bảng mục. Chỉ lượt chuyển thật `bận ↔ mở` mới làm.

Vẫn còn tần suất, và bạn phải xử lý nó — **hai đường, bạn đo rồi chọn, đừng đoán:**

- **(a)** Chấp nhận: mỗi lượt chuyển bận↔mở thì bảng lệch, ai commit tiếp phải sinh lại. Đo
  xem một ngày có bao nhiêu lượt chuyển thật (không phải 63 lượt ghi) rồi quyết.
- **(b)** Lọc dòng khoá khỏi phép so độ tươi, y hệt cách `STAMP_PREFIX` và
  `SESSION_STAMP_PREFIX` đang được lọc trong `build-dashboard.mjs`. Tiền lệ đã có, đọc nó.

Chọn (b) thì phải nói rõ trong trang rằng khối đó là **ảnh chụp lúc sinh**, không phải trạng
thái sống — người đọc không được tin nó là thời gian thực. Chọn (a) thì phải đo và ghi số.

## 3. Tab gồm ĐÚNG BA KHỐI — Đức chốt: ít năng lực quan trọng, không làm tất cả

### Khối 1 · Bảng khoá — bận hay mở

Mỗi khoá một dòng: **tên khoá** và **BẬN / MỞ**. Hết. **Không hiện tên chủ.**

Repo hiện có 6 khoá; danh sách phải đọc từ `.agents/claims.json` chứ không đóng cứng — repo
khác có số khoá khác, và ngay repo này cũng đã đổi (một khoá `_root` tách thành ba ngày 02/09).

Mục đích: Đức nhìn một cái là biết còn bao nhiêu chỗ trống để giao việc song song. Đó là toàn
bộ giá trị của khối này — đừng thêm gì làm loãng nó.

### Khối 2 · Assistant đang ở mốc nào

Ba mốc, lấy từ `docs/protocols/ASSISTANT-V0.1.md`: `V0.1 PACKAGE` · `EXTENSION PILOT` ·
`PORTABLE FREEZE → TEMPLATE`, kèm trạng thái xong/đang chạy/khoá.

### Khối 3 · Defect của chính Assistant

Bảng: mã defect · một câu triệu chứng · mở hay đóng. Nguồn: `docs/briefs/BRIEF-*.md`
(`ROLE-DRIFT-01` đóng · `STATE-DRIFT-01` đóng · `ASSISTANT-PROMOTE-01` parked). Frontmatter
`status:` của brief là thứ máy đọc được — dùng nó, đừng dò văn xuôi.

> **Ba khối này là trần, không phải sàn.** Thấy khối thứ tư đáng thêm → ghi `IDEAS.md`, đừng
> làm. Một tab bốn khối mà hai khối không ai nhìn thì tệ hơn tab ba khối.

## 4. KHÔNG làm — danh sách này dài hơn danh sách phải làm, và đó là chủ ý

- **KHÔNG** hiện tên phiên đang giữ khoá. Đó là điều Đức bỏ đi có chủ đích: nó đổi liên tục,
  làm bảng mục, và Đức **không cần** nó để cân đối việc.
- **KHÔNG** hiện giờ giữ khoá, không hiện cờ "giữ quá 6h". `what-next.mjs` đã lo phần đó, và
  nó là trạng thái sống — chép sang bảng là đẻ ra nguồn sự thật thứ hai.
- **KHÔNG** chép danh sách việc mở sang tab này. Tab `Vận hành` đã có.
- **KHÔNG** đưa bất cứ thứ gì phụ thuộc **giờ đồng hồ lúc sinh**. Mốc thời gian lấy từ HEAD,
  đúng như phần còn lại của trang đang làm.
- **KHÔNG** sửa `session-check.mjs`, `safe-push.mjs`, `claim.mjs`, `what-next.mjs`,
  `state-check.mjs`.
- **KHÔNG** sửa `build-dashboard.mjs` trừ khi bạn chọn đường (b) ở mục 2 và cần dùng lại cơ
  chế lọc của nó — nếu vậy thì **tái dùng, không nhân bản**.
- **KHÔNG** tạo hook/cron/automation tự chạy.

## 5. Luật của trang này — đã có, phải giữ

`AGENTS.md` ghi ba điều cấm trong trang dành cho Đức đọc: **không SHA · không đường dẫn ·
không phần trăm · không lời máy tự khen**. Tab mới chịu chung luật đó.

Và luật vàng 5: chữ Đức nhìn thấy là **tiếng Việt có dấu**. Mã lỗi giữ tiếng Anh.

## 6. Xong khi nào

1. Tab hiện trên `DASHBOARD.html`, ba khối, mở bằng trình duyệt thấy đúng.
2. **Sinh hai lần liên tiếp ra kết quả y hệt** (tất định) — và nếu bạn chọn đường (a) ở mục 2
   thì phải chứng minh bảng không lệch khi chỉ có chủ khoá đổi mà bận/mở không đổi.
3. Test ghim trong suite gốc + **thử phá**: sửa cho sai, chạy, phải ĐỎ. Tối thiểu ghim được:
   ba khối có mặt · bảng khoá đọc từ `claims.json` chứ không đóng cứng · **không** rò tên chủ
   ra trang · số khoá đổi thì bảng đổi theo.
   Báo số thật, kể cả số lượt thoát ban đầu.
4. Cổng đóng phiên XANH TOÀN BỘ.
5. Log vào `HANDOFF.md` gốc, commit có nhãn `Lane:`, đẩy bằng `safe-push.mjs`. Bị từ chối vì
   cuốn theo việc phiên khác → DỪNG và báo, đừng tự `--carry`.
6. Trả khoá — lượt push riêng.

**Phép thử cuối:** tự tay đổi một khoá trong `claims.json` từ mở sang bận (bằng `claim.mjs`,
không sửa tay), sinh lại bảng, mở ra xem. Dòng đó phải đổi, và **không** được lộ tên phiên nào.
Nhớ trả khoá lại sau khi thử.

## 7. Câu hỏi thì hỏi Đức

Phiên điều phối cố ý đứng ngoài. Brief thiếu gì thì hỏi Đức một câu ngắn.
