/* Phép ghim BỀ MẶT HẸP của gói `udin-optic`.
 *
 * Gói này tách khỏi `duc-scouter` ngày 15/09 **bằng cách chép**, và Đức chốt như vậy với lý do
 * rõ: *"sau này Scouter sẽ còn thay đổi nhiều, ngoài ra UI của Udin Extension cũng sẽ bị thay
 * đổi cho phù hợp usecase"*. Một bản chép được phép trôi — nhưng **không được trôi mà không ai
 * biết**. Đó là toàn bộ việc của file này.
 *
 * Ba gói `duc-auto-*` là cái giá của việc không có file này: ba bản của một tệp, khác nhau cả
 * ba, nên mỗi lỗi phải sửa ba lần và một bản vá an toàn chỉ tới được một bản.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { METHOD_NAMES, PROTOCOL, capabilities } from "../scripts/bridge-core.mjs";
import { PROTOCOL as PROTOCOL_HOST } from "../bridge/udin-optic-host.mjs";

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const scouter = path.join(goc, "..", "..", "duc-scouter", "v0.1.0");
const doc = (...p) => fs.readFileSync(path.join(...p), "utf8");

/* ---- ⑴ TỪ VỰNG ĐÓNG Ở MƯỜI BA LỆNH, và 12 lệnh kia KHÔNG TỒN TẠI ----------
 * "Cắt chứ không tắt" (ADR-0021 ⑵): một lệnh bị bỏ phải là lệnh KHÔNG CÓ, không phải lệnh có
 * mà đang bị chặn — cái sau thì bật lại được bằng một dòng cờ.
 *
 * **12 → 13 ngày 16/09, Đức chốt `D4`.** `scout.upload` là lệnh đầu tiên thêm vào gói này kể từ
 * lúc tách, và nó thêm vì một việc Đức nêu đích danh: lấy ảnh Udin vừa tạo, đưa ngược vào, xin
 * một style khác. Con số trong tiêu đề khối này ĐỔI THEO — để nó ở 12 là dòng chữ nói một đằng
 * và phép kiểm nói một nẻo. */
{
  const DUNG = ["session.hello", "system.capabilities", "system.ping", "scout.targets",
    "scout.query", "scout.text", "scout.wait",
    "scout.click", "scout.chon", "scout.type", "scout.clear", "scout.upload", "scout.tha", "scout.grab", "scout.navigate"];
  assert.deepEqual([...METHOD_NAMES].sort(), [...DUNG].sort(),
    "từ vựng đổi = đổi luật an toàn (luật gói số 4). Thêm/bớt phải hỏi Đức, không sửa lén dòng này.");

  const CAT = ["scout.page", "scout.view", "scout.tree", "scout.a11y", "scout.network", "scout.shot",
    "scout.hover", "scout.scroll", "scout.history", "scout.key", "scout.fetch", "scout.reload",
    /* `scout.song` mở bên Scouter 18/09 và CỐ Ý không sang đây — xem khai ở `CO_Y_KHAC`
     * khối ⑷. Nó ở danh sách CẮT chứ không phải bị quên: một method vắng mặt vì bị cắt và một
     * method vắng mặt vì chưa ai chép sang trông giống hệt nhau từ ngoài. */
    "scout.song"];
  for (const ten of CAT) {
    assert.ok(!METHOD_NAMES.includes(ten), `\`${ten}\` phải KHÔNG TỒN TẠI ở gói này`);
  }
  /* `scout.fetch` đáng một dòng riêng: giữ nó là giữ một cửa gọi mạng tuỳ ý mà gói này KHÔNG
   * dùng — ảnh Udin nằm sau URL ký hạn giờ nên `scout.fetch` trả 403 (`S-24`, đo 14/09). */
  assert.ok(!METHOD_NAMES.includes("scout.fetch"));

  /* Bản gốc phải còn ĐỦ 26 — lệch nghĩa là ai đó cắt nhầm bên Scouter, và bảng trên thành vô nghĩa.
   * 25 → 26 ngày 18/09: `scout.song`, Đức duyệt trong đề bài Vizcom Phase 2. Con số này ĐỎ được
   * đúng một lần cho mỗi lượt đổi từ vựng bên kia, và đó là toàn bộ việc của nó — nó bắt người
   * ở gói này nhìn sang xem method mới có cần chép về không, thay vì để im lặng quyết hộ. */
  const banGocMethod = doc(scouter, "scripts", "scouter-bridge-core.mjs").match(/^    name: "/gm) || [];
  assert.equal(banGocMethod.length, 26, "Scouter phải còn 26 method; đổi thì xem lại bảng CẮT ở trên");

  const c = capabilities();
  /* TÁM lệnh GHI từ 16/09 khuya. `scout.upload` và `scout.tha` là HAI lệnh của gói đưa
   * byte đi **từ đĩa ra một trang web** — mọi lệnh còn lại đi chiều ngược lại. Con số này phải
   * đổi tay cùng lúc với từ vựng ở khối ⑴, cố ý: hai chỗ cùng nói một chuyện thì một chỗ quên
   * là một chỗ đỏ. */
  assert.equal(c.methods.filter((m) => !m.read_only).length, 8,
    "tám lệnh GHI: click · chon · type · clear · upload · tha · grab · navigate");
  assert.equal(c.seed, "udin-optic-v0.1", "tự khai đúng tên mình — `bridge.sessions` là chỗ người ta nhìn để phân biệt");
}

/* ---- ⑵ QUYỀN HẸP HƠN SCOUTER — đây là lời hứa lớn nhất của gói -------------
 * Scouter mở `<all_urls>` vì nó dò trang bất kỳ. Udin chạm đúng MỘT trang. Nới dòng này là bỏ
 * đi lý do duy nhất khiến việc chép ~2.100 dòng máy bấm/gõ là đáng. */
{
  const mf = JSON.parse(doc(goc, "manifest.json"));
  /* Danh sách này là HỢP ĐỒNG, không phải một gợi ý: so `deepEqual` nên **thêm** một tên miền
   * cũng đỏ, y như nới ra `<all_urls>`. Mỗi dòng phải trả lời được câu *"việc nào cần nó"*:
   *   · `vinfast.udinbv.com` — trang làm việc.
   *   · `optic-canvas-cache-vinfast.s3…` — **nơi ảnh kết quả THẬT SỰ nằm**. Thêm 15/09 sau lượt
   *     chạy live đầu tiên: W1 và W2 ĐẠT, W3 chết với `Failed to fetch`. Nguyên nhân không phải
   *     mã: `scout.grab` gọi `fetch` TRONG SERVICE WORKER, nên một tên miền không khai là CORS
   *     chặn. Scouter không bao giờ gặp vì nó mở `<all_urls>` — tức lượt chạy live này là chỗ
   *     DUY NHẤT phát hiện được cái giá của việc thu hẹp quyền.
   *   · `127.0.0.1` — máy chủ Bridge.
   * Thêm dòng thứ tư thì phải trả lời được câu đó trước. */
  assert.deepEqual(mf.host_permissions, [
    "https://vinfast.udinbv.com/*",
    "https://optic-canvas-cache-vinfast.s3.us-east-1.amazonaws.com/*",
    "http://127.0.0.1/*"
  ]);
  assert.ok(!JSON.stringify(mf.host_permissions).includes("all_urls"),
    "`<all_urls>` ở đây là xoá sạch chỗ hẹp hơn duy nhất của gói so với Scouter");
  assert.deepEqual([...mf.permissions].sort(), ["alarms", "debugger", "sidePanel", "storage"]);
  /* Phím phanh phải KHÁC Scouter: hai extension xin cùng một tổ hợp thì Chrome chỉ trao cho
   * một, và cái mất phím là cái không còn phanh lúc bảng bên đóng. */
  assert.equal(mf.commands["dung-khan"].suggested_key.default, "Ctrl+Shift+U");
  const mfScouter = JSON.parse(doc(scouter, "manifest.json"));
  assert.notEqual(mf.commands["dung-khan"].suggested_key.default,
    mfScouter.commands["dung-khan"].suggested_key.default, "trùng phím là một gói mất phanh");
}

/* ---- ⑶ HAI ĐẦU MỘT SỢI DÂY, và KHÔNG được trùng tên Scouter ---------------
 * `hnx-fetch` mất một buổi ngày 08/09 vì máy chủ nói một tên còn extension nói tên kia — cùng
 * cổng, cùng token, vẫn không nối được, triệu chứng chỉ là "im lặng". */
{
  assert.equal(PROTOCOL, "udin-optic.bridge");
  assert.equal(PROTOCOL_HOST, PROTOCOL, "extension và máy chủ phải khai CÙNG một chuỗi");
  assert.notEqual(PROTOCOL, "duc-scouter.bridge");
}

/* ---- ⑷ NĂM TỆP CHÉP TỪ SCOUTER PHẢI CÒN GIỐNG BẢN GỐC ---------------------
 * Khối này KHÔNG cấm hai bản khác nhau — nó cấm chúng khác nhau MÀ KHÔNG AI BIẾT. Muốn khác
 * thật thì khai vào `CO_Y_KHAC` kèm lý do, và lúc đó nó là một quyết định có chữ ký.
 *
 * Vì sao năm tệp đầu: chúng là **bộ máy gắn debugger, tổng hợp phím chuột, và CÁI PHANH**
 * (trần 200 lượt mỗi lần mở khoá, mặc định TẮT, chỉ tay người bật). Một bản vá an toàn làm ở
 * Scouter phải tới được đây, và đây là sợi dây duy nhất bắt nó phải tới.
 *
 * `bridge-core.mjs` · `manifest.json` · `sidepanel.*` · `background.js` CỐ Ý không nằm ở đây:
 * chúng là chỗ gói này hẹp lại và là chỗ Đức nói UI sẽ đổi. Khối ⑴ và ⑵ canh đúng thứ đáng canh
 * ở chúng — từ vựng và quyền. */
{
  /* tên tệp → lý do. Rỗng là đúng cho tới khi có lý do thật. Mỗi dòng ở đây là một chữ ký:
   * nó nói *ai quyết, khi nào, vì sao* — và nó phải đọc được bởi người sẽ gặp nó sáu tháng nữa
   * mà không có mặt lúc quyết. */
  const CO_Y_KHAC = Object.create(null);
  CO_Y_KHAC["scripts/scouter-seed-core.mjs"] = { bam_day: "4c966af358e8d18c", bam_goc: "4d65e73c647ce05f", ly_do:
    "18/09, Đức chốt đường ⒝ của `duc-scouter/v0.1.0/docs/VIZCOM-PHASE-2.md` §3: `scout.song` " +
    "(phép dò SỐNG, read-only, hạn 1.500ms) chỉ triển khai trong Scouter, KHÔNG chép sang đây. " +
    "Lý do: nó là năng lực của BỘ ĐỒ NGHỀ duyệt web nói chung — trả lời 'renderer còn đáp không' " +
    "khi Local AI phải chọn giữa nhiều target lạ. Udin chạy trên đúng MỘT trang đã biết, không " +
    "có bài toán đó, nên nó sẽ nhận một method không ai gọi. `G-93` ghi lý do Đức tách hai gói " +
    "chính là TÁCH NHỊP THAY ĐỔI — và đây đúng là một nhịp chỉ thuộc về một gói. " +
    "Nó KHÔNG mở thêm cửa CDP nào (dùng lại `page.view`/`Page.getLayoutMetrics` đã mở 14/09), " +
    "nên bản chép ở đây KHÔNG thiếu một bản vá an toàn nào. Ngày nào Udin cần dò sống thì chép " +
    "sang rồi XOÁ dòng này — đừng để nó ở lại che một lượt lệch khác." };
  const CAP = [
    ["scouter-engine.js", "scouter-engine.js"],
    ["scripts/scouter-probes.mjs", "scripts/scouter-probes.mjs"],
    ["scripts/scouter-actions-core.mjs", "scripts/scouter-actions-core.mjs"],
    ["scripts/scouter-seed-core.mjs", "scripts/scouter-seed-core.mjs"],
    /* `tu-kiem-ghi.mjs` — phần PHÁN của đường ghi tự kiểm (`S1`/`S2`, 16/09). Nó sống ở đây vì
     * `scouter-seed-core.mjs` import nó: một bản chép lệch ở tệp này nghĩa là hai gói phán khác
     * nhau về cùng một lượt gõ, mà cả hai vẫn chạy được — đúng kiểu hỏng im lặng. */
    ["scripts/tu-kiem-ghi.mjs", "scripts/tu-kiem-ghi.mjs"],
    ["scripts/scouter-transport-loopback.mjs", "scripts/scouter-transport-loopback.mjs"],
    ["scripts/scouter-journal-core.mjs", "scripts/scouter-journal-core.mjs"],
    ["bridge/file-core.mjs", "bridge/file-core.mjs"],
    /* HAI TỆP NÀY SINH RA Ở ĐÂY rồi mới sang Scouter (`U5`, 16/09) — ngược chiều năm tệp trên.
     * Nhưng từ nay **bản gốc là bản bên Scouter**, và đó không phải một lựa chọn tuỳ tiện:
     * Scouter là bộ đồ nghề chung, nên mọi bản chép phải chỉ về cùng một chỗ. Muốn sửa thì
     * sửa bên Scouter rồi chép sang đây, y như năm tệp trên.
     *
     * Cả hai đã được làm TRUNG TÍNH VỚI GÓI để chép được: không tên gói, không tên miền,
     * không số lệnh, không câu chỉ dẫn riêng — tất cả đi vào bằng THAM SỐ từ `sidepanel.js`
     * (`G9`: một chuỗi gõ cứng trong tệp chép sẽ theo bản chép sang gói tiếp theo). */
    ["scripts/zoom-core.mjs", "scripts/zoom-core.mjs"],
    ["scripts/kiem-nhanh.mjs", "scripts/kiem-nhanh.mjs"]
  ];
  const bam = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 16);

  for (const [tenDay, tenGoc] of CAP) {
    const banGoc = path.join(scouter, ...tenGoc.split("/"));
    /* Bản gốc BIẾN MẤT thì ĐỎ, không lặng lẽ bỏ qua: một phép kiểm tự tắt khi mất mỏ neo đọc y
     * hệt một phép kiểm đang chạy tốt. Scouter đổi tên tệp thì sửa bảng CẶP này. */
    assert.ok(fs.existsSync(banGoc), `không thấy bản gốc ${tenGoc} bên Scouter — sửa bảng CẶP, đừng bỏ khối này`);
    const banDay = path.join(goc, ...tenDay.split("/"));

    /* ═══ MỘT LƯỢT LỆCH ĐÃ KHAI KHÔNG ĐƯỢC TẮT PHÉP GHIM ═══
     * Bản đầu của khối này viết `if (CO_Y_KHAC[tenDay]) continue;`. Nó đúng về ý và sai về giá:
     * khai MỘT lý do cho `scouter-seed-core.mjs` là từ đó về sau **mọi** lượt lệch khác trên
     * 950 dòng của tệp ấy — kể cả một bản vá cổng ghi làm bên Scouter mà quên chép sang — đều
     * đi qua trong im lặng, và phép ghim vẫn xanh. Một phép ghim tự tắt đọc y hệt một phép
     * ghim đang chạy tốt; đó đúng là thứ cả khối ⑷ sinh ra để chặn.
     *
     * Nên lượt lệch được khai bị **NEO BẰNG BĂM**: khai xong thì hai bản phải giữ nguyên đúng
     * hai cái băm đã ghi. Bên nào nhúc nhích thì ĐỎ, và người phải mở lý do ra đọc lại xem nó
     * còn đúng không. Giá phải trả: mỗi lần sửa thật ở một trong hai bản là một lần phải sửa
     * hai con số ở đây. Đó KHÔNG phải phiền toái thừa — đó chính là lượt bắt người nhìn lại. */
    const khai = CO_Y_KHAC[tenDay];
    if (khai) {
      assert.ok(khai.ly_do?.length > 80, `${tenDay}: khai lệch phải kèm LÝ DO thật, không phải một chữ`);
      const [bDay, bGoc] = [bam(banDay), bam(banGoc)];
      assert.notEqual(bDay, bGoc, `${tenDay} khai là CỐ Ý KHÁC nhưng hai bản đang GIỐNG nhau — xoá dòng khai đi, nó đang che một phép ghim còn sống`);
      if (khai.bam_day === null || khai.bam_goc === null) {
        console.log(`   ⚠ ${tenDay}: khai lệch chưa neo băm. Điền: bam_day: "${bDay}", bam_goc: "${bGoc}"`);
        continue;
      }
      assert.equal(bDay, khai.bam_day, `${tenDay} (bản Udin) đã đổi SAU khi khai lệch — mở lý do ra đọc lại, rồi cập nhật băm`);
      assert.equal(bGoc, khai.bam_goc, `${tenDay} (bản gốc Scouter) đã đổi SAU khi khai lệch — bản vá đó có cần sang Udin không?`);
      continue;
    }
    assert.equal(bam(banDay), bam(banGoc),
      `${tenDay} đã trôi khỏi bản gốc. Đồng bộ lại, HOẶC khai vào CO_Y_KHAC kèm lý do.`);
  }
}

/* ---- ⑸ TÊN GÓI PHẢI KHAI Ở LỚP NỐI DÂY, không ở trong tệp chép ------------
 * `G9`, 12/09: một chuỗi `"duc-scouter"` gõ cứng trong `transport.mjs` đi theo bản chép sang
 * `hnx-fetch` và khiến gói đó tự khai sai tên mình trên dây. */
{
  const bg = doc(goc, "background.js");
  assert.match(bg, /worker_id: "udin-optic"/, "tên gói khai ở background, không ở trong transport");
  const tp = doc(goc, "scripts", "scouter-transport-loopback.mjs").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!tp.includes("udin-optic") && !tp.includes("duc-scouter"),
    "transport là tệp CHÉP — một tên gói trong đó sẽ theo bản chép sang gói tiếp theo");
}

/* ---- ⑹ BỐN TỆP RIÊNG PHẢI TỰ KHAI TÊN MÌNH, không mang tên Scouter ---------
 * Lượt chạy thử đầu tiên của máy chủ in ra `"Scouter Bridge nghe ở 127.0.0.1:32152"` — đúng
 * cổng của Udin, đúng tệp ghép cặp của Udin, mà tự xưng là Scouter. Không hỏng chức năng, nhưng
 * đó là **cách một bản chép nói dối**: người bật máy chủ đọc đúng dòng đó để biết mình vừa bật
 * cái gì. Gói `duc-scouter` từng phải viết hẳn một dòng README để giải thích cùng triệu chứng
 * (máy chủ của nó in tên `duc-auto-chatgpt`). Chữa một lần, rồi ghim lại.
 *
 * Chỉ soi phần MÃ, và bỏ luôn các dòng `from "..."`: đường dẫn sang tệp chép BẮT BUỘC mang tên
 * `scouter-*` vì đó là tên tệp thật. Văn xuôi cũng được phép nhắc Scouter — mọi lời giải thích
 * *"chép từ Scouter"* đều nằm trong ghi chú, và một bộ dò khớp chính văn của mình thì vô dụng. */
{
  const RIENG = ["bridge/udin-optic-host.mjs", "scripts/bridge-core.mjs", "background.js"];
  for (const ten of RIENG) {
    const ma = doc(goc, ...ten.split("/"))
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/from\s+"[^"]*"/g, "")
      /* `ScouterEngine` là TÊN LỚP do `scouter-engine.js` xuất ra, và tệp đó chép NGUYÊN VĂN
       * (khối ⑷ băm nó). Đổi tên lớp là làm gãy phép so byte để đẹp một chữ — không đáng.
       * Tên tệp và tên export của bản chép được giữ, chỗ cấm là chỗ gói TỰ KHAI TÊN MÌNH. */
      .replace(/ScouterEngine/g, "");
    assert.ok(!/scouter/i.test(ma),
      `${ten} còn tự xưng Scouter trong phần mã — người bật máy chủ đọc đúng dòng đó để biết mình vừa bật cái gì`);
  }
  assert.ok(!/scouter/i.test(doc(goc, "manifest.json")), "manifest không được mang tên gói khác");
}

/* ---- ⑺ `system.ping` và `session.hello` PHẢI được đè ở lớp nối dây ---------
 * `scripts/scouter-seed-core.mjs` là tệp chép NGUYÊN VĂN và nó gõ cứng `"scouter-seed-v0.1"`
 * vào hai handler đó. Đo thật 15/09 trên máy chủ của chính gói này: `system.ping` trả
 * `{"scouter":"online","seed":"scouter-seed-v0.1"}`. Đúng cổng Udin, đúng extension Udin, **tự
 * xưng là Scouter** — và `system.ping` là thứ ĐẦU TIÊN người ta gọi để biết mình đang nói
 * chuyện với ghế nào.
 *
 * Đường chữa SAI là sửa thẳng tệp chép: nó buộc phải khai `CO_Y_KHAC` và **mất phép so từng
 * byte trên đúng tệp chứa CÁI PHANH**. Đổi một lớp bảo vệ lấy hai chuỗi chữ là cái giá tồi.
 *
 * Khối này canh cái đè đó còn nguyên, và canh HAI CHỖ KHAI TÊN PHẢI KHỚP NHAU — `background.js`
 * nói một tên, `bridge-core.mjs` nói một tên, và không có gì bắt chúng bằng nhau ngoài đây. */
{
  const bg = doc(goc, "background.js");
  assert.match(bg, /const handlersGoc = createSeedHandlers\(/,
    "phải giữ bản gốc lại dưới một tên khác thì mới đè lên được");
  for (const ten of ["session.hello", "system.ping"]) {
    assert.ok(bg.includes(`async "${ten}"(`),
      `\`${ten}\` phải được đè ở background.js, nếu không gói tự xưng là Scouter trên dây`);
  }
  const khai = /SEED_CUA_GOI = "([^"]+)"/.exec(bg);
  assert.ok(khai, "background.js phải khai tên seed thành một hằng số đọc được");
  assert.equal(khai[1], capabilities().seed,
    "background.js và bridge-core.mjs đang khai HAI tên seed khác nhau — một ghế hai tên thì `bridge.sessions` mất nghĩa");
}

/* ---- ⑻ MÃ LỖI VƯỢT BIÊN: `tu-kiem-ghi.mjs` NÉM, gói này phải BIẾT --------
 * Khối này ra đời từ một lỗ thật, 16/09. `tu-kiem-ghi.mjs` là tệp CHÉP TỪNG BYTE, nên khi
 * `S-27` thêm mã `CLEAR_NOT_OBSERVED` vào nó, bản chép sang đây có ngay. Nhưng
 * `bridge-core.mjs` của gói này **CỐ Ý KHÁC** — nó không nằm trong bảng `CẶP`, nên không phép
 * so byte nào chạm tới nó, và nó **không được khai mã mới**. Suite vẫn xanh trọn vẹn.
 *
 * Hậu quả: lượt xoá nào thất bại trên gói này sẽ dựng `BridgeProtocolError("CLEAR_NOT_OBSERVED")`,
 * mà chỗ dựng TỪ CHỐI mã lạ — nên nó ném `TypeError` thay vì trả một mã có tên. Hỏng to tiếng
 * chứ không hỏng im lặng, nhưng vẫn hỏng, và **chỉ hỏng ở đúng nhánh thất bại** — nhánh mà
 * không lượt chạy bình thường nào đi qua.
 *
 * Đây là cái giá của *“chép thì ghim, khác thì không”*: một mã lỗi sống ở tệp CHÉP nhưng phải
 * được khai ở tệp KHÁC. Không bảng `CẶP` nào bắc qua khe ấy — nên khối này bắc. */
{
  const tk = await import("../scripts/tu-kiem-ghi.mjs");
  const core = await import("../scripts/bridge-core.mjs");

  /* Lấy mọi hằng số mã lỗi mà phần phán dùng chung EXPORT ra. Đọc từ `tu-kiem-ghi.mjs` chứ
   * KHÔNG gõ lại danh sách ở đây: gõ lại là dựng bản thứ hai của cùng một sự thật, và bản thứ
   * hai thì lần sau thêm mã mới sẽ lại không ai sửa — đúng con đường vừa đẻ ra cái lỗ này. */
  const maVuotBien = Object.entries(tk)
    .filter(([ten, gia]) => ten.startsWith("MA_") && typeof gia === "string")
    .map(([ten, gia]) => [ten, gia]);

  assert.ok(maVuotBien.length >= 2,
    `phần phán dùng chung phải export ít nhất hai hằng số MA_* — thấy ${maVuotBien.length}. ` +
    "Khớp 0 nghĩa là khối này đang canh hư không, KHÔNG phải mọi thứ đều ổn");

  for (const [ten, ma] of maVuotBien) {
    assert.ok(Object.hasOwn(core.ERROR_DEFINITIONS, ma),
      `\`tu-kiem-ghi.mjs\` ném \`${ma}\` (${ten}) mà \`bridge-core.mjs\` của gói này KHÔNG khai nó. ` +
      "Tệp phán là bản chép từng byte nên nó tự có mã mới; `bridge-core.mjs` thì CỐ Ý khác nên " +
      "không bảng CẶP nào nhắc. Khai mã vào `ERROR_DEFINITIONS`, đừng sửa khối này.");

    /* Và khai suông chưa đủ — thử dựng thật, vì đó mới là thứ chạy lúc thất bại. */
    assert.doesNotThrow(() => new core.BridgeProtocolError(ma, "thu dung"),
      `dựng \`BridgeProtocolError("${ma}")\` vẫn ném — mã đã khai nhưng khai hỏng`);
    assert.equal(core.ERROR_DEFINITIONS[ma].retryable, false,
      `\`${ma}\` phải là KHÔNG thử lại được: lượt thử lại bắn đúng thao tác vừa thất bại`);
  }
}

console.log("  · be-mat-hep: 8 khối xanh");
