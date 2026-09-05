---
kind: study
status: active
ttl_days: 90
---

# AUDIT Codex — lõi `observer-probes.mjs`, vòng 1 (2026-09-06)

> Kiểm toán viên: **Codex CLI 0.153.4**, khác họ mô hình với tác giả (Claude).
> Chạy `--sandbox read-only`, mã nguồn đưa qua stdin. Đây là **bản chép nguyên văn**,
> chưa phân loại, chưa xử lý. Phân loại và quyết định nằm ở phiên sau.

**Vì sao lượt này đáng giá:** lane tác giả chạy 10 con đột biến, giết 10, sống sót 0 — và
kết luận thiết kế vững. Codex tìm ra một **kênh rò thông tin không cần phá chốt nào**, và một
nhánh **đi vòng qua chốt**. Đột biến kiểm chứng minh được các chốt CÓ RĂNG; nó không thể lộ ra
một chốt KHÔNG NẰM TRÊN ĐƯỜNG CHẠY, cũng không thể lộ ra một kênh rò không phá chốt nào.

---

#01

**1. PHÁ ĐƯỢC BẤT BIẾN SỐ MỘT KHÔNG**

- `dom.query`, dòng **230–255**: **RỖNG về đường selector → JavaScript** trong mã cung cấp. `selector` được truyền vào CSS parser; Chromium gọi `ContainerNode::QuerySelectorAll` trực tiếp, không gọi hàm JavaScript mà trang có thể ghi đè. Không thấy đường thực thi JavaScript gián tiếp qua năm method hiện tại. [Mã Chromium](https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/core/inspector/inspector_dom_agent.cc).
- `targets.list`, dòng **176–178**; `runProbe`, dòng **152–154**: chưa thể kết luận cho toàn bộ hệ thống: `listTargets`, `sendRaw`, constructor và `describeTarget` của `ObserverEngine` nằm ngoài mã cung cấp. Đây là giới hạn kiểm toán, chưa phải bằng chứng có đường chạy mã.

**2. BA CHỐT CÓ THẬT SỰ CHẶN KHÔNG**

- `runProbe`, dòng **148–154**; `createReadOnlySender`, dòng **127–136**: chốt tên được gọi tại **148**, bọc sender tại **152**, kiểm method tại **127**, kiểm khóa tại **130–134**, rồi mới gọi `sendRaw` tại **136**. Không thấy lời gọi CDP trực tiếp nào trong ba probe DOM đi vòng sender.
- `targets.list`, dòng **176–178**: gọi dependency và `ObserverEngine` ngoài sender; chốt ⑵–⑶ không bao phủ nhánh này, và `cdp` không ghi nhận hoạt động của nó. Tuyên bố “mọi phép dò chỉ nhận được hàm đã bọc” không đúng cho dependency này.
- `createReadOnlySender`, dòng **130–136**: chốt khóa chỉ kiểm **khóa riêng, enumerable, tầng ngoài**. `{nested:{expression:"..."}}` không bị chặn. Với method hiện tại, đây chưa tạo đường chạy mã; nhưng lời khẳng định chốt ⑶ bảo vệ mọi hình dạng tham số khi mở rộng danh sách là sai.

**3. CHE DỮ LIỆU CÓ LÀM ĐÚNG VIỆC KHÔNG**

- `dom.query`, dòng **249, 264**: **dò ngược được giá trị thuộc tính bị che**. Selector `input[value^="a"]` hoặc `[data-token^="a"]` và `matchCount` tạo phép thử tiền tố; hỏi lặp có thể khôi phục bí mật trong thuộc tính DOM. `maskAttributes` không bảo vệ kênh này. Không đồng nghĩa đọc được giá trị nhập chỉ tồn tại ở property.
- `maskAttributes`, dòng **352–361**; `page.snapshot`, dòng **207**: whitelist không bảo đảm dữ liệu an toàn. `id`, `name`, `title`, `aria-label`, `data-testid` và tiêu đề trang vẫn có thể chứa thông tin cá nhân hoặc token; `cap` chỉ cắt độ dài.
- `stripQuery`, dòng **372–375**: giữ nguyên bí mật trong đường dẫn, phần `user:password@host`, hoặc payload `data:`. Cắt `?` và `#` không phải che toàn bộ URL nhạy cảm.
- `targets.list`, dòng **176–179**: trả kết quả `describeTarget` mà không áp dụng chính sách che của module. Chưa có nguồn hàm đó để xác nhận URL/query/title đã được che.
- `createReadOnlySender`, dòng **135**; `dom.query`, dòng **263**; `runProbe`/`fail`, dòng **158, 162–163**: selector được trả nguyên trong dữ liệu và log; lỗi dependency được đưa nguyên vào `detail`. Bí mật có trong selector hoặc thông báo lỗi đi thẳng ra báo cáo.

**4. LỖI ĐÚNG**

- `page.snapshot`, dòng **194–202**; `dom.query`, dòng **243–260**; `dom.tree`, dòng **283**: không quản lý việc mất hiệu lực `nodeId`. Navigation hoặc một probe đồng thời gọi `getDocument` có thể làm ID đang dùng hết hạn; một lần `describe` lỗi làm mất toàn bộ kết quả lượt dò. Chromium `getDocument` gọi `DiscardFrontendBindings`. [Mã Chromium](https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/core/inspector/inspector_dom_agent.cc).
- `dom.query`, dòng **250–254**: mọi lỗi CDP không phải `ProbeError` đều bị đổi thành `SELECTOR_INVALID`, kể cả mất kết nối, target đóng hoặc node hết hạn. Báo cáo quy sai nguyên nhân cho selector.
- `page.snapshot`, dòng **198–220**; `dom.query`, dòng **249–269**: phân trang chạy lại truy vấn mỗi lượt, không giữ một tập kết quả cố định. DOM thêm/xóa/đổi thứ tự giữa hai lượt khiến trùng hoặc bỏ sót; `total`/`matchCount` cũng có thể lệch trạng thái khi mô tả xong. Không thấy lỗi số học phân trang trên DOM đứng yên.
- `dom.tree`, dòng **283–293**; `shapeNode`, dòng **321–343**: `truncated` chỉ đánh dấu hết ngân sách node; cây bị cắt bởi `depth` vẫn có thể báo `truncated:false`, dù còn hậu duệ chưa trả.
- `runProbe`, dòng **152–153**: truy cập `deps.sendRaw` nằm ngoài `try`; gọi với `deps=null` làm Promise reject thay vì trả cấu trúc lỗi thống nhất.
- `dom.tree`, dòng **283–288**: `maxNodes` chỉ giới hạn sau khi Chrome đã dựng và truyền cây. Nó không chặn response lớn; tương tự `limit` không giới hạn số ID mà `querySelectorAll` thu thập.

**5. THIẾU ĐỂ DÙNG ĐƯỢC**

- `page.snapshot`, dòng **194–198**; `dom.query`, dòng **243–249**; `shapeNode`, dòng **337–343**: không truy vấn xuyên iframe/Shadow DOM; dựng cây chỉ duyệt `children`, bỏ `contentDocument` và `shadowRoots`. Báo cáo không khai báo rõ phạm vi bị bỏ, nên số khớp bằng 0 không chứng minh toàn trang không có phần tử. [CDP DOM](https://chromedevtools.github.io/devtools-protocol/tot/DOM/).
- `runProbe`, dòng **155**; `dom.query`, dòng **262–272**; `dom.tree`, dòng **289–296**: thiếu thời điểm quan sát, danh tính document/frame/session và phiên bản document; không đủ gắn bằng chứng với đúng trang, đúng lần tải.
- `page.snapshot`, dòng **192, 206**: metadata dùng `ctx.targetId`, còn DOM đi theo session đã được `sendRaw` gắn sẵn. Không kiểm hai bên cùng target; cấu hình lệch có thể ghép metadata trang A với phần tử trang B.
- `shapeNode`, dòng **327–335**: thiếu quan hệ tổ tiên ở kết quả phẳng, accessible name, trạng thái hiển thị và khả năng tương tác thực tế. `matchCount:1` chưa chứng minh đó là đúng nút AI định thao tác.
- `maskAttributes`/`cap`, dòng **361, 366–368**: giá trị bị cắt hoặc biến đổi chỉ nhận dấu `…`, không có cờ riêng phân biệt với dữ liệu thật. AI không thể coi các giá trị này là chuỗi chính xác để dựng selector.

