# PLATFORM.md — Extension Operation Platform V0.1

> **Đọc file này khi:** muốn biết repo có những extension nào, cái nào dùng được, và thêm
> cái mới thì làm sao. Luật chung của repo nằm ở [`AGENTS.md`](AGENTS.md) — file này không
> chép lại luật, chỉ nói về **vận hành nhiều extension trong một repo**.

## 1. Vì sao có platform này

Repo có 3 extension. Trước V0.1, không có chỗ nào trả lời nhanh cho Đức sáu câu:

> *Có gì? · Trạng thái ra sao? · Đã kiểm chứng chưa? · Dùng làm gì? · Tiếp theo làm gì? · Đọc sâu ở đâu?*

Thử trả lời bằng tài liệu gõ tay thì **hỏng hai lần trong đúng một ngày (26/08)**:

- `BACKLOG.md` ghi Gemini còn thiếu `run.stop` / `chat.reload` — thực tế đã port xong.
  Không ai cố ghi sai; chỉ là không có gì buộc sổ phải cập nhật theo code.
- Trang dashboard gõ tay sai **bốn con số** sau đúng một ngày (tổng test, số lệnh Bridge,
  số việc còn mở, số món nợ port).

Kết luận rút ra, và là nguyên tắc số 1 của platform: **thứ gì máy đếm được thì máy đếm.**

## 2. Platform V0.1 gồm đúng hai thứ

| Thứ | Ai viết | Là gì |
|---|---|---|
| `STATUS.md` trong mỗi extension | **người** | Lời khai trạng thái vận hành: đang sống hay ngủ, kiểm chứng lần cuối bằng gì, việc đang mở, đọc sâu ở đâu. |
| [`DASHBOARD.md`](DASHBOARD.md) ở gốc repo | **máy** | Bảng tổng, sinh ra từ các `STATUS.md` + đo thẳng từ repo. **Không bao giờ gõ tay.** |

Sinh lại dashboard:

```bash
node scripts/build-dashboard.mjs
```

Khuôn mẫu để khai extension mới: [`STATUS.template.md`](STATUS.template.md).

### Ranh giới, đọc kỹ chỗ này

`STATUS.md` là nguồn sự thật của **trạng thái vận hành** — KHÔNG phải của toàn bộ kiến thức.
Kiến trúc, cách dùng, bảng lỗi, hướng dẫn dài vẫn ở `README.md` / `HANDOFF.md` /
`AI-OPERATOR-GUIDE.md`; STATUS **chỉ trỏ link tới**.

Lý do không phải thẩm mỹ: hai chỗ nói cùng một điều thì sớm muộn nói khác nhau — đúng cái
bệnh platform này sinh ra để chữa. Một STATUS phình thành README thứ hai là đã hỏng.

## 3. Registry — repo có gì

Bảng **có số liệu đo được** nằm ở [`DASHBOARD.md`](DASHBOARD.md) và luôn tươi hơn bảng dưới.
Bảng dưới chỉ để biết *tồn tại những gì*.

| # | Extension | Ở đâu | Khai STATUS chưa |
|---|---|---|---|
| 001 | **Duc Auto ChatGPT** — chạy kế hoạch XLSX tạo ảnh trên ChatGPT | `workers/duc-auto-chatgpt/v0.1.0/` | ✅ [STATUS](workers/duc-auto-chatgpt/v0.1.0/STATUS.md) |
| 002 | **Duc Auto Gemini (Platform)** — cùng bài toán, trên Gemini | `workers/duc-auto-gemini/v0.2.0/` | ✅ [STATUS](workers/duc-auto-gemini/v0.2.0/STATUS.md) |
| — | Duc Auto Gemini bản cũ | `workers/duc-auto-gemini/v0.1.0/` | ❌ chưa — bản cũ, giữ để tra cứu |
| — | **Extension Observer V0** — quan sát debug target, chỉ đọc | gốc repo | ❌ chưa — **việc mở** |

Hai dòng ❌ vẫn hiện trên dashboard với nhãn **"CHƯA KHAI STATUS"**. Cố ý: tài sản trong repo
không được phép biến mất khỏi registry chỉ vì chưa ai khai nó.

## 4. Luồng chuẩn — mở phiên, làm, đóng phiên

Ba bước của [`AGENTS.md`](AGENTS.md) mục 0, thêm đúng một bước cho platform:

1. **Mở phiên** — đọc `AGENTS.md` gốc → `AGENTS.md` của package → **`STATUS.md` của package**
   → `HANDOFF.md` (phần cuối). STATUS cho biết *đứng ở đâu*; HANDOFF cho biết *phiên trước
   làm gì*. Đọc STATUS trước thì đỡ phải lội hết HANDOFF.
2. **Làm việc** — một việc một lúc. Việc ngoài phạm vi → `BACKLOG.md`, không tự làm.
3. **Đóng phiên** —
   a. cập nhật `STATUS.md` nếu trạng thái đổi (kiểm chứng mới → sửa `last_verified` +
      `last_verified_commit` + `evidence_ref`; việc mở đổi → sửa `current_focus`);
   b. `node scripts/build-dashboard.mjs` → commit `DASHBOARD.md` sinh ra;
   c. **commit**, rồi `node scripts/session-check.mjs --as <nhãn-của-bạn>` → **xanh toàn bộ**
      mới được nói xong, rồi mới `safe-push`.

> **Thứ tự ở bước 3c không tuỳ tiện.** Phép kiểm #7 ("Sự thật máy sinh còn tươi") so **HEAD
> với HEAD** — nó hỏi *"bản đã commit có khớp với repo đã commit không?"*. Chạy nó **trước**
> khi commit thì HEAD chưa có việc mới, cổng vô nghĩa. Chạy **sau** commit, **trước** push.
>
> Đổi lại, nó **miễn nhiễm với việc đang làm dở** — của bạn lẫn của phiên khác. Đó là chủ đích:
> ngày 27/08 đo được rằng một file `.js` chưa commit trong Gemini làm cả hai cổng đỏ, tức là
> phiên đang làm ChatGPT bị chặn vì việc của người khác. Cổng #7 đọc HEAD nên chuyện đó không
> xảy ra được.
>
> **Muốn biết "ai đang giữ package nào" thì đọc `.agents/claims.json`, hoặc dòng đầu output của
> `session-check.mjs`** — KHÔNG phải `DASHBOARD.md`. Claims là trạng thái phiên, đổi nhiều lần
> trong một buổi; để nó trong artifact được commit thì mỗi lần claim/release lại làm trang cũ
> đi. GPT chốt bỏ cột đó ngày 27/08.

## 5. Hai vai — checklist, không phải chức danh

Đây **không** phải hai người mới, cũng không phải cơ chế mới. Chỉ là gọi tên hai bó việc mà
`AGENTS.md` đã bắt làm, để không ai quên nửa nào.

### Vai Orchestrator — người điều phối một phiên

- [ ] Đọc `AGENTS.md` gốc + `AGENTS.md` package + `STATUS.md` + `HANDOFF.md` trước khi gõ dòng đầu.
- [ ] Ghi tên mình vào [`.agents/claims.json`](.agents/claims.json) cho **mọi** package sắp đụng.
      Package có chủ khác → **chỉ đọc**. Muốn giành → hỏi Đức.
- [ ] Chia việc đúng vai (`AGENTS.md` mục 5): Codex viết code, Antigravity dựng UI,
      Claude kiến trúc + audit. Giao chéo vai thì phải nói rõ vì sao.
- [ ] **Kiểm chứng độc lập mọi báo cáo của AI khác** — tự chạy lại test, tự đọc lại diff.
      "Xong" của agent phụ không phải bằng chứng.
- [ ] Đóng phiên: 1 dòng Log vào `HANDOFF.md` mỗi package đã đụng · quyết định mới của Đức
      vào `decisions.md` · lỗi mới gặp trên trang thật vào bảng lỗi của sổ tay.
- [ ] Trả `owner` về `null` trong `claims.json` khi buông package.

### Vai Maintainer — người giữ sức khoẻ một extension

- [ ] `STATUS.md` khớp sự thật. Đặc biệt: `current_focus` có đúng là việc đang mở lớn nhất không.
- [ ] Khai "đã kiểm chứng" thì **kèm bằng chứng có thật**. Generator từ chối lời khai không
      bằng chứng — nó **đỏ**, không phải cảnh báo cho qua.
- [ ] Cột "Code đổi sau kiểm chứng?" trên dashboard hiện `CÓ` → hoặc kiểm chứng lại và cập
      nhật mốc, hoặc nói rõ trong `current_focus` rằng lời khai đã cũ.
- [ ] Mọi file/thư mục mới → khai một dòng vào **Bản đồ file** trong `AGENTS.md` của package.
- [ ] Mỗi fix một test ghim. Không làm yếu lớp bảo vệ đã có để cho test xanh.

## 6. Thêm Extension #003

1. Dựng thư mục có `manifest.json`. Đặt trong `workers/<tên>/<vX.Y.Z>/` nếu là worker.
2. Chép [`STATUS.template.md`](STATUS.template.md) → `STATUS.md` đặt **cạnh `manifest.json`**, điền.
3. Khai `STATUS.md` vào **Bản đồ file** trong `AGENTS.md` của package.
4. Thêm một dòng chủ sở hữu vào [`.agents/claims.json`](.agents/claims.json).
5. `node scripts/build-dashboard.mjs` → nó **đỏ và nói rõ sai gì** nếu khai thiếu hoặc khai
   vào file ma. Xanh thì commit `DASHBOARD.md` sinh ra.
6. Thêm một dòng vào bảng registry mục 3 của file này, và vào bảng "Sổ tay mở khi cần"
   của [`AGENTS.md`](AGENTS.md) gốc nếu extension có sổ tay riêng.

Bỏ bước 2 vẫn chạy được — extension sẽ hiện trên dashboard với nhãn **"CHƯA KHAI STATUS"**.
Đó là cố ý: quên khai thì lộ ra, không im lặng biến mất.

## 7. Roadmap

**V0.1 — xong** (nội dung file này): schema `extension-status/v1` · 2 STATUS pilot ·
generator deterministic · `DASHBOARD.md` sinh tự động · test ghim.

**V0.2 — đã chốt phạm vi, chờ Đức duyệt từng món:**

| Món | Vì sao chưa làm ở V0.1 |
|---|---|
| ~~`--check` + `.gitattributes`~~ · ~~nâng cổng 6→7~~ | **XONG V0.2-A và V0.2-D 27/08.** Cổng #7 so HEAD với HEAD |
| ~~`scripts/feature-parity.mjs`~~ | **XONG V0.2-C 27/08.** Mục 1 + 3 + nợ method ở mục 4 máy sinh trong khối marker; mục 2 (hành vi) vẫn của người, cấm máy suy diễn |
| `BACKLOG.md` cho nhánh Gemini | Nhánh đó chưa có sổ; cần phiên giữ package đó dựng |
| `STATUS.md` cho Observer V0 | Chưa ai giữ package đó |
| Cho `version_source` chấp nhận khác hoa/thường trên Windows | Hiện khác hoa/thường bị từ chối dù đường dẫn trỏ đúng chỗ. **Fail-closed** nên không sinh ra số sai, chỉ phiền. Auditor xếp LOW |
| ~~Máy bắt số động gõ tay trong STATUS~~ | **XONG V0.2-B 27/08.** Detector hẹp theo 4 nhóm machine-owned |
| Đóng protocol lặp lại (tạo extension / đóng phiên) thành skill | Chưa đủ lần lặp để biết hình dạng đúng |

**Ngoài phạm vi, đã chốt là KHÔNG làm:** agent daemon, automation engine tự chạy.
Luật gốc của Đức: không tạo automation tự chạy nếu chưa hỏi.

## 8. Đã chốt cho V0.2 — GPT quyết 2026-08-27

Ba câu hỏi treo của V0.1 nay đã có câu trả lời, ghi lại để V0.2 không hỏi lại:

1. **Artifact dashboard cũ: cho nghỉ.** Sau này cần bản HTML thì **sinh từ cùng một model**
   với `DASHBOARD.md`, không dựng tay lần nữa.
2. **`--check` bỏ qua dòng dấu HEAD**, chỉ so phần bảng deterministic. Đây cũng là phương án
   tôi nghiêng về — nó không đụng vào nguyên tắc 4 đã chốt của brief.
3. **Thêm `.gitattributes`:** `DASHBOARD.md text eol=lf`.

**Không viết lại lịch sử** để sửa commit message `1`. Lý do GPT đưa ra và tôi đồng ý:
force-push trong một repo nhiều phiên AI dùng chung nguy hiểm hơn cái lợi thẩm mỹ.

**Việc V0.2 mới, sinh ra từ chính lỗi V0.1.1 dưới đây:** cho máy **bắt số động trong STATUS**.
Luật "không gõ số máy đếm được" hiện chỉ nằm trong `STATUS.template.md` — tức là chỉ là chữ.
Mà luật nào không kiểm được bằng máy thì sớm muộn cũng bị bỏ qua; lần này nó bị bỏ qua bởi
đúng phiên viết ra nó.

## 9. Câu hỏi còn treo — chờ Đức

Ba câu hỏi V0.1 đã được GPT chốt ở mục 8. Còn lại một việc kỹ thuật, mức LOW:

- **Khác hoa/thường trong `version_source` trên Windows** đang bị từ chối dù đường dẫn trỏ
  đúng chỗ. **Fail-closed** nên không bao giờ sinh ra số sai — chỉ phiền người khai. Auditor
  xếp LOW, đã ghi ở roadmap mục 7.

## Log

> Chỉ thêm dòng, không sửa dòng cũ. Mới nhất ở cuối.

- **2026-08-26/27** · Claude (`opus-platform-2`) điều phối · **V0.1 dựng xong, audit độc lập PASS.**
  - **Phân vai:** Claude viết `PLATFORM.md` + `STATUS.template.md` + 2 `STATUS.md` (chữ cho
    mắt Đức); Codex viết `scripts/build-dashboard.mjs` + `tests/build-dashboard-smoke.mjs`;
    Codex (phiên riêng, không nhớ phiên dựng) làm auditor. **Antigravity không có việc dựng
    ở V0.1 vì V0.1 không có UI nào** — `DASHBOARD.md` là markdown do script sinh.
  - **Số liệu 2 STATUS pilot đã đo lại độc lập trước khi giao việc:** 2 SHA resolve được,
    2 file bằng chứng tồn tại thật, method Bridge 22/19, file test 94/81 — khớp brief.
  - **Audit chạy 4 vòng, FAIL 3 vòng đầu.** Tổng 12 phát hiện, sửa 10, hoãn 2 (mục 8).
    Đáng tiền nhất, và không vòng nào tự tìm ra một mình:
    1. **Test giả (tôi tự bắt).** Gỡ *đường nối* `validateStatus` khỏi `collectModel` thì
       9/9 test vẫn xanh — mọi test đều gọi hàm đó trực tiếp, không test nào chứng minh
       generator thật sự dùng nó. Luật lõi "không bằng chứng thì không sinh dashboard" khi
       đó chỉ là hình thức. Mutation test của Codex bỏ sót vì cả 8 phép đều phá *bên trong*
       hàm, không phá đường nối.
    2. **STATUS chép nội dung HANDOFF** thay vì chỉ trỏ (auditor bắt, đúng cái GPT yêu cầu
       audit riêng). Đã cắt gọn hai lần mới sạch.
    3. **Cột "Code đổi sau kiểm chứng?" mù ba kiểu:** mù với việc chưa commit; mù với đổi
       tên `.js` → `.md` (git gộp đổi tên, vế `.js` biến mất, code rời khỏi package mà cột
       vẫn khai `KHÔNG`); và `version_source` lách được ra ngoài package bằng `..` rồi bằng
       junction thư mục. Cả ba đều là "trấn an sai" — đúng thứ cột này sinh ra để chặn.
    4. **BOM UTF-8** (tự bắt lúc dựng repo thử bằng PowerShell): file `STATUS.md` có BOM thì
       parser coi như không có frontmatter rồi báo "thiếu 8 trường bắt buộc" trong khi 8
       trường đó nằm ngay trên màn hình. Fail-closed nên không nói dối, nhưng dẫn sai hướng.
  - **Suite 19 ca, 20 phép mutation đỏ đúng cả 20.** Bản vá junction được kiểm trên junction
    Windows **thật**, cả hai chiều: junction → đỏ, đường dẫn thẳng → xanh.
  - **Antigravity không chạy được:** hook `googlecloudtools.datacloud_telemetry` trong config
    Gemini của máy truyền đường dẫn có dấu nháy lồng nhau, Node không nạp được module, và
    hook đó chặn *mọi* tool call của AGY. Lỗi config cá nhân, không phải lỗi repo — chưa sửa
    vì nằm ngoài repo.
  - **Sự cố quy trình, ghi lại để không lặp:** giữa lúc audit, một phiên khác đã commit toàn
    bộ 13 file này với message `1` **và push**, cuốn theo 3 commit của phiên `claude-chatgpt-3`
    — đúng thứ `safe-push.mjs` sinh ra để chặn. Nội dung đã kiểm lại: đúng 13 file được phép,
    không lẫn file cấm. Nhưng message `1` thì vô nghĩa với người đọc lịch sử sau này.
