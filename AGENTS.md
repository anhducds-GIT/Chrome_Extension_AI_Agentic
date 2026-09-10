# AGENTS.md — hiến pháp repo

> **Tầng 1 giữ BẤT BIẾN; thủ tục ở Tầng 2** — mục 8 nói đọc gì **trước khi** làm gì, bắt buộc.
> **Đức chốt mọi thứ**, đọc tiếng Việt (mã lỗi và tên lệnh tiếng Anh — ADR-0000 ⑷ · ADR-0033).
> Trích ADR **theo số hiệu**; bản đồ số → file ở `docs/README.md`.

## 1. Một phiên

**Mở:** phiên **đụng một gói** đọc đúng **`PHIEN.md`** của gói đó — máy sinh, tự chứa, và đó là
**toàn bộ** thứ cần để bắt đầu (ADR-0035). Phiên **luật · điều phối · hạ tầng** đọc file này.
**Đừng nạp `HANDOFF.md` hay `AGENTS.md` của gói lúc mở** — chúng là nguồn của `PHIEN.md`, mở khi
cần đào sâu (ADR-0034).
**Làm:** một việc một lúc; phát sinh ngoài phạm vi ghi `BACKLOG.md`.
**Đóng:** một dòng Log vào `HANDOFF.md` của gói · quyết định mới của Đức thành ADR · lỗi mới trên
trang thật vào bảng lỗi của gói.

## 2. Ai được ghi ở đâu

Trạng thái ở `.agents/claims.json`. **Một vùng, một phiên được ghi tại một thời điểm.** Nhận và trả
**đi qua lệnh** — sửa tay là hai phiên cùng ghi tên mình.

- **Nhận khoá TRƯỚC lượt ghi, và ĐỌC KẾT QUẢ.** Bị TỪ CHỐI mà vẫn ghi là ghi vào vùng người khác.
  **Đừng nối `claim.mjs` vào ống.** Chỉ đọc thì không cần khoá.
- **Khoá FILE trả ngay sau lượt ghi** (hạn chót: hết phiên); ghi tiếp thì nhận lại.
  **Khoá VÙNG trả SAU KHI ĐẨY** — đẩy không được thì **giữ khoá và báo lại**.
- **Đừng nhả khoá của lane khác.** *"Chưa thấy dấu vết trong repo"* = repo chưa thấy gì, không phải
  lane đó rảnh. Ba đường hợp lệ: lane đó trả · lane đó báo xong · Đức chốt chuyển. **Khoá nằm lâu
  là lý do để HỎI, không phải để lấy.**
- **`--soat` bắt buộc trước `git commit`.** Kẹt chốt thì `git commit --no-verify` **và nói ra trong
  nhật ký** — cửa này không được gỡ.
- **Cổng báo `DAU_VO`:** `git diff .agents/claims.json` rồi **hỏi Đức**. **Đừng restamp cho xong
  việc** — nó xoá tang chứng.
- **Đừng `git checkout` / `reset` / `stash` file trạng thái sống**; so với HEAD bằng `git show`.
- **Miễn khoá chỉ miễn KHI THÊM DÒNG Ở CUỐI.** Sửa dòng cũ thì phải đang **giữ khoá** file đó.

## 3. Kiểm, commit, đẩy

```bash
node scripts/session-check.mjs --as <tên-phiên-của-bạn>
```

- **Cổng đỏ là chưa xong**, và **không nới một lớp bảo vệ để nó xanh**.
- **Suite là việc CUỐI CÙNG**, sau mọi lượt sinh artifact và commit. Ghi thêm là hỏng dấu — hỏng
  thì **chạy lại**; bất biến là *trạng thái cuối cùng đã được kiểm*.
- **Không bao giờ `git push` trần** (nó cuốn commit của phiên khác trên cùng cây làm việc):
  dùng `scripts/safe-push.mjs`.
- **Mọi commit kết bằng `Lane: <tên-phiên>`.** Nhãn là **nguồn gốc, không phải quyền**.
- **Commit và đẩy KHÔNG phải hỏi** (Đức chốt 26/08) khi đủ ba: việc **hoàn tất trọn vẹn** · cổng
  **XANH TOÀN BỘ**, code thì thêm **audit độc lập** · đẩy bằng `safe-push`. Uỷ quyền này chỉ mở
  kênh git.
- **`--carry` không phải hỏi** (ADR-0005 ⑶) — đổi lại **kể tên lane bị cuốn theo trong nhật ký**.
- **`--amend` chỉ cho commit của chính lane mình và CHƯA ĐẨY.**

## 4. Phải hỏi Đức trước

1. Thêm quyền (permission) mới cho extension
2. Chạy pilot live mới trên trang thật
3. Đổi luật an toàn (retry, halt, attribution, persistence, exact-once)
4. **Force-push, sửa lịch sử, merge nhánh vào `main`**

Cộng luật gốc của Đức: **không gửi gì ra ngoài · không xoá dữ liệu nguồn · không sửa dữ liệu gốc ·
không tạo automation tự chạy.** *(Xoá một phép kiểm chết hay hồ sơ đã nghỉ là bộ máy tự dọn mình —
ADR-0033 ⑸⒠.)*

## 5. Không bao giờ

- **Token, mật khẩu, tệp ghép cặp lọt vào repo. Repo này PUBLIC.**
- `pilot-*/` · `Pilot-*/` · `Batch-*/` · `evidence*/` · `HANDOFF-ARCHIVE-*.md` là bằng chứng:
  **chỉ được THÊM.** `drafts/` là nháp — ghi tự do, không phải bằng chứng.
- Gán `.innerHTML` / `.outerHTML` / `insertAdjacentHTML`.
- **Đoán selector** — phải có bằng chứng DOM thật từ `diagnostics.dom_probe`; ở Scouter
  **selector không bao giờ gõ vào seed**.
- **Tin báo cáo của AI khác.** Tự chạy lại test, tự đọc lại diff.
- Giao một bản vá **không kèm phép ghim**.
- **Tự ký nghiệm thu bản sửa của chính mình.** Vai nào cũng được *tìm lỗi*; thứ phải tách là
  **người ký** khỏi **người sửa**.
- Viết thứ Đức đọc không hiểu — đó là lỗi hệ thống, viết lại đơn giản hơn.

## 6. Vai, và chạy song song

Hai vai của **PHIÊN**, không của hãng — **① Hệ thống** (luật · bộ máy · cổng kiểm · trạng thái đa
phiên) và **② Sản phẩm** (mã của mọi extension và Scouter, cùng kiến trúc của nó), ADR-0029.
**Cả hai đều code được**; vai nói *ai sở hữu và ai ký nghiệm thu*.

- **Sản phẩm cần sửa hạ tầng thì GỬI YÊU CẦU** — một dòng `BACKLOG.md` kèm `đóng khi:`, không tự
  lấy vùng.
- **Điều phối là một CHẾ ĐỘ, không phải vai thứ ba** — mục 8.
- **Tối đa 2 CHAT song song** (ADR-0023 ⑵); tác vụ ngầm trong một chat **không giới hạn**, và **chủ
  khoá là tên CHAT**. Hai vai chạy cùng lúc thì **khác vùng**.

## 7. Giới hạn

1. **Cấm cài một tính năng hai lần.** Cần ở hai gói → `workers/_shared/` trước.
2. **Thước ràng buộc nhất: cái một phiên NẠP, đo bằng KÝ TỰ theo BÓ** (`luat.nap`) — ADR-0033 ⑴;
   riêng bó của gói thì đích suy từ **nền cố định**, ADR-0036. Con số hôm nay do **cổng in ra**,
   đừng gõ vào đây.
3. **Một luật vào thì một luật ra:** kể tên luật nó thay, hoặc đo được nó đã nổ mấy lần.
4. **Luật mới vào SỔ CÁI trước** (ADR-0027): file này biên dịch từ `docs/adr/`, rà **HẰNG TUẦN**
   (ADR-0000 ⑸), cổng ĐỎ khi còn chỗ **trích một vế đã chết**.
5. Trần sổ nợ · trần dòng `docs/` · phép kiểm chết: `RULE-COMPILER.md` mục 5a. **Hỏi Đức trước khi
   đổi một trần.**

## 8. Đọc TRƯỚC KHI làm — bắt buộc

<!-- BAN-DO:BEGIN -->

| Sắp làm | Đọc trước |
|---|---|
| Đụng một gói `duc-auto-*` | `AGENTS.md` của **chính gói đó**. **Ba gói là fork của nhau** — một lỗi thường có **ba** bản sao |
| Nhận khoá · commit · đóng phiên · tranh chấp khoá | `docs/protocols/MULTIFLOW.md` mục 3a–3b |
| Nhận việc **ĐIỀU PHỐI** | `docs/protocols/ORCHESTRATOR.md` — **HARD ROLE FIREWALL**: KHÔNG code, KHÔNG debug, KHÔNG đề xuất patch; không ngoại lệ "sửa nhỏ". Nạp báo cáo năm mục `DONE → STATE CHANGE → BLOCKER → HUMAN DECISION → NEXT WORK` rồi **DỪNG** |
| Thêm/sửa/bỏ một LUẬT hay TRẦN · lượt rà hằng tuần | `docs/protocols/RULE-COMPILER.md` |
| Ghi nhật ký · cắt sổ · đóng một mục sổ nợ | `docs/protocols/HANDOFF.md` · `RULE-COMPILER.md` 5a |
| Hỏi làm gì TRƯỚC | `ROADMAP.md` (thứ tự) · `what-next.mjs` (trạng thái sống) |
| Thêm/vận hành extension · đặt tệp ghép cặp hay vùng ghi Bridge | `PLATFORM.md`. **Đừng tự chọn chỗ** — `node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --goi <gói>` |
| Lấy dữ liệu HNX | `workers/hnx-fetch/PROTOCOL.md` — gói này **không có quyền `debugger`** |
| Sửa bộ chuẩn hay gói Assistant | **KHÔNG CÒN Ở ĐÂY** — `Ark_Repo_Harness` (ADR-0001) |
| **Trạng thái repo lúc MỞ PHIÊN — đang ở đâu, việc kế** | [STATUS.md](STATUS.md) — một trang, khai bằng tay; bảng đọc frontmatter của nó |
| **Thêm một luật, hay xem luật nào đang hiệu lực về một chủ đề** | `npm run luat` — bộ biên dịch luật, khung 1.8.0 |
| **Cãi một luật — tìm sự cố sinh ra nó** | [docs/VI-SAO-LUAT.md](docs/VI-SAO-LUAT.md) |
| **Bản đồ file đầy đủ (kèm vì sao · có gì bên trong)** | [docs/BAN-DO-CHI-TIET.md](docs/BAN-DO-CHI-TIET.md) |
| **Tra một thuật ngữ** (gate · claim · lane · fail-closed…) | [docs/LEGEND.md](docs/LEGEND.md) |
| **Mới vào, chưa biết bắt đầu từ đâu** | [docs/HUONG-DAN.md](docs/HUONG-DAN.md) |
| **Đến hạn bảo trì · repo im ắng lâu · muốn biết repo NẶNG bao nhiêu** | [docs/BAO-TRI-DINH-KY.md](docs/BAO-TRI-DINH-KY.md) · `npm run can-nang` · `npm run luat -- --nap` |
| **Xem bảng trạng thái chạy tại chỗ** | [bang-song/Xem-bang.cmd](bang-song/Xem-bang.cmd) — `npm run bang-song` |
| **Sắp commit — hai cửa MÁY** | `.githooks/` — `commit-msg` từ chối lượt commit cuốn theo file lane khác đang khoá; `post-commit` **tự trả khoá file**. Bật bằng `core.hooksPath=.githooks` — lượt `upgrade` đặt hộ, kiểm bằng `git config --local --get core.hooksPath`. **Cấu hình MỖI BẢN SAO, không đi theo file.** |
| **Bộ biên dịch luật / đo phần nạp bằng token** | `scripts/rule-compiler.mjs` — `npm run luat` |
<!-- BAN-DO:END -->
