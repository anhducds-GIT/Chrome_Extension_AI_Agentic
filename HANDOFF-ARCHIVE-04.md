# HANDOFF lưu trữ — HANDOFF.md, 1 mục cũ

> **Đây là phần đuôi đã cắt của [`HANDOFF.md`](HANDOFF.md) cạnh file này.**
> Sinh bằng `node scripts/handoff.mjs --cat HANDOFF.md --giu 20` theo
> [ADR-0008](docs/adr/0008-nhat-ky-phien.md) — cắt ngày 2026-09-09.
>
> Cắt theo **vị trí trong file**, không theo ngày (bất biến ⑵ của ADR): file kia giữ **20
> mục cuối**, 1 mục trước đó nằm ở đây — **nguyên văn, không sửa một chữ**.
>
> **Dựng lại bản gốc:** thay khối con trỏ trong `HANDOFF.md` (phần giữa dòng `## Log` và
> tiêu đề `##` đầu tiên) bằng toàn bộ phần dưới dấu `ARCHIVE-BODY-START` ở đây — ra đúng bản
> gốc **từng byte**. SHA-256 bản gốc trước khi cắt: `45c06dac74f2670bcb6e7521e8a17a09b6cb73a0ce13a2b562ab5979a3705a22`.
>
> **Chỉ đọc.** Ghi Log mới thì ghi vào `HANDOFF.md`, đừng ghi vào đây.

<!-- ARCHIVE-BODY-START -->

<!-- HANDOFF-THANG: 2026-09 -->

<!-- HANDOFF-CUT-POINTER: ADR-0008 -->
> **6 mục cũ hơn đã dời sang [`HANDOFF-ARCHIVE-03.md`](HANDOFF-ARCHIVE-03.md)** — cùng thư mục này,
> nguyên văn, không mất chữ nào. File này giữ **20 mục cuối** (ADR-0008). Cần đào lịch sử
> xa hơn thì mở file đó và đi tiếp theo con trỏ trong nó; ghi Log mới thì vẫn ghi vào cuối
> file này.
<!-- /HANDOFF-CUT-POINTER -->

## 2026-09-08 · `claude-scouter-s06` — HNX Fetch thành gói riêng; trần ghi 50 → 200

Hai chốt của Đức trong một phiên.

**① Trần ghi 50 → 200** ([ADR-0005](workers/duc-scouter/v0.1.0/docs/adr/0005-tran-ghi-nang-tu-50-len-200.md)).
Trần 50 hôm 07/09 dừng một việc **đúng** — lượt tải 216 PDF — rồi Đức bật lại và việc đó chạy
tiếp y nguyên. Nó không lọc được gì, chỉ cắt một việc lành làm nhiều khúc. Bốn lớp còn lại
không đụng. Kèm: **ba mỏ neo đột biến đã chết từ hôm trước** (`D9 H2 F6`) được vá — chúng canh
ba chốt an toàn mà lại khớp 0 lần.

**② HNX Fetch tách thành extension riêng** ([ADR-0021](docs/adr/0021-goi-extension.md)).
Đức: *"scouter đi scout trang khác, còn HNX thành 1 extension độc lập."*

**Phép đo quyết định hình dạng gói, chạy TRƯỚC khi chép một dòng nào:** tầng dữ liệu HNX gọi
**đúng một lệnh** của extension (`scout.fetch`), và lệnh đó **không dùng** `chrome.debugger`.
Nên gói mới **không phải fork**: nó bỏ hẳn quyền debugger, giữ **4 lệnh trên 15**, vùng đích
hẹp về `hnx.vn` thay cho `<all_urls>`. Extension không có debugger thì **không ai bắt nó bấm
được** — kể cả AI vận hành nó, vì Chrome từ chối ở tầng hệ thống.

**Cắt chứ không tắt bằng cờ:** 11 lệnh bị XOÁ khỏi từ vựng. `scout.click` trả `METHOD_NOT_FOUND`.
Một lệnh không tồn tại thì không ai bật lại được.

**Trần "một gói sống" nâng lên HAI.** Trần là *số gói CÓ LÝ DO sống*, và lý do phải viết được
thành một ADR. Gói thứ ba phải hỏi Đức.

**Hai lỗi cũ lộ ra trong lượt này, đã vá:**

- Suite gốc **không chạy** phép ghim của gói mới — thiếu `tests/run-all.mjs`. Cổng đóng phiên tự
  tìm tệp đó theo hình dạng, nên thiếu nó là **im lặng bỏ qua cả gói**.
- STATUS của Scouter khai `ref_readme: README.md` — đường đó **tồn tại ở gốc repo** nên phép
  kiểm XANH, nhưng người bấm từ bảng rơi vào README của CẢ REPO. Xanh mà trỏ nhầm chỗ.

**Đo.** Suite gốc **375** (trước 369). Phép ghim bề mặt hẹp **4/4**. `check-bootstrap` 0 đỏ.

**Còn nợ:** thư mục pilot cũ **chưa xoá** (xoá tệp phải hỏi Đức), đã dán bảng ĐÃ CHUYỂN NHÀ.
Chưa lượt nào chạy qua chính extension mới.

