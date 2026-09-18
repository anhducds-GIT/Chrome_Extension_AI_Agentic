/* TRỢ THỦ chỉ-dùng-cho-test: nạp trước một tiến trình node để ĐẨY ĐỒNG HỒ đi.
 *
 * Dùng: `node --import ./tests/_dong-ho-lui.mjs <script>` với `ARK_DICH_MS=<mili-giây>`.
 *
 * Vì sao cần một thứ thô thế này: bất biến *"bản sinh đã commit phải suy HOÀN TOÀN từ HEAD"*
 * chỉ kiểm được thật bằng cách **đổi đồng hồ rồi sinh lại**. Chờ 90 giây thật thì đúng nhưng
 * không ai để nó trong bộ chạy mỗi lượt; còn dò văn bản nguồn (`/mocHEADLuc\(\)/`) thì hỏng ở
 * lượt nâng bộ khung kế tiếp — đúng cái bệnh đã trả giá ở `check-bootstrap-smoke` (N-65).
 *
 * KHÔNG nằm trong `scripts/`: nó là đồ nghề của bài kiểm, không phải sản phẩm. Tên mở đầu bằng
 * `_` nên `dau-suite-smoke` miễn nó khỏi luật "mọi bài phải ở một chuỗi" (xem AGENTS.md).
 */
const DICH = Number(process.env.ARK_DICH_MS || 0);
if (Number.isFinite(DICH) && DICH !== 0) {
  const That = Date;
  const now = () => That.now() + DICH;
  /* Giữ NGUYÊN mọi hành vi khác của `Date` — chỉ dời gốc thời gian. Bọc bằng Proxy để
   * `new Date(x)` · `Date.parse` · `Date.UTC` · `instanceof` đều còn đúng; chỉ `new Date()`
   * không đối số và `Date.now()` là nhìn thấy đồng hồ đã dời. */
  globalThis.Date = new Proxy(That, {
    construct(muc, doiSo, moi) {
      return doiSo.length === 0
        ? Reflect.construct(muc, [now()], moi)
        : Reflect.construct(muc, doiSo, moi);
    },
    get(muc, ten, nhan) {
      if (ten === "now") return now;
      return Reflect.get(muc, ten, nhan);
    }
  });
}
