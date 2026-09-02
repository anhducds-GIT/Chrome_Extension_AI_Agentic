# MP-GATE-R01 — Cổng tay multi-profile: ĐẠT trên cả 3 extension

**Ngày đo:** 2026-09-02 · **Phiên:** `claude-mp-gate` · **HEAD lúc đo:** `f455bfb`
**Toàn lệnh ĐỌC. 0 credit. Không sinh video, không sinh ảnh, không đụng hàng đợi.**

## Việc này là gì

Việc ưu tiên #1 của repo (khai ở `llms.txt`, `DASHBOARD.md`, `repo-map.json`) ghi:

> Đức làm tay: reload extension ở TỪNG profile (hết legacy) + điền ô "Tên hồ sơ Chrome này"
> từng panel; rồi AI gọi `bridge.sessions` đếm đủ tên.

Đây là bản ghi của **nửa sau** — phần AI làm. Nửa đầu (tay Đức) đã xong trước lúc đo.

## Kết quả một dòng

**Đức đã reload + đặt tên xong cả ba nhánh. Ba hồ sơ `Bình` · `anhducds` · `kaito` cùng nối,
đều `legacy:false`, tên dùng được làm `--target`.** Còn đúng **một ghế legacy** ở nhánh
Flow Video — chờ Đức quyết.

## Số đo

| Nhánh | Cổng | Số phiên | Tên đọc được | Legacy còn lại | File thô |
|---|---:|---:|---|---:|---|
| Duc Auto ChatGPT `0.3.0` | 32147 | 3 | Bình · anhducds · kaito | **0** | [`sessions-chatgpt-32147.json`](sessions-chatgpt-32147.json) |
| Duc Auto Gemini `0.2.0` | 32148 | 3 | anhducds · Bình · kaito | **0** | [`sessions-gemini-32148.json`](sessions-gemini-32148.json) |
| Duc Auto GG Flow Video `0.1.0` | 32149 | 4 | Binh · anhducds · kaito | **1** | [`sessions-gg-flow-video-32149.json`](sessions-gg-flow-video-32149.json) |

Mỗi phiên không-legacy đều khai đủ `worker` + `extension_version` — nghĩa là **transport mới
đã thực sự nạp trong RAM**, không phải bản cũ 28/08 còn sống. Đó là điều lần đo MP-01 (02/09)
chưa có: khi đó cả 3 ghế đều `legacy:true`.

## Phép kiểm thêm mà MP-01 chưa làm: tên có DÙNG ĐƯỢC không

MP-01 chứng minh định tuyến chạy bằng `instance_id`. Lần này kiểm bằng **tên người đặt** —
vì tên mới là thứ Đức và AI thực sự gõ.

| Lệnh | Kết quả | File |
|---|---|---|
| `system.ping` **không nêu** `--target` | **Từ chối** `TARGET_AMBIGUOUS`, liệt kê đủ **4** ứng viên (kể cả ghế legacy) | [`ping-no-target.json`](ping-no-target.json) |
| `system.ping --target Binh` | `ok:true`, `served_by.label = "Binh"`, `instance_id = e08e1d6a…` | [`ping-target-Binh.json`](ping-target-Binh.json) |
| `system.ping --target anhducds` | `ok:true`, `served_by.label = "anhducds"`, `instance_id = be1dd2d0…` | [`ping-target-anhducds.json`](ping-target-anhducds.json) |
| `system.ping --target kaito` | `ok:true`, `served_by.label = "kaito"`, `instance_id = d8c543ee…` | [`ping-target-kaito.json`](ping-target-kaito.json) |

Mỗi `served_by.instance_id` khớp đúng dòng tương ứng trong `bridge.sessions`. **Fail-closed
vẫn đúng:** không nêu đích thì host từ chối, không tự đoán.

## Một việc còn mở — CẦN ĐỨC QUYẾT

Nhánh Flow Video còn **một ghế `legacy:true`**, `instance_id` `legacy:ea6c1300…`, không tên,
không khai worker. Đây là **profile Chrome thứ tư** (`claims.json` gọi là "Profile 9"). Nó vẫn
nhắm được và vẫn fail-closed, nhưng **id đổi mỗi lần service worker ngủ dậy** nên không đặt lịch
theo nó được.

Hai lựa chọn, Đức chọn một:
1. **Dùng nó** → mở Chrome profile đó, reload extension GG Flow Video, điền ô "Tên hồ sơ Chrome này".
2. **Không dùng** → tắt/gỡ extension ở profile đó cho sạch danh sách.

## Đọc kèm

- Lần đo trước (định tuyến, còn toàn legacy): [`../../workers/duc-auto-gg-flow-video/v0.1.0/evidence/MP-01-live-routing-and-audit-20260902.md`](../../workers/duc-auto-gg-flow-video/v0.1.0/evidence/MP-01-live-routing-and-audit-20260902.md)
- Thiết kế: [`../../docs/studies/BRIDGE-MULTIPROFILE-DESIGN-V1.md`](../../docs/studies/BRIDGE-MULTIPROFILE-DESIGN-V1.md)

## Cách chạy lại (ai cũng kiểm lại được)

```
cd workers/duc-auto-gg-flow-video/v0.1.0 && node scripts/bridge-rpc.mjs bridge.sessions
cd workers/duc-auto-gemini/v0.2.0        && node scripts/bridge-rpc.mjs bridge.sessions
cd "C:/WORKING ZONE/Chrome Extension Bridge/duc-auto-chatgpt" && node bridge-cli.mjs sessions --pairing ./duc-auto-chatgpt-bridge-pairing-v1.json
```
