# HANDOFF — gốc repo (`_root`)

> Nhật ký việc ở **gốc repo**: AGENTS.md, DASHBOARD, FEATURE-PARITY, `docs/`, `scripts/`.
> Việc trong `workers/*` ghi ở HANDOFF.md của package đó, không ghi vào đây.
> **Chỉ thêm dòng, mới nhất ở cuối.**

## Log
**Phần CŨ hơn đã dời sang kho lưu trữ** — [`docs/archive/`](docs/archive/) · chữ giữ nguyên từng dòng, cắt bằng `npm run don`.



<!-- HANDOFF-CUT-POINTER: ADR-0008 -->
> **7 mục cũ hơn đã dời sang [`HANDOFF-ARCHIVE-06.md`](HANDOFF-ARCHIVE-06.md)** — cùng thư mục này,
> nguyên văn, không mất chữ nào. File này giữ **20 mục cuối** (ADR-0008). Cần đào lịch sử
> xa hơn thì mở file đó và đi tiếp theo con trỏ trong nó; ghi Log mới thì vẫn ghi vào cuối
> file này.
<!-- /HANDOFF-CUT-POINTER -->

## 2026-09-09 · `claude-nen-luat` (lượt 2) — cả ba sổ cái về tay máy, Làn 1 đóng

**`luat.khoi_sinh` nay phủ cả ba gói, và cả ba trỏ vào `decisions.md` — không trỏ `AGENTS.md`.**
Lý do đo được: khối sinh ra dài **5.700–7.500 ký tự**, tức **đắt hơn cả cái nó thay**. Nó thuộc về
file COMPANION (mở khi cần), không thuộc file CORE (nạp mỗi phiên đụng gói). Gemini theo đó:
`AGENTS.md` **24.765 → 19.045**.

**Bước ⑥ bắt được chỗ trôi đầu tiên của chính nó.** Bảng gõ tay của `gg-flow-video` khai `ADR-0003`
là còn sống, trong khi chính ADR đó đã khai `- **0003 — …**` **chết từ 05/09**. Không ai gõ sai —
bảng chỉ đơn giản không được cập nhật, đúng thứ máy sinh sinh ra để chặn.

**Bốn phép: ① 0 · ② 0 · ③ 1 · ④ 0.** ② về 0 trên **cả repo**, lần đầu.

**Chỗ tôi phải nói thẳng, vì nó đổi hướng của Làn 2.** Ba lượt nén hôm nay cắt được nhiều là nhờ
cắt **chỉ mục** và **chuyện kể** — hai thứ không phải luật. `AGENTS.md` gốc thì hết cả hai loại đó
rồi: mục 1 và mục 4 vừa rút sạch chuyện kể mà **chỉ giảm 6%** (17.255 → 16.245). Còn **~345 ký tự
một luật** so với đích ~150 của [ADR-0031](docs/adr/0031-tran-do-bang-ky-tu.md) ⑵. Phần thừa **là
chính các câu luật**. Đi tiếp từ đây là **bỏ bớt luật** — ngân sách của Đức, không phải việc AI tự
quyết. Đã ghi vào Làn 2 thay cho một lời hứa sẽ-nén-tiếp mà tôi không giữ được.

**Khoá:** vùng `workers/duc-auto-chatgpt` được lane `claude-gpt-chay-het-job` lấy giữa phiên bằng
`--restamp --duc-duyet` kèm câu chốt của Đức (*"tiếp đi"*) — đường hợp lệ thứ ba, phần việc của tôi
trong vùng đó đã commit xong trước đó. Không tranh.

## 2026-09-09 · `claude-nen-luat` (lượt 3) — audit bác kết luận của tôi, và một cú đẩy nhầm

**Tôi đẩy nhầm.** Heredoc **không đóng ngoặc** (`<<PY`) làm bash chạy mọi backtick trong đoạn
Python — một trong số đó là `safe-push.mjs`. **8 commit lên `origin/main` lúc tôi chưa định đẩy**,
gồm **`afd00d2f` của lane `claude-gpt-chay-het-job`** — lượt `--carry` bắt buộc kể tên, tôi kể ở
đây. Không hỏng gì: `safe-push` là công cụ đúng và điều kiện của nó đều đạt, không force, không sửa
lịch sử. Nhưng là hành động ra ngoài tôi không chọn. **Luôn `<<'EOF'`.**

**Đức đổi cách đặt trần:** *"nhỏ hơn ngưỡng margin 30–40%"*, và mở uỷ quyền sang **tái tổ chức
kiến trúc luật**.

**Kết luận lượt 2 của tôi SAI, Codex bác đúng.** Tôi viết *"phần thừa là chính các câu luật, đi
tiếp là bỏ bớt luật"*. Sai — tôi mới chạm trần của việc **xoá chuyện kể**. Cửa còn lại: **chuyển
THỦ TỤC xuống Tầng 2 kèm CÒ NẠP BẮT BUỘC**, giữ bất biến ở Tầng 1. Chuyển thủ tục mà vẫn giữ bất
biến **không phải xoá luật**. Riêng cửa đó: `AGENTS.md` **16.245 → 6.427**; nạp mỗi phiên
**16.674 → 6.588**, dưới trần 8.000, còn **1.388** nữa tới đích 5.200.

**Audit còn tìm ra bảy chỗ mâu thuẫn có sẵn** — nguy hiểm hơn độ dài, vì lượt nén sau sẽ "dọn"
đúng chúng. Cách đọc đúng từng chỗ: **ADR-0033 ⑸**.

**Hai chỗ audit dạy tôi mà tôi không tự thấy:** bảng mục 7 **tự mô tả sai** (nói "chỉ đường" trong
khi ba hàng mang luật thật), và thước gói đo **một file** thay vì đo **bó** — nên chuyển luật qua
lại giữa gốc và gói làm con số đẹp lên mà hoá đơn y nguyên. Đã sửa cả hai.

**Một phép ghim của chính tôi đo sai chuyện:** nó khẳng định `dich < tran`, tức đo *khoảng cách hôm
nay*, nên **đỏ đúng lúc thước lặn xuống dưới đích** — đỏ lúc thành công. Thay bằng ghim thứ tự
`bien < dich`.

**Hai nợ chưa ghi được vào `BACKLOG.md`** (lane khác giữ khoá file đó): không phép kiểm nào canh
chuỗi *chỗ cũ → bất biến → đích → cò* của một lượt chuyển (ADR-0033 ⑶); và `_root` không nhận được
khi lane khác giữ **một** khoá file bên trong, nên commit gốc chưa đẩy kẹt cổng.

## 2026-09-09 · `claude-nen-luat` (lượt 4) — con voi là `HANDOFF.md`, không phải file luật

**Đức hỏi trần 9–10k token; đo ra mới thấy tôi nén sai chỗ cả ngày.** Một phiên đụng gói trả
**24.000–30.500 token**, trong đó **`HANDOFF.md` của gói là 14.600–22.100 — khoảng 70%**. Thước ký
tự dựng cùng ngày chỉ đo `AGENTS.md` nên báo *"8.900, dưới trần"*. **Đo sai chỗ, lần thứ hai.**

**Chữa bằng một dòng luật** (ADR-0034): mục 1 đọc `STATUS.md` thay cho cuối `HANDOFF.md` —
`STATUS.md` vốn đã là trang trạng thái một-trang. **24.000–30.500 → 8.500–11.600 token.**

**Rút lại một đề xuất của chính tôi:** hạ trần mục nhật ký 2.600 → 1.200 byte. Con số 2.600 **được
đo**, nằm trong một khoảng trống của phân bố. **Đè một con số đoán lên một con số đã đo là làm hỏng
phép đo, không phải nén.**

**Phần "hook permanently":** `nap.mo_phien_goi` khai danh sách file mục 1 bắt đọc, cổng đọc danh
sách đó thay vì gõ cứng, một phép ghim đối chiếu hai chiều. Đột biến **3/3** — con đầu **thoát** ở
bản đầu vì tôi đối chiếu cả mục 1 thay vì đúng câu *"Mở:"*, nên thêm `BACKLOG.md` vẫn xanh (mục 1
nhắc nó, nhưng để nói *ghi vào đâu*). Thu hẹp về đúng câu → 3/3 đỏ.

**`CLAUDE.md` toàn cục 2.351 → 1.874 ký tự** (Đức duyệt). Giữ ranh giới *phải hỏi Đức* dù repo
cũng nói — **trùng lặp đang chạy tốt**: project chưa có `AGENTS.md` thì đó là sàn an toàn duy nhất. **Nâng `docs.tran_dong_khong_ke_adr`
9.185 → 9.340** (cửa ra thứ ba của cổng): `docs/` +119 dòng, file luật **−440**, ròng **−321** —
số đo và lý lẽ ở `docs._vi_sao_nang_0909`.

**Prompt audit** — 6 phát hiện, áp 4. Bề mặt luật **sạch** ở nhóm prompt cũ. Phát hiện thật là
**thiếu chữ**: 40/75 mô tả method Bridge ≤ 1 câu, và `run.trial` — method duy nhất tiêu credit —
không mang nắp cứng nào; chúng chỉ ở `AGENTS.md`, thứ tác nhân ngoài **không bao giờ nạp**.

**Khoá:** trả hộ lane `claude-gpt-chay-het-job` theo lời Đức *"phiên GPT đã dừng"* — **nó nhận lại
vùng 3 phút sau**. Dừng tay ở gói đó, hai hunk Bridge chưa áp. Trước đó cứu được một mục sổ nợ họ
viết xong chưa commit, và chính ghi chú đó chặn tôi khỏi dùng `--restamp`.

## 2026-09-09 · `claude-nen-luat` (lượt 5) — MỘT file cho một phiên gói, và trần chặn ở lượt sinh

**Đức chốt 2.000–3.000 token, và gọi việc giữ nó ở đó là *"mục tiêu của việc compile"*.** Nén tay
không tới được: riêng phần nền đã **3.901 token**, và chỗ rò lớn nhất là **`@AGENTS.md` trong
`CLAUDE.md`** — nó nạp cả hiến pháp vào **mọi** phiên, kể cả phiên chỉ sửa một selector. B10 không
đòi cái `@` đó, nên tháo được.

**[ADR-0035](docs/adr/0035-mot-file-cho-mot-phien-gap.md):** `CLAUDE.md` thành bộ định tuyến hai
cửa; phiên gói đọc đúng **`PHIEN.md`** — máy sinh, tự chứa = lõi luật chung
(`workers/_shared/LUAT-CORE.md`) + `## Luật vàng` của gói + bản chắt trạng thái từ `STATUS.md`.

| Gói | Sáng nay | Giờ |
|---|---:|---:|
| gg-flow-video · scouter | 26.194 · 23.374 | **2.711** · **2.711** |
| gemini | 30.487 | **2.580** |

**Trần CỨNG, và đây là chỗ khác mọi thước trước:** 6.600 ký tự, đo **cả bó**, **chặn ở lượt sinh** —
vượt là bộ sinh **từ chối ghi** và thoát 1. Thước cóc thì báo đỏ rồi ai đó nâng nó lên; **hôm nay
chính tôi nâng một cái**, có lý do, nhưng vẫn là nâng. Trần này không có đường đó — muốn thêm một
luật thì phải bỏ một luật, tức giới hạn ⑧ từ chữ thành cơ chế.

**Đột biến 4/4:** nhồi 1.500 ký tự → từ chối **và** `PHIEN.md` không bị ghi đè · gỡ trần, nới trần
lên 20.000, bỏ phần nền khỏi công thức cổng → đều ĐỎ. Cổng và bộ sinh nay cộng **cùng một công
thức**, có phép ghim canh. Dedupe làm việc thật: bốn luật đầu của gemini trùng lõi → còn một dòng.

**`--carry` cuốn theo mọi commit chưa đẩy của lane `claude-gpt-chay-het-job`** (ADR-0005 ⑶).
**Lane đó đang CHẠY**, không dừng như tưởng — bản ghi thật: `git log origin/main..HEAD` trước lượt đẩy.

**Gói `duc-auto-chatgpt` KHÔNG sinh được: 3.912 token, quá trần 912.** Phần thừa đã biết chính xác
(khối biện minh ADR-0032 đã nhận về + bốn luật trùng lõi), vùng đang có lane khác giữ. Hệ quả cần
nhớ: chừng nào nó còn quá trần thì `--sinh` **luôn thoát 1** — đừng dùng mã thoát để suy ra lỗi mới.

## 2026-09-09 · `claude-nen-luat` (lượt 6) — `PHIEN.md` là cửa vào duy nhất mà không ai canh nó

Trần CỨNG hôm qua chỉ nổ **lúc `--sinh` chạy**. Không ai chạy thì `PHIEN.md` dạy trạng thái cũ và
cổng vẫn XANH — mà nó là thứ DUY NHẤT một phiên đụng gói nạp (ADR-0035). Mở `N-63`, rồi vá luôn.

**Không nhét vào `generators` được**, và đó là phần khó: phép ⑺ so cả repo, nên một `PHIEN.md`
lệch làm ĐỎ cổng **mọi lane**, kể cả lane bị CẤM sửa gói đó (bẫy `K2-2`). Phép mới hỏi câu hẹp
hơn: *bạn có chạm nguồn của bó nào không*. Chạm `LUAT-CORE.md` · `.repo-structure.json` ·
`rule-compile.mjs` thì xét **cả bốn** gói — đổi lõi mà chỉ sinh lại một gói là để ba gói kia dạy
luật cũ. Gói nào **lane khác đang sửa dở** thì bỏ qua **và nói ra**: nợ của họ, và một lượt bỏ qua
im lặng đọc y hệt một lượt đạt.

**Cổng và bộ sinh nay gọi CHUNG `dungBoGoi()`** — hai bản sao của một công thức là bẫy repo này đã
sập rồi, và riêng thước bó đã đo sai chỗ hai lần trong một ngày. Có phép ghim canh cả hai chiều.

**Phép kiểm bắt được một ca THẬT trong lúc tôi đang viết nó:** lane `claude-gpt-chay-het-job`
commit `a7a218c4` sửa `STATUS.md` lúc 17:47; `PHIEN.md` thành cũ ngay lúc đó; phép mới đỏ. Trước
hôm nay không có gì báo.

**Đột biến 4/4:** sửa `STATUS.md` không sinh lại → ĐỎ `PHIEN_CU` · sửa **và** sinh lại → XANH
(không đỏ oan) · sửa lõi luật → ĐỎ cả bốn gói · nhồi 1.500 ký tự vào `STATUS.md` → ĐỎ
`PHIEN_QUA_TRAN`, tức trần nay chặn ở **cả hai** cửa chứ không chỉ lượt sinh. Suite 38/38.

**Gói `duc-auto-chatgpt` nay 2.463 token** (`## Luật vàng` 4.265 → 2.187 ký tự): khối biện minh
ADR-0032 còn một dòng + một liên kết, bốn luật trùng lõi trỏ về lõi, và bản kể tên lại bốn luật đó
bỏ hẳn — trong `PHIEN.md` chúng in **ngay phía trên**. Nắp `run.trial` và bảy lớp bảo vệ giữ
nguyên. Phép ③ `LUAT_TRUNG` 2 → 1. **Chưa commit được:** `AGENTS.md` + `PHIEN.md` của gói đó còn
nằm trong cây làm việc, vùng đang do `claude-gpt-chay-het-job` giữ ("đẩy loạt sửa sau audit").
Tôi **không lấy khoá** — chờ họ trả.

## 2026-09-09 · `claude-nen-luat` (lượt 7) — bó của gói cuối cùng đủ bốn, và một lượt cuốn nhầm

**Bốn trên bốn.** `duc-auto-chatgpt` 2.463 token, gói cuối cùng vào dải Đức đặt. Bó nặng nhất
toàn repo nay là 6.530 ký tự (~2.968 token).

**MỘT LƯỢT CUỐN NHẦM, ghi lại vì nó là lần thứ hai trong ngày.** Bản nén `## Luật vàng` của gói
chatgpt tôi để trong cây làm việc chờ khoá vùng; lane `claude-gpt-chay-het-job` commit `1702ae5d`
(*cắt sổ nhật ký*) đã **cuốn theo 85 dòng đó** và nó mang nhãn `Lane: claude-gpt-chay-het-job`.
Nội dung đúng, đã đẩy; **chỉ nhãn nguồn gốc là sai**, và sửa nhãn là viết lại lịch sử nên KHÔNG
làm. Gốc: một `git add` không giới hạn đường dẫn trên **cây làm việc dùng chung**. Đây đúng cái
`N-62` (*mỗi vai một checkout riêng*) nói, và là lần thứ hai nó cắn trong một ngày.

**Cái lỗ nó để lộ ra, và nó thật hơn cái nhãn:** `AGENTS.md` đã nén vào `main`, còn `PHIEN.md`
sinh từ nó thì **chưa bao giờ được commit** — gói có luật mới mà **không có file mở phiên**. Phép
kiểm ⑺ không thấy, vì `PHIEN.md` không nằm trong `generated`; phép ⒘ mới của tôi cũng không, vì
nó so **đĩa với đĩa**, không so với `HEAD`. Nay đã commit; nhưng *"có trên đĩa mà không có trong
git"* vẫn là một cửa chưa ai canh — ghi vào `N-63` như một vế còn mở.

**Sửa một nhãn sai trong cổng:** thông điệp `NAP_MOT_GOI_PHINH` in *"Đích 6600, biên 4400"*, trong
khi 6.600 là **trần tuyệt đối** và 4.400 mới là **đích** — đúng ngược, và ngược so với chính thông
điệp anh em của nó cách đó 45 dòng. Ai đọc sẽ tối ưu về nhầm số.

**Hai câu chờ Đức, cả hai là chuyện số, không phải chuyện mã:** ⑴ nén `## Luật vàng` của
`gg-flow-video` (2.932) và `scouter` (2.717) theo đúng công thức ADR-0032 — hai gói này còn dư
**71** và **70** ký tự, tức chật nhất repo, và chật vì chưa nén chứ không vì trần. ⑵ ĐÍCH 4.400
**không gói nào với tới**: nền cố định đã 3.039 ký tự (46–51% mỗi bó), nên còn 1.361 cho luật
riêng + trạng thái, mà riêng luật của gemini đã 2.086. Hạ lõi luật, hay nêu lại đích?

## 2026-09-09 · `claude-nen-luat` (lượt 8) — hai gói cuối đã nén, và ĐÍCH nay đo từ NỀN

Đức chốt hai câu còn treo: **nén `gg-flow-video` và `scouter`**, và **"phương án b"** cho đích.

| Gói | Bó mở phiên | Luật riêng |
|---|---:|---:|
| gg-flow-video | 5.726 (**2.603 tok**) | 2.921 → 2.129 |
| scouter | 6.368 (**2.895 tok**) | 2.709 → 2.555 |
| chatgpt · gemini | 6.016 · 6.242 | (đã nén lượt trước) |

**Không luật nào bị xoá.** Phần bỏ là phần đã có **nguyên văn** ở `LUAT-CORE.md` và
`workers/_shared/AGENTS.md`: cấm `.innerHTML` · bằng chứng chỉ THÊM · không đoán selector · chữ
operator tiếng Việt · nhắc Đức reload · mỗi fix một phép ghim · pilot trang thật hỏi Đức. Trần
credit của Flow, `MAX_TRIAL_JOBS = 7`, và cả chín chốt riêng của Scouter **giữ nguyên**.

**Một lượt tôi làm hỏng rồi tự bắt:** khối dẫn *"đừng chép lại"* tôi viết cho scouter dài **340**
ký tự trong khi phần nó cắt chỉ ~290 — gói **TO RA 42 ký tự** và vượt thước cóc. Rút xuống một
dòng 110 ký tự. Bài học: ở một file có trần, **lời giải thích cũng phải qua trần**.

**[ADR-0036](docs/adr/0036-dich-cua-bo-mo-phien-goi-do-tu-nen-co-dinh.md) — ĐÍCH bó gói
4.400 → 5.600, và cách đo đổi.** Đích cũ bất khả, không phải vì lười: **nền cố định 3.039 ký tự**
(`CLAUDE.md` 565 + đầu đề `PHIEN.md` ~410 + `LUAT-CORE.md` 2.064) chiếm **46–51%** mỗi bó, nên
4.400 chỉ chừa 1.361 cho luật riêng + trạng thái, trong khi luật vàng **mỏng nhất** đã 2.010.
Hai đường đặt lên bàn — hạ lõi luật, hay nêu lại đích; Đức chọn nêu lại, và đó là đường đúng: hạ
lõi là trả bằng **lớp bảo vệ** để mua một chỉ số.

Phép ghim **không ghim con số**, nó ghim điều kiện: `bien ≥ nền × 1,6` và `bien ≤ trần × 0,90`.
Hạ `LUAT-CORE.md` thì nền tụt và sàn hợp lệ của đích tụt theo — không ai phải nhớ đồng bộ hai con
số. ADR-0033 ⑴ (30–40% dưới trần) **giữ nguyên** cho `nap_moi_phien`.

**Thước cóc bó gói hạ 6.530 → 6.368.** Chưa gói nào đạt đích — đó là điều đúng cho một ĐÍCH; số
phải giữ hằng ngày là thước cóc.

**Chỗ chưa với tới:** không gì canh **nền** tự phình — lõi to ra 300 là cả bốn bó to ra 300, chỉ
thước cóc bắt, sau khi việc đã rồi (Hệ quả ADR-0036).

### 2026-09-09 · harness-loi-01 · MIGRATE bộ khung 0.3.0 → 1.8.0 (từ mốc Stable Baseline)

**Không chạm `workers/`** — lane `claude-gpt-chay-het-job` đang giữ `workers/duc-auto-chatgpt`
kèm file sửa dở. Chỉ nhận ba vùng trống `_code` · `_root` · `_docs`.

**Nhận về:** 36 file máy · 5 tài liệu · 10 tên lệnh npm · `bang-song/` · `features.json`.
Bốn thứ đáng kể: **bộ biên dịch luật** (`npm run luat`) · **Context Compiler**
(`npm run luat -- --nap`) · `can-nang` nay đo **TOKEN** chứ không đo dòng · **dấu niêm phong
`.agents/claims.json`** — lớp bảo vệ repo NÀY phát minh ra 03/09, nay đã có trong bộ khung nhà
và quay lại đây qua đường chính thức.

**Đo tại chỗ, chạy thật:** nạp mỗi phiên **3.566 / 6.000 token** (AGENTS.md 2.904 + STATUS.md
662) — **KHÔNG nạp 220.637 token** trong 61 file `docs/`. Tỉ lệ nạp **2%**.

**Dựng `STATUS.md` ở GỐC** — trước không có, nên B1 đỏ: đơn vị gốc không có trang trạng thái.
Từ khung 1.8.0, **mở phiên đọc `STATUS.md`**, không đọc đuôi `HANDOFF.md` nữa.

**Cổng cấu trúc còn ĐỎ, và đó là nợ CÓ THẬT:**
- **B12 · 42/154 ADR** đã `Accepted` mà thân bài bị sửa sau đó. Khung 1.8.0 đo chặt hơn 0.3.0.
  → `KHUNG-M1`.
- **B16** đòi khai `luat.chu_de` cho 154 ADR. **Cố ý để ở nhóm CẢNH BÁO**, không CHẶN — bật chặn
  khi đang đỏ là tự khoá repo. → `KHUNG-M2`.
- `budget.tokenNap: 6000` là con số **lúc migrate**, chưa phải con số của repo này. → `KHUNG-M3`.

**CHƯA ĐẨY.** Cổng đỏ ở B12 thì không được đẩy — luật mục 3 của repo này và mục 2 của bộ khung
đều nói vậy. Ba commit nằm local, chờ lane của repo này xử `KHUNG-M1` hoặc Đức chốt.

## 2026-09-10 · `harness-loi-02` — nâng bộ khung 1.9.22, hai cửa máy bật thật

**Số đo.** Bản ghim: **1.8.0 → 1.9.22** (hoặc 1.3.x → 1.9.22 tùy repo). Lượt `--apply`: **6–8 giây**.
`git config --local --get core.hooksPath` = `.githooks` — **cửa index bật thật**, đo được.

**Hai lỗi của BỘ KHUNG đã ảnh hưởng repo này, nay đã vá ở lõi:**

1. `upgrade.mjs` thiếu `import execFileSync`, `try/catch` nuốt `ReferenceError` thành một dòng cảnh
   báo → **`core.hooksPath` chưa từng được đặt ở bất kỳ repo nào đã nâng cấp**. Mang `.githooks/`
   sang mà cơ chế vẫn TẮT, triệu chứng y hệt lúc chưa mang gì.
2. `git config --get` đọc cả global → máy có khoá global thì `upgrade` báo *"đã bật từ trước"*
   và không bao giờ đặt local. Nay đọc `--local`.

**VẤP đáng ghi — lượt migrate KHÔNG tự làm repo đích xanh lại:** `upgrade --apply` mang file mới
sang nhưng **không khai vào Bản đồ file**, và **không sinh lại artifact**. Nên sau mọi lượt nâng,
cổng ở đây Đỏ ở đúng ba mục đó — **theo thiết kế, không phải sự cố**. Ba bước tay:
khai `.githooks/` một dòng · `build-dashboard` + `build-overview` · ghi Log này. Khả năng tự
động hoá vướng một nguyên tắc đang có: **`upgrade` không ghi vào tầng chữ của repo đích**. Đức chốt.

**Còn mở:** `npm test` của repo này — xem kết quả cổng ở lượt đóng tiếp theo.

## 2026-09-12 · `claude-gpt-chay-het-job` — dọn 4 mục đỏ, và chúng che một bộ kiểm chết 3 ngày

**Đức chốt:** *"4 mục đỏ đó bạn clean nốt cho tôi"*.

**Thứ tìm thấy khi đào:** **18/31** bài kiểm gốc repo không chạy nổi, `npm test` chết ngay bài
đầu — cả chuỗi vô hình từ **10/09** (migrate bộ khung `4da1e9e5` thêm 7 bài mới, **không xoá**
bài cũ). Trong ba ngày ấy **bốn lớp bảo vệ chết không một tiếng kêu**, cả bốn lộ ra khi chữa
lại chính những bài kiểm đó: `safe-push` mất cửa đối chiếu artifact với HEAD · bảng sống ba
cửa ném lỗi **mỗi lần Đức nhấp** · luật `nhap_dung_chung` không máy nào cưỡng chế (N-64 lần
hai) · cổng mất câu cảnh báo `--restamp`.

**Dãy B 44 → 0 chỗ CHẶN.** Không chỗ nào là lỗi thật: 22 chỗ oan cho lượt gộp ADR **Đức tự
chốt** (tầng LUẬT đã khai `decides:`/`moved_out` mà B12 không đọc), 20 chỗ cưỡng chế luật
`ADR-0026` **đã thu hồi** 09/09. Nay B12 làm đúng việc ADR-0026 giao và **siết thêm hai vế**
chưa ai cài: hai file cùng nhận một số = ĐỎ, `decides:` trỏ số chưa cấp = ĐỎ.

**Ba byte điều khiển thô làm phép kiểm xanh giả** (`/\bareaOf(/` thành backspace) — một chỗ do
**chính lượt này của tôi** đẻ ra.

**Thước `docs/`:** đo trước khi nâng. 9340 đặt lúc 16:11 khi docs/ là 9303; migrate lúc 22:29 đẩy
lên 9830 — **toàn bộ +527 là file của bộ khung**. Nâng đúng bằng chỗ vay mượn, ghi rõ là
**không phải slack**.

**Chống tái phát:** `dau-suite-smoke` nay cưỡng chế mọi tệp `tests/` phải nằm ở đúng một chuỗi,
**và** mọi bài trong khu cách ly phải thật sự đỏ. Lượt chạy đầu bắt ngay **ba** bài chưa từng
nằm trong chuỗi nào. `npm test` **thoát 0** — lần đầu kể từ 10/09.

**Còn nợ:** `N-65` — 8 bài (9.365 dòng) viết cho API đã biến mất, đang cách ly ở
`npm run test:chet`. Không xoá; cần Đức chốt viết lại hay bỏ.

**Cũng làm:** gỡ khoá `HANDOFF.md` bỏ quên 58 tiếng của `harness-loi-01` (thêm cửa
`--xong --duc-duyet` — trước nay khoá mức FILE **không lệnh nào gỡ được**) · commit mục Log
bỏ quên của `codex-hnx-week-20260912`, không sửa một chữ.

**Đuôi lượt:** N-64 có **hai** chỗ gọi và bản khôi phục đầu chỉ trả một — cổng đỏ lại ở lượt
chạy cuối, vẫn vì đúng file nháp ấy. Trả nốt; phép ghim nay **đếm** chỗ lọc chứ không chỉ tìm
thấy một cái. Bộ kiểm gốc repo: **13 xanh → 24 xanh**, `npm test` thoát 0.

**Đuôi lượt ⑵:** `STATUS.md` vẫn khai *"cổng cấu trúc còn ĐỎ ở B12 (42 ADR)"* — câu đó đi
thẳng vào bảng trạng thái và `PHIEN.md` mà mọi phiên gói nạp, nên nó dạy sai từng phiên một.
Sửa, và đổi `next_step`/`human_action` sang thứ Đức thật sự cần chốt: `N-65`. Và token giả
trong fixture gói chatgpt nay mang dấu `fake` — bộ dò secret thôi đỏ mỗi lượt chạy.

## 2026-09-15 · `claude-scouter-udine` — thêm một npm script cho gói Scouter

Chỉ một dòng ở gốc: `scouter:kiem-cai-dat` trong `package.json`. Nó gọi
`workers/duc-scouter/v0.1.0/scripts/kiem-cai-dat.mjs` — bộ kiểm **bản cài của người dùng**,
việc của `T9`. Mọi thứ còn lại nằm trong gói; chi tiết ở `HANDOFF.md` của gói đó.

**Bẫy công cụ đáng chép ra đây** vì nó không riêng gói nào: sửa tệp repo bằng Python thì
`io.open(p,"w")` ghi xuống dòng kiểu Windows và làm đỏ `eol-lf-smoke` cho **mọi** tệp đã sửa
trong lượt. Ghi bằng `newline=""` thì không dịch gì. Đã có dòng này trong sổ nhớ từ trước, và
tôi vẫn vấp — nên chép vào đây, chỗ phiên sau thật sự đọc.

## 2026-09-15 · `claude-scouter-udine` — vùng sở hữu thứ mười: `workers/udin-optic`

**Ba dòng ở gốc.** `.agents/claims.json` thêm khoá `workers/udin-optic` · `.repo-structure.json`
thêm gói đó vào danh sách sinh `PHIEN.md` · `package.json` thêm `udin:test` và nối suite gói mới
vào `npm test`. Mọi thứ còn lại nằm trong gói.

**Vì sao đây là một vùng, không phải một thư mục.** `.repo-structure.json` khai sẵn luật ở dòng
của `workers/_shared/`: một thư mục dưới `workers/` thành **đơn vị sở hữu riêng** khi nó là một
Extension — tức **có `manifest.json`**. Udin Optic nay có. Không có manifest thì steward là
`_root`, y như `_shared` hôm nay.

**Khuôn thư mục: theo Scouter, không theo `hnx-fetch`.** Hai gói đang có hai khuôn khác nhau —
`hnx-fetch` để `AGENTS.md`/`README.md`/`HANDOFF.md` ở **gốc gói**, Scouter để tất cả trong
`v0.1.0/`. Hai cổng ép chọn khuôn Scouter, và đáng ghi lại vì tôi mất hai lượt mới thấy:
 · `rule-compile --sinh` đọc `AGENTS.md` **trong thư mục phiên bản**, và đòi trong đó một mục
   tiêu đề đúng chữ `## Luật vàng` — thiếu thì `THIEU_LUAT_VANG`, và gói không có `PHIEN.md`.
 · cổng *"File mới đã khai vào Bản đồ file"* đối chiếu theo đường dẫn tính từ **thư mục đơn vị**,
   nên `README.md` nằm ngoài `v0.1.0/` không có bản đồ nào nhận nó.

Nên `hnx-fetch` xanh được là vì nó **không** nằm trong danh sách sinh `PHIEN.md` — nó dùng
`PROTOCOL.md` làm cửa vào thay thế. Ai định thêm gói vào danh sách đó thì phải dọn khuôn trước.

**Nhiễu đo cần biết, KHÔNG phải lỗi repo:** `rule-compile` đang đếm cả
`.claude/worktrees/<...>/` — worktree của một phiên nền chạy song song — nên "quyết định mồ côi"
nhảy từ 3 lên 167. Số thật vẫn là 3, và nó trở lại khi worktree kia được dọn. Đừng "sửa" nó.

## 2026-09-15 · `claude-bridge-read` — luật đọc DOM qua Bridge

Đức hỏi tôi có đọc được hội thoại GPT không. Đọc được, qua **Bridge của chính repo này**
(ghế `anhducds`, `chat-read`) — không phải qua browser của Claude, cái đó không có cookie.

Chốt thành [ADR-0037](docs/adr/0037-nap-doc-dom-dat-bang-tham-so-do-duoc.md), thi hành ở
[docs/protocols/BRIDGE-READ.md](docs/protocols/BRIDGE-READ.md): mặc định
`limit 2 x max_chars 6000`, tăng một lần, trần tổng 20.000 ký tự một câu hỏi.
Lý do gọn: **đọc lại là gửi lại từ đầu**, nên đọc dè đắt hơn đọc đủ.

Hai chỗ cổng bắt tôi, đã sửa: sửa tay `.agents/claims.json` làm vỡ niêm phong (có sẵn
`scripts/claim.mjs`, tôi không tra trước); và `docs/adr/` **chưa từng được khai** trong Bản
đồ file nên mọi ADR mới đều vấp — khai cả thư mục một lần thay vì thêm dòng mỗi lần.

**CẦN ĐỨC:** ⒜ bảng budget 6 mode phải dán vào rule GPT bên kia mới có hiệu lực. ⒝ vùng
`_docs` còn **1 commit chưa đẩy của lane trước** — lượt push tới phải `--carry`.

**CHƯA ĐO:** DOM ChatGPT có giữ hết mọi lượt với hội thoại dài không. Một lệnh là ra:
mở chat dài, `chat-read`, đọc `matched`.

## 2026-09-15 · `claude-bridge-read` — nắp đọc về `2 × 3.000`, và bỏ file protocol

Đức chốt lại: nắp **tổng** 6.000 = `limit 2 × max_chars 3000`, không phải 6.000 mỗi lượt.
Kèm đó `BUDGET 250 w` cho MỌI mode GPT — một con số thay cho bảng sáu mode. Cập nhật ở
[ADR-0037](docs/adr/0037-nap-doc-dom-dat-bang-tham-so-do-duoc.md).

**Vì sao 250 w:** hai lượt **không dùng chung hạn mức**, nên `2 × 3.000` thực chất là
*"câu trả lời GPT được tối đa 3.000"*. Đo 15/09 một lượt 3.058 ký tự đã bị cắt.

**Lý lẽ mạnh nhất, do Đức nêu:** `chat.read` **không bao giờ báo lỗi vì xin ít** — DOM hội
thoại dài có hàng trăm nghìn ký tự, nên mọi mức nắp đều trả về kết quả trông đầy đủ như
nhau. Nắp là **van tiêu tiền**, không phải cửa đúng/sai, nên **đọc thừa hoàn toàn vô hình**.
Đó là lý do con số phải nằm trong luật chứ không để mỗi phiên tự chọn.

**Đã XOÁ `docs/protocols/BRIDGE-READ.md`.** Nó đẩy `docs/` lên 9.865 / thước 9.830, và
`.repo-structure.json` dặn nguyên văn: văn xuôi của repo này thì **xoá hoặc chuyển sang
ADR, không nâng thước**. Phần thi hành nay nằm trong ADR-0037 (`adr/` không tính thước),
số vận hành nằm ngay dòng bản đồ `AGENTS.md`. Về lại **9.830/9.830**.

Hai lỗi của tôi ở lượt này, cổng bắt: sửa mục Log đã commit (HANDOFF là vùng **CHỈ-THÊM** —
phải ghi mục mới), và tưởng file mới không bị tính thước (nó chỉ chưa bị tính khi còn
**chưa track**; commit xong là vào sổ).

## 2026-09-15 · `claude-bridge-read` — rút gọn ADR-0037

Đức: *"32 dòng tôi thấy nhiều"*. Rà lại thì mục **Cách làm** đang kể lại đúng những gì mục
Bối cảnh đã nói — đó mới là chỗ phình, không phải chỗ có thông tin.

ADR-0037 **94 → 65 dòng**. Bốn số đo trong Bối cảnh gộp thành bốn gạch đánh số ⑴–⑷, mục
Quyết định trỏ ngược `(⑷)` thay vì kể lại; phần thi hành còn **một khối 4 dòng**. Số không đổi:
`limit 2 × max_chars 3000`, tăng một lần, tổng ≤ 12.000, GPT `BUDGET 250 w` mọi mode.

## 2026-09-16a · Bảng máy sinh theo HEAD mới sau `U0`–`U4` (udin-optic)

Việc thật nằm ở `workers/udin-optic/`; ở gốc repo phiên này chỉ **sinh lại ba bảng máy sinh**
(`DASHBOARD.md` · `FEATURE-PARITY-AUTO.md` · trang tổng HTML) và `.agents/claims.json`.
Không đổi một dòng luật, một dòng `scripts/` hay `tests/` nào ở tầng gốc.

Một thứ đáng ghi lại cho lane sau: cổng bắt đúng một lỗi **đáng tiền** ở `STATUS.md` của
`udin-optic` — `human_action` có việc thật (Đức phải nạp lại extension) nhưng **không có dấu**
`@Đức` nào, nên việc đó sẽ rơi khỏi bảng *Đức cần làm* **một cách im lặng** (`N-29`). Đã gắn
`@Đức:bấm`. Đây đúng là loại lỗi không ai tự thấy: cả hai đầu đều *trông như* đúng.

## 2026-09-16b · Bảng máy sinh theo HEAD sau `U5`

Việc thật ở `workers/udin-optic/` và `workers/duc-scouter/` (chặng `U5`: mang cỡ chữ,
thu phóng trang và nút *Kiểm tra kết nối* về Scouter). Ở gốc repo phiên này chỉ **sinh lại ba bảng
máy sinh** và thêm hai lệnh vào `package.json` (`scouter:bang-ben`, `udin:bang-ben`).
Không đổi một dòng luật, một dòng `scripts/` hay `tests/` nào ở tầng gốc.

## 2026-09-16c · Bảng máy sinh theo HEAD sau `S1`–`S3`

Việc thật ở `workers/duc-scouter/` và `workers/udin-optic/` (đường ghi **tự kiểm**:
`scout.type` đọc lại ô nhập, `scout.click` khai thật + tham số `wait_for`). Ở gốc repo
phiên này chỉ **sinh lại ba bảng máy sinh** và thêm một lệnh vào `package.json`
(`scouter:doc-lai`). Không đổi một dòng luật, một dòng `scripts/` hay `tests/` nào ở tầng gốc.

## 2026-09-16 · `claude-scouter-udine` — thêm `scouter:hinh-hoc` vào `package.json`

Một dòng script: `npm run scouter:hinh-hoc` → `workers/duc-scouter/v0.1.0/scripts/do-hinh-hoc.mjs`.
Đó là phép đo đóng `S-21` (một tab thôi trả lời câu hỏi hình học). Nó **không** nằm trong suite
mặc định, cố ý: nó mở một Chrome riêng và giết tiến trình vẽ trang — cùng kiểu với
`scouter:doc-lai` và `scouter:action-probe`. Nhật ký đầy đủ ở `workers/duc-scouter/HANDOFF.md`.

## 2026-09-16 · `claude-scouter-udine` — móc `truocKhiChuyen` ở máy chủ Bridge DÙNG CHUNG

`workers/_shared/bridge-host/bridge-host-core.mjs` nhận thêm một tuỳ chọn `truocKhiChuyen`:
một hàm sửa phong bì **trước khi chuyển tiếp xuống extension**. **Mặc định KHÔNG CÓ**, và ba gói
`duc-auto-*` không truyền gì nên hành vi của chúng không đổi một byte.

Nó ra đời cho `scout.upload` (`T29`): đường dẫn tương đối phải được ghép vào vùng ghi, mà **chỉ
máy chủ biết vùng ghi ở đâu và chỉ máy chủ là bên người gọi không chi phối được**. Để extension
tự ghép thì phải đẩy cái biết ấy xuống theo một đường khác — tức đẻ thêm một chỗ để lệch.

Móc ném thì lượt gọi ĐỎ và **không gì được chuyển xuống**: một đường dẫn chưa kiểm được thì
không đi tiếp. Thêm `scouter:tai-len` và `scouter:hinh-hoc` vào `package.json`.

## 2026-09-17 · `claude-scouter-udine` — `tests/cong-do-that.mjs`: sáu hàng cổng, sáu ca hỏng thật

`A1` hỏi: sáu hàng **chưa đỏ lần nào** qua 300 lượt chạy — *dựng nổi ca hỏng cho chúng không?*
Đi tìm thì gặp thứ tệ hơn một hàng chưa đỏ: **bộ máy trả lời đã được thiết kế sẵn, mà file nó
đọc thì chưa bao giờ tồn tại.** `can-nang.mjs` đọc `tests/cong-do-that.mjs` để đánh dấu ✓ — file
ấy không có trong cây làm việc, không trong `git log --all`, không bị `.gitignore`. Nhưng bốn
chỗ trích nó **như một sự thật đã có**: `session-check.mjs` (*"cả hai vế có ca hỏng dựng sẵn ở …
khối 1"*), `build-dashboard.mjs` (*"gọi cổng 50 lượt, tức 462 giây"* — một phép ĐO của file chưa
tồn tại), và `harness-smoke.mjs` năm lượt. Một **màu xanh giả có trích dẫn**: đọc như bằng chứng
nên không ai đi kiểm.

Nay file đã viết và **6/6 hàng đỏ được thật**. Mỗi khối hai lượt đo — XANH trước khi bẻ, ĐỎ sau
khi bẻ — trong kho tạm dùng xong xoá, không bao giờ bẻ trong cây làm việc thật. Vế đo-trước
không thừa: nó bắt ngay một fixture đã đỏ sẵn (kho không có `origin` thì `rev-parse --verify
origin/main` đi qua `git()` chứ không qua `gitLoiLaBinhThuong`, nên *"Mọi lệnh git đọc được"* đỏ
vì thiếu remote, không phải vì thứ tôi vừa bẻ).

Ba lời trích sai đã sửa tại chỗ: con số 462 giây → **12 lượt gọi cổng ≈ 24,7 giây**; câu "khối 1"
của `session-check` nói thẳng là hai vế ấy **vẫn chưa có** ca hỏng; và `can-nang` thôi in *"đã
chứng minh là ĐỎ ĐƯỢC"* — nó chỉ dò TÊN trong văn bản, không chạy gì, nên nay in lệnh xác nhận.

`npm run test:do-that` — **KHÔNG** vào `npm test`: 12 lượt cổng, và bộ kiểm chính đã 199/180 giây.
## 2026-09-17 · `claude-scouter-udine` — sổ luật thôi đếm một cây khác; `A2`–`A5`

**`A2` — bộ đo quét ĐĨA trong khi repo được định nghĩa bởi GIT.** Báo **169 quyết định mồ côi**;
**164** nằm ở `.claude/worktrees/`, cây mà `git ls-files` đếm **0 file**. Bỏ qua `.claude/` → sổ
cái **354 → 180**, mồ côi **169 → 0** (năm mục thật đã xử). Đối chứng: `can-nang.mjs` đọc từ git
nên **không** bị thổi.

**`A3` — B16 xanh, và nay CHẶN.** Khai bảy `luat.chu_de`; 20 ADR gốc nhận `chu_de:` + `nhom:`
**cùng giá trị** (một phân loại, không phải hai), mỗi chủ đề đúng một `dau_moi`. `npm run luat --
--kiem` thoát 0. `B16` vào `bootstrap.blocking` — siết, không hạ hạng. Đóng `KHUNG-M2`.

**`A4` — bớt trước, và chỗ không bớt được thì nói ra.** `npm run don -- --apply`: `HANDOFF.md`
**900 → 480** dòng, dời nguyên văn sang `docs/archive/`. `tokenNap` **6000 → 5724** (đo 4.403 +
biên 30%) — đóng `KHUNG-M3`. Còn *"Tổng tài liệu 9.958/2.200"*: con số 2.200 **chưa bao giờ là
của repo này** — nó là mặc định bộ khung, và repo chưa từng khai khối `budget`. [ADR-0038] khai
trần của chính repo, dạng **bánh cóc**. **Phần bớt thật là `docs/studies/` — 5.516 dòng, 55% kho
chữ — và nó CHỜ ĐỨC**, vì `docs/README.md` đang khai chúng là *"nghiên cứu còn sống"*.

**`A5` — máy sạch, người đọc được 9/22.** ① 0 · ② 0 · ③ 0 (khai `trung_co_y` cho cặp
`hnx-fetch` Đức đã chốt 08/09 là CỐ Ý lặp) · ④ **22 → 13**. Chỉ đóng dấu cho chỗ đã đọc THẬT; 13
chỗ giữ mốc 09/09 — đóng dấu mà không đọc chính là bệnh `A5` đi chữa. Ba chỗ dạy sai đã sửa:
`decisions.md` Flow Video còn dạy *"viết ở `Proposed`"* — vế Đức chốt ngược lại **09/09**, sống
thêm 8 ngày vì nó nói bằng lời mình nên phép ① không thấy; `README.md` bảo đóng phiên bằng
`test:song-song` (cổng gọi `npm test`), và bỏ sót `udin-optic`.

Hai bẫy mới, số đo và cửa ra ở sổ nợ: **`KHUNG-M4`** (hai công cụ cắt nhật ký, hai quy ước) ·
**`KHUNG-M5`** (khoá trùng trong `.repo-structure.json` lọt im lặng). Cả hai gặp thật hôm nay.

## 2026-09-17 · `claude-scouter-udine` — bánh cóc cắn ngay chủ của nó

Vừa khai trần tài liệu (bánh cóc, [ADR-0038]) xong thì **chính phiên này** thêm 6 dòng vào
`README.md` — hàng `udin-optic` còn thiếu, và câu sửa lỗi hướng dẫn *"đóng phiên bằng
`test:song-song`"*. Thước **ĐỎ ngay lượt đo sau**. Trả bằng cách **bớt chuyện kể** (ghi chú
Observer V0, hai dòng gói lại), **không nâng con số** — đó là toàn bộ điểm của một bánh cóc, và
lần đầu nó cắn chính người vừa đặt nó.

Một lượt nữa đáng ghi vì nó là LUẬT chứ không phải phiền toái: lượt sửa trên tôi định viết lại
vài dòng **trong mục nhật ký đã commit** cho gọn. Cổng bắt đúng: *"xoá 6 dòng mà 6 dòng KHÔNG có
bản khớp byte trong kho lưu trữ. Dời chỗ thì được, xoá thì không. **Sửa dòng cũ không phải là ghi
Log**."* Mục cũ đã trả về nguyên văn; phần thêm nằm ở đây, đúng chỗ nó phải nằm.

## 2026-09-17 · `claude-scouter-udine` — audit độc lập trả ĐỎ, và nó đúng ở bốn chỗ

Đức chốt gọi Codex CLI chạy `Đ2`. Nó đọc thẳng repo trên `HEAD 4f59dc32`, trả **ĐỎ**. `HEAD` và
`git status` không đổi trước/sau — nó không sửa gì.

**① CAO — lượt miễn `trung_co_y` RỘNG HƠN quyết định nó ghi lại.** Bản đầu khoá theo **vân tay**
thôi, kèm lời tôi tự khen là fail-toward-asking vì *"sửa lời một bản thì miễn hết hiệu lực"*. Vân
tay canh chiều SỬA CHỮ — **không canh chiều THÊM BẢN CHÉP**: chép câu ấy sang file luật thứ BA
thì bản chép đó cũng được miễn, im lặng. Nay phải khớp **cả tập file** (`{ ly_do, o: [...] }`);
khai thiếu `o` thì KHÔNG miễn gì và bộ biên dịch nói ra. Ghim ⒜⒝⒞ ở `rule-compile-smoke`, **2/2
đột biến chết**.

**② Hai hàng cổng nằm trên CÙNG MỘT CHÂN.** Sửa `git()` để nó chỉ ghi lỗi của vài lệnh thì cả
sáu khối `cong-do-that` vẫn xanh — mà ở kho thật, `ls-files` hỏng là phép quét secret nhận danh
sách rỗng và báo **"sạch"**. Nay danh sách rỗng là `KHONG_SOI_DUOC`, đỏ. Khối ④b bẻ hẹp hơn hẳn
(hỏng `.git/index` — `ls-files` chết, `log` vẫn sống). Đột biến gỡ chốt → khối ấy đỏ.

**③ Bánh cóc chưa có răng.** `budget.*` tự xưng *"chỉ được HẠ"* nhưng không gì so nó với chính
nó của hôm qua: nâng trần trong CÙNG commit với phần phình là xanh. Nay `can-nang` so với `HEAD`
và gọi tên lượt nới. Thử `9958 → 12000`: `✗ TRẦN VỪA BỊ NỚI`.

**④ Một câu đối chứng của tôi SAI.** Tôi viết *"`can-nang.mjs` đọc từ git nên KHÔNG bị thổi"* —
`liet()` của nó cũng `fs.readdirSync`. **Kết luận đúng, lý do sai**, và lý do mới là thứ phiên
sau tin. Đo lại: 42/42 file `.md` dưới `docs/` đều được git track — số 9.958 sạch vì **cây hôm
nay sạch**, không vì công cụ hỏi git. Gạch tại chỗ ở `rule-compile.mjs` và `CHUOI-VIEC.md`.

Hai mục nhận nhưng chưa làm, có số và có chuỗi hỏng: `KHUNG-M6` (bộ đo vẫn quét ĐĨA — chặn một
cái tên không phải chặn cả lớp) · `KHUNG-M7` (`hang()` khớp `includes`, hôm nay đúng do MAY).

## 2026-09-17 · `claude-scouter-udine` — audit vòng 2 cũng ĐỎ, và ba lỗ là của chính bản vá vòng 1

**Ba trong năm phát hiện nằm trong thứ tôi vừa sửa xong buổi sáng.** Đúng bài repo đã ghi: *soi
lại sau MỖI vòng sửa*, đừng cho rằng một bản vá hẹp thì an toàn.

**⒜ Khai miễn hỏng chỉ bị soi KHI nhóm ấy đang trùng.** `duocMien()` gọi trong vòng lặp, nên một
lượt khai hỏng mà hôm nay chỉ khớp MỘT file thì không ai gọi tới — nó **im hoàn toàn**, và là
một cái bẫy nằm chờ tới ngày có người chép bản thứ hai. Nay soi **cả bảng khai TRƯỚC**, không
phụ thuộc hôm nay tìm thấy gì.

**⒝ `ly_do` chưa bị bắt buộc** — khai `{ o: [...] }` trống lý do vẫn miễn được, tức lượt miễn
thành một công tắc không tên.

**⒞ Vân tay + tập file VẪN chưa bằng "câu Đức đã duyệt".** Đây là đường vòng đắt nhất, và Codex
chạy thật để chứng minh: thay **cả hai** bản trùng bằng một câu **ngược nghĩa cùng bộ từ** (đảo
trật tự mệnh đề) thì `vanTay()` cho y hệt — nó cố ý bỏ thứ tự — tập file y hệt, và lượt miễn vẫn
che. Nay khai thêm `cau`, so bằng `cauChuan()`: bỏ markdown/dấu/hoa-thường nhưng **GIỮ trật tự**.

**⒟ `can-nang`:** một khoá ngân sách **MỚI** không có đối chứng ở `HEAD` thì lượt so im lặng bỏ
qua — đi vòng qua bánh cóc bằng đúng một bước. Nay kể ra. Và *"KHÔNG ĐO ĐƯỢC"* trước đây vẫn
thoát 0; nay nó vào `canh`, vì không đo được không phải là đạt.

**⒠ Đường vòng qua cả bảy khối:** thêm `if (file.endsWith(".env")) continue` vào vòng quét secret
thì **bảy khối vẫn xanh** — fixture không có `.env` nào nên con số bao phủ vẫn N/N. Nay khối ②
đo **con số bao phủ** (đọc N trên N) **và** fixture mang sẵn tám đuôi hay bị bỏ qua. Thử bỏ
`.env` · `.yaml` · `.py`: **3/3 chết**. Bài học: một phép đo bao phủ chỉ có răng khi tập được đo
có chứa thứ sắp bị bỏ.

Đột biến: **3/3** trên ba vế mới của lượt miễn, **3/3** trên ba đuôi file.

## 2026-09-17 · `claude-scouter-udine` — Đức chốt dời 8 bản thiết kế đã ship sang `docs/archive/`

Đức hỏi *"`docs/studies/` là nội dung gì?"*, đọc xong mười file rồi chốt: **dời 8, giữ 2**.

**Vì sao 8 file ấy đi được:** cả tám là phần *nghĩ TRƯỚC khi xây*, và cả tám mô tả những thứ **nay
đã tồn tại và đang chạy** — multi-profile Bridge (ship cả ba worker), nhiều phiên một profile
(thành code `54160a2`), kế hoạch gói Flow (gói đã có), kiểm kê trước khi xây Scouter (`v1` đã ký),
RFC `.repo-structure.json` (nay là xương sống), khảo sát chạy song song (thành hệ khoá/lane),
lộ trình S1–S10 (§8 của chính nó ghi *"S1→S7 đã đóng"*), và một bản tự khai **"REASONING ONLY"**.
Phần *ràng buộc* của chúng đã rút thành ADR từ lâu; giữ ở `studies/` là bắt mọi lượt đo trả tiền
cho **2.553 dòng kế hoạch đã thành sản phẩm**.

**Hai file GIỮ LẠI, và đây là vế đắt:** `PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0` là **thứ duy nhất
còn lại** của 14 hồ sơ `EXP-*` Đức chốt xoá 08/09 — đụng vào nó là mất thật. Cùng nguồn của nó
(`CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0`) giữ theo, vì bản synthesis vẫn khai nó là đầu vào.

**Dời, KHÔNG xoá** — `git mv`, nguyên văn, vẫn trong git. Đo: `docs/` **9.865 → 7.328 dòng**;
`can-nang` **9.958 → 7.414**. Hai bánh cóc **HẠ theo** (`tran_dong_khong_ke_adr` 9830 → 7328,
`budget.tongTaiLieu` 9958 → 7414) — hạ là việc duy nhất chúng được phép làm.

**Liên kết: sửa tài liệu SỐNG, KHÔNG sửa bản ghi.** 9 file sống đổi đường dẫn.
`HANDOFF-ARCHIVE-*`, `evidence/*`, `decisions.md` và các ADR vẫn trỏ `docs/studies/…` cũ — **cố
ý**, cùng lý lẽ đã áp 02/09 cho các dòng `Nguồn: drafts/…`: sửa trích nguồn trong một bản ghi là
làm sai bản ghi.

<!-- HANDOFF-THANG: 2026-09 -->
