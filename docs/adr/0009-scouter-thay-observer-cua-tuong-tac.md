---
status: Accepted
adr: 0009
date: 2026-09-06
deciders: Đức
---

# ADR-0009 — Scouter thay Observer: từ cửa quan sát thành bộ khung tương tác tự hoàn thiện

## Bối cảnh

[ADR-0007](0007-observer-la-cua-bang-chung-cho-ai.md) chốt ngày 06/09 rằng Observer V0 là **cửa
bằng chứng read-only** cho AI, và đặt bất biến số một: *"nhận một bộ từ vựng cố định các phép
dò read-only, không bao giờ nhận biểu thức tự do từ bên ngoài."*

Cùng ngày, sau khi bốn phép dò đầu tiên chạy được, Đức mở rộng phạm vi. Thứ Đức cần không phải
một con mắt, mà một thứ **chạm vào được**: một extension biết tự dò, tự sửa mình, và dần trở
thành adapter riêng cho một trang cụ thể.

Tên "Observer" nói *nhìn*. Việc mới là *hành động*. Và bất biến số một của ADR-0007 chặn đúng
thứ Đức vừa yêu cầu — vòng tự cải tiến chính là code từ bên ngoài đi vào. Không sửa được
ADR-0007 (ADR đã Accepted là bất biến), nên nó bị thay.

## Quyết định

**Observer đổi tên thành `Scouter` và đổi bản chất: từ công cụ quan sát read-only thành bộ khung
tương tác đầy đủ quyền, tự hoàn thiện qua từng vòng.** Đức chốt 06/09.

**⑴ Quyền: `<all_urls>`.** Cộng `debugger` · `scripting` · `tabs` · `storage` · nối
`127.0.0.1`. Đức chốt sau khi được trình bày phương án hẹp hơn (danh sách trắng theo tab) và
từ chối nó. Đây là quyết định có ý thức, không phải mặc định.

**⑵ Ba tầng, và mỗi tầng nhân bản khác nhau.**

| Tầng | Có mấy bản | Chứa gì |
|---|---|---|
| **Seed** | **đúng một, dùng chung** | năng lực đúng với mọi trang |
| **Adapter** | mỗi URL một cái | selector · thứ tự thao tác · dấu hiệu "xong" · lỗi riêng của trang |
| **Ghi chép** | mỗi lượt một cái | nguyên liệu để sinh ra adapter |

**Không clone seed.** Clone rồi tự sửa bản clone là bệnh mà [ADR-0006](0006-goi-assistant-phat-hanh-tu-bo-khung.md)
đã ghi ra: năm bản trôi khác nhau, và lần "đồng bộ ngược" không bao giờ xảy ra. Luật đi kèm:
*adapter nào sửa ra thứ không riêng của trang nào thì thứ đó phải được đưa lên seed.*

**⑶ Seed đầy đủ NĂNG LỰC từ đầu, không đầy đủ HIỂU BIẾT VỀ TRANG.** Đức chốt: seed mỏng năng
lực thì mỗi adapter tự chế lại cùng một thứ, mỗi lần một kiểu. Năng lực (xếp hàng việc · dừng
khẩn · luật thử lại · không làm hai lần · quy trách nhiệm · ghi bằng chứng · bảng mã lỗi · cửa
Bridge · chế độ phát triển) vào seed ngay. Selector và thao tác riêng của trang thì không.

**⑷ Một Scouter một URL.** Không chạy nhiều cái cùng lúc. Đa profile và đa cổng để sau, khi đã
có thứ thật để nhân bản. Quyết định này bỏ luôn bài toán tranh tab: Chrome chỉ cho **một
debugger cắm vào một tab tại một thời điểm**.

**⑸ Hình dạng thật của vòng tự cải tiến.** Một extension **không tự ghi đè được code của chính
nó** — Chrome không có cửa nào cho việc đó. Vòng vẫn chạy được, với chân chạy nằm ở Bridge:

> Scouter quan sát và ghi chép → **Bridge ghi code mới xuống đĩa** → `chrome.runtime.reload()`
> nạp lại chính nó → vòng tiếp theo.

Nên **seed** đúng nghĩa là bộ nhỏ nhất biết ba việc: quan sát · báo cáo qua Bridge · tự nạp lại
mình. AI viết code đứng ở ngoài. **Người thực thi không nhất thiết là Claude** — việc của lượt
này là dựng **core + protocol** cho AI bất kỳ dùng sau.

**⑹ Đường đi: v0.1 từ code đã có, không viết mới từ số không.** Lấy extension Observer hiện tại
làm nền, bỏ phần chết, nối cửa Bridge, thêm tự nạp lại. Rồi pilot vài trang. Rồi hoàn thiện lên
v1 bằng cách bóc năng lực đã chín từ ba worker.

**⑺ Cổng kiểm kê trước khi xây.** Việc đầu tiên **không phải viết code** mà là bảng kiểm kê
năng lực hai trục: ba worker đang dùng gì · Chrome cho phép gì mà ta chưa dùng. Bảng đó thành
tiêu chuẩn nghiệm thu của seed, và Đức nhìn bảng rồi mới quyết làm tới đâu.

## Hệ quả

**Được.** Scouter làm được việc thật: nó tương tác, nó học một trang, nó để lại adapter dùng
lại được. Vòng tự cải tiến biến việc "AI dò selector" từ một lượt thủ công thành một cơ chế.

**Mất — và đây là cái mất lớn nhất, ghi thẳng.** Observer hôm nay **không thể gây hại**; đó là
toàn bộ giá trị của nó với tư cách nguồn bằng chứng độc lập. Scouter thì có thể. Với
`<all_urls>` cộng `debugger`, nó đọc và ghi được **mọi tab đang mở**, gồm mọi trang Đức đang
đăng nhập. Không còn hàng rào kỹ thuật nào; hàng rào duy nhất còn lại là code của chính nó.

**Đổi luật áp dụng.** Từ lúc Scouter bấm được nút, nó là **kẻ hành động**, không phải người
quan sát. Bốn luật an toàn của repo (thử lại · dừng khẩn · quy trách nhiệm · không làm hai lần)
áp cho nó y như ba worker kia. Đổi các luật đó vẫn phải hỏi Đức (`AGENTS.md` mục 2).

**Chrome sẽ hiện dải băng cảnh báo** *"… đang gỡ lỗi trình duyệt này"* ở tab nào Scouter cắm
vào. Không giấu được, và không nên giấu.

**Cạnh tranh với ưu tiên đang có.** Với định nghĩa "đầy đủ năng lực", Scouter v1 là một
extension ngang tầm ba worker — việc lớn, và nó cạnh tranh trực tiếp với ưu tiên Đức đặt từ
đầu: đóng nốt 46 mục nợ trước khi triển khai. Cổng kiểm kê ở mục ⑺ tồn tại đúng để Đức cân
hai thứ đó **trên một danh sách, không phải trên ước lượng của AI**.

**Chưa quyết:** chính sách che dữ liệu khi ghi báo cáo xuống đĩa (treo từ ADR-0007, chưa được
gỡ), và chỗ đặt thư mục Scouter trong cây repo.

## Trạng thái

Accepted
