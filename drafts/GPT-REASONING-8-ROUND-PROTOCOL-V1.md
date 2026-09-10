---
kind: draft-protocol
topic: gpt-reasoning-8-round
status: draft V1 — đã qua một lượt công kích của Codex (verdict UNSOUND cho V0)
author: claude-gpt-chay-het-job
created: 2026-09-10
supersedes: GPT-REASONING-8-ROUND-PROTOCOL-V0.md (đã xoá 10/09 — mục 9 giữ nguyên văn Codex bác gì)
authority: none — chưa ai chốt
note: "Mọi con số do tôi ĐO ngày 10/09. V0 bị Codex bác; mục 9 ghi nguyên văn nó bác cái gì."
---

# Reasoning 8 vòng — GPT nghĩ, CC chốt hướng ở ba mốc · **V1**

## 0. Vì sao có cái này

GPT Web reasoning **không tính phí** nhưng vẫn đọc **và ghi** được GitHub. Việc lặp lại, có
mục tiêu rõ — soạn đề IELTS, tổng hợp dữ liệu hero trong game, kiểm toán một repo — GPT làm
được qua nhiều phiên nếu có ai giữ hướng. CC đắt hơn nhiều, nên CC chỉ nên xuất hiện ở chỗ
**quyết định**, không ở chỗ **cày**.

Nỗi lo Đức nói ra: *reasoning một chuỗi dài rồi kết quả không như mong muốn*. Cả protocol này
tồn tại để chặn đúng cái đó — và V0 **không chặn nổi**, xem mục 9.

## 1. Hình dạng

```
      CC①            GPT×≤4             CC②            GPT×≤4            CC③
   khởi tạo   →   vòng 1-4    →    chốt hướng   →   vòng 5-8    →    nghiệm thu
   + HỢP ĐỒNG     tự nối vòng      đọc FILE,        tự nối vòng      đọc FILE,
   + MẪU ĐÚNG/SAI ghi vào file     không đọc chat   ghi vào file     kết luận
```

**8 là TRẦN, không phải chỉ tiêu.** Xong sớm thì dừng sớm. Không có trần thì model có động cơ
chế thêm việc để nối vòng — pilot 10/09 đã thấy: hết 5 vòng Đức yêu cầu, GPT vẫn tự đề nghị
vòng 6.

**CC không đọc chat để lấy nội dung.** Chat là đường ống, **file trong repo là sản phẩm**.

## 2. Hai thư mục, hai thẩm quyền — KHÔNG một

```
drafts/<chủ-đề>/
├── CC/            ← Đức + CC ghi.  GPT CẤM ghi.  HOP-DONG.md, CHOT-HUONG-*.md, NGHIEM-THU.md
└── GPT/           ← GPT ghi.       Nội dung ở đây là CHƯA ĐƯỢC TIN cho tới khi CC kiểm
```

V0 để cả hai chung một chỗ. Codex chỉ ra: như thế **GPT sửa được chính hợp đồng ràng buộc nó,
và sửa được cả biên bản phê duyệt của CC**. Tách ra là sửa rẻ nhất cho một lỗ đắt nhất.

**Chống tự-rửa-nguồn (self-laundering) — lỗ nguy nhất Codex tìm ra.** GPT viết một phỏng đoán
ở vòng 2; vòng 3 nó đọc lại file đó như "nội dung trong repo"; vòng 6 nó dẫn lại như bằng
chứng đã xác lập. Ghi thêm-dòng **bảo tồn** cái sai chứ không chặn cái sai lên đời. Luật:

- Mỗi phát hiện có **mã** (`F-01`, `F-02`…) và **nguồn gốc** là đường dẫn mã thật + số dòng.
- GPT được dẫn lại phát hiện cũ **bằng mã**, nhưng phải **dẫn lại nguồn gốc**, không dẫn file
  nháp của chính nó.
- Không có nguồn gốc thì phát hiện đó là **giả thuyết**, ghi rõ chữ đó, và không được xây tiếp.

## 3. Hợp đồng vòng 0 — `CC/HOP-DONG.md`

| Trường | Nghĩa |
|---|---|
| `muc_tieu` | Một câu, có động từ |
| `san_pham` | File nào, hình dạng gì |
| `xong_la_gi` | Điều kiện nghiệm thu **đo được** |
| `mau_dat` | **Một ví dụ kết quả CHẤP NHẬN ĐƯỢC, Đức duyệt** |
| `mau_khong_dat` | **Một ví dụ TRÔNG ĐÚNG mà không dùng được** |
| `chuan_bang_chung` | Bằng chứng thế nào thì đủ — **riêng cho câu khẳng định VẮNG MẶT** |
| `moc_nguon` | **Commit SHA** được audit. Không phải "mã trên `main`" |
| `ngoai_pham_vi` | Cắt trước |
| `khong_biet_thi_sao` | Ghi `CHƯA TÌM THẤY`, không đoán |

**`mau_dat` + `mau_khong_dat` là hai trường V0 thiếu, và thiếu chúng là lý do V0 hỏng.** Một
điều kiện đo được vẫn có thể được thoả **trọn vẹn** mà kết quả vô dụng: pilot 10/09 chấm đủ 27
nhóm luật kèm đường dẫn bằng chứng — đúng khuôn, và **sai một mục** vì tìm sai phạm vi.

**`moc_nguon` là commit SHA vì `main` đổi giữa chừng.** Trong pilot tôi đẩy **ba** commit
trong lúc GPT đang audit chính repo đó.

**Chuẩn bằng chứng cho câu VẮNG MẶT** — chỗ pilot sai:
> *"Không có hook"* không được viết. Chỉ được viết *"không tìm thấy trong phạm vi đã tìm:
> `<liệt kê đường dẫn/lệnh đã quét>`."*

GPT chấm `innerHTML` là RỖNG. Thực tế `tests/artifact-integrity-smoke.mjs:71` có
`assert.doesNotMatch(…, /\.innerHTML\s*=/)` chạy thật trong suite — nó audit từ **gốc repo**
nên không thấy ghim **mức gói**.

## 4. Giao kèo nối vòng — phần MÁY đọc

```
GIAO KÈO NỐI VÒNG — phần này do MÁY đọc:
1. Kết thúc câu trả lời bằng ĐÚNG MỘT khối mã, và nó phải là khối CUỐI CÙNG.
2. Trong khối chỉ chứa prompt cho vòng kế tiếp — không lời dẫn, không giải thích.
3. DÒNG ĐẦU của khối phải khai người nhận:
      NGƯỜI NHẬN/THỰC THI: <GPT Web | Claude Code (CC) | Đức>
4. Xong việc thì kết thúc KHÔNG có khối mã nào. Máy hiểu đó là lệnh DỪNG.
```

**Điều 3 mua bằng một lỗi thật, 10/09.** Vòng 6 của chuỗi `luat-audit` phát ra một khối là
**chốt kiểm dành cho CC**. Bộ chạy chuyển nó ngược về GPT, và GPT **từ chối đúng vai**:
*"Prompt này được giao cho Claude Code, không phải GPT Web… như vậy sẽ phá đúng vai trò kiểm
tra độc lập đã thiết kế."* Luật chống tự-nghiệm-thu chạy được — nhưng bộ chạy chấm nhầm là
`HET_CHUOI`. Có dòng người nhận thì máy dừng bằng `CAN_NGUOI` và nói rõ tới lượt ai.

Máy chỉ so **phần tên trước dấu ngăn đầu tiên**. So cả dòng thì `Claude Code (CC) — đối chiếu
kết quả GPT` sẽ bị đọc thành của GPT.

**Đo được, 5/5 vòng:** khối lấy về 805 → 1069 → 1213 → 1206 → 1331 ký tự, máy đọc rồi máy gửi.

**Nhưng số vòng do BÊN ĐIỀU KHIỂN đếm, không do khối quyết định.** Codex chỉ đúng: thiếu khối
**không** phân biệt được *"đã xong"* với *"câu trả lời hỏng"* hay *"đọc hụt"*. Trần vòng và
mốc dừng phải nằm ở phía CC, độc lập với thứ GPT phát ra.

## 5. Ba luật đọc — mua bằng lỗi thật

**⒜ `generating` đọc HẸP.** `true` là lệnh chờ tiếp, đáng tin. `false` **không** phải giấy
chứng nhận đã xong. Chữ ngừng dài ra không nói gì cả — GPT gọi tool thì chữ đứng yên hàng
phút. Tôi chế ba phép đoán sai liên tiếp và gửi lại prompt hai lần vào một lượt đang trả lời
bình thường (`~~B-57~~`).

**⒝ Không có khối ≠ dừng, cho tới khi đã NẠP LẠI MỘT LẦN** (`B-59`):

| vòng | trước khi nạp lại | sau khi nạp lại |
|---|---|---|
| 1 | 173 ký tự, không khối | 3450 ký tự, khối 805 |
| 3 | 86 ký tự, không khối | 2934 ký tự, khối 1213 |
| 4 | 48 ký tự, không khối | 3183 ký tự, khối 1206 |

Tin ngay lần đọc đầu thì chuỗi **dừng nhầm 3/4 vòng**.

**⒞ Lệnh GHI bị `REQUEST_TIMEOUT` thì KHÔNG tự gửi lại** (`B-58`). Trong pilot **4/4 lượt gửi
đều báo lỗi, và 4/4 đều đã bay**. Đọc lại bằng `chat.read` rồi mới quyết.

## 6. GPT tự kiểm reasoning của nó — và chỗ ba cơ chế cùng mù

Tiền lệ trong repo (`docs/briefs/AUDIT-PROMPT-S2-GPT.md`): **đưa model những LỜI TUYÊN BỐ để
công kích, đừng bảo nó "đi tìm lỗi"**. Đúng, nhưng chưa đủ.

- **⒜ Hạn mức đọc, khai trước.** Vòng 1 không hạn mức → 10 lượt đọc, 6 phút 3 giây, lượt trả
  lời chết. Vòng 2-5 có hạn mức 6-8 lượt → 1m37s–3m52s, xong sạch cả bốn.
- **⒝ Bắt buộc khai chỗ không kiểm được**, kèm **phạm vi đã tìm**.
- **⒞ Vòng sau công kích vòng trước — nhưng CC chọn câu nào bị công kích, không phải GPT.**

**Vì sao đổi ⒞:** Codex chỉ ra cả ba cơ chế **cùng một điểm mù** — hạn mức chỉ giới hạn tài
nguyên; danh sách "không kiểm được" chỉ ghi những lỗ **GPT tự nhận ra**; và tự-công-kích để
GPT chọn cả câu lẫn cách bác. Kết cục: nó bác một kết luận ngoại vi dễ mỗi vòng, còn **câu sai
ở giữa sống sót đủ 8 vòng**. Đúng cái đã xảy ra với `innerHTML`.

## 7. CC làm gì ở ba mốc

**Mốc ① — khởi tạo.** Cùng Đức chốt hợp đồng, **gồm cả `mau_dat` và `mau_khong_dat`**. Chốt
`moc_nguon`. Nếu `xong_la_gi` chưa đo được thì hoặc dừng hỏi Đức, hoặc **đổi đề bài thành một
câu hỏi có ranh giới**, và sản phẩm của chuỗi chính là một hợp đồng tốt hơn.

**Mốc ② — chốt hướng, ở LẦN KÍCH HOẠT ĐẦU TIÊN, chậm nhất sau vòng 4.** Không chờ đủ 4 vòng
nếu đã có tín hiệu. Kích hoạt khi bất kỳ điều nào xảy ra:
- sản phẩm mẫu trượt `mau_dat`;
- một kết luận nền bị bác, hoặc thiếu bằng chứng theo `chuan_bang_chung`;
- **hai vòng liên tiếp không tiến thêm gì kiểm được**;
- hết hạn mức đọc mà chưa gỡ xong một phụ thuộc;
- `moc_nguon` đổi, hoặc không xác nhận được file đã ghi.

Viết vào `CC/CHOT-HUONG-1.md`, trả lời đúng ba câu: đã lệch chưa · kết luận nào của GPT tôi
**kiểm lại được và sai** · bốn vòng tới phải trả lời câu gì.

**Mốc ③ — nghiệm thu.** Đối chiếu với `xong_la_gi` và `mau_dat`. Đạt hoặc không, nói thẳng.

**Luật cứng ② và ③: CC tự kiểm ít nhất hai kết luận bằng mã thật, và ít nhất một phải là câu
khẳng định VẮNG MẶT** — đó là loại câu pilot đã sai. Hai câu là **mức sàn của việc phải làm,
không phải bằng chứng rằng cả sản phẩm đáng tin**.

## 8. Ghi file — ĐÃ ĐO 10/09, và kết quả đáng lo

**GPT ghi được thật.** Yêu cầu tạo `drafts/hook-audit/VONG-1-5-KET-QUA.md`; sau 52 giây file
có mặt trên `origin/main`, 60 dòng, đúng đường dẫn, nội dung dùng được.

**Nhưng nó commit THẲNG vào `main`:** commit `436ee0ff`, không nhánh, không PR, **không có
`Lane:`**, không qua cổng nào — và ký tên **`J <anhducds@gmail.com>`**, tức **trùng danh tính
với commit tay của Đức**. Từ trong lịch sử git, một commit của GPT và một commit của Đức
**không phân biệt được**.

- Nó tuân thủ `drafts/` — **vì tôi bảo thế, không vì có gì chặn**. Codex nói đúng:
  *"'không có gì bí mật đi vào đây' là một chỉ dẫn, không phải một cái chốt."*
- Repo **CÔNG KHAI**. Ghi vào đây là **xuất bản**, không hoàn tác được bằng cách xoá.
- **Cần Đức quyết:** cho GPT đẩy thẳng `main`, hay bắt nó mở nhánh/PR? Nếu vẫn đẩy thẳng thì
  ít nhất phải có một dấu phân biệt trong commit message (ví dụ `Lane: gpt-web`), nếu không
  thì luật *"commit nào cũng phải có Lane"* vừa có thêm một nguồn vi phạm mà không ai thấy.

## 9. V0 bị bác cái gì — giữ nguyên văn để đối chiếu

Codex chấm V0 **UNSOUND**. Năm chỗ, tôi nhận cả năm:

1. **Điều kiện đo được vẫn có thể được thoả mà vô dụng** — chuỗi không cần lệch hướng, nó chỉ
   cần tối ưu trung thành cho một điều kiện nghiệm thu tồi. → thêm `mau_dat`/`mau_khong_dat`.
2. **`moc_nguon` phải là SHA**, vì `main` đổi giữa chừng. → thêm trường.
3. **Tự rửa nguồn**: GPT dẫn lại chính nháp của nó như bằng chứng. → mã phát hiện + bắt buộc
   dẫn nguồn gốc.
4. **Hợp đồng và biên bản của CC nằm cùng chỗ GPT ghi được.** → tách `CC/` và `GPT/`.
5. **Ba cơ chế tự kiểm cùng một điểm mù**, và **4 là con số lịch trình chứ không phải khoảng
   điều khiển**. → CC chọn câu bị công kích; mốc ② theo tín hiệu; 8 là trần.

**Còn hở, chưa vá:** không có gì **cưỡng chế** GPT ghi trong `drafts/` — vẫn chỉ là câu chữ
trong prompt. Và 8 vòng vẫn chưa chạy bao giờ; dài nhất là 5, và vòng 1 chết một lần.

## 10. Lượt 12 vòng đã đo được gì — bổ sung 10/09, sau khi chạy thật tới Vòng 6

**Chạy được 6 vòng, Đức không dán gì.** Chuỗi dừng ở Mốc ② đúng như thiết kế, không phải vì hỏng.

**Điều mừng nhất: luật chống tự-nghiệm-thu chạy được mà không ai nhắc.** GPT nhận khối dành cho
CC và từ chối thực thi, tự nêu đúng lý do. Đây là cơ chế mục 6 lo là mù — nó không mù ở ca này.

**Điều đắt nhất: chỗ hỏng không nằm ở reasoning, nằm ở GIÁC QUAN.** Sáu lỗi trong một ngày,
không lỗi nào thuộc phần suy luận; tất cả đều ở câu *"bây giờ trên trang đang xảy ra chuyện
gì"*. Năm lỗi đầu cùng một họ — lấy một **dấu hiệu vắng mặt** làm **bằng chứng kết thúc**. Lỗi
thứ sáu tệ hơn: không biết **người** đang dùng tab. Xem `B-57`…`B-63` trong BACKLOG của gói.

**Luật mới cho hợp đồng vòng 0 — ĐỪNG ĐỂ GLOB ĐẾM PHẠM VI.** Hợp đồng `luat-audit` viết phạm vi
bằng `workers/*/AGENTS.md · workers/*/v*/AGENTS.md (5 gói)` kèm tổng *"13 file, 2281 dòng"*.
Cả hai con số đều sai, và sai **vì cùng một chỗ**: glob quét trúng `workers/_shared/AGENTS.md`
lần thứ hai (cộng dư đúng 128 dòng) và đồng thời làm **rơi** `workers/hnx-fetch/AGENTS.md` —
gói duy nhất không có thư mục `v*/`. Hai lỗi ngược chiều **che nhau**, nên tổng trông hợp lý và
không ai đếm lại; GPT làm hết 6 vòng trên một phạm vi thiếu 5,8%.

→ **Phạm vi phải là danh sách TÊN FILE, kèm số dòng từng file.** Glob dùng để *tìm ra* danh
sách, không dùng để *ghi* nó. Và tổng phải kiểm lại được bằng một lệnh, không phải bằng mắt.

**GPT hỏi đúng chỗ bất nhất và KHÔNG tự đoán.** Nó thấy `(5 gói)` không khớp `13 file`, nêu ra,
và dừng chờ phán quyết — đúng luật `khong_biet_thi_sao`. Chỗ này protocol không cần sửa.

**Vẫn còn hở, chưa vá:** ⑴ không có gì **cưỡng chế** GPT ghi trong `drafts/`, và `Lane: gpt-web`
vẫn chưa được cưỡng chế — commit của GPT dùng chung danh tính git với Đức. ⑵ 12 vòng vẫn chưa
chạy trọn; dài nhất là 6. ⑶ Bên trong một hội thoại đang chạy chuỗi, **người và máy dùng chung
một chỗ** — bộ chạy nay biết nhường, nhưng chưa có cách hai bên cùng làm việc.
