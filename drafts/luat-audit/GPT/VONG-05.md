# Vòng 5 — inventory package rules

- Mốc nguồn cố định: `1ea8b429`.
- Google Sheet: https://docs.google.com/spreadsheets/d/1cMnIcpptLYmrIJlPkKPv50iioTU1tEpXbhP60v7tIrc/edit
- Đã append `R-262` → `R-379` (118 luật), không sửa `R-001` → `R-261`.
- Nguồn đã đọc:
  - `workers/duc-auto-gg-flow-video/v0.1.0/AGENTS.md`
  - `workers/duc-scouter/v0.1.0/AGENTS.md`
- Tại commit nguồn, hai thư mục package trên chỉ chứa `v0.1.0`; không có `workers/duc-auto-gg-flow-video/AGENTS.md` hay `workers/duc-scouter/AGENTS.md` ở cấp package.
- Đã kiểm tra lại Sheet: ID liên tục tới `R-379`; `Cưỡng chế` và `Đức duyệt` của các dòng mới đều trống.
- Chưa audit hook/chưa chấm cưỡng chế trong vòng này.
- Còn lại theo phạm vi hợp đồng: các nguồn chưa inventory sẽ xử lý ở vòng sau.
