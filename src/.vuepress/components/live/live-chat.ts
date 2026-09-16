// 首页几张卡片之间怎么说话：台词在 live-lines.ts，这里管什么时候说、由谁来说。
// 只有一张卡就自己念叨，凑齐两张以上就按脚本你一句我一句；
// 说话期间会让开演戏的排期，中途有人拎卡、搬卡就整段作废。

import { onBeforeUnmount, ref, type Ref } from "vue";
import { markEgg } from "../eggs/egg-utils";
import type { CardSpec, PeerSides } from "./live-peer";
import {
  CHAT_IMPROV,
  CHAT_MOMENTS,
  CHAT_TURNS,
  JUST_DRAGGED_MS,
  JUST_PLAYED_MS,
  IMPROV_WARMUP_S,
  LINE_GESTURES,
  MEME_GAP_MS,
  MOOD_GESTURES,
  MOOD_LINES,
  MOMENT_CHANCE,
  MOMENT_GATE_CHANCE,
  SPEECH_LINES,
  STARE_GAP_MS,
  arriveGreeting,
  periodOfHour,
  type ChatAct,
  type ChatCast,
  type ChatMood,
  type ChatTurn,
  type EmoState,
  type GestureName,
  type MomentGates,
  type SpecialDay,
  type SpeechLines,
} from "./live-lines";

/** 有猫落地先聊两句，第二句隔这么久接上 */
export const GREETING_REPLY_MS = 1800;
/** 一段说完隔多久再来一段（20–45 秒之间随便挑，不固定才不像机器） */
const CHAT_MIN_MS = 20_000; const CHAT_MAX_MS = 45_000;
/** 今天头一回打开这一页时，第一轮提前到入场动画落定之后 ——
    好让「第 N 天见啦」这类进站话早点说出口。不提前的话第一句要等 20–45 秒，新访客多半等不到 */
const ARRIVE_CHAT_MIN_MS = 1_600;
const ARRIVE_CHAT_MAX_MS = 2_400;
/** 进站那一轮被台面占着（正演着入场那段对手戏）就先让开，过这么一会儿再问一次 */
const ARRIVE_RETRY_MS = 1_500;
/** 进站那一轮最多让这么多次（≈45 秒）就放弃，改回正常节奏。
    要给得这么宽：入场那段对手戏动辄三五秒，后面还跟着独处小动作，
    上限小了就成了「新人一进来、问候永远说不出口」—— 而那正是最该说的时候 */
const ARRIVE_MAX_TRIES = 30;
/** 对话里两句之间最少隔多久：上一句的气泡刚收，下一句就接上 */
const CHAT_TURN_MS = 2400;
/** 上一句太长时最多等这么久，别把整段对话拖成慢动作。
    气泡只有一份，下一句一开口上一句就没了，所以这个间隔就是气泡的实际可见时长：
    上限得让最长的那句话（40 字，6800ms）也读得完，否则它会被下一句提前掐掉 */
const CHAT_TURN_MAX_MS = 7000;
/** 刚被人拎着玩过，隔这么久就嘀咕两句，趁这事还新鲜 */
const DRAG_CHAT_MIN_MS = 6_000;
const DRAG_CHAT_MAX_MS = 13_000;
/** 刚演完一段，隔这么久说说刚才那一下 */
const SHOW_CHAT_MIN_MS = 8_000;
const SHOW_CHAT_MAX_MS = 16_000;
/** 一句话最少挂多久，以及每个字多挂的时长：长句子给够读完的时间 */
const SPEECH_LINGER_MS = 1600;
const SPEECH_CHAR_MS = 170;

/** 一句话的气泡要挂多久：短句有个底、长句按字数加。
    导出是给落点用的 —— 手机把卡片丢到页面靠下的元素上时，卡片会先停在落点把这句话说完
    （原位早滚出视口了，立刻回位等于说给空气听），停留多久必须与气泡的可见时长一模一样，
    不然要么话没说完就飞走、要么卡片多杵着一会儿不知道在等什么 */
export function speechLingerMs(line: string): number {
  return Math.max(SPEECH_LINGER_MS, line.length * SPEECH_CHAR_MS);
}

/** 说完带戏的那句、插戏还没落地时的兜底：演不出来也不能把后半截晾着。
    正常路径是演出演完自己回调 actDone，这条只在演出卡住时兜底 ——
    所以它必须比「被台词点名的动作里最长的那一段」还长，否则动作还剩一截就被截断。
    目前最长的是 leanNap（6.5 秒），改 live-show.ts 的时长时要一起看这里 */
const ACT_FALLBACK_MS = 7_000;
/** 打字机：短句整句直给，长句一个字一个字往外冒。整句的打字时长压在这个比例内，
    剩下的时间留给访客把话读完 —— 预算直接从气泡的停留时长推出来，两者不会打架 */
const TYPE_BUDGET_RATIO = 0.4;
/** 一个字最快、最慢多久冒一个：快了像贴纸刷出来，慢了像卡带 */
const TYPE_MIN_MS = 45;
const TYPE_MAX_MS = 130;
/** 逗号句号这些地方多停一拍，像真的在换气 */
const TYPE_PUNCT_WEIGHT = 2.6;
/** 去掉标点后不超过这么多字就整句直给：这么短的句子打字反而显得拖 */
const TYPE_DIRECT_CHARS = 4;
/** 带 once 的档（稀客才说的话）说过一次，歇这么久才允许再说 */
const ONCE_GAP_MS = 10 * 60_000;
/** 正赶上某种心情时，单句台词有多大概率从心情池里挑 */
const MOOD_CHANCE = 0.55;
/** 哪些场合会拿心情池里的单句：独处、搭话、被拎起来、落地 —— 成段对话有自己的编排 */
const MOOD_SPEECH_TYPES: readonly (keyof SpeechLines)[] = ["solo", "idle", "drag", "arrive"];
/** 有即兴档可说的话时先说它的概率，以及两回之间至少隔多久（不然会揪着同一个数字反复报） */
const IMPROV_CHANCE = 0.6;
const IMPROV_GAP_MS = 6 * 60_000;
/** 手里不止一张卡时，也留一点机会让它自己嘀咕一句——心情就是从这儿露出来的 */
const MUTTER_CHANCE = 0.3;
/** 事件带起来的心情各挂多久 */
const SULKY_HOLD_MS = 45_000;
const HAPPY_HOLD_MS = 90_000;
const SHY_HOLD_MS = 120_000;
/** 拖完闹别扭的概率：原来是每次都必闹、还挂满一分半，爱拖着玩的人整天看它摆臭脸 */
const SULKY_ON_DRAG_CHANCE = 0.33;
/** 手在卡片区停够这么久算「黏人」（毫秒，这个信号由 HomeLive 喂进来） */
const CLINGY_HOVER_MS = 6_000;
/** 在卡片区待够这么久、这期间又没被戳过也没被拖过，算「无聊」（秒，停留时长由 HomeLive 喂进来） */
const BORED_LINGER_S = 300;
/** 被戳之后隔这么久才回一句：连着戳不该一句接一句地刷屏 */
const POKE_GAP_MS = 2_200;
/** 摸头同理：手一直在卡面上摸来摸去，不该一路念下去 */
const PAT_GAP_MS = 5_000;
/** 上班时段：工作日九点到十八点 */
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;
/** 说过的话记在本地：从没说过的先挑，全说过才按新旧轮换，一台机器上尽量不重样 */
const SAID_KEY = "neko-live-said";
const SAID_KEEP_MS = 30 * 86_400_000;
const SAID_LIMIT = 400;
const SAID_FRESH_MS = 45 * 60_000;
const SAID_MAX_WEIGHT = 10;

/** 说话要用到的几件外界情况，都由组件喂进来 */
export interface TalkHost {
  /** 眼下住在这扇窗口里的卡片 */
  cards: () => CardSpec[];
  /** 卡片区在不在视野里 */
  visible: () => boolean;
  /** 眼下适不适合开口：没人拎着卡、没在演戏、卡片也没飘去隔壁 */
  ready: () => boolean;
  /** 被戳时能不能回一句：卡片没在手上、没飘去隔壁、页面也露着。
      比 ready() 宽松：正演着戏也可以回 —— 那是用户主动点的一下，不该被动画挡掉 */
  canPoke: () => boolean;
  /** 隔壁还开着几扇 neko 页面，猫都在哪几边 */
  peers: () => { count: number; sides: PeerSides };
  /** 上一回开演是什么时候（时间戳，没演过就是 0） */
  lastPlayedAt: () => number;
  /** 观众盯着这片卡片看了多久（秒）；切走、切到后台就停表 */
  linger: () => number;
  /** 刚切回这个页面吗 */
  justReturned: () => boolean;
  /** 观众的小箭头半天没动过吗（动一下就重新计时） */
  cursorIdle: () => boolean;
  /** 手停了多久（毫秒）。可选：没喂就当 0，分档永远落在第一档 */
  cursorIdleMs?: () => number;
  /** 这台设备主要用手指操作吗（台词分桌面版与触摸版）。可选：没喂就当不是触摸设备 */
  touch?: () => boolean;
  /** 指针刚移出窗口 / 刚滚过页面 / 刚选中文字 / 刚转屏。
      四个都是「她看见你在干什么」那几档要用的，可选：没喂就当没发生 */
  pointerGone?: () => boolean;
  scrolled?: () => boolean;
  selectionMade?: () => boolean;
  flipped?: () => boolean;
  /** 认识多久了（天）/ 今天被碰了几次 / 是不是半夜 / 今天什么日子。
      四个都影响「她记不记得你」那条线，可选：没喂就按「刚认识、没碰过、白天、平常日子」算 */
  firstSeenDays?: () => number;
  patToday?: () => number;
  sleepy?: () => boolean;
  specialDay?: () => SpecialDay;
  /** 观众的手刚动过吗（为真就不是「手闲着」的状态）。这个信号由 HomeLive 喂进来，没喂就当没有 */
  cursorFresh?: () => boolean;
  /** 观众的箭头在卡片区里停了多久（毫秒）。同样由 HomeLive 喂进来，没喂就当 0 */
  hoverHoldMs?: () => number;
  /** 刚刚在同一个地方连戳了好几下吗 */
  tapBurst: () => boolean;
  /** 刚刚一口气把整页滚到了底吗 */
  scrollDash: () => boolean;
  /** 距上一次来隔了多少天（头一回来是 0） */
  awayDays: () => number;
  /** 此刻真实的在线人数（接口给的，还没拿到就是 0） */
  online: () => number;
  /** 今天第几次打开这个页面（本机记的，头一回是 1） */
  visitTimes: () => number;
  /** 连着第几天来（断了两天以上从头数） */
  streak: () => number;
  /** 她今天在干什么（拿日期当种子抽的一句，同一天不变） */
  doing: () => string;
  /** 中间插一段戏（用演出脚本的名字）；演不成返回 false，好让话接着往下说 */
  act: (name: ChatAct) => boolean;
  /** 说话期间先把演戏的排期让开 */
  holdShow: () => void;
  /** 说完了，把演戏的排期还回去 */
  releaseShow: () => void;
}

export interface LiveTalk {
  /** 哪张卡正在冒话（空串表示没在冒） */
  readonly speakingId: Ref<string>;
  /** 冒出来的那句话 */
  readonly speech: Ref<string>;
  /** 已经冒出来的那部分：气泡上显示的是它 —— 长句一个字一个字往外冒，短句整句直给 */
  readonly speechShown: Ref<string>;
  /** 这句配的小动作（没标就是空，老老实实点头） */
  readonly speakingGesture: Ref<GestureName | "">;
  /** 眼下的心情：卡片上的状态灯照着它变色 */
  readonly mood: Ref<EmoState>;
  /** 让某张卡从它的台词池里说一句 */
  say(card: CardSpec, type: keyof SpeechLines): void;
  /** 让某张卡说指定的这一句（把卡拎到首页某个落点上时用） */
  sayLine(card: CardSpec, line: string): void;
  /** 从一堆候选里挑一句：优先挑从没说过的（复用「说过的账本」），全说过就挑最旧那句 */
  pickFresh: (pool: readonly string[]) => string;
  /** 松手了：刚那句话再挂一会儿再收，像还在嘀咕 */
  lingerSpeech(): void;
  /** 立刻把话收掉（卡片被搬走、被拎去隔壁时用） */
  hush(): void;
  /** 这张卡走了，它的记录一并清掉 */
  forget(cardId: string): void;
  /** 正在说的那段别说了 */
  stop(): void;
  /** 话还没说完吗（含着两句中间的停顿）；大编舞要等这个空了再开演 */
  isChatting(): boolean;
  /** 落地那两句聊完以后，接着排平时的闲聊 */
  scheduleAfterGreeting(): void;
  /** 刚被拎起来玩过：趁热让它们嘀咕两句 */
  markDragged(): void;
  /** 刚演完一段：让它们说说刚才那一下 */
  markPlayed(): void;
  /** 被戳了一下：不好意思一下（戳得勤就闹别扭），隔两秒才回一句 */
  poke(card: CardSpec): void;
  /** 被摸头顶了：鼠标不点不按、只是搁在卡面上摸来摸去，隔几秒回一句 */
  pat(card: CardSpec): void;
  /** 重整下一次说话的排期（挂载、卡片数变了时调） */
  scheduleNext(): void;
  /** 重算一次眼下的心情（时段跨档、卡片数变了时调）：名字下的小字与状态灯照它变 */
  refreshMood(): void;
  /** 中间插的那段戏演完了：接着往下说，返回是否真的接上了 */
  actDone(): boolean;
}

/** 挑中的这一段：台词本身，外加要不要顺手点亮某个彩蛋 */
interface PickedChat {
  readonly turns: readonly ChatTurn[];
  readonly egg?: string;
  readonly meme?: boolean;
  readonly stare?: boolean;
  readonly once?: string;
}

/** 一句话说完要插戏时，把「接下来该说什么」先寄存下来 */
interface PendingTurn {
  readonly turns: readonly ChatTurn[];
  readonly index: number;
  readonly run: number;
  readonly previous: string;
}

/** 一档即兴：台词已经按此刻的数字拼好了，角色也在手上的卡里验过 */
interface ReadyImprov {
  readonly key: string;
  readonly turns: readonly ChatTurn[];
}

/** 手里这几张卡凑得成哪一套对话；一张都没有就是 null */
function castOf(kinds: ReadonlySet<CardSpec["kind"]>): ChatCast | null {
  if (kinds.has("neko") && kinds.has("online")) return "mixed";
  if (kinds.has("neko")) return "neko";
  if (kinds.has("online")) return "online";
  return null;
}

/** 每轮只摇一次的骰子：带闸的档（梗 / 对拍 / 盯看后两段）整类放行与否。
    骰子留在台词档的 when 里的话，成组生成的上百段梗各自独立摇一遍，
    「至少一段过闸」约等于必然，「梗 25%」那道闸就形同虚设了。
    返回类型是 Record：以后往 MomentGate 里加一道闸，这里少写一个就会编译报错 */
function rollGates(): MomentGates {
  return {
    meme: Math.random() < MOMENT_GATE_CHANCE.meme,
    xterfusion: Math.random() < MOMENT_GATE_CHANCE.xterfusion,
    stare: Math.random() < MOMENT_GATE_CHANCE.stare,
    hobby: Math.random() < MOMENT_GATE_CHANCE.hobby,
  };
}

export function useLiveTalk(host: TalkHost): LiveTalk {
  const speakingId = ref("");
  const speakingGesture = ref<GestureName | "">("");
  const speech = ref("");
  /** 已经冒出来的那部分：气泡上显示的是它，不是整句 */
  const speechShown = ref("");
  let speechTimer = 0;
  let typeTimer = 0;
  let chatTimer = 0;
  let turnTimer = 0;
  /** 下一句已经排上了（还没到点）：用来判断「话还没说完」 */
  let turnPending = false;
  /** 对话的场次号：中途被拎走、卡片被搬走就加一，正在说的那段自己作废 */
  let chatRun = 0;
  /** 上一句是谁说的，下一句换张卡张嘴 */
  let lastSpeaker = "";
  /** 上一回被人拎着玩是什么时候，卡片会拿它嘀咕两句 */
  let lastDragAt = 0;
  /** 上一回被戳是什么时候：连着戳不该一句接一句地刷屏 */
  let lastPokeAt = 0;
  /** 上一回被摸头顶是什么时候（摸头有自己的间隔，比戳松一点） */
  let lastPatAt = 0;
  /** 进站那一轮还等着开口：今天头一回打开才有，说成了或放弃了都归 false。
      它就是 mood 里的 arriveFresh —— 进站那几档台词只认它，所以一天只说一次 */
  let arrivePending = false;
  /** 「第一轮提前」只做一次（scheduleNext 在挂载、卡片数变化、回前台时都会被调） */
  let arriveHandled = false;
  /** 进站那一轮已经让开几次了（见 ARRIVE_MAX_TRIES） */
  let arriveTries = 0;
  /** 「屏幕外面那个人类」说到第几段了、上一段是什么时候说的 */
  let stareLevel = 0;
  let lastStareAt = 0;
  /** 上一回说梗是什么时候：说完隔一阵才允许下一个梗 */
  let lastMemeAt = 0;
  /** 上一回说即兴档（在线几只、你盯了多久）是什么时候 */
  let lastImprovAt = 0;
  /** 带 once 的档（稀客才说的话）上一次是什么时候说的 */
  const lastOnce = new Map<string, number>();
  /** 一句话说完要插戏时，后半截先寄在这儿，等戏演完再接上 */
  let pending: PendingTurn | null = null;
  /** 每张卡上一句说了什么，下一句尽量不重样 */
  const lastLine = new Map<string, string>();
  /** 这台机器上说过的话 → 上次说的时间；越久没说的越容易被挑中 */
  const saidAt = new Map<string, number>();
  /** 上一段对话是哪一段，下一段换一段 */
  let lastChatKey = "";
  /** 眼下的心情，以及它挂到什么时候（事件带起来的，过一会儿自己回落）。
      它是个 ref：卡片上的状态灯就照着它变色 */
  const mood = ref<EmoState>("normal");
  let emoUntil = 0;

  /** 把本地记的「听过哪些话」捡回来：隐私模式下读不到就当没记过 */
  function loadSaid(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SAID_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Record<string, number>;
      const now = Date.now();
      for (const [line, at] of Object.entries(stored)) {
        if (typeof at === "number" && now - at < SAID_KEEP_MS) saidAt.set(line, at);
      }
    } catch {
      /* 隐私模式等存储异常静默跳过 */
    }
  }

  /** 把记的账写回去：只留最近说的那几条，够用就行 */
  function saveSaid(): void {
    if (typeof window === "undefined") return;
    try {
      const entries = [...saidAt.entries()].sort((a, b) => b[1] - a[1]).slice(0, SAID_LIMIT);
      saidAt.clear();
      for (const [line, at] of entries) saidAt.set(line, at);
      window.localStorage.setItem(SAID_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {
      /* 存储异常静默跳过 */
    }
  }

  /** 这句话多久没说了：没说过的按最久算 */
  function freshnessWeight(line: string): number {
    const at = saidAt.get(line);
    if (!at) return SAID_MAX_WEIGHT;
    return 1 + Math.min((Date.now() - at) / SAID_FRESH_MS, SAID_MAX_WEIGHT - 1);
  }

  /** 按「越久没说越容易被挑中」抽一条；刚说过的那条先排除掉。
      池子里还有从没说过的时候只在那些里面挑 —— 光靠权重压不住重复：
      「没说过」10 分、「刚说过」1 分，算下来仍有一成多的轮次落回已经听过的段上，
      而光景档有两百多段，靠权重慢慢摊平要几十小时才轮得完一遍 */
  function pickByFreshness<T>(
    pool: readonly T[],
    keyOf: (item: T) => string,
    skipKey: string
  ): T {
    // 没听过的一律优先，全听过了才回头按新旧轮换
    const unheard = pool.filter((item) => !saidAt.has(keyOf(item)));
    const candidates = unheard.length > 0 ? unheard : pool;
    const weights = candidates.map((item) => {
      const key = keyOf(item);
      return key === skipKey ? 0 : freshnessWeight(key);
    });
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (total <= 0) return candidates[Math.floor(Math.random() * candidates.length)];
    let roll = Math.random() * total;
    for (let index = 0; index < candidates.length; index += 1) {
      roll -= weights[index];
      if (roll <= 0) return candidates[index];
    }
    return candidates[candidates.length - 1];
  }

  /** 这段话说出去了，记一笔（顺手把旧账清一清） */
  function markSaid(line: string): void {
    if (!line) return;
    saidAt.set(line, Date.now());
    saveSaid();
  }

  /** 记一笔心情：被人拎过就闹别扭、演完一段就得意、被盯着看就害羞 */
  function holdEmo(next: EmoState, holdMs: number): void {
    mood.value = next;
    emoUntil = Date.now() + holdMs;
  }

  /** 这段时间里既没被戳过也没被拖过（拿两个时间戳算）：判断「久待又没互动」用 */
  function quietFor(ms: number): boolean {
    const now = Date.now();
    return now - lastPokeAt >= ms && now - lastDragAt >= ms;
  }

  /** 这会儿是什么心情：事件带起来的优先，其次是被观众的动作带起来的那两档
      （好奇 / 黏人），再往后才是夜里、饭点、只剩自己这些客观档，
      最后才是「什么都没发生」的无聊。
      动作那两档不走 holdEmo 的定时 —— 它们靠条件实时成立，条件一散自己就回落。
      顺序上「手在动」排在「手停在卡上」前面：cursorFresh 只在最后这几秒里动过时为真，
      手真停下来它自己就是 false，所以不会把「手搁着不动」误判成好奇；
      反过来把黏人放前面的话，手在卡片区里晃来晃去也永远是黏人，好奇那一档根本出不来。
      无聊压在最后：它靠的是「累计看满多久 + 多久没互动」，两个都是只增不减的量，
      一满足就长期成立；排在时段档前面的话，深夜、饭点、只剩一张猫这三档再也看不到了 */
  function currentEmo(count: number): EmoState {
    // 事件带起来的心情还没到点，就照它算
    if (mood.value !== "normal" && Date.now() < emoUntil) return mood.value;
    const hour = new Date().getHours();
    // cursorFresh 与 hoverHoldMs 这两个信号由 HomeLive 喂进来（可选调用，没喂就当没有）
    if (host.cursorFresh?.()) mood.value = "curious";
    else if ((host.hoverHoldMs?.() ?? 0) >= CLINGY_HOVER_MS) mood.value = "clingy";
    else if (count === 1) mood.value = "lost";
    else if (hour < 5 || hour >= 23) mood.value = "sleepy";
    else if (hour >= 17 && hour < 19) mood.value = "hungry";
    else if (host.linger() >= BORED_LINGER_S && quietFor(BORED_LINGER_S * 1000)) mood.value = "bored";
    else mood.value = "normal";
    return mood.value;
  }

  /** 重算一次眼下的心情并写回 mood（状态灯与名字下的小字都读它）。
      时段跨档（跨过 23:00 / 17:00）、卡片只剩一张这些事不能等到下一轮说话才算；
      同值不写：Vue 的 ref 收到同一个值不会触发更新，状态灯上的 --live-beat 也就不会被重启 */
  function refreshMood(): void {
    currentEmo(host.cards().length);
  }

  /** 下一句等多久再说：气泡只有一份，下一句一执行，上一句的气泡立刻就没，
      所以这个间隔就是气泡的实际可见时长 —— 至少得等于这一句自己的停留时长，
      长句才真能读完（原来的 0.75 倍等于把长句的气泡凭空掐掉两成多）。
      短句仍由 CHAT_TURN_MS 兜底，整段对话的节奏不受影响 */
  function turnGapMs(line: string): number {
    return Math.min(Math.max(speechLingerMs(line), CHAT_TURN_MS), CHAT_TURN_MAX_MS);
  }

  /** 带戏的那句：气泡一读完就起手演。
      turnGapMs 的下限那 2400ms 是留给「不带戏的两句之间」的静场 —— 那时上一句的气泡已经收了，
      空一拍像换了个人说；而带戏的句子后面紧跟着一段动作，再空出这一拍，
      动作就跟那句话断了（短句最明显：气泡 1.6 秒就收，动作却要等到 2.4 秒才起，
      中间那 0.8 秒卡片只是杵着）。读得完、又不断档，就是下面这个数 */
  function actLeadMs(line: string): number {
    return Math.min(speechLingerMs(line), CHAT_TURN_MAX_MS);
  }

  /** 每个字该停多久：普通字一份、标点两份多。整句的预算由气泡的停留时长推出来，
      再按权重分到每个字 —— 长句也不会打到天黑，短句也不会慢得发慌 */
  function typingDelays(line: string): number[] {
    const chars = [...line];
    const weights = chars.map((char) => (/[，。！？…、；：～—]/.test(char) ? TYPE_PUNCT_WEIGHT : 1));
    const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    const budget = Math.min(speechLingerMs(line) * TYPE_BUDGET_RATIO, chars.length * TYPE_MAX_MS);
    const unit = Math.max(TYPE_MIN_MS, budget / total);
    return weights.map((weight) => weight * unit);
  }

  /** 把一句话摆到气泡上：短句整句直给，长句一个字一个字往外冒。
      动效减弱时也直给 —— 逐字往外冒对怕闪的人来说同样是负担 */
  function startTyping(line: string): void {
    window.clearTimeout(typeTimer);
    const bare = line.replace(/[，。！？…、；：～—\s]/g, "").length;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (bare <= TYPE_DIRECT_CHARS || reduceMotion) {
      speechShown.value = line;
      return;
    }
    const chars = [...line];
    const delays = typingDelays(line);
    let index = 0;
    speechShown.value = "";
    const step = (): void => {
      index += 1;
      speechShown.value = chars.slice(0, index).join("");
      if (index < chars.length) typeTimer = window.setTimeout(step, delays[index] ?? delays[0]);
    };
    typeTimer = window.setTimeout(step, delays[0] ?? TYPE_MAX_MS);
  }

  /** 让某张卡冒一句话，过一会儿自己收（同一时刻只有一张卡在说话） */
  function showSpeech(cardId: string, line: string): void {
    // 空台词（池子恰好是空的）直接不开口：先把 speakingId / speech 写下去再往回退的话，
    // 气泡会永久挂在屏幕上、isChatting() 恒真，大编舞与独处小动作就再也轮不上
    if (!line) return;
    speakingId.value = cardId;
    speech.value = line;
    // 摆到气泡上：长句一个字一个字冒，短句整句直给
    startTyping(line);
    // 说这句时配什么小动作：台词上标了就用标的，没标就照眼下的心情来
    speakingGesture.value =
      LINE_GESTURES[line] ?? MOOD_GESTURES[currentEmo(host.cards().length)] ?? "";
    window.clearTimeout(speechTimer);
    speechTimer = window.setTimeout(() => {
      // 这里只收 speakingId，不清 speech：气泡还要带着这句话淡出，
      // 提前清空会剩一个空框子在那儿缩。这句话本身留给下一次开口时覆盖。
      // 读屏那条道看的是 speakingId（spokenLine 在没有发言者时返回空串），不受影响
      speakingId.value = "";
    }, speechLingerMs(line));
  }

  /** 跨窗口搬来的卡片带的是外来的种类：认不出就退回猫卡那套池子。
      宁可说错一句，也不能在取池时抛异常 —— 异常落在定时器回调里，
      说话这条排期链就再也接不上了（首页从此不再开口） */
  function speechPool(kind: string, type: keyof SpeechLines): readonly string[] {
    const pools = SPEECH_LINES[kind as CardSpec["kind"]] ?? SPEECH_LINES.neko;
    return pools[type] ?? SPEECH_LINES.neko[type];
  }

  /** 从这张卡的池子里挑一句；自己待着、顺口搭话、被拎起来、落地时，先照着眼下的心情说 */
  function pickLine(card: CardSpec, type: keyof SpeechLines): string {
    const moods = MOOD_LINES[card.kind] ?? MOOD_LINES.neko;
    const moodPool = MOOD_SPEECH_TYPES.includes(type)
      ? moods[currentEmo(host.cards().length)]
      : undefined;
    const pool = moodPool && Math.random() < MOOD_CHANCE ? moodPool : speechPool(card.kind, type);
    // 池子空的时候挑不出句子：这里兜个空串，出口那一层（showSpeech）会直接不开口
    const line = pickByFreshness(pool, (item) => item, lastLine.get(card.id) ?? "") ?? "";
    lastLine.set(card.id, line);
    markSaid(line);
    return line;
  }

  /** 从一堆候选里挑一句：优先挑最久没说过的，都说过就挑最旧那句。
      给落点台词用（HomeLive 那批泛化认领来的台词），选中的那句由调用方自己记进账本 */
  function pickFresh(pool: readonly string[]): string {
    if (pool.length === 0) return "";
    // 一句新的都没有：账本上全记着，直接挑最旧的那句，不白摇一次骰子
    if (pool.every((line) => saidAt.has(line))) {
      return pool.reduce((oldest, line) =>
        (saidAt.get(line) ?? 0) < (saidAt.get(oldest) ?? 0) ? line : oldest
      );
    }
    // 还有没说过（或很久没说）的：走挑台词那同一套，pickByFreshness 会优先照顾没听过的
    return pickByFreshness(pool, (item) => item, "");
  }

  function nextChatDelay(): number {
    return CHAT_MIN_MS + Math.random() * (CHAT_MAX_MS - CHAT_MIN_MS);
  }

  /** 几张卡轮流搭话；只有一张就一直是它自己念叨 */
  function nextSpeaker(): CardSpec | null {
    const cards = host.cards();
    if (cards.length === 0) return null;
    const index = cards.findIndex((card) => card.id === lastSpeaker);
    const speaker = cards[(index + 1) % cards.length];
    lastSpeaker = speaker.id;
    return speaker;
  }

  /** 把眼下的光景读一遍（连这一轮的骰子一起，每轮只摇一次） */
  function readMood(gates: MomentGates): ChatMood {
    const cards = host.cards();
    const kinds = new Set(cards.map((card) => card.kind));
    const now = Date.now();
    const around = host.peers();
    const today = new Date();
    const hour = today.getHours();
    const day = today.getDay();
    return {
      period: periodOfHour(hour),
      cast: castOf(kinds) ?? "mixed",
      count: cards.length,
      peers: around.count,
      sides: around.sides,
      justDragged: now - lastDragAt < JUST_DRAGGED_MS,
      justPlayed: now - host.lastPlayedAt() < JUST_PLAYED_MS,
      weekday: day,
      linger: host.linger(),
      stare: stareLevel,
      stareReady: now - lastStareAt >= STARE_GAP_MS,
      justReturned: host.justReturned(),
      memeReady: now - lastMemeAt >= MEME_GAP_MS,
      gates,
      cursorIdle: host.cursorIdle(),
      cursorIdleMs: host.cursorIdleMs?.() ?? 0,
      touch: host.touch?.() ?? false,
      pointerGone: host.pointerGone?.() ?? false,
      scrolled: host.scrolled?.() ?? false,
      selectionMade: host.selectionMade?.() ?? false,
      flipped: host.flipped?.() ?? false,
      firstSeenDays: host.firstSeenDays?.() ?? 0,
      patToday: host.patToday?.() ?? 0,
      sleepy: host.sleepy?.() ?? false,
      specialDay: host.specialDay?.() ?? "none",
      tapBurst: host.tapBurst(),
      scrollDash: host.scrollDash(),
      awayDays: host.awayDays(),
      weekend: day === 0 || day === 6,
      workHours: day >= 1 && day <= 5 && hour >= WORK_START_HOUR && hour < WORK_END_HOUR,
      online: host.online(),
      visitTimes: host.visitTimes(),
      streak: host.streak(),
      doing: host.doing(),
      arriveFresh: arrivePending,
    };
  }

  /** 挑一段当下说得成的对话：正赶上什么光景就多说几句那档的，剩下的留给常备的那几套 */
  function pickChatTurns(): PickedChat | null {
    const mood = readMood(rollGates());
    // 进站那句问候排在最前面：今天头一回打开这一页就先说它（「第 N 天见啦」「好久不见」），
    // 说完这一轮 arriveFresh 就落下去，之后照常走别的路
    const arrival = arriveGreeting(mood);
    if (arrival && castFits(arrival.turns)) return { turns: arrival.turns, egg: arrival.egg };
    // 即兴的那几段读的是真数字，优先级最高：错过这会儿就说不成了
    const improv = pickImprov(mood);
    if (improv) return improv;

    const now = Date.now();
    // 稀客才说的话说过一次就歇一阵，别絮叨
    const eligible = (moment: (typeof CHAT_MOMENTS)[number]): boolean =>
      moment.cast === mood.cast &&
      moment.when(mood) &&
      (!moment.once || now - (lastOnce.get(moment.once) ?? 0) >= ONCE_GAP_MS);
    const all = CHAT_MOMENTS.filter(eligible);
    // 梗闸摇中的这一轮就只放梗：四百多段挤在同一个池子里互相稀释，而梗本来就被
    // MEME_GAP_MS 压到五分钟才轮到一回 —— 这一轮整个留给它，别让日常档来分。
    // 这一屏没有梗档时（比如只有猫卡的窗口）退回全部，别白白空一轮
    const memeOnly =
      mood.memeReady && mood.gates.meme ? all.filter((moment) => moment.meme === true) : [];
    const moments = memeOnly.length > 0 ? memeOnly : all;
    // 「那个人类一直在看」的第一段（那颗蛋的入口）是为这一刻专门写的，轮到了就优先说，不跟别的档抢；
    // 后两段没标 priority，跟大家一样排队，还各自带着那道闸 —— 原来它们必说且独占，六分钟能连说三段
    const priority = moments.filter((moment) => moment.priority);
    const pool: readonly PickedChat[] =
      priority.length > 0
        ? priority
        : moments.length > 0 && Math.random() < MOMENT_CHANCE
          ? moments
          : CHAT_TURNS[mood.cast].map((turns) => ({ turns }));
    if (pool.length === 0) return null;

    // 久没说过的排前面，刚说过的那段先让开
    const picked = pickByFreshness(pool, (item) => item.turns[0]?.line ?? "", lastChatKey);
    lastChatKey = picked.turns[0]?.line ?? "";
    markSaid(lastChatKey);
    return picked;
  }

  /** 这一段里的角色，眼下这几张卡都有人能说吗：
      纯猫卡的窗口摇中带在线猫台词的那一档，speakerFor 会返回 null，整段就白挑了 */
  function castFits(turns: readonly ChatTurn[]): boolean {
    const kinds = new Set(host.cards().map((card) => card.kind));
    return turns.every((turn) => kinds.has(turn.by));
  }

  /** 即兴档：台词里要现读真实数字（在线几只、你盯了多久、今天第几次来）。
      说过一次要歇一阵，否则会揪着同一个数字反复报 */
  function pickImprov(mood: ChatMood): PickedChat | null {
    const now = Date.now();
    if (now - lastImprovAt < IMPROV_GAP_MS) return null;
    // 刚进页面这一会儿先别报数：这几句读的是停留时长、今天第几次来，
    // 首屏还没读完就报出来太急了（改前第一轮 20–45 秒就放行）
    if (mood.linger < IMPROV_WARMUP_S) return null;

    // 台词是拿此刻的数字现拼的，挑之前先拼一遍：数字不成立（返回 null）、
    // 或者这一段里的角色在手头这几张卡里没人能说，都直接出局
    const ready = CHAT_IMPROV.flatMap((improv, index): ReadyImprov[] => {
      if (!improv.when(mood)) return [];
      const turns = improv.lines(mood);
      if (!turns || turns.length === 0 || !castFits(turns)) return [];
      return [{ key: `improv:${index}`, turns }];
    });
    if (ready.length === 0 || Math.random() >= IMPROV_CHANCE) return null;

    const picked = pickByFreshness(ready, (item) => item.key, lastChatKey);
    lastImprovAt = now;
    lastChatKey = picked.key;
    markSaid(picked.key);
    return { turns: picked.turns };
  }

  /** 这一句该谁张嘴：要那种卡，而且尽量别跟上一位是同一张 */
  function speakerFor(kind: CardSpec["kind"], previous: string): CardSpec | null {
    const sameKind = host.cards().filter((card) => card.kind === kind);
    if (sameKind.length === 0) return null;
    return sameKind.find((card) => card.id !== previous) ?? sameKind[0];
  }

  /** 把没说完的那半截掐掉：定时器、寄存的后半截、还有「话还没说完」这个标记一起清。
      少清一个标记，isChatting() 就会一直为真，大编舞也跟着永远轮不上 */
  function abortTurn(): void {
    window.clearTimeout(turnTimer);
    turnPending = false;
    pending = null;
  }

  /** 戏演完了、或者根本演不出来：把刚才那段话的后半截接上 */
  function resumePending(): boolean {
    const next = pending;
    // 这段已经作废（被拎走、被搬走）：把寄着的那半截丢掉就行，
    // turnTimer 千万别碰 —— 手上跑着的可能是另一段对话的排期
    if (!next || next.run !== chatRun) {
      pending = null;
      return false;
    }
    abortTurn();
    playTurn(next.turns, next.index, next.run, next.previous);
    return true;
  }

  /** 一句一句往外冒：中途被拎走、被搬走、演起动画就整段作废 */
  function playTurn(
    turns: readonly ChatTurn[],
    index: number,
    run: number,
    previous: string
  ): void {
    // 已经作废的那段（卡片被拎走 / 被搬走）自己安静退场，不接管排期
    if (run !== chatRun) return;

    // 说完了，把演戏的节奏还回去
    if (index >= turns.length) {
      host.releaseShow();
      return;
    }

    if (!host.visible() || !host.ready()) {
      chatRun += 1;
      host.releaseShow();
      return;
    }

    const turn = turns[index];
    const speaker = speakerFor(turn.by, previous);
    if (!speaker) {
      chatRun += 1;
      host.releaseShow();
      return;
    }
    showSpeech(speaker.id, turn.line);

    // 这句说完要插一段戏：让位给演出，戏演完（或兜底到点）再把后半截接上
    const act = turn.act;
    window.clearTimeout(turnTimer);
    if (act) {
      pending = { turns, index: index + 1, run, previous: speaker.id };
      turnPending = true;
      turnTimer = window.setTimeout(() => {
        turnPending = false;
        if (run !== chatRun) {
          pending = null;
          return;
        }
        if (!host.act(act)) {
          resumePending();
          return;
        }
        turnTimer = window.setTimeout(resumePending, ACT_FALLBACK_MS);
      }, actLeadMs(turn.line));
      return;
    }

    turnPending = true;
    turnTimer = window.setTimeout(() => {
      turnPending = false;
      playTurn(turns, index + 1, run, speaker.id);
    }, turnGapMs(turn.line));
  }

  /** 轮到说话了：偶尔只是自己嘀咕一句，多数时候两张以上就来一段你一句我一句 */
  function startChat(): void {
    const cards = host.cards();
    // 只剩一张卡：不合成段对话（凑不出对手戏，这是刻意挡的），但即兴档读的是真数字
    // （在线几只、你在这儿待了多久），跟几张卡无关 —— 单卡也得轮到它，不然这层整层失效
    const picked =
      cards.length === 1
        ? pickImprov(readMood(rollGates()))
        : Math.random() < MUTTER_CHANCE
          ? null
          : pickChatTurns();
    if (!picked) {
      const speaker = nextSpeaker();
      if (speaker) showSpeech(speaker.id, pickLine(speaker, cards.length === 1 ? "solo" : "idle"));
      return;
    }

    // 说这一档的同时顺手把彩蛋、梗的间隔、盯看说到第几段都记上
    if (picked.egg) markEgg(picked.egg);
    const now = Date.now();
    if (picked.meme) lastMemeAt = now;
    if (picked.once) lastOnce.set(picked.once, now);
    if (picked.stare) {
      lastStareAt = now;
      stareLevel += 1;
      // 被人盯着看这么久，会不好意思
      holdEmo("shy", SHY_HOLD_MS);
    }
    // 被人连戳了一顿：也是被盯着看的一种
    if (picked.once === "tapBurst") holdEmo("shy", SHY_HOLD_MS);
    chatRun += 1;
    // 这一段对话期间先别演戏：不然刚开口就被一段动画打断，后半截就说不下去了
    host.holdShow();
    playTurn(picked.turns, 0, chatRun, "");
  }

  function schedule(delayMs: number): void {
    window.clearTimeout(chatTimer);
    chatTimer = window.setTimeout(() => {
      // 进站那一轮要是赶上正演戏，就过会儿再问一次（见 ARRIVE_RETRY_MS）
      let askAgain = false;
      try {
        if (host.visible() && host.ready()) {
          // 说完了才落这个标记：startChat 挑段子时要读它（mood.arriveFresh 就是它），
          // 先清掉等于自己把这句进站问候掐了
          startChat();
          arrivePending = false;
        } else if (arrivePending) {
          arriveTries += 1;
          askAgain = arriveTries < ARRIVE_MAX_TRIES;
          if (!askAgain) arrivePending = false;
        }
      } catch (error) {
        // startChat 里已经先 holdShow() 了，抛出去的话台面（holding）就永远还不回来：
        // 独处小动作与特别节目被永久压住，猫看着像突然变懒、只剩说话
        arrivePending = false;
        host.releaseShow();
        console.error("[live-chat] 这一轮说话出错，已把台面还回去", error);
      } finally {
        // 不管这一轮出了什么事，排期链都得接上：这里断了，首页就再也不说话了。
        // 唯一的例外是切到后台：那会儿排了也没人看，定时器还会被浏览器节流成空转、白耗电，
        // 所以链子在这儿断掉是有意的 —— 回前台由 HomeLive 的 resumeAll() 调 scheduleNext() 接回来
        if (!document.hidden) schedule(askAgain ? ARRIVE_RETRY_MS : nextChatDelay());
      }
    }, delayMs);
  }

  onBeforeUnmount(() => {
    window.clearTimeout(speechTimer);
    window.clearTimeout(typeTimer);
    window.clearTimeout(chatTimer);
    window.clearTimeout(turnTimer);
  });

  // 这台机器上已经听过哪些话，从本地捡回来
  loadSaid();

  return {
    speakingId,
    speakingGesture,
    mood,
    speech,
    speechShown,
    say: (card, type) => showSpeech(card.id, pickLine(card, type)),
    // 与 pickLine 一个口径：记下这张卡上一句说了什么、这句已经说过了 ——
    // 反复把同一张卡拎到同一个落点，才不会一字不差地复述同一句
    sayLine: (card, line) => {
      lastLine.set(card.id, line);
      markSaid(line);
      showSpeech(card.id, line);
    },
    pickFresh,
    lingerSpeech: () => {
      window.clearTimeout(speechTimer);
      speechTimer = window.setTimeout(() => {
        speakingId.value = "";
      }, speechLingerMs(speech.value));
    },
    hush: () => {
      window.clearTimeout(speechTimer);
      window.clearTimeout(typeTimer);
      speakingId.value = "";
    },
    forget: (cardId) => {
      lastLine.delete(cardId);
      if (lastSpeaker === cardId) lastSpeaker = "";
      // 说话的那张被搬走了，这段对话就说到这儿
      chatRun += 1;
      abortTurn();
    },
    stop: () => {
      chatRun += 1;
      // 正在等戏的那半截也算废掉，别一会儿又冒出来
      abortTurn();
      // 这段不说了，把台面还回去：不还的话 holding 会一直为真，
      // 独处小动作（12 秒重试）与特别节目（90 秒重试）被永久压住，直到下一次拖拽才自愈
      host.releaseShow();
    },
    scheduleAfterGreeting: () => schedule(GREETING_REPLY_MS + nextChatDelay()),
    isChatting: () => speakingId.value !== "" || turnPending || pending !== null,
    markDragged: () => {
      lastDragAt = Date.now();
      // 刚被人拎来拎去：不一定闹别扭 —— 每次都必闹、还挂满一分半的话，爱拖着玩的人
      // 整天看着卡片摆臭脸；所以只按一个不高的概率闹。
      // 已经是 sulky 就直接跳过：一路拖着玩会把这段计时无限续期，等于一直在闹。
      // 没抽中的那次什么也不改：保持它当下的心情，不硬塞一个别的档
      if (mood.value !== "sulky" && Math.random() < SULKY_ON_DRAG_CHANCE) {
        holdEmo("sulky", SULKY_HOLD_MS);
      }
      schedule(DRAG_CHAT_MIN_MS + Math.random() * (DRAG_CHAT_MAX_MS - DRAG_CHAT_MIN_MS));
    },
    markPlayed: () => {
      // 刚演完一段：有点小得意
      holdEmo("happy", HAPPY_HOLD_MS);
      schedule(SHOW_CHAT_MIN_MS + Math.random() * (SHOW_CHAT_MAX_MS - SHOW_CHAT_MIN_MS));
    },
    // 被戳：先羞一下（戳得勤就闹别扭），隔两秒才回一句 —— 连点不该刷屏；
    // 卡片正拎在手上、飘去隔壁时自然不该开口（那会儿它正被搬着走）
    poke: (card) => {
      const now = Date.now();
      if (now - lastPokeAt < POKE_GAP_MS) return;
      if (!host.visible() || !host.canPoke()) return;
      // 心情改在两道闸之后：真的回话这一下才改。搁在闸前面的话，连戳会把 shy / sulky
      // 一直续下去，把「深夜打盹」「傍晚饿了」这类时段心情长期压住
      holdEmo(host.tapBurst() ? "sulky" : "shy", SHY_HOLD_MS);
      lastPokeAt = now;
      showSpeech(card.id, pickLine(card, "poke"));
    },
    // 被摸头顶：鼠标不点不按、只是搁在卡面上摸来摸去。跟戳不是一回事 ——
    // 摸头是好事，不换心情（poke 那套害羞 / 闹别扭搁这儿会让人一头雾水），
    // 但这一下算「互动过了」：手明明一直在动，不该这时候判它无聊
    pat: (card) => {
      const now = Date.now();
      if (now - lastPatAt < PAT_GAP_MS) return;
      if (!host.visible() || !host.canPoke()) return;
      lastPatAt = now;
      lastPokeAt = now;
      showSpeech(card.id, pickLine(card, "pat"));
    },
    // 今天头一回打开这一页：先把第一轮提前，好让进站那句问候早点说出口（见 ARRIVE_CHAT_MIN_MS）。
    // 刷新之后 visitTimes 已经不是 1 了，所以这句一天只说一次
    scheduleNext: () => {
      if (!arriveHandled) {
        arriveHandled = true;
        if (host.visitTimes() === 1) {
          arrivePending = true;
          schedule(ARRIVE_CHAT_MIN_MS + Math.random() * (ARRIVE_CHAT_MAX_MS - ARRIVE_CHAT_MIN_MS));
          return;
        }
      }
      schedule(nextChatDelay());
    },
    refreshMood,
    actDone: resumePending,
  };
}
