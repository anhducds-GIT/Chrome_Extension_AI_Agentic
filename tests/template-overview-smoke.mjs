/* PHÉP KIỂM TRANG CỦA CHÍNH BỘ KHUNG.
 *
 * Trang này là thứ người ta xem TRƯỚC khi quyết định lấy bộ khung về, nên kiểu hỏng đắt nhất
 * của nó là **nói một đằng, bộ khung một nẻo** — và nó sẽ hỏng như thế trong im lặng, vì trang
 * vẫn đẹp. Ba khối dưới đây ghim đúng ba đường mà sự thật có thể rời khỏi trang.
 */

import assert from "node:assert/strict";
import { buildTemplateFiles } from "../scripts/build-template.mjs";
import { doDacTinh, nhomFiles, trang } from "../scripts/build-template-overview.mjs";
import { TANG } from "../scripts/assess.mjs";

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };
const files = buildTemplateFiles();
const html = trang(files);

/* ---- 1. Số trên trang phải LÀ số của bộ khung, không phải số gõ tay ------ */
{
  const d = doDacTinh(files);
  assert.equal(d.soFile, files.size, "so file phai doc tu chinh bo khung");
  assert.ok(html.includes(`<b>${d.soFile}</b>`), `trang phai in dung so file (${d.soFile})`);
  assert.ok(html.includes(`<b>${d.soCongCu}</b>`), `trang phai in dung so cong cu (${d.soCongCu})`);

  // ĐỐI CHỨNG: một con số KHÔNG phải của bộ khung thì không được có mặt. Không có vế này thì
  // khối trên cũng qua được với một trang in bừa mọi con số.
  assert.ok(!html.includes(`<b>${files.size + 7}</b>`), "trang khong duoc mang mot con so khong phai cua bo khung");
  ok(`số trên trang khớp bộ khung: ${d.soFile} file · ${d.soCongCu} công cụ · ${d.dongLuat} dòng luật`);
}

/* ---- 2. Mọi file của bộ khung phải xuất hiện, không sót nhóm nào -------- */
{
  // Sót một nhóm là trang mô tả một bộ khung nhỏ hơn thực tế — người đọc quyết định dựa trên
  // một bản kê thiếu.
  for (const rel of files.keys()) {
    assert.ok(html.includes(`<code>${rel}</code>`), `trang bo sot file: ${rel}`);
  }
  const nhom = nhomFiles(files);
  const tong = nhom.get(TANG.MAY).length + nhom.get(TANG.LUAT).length + nhom.get(TANG.TRANG).length;
  assert.equal(tong, files.size, "phan nhom phai phu HET file, khong duoc roi cai nao ra ngoai");
  assert.ok(nhom.get(TANG.MAY).length > 0 && nhom.get(TANG.LUAT).length > 0 && nhom.get(TANG.TRANG).length > 0,
    "ca ba nhom phai co file — mot nhom rong nghia la phan tang hong");
  ok(`bản kê đủ ${files.size} file, chia ba nhóm, không sót`);
}

/* ---- 3. Không mang danh tính của repo sinh ra nó ------------------------ */
{
  const CAM = [/duc-auto/i, /gg-flow/i, /Chrome_Extension_AI_Agentic/i, /Chrome Extension AI Agentic/i, /Bảng điều hành Extension/];
  for (const mau of CAM) {
    assert.ok(!mau.test(html), `trang mang danh tinh repo goc: ${mau}`);
  }
  // ĐỐI CHỨNG cho chính bộ dò: nó phải bắt được khi tên đó CÓ THẬT.
  assert.ok(CAM.some((m) => m.test("… workers/duc-auto-gemini …")), "bo do phai bat duoc ten cam khi co that");
  ok("không mang tên riêng của repo sinh ra nó, và bộ dò thật sự bắt được");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
