---
kind: study
status: superseded
ttl_days: 180
---

# Brief V0.2-B — STATUS anti-drift

> **Chốt bởi:** GPT + Claude, 2026-08-27. Phạm vi ĐÓNG.
> **Người giữ `_root`:** `opus-platform-2`. **Người code:** Codex.
> **KHÔNG làm `feature-parity.mjs` trong patch này.** Việc riêng, audit riêng.

## Vì sao

`STATUS.md` là lời khai của **người**. Nếu nó chứa số mà **máy đã đo được ở chỗ khác**, số đó
sẽ mục — chắc chắn, chỉ là chậm hay nhanh. Chuyện này **đã xảy ra thật**: bản STATUS đầu tiên
ghi tay "Bridge (22 lệnh)", "Bridge (19 lệnh)", "nợ 6 tính năng + 3 method". GPT audit 27/08
bắt được, V0.1.1 dọn tay. Patch này cho **máy** giữ luật đó.

## Nguyên tắc quyết định phạm vi — đọc kỹ, đây là phần dễ làm hỏng nhất

**TUYỆT ĐỐI KHÔNG cấm mọi chữ số trong STATUS.** Detector rộng là detector vô dụng: nó báo
oan, người ta tắt nó đi, và luật lại thành chữ.

Chia làm hai nhóm theo **ngữ nghĩa**, không theo hình dạng chữ số:

| Nhóm | Xử lý | Vì sao |
|---|---|---|
| **Machine-owned facts** — số mà repo đã có **nguồn máy đo** | **CẤM** → bắt trỏ sang `DASHBOARD.md` / `FEATURE-PARITY.md` | Có hai nguồn cho một sự thật thì sớm muộn hai nguồn nói khác nhau |
| **Verification facts · safety limits · task IDs** | **CHO PHÉP** | Đây là *lời khai* và *thông tin operator cần*, không phải phép đo. Schema hiện tại **chủ động yêu cầu** chúng |

### CẤM — machine-owned facts

Chỉ đúng bốn loại này, mỗi loại đều có nguồn máy đo có thật trong repo:

| Loại | Ví dụ phải bắt | Nguồn máy |
|---|---|---|
| Số lệnh Bridge | `22 lệnh`, `19 method`, `Bridge (22 lệnh)`, `19 lệnh Bridge` | cột **Method Bridge [ĐO]** |
| Số file test | `94 test`, `81 file test`, `79/79 test` | cột **File test [ĐO]** |
| Version viết tay | `version 0.3.0`, `bản 0.2.0` | cột **Version [ĐO]** (đọc từ `version_source`) |
| Số món nợ parity | `nợ 6 tính năng`, `3 method còn thiếu`, `6 tính năng + 3 method` | `FEATURE-PARITY.md` |

### CHO PHÉP — phải có test true-negative cho TỪNG loại

Đây là danh sách **có thật, lấy từ hai STATUS đang nằm trong repo**. Dùng nguyên làm fixture:

```
2026-08-26   3/3   5/5   9/9   90 giây   B-14   B-15   B-17   B-19   B-21
v0.1.0   v0.2.0   V0.3   00d1f99   dd3c736   (SHA 40 ký tự)
```

- **Ngày kiểm chứng** `YYYY-MM-DD` — bắt buộc theo schema.
- **SHA** 7 hoặc 40 ký tự hex.
- **Mã việc** `B-17`, và dải `B-14…B-21`.
- **Kết quả bằng chứng** dạng tỉ số: `3/3`, `5/5`, `9/9`, `18/18`. **Đây là lời khai kết quả
  kiểm chứng, không phải phép đo repo** — schema đòi `last_verified_how` phải nói rõ kiểm
  bằng cách nào và được bao nhiêu.
- **Giới hạn vận hành** kèm đơn vị: `90 giây`, `1054 ms`, `3,5MB`. Đức **cần** biết những số
  này trước khi chạy việc lớn; giấu đi là làm tài liệu tệ hơn.
- **Số phiên bản trong đường dẫn / tên riêng**: `v0.1.0/`, `workers/.../v0.2.0/`, và cả
  `"Duc Auto ChatGPT V0.3"` khi đang **trích dẫn một tiêu đề sai** (STATUS Gemini giới hạn 4).
- **Số mục / số vòng**: `mục 6`, `V0.1`, `vòng 3`.

> Chạy detector trên hai `STATUS.md` đang có trong repo **phải ra 0 cảnh báo**. Ra dù chỉ một
> cái là detector sai, không phải STATUS sai.

## Thiết kế detector

**Neo vào DANH TỪ, không neo vào chữ số.** Mẫu phải là *số đứng cạnh một danh từ machine-owned*
(`lệnh` · `method` · `methods` · `Bridge` · `test` · `file test` · `version` · `bản` · `tính năng`),
không phải "có chữ số". Neo vào chữ số là con đường thẳng tới báo oan.

**Trước khi quét, bỏ ra khỏi văn bản:**
- khối code ```` ``` ```` và code span `` ` ` ``;
- **đích của link markdown** `](...)` — mọi đường dẫn đều chứa `v0.1.0`;
- giá trị của `version_source` và mọi khoá `ref_*` trong frontmatter (là đường dẫn, không phải văn xuôi).

**Quét cái gì:** thân bài + hai trường frontmatter tự do là `current_focus` và
`last_verified_how`. Không quét các trường còn lại.

**Ưu tiên: nếu đã bắt được, hãy đối chiếu.** Generator *đã biết* số thật (nó vừa đếm xong).
Với số lệnh Bridge và số file test, thông báo nên nói luôn số máy đo được. Khớp hay lệch đều
**đỏ như nhau** — khớp hôm nay thì mai vẫn mục — nhưng lệch thì thông báo phải nói rõ là
**đã mục rồi**, vì đó là hai mức khẩn cấp khác nhau với người đọc.

**Thông báo (tiếng Việt) phải có đủ:** file + dòng · chuỗi bị bắt · vì sao cấm · **trỏ đi đâu
thay thế**. Ví dụ:
`workers/duc-auto-gemini/v0.2.0/STATUS.md:33: "19 lệnh" là số máy đã đo (hiện máy đếm được 19).
Đừng ghi tay — trỏ sang cột "Method Bridge [ĐO]" trên DASHBOARD.md.`

**Đỏ thế nào:** cùng đường với các luật validate sẵn có — gom hết lỗi rồi `exit 1`, không dừng
ở lỗi đầu. Áp cho cả lần sinh thường lẫn `--check`.

## Deliverables — đúng 3 file

| # | File | Việc |
|---|---|---|
| 1 | `scripts/build-dashboard.mjs` | detector + nối vào đường validate sẵn có; export hàm thuần để test gọi |
| 2 | `tests/build-dashboard-smoke.mjs` | ca ghim (bên dưới) |
| 3 | `STATUS.template.md` | sửa **Luật số 0** cho khớp detector |

**KHÔNG đụng** `scripts/session-check.mjs`, `scripts/safe-push.mjs`, `*.js` của extension,
`FEATURE-PARITY.md`, và **không sửa nội dung hai `STATUS.md`** — chúng đã sạch từ V0.1.1; nếu
detector kêu chúng thì lỗi ở detector.

### Về file 3 — mâu thuẫn cần sửa

`STATUS.template.md` hiện có **hai chỗ nói ngược nhau**, do tôi viết:
- **Luật số 0** bảo *"thấy chữ số nào máy đếm được thì xoá"* — quá rộng;
- **Phần 2 (thân bài)** lại yêu cầu *"kiểm bằng cách nào, con số bao nhiêu"*.

Viết lại Luật số 0 theo đúng hai nhóm ở trên: liệt kê rõ **cấm gì** và **cho phép gì**, và nói
thẳng rằng máy chỉ bắt nhóm machine-owned. Đừng xoá yêu cầu ở Phần 2 — nó đúng.

## Test ghim — cả hai chiều, chiều nào cũng bắt buộc

**True positive (phải ĐỎ), mỗi loại một ca:**
1. `Bridge (22 lệnh)` trong thân bài.
2. `81 file test` trong thân bài.
3. `version 0.3.0` viết tay trong thân bài.
4. `nợ 6 tính năng + 3 method` trong `current_focus`.
5. Thông báo phải nêu **chuỗi bị bắt** và **chỗ trỏ đi thay thế**.

**False-positive protection (phải XANH) — đây là nửa quan trọng hơn:**
6. Toàn bộ bộ mẫu hợp lệ ở trên trong một STATUS: ngày, SHA 7 và 40 ký tự, `B-17`, `B-14…B-21`,
   `3/3`, `5/5`, `9/9`, `90 giây`, `1054 ms`, `mục 6`, `V0.1`, `vòng 3` → **0 cảnh báo**.
7. Đường dẫn chứa `v0.1.0` / `v0.2.0`, cả trong link markdown lẫn trong `version_source`/`ref_*`
   → **0 cảnh báo**.
8. Trích dẫn tiêu đề sai `"Duc Auto ChatGPT V0.3"` → **0 cảnh báo**.
9. **Ca hồi quy trên repo thật:** chạy detector trên hai `STATUS.md` đang có → **0 cảnh báo**.
   Ca này ghim đúng lời hứa "không báo oan" bằng dữ liệu thật, không bằng fixture tự chế.

## Luật cũ vẫn áp

Node thuần, không thêm gói. Deterministic. `buildDashboard` vẫn phải **thuần**. Git gọi kèm
`-c core.quotepath=false`. Đường dẫn resolve bằng `fileURLToPath`. Chữ operator: tiếng Việt.

## Xong thì

`npm test` xanh (suite hiện 26 ca) · `session-check --as <nhãn>` xanh toàn bộ ·
`build-dashboard.mjs --check` vẫn exit 0 · **mutation test**: phá từng luật mới, ca tương ứng
phải đỏ. **Và phá cả chiều ngược:** nới detector cho nó bắt luôn `3/3` hoặc `90 giây` →
ca false-positive phải đỏ. Test giả là thứ repo này sợ nhất; ở đây nó có **hai** dạng — bắt
hụt, và báo oan.

> **Mutation test phải tự chứng minh nó đã sửa được file.** Ngày 27/08 một phép phá ra "xanh"
> chỉ vì lệnh sửa file chưa hề áp dụng. Assert rằng chuỗi cần phá **có thật** trước khi chạy.
