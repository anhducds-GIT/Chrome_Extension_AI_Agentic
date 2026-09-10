/* PHÉP GHIM CỦA BỘ VẼ LƯU ĐỒ.
 *
 * Lỗi được vá ở đây sống từ v0.3.0 tới 08/09 mà không ai đỏ, và lý do đáng đọc: `md-mini.mjs` in
 * ra `<pre class="mermaid">` kèm chú thích *"để trang tự vẽ"*, mà trang **không có gì để vẽ**.
 * Không phép kiểm nào hỏi *"cái này có ra HÌNH không"* — chúng chỉ hỏi trang có sinh ra được
 * không. Trang sinh ra được, nên bảng luôn xanh trong khi bảy lưu đồ là chữ.
 *
 * Nên vế 1 dưới đây là vế quan trọng nhất, và nó cố ý hỏi một câu THÔ: đếm số khối mermaid trong
 * tài liệu, rồi đòi ĐÚNG bằng đó SVG. Không hỏi SVG đẹp không — hỏi nó CÓ không.
 *
 * NĂM ĐỘT BIẾN ĐÃ CHẠY THẬT — ghi lại để lần sau ai nới thì biết từng vế đang canh gì. Xem cuối
 * file để biết cái nào chết ở vế nào.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { docLuuDo, veLuuDo } from "../scripts/luu-do.mjs";
import { md } from "../scripts/md-mini.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NL = String.fromCharCode(10);
let passed = 0;
let boQua = 0;
const ok = (t) => { passed += 1; console.log(`  ok  ${t}`); };
const boQuaVi = (t, vi) => { boQua += 1; console.log(`  --  ${t} — BỎ QUA: ${vi}`); };

const RAO = "`".repeat(3);

/* ---- 1. MỌI khối mermaid trong tài liệu repo này phải RA HÌNH ------------- */
{
  /* Đây là vế bắt được lỗi gốc. Nó đếm nguồn, không gõ một con số — repo thêm hay bớt lưu đồ
     thì vế vẫn đúng. Một con số gõ cứng ở đây sẽ chỉ đo "hôm nay có 7 cái", không đo "cái nào
     cũng vẽ được". */
  const goc = [];
  const quet = (thuMuc) => {
    for (const e of readdirSync(thuMuc, { withFileTypes: true })) {
      const p = join(thuMuc, e.name);
      if (e.isDirectory()) { quet(p); continue; }
      if (!e.name.endsWith(".md")) continue;
      const t = readFileSync(p, "utf8").split(NL);
      for (let i = 0; i < t.length; i += 1) {
        if (!t[i].trim().startsWith(RAO + "mermaid")) continue;
        const j = t.findIndex((l, k) => k > i && l.trim().startsWith(RAO));
        goc.push({ file: p.slice(ROOT.length + 1), nguon: t.slice(i + 1, j).join(NL) });
        i = j;
      }
    }
  };
  try { quet(join(ROOT, "docs")); } catch { /* repo chưa có docs/ */ }

  if (goc.length === 0) {
    boQuaVi("lưu đồ trong docs/ đều vẽ được", "repo này chưa có khối mermaid nào trong docs/");
  } else {
    const hong = goc.filter((g) => veLuuDo(g.nguon) === null).map((g) => g.file);
    assert.deepEqual(hong, [],
      `mọi khối mermaid trong docs/ phải vẽ ra SVG. Đang không vẽ được: ${hong.join(" · ")}`);
    ok(`${goc.length}/${goc.length} khối mermaid trong docs/ vẽ ra SVG`);
  }
}

/* ---- 2. `md()` trả SVG, KHÔNG trả mã nguồn ------------------------------- */
{
  // Chính chỗ lỗi cũ nằm. Vế này giữ cửa: đổi `md()` về in chữ là đỏ ngay.
  const ra = md([RAO + "mermaid", "flowchart TD", '  A["một"] --> B["hai"]', RAO].join(NL));
  assert.match(ra, /<svg class="luu-do"/, "khối mermaid đọc được phải thành SVG");
  assert.ok(!ra.includes('<pre class="mermaid"'), "không được in lại mã nguồn khi đã vẽ được");
  assert.ok(!ra.includes("luu-do-hong"), "vẽ được thì không kèm dòng báo hỏng");
  ok("md(): mermaid đọc được → SVG, không còn <pre class=\"mermaid\">");
}

/* ---- 3. Không đọc được thì LÙI CÓ TIẾNG, không ném ----------------------- */
{
  /* Bộ vẽ đi theo bản trích nên nó chạy trên tài liệu của repo khác. Ném ở đó là cả trang không
     sinh ra được vì MỘT cái sơ đồ. Nhưng lùi IM LẶNG lại đúng bằng con đường đã đẻ ra lỗi này. */
  assert.equal(veLuuDo("sequenceDiagram" + NL + "  A->>B: hi"), null, "kiểu lạ phải trả null");
  assert.equal(veLuuDo("flowchart TD" + NL + "  A ==> B"), null, "mũi tên ngoài tập con phải trả null");
  assert.equal(veLuuDo(""), null, "rỗng phải trả null");
  const ra = md([RAO + "mermaid", "sequenceDiagram", "  A->>B: hi", RAO].join(NL));
  assert.match(ra, /<pre class="mermaid"/, "vẽ không được thì in lại mã nguồn");
  assert.match(ra, /luu-do-hong/, "và PHẢI kèm một dòng nói rõ là chưa vẽ được");
  ok("không đọc được: trả null · md() lùi về mã nguồn KÈM dòng báo, không im lặng");
}

/* ---- 4. Vòng lặp không làm treo bộ xếp tầng ------------------------------ */
{
  /* `docs/BAO-TRI-DINH-KY.md` có `C -.-> A` quay về đầu. Bộ xếp tầng nào không phòng vòng lặp
     thì đệ quy vô hạn — và một phép kiểm treo trông khác hẳn một phép kiểm đỏ: nó làm cả cổng
     đứng im chứ không báo gì. */
  const svg = veLuuDo(["flowchart TD", '  A["một"] --> B["hai"] --> C["ba"]', "  C -.-> A"].join(NL));
  assert.ok(svg, "lưu đồ có vòng lặp vẫn phải vẽ được");
  assert.match(svg, /ld-dut/, "cạnh quay lại phải vẽ nét đứt");

  /* VÀ THỨ TỰ TẦNG PHẢI ĐÚNG. Vế "vẽ được" một mình quá dễ đạt: bỏ hẳn lớp nhận diện cạnh quay
     lại thì bộ xếp KHÔNG treo — nó chỉ coi `C -.-> A` là cạnh xuôi và đẩy A xuống DƯỚI C, tức
     lưu đồ vẽ ngược. Hỏng im lặng, và chỉ mắt người mới thấy. Nên ghim bằng toạ độ: A ở trên. */
  const y = [...svg.matchAll(/<rect[^>]*y="(\d+)"[^>]*\/>/g)].map((m) => Number(m[1]));
  const chu = [...svg.matchAll(/<text x="\d+" y="(\d+)" class="ld-chu">([^<]*)</g)].map((m) => ({ y: Number(m[1]), c: m[2] }));
  const yCua = (ten) => chu.find((c) => c.c === ten).y;
  assert.ok(yCua("một") < yCua("ba"), `A phải nằm TRÊN C dù có cạnh C quay về A (một@${yCua("một")} ba@${yCua("ba")})`);
  assert.ok(yCua("một") < yCua("hai"), "và trên B");
  assert.equal(y.length, 3, "ba hộp");
  ok("vòng lặp: vẽ được · nét đứt · A vẫn ở tầng trên cùng, không bị cạnh quay lại đẩy xuống");
}

/* ---- 5. Thực thể HTML giải ĐÚNG MỘT LẦN --------------------------------- */
{
  /* Nguồn markdown đã escape sẵn (`&lt;repo&gt;`). Escape chồng escape thì trên màn hình hiện ra
     `&lt;repo&gt;` nguyên xi — đúng thứ Đức nhìn thấy ở bản cũ. Giải hai lần cũng sai: `&amp;lt;`
     phải ra `&lt;`, không ra `<`. */
  const svg = veLuuDo(["flowchart TD", '  A["assess &lt;repo&gt;"] --> B["x"]'].join(NL));
  assert.match(svg, /&lt;repo&gt;/, "dấu ngoặc nhọn phải escape đúng một lần cho SVG");
  assert.ok(!svg.includes("&amp;lt;"), "không được escape chồng lên escape");
  const hai = veLuuDo(["flowchart TD", '  A["a &amp;lt; b"] --> B["x"]'].join(NL));
  assert.match(hai, /a &amp;lt; b/, "`&amp;lt;` là chữ `&lt;`, không phải dấu nhỏ hơn");
  ok("thực thể HTML: giải đúng một lần, không chồng, không thiếu");
}

/* ---- 6. Chữ KHÔNG được rộng hơn hộp chứa nó ----------------------------- */
{
  /* Đo thật trong trình duyệt 08/09: nhãn 40 ký tự nằm trong hộp 250px mà chữ rộng 265px, vì bề
     rộng bị kẹp một chiều còn chữ thì không. Ở đây không có trình duyệt nên vế này đo bằng chính
     ước lượng của bộ vẽ — nó bắt được ca "kẹp rồi quên ngắt dòng", là ca đã xảy ra. */
  const dai = "Đọc AGENTS.md rồi mục 6 rồi HANDOFF cuối file, và thêm chữ cho thật dài";
  const svg = veLuuDo(["flowchart TD", `  A["${dai}"] --> B["x"]`].join(NL));
  const hopRong = [...svg.matchAll(/<rect[^>]*width="(\d+)"/g)].map((m) => Number(m[1]));
  const chuDai = [...svg.matchAll(/class="ld-chu">([^<]*)</g)].map((m) => m[1].length);
  const rongNhat = Math.max(...hopRong);
  assert.ok(Math.max(...chuDai) * 6.9 <= rongNhat,
    `dòng chữ dài nhất (${Math.max(...chuDai)} ký tự) phải nằm lọt hộp rộng nhất (${rongNhat}px)`);
  assert.ok(chuDai.length >= 3, "nhãn dài phải được NGẮT ra nhiều dòng, không nhét một dòng");
  ok(`nhãn dài tự ngắt: ${chuDai.length} dòng, dòng dài nhất lọt hộp ${rongNhat}px`);
}

/* ---- 7. Nhãn cạnh không đè lên nhau ------------------------------------- */
{
  /* Bản đầu đặt cả bốn nhãn của một nút quyết định vào CÙNG MỘT toạ độ — bốn chữ chồng khít
     thành một vệt. Ca dựng lại đúng hình dạng đó: một nút, bốn nhánh, bốn nhãn dài. */
  const svg = veLuuDo(["flowchart TD",
    "  A{Mức mấy?}",
    '  A -- "0 · chưa có gì" --> B["một"]',
    '  A -- "1 · có luật, chưa có máy" --> C["hai"]',
    '  A -- "2 · có máy, chưa có lưới đỡ" --> D["ba"]',
    '  A -- "3 · đủ bộ" --> E["bốn"]'].join(NL));
  const nhan = [...svg.matchAll(/<text x="(-?\d+)" y="(-?\d+)" class="ld-nhan-canh">([^<]*)</g)]
    .map((m) => ({ x: Number(m[1]), y: Number(m[2]), chu: m[3], nua: m[3].length * 6.4 / 2 }));
  assert.equal(nhan.length, 4, "bốn nhánh phải có bốn nhãn");
  const de = [];
  for (let i = 0; i < nhan.length; i += 1) {
    for (let j = i + 1; j < nhan.length; j += 1) {
      const p = nhan[i];
      const q = nhan[j];
      if (Math.abs(p.y - q.y) < 13 && Math.abs(p.x - q.x) < p.nua + q.nua) de.push(`${p.chu} × ${q.chu}`);
    }
  }
  assert.deepEqual(de, [], `nhãn cạnh không được đè nhau. Đang đè: ${de.join(" · ")}`);

  /* VÀ PHẢI NẰM MỘT HÀNG. Vế "không đè nhau" một mình KHÔNG đủ, đo được: gỡ lượt nới khe theo
     nhãn thì các nhãn vẫn không đè — vì lượt dồn chỗ đẩy chúng thành bậc thang. Hai cơ chế che
     cho nhau, nên một đột biến gỡ đúng một cái vẫn sống sót. Vế này ghim cái thứ nhất: khi tầng
     đã được nới đủ rộng thì KHÔNG cần dồn, tức bốn nhãn cùng một hàng. */
  assert.equal(new Set(nhan.map((n) => n.y)).size, 1,
    `bốn nhãn phải nằm một hàng — khe của nút đã nới theo bề rộng nhãn. Đang ở ${new Set(nhan.map((n) => n.y)).size} hàng`);
  ok("bốn nhãn của một nút quyết định: một hàng, không cặp nào đè nhau");
}

/* ---- 7b. Nhiều nhãn ĐỔ VỀ MỘT NÚT thì phải tách ra ---------------------- */
{
  /* Ca thật: `docs/TINH-NANG.md` — bốn quyết định đều đổ về "CHẶN", bốn nhãn không/có. Neo ở
     đầu đích thì bốn nhãn chồng lên nhau tại đúng một điểm. Đây là ca mà lượt DỒN CHỖ phải cứu,
     và nó khác ca ở vế 7 (ca đó do nới khe cứu) — hai cơ chế, hai vế, không cái nào che cái nào. */
  const svg = veLuuDo(["flowchart TD",
    "  A{một?}", "  B{hai?}", "  C{ba?}",
    '  A -- "không phải" --> X["CHẶN"]',
    '  A -- "phải" --> B',
    '  B -- "không phải" --> X',
    '  B -- "phải" --> C',
    '  C -- "không phải" --> X',
    '  C -- "phải" --> Y["CHO QUA"]'].join(NL));
  const nhan = [...svg.matchAll(/<text x="(-?\d+)" y="(-?\d+)" class="ld-nhan-canh">([^<]*)</g)]
    .map((m) => ({ x: Number(m[1]), y: Number(m[2]), chu: m[3], nua: m[3].length * 6.4 / 2 }));
  assert.equal(nhan.length, 6, "sáu cạnh có nhãn");
  const de = [];
  for (let i = 0; i < nhan.length; i += 1) {
    for (let j = i + 1; j < nhan.length; j += 1) {
      const p = nhan[i];
      const q = nhan[j];
      if (Math.abs(p.y - q.y) < 13 && Math.abs(p.x - q.x) < p.nua + q.nua) de.push(`${p.chu}@${p.x},${p.y} × ${q.chu}@${q.x},${q.y}`);
    }
  }
  assert.deepEqual(de, [], `nhãn của các cạnh hội tụ không được đè nhau. Đang đè: ${de.join(" · ")}`);

  /* VÀ MỖI NHÃN PHẢI Ở CẠNH NGUỒN CỦA NÓ. "Không đè nhau" một mình quá dễ đạt: neo cả ba nhãn
     vào đầu ĐÍCH rồi để lượt dồn chỗ xếp chúng thành cột — không cặp nào đè, mà ba chữ
     "không phải" nằm chồng nhau trên đúng một nút thì không ai đọc ra nhãn nào của nhánh nào.
     Ghim bằng ĐỘ TRẢI: ba nhãn đi theo ba nguồn ở ba tầng thì phải cách nhau cả trăm pixel. */
  const ys = nhan.filter((n) => n.chu === "không phải").map((n) => n.y);
  assert.equal(ys.length, 3, "ba nhãn 'không phải'");
  assert.ok(Math.max(...ys) - Math.min(...ys) > 150,
    `nhãn phải bám nguồn của nó, không dồn về đích: độ trải đang là ${Math.max(...ys) - Math.min(...ys)}px`);
  ok(`ba nhánh cùng đổ về một nút: sáu nhãn không đè nhau, mỗi nhãn bám nguồn (trải ${Math.max(...ys) - Math.min(...ys)}px)`);
}

/* ---- 7c. Hai nhánh CÙNG MỘT NGUỒN, cùng đổ về nút hội tụ ---------------- */
{
  /* Ca duy nhất mà lượt DỒN CHỖ thật sự phải làm việc — và nó tồn tại, không phải giả định:
     một nút quyết định mà CẢ HAI nhánh đều chảy vào nút đã có nhiều cạnh vào. Lúc đó cả hai
     nhãn cùng neo ở nguồn, cùng một toạ độ, và chỉ lượt dồn chỗ tách được chúng.
     Đo trước khi giữ: bỏ lượt dồn chỗ thì bảy lưu đồ thật của repo KHÔNG đổi một pixel — nên
     nếu không có ca này thì lượt dồn chỗ là mã chết và phải xoá, không phải giữ cho chắc. */
  const svg = veLuuDo(["flowchart TD",
    "  A{hỏi}",
    '  A -- "nhánh trái rất dài" --> X["CHẶN"]',
    '  A -- "nhánh phải dài" --> Y["QUA"]',
    '  B{hai} -- "khác" --> X',
    '  C{ba} -- "khác nữa" --> Y'].join(NL));
  const nhan = [...svg.matchAll(/<text x="(-?\d+)" y="(-?\d+)" class="ld-nhan-canh">([^<]*)</g)]
    .map((m) => ({ x: Number(m[1]), y: Number(m[2]), chu: m[3], nua: m[3].length * 6.4 / 2 }));
  const hai = nhan.filter((n) => n.chu.startsWith("nhánh"));
  assert.equal(hai.length, 2, "hai nhánh của nút quyết định");
  assert.ok(!(Math.abs(hai[0].y - hai[1].y) < 13 && Math.abs(hai[0].x - hai[1].x) < hai[0].nua + hai[1].nua),
    `hai nhãn cùng nguồn phải được tách ra: ${hai.map((h) => `${h.chu}@${h.x},${h.y}`).join(" × ")}`);
  ok("hai nhánh cùng nguồn cùng đổ vào nút hội tụ: lượt dồn chỗ tách được chúng");
}

/* ---- 8. Đọc đúng thứ mình khai là đọc được ------------------------------ */
{
  const d = docLuuDo(["flowchart TD",
    '  A["một"] --> B{hỏi}',
    "  B -- có --> C[\"hai\"]",
    "  B -- không --> D[\"ba\"]",
    "  C --> E[\"bốn\"] --> F[\"năm\"]",
    "  D -.-> A",
    "  A -.- F"].join(NL));
  assert.equal(d.huong, "TD");
  assert.equal(d.nut.size, 6, "sáu nút");
  assert.equal(d.canh.length, 7, "bảy cạnh — chuỗi ba nút đếm là hai cạnh");
  assert.equal(d.nut.get("B").hinh, "thoi", "ngoặc nhọn là nút quyết định");
  assert.equal(d.nut.get("A").hinh, "hop");
  assert.deepEqual(d.canh.filter((c) => c.nhan).map((c) => c.nhan), ["có", "không"]);
  assert.equal(d.canh.find((c) => c.tu === "D").kieu, "cham", "`-.->` là nét đứt");
  assert.equal(d.canh.find((c) => c.tu === "A" && c.den === "F").mui, false, "`-.-` không có mũi tên");
  ok("bộ đọc: 6 nút · 7 cạnh · hình thoi · nhãn · nét đứt · nối không mũi tên");
}

/* TÁM ĐỘT BIẾN ĐÃ CHẠY THẬT, CẢ TÁM BỊ BẮT — và ba trong tám SỐNG SÓT ở lượt đầu, đó mới là
 * phần đáng đọc. Lượt đầu chỉ có 8 vế; ba đột biến đi lọt vì hai cơ chế của bộ vẽ CHE CHO NHAU:
 * gỡ lượt nới khe thì lượt dồn chỗ đỡ lấy, gỡ lượt dồn chỗ thì nới khe đỡ lấy, gỡ neo-ở-nguồn
 * thì dồn chỗ đỡ lấy. Không cặp nào đè nhau ở cả ba ca — nên vế "không đè nhau" xanh, trong khi
 * lưu đồ đã xấu đi thật. Phải thêm vế 7b, 7c và nửa sau của vế 4 mới đóng được.
 *
 *  1. `md()` bỏ qua bộ vẽ, in lại `<pre class="mermaid">`  → vế 2 đỏ
 *  2. bỏ `goEscape` trước khi escape cho SVG               → vế 5 đỏ (`&amp;lt;` hiện ra chữ)
 *  3. bỏ lượt ngắt dòng nhãn dài                           → vế 6 đỏ (chữ rộng hơn hộp)
 *  4. bỏ lượt dồn chỗ nhãn cạnh                            → vế 7c đỏ  (SỐNG SÓT lượt đầu)
 *  5. bỏ nới khe theo bề rộng nhãn                         → vế 7 đỏ   (SỐNG SÓT lượt đầu)
 *  6. bỏ neo-ở-nguồn cho cạnh hội tụ                       → vế 7b đỏ  (SỐNG SÓT lượt đầu)
 *  7. bỏ nhận diện cạnh quay lại                           → vế 4 đỏ   (SỐNG SÓT lượt đầu)
 *  8. cú pháp lạ thì NÉM thay vì trả `null`                → vế 3 đỏ
 *
 * Đột biến 7 còn dạy thêm một điều: giả thuyết ban đầu của tôi SAI. Tôi tưởng bỏ lớp đó thì bộ
 * xếp đệ quy vô hạn; chạy thật thì nó KHÔNG treo — nó chỉ coi cạnh quay lại là cạnh xuôi và vẽ
 * lưu đồ NGƯỢC, nút đầu tiên rơi xuống đáy. Hỏng im lặng, tệ hơn treo.
 *
 * MỘT CHỖ VẪN KHÔNG GHIM ĐƯỢC, ghi ra để không ai tưởng là kín: đổi `RONG_MOI_KY_TU` từ 6.9
 * xuống 5.0 thì vế 6 vẫn xanh — vì nó đo bằng chính ước lượng của bộ vẽ, không đo chữ thật. Chỉ
 * trình duyệt đo được chữ thật. Ước lượng đã đối chiếu MỘT LẦN với số đo thật trong trình duyệt
 * (08/09: 7 lưu đồ · 0 chỗ chữ tràn hộp · 0 cặp nhãn đè nhau); đổi con số đó thì phải đo lại như
 * thế, đừng tin suite. */

/* VẾ 11 — `md()` PHẢI LUÔN KẾT THÚC. Không phải "ra đúng", mà **ra**.
 *
 * Ca thật 10/09: nhánh đoạn văn của `md()` dừng ở mọi dòng mở bằng `|`, nhưng nhánh bảng chỉ
 * vào khi DÒNG SAU là hàng ngăn cách. Gặp một dòng `|` đơn lẻ thì không nhánh nào ăn nó, `i`
 * không tăng, vòng ngoài quay VÔ HẠN. Một tiến trình `build-overview.mjs` ở repo đích đốt
 * **65.765 giây CPU (18 tiếng)** trước khi bị phát hiện — vì biểu hiện của nó là *"lệnh chưa
 * xong"*, không phải một thông báo lỗi.
 *
 * PHẢI CHẠY Ở TIẾN TRÌNH CON. Vòng lặp là đồng bộ, nên `setTimeout` trong cùng tiến trình
 * **không bao giờ nổ** — một vế viết kiểu đó sẽ TREO CẢ SUITE thay vì báo Đỏ, và một suite treo
 * không bằng một suite đỏ: nó không nói gì cả.
 */
{
  const cas = [
    ["mot dong | don le", "| chi mot hang, khong co hang ngan cach" + NL + "mot dong thuong" + NL],
    ["| o cuoi file", "van ban" + NL + "| hang bang cut"],
    ["chi mot dau |", "|"]
  ];
  for (const [ten, vao] of cas) {
    const ra = spawnSync(process.execPath, [
      "-e",
      "const{md}=await import(process.argv[1]);process.stdout.write(md(process.argv[2]))",
      pathToFileURL(join(ROOT, "scripts", "md-mini.mjs")).href,
      vao
    ], { encoding: "utf8", timeout: 8000 });
    assert.notEqual(ra.signal, "SIGTERM",
      `md() KHONG KET THUC voi ca "${ten}" — vong lap khong tien, dung ca that 10/09`);
    assert.equal(ra.status, 0, `md() phai chay xong voi ca "${ten}": ${ra.stderr}`);
    assert.ok(ra.stdout.length > 0, `md() phai tra ra chu voi ca "${ten}", dang rong`);
  }
  ok(`11 · \`md()\` luôn kết thúc — ${cas.length} ca dòng \`|\` không thành bảng, đo ở tiến trình con`);
}

console.log(`luu-do-smoke: ${passed} vế xanh` + (boQua ? ` · ${boQua} vế BỎ QUA (kể tên ở trên)` : ""));
