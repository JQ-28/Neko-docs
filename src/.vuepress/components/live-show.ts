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
  /** 播放时长，与 keyframes 对齐，到点收工 */
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
  { name: "hop", durationMs: 1300, withPeek: false },
  { name: "chase", durationMs: 1800, withPeek: false },
  { name: "peek", durationMs: 1400, withPeek: true },
  { name: "pounce", durationMs: 2400, withPeek: false },
  { name: "knock", durationMs: 2600, withPeek: false },
  { name: "tag", durationMs: 3200, withPeek: false },
  { name: "roll", durationMs: 2800, withPeek: true },
  { name: "swap", durationMs: 3200, withPeek: true },
  { name: "mirrorStep", durationMs: 3000, withPeek: false },
  { name: "lean", durationMs: 1800, withPeek: false, byLineOnly: true },
  { name: "pass", durationMs: 1600, withPeek: false, byLineOnly: true },
  { name: "mimic", durationMs: 1800, withPeek: false, byLineOnly: true },
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

/** 特别节目之间至少隔这么久，不然就成蹦迪了 */
const BIG_MIN_GAP_MS = 8 * 60_000;
const BIG_MAX_GAP_MS = 12 * 60_000;
/** 大编舞要跨过对方，窄屏上会撞到屏幕边被裁掉，所以只在够宽的窗口上演 */
const BIG_MIN_VIEWPORT = 880;

/** 新卡落地先演一段短的见面小戏，从几段轻巧的里挑 */
const GREET_SCRIPTS: readonly PlayScript[] = PLAY_SCRIPTS.filter(
  (script) => script.name === "meet" || script.name === "bump" || script.name === "peek"
);

/** 卡片露头后先让入场动画落定，再开演 */
const FIRST_PLAY_MIN_MS = 600;
const FIRST_PLAY_MAX_MS = 1200;
/** 演完一段隔一阵再演下一段，间隔不固定才不像机器 */
const REPLAY_MIN_MS = 18_000;
const REPLAY_MAX_MS = 36_000;
/** 滚走了又滚回来，离上一段太近就先补够这点时间，免得来回刷屏 */
const RESUME_GAP_MS = 6_000;
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
}

export interface LiveShow {
  /** 这一场演的是哪段（空串表示没在演），动画类是模板说了算，免得被 Vue 刷新冲掉 */
  readonly playingName: Ref<string>;
  /** 演对手戏的两张卡是谁：恰好两张时才排得出左右，猫卡在前站左边。
      动画里两张卡分工不同（谁撞过来、谁被打飞）都得认准这两张 */
  readonly playSide: ComputedRef<{ left: string; right: string }>;
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
  /** 手上要干别的了：已排的、正在演的都停下 */
  hold(): void;
  /** 让某张卡里的头像扭一下，动画由各卡片自己的样式提供 */
  peek(root: HTMLElement | null, selector: string): void;
}

export function useLiveShow(host: ShowHost): LiveShow {
  const playingName = ref("");
  let playTimer = 0;
  let bigTimer = 0;
  let resetTimer = 0;
  /** 组件让过台面（比如正在说话）的时候，特别节目先别插进来 */
  let holding = false;
  let lastScript = -1;
  let lastPlayedAt = 0;
  /** 这一场演过哪些剧本，用来凑「猫猫剧场」 */
  const seenShows = new Set<string>();

  /** 上场演出的两个槽位，左右分工与模板上的 class 用同一份安排 */
  const playSide = computed(() => {
    const [left = "", right = ""] = host
      .cards()
      .slice(0, PLAY_CARDS)
      .map((card) => card.id);
    return { left, right };
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
  }

  function pickScript(): PlayScript {
    let index = Math.floor(Math.random() * DANCE_SCRIPTS.length);
    // 连着两次演同一段太假，往后挪一段
    if (index === lastScript) index = (index + 1) % DANCE_SCRIPTS.length;
    lastScript = index;
    return DANCE_SCRIPTS[index];
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

  /** 纯函数：同一个槽在任何窗口都算出同一段；与上一槽错开，免得连着演同一段 */
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
      // 有邻居就跟着时间槽演，两边动作才齐
      if (host.hasPeers()) {
        void playScript({ script: scriptForSlot(nextDanceSlot().slot), dance: true });
      } else {
        void playScript();
      }
      schedule(nextPlayDelay());
    }, delayMs);
  }

  /** 下一个时间槽该演哪段特别节目（没有邻居就随机挑一段） */
  function pickBig(): PlayScript {
    if (!host.hasPeers()) return BIG_SCRIPTS[Math.floor(Math.random() * BIG_SCRIPTS.length)];
    const slot = nextDanceSlot().slot;
    return BIG_SCRIPTS[((slot * 40503) >>> 0) % BIG_SCRIPTS.length];
  }

  /** 特别节目：隔一阵来一次，来之前先确认台面空着（正在说话就跳过这一轮） */
  function scheduleBig(): void {
    window.clearTimeout(bigTimer);
    bigTimer = window.setTimeout(() => {
      scheduleBig();
      if (holding) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (window.innerWidth < BIG_MIN_VIEWPORT) return;
      if (!canPlay() || isPlaying()) return;
      if (!(host.bigReady?.() ?? true)) return;
      void playScript({ script: pickBig(), big: true });
    }, BIG_MIN_GAP_MS + Math.random() * (BIG_MAX_GAP_MS - BIG_MIN_GAP_MS));
  }

  onBeforeUnmount(() => {
    window.clearTimeout(playTimer);
    window.clearTimeout(bigTimer);
    window.clearTimeout(resetTimer);
  });

  return {
    playingName,
    playSide,
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
      // 特别节目是给「待了一阵子的人」看的，所以从进站就开始计时
      scheduleBig();
    },
    resume: () => {
      holding = false;
      if (host.visible()) schedule(nextPlayDelay());
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
