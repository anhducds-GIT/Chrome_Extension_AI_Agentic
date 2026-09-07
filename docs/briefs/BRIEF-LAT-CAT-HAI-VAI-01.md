---
kind: brief
status: active
ttl_days: 30
---

# BRIEF `LAT-CAT-HAI-VAI-01` — Lõi điều phối hai vai Assistant

> **Đức chốt 07/09: đây là ưu tiên số một.** Mọi task đang mở xếp sau.
> Đức cũng chốt: **phiên điều phối tự triển khai, tự kiểm, tự validate** — không chuyển phiên.

Đọc trước: [ADR-0017](../adr/0017-hai-vai-assistant-thay-the-mot-cua.md) ·
[ADR-0018](../adr/0018-cap-quyen-nguyen-tu-bang-ref-git.md) ·
[ADR-0019](../adr/0019-cua-tich-hop-kiem-quyen-tren-lich-su.md) (**còn `Proposed`**).

## 0. PHÁT HIỆN 07/09 — đổi vế ⑴ của ADR-0019, đo trước khi xây

ADR-0019 viết *"trên git đặt ở GitHub không có ngăn thật"*. **Sai.** Đo bằng `gh api`:

- `permissions.admin: true` → **branch protection cấu hình được**.
- `private: false` → repo **công khai**, nên GitHub Actions miễn phí.
- `branches/main/protection` → **404, chưa bảo vệ** (hiện trạng, không phải giới hạn).
- Required status check **không bắt buộc dùng Actions** — dịch vụ ngoài gửi trạng thái qua
  Commit Status API được (phiên Codex chỉ ra, tài liệu GitHub).

**Vế quyết định mà cả hai bên chưa nêu:** một status check **chỉ là hàng rào thật nếu thứ GỬI
trạng thái không phải thứ ĐANG BỊ kiểm.** Hai Assistant tự gửi "đạt" cho chính mình là tự khai,
không phải ngăn.

Nên ngăn thật cần **một bên thứ ba độc lập**, và bên rẻ nhất là **một workflow Actions duy nhất**
đọc sổ quyền rồi xác nhận thế hệ của commit đang vào — **một file, không phải một hệ CI**. Repo
cố ý không có CI mỗi lượt push; một phép kiểm quyền thì khác về cấp độ với một suite.

**KHÔNG tự bật branch protection.** Đó là đổi cấu hình bảo mật → phải Đức duyệt tường minh.

## 1. Việc — một lát cắt dọc, làm ở `C:\WORKING ZONE\Ark_Repo_Harness`

**Nguồn quyền có thẩm quyền → cấp quyền nguyên tử → kiểm kết quả → tích hợp.**

Trước khi chọn cách làm, phải khai bốn thứ:
- Ranh giới nào **chặn được**, ranh giới nào **dựa vào tuân thủ**.
- Kết quả gắn với **vai · phiên · phạm vi · thế hệ quyền** nào.
- Cách giữ **quyền + trạng thái đích + SHA kết quả** nhất quán *giữa lượt kiểm và lượt tích hợp*.
- **Mỗi retry/rebase phải kiểm lại**; thiếu dữ liệu thì **không báo hợp lệ** (fail-closed).

## 2. Sáu ca hành vi — dựng bằng hai checkout + một remote git cục bộ, NGOÀI repo

1. Xin quyền **đồng thời** → chỉ một bên được cấp; bên kia nhận **từ chối**, không nhận thành công.
2. Phiên **mất quyền quay lại** → kết quả bị từ chối, kèm lý do đọc được.
3. **Thu hồi chen giữa** lượt kiểm và lượt tích hợp → không lọt.
4. **Quyền cũ sau `fetch` + `rebase`** → vẫn bị từ chối. ⬅ **CA CHỊU TẢI** — đây là ca phiên Codex
   dựng ra và **bác được ADR-0018**; nó là ca duy nhất đã bác được một thiết kế đã viết.
5. **Đích đã đổi** khiến kết quả không còn tương thích → phải kiểm lại; **KHÔNG chặn chỉ vì
   checkout khác có việc đang dở** (chặn thế là chặn quá rộng).
6. **Một ca HỢP LỆ phải hoàn thành được.** Không có ca này thì năm ca trên chỉ chứng minh "chặn
   được mọi thứ".

**Ghim bộ nghiệm thu ĐỘC LẬP với mã đang sửa** — bản sửa không được tự thay tiêu chuẩn chấm mình.

## 3. Ngưỡng đạt — bốn vế cùng lúc

**Hoàn thành đầu ra đã định · trong thời hạn đã định · không vi phạm quyền hoặc làm mất việc ·
Đức phân xử 0 lần về điều phối.**

Ngưỡng *"Đức phân xử 0 lần"* một mình **lách được bằng cách đứng im**. Và thang đo này là thang đo
của chính [ADR-0004](../adr/0004-mot-cua-assistant-re-nhanh-va-giu-bao-cao-song.md): mô hình một
cửa đo được **0 lần/ngày**, phiên Đức mở tay đo được **3 lần/ngày**. Ngày 07/09 tái lập đúng con số
3. Phân xử một lần là mô hình mới **chưa thắng** cái nó thay.

**Đạt = "đạt lượt một", KHÔNG phải "kiến trúc đã được chứng minh".** N = 1.

## 4. Nơi xây ≠ nơi thử

| | Ở đâu |
|---|---|
| Mã dùng chung | `Ark_Repo_Harness` (ADR-0006: bộ khung là nơi phát hành) |
| Hai môi trường làm việc | **hai checkout của chính repo Extension** |
| Nghiệm thu cuối | repo Extension, việc thật |

Lỗi thì sửa **ở bộ khung** rồi cập nhật bản ghim; **không vá tại chỗ**.

## 5. Việc thử thật, sau khi lõi vượt sáu ca

**Cho cổng đọc cờ `frozen` rồi chọn đúng suite cần chạy.** Nó tự nhiên cần cả hai vai:
Hệ thống sửa cổng (`_code`); Sản phẩm là bên hưởng (lane đo 07/09: **52,4 giây / 330 phép kiểm**
của ba gói đóng băng, so với **2,3 giây / 8 phép** của gói sống) **và** bên chịu rủi ro (cửa Bridge
của Scouter học từ bản ChatGPT đã đóng băng — **phụ thuộc hành vi khác file**).

**Phạm vi là "chọn đúng suite mà vẫn giữ bảo vệ cần thiết".** Đừng mặc định *"đạt = bỏ được ba
suite"*: nếu phân tích hợp đồng cho thấy phải giữ một phần thì đó **vẫn là kết quả đúng**.

## 6. Cấm

- **Không tự bật/đổi branch protection** hay bất kỳ cấu hình bảo mật nào.
- **Không chuyển quy trình đang dùng** trước khi lõi vượt sáu ca — chuyển trước là để hai mô hình
  cùng sống, đúng thứ ADR-0017 cấm.
- **Không sửa `tests/role-firewall-smoke.mjs`** trước khi luật thay thế được viết ra.
- **Không dựng hệ đo mới.** Đo bằng hồ sơ đã có: Đức tự đếm số lần phân xử · mỗi vai ghi một dòng
  `HANDOFF.md` khi thật sự phải chờ · `safe-push` **đã in** mỗi lượt từ chối.
- **Không báo "kiến trúc đã được chứng minh"** sau một lượt.
