# STATUS.template.md — khuôn mẫu cho extension mới

> Chép file này thành `STATUS.md` đặt **cạnh `manifest.json`** của extension mới,
> rồi điền. Xoá hết chú thích khi điền xong.
>
> **Vì sao có file này:** dashboard ở gốc repo (`DASHBOARD.md`) do **máy sinh ra** từ
> các `STATUS.md`. Không có `STATUS.md` thì extension của bạn vẫn hiện trên dashboard,
> nhưng gắn nhãn **"CHƯA KHAI STATUS"** — tức là ai nhìn cũng biết nó chưa được khai báo.
>
> **Ranh giới, quan trọng nhất:** STATUS là trạng thái **vận hành**, không phải nơi chứa
> mọi kiến thức. Kiến trúc, cách dùng, bảng lỗi, hướng dẫn dài → **chỉ trỏ link**, không chép.
> STATUS phình thành README thứ hai là hỏng — vì hai chỗ nói cùng một điều thì sớm muộn
> nói khác nhau, và đó đúng là bệnh mà platform này sinh ra để chữa.

---

## Phần 1 — Frontmatter (máy đọc)

Chép nguyên khối dưới đây vào **đầu** `STATUS.md`, giữa hai dòng `---`.
Chỉ dùng `khoá: giá trị` một tầng. Không lồng nhau, không danh sách.

```yaml
---
schema: extension-status/v2
id: ten-thu-muc-package
name: Tên Người Đọc Được
lifecycle: building
owner: ten-nguoi-hoac-phien-chiu-trach-nhiem
priority_rank: 1   # so nguyen >= 1. DUNG MOT don vi trong ca repo duoc mang hang 1.
next_step: "mot cau: viec ke tiep cua don vi nay"
human_action: "mot cau: viec dang cho tay Duc — hoac ghi khong neu khong co gi cho"
# superseded_by: workers/.../vX.Y.Z   # BAT BUOC khi lifecycle: superseded
# depends_on: workers/.../vX.Y.Z       # khong bat buoc
version_source: workers/ten-thu-muc-package/vX.Y.Z/manifest.json
last_verified: 2026-08-26
last_verified_commit: 0000000000000000000000000000000000000000
last_verified_how: "một dòng: kiểm bằng cách nào"
evidence_ref: workers/ten-thu-muc-package/vX.Y.Z/evidence/....md
current_focus: "một câu: việc đang mở quan trọng nhất"
ref_readme: workers/ten-thu-muc-package/vX.Y.Z/README.md
ref_handoff: workers/ten-thu-muc-package/vX.Y.Z/HANDOFF.md
---
```

### `human_action` — việc chờ tay Đức

Đây là trường **duy nhất** trên bảng trạng thái mà Đức đọc để biết *"tôi phải làm gì"*.

- Có việc chờ Đức → viết **một câu tiếng Việt có dấu, không thuật ngữ**. Đức đọc câu này
  rồi đi làm luôn, nên đừng viết "reload ext + fill profile name field".
- Không có gì chờ → ghi đúng chữ **`không`**.
- **Đừng để trống.** Trống thì bảng không phân biệt được *"không có gì"* với *"chưa ai trả
  lời câu đó"* — và hai thứ đó khác nhau hoàn toàn.

Vì sao tách khỏi `next_step`: `next_step` là việc của phiên AI kế tiếp. Trước khi có trường
này, việc chờ Đức nằm **lẫn** trong câu đó, nên bảng phải đoán từ chữ — mà đoán thì luật vàng
1 cấm. Kết quả: ô "Đức cần làm" trên bảng bỏ trống trong khi thực tế có ba việc đang chờ.



### Từng trường nghĩa là gì

| Trường | Bắt buộc? | Điền gì | Máy kiểm gì |
|---|---|---|---|
| `schema` | ✅ luôn | đúng chuỗi `extension-status/v2` | sai chuỗi → **đỏ** |
| `id` | ✅ luôn | trùng **tên thư mục** package | — |
| `name` | ✅ luôn | tên cho người đọc | — |
| `lifecycle` | ✅ luôn | một trong enum bên dưới | ngoài enum → **đỏ** |
| `version_source` | ✅ luôn | đường dẫn tới file đánh dấu đơn vị (`units.marker` trong `.repo-structure.json` — repo này là `manifest.json`), tính **từ gốc repo** | không tồn tại / không phải JSON → **đỏ** |
| `last_verified` | ✅ nếu `active` | ngày `YYYY-MM-DD` kiểm chứng gần nhất | có nó mà thiếu `evidence_ref` → **đỏ** |
| `last_verified_commit` | nên có | **full SHA 40 ký tự** | sai dạng, hoặc repo không có commit đó → **đỏ** |
| `last_verified_how` | nên có | một dòng: kiểm bằng cách nào | — |
| `evidence_ref` | ✅ nếu có `last_verified` | file bằng chứng, đường dẫn từ gốc repo | file không tồn tại → **đỏ** |
| `current_focus` | ✅ luôn | **một câu**, việc đang mở quan trọng nhất | — |
| `ref_readme` | ✅ luôn | con trỏ canonical | file không tồn tại → **đỏ** |
| `ref_handoff` | ✅ luôn | con trỏ canonical | file không tồn tại → **đỏ** |
| `ref_runbook` | tuỳ chọn | hướng dẫn vận hành, nếu có | file không tồn tại → **đỏ** |
| `ref_backlog` | tuỳ chọn | sổ việc còn mở, nếu có | file không tồn tại → **đỏ** |

**Đừng khai `ref_backlog` nếu package chưa có sổ.** Khai bừa thì generator đỏ, và đỏ đúng.

### `lifecycle` — chọn một

| Giá trị | Nghĩa |
|---|---|
| `idea` | mới là ý tưởng, chưa có code |
| `building` | đang dựng, chưa dùng được |
| `active` | đang dùng thật — **bắt buộc có `last_verified`** |
| `paused` | tạm dừng, sẽ quay lại |
| `archived` | nghỉ hẳn, giữ lại để tra cứu |
| `experimental` | thử nghiệm, đừng tin vào nó |
| `unclassified` | chưa xếp loại |

### Luật số 0 — phân biệt số máy giữ và số lời khai

Máy chỉ cấm bốn nhóm **machine-owned**: số lệnh Bridge · số file test · version viết tay ·
số món còn nợ parity. Không viết các số đó vào STATUS, kể cả trong phần thân cho Đức đọc.
Trỏ sang [`DASHBOARD.md`](DASHBOARD.md) cho số Bridge, file test và version; trỏ sang
[`FEATURE-PARITY.md`](FEATURE-PARITY.md) cho số món nợ giữa hai nhánh.

Các số là **lời khai hoặc thông tin operator cần** vẫn được phép và nên giữ: ngày kiểm chứng;
SHA 7 hoặc 40 ký tự; mã việc như `B-17`; kết quả kiểm như `3/3`, `18/18`; giới hạn vận hành
như `90 giây`, `1054 ms`, `3,5MB`; version nằm trong đường dẫn hoặc tên riêng; số mục và số
vòng. Phần 2 vẫn phải nói rõ kiểm bằng cách nào và con số bao nhiêu. Detector chỉ bắt bốn
nhóm machine-owned ở trên, không bắt mọi chữ số.

Lý do không phải lý thuyết: **bản V0.1 đầu tiên của chính hai STATUS pilot đã vi phạm** —
chúng ghi tay "Bridge (22 lệnh)", "Bridge (19 lệnh)", "nợ 6 tính năng + 3 method". GPT audit
27/08 bắt được. Số đó đúng lúc viết, và sẽ sai đúng vào lần port tiếp theo. Đây chính xác là
căn bệnh platform này sinh ra để chữa, và nó tái phát ngay trong file dựng ra để chữa nó.

**Cách thử nhanh:** đọc lại STATUS, nếu số đang lặp lại một trong bốn phép đo machine-owned
thì xoá và trỏ sang nguồn máy. Không xoá số kiểm chứng, giới hạn an toàn hay mã việc.

> **Về các đường dẫn ví dụ bên dưới.** Chúng dùng hình dạng của repo NÀY
> (`workers/<gói>/<phiên-bản>/manifest.json`). Repo của bạn khai hình dạng khác trong khối
> `units` của `.repo-structure.json` thì thay cho khớp — ví dụ `packages/<tên>/package.json`,
> hoặc chỉ `package.json` nếu repo không có đơn vị con. Chép nguyên si sang một repo hình dạng
> khác là cổng kiểm báo đỏ ở `version_source`.

### Ba luật máy ép, đừng tìm cách lách

1. **Không gõ tay số version.** Máy đọc từ `version_source`. Lý do có luật này:
   `workers/<gói>/v0.1.0/manifest.json` thật sự ghi version `0.3.0` — thư mục
   nói một đằng, manifest nói một nẻo. Ai gõ tay thì chép nhầm cái nào cũng được.
2. **Khai "đã kiểm chứng" thì phải có bằng chứng.** `last_verified` mà không có
   `evidence_ref` trỏ tới **file có thật** → generator **đỏ**, dashboard không sinh ra được.
3. **Commit mới ≠ đã kiểm chứng.** Máy **tự đo** cột "Code đổi sau kiểm chứng?" bằng cách so
   code hiện tại với `last_verified_commit`. Cột đó `CÓ` không chặn build — nó chỉ nói thẳng
   ra rằng lời khai của bạn đã cũ so với code.

---

## Phần 2 — Thân bài (Đức đọc)

Dưới frontmatter. **Tiếng Việt, câu ngắn, tối đa một trang màn hình.**
Bốn mục dưới đây là tối thiểu — mục nào không có gì để nói thì viết "chưa có", đừng bịa.

```markdown
## Ý tưởng ban đầu
Bài toán có thật nào sinh ra thứ này. 2–4 câu. Không thuật ngữ.

## Mục đích
Nó làm gì, cho ai, chạy ở đâu. 2–4 câu.

## Đã kiểm chứng tới đâu
Kiểm bằng cách nào, con số bao nhiêu, bằng chứng nằm ở file nào (có link).
Chưa kiểm live thì nói thẳng "chưa kiểm live" — đừng để người đọc tự suy ra.

## Giới hạn đã biết
Những gì người dùng nên biết TRƯỚC khi tin tưởng chạy việc lớn. Đánh số.
Đây là mục dễ bỏ trống nhất và cũng là mục đắt nhất.

## Đọc sâu ở đâu
Bảng "cần gì → mở file nào". Chỉ link. Không chép nội dung file khác vào đây.
```

---

## Phần 3 — Làm xong thì còn 3 việc

1. Khai `STATUS.md` một dòng vào **Bản đồ file** trong `AGENTS.md` của package.
   Không khai = không tồn tại.
2. Chạy `node scripts/build-dashboard.mjs` — nó sẽ **đỏ và nói rõ sai gì** nếu bạn khai
   thiếu hoặc khai vào file ma. Xanh thì `DASHBOARD.md` tự cập nhật, commit kèm.
3. Chạy `node scripts/session-check.mjs --as <nhãn-phiên-của-bạn>` trước khi nói "xong".

> **`DASHBOARD.md` không bao giờ sửa tay.** Muốn đổi thứ hiện trên đó thì sửa `STATUS.md`
> này rồi sinh lại. Gõ tay vào file sinh ra thì lần sinh sau mất sạch — và tệ hơn, trong
> lúc chưa mất thì nó nói sai.
