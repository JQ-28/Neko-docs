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
/** 台词里报数字的判据：阿拉伯数字，或者三及以上的中文数字。
    「一 / 两」不在这儿 —— 它们绝大多数是量词、序数或修辞（一口、两块、第二格、到此一游），
    逐条判不可行，只有落在 COUNTING_ONE_TWO 那几种「报人头」的说法里才算报数 */
const NUMBER_PATTERN = /[0-9]|[三四五六七八九十百千万]/;
/**
 * 「一 / 两」落在这些说法里就是在报数，而不是在说人话的量词：
 * 「在线人数：一」「少了一个人」「只来了一只」「只剩两个」。
 * 只在「数人头」的谓语后面接一/两 + 量词时才算，孤零零的一个「一口」「两块」不碰。
 */
const COUNTING_ONE_TWO = [
  // 直接报人头：「在线人数：一」「在线数加一」「人数减一」
  /(?:在线人数|在线数|人数|观众数|访客数)[^，。！？…～]{0,2}[一两]/,
  // 数着人头说话：「少了一个人」「只来了一只」「就剩我们两个了」「还有一个」。
  // 中间允许夹一两个字（我们 / 你们 / 这儿），不然「只剩我们两个」这种断数句会漏掉
  /(?:少了|多了|只来|还剩|只剩|就剩|剩下|还有|来了|走了|多出)[^，。！？…～]{0,2}[一两][个只条位张名行]/,
];
/**
 * 白名单：命中这些用法的数字不算「报数」，直接放过。
 * 每一项都要写清为什么能豁免，别再往里塞「看着大概没事」的。
 */
const NUMBER_WHITELIST = [
  // 「A一A」是动词重叠（摇一摇、挤一挤、比一比），不数任何东西
  /(.)一\1/,
  // 「一」在这些词里只当副词/程度词，「整个」那种也不是在报数
  /一(?:会儿|下|起|直|样|点|半|边|定|般|些|并|共|切|番|面|心|向|键|线|见|味|觉|致|概|览|举|连|同|齐|整|辈子)/,
  // 一/千/万 长在词里（唯一、同一、千万别、万一、万物），原本就不是数字
  /唯一|同一|其一|专一|统一|千万别|万一|百般|丝毫|万物/,
  // 「这一页」「那两句」是指着眼前的东西说，不是在报数
  /[这那][一二两]/,
  // 「一、二、三」是当场数的数，不是读来的数据
  /[一二三四五六七八九十](?:、[一二三四五六七八九十])+/,
  // 「周四」是星期几的名字，「三连」是网络语里的名词，都不是数量
  /[周星期礼拜][一二三四五六日天]|三连/,
  // 引用真实作品的年份（「二〇〇三年智利童星录的」「引用自二〇一三年的一格漫画」），年份是梗的出处
  /二〇[〇一二三四五六七八九]{2}年/,
  // 肯德基疯狂星期四的固定梗「v我50」，数字本来就是梗的一部分
  /v\s*我\s*\d+/,
  // 网络语「六六六」是夸人不是在报数；「一打五」「一枪秒了」是游戏里的固定说法；「六七」是 Xterfusion 对拍的口令
  /六六六|一打五|一枪|六七|六——七/,
  // 「我的名字是统计卡，编号三」：编号是这张卡的固定玩笑编号，不是读出来的数据
  /编号[一二三四五六七八九十百零〇\d]/,
  // 「号码是 1234-okok」是明摆着的顺子占位号码，前面已经点明是手绘的
  /1234-okok/,
];

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

/** 非即兴档的台词读不到真数字，出现数字基本都是硬编的（出过「当前在线三人」这种事故） */
function checkNumber(text, where) {
  const reported = NUMBER_PATTERN.test(text) || COUNTING_ONE_TWO.some((rule) => rule.test(text));
  if (!reported) return;
  if (NUMBER_WHITELIST.some((rule) => rule.test(text))) return;
  errors.push(`台词里出现数字（这一档读不到真数，多半是编的）：${where} 「${text}」`);
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
    checkNumber(line, `${name}[${index}]`);
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
    checkNumber(turn.line, `${where}[${index}]`);
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

/** 造一个「可能真的发生」的光景：先定这一屏有几张卡，再分给两种卡，cast 由有哪几种卡推出来。
    （真实实现里 cast 看种类、count 看张数，是两个独立的量，绑在一起算会漏掉「两只猫没在线卡」这种光景） */
function makeMood() {
  const weekday = Math.floor(auditRandom() * 7);
  const count = 1 + Math.floor(auditRandom() * 4);
  const nekoCards = Math.floor(auditRandom() * (count + 1));
  const onlineCards = count - nekoCards;
  const cast = nekoCards > 0 && onlineCards > 0 ? "mixed" : nekoCards > 0 ? "neko" : "online";
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
    count,
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

/** 命中次数不到采样总数的这个比例：档还在，但基本轮不到它说话，只提示不报错 */
const LOW_HIT_RATE = 0.005;
/** 挑对话时除了 when，还要看这一档配的 cast 对不对得上手里这几张卡 */
const momentMatches = (moment, mood) => moment.cast === mood.cast && moment.when(mood);

const momentHits = CHAT_MOMENTS.map(() => 0);
const improvHits = CHAT_IMPROV.map(() => 0);
for (let run = 0; run < AUDIT_RUNS; run += 1) {
  const mood = makeMood();
  CHAT_MOMENTS.forEach((moment, index) => {
    if (momentMatches(moment, mood)) momentHits[index] += 1;
  });
  CHAT_IMPROV.forEach((improv, index) => {
    if (improv.when(mood)) improvHits[index] += 1;
  });
}

const lowHitLimit = Math.round(AUDIT_RUNS * LOW_HIT_RATE);
CHAT_MOMENTS.forEach((moment, index) => {
  if (momentHits[index] === 0) {
    errors.push(`这段光景永远说不成（when 的条件凑不到一起）：「${moment.turns[0]?.line}」`);
  } else if (momentHits[index] < lowHitLimit) {
    warnings.push(
      `这段光景基本轮不到（2 万次采样只命中 ${momentHits[index]} 次）：「${moment.turns[0]?.line}」`
    );
  }
});
CHAT_IMPROV.forEach((improv, index) => {
  if (improvHits[index] === 0) {
    errors.push(`CHAT_IMPROV 第 ${index} 档永远说不成（数字条件凑不到）`);
  } else if (improvHits[index] < lowHitLimit) {
    warnings.push(`CHAT_IMPROV 第 ${index} 档基本轮不到（2 万次采样只命中 ${improvHits[index]} 次）`);
  }
});

// 即兴档的句子是现读数字拼出来的，静态看不到长短；拿几组极端数值各拼一遍，长度和禁用词照样得查
const IMPROV_EXTREMES = [
  { note: "盯着看了将近一整天", patch: { linger: 86_399 } },
  { note: "盯了一刻钟差一秒", patch: { linger: 899 } },
  { note: "盯了五分钟差一秒", patch: { linger: 299 } },
  { note: "刚盯了一眼", patch: { linger: 0 } },
  { note: "在线人数顶到三位数", patch: { online: 999 } },
  { note: "今天来了 99 回", patch: { visitTimes: 99 } },
  { note: "隔壁开了一堆窗口", patch: { peers: 36, sides: { left: 9, right: 9, above: 9, below: 9 } } },
];
CHAT_IMPROV.forEach((improv, index) => {
  IMPROV_EXTREMES.forEach(({ note, patch }) => {
    const mood = { ...makeMood(), ...patch };
    if (!improv.when(mood)) return;
    (improv.lines(mood) ?? []).forEach((turn, turnIndex) => {
      checkText(turn.line, `CHAT_IMPROV[${index}]（${note}）[${turnIndex}]`);
    });
  });
});

// 心情池只在「单句场合」用（独处、搭话、被拎起来、落地），所以每个心情档都得真能被挑出来
const chatSource = await readFile(path.join(dir, "live-chat.ts"), "utf8");
/** 可能出现的心情：事件带起来的（holdEmo），加上按卡片数和钟点算的（currentEmo 里那几处赋值） */
const possibleEmos = new Set([
  ...[...chatSource.matchAll(/holdEmo\(\s*"(\w+)"/g)].map((match) => match[1]),
  ...[...chatSource.matchAll(/mood\.value\s*=\s*"(\w+)"/g)].map((match) => match[1]),
]);
if (!chatSource.includes('["solo", "idle", "drag", "arrive"]')) {
  errors.push(
    "live-chat.ts 挑词的路径变了：拿心情池的场合不再是 solo / idle / drag / arrive，这条脚本里 MOOD_LINES 的可达性判断要跟着改"
  );
}
for (const [kind, pools] of Object.entries(MOOD_LINES)) {
  for (const state of Object.keys(pools)) {
    if (!possibleEmos.has(state)) {
      errors.push(
        `心情档永远说不出口：MOOD_LINES.${kind}.${state}（live-chat.ts 只会挑出 ${[...possibleEmos].join("、")} 这些档）`
      );
    }
  }
}

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
// 拎到首页别处松手后说的话，文案本身也得过一遍：长度、禁用词、emoji、数字
for (const [key, line] of Object.entries(DROP_LINES)) {
  checkText(line, `DROP_LINES.${key}`);
  checkNumber(line, `DROP_LINES.${key}`);
}

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
