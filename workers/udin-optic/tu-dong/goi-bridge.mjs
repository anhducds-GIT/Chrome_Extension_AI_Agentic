/* Danh tính Bridge CỦA UDIN OPTIC — năm dòng khai, phần còn lại ở `workers/_shared/goi-bridge/`.
 *
 * Giao thức là `udin-optic.bridge`, KHÔNG phải `duc-scouter.bridge`, và đó không phải thẩm mỹ:
 * `hnx-fetch` mất một buổi ngày 08/09 vì máy chủ nói một tên còn extension nói tên kia — cùng
 * cổng, cùng token, vẫn không nối được, triệu chứng chỉ là *"im lặng"*.
 *
 * Cũng vì thế **tệp ghép cặp và cổng là của riêng gói này**:
 *   node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --goi udin-optic
 * Dùng chung tệp với Scouter thì mọi lượt gọi trả `TARGET_AMBIGUOUS`.
 */
import { taoGoiBridge } from "../../_shared/goi-bridge/goi-bridge.mjs";

export const { goi, timTab, docGhepCap } = taoGoiBridge({
  goi: "udin-optic",
  ghepEnv: "UDIN_GHEP",
  gheEnv: "UDIN_GHE",
  clientId: "udin-optic-tu-dong",
});
