---
kind: study
status: active
ttl_days: 60
---

# TOKEN-DIET-V0 — repo này bắt mỗi phiên AI nuốt bao nhiêu chữ trước khi làm được việc gì

> Lượt này CHỈ ĐO. Không sửa một file nội dung nào. Ý tưởng gốc: `Y-14` trong `IDEAS.md`.
> Con số nào cũng có lệnh đi kèm để tự chạy lại — đừng tin số, chạy lại.

## Câu hỏi

Bốn câu, trả lời bằng số:

1. Cái gì nạp **tự động** mỗi phiên, và tốn bao nhiêu?
2. Trong `AGENTS.md`, bao nhiêu phần là **luật**, bao nhiêu phần là **mục lục**?
3. Bốn file `HANDOFF.md` — giữ lại 20 lượt gần nhất thì còn bao nhiêu?
4. Có **rác thật** không, đo được bằng số?

Rồi: cắt cách nào lãi nhất trên mỗi đơn vị rủi ro — và **cắt xong thì luật còn đến tay người cần đọc không?**

---

## Cách đo

### Ước lượng token — nói rõ cách làm

Máy này **không có tokenizer thật** (`node_modules` rỗng, không có `tiktoken`). Nên token là **ước lượng**, không phải số đếm. Công thức dùng suốt bài:

```
token ≈ (số byte ASCII / 4) + (số byte non-ASCII / 1.6)
```

Hiệu chỉnh như sau: văn bản ASCII thuần ra đúng **4 byte/token** — tỉ lệ chuẩn đã biết của BPE trên tiếng Anh; văn bản tiếng Việt dày dấu (mỗi chữ có dấu tốn 2 byte UTF-8) rơi vào **~2,6 byte/token** — mức thường đo được của BPE trên tiếng Việt. File repo này là hỗn hợp: đường dẫn, lệnh, mã lỗi bằng ASCII; văn xuôi bằng tiếng Việt.

**Sai số: ±25%.** Mọi kết luận dưới đây đều đúng dấu (cái nào to hơn cái nào) kể cả ở biên sai số, vì khoảng cách giữa các mục là hàng chục lần chứ không phải vài phần trăm.

Script: `scratchpad/tok.mjs` (không commit — nó là dụng cụ đo, không phải sản phẩm).

### **[ĐO]** — số Đức đưa là BYTE, không phải ký tự

Kiểm lại điểm bắt đầu trước khi dùng. Số trong đề bài là **byte**, không phải ký tự:

| File | Đề bài nói | Byte thật **[ĐO]** | Ký tự thật **[ĐO]** |
|---|---|---|---|
| `AGENTS.md` gốc | 26.034 | 26.034 ✓ | 20.995 |
| `HANDOFF.md` gốc | 251.501 | 251.501 ✓ | 201.900 |
| `workers/duc-auto-chatgpt/v0.1.0/HANDOFF.md` | 252.535 | 252.535 ✓ | 228.874 |
| `workers/duc-auto-gemini/v0.2.0/HANDOFF.md` | 186.107 | 186.107 ✓ | 164.396 |
| `workers/duc-auto-gg-flow-video/v0.1.0/HANDOFF.md` | 125.813 | 125.813 ✓ | 103.716 |
| `docs/protocols/ORCHESTRATOR.md` | 37.385 | 37.385 ✓ | 29.220 |
| `IDEAS.md` | 46.100 | 46.100 ✓ | 36.499 |
| ba `AGENTS.md` gói | 21.508 · 18.717 · 8.496 | ✓ ✓ ✓ | 18.440 · 16.138 · 7.211 |
| `docs/` | 78 file, 1.2 MB | 78 file ✓, 1.208 KB ✓ | — |

**Mọi số đề bài đều đúng — nhưng đơn vị là byte.** Chênh byte↔ký tự khoảng 20% vì dấu tiếng Việt. Từ đây bài này ghi rõ đơn vị ở mọi dòng.

Chạy lại:

```bash
node -e "const fs=require('fs');for(const f of process.argv.slice(1)){const s=fs.readFileSync(f,'utf8');console.log(Buffer.byteLength(s,'utf8')+' B  '+s.length+' ch  '+f)}" AGENTS.md HANDOFF.md
```

---

## Kết quả

### Câu 1 — Cái gì nạp tự động, và tốn bao nhiêu

**[ĐO]** Lần theo mọi đường nạp: `find . -name CLAUDE.md` ra **đúng một file** trong repo; nó có **đúng một** dòng `@AGENTS.md`; `AGENTS.md` **không** có `@` nào nữa. Không có `CLAUDE.md` ở thư mục con. Chuỗi nạp tự động chỉ dài hai bậc.

| File | Byte | Token ước tính | Nạp kiểu gì |
|---|---:|---:|---|
| `CLAUDE.md` (gốc repo) | 288 | 103 | **tự động** — Claude đọc đầu phiên |
| `AGENTS.md` (gốc repo) | 26.034 | **9.635** | **tự động** — qua `@AGENTS.md` |
| `~/.claude-team/CLAUDE.md` (luật riêng của Đức, **ngoài repo**) | 2.884 | 1.047 | **tự động** |
| `…/memory/MEMORY.md` (bộ nhớ phiên, **ngoài repo**) | 4.546 | 1.193 | **tự động** |
| **TỔNG NẠP TỰ ĐỘNG** | **33.752** | **≈ 11.978** | |

Đó mới là phần máy tự nhét vào. Còn phần **luật mục 0 bắt đọc** — "đọc `AGENTS.md` của package → đọc `HANDOFF.md` của package":

| Kịch bản phiên | Tự động | Luật bắt đọc | **Tổng trước dòng code đầu tiên** |
|---|---:|---:|---:|
| Executor gói **ChatGPT** | 11.978 | AGENTS gói 7.264 + HANDOFF gói 77.844 | **≈ 97.100 tok** |
| Executor gói **Gemini** | 11.978 | 6.257 + 60.001 | **≈ 78.200 tok** |
| Executor gói **GG Flow** | 11.978 | 2.921 + 45.180 | **≈ 60.100 tok** |
| Việc ở **gốc repo** | 11.978 | `HANDOFF.md` gốc 93.837 | **≈ 105.800 tok** |
| Phiên **điều phối** (mục 6 bắt thêm `ORCHESTRATOR.md`, và thực tế đọc `IDEAS.md`) | 11.978 | 93.837 + 14.432 + 17.523 | **≈ 137.800 tok** |

Bốn dòng đầu là **[ĐO]** — luật mục 0 nói thẳng đọc file nào. Dòng cuối có một phần **[DÒ]**: `ORCHESTRATOR.md` là do mục 6 chỉ định cho vai điều phối, còn `IDEAS.md` thì `ORCHESTRATOR.md` nhắc tới 5 lần như sổ mà vai này ghi vào — nên phiên điều phối gần như chắc chắn mở nó, nhưng không luật nào bắt. **Kiểm lại trước khi hành động theo dòng đó.**

**Con số một câu: nạp tự động ≈ 12.000 token. Nhưng luật mục 0 kéo theo 45.000–125.000 token nữa, và đó mới là chỗ tiền đi.**

### Câu 2 — `AGENTS.md`: bao nhiêu là luật, bao nhiêu là mục lục

**[ĐO]** cắt file theo tiêu đề `## `:

| Mục | Byte | Token | % file | Phải đọc TRƯỚC khi gõ dòng đầu? |
|---|---:|---:|---:|---|
| (đầu file) | 405 | 160 | 1,6% | có |
| 0. Ba việc phải làm | 1.256 | 470 | 4,8% | **có** |
| 1. Ai giữ package nào | 4.968 | 1.865 | 19,1% | **có** — nhưng xem ghi chú dưới |
| 2. Ba việc phải hỏi Đức | 2.699 | 1.009 | 10,4% | **có** |
| 3. Năm luật vàng | 813 | 309 | 3,1% | **có** |
| 4. Vùng cấm sửa | 336 | 114 | 1,3% | **có** |
| 5. Vai từng AI | 1.437 | 535 | 5,5% | có |
| **6. Sổ tay mở khi cần** | **13.622** | **4.985** | **52,3%** | **KHÔNG** — chính nó tự nói: *"Không đọc trước. Tới việc nào thì mở sổ tay đó."* |
| 7. Đóng phiên | 490 | 187 | 1,9% | có |
| **TỔNG** | **26.026** | **9.634** | 100% | |

**Mục 6 chiếm 52,3% file luật, và tự khai là không cần đọc trước.** Đó là **4.985 token mục lục** nạp tự động vào mọi phiên, mọi AI, mọi ngày.

`AGENTS.md` tự đặt ngân sách "một trang" ≈ 3.000 ký tự. Thực tế **20.995 ký tự — gấp 7 lần**. Bỏ mục 6 ra thì còn **9.925 ký tự** — vẫn gấp 3,3 lần, nhưng đúng dấu.

Phép kiểm **B9 của chính repo đã bắt được chuyện này** và đang báo VÀNG: *"AGENTS.md 246 dòng (giới hạn 200) → cắt phần chi tiết kỹ thuật ra một sổ tay riêng"*, kèm hai `AGENTS.md` gói khác. Nó không chặn, nên chưa ai làm.

**Bên trong mục 6, tiền nằm ở đâu** — 30 dòng bảng = 4.303 tok, 659 tok văn xuôi. Mười một dòng nặng nhất:

| Token | Dòng |
|---:|---|
| **689** | `DAU_VO` — bảng quyền bị sửa tay (một quy trình xử lý sự cố viết thẳng vào mục lục) |
| 316 | vai ĐIỀU PHỐI → `ORCHESTRATOR.md` |
| 314 | làm cùng lúc với AI khác → `MULTIFLOW.md` |
| 289 | bảng trạng thái HTML |
| 279 | nợ điều hướng → `check-bootstrap.mjs` |
| 217 | `PROMPTS.md` |
| 206 | gói Assistant phát hành từ bộ khung |
| 180 | `IDEAS.md` |
| 172 | nhận/trả quyền → `claim.mjs` |
| 165 | ADR |
| 151 | `PARALLEL-WORK-DESIGN-V0.md` |
| **2.978** | **cộng 11 dòng** (19 dòng còn lại: 1.325 tok) |

**Một con trỏ chết trong file nạp tự động [ĐO]:** `AGENTS.md` dòng 203 trỏ tới `drafts/BRIDGE-MULTIPROFILE-DESIGN-V1.md` — thư mục `drafts/` đã biến mất từ phiên S6, file nay ở `docs/studies/`. Đây là 43 đường dẫn trong `AGENTS.md`, 42 sống, **1 chết**.

*(Tự đính chính: bản nháp đầu của bài này ghi `docs/README.md` cũng chép con trỏ chết đó. **SAI** — kiểm lại bằng mắt thì dòng 24 của `docs/README.md` là **cột đường dẫn CŨ** trong bảng ánh xạ cũ→mới, tức là nó cố ý viết đường dẫn cũ và trỏ đúng sang `docs/studies/`. Chỉ `AGENTS.md` hỏng. Ghi lại ở đây vì đây đúng kiểu lỗi mà luật `[DÒ]` cảnh báo: tìm theo tên ra hai kết quả, một cái là bug, một cái là thiết kế.)*

### Câu 3 — Bốn `HANDOFF.md`: giữ 20 lượt thì còn bao nhiêu

**[ĐO]** Định nghĩa "một lượt" = một mục cấp cao nhất trên dòng thời gian: một gạch đầu dòng `- ` trong khối `## Log`, hoặc một tiêu đề `## ` sau khối đó.

| File | Lượt | Cũ nhất | Mới nhất | **TRỌN** | 50 lượt | **20 lượt** | 10 lượt |
|---|---:|---|---|---:|---:|---:|---:|
| `HANDOFF.md` gốc | 171 | **2026-09-02** | 2026-09-05 | **93.837 tok** | 19.004 (20%) | **4.677 (5%)** | 3.157 |
| `…chatgpt/v0.1.0/HANDOFF.md` | 146 | 2026-08-22 | 2026-09-06 | **77.844 tok** | 43.244 (56%) | **15.600 (20%)** | 8.869 |
| `…gemini/v0.2.0/HANDOFF.md` | 135 | 2026-08-22 | 2026-09-06 | **60.001 tok** | 27.740 (46%) | **11.756 (20%)** | 7.795 |
| `…gg-flow-video/v0.1.0/HANDOFF.md` | 204 | 2026-08-27 | 2026-09-06 | **45.180 tok** | 11.002 (24%) | **7.199 (16%)** | 5.734 |
| **CỘNG** | 656 | | | **276.862** | 100.990 | **39.232** | 25.555 |

**Giữ 20 lượt gần nhất: 276.862 → 39.232 token. Bỏ đi 237.630 token, tức 86%.**

Nhưng con số đáng sợ nhất không nằm trong bảng đó. Nó nằm ở tốc độ phình của `HANDOFF.md` **gốc** **[ĐO]** — đọc từ chính lịch sử git:

| Ngày | Kích thước file lúc cuối ngày |
|---|---:|
| 2026-09-02 | 1.149 B |
| 2026-09-03 | 119.410 B |
| 2026-09-04 | 164.898 B |
| 2026-09-05 | 234.961 B |
| 2026-09-06 (cây làm việc) | 251.501 B |

```bash
for c in $(git log --format="%H %ad" --date=short -- HANDOFF.md | awk '{print $1"|"$2}' | tac | awk -F'|' '!seen[$2]++{print $1"|"$2}'); do h=${c%%|*}; d=${c##*|}; echo "$d $(git show "$h:HANDOFF.md" | wc -c)"; done
```

**File này ra đời ngày 02/09. Bốn ngày sau nó đã là 251 KB ≈ 93.800 token. Trung bình +62.500 byte/ngày ≈ +23.000 token/ngày.**

Giữ nguyên nhịp đó thì trong **5 ngày nữa**, riêng `HANDOFF.md` gốc vượt **200.000 token** — tức là một phiên làm việc ở gốc repo không còn nạp nổi file trạng thái của chính nó, chưa nói đến việc làm gì. Đây không phải rủi ro xa: nó là phép nhân đơn giản trên số vừa đo.

Luật mục 0 bảo "đọc phần cuối = trạng thái mới nhất". Nhưng một AI mở file bằng công cụ đọc file thì **nạp trọn**. Luật viết đúng, công cụ không biết luật đó.

### Câu 4 — Rác: có, nhưng ít hơn tưởng, và **rác không tốn token**

**a) Mồ côi** **[ĐO]** — file trong `docs/` mà không file nào khác trong repo nhắc tên: **4 file / 20.673 byte ≈ 7.730 token**.

| Byte | File |
|---:|---|
| 8.962 | `docs/studies/DEBT-TRIAGE-V1.md` |
| 6.776 | `docs/briefs/BRIEF-OBSERVER-V1.md` |
| 3.455 | `docs/adr/0002-cong-cu-va-quy-trinh-o-repo-nha.md` |
| 1.480 | `docs/_TEMPLATE-annex.md` |

4 trên 78 file = **5%**. Sạch hơn nhiều so với dự đoán. **Và điểm quan trọng: mồ côi tốn 0 token mỗi phiên** — chính vì không ai trỏ tới nên không ai mở. Xoá chúng tiết kiệm dung lượng đĩa, **không** tiết kiệm token. (Riêng ADR-0002 `Accepted` là bất biến theo luật — không được xoá.)

**b) `ttl_days` quá hạn** **[ĐO]** — đối chiếu `ttl_days` với ngày commit cuối của từng file: **0 file quá hạn**. Nhưng **9 file hết hạn trong 30 ngày** (`PROMPTS-HANDOFF` 25 ngày, `AUDIT-PROMPT-K1` / `AUDIT-PROMPT-S2-GPT` 26 ngày, `BRIEF-S1/S3/S4/S5/S7` và `DEBT-TRIAGE-V1` 29 ngày).

Phép kiểm **B11 có kiểm `ttl_days`** (`check-bootstrap.mjs:421`, "đã soi 78 tài liệu") — nhưng nó nằm trong nhóm **chỉ cảnh báo**, không chặn. Hôm nay B11 đang VÀNG vì đúng một chỗ, và chỗ đó không phải quá hạn mà là **thiếu trường**: `docs/protocols/MULTIFLOW.md` không khai `ttl_days` nào cả, nên B11 tính nó là quá hạn theo nguyên tắc "không chứng minh được còn hạn thì coi như hết hạn". Đó là một sổ tay `active` đang được mục 6 trỏ tới — đáng vá, nhưng thuộc `_root`.

**c) Trùng lặp** **[ĐO]** — so từng dòng (bỏ dòng ngắn dưới 15 ký tự):

| Cặp | Dòng trùng nguyên văn | Token trùng |
|---|---|---:|
| `chatgpt/AGENTS.md` ↔ `gemini/AGENTS.md` | **119 / 167 dòng = 71%** | **2.847** |
| `chatgpt/AGENTS.md` ↔ `gg-flow/AGENTS.md` | 1 / 167 = 1% | 8 |
| `gemini/AGENTS.md` ↔ `gg-flow/AGENTS.md` | 1 / 159 = 1% | 8 |
| ba gói ↔ `AGENTS.md` gốc | 0 | 0 |

Hai gói ChatGPT và Gemini dùng **cùng một file luật viết hai lần**. Chính `HANDOFF.md` của Gemini đã ghi nhận điều này ngày 03/09: *"README+AGENTS của gói này là bản chép từ gói ChatGPT"*. Ba ngày sau nó vẫn thế.

**Nhưng: trùng lặp này gần như không tốn token nạp** — một phiên chỉ đọc `AGENTS.md` của **một** gói. 2.847 token chỉ mất khi có phiên đọc cả hai, chuyện hiếm. Cái giá thật của nó là **trôi dạt**: hai bản của một luật sẽ nói khác nhau, đúng như đã xảy ra ngày 02/09 với `append_only_exempt` bị gõ cứng hai chỗ.

**d) Mục `superseded` còn nằm trên đường nạp chính** **[ĐO]** — một dòng trong `AGENTS.md` mục 6 trỏ tới **hai** file `status: superseded`:

> `docs/archive/PLATFORM-V01-IMPLEMENTATION-BRIEF.md` · `docs/archive/PLATFORM-V01-ONBOARDING-PROMPT.md` — "đã thực thi xong, giữ làm bản ghi"

Dòng đó nặng 92 token và mời một AI đi đọc hai file đã chết. Ngoài ra `docs/briefs/BRIEF-DASHBOARD-ORCHESTRATOR-TAB.md` mang `status: superseded` nhưng vẫn ở `briefs/` chứ không ở `archive/`.

**e) Toàn cảnh** **[ĐO]** — cả kho văn bản `.md`/`.txt` của repo:

| Vùng | Byte | Token | File |
|---|---:|---:|---:|
| `docs/` | 1.028.623 | 327.956 | 78 |
| `workers/duc-auto-chatgpt/` | 844.043 | 259.910 | 120 |
| `workers/duc-auto-gemini/` | 669.640 | 208.303 | 113 |
| gốc repo | 391.868 | 145.035 | 12 |
| `workers/duc-auto-gg-flow-video/` | 307.505 | 108.379 | 28 |
| còn lại | 46.733 | 14.982 | 18 |
| **TỔNG** | **3.288.412** | **≈ 1.064.565** | **369** |

Hơn **một triệu token** văn bản. Không phiên nào đọc hết — nhưng con số nói rõ vì sao mọi thứ đều đắt: **12 file ở gốc repo một mình đã 145.035 token.**

---

## Xếp hạng các cách cắt — theo token tiết kiệm trên mỗi đơn vị rủi ro

Thang rủi ro dùng ở đây:

| Bậc | Nghĩa |
|---|---|
| **R1** | Không chữ luật nào rời chỗ. Không phiên nào ngừng thấy thứ đang thấy. |
| **R2** | Chữ dời sang file khác, **con trỏ ở lại đúng đường nạp cũ**. Mất thêm một lần mở file. |
| **R3** | Chữ dời đi, chỗ cũ chỉ còn tóm tắt. Phiên nào không mở con trỏ sẽ thiếu chi tiết. |
| **R4** | Chữ biến mất khỏi repo. |
| **R5** | **Một luật có thể ngừng đến tay người bắt buộc phải đọc nó.** Đây là kiểu hỏng đã xảy ra thật hôm 06/09 — một luật đúng nằm trong sổ tay sai người đọc, ba lane cùng vi phạm. |

### Bảng xếp hạng

| # | Cách cắt | Tiết kiệm / phiên | Rủi ro | Lãi/rủi ro | Ai chốt |
|---|---|---:|---|---:|---|
| **1** | **Cắt đuôi `HANDOFF.md`: giữ 20 lượt gần nhất, phần cũ `git mv` sang `HANDOFF-ARCHIVE-2026-08.md` / `-09.md`** | **37.900 – 89.200** (tuỳ phiên đụng file nào) | **R2** | **19.000 – 44.600/bậc** | **Đức** |
| **2** | Ép mỗi dòng bảng mục 6 `AGENTS.md` xuống ≤ 60 token, **giữ nguyên dòng `DAU_VO`** | **2.113** | **R2** | ~1.060/bậc | **Đức** |
| **3** | Chuyển 659 token văn xuôi cuối mục 6 (khối `FEATURE-PARITY` + khối `AUTO:`) sang chính `FEATURE-PARITY.md` | **659** | **R2** | ~330/bậc | **Đức** |
| **4** | Sửa 1 con trỏ chết `drafts/BRIDGE-MULTIPROFILE-DESIGN-V1.md` ở `AGENTS.md` dòng 203 | 0 (nhưng cứu một lượt đi lạc) | **R1** | — | tôi tự làm được nếu được giao `_root` |
| **5** | Chuyển dòng "PLATFORM V0.1" (2 file `superseded`) khỏi mục 6 | **92** | **R2** | ~46/bậc | **Đức** |
| **6** | Gộp `chatgpt/AGENTS.md` và `gemini/AGENTS.md` phần chung | **≈ 0** | **R3** | ~0 | — **đừng làm vì token** |
| **7** | Xoá 4 file mồ côi trong `docs/` | **0** | **R4** | **0** | — **đừng làm vì token** |
| **8** | Bỏ hẳn mục 6 khỏi `AGENTS.md`, để `llms.txt` gánh | 4.985 | **R5** | — | **KHÔNG ĐỀ XUẤT** |

### Chi tiết từng cách

#### 1. Cắt đuôi `HANDOFF.md` — lãi gấp 13–31 lần tất cả các cách còn lại cộng lại

*(Cộng cả cách 2 + 3 + 5 được 2.864 token. Cách 1 một mình được 37.981–89.160.)*

- **Tiết kiệm, theo phiên:** gốc repo **89.160** · ChatGPT **62.244** · Gemini **48.245** · GG Flow **37.981**. Một phiên chỉ đụng một trong bốn, nên con số thật là **38k–89k token cho mỗi phiên**.
- **Mất gì:** không mất chữ nào. Chữ cũ nằm ở `HANDOFF-ARCHIVE-<tháng>.md` cạnh file gốc, thêm một dòng ở đầu `HANDOFF.md`: *"Lượt trước 2026-09-0X ở `HANDOFF-ARCHIVE-2026-09.md`."* Phiên nào cần đào lịch sử vẫn đào được, chỉ tốn thêm một lần mở file.
- **Rủi ro thật, nói thẳng:** `HANDOFF.md` gốc thuộc nhóm **miễn khoá KHI CHỈ THÊM DÒNG Ở CUỐI**. Dời dòng cũ đi **không phải là thêm dòng** — nó là viết lại chữ của phiên khác, đúng thứ luật mục 1 cấm. Cho nên **bắt buộc Đức chốt**, và nên chốt thành một ADR, vì sau đó mọi phiên sẽ làm lại thao tác này mỗi tháng.
- **Rủi ro thứ hai:** nếu chuyển thành việc tay thì nó sẽ không được làm. Đề xuất kèm: một script `scripts/handoff-roll.mjs` cắt đuôi theo số lượt, và `check-bootstrap.mjs` thêm một phép kiểm cảnh báo khi `HANDOFF.md` vượt ngưỡng. Việc đó thuộc `_code`, không thuộc lượt này.
- **Không làm thì sao:** +23.000 token/ngày. Trong 5 ngày `HANDOFF.md` gốc một mình vượt 200.000 token.

#### 2. Ép dòng bảng mục 6 xuống ≤ 60 token

- **Tiết kiệm: 2.113 token mỗi phiên, mọi AI, mọi ngày** — vì mục 6 nằm trong đường nạp **tự động**, khác với `HANDOFF` là đường "luật bắt đọc". 19 trong 30 dòng đang vượt 60 token; 4.303 → 2.190.
- **Mất gì:** phần diễn giải "vì sao có luật này" bị dời từ mục lục sang chính sổ tay. Ví dụ dòng `MULTIFLOW` (314 tok) đang kể lại nội dung của `MULTIFLOW.md` — trong khi `MULTIFLOW.md` đã kể rồi, 5.684 token.
- **Chỗ tôi thấy RỦI RO, và đề nghị KHÔNG cắt:** dòng **`DAU_VO` (689 token)**. Nó không phải mục lục — nó là **quy trình xử lý sự cố**, và nó nằm ở đây **có chủ đích**: người cần đọc nó là phiên **vừa bị mất khoá**, mà phiên đó chỉ chạy cổng đóng phiên chứ không mở `MULTIFLOW.md`. Dời nó đi là tái tạo đúng lỗi 06/09 — luật đúng, sai người đọc. **Chỉ được dời nếu chính `session-check.mjs` in ra quy trình đó khi báo `DAU_VO`.** Đấy là việc của `_code`, phải làm trước, không phải làm cùng.
- **Ai chốt:** Đức. `AGENTS.md` là hiến pháp và nằm trong `_root`.

#### 3. Dời 659 token văn xuôi cuối mục 6

Khối `> NỬA FILE NÀY DO MÁY SỞ HỮU…` và đoạn về `FEATURE-PARITY.md`. Cả hai chỉ có nghĩa với ai **đang sửa** `FEATURE-PARITY.md`. Dời sang đầu chính file đó thì người cần đọc vẫn đọc đúng lúc — thậm chí đúng lúc hơn. **Rủi ro R2. Đức chốt.**

#### 4. Con trỏ chết — R1, không mất gì

`AGENTS.md` dòng 203: `drafts/BRIDGE-MULTIPROFILE-DESIGN-V1.md` → `docs/studies/BRIDGE-MULTIPROFILE-DESIGN-V1.md`. Chỉ sai một chỗ này (`docs/README.md` viết đường dẫn cũ **có chủ đích**, trong bảng ánh xạ cũ→mới). Không tiết kiệm token, nhưng cứu một lượt đi lạc của phiên sau. **Tôi làm được, cần khoá `_root` (đang do lane khác giữ).**

#### 5. Dòng PLATFORM V0.1 → 92 token, trỏ tới hai file `superseded`

Việc đã thực thi xong 27/08. Dòng này mời AI đọc bản ghi chết. Chuyển xuống `docs/README.md`. **R2, Đức chốt.**

#### 6. Gộp hai `AGENTS.md` trùng 71% — **đừng làm vì token**

Nói thẳng: **cách này tiết kiệm gần như 0 token mỗi phiên**, vì không phiên nào đọc cả hai gói. Nó đáng làm vì **trôi dạt** (hai bản một luật sẽ nói khác nhau — đã xảy ra 02/09), không vì tiết kiệm. Và gộp làm tăng rủi ro nạp: một file chung là thêm một hop, tức R3. **Nếu làm, hãy làm dưới danh nghĩa chống trôi dạt, đừng ghi vào sổ tiết kiệm token.**

#### 7. Xoá 4 file mồ côi — **tiết kiệm đúng 0 token**

Đây là phát hiện dễ hiểu nhầm nhất của cả bài, nên viết to: **file không ai trỏ tới thì không ai mở, nên nó không tốn token nạp.** Xoá nó tiết kiệm 20.673 byte đĩa và 0 token. Trong đó `ADR-0002` là `Accepted` — **bất biến, không được xoá** (phép kiểm B12 cưỡng chế). Hai file `DEBT-TRIAGE-V1.md` và `BRIEF-OBSERVER-V1.md` mồ côi vì **chưa được khai vào Bản đồ file** — đó là nợ luật vàng 4, không phải rác. Việc đúng là **khai chúng vào mục lục**, ngược hẳn với xoá.

#### 8. Bỏ hẳn mục 6 — **KHÔNG ĐỀ XUẤT**, và đây là chỗ rủi ro lớn nhất của cả ý tưởng Y-14

Bỏ mục 6 tiết kiệm 4.985 token/phiên, con số hấp dẫn thứ hai trong bài. Nhưng mục 6 là **thứ duy nhất trên đường nạp tự động cho một AI biết rằng `MULTIFLOW.md`, `ORCHESTRATOR.md`, `ADR/`, `IDEAS.md` tồn tại**. `llms.txt` không thay được: nó chỉ được nạp khi có ai bảo mở nó — mà chỗ bảo mở nó chính là mục 6.

Đo cụ thể **[ĐO]**: `AGENTS.md` mục 6 trỏ tới **42 đường dẫn**, `docs/README.md` trỏ tới **36**, và hai bên **chỉ trùng nhau 2**. Tức là hai mục lục này **không thay thế nhau được** — chúng nói về hai thế giới khác nhau. Bỏ mục 6 là làm 40 đường dẫn biến mất khỏi tầm mắt của mọi phiên.

**Đây đúng là kiểu lỗ đã xảy ra hôm 06/09.** Nên: **giữ đủ 30 dòng, chỉ cắt độ dài từng dòng** (cách số 2). Số dòng là thứ đảm bảo luật còn đến tay người cần đọc; độ dài dòng thì không.

---

## Kết luận

**Mỗi phiên AI nạp tự động ≈ 12.000 token. Nhưng luật mục 0 kéo theo 45.000–125.000 token nữa — và 86% chỗ đó là nhật ký cũ.**

Ba cách lãi nhất:

1. **Cắt đuôi bốn `HANDOFF.md`, giữ 20 lượt gần nhất → tiết kiệm 38.000–89.000 token mỗi phiên.** Không mất chữ nào; chữ cũ dời sang file lưu trữ cạnh đó. **Đức phải chốt** vì dời dòng cũ là viết lại chữ của phiên khác.
2. **Ép mỗi dòng mục 6 `AGENTS.md` xuống ≤ 60 token, giữ nguyên dòng `DAU_VO` → tiết kiệm 2.113 token mỗi phiên**, và đây là token nạp **tự động** nên nó lãi mọi phiên, kể cả phiên chỉ hỏi một câu.
3. **Dời 659 token văn xuôi cuối mục 6 về `FEATURE-PARITY.md`** — người cần đọc vẫn đọc, đúng lúc hơn.

Ba điều **không** nên làm dù trông như rác: xoá 4 file mồ côi (tiết kiệm **0** token), gộp hai `AGENTS.md` trùng 71% (tiết kiệm **≈0** token — đáng làm vì chống trôi dạt, không vì token), và bỏ hẳn mục 6 (**rủi ro R5**, đúng kiểu lỗ hôm 06/09).

Và một điều gấp hơn mọi điều trên: `HANDOFF.md` gốc ra đời **02/09**, hôm nay 06/09 đã **93.800 token**, tăng **23.000 token mỗi ngày**. Cách số 1 không phải để tiết kiệm — nó là để **5 ngày nữa còn làm việc được ở gốc repo**.

## Việc tiếp theo

Đức chốt cách số 1: cho phép cắt đuôi `HANDOFF.md` giữ 20 lượt gần nhất, phần cũ `git mv` sang `HANDOFF-ARCHIVE-<tháng>.md`, và ghi thành một ADR để lượt sau khỏi hỏi lại.
