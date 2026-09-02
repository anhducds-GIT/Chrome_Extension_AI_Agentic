(() => {
  "use strict";

  function serialise(value) {
    if (!value) return null;
    try { return JSON.stringify(value); } catch { return null; }
  }

  function parse(value) {
    if (!value || typeof value !== "string") return null;
    try { return JSON.parse(value); } catch { return null; }
  }

  function fieldsFromAttempt(attempt) {
    if (!attempt || typeof attempt !== "object") return {};
    const fields = {};
    if (attempt.submittedAt) fields.submitted_at = attempt.submittedAt;
    const detection = serialise(attempt.detection);
    if (detection) fields.detection_diagnostics = detection;
    return fields;
  }

  function auditFields(item) {
    return { submitted_at: item?.submitted_at || null, detection: parse(item?.detection_diagnostics) };
  }

  // F-21 (đo thật, lượt live F4R3 ngày 02/09): sổ cái ghi `detection_diagnostics`
  // HAI LẦN cho cùng một lượt. Lần đầu là `applyAttemptTelemetry` — nó mang theo
  // mọi thứ xác lập TRƯỚC cổng gửi (`typing_path`, `attach`, các số đo composer).
  // Lần sau là chỗ ghi kết quả, và nó **ghi thay trắng**. Nên trên đường video,
  // mọi chẩn đoán tiền-submit về sổ cái thành `undefined` — kể cả `attach`, vốn
  // đã nằm trong CARRIED_DIAGNOSTICS từ lâu. Lỗ này chỉ lộ ra khi chạy thật.
  //
  // `mergeDetection` là chỗ ghi lần sau **chồng lên** thay vì **xoá đi**: giữ
  // nguyên bản đã có, rồi đặt các trường mới lên trên. Chuỗi hỏng hoặc rỗng thì
  // coi như chưa có gì — không bao giờ ném, vì mất một dòng chẩn đoán còn hơn
  // làm hỏng lượt ghi sổ của một job đã tiêu credit thật.
  function mergeDetection(existing, values) {
    const base = parse(existing);
    const merged = { ...(base && typeof base === "object" && !Array.isArray(base) ? base : {}), ...(values || {}) };
    return serialise(merged) ?? serialise(values || {}) ?? "";
  }

  globalThis.DacAttemptTelemetry = { fieldsFromAttempt, auditFields, mergeDetection };
})();
