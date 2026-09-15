<template>
  <section ref="stage" class="home-live" :class="{ 'is-resting': resting }">
    <h2 class="home-intro-title">
      <span class="home-intro-bar" aria-hidden="true"></span>
      此刻的小站
      <span class="home-intro-sub">{{ stageNote }}</span>
    </h2>

    <!-- 卡片住在哪扇窗口就由哪扇窗口渲染：本窗口生的 + 隔壁搬过来的，拖走一张这里就少一张。
         有哪些卡要等挂载后才知道（每扇窗口各生各的），首帧先空着，水合才对得上 -->
    <div
      v-if="mounted"
      class="home-live-cards"
      :style="{ '--play-gap': `${playGap}px`, '--play-span': `${playSpan}px` }"
    >
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
          'is-talking': speakingId === card.id,
        }"
        :data-play="playingName || undefined"
        :data-gesture="speakingId === card.id && speakingGesture ? speakingGesture : undefined"
        :data-mood="mood"
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
        <!-- 随口的嘀咕是看的东西，不是读的东西：别让读屏软件一路念下去 -->
        <span
          v-if="speakingId === card.id"
          class="home-live-bubble"
          aria-hidden="true"
        >{{ speech }}</span>
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
import { useRouter } from "vue-router";
import OnlineCounter from "./OnlineCounter.vue";
import { markEgg } from "./egg-utils";
import { GREETING_REPLY_MS, useLiveTalk } from "./live-chat";
import { DROP_LINES, recentLine } from "./live-lines";
import {
  cardPointAbs,
  createDragTrack,
  edgeFromPoint,
  HANDOFF_GO_PX,
  HANDOFF_PUSH_PX,
  leanFromSpeed,
  limitShift,
  OPPOSITE_EDGE,
  overshootOf,
  pressedEdge,
  ROAM_MIN_MS,
  ROAM_MIN_PX,
  ROAM_STALE_MS,
  SLIDE_IN_OVER_PX,
  slideInFrom,
  STACK_GAP_PX,
  WARN_INTERVAL_MS,
  type DragState,
} from "./live-drag";
import { EGG_THRESHOLDS } from "./neko-shared-eggs";
import {
  idlePeerLink,
  startPeerLink,
  type CardSpec,
  type HandoffPayload,
  type LiveEdge,
  type PeerSides,
  type RoamPoint,
} from "./live-peer";
import { useLiveShow } from "./live-show";

/** 隔多久自己动一下，与在线卡错开，看起来像两只猫互相打量 */
const NUDGE_MIN_MS = 14_000;
const NUDGE_MAX_MS = 30_000;

/** 地址上挂 ?static 就是一屏静态卡片：不演、不说、不拖、也不跟别的窗口联动。
    给低配机、省电模式、以及想比对开销的时候用 */
const staticMode =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("static");

/** 关掉互动时固定摆这两张卡，不再跟别的窗口联动 */
const STATIC_CARDS: readonly CardSpec[] = [
  { id: "static-neko", kind: "neko" },
  { id: "static-online", kind: "online" },
];

/** Neko 主账号的头像，走 QQ 头像服务，换头像这里会跟着变 */
const QQ_AVATAR = "https://q1.qlogo.cn/g?b=qq&nk=3582537505&s=160";
const FALLBACK_AVATAR = "/assets/image/neko.webp";
/** 过路猫画在线猫猫那张卡时用的头像，与 OnlineCounter 保持一致 */
const ONLINE_AVATAR = "/assets/image/neko11.jpg";

const stage = ref<HTMLElement | null>(null);
const nekoAvatarSrc = ref(QQ_AVATAR);
/** 卡片是客户端才知道的事（每扇窗口各生各的），挂载前先不渲染，免得跟预渲染的水合对不上 */
const mounted = ref(false);

/** 跨窗口联动：同一个浏览器里还开着别的 neko 页面时才有邻居 */
const peerLink = staticMode ? idlePeerLink() : startPeerLink();
/** 页面切到后台、或者卡片区滚出视野时，卡片上那些常驻动画先停下，别白白耗电。
    首帧先按「不歇」来，免得跟预渲染出来的 class 对不上 */
const resting = ref(false);
/** 本窗口的显示顺序（拖卡片互相换位改的就是它），各扇窗口各排各的 */
const cardOrder = ref<string[]>([]);

/** 两张卡之间真实隔着多远（大编舞的位移全按它算，窄屏自动收窄）；没量到时用这套兜底 */
const PLAY_GAP_DEFAULT = 140;
const PLAY_GAP_MIN = 80;
const PLAY_GAP_MAX = 320;
/** 「绕过对方站到另一边」需要的距离，封顶免得飞出屏幕 */
const PLAY_SPAN_MAX = 540;
const playGap = ref(PLAY_GAP_DEFAULT);
const playSpan = ref(PLAY_GAP_DEFAULT * 2);

/** 每次开演前量一次：flex 布局下两张卡的距离随视口变，动画里的位移不能写死 */
function measurePlayDistance(): void {
  const { left, right } = show.playSide.value;
  const leftSlot = slotEls.get(left);
  const rightSlot = slotEls.get(right);
  if (!leftSlot || !rightSlot) return;
  const gap = Math.abs(leftSlot.offsetLeft - rightSlot.offsetLeft);
  if (gap < PLAY_GAP_MIN) return;
  playGap.value = Math.min(gap, PLAY_GAP_MAX);
  playSpan.value = Math.min(gap + leftSlot.offsetWidth, PLAY_SPAN_MAX);
}

/** 手上这几张卡按本窗口的顺序排：新来的排在末尾，走了的从顺序里清掉 */
function syncCardOrder(): void {
  const ids = peerLink.cards.value.map((card) => card.id);
  cardOrder.value = [
    ...cardOrder.value.filter((id) => ids.includes(id)),
    ...ids.filter((id) => !cardOrder.value.includes(id)),
  ];
}

watch(peerLink.cards, syncCardOrder, { immediate: true });

/** 眼下住在这扇窗口里的卡片（拖走一张就少一张，隔壁搬来一张就多一张）；
    关掉互动时就固定摆两张，当一屏静态卡片 */
const liveCards = computed(() => {
  if (staticMode) return [...STATIC_CARDS];
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
/** 每张卡的槽位元素，按卡 id 存，找元素/播动画都靠它 */
const slotEls = new Map<string, HTMLElement>();
/** 隔壁的小脑袋从哪边探出来（空串表示没在探） */
const visitorSide = ref<"" | LiveEdge>("");
/** 卡片区在不在视野里：滚进视野才开演、才开口 */
let stageVisible = false;
/** 观众盯着卡片区看了多久：在视野里、页面也没被切走，才继续计时 */
let lingerMs = 0;
let lingerSince = 0;
/** 刚从别的标签页切回来是什么时候（时间戳，没切过就是 0） */
let returnedAt = 0;
/** 「刚切回来」这话说出去多久之内还算新鲜 */
const RETURNED_MS = 45_000;

/** 观众的目光这会儿是不是落在卡片上：露头了、页面也没被切走 */
function isWatched(): boolean {
  return stageVisible && !document.hidden;
}

/** 目光落上来就开始计时，移开（滚走、切后台、切标签页）就停表，回来接着累加 */
function syncLinger(): void {
  if (isWatched()) {
    if (!lingerSince) lingerSince = Date.now();
    return;
  }
  if (!lingerSince) return;
  lingerMs += Date.now() - lingerSince;
  lingerSince = 0;
}

/** 到这会儿为止，观众一共盯着看了多少秒 */
function lingerSeconds(): number {
  return Math.floor((lingerMs + (lingerSince ? Date.now() - lingerSince : 0)) / 1000);
}

/** 光标静止多久算「手放下了」；连戳几下算「戳猫猫」；多快滚完整页算「嗖一下」 */
const CURSOR_IDLE_MS = 30_000;
const TAP_BURST_COUNT = 6;
const TAP_WINDOW_MS = 5_000;
/** 「嗖一下」的宽容度：从顶到底两秒半之内都算，程序化平滑滚动那点时间也算进来 */
const SCROLL_DASH_MS = 2_500;
/** 这些「时刻」说出去多久之内还算新鲜，过了就等下一回 */
const MOMENT_FRESH_MS = 30_000;
/** 上次来的时间戳记在这儿，隔几天再来才有「好久不见」 */
const LAST_SEEN_KEY = "neko-live-last-seen";
const DAY_MS = 86_400_000;

/** 小箭头最后动过是什么时候、同一张卡连着戳了几次、什么时候戳满的、什么时候一口气滚到底的 */
let cursorMovedAt = 0;
let tapCount = 0;
let tapSince = 0;
let lastTapCard = "";
let tapBurstAt = 0;
let topAt = 0;
let scrollDashAt = 0;
/** 距上一次来隔了多少天（头一回来是 0） */
let awayDays = 0;

/** 手一动（划、点、敲键盘）就重新计时：静下来三十秒才轮到那句「手放下了」 */
function noteActivity(): void {
  cursorMovedAt = Date.now();
}

/** 数一数这一张卡被戳了几下：五秒内戳满六下就记一笔 */
function countTap(cardId: string): void {
  const now = Date.now();
  if (cardId !== lastTapCard || now - tapSince > TAP_WINDOW_MS) {
    lastTapCard = cardId;
    tapSince = now;
    tapCount = 0;
  }
  tapCount += 1;
  if (tapCount >= TAP_BURST_COUNT) {
    tapBurstAt = now;
    tapCount = 0;
  }
}

/** 一口气从顶滚到底：从顶部起算一秒半之内见底才算「嗖一下」 */
function onScroll(): void {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  // 页面不够长就不凑热闹，免得随便一滑就中
  if (max < window.innerHeight) return;
  const top = window.scrollY;
  const now = Date.now();
  if (top < 120) {
    topAt = now;
    return;
  }
  if (top >= max - 8 && now - topAt < SCROLL_DASH_MS) scrollDashAt = now;
}

/** 上一次来是什么时候：读完就把此刻记下，下回再算隔了几天 */
function readAwayDays(): number {
  try {
    const raw = window.localStorage.getItem(LAST_SEEN_KEY);
    window.localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
    if (!raw) return 0;
    const days = Math.floor((Date.now() - Number(raw)) / DAY_MS);
    return Number.isFinite(days) && days > 0 ? days : 0;
  } catch {
    // 隐私模式等存储异常：当头一回来
    return 0;
  }
}

/** 演出：演哪一段、什么时候演、两张卡谁左谁右 */
const show = useLiveShow({
  cards: () => liveCards.value,
  slotOf: (cardId) => slotEls.get(cardId),
  visible: () => stageVisible,
  hasPeers: () => peerLink.hasPeers(),
  // 开演前先量一次两张卡的实际距离，大编舞的位移全靠它
  onStarted: () => measurePlayDistance(),
  onFinished: () => {
    // 是对话中间插的那一下就把话接上，接不上才当普通的「刚演完」
    if (!talk.actDone()) talk.markPlayed();
  },
  // 大编舞要独占台面：话没说完、或者手正拎着卡，就先别演
  bigReady: () => !talk.isChatting() && !drag,
});

/** 说话：谁来说、说什么、多久说一段 */
const talk = useLiveTalk({
  cards: () => liveCards.value,
  visible: () => stageVisible,
  // 页面切到后台就别说话了：说了也没人听得见，白排一场
  ready: () =>
    !drag && !show.isPlaying() && roamingIds.value.length === 0 && !document.hidden,
  peers: () => ({ count: peerLink.peerCount.value, sides: peerLink.peerSides.value }),
  lastPlayedAt: show.lastPlayedAt,
  linger: lingerSeconds,
  justReturned: () => Date.now() - returnedAt < RETURNED_MS,
  cursorIdle: () => cursorMovedAt > 0 && Date.now() - cursorMovedAt >= CURSOR_IDLE_MS,
  tapBurst: () => tapBurstAt > 0 && Date.now() - tapBurstAt < MOMENT_FRESH_MS,
  scrollDash: () => scrollDashAt > 0 && Date.now() - scrollDashAt < MOMENT_FRESH_MS,
  awayDays: () => awayDays,
  act: (name) => show.playByName(name),
  holdShow: show.hold,
  releaseShow: show.resume,
});

const { playingName, playSide } = show;
const { speakingId, speech, speakingGesture, mood } = talk;

/** 拎到跳转位上松手要把页面换过去 */
const router = useRouter();

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
/** 新卡片落地后，主人家应声的那一拍 */
let greetTimer = 0;

// QQ 头像服务偶尔抽风或被网络挡住，退回本地那张，别让卡片开天窗
function onAvatarError(): void {
  if (nekoAvatarSrc.value !== FALLBACK_AVATAR) {
    nekoAvatarSrc.value = FALLBACK_AVATAR;
  }
}

let idleTimer = 0;

/** 卡片走的时候模板会拿 null 回调一次，顺手把槽位从表里摘掉 */
function setSlot(cardId: string, el: unknown): void {
  if (el instanceof HTMLElement) slotEls.set(cardId, el);
  else slotEls.delete(cardId);
}

/** 猫卡隔一阵自己歪下头，像在打量旁边的在线猫 */
function nudgeAvatar(): void {
  const card = liveCards.value.find((item) => item.kind === "neko");
  if (card) show.peek(slotEls.get(card.id) ?? null, ".home-live-avatar");
}

function scheduleNudge(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.clearTimeout(idleTimer);
  const delay = NUDGE_MIN_MS + Math.random() * (NUDGE_MAX_MS - NUDGE_MIN_MS);
  idleTimer = window.setTimeout(() => {
    // 页面在后台、或者卡片区不在视野里就先别动
    if (!document.hidden && stageVisible) nudgeAvatar();
    scheduleNudge();
  }, delay);
}

let stageWatcher: IntersectionObserver | undefined;

/** 页面切到后台、或者卡片区滚出视野：常驻的那些无限动画先停下 */
function syncResting(): void {
  resting.value = document.hidden || !stageVisible;
  // 顺带把「观众看了多久」的表也对一下：切走就停，切回来接着算
  syncLinger();
}

/** 页面切走、切回来：常驻动画跟着停/走，回来那一瞬间记一笔 */
function onVisibilityChange(): void {
  if (!document.hidden) returnedAt = Date.now();
  syncResting();
}

/** 卡片多半在首屏下面，露头了才开演：在视野里隔一阵循环一段，滚走就停 */
function watchStage(): void {
  const target = stage.value;
  if (!target) return;

  stageWatcher = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible === stageVisible) return;
      stageVisible = visible;
      syncResting();

      if (!visible) {
        // 滚走了就别演、也别说话了，等滚回来再接着排
        show.hold();
        talk.stop();
        return;
      }

      // 刚露头就演一段，离上一段太近的话先把间隔补够
      show.scheduleFirst();
    },
    { threshold: 0.4 }
  );
  stageWatcher.observe(target);
}

/** 串门：隔壁有窗口时，隔一阵子从边上探个小脑袋出来看看 */
const VISITOR_MIN_MS = 20_000;
const VISITOR_MAX_MS = 44_000;
const VISITOR_SHOW_MS = 2600;

/** 把手里这张卡交给隔壁窗口：那边收着，这边从列表里摘掉 */
function handOffCard(card: CardSpec, edge: LiveEdge, over: number): void {
  const target = peerLink.neighborTowards(edge);
  if (!target) return;

  peerLink.sendHandoff(target.id, { card, edge, over: Math.round(over) });
  markEgg("crossHandoff");
}

/** 刚有卡片搬来：滑进来、打个招呼，住这儿的猫还应一声；恰好两张再演一段见面小戏 */
async function welcomeCard(cardId: string, edge: LiveEdge, over: number): Promise<void> {
  await nextTick();
  const slot = slotEls.get(cardId);
  const card = liveCards.value.find((item) => item.id === cardId);
  if (!slot || !card) return;

  slideInFrom(slot, edge, over);
  markEgg("crossHandoff");
  // 平时循环的那段往后挪，正在说的那段也让位，先让这场见面的小戏演完
  talk.stop();
  show.hold();
  talk.say(card, "arrive");

  window.clearTimeout(greetTimer);
  greetTimer = window.setTimeout(() => {
    if (drag || show.isPlaying()) return;
    // 主人家搭一句，凑成「落地先聊两句」
    const mate = liveCards.value.find((item) => item.id !== card.id);
    if (!mate) return;
    talk.say(mate, "idle");
    // 恰好两张才演得成对手戏，多凑了几张就只聊天
    if (show.canPlay()) show.play({ script: show.pickGreeting() });
    show.resume();
  }, GREETING_REPLY_MS);

  talk.scheduleAfterGreeting();
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
  // 说的话、以及这张卡的记录一起收掉
  talk.hush();
  talk.forget(cardId);
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

let drag: DragState | null = null;
/** 拎着卡片时顺手统计的动作：摇猫猫、遛猫 */
const dragTrack = createDragTrack();

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
  // 静态模式下卡片就摆着看，不给拎
  if (staticMode) return;
  // 戳猫猫的计数放在最前：戳完变拖拽也算数
  noteActivity();
  countTap(card.id);
  // 正在演互动动画、或者已经有一张在手上，就别再拎
  if (drag || show.isPlaying()) return;

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
  dragTrack.reset(event.clientX);
  // 重新拎起来就当第一次报位置：别拿上一轮的旧坐标去比"这次挪够了没有"
  roamSentAt = 0;
  roamSentX = Number.NEGATIVE_INFINITY;
  roamSentY = Number.NEGATIVE_INFINITY;
  talk.say(card, "drag");
  // 拎在手上这段时间先别演戏、也别聊天了，松手再接着排
  talk.stop();
  show.hold();
}

/** 收拾手上那点状态：卡片被搬到隔壁、或者被首页某个落点接住了，都用它。
    keepSpeech 是给落点用的 —— 刚落点说的话不能跟着「拎着时那句抱怨」一起收掉 */
function dropRelease(keepSpeech = false): void {
  if (!drag) return;
  const { handle, pointerId } = drag;
  if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
  draggingId.value = "";
  drag = null;
  if (!keepSpeech) talk.hush();
  lightDrop(null);
}

/** 收拾拖拽现场：卡片被搬到隔壁窗口、或者落在落点上时用，都不留回弹 */
function releaseDrag(keepSpeech = false): void {
  if (!drag) return;
  drag.slot.style.translate = "";
  drag.slot.style.rotate = "";
  dropRelease(keepSpeech);
}

/** 拎到跳转位上松手后，隔这么久才真的换页：先让人看清猫被收进去那一下 */
const CARRY_MS = 320;
/** 寄养：收进去多久之后自己爬回来 */
const RETIRE_MS = 2600;
/** 猫被带去哪个页面，先记在本地，到站那边（CardCourier）认出来再演一段 */
const CARRIED_KEY = "neko-carried";

let dropLit: HTMLElement | null = null;
let carryTimer = 0;
let retireTimer = 0;

/** 指针这会儿压在哪个落点上（没压着就是 null）。落点自己在 DOM 上标 data-drop */
function dropUnder(x: number, y: number): HTMLElement | null {
  const el = document.elementFromPoint(x, y);
  return el instanceof HTMLElement ? el.closest<HTMLElement>("[data-drop]") : null;
}

/** 点亮/熄灭落点。用 dataset 而不是 class：这两处的 class 都由 Vue 说了算，加了会被冲掉 */
function lightDrop(el: HTMLElement | null): void {
  if (el === dropLit) return;
  if (dropLit) delete dropLit.dataset.dropLit;
  dropLit = el;
  if (dropLit) dropLit.dataset.dropLit = "true";
}

/** 落点接住了：给一下短促的反馈，让手感落地 */
function flashDrop(el: HTMLElement): void {
  el.dataset.dropHit = "true";
  window.setTimeout(() => delete el.dataset.dropHit, 600);
}

/** 这个落点该说哪句：功能卡按功能名查表，最近更新是现编的 */
function dropLine(el: HTMLElement, kind: string): string {
  if (kind === "feat") return DROP_LINES[el.dataset.dropKey ?? ""] ?? "";
  if (kind === "recent") {
    const message = el.querySelector(".home-recent-message")?.textContent?.trim() ?? "";
    return message ? recentLine(message) : "";
  }
  return DROP_LINES[kind] ?? "";
}

/** 拎到跳转位上松手：猫被那个按钮收进去，然后带着它一起换页 */
function carryAway(card: CardSpec, to: string, el: HTMLElement): void {
  const slot = slotEls.get(card.id);
  if (!slot) return;
  flashDrop(el);
  slot.dataset.carried = "true";
  try {
    // 记是被哪张卡带过去的：到站那边照着这个挑头像和口吻
    window.sessionStorage.setItem(CARRIED_KEY, card.kind);
  } catch {
    // 隐私模式存不了，那就只是少演一段「到站」
  }
  window.clearTimeout(carryTimer);
  carryTimer = window.setTimeout(() => void router.push(to), CARRY_MS);
}

/** 寄养处：把卡收进去，过一会儿它自己爬回来，还得吐槽一句 */
function retireCard(card: CardSpec): void {
  const slot = slotEls.get(card.id);
  if (!slot) return;
  slot.dataset.retired = "true";
  window.clearTimeout(retireTimer);
  retireTimer = window.setTimeout(() => {
    delete slot.dataset.retired;
    talk.sayLine(card, DROP_LINES.bin);
  }, RETIRE_MS);
}

/** 松手把卡放在落点上：真接住了返回 true，接不住就当没这回事、卡片自己弹回原位 */
function useDrop(el: HTMLElement, card: CardSpec): boolean {
  const kind = el.dataset.drop ?? "";

  if (kind === "goto") {
    const to = el.dataset.dropTo;
    if (!to) return false;
    carryAway(card, to, el);
    return true;
  }

  if (kind === "bin") {
    flashDrop(el);
    retireCard(card);
    return true;
  }

  const line = dropLine(el, kind);
  if (!line) return false;
  flashDrop(el);
  talk.sayLine(card, line);
  return true;
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
    const point = cardPointAbs(drag, dx, dy);
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

  // 拎着卡片扫过首页别处：压在哪个落点上就点亮哪个，手挪开就灭
  if (!roamingIds.value.includes(drag.cardId)) {
    lightDrop(dropUnder(event.clientX, event.clientY));
  }

  // 顺手数一数彩蛋：摇猫猫、遛猫
  if (dragTrack.shake(event.clientX, Date.now())) markEgg("cardShake");
  if (dragTrack.walk(dx, dy)) markEgg("cardWalk");

  // 甩得越快歪得越厉害，手一停角度自己荡回来，看着就像被拎着的猫
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const elapsed = Math.max(event.timeStamp - drag.lastMoveAt, 1);
  const speed = (event.clientX - drag.lastX) / elapsed;
  drag.lastX = event.clientX;
  drag.lastMoveAt = event.timeStamp;

  drag.slot.style.rotate = `${leanFromSpeed(speed).toFixed(2)}deg`;
}

function onPointerUp(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return;

  const { slot, handle, cardId, kind } = drag;
  if (handle.hasPointerCapture(event.pointerId)) {
    handle.releasePointerCapture(event.pointerId);
  }

  // 卡片正飘在大桌面上（跨屏自由拖）：落在谁的屏幕里就搬到谁那儿
  if (roamingIds.value.includes(cardId)) {
    const point = cardPointAbs(drag, drag.shiftX, drag.shiftY);
    const owner = peerLink.ownerAt(point.x, point.y);
    setRoaming(false, cardId);

    if (owner && !owner.self) {
      markEgg("crossHandoff");
      releaseDrag();
      peerLink.sendMove(owner.id, point);
      show.resume();
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
      show.resume();
      return;
    }
  }
  // 松手压在首页某个落点上：交给落点，卡片自己弹回原位
  const dropped = liveCards.value.find((item) => item.id === cardId);
  const target = dropped ? dropUnder(event.clientX, event.clientY) : null;
  if (dropped && target && useDrop(target, dropped)) {
    // 被跳转位收进按钮的那张留在原地，别回弹；其它落点都让它跳回原位。
    // 两个都要留住刚落点说的那句，收尾别出声
    if (target.dataset.drop === "goto") dropRelease(true);
    else releaseDrag(true);
    talk.markDragged();
    show.resume();
    return;
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

  // 刚被拎起来玩过，过一小会儿就让它们嘀咕两句——趁这会儿还记得
  talk.lingerSpeech();
  talk.markDragged();

  show.resume();
}

onMounted(() => {
  // 挂载后再把卡片放出来：这一步是普通更新，不会跟预渲染的内容打架
  mounted.value = true;
  // 静态模式：卡片摆上就完了，一个定时器都不排
  if (staticMode) return;

  scheduleNudge();
  watchStage();
  syncResting();
  document.addEventListener("visibilitychange", onVisibilityChange);

  // 观众手上在忙什么：划、点、敲键盘都算，滚页面另外记
  awayDays = readAwayDays();
  window.addEventListener("pointermove", noteActivity, { passive: true });
  window.addEventListener("keydown", noteActivity);
  window.addEventListener("pointerdown", noteActivity, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });

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
    show.resume();
    scheduleVisitor();
  });
  // 手里卡片数变了（搬来一张 / 搬走一张 / 被销毁）就重排：
  // 凑不齐两张就先歇着，人手换了说话的顺序也跟着重来
  watch(
    () => liveCards.value.length,
    () => {
      show.hold();
      if (stageVisible) show.resume();
      talk.scheduleNext();
    }
  );
  scheduleVisitor();
  talk.scheduleNext();
});

onBeforeUnmount(() => {
  if (staticMode) return;
  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.removeEventListener("pointermove", noteActivity);
  window.removeEventListener("keydown", noteActivity);
  window.removeEventListener("pointerdown", noteActivity);
  window.removeEventListener("scroll", onScroll);
  stageWatcher?.disconnect();
  window.clearTimeout(idleTimer);
  window.clearTimeout(greetTimer);
  window.clearTimeout(visitorTimer);
  window.clearTimeout(visitorHideTimer);
  window.clearTimeout(peerHintTimer);
  window.clearTimeout(roamerTimer);
  window.clearTimeout(carryTimer);
  window.clearTimeout(retireTimer);
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
  /* 两张卡的实际距离与「绕过对方」的距离：开演前由脚本量出来覆盖，
     这里是没量到时的兜底值（大编舞的位移全靠它们，不能是 0） */
  --play-gap: 140px;
  --play-span: 280px;
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

/* 拎在手上：跟手要快，但留一点点拖尾才像有重量；角度过渡带过冲，甩起来就晃。
   pointer-events 关掉是为了让命中判定穿透它，看到底下压着哪个落点 */
.home-live-slot.is-dragging {
  z-index: 3;
  scale: 1.05;
  pointer-events: none;
  transition: translate 0.14s ease-out,
    rotate 0.22s cubic-bezier(0.34, 1.5, 0.64, 1), scale 0.2s ease-out;
}

/* 被跳转位收进按钮里：缩没，紧接着页面就换过去了 */
@keyframes home-live-carried {
  0% {
    scale: 1;
    opacity: 1;
  }

  100% {
    scale: 0.15;
    opacity: 0;
  }
}

.home-live-slot[data-carried] {
  animation: home-live-carried 0.32s cubic-bezier(0.4, 0, 1, 1) forwards;
}

/* 寄养处：收进去 → 待一会儿 → 自己爬回来，一条动画把这三步走完，到点自动复原 */
@keyframes home-live-retire {
  0% {
    scale: 1;
    opacity: 1;
  }

  35%,
  65% {
    scale: 0.3;
    opacity: 0;
  }

  100% {
    scale: 1;
    opacity: 1;
  }
}

.home-live-slot[data-retired] {
  animation: home-live-retire 2.6s var(--ease-play, cubic-bezier(0.34, 1.3, 0.64, 1));
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
  --live-state: var(--live-hue, #22c55e);
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

/* 轮到它说话了：把慢慢浮动换成一行一句的点头，看着像真的在开口。
   被拎在手上、或者两张卡正演对手戏时让位给那两种动作（不然会互相打断） */
.home-live-slot.is-talking:not(.is-dragging):not(.is-playing) .home-live-card {
  animation: home-live-in 0.44s cubic-bezier(0.22, 1, 0.36, 1),
    neko-card-talk 0.68s ease-in-out infinite;
}

/* 在线卡的入场动画名字在它自己的 scoped 块里（被哈希过），这里只挂说话那层
   ——说话时它的慢浮动让位给点头，跟旁边那只同一个节奏（相位错开一点） */
.home-live-slot.is-talking:not(.is-dragging):not(.is-playing) :deep(.home-online) {
  animation: neko-card-talk 0.68s ease-in-out 0.06s infinite;
}

/* 这句台词标了小动作：把点头换成那个动作。幅度不写死在这儿，交给下面 --g-* 那几个数，
   所以加动作只是加一行变量，不用复制整条 animation */
.home-live-slot.is-talking:is([data-gesture]):not(.is-dragging):not(.is-playing) .home-live-card {
  animation-name: home-live-in, neko-card-gesture;
  animation-duration: 0.44s, var(--g-dur, 0.68s);
}

.home-live-slot.is-talking:is([data-gesture]):not(.is-dragging):not(.is-playing) :deep(.home-online) {
  animation-name: neko-card-gesture;
  animation-duration: var(--g-dur, 0.68s);
}

/* 十一个小动作，说穿了只是改几个数：抬爪、摇、弹、抖、蔫、后缩、凑近、歪头、探头、伸腰、闪一下 */
.home-live-slot[data-gesture="guard"] {
  --g-y: 2px;
  --g-scale: 0.97;
}

.home-live-slot[data-gesture="sway"] {
  --g-rot: 3deg;
}

.home-live-slot[data-gesture="hop"] {
  --g-y: -4px;
}

.home-live-slot[data-gesture="shiver"] {
  --g-rot: 1.2deg;
  --g-dur: 0.4s;
}

.home-live-slot[data-gesture="droop"] {
  --g-y: 3px;
  --g-scale: 0.985;
}

.home-live-slot[data-gesture="leanBack"] {
  --g-y: 2px;
  --g-scale: 0.97;
}

.home-live-slot[data-gesture="leanIn"] {
  --g-y: -2px;
  --g-scale: 1.03;
}

.home-live-slot[data-gesture="tilt"] {
  --g-rot: 5deg;
}

.home-live-slot[data-gesture="peek"] {
  --g-x: 5px;
}

.home-live-slot[data-gesture="stretch"] {
  --g-y: -3px;
  --g-scale: 1.025;
}

.home-live-slot[data-gesture="tick"] {
  --g-op: 0.68;
}

/* 说话时的小幅上下：抬两像素、压一像素，节奏比心跳快一点，像嘴里在出字 */
@keyframes neko-card-talk {
  0%,
  100% {
    translate: 0 0;
  }

  32% {
    translate: 0 -2px;
  }

  64% {
    translate: 0 1px;
  }
}

/* 动作：一口气到位置上再回到原样，看着像做完一个动作而不是在原地抽搐 */
@keyframes neko-card-gesture {
  0%,
  100% {
    translate: 0 0;
    rotate: 0deg;
    scale: 1;
    opacity: 1;
  }

  50% {
    translate: var(--g-x, 0px) var(--g-y, 0px);
    rotate: var(--g-rot, 0deg);
    scale: var(--g-scale, 1);
    opacity: var(--g-op, 1);
  }
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

/* 指示灯的色与节奏全从槽位上传下来：几个数一变就是一档心情，灯自己的规则不用动。
   --live-hue 颜色 / --live-beat 呼吸周期 / --live-dim 呼吸最暗到哪 / --live-glow 外圈光晕半径 */
.home-live-light-core {
  width: 9px;
  height: 9px;
  background: var(--live-state);
  box-shadow: 0 0 0 var(--live-glow, 3px) color-mix(in srgb, var(--live-state) 18%, transparent);
  animation: home-live-breathe var(--live-beat, 2.4s) ease-in-out infinite;
}

.home-live-light-ring {
  width: 9px;
  height: 9px;
  border: 1.5px solid var(--live-state);
  opacity: 0;
  animation: home-live-ripple var(--live-beat, 2.4s) ease-out infinite;
}

/* 心情档：灯跟着心情走，但只改几个数。正常心情就用兜底那盏绿，不单写一条 */
.home-live-slot[data-mood="happy"] {
  --live-hue: #10b981;
  --live-beat: 1.7s;
  --live-dim: 0.86;
}

.home-live-slot[data-mood="shy"] {
  --live-hue: #f472b6;
  --live-beat: 2s;
  --live-dim: 0.8;
}

.home-live-slot[data-mood="sulky"] {
  --live-hue: #f59e0b;
  --live-beat: 2.6s;
  --live-dim: 0.66;
}

.home-live-slot[data-mood="sleepy"] {
  --live-hue: #7c8aa0;
  --live-beat: 4.6s;
  --live-dim: 0.46;
}

.home-live-slot[data-mood="lost"] {
  --live-hue: #8fa89b;
  --live-beat: 3.4s;
  --live-dim: 0.58;
}

.home-live-slot[data-mood="hungry"] {
  --live-hue: #fbbf24;
  --live-beat: 2.1s;
  --live-dim: 0.82;
}

/* 状态档压在心情上面：演对手戏时两盏灯一起跳得更欢，开口说话时灯再亮一档，
   被拎在手上则换成悬空的蓝 —— 状态是状态，心情是心情 */
.home-live-slot.is-playing {
  --live-beat: 1.4s;
  --live-glow: 4px;
  --live-ring-scale: 2.6;
}

.home-live-slot.is-talking {
  --live-beat: 1.8s;
  --live-glow: 5px;
  --live-dim: 0.92;
  --live-ring-scale: 2.8;
}

.home-live-slot.is-dragging {
  --live-hue: #60a5fa;
  --live-beat: 1.2s;
  --live-glow: 4px;
  --live-dim: 0.9;
  --live-ring-scale: 2.6;
}

/* 深底上这几个色得提亮一档才看得清；拎在手上那盏蓝也要重新盖一次 */
html.dark .home-live-slot[data-mood="happy"] {
  --live-hue: #34d399;
}

html.dark .home-live-slot[data-mood="shy"] {
  --live-hue: #f9a8d4;
}

html.dark .home-live-slot[data-mood="sulky"] {
  --live-hue: #fbbf24;
}

html.dark .home-live-slot[data-mood="sleepy"] {
  --live-hue: #93a3b8;
}

html.dark .home-live-slot[data-mood="lost"] {
  --live-hue: #a3bdae;
}

html.dark .home-live-slot[data-mood="hungry"] {
  --live-hue: #fcd34d;
}

html.dark .home-live-slot.is-dragging {
  --live-hue: #93c5fd;
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
    opacity: var(--live-dim, 0.72);
  }
}

@keyframes home-live-ripple {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }

  70%,
  100% {
    transform: scale(var(--live-ring-scale, 2.1));
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

/* 下面四段是安静向的，只在台词点名时演（不进平时的随机排期） */

/* 靠一下：两张卡各自向对方挪一点、靠住停半拍，再分开 */
.home-live-slot.is-playing[data-play="lean"] {
  animation: neko-play-lean 1.8s var(--ease-play);
}

/* 递东西：左边那只探出去递，右边那只迎上来接一下 */
.home-live-slot--left.is-playing[data-play="pass"] {
  animation: neko-play-pass-give 1.6s var(--ease-play);
}

.home-live-slot--right.is-playing[data-play="pass"] {
  animation: neko-play-pass-take 1.6s var(--ease-play);
}

/* 学对方：同一个动作，右边慢半拍，看着就是跟着学 */
.home-live-slot.is-playing[data-play="mimic"] {
  animation: neko-play-mimic 1.8s var(--ease-play);
}

.home-live-slot--right.is-playing[data-play="mimic"] {
  animation-delay: 0.15s;
}

/* 一起看出去：不镜像，两张卡朝同一方向偏头，像同时望见画面外那个人 */
.home-live-slot.is-playing[data-play="lookOut"] {
  animation: neko-play-lookOut 2s var(--ease-play);
}

/* ===== 大编舞：动作大、时间长，隔一阵当一次特别节目，不掺进平时的打闹 ===== */

/* 镜像舞步：两张卡照镜子做同一套动作（这段幅度小，在平时的排期里也会出现） */
.home-live-slot.is-playing[data-play="mirrorStep"] {
  animation: neko-play-mirror 3s var(--ease-play);
}

/* 太极转圈：各自往对方那侧绕半圈、交换位置，再绕回来；一个走上面一个走下面 */
.home-live-slot.is-playing[data-play="circle"] {
  --r: calc(var(--play-gap) / 2);
  animation: neko-play-circle 4.5s cubic-bezier(0.45, 0, 0.55, 1);
}

/* 跨越玩耍：左边那只原地跳两下，右边那只贴下面跑过去停到它左边，再跑回来 */
.home-live-slot--left.is-playing[data-play="crossPlay"] {
  animation: neko-play-cross-jump 7s var(--ease-play);
  z-index: 2;
}

.home-live-slot--right.is-playing[data-play="crossPlay"] {
  animation: neko-play-cross-run 7s cubic-bezier(0.45, 0, 0.55, 1);
  z-index: 1;
}

/* 跳背：左边蹲下，右边从它头顶跳过去落到那一侧，再跳回来 */
.home-live-slot--left.is-playing[data-play="leapfrog"] {
  animation: neko-play-leap-crouch 3s var(--ease-play);
}

.home-live-slot--right.is-playing[data-play="leapfrog"] {
  animation: neko-play-leap-over 3s var(--ease-play);
  z-index: 2;
}

/* 绕圈追：右边先跑、左边慢半拍跟上，各绕半圈再归位 */
.home-live-slot--right.is-playing[data-play="chaseLoop"] {
  animation: neko-play-chase-loop 6s cubic-bezier(0.45, 0, 0.55, 1) -0.4s;
}

.home-live-slot--left.is-playing[data-play="chaseLoop"] {
  animation: neko-play-chase-loop 6s cubic-bezier(0.45, 0, 0.55, 1);
}

/* 躲猫猫：左边那只缩到对方身后，右边那只左右探头去找 */
.home-live-slot--left.is-playing[data-play="peekaboo"] {
  animation: neko-play-hide 4s var(--ease-play);
  z-index: 1;
}

.home-live-slot--right.is-playing[data-play="peekaboo"] {
  animation: neko-play-seek 4s var(--ease-play);
  z-index: 2;
}

/* 镜像舞步：同一个动作左右镜像做两轮，像跟着对方一起跳 */
@keyframes neko-play-mirror {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  15% {
    transform: translate(calc(-8px * var(--play-dir)), -9px) rotate(calc(-2deg * var(--play-dir)));
  }

  30% {
    transform: translate(0, 0) rotate(0deg);
  }

  45% {
    transform: translate(calc(8px * var(--play-dir)), -9px) rotate(calc(2deg * var(--play-dir)));
  }

  60% {
    transform: translate(0, 0) rotate(0deg);
  }

  78% {
    transform: translate(calc(-6px * var(--play-dir)), -6px) rotate(calc(-1.4deg * var(--play-dir)));
  }
}

/* 太极转圈：绕半圈到对方的位置（走上面），再绕半圈回来（走下面）。
   --r 是间距的一半 = 圆的半径，两张卡镜像走，所以一个顺时针一个逆时针 */
@keyframes neko-play-circle {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  25% {
    transform: translate(calc(var(--r) * var(--play-dir)), -20px)
      rotate(calc(7deg * var(--play-dir)));
  }

  50% {
    transform: translate(calc(var(--r) * 2 * var(--play-dir)), 0) rotate(0deg);
  }

  75% {
    transform: translate(calc(var(--r) * var(--play-dir)), 20px)
      rotate(calc(-7deg * var(--play-dir)));
  }
}

/* 跨越玩耍 · 左边那只：原地跳两下，等对方从下面跑过去 */
@keyframes neko-play-cross-jump {
  0%,
  100% {
    transform: translate(0, 0);
  }

  7% {
    transform: translate(0, -26px);
  }

  15% {
    transform: translate(0, 0);
  }

  22% {
    transform: translate(0, -10px);
  }

  29% {
    transform: translate(0, 0);
  }

  55% {
    transform: translate(0, -24px);
  }

  63% {
    transform: translate(0, 0);
  }

  71% {
    transform: translate(0, -8px);
  }

  78% {
    transform: translate(0, 0);
  }
}

/* 跨越玩耍 · 右边那只：贴着下面跑到对方左边，站一会儿，再从下面跑回来。
   --play-span 是「绕过对方站到另一边」需要的距离，按实际视口量出来的 */
@keyframes neko-play-cross-run {
  0%,
  5% {
    transform: translate(0, 0);
  }

  24% {
    transform: translate(calc(var(--play-span) * var(--play-dir)), 12px)
      rotate(calc(-3deg * var(--play-dir)));
  }

  34%,
  62% {
    transform: translate(calc(var(--play-span) * var(--play-dir)), 4px) rotate(0deg);
  }

  92%,
  100% {
    transform: translate(0, 0);
  }
}

/* 跳背 · 蹲着的那只：压低压扁一点，让人从头顶过去 */
@keyframes neko-play-leap-crouch {
  0%,
  100% {
    transform: translate(0, 0) scale(1, 1);
  }

  20%,
  55% {
    transform: translate(0, 6px) scale(1, 0.93);
  }

  78% {
    transform: translate(0, 0) scale(1, 1);
  }
}

/* 跳背 · 跳过去的那只：一头高一头低画个弧，落在对方另一侧，再跳回来 */
@keyframes neko-play-leap-over {
  0%,
  100% {
    transform: translate(0, 0);
  }

  20% {
    transform: translate(calc(var(--play-span) * 0.5 * var(--play-dir)), -30px);
  }

  45%,
  58% {
    transform: translate(calc(var(--play-span) * var(--play-dir)), 0);
  }

  78% {
    transform: translate(calc(var(--play-span) * 0.5 * var(--play-dir)), -26px);
  }
}

/* 绕圈追：一路绕到对方那一侧再绕回来，跑的时候身子往前倾 */
@keyframes neko-play-chase-loop {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  22% {
    transform: translate(calc(var(--play-span) * 0.55 * var(--play-dir)), -14px)
      rotate(calc(6deg * var(--play-dir)));
  }

  45% {
    transform: translate(calc(var(--play-span) * var(--play-dir)), 0)
      rotate(calc(3deg * var(--play-dir)));
  }

  70% {
    transform: translate(calc(var(--play-span) * 0.5 * var(--play-dir)), 14px)
      rotate(calc(-4deg * var(--play-dir)));
  }
}

/* 躲猫猫 · 躲的那只：缩到对方身后，藏一会儿再出来 */
@keyframes neko-play-hide {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  25%,
  72% {
    transform: translate(calc(var(--play-gap) * 0.55 * var(--play-dir)), -6px) scale(0.94);
  }
}

/* 躲猫猫 · 找的那只：往左探一下、往右探一下，最后回头看见对方 */
@keyframes neko-play-seek {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  20% {
    transform: translate(-6px, -3px) rotate(-7deg);
  }

  40% {
    transform: translate(6px, -3px) rotate(7deg);
  }

  60% {
    transform: translate(-5px, -2px) rotate(-6deg);
  }

  80% {
    transform: translate(0, -4px) rotate(0deg);
  }
}

/* 靠一下：各自往中间挪，靠住停一会儿再分开 */
@keyframes neko-play-lean {
  0%,
  100% {
    transform: translateX(0) rotate(0deg);
  }

  30%,
  70% {
    transform: translateX(calc(7px * var(--play-dir))) rotate(calc(1.2deg * var(--play-dir)));
  }
}

/* 递：探出去把东西送到对方面前，停一下再收回来 */
@keyframes neko-play-pass-give {
  0%,
  100% {
    transform: translateX(0);
  }

  35%,
  60% {
    transform: translateX(calc(12px * var(--play-dir))) rotate(calc(2deg * var(--play-dir)));
  }
}

/* 接：迎上去一点，接住再退回来 */
@keyframes neko-play-pass-take {
  0%,
  100% {
    transform: translateX(0);
  }

  35%,
  60% {
    transform: translateX(calc(4px * var(--play-dir)));
  }
}

/* 学：上下两下，谁先谁后交给 animation-delay */
@keyframes neko-play-mimic {
  0%,
  100% {
    transform: translate(0, 0);
  }

  25% {
    transform: translate(calc(2px * var(--play-dir)), -4px);
  }

  50% {
    transform: translate(0, 0);
  }

  75% {
    transform: translate(calc(2px * var(--play-dir)), -4px);
  }
}

/* 一起看出去：同向偏头加一点前倾，像看见了屏幕外面那个人 */
@keyframes neko-play-lookOut {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }

  30%,
  70% {
    transform: translateY(-2px) rotate(2.5deg) scale(1.02);
  }
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

/* 页面切到后台、或者卡片区滚出视野：卡片上的浮动、呼吸灯这些常驻动画先停下，
   别在没人看的时候还占着合成器；滚回来会接着跑（入场动画也是那时才演） */
.home-live.is-resting .home-live-card,
.home-live.is-resting .home-live-card *,
.home-live.is-resting :deep(.home-online),
.home-live.is-resting :deep(.home-online *) {
  animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
  /* 互动动画的选择器特异性较高，这里要写成同级别才盖得住 */
  .home-live-slot.is-playing[data-play],
  .home-live-slot.is-talking:not(.is-dragging):not(.is-playing) .home-live-card,
  .home-live-slot.is-talking:not(.is-dragging):not(.is-playing) :deep(.home-online),
  .home-live-slot.is-talking:is([data-gesture]):not(.is-dragging):not(.is-playing) .home-live-card,
  .home-live-slot.is-talking:is([data-gesture]):not(.is-dragging):not(.is-playing) :deep(.home-online),
  .home-live-bubble,
  .home-live-card,
  .home-live-avatar.is-moving,
  .home-live-light-core,
  .home-live-light-ring,
  .home-live-slot[data-carried],
  .home-live-slot[data-retired] {
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
