import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_FILE = path.resolve(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PARITY_FILE = "FEATURE-PARITY.md";
const GPT_DIR = "workers/duc-auto-chatgpt/v0.1.0";
const GEMINI_DIR = "workers/duc-auto-gemini/v0.2.0";
export const AUTO_BLOCKS = ["BRIDGE", "MODULES", "DEBT-METHODS"];
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

export function normalizeNewlines(text) {
  return String(text).replace(/\r\n?/g, "\n");
}

export function extractRegistryMethods(text) {
  const methods = [];
  const pattern = /registryEntry\s*\(\s*\{\s*name\s*:\s*(["'])(.*?)\1/gs;
  for (const match of String(text).matchAll(pattern)) methods.push(match[2]);
  return [...new Set(methods)].sort(compareText);
}

export function subtractSets(left, right) {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((value) => !rightSet.has(value)).sort(compareText);
}

export function normalizedHash(text) {
  return createHash("sha256").update(normalizeNewlines(text), "utf8").digest("hex");
}

export function countLines(text) {
  const normalized = normalizeNewlines(text);
  if (!normalized) return 0;
  return normalized.split("\n").length;
}

function moduleMap(deps, directory) {
  return new Map(
    deps.listFiles(directory)
      .filter((name) => name.toLowerCase().endsWith(".js"))
      .sort(compareText)
      .map((name) => {
        const text = deps.readFile(`${directory}/${name}`);
        return [name, { hash: normalizedHash(text), lines: countLines(text) }];
      })
  );
}

export function collectParityModel(deps = createDefaultDeps()) {
  const gptMethods = extractRegistryMethods(deps.readFile(`${GPT_DIR}/bridge-core.js`));
  const geminiMethods = extractRegistryMethods(deps.readFile(`${GEMINI_DIR}/bridge-core.js`));
  const gptModules = moduleMap(deps, GPT_DIR);
  const geminiModules = moduleMap(deps, GEMINI_DIR);
  const allModuleNames = [...new Set([...gptModules.keys(), ...geminiModules.keys()])].sort(compareText);

  const sharedIdentical = [];
  const different = [];
  for (const name of allModuleNames) {
    const gpt = gptModules.get(name);
    const gemini = geminiModules.get(name);
    if (!gpt || !gemini) continue;
    if (gpt.hash === gemini.hash) sharedIdentical.push(name);
    else different.push({ name, gptLines: gpt.lines, geminiLines: gemini.lines, delta: Math.abs(gpt.lines - gemini.lines) });
  }
  different.sort((left, right) => right.delta - left.delta || compareText(left.name, right.name));

  return {
    bridge: {
      gpt: gptMethods,
      gemini: geminiMethods,
      onlyGpt: subtractSets(gptMethods, geminiMethods),
      onlyGemini: subtractSets(geminiMethods, gptMethods)
    },
    modules: {
      gptCount: gptModules.size,
      geminiCount: geminiModules.size,
      sharedIdentical,
      onlyGpt: subtractSets([...gptModules.keys()], [...geminiModules.keys()]),
      onlyGemini: subtractSets([...geminiModules.keys()], [...gptModules.keys()]),
      different
    }
  };
}

function codeList(items, emptyText = "không có") {
  return items.length ? items.map((item) => `\`${item}\``).join(" · ") : emptyText;
}

export function renderAutoBlocks(model) {
  const allMethods = [...new Set([...model.bridge.gpt, ...model.bridge.gemini])].sort(compareText);
  const bridge = [
    `**GPT ${model.bridge.gpt.length} · Gemini ${model.bridge.gemini.length}.**`,
    "",
    "| Method | GPT | Gemini |",
    "|---|---:|---:|",
    ...allMethods.map((name) => `| \`${name}\` | ${model.bridge.gpt.includes(name) ? "✅" : "❌"} | ${model.bridge.gemini.includes(name) ? "✅" : "❌"} |`),
    "",
    `**Chỉ GPT có (${model.bridge.onlyGpt.length}):** ${codeList(model.bridge.onlyGpt)}.`,
    "",
    `**Chỉ Gemini có (${model.bridge.onlyGemini.length}):** ${codeList(model.bridge.onlyGemini)}.`
  ].join("\n");

  const onlyModules = [
    ...model.modules.onlyGpt.map((name) => [name, "GPT"]),
    ...model.modules.onlyGemini.map((name) => [name, "Gemini"])
  ].sort((left, right) => compareText(left[0], right[0]));
  const modules = [
    `GPT ${model.modules.gptCount} file \`.js\` · Gemini ${model.modules.geminiCount}.`,
    "",
    `**${model.modules.sharedIdentical.length} file giống hệt sau khi chuẩn hoá CRLF/LF:**`,
    "",
    codeList(model.modules.sharedIdentical),
    "",
    "**Chỉ một bên có:**",
    "",
    "| File | Bên nào |",
    "|---|---|",
    ...(onlyModules.length ? onlyModules.map(([name, side]) => `| \`${name}\` | ${side} |`) : ["| — | Không có |"]),
    "",
    `**${model.modules.different.length} file có ở cả hai nhưng khác nội dung** (xếp theo chênh lệch số dòng giảm dần):`,
    "",
    "| File | GPT (dòng) | Gemini (dòng) | Chênh lệch |",
    "|---|---:|---:|---:|",
    ...model.modules.different.map((item) => `| \`${item.name}\` | ${item.gptLines} | ${item.geminiLines} | ${item.delta} |`)
  ].join("\n");

  const debtMethods = [
    "**Nợ method Bridge — [ĐO]:**",
    "",
    `- **Gemini nợ GPT (${model.bridge.onlyGpt.length}):** ${codeList(model.bridge.onlyGpt)}.`,
    `- **GPT nợ Gemini (${model.bridge.onlyGemini.length}):** ${codeList(model.bridge.onlyGemini)}.`
  ].join("\n");

  return { BRIDGE: bridge, MODULES: modules, "DEBT-METHODS": debtMethods };
}

function marker(name, edge) {
  return `<!-- AUTO:${name} ${edge} -->`;
}

function locateBlock(source, name) {
  const startToken = marker(name, "START");
  const endToken = marker(name, "END");
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken);
  if (start < 0) throw new Error(`PARITY_MARKER_MISSING: thiếu marker ${startToken}. Không ghi file.`);
  if (end < 0) throw new Error(`PARITY_MARKER_MISSING: thiếu marker ${endToken}. Không ghi file.`);
  if (source.indexOf(startToken, start + startToken.length) >= 0 || source.indexOf(endToken, end + endToken.length) >= 0) {
    throw new Error(`PARITY_MARKER_DUPLICATE: marker AUTO:${name} phải xuất hiện đúng một lần. Không ghi file.`);
  }
  if (end < start + startToken.length) throw new Error(`PARITY_MARKER_ORDER: marker AUTO:${name} sai thứ tự. Không ghi file.`);
  return { name, startToken, endToken, start, contentStart: start + startToken.length, end };
}

export function replaceAutoBlocks(source, blocks) {
  const locations = AUTO_BLOCKS.map((name) => locateBlock(source, name)).sort((left, right) => right.start - left.start);
  let result = source;
  for (const location of locations) {
    if (typeof blocks[location.name] !== "string") throw new Error(`PARITY_BLOCK_MISSING: thiếu nội dung sinh cho AUTO:${location.name}.`);
    result = `${result.slice(0, location.contentStart)}\n${blocks[location.name]}\n${result.slice(location.end)}`;
  }
  return result;
}

export function compareParity(expected, actual) {
  const expectedLines = normalizeNewlines(expected).split("\n");
  const actualLines = normalizeNewlines(actual).split("\n");
  const length = Math.max(expectedLines.length, actualLines.length);
  for (let index = 0; index < length; index += 1) {
    if (expectedLines[index] !== actualLines[index]) {
      return {
        matches: false,
        line: index + 1,
        expected: expectedLines[index] ?? "<thiếu dòng>",
        actual: actualLines[index] ?? "<thiếu dòng>"
      };
    }
  }
  return { matches: true };
}

export function runFeatureParity({ check = false, deps = createDefaultDeps(), output = console } = {}) {
  try {
    const current = deps.readFile(PARITY_FILE);
    const generated = replaceAutoBlocks(current, renderAutoBlocks(collectParityModel(deps)));
    if (!check) {
      deps.writeFile(PARITY_FILE, generated);
      output.log("Đã cập nhật các khối tự động trong FEATURE-PARITY.md.");
      return 0;
    }

    const comparison = compareParity(generated, current);
    if (comparison.matches) {
      output.log("FEATURE-PARITY.md đang khớp với số đo trong repo.");
      return 0;
    }
    output.error(`FEATURE-PARITY.md lệch tại dòng ${comparison.line}.`);
    output.error(`- Đang có: ${comparison.actual}`);
    output.error(`- Cần có: ${comparison.expected}`);
    output.error("Hãy sửa bằng lệnh: node scripts/feature-parity.mjs");
    return 1;
  } catch (error) {
    output.error(`Không thể xử lý FEATURE-PARITY.md: ${error.message}`);
    return 1;
  }
}

export function createDefaultDeps(root = ROOT) {
  const absolute = (relPath) => path.join(root, ...relPath.replaceAll("\\", "/").split("/"));
  return {
    readFile: (relPath) => fs.readFileSync(absolute(relPath), "utf8"),
    writeFile: (relPath, text) => fs.writeFileSync(absolute(relPath), text, "utf8"),
    listFiles: (relPath) => fs.readdirSync(absolute(relPath), { withFileTypes: true })
      .filter((entry) => entry.isFile()).map((entry) => entry.name).sort(compareText)
  };
}

export function createHeadDeps(root = ROOT) {
  const git = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return {
    readFile: (relPath) => git("show", `HEAD:${relPath}`),
    writeFile: () => { throw new Error("HEAD_READ_ONLY: --check-head không được ghi file."); },
    listFiles: (relPath) => git("ls-tree", "-z", "--name-only", `HEAD:${relPath}`)
      .split("\0").filter(Boolean).sort(compareText)
  };
}

function main() {
  const args = process.argv.slice(2);
  const checkHead = args.includes("--check-head");
  process.exitCode = runFeatureParity({
    check: checkHead || args.includes("--check"),
    deps: checkHead ? createHeadDeps() : createDefaultDeps()
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_FILE) main();
