---
kind: brief
status: active
ttl_days: 90
---

# BRIEF `BANG-BA-CUA-01` — Ba cửa vào bảng trạng thái, một thư mục, một lõi

Đức nêu ngày 06/09:

> *"Mỗi lần tôi muốn xem thông tin mới nhất thì lại phải bảo AI làm, rất bất tiện và bị
> interrupt vào các luồng công việc khác một cách vô ích."*

Và chốt ranh giới vai — **đây là ràng buộc thiết kế, không phải lời than**:

> *"Tôi muốn là người ĐỌC thông tin AI báo cáo, chứ không phải người báo cáo cho AI."*

**Không thứ gì trong lượt này được đòi Đức nhập một chữ.** Không ô đánh dấu, không form, không
"Đức xác nhận đã làm".

## 1. Ba cửa, Đức chốt làm cả ba

| Cửa | Đức làm gì | Dùng khi |
|---|---|---|
| **① Nhấp đúp** | nhấp đúp một file | máy chưa bật gì, muốn xem ngay |
| **② Máy chủ tại chỗ** | mở một lần | muốn nút Refresh **trong trang**, bấm bao nhiêu lần cũng được |
| **③ Canh nền** | không làm gì | repo đổi là trang tự sinh lại, Đức chỉ F5 |

**Gom vào MỘT thư mục** ở gốc repo — Đức nói rõ: *"đừng để nó tản ra nhiều nơi gây fragment."*

**Một lõi dùng chung cho cả ba.** Ba cửa chỉ khác nhau ở cách được gọi; phần "sinh lại bảng cho
an toàn" viết **một lần**. Ba bản sao của cùng một logic là ba bản sẽ trôi khác nhau — repo này
đã trả giá cho đúng chuyện đó (`ADR-0006`).

## 2. Chốt an toàn — mục quan trọng nhất của brief này

**Cửa ③ chạy khi không ai nhìn.** Mọi lỗi ở đó là lỗi im lặng. Bốn chốt, không cái nào tuỳ chọn:

**⑴ Lane đang giữ `_code` → NGỪNG sinh.** Bộ sinh nằm trong `scripts/`; lane giữ `_code` có thể
đang sửa dở nó. Ngày 06/09 phiên điều phối chạy bộ sinh giữa lúc một lane sửa dở và **ra một
bảng từ mã nửa vời** — phải hoàn nguyên. Lần đó có người phát hiện; tiến trình nền thì không.
Ngừng thì **nói rõ trên trang vì sao đang ngừng**, đừng im lặng để bảng cũ trông như bảng mới.

**⑵ CHỈ sinh bốn artifact miễn khoá:** `DASHBOARD.md` · `llms.txt` · `repo-map.json` · bảng HTML.
**Cấm chạy `feature-parity.mjs`** — `FEATURE-PARITY.md` cần khoá `_root` vì mục 2 của nó là chữ
của người. Một tiến trình nền ghi vào đó là **máy của Đức làm bẩn cây làm việc của lane đang chạy**.

**⑶ Cấm commit, cấm đẩy, cấm nhận/trả khoá.** Cả ba cửa chỉ đọc repo và ghi bốn artifact trên.

**⑷ Gộp nhịp, đừng sinh theo từng sự kiện file.** Một lượt lane làm việc đổi hàng chục file;
sinh mỗi lần là đốt máy Đức vô ích. Chờ lặng một khoảng rồi mới sinh một lần.

## 3. Cửa ① — nhấp đúp

Một file nhấp đúp được (`.cmd` hay `.bat` — **kiểm thật trên Windows 11**), làm ba việc rồi biến
mất: sinh lại → mở bảng bằng trình duyệt mặc định → đóng.

Hỏng thì **nói bằng tiếng Việt có dấu trong một cửa sổ Đức đọc được**. Đừng nháy rồi tắt —
Đức không đọc log.

## 4. Cửa ② — máy chủ tại chỗ

Nghe **chỉ ở `127.0.0.1`**, không mở ra mạng. Một đường `/refresh` gọi đúng lõi ở mục 1, chịu
đủ bốn chốt ở mục 2.

**Không có đường GHI nào.** Đức đã bác việc tự nhập liệu, nên máy chủ này **chỉ đọc**. Đừng thêm
đường ghi "cho tiện sau này" — đó là cách một máy chủ chỉ-đọc thành một máy chủ sửa được repo.

## 5. Cửa ③ — canh nền, và tự chạy lúc khởi động

**Đức duyệt tường minh 06/09** việc tạo automation tự chạy — ghi ra đây vì luật gốc bắt phải hỏi,
và để phiên sau biết đây là quyết định của Đức chứ không phải AI tự làm.

Gợi ý: **một tiến trình duy nhất** vừa canh vừa phục vụ cửa ②. Một tiến trình, một mục khởi
động, một chỗ để tắt.

Ba thứ bắt buộc:

- **Cài và GỠ đều bằng nhấp đúp.** Một thứ tự chạy mỗi lần bật máy mà không gỡ được dễ dàng là
  một thứ Đức sẽ phải nhờ người khác gỡ.
- **Đức nhìn được nó đang sống hay chết** mà không cần mở Task Manager.
- **Chết thì phải im lặng chết, không được làm hỏng gì.** Máy Đức không có repo ở đúng chỗ, hoặc
  không có `node` → thoát sạch, không cửa sổ lỗi lặp vô hạn mỗi lần khởi động.

Dùng thư mục Startup của người dùng, **không cần quyền quản trị**. Không dịch vụ hệ thống.

## 6. Trang phải tự nói ra thứ nó KHÔNG thấy

Bảng suy từ **HEAD**; riêng bảng quyền đọc file trực tiếp. Hệ quả:

- Lane đang chạy → **hiện ngay**, đó là dữ liệu sống.
- Việc lane đó **chưa commit** → **không hiện**.

Trang phải nói câu đó ra, một dòng Đức đọc được, **cùng với mốc thời gian sinh gần nhất**. Bảng
im lặng về giới hạn của chính nó là cách làm Đức tin nhầm — hôm nay đã có ca *"0 sự cố"* đọc y
hệt *"sạch sẽ"* trong khi thật ra là *"mù"*.

## 7. Nghiệm thu

1. Cả ba cửa chạy thật trên máy Đức. **Chạy, đừng suy luận.**
2. **Chốt ⑴ chứng minh được:** một lane giữ `_code` → cửa ③ ngừng sinh và trang nói rõ vì sao.
3. Chạy cả ba cửa **giữa lúc một lane giữ cả ba khoá** → `git status` trước và sau giống nhau,
   ngoài bốn artifact miễn khoá.
4. Sinh hai lần trên cùng HEAD → **giống hệt từng byte**.
5. Gỡ mục khởi động bằng nhấp đúp → khởi động lại máy thì không còn gì chạy.
6. **Đột biến kiểm:** gỡ chốt ⑴ → phép ghim ĐỎ · cho phép chạy `feature-parity` → ĐỎ · thêm một
   đường ghi vào máy chủ → ĐỎ.
7. **Đếm số chỗ mỏ neo của bạn khớp. Ra 0 thì DỪNG** — công cụ đo hỏng, không phải "không có gì
   phải sửa". Ngày 06/09 chuyện này xảy ra với **năm lane khác nhau** trong repo này.
8. Cổng đóng phiên XANH TOÀN BỘ.

## 8. Khoá và đóng phiên

`_root` (thư mục mới ở gốc repo). Chạm `scripts/` hay `tests/` thì thêm `_code`.

Commit có dòng cuối `Lane: <tên-phiên>` · `git commit -o <đường-dẫn>` · cổng XANH TOÀN BỘ · đẩy
bằng `safe-push.mjs` · **trả khoá SAU khi đẩy**. Khai thư mục mới vào Bản đồ file (`AGENTS.md`
mục 4) và thêm một khối vào `PROMPTS.md` để Đức tìm lại được cách bật/tắt.

## 9. Cấm

- Cấm ba bản sao của cùng một logic sinh bảng.
- Cấm chạy `feature-parity.mjs` ở bất kỳ cửa nào.
- Cấm commit / đẩy / nhận khoá từ bất kỳ cửa nào.
- Cấm mọi đường GHI trên máy chủ.
- Cấm mọi thứ đòi Đức nhập liệu.
- Cấm để trang im lặng khi tiến trình nền đang ngừng.
- Cấm dịch vụ hệ thống hoặc bất cứ thứ gì đòi quyền quản trị.
