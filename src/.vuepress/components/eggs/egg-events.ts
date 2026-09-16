import { showTip } from "../shared/copy-utils";
import { markEgg } from "./egg-utils";
import { EGG_THRESHOLDS, matchFestival } from "../neko-shared-eggs";

const LOGO_SELECTOR = ".vp-nav-logo";
const SLEEP_LOGO_SRC = "/assets/image/nekosleep.webp";
const CLEAR_BUTTON_SELECTOR = '.neko-head-btn[title="清空聊天记录"]';
const NEKO_BUBBLE_SELECTOR = ".neko-msg.neko";
const FOOTER_SELECTOR = ".neko-qq-footer > div";
const FOOTER_TOUR_KEY = "neko-footer-tour";
/* 首页的猫卡片被拎起来时挂上这个类，摇一摇要躲开它 */
const CARD_DRAG_SELECTOR = ".home-live-slot.is-dragging";

const ACCELERATION_THRESHOLD = 34;
const SHAKE_COOLDOWN = 3000;
const MOUSE_SWING_STEP = 15;
const MOUSE_SWINGS_GOAL = 7;
const MOUSE_SWING_WINDOW = 500;

const LOGO_TAP_GOAL = 6;
const LOGO_TAP_MAX = 22;
const LOGO_TAP_RESET = 1500;
/* 6 次之后每 4 次给一句反馈，跟功能站保持一致，免得戳的人以为没反应 */
const LOGO_TAP_HINTS: Record<number, string> = {
  10: "还在戳还在戳…尾巴开始不耐烦了喵！",
  14: "戳戳戳！neko 头都要被戳扁啦！",
  18: "再戳尾巴要炸毛了喵！！",
};

/* 底部工具栏共 6 个按钮，第 0 个是语音输入，提示里写明「除了麦克风」，它不该算数 */
const FOOTER_TOUR_GOAL = 5;

const IDLE_MS = EGG_THRESHOLDS.idleSleepMs;
const LONG_PRESS_MS = 3000;
const CLEAR_ARM_MS = 4000;
const NEKO_COPY_GOAL = 3;
const EXPLORE_GOAL = EGG_THRESHOLDS.exploreGoal;
const VISIT_GOAL = EGG_THRESHOLDS.visitGoal;
const TITLE_MEOW_GOAL = 2;
const TITLE_MEOW_LEVEL_MAX = 3;
const TITLE_MEOW_RESET = 3000;

const VISIT_KEY = "neko-visits";
const PRESENCE_CHANNEL = "neko-presence";

type Cleanup = () => void;
type WebkitFullscreenDocument = Document & { webkitFullscreenElement?: Element | null };
/* 标准库类型里没有 iOS 私有的 requestPermission，只能自己补一个 */
type MotionPermissionEvent = typeof DeviceMotionEvent & { requestPermission?: () => Promise<PermissionState> };

const DAY_MS = 86_400_000;

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function onEvent<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  listener: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions,
): Cleanup {
  target.addEventListener(type, listener, options);
  return () => target.removeEventListener(type, listener, options);
}

function onDocumentEvent<K extends keyof DocumentEventMap>(
  type: K,
  listener: (event: DocumentEventMap[K]) => void,
  options?: AddEventListenerOptions,
): Cleanup {
  document.addEventListener(type, listener, options);
  return () => document.removeEventListener(type, listener, options);
}

/* iOS 13+ 默认屏蔽运动传感器，必须先申请，而申请只能在用户手势里发起 */
function listenMotionPermission(): Cleanup {
  const motionEvent = window.DeviceMotionEvent as MotionPermissionEvent | undefined;
  if (typeof motionEvent?.requestPermission !== "function") return () => undefined;
  let asked = false;
  const ask = (): void => {
    if (asked) return;
    asked = true;
    void motionEvent.requestPermission().catch(() => {
      /* 用户拒绝就拉倒喵 */
    });
  };
  const cleanups = [
    onDocumentEvent("pointerdown", ask, { passive: true }),
    onDocumentEvent("touchstart", ask, { passive: true }),
  ];
  return () => cleanups.forEach((cleanup) => cleanup());
}

/* 摇一摇：手机读重力加速度，电脑端靠鼠标快速左右折返 */
function listenShake(): Cleanup {
  let lastShake = 0;
  const canShake = (): boolean => {
    const now = Date.now();
    if (now - lastShake < SHAKE_COOLDOWN) return false;
    lastShake = now;
    return true;
  };
  const cleanups: Cleanup[] = [
    listenMotionPermission(),
    onEvent(
      window,
      "devicemotion",
      (event) => {
        const acceleration = event.accelerationIncludingGravity;
        if (!acceleration || acceleration.x === null || acceleration.y === null || acceleration.z === null) {
          return;
        }
        const magnitude =
          Math.abs(acceleration.x) + Math.abs(acceleration.y) + Math.abs(acceleration.z);
        if (magnitude < ACCELERATION_THRESHOLD || !canShake()) return;
        markEgg("shake");
      },
      { passive: true },
    ),
  ];

  let lastX: number | null = null;
  let direction = 0;
  let swings = 0;
  let lastTurnAt = 0;
  cleanups.push(
    onDocumentEvent(
      "pointermove",
      (event) => {
        if (event.pointerType === "touch") return;
        // 拎着首页的猫卡片摇晃是另一颗蛋（摇猫猫）的事，别让这里的折返计数跟着涨
        if (document.querySelector(CARD_DRAG_SELECTOR)) {
          lastX = null;
          direction = 0;
          swings = 0;
          return;
        }
        if (lastX === null) {
          lastX = event.clientX;
          return;
        }
        const delta = event.clientX - lastX;
        lastX = event.clientX;
        if (Math.abs(delta) < MOUSE_SWING_STEP) return;
        const nextDirection = delta > 0 ? 1 : -1;
        if (nextDirection === direction) return;
        direction = nextDirection;
        const now = Date.now();
        swings = now - lastTurnAt < MOUSE_SWING_WINDOW ? swings + 1 : 1;
        lastTurnAt = now;
        if (swings < MOUSE_SWINGS_GOAL || !canShake()) return;
        swings = 0;
        markEgg("shake");
      },
      { passive: true },
    ),
  );

  return () => cleanups.forEach((cleanup) => cleanup());
}

/* 标题栏喵叫：切走再回来，标题栏按切走次数递进叫唤 */
function listenTitleMeow(): Cleanup {
  const baseTitle = document.title;
  let hiddenTimes = 0;
  let resetTimer = 0;
  const cleanup = onDocumentEvent("visibilitychange", () => {
    if (document.hidden) {
      hiddenTimes++;
      return;
    }
    if (hiddenTimes >= TITLE_MEOW_GOAL) markEgg("titleMeow");
    const level = Math.min(hiddenTimes, TITLE_MEOW_LEVEL_MAX);
    if (level <= 0) return;
    document.title = `${"喵".repeat(level)} ${baseTitle}`;
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      document.title = baseTitle;
    }, TITLE_MEOW_RESET);
  });
  return () => {
    window.clearTimeout(resetTimer);
    document.title = baseTitle;
    cleanup();
  };
}

/* 猫界捉奸：两个标签页同时开着会互相发现 */
function listenMultiTab(): Cleanup {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  const presence = new BroadcastChannel(PRESENCE_CHANNEL);
  presence.onmessage = (event: MessageEvent<unknown>) => {
    markEgg("multiTab");
    if (event.data === "hi") presence.postMessage("hi-back");
  };
  presence.postMessage("hi");
  return () => presence.close();
}

function listenSystemEggs(): Cleanup {
  const cleanups: Cleanup[] = [
    onEvent(window, "beforeprint", () => markEgg("printNeko")),
    onEvent(window, "offline", () => markEgg("offline")),
    onDocumentEvent("fullscreenchange", () => {
      if (document.fullscreenElement || (document as WebkitFullscreenDocument).webkitFullscreenElement) {
        markEgg("cinema");
      }
    }),
    // F11 走的是浏览器 UI 全屏，不派发 fullscreenchange，得单独听按键
    onDocumentEvent("keydown", (event) => {
      if (event.key === "F11") markEgg("cinema");
    }),
  ];
  return () => cleanups.forEach((cleanup) => cleanup());
}

/* 连点 logo：短时间连点 6 次点亮，继续戳到 22 次再给一颗 */
function listenLogoTap(): Cleanup {
  let taps = 0;
  let resetTimer = 0;
  const cleanup = onDocumentEvent("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(LOGO_SELECTOR)) return;
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      taps = 0;
    }, LOGO_TAP_RESET);
    taps++;
    if (taps === LOGO_TAP_GOAL) markEgg("logoTap");
    else if (taps >= LOGO_TAP_MAX) {
      taps = 0;
      markEgg("logo22");
    } else {
      const hint = LOGO_TAP_HINTS[taps];
      if (hint) showTip(hint);
    }
  });
  return () => {
    window.clearTimeout(resetTimer);
    cleanup();
  };
}

/* 打瞌睡：2 分钟没动静就换成睡觉的 logo，一动就醒 */
function listenIdleSleep(): Cleanup {
  const sleeping = new Map<HTMLImageElement, string>();
  const sleep = (): void => {
    document.querySelectorAll<HTMLImageElement>(LOGO_SELECTOR).forEach((logo) => {
      if (!sleeping.has(logo)) sleeping.set(logo, logo.src);
      logo.src = SLEEP_LOGO_SRC;
    });
    markEgg("idleSleep");
  };
  let idleTimer = window.setTimeout(sleep, IDLE_MS);
  const wake = (): void => {
    sleeping.forEach((src, logo) => {
      logo.src = src;
    });
    sleeping.clear();
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(sleep, IDLE_MS);
  };
  const events = ["pointermove", "pointerdown", "keydown", "wheel"] as const;
  const cleanups = events.map((name) => onDocumentEvent(name, wake, { passive: true }));
  return () => {
    window.clearTimeout(idleTimer);
    cleanups.forEach((cleanup) => cleanup());
  };
}

/* 长按感应：按住任意按钮 3 秒不松手 */
function listenLongPress(): Cleanup {
  let pressTimer = 0;
  const start = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('button, [role="button"]')) return;
    window.clearTimeout(pressTimer);
    pressTimer = window.setTimeout(() => markEgg("longPress"), LONG_PRESS_MS);
  };
  const stop = (): void => window.clearTimeout(pressTimer);
  const cleanups: Cleanup[] = [
    onDocumentEvent("pointerdown", start, { passive: true }),
    onDocumentEvent("pointerup", stop, { passive: true }),
    onDocumentEvent("pointercancel", stop, { passive: true }),
  ];
  return () => {
    window.clearTimeout(pressTimer);
    cleanups.forEach((cleanup) => cleanup());
  };
}

/* 清空撒娇：第一次点垃圾桶就算数 */
function listenClearTwice(): Cleanup {
  let armed = false;
  let timer = 0;
  const cleanup = onDocumentEvent("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(CLEAR_BUTTON_SELECTOR) || armed) return;
    armed = true;
    markEgg("clearTwice");
    timer = window.setTimeout(() => {
      armed = false;
    }, CLEAR_ARM_MS);
  });
  return () => {
    window.clearTimeout(timer);
    cleanup();
  };
}

/* 偷学台词：选中 neko 的消息复制，或点消息上的复制按钮，累计 3 次 */
function listenCopyNeko(): Cleanup {
  let times = 0;
  const bump = (): void => {
    if (++times >= NEKO_COPY_GOAL) markEgg("copyNeko");
  };
  const cleanups: Cleanup[] = [
    onDocumentEvent("copy", () => {
      const node = document.getSelection()?.anchorNode ?? null;
      const element = node instanceof Element ? node : node?.parentElement;
      if (element?.closest(NEKO_BUBBLE_SELECTOR)) bump();
    }),
    onDocumentEvent("click", (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(`${NEKO_BUBBLE_SELECTOR} button.cp-btn`)) bump();
    }),
  ];
  return () => cleanups.forEach((cleanup) => cleanup());
}

/* 全按钮巡礼：聊天窗口底部那排工具按钮（麦克风除外）挨个点一遍 */
function readTouredFooterIndexes(): Set<number> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(FOOTER_TOUR_KEY) ?? "[]");
    return new Set(Array.isArray(stored) ? stored.filter((n): n is number => typeof n === "number") : []);
  } catch {
    return new Set<number>();
  }
}

function listenFooterTour(): Cleanup {
  const tapped = readTouredFooterIndexes();
  return onDocumentEvent("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const item = target.closest(FOOTER_SELECTOR);
    const parent = item?.parentElement;
    if (!item || !parent) return;
    const index = Array.from(parent.children).indexOf(item);
    // 跳过麦克风，且进度跨会话保留，凑满 5 个才算数
    if (index <= 0 || tapped.has(index)) return;
    tapped.add(index);
    try {
      localStorage.setItem(FOOTER_TOUR_KEY, JSON.stringify([...tapped]));
    } catch {
      /* 隐私模式等存储异常静默跳过 */
    }
    if (tapped.size >= FOOTER_TOUR_GOAL) markEgg("footerTour");
    else showTip(`这个按钮戳到啦（${tapped.size}/${FOOTER_TOUR_GOAL} 喵）`);
  });
}

const exploredPaths = new Set<string>();

export function trackPageVisit(path: string): void {
  if (!path || exploredPaths.has(path)) return;
  exploredPaths.add(path);
  if (exploredPaths.size >= EXPLORE_GOAL) markEgg("explorer");
}

function trackVisitStreak(): void {
  try {
    const today = localDateKey(new Date());
    const stored = JSON.parse(localStorage.getItem(VISIT_KEY) ?? '{"last":"","streak":0}') as {
      last?: string;
      streak?: number;
    };
    if (stored.last === today) return;
    const yesterday = localDateKey(new Date(Date.now() - DAY_MS));
    const streak = stored.last === yesterday ? (stored.streak ?? 0) + 1 : 1;
    localStorage.setItem(VISIT_KEY, JSON.stringify({ last: today, streak }));
    if (streak >= VISIT_GOAL) markEgg("visit3");
  } catch {
    /* 隐私模式等存储异常静默跳过 */
  }
}

function checkClockEggs(): void {
  const now = new Date();
  const day = now.getDay();
  // thursday 是功能站独有的（得打开疯狂星期四），文档站不跟着蹭
  if (day === 1) markEgg("monday");
  const minutes = now.getMinutes();
  if (minutes <= 1 || (now.getHours() === 11 && minutes >= 44 && minutes <= 46)) markEgg("onTime");
  if (matchFestival(now)) markEgg("festival");
}

export function initEggEvents(): Cleanup {
  if (typeof window === "undefined") return () => undefined;
  const cleanups: Cleanup[] = [
    listenShake(),
    listenTitleMeow(),
    listenMultiTab(),
    listenSystemEggs(),
    listenLogoTap(),
    listenIdleSleep(),
    listenLongPress(),
    listenClearTwice(),
    listenCopyNeko(),
    listenFooterTour(),
  ];
  trackVisitStreak();
  checkClockEggs();
  const clockTimer = window.setInterval(checkClockEggs, 60_000);
  return () => {
    window.clearInterval(clockTimer);
    cleanups.forEach((cleanup) => cleanup());
  };
}
