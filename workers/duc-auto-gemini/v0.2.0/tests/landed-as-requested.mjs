// Test ghim: "So cai noi that ve chuyen file da ghi o dau."
//
// Hai loi, mot cho, deu o duong ghi qua Chrome Downloads.
//
// (1) `item.filename` la duong dan TUYET DOI cua Chrome; `requestedFilename` la
//     duong dan TUONG DOI dung dau gach cheo xuoi ma ta xin. Chinh file
//     `background.js` da biet dieu do -- nhanh collisionPolicy "fail" doi gach
//     cheo roi so bang endsWith() dung vi ly do nay. Nen phep so `===` cu KHONG
//     BAO GIO dung duoc mot lan nao, va duong ghi nay khong the nao bao
//     "written". Moi lan luu deu bi ghi so la "uniquified", hoac duoi chinh
//     sach ghi de thi la "overwritten".
//
// (2) "overwritten" la nua gay hai. No noi voi so cai va nhat ky kiem toan rang
//     bang chung cu cua Duc DA BI THAY THE -- tren nhung lan ghi dau tien, moi
//     lan. Va no khong chi dat sai nguong, no la thu KHONG BIET DUOC o day: mot
//     luot tai xong duoi conflictAction:"overwrite" chi chung minh Chrome DUOC
//     PHEP thay file, khong chung minh co file de ma thay.
//
// Nhanh nay DA chot dung nguyen tac do -- nhung chi cho MOT trong hai duong
// ghi. `v1-output-controls-core.mjs` ghim "ghi lan dau thi bao written, khong
// bao overwritten" cho bo ghi thu muc, vi bo do do duoc truoc khi ghi. Duong
// Downloads khong do duoc, nen no chi duoc phep khai dung thu no quan sat.
//
// Va `landed_as_requested` tra loi CAU HOI KHAC: khong phai "ten co con nguyen"
// ma "ca duong dan tuong doi co con nguyen". Mot file bi Chrome am tham day ra
// thu muc Downloads goc thi VAN giu nguyen ten -- write_outcome van doc la
// "written" -- trong khi no khong nam o cho ke hoach da noi.

import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const background = fs.readFileSync(new URL("background.js", root), "utf8");
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");

/* ---- Hai ham thuan, chay that chu khong doc chuoi ------------------------- */

const picked = /function downloadLeaf[\s\S]*?\n}\n\nfunction pathTailMatches[\s\S]*?\n}/.exec(background);
assert.ok(picked, "background.js con dung mot cho hai ham nay, ke nhau");
const scope = {};
new Function("exports", `${picked[0]}\nexports.downloadLeaf = downloadLeaf; exports.pathTailMatches = pathTailMatches;`)(scope);

const B = String.fromCharCode(92);
const req = "Duc Auto Gemini/J001.png";
const dungCho = ["C:", "Users", "Duc", "Downloads", "Duc Auto Gemini", "J001.png"].join(B);
const rotRaGoc = ["C:", "Users", "Duc", "Downloads", "J001.png"].join(B);
const biDoiTen = ["C:", "Users", "Duc", "Downloads", "Duc Auto Gemini", "J001 (1).png"].join(B);

/* Chot ha cua loi (1): duong dan tuyet doi KHAC han chuoi da xin, nen phep so
   `===` cu tra false o ca ba ca -- ke ca ca dung nhat. */
assert.notEqual(dungCho, req, "duong dan Chrome tra ve khong bao gio bang chuoi da xin -- day la ly do phep so cu chet");

assert.equal(scope.downloadLeaf(dungCho), scope.downloadLeaf(req), "ghi dung cho thi ten con nguyen -> written");
assert.equal(scope.downloadLeaf(rotRaGoc), scope.downloadLeaf(req), "bi day ra goc thi TEN VAN NGUYEN -- write_outcome mot minh khong thay gi");
assert.notEqual(scope.downloadLeaf(biDoiTen), scope.downloadLeaf(req), "bi doi ten thanh (1) thi khong con la written");

assert.equal(scope.pathTailMatches(dungCho, req), true, "dung cho thi landed_as_requested = true");
assert.equal(scope.pathTailMatches(rotRaGoc, req), false, "bi day ra thu muc Downloads goc -> landed_as_requested = false. DAY la ca ma truong nay sinh ra de bat");
assert.equal(scope.pathTailMatches(biDoiTen, req), false, "bi doi ten thi cung khong con dung cho");
assert.equal(scope.pathTailMatches("", req), false, "thieu du lieu thi khai false, khong doan");
assert.equal(scope.pathTailMatches(dungCho, ""), false, "thieu du lieu thi khai false, khong doan");
assert.equal(scope.pathTailMatches(dungCho.toUpperCase(), req), true, "Windows khong phan biet hoa thuong o duong dan");

/* ---- Cho ghi so: hai truong phai co, va "overwritten" phai bien mat -------- */

assert.match(
  background,
  /write_outcome: writeOutcome, landed_as_requested: pathTailMatches\(item\.filename, requestedFilename\)/,
  "duong Downloads khai ca hai truong"
);
assert.match(
  background,
  /downloadLeaf\(item\.filename\) === downloadLeaf\(requestedFilename\) \? "written" : "uniquified"/,
  "so bang phan duoi ten, khong so ca duong dan"
);
/* Cam theo DANG SINH RA GIA TRI, khong cam theo chu.
   Ban dau day la `doesNotMatch(/"overwritten"/)` va no bat oan chinh doan chu
   thich giai thich vi sao khong duoc dung tu do. Mot phep kiem bat oan se bi
   nguoi sau noi long, roi mat rang. Nen hoi dung ba dang co the GAN duoc gia
   tri, va de van xuoi yen. */
for (const dang of [/\?\s*"overwritten"/, /:\s*"overwritten"/, /=\s*"overwritten"/]) {
  assert.doesNotMatch(
    background,
    dang,
    'duong Downloads KHONG duoc SINH RA "overwritten": mot luot tai xong duoi chinh sach ghi de chi chung minh Chrome DUOC PHEP thay file, khong chung minh co file de ma thay'
  );
}

/* Chieu nguoc lai -- "bo ghi thu muc VAN duoc phep noi overwritten, vi no do
   duoc truoc khi ghi" -- CO Y khong ghim o day. `v1-output-controls-core.mjs`
   da canh dung cho do bang HANH VI THAT (chay bo ghi tren mot thu muc gia:
   dong 40 doi "overwritten" khi co file cu, dong 44 doi "written" khi ghi lan
   dau). Cheo them mot phep kiem CHUOI o day chi hoi "chu do con ton tai
   khong" -- mot cau hoi khong bao gio do duoc, nen no khong bao ve gi ma van
   bat moi phien sau phai doc. Da thu that: dot bien xoa mot trong hai cho
   trong file do van XANH qua phep kiem chuoi, va DO qua phep kiem hanh vi. */

/* ---- So cai phai cho Duc thay ------------------------------------------- */

assert.match(
  sidepanel,
  /landed_as_requested=\$\{accepted\.landed_as_requested === undefined \? "unknown" : String\(Boolean\(accepted\.landed_as_requested\)\)\}/,
  'dong OUTPUT_SAVED khai landed_as_requested, va "unknown" khac "false" -- bo ghi thu muc khong tra truong nay'
);

console.log("landed as requested: PASS");
