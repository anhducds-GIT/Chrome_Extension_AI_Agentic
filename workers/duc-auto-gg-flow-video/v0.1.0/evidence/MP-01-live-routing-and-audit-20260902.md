# MP-01 — Kiểm live multi-profile routing + audit Codex (2026-09-02)

Phiên: claude-bridge-multiprofile · Commit dưới audit: 6c59266 · Host deploy từ repo (byte-identical sau copy).

## Live, host mới trên cổng 32149 (chỉ lệnh đọc, 0 credit)

- Host cũ KHÔNG chạy lúc kiểm (cổng trống) → copy đè an toàn, khởi động bản mới.
- Trong ~2 giây sau khi host mở: 2 rồi 3 profile Chrome cùng nối, KHÔNG ai đá ai (trước đây một ghế).
- Cả 3 là legacy:true — extension trong profile còn chạy transport cũ trong RAM (chưa reload từ 28/08). Đúng thiết kế: legacy vẫn được liệt kê, vẫn nhắm đích được, vẫn fail-closed.
- ping KHÔNG --target với 3 kết nối → TARGET_AMBIGUOUS, retryable:false, kèm đủ 3 ứng viên (bằng chứng dưới).
- ping --target <legacy id> → ok:true, served_by đúng id đó.
- bridge-rpc.mjs diagnostics.dom_probe --target <legacy id khác> → EXECUTOR_UNAVAILABLE (panel chưa mở — trung thực), và CẢ PHẢN HỒI LỖI cũng mang served_by đúng đích.

## Audit độc lập (Codex, kênh auditmin + bypass sandbox, HEAD trước/sau không đổi: eea3d6f)

```
VERDICT: PASS
1. LOW — The half-open zombie-seat fix is not actually pinned by the named smoke test. The host correctly answers a peer FIN with `socket.end()` so that authoritative `close` cleanup runs (`bridge-host.mjs:303-315`), but the harness explicitly implements every simulated extension departure with `socket.destroy()`, not `socket.end()` (`bridge-multiprofile-host-smoke.mjs:57-76`, used at `bridge-multiprofile-host-smoke.mjs:219-221`, `258-260`, and `275-278`). Deleting `bridge-host.mjs:314` would therefore leave this smoke test green even though a bare-FIN MV3 death could again leave a zombie session.
2. LOW — The transport wiring checks in this smoke are lexical rather than behavioural. They only assert that storage-key and panel strings occur in source (`bridge-multiprofile-host-smoke.mjs:294-302`); deleting the line that actually attaches the instance block to authenticated WebSocket traffic (`bridge-transport-loopback.js:170-175`) would not fail this test. The separate reconnect-test diff does assert the emitted auth block and persisted identity (`DIFF-6c59266.patch:1043-1061`), so this is a limitation of the named multiprofile smoke, not an implementation failure.
3. LOW — Exactly-once submit behaviour is preserved by non-interference but is not behaviourally exercised here. Every relayed test request is `system.ping` (`bridge-multiprofile-host-smoke.mjs:101-123`), so this test would stay green if executor-side idempotency were later removed. In the audited host, the relay makes a shallow copy, removes only top-level `target`, and forwards the remaining envelope unchanged (`bridge-host.mjs:384-397`); the retry guidance for timeout/disconnect also remains the identical idempotency key (`bridge-host.mjs:18-19`). The commit’s only content-script change invokes the existing control helper on `current.button` at the mode-chip call site (`DIFF-6c59266.patch:225-237`), and the supplied files contain no `innerHTML`, `outerHTML`, or `insertAdjacentHTML` usage.
```

## Đối chất ghi chú LOW#1 của Codex — Codex SAI, đo lại bằng máy 02/09

Codex suy luận: xoá `socket.on("end", () => socket.end())` thì smoke vẫn xanh vì harness dùng destroy().
Đo thật (mutation, 2 lần: 28/08 và 02/09): xoá dòng đó → test ĐỎ ("session count never reached 2").
Trên Windows, destroy() phía client vẫn ra FIN; server allowHalfOpen không tự đóng → phiên ma → waitForSessions nổ. Pin là thật.

## Còn mở sau kiểm này

1. Tay Đức: reload extension ở TỪNG profile (hoặc restart Chrome) → hết legacy; mở panel từng profile điền ô 'Tên hồ sơ Chrome này'.
2. Host tôi khởi động là tạm cho phiên kiểm; dùng lâu dài thì đúp chuột START-BRIDGE_GG_Flow_Video.cmd (đã trỏ vào file mới).
3. run.trial video thật: cần panel mở + workbook + Dev Mode + Video mode + x1 — chưa chạy được tự động.
