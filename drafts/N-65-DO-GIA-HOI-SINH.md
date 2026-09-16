# N-65 — 8 bộ kiểm nằm cách ly: đo giá trước khi quyết

> Đo lúc 2026-09-12 bởi lane `claude-gpt-chay-het-job`. Mọi con số dưới đây đều **chạy ra**,
> không ước lượng. Lệnh đo ở cuối file, chạy lại được.

## Việc gì đã xảy ra

Ngày 10/09 repo chuyển sang bộ khung mới. Lượt đó **thêm** 7 bộ kiểm của khung mới và
**không xoá** bộ kiểm của khung cũ. `npm test` chết ngay bài đầu, nên 18/31 bài không ai chạy
suốt ba ngày — trong ba ngày đó bốn lớp bảo vệ chết không một tiếng kêu.

Ngày 12/09 chuỗi test được nối lại: `npm test` thoát 0. 8 bài không hồi sinh được trong lượt
đó bị đưa vào `npm run test:chet`, **không xoá** — xoá phải hỏi Đức.

## Cả 8 bài chết ở ĐÚNG MỘT CHỖ: dòng `import`

```
build-dashboard-smoke      SyntaxError: … không có export tên 'fileScriptCanChep'
build-overview-smoke       SyntaxError: … không có export tên 'CHI_SO_KY_THUAT'
check-bootstrap-smoke      SyntaxError: … không có export tên 'adrScopeOf'
claim-smoke                SyntaxError: … không có export tên 'BASELINE'
dau-vet-vung-smoke         SyntaxError: … không có export tên 'CHUA_THAY_DAU_VET'
frozen-suite-smoke         SyntaxError: … không có export tên 'PHU_THUOC_CHUNG_DONG_BANG'
session-check-utf8-paths   SyntaxError: … không có export tên 'CHUA_DAY'
what-next-smoke            SyntaxError: … không có export tên 'laTrongVungDongBang'
```

**Nghĩa là chưa một phép khẳng định nào được chạy.** Không bài nào "sai" — chúng chết ở cửa
vào. Con số "9.365 dòng hỏng" là sai: đó là 9.365 dòng **chưa ai thử**.

## Đếm thật: bao nhiêu tên nhập đã mất

| bộ kiểm | dòng | tên mất / tổng | phán đoán |
|---|---:|---:|---|
| `build-dashboard-smoke` | 3.504 | **2 / 19** | vá tên là chạy được |
| `check-bootstrap-smoke` | 1.147 | **1 / 25** | vá tên là chạy được |
| `what-next-smoke` | 396 | **3 / 12** | phần lớn còn |
| `claim-smoke` | 1.164 | **6 / 20** | phần lớn còn |
| `frozen-suite-smoke` | 210 | **2 / 3** | nhỏ, khái niệm còn |
| `session-check-utf8-paths` | 130 | **2 / 2** | nhỏ, khái niệm đã dời chỗ |
| `dau-vet-vung-smoke` | 258 | **6 / 6** | khái niệm dời nguyên khối sang `claim.mjs` |
| `build-overview-smoke` | 2.516 | **44 / 47** | bộ sinh đã bị viết lại từ đầu |

**6.849 / 9.365 dòng (73%) ghim vào các module vẫn còn gần như nguyên vẹn.**
Chỉ **build-overview-smoke (2.516 dòng, 27%)** là viết lại thật: `build-overview.mjs` bây giờ
xuất `SO_CON_SONG, mocHEADLuc, trang, gomDuLieu…`, không còn một nửa cái tên cũ nào.

Nhiều tên mất là **đổi chỗ, không phải mất**:

| tên cũ | bây giờ ở đâu |
|---|---|
| `CHUA_THAY_DAU_VET`, `dauVetTheoVung`, `dauVetThuan` | `claim.mjs`: `DAU_VET, xetDauVet, noiDauVet, doDauVet` |
| `laTrongVungDongBang` | `what-next.mjs`: `daDongBang` |
| `PHU_THUOC_CHUNG_DONG_BANG` | `repo-structure.mjs`: `frozenFrom` |
| `adrScopeOf` | `check-bootstrap.mjs`: `isAdrPath` + `soHieuAdr` + `nhaCuaSoHieu` |
| `BASELINE`, `baselineDaNiemPhong` | thay bằng cơ chế `DAU_VET` + `cuaIndex` |

## Chỗ tôi KHÔNG biết, và nói thẳng

Vá `import` chỉ đưa bài qua **dòng 1**. Sau đó phép khẳng định có còn đúng không thì
**chưa ai biết** — hành vi có thể đổi chứ không chỉ cái tên. Đó là ẩn số duy nhất còn lại,
và nó rẻ tiền để mua: vá tên rồi chạy, đếm xem bao nhiêu khối khẳng định thật sự đỏ.

Và đây là chỗ nguy hiểm: **vá tên cho qua cửa mà không hiểu phép khẳng định chính là cách đẻ
ra một bài kiểm xanh vì lý do sai** — đúng thứ vừa làm repo mất ba ngày. Nên mọi bài hồi sinh
phải qua **đột biến kiểm** trước khi được cho lại vào `npm test`.

## Đề xuất

**⑴ Đừng quyết bây giờ. Mua con số trước.** Một lượt Codex rẻ: chỉ sửa dòng `import` theo bảng
đổi tên ở trên, chạy từng bài, báo lại *"bài X: 3/48 khối khẳng định đỏ"*. Việc này **không
cam kết** viết lại hay bỏ bài nào — nó biến "9.365 dòng không biết gì" thành hoá đơn có số.

**⑵ Rồi quyết từng bài với con số trong tay.**

**⑶ Phán đoán của tôi, ghi ra trước để đối chiếu với con số ⑴:**

- **Hồi sinh 7 bài.** Bài to nhất (`build-dashboard-smoke`, 3.504 dòng) lại là bài **rẻ nhất**
  — mất đúng 2 tên. Bài nhỏ nhất (`session-check-utf8-paths`, 130 dòng) đáng cứu nhất trong
  cả nhóm: nó ghim việc cổng đọc đúng đường dẫn **tiếng Việt**, mà Đức đặt tên thư mục bằng
  tiếng Việt. Hỏng lại là mọi thư mục tên Việt bị báo đỏ oan, và phiên sau gặp đỏ oan sẽ có
  động cơ đi sửa cổng cho nó xanh — đúng thứ luật cấm.
- **`build-overview-smoke` (2.516 dòng): đừng viết lại.** Bộ sinh đã khác hẳn; 2.516 dòng ghim
  một API không còn tồn tại là nợ, không phải tài sản. Giữ lại **đúng một phép** Đức thật sự
  đặt hàng — *"bảng không được lộ chi tiết kỹ thuật"* — cộng phép so sánh tất định. Khoảng
  **80 dòng** viết mới theo API hiện tại. Trước khi viết phải kiểm `tests/bang-song.mjs` và
  `tests/bang-ba-cua-smoke.mjs` xem đã phủ phần nào chưa, đừng ghim trùng.

**Tóm một câu:** không phải "viết lại 9.365 dòng hay vứt". Là **vá tên cho 7 bài + viết mới
~80 dòng cho bài thứ 8**, và bỏ đi 2.516 dòng ghim vào một bộ sinh đã chết.

**Cần Đức chốt đúng một điều:** có đồng ý **bỏ hẳn `build-overview-smoke` cũ** (2.516 dòng),
đổi lấy ~80 dòng viết mới theo bảng hiện tại không? Bảy bài còn lại không cần Đức quyết —
chúng là việc sửa, và Codex làm được.

## Lệnh đo lại

```bash
node -e 'const fs=require("fs");const ex=p=>new Set((fs.readFileSync(p,"utf8").match(/^export (?:const|function|class|async function) ([A-Za-z_0-9]+)/gm)||[]).map(s=>s.split(" ").pop()));const c={};const get=p=>c[p]??=(fs.existsSync(p)?ex(p):null);for(const t of ["build-dashboard-smoke","build-overview-smoke","check-bootstrap-smoke","claim-smoke","dau-vet-vung-smoke","frozen-suite-smoke","session-check-utf8-paths","what-next-smoke"]){const s=fs.readFileSync("tests/"+t+".mjs","utf8");let tot=0,mis=0,d=[];for(const m of s.matchAll(/import \{([^}]+)\} from "\.\.\/(scripts\/[^"]+)"/g)){const n=m[1].split(",").map(x=>x.trim().split(" as ")[0].trim()).filter(Boolean);const h=get(m[2]);if(!h){d.push(m[2]+":KHONG-CO-FILE");continue}for(const x of n){tot++;if(!h.has(x)){mis++;d.push(x)}}}console.log(`${t}: ${mis}/${tot} -> ${d.join(" ")}`)}'
```
