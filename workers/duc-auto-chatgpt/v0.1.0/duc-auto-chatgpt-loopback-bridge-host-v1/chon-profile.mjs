#!/usr/bin/env node
/* CHỌN PROFILE CHROME, RỒI XÁC NHẬN ĐANG Ở HỘI THOẠI NÀO — hai câu hỏi, một lượt hỏi.
 *
 * Gõ tay là chỗ dễ sai nhất trong cả quy trình: nhãn gõ lệch một ký tự thì Bridge nhận không
 * ra, và lỗi hiện ra muộn, sau khi đã chờ. Menu thì không gõ sai được, và nó cho thấy luôn
 * profile nào đang thật sự nối — thứ mà gõ tay không nói được.
 *
 * Danh sách do CHÍNH HOST trả lời (`bridge.sessions`), không phải do trang trả lời. Nên gọi
 * nó KHÔNG giành panel với một chuỗi đang chạy.
 *
 * BẮT ĐỊA CHỈ (`--ra-url`): sau khi chọn xong profile, hỏi `system.ping` xem tab của profile
 * ấy đang ở đâu, in ra, và cho xác nhận. Vì sao đáng có: bộ chạy không khai `--url` thì nó
 * ghim đúng tab đang mở — mở nhầm tab là gõ nhầm hội thoại, và cái đó không hoàn tác được.
 * Ping là cửa DUY NHẤT trả lời được khi tab chưa ở một hội thoại (`chat.read` từ chối bằng
 * `WRONG_SURFACE`), nên đây là chỗ duy nhất hỏi được câu này trước khi chạy.
 *
 * Dùng:
 *   node chon-profile.mjs --pairing "<đường dẫn>" --ra "<tệp ghi nhãn>" [--ra-url "<tệp ghi địa chỉ>"]
 *   node chon-profile.mjs --tu-kiem
 *
 * Mã thoát: 0 đã chọn · 2 không có profile nào / người bỏ cuộc · 3 không hỏi được host.
 * Không bắt được địa chỉ KHÔNG phải lỗi: tệp `--ra-url` vắng mặt, bộ chạy chạy như cũ.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
/* Mượn `hoiThoaiCua` của bộ chạy thay vì chép regex lần thứ ba. Nhập tệp đó KHÔNG chạy gì:
   nó có cửa `import.meta.url === process.argv[1]` ở cuối. */
import { hoiThoaiCua } from "./chuoi-reasoning.mjs";

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

/* Hiểu câu trả lời cho "dùng hội thoại này chứ". THUẦN, nên ghim được mà không cần Bridge.
 *   { url }        → ghim địa chỉ này
 *   { url: null }  → KHÔNG ghim, chạy như cũ (bộ chạy tự ghim theo tab ở lượt đọc đầu)
 *   { hoiLai }     → không hiểu, hỏi lại — KHÔNG đoán
 * Enter suông mà tab đang ở một hội thoại thì nhận nó; tab chưa ở hội thoại nào thì Enter là
 * "thôi, không ghim" chứ KHÔNG phải ghim một trang phóng — ghim trang phóng là ghim rác. */
export function hieuXacNhanUrl(traLoi, urlHienTai) {
  const t = String(traLoi ?? "").trim();
  if (!t) return { url: hoiThoaiCua(urlHienTai) ? urlHienTai : null };
  if (/^(bo|bỏ|-|khong|không)$/i.test(t)) return { url: null };
  return hoiThoaiCua(t) ? { url: t } : { hoiLai: true };
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

  /* Bắt địa chỉ. Mép chịu tải: Enter suông khi tab CHƯA ở hội thoại nào. Ghim trang phóng
     là ghim rác, và bộ chạy sẽ dừng ngay vòng sau với `DOI_HOI_THOAI` — một lỗi trông như
     lỗi hệ thống nhưng do chính lượt hỏi này đẻ ra. */
  const HT = "https://chatgpt.com/c/abc";
  assert.equal(hieuXacNhanUrl("", HT).url, HT, "Enter suông nhận hội thoại đang mở");
  assert.equal(hieuXacNhanUrl("", "https://chatgpt.com/").url, null, "trang phóng thì Enter là KHÔNG ghim");
  assert.equal(hieuXacNhanUrl("", null).url, null, "không hỏi được thì Enter là không ghim");
  assert.equal(hieuXacNhanUrl("https://chatgpt.com/c/xyz", HT).url, "https://chatgpt.com/c/xyz", "dán đè được");
  assert.equal(hieuXacNhanUrl("bo", HT).url, null, "gõ 'bo' là bỏ ghim, kể cả khi đang ở hội thoại");
  assert.equal(hieuXacNhanUrl("khong", HT).url, null);
  assert.equal(hieuXacNhanUrl("linh tinh", HT).hoiLai, true, "chữ lạ phải hỏi lại, không được ghim bừa");
  assert.equal(hieuXacNhanUrl("https://chatgpt.com/", HT).hoiLai, true, "dán trang phóng cũng phải hỏi lại");
  assert.equal(hieuXacNhanUrl("https://chatgpt.com/g/g-p-duan/c/abc", null).url, "https://chatgpt.com/g/g-p-duan/c/abc",
    "hội thoại trong Project vẫn là hội thoại");

  console.log("chon-profile tự kiểm: 20/20 xanh");
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
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const hoi = (q) => new Promise((res) => rl.question(q, res));

  let chon = null;
  if (menu.length === 1) {
    chon = menu[0].nhan;
    console.log(`Chỉ một profile đang nối: ${chon} — dùng luôn.`);
  } else {
    console.log("");
    console.log("  Profile Chrome đang nối Bridge:");
    for (const m of menu) console.log(m.dong);
    console.log("");
    for (let lan = 0; lan < 3 && !chon; lan += 1) {
      chon = hieuLuaChon(await hoi(`  Chọn số 1-${menu.length}: `), menu);
      if (!chon) console.log("  Không hiểu. Gõ đúng một con số trong danh sách.");
    }
    if (!chon) {
      rl.close();
      console.error("Chưa chọn được sau 3 lần. Dừng.");
      process.exit(2);
    }
    console.log(`  -> ${chon}`);
  }
  fs.writeFileSync(ra, chon);

  const raUrl = docCo(argv, "ra-url");
  if (raUrl) await batUrl({ pairing, target: chon, raUrl, hoi });
  rl.close();
}

/* BẮT ĐỊA CHỈ HỘI THOẠI. Hỏi `system.ping` — cửa duy nhất còn trả lời khi tab chưa ở một
   hội thoại — rồi cho người xác nhận. KHÔNG bắt được thì im lặng bỏ qua: bộ chạy chạy như
   cũ (tự ghim theo tab ở lượt đọc đầu). Đây là một lớp CHẮC HƠN, không phải một cửa mới bắt
   buộc phải qua — dựng một cửa bắt buộc trên một RPC có thể hết giờ là tự chặn đường mình. */
async function batUrl({ pairing, target, raUrl, hoi }) {
  let url = null;
  try {
    const out = execFileSync("node", [CLI, "ping", "--pairing", pairing, "--target", target,
      "--request-id", `chon-profile-ping-${crypto.randomUUID()}`], { encoding: "utf8" });
    const j = JSON.parse(out);
    url = j?.ok ? j.result?.chatgpt?.url || null : null;
  } catch { /* hỏi không được thì vẫn cho dán tay */ }

  console.log("");
  if (hoiThoaiCua(url)) console.log(`  Tab đang ở hội thoại: ${url}`);
  else if (url) console.log(`  Tab đang ở: ${url} — CHƯA phải một hội thoại (chat mới chưa gõ câu nào?).`);
  else console.log("  Không hỏi được tab đang ở đâu.");

  for (let lan = 0; lan < 3; lan += 1) {
    const r = hieuXacNhanUrl(await hoi("  Enter = dùng địa chỉ này · dán địa chỉ khác · gõ 'bo' = không ghim: "), url);
    if (r.hoiLai) { console.log("  Địa chỉ phải có dạng chatgpt.com/c/<id>."); continue; }
    if (r.url) { fs.writeFileSync(raUrl, r.url); console.log(`  -> ghim hội thoại ${hoiThoaiCua(r.url)}`); }
    else console.log("  -> không ghim; bộ chạy sẽ lấy đúng tab đang mở ở lượt đọc đầu.");
    return;
  }
  console.log("  Bỏ qua phần ghim hội thoại.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
