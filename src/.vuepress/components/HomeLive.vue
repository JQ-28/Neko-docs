<template>
  <section ref="stage" class="home-live">
    <h2 class="home-intro-title">
      <span class="home-intro-bar" aria-hidden="true"></span>
      此刻的小站
      <span class="home-intro-sub">{{ stageNote }}</span>
    </h2>

    <!-- 卡片住在哪扇窗口就由哪扇窗口渲染：本窗口生的 + 隔壁搬过来的，拖走一张这里就少一张。
         有哪些卡要等挂载后才知道（每扇窗口各生各的），首帧先空着，水合才对得上 -->
    <div v-if="mounted" class="home-live-cards">
      <div
        v-for="(card, index) in liveCards"
        :key="card.id"
        :ref="(el) => setSlot(card.id, el)"
        class="home-live-slot"
        :class="{
          'home-live-slot--left': playSide.left === card.id,
          'home-live-slot--right': playSide.right === card.id,
          'is-away': roamingIds.includes(card.id),
          'is-dragging': draggingId === card.id,
          'is-playing': playingName !== '',
        }"
        :data-play="playingName || undefined"
        @pointerdown="onPointerDown($event, card)"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div v-if="card.kind === 'neko'" class="home-live-card">
          <span class="home-live-glass" aria-hidden="true"></span>
          <img
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
        <OnlineCounter v-else />
        <span v-if="speakingId === card.id" class="home-live-bubble">{{ speech }}</span>
      </div>

      <span
        v-if="visitorSide"
        class="home-live-visitor"
        :class="`is-${visitorSide}`"
        aria-hidden="true"
      >
        <img :src="nekoAvatarSrc" alt="" width="28" height="28" @error="onAvatarError" />
      </span>

      <!-- 隔壁有人正拎着卡片拖过我这块屏幕：按屏幕坐标画一张一样的，接力得像同一张卡在走。
           自己就是 fixed 定位，摆在这一层也不会被别的卡片挤到 -->
      <span
        v-if="roamer"
        class="home-live-roamer"
        :style="{ transform: `translate3d(${roamer.x}px, ${roamer.y}px, 0)` }"
        aria-hidden="true"
      >
        <img
          :src="roamer.card.kind === 'neko' ? nekoAvatarSrc : ONLINE_AVATAR"
          alt=""
          width="34"
          height="34"
          @error="onAvatarError"
        />
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import OnlineCounter from "./OnlineCounter.vue";
import { markEgg } from "./egg-utils";
import { EGG_THRESHOLDS } from "./neko-shared-eggs";
import {
  startPeerLink,
  type CardSpec,
  type HandoffPayload,
  type LiveEdge,
  type RoamPoint,
} from "./live-peer";

/** 隔多久自己动一下，与在线卡错开，看起来像两只猫互相打量 */
const NUDGE_MIN_MS = 14_000;
const NUDGE_MAX_MS = 30_000;

/** Neko 主账号的头像，走 QQ 头像服务，换头像这里会跟着变 */
const QQ_AVATAR = "https://q1.qlogo.cn/g?b=qq&nk=3582537505&s=160";
const FALLBACK_AVATAR = "/assets/image/neko.webp";
/** 过路猫画在线猫猫那张卡时用的头像，与 OnlineCounter 保持一致 */
const ONLINE_AVATAR = "/assets/image/neko11.jpg";

const stage = ref<HTMLElement | null>(null);
const nekoAvatarSrc = ref(QQ_AVATAR);
const speech = ref("");
/** 卡片是客户端才知道的事（每扇窗口各生各的），挂载前先不渲染，免得跟预渲染的水合对不上 */
const mounted = ref(false);

/** 跨窗口联动：同一个浏览器里还开着别的 neko 页面时才有邻居 */
const peerLink = startPeerLink();
/** 本窗口的显示顺序（拖卡片互相换位改的就是它），各扇窗口各排各的 */
const cardOrder = ref<string[]>([]);

/** 手上这几张卡按本窗口的顺序排：新来的排在末尾，走了的从顺序里清掉 */
function syncCardOrder(): void {
  const ids = peerLink.cards.value.map((card) => card.id);
  cardOrder.value = [
    ...cardOrder.value.filter((id) => ids.includes(id)),
    ...ids.filter((id) => !cardOrder.value.includes(id)),
  ];
}

watch(peerLink.cards, syncCardOrder, { immediate: true });

/** 眼下住在这扇窗口里的卡片（拖走一张就少一张，隔壁搬来一张就多一张） */
const liveCards = computed(() => {
  /** 顺序里查不到的排到末尾去，别让 indexOf 的 -1 把它顶到最前面 */
  const rank = (cardId: string): number => {
    const index = cardOrder.value.indexOf(cardId);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  return [...peerLink.cards.value].sort((a, b) => rank(a.id) - rank(b.id));
});

/** 换位：把这张卡挪到那张卡跟前。原本在它前面的话正好落在它后面，两张就是一对一对调 */
function applyReorder(cardId: string, targetId: string): void {
  const current = cardOrder.value;
  const at = current.indexOf(targetId);
  const order = current.filter((id) => id !== cardId);
  order.splice(Math.min(at < 0 ? order.length : at, order.length), 0, cardId);
  cardOrder.value = order;
}

/** 手里按着的那张卡（空串表示没在拖） */
const draggingId = ref("");
/** 正飘在隔壁屏幕上的那张卡：这边先把它藏起来，别两边同时出现 */
const roamingIds = ref<string[]>([]);
/** 哪张卡正在冒话（空串表示没在冒） */
const speakingId = ref("");
/** 这一场演的是哪段（空串表示没在演），动画类是模板说了算，免得被 Vue 刷新冲掉 */
const playingName = ref("");
/** 每张卡的槽位元素，按卡 id 存，找元素/播动画都靠它 */
const slotEls = new Map<string, HTMLElement>();
/** 隔壁的小脑袋从哪边探出来（空串表示没在探） */
const visitorSide = ref<"" | LiveEdge>("");

/** 隔壁喊话说卡要来了，标题那行先替他通个风 */
const peerHint = ref("");
let peerHintTimer = 0;

/** 隔壁的卡片正路过我这块屏幕：按屏幕坐标画一张一样的 */
const roamer = ref<{ card: CardSpec; x: number; y: number } | null>(null);
let roamerTimer = 0;
let roamSentAt = 0;
let roamSentX = 0;
let roamSentY = 0;

let visitorTimer = 0;
let visitorHideTimer = 0;
/** 上次跟隔壁打招呼的时间，用来限流 */
let warnedAt = 0;

// QQ 头像服务偶尔抽风或被网络挡住，退回本地那张，别让卡片开天窗
function onAvatarError(): void {
  if (nekoAvatarSrc.value !== FALLBACK_AVATAR) {
    nekoAvatarSrc.value = FALLBACK_AVATAR;
  }
}

let idleTimer = 0;
let playTimer = 0;
let resetTimer = 0;

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

/** 卡片走的时候模板会拿 null 回调一次，顺手把槽位从表里摘掉 */
function setSlot(cardId: string, el: unknown): void {
  if (el instanceof HTMLElement) slotEls.set(cardId, el);
  else slotEls.delete(cardId);
}

/** 上场演出的两个槽位，左右分工与模板上的 class 用同一份安排 */
function activeSlots(): HTMLElement[] {
  return [playSide.value.left, playSide.value.right]
    .map((cardId) => slotEls.get(cardId))
    .filter((el): el is HTMLElement => Boolean(el));
}

function nudgeAvatar(): void {
  const card = liveCards.value.find((item) => item.kind === "neko");
  if (card) peekAvatar(slotEls.get(card.id) ?? null, ".home-live-avatar");
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
/** 两张卡才演得成对手戏 */
const PLAY_CARDS = 2;

/** 恰好两张才演得成对手戏：多凑了几张就停播，只留它们自己聊天 */
function isStageReady(): boolean {
  return liveCards.value.length === PLAY_CARDS;
}

/** 演对手戏的两张卡是谁：恰好两张时才排得出左右，猫卡在前站左边。
    动画里两张卡分工不同（谁撞过来、谁被打飞）都得认准这两张 */
const playSide = computed(() => {
  const [left = "", right = ""] = liveCards.value
    .slice(0, PLAY_CARDS)
    .map((card) => card.id);
  return { left, right };
});

function clearPlayback(): void {
  playingName.value = "";
}

function pickScript(): PlayScript {
  let index = Math.floor(Math.random() * PLAY_SCRIPTS.length);
  // 连着两次演同一段太假，往后挪一段
  if (index === lastScript) index = (index + 1) % PLAY_SCRIPTS.length;
  lastScript = index;
  return PLAY_SCRIPTS[index];
}

/** 演哪一段、算不算跟隔壁的齐舞，都由调用方说了算 */
interface PlayOptions {
  /** 指定演哪一段，不给就随机挑一段 */
  script?: PlayScript;
  /** 与隔壁同一时间槽演的那段，算「猫界齐舞」 */
  dance?: boolean;
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
  if (script.withPeek) {
    slots.forEach((slot) => peekAvatar(slot, ".home-live-avatar, .home-online-avatar"));
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
    // 滚出视野、或者手里凑不齐两张卡，就先歇着；卡片回来后由 watch 重新排期
    if (!stageVisible || !isStageReady()) return;
    // 有邻居就跟着时间槽演，两边动作才齐
    if (peerLink.hasPeers()) {
      void playScript({ script: scriptForSlot(nextDanceSlot().slot), dance: true });
    } else {
      void playScript();
    }
    schedulePlay(nextPlayDelay());
  }, delayMs);
}

let stageWatcher: IntersectionObserver | undefined;

/** 卡片多半在首屏下面，露头了才开演：在视野里隔一阵循环一段，滚走就停 */
function watchStage(): void {
  const target = stage.value;
  if (!target) return;

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
  stageWatcher.observe(target);
}

/** 拎到窗口边上还能再往外推这么远，推过线就交给隔壁窗口 */
const HANDOFF_PUSH_PX = 120;
/** 推过这么多就当场交出去，不用等松手 */
const HANDOFF_GO_PX = 64;
/** 卡片从窗口外滑进来的起步深度：没真越界的就按这个量从边上滑 */
const SLIDE_IN_OVER_PX = 48;
/** 卡片顶在窗口边上等着出手时，隔这么久跟对面打一次招呼（别刷屏） */
const WARN_INTERVAL_MS = 2000;
/** 拖动中报位置：最快这个间隔发一次，位移不够也先攒着 */
const ROAM_MIN_MS = 45;
const ROAM_MIN_PX = 6;
/** 过路卡的“还在路上”有效期：这么久没收到新位置就收掉 */
const ROAM_STALE_MS = 320;

/** 串门：隔壁有窗口时，隔一阵子从边上探个小脑袋出来看看 */
const VISITOR_MIN_MS = 20_000;
const VISITOR_MAX_MS = 44_000;
const VISITOR_SHOW_MS = 2600;

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
  const minX = DRAG_MARGIN - state.baseLeft;
  const maxX = Math.max(
    minX,
    window.innerWidth - DRAG_MARGIN - state.baseLeft - state.width
  );
  const minY = DRAG_MARGIN - state.baseTop;
  const maxY = Math.max(
    minY,
    window.innerHeight - DRAG_MARGIN - state.baseTop - state.height
  );

  // 得先真的拖动过，轻轻一碰就贴边不算数
  if (state.shiftX <= minX + 1 && Math.abs(state.shiftX) >= PRESS_MIN_TRAVEL_PX) {
    return "left";
  }
  if (state.shiftX >= maxX - 1 && state.shiftX >= PRESS_MIN_TRAVEL_PX) {
    return "right";
  }
  if (state.shiftY <= minY + 1 && Math.abs(state.shiftY) >= PRESS_MIN_TRAVEL_PX) {
    return "top";
  }
  if (state.shiftY >= maxY - 1 && state.shiftY >= PRESS_MIN_TRAVEL_PX) {
    return "bottom";
  }
  return null;
}

/** 对面那条边：从左边进来的卡片，是从右边的窗口出去的 */
const OPPOSITE_EDGE: Record<LiveEdge, LiveEdge> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

/** 拿一个屏幕坐标去问：这地方贴着我哪条边（用来决定卡片从哪边滑进来） */
function edgeFromPoint(x: number, y: number): LiveEdge {
  const localX = x - window.screenX;
  const localY = y - window.screenY;
  const dx = localX - window.innerWidth / 2;
  const dy = localY - window.innerHeight / 2;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "top" : "bottom";
}

/** 被拎着的卡片现在在大桌面的哪个位置（卡片中心点的屏幕绝对坐标） */
function cardPointAbs(shiftX: number, shiftY: number): RoamPoint {
  return {
    card: { id: drag!.cardId, kind: drag!.kind },
    x: Math.round(window.screenX + drag!.baseLeft + shiftX + drag!.width / 2),
    y: Math.round(window.screenY + drag!.baseTop + shiftY + drag!.height / 2),
  };
}

/** 从某条边滑进来：先摆到窗口外，再把过渡交还给样式，让卡片自己跑回原位 */
function slideInFrom(slot: HTMLElement, edge: LiveEdge, over: number): void {
  const rect = slot.getBoundingClientRect();
  const offscreenX =
    edge === "right"
      ? window.innerWidth + over - rect.left
      : edge === "left"
        ? -(rect.left + rect.width + over)
        : 0;
  const offscreenY =
    edge === "bottom"
      ? window.innerHeight + over - rect.top
      : edge === "top"
        ? -(rect.top + rect.height + over)
        : 0;

  slot.style.transition = "none";
  slot.style.translate = `${offscreenX}px ${offscreenY}px`;
  void slot.offsetWidth;
  slot.style.transition = "";
  slot.style.translate = "";
}

/** 把手里这张卡交给隔壁窗口：那边收着，这边从列表里摘掉 */
function handOffCard(card: CardSpec, edge: LiveEdge, over: number): void {
  const target = peerLink.neighborTowards(edge);
  if (!target) return;

  peerLink.sendHandoff(target.id, { card, edge, over: Math.round(over) });
  markEgg("crossHandoff");
}

/** 话长就多挂一会儿，短句也别一闪而过 */
function speechLingerMs(line: string): number {
  return Math.max(SPEECH_LINGER_MS, line.length * SPEECH_CHAR_MS);
}

/** 让某张卡冒一句话，过一会儿自己收（同一时刻只有一张卡在说话） */
function showSpeech(cardId: string, line: string): void {
  speakingId.value = cardId;
  speech.value = line;
  window.clearTimeout(speechTimer);
  speechTimer = window.setTimeout(() => {
    speakingId.value = "";
    speech.value = "";
  }, speechLingerMs(line));
}

/** 刚有卡片搬来：滑进来、打个招呼，住这儿的猫还应一声；恰好两张再演一段见面小戏 */
async function welcomeCard(cardId: string, edge: LiveEdge, over: number): Promise<void> {
  await nextTick();
  const slot = slotEls.get(cardId);
  const card = liveCards.value.find((item) => item.id === cardId);
  if (!slot || !card) return;

  slideInFrom(slot, edge, over);
  markEgg("crossHandoff");
  // 平时循环的那段往后挪，先让这场见面的小戏演完
  window.clearTimeout(playTimer);
  showSpeech(card.id, pickLine(card, "arrive"));

  window.clearTimeout(greetTimer);
  greetTimer = window.setTimeout(() => {
    if (drag || isPlaying()) return;
    // 主人家搭一句，凑成「落地先聊两句」
    const mate = liveCards.value.find((item) => item.id !== card.id);
    if (!mate) return;
    showSpeech(mate.id, pickLine(mate, "idle"));
    // 恰好两张才演得成对手戏，多凑了几张就只聊天
    if (isStageReady() && stageVisible) {
      void playScript({ script: pickGreetScript() });
    }
    schedulePlay(nextPlayDelay());
  }, CHAT_REPLY_MS);

  scheduleChat(CHAT_REPLY_MS + nextChatDelay());
}

/** 见面小戏演哪一段：几段轻巧的里随便挑一段 */
function pickGreetScript(): PlayScript {
  return GREET_SCRIPTS[Math.floor(Math.random() * GREET_SCRIPTS.length)];
}

/** 本窗口这张卡正被拖到别人的地盘上：先把它收起来，别两边同时出现 */
function setRoaming(active: boolean, cardId: string): void {
  const on = roamingIds.value.includes(cardId);
  if (active === on) return;
  roamingIds.value = active
    ? [...roamingIds.value, cardId]
    : roamingIds.value.filter((id) => id !== cardId);
}

/** 拖动中把卡片的位置报给隔壁窗口（节流：隔得够快或者挪得够远才发） */
function reportRoam(point: RoamPoint): void {
  if (!peerLink.liveRoam) return;
  const now = Date.now();
  const moved = Math.hypot(point.x - roamSentX, point.y - roamSentY) >= ROAM_MIN_PX;
  if (!moved || now - roamSentAt < ROAM_MIN_MS) return;

  roamSentAt = now;
  roamSentX = point.x;
  roamSentY = point.y;
  peerLink.sendRoam(point);
}

/** 隔壁的卡片路过我这块屏幕：落到我的地盘上就画出来，出了地盘就收掉 */
function showRoamer(point: RoamPoint): void {
  const x = point.x - window.screenX;
  const y = point.y - window.screenY;
  const inside =
    x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight;
  roamer.value = inside ? { card: point.card, x, y } : null;

  // 拖动中断了、对面崩了，位置就不再更新，靠这个兜底把过路猫收掉
  window.clearTimeout(roamerTimer);
  roamerTimer = window.setTimeout(() => {
    roamer.value = null;
  }, ROAM_STALE_MS);
}

/** 隔壁松手了，卡片落在我这块屏幕里：从落点那一侧滑进来 */
function handleArrival(point: RoamPoint): void {
  // 手上正拎着就别接了，免得跟手上的动作打架
  if (drag) return;
  roamer.value = null;
  window.clearTimeout(roamerTimer);
  void welcomeCard(point.card.id, edgeFromPoint(point.x, point.y), SLIDE_IN_OVER_PX);
}

/** 隔壁走贴边那条路把卡片递过来了：从中转那条边滑进来 */
function receiveCard(payload: HandoffPayload): void {
  if (drag) return;
  void welcomeCard(payload.card.id, OPPOSITE_EDGE[payload.edge], payload.over);
}

/** 住在我这儿的卡片被搬走 / 主人没了：手上正拎着它的就撒手，别再动它 */
function handleCardLeave(cardId: string): void {
  if (drag?.cardId === cardId) releaseDrag();
  if (roamingIds.value.includes(cardId)) setRoaming(false, cardId);
  if (speakingId.value === cardId) {
    window.clearTimeout(speechTimer);
    speakingId.value = "";
    speech.value = "";
  }
  lastLine.delete(cardId);
  if (lastSpeaker === cardId) lastSpeaker = "";
}

/** 串门：隔壁有窗口时，偶尔从边上探个小脑袋出来看一眼又缩回去 */
function scheduleVisitor(): void {
  window.clearTimeout(visitorTimer);
  if (!peerLink.hasPeers()) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  visitorTimer = window.setTimeout(() => {
    if (peerLink.hasPeers() && stageVisible && !drag && roamingIds.value.length === 0) {
      visitorSide.value = Math.random() < 0.5 ? "left" : "right";
      window.clearTimeout(visitorHideTimer);
      visitorHideTimer = window.setTimeout(() => {
        visitorSide.value = "";
      }, VISITOR_SHOW_MS);
    }
    scheduleVisitor();
  }, VISITOR_MIN_MS + Math.random() * (VISITOR_MAX_MS - VISITOR_MIN_MS));
}

/** 隔壁有窗口时一起演同一段，算「猫界齐舞」；标题那行还负责说清邻居在哪边 */
const stageNote = computed(() => {
  if (peerHint.value) return peerHint.value;

  const count = liveCards.value.length;
  if (count === 0) return "两张卡都去隔壁串门了";
  if (roamingIds.value.length > 0) return "有张卡正被拎去隔壁";

  const { left, right, above, below } = peerLink.peerSides.value;
  const around: string[] = [];
  if (left > 0) around.push(`左边 ${left} 只`);
  if (right > 0) around.push(`右边 ${right} 只`);
  if (above > 0) around.push(`上边 ${above} 只`);
  if (below > 0) around.push(`下边 ${below} 只`);
  // 窗口摆成一排、叠着、散在四角，都能说清猫都在哪几个方向
  if (around.length > 0) return `${around.join("、")}猫都在看着`;
  if (count === 1) return "有只猫去隔壁串门了";
  return count === 2 ? "两只猫正蹲在这里" : `${count} 只猫正蹲在这里`;
});

/** 台词按角色分池：猫说猫的话，在线猫猫说的是统计那摊子事 */
interface SpeechLines {
  /** 闲着自己念叨，也是被搭话时的回应 */
  readonly idle: readonly string[];
  /** 刚搬到别人家落地说的第一句 */
  readonly arrive: readonly string[];
  /** 被拎起来的时候随口抱怨的 */
  readonly drag: readonly string[];
}

const SPEECH_LINES: Record<CardSpec["kind"], SpeechLines> = {
  neko: {
    idle: [
      "喵~ 今天也在这儿蹲着",
      "有人在吗喵？",
      "突然很想吃焦糖布丁喵",
      "抹茶冰淇淋…下次一定要吃到喵",
      "呼…偷偷打个盹喵",
      "刚打呼噜了吗？没有的事喵",
      "写代码写累了就来找我玩喵",
      "节奏游戏我可不会输喵~",
      "尾巴自己会动，不关我的事喵",
      "需要我做什么，说一声就行喵",
      "我一直在的喵",
      "盯着屏幕太久要歇歇眼睛喵",
      "这一页好安静呀喵…",
      "有猫靠近？我闻到了喵",
      "摸摸头也是可以的喵~",
      "今天也要开开心心的喵",
      "群里有人喊我，我马上就到喵",
      "这颗星星闪得好好看喵",
      "喵…这里风好舒服",
      "偷偷许个愿：布丁自由喵",
    ],
    arrive: [
      "喵？这里是哪儿…",
      "又换了个窝喵~",
      "隔壁的猫，你也在呀喵",
      "打扰啦，我借住一下喵",
      "这里的光线不错喵",
      "行李就一条尾巴，很好搬喵",
    ],
    drag: [
      "干嘛干嘛喵",
      "放我下来喵~",
      "拎哪儿去嘛",
      "别拽我尾巴！",
      "我正忙着呢喵",
      "喵？！",
      "再拽就挠你了喵",
      "轻点轻点呀",
      "猫猫不是快递喵",
      "耳朵要被拎掉啦喵",
      "我晕了喵…",
      "这不是我的窝喵",
    ],
  },
  online: {
    idle: [
      "刚刚又溜进来一只猫",
      "数着呢，一只都没跑",
      "深夜档还有猫在逛",
      "这波人流挺稳的",
      "我就负责盯着这个数字",
      "谁来谁走，我都记着",
      "屏幕前有几只猫，我最清楚",
      "刷新一下，说不定又多一只",
      "大家都在安静地逛",
      "别走呀，好不容易凑齐的",
      "喵口普查进行中",
      "这数字刚刚跳了一下",
      "有人来了，我先眨个眼",
      "今天来的人比昨天多呢",
      "统计猫也是猫呀",
    ],
    arrive: [
      "换块屏幕接着数",
      "这边的猫，我都看见了",
      "搬家不耽误统计",
      "新地方，人头数从头算",
      "又挪了一次窝",
    ],
    drag: [
      "哎哎，数字要乱了",
      "我还在统计呢",
      "别拎我，人头数会掉的",
      "轻点，我这是计数的",
      "拎我干嘛，我又不好吃",
      "统计猫也要被拎吗",
      "松手，让我继续数",
      "这不算一只新猫啊",
    ],
  },
};

/** 每张卡上一句说了什么，下一句尽量不重样 */
const lastLine = new Map<string, string>();

function pickLine(card: CardSpec, type: keyof SpeechLines): string {
  const pool = SPEECH_LINES[card.kind][type];
  let index = Math.floor(Math.random() * pool.length);
  if (pool[index] === lastLine.get(card.id)) index = (index + 1) % pool.length;
  const line = pool[index];
  lastLine.set(card.id, line);
  return line;
}

/** 说话的节奏：有猫落地就先聊两句，之后隔一阵子再说一句 */
const CHAT_REPLY_MS = 1800;
const CHAT_MIN_MS = 20_000;
const CHAT_MAX_MS = 45_000;

let chatTimer = 0;
let greetTimer = 0;
/** 上一句是谁说的，下一句换张卡张嘴 */
let lastSpeaker = "";

/** 下一句隔多久（20–45 秒之间随便挑，不固定才不像机器） */
function nextChatDelay(): number {
  return CHAT_MIN_MS + Math.random() * (CHAT_MAX_MS - CHAT_MIN_MS);
}

/** 几张卡轮流搭话；只有一张就一直是它自己念叨 */
function nextSpeaker(): CardSpec | null {
  const cards = liveCards.value;
  if (cards.length === 0) return null;
  const index = cards.findIndex((card) => card.id === lastSpeaker);
  const speaker = cards[(index + 1) % cards.length];
  lastSpeaker = speaker.id;
  return speaker;
}

/** 隔一阵子让某张卡说一句；手上有活、或者这屏没人看就跳过这一轮 */
function scheduleChat(delayMs: number): void {
  window.clearTimeout(chatTimer);
  chatTimer = window.setTimeout(() => {
    if (stageVisible && !drag && !isPlaying() && roamingIds.value.length === 0) {
      const speaker = nextSpeaker();
      if (speaker) showSpeech(speaker.id, pickLine(speaker, "idle"));
    }
    scheduleChat(nextChatDelay());
  }, delayMs);
}

/** 拎到屏幕边上就停下，别把页面顶出横向滚动条。卡片拖起来会带上倾斜和放大，
    包围盒比原尺寸宽一圈，所以留的余量要够 */
const DRAG_MARGIN = 16;
/** 松手以后话还挂一会儿再收，像还在嘀咕 */
const SPEECH_LINGER_MS = 1600;
/** 一句话里每个字多挂的时长：长句子给够读完的时间 */
const SPEECH_CHAR_MS = 170;
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
  /** 手心里这张卡是谁（搬去别的窗口时靠它认身份） */
  cardId: string;
  kind: CardSpec["kind"];
  slot: HTMLElement;
  /** 真正抓住的那个元素，指针捕获挂在它身上 */
  handle: HTMLElement;
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
  return playingName.value !== "";
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

/** 叠猫猫：拎着的那张落到别的卡身上（同一扇窗口里任意一张都算） */
function isStackedOnOther(slot: HTMLElement, cardId: string): boolean {
  const held = slot.getBoundingClientRect();
  const heldX = held.left + held.width / 2;
  const heldY = held.top + held.height / 2;

  return Array.from(slotEls.entries()).some(([otherId, other]) => {
    if (otherId === cardId || !other.isConnected) return false;
    const resting = other.getBoundingClientRect();
    return (
      Math.hypot(
        heldX - (resting.left + resting.width / 2),
        heldY - (resting.top + resting.height / 2)
      ) <= STACK_GAP_PX
    );
  });
}

/** 遛猫：拖着走的总里程，跨多次拖拽累计 */
function trackCardWalk(dx: number, dy: number): void {
  walkedPx += Math.hypot(dx - dragTrack.lastDx, dy - dragTrack.lastDy);
  dragTrack.lastDx = dx;
  dragTrack.lastDy = dy;
  if (walkedPx >= EGG_THRESHOLDS.cardWalkPx) markEgg("cardWalk");
}

/** 松手时卡片压在哪张卡身上：中心点落进谁的格子里就换谁的位子 */
function reorderTarget(slot: HTMLElement, cardId: string): string | null {
  const held = slot.getBoundingClientRect();
  const centerX = held.left + held.width / 2;
  const centerY = held.top + held.height / 2;

  const hit = liveCards.value.find((card) => {
    if (card.id === cardId) return false;
    const rect = slotEls.get(card.id)?.getBoundingClientRect();
    if (!rect) return false;
    return (
      centerX >= rect.left &&
      centerX <= rect.right &&
      centerY >= rect.top &&
      centerY <= rect.bottom
    );
  });
  return hit?.id ?? null;
}

/** 就地把位次换过来：换完先把两张卡按老位置按住，再把过渡交还给样式，它们就自己滑到新位子上 */
async function reorderCards(cardId: string, targetId: string): Promise<void> {
  const moving = slotEls.get(cardId);
  const target = slotEls.get(targetId);
  if (!moving || !target) return;

  // 拖着的那张在手上，它的位移得算进老位置里
  const dragX = drag?.shiftX ?? 0;
  const dragY = drag?.shiftY ?? 0;
  const before = [moving, target].map((slot) => slot.getBoundingClientRect());

  draggingId.value = "";
  applyReorder(cardId, targetId);
  await nextTick();

  [moving, target].forEach((slot, index) => {
    const rect = slot.getBoundingClientRect();
    const holdX = Math.round(before[index].left - rect.left) + (index === 0 ? dragX : 0);
    const holdY = Math.round(before[index].top - rect.top) + (index === 0 ? dragY : 0);
    if (holdX === 0 && holdY === 0) return;
    slot.style.transition = "none";
    slot.style.translate = `${holdX}px ${holdY}px`;
    slot.style.rotate = "";
    void slot.offsetWidth;
    slot.style.transition = "";
    slot.style.translate = "";
  });
}

function onPointerDown(event: PointerEvent, card: CardSpec): void {
  // 只认左键，右键菜单之类的别抢
  if (event.pointerType === "mouse" && event.button !== 0) return;
  // 正在演互动动画、或者已经有一张在手上，就别再拎
  if (drag || isPlaying()) return;

  const handle = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    ".home-live-card, .home-online"
  );
  const slot = event.currentTarget as HTMLElement;
  // 抓住的必须是这张卡本身，不能是隔壁那张
  if (!handle || !slot.contains(handle)) return;

  // 拎卡前先把各家窗口的位置对一遍：刚被搬过的窗口，别拿几秒前的旧坐标去认邻居
  peerLink.refresh();

  const rect = slot.getBoundingClientRect();
  drag = {
    pointerId: event.pointerId,
    cardId: card.id,
    kind: card.kind,
    slot,
    handle,
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
    handle.setPointerCapture(event.pointerId);
  } catch {
    // 交给冒泡上来的事件处理，不影响的
  }
  draggingId.value = card.id;
  resetDragTrack(event.clientX);
  // 重新拎起来就当第一次报位置：别拿上一轮的旧坐标去比"这次挪够了没有"
  roamSentAt = 0;
  roamSentX = Number.NEGATIVE_INFINITY;
  roamSentY = Number.NEGATIVE_INFINITY;
  showSpeech(card.id, pickLine(card, "drag"));
  // 拎在手上这段时间先别演戏了，松手再接着排
  window.clearTimeout(playTimer);
}

/** 收拾拖拽现场：卡片被搬到隔壁窗口时用，不留回弹 */
function releaseDrag(): void {
  if (!drag) return;
  const { handle, pointerId, slot } = drag;
  if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
  draggingId.value = "";
  slot.style.translate = "";
  slot.style.rotate = "";
  drag = null;
  speakingId.value = "";
  speech.value = "";
  window.clearTimeout(speechTimer);
}

function onPointerMove(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return;

  const rawX = event.clientX - drag.startX;
  const rawY = event.clientY - drag.startY;
  // 能实时漫游时让卡片跟着手真的跑出窗口（跨屏要的就是这个），
  // 撑不住高频消息就还按老办法限制在窗口里，顶到边上再交给隔壁
  const freeRoam = peerLink.liveRoam && peerLink.hasPeers();
  const slack = !freeRoam && peerLink.hasPeers() ? HANDOFF_PUSH_PX : 0;
  const dx = freeRoam
    ? rawX
    : limitShift(rawX, drag.baseLeft, drag.width, window.innerWidth, slack);
  const dy = freeRoam
    ? rawY
    : limitShift(rawY, drag.baseTop, drag.height, window.innerHeight, slack);
  drag.shiftX = dx;
  drag.shiftY = dy;
  // 位置直接给到手上，拖尾和回弹交给样式里的过渡，掉帧也不会变形
  drag.slot.style.translate = `${dx}px ${dy}px`;

  // 卡片飘到别人地盘上了就把自己那张收起来，位置实时报给各个窗口接力
  if (freeRoam) {
    const point = cardPointAbs(dx, dy);
    const owner = peerLink.ownerAt(point.x, point.y);
    setRoaming(owner !== null && !owner.self, drag.cardId);
    reportRoam(point);
  } else {
    // 贴着左边还是右边：越界的看越出方向，没越界的看是不是顶到边上了
    const over = overshootOf(dx, drag.baseLeft, drag.width, window.innerWidth);
    const edge = over !== 0 ? (over > 0 ? "right" : "left") : pressedEdge(drag);
    const target = edge ? peerLink.neighborTowards(edge) : null;

    // 推过头就当场把卡片交给隔壁，不用等松手
    if (edge && target && Math.abs(over) >= HANDOFF_GO_PX) {
      const moved = { id: drag.cardId, kind: drag.kind };
      releaseDrag();
      handOffCard(moved, edge, Math.abs(over));
      return;
    }

    // 卡片顶在边上等着出手：先跟对面打声招呼，让它把卡叫醒准备接
    if (edge && target && Date.now() - warnedAt > WARN_INTERVAL_MS) {
      warnedAt = Date.now();
      peerLink.warnIncoming(target.id, edge);
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

  const { slot, handle, cardId, kind } = drag;
  if (handle.hasPointerCapture(event.pointerId)) {
    handle.releasePointerCapture(event.pointerId);
  }

  // 卡片正飘在大桌面上（跨屏自由拖）：落在谁的屏幕里就搬到谁那儿
  if (roamingIds.value.includes(cardId)) {
    const point = cardPointAbs(drag.shiftX, drag.shiftY);
    const owner = peerLink.ownerAt(point.x, point.y);
    setRoaming(false, cardId);

    if (owner && !owner.self) {
      markEgg("crossHandoff");
      releaseDrag();
      peerLink.sendMove(owner.id, point);
      resumePlay();
      return;
    }

    // 又拖回自己地盘上、或者落在窗口之间的空当里：卡片自己回来
  } else {
    // 撑不住实时传位置时还按老办法：顶到窗口边上松手就当把卡片扔出去
    //（推越界的在拖动途中就已经交出去了）
    const over = overshootOf(drag.shiftX, drag.baseLeft, drag.width, window.innerWidth);
    const edge = over !== 0 ? (over > 0 ? "right" : "left") : pressedEdge(drag);
    if (edge && peerLink.neighborTowards(edge)) {
      releaseDrag();
      handOffCard({ id: cardId, kind }, edge, over !== 0 ? Math.abs(over) : SLIDE_IN_OVER_PX);
      resumePlay();
      return;
    }
  }
  // 松手落在别的卡身上就算叠猫猫（要赶在清掉位移之前量）
  if (isStackedOnOther(slot, cardId)) markEgg("cardStack");

  // 正好压在另一张卡身上：把位次换过来，两张卡自己滑到新位子
  const targetId = reorderTarget(slot, cardId);
  if (targetId) {
    void reorderCards(cardId, targetId);
  } else {
    // 交还样式：过渡会把卡片带着惯性送回原位，顺带晃两下
    draggingId.value = "";
    slot.style.translate = "";
    slot.style.rotate = "";
  }
  drag = null;

  window.clearTimeout(speechTimer);
  speechTimer = window.setTimeout(() => {
    speakingId.value = "";
    speech.value = "";
  }, SPEECH_LINGER_MS);

  resumePlay();
}

/** 闹完了，接着原来的节奏演 */
function resumePlay(): void {
  if (stageVisible) schedulePlay(nextPlayDelay());
}

onMounted(() => {
  // 挂载后再把卡片放出来：这一步是普通更新，不会跟预渲染的内容打架
  mounted.value = true;
  scheduleNudge();
  watchStage();

  // 隔壁走贴边那条路把卡递过来了：从中转那条边滑进来
  peerLink.onHandoff(receiveCard);
  // 隔壁正拎着卡拖过我这块屏幕：一路画着走，松手落在谁那儿就搬到谁那儿
  peerLink.onRoam(showRoamer);
  peerLink.onCardArrive(handleArrival);
  peerLink.onCardLeave(handleCardLeave);
  // 隔壁说卡要来了，先在标题那行通个风，别让它凭空从边上冒出来
  peerLink.onIncoming(() => {
    peerHint.value = "隔壁好像要把卡扔过来了…";
    window.clearTimeout(peerHintTimer);
    peerHintTimer = window.setTimeout(() => {
      peerHint.value = "";
    }, 1800);
  });
  // 隔壁来去都要重排：有邻居就切到齐舞节奏，自己待着就恢复随便演
  watch(peerLink.peerCount, () => {
    schedulePlay(nextPlayDelay());
    scheduleVisitor();
  });
  // 手里卡片数变了（搬来一张 / 搬走一张 / 被销毁）就重排：
  // 凑不齐两张就先歇着，人手换了闲聊的顺序也跟着重来
  watch(
    () => liveCards.value.length,
    () => {
      clearPlayback();
      window.clearTimeout(playTimer);
      if (stageVisible) schedulePlay(nextPlayDelay());
      scheduleChat(nextChatDelay());
    }
  );
  scheduleVisitor();
  scheduleChat(nextChatDelay());
});

onBeforeUnmount(() => {
  stageWatcher?.disconnect();
  window.clearTimeout(idleTimer);
  window.clearTimeout(playTimer);
  window.clearTimeout(resetTimer);
  window.clearTimeout(speechTimer);
  window.clearTimeout(chatTimer);
  window.clearTimeout(greetTimer);
  window.clearTimeout(visitorTimer);
  window.clearTimeout(visitorHideTimer);
  window.clearTimeout(peerHintTimer);
  window.clearTimeout(roamerTimer);
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

/* 隔壁正拎着猫路过我这儿：按屏幕坐标定点画一只，跟着对面手上的动作走。
   挂在 body 上，免得被页面的裁剪区截掉 */
.home-live-roamer {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 8;
  width: 42px;
  height: 42px;
  translate: -50% -50%;
  border: 2px solid rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 12px 26px color-mix(in srgb, var(--vp-c-accent, #096dd9) 26%, transparent);
  opacity: 0.85;
  pointer-events: none;
  /* 位置消息隔着 45ms 来一条，用一小段线性过渡把中间补顺，看着才是走过来的 */
  transition: transform 0.08s linear;
}

.home-live-roamer img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

html.dark .home-live-roamer {
  border-color: rgba(255, 255, 255, 0.14);
  background: #262a33;
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.5);
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

  /* 半宽继续由槽位平分，卡片填满就行；卡多了往下换行，别挤成一条线 */
  .home-live-slot {
    flex: 1 1 calc(50% - 5px);
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

  .home-live-roamer {
    transition: none;
  }
}
</style>
