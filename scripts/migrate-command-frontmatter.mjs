/**
 * 一次性迁移脚本：把 command-catalog.ts 里的指令元数据回填到各 md 的 frontmatter。
 * 默认 dry-run 只打印；加 --write 才写文件。加 --sample 只看前 3 个文件。
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import matter from "gray-matter";

const WRITE = process.argv.includes("--write");
const SAMPLE = process.argv.includes("--sample");
const CATALOG_TS = "functions/_shared/command-catalog.ts";
const CATALOG_SOURCE = ".catalog-source.ts";
const TMP_BUNDLE = ".catalog-tmp.mjs";
const temporaries = [CATALOG_SOURCE, TMP_BUNDLE];
const FIELD_KEYS = [
  "commands",
  "commandTitle",
  "commandMain",
  "commandHint",
  "commandHints",
  "commandKeywords",
  "commandOrder",
];

const quote = (value) => `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function parseStringMap(source, constName) {
  const block = source.match(new RegExp(`const ${constName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!block) return {};
  const map = {};
  for (const line of block[1].split(/\r?\n/)) {
    const hit = line.match(/^\s*(?:"([^"]+)"|([^"':\s]+))\s*:\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$/);
    if (!hit) continue;
    map[hit[1] ?? hit[2]] = hit[3].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return map;
}

// 基准固定取 git 里的原版：工作区那份可能已被生成脚本覆盖，拿它当基准会互相污染
const catalogSource = execFileSync("git", ["show", `HEAD:${CATALOG_TS}`], { encoding: "utf8" });
const featureHints = parseStringMap(catalogSource, "featureHints");
writeFileSync(CATALOG_SOURCE, catalogSource, "utf8");

await build({
  entryPoints: [CATALOG_SOURCE],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: TMP_BUNDLE,
  logLevel: "silent",
});

const bundleUrl = pathToFileURL(resolve(TMP_BUNDLE)).href;
const { commandCategories, hintFor } = await import(`${bundleUrl}?t=${Date.now()}`);

function readFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

function stripManagedFields(head) {
  const lines = head.split(/\r?\n/);
  const kept = [];
  let skipping = false;
  for (const line of lines) {
    if (/^[A-Za-z_][\w-]*:/.test(line)) {
      skipping = FIELD_KEYS.includes(line.slice(0, line.indexOf(":")).trim());
    }
    if (!skipping) kept.push(line);
  }
  return kept.join("\n").replace(/\n+$/, "");
}

function buildBlock(item, order, page) {
  const lines = ["commands:"];
  for (const cmd of item.commands) lines.push(`  - ${quote(cmd)}`);

  // 目录里显示的标题/代表指令与页面自身不同时，才写覆盖字段
  if (item.title !== page.title) lines.push(`commandTitle: ${quote(item.title)}`);
  if (item.command !== page.command) lines.push(`commandMain: ${quote(item.command)}`);

  const titleHint = featureHints[item.title];
  if (titleHint) lines.push(`commandHint: ${quote(titleHint)}`);

  const hints = item.commands.map((cmd) => [cmd, hintFor(item.title, cmd)]).filter(([, hint]) => hint);
  if (hints.length) {
    lines.push("commandHints:");
    for (const [cmd, hint] of hints) lines.push(`  ${quote(cmd)}: ${quote(hint)}`);
  }

  if (item.keywords.length) {
    lines.push("commandKeywords:");
    for (const keyword of item.keywords) lines.push(`  - ${quote(keyword)}`);
  }

  lines.push(`commandOrder: ${order}`);
  return lines.join("\n");
}

const report = [];
let index = 0;

for (const category of commandCategories) {
  for (const item of category.items) {
    index += 1;
    const file = `src${item.link}.md`;
    if (!existsSync(file)) {
      report.push({ file, status: "缺文件", detail: item.title });
      continue;
    }
    const text = readFileSync(file, "utf8");
    const head = readFrontmatter(text);
    if (head === null) {
      report.push({ file, status: "无 frontmatter", detail: item.title });
      continue;
    }
    const { data: page } = matter(text);
    const pageTitle = String(page.title ?? "");
    const pageCommand = String(page.command ?? "");
    const stripped = stripManagedFields(head);
    const block = buildBlock(item, index, { title: pageTitle, command: pageCommand });
    const nextHead = `${stripped}\n${block}`;
    const nextText = text.replace(head, nextHead);

    const changed = nextText !== text;
    report.push({ file, status: changed ? "待写入" : "无需变更", detail: `${item.title} / ${category.name}` });

    if (WRITE && changed) writeFileSync(file, nextText, "utf8");

    if (SAMPLE && report.length >= 3) break;
  }
  if (SAMPLE && report.length >= 3) break;
}

for (const file of temporaries) {
  if (existsSync(file)) unlinkSync(file);
}

const counts = report.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] ?? 0) + 1 }), {});
console.log(`${WRITE ? "已写入" : "dry-run"}：`, counts);

if (process.argv.includes("--list")) {
  report
    .filter((row) => row.status === "待写入")
    .forEach((row) => console.log(`  ${row.file}  ${row.detail}`));
}

if (SAMPLE) {
  const sample = report[0]?.file;
  if (sample) {
    const raw = readFileSync(sample, "utf8");
    const { data: page } = matter(raw);
    const stripped = stripManagedFields(readFrontmatter(raw));
    console.log(`\n--- ${sample} 的 frontmatter 预览 ---`);
    console.log(
      `${stripped}\n${buildBlock(commandCategories[0].items[0], 1, {
        title: String(page.title ?? ""),
        command: String(page.command ?? ""),
      })}`,
    );
  }
}
