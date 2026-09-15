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

const { SPEECH_LINES, MOOD_LINES, CHAT_TURNS, CHAT_MOMENTS, CHAT_IMPROV, LINE_GESTURES, MOOD_GESTURES, DROP_LINES } =
  await import(pathToFileURL(path.join(dir, "live-lines.ts")).href);
/** 台词文件的源码：有两项检查要在源码里数一数 */
const linesSource = await readFile(path.join(dir, "live-lines.ts"), "utf8");

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
const actNames = new Set([...showSource.matchAll(/name: "([a-zA-Z]+)"/g)].map((match) => match[1]));
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

// 彩蛋：点亮的蛋必须真的在册子里
CHAT_MOMENTS.forEach((moment, index) => {
  if (moment.egg && !eggNames.has(moment.egg)) {
    errors.push(`彩蛋名对不上：CHAT_MOMENTS[${index}] 的 egg「${moment.egg}」不在彩蛋册子里`);
  }
});

// 互动：名字要对得上演出脚本，而且一段里最多插一个（多了会变成一路打下去）
const allBlocks = [
  ...Object.entries(CHAT_TURNS).flatMap(([cast, list]) =>
    list.map((turns, index) => [`CHAT_TURNS.${cast}[${index}]`, turns])
  ),
  ...CHAT_MOMENTS.map((moment, index) => [`CHAT_MOMENTS[${index}]`, moment.turns]),
];
for (const [where, turns] of allBlocks) {
  const acts = turns.filter((turn) => turn.act);
  if (acts.length > 1) errors.push(`一段里插了 ${acts.length} 个互动：${where}`);
  for (const turn of acts) {
    if (!actNames.has(turn.act)) {
      errors.push(`演出名对不上：${where} 的 act「${turn.act}」不在 PLAY_SCRIPTS 里`);
    }
  }
}

// 册子里每颗蛋都得有提示文案，不然收集页会出现一行空白
for (const id of eggNames) {
  if (!new RegExp(`^\\s*${id}:`, "m").test(eggHintBlock)) errors.push(`彩蛋 ${id} 没写提示文案`);
}

// 说话时的小动作：挂在不存在的话上会永远不触发，CSS 里没写的动作会静默失效
const homeSource = await readFile(path.join(dir, "HomeLive.vue"), "utf8");
const definedGestures = new Set(
  [...homeSource.matchAll(/\[data-gesture="(\w+)"\]/g)].map((match) => match[1])
);
const usedGestures = new Set(
  [...Object.values(LINE_GESTURES), ...Object.values(MOOD_GESTURES)].filter(Boolean)
);
for (const [line, gesture] of Object.entries(LINE_GESTURES)) {
  if (!linePlaces.has(line)) errors.push(`动作挂在了一句不存在的话上：「${line}」→ ${gesture}`);
}
for (const gesture of usedGestures) {
  if (!definedGestures.has(gesture)) errors.push(`动作 ${gesture} 没有对应的 CSS 规则`);
}
for (const gesture of definedGestures) {
  if (!usedGestures.has(gesture)) warnings.push(`动作 ${gesture} 定义了却没人用`);
}

// 台词里明摆着带着动作（跳、打呼、眨眼…）却只有点头，多半是漏配了
const ACTING_WORDS = [
  "跳得", "蹦", "跳起来", "摇尾巴", "摇一摇", "摆尾巴", "甩", "打呼",
  "哈欠", "躲起来", "爬回来", "踩到", "被拎起来",
];
for (const [line, places] of linePlaces) {
  if (LINE_GESTURES[line]) continue;
  const word = ACTING_WORDS.find((item) => line.includes(item));
  if (word) warnings.push(`这句里带着动作「${word}」却没配手势：「${line}」（${places[0]}）`);
}

// 每段演出脚本都得有样式，不然点了名也只是站着不动
const definedPlays = new Set(
  [...homeSource.matchAll(/\[data-play="(\w+)"\]/g)].map((match) => match[1])
);
for (const name of actNames) {
  if (!definedPlays.has(name)) errors.push(`演出 ${name} 没有对应的 CSS 规则`);
}
for (const name of definedPlays) {
  if (!actNames.has(name)) warnings.push(`样式里写了演出 ${name}，但脚本里没有这一段`);
}

// 每段话、每档即兴都得真有可能说出口：把各种光景均匀随机过一遍，
// 一段都命中不到，就说明它的 when 写死了（比如要求两个不可能同时成立的条件，
// 或者用错了字段名 —— `mood.sides.left > 0` 写成 `mood.sides.neko` 是查不出来的）
const AUDIT_RUNS = 20000;
let auditSeed = 20240916;
const auditRandom = () => {
  auditSeed = (auditSeed * 1103515245 + 12345) & 0x7fffffff;
  return auditSeed / 0x7fffffff;
};
const pickOne = (list) => list[Math.floor(auditRandom() * list.length)];

/** 造一个「可能真的发生」的光景：周末与上班时段互斥，卡片数跟 cast 对得上 */
function makeMood() {
  const weekday = Math.floor(auditRandom() * 7);
  const cast = pickOne(["mixed", "neko", "online"]);
  const period = pickOne(["night", "morning", "day", "evening"]);
  const hour = { night: 2, morning: 7, day: 12, evening: 20 }[period];
  const sides = {
    left: Math.floor(auditRandom() * 3),
    right: Math.floor(auditRandom() * 3),
    above: auditRandom() < 0.3 ? 1 : 0,
    below: auditRandom() < 0.3 ? 1 : 0,
  };
  return {
    period,
    cast,
    count: cast === "mixed" ? 2 + Math.floor(auditRandom() * 3) : 1,
    peers: sides.left + sides.right + sides.above + sides.below,
    sides,
    justDragged: auditRandom() < 0.25,
    justPlayed: auditRandom() < 0.25,
    weekday,
    linger: pickOne([0, 3, 60, 300, 900, 3600]),
    stare: pickOne([0, 1, 2, 3]),
    stareReady: auditRandom() < 0.5,
    justReturned: auditRandom() < 0.15,
    memeReady: auditRandom() < 0.5,
    cursorIdle: auditRandom() < 0.15,
    tapBurst: auditRandom() < 0.15,
    scrollDash: auditRandom() < 0.15,
    awayDays: pickOne([0, 1, 3, 7, 30, 365]),
    weekend: weekday === 0 || weekday === 6,
    workHours: weekday >= 1 && weekday <= 5 && hour >= 9 && hour < 18,
    online: pickOne([0, 1, 2, 9, 10, 40]),
    visitTimes: pickOne([1, 2, 3, 7, 8, 30]),
  };
}

const momentHits = CHAT_MOMENTS.map(() => 0);
const improvHits = CHAT_IMPROV.map(() => 0);
for (let run = 0; run < AUDIT_RUNS; run += 1) {
  const mood = makeMood();
  CHAT_MOMENTS.forEach((moment, index) => {
    if (moment.when(mood)) momentHits[index] += 1;
  });
  CHAT_IMPROV.forEach((improv, index) => {
    if (improv.when(mood)) improvHits[index] += 1;
  });
}

CHAT_MOMENTS.forEach((moment, index) => {
  if (momentHits[index] === 0) {
    errors.push(`这段光景永远说不成（when 的条件凑不到一起）：「${moment.turns[0]?.line}」`);
  }
});
CHAT_IMPROV.forEach((improv, index) => {
  if (improvHits[index] === 0) errors.push(`CHAT_IMPROV 第 ${index} 档永远说不成（数字条件凑不到）`);
});

// 常备对话里的角色得跟 cast 对得上：只有一张猫卡时却说「在线猫猫」的台词，那句永远没人接
for (const [cast, list] of Object.entries(CHAT_TURNS)) {
  list.forEach((turns, index) => {
    const kinds = new Set(turns.map((turn) => turn.by));
    const stray =
      (cast === "neko" && kinds.has("online")) || (cast === "online" && kinds.has("neko"));
    if (stray) errors.push(`常备对话 ${cast}#${index} 里出现了不该登场的角色：「${turns[0]?.line}」`);
  });
}

// 只按台词点名演的那几段，得真有台词点它，不然一辈子演不出来
const actingPlays = new Set(
  [...linesSource.matchAll(/\bact:\s*"([a-zA-Z]+)"/g)].map((match) => match[1])
);
for (const match of showSource.matchAll(/name:\s*"([a-zA-Z]+)"[^}]*byLineOnly:\s*true/g)) {
  if (!actingPlays.has(match[1])) {
    errors.push(`演出 ${match[1]} 只在台词点名时演，但没有任何台词点它的名`);
  }
}

// 拎到首页别处松手：落点得认得出来，台词得挂在真有的落点上
const introSource = await readFile(path.join(dir, "HomeIntro.vue"), "utf8");
const DROP_KINDS = new Set(["feat", "recent", "goto", "title", "bin"]);
for (const match of introSource.matchAll(/data-drop="(\w+)"/g)) {
  if (!DROP_KINDS.has(match[1])) errors.push(`不认识的落点类型：data-drop="${match[1]}"`);
}
introSource.split("\n").forEach((line, index) => {
  if (line.includes('data-drop="goto"') && !line.includes("data-drop-to")) {
    errors.push(`跳转位没写 data-drop-to（HomeIntro.vue:${index + 1}）`);
  }
});
// 功能卡的台词和首页那张功能池得一一对上：漏一条，它被拎上去就只会干站着
const featNames = new Set([...introSource.matchAll(/^\s{4}name: "([^"]+)",$/gm)].map((match) => match[1]));
for (const name of featNames) {
  if (!DROP_LINES[name]) warnings.push(`功能「${name}」被拎上去没话说`);
}
for (const key of Object.keys(DROP_LINES)) {
  if (/[\u4e00-\u9fa5]/.test(key) && !featNames.has(key)) {
    errors.push(`落点台词挂在了一个不存在的功能上：「${key}」`);
  }
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
