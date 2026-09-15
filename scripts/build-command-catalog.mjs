/**
 * 从文档页面的 frontmatter 生成指令目录（functions/_shared/command-catalog.ts）。
 * 真源：src/zhiling/**.md 的 commands / commandTitle / commandMain / commandHint / commandHints / commandKeywords / commandOrder
 * 运行：node scripts/build-command-catalog.mjs
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const DOCS_ROOT = "src/zhiling";
const OUT_TS = "functions/_shared/command-catalog.ts";
const README_PATTERN = /[\\/]README\.md$/;

const CATEGORIES = [
  { folder: "yule", name: "娱乐", factory: "yule" },
  { folder: "shiyong", name: "实用", factory: "shiyong" },
  { folder: "acg", name: "游戏", factory: "acg" },
  { folder: "yinyou", name: "音游", factory: "yinyou" },
  { folder: "AI", name: "AI", factory: "ai" },
];

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (name.endsWith(".md") && !README_PATTERN.test(full)) files.push(full);
  }
  return files;
}

const entries = [];
const withoutCommands = [];

for (const category of CATEGORIES) {
  for (const file of walk(join(DOCS_ROOT, category.folder))) {
    const link = file.replace(/\\/g, "/").replace(/^src/, "").replace(/\.md$/, "");
    const { data } = matter(readFileSync(file, "utf8"));
    if (!Array.isArray(data.commands) || data.commands.length === 0) {
      withoutCommands.push(link);
      continue;
    }
    entries.push({
      title: String(data.commandTitle ?? data.title),
      command: String(data.commandMain ?? data.command ?? data.commands[0]),
      commands: data.commands.map(String),
      link,
      keywords: Array.isArray(data.commandKeywords) ? data.commandKeywords.map(String) : [],
      titleHint: data.commandHint ? String(data.commandHint) : "",
      hints: data.commandHints && typeof data.commandHints === "object" ? data.commandHints : {},
      order: typeof data.commandOrder === "number" ? data.commandOrder : Number.MAX_SAFE_INTEGER,
      factory: category.factory,
      name: link.slice(`/zhiling/${category.folder}/`.length),
    });
  }
}

if (withoutCommands.length) {
  console.error("以下页面在指令分类目录里，但没写 commands 字段，速查页不会收录：");
  withoutCommands.forEach((link) => console.error(`  ${link}`));
  console.error("如果是指令页请补 commands，不是的话请移出分类目录。");
  process.exit(1);
}

const hintLines = [];
const titleHintLines = [];
const categoryBlocks = [];

for (const category of CATEGORIES) {
  const items = entries
    .filter((entry) => entry.factory === category.factory)
    .sort((a, b) => a.order - b.order);

  for (const entry of items) {
    for (const [cmd, hint] of Object.entries(entry.hints)) {
      hintLines.push(`  ${JSON.stringify(cmd)}: ${JSON.stringify(String(hint))},`);
    }
    if (entry.titleHint) {
      titleHintLines.push(`  ${JSON.stringify(entry.title)}: ${JSON.stringify(entry.titleHint)},`);
    }
  }

  const itemLines = items.map((entry) => {
    const commands = entry.commands.map((cmd) => JSON.stringify(cmd)).join(", ");
    const keywords = entry.keywords.map((word) => JSON.stringify(word)).join(", ");
    return `      ${category.factory}(${JSON.stringify(entry.name)}, ${JSON.stringify(entry.title)}, ${JSON.stringify(entry.command)}, [${commands}], [${keywords}]),`;
  });

  categoryBlocks.push(
    `  {
    name: ${JSON.stringify(category.name)},
    items: [
${itemLines.join("\n")}
    ],
  },`,
  );
}

const factories = CATEGORIES.map(
  (category) => `const ${category.factory} = folderEntry(${JSON.stringify(category.folder)});`,
).join("\n");

const output = `// 由 scripts/build-command-catalog.mjs 从文档页面 frontmatter 生成，请勿直接修改
// 真源：src/zhiling/**.md 里的 commands / commandTitle / commandMain / commandHint / commandHints / commandKeywords / commandOrder

export interface CommandEntry {
  title: string;
  command: string;
  commands: string[];
  link: string;
  keywords: string[];
}

export interface CommandCategory {
  name: string;
  items: CommandEntry[];
}

export interface RouteEntry {
  title: string;
  command: string;
  link: string;
  keywords: string[];
}

const featureHints: Record<string, string> = {
${titleHintLines.join("\n")}
};

const commandHints: Record<string, string> = {
${hintLines.join("\n")}
};

export function hintFor(title: string, command: string): string {
  return commandHints[command] ?? featureHints[title] ?? "";
}

const folderEntry =
  (folder: string) =>
  (name: string, title: string, command: string, commands: string[], keywords: string[]): CommandEntry => ({
    title,
    command,
    commands,
    link: \`/zhiling/\${folder}/\${name}\`,
    keywords,
  });

${factories}

export const commandCategories: CommandCategory[] = [
${categoryBlocks.join("\n")}
];

export const ROUTE_INDEX: RouteEntry[] = commandCategories.flatMap((category) =>
  category.items.map(({ title, command, link, keywords }) => ({ title, command, link, keywords }))
);
`;

writeFileSync(OUT_TS, output, "utf8");
console.log(`已生成 ${OUT_TS}：${CATEGORIES.length} 个分类 / ${entries.length} 条指令页面`);
