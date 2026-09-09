/* BỘ DỰNG MARKDOWN TỐI THIỂU — đủ cho tài liệu của repo này, không hơn.
 *
 * Vì sao tự viết thay vì kéo một thư viện: trang sinh ra là một file HTML tĩnh đem đi publish,
 * và mọi thư viện ngoài đều phải tải từ mạng lúc xem. Một bảng trạng thái mà phụ thuộc mạng để
 * hiện chữ là một bảng sẽ có ngày trắng trang. Phần markdown thật sự dùng trong repo này nhỏ —
 * bảng, danh sách, khối mã, trích dẫn — nên tự dựng rẻ hơn nhiều so với cái giá đó.
 *
 * CỐ Ý KHÔNG hỗ trợ: HTML thô trong markdown, ảnh, chú thích, danh sách lồng nhiều tầng. Gặp thì
 * nó in ra như văn bản thường chứ không vỡ trang.
 */

import { veLuuDo } from "./luu-do.mjs";

const NL = String.fromCharCode(10);
// Khai NGAY ĐÂY, trên mọi chỗ dùng. Để dưới thì vô hại vì chỉ đọc trong thân hàm — nhưng đó
// đúng kiểu viết đã làm session gate chết ngay khi nạp (03/09), và một lần là đủ.
const CR_RE = /\r?\n/;

export function esc(s) {
  return String(s)
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;");
}

/* Inline: **đậm** · `mã` · [chữ](đích) · *nghiêng*. Chạy SAU khi đã escape, nên thẻ sinh ra ở
   đây là thẻ duy nhất — không có đường cho HTML của tài liệu lọt vào trang. */
export function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, chu, dich) =>
    /^https?:\/\//.test(dich) ? `<a href="${dich}" target="_blank" rel="noopener">${chu}</a>` : `<span class="ref">${chu}</span>`);
  return s;
}

function bang(dong) {
  // dong[1] là dòng gạch ngang của markdown — bỏ, nó chỉ để canh cột.
  const o = (l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const dau = o(dong[0]);
  const than = dong.slice(2).map(o);
  const th = dau.map((c) => `<th>${inline(c)}</th>`).join("");
  const tr = than.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("");
  return `<div class="tw"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}

export function md(text) {
  const dong = String(text).split(CR_RE);
  const ra = [];
  let i = 0;

  while (i < dong.length) {
    const l = dong[i];

    /* Khối mã. Mermaid được VẼ THÀNH SVG ngay ở đây.
     *
     * Chú thích cũ ở dòng này nói "giữ nguyên để trang tự vẽ, không cần thư viện" — và trang
     * KHÔNG BAO GIỜ vẽ, vì chẳng có thư viện nào được nạp. Bảy lưu đồ hiện ra là mã nguồn, suốt
     * từ v0.3.0 tới 08/09. Xem `scripts/luu-do.mjs`.
     *
     * Vẽ không được thì lùi về mã nguồn nhưng KÈM MỘT DÒNG NÓI RÕ. Lùi im lặng chính là cách lỗi
     * cũ sống lâu tới thế: trang trông vẫn bình thường, nên không ai biết nó đang thiếu hình. */
    if (/^```/.test(l)) {
      const ngonNgu = l.slice(3).trim();
      const than = [];
      i += 1;
      while (i < dong.length && !/^```/.test(dong[i])) { than.push(dong[i]); i += 1; }
      i += 1;
      if (ngonNgu === "mermaid") {
        const svg = veLuuDo(than.join(NL));
        ra.push(svg || `<pre class="mermaid">${esc(than.join(NL))}</pre>`
          + `<p class="luu-do-hong">SƠ ĐỒ CHƯA VẼ ĐƯỢC — cú pháp nằm ngoài tập con mà scripts/luu-do.mjs đỡ. Đang in mã nguồn thay hình.</p>`);
        continue;
      }
      ra.push(`<pre class="code"><code>${esc(than.join(NL))}</code></pre>`);
      continue;
    }

    if (/^\|/.test(l) && i + 1 < dong.length && /^\|[\s:|-]+\|?\s*$/.test(dong[i + 1])) {
      const than = [];
      while (i < dong.length && /^\|/.test(dong[i])) { than.push(dong[i]); i += 1; }
      ra.push(bang(than));
      continue;
    }

    if (/^>/.test(l)) {
      const than = [];
      while (i < dong.length && /^>/.test(dong[i])) { than.push(dong[i].replace(/^>\s?/, "")); i += 1; }
      ra.push(`<blockquote>${inline(than.join(" "))}</blockquote>`);
      continue;
    }

    if (/^(\s*)[-*]\s+/.test(l)) {
      const muc = [];
      while (i < dong.length && /^(\s*)[-*]\s+/.test(dong[i])) { muc.push(dong[i].replace(/^(\s*)[-*]\s+/, "")); i += 1; }
      ra.push(`<ul>${muc.map((m) => `<li>${inline(m)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(l)) {
      const muc = [];
      while (i < dong.length && /^\d+\.\s+/.test(dong[i])) { muc.push(dong[i].replace(/^\d+\.\s+/, "")); i += 1; }
      ra.push(`<ol>${muc.map((m) => `<li>${inline(m)}</li>`).join("")}</ol>`);
      continue;
    }

    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const bac = h[1].length + 1;               // # của tài liệu thành h2 của trang
      ra.push(`<h${Math.min(bac, 5)}>${inline(h[2])}</h${Math.min(bac, 5)}>`);
      i += 1;
      continue;
    }

    if (l.trim() === "" || /^---+$/.test(l.trim())) { i += 1; continue; }

    const doan = [];
    while (i < dong.length && dong[i].trim() !== "" && !/^(#{1,4}\s|\||>|```|\s*[-*]\s|\d+\.\s)/.test(dong[i])) {
      doan.push(dong[i]); i += 1;
    }
    if (doan.length) ra.push(`<p>${inline(doan.join(" "))}</p>`);
  }
  return ra.join(NL);
}


/* Frontmatter YAML một tầng — đủ cho `kind:`, `ten:`, `ai_chay:`. Không dùng thư viện YAML vì
   thứ duy nhất repo này khai là cặp khoá–giá trị phẳng, và một bộ đọc YAML đầy đủ sẽ chấp nhận
   những thứ mà tài liệu ở đây không bao giờ nên có. */
export function tachFrontmatter(text) {
  const s = String(text);
  if (!s.startsWith("---")) return { fm: {}, than: s };
  const het = s.indexOf(NL + "---", 3);
  if (het < 0) return { fm: {}, than: s };
  const fm = {};
  for (const l of s.slice(3, het).split(CR_RE)) {
    const m = l.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  return { fm, than: s.slice(het + 4).replace(/^\r?\n/, "") };
}
