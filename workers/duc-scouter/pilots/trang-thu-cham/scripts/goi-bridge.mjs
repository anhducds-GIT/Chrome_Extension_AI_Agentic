/* Danh tính Bridge CỦA SCOUTER — năm dòng khai, phần còn lại ở `workers/_shared/goi-bridge.mjs`.
 *
 * Thân hàm dọn về `_shared` ngày 15/09 (`T21` chặng ①). Lý do không phải gọn gàng: Udin Optic
 * sắp thành gói riêng với giao thức `udin-optic.bridge` và tệp ghép cặp riêng, mà bản cũ **gõ
 * cứng** giao thức, đường tệp và hai tên biến môi trường của Scouter vào chính thân hàm. Chép y
 * nguyên sang gói mới là để gói mới **tự khai sai tên mình trên dây** — đúng cái bẫy `G9` đã bắt
 * ở `transport.mjs` ngày 12/09.
 *
 * File này ở lại đúng chỗ cũ để **10 chỗ gọi không phải sửa một ký tự nào**. Gói mới viết cái vỏ
 * của riêng nó, không chép cái này.
 *
 * Hai tên biến môi trường khai TƯỜNG MINH chứ không suy ra từ tên gói: `SCOUTER_GHEP` có trong
 * README và `kiem-cai-dat.mjs`, đổi nó trong một lượt dọn nhà là làm hỏng thứ đang có người dùng.
 */
import { taoGoiBridge } from "../../../../_shared/goi-bridge/goi-bridge.mjs";

export const { goi, timTab, docGhepCap } = taoGoiBridge({
  goi: "duc-scouter",
  ghepEnv: "SCOUTER_GHEP",
  gheEnv: "SCOUTER_GHE",
  clientId: "pilot-trang-thu-cham",
});
