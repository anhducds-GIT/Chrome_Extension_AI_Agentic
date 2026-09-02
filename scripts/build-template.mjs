/* BỘ TRÍCH TEMPLATE — sinh `template/` từ chính repo này.
 *
 * Vì sao là BỘ SINH chứ không phải chép tay (K1, 2026-09-02):
 * chép tay tạo ra hai bản của cùng một thứ, và hai bản thì trôi khỏi nhau — đúng cái bệnh cả
 * chương trình này sinh ra để chữa. Là bộ sinh thì `template/` trở thành **artifact tái sinh
 * được**, và `--check` biến "template có còn khớp bản gốc không" thành một câu hỏi máy trả lời.
 *
 *   node scripts/build-template.mjs           # sinh
 *   node scripts/build-template.mjs --check   # chỉ so, không ghi; lệch thì thoát 1
 *
 * ĐÂY LÀ CHỖ Ở TẠM. Theo ADR-0001, template sẽ sống ở một repo độc lập. `template/` trong repo
 * này là bãi tập kết để chứng minh trước khi dời — dời một bản trích chưa chứng minh thì chỉ
 * chuyển chỗ cho vấn đề.
 *
 * LUẬT TRÍCH (mục 10.2 của roadmap): bộ máy và bộ luật thì ĐI; bản đồ địa phương, trạng thái,
 * trang máy sinh và bằng chứng thì Ở LẠI. Chép nhầm nhóm cuối là mọi repo cùng hiển thị trạng
 * thái của repo Chrome.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "template";

/* Script nào đi theo template. `feature-parity.mjs` CỐ Ý không có mặt: nó so hai nhánh worker
   của riêng repo Chrome, không phải hạ tầng chung. */
const PORTABLE_SCRIPTS = [
  "repo-structure.mjs",
  "build-dashboard.mjs",
  "check-bootstrap.mjs",
  "session-check.mjs",
  "safe-push.mjs"
];

/* Chép nguyên văn, không đổi một ký tự. */
const VERBATIM = [
  ["STATUS.template.md", "STATUS.template.md"],
  ["docs/_TEMPLATE-adr.md", "docs/_TEMPLATE-adr.md"],
  ["docs/_TEMPLATE-study.md", "docs/_TEMPLATE-study.md"],
  ["docs/_TEMPLATE-brief.md", "docs/_TEMPLATE-brief.md"],
  // SUITE HẠT GIỐNG — MỘT bản dùng cho cả repo này lẫn mọi repo dựng từ bộ khung. Chép nguyên
  // văn chứ không nhúng thành chuỗi trong file này, vì hai lý do: nhúng một file JS vào một
  // template literal là mời gọi hỏng do backtick và `${`, và quan trọng hơn — chép nguyên văn
  // nghĩa là repo gốc CHẠY THẬT đúng cái nó phát cho người khác. `--check` không cho hai bản
  // trôi khỏi nhau. Bốn khối bên trong đều đã qua đột biến.
  ["tests/harness-smoke.mjs", "tests/harness-smoke.mjs"]
];

/* ADR-0000 CỐ Ý KHÔNG chép nguyên văn. Bản gốc kể lại lịch sử di trú của riêng repo gốc — ba
   file `decisions.md`, số quyết định của từng gói — và nó là bản ghi BẤT BIẾN nên không được
   sửa. Đúng hơn về mặt khái niệm: ADR-0000 của mỗi repo là *quyết định của chính repo đó* về
   việc áp dụng ADR, không phải bản sao quyết định của người khác. Nên template mang một hạt
   giống: giữ nguyên bốn luật, thay phần bối cảnh bằng bối cảnh của một repo mới. */
const ADR_SEED = `---
status: Proposed
adr: 0000
date: YYYY-MM-DD
deciders: <ai chốt>
---

> **Hạt giống — chưa có hiệu lực.** Đổi \`status\` thành \`Accepted\`, điền \`date\` và
> \`deciders\` khi chủ repo chốt. Việc đó là **hành động nhận luật**, không phải thủ tục:
> từ lúc đó mọi ADR \`Accepted\` trong repo này trở thành bất biến và phép kiểm B12 cưỡng chế.
>
> Cố ý để \`Proposed\` chứ không phải \`Accepted\`, vì hai lý do. Một: một quyết định mang ngày
> \`YYYY-MM-DD\` và người chốt \`<ai chốt>\` thì chưa ai chốt cả. Hai: B12 khoá mọi ADR đã
> \`Accepted\`, nên phát đi ở trạng thái đó là khoá luôn cả bộ sinh template — lần cập nhật
> bộ khung sau sẽ bị chính cổng kiểm chặn.

# ADR-0000 — Ghi nhận quyết định kiến trúc bằng ADR bất biến

## Bối cảnh

Repo này vừa được khởi tạo từ bộ khung. Chưa có quyết định kiến trúc nào được ghi lại.

Cách làm mặc định — ghi quyết định vào một file dài kiểu \`decisions.md\` — hỏng theo ba kiểu,
đo được ở repo mà bộ khung này rút ra:

1. **Không tra được.** Muốn biết vì sao đã chọn X thay vì Y thì phải đọc dò cả file. Không có
   địa chỉ để trỏ tới.
2. **Không bất biến.** Một dòng sửa được, và không ai biết nó đã bị sửa — trong khi bằng chứng
   vận hành, thứ yếu hơn, thì đã được cổng kiểm bảo vệ.
3. **Quan hệ thay thế viết bằng văn xuôi.** *"Thay cho dòng bên dưới"* trỏ theo vị trí vật lý;
   thêm một dòng ở giữa là lời trỏ đó sai.

## Quyết định

Quyết định kiến trúc được ghi thành **ADR** — mỗi quyết định một file, chuẩn Nygard, đúng bốn
mục: **Bối cảnh · Quyết định · Hệ quả · Trạng thái**.

**Bốn luật:**

1. **ADR ở trạng thái \`Accepted\` là BẤT BIẾN**, ngang hàng bằng chứng vận hành. Không sửa nội
   dung, kể cả sửa lỗi chính tả.
2. **Đổi ý = viết ADR MỚI.** ADR cũ chuyển sang \`Superseded by ADR-NNNN\`; **hai bên phải trỏ
   nhau** — bản mới nói nó thay cái nào, bản cũ nói nó bị cái nào thay.
3. **Hai tầng, theo phạm vi của quyết định:** quyết định của một đơn vị công việc →
   \`<đơn-vị>/docs/adr/\`; quyết định của cả repo → \`docs/adr/\` ở gốc. Đánh số liên tục trong
   phạm vi **từng thư mục**, bắt đầu \`0001\` (thư mục gốc bắt đầu từ ADR này, \`0000\`).
4. **Sổ quyết định cũ không bị xoá.** Nó là bản ghi có thật; nội dung chuyển đi thì nó trở
   thành **mục lục** trỏ sang từng ADR, kèm một dòng nói rõ chuyển đi đâu và vì sao.

Luật 1 được **cưỡng chế bằng máy**, không phải bằng lời hứa: phép kiểm **B12** trong
\`scripts/check-bootstrap.mjs\` đi ngược lịch sử git của từng file ADR, tìm commit đầu tiên đưa
nó sang \`Accepted\`, và báo lỗi nếu **phần thân** đổi sau mốc đó. Sửa riêng frontmatter thì
được — đó chính là cách một ADR bị thay thế đúng luật (luật 2).

## Hệ quả

**Được:**

- Mỗi quyết định có một địa chỉ trỏ được, thay vì "dòng thứ mấy trong một file dài".
- Quan hệ thay thế thành dữ liệu máy đọc được, không còn là văn xuôi trỏ theo vị trí.
- B12 thôi in \`KHÔNG ÁP DỤNG\` — trước khi có thư mục ADR, nó là một phép kiểm không có gì để kiểm.

**Mất, và phải nói thẳng:**

- **Ghi một quyết định tốn công hơn.** Trước: thêm một dòng. Nay: tạo file, đánh số, viết đủ bốn
  mục. Đây là chủ đích — thứ đắt hơn thì được cân nhắc kỹ hơn.
- **Sửa sai một ADR đã \`Accepted\` không còn là việc sửa file**, mà phải viết ADR mới. Với lỗi
  chính tả thì phiền; đổi lại là bản ghi đáng tin.
- **Nhiều file nhỏ.** Duyệt bằng mắt sẽ phải cuộn. Đổi lại là tra được bằng đường dẫn.

## Trạng thái

Accepted
`;

/* Gốc repo có `package.json`, tức nó LÀ một đơn vị công việc theo khối `units` — nên nó phải
   có `STATUS.md`. Phép thử repo rỗng bắt được đúng chỗ này: bản trích đầu tiên thiếu file này
   và cổng kiểm đỏ ngay ở B1. Đây là lý do phép thử tồn tại. */
const STATUS_SEED = `---
schema: extension-status/v2
id: repo-goc
name: Đổi thành tên repo của bạn
lifecycle: idea
owner: chua-khai
priority_rank: 1
next_step: "Sửa .repo-structure.json cho khớp repo này, rồi chạy cổng kiểm cấu trúc lần đầu"
version_source: package.json
current_focus: "Repo vừa khởi tạo từ bộ khung; chưa khai gì thêm"
ref_readme: README.md
ref_handoff: HANDOFF.md
---

# Trạng thái — gốc repo

> **Đây là file KHAI BẰNG TAY.** Bảng điều hành đọc phần đầu file này; đừng gõ tay số nào mà
> máy đo được. Khuôn đầy đủ và luật: \`STATUS.template.md\`.

Repo vừa được khởi tạo từ bộ khung, chưa có việc thật nào.

**Ba việc đầu tiên, theo đúng thứ tự:**

1. Sửa \`.repo-structure.json\` — khối \`units\` (đơn vị của bạn nằm đâu) và \`areas\` (mỗi thư mục
   top-level một dòng).
2. Chạy \`npm run dashboard\` để sinh cổng vào máy đọc. **Trước bước này, phép kiểm điều hướng
   sẽ báo vàng vì chưa có gì để đi từ đó** — đúng, không phải lỗi.
3. Chạy \`npm run bootstrap\` để biết repo đang nợ những gì.

Sửa xong ba bước trên thì thay toàn bộ nội dung file này bằng trạng thái thật.
`;

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/* Thay thế CÓ CHỦ ĐÍCH, liệt kê từng cặp để người audit thấy đúng cái gì bị đổi.
   Cố tình KHÔNG dùng regex quét bừa: quét bừa thì một ngày nào đó nó sẽ đổi một chuỗi mà không
   ai ngờ tới, và không ai phát hiện được vì không có danh sách để đối chiếu. */
const GENERIC = [
  ["`workers/duc-auto-chatgpt/v0.1.0/manifest.json` thật sự ghi version `0.3.0`",
   "`workers/<gói>/v0.1.0/manifest.json` thật sự ghi version `0.3.0`"]
];

function genericize(rel, text) {
  let out = text;
  for (const [from, to] of GENERIC) out = out.split(from).join(to);
  return out;
}

/* Phụ lục nghề — bản CÓ THẬT, không phải ví dụ bịa. Chín dòng bị tách khỏi luật chung nằm
   nguyên ở đây. Repo không làm nghề này thì xoá file đi; giữ lại một phụ lục sai nghề còn tệ
   hơn không có phụ lục. */
const ANNEX_SEED = `---
kind: annex
nghe: tự động hoá trình duyệt
status: optional
---

# PHỤ LỤC NGHỀ — tự động hoá trình duyệt

> **Tuỳ chọn.** Repo bạn không lái trình duyệt thì **xoá file này** và xoá dòng trỏ tới nó ở
> mục 6 của \`AGENTS.md\`. Giữ một phụ lục sai nghề còn tệ hơn không có phụ lục: nó dạy phiên AI
> sau tuân luật cho một việc repo này không làm.

Chín luật dưới đây từng nằm trong luật chung của repo sinh ra bộ khung. Chúng **đúng** — mỗi
dòng là một lần trả giá thật — nhưng chỉ đúng với repo lái trình duyệt. Để lẫn vào luật chung
là ép một repo tài liệu tuân luật về selector DOM.

## Phải hỏi chủ repo trước

1. **Thêm quyền (permission) mới cho extension.** Quyền là thứ người dùng cuối nhìn thấy và
   phải đồng ý; thêm âm thầm là đổi hợp đồng với họ.
2. **Chạy pilot live mới trên trang thật.** Chạy thật thì tốn lượt thật và để lại dấu vết thật.

## Luật vàng, bản của nghề này

3. **Không đoán selector.** Mọi selector phải có bằng chứng DOM thật. Cần bằng chứng mới →
   gọi \`diagnostics.dom_probe\` qua Bridge, đừng mượn mắt chủ repo.
4. **Suite không chạm DOM thật**, nên fixture bằng chứng là vàng: một bản chụp DOM có thật
   đáng giá hơn mười phép kiểm dựng trên DOM tưởng tượng.

## Vùng cấm sửa

5. **\`pilot-*/\` · \`Pilot-*/\` · \`Batch-*/\` · \`evidence/\`** — bằng chứng vận hành. Chỉ được
   THÊM mới, không sửa, không xoá, không tạo lại.
6. **Không bao giờ gán \`.innerHTML\` / \`.outerHTML\` / \`insertAdjacentHTML\`.** Trang đích là
   nội dung không tin được; gán thẳng HTML là mở cửa cho nó chạy code trong ngữ cảnh của bạn.

## Vai

7. **Vận hành Bridge** thuộc về phiên làm kiến trúc/điều phối, không phải phiên dựng UI.

## Đóng phiên

8. **Gặp lỗi mới trên trang thật** → thêm một dòng vào bảng lỗi của sổ tay vận hành. Trang thật
   đổi mà không báo trước; bảng lỗi là bộ nhớ duy nhất giữa các phiên.
9. **Mỗi lỗi mới trên trang thật cũng là ứng viên cho một phép kiểm máy** — cân nhắc thêm vào
   cổng đóng phiên. Luật nào không kiểm được bằng máy thì sớm muộn cũng bị bỏ qua.
`;

const ANNEX_TEMPLATE = `---
kind: annex
nghe: <tên nghề của repo bạn>
status: optional
---

# PHỤ LỤC NGHỀ — <tên nghề>

> Chép file này thành \`docs/ANNEX-<ten-nghe>.md\`, rồi khai một dòng vào bản đồ mục 6 của
> \`AGENTS.md\`. Không khai = không tồn tại.

**Phụ lục là gì:** luật chỉ đúng với **nghề** repo bạn làm, không đúng với mọi repo. Nếu một
dòng luật đúng với cả repo tài liệu lẫn repo hạ tầng thì nó thuộc luật chung, đừng để ở đây.

**Phép thử một câu:** *"Một repo hoàn toàn khác nghề có phải tuân dòng này không?"* — Có thì
nó là luật chung. Không thì nó thuộc phụ lục.

## Phải hỏi chủ repo trước

<Việc nào của nghề này tốn tiền thật, đổi hợp đồng với người dùng, hoặc không lùi lại được?>

## Luật vàng, bản của nghề này

<Nghề này lấy bằng chứng bằng cách nào? Cái gì ở đây dễ ĐOÁN nhất, và đoán sai thì mất gì?>

## Vùng cấm sửa

<Thư mục nào chỉ được thêm? Hàm/cấu trúc nào không bao giờ được dùng, và vì sao?>

## Đóng phiên

<Bài học nào của nghề này phải ghi lại, kẻo phiên sau vấp đúng chỗ?>

---

**Mỗi dòng phải kể được một lần trả giá.** Không nhớ nổi vì sao có dòng đó thì đừng viết —
luật không ai giải thích được là luật sẽ bị bỏ qua.
`;

/* ---- phụ lục nghề: tách luật CHUNG khỏi luật của một NGHỀ ------------------
   Repo này là repo tự động hoá trình duyệt, nên luật của NÓ nói về selector, về DOM, về chạy
   thử trên trang thật. Đúng với nó. Nhưng bản trích thì đi sang repo tài liệu, repo hạ tầng,
   repo điều phối — và ở đó chín dòng ấy là luật của một nghề mà repo đó không làm.

   Đo được (02/09): mục 0 · 1 · 6 có 0 dòng thuộc riêng nghề; mục 2 có 2, mục 3 có 3, mục 4
   có 2, mục 5 có 1, mục 7 có 1. Tổng CHÍN.

   BA TẦNG, không phải hai: luật chung (mọi repo) · phụ lục nghề (bật khi cần) · bản đồ địa
   phương (mục 6, vốn đã cắt). Chín dòng kia không bị VỨT — chúng là bài học trả giá thật —
   mà chuyển sang docs/ANNEX-tu-dong-hoa-trinh-duyet.md.

   THAY, KHÔNG XOÁ. Mục 2 có tiêu đề "Ba việc" và đúng ba mục; xoá hai mục thì tiêu đề nói dối.
   Mỗi dòng có một bản thay tương đương ở mức chung, và mỗi bản thay phải khớp ĐÚNG MỘT LẦN —
   không khớp thì NÉM, vì một dòng luật nghề lọt vào bản trích là hỏng im lặng. */
const NGHE = [
  ["## 2. Ba việc PHẢI hỏi Đức trước", "## 2. Những việc PHẢI hỏi Đức trước"],
  [
    "1. Thêm quyền (permission) mới cho extension\n2. Chạy pilot live mới trên trang thật\n3. Đổi luật an toàn (retry, halt, attribution, persistence, exact-once)",
    "1. Đổi luật an toàn của repo (thử lại · dừng khẩn · quy trách nhiệm · lưu trạng thái · làm-đúng-một-lần)\n2. Bất cứ việc nào **phụ lục nghề** của repo bạn liệt kê — xem `docs/ANNEX-*.md`"
  ],
  [
    "1. **Không đoán selector.** Mọi selector phải có bằng chứng DOM thật. Cần bằng chứng mới →\n   gọi `diagnostics.dom_probe` qua Bridge, đừng mượn mắt Đức.",
    "1. **Không đoán.** Mọi khẳng định về một hệ thống thật phải có bằng chứng ĐO ĐƯỢC. Cần bằng\n   chứng mới → tự đi lấy, đừng mượn mắt Đức. Lấy bằng cách nào là việc của phụ lục nghề."
  ],
  [
    "2. **Mỗi fix một test ghim.** Suite không chạm DOM thật, nên fixture bằng chứng là vàng.",
    "2. **Mỗi fix một test ghim.** Và fixture phải DỰNG NỔI ca hỏng — một phép kiểm không phân\n   biệt được hai nhánh là đồ trang trí, dù nó xanh."
  ],
  [
    "- `pilot-*/`, `Pilot-*/`, `Batch-*/`, `evidence/` — **bằng chứng vận hành**. Chỉ được THÊM mới,\n  không sửa, không xoá, không tạo lại.",
    "- Thư mục bằng chứng — khai `\"mutability\": \"append-only\"` trong `.repo-structure.json`.\n  **Chỉ được THÊM mới**, không sửa, không xoá, không tạo lại. Tên thư mục là việc của repo bạn."
  ],
  [
    "- Không bao giờ gán `.innerHTML` / `.outerHTML` / `insertAdjacentHTML`.",
    "- Những điều cấm riêng của nghề repo bạn — xem `docs/ANNEX-*.md`. Chưa có phụ lục thì bỏ dòng này."
  ],
  [
    "| **Claude** | Kiến trúc, phản biện, audit độc lập, điều phối, vận hành Bridge | Push khi cổng kiểm chưa xanh |",
    "| **Claude** | Kiến trúc, phản biện, audit độc lập, điều phối | Push khi cổng kiểm chưa xanh |"
  ],
  [
    "3. Gặp lỗi mới trên trang thật → thêm 1 dòng vào bảng lỗi của sổ tay, **và** cân nhắc thêm\n   1 phép kiểm vào `scripts/session-check.mjs`.",
    "3. Gặp lỗi mới ở một hệ thống bên ngoài → thêm 1 dòng vào bảng lỗi của sổ tay, **và** cân\n   nhắc thêm 1 phép kiểm vào `scripts/session-check.mjs`."
  ]
];

/* Phần luật mà `stripNghe` chịu trách nhiệm = toàn bộ TRỪ mục 6. Mục 6 là bản đồ file của
   riêng repo, bị cắt ở bước sau, nên từ vựng nghề trong đó không tính. */
function phanLuatChung(text) {
  const moc = (so) => String.fromCharCode(10) + "## " + so + ".";
  const dau = text.indexOf(moc(6));
  const cuoi = text.indexOf(moc(7));
  if (dau < 0 || cuoi < 0 || cuoi <= dau) return text;
  return text.slice(0, dau) + text.slice(cuoi);
}

/* Dùng để phân biệt "luật đã ở dạng chung" với "luật đã bị đổi lời". Hai ca đó trông giống hệt
   nhau từ phía bảng NGHE — cả hai đều khớp 0 lần — nhưng một cái vô hại và một cái là mất luật. */
const NGHE_TU_VUNG = /selector|dom_probe|innerHTML|outerHTML|insertAdjacentHTML|Bridge|pilot-|Pilot-|Batch-|trang thật/;

export function stripNghe(text) {
  // Chuẩn hoá xuống dòng TRƯỚC khi so. AGENTS.md trên máy Windows là CRLF, còn các đoạn thay ở
  // bảng NGHE viết bằng LF — không chuẩn hoá thì mọi đoạn nhiều dòng đều khớp 0 lần và bộ trích
  // chết ở đúng chỗ nó đang cố bảo vệ. (Bắt được ngay lần chạy đầu, nhờ fail-closed.)
  let out = text.split(String.fromCharCode(13)).join("");

  // BA CA, và ca giữa là ca mà bộ khung phải sống được: khi bộ trích chạy ở REPO NHÀ của chính
  // nó, luật nguồn VỐN ĐÃ ở dạng chung, nên không phép thay nào khớp. Bản đầu ném ngay ở phép
  // thay đầu tiên — tức bộ khung không tự trích lại được chính nó, và nhà riêng là bất khả thi.
  //
  // Nhưng "khớp 0 lần" cũng là hình dạng của một ca NGUY HIỂM: luật bị đổi lời, phép thay trượt
  // hết, và một dòng luật nghề lọt sang mọi repo khác. Hai ca trông giống hệt nhau từ phía bảng
  // NGHE. Phân biệt bằng bằng chứng chứ không bằng đoán: khớp 0 lần MÀ luật vẫn còn từ vựng
  // nghề thì đó là ca thứ hai, và phải ném.
  const soKhop = NGHE.filter(([from]) => out.split(from).length === 2).length;
  if (soKhop === 0) {
    // Soi ĐÚNG PHẠM VI mình chịu trách nhiệm. Mục 6 là bản đồ địa phương và sẽ bị cắt ở bước
    // sau, nên từ vựng nghề trong đó KHÔNG phải việc của hàm này. Bản đầu soi cả file và báo
    // động nhầm 4 dòng — tất cả đều nằm gọn trong mục 6. Phép kiểm bắt được ngay lần chạy đầu.
    const chung = phanLuatChung(out);
    if (NGHE_TU_VUNG.test(chung)) {
      throw new Error(
        "TRICH_HONG: không phép thay luật-nghề nào khớp, NHƯNG luật vẫn còn từ vựng nghề " +
        `(${chung.split(String.fromCharCode(10)).filter((d) => NGHE_TU_VUNG.test(d)).length} dòng). ` +
        "Nghĩa là AGENTS.md đã đổi lời và bảng NGHE trượt hết — sửa bảng cho khớp. " +
        "Bỏ qua là để luật của một nghề lọt vào bộ khung của mọi repo khác."
      );
    }
    return out;   // luật đã ở dạng chung — không có gì để tách
  }
  if (soKhop !== NGHE.length) {
    throw new Error(
      `TRICH_HONG: bảng luật-nghề khớp ${soKhop}/${NGHE.length} phép thay — được ăn cả, ngã về không. ` +
      "Khớp một phần nghĩa là AGENTS.md đổi lời ở vài chỗ; tách nửa vời còn tệ hơn không tách."
    );
  }

  for (const [from, to] of NGHE) {
    const parts = out.split(from);
    if (parts.length !== 2) {
      throw new Error(
        `TRICH_HONG: bản thay luật-nghề khớp ${parts.length - 1} lần, cần đúng 1. Đoạn tìm:\n` +
        `  ${from.split("\n")[0]}\n` +
        "AGENTS.md đã đổi lời. Sửa bảng NGHE trong build-template.mjs cho khớp — ĐỪNG bỏ qua: " +
        "bỏ qua là để một dòng luật của nghề này lọt vào bộ khung của mọi repo khác."
      );
    }
    out = parts.join(to);
  }
  return out;
}

/* ---- luật: cắt bản đồ địa phương ra --------------------------------------
   `AGENTS.md` mục 6 ("Sổ tay mở khi cần") là bản đồ file của RIÊNG repo này — đo được 13 trên
   47 dòng mang tên dự án, cao gấp nhiều lần phần còn lại (1 trên 117). Nó đáng lẽ không đi
   theo template; nó là thứ mỗi repo tự viết. Cắt bằng mốc tiêu đề chứ không bằng số dòng, để
   mục 6 dài ra cũng không làm hỏng bộ trích. */
/* Mốc cắt phải là TIÊU ĐỀ THẬT và DUY NHẤT — phiên K1 chỉ ra 02/09, mục (d) của brief.
   Bản cũ dùng `text.indexOf("\n## 6.")`, tức lấy lần khớp ĐẦU TIÊN và không kiểm gì thêm. Một
   dòng văn hay một khối trích dẫn nhắc `## 6.` nằm TRƯỚC tiêu đề thật là cắt sai — và cắt sai
   âm thầm: bộ trích vẫn sinh ra `AGENTS.md`, chỉ là mất một phần mục 5. Kiểu hỏng tệ nhất.

   Hai lớp: chỉ nhận dòng BẮT ĐẦU bằng mốc (nên `> ... ## 6. ...` trong trích dẫn không tính),
   và đòi ĐÚNG MỘT dòng như vậy. Nhiều hơn một thì FAIL CLOSED kèm số dòng, để người sửa biết
   đi đâu — chứ không âm thầm chọn cái đầu. */
export function soleHeadingIndex(text, marker) {
  const lines = text.split("\n");
  const hits = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith(marker)) hits.push({ index: offset, line: i + 1 });
    offset += lines[i].length + 1;
  }
  if (hits.length === 0) return { index: -1, hits };
  if (hits.length > 1) {
    throw new Error(
      `TRICH_HONG: AGENTS.md có ${hits.length} dòng bắt đầu bằng \`${marker}\` (dòng ${hits.map((h) => h.line).join(", ")}). ` +
      "Bộ trích cắt theo tiêu đề mục, nên mốc phải DUY NHẤT. Sửa AGENTS.md, đừng để bộ trích tự chọn cái đầu rồi cắt sai âm thầm."
    );
  }
  return { index: hits[0].index, hits };
}

function lawForTemplate() {
  // Thứ tự có lý do: tách luật-nghề TRƯỚC, cắt mục 6 SAU. Cắt trước thì các mốc chỉ số dời đi
  // và mọi phép thay phải tính lại — thừa một cơ hội sai mà không đổi lại được gì.
  const text = stripNghe(read("AGENTS.md"));
  const start = soleHeadingIndex(text, "## 6.").index;
  const end = soleHeadingIndex(text, "## 7.").index;
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(
      "TRICH_HONG: không tìm thấy mốc `## 6.` và `## 7.` trong AGENTS.md. Bộ trích cắt theo tiêu đề mục; " +
      "nếu đã đánh số lại các mục thì phải sửa `lawForTemplate()` cho khớp, đừng để nó cắt bừa."
    );
  }
  // KHÔNG mở đầu bằng xuống dòng. `soleHeadingIndex` trả chỉ số ĐẦU DÒNG tiêu đề, nên
  // `slice(0, start)` đã kết thúc bằng ký tự xuống dòng rồi; thêm một cái nữa là mỗi lần
  // trích cộng thêm một dòng trống.
  // một dòng trống. Trích một lần thì không ai thấy; trích lại từ bản trích — đúng việc phải
  // làm khi bộ khung có nhà riêng — thì lệch dần, và hai bản không còn bằng byte.
  const replacement = `## 6. Sổ tay mở khi cần — Tầng 2

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
| Biết repo đang nợ gì về cấu trúc | chạy \`npm run bootstrap\` |
| Hiểu bộ khung tự kiểm mình bằng gì, hoặc thêm test của repo bạn | [tests/harness-smoke.mjs](tests/harness-smoke.mjs) — bốn khối hạt giống, chạy bằng \`npm test\` |
| Biết luật riêng của NGHỀ repo bạn (không phải luật chung) | phụ lục nghề: [docs/ANNEX-tu-dong-hoa-trinh-duyet.md](docs/ANNEX-tu-dong-hoa-trinh-duyet.md) là bản mẫu có thật · viết cái của bạn theo [docs/_TEMPLATE-annex.md](docs/_TEMPLATE-annex.md) |

**Vì sao phải là liên kết chứ không phải chữ thường:** phép kiểm độ sâu điều hướng (B6) đi theo
liên kết từ cổng vào máy đọc. File không ai trỏ tới thì máy coi là không tới được — và một bản
mẫu không ai tới được thì đúng là sẽ không ai dùng. Đo thật lúc dựng bộ khung này: để bảng rỗng
thì **4 file** rơi ra ngoài bản đồ, kể cả chính \`README.md\`.

**Luật vàng số 4 áp ở đây:** thêm file hoặc thư mục mới thì phải khai một dòng vào bảng này.
Không khai = không tồn tại. Cổng đóng phiên có phép kiểm này.
`;
  return text.slice(0, start) + replacement + text.slice(end);
}

/* ---- các file sinh mới ---------------------------------------------------- */

const CLAUDE_STUB = `# CLAUDE.md

Luật của repo này nằm trong \`AGENTS.md\` ở cùng thư mục — **một bản luật, nhiều cửa vào**.
Đừng chép luật sang đây; sửa luật thì sửa \`AGENTS.md\`.

@AGENTS.md
`;

const STRUCTURE_SEED = `{
  "_doc": "Hình dạng repo NÀY. Bộ sinh và cổng kiểm đọc file này thay vì đoán. Sửa cho khớp repo của bạn TRƯỚC KHI chạy cổng lần đầu.",
  "schema_version": 1,
  "repo": {
    "_doc": "Danh tính repo, dùng cho trang cổng vào máy đọc. ĐỔI NGAY khi khởi tạo — bỏ trống thì trang sinh ra sẽ nói thẳng là repo chưa đặt tên.",
    "name": "ĐỔI THÀNH TÊN REPO CỦA BẠN",
    "tagline": null
  },
  "profile": "P1",
  "_profile_doc": "P1 monorepo nhiều gói · P2 ứng dụng đơn · P3 repo tài liệu · P4 repo hạ tầng · P5 điều phối repo khác",
  "units": {
    "_doc": "Đơn vị công việc nằm ở đâu. depth = số tầng dưới root_dir cho tới đơn vị. root_dir null = repo không có đơn vị con, chỉ có đơn vị GỐC.",
    "root_dir": null,
    "marker": "package.json",
    "depth": 1,
    "ten": "Đơn vị",
    "_ten_doc": "Gọi một đơn vị công việc là gì — dùng cho tiêu đề bảng và tên cột. Đổi cho hợp repo bạn: Extension · Gói · Dịch vụ · Tài liệu."
  },
  "areas": {
    "_doc_": "Mỗi thư mục top-level phải có một dòng ở đây, nếu không cổng kiểm đếm nó là chưa khai chủ. ownership_mode: root = một chủ duy nhất; per-package = chia chủ theo từng gói con, kèm claim_prefix.",
    "_areas_doc2": "HAI CHỦ, CỐ Ý — đừng gộp về một. Một repo một-chủ làm cả lớp phân vùng thành hình nền: mọi đường dẫn quy về cùng một khoá, nên bất biến steward↔khoá quyền, phép kiểm nhãn lane, và hàm quy chủ đều ĐẠT TẦM THƯỜNG — đúng ở cả hai chiều, không ghim được gì. Đo thật ở bản trích đầu: cả bốn đường dẫn thử đều trả _root, và một đột biến phá sạch hàm quy chủ vẫn thoát. Tách docs/ ra là ca thật rẻ nhất để lớp đó có việc mà làm.",
    "docs/": { "steward": "_docs", "mutability": "rw", "ownership_mode": "root", "note": "tài liệu bốn tầng: studies, briefs, archive, adr" },
    "scripts/": { "steward": "_root", "mutability": "rw", "ownership_mode": "root", "note": "bộ sinh + cổng kiểm + đẩy an toàn" },
    "tests/": { "steward": "_root", "mutability": "rw", "ownership_mode": "root", "note": "suite gốc repo" },
    "evidence/": { "steward": "_root", "mutability": "append-only", "ownership_mode": "root", "note": "bằng chứng vận hành: chỉ thêm, không sửa, không xoá" }
  },
  "generators": ["build-dashboard.mjs"],
  "_generators_doc": "Script nào sinh ra artifact đã commit. Cổng đóng phiên đối chiếu từng cái với HEAD. CHỈ khai script repo này THẬT SỰ có — khai thừa là cổng đỏ vì thiếu file.",
  "generated": ["DASHBOARD.md", "llms.txt", "repo-map.json"],
  "_generated_doc": "FILE do các script trên sinh ra. Khai vào đây thì chúng KHÔNG đòi ai nhận quyền — nội dung tất định từ HEAD nên không ai sở hữu chúng theo nghĩa nào. Đo thật ở repo gốc: 19% lượt nhận khoá gốc tồn tại CHỈ để chạy bộ sinh; đó là tranh chấp nhân tạo.",
  "_generated_doc2": "KHÔNG làm yếu lớp bảo vệ: nội dung vẫn bị phép kiểm 'Sự thật máy sinh còn tươi' đối chiếu với HEAD ở MỌI phiên, nên sửa tay một dòng vẫn ĐỎ. Và đừng lẫn với 'generators' (khác một chữ): cái kia là SCRIPT, cái này là FILE. Khai từng file, không khai thư mục.",
  "grandfathered": [],
  "_grandfathered_doc": "Đường dẫn cũ được miễn trừ vĩnh viễn. Repo mới để RỖNG. Repo cũ đang migrate thì liệt kê ở đây thay vì đổi tên hàng loạt.",
  "bootstrap": {
    "_doc": "Phép kiểm nào ĐÓNG CỔNG khi đỏ. Repo mới nên bắt đầu với danh sách RỖNG, chạy vài phiên cho sạch, rồi mới bật dần. Bật chặn khi đang đỏ là tự khoá repo.",
    "blocking": []
  }
}
`;

const CLAIMS_SEED = `{
  "_doc": "Bảng chủ sở hữu. MỘT vùng chỉ MỘT phiên AI được ghi tại một thời điểm. Chủ không phải bạn = chỉ đọc. Muốn giành = hỏi chủ dự án. Xong việc thì đặt owner về null.",
  "_labels": "owner là nhãn phiên tự đặt, ví dụ 'claude-dashboard' — hai phiên khác nhau phải có hai nhãn khác nhau.",
  "claims": {
    "_root": { "owner": null, "ai": null, "claimed_at": null, "task": null, "released_at": null },
    "_docs": { "owner": null, "ai": null, "claimed_at": null, "task": null, "released_at": null }
  }
}
`;

const HANDOFF_SEED = `# HANDOFF — bàn giao giữa các phiên

> **Chỉ THÊM dòng, không sửa dòng cũ.** Phiên sau đọc **phần CUỐI** file này trước tiên.
> Mỗi phiên ghi đúng ba thứ: làm gì · kết quả bằng số · còn gì mở.

## Trạng thái hiện tại

Repo vừa được khởi tạo từ template. Chưa có phiên nào chạy.

**Việc đầu tiên:** mở \`.repo-structure.json\`, sửa khối \`units\` và \`areas\` cho khớp repo này,
rồi chạy cổng kiểm cấu trúc lần đầu để biết đang nợ những gì.

## Log
`;

function readme(version) {
  return `# Bộ khung repo — bản ${version}

Bộ khung để một **phiên AI lạ** vào bất kỳ repo nào cũng hiểu ngay chuyện gì đang xảy ra, không
phải quét cả cây thư mục và không phải hỏi chủ repo câu nào.

> **Trạng thái: CHƯA CHỨNG MINH NGOÀI REPO GỐC.** Bộ khung này đã chạy thật trên đúng một repo
> — nơi nó được rút ra. Nó **chưa từng được migrate sang một repo khác loại**. Đừng dùng cho
> việc quan trọng cho tới khi mốc đó đạt.

## Nguyên tắc gốc

**Mỗi câu AI phải hỏi con người = một trường dữ liệu còn thiếu trong repo.**
Không sửa bằng cách dặn AI đọc kỹ hơn. Sửa bằng cách bổ sung trường dữ liệu, và bắt cổng kiểm
chặn khi trường đó trống.

## Bốn tầng — phân theo VÒNG ĐỜI, không theo chủ đề

| Tầng | Gồm gì | Ai ghi | Đổi khi nào |
|---|---|---|---|
| **LAW** | luật, vai, kiến trúc, hướng dẫn | người | vài tháng |
| **STATE** | trạng thái, việc mở, bàn giao | người | mỗi phiên |
| **GENERATED** | số đo, bản đồ, bảng tổng | **máy** | mỗi lần sinh |
| **EVIDENCE** | bằng chứng, log, quyết định đã chốt | bất biến | **chỉ thêm** |

Luật con: không trộn hai tầng vào một file; không để hai file cùng tầng nói cùng một điều.
Nguyên tắc số một: **thứ gì máy đếm được thì máy đếm** — con số, trạng thái, ngày tháng không gõ tay.

## Trong gói này có gì


> **Hai thứ CỐ Ý không có trong bộ khung này:** công cụ *đo một repo cách chuẩn bao xa* và công cụ
> *dựng repo mới*. Chúng sống ở **repo nhà của bộ khung**, vì cả hai đều cần biết "chuẩn" là gì —
> và chuẩn phải có **một** nguồn. Phát bản sao của chuẩn đi khắp nơi là tạo ra N nguồn, rồi lúc
> chúng lệch nhau thì không ai biết tin bản nào. Repo bạn cần *sống theo chuẩn*, không cần
> *phát hành chuẩn*.
| Đường dẫn | Tầng | Việc của nó |
|---|---|---|
| \`AGENTS.md\` | LAW | Hiến pháp một trang. **Mục 6 để trống — bạn tự điền bản đồ file của repo mình** |
| \`CLAUDE.md\` | LAW | Stub trỏ về \`AGENTS.md\`, để công cụ nào cũng tìm được luật |
| \`.repo-structure.json\` | LAW | Hình dạng repo: đơn vị nằm đâu, thư mục nào có chủ nào, phép kiểm nào chặn |
| \`scripts/repo-structure.mjs\` | máy | Nguồn sự thật duy nhất về hình dạng repo — bốn script kia đều đọc nó |
| \`scripts/build-dashboard.mjs\` | máy | Sinh bảng điều hành + cổng vào máy đọc, **hoàn toàn từ HEAD** |
| \`scripts/check-bootstrap.mjs\` | máy | Cổng kiểm cấu trúc B1–B14 |
| \`scripts/session-check.mjs\` | máy | Cổng đóng phiên — đỏ thì chưa xong |
| \`scripts/safe-push.mjs\` | máy | Đẩy mà không cuốn theo commit của phiên khác |
| \`tests/harness-smoke.mjs\` | máy | **Lưới đỡ của chính bộ khung** — bốn chỗ đã hỏng thật ở repo sinh ra nó. Thêm test của bạn vào cùng thư mục, đừng xoá bốn khối này |
| [\`docs/ANNEX-tu-dong-hoa-trinh-duyet.md\`](docs/ANNEX-tu-dong-hoa-trinh-duyet.md) | LAW | **Phụ lục nghề — TUỲ CHỌN.** Chín luật của nghề tự động hoá trình duyệt, tách khỏi luật chung. Repo bạn không làm nghề đó thì **xoá file này đi** |
| [\`docs/_TEMPLATE-annex.md\`](docs/_TEMPLATE-annex.md) | LAW | Bản mẫu để viết phụ lục nghề của repo bạn |
| [\`docs/_TEMPLATE-adr.md\`](docs/_TEMPLATE-adr.md) · [\`-study\`](docs/_TEMPLATE-study.md) · [\`-brief\`](docs/_TEMPLATE-brief.md) | LAW | Bản mẫu: quyết định · nghiên cứu · đề bài phiên |
| [\`docs/adr/0000-…\`](docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md) | EVIDENCE | Luật ghi quyết định. Đọc trước khi ghi cái đầu tiên |
| [\`STATUS.template.md\`](STATUS.template.md) | LAW | Khuôn khai trạng thái cho mỗi đơn vị công việc |
| \`STATUS.md\` | STATE | Trạng thái của gốc repo — **đã khai sẵn một bản hợp lệ** để cổng kiểm xanh ngay từ commit đầu |
| \`.agents/claims.json\` | STATE | Bảng chủ sở hữu, chống hai phiên AI giẫm chân |

Bảng trên dùng **liên kết** chứ không phải chữ thường, và đó không phải trang trí: phép kiểm
độ sâu điều hướng đi theo liên kết từ cổng vào máy đọc. File không ai trỏ tới thì máy coi là
không tới được — và một bản mẫu không ai tới được thì đúng là sẽ không ai dùng.

**Cố ý KHÔNG có trong gói:** bảng điều hành, cổng vào máy đọc, bản đồ máy đọc — ba thứ đó là
tầng GENERATED, **mỗi repo tự sinh**. Bộ sinh thì đi theo, sản phẩm của nó thì không. Chép
sản phẩm sang repo khác là làm mọi repo cùng hiển thị trạng thái của repo gốc.

Cũng không có: bằng chứng, trạng thái thật, nhật ký bàn giao thật. Chúng thuộc về từng repo.

## Dùng thế nào

1. Chép nội dung gói này vào gốc repo của bạn.
2. **Sửa \`.repo-structure.json\` trước tiên** — khối \`units\` (đơn vị của bạn nằm đâu) và
   \`areas\` (mỗi thư mục top-level một dòng). Đây là bước duy nhất bắt buộc làm bằng tay.
3. Chạy \`npm run dashboard\` — sinh bảng điều hành và cổng vào máy đọc.
   **Phải làm bước này TRƯỚC khi đo**: phép kiểm độ sâu điều hướng đi từ cổng vào máy đọc, mà
   file đó là tầng GENERATED — chưa sinh thì nó báo vàng, và đó là đúng chứ không phải lỗi.
4. Chạy \`npm run bootstrap\` — nó liệt kê repo đang nợ gì, mỗi dòng nói cả **chỗ sai** lẫn
   **cách sửa**.
5. Trả nợ dần. \`bootstrap.blocking\` để **rỗng** lúc đầu; chỉ bật chặn một phép kiểm **sau khi**
   nó đã xanh. Bật chặn khi đang đỏ là tự khoá repo.
6. Điền mục 6 của \`AGENTS.md\` — bản đồ file của repo bạn.

## Phép thử nghiệm thu

Mở một chat AI **hoàn toàn mới**, dán đúng một dòng:

> *Đọc \`llms.txt\` ở gốc repo &lt;chủ&gt;/&lt;repo&gt; rồi cho tôi biết ba điều: repo có những đơn vị
> nào và cái nào đang sống, việc ưu tiên số 1 hiện tại là gì và thuộc đơn vị nào, tôi nên đọc
> file nào tiếp theo.*

**ĐẠT** khi nó nói được cả ba, **không hỏi lại câu nào**.
**KHÔNG ĐẠT** thì ghi lại **chính xác câu nó đã hỏi** — mỗi câu hỏi là một trường dữ liệu còn
thiếu. Bổ sung trường đó rồi thử lại. **Không sửa bằng cách dặn AI đọc kỹ hơn.**
`;
}

function packageJson(version) {
  return JSON.stringify({
    name: "repo-harness",
    version,
    private: true,
    type: "module",
    description: "Bộ khung repo: cổng vào máy đọc, cổng kiểm cấu trúc, cổng đóng phiên, đẩy an toàn.",
    scripts: {
      dashboard: "node scripts/build-dashboard.mjs",
      bootstrap: "node scripts/check-bootstrap.mjs",
      gate: "node scripts/session-check.mjs",
      push: "node scripts/safe-push.mjs",
      // KHÔNG ĐƯỢC BỎ. `session-check.mjs` hỏi `package.json.scripts.test`; không khai thì
      // `hasRootTestScript()` false VĨNH VIỄN và cổng đóng phiên không chạy một dòng test nào
      // của repo bạn. Thêm suite của bạn vào chuỗi này, đừng thay thế suite hạt giống.
      test: "node tests/harness-smoke.mjs"
    }
  }, null, 2) + "\n";
}

/* ---- dựng danh sách file --------------------------------------------------- */

export const TEMPLATE_VERSION = "0.1.0-unproven";

export function buildTemplateFiles() {
  const files = new Map();
  for (const name of PORTABLE_SCRIPTS) files.set(`scripts/${name}`, read(`scripts/${name}`));
  for (const [from, to] of VERBATIM) files.set(to, genericize(to, read(from)));
  files.set("docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md", ADR_SEED);
  files.set("AGENTS.md", lawForTemplate());
  files.set("CLAUDE.md", CLAUDE_STUB);
  files.set(".repo-structure.json", STRUCTURE_SEED);
  files.set(".agents/claims.json", CLAIMS_SEED);
  files.set("HANDOFF.md", HANDOFF_SEED);
  files.set("STATUS.md", STATUS_SEED);
  files.set("README.md", readme(TEMPLATE_VERSION));
  // Chín dòng luật-nghề mà `stripNghe()` tách khỏi luật chung phải HẠ CÁNH ở đâu đó. Không có
  // hai file này thì tách = vứt, và bộ khung im lặng đánh mất chín bài học đã trả giá.
  files.set("docs/ANNEX-tu-dong-hoa-trinh-duyet.md", ANNEX_SEED);
  files.set("docs/_TEMPLATE-annex.md", ANNEX_TEMPLATE);
  files.set("package.json", packageJson(TEMPLATE_VERSION));
  return files;
}

/* Không có file nào trong template được mang tên dự án gốc. Đây là phép tự kiểm RẺ NHẤT của
   bộ trích, và nó chạy mỗi lần sinh — không đợi ai nhớ chạy. */
const FORBIDDEN = [/duc-auto/i, /gg-flow/i, /Chrome_Extension_AI_Agentic/i, /extension-observer/i];

export function leakedNames(files) {
  const hits = [];
  for (const [rel, text] of files) {
    for (const pattern of FORBIDDEN) {
      const match = text.match(pattern);
      if (match) hits.push({ file: rel, found: match[0] });
    }
  }
  return hits;
}

/* ---- chạy ------------------------------------------------------------------ */

// So sánh bỏ qua ký tự xuống dòng kiểu Windows: git có thể checkout CRLF trong khi bộ sinh
// luôn viết LF. Dùng mã ký tự thay vì dấu thoát trong chuỗi — chính dòng này đã bị một tầng
// thoát nuốt mất và biến thành ngắt dòng thật khi viết bằng script.
const CARRIAGE_RETURN = String.fromCharCode(13);
const eol = (text) => text.split(CARRIAGE_RETURN).join("");

function main() {
  const checkOnly = process.argv.includes("--check");
  const files = buildTemplateFiles();

  const leaks = leakedNames(files);
  if (leaks.length) {
    console.error("TRICH_HONG: tên riêng của repo gốc lọt vào template —");
    for (const leak of leaks) console.error(`  ${leak.file}: "${leak.found}"`);
    console.error("Template mang tên dự án gốc thì không phải template. Sửa nguồn, đừng sửa phép kiểm.");
    process.exit(1);
  }

  if (checkOnly) {
    const drift = [];
    for (const [rel, want] of files) {
      const abs = path.join(ROOT, OUT, rel);
      if (!fs.existsSync(abs)) { drift.push(`${rel}: THIẾU trong ${OUT}/`); continue; }
      // So sau khi chuẩn hoá xuống dòng. Git trên Windows có thể checkout thành CRLF trong khi
      // bộ sinh luôn viết LF; so chuỗi thô thì một bản sao chép SẠCH cũng báo mọi file "lệch"
      // và `npm test` đỏ mà không ai làm gì sai. Audit độc lập bắt được 2026-09-02.
      if (eol(fs.readFileSync(abs, "utf8")) !== eol(want)) drift.push(`${rel}: LỆCH bản gốc`);
    }
    const expected = new Set([...files.keys()]);
    for (const rel of walk(path.join(ROOT, OUT))) {
      if (!expected.has(rel)) drift.push(`${rel}: THỪA — không có trong bản trích`);
    }
    if (drift.length) {
      console.error(`${OUT}/ đã lệch khỏi bản gốc (${drift.length} chỗ):`);
      for (const line of drift) console.error(`  ${line}`);
      console.error(`Sinh lại: node scripts/build-template.mjs`);
      process.exit(1);
    }
    console.log(`${OUT}/ khớp bản gốc — ${files.size} file.`);
    return;
  }

  fs.rmSync(path.join(ROOT, OUT), { recursive: true, force: true });
  for (const [rel, text] of files) {
    const abs = path.join(ROOT, OUT, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text, "utf8");
  }
  console.log(`Đã sinh ${OUT}/ — ${files.size} file, bản ${TEMPLATE_VERSION}.`);
}

function walk(dir, prefix = "") {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("build-template.mjs")) main();
