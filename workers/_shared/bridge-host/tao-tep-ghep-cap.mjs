#!/usr/bin/env node
/* tao-tep-ghep-cap.mjs — sinh MỘT tệp ghép cặp cho một máy chủ Bridge.
 *
 * ══ VÌ SAO CÓ TỆP NÀY (H-06) ══
 *
 * Trước 08/09, hai extension `Duc Scouter` và `HNX Fetch` dùng **chung một tệp ghép cặp**, nên
 * cả hai cùng cắm vào một máy chủ và mọi lượt gọi trả `TARGET_AMBIGUOUS`. Đã đi vòng bằng cờ
 * `--target`, nhưng đó là một chuỗi 45 ký tự **đổi mỗi lần nạp lại extension** — không ai nhớ nổi.
 *
 * Cách đúng là mỗi extension một tệp, **cổng riêng**. Nhưng tới hôm nay không có đường nào TẠO
 * ra một tệp như thế: cả hai gói sống đều chỉ biết ĐỌC tệp có sẵn, còn bộ sinh thì nằm trong ba
 * gói đã đóng băng. Tệp này lấp đúng chỗ đó.
 *
 * ══ ĐẶT Ở `_shared` LÀ CÓ CHỦ Ý ══
 *
 * Nó phải sinh ra thứ mà `validatePairing()` chấp nhận, và hàm đó ở ngay cạnh
 * (`bridge-host-core.mjs`). Để bộ sinh ở một gói thì gói kia sẽ chép — và chép là đúng bệnh mà
 * giới hạn ② của `AGENTS.md` cấm. Ở đây nó **tự kiểm bằng chính hàm mà máy chủ sẽ dùng**, nên
 * không thể sinh ra tệp mà máy chủ từ chối.
 *
 * ══ HAI CHỐT AN TOÀN, ĐỪNG GỠ ══
 *
 * ⑴ **Từ chối ghi vào trong kho mã.** Tệp này chở TOKEN. Luật gốc: không bao giờ để token vào
 *    repo. Không chặn ở đây thì một lần gõ nhầm đường dẫn là token nằm trong git mãi mãi —
 *    và xoá khỏi lịch sử git thì đắt hơn nhiều so với việc chặn ngay từ đầu.
 * ⑵ **Không bao giờ ghi đè tệp đã có.** Ghi đè một tệp ghép cặp đang dùng là làm chết kết nối
 *    của một extension đang chạy, mà người gõ lệnh thì không hề biết. Muốn tệp mới thì xoá tệp
 *    cũ bằng tay — một thao tác có ý thức.
 *
 * ══ DÙNG ══
 *
 *   node tao-tep-ghep-cap.mjs --ra "<đường dẫn .json NGOÀI repo>" [--cong 32152]
 *
 * Không đưa `--cong` thì nó tự chọn một cổng còn trống. Sinh xong, đưa tệp cho máy chủ của gói
 * tương ứng, rồi chọn đúng tệp đó trong bảng bên của extension.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePairing } from "./bridge-host-core.mjs";

const HOST = "127.0.0.1";

/* ---- NHÀ CHUNG CỦA MỌI THỨ THUỘC BRIDGE (Đức chốt 08/09) -----------------
 *
 * Mọi tệp ghép cặp, mọi bộ khởi động, mọi vùng ghi của MỌI extension đều nằm dưới đây, mỗi
 * gói một thư mục con mang đúng tên gói:
 *
 *   C:\WORKING ZONE\Chrome Extension Bridge\<tên-gói>\
 *       <tên-gói>-bridge-pairing-v1.json   ← tệp ghép cặp (CÓ TOKEN)
 *       START-BRIDGE_<Tên>.cmd  +  .ps1    ← bộ khởi động
 *       du-lieu-ra\  (hoặc du-lieu\)       ← VÙNG GHI, luôn là thư mục CON
 *
 * Vì sao ghim vào MÃ chứ không chỉ vào tài liệu: quy ước này đã tồn tại từ trước, và ngày
 * 08/09 chính tôi vẫn đặt một tệp ghép cặp vào `C:\Users\<user>\HNX-Bridge\` vì không có gì
 * nhắc. Đức nói lỗi này gặp vài lần rồi. Một quy ước chỉ nằm trong văn xuôi thì phụ thuộc
 * vào việc AI có đọc đúng trang đó không — nên nó phải là GIÁ TRỊ MẶC ĐỊNH của công cụ.
 *
 * Vùng ghi CỐ Ý là thư mục con: `file.read` đọc được mọi tệp dưới vùng ghi, nên trỏ vùng ghi
 * vào chính thư mục gói nghĩa là token đọc được qua dây. Máy chủ sẽ từ chối khởi động. */
/* ĐỌC TỪ BẢN ĐỒ THƯ MỤC, không gõ cứng ở đây.
 *
 * `.repo-structure.json` là bản đồ thư mục của repo, và luật này khai ở khối `thu_muc_ngoai_repo`.
 * Gõ cứng ở đây nữa là dựng bản sao thứ hai của một luật — và repo này đã trả giá đúng chỗ đó:
 * ngày 02/09 hai bản của một danh sách miễn trừ trả hai câu khác nhau cho cùng một tệp.
 *
 * Thiếu khai báo thì NÉM, không đoán một đường mặc định: một bộ sinh tự bịa đường dẫn là đúng
 * cái bệnh khối này sinh ra để chữa. */
function docNhaBridge() {
  const ban = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".repo-structure.json");
  let khai;
  try {
    khai = JSON.parse(fs.readFileSync(ban, "utf8"))?.thu_muc_ngoai_repo?.bridge?.duong_dan;
  } catch (loi) {
    throw new Error("Khong doc duoc ban do thu muc " + ban + ": " + String(loi?.message || loi));
  }
  if (typeof khai !== "string" || !khai.trim()) {
    throw new Error("Ban do thu muc thieu thu_muc_ngoai_repo.bridge.duong_dan — khai o " + ban + ", dung go cung vao ma.");
  }
  return khai;
}

export const NHA_BRIDGE = docNhaBridge();

/** Đường dẫn tệp ghép cặp ĐÚNG QUY ƯỚC cho một gói. Dùng cái này, đừng tự đặt chỗ khác. */
export function duongGhepCapChuan(tenGoi) {
  return path.join(NHA_BRIDGE, tenGoi, tenGoi + "-bridge-pairing-v1.json");
}

/** Token 32 byte ngẫu nhiên, dạng **base64url** — đúng hình dạng `validatePairing` đòi.
 *  Bản đầu của tệp này dùng hex và bị chính lượt tự kiểm bên dưới
 *  chặn lại; giữ ghi chú này để lần sau không ai "sửa" ngược về hex cho dễ đọc.
 *  `crypto.randomBytes` chứ không phải `Math.random`. */
export function sinhToken() {
  return crypto.randomBytes(32).toString("base64url");
}

/** Dựng phong bì tệp ghép cặp, rồi TỰ KIỂM bằng chính hàm máy chủ dùng. */
export function dungTepGhepCap(cong, token = sinhToken()) {
  const tep = {
    schema_version: 1,
    host: HOST,
    port: cong,
    http_url: `http://${HOST}:${cong}/v1/rpc`,
    websocket_url: `ws://${HOST}:${cong}/v1/extension`,
    token
  };
  validatePairing(tep);   /* ném nếu sai — thà chết ở đây còn hơn chết lúc Đức bật máy chủ */
  return tep;
}

/** Cổng đó có ai đang nghe không. Chỉ để KHUYÊN, không phải để bảo đảm: giữa lượt đo và lượt
 *  bật máy chủ vẫn có khe. Đo được thì báo sớm; không đo được thì đừng đoán. */
export function congDangBan(cong) {
  return new Promise((xong) => {
    const s = net.createServer();
    s.once("error", () => xong(true));
    s.once("listening", () => s.close(() => xong(false)));
    s.listen(cong, HOST);
  });
}

/* Gỡ tiền tố đường dẫn MỞ RỘNG của Windows.
 *
 * `\\?\C:\...` và `C:\...` trỏ CÙNG một chỗ trên đĩa, nhưng `path.relative` coi chúng là hai
 * vũ trụ khác nhau và trả về một đường TUYỆT ĐỐI — nên phép so "nằm trong repo" luôn trả false.
 * Codex tìm ra 08/09; tôi đo lại và một tệp CÓ TOKEN thật sự rơi vào gốc repo qua đường này. */
function goTienToDaiWindows(p) {
  const S = String.fromCharCode(92);
  const UNC = S + S + "?" + S + "UNC" + S;
  const DAI = S + S + "?" + S;
  if (p.startsWith(UNC)) return S + S + p.slice(UNC.length);
  if (p.startsWith(DAI)) return p.slice(DAI.length);
  return p;
}

/* Giải liên kết (junction / symlink) tới nơi THẬT. Một junction trỏ vào repo thì đường dẫn đi
 * qua nó nhìn như nằm ngoài, mà ghi vào đó là ghi thẳng vào repo. `path.resolve` KHÔNG giải
 * liên kết. Codex chỉ ra 08/09.
 *
 * Tệp đích chưa tồn tại là chuyện bình thường (ta sắp tạo nó), nên giải THƯ MỤC CHA rồi ghép
 * lại tên tệp. Giải không được thì trả nguyên đường đã chuẩn hoá — thà so hụt một ca hiếm còn
 * hơn ném ra giữa một lượt kiểm an toàn. */
function duongThat(p) {
  let chuan = path.resolve(goTienToDaiWindows(String(p)));
  /* Giải tới TỔ TIÊN TỒN TẠI SÂU NHẤT rồi ghép lại phần đuôi.
   *
   * Bản đầu chỉ thử chính nó rồi thử thư mục cha, và điều đó làm hai đường được giải tới hai
   * MỨC khác nhau: một cái ra tên dài thật (`MAYTEST_12`), cái kia còn tên ngắn 8.3
   * (`MAYTES~1`). So hai dạng khác nhau của cùng một chỗ thì kết quả vô nghĩa — phép ghim bắt
   * được đúng chỗ này. Đi ngược lên tới khi chạm một chỗ có thật thì cả hai luôn quy về một dạng. */
  const duoi = [];
  for (;;) {
    try {
      const that = fs.realpathSync.native(chuan);
      return duoi.length ? path.join(that, ...duoi.reverse()) : that;
    } catch (_error) {
      const cha = path.dirname(chuan);
      if (cha === chuan) return path.resolve(goTienToDaiWindows(String(p)));   /* tới gốc ổ đĩa mà vẫn không có */
      duoi.push(path.basename(chuan));
      chuan = cha;
    }
  }
}

/** Đường dẫn có nằm trong kho mã không — chốt ⑴.
 *
 *  So bằng ĐOẠN đường dẫn, không bằng tiền tố chuỗi. Bản đầu dùng `quanHe.startsWith("..")`,
 *  và nó sai với một tệp tên `..secret.json` nằm NGAY TRONG repo: `path.relative` trả về
 *  `..secret.json`, chuỗi đó bắt đầu bằng ".." nên hàm kết luận "nằm ngoài". Codex tìm ra 08/09.
 *
 *  Ba lỗ cùng một gốc — so đường dẫn mà không chuẩn hoá đủ sâu: tiền tố mở rộng, liên kết,
 *  và tên tệp bắt đầu bằng dấu chấm kép. */
export function namTrongRepo(duong, gocRepo) {
  const a = duongThat(duong);
  const b = duongThat(gocRepo);
  const quanHe = path.relative(b, a);
  if (quanHe === "") return true;
  if (path.isAbsolute(quanHe)) return false;
  /* Bộ tách DỰNG bằng String.fromCharCode, không gõ thẳng dấu gạch ngược vào chuỗi mẫu: bản đầu
   * viết tay và dấu gạch ngược bị nuốt mất, còn lại một bộ tách CHỈ theo gạch xuôi. Trên
   * Windows `..\cho-khac\a.json` không tách được, đoạn đầu là CẢ chuỗi, nên phép so `!== ".."`
   * luôn đúng và hàm trả `true` cho mọi đường nằm ngoài. Phép ghim bắt được. */
  const NGAN = new RegExp("[" + String.fromCharCode(92, 92) + "/]");
  return quanHe.split(NGAN)[0] !== "..";
}

async function main(argv) {
  const co = (ten) => {
    const i = argv.indexOf(`--${ten}`);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
  };
  /* HAI cách gọi, và cách ĐẦU là cách nên dùng:
   *   --goi hnx-fetch    → tự đặt đúng nhà chung, đúng tên tệp theo quy ước
   *   --ra <đường dẫn>   → tự chọn chỗ, dùng khi có lý do riêng
   * Có `--goi` thì không cần `--ra`. */
  const tenGoi = co("goi");
  const duongRa = co("ra") ?? (tenGoi ? duongGhepCapChuan(tenGoi) : undefined);
  if (!duongRa) {
    process.stderr.write("Dùng một trong hai:" + String.fromCharCode(10));
    process.stderr.write("  node tao-tep-ghep-cap.mjs --goi <tên-gói>            (khuyên dùng — tự đặt đúng nhà chung)" + String.fromCharCode(10));
    process.stderr.write('  node tao-tep-ghep-cap.mjs --ra "<đường dẫn .json NGOÀI kho mã>"' + String.fromCharCode(10));
    process.stderr.write("  thêm --cong <số> nếu muốn chỉ định cổng." + String.fromCharCode(10));
    process.stderr.write("Nhà chung của Bridge: " + NHA_BRIDGE + String.fromCharCode(10));
    return 2;
  }

  /* Gốc repo = ba cấp trên `_shared/bridge-host/`.
   *
   * DÙNG `fileURLToPath`, KHÔNG tự gỡ `URL.pathname`. Bản đầu tự gỡ và **chốt ⑴ hỏng CÂM**:
   * trên Windows `pathname` là `/C:/WORKING%20ZONE/...` — dấu cách còn ở dạng `%20`, nên đường
   * dẫn dựng ra không khớp thư mục thật, `namTrongRepo` trả `false`, và lượt thử 08/09 đã ghi
   * một tệp CÓ TOKEN thẳng vào gốc repo. Một chốt hỏng câm tệ hơn không có chốt: không có thì
   * người ta còn cẩn thận. */
  const gocRepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  if (namTrongRepo(duongRa, gocRepo)) {
    process.stderr.write("TU_CHOI: tệp ghép cặp chở TOKEN, không được nằm trong kho mã.\n");
    process.stderr.write(`  đường dẫn bạn đưa: ${path.resolve(duongRa)}\n`);
    process.stderr.write(`  kho mã:            ${gocRepo}\n`);
    process.stderr.write("  Đặt nó ở một thư mục riêng ngoài repo, ví dụ cạnh thư mục dữ liệu của bạn.\n");
    return 3;
  }
  if (fs.existsSync(duongRa)) {
    process.stderr.write(`TU_CHOI: tệp đã tồn tại: ${path.resolve(duongRa)}\n`);
    process.stderr.write("  Ghi đè là làm chết kết nối của extension đang dùng nó. Xoá tay rồi chạy lại.\n");
    return 3;
  }
  /* Dùng `--goi` thì thư mục con của gói được tạo hộ — đó là quy ước, không phải phỏng đoán.
   * Dùng `--ra` thì KHÔNG tự tạo: gõ nhầm một ký tự mà tự tạo thư mục là đặt token ở một chỗ
   * không ai nhìn tới. */
  if (tenGoi && !co("ra")) {
    fs.mkdirSync(path.dirname(path.resolve(duongRa)), { recursive: true });
  }
  const thuMuc = path.dirname(path.resolve(duongRa));
  if (!fs.existsSync(thuMuc)) {
    process.stderr.write(`TU_CHOI: thư mục không tồn tại: ${thuMuc}\n`);
    return 3;
  }

  let cong = co("cong") === undefined ? undefined : Number(co("cong"));
  if (cong !== undefined && (!Number.isInteger(cong) || cong < 1024 || cong > 65535)) {
    process.stderr.write("TU_CHOI: --cong phải là số nguyên từ 1024 đến 65535.\n");
    return 3;
  }
  if (cong === undefined) {
    for (const thu of [32152, 32153, 32154, 32155, 32156]) {
      if (!(await congDangBan(thu))) { cong = thu; break; }
    }
    if (cong === undefined) {
      process.stderr.write("TU_CHOI: không tìm được cổng trống trong 32152–32156. Đưa --cong <số>.\n");
      return 3;
    }
  } else if (await congDangBan(cong)) {
    process.stderr.write(`CANH_BAO: cổng ${cong} đang có người nghe. Vẫn ghi, nhưng máy chủ sẽ không bật được.\n`);
  }

  const tep = dungTepGhepCap(cong);
  /* Cờ `wx`: hệ điều hành TỪ CHỐI nếu tệp đã tồn tại. Lượt `existsSync` ở trên chỉ để đưa ra
   * một câu dễ hiểu; nó KHÔNG phải chốt, vì giữa lượt hỏi và lượt ghi có một khe. Chốt thật là
   * cờ này — một lượt ghi độc quyền, không có khe nào ở giữa. Codex chỉ ra 08/09.
   *
   * `mode` trên Windows gần như không đổi được quyền thật (quyền đến từ DACL kế thừa của thư
   * mục cha). Giữ lại vì nó có tác dụng trên Linux/macOS, nhưng ĐỪNG coi nó là lớp bảo vệ trên
   * máy Đức — lớp bảo vệ ở đây là "tệp không nằm trong repo, không nằm trong vùng ghi". */
  try {
    fs.writeFileSync(path.resolve(duongRa), JSON.stringify(tep, null, 2) + "\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
  } catch (loi) {
    if (loi && loi.code === "EEXIST") {
      process.stderr.write("TU_CHOI: tệp đã tồn tại: " + path.resolve(duongRa) + String.fromCharCode(10));
      return 3;
    }
    throw loi;
  }
  process.stdout.write(`Đã tạo tệp ghép cặp: ${path.resolve(duongRa)}\n`);
  process.stdout.write(`  cổng: ${cong}\n`);
  process.stdout.write("  Bước tiếp: đưa tệp này cho máy chủ Bridge của gói, rồi CHỌN ĐÚNG tệp đó trong bảng bên.\n");
  process.stdout.write("  Token nằm trong tệp — đừng chép nó vào chat, vào repo, hay vào tài liệu.\n");
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith("tao-tep-ghep-cap.mjs")) {
  process.exit(await main(process.argv.slice(2)));
}
