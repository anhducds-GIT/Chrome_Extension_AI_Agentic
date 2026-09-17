// B-101 · Nút ở mục "3. OUTPUT DESTINATION" ghi "Change Folder" nhưng bấm vào
// chỉ xin lại quyền cho đúng thư mục đang gắn — hộp chọn không bao giờ mở ra.
// Gốc lỗi: CHỮ trên nút tính ở `renderOutput`, VIỆC nút làm tính ở
// `choosePrimaryDestination`, hai nơi không biết nhau. Bộ ghim này giữ cho hai
// thứ đó cùng đọc một hàm thuần.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const base = new URL("../", import.meta.url);
const source = fs.readFileSync(new URL("sidepanel.js", base), "utf8");
const semanticsSource = fs.readFileSync(new URL("sidepanel-ui-semantics.js", base), "utf8");
const context = vm.createContext({});
vm.runInContext(semanticsSource, context);
const ui = context.DacSidepanelUiSemantics;

let so = 0;
const kiem = (dieu, vi) => { assert.ok(dieu, vi); so += 1; };

// ⑴ Đã gắn handle sống ⇒ bấm là ĐỔI, tuyệt đối không đi đường xin-lại-quyền.
const daGan = ui.folderButtonIntent("authorized", { kind: "directory", handle: {}, label: "Pilot-09" });
kiem(daGan.label === "Change Folder", "đã gắn thư mục thì nút phải ghi Change Folder");
kiem(daGan.reauthorizeFirst === false, "ĐÂY LÀ LỖI B-101: nút Change Folder không được nuốt cú bấm vào đường xin lại quyền");

// ⑵ Quyền đã mất ⇒ xin lại là đúng việc, đỡ cho Đức một vòng chọn thư mục.
const matQuyen = ui.folderButtonIntent("permission_required", { kind: "directory", handle: {}, label: "Pilot-09" });
kiem(matQuyen.label === "Re-authorize", "mất quyền thì nút phải ghi Re-authorize");
kiem(matQuyen.reauthorizeFirst === true, "mất quyền mà không xin lại thì mất luôn cái lợi của B-53");

// ⑶ Vừa nạp lại, phiên chưa cầm handle nào (handle vẫn nằm trong IndexedDB).
const chuaGan = ui.folderButtonIntent(undefined, { kind: "directory", handle: null, label: "chưa gắn" });
kiem(chuaGan.label === "Choose Folder", "chưa cầm handle thì nút phải ghi Choose Folder");
kiem(chuaGan.reauthorizeFirst === true, "B-53: lần bấm đầu sau khi nạp lại vẫn phải thử xin lại quyền trước");

// ⑷' Codex vòng 5 bắt được một lời NÓI DỐI: phiên chưa gắn mà kho vẫn còn một
// thư mục thì nút ghi "Choose Folder", bấm vào lại gắn thẳng thư mục cũ, không
// cho chọn gì — đúng bản chất B-101 ở một ca khác. Nay nhãn nói đúng việc.
const daNho = ui.folderButtonIntent(undefined, { kind: "directory", handle: null, label: "chưa gắn" }, "Pilot-09");
kiem(daNho.label === "Dùng lại: Pilot-09", `còn thư mục đã nhớ thì nút phải khai tên nó ra (thấy "${daNho.label}")`);
kiem(daNho.reauthorizeFirst === true, "và nó đúng là sẽ dùng lại thư mục đó");
// Đã gắn rồi thì tên đã nhớ KHÔNG được lấn — bấm là đổi.
const daGanCoNho = ui.folderButtonIntent("authorized", { kind: "directory", handle: {}, label: "Pilot-09" }, "Pilot-09");
kiem(daGanCoNho.label === "Change Folder" && daGanCoNho.reauthorizeFirst === false, "đã gắn thì tên đã nhớ không được lấn quyền đổi");

// ⑷ Đích là Chrome Downloads. Codex soát chéo vòng 4 bảo ca này phải là
// `reauthorizeFirst: false`; **tôi không theo, và nói rõ vì sao**: bấm nút chọn
// thư mục trong lúc đang ở chế độ Downloads chính là lời khai "tôi muốn chuyển
// sang thư mục riêng", nên thử thư mục đã nhớ trước là đúng việc — y hệt ca
// chưa gắn. `reauthorizeSole()` không có hồ sơ nào thì trả rỗng, không tốn gì.
// Ghim giá trị `true` vì nó là giá trị ĐÃ SHIP có chủ đích, không phải vì Codex
// nói thế.
const tai = ui.folderButtonIntent(undefined, { kind: "downloads", folder: "Duc Auto ChatGPT" });
kiem(tai.label === "Choose Folder", "chế độ Downloads chưa gắn thư mục nào");
kiem(tai.reauthorizeFirst === true, "ở chế độ Downloads, bấm nút là muốn chuyển sang thư mục riêng — vẫn thử thư mục đã nhớ trước");

// ⑸ Nhãn nút chỉ được gán ở MỘT chỗ, và chỗ đó phải đọc `folderButtonIntent`.
// Hai phép đếm này phân biệt được hai nhánh: viết tay lại cái ternary cũ vẫn
// giữ số gán bằng 1 nhưng làm phép thứ hai đổ. Cố ý KHÔNG dò chuỗi
// "Change Folder" — chú thích và câu báo cho Đức cũng chứa chuỗi đó, dò như thế
// là tự khớp văn của chính mình.
kiem(
  (source.match(/els\.destinationFolderBtn\.textContent =/g) || []).length === 1,
  "đúng một chỗ gán nhãn cho nút chọn thư mục"
);
// Ghim ĐỦ BA đối số, không phải `[^)]*`: bỏ riêng `state.thuMucDaNho` ở đây thì
// nhãn tụt về "Choose Folder" trong khi hành vi vẫn dùng thư mục cũ — đúng lời
// nói dối mà vòng soát 5 vừa gỡ. Đột biến M17 lọt qua phép lỏng, nên siết lại.
kiem(
  (source.match(/els\.destinationFolderBtn\.textContent = window\.DacSidepanelUiSemantics\.folderButtonIntent\(permission, values\.image, state\.thuMucDaNho\)\.label;/g) || []).length === 1,
  "chỗ gán nhãn phải đọc folderButtonIntent với đủ ba đối số"
);

// ⑹ `reauthorizeSole()` chỉ được gọi bên trong nhánh `reauthorizeFirst`.
const soGoiXinLai = (source.match(/DacOutputProfiles\.reauthorizeSole\(\)/g) || []).length;
kiem(soGoiXinLai === 1, `đúng một lời gọi reauthorizeSole (thấy ${soGoiXinLai})`);
const nhanh = source.match(/if \(yDinh\.reauthorizeFirst\) \{[\s\S]*?\n {4}\}/);
kiem(Boolean(nhanh), "phải có nhánh `if (yDinh.reauthorizeFirst) { … }` bao lấy đường tắt");
kiem(
  nhanh[0].includes("DacOutputProfiles.reauthorizeSole()"),
  "lời gọi reauthorizeSole phải nằm TRONG nhánh đó — để ngoài là lỗi B-101 quay lại nguyên vẹn"
);
kiem(
  /const yDinh = window\.DacSidepanelUiSemantics\.folderButtonIntent\(\s*state\.outputProfileState\?\.state,\s*state\.outputSettings\?\.image,\s*state\.thuMucDaNho\s*\)/.test(source),
  "ý định phải dựng từ ĐÚNG ba giá trị mà renderOutput dùng để vẽ nhãn"
);
// Tên thư mục đã nhớ phải được ghi lại đúng nơi kho hồ sơ vừa được liệt kê, và
// chỉ khi có ĐÚNG MỘT hồ sơ — cùng luật với `reauthorizeSole()`.
kiem(
  (source.match(/state\.thuMucDaNho = profiles\?\.length === 1 \?/g) || []).length === 1,
  "tên thư mục đã nhớ chỉ ghi khi kho còn đúng một hồ sơ"
);


/* ---- ⑺ HÀNH VI: cắt `choosePrimaryDestination()` ĐÃ SHIP ra chạy thật --------
   Codex soát chéo 17/09 bác bộ ghim đầu của tôi, và bác đúng: sáu phép trên chỉ
   soi CẤU TRÚC. Một bản vá nhìn đúng y hệt về cấu trúc mà thêm một `return`
   trước hộp chọn thì vẫn xanh hết. Cấu trúc không với tới hành vi, nên cắt hàm
   đã ship ra gọi thật và ĐẾM xem hai cửa nào được mở. */
{
  const END = "\n  }\n";
  const dau = source.indexOf("async function choosePrimaryDestination(");
  kiem(dau > 0, "mỏ neo hỏng: không thấy choosePrimaryDestination()");
  const than = source.slice(dau, source.indexOf(END, dau) + END.length);
  kiem(than.includes("showDirectoryPicker"), "cắt nhầm khối");
  const dauAp = source.indexOf("function apDungHoSo(");
  const apDung = source.slice(dauAp, source.indexOf(END, dauAp) + END.length);

  function sanKhau({ permission, image, xinLaiTraVe }) {
    const dem = { xinLai: 0, hopChon: 0 };
    const ctx = {
      state: {
        outputProfileState: permission ? { state: permission } : null,
        outputSettings: { image, result: { kind: "same_as_image" } },
        separateResultDestination: false,
        importedConfig: null
      },
      els: { outputPermissionText: { textContent: "" } },
      DEFAULT_IMAGE_PROFILE_ID: "duc-auto-chatgpt-images",
      markLocalOverride() {},
      log() {},
      renderOutput() {},
      window: {
        DacSidepanelUiSemantics: ui,
        DacOutputLocation: {
          directoryLocation: (handle, label) => ({ kind: "directory", handle, label }),
          fromWorkbook: () => ({ image: null, result: { kind: "same_as_image" } })
        },
        DacOutputProfiles: {
          async reauthorizeSole() { dem.xinLai += 1; return xinLaiTraVe; },
          async list() { return []; },
          async bind(id) { return { profile_id: id, last_known_handle_name: "moi" }; },
          async pruneOthers() { return []; }
        },
        showDirectoryPicker: async () => { dem.hopChon += 1; return { name: "thu-muc-moi" }; }
      }
    };
    vm.createContext(ctx);
    vm.runInContext(`${apDung}\n${than}\nglobalThis.chay = choosePrimaryDestination;`, ctx);
    return { dem, chay: ctx.chay, ctx };
  }

  const daGanSong = { kind: "directory", handle: { name: "Pilot-09" }, label: "Pilot-09", profileId: "p1" };
  const hoSoNho = { state: "authorized", profile: { profile_id: "p1", last_known_handle_name: "Pilot-09", directory_handle: { name: "Pilot-09" } } };

  // ⒜ "Change Folder" — ĐÚNG ca Đức bấm mãi không được. Phải mở hộp chọn, và
  // tuyệt đối KHÔNG được gõ cửa xin-lại-quyền.
  {
    const sk = sanKhau({ permission: "authorized", image: daGanSong, xinLaiTraVe: hoSoNho });
    await sk.chay();
    kiem(sk.dem.hopChon === 1, `Change Folder phải mở hộp chọn đúng 1 lần (thấy ${sk.dem.hopChon})`);
    kiem(sk.dem.xinLai === 0, `Change Folder không được gọi reauthorizeSole (thấy ${sk.dem.xinLai})`);
    // Mở được hộp chọn CHƯA phải là đổi được thư mục. Đột biến M11 — gọi hộp
    // chọn rồi `return` ngay, vứt handle vừa chọn — lọt qua hai phép đếm trên.
    // Nên đo cả VẾT: thư mục của phiên phải thành thư mục vừa chọn.
    kiem(sk.ctx.state.outputSettings.image.handle?.name === "thu-muc-moi", "thư mục vừa chọn phải được gắn vào phiên");
    kiem(sk.ctx.state.outputProfileState?.state === "authorized", "gắn xong thì trạng thái quyền phải là authorized");
  }

  // ⒝ Vừa nạp lại, chưa cầm handle — B-53 phải còn sống: xin lại được thì DỪNG,
  // không bắt Đức đi lại cây thư mục.
  {
    const sk = sanKhau({ permission: null, image: { kind: "directory", handle: null, label: "chưa gắn" }, xinLaiTraVe: hoSoNho });
    await sk.chay();
    kiem(sk.dem.xinLai === 1, "sau khi nạp lại phải thử xin lại quyền");
    kiem(sk.dem.hopChon === 0, "xin lại được rồi thì KHÔNG mở hộp chọn nữa — đó là cả cái lợi của B-53");
    kiem(sk.ctx.state.outputSettings.image.handle?.name === "Pilot-09", "xin lại xong phải GẮN thư mục đã nhớ vào phiên");
    kiem(sk.ctx.state.outputProfileState?.state === "authorized", "xin lại xong phải ghi trạng thái quyền");
  }

  // ⒞ Xin lại KHÔNG được thì vẫn phải rơi xuống hộp chọn, đừng để Đức kẹt.
  {
    const sk = sanKhau({ permission: null, image: { kind: "directory", handle: null, label: "chưa gắn" }, xinLaiTraVe: null });
    await sk.chay();
    kiem(sk.dem.xinLai === 1 && sk.dem.hopChon === 1, "xin lại hỏng thì phải rơi xuống hộp chọn");
    kiem(sk.ctx.state.outputSettings.image.handle?.name === "thu-muc-moi", "rơi xuống hộp chọn rồi thì thư mục vừa chọn cũng phải được gắn");
    kiem(sk.ctx.state.outputProfileState?.state === "authorized", "gắn xong ở đường rơi cũng phải ghi trạng thái quyền");
  }

  // ⒟ Mất quyền trên thư mục đang gắn — xin lại là đúng việc, không mở hộp chọn.
  {
    const sk = sanKhau({ permission: "permission_required", image: daGanSong, xinLaiTraVe: hoSoNho });
    await sk.chay();
    kiem(sk.dem.xinLai === 1 && sk.dem.hopChon === 0, "mất quyền thì xin lại, không bắt chọn lại thư mục");
    kiem(sk.ctx.state.outputSettings.image.handle?.name === "Pilot-09", "xin lại xong thư mục phải gắn lại được vào phiên");
    kiem(sk.ctx.state.outputProfileState?.state === "authorized", "xin lại xong trạng thái quyền phải hết 'permission_required'");
  }
}

console.log(`nut-doi-thu-muc: ${so}/${so} đạt`);
