# HANDOFF — `workers/udin-optic/`

> Nhật ký của gói. Luật của gói: `v0.1.0/AGENTS.md` cạnh file này.
> Ghi thêm ở CUỐI, không sửa mục cũ. Trần một mục: 2.600 byte.

## Log

## 2026-09-15 · `claude-scouter-udine` — gói ra đời, và cái giá của nó được đo TRƯỚC khi trả

**Việc.** `T21` tách Udin Optic khỏi `duc-scouter`. Trước hôm nay nó sống trong `pilots/` của
chính Scouter, nên câu *"Scouter là bộ đồ nghề chung"* chưa bao giờ bị bắt chứng minh.

**Phép đo đã suýt không được làm.** Lộ trình `T21` viết 14/09 nói *"chép theo kiểu `hnx-fetch`"*
và đếm hai tệp: `transport.mjs` (576) và `bridge-core.mjs` (844). Vào việc mới thấy con số thật:
Udin dùng **5 lệnh GHI**, nên gói mới phải mang theo `scouter-probes.mjs` (1.181) và
`scouter-actions-core.mjs` (938) — **~2.100 dòng máy gắn debugger, tổng hợp phím chuột, và CÁI
PHANH**. `hnx-fetch` chưa bao giờ phải trả giá đó vì nó **không khai quyền `debugger`**.

Con số đó được đưa cho Đức kèm đường thứ hai (gói script, 0 dòng chép, chạy trên extension
Scouter). Đức chốt đường extension riêng, với lý do không nằm trong phép đo:

> *"Vì sau này Scouter sẽ còn thay đổi nhiều, ngoài ra UI của Udin Extension cũng sẽ bị thay đổi
> cho phù hợp usecase, do đó tách riêng sẽ hợp lý hơn."*

Đó là lý lẽ **tách rời nhịp thay đổi**. Nó đúng, và nó đổi bản chất bản chép: một bản *được phép
trôi* không phải fork — fork là hai bản trôi **mà không ai biết**.

**Nên cái giá đi kèm một tấm lưới.** `tests/be-mat-hep-smoke.mjs` khối ⑷ băm **bảy tệp chép** và
đỏ khi lệch; muốn khác thật thì khai `CO_Y_KHAC` kèm lý do. Bốn tệp CỐ Ý khác — `bridge-core` ·
`manifest` · `sidepanel.*` · `background` — không bị ghim, vì đó đúng là chỗ Đức nói sẽ đổi.

**Gói hẹp hơn Scouter, đo được:** 12 lệnh (Scouter 24) · 5 lệnh ghi (11) · một trang thay vì
`<all_urls>` · `scout.fetch` và `scout.reload` **không tồn tại**. Quyền `debugger` thì giống —
đó là chiều duy nhất không hẹp lại được, và là lý do bảy tệp kia phải bị ghim.

**Đã xong:** 10 tệp logic `git mv` sang `tu-dong/`, chỉ đổi dòng `import` và đường dẫn trong ghi
chú · vỏ `goi-bridge` riêng (`udin-optic.bridge` · `UDIN_GHEP` · `UDIN_GHE`) · manifest · host vỏ
mỏng · 7 phép ghim xanh · suite Scouter còn **31 xanh và không còn Udin**.

**CHƯA làm:** chưa một lượt chạy thật nào từ extension này — đó là chặng ④, và nó cần Đức nạp
extension rồi bật công tắc.
