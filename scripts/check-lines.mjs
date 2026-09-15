/**
 * 台词体检：查重、查长度、查名字对不对得上、查禁用词。
 * 改完 live-lines.ts 跑一次 `npm run lint:lines` 就知道有没有手滑。
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "src", ".vuepress", "components");

/** 单句超过这个字数就偏长，气泡会挤；超过上限直接算错 */
const LINE_WARN_CHARS = 26;
const LINE_MAX_CHARS = 40;
/** 一个都不许出现在站点里的词 */
const BAD_WORDS = [
  "妈的", "傻逼", "沙币", "智障", "脑残", "草泥马", "尼玛", "死全家",
  "贱人", "去死", "烂货", "妓", "婊", "滚出去",
];
const EMOJI = /\p{Extended_Pictographic}/u;

const errors = [];
const warnings = [];

/** 单句池：池名 → 该池里的台词 */
const singlePools = new Map();
const collectPool = (name, lines) => {
  if (Array.isArray(lines)) singlePools.set(name, [...lines]);
};
/** 台词 → 出现在哪些地方（跨池重复只提示，不算错） */
const linePlaces = new Map();
/** 整段对话的指纹 → 第一次出现在哪儿 */
const blockSeen = new Map();

function noteLine(text, where) {
  const places = linePlaces.get(text) ?? [];
  places.push(where);
  linePlaces.set(text, places);
}

function checkText(text, where) {
  const length = [...text].length;
  if (length > LINE_MAX_CHARS) errors.push(`太长（${length} 字）：${where} 「${text}」`);
  else if (length > LINE_WARN_CHARS) warnings.push(`偏长（${length} 字）：${where} 「${text}」`);
  for (const word of BAD_WORDS) {
    if (text.includes(word)) errors.push(`可疑词「${word}」：${where} 「${text}」`);
  }
  if (EMOJI.test(text)) errors.push(`不该有 emoji：${where} 「${text}」`);
}

const { SPEECH_LINES, MOOD_LINES, CHAT_TURNS, CHAT_MOMENTS } = await import(
  pathToFileURL(path.join(dir, "live-lines.ts")).href
);

for (const [kind, pools] of Object.entries(SPEECH_LINES)) {
  for (const [type, lines] of Object.entries(pools)) collectPool(`SPEECH_LINES.${kind}.${type}`, lines);
}
for (const [kind, pools] of Object.entries(MOOD_LINES)) {
  for (const [state, lines] of Object.entries(pools)) collectPool(`MOOD_LINES.${kind}.${state}`, lines);
}

// 同一池里出现两条一模一样的，基本就是手滑
for (const [name, lines] of singlePools) {
  const seen = new Map();
  lines.forEach((line, index) => {
    if (seen.has(line)) errors.push(`同一池重复：${name}[${index}] 与 [${seen.get(line)}] 「${line}」`);
    else seen.set(line, index);
    checkText(line, `${name}[${index}]`);
    noteLine(line, name);
  });
}

/** 一段对话：整段查重、逐句查长度与禁用词 */
function checkBlock(where, turns) {
  const key = turns.map((turn) => `${turn.by}:${turn.line}`).join(" | ");
  if (blockSeen.has(key)) errors.push(`整段重复：${where} 与 ${blockSeen.get(key)}`);
  else blockSeen.set(key, where);

  const inThisBlock = new Set();
  turns.forEach((turn, index) => {
    checkText(turn.line, `${where}[${index}]`);
    // 同一段里复读（三个人一起喊「布丁！」）是刻意的，不算跨段重复
    if (inThisBlock.has(turn.line)) return;
    inThisBlock.add(turn.line);
    noteLine(turn.line, where);
  });
}

for (const [cast, list] of Object.entries(CHAT_TURNS)) {
  list.forEach((turns, index) => checkBlock(`CHAT_TURNS.${cast}[${index}]`, turns));
}
CHAT_MOMENTS.forEach((moment, index) => checkBlock(`CHAT_MOMENTS[${index}]`, moment.turns));

// 同一句话出现在两个地方：不一定错，但值得看一眼
for (const [line, places] of linePlaces) {
  const where = [...new Set(places)];
  if (where.length > 1) warnings.push(`同一句话出现在 ${where.length} 处：「${line}」 ← ${where.join("、")}`);
}

const showSource = await readFile(path.join(dir, "live-show.ts"), "utf8");
const actNames = new Set([...showSource.matchAll(/name: "([a-z]+)"/g)].map((match) => match[1]));
const eggsSource = await readFile(path.join(dir, "neko-shared-eggs.ts"), "utf8");
const sliceBlock = (start) => {
  const from = eggsSource.indexOf(start);
  return from < 0 ? "" : eggsSource.slice(from, eggsSource.indexOf("\n};", from));
};
/** 首页会点亮功能站那边的蛋（比如 Xterfusion），所以两边合起来算 */
const eggNames = new Set(
  [sliceBlock("export const TOOLS_EGGS"), sliceBlock("export const DOCS_EGGS")].flatMap((block) =>
    [...block.matchAll(/(\w+):\s*['"]/g)].map((match) => match[1])
  )
);
const eggHintBlock = sliceBlock("export const EGG_HINTS");

CHAT_MOMENTS.forEach((moment, index) => {
  if (moment.egg && !eggNames.has(moment.egg)) {
    errors.push(`彩蛋名对不上：CHAT_MOMENTS[${index}] 的 egg「${moment.egg}」不在 DOCS_EGGS 里`);
  }
  moment.turns.forEach((turn, turnIndex) => {
    if (turn.act && !actNames.has(turn.act)) {
      errors.push(`演出名对不上：CHAT_MOMENTS[${index}][${turnIndex}] 的 act「${turn.act}」不在 PLAY_SCRIPTS 里`);
    }
  });
});

// 册子里每颗蛋都得有提示文案，不然收集页会出现一行空白
for (const id of eggNames) {
  if (!new RegExp(`^\\s*${id}:`, "m").test(eggHintBlock)) errors.push(`彩蛋 ${id} 没写提示文案`);
}

const blockCount = CHAT_MOMENTS.length + Object.values(CHAT_TURNS).reduce((sum, list) => sum + list.length, 0);
const lineCount = [...singlePools.values()].reduce((sum, lines) => sum + lines.length, 0);

console.log(`台词体检：对话 ${blockCount} 段、单句 ${lineCount} 条\n`);
if (warnings.length > 0) {
  console.log(`提示 ${warnings.length} 条：`);
  for (const warning of warnings) console.log(`  · ${warning}`);
  console.log("");
}
if (errors.length > 0) {
  console.log(`问题 ${errors.length} 条：`);
  for (const error of errors) console.log(`  · ${error}`);
  process.exitCode = 1;
} else {
  console.log("没有发现问题。");
}
