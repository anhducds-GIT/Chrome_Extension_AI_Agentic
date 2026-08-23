/* Test-only helpers: a dependency-free ZIP reader and the minimal XML DOM that
   xlsx-codec.js needs.  The suite previously shelled out to the system `tar`,
   which reads ZIP under bsdtar but fails under the GNU tar shipped with Git
   Bash.  Node's zlib is always present, so tests stay shell-independent. */
import fs from "node:fs";
import zlib from "node:zlib";

export function unzip(file) {
  const buffer = fs.readFileSync(file);
  let end = -1;
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) { end = index; break; }
  }
  if (end < 0) throw new Error(`Not a ZIP archive: ${file}`);
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const entries = new Map();
  for (let index = 0; index < count; index += 1) {
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameSize = buffer.readUInt16LE(offset + 28);
    const extraSize = buffer.readUInt16LE(offset + 30);
    const commentSize = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.slice(offset + 46, offset + 46 + nameSize).toString();
    const localNameSize = buffer.readUInt16LE(localOffset + 26);
    const localExtraSize = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameSize + localExtraSize;
    const payload = buffer.slice(start, start + compressedSize);
    entries.set(name, (method === 0 ? payload : zlib.inflateRawSync(payload)).toString("utf8"));
    offset += 46 + nameSize + extraSize + commentSize;
  }
  return entries;
}

/* ---- minimal XML DOM ---------------------------------------------------- */

function createNode(tag, namespaceURI) {
  return {
    tagName: tag,
    namespaceURI,
    attributes: new Map(),
    childNodes: [],
    ownText: "",
    get firstChild() { return this.childNodes[0] || null; },
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; },
    setAttribute(name, value) { this.attributes.set(name, String(value)); },
    appendChild(node) { this.childNodes.push(node); return node; },
    removeChild(node) { this.childNodes = this.childNodes.filter((child) => child !== node); return node; },
    getElementsByTagNameNS(_namespace, name) {
      const found = [];
      const walk = (node) => {
        for (const child of node.childNodes) {
          if (name === "*" || child.tagName === name) found.push(child);
          walk(child);
        }
      };
      walk(this);
      return found;
    },
    get textContent() {
      return this.ownText + this.childNodes.map((child) => child.textContent).join("");
    },
    set textContent(value) {
      this.childNodes = [];
      this.ownText = String(value ?? "");
    }
  };
}

const decodeXmlEntities = (text) => text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const SELF_CLOSING_TAG = /^<([:\w.-]+)((?:\s+[:\w.-]+="[^"]*")*)\s*\/>/;
const OPEN_TAG = /^<([:\w.-]+)((?:\s+[:\w.-]+="[^"]*")*)\s*>/;
const ATTR_PAIR = /([:\w.-]+)="([^"]*)"/g;

function readAttrs(attrText) {
  const attrs = [];
  let match;
  ATTR_PAIR.lastIndex = 0;
  while ((match = ATTR_PAIR.exec(attrText))) attrs.push([match[1], decodeXmlEntities(match[2])]);
  return attrs;
}

// A small, non-general-purpose XML parser: it only has to handle the exact
// subset xlsx-codec.js produces and consumes (no CDATA, no comments, no
// nested default-namespace redeclarations), the same scope-limited spirit as
// the fake DOM above. Node has no built-in DOMParser, and this project
// deliberately stays dependency-free even in its tests.
export function parseXmlDocument(text) {
  let i = (/^\s*<\?xml[^?]*\?>\s*/.exec(text) || [""])[0].length;
  function parseNode() {
    const selfClosing = SELF_CLOSING_TAG.exec(text.slice(i));
    if (selfClosing) {
      i += selfClosing[0].length;
      const node = createNode(selfClosing[1], null);
      for (const [key, value] of readAttrs(selfClosing[2])) node.setAttribute(key, value);
      return node;
    }
    const open = OPEN_TAG.exec(text.slice(i));
    if (!open) throw new Error(`parseXmlDocument: expected a tag at ${i}: ${text.slice(i, i + 40)}`);
    i += open[0].length;
    const [, tagName, attrText] = open;
    const node = createNode(tagName, null);
    for (const [key, value] of readAttrs(attrText)) node.setAttribute(key, value);
    const closeTag = `</${tagName}>`;
    while (!text.startsWith(closeTag, i)) {
      if (text[i] === "<") { node.appendChild(parseNode()); continue; }
      const nextLt = text.indexOf("<", i);
      const raw = nextLt === -1 ? text.slice(i) : text.slice(i, nextLt);
      node.ownText += decodeXmlEntities(raw);
      i = nextLt === -1 ? text.length : nextLt;
    }
    i += closeTag.length;
    return node;
  }
  const root = parseNode();
  return { documentElement: root, getElementsByTagNameNS: (ns, name) => root.getElementsByTagNameNS(ns, name), createElementNS: (ns, tag) => createNode(tag, ns) };
}

export class FakeDOMParser {
  parseFromString(text) { return parseXmlDocument(text); }
}

export function createDocument(rootTag, namespaceURI = "http://schemas.openxmlformats.org/spreadsheetml/2006/main") {
  const root = createNode(rootTag, namespaceURI);
  const document = {
    documentElement: root,
    createElementNS(namespace, tag) { return createNode(tag, namespace); },
    getElementsByTagNameNS(namespace, name) { return root.getElementsByTagNameNS(namespace, name); }
  };
  return { document, root };
}

const escapeXml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function serialize(node) {
  const attributes = [...node.attributes].map(([name, value]) => ` ${name}="${escapeXml(value)}"`).join("");
  const children = node.childNodes.map(serialize).join("");
  return `<${node.tagName}${attributes}>${escapeXml(node.ownText)}${children}</${node.tagName}>`;
}

export class FakeXMLSerializer {
  serializeToString(document) { return serialize(document.documentElement); }
}

/* Builds the shape xlsx-codec.js `open()` returns for a config worksheet, so
   updateConfigSnapshot can be exercised without a real browser DOM. */
export function createConfigWorkbook(rows = []) {
  const { document, root } = createDocument("worksheet");
  const sheetData = document.createElementNS(root.namespaceURI, "sheetData");
  root.appendChild(sheetData);

  const addRow = (rowNumber, cells) => {
    const row = document.createElementNS(root.namespaceURI, "row");
    row.setAttribute("r", String(rowNumber));
    cells.forEach((value, column) => {
      const cell = document.createElementNS(root.namespaceURI, "c");
      cell.setAttribute("r", `${String.fromCharCode(65 + column)}${rowNumber}`);
      cell.setAttribute("t", "inlineStr");
      const is = document.createElementNS(root.namespaceURI, "is");
      const text = document.createElementNS(root.namespaceURI, "t");
      text.textContent = value;
      is.appendChild(text);
      cell.appendChild(is);
      row.appendChild(cell);
    });
    sheetData.appendChild(row);
    return row;
  };

  const built = [addRow(1, ["key", "value"]), ...rows.map((cells, index) => addRow(index + 2, cells))];
  return {
    fileName: "fixture__results__v001.xlsx",
    configPath: "xl/worksheets/sheet2.xml",
    configSheet: { document, rows: built, sharedStrings: [] },
    config: Object.fromEntries(rows),
    entries: new Map(),
    jobs: [],
    headers: []
  };
}
