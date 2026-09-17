/* Phép ghim cho thẻ HƯỚNG DẪN của bảng bên — chạy không cần trình duyệt.
 *
 * ─── VÌ SAO MỘT TRANG CHỮ LẠI CẦN PHÉP GHIM ────────────────────────────────
 * Một trang hướng dẫn gõ tay chỉ đúng vào **đúng cái ngày người ta gõ nó**. Repo này đã trả giá
 * cho chuyện đó hai lần ở hai tầng khác nhau: bảng điều khiển từng gõ tay *"14 method"* trong
 * khi thật là 15, và một lời khai *"máy chủ đầy chỗ"* sống ba ngày vì không ai đọc lại.
 *
 * Nên thẻ Hướng dẫn **không được phép** là một danh sách chữ đứng một mình. Mỗi dòng việc mang
 * `data-lenh="<tệp>.mjs"`, và khối ⓐ dưới đây đối chiếu tập ấy với **các tệp CHẠY ĐƯỢC thật**
 * trong `tu-dong/`. Thêm một lệnh mà quên viết vào hướng dẫn → ĐỎ. Xoá một lệnh mà quên gỡ khỏi
 * hướng dẫn → cũng ĐỎ.
 *
 * ─── "CHẠY ĐƯỢC" ĐO BẰNG GÌ ────────────────────────────────────────────────
 * Bằng chính cái khối `if (process.argv[1] && fileURLToPath(...) === resolve(process.argv[1]))`
 * ở cuối mỗi tệp — thứ biến một module thành một lệnh gõ được. Đo bằng dấu ấy chứ không bằng
 * danh sách tên gõ tay, vì một danh sách tên lại là đúng thứ file này sinh ra để diệt.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const goc = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(goc, "..", "sidepanel.html"), "utf8");
const thuMucTuDong = join(goc, "..", "..", "tu-dong");

/* Dấu nhận biết một tệp là LỆNH gõ được, không phải thư viện. */
const DAU_LENH = "fileURLToPath(import.meta.url) === resolve(process.argv[1])";

const lenhThat = readdirSync(thuMucTuDong)
  .filter((t) => t.endsWith(".mjs"))
  .filter((t) => readFileSync(join(thuMucTuDong, t), "utf8").includes(DAU_LENH))
  .sort();

/* Khớp ĐÚNG thẻ `<li data-lenh="...">`, không khớp chữ `data-lenh` trong khối chú thích ngay
 * phía trên nó. Bài học `detectors-match-your-own-prose`: phép dò bằng regex vẫn hay bắt trúng
 * văn xuôi của chính mình, rồi báo xanh cho một trang rỗng. */
const lenhKhai = [...html.matchAll(/<li data-lenh="([^"]+)">/g)].map((m) => m[1]).sort();

/* ---- ⓐ HƯỚNG DẪN PHẢI KHỚP THỰC TẾ, cả hai chiều ----------------------- */
{
  assert.ok(lenhThat.length >= 8, `chỉ tìm thấy ${lenhThat.length} lệnh trong tu-dong/ — dấu nhận biết có còn đúng không?`);

  const thieu = lenhThat.filter((x) => !lenhKhai.includes(x));
  const thua = lenhKhai.filter((x) => !lenhThat.includes(x));

  assert.deepEqual(thieu, [],
    `có lệnh CHẠY ĐƯỢC mà thẻ Hướng dẫn không nhắc tới: ${thieu.join(", ")}. ` +
    "Một tính năng người dùng không nhận ra thì bằng không có.");
  assert.deepEqual(thua, [],
    `thẻ Hướng dẫn nhắc tới lệnh KHÔNG TỒN TẠI: ${thua.join(", ")}. ` +
    "Hướng dẫn trỏ vào chỗ trống còn tệ hơn không có hướng dẫn.");
}

/* ---- ⓑ Mỗi dòng việc phải NÓI ĐƯỢC NÓ LÀM GÌ ---------------------------
 * Không có khối này thì một dòng chỉ có tên tệp cũng qua cửa ⓐ — và tên tệp thì Đức đọc không
 * ra việc. Đòi cả tên việc lẫn một câu giải thích. */
{
  for (const lenh of lenhKhai) {
    const khoi = html.slice(html.indexOf(`<li data-lenh="${lenh}">`));
    const than = khoi.slice(0, khoi.indexOf("</li>"));
    assert.ok(/<span class="viec-ten">[^<]{8,}<\/span>/.test(than), `${lenh}: thiếu TÊN VIỆC đọc ra nghĩa`);
    assert.ok(/<span class="mo">[^<]{25,}<\/span>/.test(than), `${lenh}: thiếu câu giải thích`);
    assert.ok(than.includes(`<code>${lenh}</code>`), `${lenh}: phải in ra lệnh để Đức gõ lại được`);
  }
}

/* ---- ⓒ MỘT hướng dẫn, không phải hai ------------------------------------
 * Bản cũ có "Hướng dẫn nhanh" nằm trong <details> ở đáy thẻ Hệ thống. Nó đã chuyển sang thẻ
 * Hướng dẫn 17/09, và **không được để lại bản thứ hai**: hai bản của một hướng dẫn thì sớm muộn
 * lệch, và bản vá làm ở một bên không bao giờ tới bên kia. */
{
  assert.ok(!/<summary>Hướng dẫn nhanh<\/summary>/.test(html),
    "còn một bản 'Hướng dẫn nhanh' thứ hai trong <details> — gộp về thẻ Hướng dẫn");
  assert.equal([...html.matchAll(/<ol class="huong-dan">/g)].length, 1,
    "phải có ĐÚNG MỘT danh sách các bước bắt đầu");
}

/* ---- ⓓ Thẻ phải NỐI ĐƯỢC DÂY, không chỉ có mặt ------------------------
 * Nút tab, panel, và tên tab trong `sidepanel.js` phải khớp nhau. Thiếu một trong ba thì thẻ có
 * trong HTML mà bấm không ra — đúng kiểu hỏng im lặng. */
{
  const js = readFileSync(join(goc, "..", "sidepanel.js"), "utf8");
  assert.ok(html.includes('id="tab-huongdan"'), "thiếu nút tab");
  assert.ok(html.includes('id="panel-huongdan"'), "thiếu panel");
  const m = js.match(/const TABS = \[([^\]]+)\]/);
  assert.ok(m, "không đọc được danh sách TABS trong sidepanel.js");
  assert.ok(m[1].includes('"huongdan"'), "sidepanel.js chưa khai tab huongdan — bấm vào sẽ không đổi gì");
}

/* ---- ⓔ Giới hạn phải đứng NGANG HÀNG với năng lực ---------------------- */
{
  assert.ok(html.includes("<h2>Udin KHÔNG làm được gì</h2>"),
    "thiếu khối giới hạn. Một giới hạn không ai đọc thì nó vẫn được trông đợi, rồi hỏng ở lúc đắt nhất.");
}

/* ---- ⓕ Ba phần của một dòng việc phải XUỐNG DÒNG, không nằm ngang ------
 * Luật chung đặt mọi `li` thành `display: flex` hàng ngang. Trong bảng bên rộng ~380px, tên việc
 * + lời giải thích + dòng lệnh nằm cạnh nhau đọc ra **một câu dính liền** — nhìn thấy tận mắt
 * 17/09 trước khi sửa. Chú thích trong CSS nói "TÊN trên, giải thích dưới" mà luật thì không làm
 * thế; khối này là thứ bắt hai bên phải khớp nhau. */
{
  const css = readFileSync(join(goc, "..", "sidepanel.css"), "utf8");
  const luat = css.match(/\.viec-huong-dan li \{([^}]*)\}/);
  assert.ok(luat, "không tìm thấy luật cho `.viec-huong-dan li`");
  assert.ok(/flex-direction:\s*column/.test(luat[1]),
    "`.viec-huong-dan li` phải là CỘT — để hàng ngang thì tên việc và lời giải thích dính vào nhau");
}

/* ---- ⓖ MỌI dòng việc phải nằm TRONG một nhóm -------------------------
 * Đức chốt 17/09: *"trong tương lai tôi sẽ còn có các feature khác liên quan đến tạo video…
 * nên tôi prefer bạn tạo thành các group và gói nó lại thay vì là để rải rải ra."*
 *
 * Khối này là thứ giữ lời ấy khi tôi không còn ở đây. Nó KHÔNG kiểm tên nhóm — thêm nhóm
 * `video` sau này không được làm bộ đo đỏ. Nó kiểm đúng một điều: **không dòng nào rơi ra
 * ngoài nhóm**. Đó là cái đã hỏng ở bản đầu (10 dòng phẳng), và là cái sẽ hỏng lại khi ai đó
 * thêm vội một lệnh mới vào cuối danh sách. */
{
  /* HAI regex riêng cho hai loại thẻ, KHÔNG dùng tham chiếu ngược `so-mot-co-gach-cheo`: dấu gạch ấy phải đi
   * qua ba lớp vỏ (bash → python → JS) và đã có lần biến thành một BYTE ĐIỀU KHIỂN nằm im
   * trong file. Viết dài hơn một dòng thì đổi lại được sự chắc chắn. */
  const nhom = [
    ...html.matchAll(/<section[^>]*data-nhom="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g),
    ...html.matchAll(/<details[^>]*data-nhom="([^"]+)"[^>]*>([\s\S]*?)<\/details>/g),
  ];
  assert.ok(nhom.length >= 2, `phải có ít nhất hai nhóm (chính và phụ), thấy ${nhom.length}`);

  const trongNhom = new Set();
  for (const [, ten, than] of nhom) {
    const cua = [...than.matchAll(/<li data-lenh="([^"]+)">/g)].map((m) => m[1]);
    assert.ok(cua.length > 0, `nhóm '${ten}' rỗng — nhóm rỗng thì xoá đi, đừng để làm nhiễu`);
    for (const l of cua) {
      assert.ok(!trongNhom.has(l), `${l} nằm ở HAI nhóm — mỗi việc một chỗ, nếu không Đức đọc hai lần rồi tưởng là hai việc`);
      trongNhom.add(l);
    }
  }
  const roiRa = lenhKhai.filter((l) => !trongNhom.has(l));
  assert.deepEqual(roiRa, [], `có dòng việc nằm NGOÀI mọi nhóm: ${roiRa.join(", ")}`);
}

/* ---- ⓗ Nhóm PHỤ phải GẬP LẠI được ------------------------------------
 * "Cất vào một nest group toggle" là nguyên văn yêu cầu. Một `<section>` mở toang thì nó lại
 * rải ra đúng như cũ, chỉ khác cái tiêu đề. */
{
  assert.ok(/<details[^>]*data-nhom="phu"/.test(html),
    "nhóm phụ phải là <details> — gập lại được, không phải một khối mở sẵn");
  /* Dùng indexOf chứ không regex: chỗ này chỉ cần biết `<summary>` có đứng ngay sau thẻ mở
   * của nhóm phụ hay không, và một regex vắt qua nhiều dòng ở đây đã vỡ một lần vì escape. */
  const moPhu = html.indexOf('data-nhom="phu"');
  assert.ok(moPhu > 0 && html.slice(moPhu, moPhu + 200).includes("<summary>"),
    "nhóm phụ thiếu <summary> — không có chỗ để bấm mở");
}

console.log(`  · udin huong-dan: 8 khối xanh · ${lenhThat.length} lệnh trong ${[...html.matchAll(/data-nhom="/g)].length - 1} nhóm`);
