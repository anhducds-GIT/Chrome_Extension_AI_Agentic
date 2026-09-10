#!/usr/bin/env node
/* CHỌN PROFILE CHROME TỪ MENU — thay cho việc gõ tay cái nhãn.
 *
 * Gõ tay là chỗ dễ sai nhất trong cả quy trình: nhãn gõ lệch một ký tự thì Bridge nhận không
 * ra, và lỗi hiện ra muộn, sau khi đã chờ. Menu thì không gõ sai được, và nó cho thấy luôn
 * profile nào đang thật sự nối — thứ mà gõ tay không nói được.
 *
 * Danh sách do CHÍNH HOST trả lời (`bridge.sessions`), không phải do trang trả lời. Nên gọi
 * nó KHÔNG giành panel với một chuỗi đang chạy.
 *
 * Dùng:
 *   node chon-profile.mjs --pairing "<đường dẫn>" --ra "<tệp ghi nhãn đã chọn>"
 *   node chon-profile.mjs --tu-kiem
 *
 * Mã thoát: 0 đã chọn · 2 không có profile nào / người bỏ cuộc · 3 không hỏi được host.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), "bridge-cli.mjs");

/** Dựng menu. THUẦN, nên ghim được mà không cần Bridge. */
export function dungMenu(sessions, bayGio = Date.now()) {
  return sessions.map((s, i) => {
    const giay = s.last_seen_at ? Math.round((bayGio - Date.parse(s.last_seen_at)) / 1000) : null;
    const tuoi = giay === null ? "không rõ"
      : giay < 90 ? "đang nối"
      : giay < 3600 ? `im ${Math.round(giay / 60)} phút`
      : `im ${Math.round(giay / 3600)} giờ`;
    return { so: i + 1, nhan: s.label, tuoi, dong: `  ${i + 1}) ${s.label}   (${tuoi})` };
  });
}

/** Đọc lựa chọn. Nhận SỐ hoặc gõ thẳng nhãn — người quen tay vẫn gõ được.
 *  Trả `null` khi không hiểu, để bên gọi hỏi lại chứ không đoán bừa. */
export function hieuLuaChon(traLoi, menu) {
  const t = String(traLoi ?? "").trim();
  if (!t) return menu.length === 1 ? menu[0].nhan : null;
  if (/^\d+$/.test(t)) {
    const m = menu.find((x) => x.so === Number(t));
    return m ? m.nhan : null;
  }
  const khop = menu.filter((x) => x.nhan.toLowerCase() === t.toLowerCase());
  if (khop.length === 1) return khop[0].nhan;
  /* Gõ thiếu thì chỉ nhận khi CHỈ MỘT nhãn khớp. Hai nhãn cùng bắt đầu bằng chuỗi đó mà tự
     chọn một cái là đúng kiểu đoán ý người dùng — chỗ này không được đoán. */
  const batDau = menu.filter((x) => x.nhan.toLowerCase().startsWith(t.toLowerCase()));
  return batDau.length === 1 ? batDau[0].nhan : null;
}

function docCo(argv, ten, mac = null) {
  const i = argv.indexOf(`--${ten}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : mac;
}

function tuKiem() {
  const ss = [
    { label: "Ark", last_seen_at: "2026-01-01T00:00:00Z" },
    { label: "anhducds", last_seen_at: "2026-01-01T00:00:00Z" }
  ];
  const bayGio = Date.parse("2026-01-01T00:00:30Z");
  const menu = dungMenu(ss, bayGio);
  assert.equal(menu.length, 2);
  assert.equal(menu[0].so, 1);
  assert.match(menu[0].dong, /1\) Ark/);
  assert.equal(menu[0].tuoi, "đang nối");
  assert.equal(dungMenu(ss, Date.parse("2026-01-01T00:10:00Z"))[0].tuoi, "im 10 phút");

  assert.equal(hieuLuaChon("2", menu), "anhducds", "chọn bằng số");
  assert.equal(hieuLuaChon("Ark", menu), "Ark", "gõ thẳng nhãn");
  assert.equal(hieuLuaChon("ark", menu), "Ark", "không phân biệt hoa thường");
  assert.equal(hieuLuaChon("anh", menu), "anhducds", "gõ thiếu mà chỉ một nhãn khớp");
  assert.equal(hieuLuaChon("9", menu), null, "số ngoài danh sách phải hỏi lại, không lấy bừa");
  assert.equal(hieuLuaChon("xyz", menu), null, "nhãn lạ phải hỏi lại");
  assert.equal(hieuLuaChon("", menu), null, "hai lựa chọn thì Enter suông KHÔNG được tự chọn");
  assert.equal(hieuLuaChon("", [menu[0]]), "Ark", "chỉ một profile thì Enter suông nhận nó");

  const nhapNhang = dungMenu([{ label: "ark-1" }, { label: "ark-2" }]);
  assert.equal(hieuLuaChon("ark", nhapNhang), null, "hai nhãn cùng tiền tố thì KHÔNG được đoán");

  console.log("chon-profile tự kiểm: 11/11 xanh");
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--tu-kiem")) return tuKiem();

  const pairing = docCo(argv, "pairing");
  const ra = docCo(argv, "ra");
  if (!pairing || !ra) { console.error("Thiếu --pairing hoặc --ra."); process.exit(3); }

  let sessions;
  try {
    const out = execFileSync("node", [CLI, "sessions", "--pairing", pairing,
      "--request-id", `chon-profile-${crypto.randomUUID()}`], { encoding: "utf8" });
    const j = JSON.parse(out);
    if (!j.ok) throw new Error(j.error?.code || "loi khong ro");
    sessions = j.result.sessions || [];
  } catch (e) {
    console.error(`Không hỏi được Bridge xem profile nào đang nối: ${e.message}`);
    console.error("Chrome đã mở chưa, extension đã bật chưa?");
    process.exit(3);
  }

  if (!sessions.length) {
    console.error("Không profile nào đang nối Bridge. Mở Chrome và bật extension rồi chạy lại.");
    process.exit(2);
  }

  const menu = dungMenu(sessions);
  if (menu.length === 1) {
    console.log(`Chỉ một profile đang nối: ${menu[0].nhan} — dùng luôn.`);
    fs.writeFileSync(ra, menu[0].nhan);
    return;
  }

  console.log("");
  console.log("  Profile Chrome đang nối Bridge:");
  for (const m of menu) console.log(m.dong);
  console.log("");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const hoi = (q) => new Promise((res) => rl.question(q, res));
  for (let lan = 0; lan < 3; lan += 1) {
    const chon = hieuLuaChon(await hoi(`  Chọn số 1-${menu.length}: `), menu);
    if (chon) {
      rl.close();
      console.log(`  -> ${chon}`);
      fs.writeFileSync(ra, chon);
      return;
    }
    console.log("  Không hiểu. Gõ đúng một con số trong danh sách.");
  }
  rl.close();
  console.error("Chưa chọn được sau 3 lần. Dừng.");
  process.exit(2);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
