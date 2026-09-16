<template>
  <section
    ref="stage"
    class="home-live"
    :class="{ 'is-resting': resting, 'is-static': staticMode }"
  >
    <h2 class="home-intro-title">
      <span class="home-intro-bar" aria-hidden="true"></span>
      此刻的小站
      <span class="home-intro-sub">{{ stageNote }}</span>
    </h2>

    <!-- 卡片说的话在气泡里，而那层是 aria-hidden 的（视觉用）：读屏那条道单独走这里，
         只报「谁在说什么」。不能塞进角色是 button 的槽位里 —— 那会变成按钮的名字 -->
    <p class="home-live-sr" role="status" aria-live="polite">{{ spokenLine }}</p>

    <!-- 卡片住在哪扇窗口就由哪扇窗口渲染：本窗口生的 + 隔壁搬过来的，拖走一张这里就少一张。
         有哪些卡要等挂载后才知道（每扇窗口各生各的），首帧先空着，水合才对得上 -->
    <div
      v-if="mounted"
      class="home-live-cards"
      :style="{ '--play-gap': `${playGap}px`, '--play-span': `${playSpan}px` }"
      :data-layout="stackedPlay ? 'stacked' : 'side'"
      role="group"
      aria-label="可以拖着玩的卡片：鼠标直接拖，手机按住片刻再拖；按回车或空格戳一下"
      @pointerenter="onStageEnter"
      @pointerleave="onStageLeave"
    >
      <div
        v-for="(card, index) in liveCards"
        :key="card.id"
        :ref="(el) => setSlot(card.id, el)"
        class="home-live-slot"
        tabindex="0"
        role="button"
        :aria-label="slotLabel(card)"
        :class="{
          'home-live-slot--left': playSide.left === card.id,
          'home-live-slot--right': playSide.right === card.id,
          'is-away': roamingIds.includes(card.id),
          'is-dragging': draggingId === card.id,
          'is-playing': playingIds.has(card.id),
          'is-talking': speakingId === card.id,
          'is-listening': speakingId !== '' && speakingId !== card.id,
        }"
        :data-play="playingIds.has(card.id) ? playingName : undefined"
        :data-gesture="speakingId === card.id && speakingGesture ? speakingGesture : undefined"
        :data-mood="mood"
        @pointerdown="onPointerDown($event, card)"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @keydown="onSlotKeydown($event, card)"
        @contextmenu.prevent
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
            <span class="home-live-meta">{{ nekoMeta }}</span>
          </span>
          <span class="home-live-light" aria-hidden="true">
            <span class="home-live-light-ring"></span>
            <span class="home-live-light-core"></span>
          </span>
        </div>
        <OnlineCounter v-else :static="staticMode" @count="onOnlineCount" />
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
import { GREETING_REPLY_MS, speechLingerMs, useLiveTalk } from "./live-chat";
import { anyDropLines, dropLineFor, nekoMetaLine, recentLine } from "./live-lines";
import {
  cardPointAbs,
  createDragTrack,
  DRAG_LIFT_PX,
  DRAG_TOP_MARGIN,
  EDGE_SCROLL_FRAME_MS,
  edgeFromPoint,
  edgeScrollSpeed,
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
  isBackToTop,
  resolveDropTarget,
  type DropCategory,
} from "./live-drop-targets";
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

/** 两张卡之间真实隔着多远（大编舞的位移全按它算，窄屏自动收窄）。
    开演前每次都能量到，这几个只是兜底：横排取桌面实测的那一对（槽宽 264 + 卡间距 22 = 286，
    「跨到对方另一侧」再加一个卡宽 = 550），竖排的槽距只有「卡高 + 卡间距」，得单独给小值 */
const PLAY_GAP_FALLBACK = 286;
const PLAY_SPAN_FALLBACK = 550;
const PLAY_GAP_FALLBACK_STACKED = 82;
/** 量出来的槽距小于它就当没量准（槽位还没排好、两张被挤进同一行），退回上面那套兜底值。
    阈值必须比竖排的实测值（约 82）低得多 —— 定高了会把竖排的实测值当成噪音，
    然后拿上一轮横排的量（286）去演竖排，卡片当场被甩出屏幕 */
const PLAY_GAP_FLOOR = 40;
/** 槽距再大也就是「槽宽 + 卡间距」，超出说明量歪了 */
const PLAY_GAP_MAX = 320;
/** 跨越时卡片的远端边缘离屏幕边还留这么点，别贴着边或越出去 */
const PLAY_EDGE_MARGIN = 8;
const playGap = ref(PLAY_GAP_FALLBACK);
const playSpan = ref(PLAY_SPAN_FALLBACK);
/** 两张卡是上下摞着的（手机上就这样）：样式那边据此把横向位移换成上下位移 */
const stackedPlay = ref(false);

/** 跨越那一下只能朝对方那侧走，能走多远取决于屏幕边到哪儿：
    并排时右边那张往左跨（同时左边那张往右跨），竖排时下面那张往上跨。
    两边都要算，取小的那个 —— 远端的同伴也可能朝另一头走 */
function safePlayTravel(
  leftSlot: HTMLElement,
  rightSlot: HTMLElement,
  stacked: boolean
): number {
  if (stacked) return rightSlot.getBoundingClientRect().top - PLAY_EDGE_MARGIN;
  const leftRect = leftSlot.getBoundingClientRect();
  const rightRect = rightSlot.getBoundingClientRect();
  return Math.min(
    rightRect.left - PLAY_EDGE_MARGIN,
    document.documentElement.clientWidth - leftRect.right - PLAY_EDGE_MARGIN
  );
}

/** 每次开演前量一次：flex 布局下两张卡的距离随视口变，动画里的位移不能写死。
    竖排时量纵向 —— 手机上两张卡上下摞着，横向的位移会把卡片直接推出屏幕 */
function measurePlayDistance(): void {
  const { left, right } = show.playSide.value;
  const leftSlot = slotEls.get(left);
  const rightSlot = slotEls.get(right);
  if (!leftSlot || !rightSlot) return;

  const stacked = Math.abs(leftSlot.offsetTop - rightSlot.offsetTop) > leftSlot.offsetHeight / 2;
  stackedPlay.value = stacked;

  const measured = stacked
    ? Math.abs(leftSlot.offsetTop - rightSlot.offsetTop)
    : Math.abs(leftSlot.offsetLeft - rightSlot.offsetLeft);
  // 量不准就退回兜底值，绝不留着上一轮的量：上一轮很可能是另一种布局
  // （兜底也按布局分：横排的 286 拿到竖排里去，卡片当场被甩出屏幕）
  const fallbackGap = stacked ? PLAY_GAP_FALLBACK_STACKED : PLAY_GAP_FALLBACK;
  const gap = measured < PLAY_GAP_FLOOR || measured > PLAY_GAP_MAX ? fallbackGap : measured;
  playGap.value = gap;

  // 「跃过对方站到对方那一侧」要走的距离 = 槽距 + 自己那一边的尺寸（横排是卡宽、竖排是卡高），
  // 两种布局语义一致。但真能走多远还得看屏幕边：手机上两张卡几乎占满整行，
  // 余地比需要的少，就按余地收缩 —— 幅度小一点，这一段照样演得成
  const needed = gap + (stacked ? leftSlot.offsetHeight : leftSlot.offsetWidth);
  playSpan.value = Math.max(0, Math.min(needed, safePlayTravel(leftSlot, rightSlot, stacked)));
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

/** 鼠标这会儿是不是停在卡片区里（进区记下时间、出区归零）。
    给「黏人」那一档用：手一直搁在它们身上，跟手只是路过是完全两回事 */
let hoverInsideAt = 0;

function onStageEnter(): void {
  if (hoverInsideAt === 0) hoverInsideAt = Date.now();
}

function onStageLeave(): void {
  hoverInsideAt = 0;
}

/** 光标静止多久算「手放下了」；连戳几下算「戳猫猫」；多快滚完整页算「嗖一下」 */
const CURSOR_IDLE_MS = 30_000;
/** 手刚动过就算「还新鲜」：好奇那一档靠它。给得比「手放下」短得多 ——
    人在页面上动来动去的时候，猫该是探头看着的，而不是发呆 */
const CURSOR_FRESH_MS = 2500;
const TAP_BURST_COUNT = 6;
const TAP_WINDOW_MS = 5_000;
/** 「嗖一下」的宽容度：从顶到底两秒半之内都算，程序化平滑滚动那点时间也算进来 */
const SCROLL_DASH_MS = 2_500;
/** 这些「时刻」说出去多久之内还算新鲜，过了就等下一回 */
const MOMENT_FRESH_MS = 30_000;
/** 上次来的时间戳记在这儿，隔几天再来才有「好久不见」 */
const LAST_SEEN_KEY = "neko-live-last-seen";
/** 今天来过几次记在这儿，换一天从头数 */
const VISITS_KEY = "neko-live-visits";
const DAY_MS = 86_400_000;

/** 小箭头最后动过是什么时候、同一张卡连着戳了几次、什么时候戳满的、什么时候一口气滚到底的 */
let cursorMovedAt = 0;
let tapCount = 0;
let tapSince = 0;
let lastTapCard = "";
let tapBurstAt = 0;
let topAt = 0;
let scrollDashAt = 0;
/** 上一次滚动是什么时候：刚滚完就按住卡片，多半是想让页面停下，不是想拎猫 */
let lastScrollAt = 0;
/** 距上一次来隔了多少天（头一回来是 0） */
let awayDays = 0;
/** 今天第几次打开这一页（本机记的，头一回是 1） */
let visitTimes = 1;
/** 在线卡报上来的真实人数：卡片说话时要拿它当梗 */
let onlineCount = 0;

/** 在线卡报到的人数 */
function onOnlineCount(value: number): void {
  onlineCount = value;
}

/** 手一动（划、点、敲键盘）就重新计时：静下来三十秒才轮到那句「手放下了」 */
function noteActivity(): void {
  cursorMovedAt = Date.now();
}

/** 被戳一下时灯亮多久 */
const TAP_LIGHT_MS = 620;
/** 手机上按住多久才算「拎」，以及这段时间里手指能动多少像素。
    这个「能动多少」不能太小：手指按下去之后多少都会抖、也常顺势滑动一点，
    原来只给 10px，手一动就转成滚页面了，表现就是「想拎猫，十次有八次在滑页面」 */
const TOUCH_HOLD_MS = 180;
/** 按住之后过这么久才抬起来给人看：一压就抬的话，快速点一下也成了「抬起」，
    那一下的「按下」反馈就整没了 —— 手机上点卡片会显得毫无反应 */
const ARMING_DELAY_MS = 90;
const TOUCH_SLOP_PX = 16;
/** 页面刚滚过之后这么久内按住卡片不给拎 —— 那多半是想让页面停下来 */
const SCROLL_SETTLE_MS = 180;
/** 拖动中的命中测试节流：手指挪过这么多、或者离上次测试过了这么久，才重新测一次。
    elementFromPoint 是一次强制同步布局，没挪几步就重复问它纯属浪费 */
const HIT_MIN_PX = 12;
const HIT_MIN_MS = 50;

let touchHoldAt: { x: number; y: number; pointerId: number; slot: HTMLElement } | null = null;
let touchHoldTimer = 0;
let armTimer = 0;

/** 还没拎起来：手挪开了或者抬起来了，就当成想滚页面 / 想点一下 */
function cancelHold(): void {
  window.clearTimeout(touchHoldTimer);
  window.clearTimeout(armTimer);
  if (touchHoldAt) delete touchHoldAt.slot.dataset.arming;
  touchHoldAt = null;
}

/** 手指落在卡片上、但还没够「按住」那 180 毫秒就动了：这一下是想滚页面。
    卡片身上写着 `touch-action: none`（不然浏览器会先把这段手势抢走滚页面，只留给我们一个
    pointercancel），所以这一下得自己滚 —— 往后每个 pointermove 按手指走了多少滚多少，
    抬手再照末速带一小段惯性，手感才跟原生那条路对得上 */
let pageScroll: { pointerId: number; lastY: number; lastAt: number; speed: number } | null = null;
/** 抬手那一刻手指的速度（像素/毫秒，手指往上滑是负的） */
let glideSpeed = 0;
let glideFrame = 0;
/** 惯性每毫秒保留多少：0.985 大约滑一秒收住，接近系统「甩一下」的收尾 */
const GLIDE_DECAY = 0.985;
/** 慢到这个速度（像素/毫秒）就别再滚了 */
const GLIDE_MIN_SPEED = 0.04;

/** 自己滚一屏。主题全局写着 scroll-behavior: smooth，光写 behavior: "instant" 压不住它 ——
    压不住的话每一小步都被抹成一段平滑滚动，页面跟不上手指（实测抖 ±55px）。
    所以临时把根元素的 scroll-behavior 按回 auto，滚完立刻还原 */
function scrollWindowBy(delta: number): void {
  if (delta === 0) return;
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollBy({ top: delta, behavior: "instant" });
  root.style.scrollBehavior = previous;
}

/** 手指在卡片上滑动：1:1 跟着滚，顺手记下速度给抬手时的惯性用 */
function scrollPageWith(event: PointerEvent): void {
  if (!pageScroll) return;
  const now = performance.now();
  const dy = event.clientY - pageScroll.lastY;
  const elapsed = Math.max(now - pageScroll.lastAt, 1);
  // 手指往上滑（dy < 0）页面往下走，所以要取反
  pageScroll.speed = -dy / elapsed;
  pageScroll.lastY = event.clientY;
  pageScroll.lastAt = now;
  scrollWindowBy(-dy);
}

/** 从「按住」改成「滚页面」：按住那笔账作废，旧的惯性也一并停掉 */
function beginPageScroll(event: PointerEvent): void {
  cancelHold();
  stopGlide();
  pageScroll = {
    pointerId: event.pointerId,
    lastY: event.clientY,
    lastAt: performance.now(),
    speed: 0,
  };
}

/** 抬手：照最后那一小段的速度再滑一小段，不然「在卡片上滑一下」是硬停的 */
function glideAway(): void {
  glideSpeed = pageScroll?.speed ?? 0;
  pageScroll = null;
  if (glideFrame || Math.abs(glideSpeed) < GLIDE_MIN_SPEED) return;
  let last = performance.now();
  const step = (now: number): void => {
    // 低帧率下按真实间隔折算，封顶两帧：切后台回来别一下窜出老远
    const elapsed = Math.min(now - last, 50);
    last = now;
    glideSpeed *= GLIDE_DECAY ** elapsed;
    if (Math.abs(glideSpeed) < GLIDE_MIN_SPEED) {
      glideFrame = 0;
      return;
    }
    scrollWindowBy(glideSpeed * elapsed);
    glideFrame = requestAnimationFrame(step);
  };
  glideFrame = requestAnimationFrame(step);
}

function stopGlide(): void {
  if (glideFrame) window.cancelAnimationFrame(glideFrame);
  glideFrame = 0;
  glideSpeed = 0;
}

/** 把页面平平稳稳送到某一行，时长自己说了算。
    不用原生的 scrollTo({ behavior: "smooth" })：浏览器按距离自己定快慢（四百来像素
    两三百毫秒就冲到了），而卡片归位那 0.55 秒还在半路 —— 看起来就是「页面一闪、猫不见了」。
    这儿让它跟卡片一个节奏走完，才是「猫往回跑、镜头一路跟着」 */
function glidePageTo(top: number, durationMs: number): void {
  stopGlide();
  const from = window.scrollY;
  if (Math.abs(top - from) < 2) return;
  const started = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - started) / durationMs);
    // 先快后慢、末尾轻轻靠住：与卡片归位那条缓动是同一个脾气
    const eased = 1 - (1 - t) ** 3;
    scrollWindowBy(from + (top - from) * eased - window.scrollY);
    glideFrame = t < 1 ? window.requestAnimationFrame(step) : 0;
  };
  glideFrame = window.requestAnimationFrame(step);
}

/** 每张卡自己那个「灯还亮着」的计时器：连着戳时要把上一个撤掉，不然会一闪一闪 */
const tapTimers = new WeakMap<HTMLElement, number>();

/** 被戳了一下：灯闪一下，让人知道手碰到了 */
function flashTap(slot: HTMLElement): void {
  window.clearTimeout(tapTimers.get(slot));
  slot.dataset.tapped = "true";
  tapTimers.set(
    slot,
    window.setTimeout(() => delete slot.dataset.tapped, TAP_LIGHT_MS)
  );
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

/** 页面滚了一次之后，手上的位移要跟着补回来 —— 见 compensateScroll */
let lastScrollY = 0;

/** 页面滚动后把手上的位移补回去：卡片得留在手底下。
    卡片的位置是「槽位原点 + 手上的位移」算出来的，页面一滚槽位原点就往上走了，
    不补的话它会**跟着内容一起跑** —— 自动滚页滚 300px，卡片就离鼠标 300px，
    看着像松了手（滚轮、触控板惯性滚动也是同一个毛病）。
    补偿完再量一次 rect 重算原点，量的是补偿之后的位置，贴边判定才不会错位 */
function compensateScroll(): void {
  const top = window.scrollY;
  const delta = top - lastScrollY;
  lastScrollY = top;
  if (!drag || delta === 0) return;

  drag.shiftY += delta;
  // 抓手的基准也跟着一起挪：下一次 pointermove 是拿「指针 - 基准」算位移的，
  // 基准不动的话算出来的位移跟已经补过的 shiftY 差了一个滚动量，会被贴边限位
  // 一把夹到视口边上 —— 松手前手一动，卡片就跳到屏幕另一头
  drag.startY -= delta;
  const lift = drag.touch ? DRAG_LIFT_PX : 0;
  drag.slot.style.translate = `${drag.shiftX}px ${drag.shiftY - lift}px`;

  // 反过来推「不含位移时的原位」：行内位移里带着上浮量，反推时也得一起减掉。
  // 漏掉那个 lift 的话，每滚过一次基准就往上跑 30px（手机上拖到一半页面自动滚页时必然发生），
  // 落点高亮会比看得见的卡片中心高出一行
  const rect = drag.slot.getBoundingClientRect();
  drag.baseLeft = rect.left + (rect.width - drag.width) / 2 - drag.shiftX;
  drag.baseTop = rect.top + (rect.height - drag.height) / 2 - (drag.shiftY - lift);
  // 滚动之后卡片相对屏幕的位置也变了，气泡朝哪边要跟着重判
  syncBubbleSide(drag.slot, rect.top);
}

/** 一口气从顶滚到底：从顶部算起一秒半之内见底才算「嗖一下」 */
function onScroll(): void {
  const now = Date.now();
  lastScrollAt = now;
  compensateScroll();
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  // 页面不够长就不凑热闹，免得随便一滑就中
  if (max < window.innerHeight) return;
  const top = window.scrollY;
  if (top < 120) {
    topAt = now;
    return;
  }
  if (top >= max - 8 && now - topAt < SCROLL_DASH_MS) scrollDashAt = now;
}

/** 今天第几次打开这个页面：换一天就从头数，隐私模式读不到就当头一回 */
function readVisitTimes(): number {
  try {
    const today = new Date().toDateString();
    const raw = window.localStorage.getItem(VISITS_KEY);
    const saved = raw ? (JSON.parse(raw) as { day?: string; times?: number }) : null;
    const times = saved?.day === today ? (saved.times ?? 0) + 1 : 1;
    window.localStorage.setItem(VISITS_KEY, JSON.stringify({ day: today, times }));
    return times;
  } catch {
    return 1;
  }
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
  // 特别节目开演前现量一次余地：量完顺手把 --play-gap / --play-span 写到槽位上，
  // 所以「量到多少」就是「这一段能走多远」
  measureSpan: () => {
    measurePlayDistance();
    return playSpan.value;
  },
});

/** 说话：谁来说、说什么、多久说一段 */
const talk = useLiveTalk({
  cards: () => liveCards.value,
  visible: () => stageVisible,
  // 页面切到后台就别说话了：说了也没人听得见，白排一场
  ready: () =>
    !drag && !show.isPlaying() && roamingIds.value.length === 0 && !document.hidden,
  // 被戳的回话比它宽松：正演着戏也回一句 —— 那是用户主动点的一下
  canPoke: () => !drag && roamingIds.value.length === 0 && !document.hidden,
  peers: () => ({ count: peerLink.peerCount.value, sides: peerLink.peerSides.value }),
  lastPlayedAt: show.lastPlayedAt,
  linger: lingerSeconds,
  justReturned: () => Date.now() - returnedAt < RETURNED_MS,
  cursorIdle: () => cursorMovedAt > 0 && Date.now() - cursorMovedAt >= CURSOR_IDLE_MS,
  // 好奇与黏人这两档：手刚动过 / 手一直搁在卡片上（对应 live-chat 里的 curious 与 clingy）
  cursorFresh: () => cursorMovedAt > 0 && Date.now() - cursorMovedAt < CURSOR_FRESH_MS,
  hoverHoldMs: () => (hoverInsideAt > 0 ? Date.now() - hoverInsideAt : 0),
  tapBurst: () => tapBurstAt > 0 && Date.now() - tapBurstAt < MOMENT_FRESH_MS,
  scrollDash: () => scrollDashAt > 0 && Date.now() - scrollDashAt < MOMENT_FRESH_MS,
  awayDays: () => awayDays,
  online: () => onlineCount,
  visitTimes: () => visitTimes,
  act: (name) => show.playByName(name),
  holdShow: show.hold,
  releaseShow: show.resume,
});

const { playingName, playSide, playingIds } = show;
const { speakingId, speech, speakingGesture, mood } = talk;

/** 猫卡名字下面那行小字：跟着心情、卡片数和时段换，不再永远同一句 */
const nekoMeta = computed(() =>
  nekoMetaLine(mood.value, liveCards.value.length, new Date().getHours())
);

/** 说的话另送一份给读屏：气泡那层是 aria-hidden 的（只给眼睛看），
    这里带上「是哪张卡在说」，不然只听到一句话，不知道谁开的腔 */
const spokenLine = computed(() => {
  const id = speakingId.value;
  if (!id) return "";
  const card = liveCards.value.find((item) => item.id === id);
  return `${card?.kind === "online" ? "在线猫猫" : "Neko 本猫"}：${speech.value}`;
});

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

/** 心情原来只在「要说话」时才算一次，跨过 23:00 / 17:00 这类档口而没人开口时，
    名字下的小字与状态灯会挂着旧档最长等到下一轮说话（20–45 秒）；
    这里每半分钟补算一次，只在真换档时才写 mood，灯上的动画不会重启动 */
const MOOD_TICK_MS = 30_000;
let moodTimer = 0;

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
  if (document.hidden) {
    // 切到后台先把正在演的那段收掉：后台里动画停在半路，回来接着走完，
    // 看着就是「卡片弹回去又重来一遍」
    if (show.isPlaying()) show.abortPlaying();
  } else {
    returnedAt = Date.now();
    // 藏在后台这段时间定时器被浏览器节流，心跳基本停摆，隔壁可能已经按超时把我当成关掉的窗口了；
    // 醒来先自报一次家门，把位置和家当重新说清楚
    peerLink.refresh();
  }
  syncResting();
  // 切后台期间排期链会自己早退（早退不重排），回前台得重新接一次
  resumeAll();
}

/** 页面从 BFCache 里被捞回来：整页的定时器都被冻住过，排期链同样是断的 */
function onPageShow(event: PageTransitionEvent): void {
  if (event.persisted) resumeAll();
}

/** 「减少动效」的偏好：先前那些排期都是被它早退掉的，关掉时要接回来 */
const reduceMotionQuery =
  typeof window === "undefined" ? null : window.matchMedia("(prefers-reduced-motion: reduce)");

function onReduceMotionChange(event: MediaQueryListEvent): void {
  if (!event.matches) resumeAll();
}

/** 三种「回来了」共用这一个入口：标签页回前台、从 BFCache 回来、系统把「减少动效」关掉。
    演出与说话这两条链在没人看的时候都是直接 return（早退不重排），不重新接一次，
    回来的用户可能几十秒甚至更久都等不到一场演出 */
function resumeAll(): void {
  // 静态模式只留省电那一半，不排任何演出与说话
  if (staticMode || document.hidden) return;
  // 正说着话就别碰台面：resume() 会把 holding 复位，插戏会趁虚而入；
  // 这一轮说完，playTurn 自己会把台面还回去
  if (!talk.isChatting()) show.resume();
  talk.scheduleNext();
  // 在后台待久了可能已经跨过时段档口，顺手把心情也算一遍
  talk.refreshMood();
  scheduleNudge();
  scheduleVisitor();
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

      // 静态模式只留省电那一半：卡片摆上就完了，不排戏也不说话
      if (staticMode) return;

      if (!visible) {
        // 滚走了就别演、也别说话了，等滚回来再接着排
        show.hold();
        talk.stop();
        // 连气泡一起收：光停排期的话，挂着的气泡还留着 1.6–5 秒，
        // is-talking / is-listening 也让卡片继续点头，省电那几条盖不住
        talk.hush();
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
    // 主人家搭一句，凑成「落地先聊两句」；只有一张卡就没人接话、正拖着卡或正演着戏就先跳过。
    // 但不管哪种情况，台面都得还回去 —— hold 了没人对冲的话，独处小动作与特别节目会被一直压着
    const mate = liveCards.value.find((item) => item.id !== card.id);
    if (mate && !drag && !show.isPlaying()) {
      talk.say(mate, "idle");
      // 恰好两张才演得成对手戏，多凑了几张就只聊天
      if (show.canPlay()) show.play({ script: show.pickGreeting() });
    }
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
  // 它欠着的那笔换页账跟它一起作废：一张已经不在手上的卡不该把页面带走
  cancelCarry(cardId);
  // 寄养那笔也一样：卡都搬走了，别再让它隔两秒冒出来说一句寄养台词
  cancelRetire(cardId);
  // 停在落点上等话说完的那笔停留也一样作废：卡都搬走了，别再让收尾去动那个槽位
  if (dropLingerCardId === cardId) clearDropLinger();
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
/** 手指/鼠标这会儿在屏幕的哪儿：自动滚页看它（比卡片中心更贴边 ——
    卡片被 limitShift 挡在离边 16px 处，中心到不了最边上，速度的档位就拉不开）；
    中心那点认不出落点时也拿它再问一次（导航栏、回顶按钮就钉在视口边上） */
const dragPointer = { x: 0, y: 0 };
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

  const slot = event.currentTarget as HTMLElement;
  // 「手在动」跟戳不戳无关，先记上
  noteActivity();

  // 手指碰到的回应先给足：灯闪一下、按下的手感、顺口回一句。
  // 这三样都不该被下面「能不能拎」那几条守卫没收 —— 尤其手机上，
  // 手里按着而屏幕毫无动静，看着就像这张卡坏了
  countTap(card.id);
  flashTap(slot);
  talk.poke(card);

  // 已经有一张在手上、另一根手指还按着、正在滚页面：这一下都不作数
  if (drag || touchHoldAt || pageScroll) return;

  const handle = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    ".home-live-card, .home-online"
  );
  // 抓住的必须是这张卡本身，不能是隔壁那张
  if (!handle || !slot.contains(handle)) return;

  // 演出中 / 页面刚滚过：这一下多半不是想拎猫（是想让页面停住，或者在接着滑）。
  // 但**不能就这么撒手不管** —— 卡片身上写着 touch-action: none，浏览器不会替我们滚，
  // 直接 return 的话这一段手势就彻底空转了（页面不动、卡也不拎）。所以还是接过来，
  // 只是不给拎：手指挪开了就当滚页面（见 beginPageScroll）
  const noDrag = show.isPlaying() || Date.now() - lastScrollAt < SCROLL_SETTLE_MS;

  // 手指头先按住一小会儿才算是「拎」：一压就走的话分不清是想滚页面还是想拎猫，
  // 按住的这段时间页面本来也不会滚，等真拎起来了再把竖向滚动一并收走
  if (event.pointerType !== "mouse") {
    holdToDrag(event, card, slot, handle, noDrag);
    return;
  }

  // 鼠标没有「手势被吞」这回事（滚轮照旧能滚），演出中与刚滚过就干脆不拎
  if (noDrag) return;
  beginDrag(event, card, slot, handle);
}

/** 键盘那条路：Enter / 空格走跟「鼠标点一下」完全相同的一套 —— 数连戳、闪灯、顺口回一句。
    Enter 在 window 上还挂着 noteActivity（只记「手在动」），两边互不打扰 */
function onSlotKeydown(event: KeyboardEvent, card: CardSpec): void {
  if (event.key !== "Enter" && event.key !== " ") return;
  // 按住不放会一直重复触发，当一次就好
  if (event.repeat) return;
  // 空格默认会把页面滚下去，而当按钮按的时候不该滚
  event.preventDefault();
  // 静态模式的卡片只摆着看：跟鼠标那条路一样，戳了也不回应
  if (staticMode) return;
  const slot = slotEls.get(card.id);
  if (!slot) return;
  noteActivity();
  countTap(card.id);
  flashTap(slot);
  talk.poke(card);
}

/** 键盘与读屏那条路得知道「这是哪张卡」（鼠标那条路靠看名字就行） */
function slotLabel(card: CardSpec): string {
  return `${card.kind === "online" ? "在线猫猫" : "Neko 本猫"}，按回车或空格戳一下`;
}

/** 手机上：按住不动到点才进入拖拽，这期间挪开或抬手都当成滚页面。
    onlyScroll 是「这一下只许滚页面、不许拎」：演出中或者页面刚滚过时按下来的手，
    多半是想滑页面而不是想拎猫 —— 但手势还得接过来（卡片的 touch-action 是 none，
    浏览器不会替我们滚），所以只把「拎」这一步省掉，滑出去照样滚页面 */
function holdToDrag(
  event: PointerEvent,
  card: CardSpec,
  slot: HTMLElement,
  handle: HTMLElement,
  onlyScroll = false
): void {
  window.clearTimeout(touchHoldTimer);
  window.clearTimeout(armTimer);
  touchHoldAt = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, slot };
  if (!onlyScroll) {
    // 按住的这几百毫秒里卡片先微微抬起来：「按住能拎」这件事得让人看得出来。
    // 但要等一小会儿再抬 —— 立刻抬就把「点击」那一下的按下反馈盖掉了（见 ARMING_DELAY_MS）
    armTimer = window.setTimeout(() => {
      if (touchHoldAt?.slot === slot) slot.dataset.arming = "true";
    }, ARMING_DELAY_MS);
    touchHoldTimer = window.setTimeout(() => {
      touchHoldAt = null;
      if (drag) return;
      delete slot.dataset.arming;
      beginDrag(event, card, slot, handle);
      // 手上轻轻震一下，有个「抓住了」的分界（安卓有，iOS 没这能力就算了）
      navigator.vibrate?.(12);
    }, TOUCH_HOLD_MS);
  }
  // 先把指针接管过来：手指滑出卡片也收得到消息，好及时判断人家其实是想滚页面
  // （卡片身上的 touch-action: none 已经把整段手势交给我们了，浏览器不会再抢）
  try {
    handle.setPointerCapture(event.pointerId);
  } catch {
    // 抓不到就交给冒泡上来的事件处理，不影响的
  }
}

/** 真的把卡片拿起来：鼠标按下、或者手指按住够久了，都走这儿 */
function beginDrag(
  event: PointerEvent,
  card: CardSpec,
  slot: HTMLElement,
  handle: HTMLElement
): void {
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
    // 时间取此刻的 performance.now()，不取这个 event 的时间戳：手指那条路是按住
    // 180 毫秒后才拿着当初的 pointerdown 事件进来的，用那个旧时间戳当分母，
    // 第一帧算出来的速度趋近于 0，甩动的角度也就一直是 0
    lastMoveAt: performance.now(),
    baseLeft: rect.left,
    baseTop: rect.top,
    width: rect.width,
    height: rect.height,
    shiftX: 0,
    shiftY: 0,
    clamped: false,
    touch: event.pointerType !== "mouse",
  };
  dragPointer.x = event.clientX;
  dragPointer.y = event.clientY;
  // 滚动基准从这里起算：拖动中页面一滚就要把手上的位移补回来（见 compensateScroll）
  lastScrollY = window.scrollY;
  // 手指点得太快时指针可能已经抬起了，抓不到就按没抓到继续走
  try {
    handle.setPointerCapture(event.pointerId);
  } catch {
    // 交给冒泡上来的事件处理，不影响的
  }
  draggingId.value = card.id;
  // 这张卡要是正停在某个落点上「把话说完」（见 lingerAfterDrop），又被拎起来了：那笔停留作废。
  // 不清掉的话，定时器到点会去清位移 —— 而那时它已经被拖着走了，卡片会当场弹回原位。
  // 位移留着，所以它接着从眼下这个位置跟手；另一张的停留不归这次管，它自己会到点回位
  if (dropLingerCardId === card.id) clearDropLinger();
  // 它要是正走在「被收走」的路上（跳转位那 320 毫秒、寄养处那 2.6 秒），那两笔账一起作废：
  // 卡已经在人手上了。不作废的话，它会带着收走动画的样子被拖着走（`data-retired` 那段
  // 正是 opacity 0 的隐形区间），到点还会突然冒出来说一句寄养台词、甚至把页面带走
  cancelCarry(card.id);
  cancelRetire(card.id);
  dragTrack.reset(event.clientX);
  // 新的一轮命中测试：把上一轮记的测试时刻作废，第一帧该测就测
  dropHitAt = 0;
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
  // 松手、被接住、被取消三条路都从这儿出去：自动滚页的循环也归拖拽的生命周期管
  stopEdgeScroll();
  drag = null;
  if (!keepSpeech) talk.hush();
  lightDrop(null);
}

/** 收拾拖拽现场：卡片被搬到隔壁窗口、或者落在落点上时用，都不留回弹 */
function releaseDrag(keepSpeech = false): void {
  if (!drag) return;
  // 位移、角度、气泡朝向一起收（就是 restoreCard 那套），顺带把归位这一路的层级抬起来 ——
  // 松手回的如果是页面下方的原位，途中一样会被浮层盖住
  restoreCard(drag.cardId);
  dropRelease(keepSpeech);
}

/** 中止这次拖拽，只收拾现场：浏览器把手势抢走、指针消息丢了的时候用。
    不跑落点判定、不换位、也不换页 —— 那些情况下人手已经不在猫身上了。
    drag 是空的时候也能调：那多半只是还有一根手指在等长按，收掉就好 */
function abortDrag(): void {
  cancelHold();
  // 在卡片上滚页面那条路也一并收掉：窗口失焦这类情况手指不会再回来了，惯性也不该再滑
  pageScroll = null;
  stopGlide();
  if (drag) {
    // 猫正飘在隔壁的屏幕上：这张卡得放回来，不然它就永远留在对面了
    setRoaming(false, drag.cardId);
    // 位移与角度一并清掉：过渡会把卡片送回原位，不留下一帧甩出来的歪角
    restoreCard(drag.cardId);
  }
  // 释放指针捕获、清掉手上这张卡
  dropRelease();
  lightDrop(null);
  show.resume();
}

/** 拎到跳转位上松手后，隔这么久才真的换页：先让人看清猫被收进去那一下 */
const CARRY_MS = 320;
/** 寄养：收进去多久之后自己爬回来 */
const RETIRE_MS = 2600;
/** 猫被放到回顶按钮上之后，隔这么久才真的滚上去：先让它那句「我送你上去」说完 ——
    立刻滚的话舞台转眼就出了视野，那句刚出口就被闭麦了 */
const TOP_SCROLL_MS = 700;
/** 猫被带去哪个页面，先记在本地，到站那边（CardCourier）认出来再演一段 */
const CARRIED_KEY = "neko-carried";
/** 「放上回顶按钮」那笔延后的滚动，卸载时得收掉（不然换了页还在滚） */
let topScrollTimer = 0;

let dropLit: HTMLElement | null = null;
/** 命中测试的节流现场：按「卡片中心挪了多少」算，挪得少就不用每帧去问一次 elementFromPoint
    （指针坐标不行：自动滚页时指针没动，卡片底下的落点却换了） */
let dropHitAtX = 0;
let dropHitAtY = 0;
let dropHitAt = 0;
/** 「被跳转位收走、正等着换页」与「被寄养处收走、正等着爬回来」的卡，各按卡 id 记定时器。
    以前是一个全局句柄：320 毫秒内把第二张卡丢出去时，第一张的收尾被顶掉，
    而 data-carried / data-retired 是 forwards 动画的状态，没人清就永远缩在那里 */
const carryTimers = new Map<string, number>();
const retireTimers = new Map<string, number>();

/** 落在什么上：自己标了 `data-drop` 的落点优先（那几处有专门的行为），
    没有就按元素类别归一个泛化落点 —— 首页上任何元素都接得住。
    kind 于是有两套来源：`feat` / `recent` / `goto` / `bin` / `title` 那套，
    与 `link` / `heading` / … 这套（category 非空就说明走的是泛化那条路） */
interface DropHit {
  el: HTMLElement;
  kind: string;
  category: DropCategory | null;
}

/** 命中的元素多半是 HTML，可导航栏的画笔图标、公告的关闭叉、CTA 胶囊里的小图标都是内联 SVG ——
    `<svg>` / `<path>` 不是 HTMLElement，得往上找到最近那层 HTML 容器当反馈对象。
    少了这一步，压在这些图标上一点反应都没有，而旁边挪 20 像素又有 */
function nearestHtml(el: Element): HTMLElement | null {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (node instanceof HTMLElement) return node;
  }
  return null;
}

/** 泛化兜底给的「最近一块容器」可能大得离谱 —— 首页上就是整块 hero、整段首页。
    压在整屏大小的东西上等于什么都没压着：点亮会给整屏描一圈蓝框，说的那句也毫无意义。
    阈值取视口面积的 0.6 倍：真当落点的板块（功能卡、最近更新的一条）都远在这之下 */
const OTHER_MAX_AREA_RATIO = 0.6;

function tooBigForOther(el: HTMLElement): boolean {
  const { width, height } = el.getBoundingClientRect();
  return width * height > window.innerWidth * window.innerHeight * OTHER_MAX_AREA_RATIO;
}

/** 指针这会儿压在什么上（没压着就是 null）。落点自己在 DOM 上标 data-drop，其余靠归类。
    blocked 表示这点压在卡片槽位上 —— 那是换位的地盘，别再往下找。
    被拎着的那张自己也算：它挂着 pointer-events: none，elementFromPoint 返回不到它，
    所以「落到自己身上」这一类本来就不该有，一律按换位处理 */
function probeAt(x: number, y: number): { hit: DropHit | null; blocked: boolean } {
  const found = document.elementFromPoint(x, y);
  if (!(found instanceof Element)) return { hit: null, blocked: false };
  const marked = found.closest<HTMLElement>("[data-drop]");
  if (marked) return { hit: { el: marked, kind: marked.dataset.drop ?? "", category: null }, blocked: false };

  if (found.closest(".home-live-slot")) return { hit: null, blocked: true };

  const html = nearestHtml(found);
  const resolved = html ? resolveDropTarget(html) : null;
  if (!resolved) return { hit: null, blocked: false };
  // 兜底那一类再收一道口：块太大就当这儿什么都没压着
  if (resolved.category === "other" && tooBigForOther(resolved.el)) {
    return { hit: null, blocked: false };
  }
  return {
    hit: { el: resolved.el, kind: resolved.category, category: resolved.category },
    blocked: false,
  };
}

/** 卡片中心那点落在什么上。有两种情况要改看指针那一点：
    ① 位移被贴边限位削过（卡片被顶在窗口边上、手还在往外推）—— 这时候中心已经不再跟着手走，
       而导航栏、回顶按钮钉在视口边上，功能卡里那行小字又窄，中心永远够不到，指针那一点才是指哪儿打哪儿；
    ② 中心那点认不出是什么（空白、认不出的容器），指针这一路能兜住，
       但它**只认归类出来的落点**，自己标了 data-drop 的不算 ——
       那几处要维持「猫压住哪儿就是哪儿」，不然又回到「手指压在落点上、猫其实在别处」 */
function dropUnder(x: number, y: number): DropHit | null {
  const center = probeAt(x, y);
  if (center.blocked) return null;

  const pointed = probeAt(dragPointer.x, dragPointer.y).hit;
  if (pointed) {
    if (drag?.clamped) return pointed;
    const weakCenter = !center.hit || center.hit.category === "other";
    if (weakCenter && pointed.category != null && pointed.category !== "other") return pointed;
  }
  return center.hit;
}

/** 点亮/熄灭落点。用 dataset 而不是 class：这两处的 class 都由 Vue 说了算，加了会被冲掉。
    泛化落点还要带上类别，CSS 照着它决定弹哪一下 */
function lightDrop(hit: DropHit | null): void {
  const el = hit?.el ?? null;
  if (el === dropLit) return;
  if (dropLit) {
    delete dropLit.dataset.dropLit;
    delete dropLit.dataset.dropKind;
  }
  dropLit = el;
  if (dropLit && hit) {
    dropLit.dataset.dropLit = "true";
    dropLit.dataset.dropKind = hit.kind;
  }
}

/** 每个落点自己那个「刚接住」的计时器：同一点连中两次要撤掉上一个，
    不然前一个会把后一个的弹一下提前掐灭 */
const dropTimers = new WeakMap<HTMLElement, number>();

/** 落点接住了：给一下短促的反馈，让手感落地。
    泛化落点连类别一起写上 —— CSS 靠 `data-drop-kind` 决定弹哪一下 */
function flashDrop(el: HTMLElement, kind = el.dataset.drop ?? "other"): void {
  window.clearTimeout(dropTimers.get(el));
  el.dataset.dropKind = kind;
  el.dataset.dropHit = "true";
  dropTimers.set(
    el,
    window.setTimeout(() => {
      delete el.dataset.dropHit;
      // 泛化落点的类别也一起收掉：它只是这一下的反馈标记，留着没意义
      if (!el.dataset.drop) delete el.dataset.dropKind;
    }, 600)
  );
}

/** 泛化落点该说哪句：交给说话那边那个「说过的账本」挑最久没说过的 ——
    这里只把池子递过去，不再自己记上一句（本地那份只认得住同一处，来回拖两下又开始复述） */
function anyLine(card: CardSpec, category: DropCategory): string {
  return talk.pickFresh(anyDropLines(card.kind, category));
}

/** 这个落点该说哪句：功能卡按功能名查表，最近更新是现编的，泛化落点按类别挑一句。
    台词按卡种分层 —— 在线猫猫说的是统计那摊子事，别让它念猫的话 */
function dropLine(hit: DropHit, card: CardSpec): string {
  if (hit.category) return anyLine(card, hit.category);
  const { el, kind } = hit;
  if (kind === "feat") return dropLineFor(card.kind, el.dataset.dropKey ?? "");
  if (kind === "recent") {
    const message = el.querySelector(".home-recent-message")?.textContent?.trim() ?? "";
    return message ? recentLine(message, card.kind) : "";
  }
  return dropLineFor(card.kind, kind);
}

/** 卡片归位那一下的时长（与 .home-live-slot 上 translate 的 0.55s 对齐）：
    层级要等它走完才撤，页面也照着这个时长往回滚 */
const RESTORE_TRANSITION_MS = 550;
/** 每张卡「归位期间抬着层级」那笔收尾 */
const zRestoreTimers = new Map<string, number>();

/** 把这一格抬到页面浮层之上，等归位过渡走完再撤。
    撤早了的话整段归位它都被页面里那些浮层盖着（贴着导航栏那一下尤其明显）——
    用户看到的是「猫凭空不见了」，而不是「慢慢走回来」 */
function keepSlotOnTop(slot: HTMLElement, cardId: string): void {
  slot.style.zIndex = DROP_LINGER_Z;
  window.clearTimeout(zRestoreTimers.get(cardId));
  zRestoreTimers.set(
    cardId,
    window.setTimeout(() => {
      zRestoreTimers.delete(cardId);
      // 这中间它又停到别处、或者又被拎起来了：层级归那边管，这儿别乱撤
      if (dropLingerCardId === cardId || drag?.cardId === cardId) return;
      slot.style.zIndex = "";
    }, RESTORE_TRANSITION_MS)
  );
}

/** 把一张卡从「被收走」的动画里放出来：那两条动画都是 forwards 的，
    不主动把标记和行内位移清掉，这张卡就一直停在缩没的状态上 */
function restoreCard(cardId: string): void {
  const slot = slotEls.get(cardId);
  if (!slot) return;
  delete slot.dataset.carried;
  delete slot.dataset.retired;
  slot.style.translate = "";
  slot.style.rotate = "";
  // 贴着屏幕顶时气泡临时翻到了下面（见 syncBubbleSide），回位也还原成默认朝上
  delete slot.dataset.bubbleBelow;
  // 停在落点上时抬过层级（见 lingerAfterDrop），也要还原 —— 但得等它滑回原位再撤
  keepSlotOnTop(slot, cardId);
}

/** 上一张还在被收走的路上的卡先复原（同一张卡重来时除外）：
    它那笔收尾马上要被这次的定时器顶掉，不收拾就永远留在手里 */
function restoreOtherCards(timers: Map<string, number>, keepCardId: string): void {
  for (const [cardId, timer] of [...timers]) {
    if (cardId === keepCardId) continue;
    window.clearTimeout(timer);
    timers.delete(cardId);
    restoreCard(cardId);
  }
}

/** 说完落点那句话之后，卡片额外再多留一会儿再回原位：气泡刚收就飞走会显得很赶 */
const DROP_LINGER_EXTRA_MS = 600;
/** 停在落点上的这一格要抬到多高：页面里那些浮层（公告、最近更新……）都在这之下，
    不抬起来的话卡片和气泡会被它们压在下面，用户看不到猫说了什么 */
const DROP_LINGER_Z = "6";
/** 卡片离视口顶这么近，气泡就得翻到下面去：往上那点地方已经被屏幕边和导航栏占掉了 */
const BUBBLE_FLIP_TOP = 104;

/** 卡片贴着视口最上面时（拖到导航栏那一带、或者把导航栏当落点停下来），
    气泡挂在卡片上方会被裁掉 —— 掉个头挂到下面来。判定看卡片自己的位置，不看手在哪 */
function syncBubbleSide(slot: HTMLElement, cardTop: number): void {
  const below = cardTop < BUBBLE_FLIP_TOP;
  // 拖拽时每帧都会走到这儿，只在真变了才动 DOM
  if (below === (slot.dataset.bubbleBelow === "true")) return;
  if (below) slot.dataset.bubbleBelow = "true";
  else delete slot.dataset.bubbleBelow;
}

/** 眼下正停在落点上「把话说完」的那张卡、那笔收尾，以及它家在哪一行（文档坐标） */
let dropLingerCardId = "";
let dropLingerTimer = 0;
let dropLingerHomeTop = 0;

/** 松手那一刻，这张卡的原位（文档流里那个位置，不含手上的位移）还在屏幕上吗。
    手机上把卡片拖到页面靠下的元素上时，原位早跟着页面滚出视口上方了 ——
    这时候立刻回位，等于这句台词说给空气听 */
function homeOffscreen(): boolean {
  if (!drag) return false;
  // baseTop 是拎起来时记下的原位，页面滚动时 compensateScroll 会跟着补，所以它始终是「现在的原位」
  return drag.baseTop + drag.height < 0 || drag.baseTop > window.innerHeight;
}

/** 卡片先留在落点上别回去，把这句话说完（停留时长与气泡的可见时长一模一样）再自己滑回原位 */
function lingerAfterDrop(cardId: string, line: string): void {
  const slot = slotEls.get(cardId);
  if (!slot) return;
  // 上一张还停着（比如刚把另一张丢在别处）：先把它送回原位再接管。
  // 直接 clearDropLinger 的话，那笔停留的定时器被清了、位移却没人清 ——
  // 那只猫会永久半悬在落点那一带，直到被搬去隔壁或者刷新
  if (dropLingerCardId && dropLingerCardId !== cardId) restoreCard(dropLingerCardId);
  clearDropLinger();
  dropLingerCardId = cardId;
  // 角度先归正：留在那儿说话的时候歪着脖子不像话（位移留着，位置稳稳停在落点上）
  slot.style.rotate = "";
  slot.style.zIndex = DROP_LINGER_Z;
  // 顺手把「家在哪一行」记下来（文档坐标）：说完话要把页面一块儿滚回去，
  // 不然卡片是滑到屏幕外面去了 —— 用户眼里它就是凭空消失。
  // 顺带看一眼它是不是贴着屏幕顶（把导航栏当落点就是这样），是就把气泡翻到下面
  const box = slot.getBoundingClientRect();
  const lift = drag?.touch ? DRAG_LIFT_PX : 0;
  dropLingerHomeTop = box.top + window.scrollY - (drag?.shiftY ?? 0) + lift;
  syncBubbleSide(slot, box.top);
  dropLingerTimer = window.setTimeout(() => {
    const lingering = dropLingerCardId;
    dropLingerTimer = 0;
    dropLingerCardId = "";
    // 页面往回走与卡片归位（.home-live-slot 上那 0.55 秒过渡）同时开始、同一个时长：
    // 看起来就是猫自己跑回家、镜头一路跟着它。落在视口上方三分之一处，
    // 卡片上面那句话气泡也一起进画面
    const home = Math.max(0, dropLingerHomeTop - window.innerHeight * 0.32);
    if (Math.abs(window.scrollY - home) > 24) glidePageTo(home, RESTORE_TRANSITION_MS);
    restoreCard(lingering);
  }, speechLingerMs(line) + DROP_LINGER_EXTRA_MS);
}

/** 那笔停留不作数了（卡片又被拎起来、或者已经自己回了原位） */
function clearDropLinger(): void {
  if (dropLingerTimer) window.clearTimeout(dropLingerTimer);
  dropLingerTimer = 0;
  dropLingerCardId = "";
}

/** 把一张卡欠着的那笔换页账清掉并让它复原：卡已经不在手上了（被隔壁要走、被销毁、
    又回到自己手里），再让它过 320 毫秒把页面带跳走就是错的了 */
function cancelCarry(cardId: string): void {
  const timer = carryTimers.get(cardId);
  if (timer === undefined) return;
  window.clearTimeout(timer);
  carryTimers.delete(cardId);
  restoreCard(cardId);
}

/** 寄养那笔收尾作废：卡片又被拎起来了，别让它带着退场动画（半透明、缩没）被拖在手上，
    也别让它在两秒多后突然冒出来说一句寄养台词（见 beginDrag） */
function cancelRetire(cardId: string): void {
  const timer = retireTimers.get(cardId);
  if (timer === undefined) return;
  window.clearTimeout(timer);
  retireTimers.delete(cardId);
  restoreCard(cardId);
}

/** 拎到跳转位上松手：猫被那个按钮收进去，然后带着它一起换页 */
function carryAway(card: CardSpec, to: string, el: HTMLElement): void {
  const slot = slotEls.get(card.id);
  if (!slot) return;
  restoreOtherCards(carryTimers, card.id);
  flashDrop(el);
  slot.dataset.carried = "true";
  try {
    // 记是被哪张卡带过去的：到站那边照着这个挑头像和口吻
    window.sessionStorage.setItem(CARRIED_KEY, card.kind);
  } catch {
    // 隐私模式存不了，那就只是少演一段「到站」
  }
  window.clearTimeout(carryTimers.get(card.id));
  carryTimers.set(
    card.id,
    window.setTimeout(() => {
      carryTimers.delete(card.id);
      void router.push(to);
    }, CARRY_MS)
  );
}

/** 寄养处：把卡收进去，过一会儿它自己爬回来，还得吐槽一句 */
function retireCard(card: CardSpec): void {
  const slot = slotEls.get(card.id);
  if (!slot) return;
  restoreOtherCards(retireTimers, card.id);
  slot.dataset.retired = "true";
  window.clearTimeout(retireTimers.get(card.id));
  retireTimers.set(
    card.id,
    window.setTimeout(() => {
      retireTimers.delete(card.id);
      delete slot.dataset.retired;
      talk.sayLine(card, dropLineFor(card.kind, "bin"));
    }, RETIRE_MS)
  );
}

/** 松手放在落点上的结果：接住了没有，以及卡片要不要先留在原地把那句话说完 */
interface DropResult {
  taken: boolean;
  lingers: boolean;
}

/** 松手把卡放在落点上：真接住了 taken 为真，接不住就当没这回事、卡片自己弹回原位 */
function useDrop(hit: DropHit, card: CardSpec): DropResult {
  const { el, kind } = hit;

  if (kind === "goto") {
    const to = el.dataset.dropTo;
    if (!to) return { taken: false, lingers: false };
    carryAway(card, to, el);
    return { taken: true, lingers: false };
  }

  if (kind === "bin") {
    flashDrop(el, kind);
    retireCard(card);
    return { taken: true, lingers: false };
  }

  const line = dropLine(hit, card);
  if (!line) return { taken: false, lingers: false };
  flashDrop(el, kind);
  talk.sayLine(card, line);
  // 回顶按钮：它本来就是干这个的，只是平时用鼠标点；猫放上去就真的把页面送回顶部。
  // 让它先把那句说完 —— 立刻滚的话舞台转眼出了视野，话刚出口就被闭麦
  const toTop = isBackToTop(el);
  if (toTop) {
    window.clearTimeout(topScrollTimer);
    topScrollTimer = window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, TOP_SCROLL_MS);
  }
  // 这句话说完之前卡片先别回去 —— 但只在「回去之后没人看得见」时才留：
  // 原位还在屏幕上（桌面、手机拖到同屏的元素）就照旧立刻回位，别平白把节奏拖慢。
  // 回顶按钮也除外：它过一会儿就把页面滚回顶部，卡片原位自然进视野
  const lingers = !toTop && homeOffscreen();
  if (lingers) lingerAfterDrop(card.id, line);
  return { taken: true, lingers };
}

/** 手上这张卡的中心这会儿落在屏幕哪儿：落点判定一律用它。
    以前用手指坐标，而手指拎起来的卡片浮在手指上方 30 像素，
    于是「猫明明压着落点却不亮」和「手指压在落点上、猫其实在别处」两种错位都会出现。
    叠猫猫与换位本来就是按卡片几何算的，统一到卡片中心，看见猫压住哪儿就是哪儿 */
function heldCenter(): { x: number; y: number } | null {
  if (!drag) return null;
  const lift = drag.touch ? DRAG_LIFT_PX : 0;
  return {
    x: drag.baseLeft + drag.shiftX + drag.width / 2,
    y: drag.baseTop + drag.shiftY - lift + drag.height / 2,
  };
}

/** 卡片压在哪个落点上就点亮哪个（没压着就灭）。拖动中随手指更新、贴边自动滚页时也调用 */
function refreshDropLight(): void {
  const center = heldCenter();
  if (!center) {
    lightDrop(null);
    return;
  }
  const now = performance.now();
  const moved = Math.hypot(center.x - dropHitAtX, center.y - dropHitAtY);
  if (moved < HIT_MIN_PX && now - dropHitAt < HIT_MIN_MS) return;
  dropHitAtX = center.x;
  dropHitAtY = center.y;
  dropHitAt = now;
  lightDrop(dropUnder(center.x, center.y));
}

/** 贴边自动滚页：拖拽被锁在视口里，不给页面滚动的话窄屏上根本够不到寄养处那些落点。
    每帧按手到上下边缘的距离算一次速度，手停在边上就一直滚，挪开或滚到头就停 */
let edgeScrollFrame = 0;
let edgeScrollAt = 0;

function stopEdgeScroll(): void {
  if (!edgeScrollFrame) return;
  cancelAnimationFrame(edgeScrollFrame);
  edgeScrollFrame = 0;
}

function edgeScrollStep(): void {
  edgeScrollFrame = 0;
  const now = performance.now();
  // 卡片正飘在别的窗口的地盘上、或者已经松手了：这一轮到这儿为止
  if (!drag || roamingIds.value.includes(drag.cardId)) return;

  const speed = edgeScrollSpeed(dragPointer.y, window.innerHeight);
  const top = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const room = speed < 0 ? top : max - top;
  // 出了边缘区、或者已经在顶/底没得可滚：停下别空转，回到边缘区会由 pointermove 再拉起来
  if (speed === 0 || room <= 0) return;

  // 低帧率下按实际帧间隔折算（封顶两帧，切后台回来别一下窜出老远）；
  // 「减少动效」也照常能用 —— 拖拽是手带出来的操作，不是装饰动画，只是慢一点
  const elapsed = Math.min(now - edgeScrollAt, EDGE_SCROLL_FRAME_MS * 2);
  const slowdown = reduceMotionQuery?.matches ? 0.6 : 1;
  edgeScrollAt = now;
  scrollWindowBy((speed * elapsed * slowdown) / EDGE_SCROLL_FRAME_MS);
  // 立刻补位移，不等 scroll 事件（那个要慢一帧，卡片会跟手脱节一下）
  compensateScroll();
  // 页面滚了，卡片底下的东西就换了：高亮跟着重算
  refreshDropLight();
  edgeScrollFrame = requestAnimationFrame(edgeScrollStep);
}

/** 手进没进边缘带：进了就保证滚动循环在跑，出了就立刻停 */
function updateEdgeScroll(): void {
  if (!drag || edgeScrollSpeed(dragPointer.y, window.innerHeight) === 0) {
    stopEdgeScroll();
    return;
  }
  if (edgeScrollFrame) return;
  edgeScrollAt = performance.now();
  edgeScrollFrame = requestAnimationFrame(edgeScrollStep);
}

function onPointerMove(event: PointerEvent): void {
  // 手指已经在卡片上滑起来了：这一下是滚页面，不拎猫
  if (pageScroll && event.pointerId === pageScroll.pointerId) {
    scrollPageWith(event);
    return;
  }
  // 还在等长按：手指挪开了就说明人家是想滚页面，从这一下起自己滚
  if (touchHoldAt && event.pointerId === touchHoldAt.pointerId) {
    const moved = Math.hypot(event.clientX - touchHoldAt.x, event.clientY - touchHoldAt.y);
    if (moved > TOUCH_SLOP_PX) beginPageScroll(event);
    return;
  }
  if (!drag || event.pointerId !== drag.pointerId) return;
  dragPointer.x = event.clientX;
  dragPointer.y = event.clientY;

  const now = performance.now();
  const rawX = event.clientX - drag.startX;
  const rawY = event.clientY - drag.startY;
  // 能实时漫游时让卡片跟着手真的跑出窗口（跨屏要的就是这个），
  // 撑不住高频消息就还按老办法限制在窗口里，顶到边上再交给隔壁
  const freeRoam = peerLink.liveRoam && peerLink.hasPeers();
  const slack = !freeRoam && peerLink.hasPeers() ? HANDOFF_PUSH_PX : 0;
  // 手指拎的往上浮一截：不然手指肚正好盖住要丢的那个地方，什么都看不见
  const lift = drag.touch ? DRAG_LIFT_PX : 0;
  const dx = freeRoam
    ? rawX
    : limitShift(rawX, drag.baseLeft, drag.width, window.innerWidth, slack);
  const dy = freeRoam
    ? rawY
    : limitShift(rawY, drag.baseTop, drag.height, window.innerHeight, slack, DRAG_TOP_MARGIN);
  drag.shiftX = dx;
  drag.shiftY = dy;
  // 贴边限位削过位移就记一笔：卡片中心已经不再跟着手走，落点判定要改看指针那一点
  drag.clamped = dx !== rawX || dy !== rawY;

  // 卡片飘到别人地盘上了就把自己那张收起来，位置实时报给各个窗口接力
  if (freeRoam) {
    const point = cardPointAbs(drag, dx, dy);
    const owner = peerLink.ownerAt(point.x, point.y);
    const roaming = owner !== null && !owner.self;
    setRoaming(roaming, drag.cardId);
    // 还在自己地盘上就别广播了：两个窗口叠在一起时，同一只猫会在两个窗口里同时出现
    if (roaming) {
      // 猫已经不在本窗口了：落点那点亮光先灭掉，别让它一直亮着
      lightDrop(null);
      reportRoam(point);
    }
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

  // 拎着卡片扫过首页别处：压在哪个落点上就点亮哪个，手挪开就灭。
  // 这一下要读一次布局（elementFromPoint 是强制同步布局），所以排在写位移之前 ——
  // 排在后面就成了「写样式、再读布局」，浏览器得为它把整页重排一遍
  if (!roamingIds.value.includes(drag.cardId)) refreshDropLight();

  // 位置直接给到手上，拖尾和回弹交给样式里的过渡，掉帧也不会变形
  drag.slot.style.translate = `${dx}px ${dy - lift}px`;
  // 拎到导航栏那一带时气泡要翻到卡片下面，不然它挂在上面正好被屏幕边切掉
  syncBubbleSide(drag.slot, drag.baseTop + dy - lift);

  // 顺手数一数彩蛋：摇猫猫、遛猫
  if (dragTrack.shake(event.clientX, Date.now())) markEgg("cardShake");
  if (dragTrack.walk(dx, dy)) markEgg("cardWalk");

  // 手把卡片带到屏幕边上就自动滚页（下一句那条「减少动效」会提前 return，
  // 所以这个调用必须排在它前面，不然省电模式下页外那些落点永远够不到）
  updateEdgeScroll();

  // 甩得越快歪得越厉害，手一停角度自己荡回来，看着就像被拎着的猫
  if (reduceMotionQuery?.matches) return;

  const elapsed = Math.max(now - drag.lastMoveAt, 1);
  const speed = (event.clientX - drag.lastX) / elapsed;
  drag.lastX = event.clientX;
  drag.lastMoveAt = now;

  drag.slot.style.rotate = `${leanFromSpeed(speed).toFixed(2)}deg`;
}

function onPointerUp(event: PointerEvent): void {
  // 这一下从头到尾都是滚页面：抬手只把惯性交给它，不落点、不换位、也不拎猫
  if (pageScroll && event.pointerId === pageScroll.pointerId) {
    glideAway();
    return;
  }
  // 还在等长按：抬手就是一次普通点击，不是拎
  if (touchHoldAt && event.pointerId === touchHoldAt.pointerId) cancelHold();
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
  // 松手压在首页某个落点上：交给落点，卡片自己弹回原位。
  // 压没压着看卡片中心，跟拖动中点亮高亮用的是同一个点
  const dropped = liveCards.value.find((item) => item.id === cardId);
  const center = heldCenter();
  const target = dropped && center ? dropUnder(center.x, center.y) : null;
  // 泛化落点给「换位」让路：卡片中心正压在另一张卡上时，那是要换位 ——
  // 这时候 hitTest 可能只看得见盖在上面的浮层（公告、更新卡），别用一个泛化落点把它抢了
  const swapWins = target?.category != null && reorderTarget(slot, cardId) !== null;
  const drop = dropped && target && !swapWins ? useDrop(target, dropped) : null;
  if (dropped && target && drop?.taken) {
    // 被跳转位收进按钮的那张留在原地，别回弹；其它落点都让它跳回原位。
    // 两个都要留住刚落点说的那句，收尾别出声
    if (target.kind === "goto") {
      // 留在原地的是卡片，不是拖拽留下的行内位移：位移和角度得清掉，
      // 不然换页被取消（接着又丢了张卡到别处）时那张卡会带着残留偏移停在半路
      slot.style.translate = "";
      slot.style.rotate = "";
      dropRelease(true);
    } else if (drop.lingers) {
      // 这句话还没说完，而且回位之后没人看得见：卡片先原地停着，到点由 lingerAfterDrop 送回去。
      // 位移得留着 —— 所以走 dropRelease（只收跟手状态）而不是 releaseDrag（那个会把位移清掉）
      dropRelease(true);
    } else {
      releaseDrag(true);
    }
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
  // 这条松手路径不走 dropRelease，滚页循环与落点高亮都得自己收
  stopEdgeScroll();
  drag = null;
  // 高亮不灭的话那个元素会一直亮着、一直放大，而且下次扫到它连点亮都不做了
  // （lightDrop 看见「还是它」就直接返回）—— 上面几条走 dropRelease 的路径都顺手灭了，这条漏了
  lightDrop(null);

  // 刚被拎起来玩过，过一小会儿就让它们嘀咕两句——趁这会儿还记得
  talk.lingerSpeech();
  talk.markDragged();

  show.resume();
}

/** 指针被浏览器抢走了（手机上竖向拖动会被接管成滚动页面）：
    只收拾现场，不落点、不换位、也不换页 —— 那一下本来就不是在丢猫 */
function onPointerCancel(event: PointerEvent): void {
  // 卡片上那次滚页面被系统打断了（来电、手势被系统收走）：就地停住，不给惯性
  if (pageScroll && event.pointerId === pageScroll.pointerId) {
    pageScroll = null;
    stopGlide();
  }
  if (touchHoldAt && event.pointerId === touchHoldAt.pointerId) cancelHold();
  // 另一根手指的取消别去打断手上这张卡
  if (!drag || event.pointerId !== drag.pointerId) return;
  abortDrag();
}

/** 兜底：指针消息未必送得到槽位上（拖出窗口外松手、按着的时候 Alt+Tab 走开、
    槽位被重排掉导致指针捕获被隐式释放）。真丢了的话 drag 会一直满着 ——
    此后所有卡都拎不起来、卡片停在拎着的样子上、演出也冻住，只能刷新。
    所以窗口上再挂一套，命中就照取消那套收拾现场。
    正常松手仍归 onPointerUp 管：这里是捕获阶段，本来排在它前面，
    所以要等这一轮事件派发走完再判断（同一根指针的松手，onPointerUp 会先把 drag 清掉） */
function onPointerEndFallback(event: PointerEvent): void {
  // 「在卡片上滚页面」那条路也在这儿兜：抬手要是没送到槽位上，pageScroll 会一直挂着，
  // 下一次按在任何地方都会被当成接着滚。
  // 「还在等长按」那条同样得兜 —— 手指按住的那 180 毫秒里槽位被隔壁搬走时，槽位上的
  // pointerup 就再也送不到了，而定时器到点照样会把 drag 建起来；那张卡是游离节点，
  // 之后所有指针消息都到不了它，两张卡从此都拎不起来
  const scrollId = pageScroll?.pointerId;
  const dragId = drag?.pointerId;
  const holdId = touchHoldAt?.pointerId;
  if (event.pointerId !== scrollId && event.pointerId !== dragId && event.pointerId !== holdId) {
    return;
  }
  window.setTimeout(() => {
    if (holdId !== undefined && touchHoldAt?.pointerId === holdId) cancelHold();
    if (scrollId !== undefined && pageScroll?.pointerId === scrollId) glideAway();
    if (dragId !== undefined && drag?.pointerId === dragId) abortDrag();
  }, 0);
}

/** 窗口失去焦点（切到别的应用、Alt+Tab）：指针消息不会再有下文了，直接收拾 */
function onWindowBlur(): void {
  if (drag || touchHoldAt || pageScroll) abortDrag();
}

onMounted(() => {
  // 挂载后再把卡片放出来：这一步是普通更新，不会跟预渲染的内容打架
  mounted.value = true;

  // 省电那一半静态模式也要：卡片摆着不动，那几条常驻无限动画照样在烧合成器
  watchStage();
  syncResting();
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pageshow", onPageShow);
  reduceMotionQuery?.addEventListener("change", onReduceMotionChange);

  // 静态模式到这儿就够了：演出、说话、歪头、串门这些排期一个都不排
  if (staticMode) return;

  // 心情的兜底时钟：不靠开口也能按时段换档（小字与状态灯跟着走）。
  // 必须排在上面那道早退之后 —— 静态模式根本不说话，每半分钟重算一次纯属白烧电
  window.clearInterval(moodTimer);
  moodTimer = window.setInterval(() => {
    if (!document.hidden) talk.refreshMood();
  }, MOOD_TICK_MS);

  scheduleNudge();

  // 观众手上在忙什么：划、点、敲键盘都算，滚页面另外记
  awayDays = readAwayDays();
  visitTimes = readVisitTimes();
  window.addEventListener("pointermove", noteActivity, { passive: true });
  window.addEventListener("keydown", noteActivity);
  window.addEventListener("pointerdown", noteActivity, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  // 指针消息丢了的兜底收尾（详见 onPointerEndFallback）
  window.addEventListener("pointerup", onPointerEndFallback, true);
  window.addEventListener("pointercancel", onPointerEndFallback, true);
  window.addEventListener("blur", onWindowBlur);

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
  // 跨窗口那条通道第一件就关掉：它排在最后的话，前面几十行清理里只要有一句抛异常，
  // 通道就留着、心跳还接着发 —— 新挂载的实例会把上一个实例当成一个「幽灵邻居」，
  // 于是出现「明明只开了一扇窗，隔壁却总有小脑袋探头」
  peerLink.stop();
  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.removeEventListener("pageshow", onPageShow);
  reduceMotionQuery?.removeEventListener("change", onReduceMotionChange);
  stageWatcher?.disconnect();
  window.clearInterval(moodTimer);
  window.clearTimeout(idleTimer);
  window.clearTimeout(greetTimer);
  window.clearTimeout(visitorTimer);
  window.clearTimeout(visitorHideTimer);
  window.clearTimeout(peerHintTimer);
  window.clearTimeout(roamerTimer);
  window.clearTimeout(touchHoldTimer);
  window.clearTimeout(armTimer);
  window.clearTimeout(topScrollTimer);
  // 停在落点上那笔「把话说完再回去」的收尾：组件都走了，别再回来动 DOM
  clearDropLinger();
  // 归位期间抬着层级的那几笔收尾也一样
  for (const timer of zRestoreTimers.values()) window.clearTimeout(timer);
  zRestoreTimers.clear();
  // 组件走了就别再滚页面：拖拽中切页时循环可能正跑着
  stopEdgeScroll();
  stopGlide();
  for (const timer of carryTimers.values()) window.clearTimeout(timer);
  carryTimers.clear();
  for (const timer of retireTimers.values()) window.clearTimeout(timer);
  retireTimers.clear();
  // 落点那点亮光留在别人的 DOM 上，走之前先灭掉
  lightDrop(null);

  // 下面这些只在非静态模式登记过、起过，静态模式下都是空跑，一并收掉最省心
  if (staticMode) return;
  window.removeEventListener("pointermove", noteActivity);
  window.removeEventListener("keydown", noteActivity);
  window.removeEventListener("pointerdown", noteActivity);
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("pointerup", onPointerEndFallback, true);
  window.removeEventListener("pointercancel", onPointerEndFallback, true);
  window.removeEventListener("blur", onWindowBlur);
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
  /* 刻意例外：这条带过冲的弹簧只留给「碰/撞/弹」那几段（碰头、扑上去、撞飞、击掌、惊跳、
     跳背、打滚、蹦跶）—— 回弹本身就是那几个动作的一部分 */
  --ease-play: cubic-bezier(0.34, 1.3, 0.64, 1);
  /* 其余段落统一走站内那条 --ease-out（带兜底值：取不到时整条 animation 会作废，动画干脆不跑）*/
  --play-ease: var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
  /* 两张卡的实际距离与「跨到对方另一侧」的距离：开演前由脚本量出来覆盖。
     兜底值取桌面并排时实测的那一对（槽宽 264 + 卡间距 22 = 286，跨到另一侧再加一个卡宽）*/
  --play-gap: 286px;
  --play-span: 550px;
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
  /* 「朝对方挪一点」的方向：横排是左右、竖排是上下（下面 data-layout="stacked" 那条会翻轴）。
     新增的对手戏一律用它算位移，这样两张卡上下摞着时（窄窗口那条带）不至于变成「左右错开」 */
  --meet-x: calc(var(--play-gap) * var(--play-dir));
  --meet-y: 0px;
  position: relative;
  display: flex;
  /* 基准取 236px：flex 换行按「假想主轴尺寸」判定，写 264 时要容器 550px 才排得下，
     561–597px 那条带就会掉成一上一下；由 grow 补回来，宽屏仍是 max-width 那 264 */
  flex: 1 1 236px;
  max-width: 264px;
  /* 松手后带着惯性飞回原位，角度还会多晃两下 */
  transition: translate 0.55s cubic-bezier(0.34, 1.3, 0.64, 1),
    rotate 0.62s cubic-bezier(0.34, 1.45, 0.64, 1),
    scale 0.4s cubic-bezier(0.34, 1.3, 0.64, 1), opacity 0.3s ease-out;
}

/* 键盘走到这张卡上（鼠标点出来的焦点不算，:focus-visible 自己管这件事）。
   用 outline 不用 transform：transform 会给 fixed 定位的后代另立包含块 */
.home-live-slot:focus-visible {
  outline: 2px solid var(--vp-c-accent, #096dd9);
  outline-offset: 3px;
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
  /* 跟手要 1:1：这里**不能**给 translate 加过渡。
     位置上加过渡，目标移动得越快就落后得越多（0.14s 的缓动，页面贴边自动滚页时
     目标每秒走六百来像素，卡片就落后八十来像素）—— 看着就是「手还捏着，猫已经飘走了」。
     角度与缩放留着缓动，抬起手的那一下才有弹的感觉 */
  transition: rotate 0.22s cubic-bezier(0.34, 1.5, 0.64, 1), scale 0.2s ease-out, opacity 0.3s ease-out;
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

/* 整块槽位都别给选：气泡挂在卡片外面，只禁卡片的话长按气泡照样会把文字选起来，
   iOS 还会顺手弹出「拷贝 / 查询」菜单；安卓点一下则闪一块灰底，卡片都不需要这些 */
.home-live-slot {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  /* 连戳两下以上是这块卡片的主要互动，得关掉双击缩放（pan-y 关不掉它）。
     放槽位这一层是取祖先交集：卡片那边写死了 none，槽位里的空隙仍能按原生那样滚 */
  touch-action: manipulation;
}

/* 两张卡都能拎：鼠标抓着走，手机上先按住再动。
   卡片身上**不让浏览器碰手势**（none）：写过 pan-y 的话，按住的那 180 毫秒里手指一动，
   浏览器就先一步把这段手势接管成滚页面，我们只收到一个 pointercancel ——
   表现就是「想拎猫，十次有八次变成滑页面」。关掉之后整段手势归我们，
   手指在卡片上上下滑改成自己滚页面（见 onPointerMove 那条 pageScroll） */
.home-live-card,
.home-live-cards :deep(.home-online) {
  cursor: grab;
  touch-action: none;
}

.home-live-slot.is-dragging .home-live-card,
.home-live-slot.is-dragging :deep(.home-online) {
  cursor: grabbing;
  /* 拎离地面的感觉：影子拉大拉远 */
  box-shadow: 0 20px 44px color-mix(in srgb, var(--vp-c-accent, #096dd9) 22%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* 被拎在手上：一直小幅晃，像拎着个活物。
   用 translate 属性，跟卡片自己的浮动（走 transform）各不影响 */
.home-live-slot.is-dragging .home-live-card,
.home-live-slot.is-dragging :deep(.home-online) {
  animation: neko-card-dangle 1.7s ease-in-out infinite;
}

@keyframes neko-card-dangle {
  0%,
  100% {
    translate: -1.6px 0;
  }

  50% {
    translate: 1.6px 0;
  }
}

/* 按住的那 180 毫秒：卡片先微微抬起、影子先出来一点 ——
   「按住才能拎」本来是个藏起来的操作，得让人看得出来 */
.home-live-slot[data-arming] .home-live-card,
.home-live-slot[data-arming] :deep(.home-online) {
  scale: 1.02;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--vp-c-accent, #096dd9) 15%, transparent);
  transition: scale 0.16s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)), box-shadow 0.3s ease;
}

/* 被戳了一下：卡片本体也按一下（跟状态灯闪那下同时发生）。
   正等着拎起来（[data-arming] 那 180 毫秒）与已经拎在手上时不算 ——
   这两处要的是「抬起来」，被戳的这 620 毫秒压过去就只剩按下去了。
   排除条件用 :where 裹着是为了不加特异性：后面 reduced-motion 那块
   得靠「同特异性 + 写在后面」才盖得住它 */
.home-live-slot[data-tapped]:where(:not([data-arming]):not(.is-dragging)) .home-live-card,
.home-live-slot[data-tapped]:where(:not([data-arming]):not(.is-dragging)) :deep(.home-online) {
  scale: 0.972;
  transition: scale 0.12s ease-out;
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
  /* 最长的一句有二十五六个字，nowrap 下一行要 330px，比卡片还宽 ——
     窄屏上两头会被视口裁掉一大截（#app 的 overflow-x: clip 只挡滚动条，不挡裁切）。
     限宽到槽位宽度内 + 允许换行：气泡最宽也就跟卡片一样，任何视口都不会出屏；
     它是绝对定位，折行只往上长，不会把卡片撑变形，也不会盖住卡片本体 */
  max-width: 100%;
  white-space: normal;
  line-height: 1.4;
  text-align: center;
  overflow-wrap: break-word;
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

/* 卡片贴到视口最上面那一带时（拎到导航栏上、或者把导航栏当落点停下来），
   气泡挂在上面正好被屏幕边和导航栏一起切掉 —— 掉个头挂到卡片下面，尖角也跟着掉头。
   影子方向一并翻过来，不然光是从上方来的，跟位置对不上 */
.home-live-slot[data-bubble-below] .home-live-bubble {
  bottom: auto;
  top: calc(100% + 9px);
  box-shadow: 0 -8px 20px color-mix(in srgb, var(--vp-c-accent, #096dd9) 16%, transparent);
}

.home-live-slot[data-bubble-below] .home-live-bubble::after {
  top: auto;
  bottom: 100%;
  translate: -50% 4px;
}

html.dark .home-live-bubble {
  border-color: rgba(255, 255, 255, 0.1);
  background: #262a33;
  /* 深色下主题把 accent 提到约 #2389f6，压在 #262a33 上只有 4.06:1；
     换成粉蓝渐变那一端的蓝，实测 6.5:1，色系也一致 */
  color: #7fb0ff;
}

/* 猫说的话给读屏留的那一份：视觉上收成一个点，不参与排版，也不依赖主题的 .sr-only */
.home-live-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
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

/* 对方在说话：听的那张轻轻点头回应。幅度只有说话那张的三分之一，
   但「一张卡对着另一张卡说」和「自己念叨」感受完全不同。
   相位跟说话那张错开，看起来是一句一答 */
.home-live-slot.is-listening:not(.is-dragging):not(.is-playing) .home-live-card {
  animation-name: home-live-in, neko-card-listen;
  animation-duration: 0.44s, 2s;
}

.home-live-slot.is-listening:not(.is-dragging):not(.is-playing) :deep(.home-online) {
  animation: neko-card-listen 2s ease-in-out 0.9s infinite;
}

@keyframes neko-card-listen {
  0%,
  100% {
    translate: 0 0;
  }

  45% {
    translate: 0 1.5px;
  }
}

/* 这句台词标了小动作：把点头换成那个动作。幅度不写死在这儿，交给下面 --g-* 那几个数，
   所以加动作只是加一行变量，不用复制整条 animation。
   动作是「一口气到位置再回原样」的一次性动画，演完就静止 —— 所以后面还挂着点头，
   等动作演完（延迟一个 --g-dur）接手接着点头。只挂动作的话，撑不到半秒卡片就不动了，
   而落点那句台词往往要挂好几秒，看着像说完就断电 */
.home-live-slot.is-talking:is([data-gesture]):not(.is-dragging):not(.is-playing) .home-live-card {
  animation-name: home-live-in, neko-card-gesture, neko-card-talk;
  animation-duration: 0.44s, var(--g-dur, 0.68s), 0.68s;
  animation-delay: 0s, 0s, var(--g-dur, 0.68s);
  animation-iteration-count: 1, 1, infinite;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1), ease-in-out, ease-in-out;
}

.home-live-slot.is-talking:is([data-gesture]):not(.is-dragging):not(.is-playing) :deep(.home-online) {
  animation-name: neko-card-gesture, neko-card-talk;
  animation-duration: var(--g-dur, 0.68s), 0.68s;
  animation-delay: 0s, var(--g-dur, 0.68s);
  animation-iteration-count: 1, 1, infinite;
  animation-timing-function: ease-in-out, ease-in-out;
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
  /* 头像不吃指针事件：手指按在头像上也算按着这张卡（否则安卓会把它当成「拖走这张图」，
     iOS 长按还会弹出「存储图像」那一套）。事件穿到卡片本体上，拖拽那几条判断才连得上 */
  pointer-events: none;
  -webkit-user-drag: none;
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
  /* 名字不加溢出保护的话，360px 起就压到指示灯上、320px 会被裁掉一半：
     overflow 一写，flex 项的最小尺寸也跟着降到 0，它能自己缩到省略号 */
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--vp-c-accent, #096dd9);
}

.home-live-meta {
  font-size: 11px;
  letter-spacing: 0.2px;
  /* 这行小字窄屏会折行：限死宽度，别让它把同排的在线卡一起撑高（卡片区是 stretch 对齐的） */
  max-width: 100%;
  overflow: hidden;
  /* 原来那版 #a397b2 在白色卡片上只有 2.76:1，11px 要 4.5:1 才达标；
     换成站内已有的次级文字色（标题行右侧小字同款），实测 4.76:1 */
  color: #7d6c8e;
}

html.dark .home-live-meta {
  /* 深色下卡片底是 rgba(30, 34, 42, 0.86)，实测 6.5:1 */
  color: #a9a2b8;
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
   --live-hue 颜色 / --live-beat 呼吸周期 / --live-dim 呼吸最暗到哪 / --live-glow 外圈光晕半径。
   颜色和光晕走 transition，换档时是「缓过来」而不是「啪一下跳过去」 */
.home-live-light-core {
  width: 9px;
  height: 9px;
  background: var(--live-state);
  box-shadow: 0 0 0 var(--live-glow, 3px) color-mix(in srgb, var(--live-state) 18%, transparent);
  animation: home-live-breathe var(--live-beat, 2.4s) ease-in-out infinite;
  transition: background-color 0.45s ease, box-shadow 0.45s ease, border-color 0.45s ease;
}

.home-live-light-ring {
  width: 9px;
  height: 9px;
  border: 1.5px solid var(--live-state);
  opacity: 0;
  animation: home-live-ripple var(--live-beat, 2.4s) ease-out infinite;
  transition: border-color 0.45s ease;
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

/* 后补的三档：都是「被用户当下的动作带起来」的，条件一撤就自己回落 */
.home-live-slot[data-mood="curious"] {
  --live-hue: #38bdf8;
  --live-beat: 1.5s;
  --live-dim: 0.84;
}

.home-live-slot[data-mood="clingy"] {
  --live-hue: #fb7185;
  --live-beat: 2.3s;
  --live-dim: 0.88;
}

.home-live-slot[data-mood="bored"] {
  --live-hue: #94a3b8;
  --live-beat: 3.6s;
  --live-dim: 0.55;
}

/* 被戳了一下的那一小会儿：灯闪一下，像被手碰过 */
.home-live-slot[data-tapped] {
  --live-glow: 6px;
  --live-dim: 0.95;
  --live-ring-scale: 3;
}

/* 状态档压在心情上面：演对手戏时两盏灯一起亮着，开口说话时灯再亮一档，
   被拎在手上则换成悬空的蓝 —— 状态是状态，心情是心情。
   这几档只动明暗和大小，**不动 --live-beat**：改周期会让浏览器把动画从头再来一遍，
   而说话每几秒就切换一次，灯就会一直在起点上跳 */
.home-live-slot.is-playing {
  --live-glow: 4px;
  --live-dim: 0.86;
  --live-ring-scale: 2.6;
}

.home-live-slot.is-talking {
  --live-glow: 5px;
  --live-dim: 0.92;
  --live-ring-scale: 2.8;
}

.home-live-slot.is-dragging {
  --live-hue: #60a5fa;
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

html.dark .home-live-slot[data-mood="curious"] {
  --live-hue: #7dd3fc;
}

html.dark .home-live-slot[data-mood="clingy"] {
  --live-hue: #fda4af;
}

html.dark .home-live-slot[data-mood="bored"] {
  --live-hue: #a8b6c6;
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
  animation: neko-play-chase 1.8s var(--play-ease);
}

.home-live-slot.is-playing[data-play="peek"] {
  animation: neko-play-peek 1.4s var(--play-ease);
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
  animation: neko-play-tag-flee 3.2s var(--play-ease);
}

.home-live-slot--right.is-playing[data-play="tag"] {
  animation: neko-play-tag-pursue 3.2s var(--play-ease);
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
  animation: neko-play-swap-right 3.2s var(--play-ease);
}

.home-live-slot--right.is-playing[data-play="swap"] {
  animation: neko-play-swap-left 3.2s var(--play-ease);
}

/* 下面四段是安静向的，只在台词点名时演（不进平时的随机排期） */

/* 靠一下：两张卡各自向对方挪一点、靠住停半拍，再分开 */
.home-live-slot.is-playing[data-play="lean"] {
  animation: neko-play-lean 1.8s var(--play-ease);
}

/* 递东西：左边那只探出去递，右边那只迎上来接一下 */
.home-live-slot--left.is-playing[data-play="pass"] {
  animation: neko-play-pass-give 1.6s var(--play-ease);
}

.home-live-slot--right.is-playing[data-play="pass"] {
  animation: neko-play-pass-take 1.6s var(--play-ease);
}

/* 学对方：同一个动作，右边慢半拍，看着就是跟着学 */
.home-live-slot.is-playing[data-play="mimic"] {
  animation: neko-play-mimic 1.8s var(--play-ease);
}

.home-live-slot--right.is-playing[data-play="mimic"] {
  animation-delay: 0.15s;
}

/* 一起看出去：不镜像，两张卡朝同一方向偏头，像同时望见画面外那个人 */
.home-live-slot.is-playing[data-play="lookOut"] {
  animation: neko-play-lookOut 2s var(--play-ease);
}

/* ===== 大编舞：动作大、时间长，隔一阵当一次特别节目，不掺进平时的打闹 ===== */

/* 镜像舞步：两张卡照镜子做同一套动作（这段幅度小，在平时的排期里也会出现） */
.home-live-slot.is-playing[data-play="mirrorStep"] {
  animation: neko-play-mirror 3s var(--play-ease);
}

/* —— 多拍子的日常：来回好几个回合，不是「A 动一下、B 动一下」就完。
      位移只按 --play-gap（两张卡的相对间距）算，不跨屏所以窄屏也甩不出去；
      但走的是横轴 —— 竖排（两张卡上下摞着）时「凑近」会变成横向错开，这一段待修 —— */
.home-live-slot.is-playing[data-play="nuzzle"] {
  animation: neko-play-nuzzle 4.2s var(--play-ease);
}

.home-live-slot--left.is-playing[data-play="leanNap"] {
  animation: neko-play-lean-nap 6.5s var(--play-ease);
}

.home-live-slot--right.is-playing[data-play="leanNap"] {
  animation: neko-play-lean-catch 6.5s var(--play-ease);
}

.home-live-slot--left.is-playing[data-play="shareBite"] {
  animation: neko-play-share-give 4.8s var(--play-ease);
}

.home-live-slot--right.is-playing[data-play="shareBite"] {
  animation: neko-play-share-take 4.8s var(--play-ease);
}

.home-live-slot.is-playing[data-play="highPaw"] {
  animation: neko-play-high-paw 2.8s var(--ease-play);
}

.home-live-slot--left.is-playing[data-play="startle"] {
  animation: neko-play-startle-up 3.4s var(--ease-play);
}

.home-live-slot--right.is-playing[data-play="startle"] {
  animation: neko-play-startle-back 3.4s var(--ease-play);
}

.home-live-slot--left.is-playing[data-play="roundChase"] {
  animation: neko-play-round-flee 4.6s var(--play-ease);
  z-index: 1;
}

.home-live-slot--right.is-playing[data-play="roundChase"] {
  animation: neko-play-round-pursue 4.6s var(--play-ease);
  z-index: 2;
}

.home-live-slot--left.is-playing[data-play="tailSpin"] {
  animation: neko-play-tail-spin 5.2s var(--play-ease);
  z-index: 2;
}

.home-live-slot--right.is-playing[data-play="tailSpin"] {
  animation: neko-play-tail-watch 5.2s var(--play-ease);
  z-index: 1;
}

.home-live-slot.is-playing[data-play="makeUp"] {
  animation: neko-play-make-up 4.4s var(--play-ease);
}

/* —— 后来补的八段：都在日常排期里，跟上面那批一样是「两张卡你来我往」。
      位移统一走 --meet-x / --meet-y（朝对方那个轴），所以横排竖排都对得上 —— */

/* 踩奶：左边那只原地一下一下地踩，右边那只凑近了盯着看 */
.home-live-slot--left.is-playing[data-play="knead"] {
  animation: neko-play-knead 3.2s var(--play-ease);
}

.home-live-slot--right.is-playing[data-play="knead"] {
  animation: neko-play-knead-watch 3.2s var(--play-ease);
}

/* 互相舔毛：左边那只低着头一下一下地蹭，右边那只舒服得直晃 */
.home-live-slot--left.is-playing[data-play="groom"] {
  animation: neko-play-groom-lick 3.6s var(--play-ease);
}

.home-live-slot--right.is-playing[data-play="groom"] {
  animation: neko-play-groom-take 3.6s var(--play-ease);
}

/* 抢东西：两张往中间挤一下再弹开，来回两轮、一轮比一轮轻 */
.home-live-slot--left.is-playing[data-play="tussle"] {
  animation: neko-play-tussle-left 3s var(--play-ease);
}

.home-live-slot--right.is-playing[data-play="tussle"] {
  animation: neko-play-tussle-right 3s var(--play-ease);
}

/* 一起看外面：先缩一下、再同时朝同一侧偏头定住，像一起听见了什么动静 */
.home-live-slot--left.is-playing[data-play="alarm"] {
  animation: neko-play-alarm 3s var(--play-ease);
}

.home-live-slot--right.is-playing[data-play="alarm"] {
  animation: neko-play-alarm-right 3s var(--play-ease);
}

/* 装死：左边那只整只侧倒下去，右边那只凑过去低头看两眼、确认没事 */
.home-live-slot--left.is-playing[data-play="playDead"] {
  animation: neko-play-dead-fall 3.4s var(--ease-play);
}

.home-live-slot--right.is-playing[data-play="playDead"] {
  animation: neko-play-dead-check 3.4s var(--play-ease);
}

/* 排队走：左边那只先走，右边那只绕到它身后跟着，一起挪一段再一起回来 */
.home-live-slot--left.is-playing[data-play="parade"] {
  animation: neko-play-parade-lead 4.2s var(--play-ease);
}

.home-live-slot--right.is-playing[data-play="parade"] {
  animation: neko-play-parade-follow 4.2s var(--play-ease);
}

/* 你推我我推你：面对面轻撞两回，第二回力气小一半 */
.home-live-slot--left.is-playing[data-play="shove"] {
  animation: neko-play-shove-left 2.8s var(--ease-play);
}

.home-live-slot--right.is-playing[data-play="shove"] {
  animation: neko-play-shove-right 2.8s var(--ease-play);
}

/* 背靠背坐：两张挤到一块儿、各自朝相反方向转身坐定，停一会儿再散开 */
.home-live-slot.is-playing[data-play="spoon"] {
  animation: neko-play-spoon 3.6s var(--play-ease);
}

/* 两张卡上下摞着时（窄窗口那条带）：「朝对方」得换成纵轴，
   不然上面这些「凑近」的位移会变成左右错开 */
.home-live-cards[data-layout="stacked"] .home-live-slot {
  --meet-x: 0px;
  --meet-y: calc(var(--play-gap) * var(--play-dir));
}

/* —— 一个人也能演的小动作：不用等对手，手里只剩一张卡时它也闲不着 —— */
.home-live-slot.is-playing[data-play="yawn"] {
  animation: neko-solo-yawn 3.2s var(--play-ease);
}

.home-live-slot.is-playing[data-play="stretchOut"] {
  animation: neko-solo-stretch 2.8s var(--play-ease);
}

.home-live-slot.is-playing[data-play="earFlick"] {
  animation: neko-solo-ear-flick 1.4s ease-in-out;
}

.home-live-slot.is-playing[data-play="lookBack"] {
  animation: neko-solo-look-back 2.6s var(--play-ease);
}

.home-live-slot.is-playing[data-play="shakeOff"] {
  animation: neko-solo-shake 1.6s ease-in-out;
}

/* 太极转圈：各自往对方那侧绕半圈、交换位置，再绕回来；一个走上面一个走下面 */
.home-live-slot.is-playing[data-play="circle"] {
  --r: calc(var(--play-gap) / 2);
  animation: neko-play-circle 4.5s var(--play-ease);
}

/* 跨越玩耍：左边那只原地跳两下，右边那只贴下面跑过去停到它左边，再跑回来 */
.home-live-slot--left.is-playing[data-play="crossPlay"] {
  animation: neko-play-cross-jump 7s var(--ease-play);
  z-index: 2;
}

.home-live-slot--right.is-playing[data-play="crossPlay"] {
  animation: neko-play-cross-run 7s var(--play-ease);
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
  animation: neko-play-chase-loop 6s var(--play-ease) -0.4s;
}

.home-live-slot--left.is-playing[data-play="chaseLoop"] {
  animation: neko-play-chase-loop 6s var(--play-ease);
}

/* 躲猫猫：左边那只缩到对方身后，右边那只左右探头去找 */
.home-live-slot--left.is-playing[data-play="peekaboo"] {
  animation: neko-play-hide 4s var(--play-ease);
  z-index: 1;
}

.home-live-slot--right.is-playing[data-play="peekaboo"] {
  animation: neko-play-seek 4s var(--play-ease);
  z-index: 2;
}

/* 两张卡上下摞着时（手机、窄窗口）：横向那套位移会把卡片直接推出屏幕，
   所以五段大编舞全部换成上下走的版本 —— 故事还是那个故事，只是换了走法 */
.home-live-cards[data-layout="stacked"] .home-live-slot.is-playing[data-play="circle"] {
  animation-name: neko-play-circle-v;
}

.home-live-cards[data-layout="stacked"] .home-live-slot--left.is-playing[data-play="crossPlay"] {
  animation-name: neko-play-cross-jump-v;
}

.home-live-cards[data-layout="stacked"] .home-live-slot--right.is-playing[data-play="crossPlay"] {
  animation-name: neko-play-cross-run-v;
}

.home-live-cards[data-layout="stacked"] .home-live-slot--left.is-playing[data-play="leapfrog"] {
  animation-name: neko-play-leap-crouch-v;
}

.home-live-cards[data-layout="stacked"] .home-live-slot--right.is-playing[data-play="leapfrog"] {
  animation-name: neko-play-leap-over-v;
}

.home-live-cards[data-layout="stacked"] .home-live-slot--left.is-playing[data-play="chaseLoop"],
.home-live-cards[data-layout="stacked"] .home-live-slot--right.is-playing[data-play="chaseLoop"] {
  animation-name: neko-play-chase-loop-v;
}

.home-live-cards[data-layout="stacked"] .home-live-slot--left.is-playing[data-play="peekaboo"] {
  animation-name: neko-play-hide-v;
}

.home-live-cards[data-layout="stacked"] .home-live-slot--right.is-playing[data-play="peekaboo"] {
  animation-name: neko-play-seek-v;
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
   --r 是间距的一半 = 圆的半径，两张卡镜像走，所以一个顺时针一个逆时针。
   纵向那个 34px 得按 --play-dir 分正负：25%/75% 两张卡在横轴上正好重合，
   只靠它一上一下（68px，比卡高 60 还多一点）才错得开，否则读起来是「穿过去」不是「绕」*/
@keyframes neko-play-circle {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  25% {
    animation-timing-function: linear;
    transform: translate(calc(var(--r) * var(--play-dir)), calc(34px * var(--play-dir)))
      rotate(calc(7deg * var(--play-dir)));
  }

  50% {
    animation-timing-function: linear;
    transform: translate(calc(var(--r) * 2 * var(--play-dir)), 0) rotate(0deg);
  }

  75% {
    transform: translate(calc(var(--r) * var(--play-dir)), calc(-34px * var(--play-dir)))
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
    animation-timing-function: linear;
    transform: translate(0, 0);
  }

  24% {
    transform: translate(calc(var(--play-span) * var(--play-dir)), 12px)
      rotate(calc(-3deg * var(--play-dir)));
  }

  34%,
  62% {
    animation-timing-function: linear;
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
    animation-timing-function: linear;
    transform: translate(calc(var(--play-span) * 0.55 * var(--play-dir)), -14px)
      rotate(calc(6deg * var(--play-dir)));
  }

  45% {
    animation-timing-function: linear;
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

/* 蹭蹭：凑近 → 头碰头蹭两下 → 慢慢分开。两只镜像做，所以共用一条 */
@keyframes neko-play-nuzzle {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  16% {
    transform: translate(calc(var(--play-gap) * 0.4 * var(--play-dir)), -1px)
      rotate(calc(2deg * var(--play-dir)));
  }

  28% {
    transform: translate(calc(var(--play-gap) * 0.44 * var(--play-dir)), 1px)
      rotate(calc(-2deg * var(--play-dir)));
  }

  40% {
    transform: translate(calc(var(--play-gap) * 0.4 * var(--play-dir)), -1px)
      rotate(calc(2deg * var(--play-dir)));
  }

  54% {
    transform: translate(calc(var(--play-gap) * 0.44 * var(--play-dir)), 1px)
      rotate(calc(-1.5deg * var(--play-dir)));
  }

  70% {
    transform: translate(calc(var(--play-gap) * 0.46 * var(--play-dir)), 0) rotate(0deg);
  }

  86% {
    transform: translate(calc(var(--play-gap) * 0.12 * var(--play-dir)), 0) rotate(0deg);
  }
}

/* 靠着打盹 · 靠过去的那只：慢慢歪到对方身上，呼吸起伏两轮，再醒过来坐正。
   压过去的系数与「蹭蹭」（nuzzle）的 0.44 取齐 —— 再大一点就不是「靠着」，
   而是整张卡压到对方头像上盖住两秒（被靠的那只本身压不动，只能干看着）。
   选收系数而不是给被靠的补 z-index：重合是位移造成的，补图层只是换个谁盖谁 */
@keyframes neko-play-lean-nap {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  18% {
    transform: translate(calc(var(--play-gap) * 0.4 * var(--play-dir)), 3px)
      rotate(calc(4deg * var(--play-dir)));
  }

  34% {
    transform: translate(calc(var(--play-gap) * 0.44 * var(--play-dir)), 5px)
      rotate(calc(4.5deg * var(--play-dir)));
  }

  50% {
    transform: translate(calc(var(--play-gap) * 0.44 * var(--play-dir)), 3px)
      rotate(calc(4deg * var(--play-dir)));
  }

  66% {
    transform: translate(calc(var(--play-gap) * 0.44 * var(--play-dir)), 5px)
      rotate(calc(4.5deg * var(--play-dir)));
  }

  82% {
    transform: translate(calc(var(--play-gap) * 0.3 * var(--play-dir)), 1px)
      rotate(calc(1.5deg * var(--play-dir)));
  }
}

/* 靠着打盹 · 被靠着的那只：稳稳待着，只在对方压上来时轻轻沉一下 */
@keyframes neko-play-lean-catch {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  24%,
  70% {
    transform: translate(calc(var(--play-gap) * 0.06 * var(--play-dir)), 2px) scale(0.985);
  }

  86% {
    transform: translate(0, 0) scale(1);
  }
}

/* 分你一半 · 给的那只：低头推两下，等对方接住，然后一起点头 */
@keyframes neko-play-share-give {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  20% {
    transform: translate(calc(var(--play-gap) * 0.34 * var(--play-dir)), 3px)
      rotate(calc(-2deg * var(--play-dir)));
  }

  34% {
    transform: translate(calc(var(--play-gap) * 0.38 * var(--play-dir)), 1px)
      rotate(calc(-1deg * var(--play-dir)));
  }

  58%,
  66% {
    transform: translate(calc(var(--play-gap) * 0.3 * var(--play-dir)), 4px) rotate(0deg);
  }

  74% {
    transform: translate(calc(var(--play-gap) * 0.3 * var(--play-dir)), 1px) rotate(0deg);
  }

  88% {
    transform: translate(calc(var(--play-gap) * 0.1 * var(--play-dir)), 0) rotate(0deg);
  }
}

/* 分你一半 · 接的那只：先凑上去，接住之后点两下头 */
@keyframes neko-play-share-take {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  22% {
    transform: translate(calc(var(--play-gap) * 0.36 * var(--play-dir)), -2px) scale(1.015);
  }

  36% {
    transform: translate(calc(var(--play-gap) * 0.32 * var(--play-dir)), 0) scale(1);
  }

  58%,
  74% {
    transform: translate(calc(var(--play-gap) * 0.3 * var(--play-dir)), 2px) scale(1);
  }

  66% {
    transform: translate(calc(var(--play-gap) * 0.3 * var(--play-dir)), 0) scale(1);
  }

  90% {
    transform: translate(0, 0) scale(1);
  }
}

/* 击掌：两只一起蹦起来、正好在半空对上，再各自弹回来（共用一条） */
@keyframes neko-play-high-paw {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  18% {
    transform: translate(calc(var(--play-gap) * 0.2 * var(--play-dir)), 4px) rotate(0deg);
  }

  32% {
    transform: translate(calc(var(--play-gap) * 0.42 * var(--play-dir)), -26px)
      rotate(calc(-6deg * var(--play-dir)));
  }

  46% {
    transform: translate(calc(var(--play-gap) * 0.34 * var(--play-dir)), -6px)
      rotate(calc(2deg * var(--play-dir)));
  }

  58% {
    transform: translate(calc(var(--play-gap) * 0.2 * var(--play-dir)), -14px) rotate(0deg);
  }

  76% {
    transform: translate(calc(var(--play-gap) * 0.08 * var(--play-dir)), 0) rotate(0deg);
  }
}

/* 吓一跳 · 吓人的那只：突然往上一窜，再若无其事地落回来 */
@keyframes neko-play-startle-up {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  12% {
    transform: translate(0, -30px) scale(1.04, 0.97);
  }

  22% {
    transform: translate(0, -4px) scale(0.99, 1.02);
  }

  34% {
    transform: translate(0, -12px) scale(1);
  }

  52% {
    transform: translate(0, 0) scale(1);
  }

  70% {
    transform: translate(0, -6px) scale(1);
  }
}

/* 吓一跳 · 被吓的那只：往后一缩，探头看两下，确认没事再挪回来 */
@keyframes neko-play-startle-back {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
  }

  10% {
    transform: translate(calc(var(--play-gap) * -0.18 * var(--play-dir)), 3px)
      rotate(calc(-3deg * var(--play-dir))) scale(0.97);
  }

  26% {
    transform: translate(calc(var(--play-gap) * -0.12 * var(--play-dir)), 2px)
      rotate(calc(-1deg * var(--play-dir))) scale(0.98);
  }

  44% {
    transform: translate(calc(var(--play-gap) * 0.1 * var(--play-dir)), 0)
      rotate(calc(2deg * var(--play-dir))) scale(1);
  }

  60% {
    transform: translate(calc(var(--play-gap) * 0.06 * var(--play-dir)), 0) rotate(0deg) scale(1);
  }

  78% {
    transform: translate(calc(var(--play-gap) * 0.12 * var(--play-dir)), 0) rotate(0deg) scale(1);
  }
}

/* 绕圈躲 · 躲的那只：绕着小圈挪两轮，每次都刚好错开 */
@keyframes neko-play-round-flee {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  16% {
    animation-timing-function: linear;
    transform: translate(calc(var(--play-gap) * 0.4 * var(--play-dir)), -14px)
      rotate(calc(5deg * var(--play-dir)));
  }

  32% {
    animation-timing-function: linear;
    transform: translate(calc(var(--play-gap) * -0.06 * var(--play-dir)), -18px)
      rotate(calc(-4deg * var(--play-dir)));
  }

  48% {
    animation-timing-function: linear;
    transform: translate(calc(var(--play-gap) * -0.42 * var(--play-dir)), -6px)
      rotate(calc(-6deg * var(--play-dir)));
  }

  64% {
    animation-timing-function: linear;
    transform: translate(calc(var(--play-gap) * -0.2 * var(--play-dir)), 12px)
      rotate(calc(3deg * var(--play-dir)));
  }

  82% {
    transform: translate(calc(var(--play-gap) * 0.24 * var(--play-dir)), 6px)
      rotate(calc(-2deg * var(--play-dir)));
  }
}

/* 绕圈躲 · 追的那只：慢半拍跟着绕，最后一扑还是扑空 */
@keyframes neko-play-round-pursue {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  24% {
    animation-timing-function: linear;
    transform: translate(calc(var(--play-gap) * 0.26 * var(--play-dir)), -10px)
      rotate(calc(4deg * var(--play-dir)));
  }

  40% {
    animation-timing-function: linear;
    transform: translate(calc(var(--play-gap) * -0.02 * var(--play-dir)), -16px)
      rotate(calc(-3deg * var(--play-dir)));
  }

  56% {
    animation-timing-function: linear;
    transform: translate(calc(var(--play-gap) * -0.3 * var(--play-dir)), -4px)
      rotate(calc(-5deg * var(--play-dir)));
  }

  72% {
    animation-timing-function: linear;
    transform: translate(calc(var(--play-gap) * -0.1 * var(--play-dir)), 10px)
      rotate(calc(2deg * var(--play-dir)));
  }

  88% {
    transform: translate(calc(var(--play-gap) * 0.3 * var(--play-dir)), 4px)
      rotate(calc(3deg * var(--play-dir)));
  }
}

/* 追尾巴：原地转两圈追自己尾巴，圈越转越小（转圈逐段 linear，转起来才匀）*/
@keyframes neko-play-tail-spin {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  14% {
    animation-timing-function: linear;
    transform: translate(10px, -6px) rotate(18deg);
  }

  28% {
    animation-timing-function: linear;
    transform: translate(0, -12px) rotate(38deg);
  }

  42% {
    animation-timing-function: linear;
    transform: translate(-11px, -5px) rotate(56deg);
  }

  56% {
    animation-timing-function: linear;
    transform: translate(-8px, 3px) rotate(74deg);
  }

  70% {
    animation-timing-function: linear;
    transform: translate(7px, -2px) rotate(88deg);
  }

  84% {
    transform: translate(2px, -5px) rotate(96deg);
  }
}

/* 追尾巴 · 围观的那只：跟着扭头看，看得有点晕 */
@keyframes neko-play-tail-watch {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  20%,
  30% {
    transform: translate(0, -2px) rotate(calc(6deg * var(--play-dir)));
  }

  48%,
  58% {
    transform: translate(0, -3px) rotate(calc(-5deg * var(--play-dir)));
  }

  76% {
    transform: translate(0, -1px) rotate(calc(8deg * var(--play-dir)));
  }

  88% {
    transform: translate(0, 0) rotate(calc(-3deg * var(--play-dir)));
  }
}

/* 和好：两只一起背过身去、偷看一眼、再挪回来（共用一条） */
/* ===== 后补的八段日常对手戏（位移一律走 --meet-x / --meet-y，横排竖排都对轴） ===== */

/* 踩奶 · 踩的那只：原地一下一下地压，第三下最实 */
@keyframes neko-play-knead {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  10% {
    transform: translate(0, 2px) scale(1.02, 0.97);
  }

  20% {
    transform: translate(0, -1px) scale(0.99, 1.02);
  }

  32% {
    transform: translate(0, 2px) scale(1.02, 0.97);
  }

  42% {
    transform: translate(0, -1px) scale(0.99, 1.02);
  }

  54% {
    transform: translate(0, 3px) scale(1.03, 0.96);
  }

  66% {
    transform: translate(0, 0) scale(1);
  }

  80% {
    transform: translate(0, -2px) scale(1);
  }
}

/* 踩奶 · 看的那只：凑近、低着头看，中途还往前探了探 */
@keyframes neko-play-knead-watch {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  24% {
    transform: translate(calc(var(--meet-x) * 0.26), calc(var(--meet-y) * 0.26 + 2px))
      rotate(5deg);
  }

  46% {
    transform: translate(calc(var(--meet-x) * 0.32), calc(var(--meet-y) * 0.32 + 4px))
      rotate(7deg);
  }

  64% {
    transform: translate(calc(var(--meet-x) * 0.3), calc(var(--meet-y) * 0.3 + 3px)) rotate(6deg);
  }

  82% {
    transform: translate(calc(var(--meet-x) * 0.06), calc(var(--meet-y) * 0.06)) rotate(1deg);
  }
}

/* 互相舔毛 · 舔的那只：低头贴近，来回蹭三下 */
@keyframes neko-play-groom-lick {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  14% {
    transform: translate(calc(var(--meet-x) * 0.28), calc(var(--meet-y) * 0.28 + 3px))
      rotate(-7deg);
  }

  26% {
    transform: translate(calc(var(--meet-x) * 0.3), calc(var(--meet-y) * 0.3 + 4px))
      rotate(-9deg);
  }

  38% {
    transform: translate(calc(var(--meet-x) * 0.28), calc(var(--meet-y) * 0.28 + 2px))
      rotate(-6deg);
  }

  52% {
    transform: translate(calc(var(--meet-x) * 0.3), calc(var(--meet-y) * 0.3 + 4px))
      rotate(-9deg);
  }

  66% {
    transform: translate(calc(var(--meet-x) * 0.28), calc(var(--meet-y) * 0.28 + 2px))
      rotate(-6deg);
  }

  84% {
    transform: translate(calc(var(--meet-x) * 0.1), calc(var(--meet-y) * 0.1)) rotate(-1deg);
  }
}

/* 互相舔毛 · 被舔的那只：舒服得轻轻晃 */
@keyframes neko-play-groom-take {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
  }

  18% {
    transform: translate(calc(var(--meet-x) * 0.14), calc(var(--meet-y) * 0.14)) rotate(3deg)
      scale(1.01);
  }

  34% {
    transform: translate(calc(var(--meet-x) * 0.16), calc(var(--meet-y) * 0.16 + 2px))
      rotate(-2deg);
  }

  50% {
    transform: translate(calc(var(--meet-x) * 0.14), calc(var(--meet-y) * 0.14)) rotate(3deg);
  }

  68% {
    transform: translate(calc(var(--meet-x) * 0.16), calc(var(--meet-y) * 0.16 + 2px))
      rotate(-1deg);
  }

  86% {
    transform: translate(calc(var(--meet-x) * 0.05), calc(var(--meet-y) * 0.05)) rotate(0deg);
  }
}

/* 抢东西 · 左边那只：挤过去、被顶回来，第二轮劲小了些 */
@keyframes neko-play-tussle-left {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  16% {
    transform: translate(calc(var(--meet-x) * 0.34), calc(var(--meet-y) * 0.34 - 2px))
      rotate(4deg);
  }

  30% {
    transform: translate(calc(var(--meet-x) * 0.04), calc(var(--meet-y) * 0.04)) rotate(0deg);
  }

  48% {
    transform: translate(calc(var(--meet-x) * 0.24), calc(var(--meet-y) * 0.24 - 1px))
      rotate(3deg);
  }

  62% {
    transform: translate(calc(var(--meet-x) * 0.03), calc(var(--meet-y) * 0.03)) rotate(0deg);
  }

  80% {
    transform: translate(calc(var(--meet-x) * 0.07), calc(var(--meet-y) * 0.07)) rotate(1deg);
  }
}

/* 抢东西 · 右边那只：比左边慢半拍，顶得更沉一点 */
@keyframes neko-play-tussle-right {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  8% {
    transform: translate(0, 1px) rotate(0deg);
  }

  24% {
    transform: translate(calc(var(--meet-x) * 0.36), calc(var(--meet-y) * 0.36 - 2px))
      rotate(4deg);
  }

  38% {
    transform: translate(calc(var(--meet-x) * 0.05), calc(var(--meet-y) * 0.05)) rotate(0deg);
  }

  56% {
    transform: translate(calc(var(--meet-x) * 0.26), calc(var(--meet-y) * 0.26 - 1px))
      rotate(3deg);
  }

  70% {
    transform: translate(calc(var(--meet-x) * 0.04), calc(var(--meet-y) * 0.04)) rotate(0deg);
  }

  86% {
    transform: translate(calc(var(--meet-x) * 0.07), calc(var(--meet-y) * 0.07)) rotate(1deg);
  }
}

/* 一起看外面 · 左边那只：先缩一下，再偏头定住 —— 这一段刻意不镜像，两张都朝同一侧 */
@keyframes neko-play-alarm {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
  }

  9% {
    transform: translate(0, -1px) rotate(-3deg) scale(0.99);
  }

  19% {
    transform: translate(0, -4px) rotate(9deg) scale(1.01);
  }

  36%,
  62% {
    transform: translate(0, -4px) rotate(9deg) scale(1.01);
  }

  76% {
    transform: translate(0, -1px) rotate(2deg) scale(1);
  }

  88% {
    transform: translate(0, 0) rotate(-1deg) scale(1);
  }
}

/* 一起看外面 · 右边那只：比左边晚一拍，方向一样 */
@keyframes neko-play-alarm-right {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
  }

  14% {
    transform: translate(0, -1px) rotate(-3deg) scale(0.99);
  }

  25% {
    transform: translate(0, -4px) rotate(8deg) scale(1.01);
  }

  42%,
  66% {
    transform: translate(0, -4px) rotate(8deg) scale(1.01);
  }

  80% {
    transform: translate(0, -1px) rotate(2deg) scale(1);
  }

  90% {
    transform: translate(0, 0) rotate(-1deg) scale(1);
  }
}

/* 装死 · 倒下去的那只：先起身、再整只侧倒，躺一小会儿才爬起来 */
@keyframes neko-play-dead-fall {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  10% {
    transform: translate(0, -5px) rotate(calc(-4deg * var(--play-dir)));
  }

  26% {
    transform: translate(0, 10px) rotate(calc(74deg * var(--play-dir)));
  }

  34%,
  58% {
    transform: translate(0, 12px) rotate(calc(78deg * var(--play-dir)));
  }

  72% {
    transform: translate(0, 6px) rotate(calc(28deg * var(--play-dir)));
  }

  86% {
    transform: translate(0, 0) rotate(calc(-3deg * var(--play-dir)));
  }
}

/* 装死 · 看的那只：凑过去低头看两眼，再直起身子 */
@keyframes neko-play-dead-check {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  20% {
    transform: translate(calc(var(--meet-x) * 0.3), calc(var(--meet-y) * 0.3 + 2px))
      rotate(-6deg);
  }

  38% {
    transform: translate(calc(var(--meet-x) * 0.33), calc(var(--meet-y) * 0.33 + 7px))
      rotate(-9deg);
  }

  54% {
    transform: translate(calc(var(--meet-x) * 0.33), calc(var(--meet-y) * 0.33 + 4px))
      rotate(-8deg);
  }

  78% {
    transform: translate(calc(var(--meet-x) * 0.1), calc(var(--meet-y) * 0.1)) rotate(-1deg);
  }
}

/* 排队走 · 领头那只：先迈一步，再带着往一侧挪一段，停一下走回来 */
@keyframes neko-play-parade-lead {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  16% {
    transform: translate(calc(var(--meet-x) * 0.08), calc(var(--meet-y) * 0.08 - 3px))
      rotate(-3deg);
  }

  40% {
    transform: translate(calc(var(--meet-x) * 0.5), calc(var(--meet-y) * 0.5 - 2px)) rotate(-2deg);
  }

  62% {
    transform: translate(calc(var(--meet-x) * 0.5), calc(var(--meet-y) * 0.5)) rotate(0deg);
  }

  84% {
    transform: translate(calc(var(--meet-x) * 0.05), calc(var(--meet-y) * 0.05)) rotate(0deg);
  }
}

/* 排队走 · 跟着那只：先绕到对方身后（从上方绕过去），再跟着走 */
@keyframes neko-play-parade-follow {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  12% {
    transform: translate(calc(var(--meet-x) * -0.1), calc(var(--meet-y) * -0.1 - 15px))
      rotate(3deg);
  }

  34% {
    transform: translate(calc(var(--meet-x) * 0.3), calc(var(--meet-y) * 0.3 - 17px)) rotate(5deg);
  }

  54% {
    transform: translate(calc(var(--meet-x) * 0.5), calc(var(--meet-y) * 0.5 - 6px)) rotate(2deg);
  }

  72% {
    transform: translate(calc(var(--meet-x) * 0.5), calc(var(--meet-y) * 0.5)) rotate(0deg);
  }

  88% {
    transform: translate(calc(var(--meet-x) * 0.06), calc(var(--meet-y) * 0.06)) rotate(0deg);
  }
}

/* 你推我我推你 · 左边那只：推过去、被顶回来，第二回轻一点 */
@keyframes neko-play-shove-left {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  14% {
    transform: translate(calc(var(--meet-x) * 0.3), calc(var(--meet-y) * 0.3 - 1px)) rotate(4deg);
  }

  26% {
    transform: translate(calc(var(--meet-x) * 0.02), calc(var(--meet-y) * 0.02 + 1px)) rotate(0deg);
  }

  46% {
    transform: translate(calc(var(--meet-x) * 0.2), calc(var(--meet-y) * 0.2 - 1px)) rotate(3deg);
  }

  58% {
    transform: translate(0, 0) rotate(0deg);
  }

  76% {
    transform: translate(calc(var(--meet-x) * 0.06), calc(var(--meet-y) * 0.06)) rotate(1deg);
  }
}

/* 你推我我推你 · 右边那只：慢半拍跟上，推得更实 */
@keyframes neko-play-shove-right {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  8% {
    transform: translate(0, 1px) rotate(0deg);
  }

  22% {
    transform: translate(calc(var(--meet-x) * 0.32), calc(var(--meet-y) * 0.32 - 1px)) rotate(4deg);
  }

  34% {
    transform: translate(calc(var(--meet-x) * 0.03), calc(var(--meet-y) * 0.03 + 1px)) rotate(0deg);
  }

  54% {
    transform: translate(calc(var(--meet-x) * 0.22), calc(var(--meet-y) * 0.22 - 1px)) rotate(3deg);
  }

  66% {
    transform: translate(0, 0) rotate(0deg);
  }

  82% {
    transform: translate(calc(var(--meet-x) * 0.06), calc(var(--meet-y) * 0.06)) rotate(1deg);
  }
}

/* 背靠背坐：两张挤到挨着、各自朝相反方向转身坐定（rotate 靠 --play-dir 分向），停一大段再散开 */
@keyframes neko-play-spoon {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  18% {
    transform: translate(calc(var(--meet-x) * 0.4), calc(var(--meet-y) * 0.4 + 3px))
      rotate(calc(-11deg * var(--play-dir)));
  }

  32% {
    transform: translate(calc(var(--meet-x) * 0.42), calc(var(--meet-y) * 0.42 + 4px))
      rotate(calc(-12deg * var(--play-dir)));
  }

  68% {
    transform: translate(calc(var(--meet-x) * 0.42), calc(var(--meet-y) * 0.42 + 4px))
      rotate(calc(-12deg * var(--play-dir)));
  }

  86% {
    transform: translate(calc(var(--meet-x) * 0.08), calc(var(--meet-y) * 0.08))
      rotate(calc(-1deg * var(--play-dir)));
  }
}

@keyframes neko-play-make-up {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  14% {
    transform: translate(calc(var(--play-gap) * -0.16 * var(--play-dir)), 0)
      rotate(calc(-9deg * var(--play-dir)));
  }

  32% {
    transform: translate(calc(var(--play-gap) * -0.18 * var(--play-dir)), -1px)
      rotate(calc(-10deg * var(--play-dir)));
  }

  46% {
    transform: translate(calc(var(--play-gap) * -0.14 * var(--play-dir)), 0)
      rotate(calc(-2deg * var(--play-dir)));
  }

  58% {
    transform: translate(calc(var(--play-gap) * -0.16 * var(--play-dir)), 0)
      rotate(calc(-9deg * var(--play-dir)));
  }

  76% {
    transform: translate(calc(var(--play-gap) * 0.4 * var(--play-dir)), 2px)
      rotate(calc(3deg * var(--play-dir)));
  }

  90% {
    transform: translate(calc(var(--play-gap) * 0.18 * var(--play-dir)), 0)
      rotate(calc(1deg * var(--play-dir)));
  }
}

/* 打哈欠：仰头、张到最大停一下、再慢慢合上 */
@keyframes neko-solo-yawn {
  0%,
  100% {
    transform: translate(0, 0) scale(1, 1);
  }

  24% {
    transform: translate(0, -2px) scale(1.03, 1.06);
  }

  46%,
  62% {
    transform: translate(0, -3px) scale(1.04, 1.08);
  }

  82% {
    transform: translate(0, -1px) scale(1.01, 1.02);
  }
}

/* 伸懒腰：往前抻长一点，再慢慢松回来 */
@keyframes neko-solo-stretch {
  0%,
  100% {
    transform: translate(0, 0) scale(1, 1);
  }

  26%,
  50% {
    transform: translate(0, -3px) scale(1.05, 0.96);
  }

  74% {
    transform: translate(0, 1px) scale(0.99, 1.02);
  }
}

/* 抖耳朵：两下快的 */
@keyframes neko-solo-ear-flick {
  0%,
  100% {
    transform: rotate(0deg);
  }

  18%,
  54% {
    transform: rotate(2.5deg);
  }

  36%,
  72% {
    transform: rotate(-2.5deg);
  }
}

/* 回头看：转到一边停一会儿，再慢慢转回来 */
@keyframes neko-solo-look-back {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  22%,
  52% {
    transform: translate(4px, -1px) rotate(7deg);
  }

  74% {
    transform: translate(-2px, 0) rotate(-2deg);
  }
}

/* 抖毛：一串高频的小抖，越抖越小 */
@keyframes neko-solo-shake {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  12% {
    transform: translate(-3px, 0) rotate(-1.6deg);
  }

  26% {
    transform: translate(3px, 0) rotate(1.6deg);
  }

  40% {
    transform: translate(-2.4px, 0) rotate(-1.2deg);
  }

  54% {
    transform: translate(2.4px, 0) rotate(1.2deg);
  }

  68% {
    transform: translate(-1.4px, 0) rotate(-0.7deg);
  }

  82% {
    transform: translate(1.4px, 0) rotate(0.7deg);
  }
}

/* 以下是竖排（手机、窄窗口）时用的上下版本。横向位移那一套在上下摞着的布局里
   会把卡片直接推出屏幕，所以换成上下的走法；--play-gap / --play-span 那边量的是纵向距离 */
@keyframes neko-play-circle-v {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  25% {
    animation-timing-function: linear;
    transform: translate(calc(var(--r) * -0.5 * var(--play-dir)), calc(var(--r) * var(--play-dir)))
      rotate(calc(6deg * var(--play-dir)));
  }

  50% {
    animation-timing-function: linear;
    transform: translate(0, calc(var(--r) * 2 * var(--play-dir))) rotate(0deg);
  }

  75% {
    transform: translate(calc(var(--r) * 0.5 * var(--play-dir)), calc(var(--r) * var(--play-dir)))
      rotate(calc(-6deg * var(--play-dir)));
  }
}

/* 跨越玩耍 · 上面那只：原地蹦两下，对方绕上来时往旁边让出落点，等它回去再蹦两下。
   蹦的拍子与横排那版对齐（那边也是四蹦）—— 同一段故事两个走向，节奏别差太多 */
@keyframes neko-play-cross-jump-v {
  0%,
  5% {
    transform: translate(0, 0);
  }

  10% {
    transform: translate(0, -18px);
  }

  16% {
    transform: translate(0, 0);
  }

  22% {
    transform: translate(0, -12px);
  }

  28%,
  60% {
    transform: translate(36px, 0) rotate(4deg);
  }

  66% {
    transform: translate(36px, -16px);
  }

  72% {
    transform: translate(36px, 0);
  }

  78% {
    transform: translate(36px, -10px);
  }

  84%,
  100% {
    transform: translate(0, 0);
  }
}

/* 跨越玩耍 · 下面那只：往旁边错开一点、往上绕到对方那一格，站一会儿再回来 */
@keyframes neko-play-cross-run-v {
  0%,
  5% {
    transform: translate(0, 0);
  }

  24% {
    animation-timing-function: linear;
    transform: translate(-16px, calc(var(--play-span) * -0.5)) rotate(-2deg);
  }

  34%,
  62% {
    animation-timing-function: linear;
    transform: translate(-16px, calc(var(--play-span) * -0.86));
  }

  92%,
  100% {
    transform: translate(0, 0);
  }
}

/* 跳背 · 蹲着的那只：往旁边让开、压低压扁，让人从上面过去 */
@keyframes neko-play-leap-crouch-v {
  0%,
  100% {
    transform: translate(0, 0) scale(1, 1);
  }

  20%,
  55% {
    transform: translate(42px, 6px) scale(1, 0.93);
  }

  78% {
    transform: translate(0, 0) scale(1, 1);
  }
}

/* 跳背 · 跳过去的那只：一头高一头低画个弧，越到对方上面那一格，再跳回来 */
@keyframes neko-play-leap-over-v {
  0%,
  100% {
    transform: translate(0, 0);
  }

  20% {
    transform: translate(0, calc(var(--play-span) * -0.5));
  }

  45%,
  58% {
    transform: translate(0, calc(var(--play-span) * -1));
  }

  78% {
    transform: translate(0, calc(var(--play-span) * -0.5));
  }
}

/* 绕圈追：两只一起往上窜再窜回来，慢半拍的那只有延迟，看着像追 */
@keyframes neko-play-chase-loop-v {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  22% {
    animation-timing-function: linear;
    transform: translate(calc(12px * var(--play-dir)), calc(var(--play-span) * -0.3))
      rotate(calc(4deg * var(--play-dir)));
  }

  45% {
    animation-timing-function: linear;
    transform: translate(0, calc(var(--play-span) * -0.55)) rotate(0deg);
  }

  70% {
    transform: translate(calc(-12px * var(--play-dir)), calc(var(--play-span) * -0.25))
      rotate(calc(-3deg * var(--play-dir)));
  }
}

/* 躲猫猫 · 躲的那只：往上缩到对方看不见的地方，藏一会儿再落回来 */
@keyframes neko-play-hide-v {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  25%,
  72% {
    transform: translate(0, calc(var(--play-gap) * -0.8)) scale(0.9);
  }
}

/* 躲猫猫 · 找的那只：左右歪头找两下，再往上探一探，最后没找着 */
@keyframes neko-play-seek-v {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  20% {
    transform: translate(-8px, -4px) rotate(-6deg);
  }

  40% {
    transform: translate(8px, -4px) rotate(6deg);
  }

  58% {
    transform: translate(0, calc(var(--play-gap) * -0.5)) rotate(0deg);
  }

  74% {
    transform: translate(0, 0) rotate(0deg);
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
    animation-timing-function: linear;
    transform: translateX(2px);
  }

  /* 掉头往左，一路缩着溜出画面（跑动段一律 linear：逐段自己起步、自己刹车，
     跑起来就成了抽搐；首尾两段仍用外面的缓动，起步和收尾才有轻重）*/
  45% {
    animation-timing-function: linear;
    transform: translateX(-200%) scale(0.94);
    opacity: 1;
  }

  /* 已经跑出画面外面了：留一点透明度当残影，别凭空消失 */
  56%,
  76% {
    animation-timing-function: linear;
    transform: translateX(-300%) scale(0.86);
    opacity: 0.4;
  }

  /* 又悄悄跑回来 */
  80% {
    animation-timing-function: linear;
    transform: translateX(-260%) scale(0.9);
    opacity: 0.85;
  }

  92% {
    transform: translateX(-20px) scale(1);
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
    animation-timing-function: linear;
    transform: translateX(-8px);
  }

  /* 追出去，追到那边张望一下 */
  58% {
    animation-timing-function: linear;
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

/* 左边那只：抬得高高的从对面上方跳过右半边去（跑动段逐段 linear，免得起一步刹一步）*/
@keyframes neko-play-swap-right {
  0%,
  100% {
    transform: translate(0, 0);
  }

  14% {
    animation-timing-function: linear;
    transform: translate(0, -70px);
  }

  /* 跳过去，在自己新位置上站一会儿 */
  44%,
  62% {
    animation-timing-function: linear;
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
    animation-timing-function: linear;
    transform: translate(0, 30px);
  }

  44%,
  62% {
    animation-timing-function: linear;
    transform: translate(-110%, 30px);
  }

  84% {
    transform: translate(0, 30px);
  }

  94% {
    transform: translate(0, -2px);
  }
}

/* 「左边 1 只、右边 2 只」那行小字躲开标题：父组件里同样这两条是 scoped 的
   （带 data-v-<HomeIntro>），命不中这里用自己模板渲染的同名类，所以照抄一份。
   不补的话多窗口时那行三百来像素的小字会跟标题挤在一条线上 */
@media (max-width: 768px) {
  .home-intro-title {
    flex-wrap: wrap;
    gap: 6px;
  }

  .home-intro-sub {
    margin-left: 0;
    width: 100%;
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

  /* 与在线卡同款的折行策略，再压到两行：这行小字折到第三行就会把同排那张卡一起拉高 */
  .home-live-meta {
    line-height: 1.35;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  /* 卡片只有半个屏宽，气泡再按槽宽收就只剩十来字一行：
     放宽到接近半屏（375 下 179.5px），但两头仍留出槽位到视口边的余量，既不裁字也不出屏 */
  .home-live-bubble {
    max-width: calc(50vw - 8px);
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

/* 说话与听着那几条规则用的是 animation 简写（顺带把 play-state 复位成 running），
   特异性又比上面高，所以得按原样列一遍才压得住：滚出视野时挂着的
   is-talking / is-listening 不该继续点头 */
.home-live.is-resting .home-live-slot.is-talking:not(.is-dragging):not(.is-playing) .home-live-card,
.home-live.is-resting .home-live-slot.is-talking:not(.is-dragging):not(.is-playing) :deep(.home-online),
.home-live.is-resting .home-live-slot.is-talking:is([data-gesture]):not(.is-dragging):not(.is-playing) .home-live-card,
.home-live.is-resting .home-live-slot.is-talking:is([data-gesture]):not(.is-dragging):not(.is-playing) :deep(.home-online),
.home-live.is-resting .home-live-slot.is-listening:not(.is-dragging):not(.is-playing) .home-live-card,
.home-live.is-resting .home-live-slot.is-listening:not(.is-dragging):not(.is-playing) :deep(.home-online) {
  animation-play-state: paused;
}

/* 演出动画挂在槽位上而不是卡片里，上面那几条后代选择器够不到它：
   正好演到一半切后台时，那段最长 7 秒的动作会一直占着合成器 */
.home-live.is-resting .home-live-slot.is-playing[data-play],
.home-live.is-resting .home-live-cards[data-layout] .home-live-slot.is-playing[data-play] {
  animation-play-state: paused;
}

/* ?static 那一屏只是摆着看：常驻浮动（卡片自己的慢浮、状态灯的呼吸与涟漪）整个停掉。
   省电模式要的就是「合成器什么都不用干」，光是不排期是不够的 */
.home-live.is-static .home-live-card,
.home-live.is-static .home-live-card *,
.home-live.is-static :deep(.home-online),
.home-live.is-static :deep(.home-online *) {
  animation: none;
}

/* 静态模式的卡片只是摆着看，不给拎也不回应：手势还给浏览器，
   手指正好压在卡片上时照样能滑页面（常态下这块被我们自己接管了，见卡片那条 touch-action: none） */
.home-live.is-static .home-live-card,
.home-live.is-static :deep(.home-online) {
  touch-action: auto;
}

@media (prefers-reduced-motion: reduce) {
  /* 互动动画的选择器特异性较高，这里要写成同级别才盖得住；
     竖排那套（上下走的版本）更高一层，得额外补一条更长的选择器 */
  .home-live-cards[data-layout] .home-live-slot.is-playing[data-play],
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

  /* 拎着晃、听者点头、隔壁小脑袋的弹进来，这几处也一并收掉。
     选择器必须跟原规则一字不差：原规则带 :not(.is-dragging):not(.is-playing)，
     只写 .is-listening / .is-dragging 是盖不住的（同特异性 + 写在后面才生效） */
  .home-live-slot.is-dragging .home-live-card,
  .home-live-slot.is-dragging :deep(.home-online),
  .home-live-slot.is-listening:not(.is-dragging):not(.is-playing) .home-live-card,
  .home-live-slot.is-listening:not(.is-dragging):not(.is-playing) :deep(.home-online),
  .home-live-visitor {
    animation: none;
  }

  .home-live-slot[data-arming] .home-live-card,
  .home-live-slot[data-arming] :deep(.home-online),
  .home-live-slot[data-tapped] .home-live-card,
  .home-live-slot[data-tapped] :deep(.home-online) {
    scale: 1;
    transition: none;
  }
}
</style>
