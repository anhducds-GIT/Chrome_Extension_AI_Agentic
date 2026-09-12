/* kiem-ssot-ngay-nghi-smoke.mjs — ghim bộ soi phải tôn trọng sidecar ngày nghỉ.
 *
 * Đức chốt: ngày nghỉ đã xác nhận phải được ghi riêng để lượt sau không fetch lại. Fetcher đã
 * đọc `*.ngay-nghi.csv`; phép ghim này giữ cho `kiem-ssot.mjs` đọc cùng dấu đó, tránh một bên
 * bỏ qua còn một bên lại báo thiếu và kéo người vận hành quay về đúng ngày đã đóng. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { COT_MASTER } from "../luoc-do-master.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const BO_SOI = path.join(here, "..", "kiem-ssot.mjs");
const CRLF = "\r\n";
const BOM = String.fromCharCode(0xFEFF);
const o = (v) => '"' + String(v).replace(/"/g, '""') + '"';
const iNgay = COT_MASTER.indexOf("trade_date");
const iIsin = COT_MASTER.indexOf("isin");
const ISIN = Array.from({ length: 8 }, (_v, i) => `VN41I1G8000${i}`);

function hang(ngay, isin) {
  return COT_MASTER.map((_c, i) => (i === iNgay ? o(ngay) : i === iIsin ? o(isin) : o(""))).join(",");
}
function ngayDu(ngay) {
  return ISIN.map((isin) => hang(ngay, isin));
}
function ghiMaster(duong, hangs) {
  fs.writeFileSync(duong, BOM + COT_MASTER.map(o).join(",") + CRLF + hangs.join(CRLF) + CRLF, "utf8");
}
function ghiNgayNghi(master, ngay) {
  const duong = master.replace(/\.csv$/i, "") + ".ngay-nghi.csv";
  const head = ["trade_date", "ly_do", "ghi_nhan_luc"].map(o).join(",");
  const body = ngay.map((n) => [n, "KHONG_CO_PHIEN", "2026-09-12T00:00:00Z"].map(o).join(","));
  fs.writeFileSync(duong, BOM + [head, ...body].join(CRLF) + CRLF, "utf8");
}
function soi(master, den) {
  return execFileSync(process.execPath, [BO_SOI, master, den], { encoding: "utf8" });
}

const san = fs.mkdtempSync(path.join(os.tmpdir(), "hnx-soi-ngay-nghi-"));
try {
  const master = path.join(san, "HNX_PS_Ket_qua_giao_dich_SSOT.csv");
  ghiMaster(master, [...ngayDu("2026-08-28"), ...ngayDu("2026-09-04")]);
  ghiNgayNghi(master, ["2026-08-31", "2026-09-01", "2026-09-02"]);

  const ra = soi(master, "2026-09-04");
  assert.match(ra, /ngày nghỉ đã ghi : 3/, "bộ soi không thấy sidecar ngày nghỉ");
  assert.match(ra, /THIẾU HẲN.*: 2026-09-03/,
    "weekday thật sự thiếu và không nằm sidecar vẫn phải bị báo thiếu");

  const dongThieu = ra.split(/\r?\n/).find((x) => x.includes("THIẾU HẲN")) || "";
  for (const n of ["2026-08-31", "2026-09-01", "2026-09-02"]) {
    assert.ok(!dongThieu.includes(n), `${n} đã ghi KHONG_CO_PHIEN mà vẫn bị báo thiếu`);
  }

  console.log("kiem-ssot-ngay-nghi-smoke: DAT");
} finally {
  fs.rmSync(san, { recursive: true, force: true });
}