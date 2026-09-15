/**
 * 验收脚本：比对「git 里的原版指令目录」与「从 md 生成的新版」是否完全等价。
 * 运行：node scripts/verify-catalog-equivalence.mjs
 */
import { execFileSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const CURRENT_TS = "functions/_shared/command-catalog.ts";
const BASE_TS = ".catalog-baseline.ts";
const BASE_BUNDLE = ".catalog-baseline.mjs";
const CURRENT_BUNDLE = ".catalog-current.mjs";
const temporaries = [BASE_TS, BASE_BUNDLE, CURRENT_BUNDLE];

const cleanup = () => {
  for (const file of temporaries) {
    try {
      unlinkSync(file);
    } catch {
      /* 文件不存在时忽略 */
    }
  }
};

writeFileSync(
  BASE_TS,
  execFileSync("git", ["show", `HEAD:${CURRENT_TS}`], { encoding: "utf8" }),
  "utf8",
);

for (const [entry, outfile] of [
  [BASE_TS, BASE_BUNDLE],
  [CURRENT_TS, CURRENT_BUNDLE],
]) {
  await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile,
    logLevel: "silent",
  });
}

const load = (file) => import(`${pathToFileURL(resolve(file)).href}?v=${Date.now()}`);
const baseline = await load(BASE_BUNDLE);
const current = await load(CURRENT_BUNDLE);

const problems = [];
const pick = (entry) => ({
  title: entry.title,
  command: entry.command,
  commands: entry.commands,
  link: entry.link,
  keywords: entry.keywords,
});

const namesOf = (mod) => mod.commandCategories.map((category) => category.name);
if (JSON.stringify(namesOf(baseline)) !== JSON.stringify(namesOf(current))) {
  problems.push(`分类顺序不同：${namesOf(baseline).join("/")} → ${namesOf(current).join("/")}`);
}

for (const [index, category] of baseline.commandCategories.entries()) {
  const counterpart = current.commandCategories[index];
  if (!counterpart) {
    problems.push(`缺少分类：${category.name}`);
    continue;
  }
  if (category.items.length !== counterpart.items.length) {
    problems.push(`分类「${category.name}」条目数 ${category.items.length} → ${counterpart.items.length}`);
  }
  for (const [position, item] of category.items.entries()) {
    const other = counterpart.items[position];
    if (!other) {
      problems.push(`分类「${category.name}」缺少第 ${position + 1} 条：${item.title}`);
      continue;
    }
    if (JSON.stringify(pick(item)) !== JSON.stringify(pick(other))) {
      problems.push(
        `分类「${category.name}」第 ${position + 1} 条不一致：\n    原 ${JSON.stringify(pick(item))}\n    新 ${JSON.stringify(pick(other))}`,
      );
    }
    for (const cmd of item.commands) {
      const before = baseline.hintFor(item.title, cmd);
      const after = current.hintFor(item.title, cmd);
      if (before !== after) {
        problems.push(`hintFor("${item.title}", "${cmd}")：${JSON.stringify(before)} → ${JSON.stringify(after)}`);
      }
    }
  }
}

if (JSON.stringify(baseline.ROUTE_INDEX) !== JSON.stringify(current.ROUTE_INDEX)) {
  problems.push("ROUTE_INDEX（后端意图路由用）不一致");
}

cleanup();

if (problems.length) {
  console.error(`发现 ${problems.length} 处不一致：`);
  problems.forEach((line) => console.error(`  - ${line}`));
  process.exit(1);
}

const itemCount = current.commandCategories.reduce((sum, category) => sum + category.items.length, 0);
console.log(`等价性校验通过：${current.commandCategories.length} 个分类 / ${itemCount} 条页面，结构、顺序、关键字、hint 全部一致`);
