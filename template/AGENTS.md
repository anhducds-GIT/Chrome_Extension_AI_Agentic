# AGENTS.md — Hiến pháp repo (đọc đầu tiên, mọi AI)

> Đây là **Tầng 1**: luật chung, cố tình giữ ngắn 1 trang. Đọc hết trước khi gõ dòng đầu tiên.
> Chi tiết kỹ thuật KHÔNG nằm ở đây — xem mục "Sổ tay mở khi cần" bên dưới.
> Chủ dự án là **Đức** (non-tech, tiếng Việt, câu ngắn). Đức là người chốt duy nhất.

## 0. Ba việc phải làm, theo đúng thứ tự

1. **Mở phiên:** đọc file này → đọc `AGENTS.md` của package mình sắp đụng → đọc `HANDOFF.md`
   của package đó (phần cuối = trạng thái mới nhất).
2. **Làm việc:** một việc một lúc. Phát sinh việc ngoài phạm vi → ghi vào `BACKLOG.md`, không tự làm.
3. **Đóng phiên:** chạy cổng kiểm dưới đây. Đỏ thì chưa xong.

```bash
node scripts/session-check.mjs --as <tên-phiên-của-bạn>
```

Không được báo "xong" khi cổng kiểm chưa xanh. Không được tự sửa cổng kiểm cho nó xanh.

**Push thì KHÔNG dùng `git push`** — dùng:

```bash
node scripts/safe-push.mjs --as <tên-phiên-của-bạn>
```

Lý do: nhiều phiên AI dùng chung một thư mục git, nên `git push` của bạn **cuốn theo commit của
mọi phiên khác**. Ngày 26/08 chuyện này đã xảy ra thật — một phiên push và kéo theo 2 commit chưa
được Đức duyệt của phiên khác. `safe-push` liệt kê rõ sắp đẩy gì của ai, và từ chối nếu bạn đang
cuốn theo việc người khác. Push được tự làm khi đủ điều kiện ở mục 2 — không cần hỏi từng lần.

## 1. Ai giữ package nào — chống hai AI giẫm chân

Bảng chủ sở hữu là `.agents/claims.json`. **Một vùng chỉ có MỘT phiên AI được ghi tại một thời điểm.**

**Nhận và trả quyền bằng lệnh, đừng sửa file bằng tay:**

```bash
node scripts/claim.mjs --list
node scripts/claim.mjs --take <khoá> --as <tên-phiên> --task "một câu"
node scripts/claim.mjs --release <khoá> --as <tên-phiên>
```

Sửa tay là đọc-sửa-ghi, và ngày 02/09 đã có một quyền **bị ghi đè im lặng** vì thế: hai phiên
cùng đọc thấy "trống" rồi cùng ghi tên mình, người ghi sau thắng, người ghi trước không hề biết.
Lệnh này **từ chối** nhận vùng đã có chủ khác, **từ chối** trả quyền hộ người khác, và ghi rồi
đọc lại để kiểm.

- Vùng đang có chủ, mà chủ không phải bạn → **chỉ được đọc, tuyệt đối không sửa**.
- Vùng trống chủ → nhận rồi làm.
- Muốn giành vùng người khác đang giữ → **hỏi Đức**, không tự lấy.

**Gốc repo chia làm NHIỀU khoá** (từ 02/09) — trước đó một khoá `_root` che cả bảy thư mục gốc,
nên hai việc không hề chồng nhau vẫn chặn nhau:

| Khoá | Che gì |
|---|---|
| `_docs` | `docs/` |
| `_code` | `scripts/` + `tests/` |
| `_template` | `template/` |
| `_root` | phần còn lại và các file ở tầng ngoài cùng |

Nhận đúng vùng mình đụng, không nhận cả gốc repo. Cổng đóng phiên sẽ nói tên khoá còn thiếu.
Ai chia vùng thì khai `steward` trong khối `areas` của `.repo-structure.json`.

**Hai file được MIỄN, và lý do khác nhau:** `.agents/claims.json` (nhận/trả quyền là thao tác
hành chính — không miễn thì không ai trả lại được quyền) và `HANDOFF.md` ở gốc (luật mục 7 bắt
MỌI phiên ghi Log — nhưng **chỉ miễn khi chỉ thêm dòng**; sửa hay xoá dòng cũ là viết lại lịch
sử của phiên khác).

Đây không phải hình thức. Ngày 25–26/08 đã suýt hỏng vì hai phiên AI cùng làm trên một repo, và
ngày 02/09 đo được **98 trong 127 commit (77%) chạm gốc repo** — một khoá duy nhất là điểm nghẽn
thật, không phải lý thuyết.

## 2. Những việc PHẢI hỏi Đức trước

1. Đổi luật an toàn của repo (thử lại · dừng khẩn · quy trách nhiệm · lưu trạng thái · làm-đúng-một-lần)
2. Bất cứ việc nào **phụ lục nghề** của repo bạn liệt kê — xem `docs/ANNEX-*.md`

Ngoài ra, luật gốc của Đức: không gửi gì ra ngoài, không xoá file, không sửa dữ liệu gốc,
không tạo automation tự chạy — nếu chưa hỏi.

**Commit và push được tự làm** — Đức chốt 2026-08-26, áp cho MỌI AI — nhưng chỉ khi đủ
cả ba điều kiện:

1. việc đã hoàn tất trọn vẹn (việc dở dang thì KHÔNG push);
2. cổng kiểm `session-check.mjs` XANH TOÀN BỘ (và với code: đã qua audit độc lập);
3. đẩy bằng `safe-push.mjs`, không bao giờ `git push` trần.

Lý do Đức đổi luật: Đức không đọc được code local; GPT audit qua GitHub connector, nên
commit chưa push là **vô hình** với vòng kiểm tra chéo. Push sớm = được audit sớm.

Hai ngoại lệ vẫn phải hỏi: (a) safe-push từ chối vì sắp cuốn theo commit của phiên khác —
đẩy hộ việc người khác không nằm trong luật này; (b) force-push, sửa lịch sử, merge nhánh
vào `main`.

## 3. Năm luật vàng

1. **Không đoán.** Mọi khẳng định về một hệ thống thật phải có bằng chứng ĐO ĐƯỢC. Cần bằng
   chứng mới → tự đi lấy, đừng mượn mắt Đức. Lấy bằng cách nào là việc của phụ lục nghề.
2. **Mỗi fix một test ghim.** Và fixture phải DỰNG NỔI ca hỏng — một phép kiểm không phân
   biệt được hai nhánh là đồ trang trí, dù nó xanh.
3. **Không làm yếu lớp bảo vệ đã có** để cho test xanh. Sửa bug được; gỡ bảo vệ thì không.
4. **Kiểm chứng độc lập mọi báo cáo của AI khác.** Tự chạy lại test, tự đọc lại diff.
   Agent phụ báo "xong" không phải bằng chứng.
5. **Viết cho mắt Đức đọc.** Đức đọc không hiểu = lỗi hệ thống, viết lại đơn giản hơn.
   Chữ operator nhìn thấy: tiếng Việt. Mã lỗi (CODE): tiếng Anh.

## 4. Vùng cấm sửa

- Thư mục bằng chứng — khai `"mutability": "append-only"` trong `.repo-structure.json`.
  **Chỉ được THÊM mới**, không sửa, không xoá, không tạo lại. Tên thư mục là việc của repo bạn.
- Không bao giờ để token / mật khẩu / file pairing vào repo.
- Những điều cấm riêng của nghề repo bạn — xem `docs/ANNEX-*.md`. Chưa có phụ lục thì bỏ dòng này.

## 5. Vai từng AI

| AI | Việc chính | Không được |
|---|---|---|
| **Đức** | Chốt mọi thứ | — |
| **Claude** | Kiến trúc, phản biện, audit độc lập, điều phối | Push khi cổng kiểm chưa xanh |
| **Codex** | Code theo brief, audit độc lập | Tự mở rộng phạm vi ngoài brief |
| **Antigravity** | Dựng UI, tạo giao diện | Sửa lớp an toàn / runner / bridge |

Ba AI có thể cùng lúc trong repo, nhưng **khác package** (mục 1).

**Cửa vào của từng AI** — cách file này đến được tay bạn:

| AI | Cách nạp | Đức phải làm gì |
|---|---|---|
| Claude | Tự đọc `CLAUDE.md` gốc → trỏ sang file này | Không phải làm gì |
| Codex | Tự đọc `AGENTS.md` gốc | Không phải làm gì |
| Antigravity | Dán **một câu mở màn**: *"Đọc AGENTS.md ở gốc repo trước khi làm gì."* | Dán 1 dòng mỗi phiên |

Antigravity đã được thử live 26/08: nó đọc file này, tự lần ra `.agents/claims.json`, và tự
kết luận "package có chủ rồi nên tôi chỉ được đọc" — dù không ai hỏi câu đó. Luật dùng được.
Nhưng chưa chứng minh được nó **tự** nạp lúc mở phiên, nên câu mở màn là bắt buộc: 3 giây,
miễn nhiễm với mọi thay đổi phiên bản, và nếu nó vốn tự nạp thì câu đó chỉ thừa vô hại.

## 6. Sổ tay mở khi cần — Tầng 2

> **Bảng này là BẢN ĐỒ RIÊNG CỦA REPO BẠN.** Bộ khung điền sẵn các dòng cho chính những file
> nó mang theo — vừa để repo mới xanh ngay, vừa làm mẫu cho định dạng. **Thêm dòng của bạn vào
> đây; đừng xoá cái đang đúng.**

Luật chung nằm ở các mục trên. Chi tiết kỹ thuật thì nằm ở các file mà bảng dưới trỏ tới —
không đọc trước, tới việc nào thì mở sổ tay đó.

| Khi bạn sắp… | Mở file |
|---|---|
| Hiểu bộ khung này gồm gì và dùng thế nào | [README.md](README.md) |
| Khai trạng thái cho một đơn vị công việc | [STATUS.template.md](STATUS.template.md) |
| Ghi một quyết định kiến trúc | bản mẫu [docs/_TEMPLATE-adr.md](docs/_TEMPLATE-adr.md) · luật [docs/adr/0000-…](docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md) |
| Viết một tài liệu nghiên cứu | [docs/_TEMPLATE-study.md](docs/_TEMPLATE-study.md) |
| Viết đề bài cho một phiên AI | [docs/_TEMPLATE-brief.md](docs/_TEMPLATE-brief.md) |
| Biết phiên trước làm tới đâu | [HANDOFF.md](HANDOFF.md) — đọc phần **cuối** file |
| Biết repo đang nợ gì về cấu trúc | chạy `npm run bootstrap` |
| Hiểu bộ khung tự kiểm mình bằng gì, hoặc thêm test của repo bạn | [tests/harness-smoke.mjs](tests/harness-smoke.mjs) — bốn khối hạt giống, chạy bằng `npm test` |
| Biết luật riêng của NGHỀ repo bạn (không phải luật chung) | phụ lục nghề: [docs/ANNEX-tu-dong-hoa-trinh-duyet.md](docs/ANNEX-tu-dong-hoa-trinh-duyet.md) là bản mẫu có thật · viết cái của bạn theo [docs/_TEMPLATE-annex.md](docs/_TEMPLATE-annex.md) |

**Vì sao phải là liên kết chứ không phải chữ thường:** phép kiểm độ sâu điều hướng (B6) đi theo
liên kết từ cổng vào máy đọc. File không ai trỏ tới thì máy coi là không tới được — và một bản
mẫu không ai tới được thì đúng là sẽ không ai dùng. Đo thật lúc dựng bộ khung này: để bảng rỗng
thì **4 file** rơi ra ngoài bản đồ, kể cả chính `README.md`.

**Luật vàng số 4 áp ở đây:** thêm file hoặc thư mục mới thì phải khai một dòng vào bảng này.
Không khai = không tồn tại. Cổng đóng phiên có phép kiểm này.
## 7. Đóng phiên — ghi lại 3 thứ

1. Một dòng Log vào `HANDOFF.md` của package: làm gì, kết quả số, còn gì mở.
2. Quyết định mới của Đức → `decisions.md`.
3. Gặp lỗi mới ở một hệ thống bên ngoài → thêm 1 dòng vào bảng lỗi của sổ tay, **và** cân
   nhắc thêm 1 phép kiểm vào `scripts/session-check.mjs`.

> Luật nào không kiểm được bằng máy thì sớm muộn cũng bị bỏ qua. Đó là lý do có cổng kiểm.
