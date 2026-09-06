---
kind: brief
status: active
ttl_days: 90
---

# BRIEF `K2-KHOA-RANH-01` — Khoá bị giữ mà không làm gì: hiện nó ra, và đừng nhận khoá quá sớm

Đức nêu ngày 06/09, sau khi một phiên khác phải đứng chờ:

> *"Việc giữ khoá lâu này tôi muốn highlight và fix, đây là issue nếu ta muốn chạy song song
> nhiều tác vụ. Cùng lúc bạn chạy ngầm nhiều quá, mà toàn giữ khoá không làm gì."*

## 1. Ba nguyên nhân khác nhau — nhập làm một là sửa sai chỗ

**① Nhận khoá quá SỚM.** Mọi bản giao việc ngày 06/09 mở đầu bằng *"Nhận khoá trước"*. Nhưng
lane dành **5–20 phút đầu để ĐỌC** — hiến pháp, brief, sổ nợ, code. **Đọc không cần khoá.** Nên
khoá nằm rảnh **do cấu trúc bản giao việc**, không phải do lane lười.

Ca đo được: lane `claude-codex-ngan` giữ **ba** khoá worker **14 phút** với **0 commit và 0 file
bị sửa** trong cả ba vùng.

> **Ca đó về sau hoá ra là DƯƠNG GIẢ, và nó là bằng chứng gốc của mục 2b bên dưới.** Lane ấy
> không đọc — nó **đang làm thật**, dựng bản viết ngắn trong một thư mục tạm **ngoài repo** và
> chỉ định ghi vào repo ở bước cuối. Phiên điều phối tin con số, nhả khoá hộ, và lane phải hoàn
> nguyên phần đã xong. Xem `N-10` trong `BACKLOG.md`.
>
> Nguyên nhân ① vẫn có thật — mọi bản giao việc ngày 06/09 vẫn mở đầu bằng *"nhận khoá trước"*,
> và đó vẫn là chỗ phải sửa. Nhưng **ca này không còn được dùng làm bằng chứng cho nó**, vì
> chính nó chứng minh điều ngược lại.

**② Giữ khoá khi bị chặn đẩy — cái này ĐÚNG, đừng sửa.** Luật *trả khoá sau khi đẩy* tồn tại vì
trả sớm để lại commit vô chủ. Sáng 06/09 bốn lane cùng giữ khoá gần một tiếng vì đúng lý do đó.
Bệnh thật là cái chặn chúng đẩy — mục `Y-16`, cổng xuất bản khoá chéo. **Sửa chỗ này là sửa sai
chỗ.**

**③ Phiên điều phối mở quá nhiều lane cùng lúc**, trong đó vài lane vừa mở đã xếp hàng chờ khoá
của lane khác — không làm gì được, nhưng trên bảng trông y hệt "đang chạy".

**Brief này chỉ chữa ① và ③.** Đừng đụng ②.

## 2. Việc — hiện ra, không chặn

`K2` hiện kiểm **quy thuộc**: commit này của ai, vùng này ai đứng tên. Nó **không** biết một khoá
đang bị giữ mà chẳng ai làm gì, vì nó chỉ nhìn commit, không nhìn thời gian giữ.

Thêm một tín hiệu, và nó rẻ vì cả hai vế đều có sẵn:

> **CHƯA THẤY DẤU VẾT TRONG REPO** — không commit nào chạm vùng đó kể từ lúc nhận khoá, **và**
> không file nào trong vùng bị sửa trên đĩa.

**Tên của tín hiệu là phần của hợp đồng, không phải chuyện chữ nghĩa.** Bản đầu của brief này
gọi nó là *"vùng chưa bị chạm"*, và người đọc — kể cả chính phiên điều phối viết ra nó — đọc
thành *"lane đang rảnh"*. Hai câu đó khác nhau: repo **chỉ thấy được thứ đã chạm repo**, mà một
lane cẩn thận thì dựng thử ở ngoài rồi mới ghi vào. Nên câu đúng là:

> Tín hiệu này nói **repo chưa thấy gì**. Nó **không** nói lane đang rảnh, và nó **không bao giờ
> đủ** để nhả khoá của lane khác.

Hiện ở **ba chỗ**, vì ba người đọc khác nhau. **Cả ba chỗ phải dùng đúng chữ này** — không chỗ
nào được rút gọn thành "rảnh", "nhàn", hay "không làm gì":

| Chỗ | Ai đọc | Phải nói gì |
|---|---|---|
| `claim.mjs --list` | mọi AI | thêm một cột: **chưa thấy dấu vết trong repo** |
| Khối "Đang làm gì" trên bảng | **Đức** | *"giữ 14 phút · repo chưa thấy dấu vết"* thay vì chỉ *"giữ 14 phút"* |
| Cổng đóng phiên | lane đang chạy | **VÀNG**, kèm câu nhắc **tự** trả khoá nếu chưa cần |

Câu nhắc ở cổng đóng phiên nói với **chính lane đang giữ khoá** — người duy nhất biết mình có
đang làm hay không. Nó không nói với ai khác.

### 2b. Cấm nhả khoá hộ lane khác dựa trên phép đo

**Không lượt đo nào cho phép một phiên nhả khoá của phiên khác đang chạy.** Không phải "đo kỹ
hơn thì được" — con số này **về nguyên tắc** không thấy được việc làm ngoài repo, nên đo thêm
bao nhiêu cũng không đóng được lỗ đó.

Ba đường hợp lệ để một khoá được trả, và chỉ ba:

1. **Chính lane đó trả** — sau khi đẩy (luật mục 1).
2. **Lane đó đã kết thúc** và Đức xác nhận, hoặc lane tự báo là đã xong.
3. **Đức chốt chuyển khoá** — ghi bằng `--restamp --duc-duyet "<câu chốt>"`, đúng luật mục 1.

Phiên điều phối thấy tín hiệu vàng thì **hỏi**, không nhả. Hỏi lane đó, hoặc hỏi Đức. Một câu
hỏi tốn 30 giây; nhả nhầm khoá làm lane kia mất việc đã xong — ngày 06/09 đã trả giá đúng bằng
cách đó.

**VÀNG, không ĐỎ. Đây là ràng buộc, không phải gợi ý.** Có ca hợp lệ: một lane đọc kỹ 30 phút
trước khi sửa một dòng là lane **tốt**. Chặn nó là dạy mọi lane **ghi bừa một byte để giữ khoá
cho hợp lệ** — và lúc đó phép kiểm biến thành thứ ngược lại chính nó.

**Cấm tự nhả khoá bằng máy.** Một lane sắp ghi mà bị rút khoá thì mất việc. Máy **hiện ra**,
người điều phối **hỏi** — không phải "người điều phối quyết". Bản đầu của brief này viết chữ
"quyết", và đúng ngày hôm đó phiên điều phối đã quyết một lần, sai. Xem mục 2b.

## 3. Việc thứ hai — sửa luật nhận khoá

`AGENTS.md` mục 1 và `docs/protocols/MULTIFLOW.md` nay phải nói rõ:

- **Nhận khoá ngay TRƯỚC lượt ghi đầu tiên**, không phải lúc mở phiên. Đọc và đo thì không cần
  khoá.
- **Một lane, một khoá worker.** Việc văn bản trải ba nhánh thì làm ba lượt. Ngày 06/09 một lane
  ôm ba khoá worker cho một việc sửa văn bản và chặn một phiên khác — **lỗi ở bản giao việc, do
  phiên điều phối viết**.
- Cần khoá thứ hai giữa lượt thì **nhận thêm lúc cần**, đừng gom sẵn từ đầu.
- **Không nhả khoá hộ lane khác vì đo thấy vùng chưa bị chạm.** Ba đường hợp lệ ở mục 2b. Câu
  này phải vào `AGENTS.md` mục 1 — đây là chỗ phiên điều phối đọc, và cũng là chỗ nó đã làm sai.

Chữ này phải ngắn. `AGENTS.md` đang là 27 KB và mục 6 chiếm hơn nửa — thêm một đoạn dài vào đó
là đổi một bệnh lấy một bệnh khác.

## 4. Đây là cơ chế đa phiên → ĐỘT BIẾN KIỂM BẮT BUỘC

`docs/protocols/MULTIFLOW.md` mục 5. Ít nhất:

- Khoá vừa nhận, vùng chưa chạm → **báo vàng**.
- Vùng có file bị sửa trên đĩa → **không** báo.
- Vùng có commit sau lúc nhận khoá → **không** báo.
- Gỡ phép kiểm → phép ghim **ĐỎ**.
- Đổi vàng thành đỏ → phép ghim **ĐỎ** (mức nghiêm trọng là phần của hợp đồng, không phải chi tiết).

**Đếm số chỗ mỏ neo của bạn khớp. Ra 0 thì DỪNG** — công cụ đo hỏng, không phải "không có gì
phải sửa". Ngày 06/09 chuyện này xảy ra với **sáu lane khác nhau** trong repo này.

## 5. Nghiệm thu

1. Dựng ca thật: nhận một khoá, không sửa gì → cả ba chỗ ở mục 2 đều nói **"repo chưa thấy dấu
   vết"**. Phép ghim kiểm **đúng chữ đó**: chỗ nào in ra "rảnh" · "nhàn" · "không làm gì" thì
   phép ghim **ĐỎ**. Chữ là hợp đồng (mục 2), nên nó phải được ghim như hợp đồng.
2. Sửa một file trong vùng đó → cả ba chỗ thôi báo.
3. Bảng **suy hoàn toàn từ HEAD** cho phần commit, đọc đĩa cho phần sửa đổi — **cấm phụ thuộc
   đồng hồ hệ thống**. Hai lượt sinh trên cùng HEAD ra giống hệt từng byte.
4. Cổng đóng phiên XANH TOÀN BỘ (vàng không chặn).
5. Chữ Đức đọc: **tiếng Việt có dấu** (`B15`).

## 6. Khoá và đóng phiên

`_code` (`claim.mjs`, `session-check.mjs`, `build-overview.mjs`, phép ghim) và `_docs`
(`MULTIFLOW.md`) và `_root` (`AGENTS.md`).

**Nhận từng khoá lúc cần, đừng gom cả ba từ đầu** — brief này nói về đúng chuyện đó, nên làm
ngược lại là tự bác chính mình.

Commit có dòng cuối `Lane: <tên-phiên>` · `git commit -o <đường-dẫn>` · cổng XANH TOÀN BỘ · sinh
lại artifact rồi commit trước khi đẩy · đẩy bằng `safe-push.mjs` · **trả khoá SAU khi đẩy**.

## 7. Cấm

- Cấm để phép kiểm này ĐỎ.
- Cấm máy tự nhả khoá của lane khác.
- **Cấm một phiên nhả khoá của phiên khác dựa trên phép đo** — ba đường hợp lệ ở mục 2b, không
  có đường thứ tư.
- **Cấm gọi tín hiệu này là "rảnh"** ở bất cứ đâu người hoặc AI đọc được.
- Cấm đụng luật "trả khoá sau khi đẩy" (nguyên nhân ②).
- Cấm viết một đoạn dài vào `AGENTS.md`.
