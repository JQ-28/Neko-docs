// 首页两张卡片的互动演出：演哪几段、什么时候演、怎么跟隔壁对齐节奏。
// 演的是此刻排在最前面那两张卡（左右分工由 playSide 定），卡片区滚进视野才开演。

import { computed, nextTick, onBeforeUnmount, ref, type ComputedRef, type Ref } from "vue";
import { markEgg } from "./egg-utils";
import { EGG_THRESHOLDS } from "./neko-shared-eggs";
import type { CardSpec } from "./live-peer";

/** 互动脚本：两张卡片配合演一段，每次进站随机挑一段 */
export interface PlayScript {
  /** 与样式里 data-play 的取值对应 */
  name: string;
  /** 播放时长 = 样式里那条动画的时长 + 它的延迟（右边那只常常慢半拍），到点收工。
      对不齐就两种毛病：动作还没走完就被掐掉，或者演完了卡片还僵一会儿 */
  durationMs: number;
  /** 顺带让两只猫各歪一次头，像在互相打量 */
  withPeek: boolean;
  /** 只在台词点名时才演，不进随机排期（靠一下、递东西单独演会很莫名其妙） */
  byLineOnly?: boolean;
  /** 大编舞：动作大、时间长，当「特别节目」偶尔来一次，不掺进平时的打闹里 */
  big?: boolean;
}

export const PLAY_SCRIPTS: readonly PlayScript[] = [
  { name: "meet", durationMs: 1500, withPeek: true },
  { name: "bump", durationMs: 1700, withPeek: true },
  { name: "hop", durationMs: 1400, withPeek: false },
  { name: "chase", durationMs: 1800, withPeek: false },
  { name: "peek", durationMs: 1400, withPeek: true },
  { name: "pounce", durationMs: 2400, withPeek: false },
  { name: "knock", durationMs: 2600, withPeek: false },
  { name: "tag", durationMs: 3200, withPeek: false },
  { name: "roll", durationMs: 2750, withPeek: true },
  { name: "swap", durationMs: 3200, withPeek: true },
  { name: "mirrorStep", durationMs: 3000, withPeek: false },
  // 多拍子的日常：不是「A 动一下、B 动一下」就完，而是来回好几个回合，久看不厌。
  // 这几段的位移只按 --play-gap（两张卡的相对间距）算，不跨屏，所以窄屏也甩不出去；
  // 但走的是横轴 —— 竖排（两张卡上下摞着）时「凑近」会变成横向错开，这一段待修（别照抄这几条）
  { name: "nuzzle", durationMs: 4200, withPeek: false },
  { name: "leanNap", durationMs: 6500, withPeek: false },
  { name: "shareBite", durationMs: 4800, withPeek: false },
  { name: "highPaw", durationMs: 2800, withPeek: true },
  { name: "startle", durationMs: 3400, withPeek: false },
  { name: "roundChase", durationMs: 4600, withPeek: false },
  { name: "tailSpin", durationMs: 5200, withPeek: false },
  { name: "makeUp", durationMs: 4400, withPeek: false },
  // 又一批日常对手戏：动作都只按 --play-gap / --play-span 这类相对量挪窝，不写死像素
  { name: "knead", durationMs: 3200, withPeek: true },
  { name: "groom", durationMs: 3600, withPeek: false },
  { name: "tussle", durationMs: 3000, withPeek: false },
  { name: "alarm", durationMs: 3000, withPeek: false },
  { name: "playDead", durationMs: 3400, withPeek: true },
  { name: "parade", durationMs: 4200, withPeek: false },
  { name: "shove", durationMs: 2800, withPeek: false },
  { name: "spoon", durationMs: 3600, withPeek: false },
  { name: "lean", durationMs: 1800, withPeek: false, byLineOnly: true },
  { name: "pass", durationMs: 1600, withPeek: false, byLineOnly: true },
  { name: "mimic", durationMs: 1950, withPeek: false, byLineOnly: true },
  { name: "lookOut", durationMs: 2000, withPeek: false, byLineOnly: true },
  { name: "circle", durationMs: 4500, withPeek: false, big: true },
  { name: "crossPlay", durationMs: 7000, withPeek: false, big: true },
  { name: "leapfrog", durationMs: 3000, withPeek: false, big: true },
  { name: "chaseLoop", durationMs: 6000, withPeek: false, big: true },
  { name: "peekaboo", durationMs: 4000, withPeek: false, big: true },
];

/** 平时自己排的那几段：按词演的、还有大编舞都不掺和，不然节奏会乱 */
const DANCE_SCRIPTS: readonly PlayScript[] = PLAY_SCRIPTS.filter(
  (script) => !script.byLineOnly && !script.big
);

/** 大编舞：动作大、时间长，偶尔当一次特别节目 */
const BIG_SCRIPTS: readonly PlayScript[] = PLAY_SCRIPTS.filter((script) => script.big);

/** 一个人也能演的小动作：打哈欠、伸懒腰、抖耳朵、回头看、抖毛。
    不用等对手，所以手里只有一张卡的时候也排得上 —— 那会儿它本来几乎是张静止的图。
    这几段不进 DANCE_SCRIPTS：独角戏与对手戏各排各的，互不占名额 */
export const SOLO_SCRIPTS: readonly PlayScript[] = [
  { name: "yawn", durationMs: 3200, withPeek: false },
  { name: "stretchOut", durationMs: 2800, withPeek: false },
  { name: "earFlick", durationMs: 1400, withPeek: false },
  { name: "lookBack", durationMs: 2600, withPeek: false },
  { name: "shakeOff", durationMs: 1600, withPeek: false },
];

/** 独处小动作之间的间隔：比对手戏稀一点，不然一张卡会显得特别忙 */
const SOLO_MIN_MS = 26_000;
const SOLO_MAX_MS = 52_000;
/** 到点发现台面正被占着（在说话、在演对手戏）：过一会儿再来问，别白等一整轮 */
const SOLO_RETRY_MS = 12_000;

/** 挑段时避开最近演过的这么多段：单窗口下纯随机看几分钟就会老是那几段。
    日常对手戏段数最多，记得也最多；大编舞统共 5 段、独处小动作 5 段，记两段就够错开 */
const RECENT_DANCE_MEMORY = 8;
const RECENT_BIG_MEMORY = 2;
const RECENT_SOLO_MEMORY = 2;

/** 特别节目之间至少隔这么久，不然就成蹦迪了 */
const BIG_MIN_GAP_MS = 6 * 60_000;
const BIG_MAX_GAP_MS = 9 * 60_000;
/** 首场特别节目不等上面那 6–9 分钟：人往往是刚进站这会儿最闲，按平时那间隔多半等不到 */
const BIG_FIRST_MIN_MS = 90_000;
const BIG_FIRST_MAX_MS = 180_000;
/** 特别节目要横跨对方：舞台两边至少得留出这么多余地，跨过去才看得出名堂。
    余量由 HomeLive 现量（量的是屏幕边到卡片的实际距离），不够时不是一刀切不演，
    而是把幅度按实测缩下来 —— 手机上那几段就是这么演上的；缩到这个份上就算了 */
const BIG_MIN_SPAN = 90;
/** 到点了但台面正被占着（多半是在说话）：过这么久再来看一眼，不让它一等又是一整轮 */
const BIG_RETRY_MS = 90_000;

/** 新卡落地先演一段短的见面小戏，从几段轻巧的里挑 */
const GREET_SCRIPTS: readonly PlayScript[] = PLAY_SCRIPTS.filter(
  (script) => script.name === "meet" || script.name === "bump" || script.name === "peek"
);

/** 卡片露头后先让入场动画落定，再开演 */
const FIRST_PLAY_MIN_MS = 600;
const FIRST_PLAY_MAX_MS = 1200;
/** 演完一段隔一阵再演下一段，间隔不固定才不像机器。
    留得比对话间隔宽一点：演出期间话是说不了的，太密会把闲聊挤没 */
const REPLAY_MIN_MS = 22_000;
const REPLAY_MAX_MS = 42_000;
/** 滚走了又滚回来，离上一段太近就先补够这点时间，免得来回刷屏 */
const RESUME_GAP_MS = 6_000;
/** 到点了台上却正演着别的一段，就让一让、过这么一会儿再来问。
    不让的话会把独处小动作、刚落地那对见面小戏拦腰掐断，看着像猫抽了一下 */
const DANCE_RETRY_MS = 1_500;
/** 恰好两张才演得成对手戏：多凑了几张就停播，只留它们自己聊天 */
const PLAY_CARDS = 2;
/** 隔壁也开着页面时改用统一的时间槽排期：两边不通信也能算出同一段、同一时刻 */
const DANCE_PERIOD_MS = 24_000;
const DANCE_OFFSET_MS = 6000;

/** 演哪一段、算不算跟隔壁的齐舞，都由调用方说了算 */
export interface PlayOptions {
  /** 指定演哪一段，不给就随机挑一段 */
  script?: PlayScript;
  /** 与隔壁同一时间槽演的那段，算「猫界齐舞」 */
  dance?: boolean;
}

/** 演出要用到的几件外界情况，都由组件喂进来 */
export interface ShowHost {
  /** 眼下住在这扇窗口里的卡片 */
  cards: () => CardSpec[];
  /** 某张卡的槽位元素 */
  slotOf: (cardId: string) => HTMLElement | undefined;
  /** 卡片区在不在视野里 */
  visible: () => boolean;
  /** 隔壁还开着窗口吗（有邻居就跟着时间槽齐舞） */
  hasPeers: () => boolean;
  /** 又开演了：谁想提前让开台面（比如正在说话的对话）就用它 */
  onStarted?: () => void;
  /** 又演完一段：谁想借这个时机说两句就用它 */
  onFinished?: () => void;
  /** 要演大编舞了，这会儿台面空着吗（正在说话就先别演） */
  bigReady?: () => boolean;
  /** 现量一次「跨过对方」还剩多少余地（顺手把量到的值写到槽位给动画用）。
      大编舞靠它判断能不能演：余量小不是不演，而是幅度跟着缩小。
      没实现就当作任意宽，按老规矩演 */
  measureSpan?: () => number;
}

export interface LiveShow {
  /** 这一场演的是哪段（空串表示没在演），动画类是模板说了算，免得被 Vue 刷新冲掉 */
  readonly playingName: Ref<string>;
  /** 演对手戏的两张卡是谁：恰好两张时才排得出左右，猫卡在前站左边。
      动画里两张卡分工不同（谁撞过来、谁被打飞）都得认准这两张 */
  readonly playSide: ComputedRef<{ left: string; right: string }>;
  /** 这一段演的是哪几张卡（对手戏两张、独处小动作一张）：模板据此挂 is-playing 与 data-play */
  readonly playingIds: ComputedRef<Set<string>>;
  isPlaying(): boolean;
  /** 上一回开演是什么时候（时间戳，没演过就是 0） */
  lastPlayedAt(): number;
  /** 此时此刻凑得齐两张、也有人在看吗 */
  canPlay(): boolean;
  /** 演一段（不给就随机挑一段） */
  play(options?: PlayOptions): void;
  /** 按名字演指定的那一段（对话中间插戏用）；凑不齐两张就演不成，返回 false */
  playByName(name: string): boolean;
  /** 新卡落地那段见面小戏演哪一段 */
  pickGreeting(): PlayScript;
  /** 刚露头：按规矩排第一段 */
  scheduleFirst(): void;
  /** 闹完了，接着原来的节奏演 */
  resume(): void;
  /** 切到后台时把演到一半的那一段当场收掉，不留半截；回前台由 resume() 重新排一段 */
  abortPlaying(): void;
  /** 手上要干别的了：已排的、正在演的都停下 */
  hold(): void;
  /** 让某张卡里的头像扭一下，动画由各卡片自己的样式提供 */
  peek(root: HTMLElement | null, selector: string): void;
}

export function useLiveShow(host: ShowHost): LiveShow {
  const playingName = ref("");
  /** 独处小动作演的是哪张卡（空串表示这场是对手戏、或者没在演） */
  const soloId = ref("");
  let soloTimer = 0;
  let playTimer = 0;
  let bigTimer = 0;
  let resetTimer = 0;
  /** 组件让过台面（比如正在说话）的时候，特别节目先别插进来 */
  let holding = false;
  /** 最近演过的段（新的在前），挑段时先把它们排除，免得几分钟里反复撞见同一段。
      只管单窗口那条随机路径；多窗口是按时间槽算的，两边必须算出同一段，名单在这儿派不上用场 */
  const recentDance: string[] = [];
  const recentBig: string[] = [];
  const recentSolo: string[] = [];
  let lastPlayedAt = 0;
  /** 独处小动作与特别节目这两条链切到后台时会自己停掉（早退不重排，见各自的注释）。
      回前台的 resume() 看这两个标记决定要不要把它们重新叫起来 —— 平时 resume() 被说话链、
      拖拽、卡片数变化调得挺勤，无条件重排会把正在跑的排期一次次往后推，
      独处小动作就永远等不到那 26–52 秒 */
  let soloStopped = false;
  let bigStopped = false;
  /** 独处小动作与特别节目这两条链点着过没有：进站第一次露头才点，之后只看上面那两个标记 */
  let soloBigStarted = false;
  /** 这一场演过哪些剧本，用来凑「猫猫剧场」 */
  const seenShows = new Set<string>();

  /** 上场演出的两个槽位，左右分工与模板上的 class 用同一份安排。
      独处小动作只有一张卡，右边留空：别的卡就不会拿到 --left / --right 那套分工 */
  const playSide = computed(() => {
    if (soloId.value) return { left: soloId.value, right: "" };
    const [left = "", right = ""] = host
      .cards()
      .slice(0, PLAY_CARDS)
      .map((card) => card.id);
    return { left, right };
  });

  /** 这一段演的是哪几张卡：对手戏两张、独处小动作一张。
      模板靠它决定谁挂 is-playing 与 data-play —— 不然三张卡会跟着一起打哈欠 */
  const playingIds = computed(() => {
    if (!playingName.value) return new Set<string>();
    return new Set([playSide.value.left, playSide.value.right].filter(Boolean));
  });

  function activeSlots(): HTMLElement[] {
    return [playSide.value.left, playSide.value.right]
      .map((cardId) => host.slotOf(cardId))
      .filter((el): el is HTMLElement => Boolean(el));
  }

  function isPlaying(): boolean {
    return playingName.value !== "";
  }

  function clearPlayback(): void {
    playingName.value = "";
    soloId.value = "";
  }

  /** 从一堆剧本里挑一段，避开最近演过的那几段；舞台上就这么几段，排完了自然整个回头。
      名单只留最近 memory 段，旧的自然滑出去，用不着显式清空 */
  function pickFresh(scripts: readonly PlayScript[], recent: string[], memory: number): PlayScript {
    const fresh = scripts.filter((script) => !recent.includes(script.name));
    const pool = fresh.length > 0 ? fresh : scripts;
    const script = pool[Math.floor(Math.random() * pool.length)];
    recent.unshift(script.name);
    if (recent.length > memory) recent.length = memory;
    return script;
  }

  function pickScript(): PlayScript {
    return pickFresh(DANCE_SCRIPTS, recentDance, RECENT_DANCE_MEMORY);
  }

  function peek(root: HTMLElement | null, selector: string): void {
    const avatar = root?.querySelector<HTMLElement>(selector);
    if (!avatar) return;
    // 先摘掉再强制重排，保证连续两次也能各自播出动画
    avatar.classList.remove("is-moving");
    void avatar.offsetWidth;
    avatar.classList.add("is-moving");
  }

  /** 下一个时间槽是第几号、什么时候开始（永远是严格的下一个，不会立刻重播） */
  function nextDanceSlot(now = Date.now()): { slot: number; at: number } {
    const slot = Math.floor((now - DANCE_OFFSET_MS) / DANCE_PERIOD_MS) + 1;
    return { slot, at: slot * DANCE_PERIOD_MS + DANCE_OFFSET_MS };
  }

  /** 纯函数：同一个槽在任何窗口都算出同一段；与上一槽错开，免得连着演同一段。
      这里不查「最近演过」名单 —— 名单是各窗口自己攒的，两边状态不一致，
      查了就会算出不同的段，齐舞当场散架。随机只许留在单窗口那条路径上 */
  function scriptForSlot(slot: number): PlayScript {
    const total = DANCE_SCRIPTS.length;
    const pick = ((slot * 2654435761) >>> 0) % total;
    const previous = (((slot - 1) * 2654435761) >>> 0) % total;
    return DANCE_SCRIPTS[pick === previous ? (pick + 1) % total : pick];
  }

  /** 排下一段的间隔：隔壁开着就等下一个时间槽，自己待着就随便隔一阵 */
  function nextPlayDelay(): number {
    if (!host.hasPeers()) {
      return REPLAY_MIN_MS + Math.random() * (REPLAY_MAX_MS - REPLAY_MIN_MS);
    }
    return Math.max(800, nextDanceSlot().at - Date.now());
  }

  async function playScript({ script: preset, dance = false }: PlayOptions = {}): Promise<void> {
    const script = preset ?? pickScript();
    // 跟着隔壁一起演的那段算「猫界齐舞」
    if (dance) markEgg("twinDance");
    // 一场里看完 5 段不一样的就算「猫猫剧场」
    seenShows.add(script.name);
    if (seenShows.size >= EGG_THRESHOLDS.cardShows) markEgg("peekShows");

    // 先摘掉上一段再上新的，中间让 DOM 更新一次，连播两段时才不会并成一次
    clearPlayback();
    await nextTick();
    const slots = activeSlots();
    if (slots.length < PLAY_CARDS) return;

    playingName.value = script.name;
    // 台面交给我了：正在说话的对话先让一让，演完再说
    host.onStarted?.();
    if (script.withPeek) {
      slots.forEach((slot) => peek(slot, ".home-live-avatar, .home-online-avatar"));
    }

    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      clearPlayback();
      // 刚演完，让它们说两句刚才那一下
      host.onFinished?.();
    }, script.durationMs);
    lastPlayedAt = Date.now();
  }

  /** 独处小动作：只动一张卡，不用凑齐两张 */
  async function playSolo(script: PlayScript, cardId: string): Promise<void> {
    clearPlayback();
    await nextTick();
    if (!host.slotOf(cardId)) return;

    soloId.value = cardId;
    playingName.value = script.name;
    host.onStarted?.();

    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      clearPlayback();
      host.onFinished?.();
    }, script.durationMs);
    lastPlayedAt = Date.now();
  }

  /** 独处小动作的排期：手里几张卡都排得上，所以只剩一张卡时它也不至于干站着 */
  function scheduleSolo(
    delayMs = SOLO_MIN_MS + Math.random() * (SOLO_MAX_MS - SOLO_MIN_MS)
  ): void {
    window.clearTimeout(soloTimer);
    soloTimer = window.setTimeout(() => {
      // 切到后台就把这条链停掉、不重排：后台定时器会被浏览器节流成空转，笔记本风扇就是这么转起来的。
      // 链子在这儿断掉是有意的 —— 回前台由 HomeLive 的 resumeAll() → resume() 接回来
      if (document.hidden) {
        soloStopped = true;
        return;
      }
      const cards = host.cards();
      // 台面正忙（在说话、在演对手戏、拎在手上、页滚出视野）：过会儿再来问。
      // 这里不重排一整轮，不然很容易一连几次都撞上说话
      const busy =
        holding ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        isPlaying() ||
        cards.length === 0 ||
        !host.visible() ||
        !(host.bigReady?.() ?? true);
      if (busy) {
        scheduleSolo(SOLO_RETRY_MS);
        return;
      }
      const card = cards[Math.floor(Math.random() * cards.length)];
      void playSolo(pickFresh(SOLO_SCRIPTS, recentSolo, RECENT_SOLO_MEMORY), card.id);
      scheduleSolo();
    }, delayMs);
  }

  /** 此时此刻凑得齐两张、也有人在看吗 */
  function canPlay(): boolean {
    // 页面切到后台就别演了：没人看的动画白烧电
    return host.cards().length === PLAY_CARDS && host.visible() && !document.hidden;
  }

  function schedule(delayMs: number): void {
    window.clearTimeout(playTimer);
    playTimer = window.setTimeout(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // 滚出视野、或者手里凑不齐两张卡，就先歇着；卡片回来后由组件重新排期
      if (!canPlay()) return;
      // 台上正演着别的一段（独处小动作、见面小戏）：过会儿再来问。
      // 这条判据独处与大编舞那边都有，只有对手戏漏了 —— 它一开演就直接把台上那段掐掉
      if (isPlaying()) {
        schedule(DANCE_RETRY_MS);
        return;
      }
      // 有邻居就跟着时间槽演，两边动作才齐
      if (host.hasPeers()) {
        void playScript({ script: scriptForSlot(nextDanceSlot().slot), dance: true });
      } else {
        void playScript();
      }
      schedule(nextPlayDelay());
    }, delayMs);
  }

  /** 下一个时间槽该演哪段特别节目（没有邻居就随机挑一段，挑的时候避开刚演过的） */
  function pickBig(): PlayScript {
    // 有邻居那条跟 scriptForSlot 同理：按槽算的段两边得一致，不查「最近演过」名单
    if (host.hasPeers()) {
      const slot = nextDanceSlot().slot;
      return BIG_SCRIPTS[((slot * 40503) >>> 0) % BIG_SCRIPTS.length];
    }
    return pickFresh(BIG_SCRIPTS, recentBig, RECENT_BIG_MEMORY);
  }

  /** 特别节目：隔一阵来一次，到点了先看看台面空不空 */
  function scheduleBig(
    delayMs = BIG_MIN_GAP_MS + Math.random() * (BIG_MAX_GAP_MS - BIG_MIN_GAP_MS)
  ): void {
    window.clearTimeout(bigTimer);
    bigTimer = window.setTimeout(() => {
      // 跟独处小动作一样：切到后台就停掉这条链、不重排（省电），回前台由 resume() 接回来
      if (document.hidden) {
        bigStopped = true;
        return;
      }
      // 台面这会儿不空：正在说话、手拎着卡、上一段还没演完，
      // 或者舞台两边剩下的地方不够跨过去（不是按窗口宽度一刀切：幅度会按实测缩）。
      // 量余地被排到最后：它要写槽位上的实测值，得挑台面干净的时候量
      const busy =
        holding ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        !canPlay() ||
        isPlaying() ||
        !(host.bigReady?.() ?? true) ||
        (host.measureSpan?.() ?? Number.POSITIVE_INFINITY) < BIG_MIN_SPAN;
      if (busy) {
        // 只是暂时让一让，过会儿再来问，别白等满一整轮 6–9 分钟
        scheduleBig(BIG_RETRY_MS);
        return;
      }
      void playScript({ script: pickBig(), big: true });
      scheduleBig();
    }, delayMs);
  }

  onBeforeUnmount(() => {
    window.clearTimeout(playTimer);
    window.clearTimeout(bigTimer);
    window.clearTimeout(soloTimer);
    window.clearTimeout(resetTimer);
  });

  return {
    playingName,
    playSide,
    playingIds,
    isPlaying,
    lastPlayedAt: () => lastPlayedAt,
    canPlay,
    play: (options) => void playScript(options),
    playByName: (name) => {
      const script = PLAY_SCRIPTS.find((item) => item.name === name);
      if (!script || host.cards().length < PLAY_CARDS) return false;
      void playScript({ script });
      return true;
    },
    pickGreeting: () => GREET_SCRIPTS[Math.floor(Math.random() * GREET_SCRIPTS.length)],
    scheduleFirst: () => {
      // 刚露头就演一段，离上一段太近的话先把间隔补够
      const gapLeft = Math.max(0, RESUME_GAP_MS - (Date.now() - lastPlayedAt));
      schedule(
        gapLeft + FIRST_PLAY_MIN_MS + Math.random() * (FIRST_PLAY_MAX_MS - FIRST_PLAY_MIN_MS)
      );
      // 特别节目与独处小动作：只有进站第一次露头才点着这两条链。之后每次滚回来，
      // 只在它们「确实停过」时才补排 —— 无条件重排等于每滚一次就把倒计时清零一次，
      // 大编舞 6–9 分钟、独处 26–52 秒，来回滚两下就永远等不到了（resume() 里同理）
      if (!soloBigStarted) {
        soloBigStarted = true;
        // 首场特别节目按「首场」那对间隔提前来，等不到第一场的人也能看见一次大编舞
        scheduleBig(BIG_FIRST_MIN_MS + Math.random() * (BIG_FIRST_MAX_MS - BIG_FIRST_MIN_MS));
        scheduleSolo();
        return;
      }
      if (bigStopped) {
        bigStopped = false;
        scheduleBig();
      }
      if (soloStopped) {
        soloStopped = false;
        scheduleSolo();
      }
    },
    resume: () => {
      holding = false;
      if (host.visible()) schedule(nextPlayDelay());
      // 独处小动作与特别节目在后台是自己停掉的（早退不重排）：回来得补一次，
      // 不然回前台的人从此再也等不到它们。只在「确实停过」时补 —— resume() 平时
      // 还被说话链、拖拽、卡片数变化调，无条件重排会把正在跑的排期一次次往后推
      if (soloStopped) {
        soloStopped = false;
        scheduleSolo();
      }
      if (bigStopped) {
        bigStopped = false;
        scheduleBig();
      }
    },
    abortPlaying: () => {
      // 演到一半被打断：当场收工，不留半截。is-resting 只是把演出动画暂停住，
      // 收工却靠墙上时钟的 resetTimer，两边错位 —— 回来时动作还停在半路、data-play 早被摘了，
      // 看着就是「啪」地弹回原位。切到后台时（document.hidden）由 HomeLive 调它，
      // 回来再走 resume() 重新排一段
      window.clearTimeout(resetTimer);
      clearPlayback();
    },
    hold: () => {
      holding = true;
      window.clearTimeout(playTimer);
      window.clearTimeout(resetTimer);
      clearPlayback();
    },
    peek,
  };
}
