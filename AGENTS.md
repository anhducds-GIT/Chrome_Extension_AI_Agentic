# AGENTS.md — hiến pháp repo

> **Tầng 1: bản đăng ký những luật đang có hiệu lực hôm nay.** Đọc hết trước khi gõ dòng đầu tiên.
> Mỗi luật một dòng, kèm quyết định đứng sau nó. Không kể chuyện, không số đo — những thứ đó nằm
> trong ADR mà dòng đó trỏ tới. Sổ tay Tầng 2 ở mục 7; đừng đọc trước.
>
> Chủ dự án là **Đức** — không chuyên kỹ thuật, tiếng Việt, câu ngắn, và là người chốt duy nhất.
> **File này viết bằng tiếng Việt để Đức đọc được bản cuối** (Đức chốt 09/09,
> [ADR-0000](docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md) ⑷). Chỉ mã lỗi và tên lệnh dùng tiếng Anh.

## 0. Một phiên, từ đầu đến cuối

1. **Mở phiên:** đọc file này → `AGENTS.md` của gói mình sắp đụng → cuối `HANDOFF.md` của gói đó.
2. **Làm việc:** một việc một lúc. Phát sinh ngoài phạm vi → ghi vào `BACKLOG.md`, đừng tự làm.
3. **Đóng phiên:** chạy cổng kiểm. Đỏ là chưa xong. Không báo "xong" khi cổng đỏ, và không sửa
   cổng cho nó xanh.

```bash
node scripts/session-check.mjs --as <tên-phiên-của-bạn>
```

### 0a. Thứ tự đóng phiên — sai thứ tự là tự nhân đôi thời gian

```
--sua → sửa → --soat → commit → --xong → sinh lại artifact → commit
      → npm run test:song-song → cổng → safe-push → trả khoá vùng
```

- **Chạy đủ bộ SAU commit cuối, đúng MỘT lần.** Bộ chạy để lại một *dấu xác nhận* buộc vào HEAD
  + băm cây; commit sau đó làm hỏng dấu (đo ở bộ khung: **1.095 → 278 giây**). Lúc đang làm chỉ
  chạy một suite: `node scripts/chay-test.mjs --chi <tên>`, cố ý KHÔNG ghi dấu.
- **Đừng đổi `scripts.test`** — nó là chuỗi tuần tự có chủ ý: một phép ghim trong `duc-auto-*` đọc
  thẳng trường đó để bắt "xanh giả".
- **Bộ sinh nào ghi vào một sổ CÓ RÀNG BUỘC thì chạy MỘT LẦN, sau khi suite xanh.**
- **Không bao giờ `git push`.** Nó cuốn theo commit của mọi phiên khác đang dùng chung cây làm việc
  (đã xảy ra thật 26/08). Dùng `node scripts/safe-push.mjs --as <tên-phiên-của-bạn>`.

## 1. Khoá — ai được ghi ở đâu

Trạng thái ở `.agents/claims.json`. **Một vùng, một phiên được ghi tại một thời điểm.** Mọi lượt
nhận và trả đi qua lệnh. **Mặc định là khoá FILE** ([ADR-0005](docs/adr/0005-lam-viec-song-song.md)
⑴): nhận ngay **trước** lượt ghi, trả ngay **sau**; **chỉ đọc thì không cần khoá gì.**

```bash
node scripts/claim.mjs --sua <đường-dẫn>… --as <phiên>    # trước khi ghi
node scripts/claim.mjs --soat --as <phiên>                # BẮT BUỘC trước git commit
node scripts/claim.mjs --xong --het --as <phiên>          # ngay sau khi ghi xong
node scripts/claim.mjs --list                             # xem ai đang giữ gì
node scripts/claim.mjs --take|--release <khoá> --as <phiên> [--task "một câu"]
node scripts/claim.mjs --khai-vung <khoá> --as <phiên>    # mở MỘT VÙNG MỚI
git config core.hooksPath .githooks                       # một lượt, xong cho mọi lane
```

- **Nhận cả vùng chỉ khi bạn thật sự sửa khắp nó.** Chứa nhau hai chiều: vùng có chủ khác thì khoá
  file bị từ chối, và bên trong còn khoá file của người khác thì nhận cả vùng bị từ chối.
- **Khoá FILE trả lúc HẾT PHIÊN; khoá VÙNG trả SAU KHI ĐẨY.** Hai loại, hai mốc. Cổng đỏ khi bạn
  còn treo khoá file. Đẩy không được thì **giữ khoá vùng** và báo lại.
- **`--soat` bắt buộc trước `git commit`** — nó bắt chỗ khoá không chữa được. Chốt `commit-msg`
  chạy lại nó ngay trong lượt commit. Nó **fail-open** và chỉ chặn khi vi phạm thật; kẹt thì
  `git commit --no-verify` rồi **nói ra trong nhật ký phiên**.
- **Đừng nhả khoá của lane khác** — kể cả khi cổng nêu tên nó là quá hạn, kể cả khi cổng nói *"chưa
  thấy dấu vết trong repo"*: câu đó nói **repo chưa thấy gì**, không nói lane đó rảnh. Ba đường hợp
  lệ: **chính lane đó trả** · **lane đó báo đã xong** · **Đức chốt chuyển**
  (`--restamp --as <phiên> --duc-duyet "<câu chốt>"`). Khoá nằm lâu là lý do để **hỏi**, không phải
  để lấy.
- **Đừng sửa `claims.json` bằng tay** — mở vùng mới thì `--khai-vung`.
- **Đừng nối `claim.mjs` vào ống** — mã thoát của ống là mã thoát của lệnh **cuối**, nên lệnh sau
  vẫn chạy khi lượt nhận khoá đã **TỪ CHỐI**.

> Bốn gạch đầu dòng cuối là **câu luật**; vụ tai nạn đằng sau từng cái nằm ở
> [`docs/protocols/MULTIFLOW.md`](docs/protocols/MULTIFLOW.md) mục 3 — **cố ý hai bản, đừng gộp**
> (tầng 1 giữ luật, tầng 2 giữ lý do; `RULE-COMPILER.md` mục 4). Rút chuyện kể khỏi đây 09/09,
> [ADR-0031](docs/adr/0031-tran-do-bang-ky-tu.md) ⑷.

### 1b. Vùng, miễn trừ, artifact máy sinh

| Khoá | Che gì |
|---|---|
| `_docs` | `docs/` |
| `_code` | `scripts/` + `tests/` |
| `_root` | phần còn lại và các file ở tầng ngoài cùng |
| `workers/<gói>` | gói đó |

Nhận đúng vùng mình đụng, không nhận cả gốc repo — cổng sẽ nói tên khoá còn thiếu. Ai chia vùng
thì khai `steward` trong khối `areas` của `.repo-structure.json`.

**Năm artifact máy sinh KHÔNG đòi khoá nào** (khai ở khối `generated`): `DASHBOARD.md` ·
`llms.txt` · `repo-map.json` · `DASHBOARD-Chrome-Extension-AI-Agentic.html` ·
`FEATURE-PARITY-AUTO.md`. `FEATURE-PARITY.md` **cố ý không** nằm trong đó — mục 2 của nó là chữ
của người.

**Miễn khoá, hai loại** (khai ở `append_only_exempt` — **sửa ở đó, đừng sửa script**):

- **Vô điều kiện:** `.agents/claims.json`.
- **Chỉ khi THÊM DÒNG Ở CUỐI:** `HANDOFF.md` gốc · `IDEAS.md` · `BACKLOG.md` gốc. **Sửa hay xoá
  dòng cũ thì KHÔNG được miễn** — trừ khi bạn **đang giữ khoá** đúng file đó: miễn khoá nghĩa là
  *không cần khoá*, không nghĩa là *có khoá cũng không được*. Cửa RA của sổ cũng chỉ là **thêm một
  dòng ở cuối**.

## 2. Commit và đẩy

- **Mọi commit kết bằng `Lane: <tên-phiên>`** — đúng tên bạn đưa cho `--as`, một dòng, không dấu
  cách. Thiếu nhãn thì cổng ĐỎ **và `safe-push` từ chối**; `--carry` không mở được cửa đó, vì nó
  duyệt "đẩy kèm việc của X" mà commit không nhãn thì không có X. Nhãn là **nguồn gốc, không phải
  quyền** — ai được ghi vẫn do mục 1 quyết. Nhãn hỏng thì ĐỎ, không đoán; sửa bằng
  `git commit --amend`.
- **Commit và đẩy không phải hỏi** (Đức chốt 26/08) khi đủ cả ba: việc hoàn tất trọn vẹn — việc dở
  dang thì KHÔNG đẩy · cổng XANH TOÀN BỘ, và với code thì đã qua audit độc lập · đẩy bằng
  `safe-push.mjs`.
- **`--carry` không phải hỏi** ([ADR-0005](docs/adr/0005-lam-viec-song-song.md) ⑶). Đổi lại, **mọi
  lượt `--carry` phải kể tên lane bị cuốn theo trong nhật ký phiên** — đó là dấu vết duy nhất còn lại.

## 3. Phải hỏi Đức trước

1. Thêm quyền (permission) mới cho extension
2. Chạy pilot live mới trên trang thật
3. Đổi luật an toàn (retry, halt, attribution, persistence, exact-once)
4. **Force-push, sửa lịch sử, merge nhánh vào `main`**

Cộng luật gốc của Đức: không gửi gì ra ngoài · không xoá file · không sửa dữ liệu gốc · không tạo
automation tự chạy — nếu chưa hỏi.

## 4. Giới hạn cứng

1. **Không còn trần số gói** ([ADR-0021](docs/adr/0021-goi-extension.md) ⑴). Cơ chế đóng băng ở lại
   với danh sách rỗng — công tắc Đức bật lại được. Giới hạn ⑦ và ② gánh thay phần trần này bỏ lại;
   **đừng nới cái nào trong hai.**
2. **Cấm cài một tính năng hai lần.** Cần ở hai gói → `workers/_shared/` trước.
3. **Thước ràng buộc nhất: CÁI MỘT PHIÊN NẠP, đo bằng KÝ TỰ** — `luat.nap`,
   [ADR-0031](docs/adr/0031-tran-do-bang-ky-tu.md). **ĐÍCH 8.000.** Con số hôm nay **đừng gõ vào
   đây, nó mục** — cổng in ra. **Đừng đo bằng dòng, dòng nói dối.** Cửa ra rẻ nhất: chuyển phần
   **kể chuyện** sang ADR (nạp theo yêu cầu nên miễn phí), ở đây giữ một câu luật cộng một liên kết.
4. **`docs/` ≤ 8.000 dòng là ĐÍCH; máy canh THƯỚC CÓC** `docs.tran_dong_khong_ke_adr` (không kể
   ADR) — đo kho chữ phình, khác câu hỏi của ③. **Mọi thước đều tách ĐÍCH khỏi THƯỚC**, và máy chỉ
   canh thước: [ADR-0027](docs/adr/0027-bo-bien-dich-luat.md) ③.
5. **Sổ nợ hạ tầng ≤ 15 mục** — trần ở `backlog.tran`, **hỏi Đức trước khi đổi**. Đếm lại bằng
   `node scripts/backlog-check.mjs`. Cửa ra là **đóng một mục**: thêm `- **ĐÓNG <mã>** · …` ở CUỐI
   sổ, `**` đóng **ngay sau mã** — sai mẫu thì nó không đóng gì mà đọc y hệt dòng đúng.
6. **File test bắt 0 đột biến thì XOÁ.** Một phép kiểm không bắt được gì vẫn thu thuế mọi phiên.
7. **Song song tối đa 2 CHAT** ([ADR-0023](docs/adr/0005-lam-viec-song-song.md) ⑵, Đức chốt 07/09).
   **Số tác vụ ngầm TRONG một chat không bị giới hạn**, và **chủ khoá là tên CHAT**.
8. **Một luật vào thì một luật ra.** Thêm luật vào file này phải kể tên luật nó thay, hoặc đo được
   nó đã nổ mấy lần. Chỗ để kể chuyện là ADR, không phải đây.
9. **Luật mới vào SỔ CÁI trước, đừng viết thẳng vào đây** —
   [ADR-0027](docs/adr/0027-bo-bien-dich-luat.md). `docs/adr/` là sổ cái; file này là **bản hiệu
   lực** biên dịch từ đó, rà **HẰNG TUẦN**
   ([ADR-0000](docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md) ⑸); cổng ĐỎ khi còn chỗ **trích một
   vế đã chết**. Sáu bước: `docs/protocols/RULE-COMPILER.md`.

## 5. Không bao giờ

- `pilot-*/`, `Pilot-*/`, `Batch-*/`, `evidence/` là **bằng chứng vận hành**: chỉ được THÊM.
- Không bao giờ để token, mật khẩu, hay tệp ghép cặp lọt vào repo. **Repo này PUBLIC.**
- Không bao giờ gán `.innerHTML` / `.outerHTML` / `insertAdjacentHTML`.
- Không bao giờ nới một lớp bảo vệ để cổng xanh. Sửa bug thì được; gỡ bảo vệ thì không.
- Không bao giờ đoán selector — phải có bằng chứng DOM thật từ `diagnostics.dom_probe` qua Bridge.
- Không bao giờ tin báo cáo của AI khác. Tự chạy lại test, tự đọc lại diff. Agent phụ báo "xong"
  không phải bằng chứng.
- Không bao giờ `git checkout`, `reset` hay `stash` file trạng thái sống. `.agents/claims.json`
  giữ khoá chưa commit của phiên khác; muốn so với HEAD thì `git show HEAD:<file>`.

**Hai luật về người, không phải về máy:**

- **Mỗi bản vá kèm một phép ghim.** Suite không chạm DOM thật, nên fixture bằng chứng là toàn bộ
  giá trị.
- **Viết cho mắt Đức đọc.** Đức đọc không hiểu = lỗi hệ thống, viết lại đơn giản hơn. Chữ operator
  nhìn thấy: tiếng Việt. Mã lỗi (CODE): tiếng Anh.

## 6. Vai — chia theo TRÁCH NHIỆM, không chia theo hãng

**Đức chốt mọi thứ.** Ngoài ra có hai vai — ở **repo này** là cặp **Hệ thống / Sản phẩm**
([ADR-0029](docs/adr/0029-hai-vai-o-repo-extension.md), Đức chốt 09/09; repo bộ khung tự chọn cặp
của nó). Vai là của **PHIÊN**, không của hãng, và một phiên đóng đúng một vai tới khi đóng phiên.

**Vai KHÔNG phải hàng rào cấm gõ code** — *"cả 2 vai đều code được khi cần"*. Nó nói **ai sở
hữu** và **ai ký nghiệm thu**, không nói ai được sửa.

| Vai | Giữ gì | Việc chính | KHÔNG được |
|---|---|---|---|
| **① Hệ thống** | luật · bộ máy · cổng kiểm · trạng thái đa phiên của repo | mỗi bản vá kèm **một phép kiểm ghim** · xoá luật không nổ lần nào · giữ cổng kiểm còn răng | nới một lớp bảo vệ cho cổng xanh · **tự ký nghiệm thu việc của chính mình** |
| **② Sản phẩm** | **mã của MỌI extension và Scouter**, xuyên suốt chạy và debug · **kiến trúc của chính sản phẩm** đó | dựng · chạy · debug · nghiệm thu sản phẩm · tài liệu yêu cầu và thiết kế của gói mình | báo một quy trình ĐẠT khi chưa chạy thật · **tự ký nghiệm thu việc của chính mình** |

- **Bất biến chịu tải: người SỬA không tự NGHIỆM THU bản sửa của mình.** Một tờ nghiệm thu do bên
  bị kiểm ký là lời tự khai, không phải hàng rào — đúng luật mà `SELF_ATTESTATION` cưỡng chế trong
  lõi quyền. **Đừng đọc thành "người sửa không được TÌM lỗi"**: vai nào cũng được tìm lỗi ở bất kỳ
  đâu; thứ phải tách là **người ký** khỏi **người sửa**.
- **Sản phẩm cần sửa hạ tầng thì GỬI YÊU CẦU**, không tự lấy vùng: một dòng `BACKLOG.md` kèm trường
  `đóng khi:`, Vai ① biến nó thành bản vá cộng một phép ghim. Vế này máy kiểm được
  (`npm run test:backlog`).
- **"Phát & thu" không còn là một VAI ở đây** — nó thiên về repo bộ khung. Việc *mang chỗ vấp bên
  ngoài về thành mục sổ nợ* vẫn giữ, nhưng nó là **một việc** vai nào cũng làm.
- Hai vai chạy cùng lúc được, nhưng **KHÁC VÙNG** (mục 1), và vừa khớp trần 2 chat.

**Cách file này đến tay từng AI:** Claude đọc `CLAUDE.md`, file đó trỏ sang đây. Codex đọc thẳng
`AGENTS.md`. **Antigravity cần một câu dán mỗi phiên:** *"Đọc AGENTS.md ở gốc repo trước khi làm
gì."* — chưa bao giờ chứng minh được nó tự nạp.

## 7. Sổ tay — Tầng 2, mở khi cần

> **Bảng này là BẢNG CHỈ ĐƯỜNG, không phải nội dung.** Mỗi sổ tự nói nó chứa gì ở dòng đầu của
> chính nó; chép lời giới thiệu xuống đây là bắt **mọi phiên** trả tiền cho một sổ **hầu hết
> phiên không mở**. Rút gọn 09/09, [ADR-0031](docs/adr/0031-tran-do-bang-ky-tu.md).

| Khi bạn sắp… | Mở |
|---|---|
| **Đụng ba gói `duc-auto-*`** | `AGENTS.md` của chính gói đó. **Ba gói là fork của nhau** (giới hạn ②) — một lỗi thường có ba bản sao, vá một bản là để lại hai |
| **Là phiên ĐIỀU PHỐI** | `docs/protocols/ORCHESTRATOR.md` — **HARD ROLE FIREWALL**: vai điều phối KHÔNG code, KHÔNG debug, KHÔNG đề xuất patch; không có ngoại lệ "sửa nhỏ". Nạp báo cáo năm mục `DONE → STATE CHANGE → BLOCKER → HUMAN DECISION → NEXT WORK` rồi **DỪNG**. Công cụ: `node scripts/what-next.mjs`, chỉ đọc |
| **Hỏi làm gì TRƯỚC** | `ROADMAP.md` — thứ tự, không phải trạng thái. Trạng thái sống: `what-next.mjs` |
| **Biết Đức đã chốt gì, và vì sao** | `docs/adr/` (cả repo) · `workers/<gói>/<phiên-bản>/docs/adr/` (một gói). Mục lục và bản đồ số hiệu → file: `docs/README.md`. **Trích theo SỐ HIỆU, đừng trích theo tên file** |
| **Thêm/sửa/bỏ một LUẬT, hoặc tới lượt rà hằng tuần** | `docs/protocols/RULE-COMPILER.md` — sáu bước. **Trim không phải xoá.** Bộ đo cố ý **không có `--fix`** |
| **Ghi một mục nhật ký, hoặc bị cổng chặn vì mục quá dài** | `docs/protocols/HANDOFF.md`. Trần **2.600 byte/mục**, **20 mục/quyển**. Quyển xếp **cũ trên, mới dưới** — ghi vào **cuối** |
| **Đào lịch sử xa hơn 20 mục** | `HANDOFF-ARCHIVE-*.md` cạnh chính `HANDOFF.md` đó. Nguyên văn, chỉ đọc. Cắt tiếp: `handoff.mjs --cat <file> --giu 20` |
| **Làm cùng lúc với AI khác, hoặc sửa một cơ chế đa phiên** | `docs/protocols/MULTIFLOW.md` — bốn cơ chế, sáu bất biến, bảng mã lỗi. Đổi cơ chế thì **bắt buộc có đột biến kiểm** |
| **Cổng báo `DAU_VO` — bảng quyền bị sửa tay** | `git diff .agents/claims.json`, rồi **hỏi Đức**. **Đừng restamp cho xong việc** — làm thế là đóng dấu hợp lệ cho vụ sửa tay và xoá luôn tang chứng |
| **Biết nhánh mình thiếu tính năng gì** | `FEATURE-PARITY.md` (chữ của người, giữ `_root`) + `FEATURE-PARITY-AUTO.md` (số của máy) — [ADR-0014](docs/adr/0014-tach-khoi-may-sinh-cua-bang-doi-chieu.md). Dòng **[DÒ]** là đoán theo tên: kiểm lại trước khi hành động |
| **Biết repo đang nợ gì về cấu trúc** | `node scripts/check-bootstrap.mjs [--all]` — B1…B15, mỗi dòng nói cả chỗ sai lẫn cách sửa |
| **Hiểu repo trong một lần đọc** · **xem có extension nào** | `llms.txt` · `repo-map.json` · `DASHBOARD.md` — đều máy sinh, đừng sửa tay |
| **Vận hành nhiều extension, hoặc thêm một cái** | `PLATFORM.md`; khai cái mới bằng cách chép `STATUS.template.md` đặt cạnh `manifest.json` |
| **Lấy dữ liệu HNX, hoặc sửa gói đó** | `workers/hnx-fetch/PROTOCOL.md` — sổ tự đứng một mình. Gói này **không có quyền `debugger`** |
| **Sửa hoặc vận hành Scouter** | `workers/duc-scouter/v0.1.0/AGENTS.md` ([ADR-0009](docs/adr/0007-scouter.md)). **Selector không bao giờ được gõ vào seed** |
| **Đặt tệp ghép cặp, bộ khởi động, hay vùng ghi của Bridge** | **Đừng tự chọn chỗ** — `node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --goi <gói>` tự đặt đúng. Vùng ghi **luôn là thư mục CON** |
| **Lấy hoặc sửa bộ chuẩn** · **sửa gói Assistant** | **KHÔNG CÒN Ở ĐÂY** — `Ark_Repo_Harness` ([ADR-0001](docs/adr/0001-ranh-gioi-bo-khung.md)). Sửa ở bộ khung TRƯỚC, rồi mới về đây |
| **Đức cần một câu để dán** · **muốn tự mở bảng** | `PROMPTS.md` · `bang-trang-thai/` · `node scripts/build-overview.mjs <file-ra.html>` (bản ra **không commit**) |
| **Ghi một chỗ hỏng, hoặc một ý tưởng của Đức** | `BACKLOG.md` (nợ hạ tầng, trường `đóng khi:` **bắt buộc**) · `IDEAS.md` (phòng chờ, bắt buộc `bậc` + `việc kế`) |
| **Tìm một tài liệu, tra đường dẫn cũ, viết hồ sơ mới** | `docs/README.md` — mục lục, bản đồ đường dẫn cũ → mới, và các bản mẫu. **Hồ sơ đã nghỉ thì xoá**, git giữ hộ |
| **Hiểu vì sao nhiều phiên hay va nhau** | `docs/studies/PARALLEL-WORK-DESIGN-V0.md` |
## 8. Đóng phiên — ghi lại ba thứ

1. Một dòng Log vào `HANDOFF.md` của gói: làm gì, kết quả số, còn gì mở.
2. Quyết định mới của Đức → ADR của nó.
3. Gặp lỗi mới trên trang thật → một dòng vào bảng lỗi của sổ tay, **và** cân nhắc thêm một phép
   kiểm vào `scripts/session-check.mjs`.

> Luật nào máy không kiểm được thì sớm muộn cũng bị bỏ qua. Đó là lý do có cổng kiểm.
