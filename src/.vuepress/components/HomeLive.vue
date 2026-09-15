<template>
  <section class="home-live">
    <h2 class="home-intro-title">
      <span class="home-intro-bar" aria-hidden="true"></span>
      此刻的小站
      <span class="home-intro-sub">{{ stageNote }}</span>
    </h2>

    <div class="home-live-cards">
      <div
        ref="nekoSlot"
        class="home-live-slot home-live-slot--left"
        :class="{ 'is-away': awayIndex === 0 }"
        @pointerdown="onPointerDown($event, 0)"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div class="home-live-card">
          <span class="home-live-glass" aria-hidden="true"></span>
          <img
            ref="nekoAvatar"
            class="home-live-avatar"
            :src="nekoAvatarSrc"
            alt=""
            width="34"
            height="34"
            aria-hidden="true"
            draggable="false"
            @error="onAvatarError"
          />
          <span class="home-live-text">
            <span class="home-live-name">Neko 本猫</span>
            <span class="home-live-meta">群里随叫随到</span>
          </span>
          <span class="home-live-light" aria-hidden="true">
            <span class="home-live-light-ring"></span>
            <span class="home-live-light-core"></span>
          </span>
        </div>
        <span v-if="draggedIndex === 0" class="home-live-bubble">{{ speech }}</span>
      </div>

      <div
        ref="onlineSlot"
        class="home-live-slot home-live-slot--right"
        :class="{ 'is-away': awayIndex === 1 }"
        @pointerdown="onPointerDown($event, 1)"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <OnlineCounter />
        <span v-if="draggedIndex === 1" class="home-live-bubble">{{ speech }}</span>
      </div>

      <span
        v-if="visitorSide"
        class="home-live-visitor"
        :class="`is-${visitorSide}`"
        aria-hidden="true"
      >
        <img :src="nekoAvatarSrc" alt="" width="28" height="28" @error="onAvatarError" />
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import OnlineCounter from "./OnlineCounter.vue";
import { markEgg } from "./egg-utils";
import { EGG_THRESHOLDS } from "./neko-shared-eggs";
import {
  startPeerLink,
  type HandoffPayload,
  type LiveCardId,
  type LiveEdge,
} from "./live-peer";

/** 隔多久自己动一下，与在线卡错开，看起来像两只猫互相打量 */
const NUDGE_MIN_MS = 14_000;
const NUDGE_MAX_MS = 30_000;

/** Neko 主账号的头像，走 QQ 头像服务，换头像这里会跟着变 */
const QQ_AVATAR = "https://q1.qlogo.cn/g?b=qq&nk=3582537505&s=160";
const FALLBACK_AVATAR = "/assets/image/neko.webp";

const nekoAvatar = ref<HTMLImageElement | null>(null);
const nekoAvatarSrc = ref(QQ_AVATAR);
const nekoSlot = ref<HTMLElement | null>(null);
const onlineSlot = ref<HTMLElement | null>(null);
/** 哪只猫正被拎着（0 左边、1 右边、-1 没人被拎） */
const draggedIndex = ref(-1);
const speech = ref("");

/** 跨窗口联动：同一个浏览器里还开着别的 neko 页面时才有邻居 */
const peerLink = startPeerLink();
/** 哪只猫被丢到隔壁窗口去了（-1 表示两只都在家） */
const awayIndex = ref(-1);
/** 隔壁的小脑袋从哪边探出来（空串表示没在探） */
const visitorSide = ref<"" | LiveEdge>("");

/** 谁把猫领走的、从哪条边出去的，它一关窗口就得把猫从原路放回来 */
let awayTo = "";
let awayEdge: LiveEdge = "right";
let awayTimer = 0;
let visitorTimer = 0;
let visitorHideTimer = 0;

// QQ 头像服务偶尔抽风或被网络挡住，退回本地那张，别让卡片开天窗
function onAvatarError(): void {
  if (nekoAvatarSrc.value !== FALLBACK_AVATAR) {
    nekoAvatarSrc.value = FALLBACK_AVATAR;
  }
}

let idleTimer = 0;
let playTimer = 0;
let resetTimer = 0;
let waitTries = 0;
let lastScript = -1;
let lastPlayedAt = 0;
let stageVisible = false;
/** 这一场演过哪些剧本，用来凑「猫猫剧场」 */
const seenShows = new Set<string>();

/** 让某张卡里的头像扭一下，动画由各卡片自己的样式提供 */
function peekAvatar(root: HTMLElement | null, selector: string): void {
  const avatar = root?.querySelector<HTMLElement>(selector);
  if (!avatar) return;
  // 先摘掉再强制重排，保证连续两次也能各自播出动画
  avatar.classList.remove("is-moving");
  void avatar.offsetWidth;
  avatar.classList.add("is-moving");
}

function nudgeAvatar(): void {
  peekAvatar(nekoSlot.value, ".home-live-avatar");
}

function scheduleNudge(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.clearTimeout(idleTimer);
  const delay = NUDGE_MIN_MS + Math.random() * (NUDGE_MAX_MS - NUDGE_MIN_MS);
  idleTimer = window.setTimeout(() => {
    nudgeAvatar();
    scheduleNudge();
  }, delay);
}

/** 互动脚本：两张卡片配合演一段，每次进站随机挑一段 */
interface PlayScript {
  /** 与样式里 data-play 的取值对应 */
  name: string;
  /** 播放时长，与 keyframes 对齐，到点收工 */
  durationMs: number;
  /** 顺带让两只猫各歪一次头，像在互相打量 */
  withPeek: boolean;
}

const PLAY_SCRIPTS: readonly PlayScript[] = [
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
];

const PLAY_CLASS = "is-playing";
const PLAY_ATTR = "play";

/** 卡片露头后先让入场动画落定，再开演 */
const FIRST_PLAY_MIN_MS = 600;
const FIRST_PLAY_MAX_MS = 1200;
/** 演完一段隔一阵再演下一段，间隔不固定才不像机器 */
const REPLAY_MIN_MS = 18_000;
const REPLAY_MAX_MS = 36_000;
/** 滚走了又滚回来，离上一段太近就先补够这点时间，免得来回刷屏 */
const RESUME_GAP_MS = 6_000;
/** 在线卡要等接口回来才渲染，它没出来就先等着 */
const WAIT_ONLINE_MS = 400;
const WAIT_ONLINE_TRIES = 20;

/** 两张卡都在场才开演 */
function isStageReady(): boolean {
  return Boolean(onlineSlot.value?.querySelector(".home-online"));
}

function clearPlayback(): void {
  for (const slot of [nekoSlot.value, onlineSlot.value]) {
    slot?.classList.remove(PLAY_CLASS);
    slot?.removeAttribute(`data-${PLAY_ATTR}`);
  }
}

function pickScript(): PlayScript {
  let index = Math.floor(Math.random() * PLAY_SCRIPTS.length);
  // 连着两次演同一段太假，往后挪一段
  if (index === lastScript) index = (index + 1) % PLAY_SCRIPTS.length;
  lastScript = index;
  return PLAY_SCRIPTS[index];
}

function playScript(preset?: PlayScript): void {
  const neko = nekoSlot.value;
  const online = onlineSlot.value;
  if (!neko || !online) return;

  const script = preset ?? pickScript();
  // 跟着隔壁一起演的那段算「猫界齐舞」
  if (preset) markEgg("twinDance");
  // 一场里看完 5 段不一样的就算「猫猫剧场」
  seenShows.add(script.name);
  if (seenShows.size >= EGG_THRESHOLDS.cardShows) markEgg("peekShows");
  // 摘掉上一段的 class 再强制重排，连播两段时才不会并成一次
  clearPlayback();
  void neko.offsetWidth;
  for (const slot of [neko, online]) {
    slot.dataset[PLAY_ATTR] = script.name;
    slot.classList.add(PLAY_CLASS);
  }
  if (script.withPeek) {
    peekAvatar(neko, ".home-live-avatar");
    peekAvatar(online, ".home-online-avatar");
  }

  window.clearTimeout(resetTimer);
  resetTimer = window.setTimeout(clearPlayback, script.durationMs);
  lastPlayedAt = Date.now();
}

/** 隔壁也开着页面时改用统一的时间槽排期：两边不通信也能算出同一段、同一时刻 */
const DANCE_PERIOD_MS = 24_000;
const DANCE_OFFSET_MS = 6000;

/** 下一个时间槽是第几号、什么时候开始（永远是严格的下一个，不会立刻重播） */
function nextDanceSlot(now = Date.now()): { slot: number; at: number } {
  const slot = Math.floor((now - DANCE_OFFSET_MS) / DANCE_PERIOD_MS) + 1;
  return { slot, at: slot * DANCE_PERIOD_MS + DANCE_OFFSET_MS };
}

/** 纯函数：同一个槽在任何窗口都算出同一段；与上一槽错开，免得连着演同一段 */
function scriptForSlot(slot: number): PlayScript {
  const total = PLAY_SCRIPTS.length;
  const pick = ((slot * 2654435761) >>> 0) % total;
  const previous = (((slot - 1) * 2654435761) >>> 0) % total;
  return PLAY_SCRIPTS[pick === previous ? (pick + 1) % total : pick];
}

/** 排下一段的间隔：隔壁开着就等下一个时间槽，自己待着就随便隔一阵 */
function nextPlayDelay(): number {
  if (!peerLink.hasPeers()) {
    return REPLAY_MIN_MS + Math.random() * (REPLAY_MAX_MS - REPLAY_MIN_MS);
  }
  return Math.max(800, nextDanceSlot().at - Date.now());
}

function schedulePlay(delayMs: number): void {
  window.clearTimeout(playTimer);
  playTimer = window.setTimeout(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // 滚出视野就先歇着，滚回来会重新排期，循环不会因此断掉
    if (!stageVisible) return;
    if (!isStageReady()) {
      // 在线卡还没渲染出来，隔一会儿再看一眼，实在等不到就等下次露头
      if (waitTries < WAIT_ONLINE_TRIES) {
        waitTries += 1;
        schedulePlay(WAIT_ONLINE_MS);
      }
      return;
    }
    waitTries = 0;
    // 有邻居就跟着时间槽演，两边动作才齐
    const dance = nextDanceSlot();
    playScript(peerLink.hasPeers() ? scriptForSlot(dance.slot) : undefined);
    schedulePlay(nextPlayDelay());
  }, delayMs);
}

let stageWatcher: IntersectionObserver | undefined;

/** 卡片多半在首屏下面，露头了才开演：在视野里隔一阵循环一段，滚走就停 */
function watchStage(): void {
  const stage = nekoSlot.value;
  if (!stage) return;

  stageWatcher = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible === stageVisible) return;
      stageVisible = visible;

      if (!visible) {
        window.clearTimeout(playTimer);
        return;
      }

      // 刚露头就演一段，离上一段太近的话先把间隔补够
      const gapLeft = Math.max(0, RESUME_GAP_MS - (Date.now() - lastPlayedAt));
      schedulePlay(
        gapLeft +
          FIRST_PLAY_MIN_MS +
          Math.random() * (FIRST_PLAY_MAX_MS - FIRST_PLAY_MIN_MS)
      );
    },
    { threshold: 0.4 }
  );
  stageWatcher.observe(stage);
}

/** 拎到窗口边上还能再往外推这么远，推过线就交给隔壁窗口 */
const HANDOFF_PUSH_PX = 120;
/** 推过这么多就当场交出去，不用等松手 */
const HANDOFF_GO_PX = 64;
/** 猫从窗口外滑进来的起步深度：没真越界的就按这个量从边上滑 */
const SLIDE_IN_OVER_PX = 48;
/** 猫丢出去了，隔这么久自己溜回来，免得对面不开着就一直少一只 */
const AWAY_RETURN_MS = 45_000;

/** 串门：隔壁有窗口时，隔一阵子从边上探个小脑袋出来看看 */
const VISITOR_MIN_MS = 20_000;
const VISITOR_MAX_MS = 44_000;
const VISITOR_SHOW_MS = 2600;

/** 0 是左边那只 Neko，1 是右边那只在线猫猫 */
function slotOf(index: number): HTMLElement | null {
  return index === 0 ? nekoSlot.value : onlineSlot.value;
}

function cardIdOf(index: number): LiveCardId {
  return index === 0 ? "neko" : "online";
}

/** 越出边界的距离：负数是从左边出去，正数是从右边出去，0 表示还在窗口里 */
function overshootOf(shift: number, base: number, size: number, viewport: number): number {
  const min = DRAG_MARGIN - base;
  const max = viewport - DRAG_MARGIN - base - size;
  if (shift < min) return shift - min;
  if (shift > max) return shift - max;
  return 0;
}

/** 贴着边松手就当扔出去，但得先真的拖动过，轻轻一碰就贴边不算数 */
const PRESS_MIN_TRAVEL_PX = 56;

/** 卡片是不是已经顶到窗口边上了：贴着边松手就当扔出去，不必真的推越界 */
function pressedEdge(state: DragState): LiveEdge | null {
  if (Math.abs(state.shiftX) < PRESS_MIN_TRAVEL_PX) return null;

  const min = DRAG_MARGIN - state.baseLeft;
  const max = Math.max(
    min,
    window.innerWidth - DRAG_MARGIN - state.baseLeft - state.width
  );
  if (state.shiftX <= min + 1) return "left";
  if (state.shiftX >= max - 1) return "right";
  return null;
}

/** 隔壁的猫从它那条边出去，就进我这条边（我这边是相反的一侧） */
function incomingEdge(edge: LiveEdge): LiveEdge {
  return edge === "right" ? "left" : "right";
}

/** 从某条边滑进来：先摆到窗口外，再把过渡交还给样式，让猫自己跑回原位 */
function slideInFrom(slot: HTMLElement, edge: LiveEdge, over: number): void {
  const rect = slot.getBoundingClientRect();
  const offscreen =
    edge === "right"
      ? window.innerWidth + over - rect.left
      : -(rect.left + rect.width + over);

  slot.style.transition = "none";
  slot.style.translate = `${offscreen}px 0`;
  void slot.offsetWidth;
  slot.style.transition = "";
  slot.style.translate = "";
}

/** 把拎着的猫交给隔壁：这边收起来，把落点告诉对面 */
function handOffCard(index: number, edge: LiveEdge, over: number): void {
  const target = peerLink.neighborTowards(edge);
  if (!target) return;

  peerLink.sendHandoff(target.id, {
    card: cardIdOf(index),
    edge,
    over: Math.round(over),
  });
  markEgg("crossHandoff");

  awayIndex.value = index;
  awayEdge = edge;
  awayTo = target.id;
  window.clearTimeout(awayTimer);
  awayTimer = window.setTimeout(() => bringCatHome(), AWAY_RETURN_MS);
}

/** 猫回来了：从当初出去的那条边溜回原位 */
function bringCatHome(): void {
  const index = awayIndex.value;
  if (index < 0) return;
  const slot = slotOf(index);
  awayIndex.value = -1;
  awayTo = "";
  window.clearTimeout(awayTimer);
  if (slot) slideInFrom(slot, awayEdge, SLIDE_IN_OVER_PX);
}

/** 隔壁把猫推过来了：对应那张卡从那条边滑进来，像刚被扔过来一样 */
function receiveCat(payload: HandoffPayload): void {
  const index = payload.card === "neko" ? 0 : 1;
  const slot = slotOf(index);
  // 手上正拎着就别接了，免得跟手上的动作打架
  if (drag || !slot) return;

  // 自己那只本来在隔壁，人家给推回来了
  if (awayIndex.value === index) {
    awayIndex.value = -1;
    awayTo = "";
    window.clearTimeout(awayTimer);
  }

  slideInFrom(slot, incomingEdge(payload.edge), payload.over);
  markEgg("crossHandoff");
  speech.value = "隔壁推我一把";
  draggedIndex.value = index;
  window.clearTimeout(speechTimer);
  speechTimer = window.setTimeout(() => {
    draggedIndex.value = -1;
    speech.value = "";
  }, SPEECH_LINGER_MS);
}

/** 串门：隔壁有窗口时，偶尔从边上探个小脑袋出来看一眼又缩回去 */
function scheduleVisitor(): void {
  window.clearTimeout(visitorTimer);
  if (!peerLink.hasPeers()) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  visitorTimer = window.setTimeout(() => {
    if (peerLink.hasPeers() && stageVisible && !drag && awayIndex.value < 0) {
      visitorSide.value = Math.random() < 0.5 ? "left" : "right";
      window.clearTimeout(visitorHideTimer);
      visitorHideTimer = window.setTimeout(() => {
        visitorSide.value = "";
      }, VISITOR_SHOW_MS);
    }
    scheduleVisitor();
  }, VISITOR_MIN_MS + Math.random() * (VISITOR_MAX_MS - VISITOR_MIN_MS));
}

/** 隔壁有窗口时一起演同一段，算「猫界齐舞」 */
const stageNote = computed(() => {
  if (awayIndex.value >= 0) return "有只猫去隔壁串门了";
  const others = peerLink.peerCount.value;
  if (others > 0) return `隔壁还有 ${others} 只猫在看着`;
  return "两只猫正蹲在这里";
});

/** 被拎起来的时候随口抱怨的话 */
const GRUMBLES = [
  "干嘛干嘛",
  "放我下来喵",
  "拎哪儿去嘛",
  "别拽我尾巴",
  "我正忙着呢",
  "喵？！",
  "再拽就挠你了",
  "轻点轻点呀",
  "猫猫不是快递",
];

/** 拎到屏幕边上就停下，别把页面顶出横向滚动条。卡片拖起来会带上倾斜和放大，
    包围盒比原尺寸宽一圈，所以留的余量要够 */
const DRAG_MARGIN = 16;
/** 松手以后话还挂一会儿再收，像还在嘀咕 */
const SPEECH_LINGER_MS = 1600;
/** 手移动多快就把猫甩多歪：单位是「每一像素/毫秒带多少度」，甩到头就封顶 */
const SWING_PER_SPEED = 6;
const SWING_MAX = 16;
/** 摇猫猫：折返一次至少要挪这么多像素，连续折返的时间窗口 */
const SHAKE_SWING_STEP = 20;
const SHAKE_SWING_WINDOW_MS = 900;
/** 叠猫猫：两张卡的中心离这么近就算叠上了 */
const STACK_GAP_PX = 60;

interface DragState {
  pointerId: number;
  slot: HTMLElement;
  card: HTMLElement;
  startX: number;
  startY: number;
  /** 上一次移动的位置和时间，用来算甩动的速度 */
  lastX: number;
  lastMoveAt: number;
  /** 拎起来之前的位置和大小，用来算最多能拎多远 */
  baseLeft: number;
  baseTop: number;
  width: number;
  height: number;
  /** 最近一次算出来的位移，松手时用它判断猫是不是顶在窗口边上 */
  shiftX: number;
  shiftY: number;
}

let drag: DragState | null = null;
let speechTimer = 0;

/** 拎着卡片时顺手统计的几个彩蛋：来回摇晃、叠在一起、走过的路 */
const dragTrack = {
  /** 上次用于判定折返的位置 */
  swingX: 0,
  swingDirection: 0,
  swings: 0,
  swingAt: 0,
  /** 上次的目标位移，用来累计遛猫的行程 */
  lastDx: 0,
  lastDy: 0,
};
/** 遛猫总里程，跨多次拖拽累计 */
let walkedPx = 0;

function isPlaying(): boolean {
  return Boolean(
    nekoSlot.value?.classList.contains(PLAY_CLASS) ||
      onlineSlot.value?.classList.contains(PLAY_CLASS)
  );
}

/** 把位移限制在屏幕内，猫拎到边上就停，页面也不会被顶宽。
    slack 是给跨窗口接力留的口子：边上还开着别的窗口时，允许再往外推一截 */
function limitShift(
  shift: number,
  base: number,
  size: number,
  viewport: number,
  slack = 0
): number {
  const min = DRAG_MARGIN - base - slack;
  const max = Math.max(min, viewport - DRAG_MARGIN - base - size + slack);
  return Math.min(Math.max(shift, min), max);
}

/** 每次拎起来重开一轮统计，遛猫的里程留在外面继续累计 */
function resetDragTrack(positionX: number): void {
  dragTrack.swingX = positionX;
  dragTrack.swingDirection = 0;
  dragTrack.swings = 0;
  dragTrack.swingAt = 0;
  dragTrack.lastDx = 0;
  dragTrack.lastDy = 0;
}

/** 摇猫猫：拎着左右疯狂折返，够 8 个来回就点亮 */
function trackCardShake(positionX: number, now: number): void {
  const delta = positionX - dragTrack.swingX;
  dragTrack.swingX = positionX;
  if (Math.abs(delta) < SHAKE_SWING_STEP) return;

  const direction = delta > 0 ? 1 : -1;
  if (direction === dragTrack.swingDirection) return;
  dragTrack.swingDirection = direction;
  dragTrack.swings =
    now - dragTrack.swingAt < SHAKE_SWING_WINDOW_MS ? dragTrack.swings + 1 : 1;
  dragTrack.swingAt = now;

  if (dragTrack.swings >= EGG_THRESHOLDS.cardShakeSwings) {
    dragTrack.swings = 0;
    markEgg("cardShake");
  }
}

/** 叠猫猫：拎着的那张落到另一张身上 */
function isStackedOnOther(slot: HTMLElement): boolean {
  const other = slot === nekoSlot.value ? onlineSlot.value : nekoSlot.value;
  if (!other) return false;

  const held = slot.getBoundingClientRect();
  const resting = other.getBoundingClientRect();
  return (
    Math.hypot(
      held.left + held.width / 2 - (resting.left + resting.width / 2),
      held.top + held.height / 2 - (resting.top + resting.height / 2)
    ) <= STACK_GAP_PX
  );
}

/** 遛猫：拖着走的总里程，跨多次拖拽累计 */
function trackCardWalk(dx: number, dy: number): void {
  walkedPx += Math.hypot(dx - dragTrack.lastDx, dy - dragTrack.lastDy);
  dragTrack.lastDx = dx;
  dragTrack.lastDy = dy;
  if (walkedPx >= EGG_THRESHOLDS.cardWalkPx) markEgg("cardWalk");
}

function onPointerDown(event: PointerEvent, index: number): void {
  // 只认左键，右键菜单之类的别抢
  if (event.pointerType === "mouse" && event.button !== 0) return;
  // 正在演互动动画、或者已经有一只在手上，就别再拎
  if (drag || isPlaying()) return;

  const card = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    ".home-live-card, .home-online"
  );
  const slot = event.currentTarget as HTMLElement;
  if (!card || !slot.contains(card)) return;

  // 拎猫前先把各家窗口的位置对一遍：刚被搬过的窗口，别拿几秒前的旧坐标去认邻居
  peerLink.refresh();

  const rect = slot.getBoundingClientRect();
  drag = {
    pointerId: event.pointerId,
    slot,
    card,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastMoveAt: event.timeStamp,
    baseLeft: rect.left,
    baseTop: rect.top,
    width: rect.width,
    height: rect.height,
    shiftX: 0,
    shiftY: 0,
  };
  // 手指点得太快时指针可能已经抬起了，抓不到就按没抓到继续走
  try {
    card.setPointerCapture(event.pointerId);
  } catch {
    // 交给冒泡上来的事件处理，不影响的
  }
  slot.classList.add("is-dragging");
  resetDragTrack(event.clientX);
  draggedIndex.value = index;
  speech.value = GRUMBLES[Math.floor(Math.random() * GRUMBLES.length)];
  window.clearTimeout(speechTimer);
  // 拎在手上这段时间先别演戏了，松手再接着排
  window.clearTimeout(playTimer);
}

/** 收拾拖拽现场：猫被扔到隔壁窗口时用，不留回弹 */
function releaseDrag(): void {
  if (!drag) return;
  const { card, pointerId, slot } = drag;
  if (card.hasPointerCapture(pointerId)) card.releasePointerCapture(pointerId);
  slot.classList.remove("is-dragging");
  slot.style.translate = "";
  slot.style.rotate = "";
  drag = null;
  draggedIndex.value = -1;
  speech.value = "";
  window.clearTimeout(speechTimer);
}

function onPointerMove(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return;

  // 左右哪边还开着另一个 neko 页面，就允许把猫往那边再推一截
  const hasSidePeer =
    peerLink.neighborTowards("left") !== null ||
    peerLink.neighborTowards("right") !== null;
  const dx = limitShift(
    event.clientX - drag.startX,
    drag.baseLeft,
    drag.width,
    window.innerWidth,
    hasSidePeer ? HANDOFF_PUSH_PX : 0
  );
  const dy = limitShift(
    event.clientY - drag.startY,
    drag.baseTop,
    drag.height,
    window.innerHeight
  );
  drag.shiftX = dx;
  drag.shiftY = dy;
  // 位置直接给到手上，拖尾和回弹交给样式里的过渡，掉帧也不会变形
  drag.slot.style.translate = `${dx}px ${dy}px`;

  // 推过头就当场把猫交给隔壁，不用等松手
  const over = overshootOf(dx, drag.baseLeft, drag.width, window.innerWidth);
  if (over !== 0 && Math.abs(over) >= HANDOFF_GO_PX) {
    const edge: LiveEdge = over > 0 ? "right" : "left";
    if (peerLink.neighborTowards(edge)) {
      const index = draggedIndex.value;
      releaseDrag();
      handOffCard(index, edge, Math.abs(over));
      return;
    }
  }

  // 顺手数一数彩蛋：摇猫猫、遛猫
  trackCardShake(event.clientX, Date.now());
  trackCardWalk(dx, dy);

  // 甩得越快歪得越厉害，手一停角度自己荡回来，看着就像被拎着的猫
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const elapsed = Math.max(event.timeStamp - drag.lastMoveAt, 1);
  const speed = (event.clientX - drag.lastX) / elapsed;
  drag.lastX = event.clientX;
  drag.lastMoveAt = event.timeStamp;

  const lean = Math.max(
    -SWING_MAX,
    Math.min(SWING_MAX, speed * SWING_PER_SPEED)
  );
  drag.slot.style.rotate = `${lean.toFixed(2)}deg`;
}

function onPointerUp(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return;

  const { slot, card } = drag;
  if (card.hasPointerCapture(event.pointerId)) {
    card.releasePointerCapture(event.pointerId);
  }
  // 顶到窗口边上松手就当把猫扔出去（推越界的在拖动途中就已经交出去了）
  const over = overshootOf(drag.shiftX, drag.baseLeft, drag.width, window.innerWidth);
  const edge = over !== 0 ? (over > 0 ? "right" : "left") : pressedEdge(drag);
  if (edge && peerLink.neighborTowards(edge)) {
    const index = draggedIndex.value;
    releaseDrag();
    handOffCard(index, edge, over !== 0 ? Math.abs(over) : SLIDE_IN_OVER_PX);
    return;
  }
  // 松手落在另一张卡身上就算叠猫猫（要赶在清掉位移之前量）
  if (isStackedOnOther(slot)) markEgg("cardStack");
  // 交还样式：过渡会把猫带着惯性送回原位，顺带晃两下
  slot.classList.remove("is-dragging");
  slot.style.translate = "";
  slot.style.rotate = "";
  drag = null;

  window.clearTimeout(speechTimer);
  speechTimer = window.setTimeout(() => {
    draggedIndex.value = -1;
    speech.value = "";
  }, SPEECH_LINGER_MS);

  // 闹完了，接着原来的节奏演
  if (stageVisible) {
    schedulePlay(nextPlayDelay());
  }
}

onMounted(() => {
  scheduleNudge();
  watchStage();

  peerLink.onHandoff(receiveCat);
  // 领走猫的那个窗口关掉了，就把猫放回来
  peerLink.onPeerGone((id) => {
    if (awayTo === id) bringCatHome();
  });
  // 隔壁来去都要重排：有邻居就切到齐舞节奏，自己待着就恢复随便演
  watch(peerLink.peerCount, () => {
    schedulePlay(nextPlayDelay());
    scheduleVisitor();
  });
  scheduleVisitor();
});

onBeforeUnmount(() => {
  stageWatcher?.disconnect();
  window.clearTimeout(idleTimer);
  window.clearTimeout(playTimer);
  window.clearTimeout(resetTimer);
  window.clearTimeout(speechTimer);
  window.clearTimeout(awayTimer);
  window.clearTimeout(visitorTimer);
  window.clearTimeout(visitorHideTimer);
  peerLink.stop();
});

</script>

<style scoped>
.home-live {
  margin: 0 0 30px;
}

.home-intro-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 1px;
  margin: 0 0 16px;
  line-height: 1.4;
}

.home-intro-bar {
  width: 4px;
  height: 18px;
  flex: none;
  border-radius: 2px;
  background: linear-gradient(135deg, #ff9ed5, #7fb0ff);
}

.home-intro-sub {
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: #7d6c8e;
}

html.dark .home-intro-sub {
  color: #a9a2b8;
}

/* 两张卡片居中并排，间距留够，像聊天窗里面对面坐着的两个人 */
.home-live-cards {
  --ease-play: cubic-bezier(0.34, 1.3, 0.64, 1);
  position: relative;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 22px;
}

/* 两张卡的槽位：互动动画和拖拽都落在这一层，卡片自身的入场、倾斜、浮动都不受影响。
   宽度也由槽位说了算，卡片只管填满它 */
.home-live-slot {
  --play-dir: 1;
  position: relative;
  display: flex;
  flex: 0 1 264px;
  max-width: 264px;
  /* 松手后带着惯性飞回原位，角度还会多晃两下 */
  transition: translate 0.55s cubic-bezier(0.34, 1.3, 0.64, 1),
    rotate 0.62s cubic-bezier(0.34, 1.45, 0.64, 1),
    scale 0.4s cubic-bezier(0.34, 1.3, 0.64, 1), opacity 0.3s ease-out;
}

/* 猫被丢到隔壁窗口去了：位子留着，猫不在 */
.home-live-slot.is-away {
  opacity: 0;
  pointer-events: none;
}

/* 拎在手上：跟手要快，但留一点点拖尾才像有重量；角度过渡带过冲，甩起来就晃 */
.home-live-slot.is-dragging {
  z-index: 3;
  scale: 1.05;
  transition: translate 0.14s ease-out,
    rotate 0.22s cubic-bezier(0.34, 1.5, 0.64, 1), scale 0.2s ease-out;
}

/* 右边的卡朝反方向动，两张卡才像面对面凑近 */
.home-live-slot--right {
  --play-dir: -1;
}

/* 两张卡都能拎：鼠标抓着走，手机横向拖；竖直方向留给页面滚动 */
.home-live-card,
.home-live-cards :deep(.home-online) {
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}

.home-live-slot.is-dragging .home-live-card,
.home-live-slot.is-dragging :deep(.home-online) {
  cursor: grabbing;
  /* 拎离地面的感觉：影子拉大拉远 */
  box-shadow: 0 20px 44px color-mix(in srgb, var(--vp-c-accent, #096dd9) 22%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

html.dark .home-live-slot.is-dragging .home-live-card,
html.dark .home-live-slot.is-dragging :deep(.home-online) {
  box-shadow: 0 20px 44px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

/* 被拎起来时冒出来的话，跟着卡片一起走 */
.home-live-bubble {
  position: absolute;
  bottom: calc(100% + 9px);
  left: 50%;
  translate: -50% 0;
  z-index: 4;
  padding: 5px 11px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  background: #ffffff;
  color: var(--vp-c-accent, #096dd9);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2px;
  white-space: nowrap;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--vp-c-accent, #096dd9) 16%, transparent);
  pointer-events: none;
  animation: home-live-bubble-in 0.32s cubic-bezier(0.34, 1.4, 0.64, 1) backwards;
}

/* 朝下的小尖角，颜色跟着气泡底走 */
.home-live-bubble::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  width: 8px;
  height: 8px;
  translate: -50% -4px;
  rotate: 45deg;
  border-radius: 1px;
  background: inherit;
}

html.dark .home-live-bubble {
  border-color: rgba(255, 255, 255, 0.1);
  background: #262a33;
}

/* 串门：隔壁窗口的猫探个小脑袋出来看一眼，晃两下又缩回去 */
.home-live-visitor {
  position: absolute;
  top: 50%;
  z-index: 2;
  width: 30px;
  height: 30px;
  margin-top: -15px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 6px 16px rgba(120, 90, 160, 0.28);
  overflow: hidden;
  pointer-events: none;
  animation: home-live-visit 2.6s cubic-bezier(0.34, 1.3, 0.64, 1) backwards;
}

.home-live-visitor.is-left {
  left: -6px;
  --visit-from: -40px;
}

.home-live-visitor.is-right {
  right: -6px;
  --visit-from: 40px;
}

.home-live-visitor img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

html.dark .home-live-visitor {
  border-color: #262a33;
  background: #262a33;
}

@keyframes home-live-visit {
  0% {
    translate: var(--visit-from) 0;
    opacity: 0;
  }

  16% {
    translate: 0 0;
    opacity: 1;
  }

  32% {
    translate: calc(var(--visit-from) * 0.22) 0;
  }

  48% {
    translate: 0 0;
  }

  64% {
    translate: calc(var(--visit-from) * 0.16) 0;
  }

  80% {
    translate: 0 0;
    opacity: 1;
  }

  100% {
    translate: var(--visit-from) 0;
    opacity: 0;
  }
}

@keyframes home-live-bubble-in {
  from {
    opacity: 0;
    scale: 0.86;
  }

  to {
    opacity: 1;
    scale: 1;
  }
}

/* 让在线卡与右边的 Neko 卡取同一个宽度，并排才整齐。
   Neko 卡在左，在线卡在右，内边距取 Neko 卡的镜像值 */
.home-live-cards :deep(.home-online) {
  box-sizing: border-box;
  flex: 1 1 auto;
  min-width: 0;
  padding: 10px 12px 10px 14px;
}

/* 视觉与在线卡保持一致：渐变描边玻璃层 + 圆头像 + 双层呼吸灯 */
.home-live-card {
  --live-state: #22c55e;
  --live-tilt: -0.6deg;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  padding: 10px 14px 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--vp-c-accent, #096dd9) 10%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  rotate: var(--live-tilt);
  scale: 1;
  transition: rotate 0.3s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
    scale 0.3s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
    box-shadow 0.45s ease, border-color 0.3s ease;
  /* 浮动相位与在线卡错开，一上一下才像在互相招呼 */
  animation: home-live-in 0.44s cubic-bezier(0.22, 1, 0.36, 1),
    neko-card-float 10s cubic-bezier(0.455, 0.03, 0.515, 0.955) -4.3s infinite;
}

.home-live-glass {
  position: absolute;
  inset: 0;
  z-index: 1;
  padding: 2px;
  border-radius: inherit;
  background: linear-gradient(120deg, #ffd6f5, #e2cdfb, #bfe4ff);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.5;
  pointer-events: none;
}

.home-live-card > :not(.home-live-glass) {
  position: relative;
  z-index: 2;
}

.home-live-avatar {
  flex: none;
  width: 34px;
  height: 34px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  object-fit: cover;
  background: #f0e6f6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform-origin: 42% 82%;
}

/* 朝右歪，像在打量旁边的在线猫猫 */
.home-live-avatar.is-moving {
  animation: home-live-peek 0.86s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.home-live-text {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.home-live-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--vp-c-accent, #096dd9);
}

.home-live-meta {
  font-size: 11px;
  letter-spacing: 0.2px;
  color: #a397b2;
}

.home-live-light {
  flex: none;
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
}

.home-live-light-core,
.home-live-light-ring {
  grid-area: 1 / 1;
  border-radius: 50%;
}

.home-live-light-core {
  width: 9px;
  height: 9px;
  background: var(--live-state);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--live-state) 18%, transparent);
  animation: home-live-breathe 2.4s ease-in-out infinite;
}

.home-live-light-ring {
  width: 9px;
  height: 9px;
  border: 1.5px solid var(--live-state);
  opacity: 0;
  animation: home-live-ripple 2.4s ease-out infinite;
}

html.dark .home-live-card {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(30, 34, 42, 0.86);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

html.dark .home-live-glass {
  opacity: 0.32;
}

html.dark .home-live-avatar {
  background: #262a33;
  border-color: rgba(255, 255, 255, 0.18);
}

@media (hover: hover) and (pointer: fine) {
  .home-live-card:hover {
    rotate: 0deg;
    scale: 1.03;
    border-color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 15px 40px color-mix(in srgb, var(--vp-c-accent, #096dd9) 18%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }
}

@keyframes home-live-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes home-live-peek {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }

  30% {
    transform: rotate(8deg) scale(1.07);
  }

  62% {
    transform: rotate(-5deg) scale(1.03);
  }
}

@keyframes home-live-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(0.82);
    opacity: 0.72;
  }
}

@keyframes home-live-ripple {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }

  70%,
  100% {
    transform: scale(2.1);
    opacity: 0;
  }
}

/* 互动动画：两张卡靠 --play-dir 各往中间或两侧使劲，凑成一段小戏。
   动作只碰 transform，卡片自己的倾斜和浮动照旧 */
.home-live-slot.is-playing[data-play="meet"] {
  animation: neko-play-meet 1.5s var(--ease-play);
}

.home-live-slot.is-playing[data-play="bump"] {
  animation: neko-play-bump 1.7s var(--ease-play);
}

.home-live-slot.is-playing[data-play="chase"] {
  animation: neko-play-chase 1.8s var(--ease-play);
}

.home-live-slot.is-playing[data-play="peek"] {
  animation: neko-play-peek 1.4s var(--ease-play);
}

.home-live-slot.is-playing[data-play="hop"] {
  animation: neko-play-hop 1.3s var(--ease-play);
}

/* 一起蹦的时候右边的猫慢半拍，两只才不会像一只 */
.home-live-slot--right.is-playing[data-play="hop"] {
  animation-delay: 0.1s;
}

/* 碰一下就跑：两张卡各有一套时间线，凑成一段有前因后果的小戏 */
.home-live-slot--left.is-playing[data-play="tag"] {
  animation: neko-play-tag-flee 3.2s cubic-bezier(0.45, 0, 0.55, 1);
}

.home-live-slot--right.is-playing[data-play="tag"] {
  animation: neko-play-tag-pursue 3.2s cubic-bezier(0.45, 0, 0.55, 1);
}

/* 扑上去：左边那只跳起来扑，右边那只被扑得往后缩 */
.home-live-slot--left.is-playing[data-play="pounce"] {
  animation: neko-play-pounce-strike 2.4s var(--ease-play);
}

.home-live-slot--right.is-playing[data-play="pounce"] {
  animation: neko-play-pounce-dodge 2.4s var(--ease-play);
}

/* 撞飞：右边那只一头撞过去，左边那只横着滑出去再自己滚回来 */
.home-live-slot--right.is-playing[data-play="knock"] {
  animation: neko-play-knock-charge 2.6s var(--ease-play);
}

.home-live-slot--left.is-playing[data-play="knock"] {
  animation: neko-play-knock-fly 2.6s var(--ease-play);
}

/* 原地打滚：各翻一圈，右边那只慢半拍 */
.home-live-slot.is-playing[data-play="roll"] {
  animation: neko-play-roll 2.4s var(--ease-play);
}

.home-live-slot--right.is-playing[data-play="roll"] {
  animation-delay: 0.35s;
}

/* 换位置：一只从上面跳过去、一只贴着下面挪过去，站一会儿再一起换回来 */
.home-live-slot--left.is-playing[data-play="swap"] {
  animation: neko-play-swap-right 3.2s cubic-bezier(0.45, 0, 0.55, 1);
}

.home-live-slot--right.is-playing[data-play="swap"] {
  animation: neko-play-swap-left 3.2s cubic-bezier(0.45, 0, 0.55, 1);
}

/* 凑近打招呼：先一起往中间靠，碰一下再退回一点点 */
@keyframes neko-play-meet {
  0%,
  100% {
    transform: translateX(0) scale(1);
  }

  38% {
    transform: translateX(calc(16px * var(--play-dir))) scale(1.03);
  }

  64% {
    transform: translateX(calc(7px * var(--play-dir))) scale(1.012);
  }
}

/* 碰头：贴到最近，各自朝对方歪一下，像用脑袋顶了顶 */
@keyframes neko-play-bump {
  0%,
  100% {
    transform: translateX(0) rotate(0deg);
  }

  26% {
    transform: translateX(calc(14px * var(--play-dir)))
      rotate(calc(4.5deg * var(--play-dir)));
  }

  52% {
    transform: translateX(calc(5px * var(--play-dir)))
      rotate(calc(-2deg * var(--play-dir)));
  }

  76% {
    transform: translateX(calc(9px * var(--play-dir)))
      rotate(calc(2.2deg * var(--play-dir)));
  }
}

/* 错身追逐：一只往上、一只往下，绕过去再绕回来 */
@keyframes neko-play-chase {
  0%,
  100% {
    transform: translate(0, 0);
  }

  30% {
    transform: translate(calc(9px * var(--play-dir)), calc(-9px * var(--play-dir)));
  }

  62% {
    transform: translate(calc(3px * var(--play-dir)), calc(8px * var(--play-dir)));
  }
}

/* 互相打量：先各自往外让一步，再凑回来看看 */
@keyframes neko-play-peek {
  0%,
  100% {
    transform: translateX(0);
  }

  28% {
    transform: translateX(calc(-11px * var(--play-dir)));
  }

  60% {
    transform: translateX(calc(8px * var(--play-dir)));
  }
}

/* 一起蹦：蹲一下、跳起来、落地压一压 */
@keyframes neko-play-hop {
  0%,
  100% {
    transform: translateY(0) scale(1, 1);
  }

  18% {
    transform: translateY(3px) scale(1.03, 0.95);
  }

  46% {
    transform: translateY(-12px) scale(0.98, 1.04);
  }

  74% {
    transform: translateY(0) scale(1.025, 0.96);
  }

  88% {
    transform: translateY(0) scale(1, 1);
  }
}

/* 左边那只：撞一下右边的猫，掉头往左跑出画面，等对方追累了再溜回来。
   往左溢出不会把页面撑宽，所以这里敢跑得这么远 */
@keyframes neko-play-tag-flee {
  0% {
    transform: translateX(0);
    opacity: 1;
  }

  /* 冲上去撞一下，挤得最近 */
  6% {
    transform: translateX(52px);
  }

  11% {
    transform: translateX(58px);
  }

  /* 撞完弹开 */
  17% {
    transform: translateX(26px);
  }

  22% {
    transform: translateX(2px);
  }

  /* 掉头往左，跑出画面 */
  45% {
    transform: translateX(-150%);
    opacity: 1;
  }

  56%,
  76% {
    transform: translateX(-230%);
    opacity: 0;
  }

  /* 又悄悄跑回来 */
  80% {
    transform: translateX(-200%);
    opacity: 1;
  }

  92% {
    transform: translateX(-20px);
  }

  96% {
    transform: translateX(9px);
  }

  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 右边那只：先被撞得歪一下，愣一愣才追出去，追到半路对方没了，只好自己回来 */
@keyframes neko-play-tag-pursue {
  0%,
  9% {
    transform: translateX(0) rotate(0deg);
  }

  14% {
    transform: translateX(12px) rotate(3deg);
  }

  20% {
    transform: translateX(3px) rotate(-1.4deg);
  }

  /* 愣一下才反应过来 */
  30% {
    transform: translateX(0) rotate(0deg);
  }

  36% {
    transform: translateX(-8px);
  }

  /* 追出去，追到那边张望一下 */
  58% {
    transform: translateX(-120%);
  }

  70% {
    transform: translateX(-130%);
  }

  /* 追不上，自己转身回来 */
  84% {
    transform: translateX(-24px);
  }

  94% {
    transform: translateX(6px);
  }

  100% {
    transform: translateX(0) rotate(0deg);
  }
}

/* 左边那只：蹲一下高高跃起，扑到对方身上再弹回来 */
@keyframes neko-play-pounce-strike {
  0%,
  100% {
    transform: translate(0, 0);
  }

  /* 蹲 */
  10% {
    transform: translate(0, 5px);
  }

  /* 跃起 */
  26% {
    transform: translate(28px, -30px);
  }

  /* 扑到 */
  40% {
    transform: translate(46px, -2px);
  }

  /* 弹回来再蹭两下 */
  54% {
    transform: translate(24px, 0);
  }

  68% {
    transform: translate(34px, 0);
  }

  82% {
    transform: translate(6px, 0);
  }
}

/* 右边那只：被扑得往后缩，再左右晃两下站稳 */
@keyframes neko-play-pounce-dodge {
  0%,
  30% {
    transform: translate(0, 0) rotate(0deg);
  }

  44% {
    transform: translate(16px, 3px) rotate(4deg);
  }

  58% {
    transform: translate(4px, 0) rotate(-2deg);
  }

  72% {
    transform: translate(9px, 0) rotate(1.6deg);
  }

  86% {
    transform: translate(2px, 0) rotate(-0.6deg);
  }

  100% {
    transform: translate(0, 0) rotate(0deg);
  }
}

/* 右边那只：一头撞过去，撞完弹开还不忘再顶两下 */
@keyframes neko-play-knock-charge {
  0%,
  100% {
    transform: translate(0, 0);
  }

  14% {
    transform: translate(-54px, 0);
  }

  20% {
    transform: translate(-58px, 0);
  }

  32% {
    transform: translate(-18px, 0);
  }

  46% {
    transform: translate(-30px, 0);
  }

  62% {
    transform: translate(-6px, 0);
  }

  78% {
    transform: translate(-13px, 0);
  }
}

/* 左边那只：被撞得横着滑出去，滚一圈再爬起来 */
@keyframes neko-play-knock-fly {
  0%,
  16% {
    transform: translate(0, 0) rotate(0deg);
  }

  28% {
    transform: translate(-92px, 0) rotate(-13deg);
  }

  42% {
    transform: translate(-124px, 0) rotate(-18deg);
  }

  58% {
    transform: translate(-72px, 0) rotate(7deg);
  }

  76% {
    transform: translate(-18px, 0) rotate(-3deg);
  }

  88% {
    transform: translate(-4px, 0) rotate(1deg);
  }

  100% {
    transform: translate(0, 0) rotate(0deg);
  }
}

/* 原地打滚：抬高一点翻一整圈，砸回原位 */
@keyframes neko-play-roll {
  0%,
  6% {
    transform: translateY(0) rotate(0deg);
  }

  22% {
    transform: translateY(-14px) rotate(0deg);
  }

  56% {
    transform: translateY(-14px) rotate(360deg);
  }

  72% {
    transform: translateY(0) rotate(360deg);
  }

  100% {
    transform: translateY(0) rotate(360deg);
  }
}

/* 左边那只：抬得高高的从对面上方跳过右半边去 */
@keyframes neko-play-swap-right {
  0%,
  100% {
    transform: translate(0, 0);
  }

  14% {
    transform: translate(0, -70px);
  }

  /* 跳过去，在自己新位置上站一会儿 */
  44%,
  62% {
    transform: translate(110%, -70px);
  }

  84% {
    transform: translate(0, -70px);
  }

  /* 落地压一下 */
  94% {
    transform: translate(0, 2px);
  }
}

/* 右边那只：贴着下面挪到左半边去，同样站一会儿再回来 */
@keyframes neko-play-swap-left {
  0%,
  100% {
    transform: translate(0, 0);
  }

  14% {
    transform: translate(0, 30px);
  }

  44%,
  62% {
    transform: translate(-110%, 30px);
  }

  84% {
    transform: translate(0, 30px);
  }

  94% {
    transform: translate(0, -2px);
  }
}

/* 窄屏改两张平分，各让一半宽度就不会换行成一上一下。
   必须放在各卡片宽度定义之后，同特异性下才覆盖得掉 */
@media (max-width: 560px) {
  .home-live-cards {
    gap: 10px;
  }

  /* 半宽继续由槽位平分，卡片填满就行 */
  .home-live-slot {
    flex: 1 1 0;
    min-width: 0;
    max-width: none;
  }

  .home-live-cards :deep(.home-online),
  .home-live-card {
    padding: 10px;
  }

  /* 半宽放不下整句，让文案换行而不是被省略号截掉 */
  .home-live-cards :deep(.home-online-meta) {
    white-space: normal;
    line-height: 1.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* 互动动画的选择器特异性较高，这里要写成同级别才盖得住 */
  .home-live-slot.is-playing[data-play],
  .home-live-bubble,
  .home-live-card,
  .home-live-avatar.is-moving,
  .home-live-light-core,
  .home-live-light-ring {
    animation: none;
  }

  .home-live-card {
    rotate: 0deg;
    transition: none;
  }

  /* 拖拽是手带出来的动作，跟手照旧，只是松手不再弹 */
  .home-live-slot {
    transition: none;
  }
}
</style>
