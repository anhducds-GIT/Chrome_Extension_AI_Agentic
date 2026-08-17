# Canonical V0 Trial Test Prompts

Use this exact queue to verify the narrow sequential text-batch baseline.

```text
Trả lời chính xác: TEST 01 PASS
---
Tính 12 × 7 và chỉ trả lời kết quả.
---
Trả lời chính xác: TEST 03 COMPLETE
```

Expected sequence:

1. `TEST 01 PASS`
2. `84`
3. `TEST 03 COMPLETE`

Pass condition:

- Queue count resolves to 3 prompts.
- Each prompt is sent once.
- Prompt N+1 is sent only after prompt N receives a completed assistant response.
- Outputs appear in the expected order.
