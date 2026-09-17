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

// ⑷ Đích là Chrome Downloads — không có thư mục nào để xin lại.
const tai = ui.folderButtonIntent(undefined, { kind: "downloads", folder: "Duc Auto ChatGPT" });
kiem(tai.label === "Choose Folder", "chế độ Downloads chưa gắn thư mục nào");

// ⑸ Nhãn nút chỉ được gán ở MỘT chỗ, và chỗ đó phải đọc `folderButtonIntent`.
// Hai phép đếm này phân biệt được hai nhánh: viết tay lại cái ternary cũ vẫn
// giữ số gán bằng 1 nhưng làm phép thứ hai đổ. Cố ý KHÔNG dò chuỗi
// "Change Folder" — chú thích và câu báo cho Đức cũng chứa chuỗi đó, dò như thế
// là tự khớp văn của chính mình.
kiem(
  (source.match(/els\.destinationFolderBtn\.textContent =/g) || []).length === 1,
  "đúng một chỗ gán nhãn cho nút chọn thư mục"
);
kiem(
  (source.match(/els\.destinationFolderBtn\.textContent = window\.DacSidepanelUiSemantics\.folderButtonIntent\([^)]*\)\.label;/g) || []).length === 1,
  "chỗ gán nhãn đó phải đọc folderButtonIntent, không tự tính lại"
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
  /const yDinh = window\.DacSidepanelUiSemantics\.folderButtonIntent\(\s*state\.outputProfileState\?\.state,\s*state\.outputSettings\?\.image\s*\)/.test(source),
  "ý định phải dựng từ ĐÚNG hai giá trị mà renderOutput dùng để vẽ nhãn"
);

console.log(`nut-doi-thu-muc: ${so}/${so} đạt`);
