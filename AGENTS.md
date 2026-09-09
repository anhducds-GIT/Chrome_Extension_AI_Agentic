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

Trạng thái nằm ở `.agents/claims.json`. **Một vùng, một phiên được ghi tại một thời điểm.** Mọi
lượt nhận và trả đi qua lệnh; **đừng sửa file bằng tay.**

### 1a. Mặc định là khoá FILE — giữ ngắn, trả ngay

[ADR-0005](docs/adr/0005-lam-viec-song-song.md) ⑴.

Nhận ngay **trước** lượt ghi, trả ngay **sau**. **Chỉ đọc thì không cần khoá gì.** Nhận cả vùng
chỉ khi bạn thật sự sửa khắp nó.

```bash
node scripts/claim.mjs --sua <đường-dẫn> [<đường-dẫn>…] --as <phiên>   # trước khi ghi
node scripts/claim.mjs --soat --as <phiên>                            # trước git commit
node scripts/claim.mjs --xong --het --as <phiên>                      # ngay sau khi ghi xong
git config core.hooksPath .githooks                                   # một lượt, xong cho mọi lane
```

Khi thật sự sửa khắp một vùng thì nhận cả vùng — những lệnh này vẫn còn:

```bash
node scripts/claim.mjs --list
node scripts/claim.mjs --take <khoá> --as <phiên> --task "một câu"
node scripts/claim.mjs --release <khoá> --as <phiên>
node scripts/claim.mjs --khai-vung <khoá> --as <phiên>   # mở MỘT VÙNG MỚI
```

- **Chứa nhau hai chiều.** Vùng có chủ khác → khoá file bị từ chối. Bên trong còn khoá file của
  người khác → nhận cả vùng bị từ chối.
- **Khoá FILE trả lúc HẾT PHIÊN. Khoá VÙNG trả SAU KHI ĐẨY.** Hai loại khoá, hai mốc, đừng lẫn.
  Cổng đỏ khi bạn còn treo khoá file. Đẩy không được thì **giữ khoá vùng** và báo lại — commit
  chưa đẩy trong một vùng vô chủ để lại mục đỏ cho phiên đến sau.
- **`--soat` bắt buộc trước `git commit`.** Nó vá chỗ khoá không chữa được: hai lane dùng chung
  MỘT cây git, nên `git commit -a` cuốn file lane khác vừa dàn và `git commit -o` cuốn sửa đổi của
  họ trên chính file bạn nêu tên. Chốt `commit-msg` chạy nó ngay trong lượt commit, bịt cửa sổ
  giữa soát và commit. Nó **fail-open** ba chỗ và chỉ chặn khi vi phạm thật; kẹt thì
  `git commit --no-verify` rồi **nói ra trong nhật ký phiên**.
- **Đừng nhả khoá của lane khác** — kể cả khi cổng nêu tên nó là quá hạn, kể cả khi cổng nói *"chưa
  thấy dấu vết trong repo"*. Câu đó nói **repo chưa thấy gì**, nó không nói lane đó rảnh. Ba đường
  hợp lệ: **chính lane đó trả** · **lane đó báo đã xong** · **Đức chốt chuyển**
  (`--restamp --as <phiên> --duc-duyet "<câu chốt>"`). Khoá nằm lâu là lý do để **hỏi**, không phải
  để lấy.
- **Đừng sửa `claims.json` bằng tay.** Đọc-sửa-ghi đã từng ghi đè im lặng một quyền. Mở vùng mới
  thì dùng `--khai-vung`; sửa tay rồi `--restamp` trông giống hệt một vụ cướp khoá.
- **Đừng nối `claim.mjs` vào ống.** Mã thoát của một đường ống là mã thoát của lệnh **cuối**, nên
  `claim.mjs --take … | tail -3 && git commit …` chạy tiếp cả khi lệnh nhận khoá đã **TỪ CHỐI**.

### 1b. Vùng, miễn trừ, artifact máy sinh

| Khoá | Che gì |
|---|---|
| `_docs` | `docs/` |
| `_code` | `scripts/` + `tests/` |
| `_root` | phần còn lại và các file ở tầng ngoài cùng |
| `workers/<gói>` | gói đó |

Nhận đúng vùng mình đụng, không nhận cả gốc repo. Cổng sẽ nói tên khoá còn thiếu. Ai chia vùng thì
khai `steward` trong khối `areas` của `.repo-structure.json`.

**Năm artifact máy sinh KHÔNG đòi khoá nào:** `DASHBOARD.md` · `llms.txt` · `repo-map.json` ·
`DASHBOARD-Chrome-Extension-AI-Agentic.html` · `FEATURE-PARITY-AUTO.md`. Chạy lại bộ sinh là ra y
hệt nên không có gì của ai trong đó để mất. Khai ở khối `generated`. `FEATURE-PARITY.md` **cố ý
không** nằm trong đó — mục 2 của nó là chữ của người (mục 7).

**File được MIỄN chia làm HAI LOẠI:**

- **Miễn vô điều kiện:** `.agents/claims.json` — không miễn thì chính thao tác trả quyền cũng bị
  coi là sửa file gốc.
- **Miễn KHI CHỈ THÊM DÒNG Ở CUỐI:** `HANDOFF.md` gốc · `IDEAS.md` · `BACKLOG.md` gốc. Mọi lane
  đều phải ghi vào ba quyển này, nên bắt chúng xếp hàng sau `_root` là tự chặn luật của mình.
  **Sửa hay xoá dòng cũ thì KHÔNG được miễn** — trừ khi bạn **đang giữ khoá** đúng file đó, lúc
  ấy thì được: miễn khoá nghĩa là *không cần khoá*, không nghĩa là *có khoá cũng không được*. Cửa
  RA của sổ cũng chỉ là **thêm một dòng ở cuối**, đừng viết lại khối cũ.

Khai ở `append_only_exempt` trong `.repo-structure.json` — **sửa ở đó, đừng sửa script.**

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

1. **Không còn trần số gói.** Cả năm gói đều sống ([ADR-0021](docs/adr/0021-goi-extension.md) ⑴).
   Cơ chế đóng băng ở lại với danh sách rỗng — nó là công tắc Đức bật lại được. Giới hạn ⑦ và ②
   nay gánh thay phần trần này bỏ lại; **đừng nới cái nào trong hai.**
2. **Cấm cài một tính năng hai lần.** Cần ở hai gói → vào `workers/_shared/` trước.
3. **`docs/` ≤ 8.000 dòng là ĐÍCH; thứ máy canh là THƯỚC CÓC.** `docs.tran_dong_khong_ke_adr` giữ
   con số của hôm nay, không kể ADR. Cổng ĐỎ khi vượt, và tự nhắc HẠ con số khi bạn đã dưới thước
   ≥ 50 dòng. Một phép kiểm đỏ với mọi phiên trong nhiều tuần là một phép kiểm sẽ bị gỡ — đó là lý
   do máy không canh thẳng 8.000.
4. **`AGENTS.md` cũng có thước cóc:** `agents.tran_dong`. Cùng hình dạng, cùng lý do.
5. **Sổ nợ hạ tầng ≤ 15 mục.** Đếm lại, đừng tin dòng này: `node scripts/backlog-check.mjs`. Cửa ra
   là **đóng một mục** — thêm `- **ĐÓNG <mã>** · …` ở CUỐI sổ; dấu `**` phải đóng **ngay sau mã**,
   viết sai mẫu thì nó không đóng gì mà đọc y hệt dòng đúng. Trần khai ở `backlog.tran`; **hỏi Đức
   trước khi đổi.**
6. **File test bắt 0 đột biến thì XOÁ.** Một phép kiểm không bắt được gì vẫn thu thuế mọi phiên.
7. **Song song tối đa 2 chat** ([ADR-0023](docs/adr/0005-lam-viec-song-song.md) ⑵). Đức nói rõ
   07/09: *"lane ở đây tôi hiểu là 2 phiên chat với AI; trong 1 chat mà bạn manage cùng lúc 5
   task chạy ngầm không giẫm chân nhau thì tôi vẫn ok"* — nên **số tác vụ ngầm TRONG một chat
   không bị giới hạn**, và **chủ khoá là tên CHAT**.
8. **Một luật vào thì một luật ra.** Thêm luật vào file này phải kể tên luật nó thay, hoặc đo được
   nó đã nổ mấy lần. Chỗ để kể chuyện là ADR, không phải đây.
9. **Luật mới vào SỔ CÁI trước, đừng viết thẳng vào đây** —
   [ADR-0027](docs/adr/0027-bo-bien-dich-luat.md). `docs/adr/` là sổ cái; file này là **bản hiệu
   lực** biên dịch từ đó, rà **HẰNG TUẦN** bằng `rule-compile.mjs`
   ([ADR-0000](docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md) ⑸); cổng ĐỎ khi còn chỗ **trích
   một vế đã chết**. Sáu bước: `docs/protocols/RULE-COMPILER.md`.

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

| Khi bạn sắp… | Mở |
|---|---|
| **Đụng ba gói `duc-auto-*`** | `AGENTS.md` của chính gói đó, kèm `BACKLOG.md` và `HANDOFF.md` cạnh nó. Ba gói là **fork của nhau** (giới hạn ②), nên một lỗi thường có ba bản sao và vá một bản là để lại hai |
| **Là phiên ĐIỀU PHỐI: Đức hỏi đang có gì, làm gì tiếp, việc nào chạy song song được** | `docs/protocols/ORCHESTRATOR.md` — **HARD ROLE FIREWALL** (vai điều phối KHÔNG code, KHÔNG debug product, KHÔNG đề xuất patch; không có ngoại lệ "sửa nhỏ"), và luật nạp báo cáo năm mục `DONE → STATE CHANGE → BLOCKER → HUMAN DECISION → NEXT WORK` rồi DỪNG. Công cụ: `node scripts/what-next.mjs`, chỉ đọc, không đòi khoá |
| **Biết Đức đã chốt gì, và vì sao** | `docs/adr/` cho quyết định cả repo, `workers/<gói>/<phiên-bản>/docs/adr/` cho quyết định một gói. **Từ 09/09 gộp theo CHỦ ĐỀ, 9 file** — mục lục và bản đồ số hiệu → file nằm ở `docs/README.md`. Luật của sổ: [ADR-0000](docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md). **Trích theo SỐ HIỆU, đừng trích theo tên file** |
| **Ghi một mục nhật ký, hoặc bị cổng chặn vì mục quá dài** | `docs/protocols/HANDOFF.md` — một mục chứa gì và KHÔNG chứa gì (lý do → ADR · việc còn nợ → `BACKLOG.md` · cách làm → brief). Trần **2.600 byte một mục**, cổng chặn **đúng mục bạn vừa thêm**; một quyển giữ **20 mục** ([ADR-0008](docs/adr/0008-nhat-ky-phien.md)), chặn khai ở `handoff.tran_so_muc`. Công cụ: `handoff.mjs --check` · `--rotate <file>` sang tháng mới |
| **Đào lịch sử xa hơn 20 mục** | `HANDOFF-ARCHIVE-*.md` cạnh chính `HANDOFF.md` đó, nối thành chuỗi. **Nguyên văn, chỉ đọc** — ghép lại dựng được bản gốc từng byte. Cắt tiếp: `handoff.mjs --cat <file> --giu 20`. **Quển này xếp CŨ TRÊN, MỚI DƯỚI** — ghì mục mới vào **cuối**; chèn lên đầu thì lượt cắt dời ngay chính nó vào kho lưu trữ (vấp thật 09/09) |
| **Biết nhánh mình thiếu tính năng gì so với nhánh kia** | Hai file, đọc cùng nhau ([ADR-0014](docs/adr/0014-tach-khoi-may-sinh-cua-bang-doi-chieu.md)): `FEATURE-PARITY.md` là **chữ của người** (mục 2 hành vi, bằng chứng **[ĐỌC]**) và phải giữ `_root`; `FEATURE-PARITY-AUTO.md` là **số của máy**, sinh tự động và miễn khoá. Đừng viết văn của người chung dòng với số của máy — một câu diễn giải đã bị nuốt đúng vì thế. Dòng **[DÒ]** là đoán theo tên: kiểm lại trước khi hành động |
| **Hiểu repo trong một lần đọc** | `llms.txt` và `repo-map.json`, đều từ `node scripts/build-dashboard.mjs` |
| **Xem repo có extension nào, cái nào dùng được** | `DASHBOARD.md` — sinh tự động, đừng sửa tay |
| **Vận hành nhiều extension, hoặc thêm một cái** | `PLATFORM.md`; khai cái mới bằng cách chép `STATUS.template.md` đặt cạnh `manifest.json` |
| **Biết repo đang nợ gì về cấu trúc** | `node scripts/check-bootstrap.mjs [--all]` — B1…B15, mỗi dòng nói cả chỗ sai lẫn cách sửa. Tám phép chặn thật: `B1 B2 B3 B4 B5 B7 B10 B12`, khai ở `bootstrap.blocking`. Bảy phép còn lại chỉ cảnh báo; **B15 cưỡng chế luật viết-cho-Đức** ở ba trường trên bảng |
| **Lấy dữ liệu HNX, hoặc sửa gói đó** | `workers/hnx-fetch/PROTOCOL.md` — sổ tay tự đứng một mình, viết cho AI không phải Claude Code. Gói này **không có quyền `debugger`** nên nó không bấm được gì; cần bấm là việc của Scouter |
| **Sửa hoặc vận hành Scouter** | `workers/duc-scouter/v0.1.0/AGENTS.md` ([ADR-0009](docs/adr/0007-scouter.md)). Hai chỗ dễ vấp: **selector không bao giờ được gõ vào seed**, và cửa Bridge của nó **bắt tay hai chiều** nên chỉ nối được với máy chủ bản ChatGPT |
| **Thêm/sửa/bỏ một LUẬT, hoặc tới lượt rà hằng tuần** | `docs/protocols/RULE-COMPILER.md` — hai tầng (sổ cái ↔ bản hiệu lực), sáu bước `append → merge → supersede → trim → compile`, và bốn phép đo. **Trim không phải xoá**: luật rời bản hiệu lực thì xuống mục `Vế đã chết` của ADR kèm tên quyết định đã thay nó. Bộ đo cố ý **không có `--fix`** — AI đề xuất, Đức quyết |
| **Tìm một tài liệu, tra đường dẫn cũ, hay viết hồ sơ mới** | `docs/README.md` — mục lục, bản đồ 33 đường dẫn cũ → mới, bản đồ ADR cũ → file gộp, và các bản mẫu (`docs/_TEMPLATE-*.md`). **Hồ sơ đã nghỉ thì xoá**, git giữ hộ |
| **Lấy bộ chuẩn về dùng, hoặc sửa bộ chuẩn** | **KHÔNG CÒN Ở REPO NÀY** — `https://github.com/anhducds-GIT/Ark_Repo_Harness` ([ADR-0001](docs/adr/0001-ranh-gioi-bo-khung.md)). Repo này là **người dùng** |
| **Sửa gói Assistant** (`what-next.mjs` · `state-check.mjs` · `ORCHESTRATOR.md`) | **Sửa ở bộ khung TRƯỚC**, rồi mới về đây ([ADR-0001](docs/adr/0001-ranh-gioi-bo-khung.md) ⑷). Làm ngược là đẻ ra hai bản của cùng một gói, bản nào cũng tự xưng là bản chuẩn |
| **Đặt tệp ghép cặp, bộ khởi động, hay vùng ghi của Bridge** | **Đừng tự chọn chỗ.** Mọi thứ thuộc Bridge nằm dưới đường dẫn khai ở `thu_muc_ngoai_repo`. Dùng `node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --goi <gói>`: nó đọc bản đồ và tự đặt đúng chỗ. Vùng ghi **luôn là thư mục CON**, vì `file.read` đọc được mọi tệp dưới vùng ghi |
| **Cổng báo `DAU_VO` — bảng quyền bị sửa tay** | `git diff .agents/claims.json` → khoá của bạn có bị đổi chủ không → có thì **hỏi Đức** → chốt xong mới `--restamp`. **Đừng restamp cho xong việc**: làm thế là đóng dấu hợp lệ cho vụ sửa tay và xoá luôn tang chứng. Nếu lượt sửa đó chuyển chủ một khoá khỏi tay người khác, `--restamp` **từ chối** cho tới khi bạn đưa `--duc-duyet "<câu chốt>"`, và câu đó ghi **vào bảng** — nơi phiên vừa mất khoá thật sự đọc |
| **Làm cùng lúc với AI khác, hoặc sửa một trong bốn cơ chế đa phiên** | `docs/protocols/MULTIFLOW.md` — bốn cơ chế, sáu bất biến kèm lý do từng cái, quy trình đổi cơ chế (**bắt buộc có đột biến kiểm**: đếm được 4 lần trong một ngày một chốt vừa viết ra hoá ra vô tác dụng mà test vẫn xanh), và bảng tra mã lỗi |
| **Hiểu vì sao nhiều phiên hay va nhau** | `docs/studies/PARALLEL-WORK-DESIGN-V0.md` — tách hai vấn đề khác nhau: quyền bị ghi đè (bug, đã vá) và push cuốn theo commit người khác (hệ quả của một nhánh) |
| **Đức cần một câu để dán** | `PROMPTS.md` — mỗi flow một khối. **Mỗi câu phải chạy được với cả ba AI**, nên nó chỉ nói mục tiêu, không nói tên công cụ |
| **Đức muốn tự mở bảng trạng thái** | `bang-trang-thai/` — ba cửa, một lõi. Bốn chốt an toàn, `tests/bang-ba-cua-smoke.mjs` cưỡng chế cả bốn: ngừng sinh khi có phiên giữ `_code` và **nói rõ vì sao** · chỉ sinh bảng HTML · không commit/đẩy/nhận khoá · gộp nhịp 30 giây |
| **Sinh bảng cho Đức xem** | `node scripts/build-overview.mjs <file-ra.html>` — cùng nguồn với `DASHBOARD.md` nên ba trang không thể nói khác nhau. Bản ra **không commit**. Cấm trong trang: SHA · đường dẫn · phần trăm · lời máy tự khen |
| **Ghi một chỗ hỏng vấp phải khi đang làm việc khác** | `BACKLOG.md` — sổ nợ hạ tầng, miễn khoá, cửa ra là một dòng thêm ở cuối. Trường `đóng khi:` **bắt buộc** và cổng đếm nó: không khai được điều kiện đóng thì mục đó chưa đủ chín để ghi |
| **Hỏi làm gì TRƯỚC** | `ROADMAP.md` — sáu làn theo thứ tự Đức chốt, mỗi làn một **điều kiện đóng đo được**. Nó là THỨ TỰ, không phải trạng thái — trạng thái sống lấy bằng `node scripts/what-next.mjs`, và đừng tin con số nào gõ trong file đó |
| **Ghi một ý tưởng của Đức** | `IDEAS.md` — phòng chờ, không phải roadmap thứ hai. Bắt buộc `bậc` và `việc kế`; đang xây thì phải khai `chủ` + `phạm vi`. Ý tưởng có nhà rồi thì rời sổ |

## 8. Đóng phiên — ghi lại ba thứ

1. Một dòng Log vào `HANDOFF.md` của gói: làm gì, kết quả số, còn gì mở.
2. Quyết định mới của Đức → ADR của nó.
3. Gặp lỗi mới trên trang thật → một dòng vào bảng lỗi của sổ tay, **và** cân nhắc thêm một phép
   kiểm vào `scripts/session-check.mjs`.

> Luật nào máy không kiểm được thì sớm muộn cũng bị bỏ qua. Đó là lý do có cổng kiểm.
