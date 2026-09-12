/* tests/sidepanel-dom-smoke.mjs — ghim BẢNG BÊN ở đúng ba chỗ nó hỏng IM LẶNG.
 *
 * Bảng bên không chạy được ngoài trình duyệt, nên không có phép ghim nào chạy thử nó thật. Ba
 * khối dưới đây không thử chạy — chúng đọc file và bắt ba loại lỗi mà suite thường KHÔNG bắt
 * được, và cả ba đều nhìn ra ngoài giống hệt nhau: "extension hỏng".
 *
 *   ⑴ JS gọi `#mot-id` mà HTML không có id đó. `querySelector` trả `null`, dòng sau ném, và
 *      phần còn lại của file NGỪNG CHẠY — nên bảng trắng một nửa mà không có lỗi nào ở chỗ
 *      Đức nhìn thấy.
 *   ⑵ `<script>` có nội dung ngay trong trang. MV3 chặn mã nội tuyến trong trang extension và
 *      nó hỏng IM LẶNG: trang vẫn tải, chỉ có mã là không chạy. Đã mất một buổi vì đúng cái này.
 *   ⑶ Gán `innerHTML`. Luật repo cấm, và bảng này hiện tên trang do người khác đặt — tức là
 *      hiện chữ không tin được.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsThat = fs.readFileSync(path.join(GOC, "sidepanel.js"), "utf8");

/* BỎ CHÚ THÍCH TRƯỚC ĐÃ. Trình duyệt không chạy chú thích, nên đo cả chú thích là đo sai theo
 * CẢ HAI CHIỀU: một `<script>` nằm trong chú thích bị báo oan (đã xảy ra ngay lượt chạy đầu
 * của file này), và một `id="x"` chỉ có trong chú thích sẽ được tính là CÓ trong DOM — trong
 * khi `querySelector` thì không tìm thấy nó. Chiều thứ hai nguy hơn: nó làm phép ghim gật đầu
 * cho đúng cái lỗi nó sinh ra để bắt. */
const html = fs.readFileSync(path.join(GOC, "sidepanel.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");

/* JS cũng vậy, và ở đây nó còn buồn cười hơn: khối chú thích đầu `sidepanel.js` GHI RA luật
 * "không dùng innerHTML", nên phép ghim đọc cả chú thích sẽ báo lỗi vì tìm thấy đúng cái câu
 * cấm nó. `[^:]` trước `//` để không cắt mất `https://` nằm trong chuỗi. */
const js = jsThat
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/* ---- ⑴ Mọi id JS gọi đều phải có trong HTML ------------------------------ */
{
  const coTrongHtml = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  assert.ok(coTrongHtml.size > 10, "khong doc duoc id nao tu HTML — phep ghim nay dang do mu");

  /* Chỉ bắt selector VIẾT THẲNG. Selector ghép chuỗi thì kiểm riêng ở dưới. */
  const jsGoi = [...js.matchAll(/(?:\$|querySelector)\(\s*"#([a-zA-Z0-9_-]+)"\s*\)/g)].map((m) => m[1]);
  assert.ok(jsGoi.length > 10, "khong thay selector nao trong JS — phep ghim nay dang do mu");

  const thieu = [...new Set(jsGoi)].filter((id) => !coTrongHtml.has(id));
  assert.deepEqual(thieu, [], `JS goi id ma HTML khong co: ${thieu.join(", ")}`);

  /* Ba tab dựng selector bằng ghép chuỗi (`#tab-${ten}`), nên vòng trên không thấy chúng. Đây
   * đúng là chỗ vòng lặp dễ hỏng nhất: đổi tên một tab trong HTML mà quên mảng trong JS thì
   * cả khối tab chết. Nên khai thẳng, và bắt cả hai đầu. */
  const tenTab = [...js.matchAll(/const TABS = \[([^\]]+)\]/g)][0]?.[1];
  assert.ok(tenTab, "khong tim thay mang TABS trong JS");
  const dsTab = [...tenTab.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(dsTab.length, 3, "dang co 3 tab");
  for (const ten of dsTab) {
    assert.ok(coTrongHtml.has(`tab-${ten}`), `HTML thieu nut tab-${ten}`);
    assert.ok(coTrongHtml.has(`panel-${ten}`), `HTML thieu khoi panel-${ten}`);
  }
  /* Và ngược lại: HTML có tab nào mà JS không nối tay thì tab đó bấm không ăn. */
  for (const id of coTrongHtml) {
    if (!id.startsWith("tab-")) continue;
    assert.ok(dsTab.includes(id.slice(4)), `HTML co ${id} ma JS khong noi tay — bam vao khong an gi`);
  }
}

/* ---- ⑵ Không mã nội tuyến ------------------------------------------------ */
{
  for (const the of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    assert.ok(/\ssrc=/.test(the[1]), "co <script> KHONG co src — MV3 chan ma noi tuyen, va no hong IM LANG");
    assert.equal(the[2].trim(), "", "the <script src> khong duoc chua ma ben trong");
  }
  /* Thuộc tính `on*` cũng là mã nội tuyến, và CSP chặn y hệt. */
  const onXau = [...html.matchAll(/\son[a-z]+\s*=\s*"/g)].map((m) => m[0].trim());
  assert.deepEqual(onXau, [], `thuoc tinh su kien noi tuyen bi CSP chan: ${onXau.join(", ")}`);
}

/* ---- ⑶ Không gán HTML thô ----------------------------------------------- */
{
  for (const xau of ["innerHTML", "outerHTML", "insertAdjacentHTML"]) {
    assert.ok(!js.includes(xau), `sidepanel.js con dung ${xau} — luat repo cam`);
  }
}

/* ---- ⑷ Chữ Đức nhìn thấy phải là tiếng Việt CÓ DẤU ----------------------
 * Luật vàng 5. Bảng cũ lẫn `Scan Targets` · `Observation Report` · `No observation yet.` giữa
 * chữ Việt. Không kiểm được "câu này có hay không", nhưng kiểm được "đã bỏ hết chữ cũ chưa". */
{
  for (const cu of ["Scan Targets", "Observation Report", "No observation yet", "Copy JSON", "Ready."]) {
    assert.ok(!html.includes(cu) && !js.includes(cu), `con sot chu tieng Anh cua ban cu: "${cu}"`);
  }
  assert.ok(/lang="vi"/.test(html), "trang phai khai lang=vi");
}

/* ---- ⑸ Từ NGƯỜI DÙNG đi tìm phải có mặt trên màn hình -------------------
 * Đức hỏi tính năng bằng chữ "Profile ID". Bản 12/09 đặt tên khối là "Tên ghế này" vì trong
 * đó có hai thứ khác nhau — lý do đúng, kết quả sai: Đức mở thẻ Hệ thống, không thấy chữ mình
 * tìm, và báo là tính năng CHƯA CÓ. Một tính năng người dùng không nhận ra thì bằng không có.
 *
 * Con này canh đúng chỗ đó, và nó KHÔNG kiểm bố cục — chỉ kiểm ba thứ đo được: chữ Đức tra
 * có trên màn hình, ô chứa số có thật, và nút sao chép chép SỐ chứ không chép chữ đang hiện. */
{
  assert.ok(html.includes("Profile ID"),
    "bang ben khong con chu 'Profile ID' — day la tu Duc dung de goi tinh nang nay");

  /* Nút sao chép phải lấy số từ `dataset`, KHÔNG từ `textContent`. Lúc chưa có số, ô đó đang
   * chứa câu "chưa có — đúc ở lượt nối Bridge đầu tiên"; chép nguyên câu đó vào bảng nhớ rồi
   * dán vào một lượt gọi là một lỗi IM LẶNG — lượt gọi hỏng, và không ai nhìn ra vì sao. */
  assert.ok(/ten-ghe-so"\)\.dataset\.soGhe/.test(js),
    "nut sao chep Profile ID phai doc dataset.soGhe, khong doc textContent");
  assert.ok(!/ten-ghe-so"\)\.textContent\s*\)/.test(js),
    "khong duoc sao chep chu dang hien trong o so ghe");
}

console.log("sidepanel-dom smoke tests: PASS (5 khoi)");
