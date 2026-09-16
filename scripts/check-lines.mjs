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
/** 台词里报数字的判据：阿拉伯数字，或者中文数字（含「二 / 两」）。
    「一」不在这儿 —— 它绝大多数是量词、序数或修辞（一口、一块、第二格、到此一游），
    逐条判不可行，只有落在 COUNTING_ONE_TWO 那几种「报人头」的说法里才算报数；
    「二 / 两」反过来，几乎每次出现都是数量（两块、两张、第二次），漏掉它才是真漏 */
const NUMBER_PATTERN = /[0-9]|[二两三四五六七八九十百千万]/;
/**
 * 「一 / 两」落在这些说法里就是在报数，而不是在说人话的量词：
 * 「在线人数：一」「少了一个人」「只来了一只」「只剩两个」「有一个不会说话」。
 * 只在「数人头」的谓语后面接一/两 + 量词时才算，孤零零的一个「一口」「两块」不碰。
 */
const COUNTING_ONE_TWO = [
  // 直接报人头：「在线人数：一」「在线数加一」「人数减一」
  /(?:在线人数|在线数|人数|观众数|访客数)[^，。！？…～]{0,2}[一两]/,
  // 数着人头说话：「少了一个人」「只来了一只」「就剩我们两个了」「还有一个」。
  // 中间允许夹一两个字（我们 / 你们 / 这儿），不然「只剩我们两个」这种断数句会漏掉
  /(?:少了|多了|只来|还剩|只剩|就剩|剩下|还有|来了|走了|多出)[^，。！？…～]{0,2}[一两][个只条位张名行]/,
  // 谓语后面直接跟数量：「有一个不会说话」「只有一张卡片」「就是一个人」。
  // 量词卡得死（个只条位张名行），「有一个人蹲着」这种修辞才不会被误伤；
  // 三以上的数量已经被 NUMBER_PATTERN 兜住，这里只管「一 / 两」。
  // 「算」刻意不进这个名单：它长在「预算」里，会把「预算只够一张卡片」这类修辞判成报数
  /(?:有|只有|数过|就是|点了)[^，。！？…～]{0,2}[一两][个只条位张名行]/,
];
/**
 * 白名单：命中这些用法的数字不算「报数」。
 * 逐个片段从台词里剔掉（换成空白）再对剩下的文字判数字 ——
 * 原来是「整行命中即放过」，于是一个无关的「同一」就能把同一行里的「六次点击」一起放过。
 * 每一项都要写清为什么能豁免，别再往里塞「看着大概没事」的。
 */
const NUMBER_WHITELIST = [
  // 「A一A」是动词重叠（摇一摇、挤一挤、比一比），不数任何东西
  /(.)一\1/,
  // 「一」在这些词里只当副词/程度词，「整个」那种也不是在报数
  /一(?:会儿|下|起|直|样|点|半|边|定|般|些|并|共|切|番|面|心|向|键|线|见|味|觉|致|概|览|举|连|同|齐|整|辈子)/,
  // 一/千/万 长在词里（唯一、同一、千万别、万一、万物），原本就不是数字
  /唯一|同一|其一|专一|统一|千万别|万一|百般|丝毫|万物/,
  // 「这一页」「那两句」「这两天」是指着眼前的东西说，不是在报数（时间说法一并豁免在这儿）
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

/** 白名单规则要逐个片段剔除，所以得带 g：一句话里可能有好几处豁免 */
const WHITELIST_REMOVERS = NUMBER_WHITELIST.map((rule) => new RegExp(rule.source, "gu"));

/** 非即兴档的台词读不到真数字，出现数字基本都是硬编的（出过「当前在线三人」这种事故）。
    白名单按片段剔除，剩下的文字里还有数字才算 —— 整行放过会让无关的豁免词把真数字盖住 */
function checkNumber(text, where, note = "台词里出现数字（这一档读不到真数，多半是编的）") {
  const residue = WHITELIST_REMOVERS.reduce((rest, rule) => rest.replace(rule, " "), text);
  const reported = NUMBER_PATTERN.test(residue) || COUNTING_ONE_TWO.some((rule) => rule.test(residue));
  if (!reported) return;
  errors.push(`${note}：${where} 「${text}」`);
}

const {
  SPEECH_LINES,
  MOOD_LINES,
  CHAT_TURNS,
  CHAT_MOMENTS,
  CHAT_IMPROV,
  LINE_GESTURES,
  MOOD_GESTURES,
  DROP_LINES,
  ANY_DROP_LINES,
  MOMENT_GATE_CHANCE,
  IMPROV_WARMUP_S,
  chineseNumber,
  humanSeconds,
  dropLineFor,
  recentLine,
} = await import(pathToFileURL(path.join(dir, "live-lines.ts")).href);
const { DROP_CATEGORIES } = await import(pathToFileURL(path.join(dir, "live-drop-targets.ts")).href);
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
    // 只给体检用：这一屏实际有哪些卡。判即兴档的台词角色凑不凑得齐，跟运行时的 castFits 一个口径
    kinds: nekoCards > 0 && onlineCards > 0 ? ["neko", "online"] : nekoCards > 0 ? ["neko"] : ["online"],
    peers: sides.left + sides.right + sides.above + sides.below,
    sides,
    justDragged: auditRandom() < 0.25,
    justPlayed: auditRandom() < 0.25,
    weekday,
    // 停留时长要取到各档之间的边界值：即兴档按分钟分段（一分钟 / 五分钟 / 一刻钟），
    // 光给 60 与 300 会把「一分钟那档」和刚进页面的冷却（IMPROV_WARMUP_S）之间漏掉
    linger: pickOne([0, 3, 60, 120, 299, 300, 900, 3600]),
    stare: pickOne([0, 1, 2, 3]),
    stareReady: auditRandom() < 0.5,
    justReturned: auditRandom() < 0.15,
    memeReady: auditRandom() < 0.5,
    // 带闸的档（梗 / 对拍 / 盯看后两段）的骰子现在放在光景里、每轮只摇一次：
    // 这里按真实概率摇一遍，when 就成了纯函数，采样结果可复现（原来每次采样重摇，命中数飘忽）
    gates: {
      meme: auditRandom() < MOMENT_GATE_CHANCE.meme,
      xterfusion: auditRandom() < MOMENT_GATE_CHANCE.xterfusion,
      stare: auditRandom() < MOMENT_GATE_CHANCE.stare,
    },
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

/** 挑对话时除了 when，还要看这一档配的 cast 对不对得上手里这几张卡。
    when 现在是纯函数（骰子放在 mood.gates 里），同一份采样每次跑出来的数字都一样 */
const momentMatches = (moment, mood) => moment.cast === mood.cast && moment.when(mood);

const momentHits = CHAT_MOMENTS.map(() => 0);
const improvHits = CHAT_IMPROV.map(() => 0);
for (let run = 0; run < AUDIT_RUNS; run += 1) {
  const mood = makeMood();
  CHAT_MOMENTS.forEach((moment, index) => {
    if (momentMatches(moment, mood)) momentHits[index] += 1;
  });
  CHAT_IMPROV.forEach((improv, index) => {
    // 刚进页面那段时间 live-chat 不排即兴档（IMPROV_WARMUP_S）：这里跟着同一个门槛算，
    // 不然「可达」的数字比真实情况乐观
    if (mood.linger < IMPROV_WARMUP_S) return;
    // 即兴档还得看台词里要的角色这一屏有没有（运行时同一个门槛是 castFits），
    // 不带上这一条，「可达」就是假的：单卡窗口压根说不了带两种卡的台词
    if (!improv.when(mood)) return;
    const turns = improv.lines(mood);
    if (turns && turns.length > 0 && turns.every((turn) => mood.kinds.includes(turn.by))) {
      improvHits[index] += 1;
    }
  });
}

/** 命中次数不到采样总数的这个比例：档还在，但基本轮不到它说话，只提示不报错 */
const LOW_HIT_RATE = 0.005;
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
/** 即兴档的台词里，那些数字是现读值渲染出来的、不算「编的」；
    把「由现读值渲染出来的那几段文字」先抹掉，再对剩下的文字判数字 ——
    模板里写死一个「三」就藏不住了（原来即兴档只查长度与禁用词，永远发现不了） */
function checkImprovNumber(line, where, mood) {
  const dynamic = [
    humanSeconds(mood.linger),
    chineseNumber(mood.online),
    chineseNumber(mood.visitTimes),
  ];
  const residue = dynamic.reduce((rest, token) => (token ? rest.split(token).join(" ") : rest), line);
  checkNumber(residue, `${where}（模板原句：${line}）`, "即兴档的模板里写死了数字（要报数就用现读的真数拼）");
}

CHAT_IMPROV.forEach((improv, index) => {
  IMPROV_EXTREMES.forEach(({ note, patch }) => {
    const mood = { ...makeMood(), ...patch };
    if (!improv.when(mood)) return;
    (improv.lines(mood) ?? []).forEach((turn, turnIndex) => {
      const where = `CHAT_IMPROV[${index}]（${note}）[${turnIndex}]`;
      checkText(turn.line, where);
      checkImprovNumber(turn.line, where, mood);
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
// cmd 是功能卡里那些指令小胶囊上的落点（英文 key，不受「必须是一个真有的功能」那条管）
const DROP_KINDS = new Set(["feat", "recent", "goto", "title", "bin", "cmd"]);
for (const match of introSource.matchAll(/data-drop="(\w+)"/g)) {
  if (!DROP_KINDS.has(match[1])) errors.push(`不认识的落点类型：data-drop="${match[1]}"`);
}
introSource.split("\n").forEach((line, index) => {
  if (line.includes('data-drop="goto"') && !line.includes("data-drop-to")) {
    errors.push(`跳转位没写 data-drop-to（HomeIntro.vue:${index + 1}）`);
  }
});
// 拎到首页别处松手后说的话，文案本身也得过一遍：长度、禁用词、emoji、数字。
// 两种卡各说各的那套（dropLineFor 按卡种分层），所以两边都得查
for (const [key, nekoLine] of Object.entries(DROP_LINES)) {
  checkText(nekoLine, `DROP_LINES.${key}`);
  checkNumber(nekoLine, `DROP_LINES.${key}`);
  if (dropLineFor("neko", key) !== nekoLine) {
    errors.push(`dropLineFor 把猫卡的「${key}」换掉了：猫味那层要原样保留`);
  }
  const onlineLine = dropLineFor("online", key);
  if (!onlineLine) {
    errors.push(`在线猫落到「${key}」上没话说，卡片会接不住`);
    continue;
  }
  checkText(onlineLine, `dropLineFor("online", "${key}")`);
  checkNumber(onlineLine, `dropLineFor("online", "${key}")`);
}
// 最近更新那条是拿提交说明现拼的，两种卡各拼一句，长度与数字照样得查
for (const kind of ["neko", "online"]) {
  const line = recentLine("回退按键逻辑优化（无法回退时隐藏）", kind);
  checkText(line, `recentLine("${kind}")`);
  checkNumber(line, `recentLine("${kind}")`);
}

// 泛化落点：首页上任何元素都能接住。每个类别两种卡各有一池（同一处轮着说，池里至少三条，
// 不然拖两下就重了），文案过同一套体检，另外每类都得有「被压住时」的反馈 —— 少一条就是
// 扫过去一点动静都没有，看着像没认出来
const styleSource = await readFile(
  path.join(root, "src", ".vuepress", "styles", "index.scss"),
  "utf8"
);
for (const [kind, pools] of Object.entries(ANY_DROP_LINES)) {
  for (const category of DROP_CATEGORIES) {
    const where = `ANY_DROP_LINES.${kind}.${category}`;
    const pool = pools[category];
    if (!Array.isArray(pool) || pool.length < 3) {
      errors.push(`${where} 不足三条，同一处轮不开`);
      continue;
    }
    if (new Set(pool).size !== pool.length) errors.push(`${where} 池里有重复的句子`);
    for (const line of pool) {
      checkText(line, where);
      checkNumber(line, where);
    }
    if (!styleSource.includes(`data-drop-kind="${category}"`)) {
      errors.push(`类别 ${category} 没有反馈样式：index.scss 里找不到 data-drop-kind="${category}"`);
    }
  }
  for (const key of Object.keys(pools)) {
    if (!DROP_CATEGORIES.includes(key)) {
      errors.push(`ANY_DROP_LINES.${kind} 里多了个不在册的类别「${key}」，它永远不会被用到`);
    }
  }
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
// 在线卡不该整层沿用猫味（写错了 key 就会悄悄回落到猫话），功能卡与两个固定落点都得有自己的说法
for (const key of [...featNames, "title", "bin"]) {
  if (dropLineFor("online", key) === dropLineFor("neko", key)) {
    warnings.push(`「${key}」在线猫说的还是猫味那句（在线卡那层漏了，或 key 写错回落了）`);
  }
}

// 默认一屏恒是一张猫卡 + 一张在线卡，cast 恒为 mixed：下面这些只有多窗口搬卡之后
// （窗口里只剩一种卡）才可能出现。标出来是免得以后被当成「写好了却用不上」删掉
for (const [cast, list] of Object.entries(CHAT_TURNS)) {
  if (cast !== "mixed") {
    warnings.push(`CHAT_TURNS.${cast}（${list.length} 段）仅多窗口搬卡后可达，属冷门内容`);
  }
}
CHAT_MOMENTS.forEach((moment, index) => {
  if (moment.cast !== "mixed") {
    warnings.push(
      `CHAT_MOMENTS[${index}]（cast: ${moment.cast}）仅多窗口搬卡后可达：「${moment.turns[0]?.line}」`
    );
  }
});

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
