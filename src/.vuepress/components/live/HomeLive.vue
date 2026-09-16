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
        @pointermove="onPointerMove($event, card)"
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
import { markEgg } from "../eggs/egg-utils";
import { GREETING_REPLY_MS, speechLingerMs, useLiveTalk } from "./live-chat";
import { anyDropLines, dropLineFor, nekoMetaLine, recentLine, todayDoing } from "./live-lines";
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
import {
  isBackToTop,
  nearestHtml,
  resolveDropTarget,
  type DropCategory,
} from "./live-drop-targets";
import {
  idlePeerLink,
  startPeerLink,
  type CardSpec,
  type HandoffPayload,
  type LiveEdge,
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
/** 连着第几天来记在这儿 */
const STREAK_KEY = "neko-live-streak";
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
/** 连着第几天来（断了两天以上从头数） */
let streak = 1;
/** 她今天在干什么：挂载时按日期算一回，同一天不变 */
let doingToday = "";
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

/** 观众的指针/手指这会儿在哪边，范围 -1..1（0 是正中间）。她照这个偏头。
    鼠标和手指走的是同一条 pointermove，所以「有人走到跟前」这件事对触屏一样成立 ——
    手机上手指划过卡片，她也看得见 */
let lookX = 0;
let lookY = 0;
/** 指针位置先记下来，每帧只算一次：pointermove 一秒能来上百次 */
let lookTargetX = 0;
let lookTargetY = 0;
let lookFrame = 0;
/** 手停下这么久就把头摆正（也是手机上「手指抬走了」的收尾） */
const LOOK_RESET_MS = 2_600;
let lookResetTimer = 0;
/** 卡片区往外扩这么多像素，是她「注意到有人」的范围：再远就不该有反应 */
const LOOK_REACH_PX = 240;

/** 这台设备主要用手指操作吗：台词要分两版（桌面上能说「小箭头」，手机上只能说到手） */
const touchDevice = ref(false);

/** 指针离开窗口、选中了一段文字、手机被转过去：三件「她在旁边看着」的事，各记一个时间戳 */
let pointerGoneAt = 0;
let selectionAt = 0;
let flippedAt = 0;
let lastViewW = 0;
let lastViewH = 0;

function clampUnit(value: number): number {
  return Math.min(1, Math.max(-1, value));
}

function writeLook(): void {
  const el = stage.value;
  if (!el) return;
  el.style.setProperty("--look-x", lookX.toFixed(3));
  el.style.setProperty("--look-y", lookY.toFixed(3));
}

function resetLook(): void {
  lookX = 0;
  lookY = 0;
  writeLook();
}

/** 把指针位置换算成「相对卡片区正中间的方向」，越远越接近 ±1，但超出感知范围就卡在 ±1 */
function applyLook(): void {
  const box = stage.value?.getBoundingClientRect();
  if (!box || box.width === 0) return;
  const reach = Math.max(box.width, 320) / 2 + LOOK_REACH_PX;
  lookX = clampUnit((lookTargetX - (box.left + box.width / 2)) / reach);
  lookY = clampUnit((lookTargetY - (box.top + box.height / 2)) / reach);
  writeLook();
}

function onLookMove(event: PointerEvent): void {
  if (staticMode) return;
  lookTargetX = event.clientX;
  lookTargetY = event.clientY;
  if (!lookFrame) {
    lookFrame = window.requestAnimationFrame(() => {
      lookFrame = 0;
      applyLook();
    });
  }
  // 手一停就慢慢把视线收回来：一直偏着会像瞪着某个角落
  window.clearTimeout(lookResetTimer);
  lookResetTimer = window.setTimeout(resetLook, LOOK_RESET_MS);
}

/** 指针移出窗口（桌面才有这个概念）：台词问的是「人还在吗」，手机上换成切后台那条 */
function onPointerGone(): void {
  pointerGoneAt = Date.now();
  resetLook();
}

/** 观众选中了一段文字（手机上长按复制走的是同一个事件） */
function onSelectionChange(): void {
  const text = window.getSelection()?.toString().trim() ?? "";
  if (text.length >= 2) selectionAt = Date.now();
}

/** 窗口宽高互换了：手机被转过去才会这样，桌面改窗口大小不算 */
function onViewResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (lastViewW > 0 && lastViewH > 0 && w > h !== lastViewW > lastViewH) {
    flippedAt = Date.now();
  }
  lastViewW = w;
  lastViewH = h;
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
/** 从按下到抬手挪过这么点距离才算「拎着走了一趟」，否则只当戳了一下。
    鼠标那条路按下就直接进拖拽，没有这道门槛的话，单击会一路走完落点判定 ——
    卡片中心那一点穿透到底下的卡片区容器上，被认成一个泛化落点，
    抬手瞬间把刚回的那句顶掉、整排卡闪一下，还白白记成「刚被拎过」 */
const CLICK_SLOP_PX = 6;
/** 鼠标按下之后挪过这么多像素才算「要拎」，在那之前只是按下。
    原先按下就进拖拽，于是「点一下」也照样晃起来、还说一句被拎起来的抱怨 ——
    点一下就该是点一下，拖才是拖（手指那条路有自己的长按等待，见 holdToDrag） */
const MOUSE_DRAG_SLOP_PX = 4;
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

/** 一口气从顶滚到底：从顶部算起两秒半之内见底才算「嗖一下」（`SCROLL_DASH_MS`） */
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

/** 本地自然日的序号：按 0 点切，不是满 24 小时。连续天数要按这个算 ——
    存时间戳的话「昨晚十一点来过、今早八点又来」会被算成没断过 */
function localDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

/** 连着第几天打开这一页：同一天再来不动、昨天来过就 +1、断了两天以上从头数。
    读完就把今天记下（跟 readAwayDays 一个路子）；隐私模式读不到就当作头一回来 */
function readStreak(): number {
  try {
    const today = localDayNumber(new Date());
    const raw = window.localStorage.getItem(STREAK_KEY);
    const saved = raw ? (JSON.parse(raw) as { day?: number; streak?: number }) : null;
    const before = saved?.streak ?? 1;
    let next = 1;
    if (saved?.day === today) next = Math.max(before, 1);
    else if (saved?.day === today - 1) next = before + 1;
    window.localStorage.setItem(STREAK_KEY, JSON.stringify({ day: today, streak: next }));
    return next;
  } catch {
    // 隐私模式等存储异常：当头一回来
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
  // 手到底停了多久：分档用 —— 停半分钟、两分钟、五分钟，她想说的话不一样
  cursorIdleMs: () => (cursorMovedAt > 0 ? Date.now() - cursorMovedAt : 0),
  // 这台设备主要用手指操作吗（台词分桌面版与触摸版）
  touch: () => touchDevice.value,
  pointerGone: () => pointerGoneAt > 0 && Date.now() - pointerGoneAt < MOMENT_FRESH_MS,
  scrolled: () => lastScrollAt > 0 && Date.now() - lastScrollAt < MOMENT_FRESH_MS,
  selectionMade: () => selectionAt > 0 && Date.now() - selectionAt < MOMENT_FRESH_MS,
  flipped: () => flippedAt > 0 && Date.now() - flippedAt < MOMENT_FRESH_MS,
  // 好奇与黏人这两档：手刚动过 / 手一直搁在卡片上（对应 live-chat 里的 curious 与 clingy）
  cursorFresh: () => cursorMovedAt > 0 && Date.now() - cursorMovedAt < CURSOR_FRESH_MS,
  hoverHoldMs: () => (hoverInsideAt > 0 ? Date.now() - hoverInsideAt : 0),
  tapBurst: () => tapBurstAt > 0 && Date.now() - tapBurstAt < MOMENT_FRESH_MS,
  scrollDash: () => scrollDashAt > 0 && Date.now() - scrollDashAt < MOMENT_FRESH_MS,
  awayDays: () => awayDays,
  online: () => onlineCount,
  visitTimes: () => visitTimes,
  streak: () => streak,
  doing: () => doingToday,
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
/** 鼠标按下之后、还没挪够距离的那一小段：这一刻还不算拎起来，挪够了才转成 drag */
interface ArmedDrag {
  readonly pointerId: number;
  readonly card: CardSpec;
  readonly slot: HTMLElement;
  readonly handle: HTMLElement;
  readonly startX: number;
  readonly startY: number;
}
let armedDrag: ArmedDrag | null = null;
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

  // 换位这条不走 restoreCard（那是「回原位」那条路）：气泡朝向的标记得自己摘 ——
  // 不然拎到屏幕顶上换过位的那张，之后气泡一直挂在卡片下面
  [moving, target].forEach((slot) => delete slot.dataset.bubbleBelow);
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
  if (drag || armedDrag || touchHoldAt || pageScroll) return;

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
  // 先只是「按着」，挪够了才算拎（见 onPointerMove）：点一下不该把猫晃起来
  armMouseDrag(event, card, slot, handle);
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

/** 鼠标按下了，先只是「按着」：等指针挪过 `MOUSE_DRAG_SLOP_PX` 才算真要拎（见 onPointerMove）。
    不这么做的话，按下的那一刻卡片就晃起来、还说一句被拎起来的抱怨 —— 点一下也会那样 */
function armMouseDrag(
  event: PointerEvent,
  card: CardSpec,
  slot: HTMLElement,
  handle: HTMLElement
): void {
  armedDrag = {
    pointerId: event.pointerId,
    card,
    slot,
    handle,
    startX: event.clientX,
    startY: event.clientY,
  };
  // 指针捕获现在就设上：挪够之前指针可能已经滑出卡片了，消息得照样送回来
  try {
    handle.setPointerCapture(event.pointerId);
  } catch {
    /* 抓不到就按没抓到继续走，兜底那条路会收拾 */
  }
}

/** 真的把卡片拿起来：鼠标挪够距离了、或者手指按住够久了，都走这儿 */
function beginDrag(
  event: PointerEvent,
  card: CardSpec,
  slot: HTMLElement,
  handle: HTMLElement,
  origin?: { x: number; y: number }
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
    // 鼠标那条路是「按下之后挪够了才进来」的，起点得用当初按下那一点，
    // 不然这几像素的差值会让卡片一拎起来就跳一下
    startX: origin?.x ?? event.clientX,
    startY: origin?.y ?? event.clientY,
    lastX: origin?.x ?? event.clientX,
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
  // 「按着还没挪够」那种半截状态也一并收掉：留着的话下次按下才发现它是旧的
  armedDrag = null;
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
    kind 于是有两套来源：`feat` / `recent` / `goto` / `bin` / `title` / `cmd` 那套，
    与 `link` / `heading` / … 这套（category 非空就说明走的是泛化那条路） */
interface DropHit {
  el: HTMLElement;
  kind: string;
  category: DropCategory | null;
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

/** 清掉拖拽留在槽位上的行内样式。气泡朝向那个标记也归这儿 ——
    只在 restoreCard 里摘的话，「就地松手」与「换位」这两条不走 restoreCard 的路会漏掉它，
    之后这只猫每次开口气泡都挂在卡片下面（卡片滚到屏幕下半截时正好被挤出视口） */
function resetSlotInline(slot: HTMLElement): void {
  slot.style.translate = "";
  slot.style.rotate = "";
  delete slot.dataset.bubbleBelow;
}

/** 把一张卡从「被收走」的动画里放出来：那两条动画都是 forwards 的，
    不主动把标记和行内位移清掉，这张卡就一直停在缩没的状态上 */
function restoreCard(cardId: string): void {
  const slot = slotEls.get(cardId);
  if (!slot) return;
  delete slot.dataset.carried;
  delete slot.dataset.retired;
  // 贴着屏幕顶时气泡临时翻到了下面（见 syncBubbleSide），回位也还原成默认朝上
  resetSlotInline(slot);
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
      // 这张卡是停在落点上把退场动画演完的，没有别的地方会替它走 restoreCard ——
      // 不收拾的话摘掉标记之后它带着位移永久停在寄养处
      restoreCard(card.id);
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

/** 在卡面上摸来摸去：指针累计挪过这么多像素才算「摸到头顶了」。
    太小的话鼠标只是路过就被当成摸头，太大又得来回搓好几下才有反应 */
const PAT_TRAVEL_PX = 80;
/** 摸停手这么久就当人把手拿开了：卡片落回去，猫把头抬起来 */
const PAT_IDLE_MS = 1_100;
/** 两次采样隔过这么久就当中间手离开过（鼠标划出卡片再划回来，中间那段事件根本没派发到这儿）：
    不这么判的话，出去一趟再回来，中间那一大截距离也会被算成「摸」 */
const PAT_SAMPLE_GAP_MS = 200;

/** 每张卡「还在被摸」的计时器：一直在摸就一直续着，停手到点才退回去 */
const patTimers = new WeakMap<HTMLElement, number>();
/** 这一轮攒了多少位移、上次采样落在哪一点与什么时候 */
let patTravel = 0;
let patFrom = { x: 0, y: 0 };
let patAt = 0;

/** 摸着的时候：卡片再抬起来一点、玻璃边亮起来慢慢流动、头像往手那边歪一下 ——
    就是「指令速查」那些卡片被指到时的观感，只是多一层「被摸到了」的意思。
    回话自己有间隔（见 live-chat 的 pat），手一直摸也不会一路念下去 */
function startPat(slot: HTMLElement, card: CardSpec): void {
  const began = slot.dataset.pat !== "true";
  slot.dataset.pat = "true";
  if (began) talk.pat(card);
  window.clearTimeout(patTimers.get(slot));
  patTimers.set(slot, window.setTimeout(() => delete slot.dataset.pat, PAT_IDLE_MS));
}

/** 鼠标悬在卡面上摸来摸去（不点不按）就当作在摸头。
    只看真指针：触屏没有「悬停」这回事，手指按下去就已经是点或者拎了 */
function maybePat(event: PointerEvent, card: CardSpec): void {
  if (event.pointerType !== "mouse" || staticMode || show.isPlaying()) return;
  const slot = event.currentTarget as HTMLElement | null;
  const onCard = (event.target as HTMLElement | null)?.closest(".home-live-card, .home-online");
  // 指针滑到槽位那一圈空隙上就不算摸着：那是两张卡之间的地板，
  // 位移也一并清掉，免得「这里摸一点那里摸一点」凑出一次摸头
  if (!slot || !onCard || !slot.contains(onCard)) {
    patAt = 0;
    patTravel = 0;
    return;
  }
  const now = performance.now();
  // 隔得太久说明中间手离开过：这一段不算「摸」，重新记起点
  if (now - patAt > PAT_SAMPLE_GAP_MS) {
    patFrom = { x: event.clientX, y: event.clientY };
    patAt = now;
    return;
  }
  patTravel += Math.hypot(event.clientX - patFrom.x, event.clientY - patFrom.y);
  patFrom = { x: event.clientX, y: event.clientY };
  patAt = now;
  if (patTravel < PAT_TRAVEL_PX) return;
  patTravel = 0;
  startPat(slot, card);
}

function onPointerMove(event: PointerEvent, card: CardSpec): void {
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
  // 鼠标按下之后挪够距离了：这一刻才真的拎起来（起点仍按「按下的那一点」算，
  // 跟手不会因为这几像素而跳）；接着落到下面那段跟手逻辑，这一帧就追上手的当前位置
  if (armedDrag && event.pointerId === armedDrag.pointerId) {
    const moved = Math.hypot(event.clientX - armedDrag.startX, event.clientY - armedDrag.startY);
    if (moved < MOUSE_DRAG_SLOP_PX) return;
    const armed = armedDrag;
    armedDrag = null;
    beginDrag(event, armed.card, armed.slot, armed.handle, { x: armed.startX, y: armed.startY });
  }

  // 手上没拎着东西：这一下多半只是鼠标搁在卡面上摸来摸去（摸头）
  if (!drag || event.pointerId !== drag.pointerId) {
    maybePat(event, card);
    return;
  }
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
  // 鼠标按下之后没挪够距离就抬手了：这一下就是戳了一下 —— poke 在按下时已经回过了，
  // 中途没晃起来、也没说那句被拎起来的抱怨，正是「点一下」该有的样子
  if (armedDrag && event.pointerId === armedDrag.pointerId) {
    const armed = armedDrag;
    armedDrag = null;
    if (armed.handle.hasPointerCapture(event.pointerId)) {
      armed.handle.releasePointerCapture(event.pointerId);
    }
    return;
  }
  if (!drag || event.pointerId !== drag.pointerId) return;

  const { slot, handle, cardId, kind } = drag;
  if (handle.hasPointerCapture(event.pointerId)) {
    handle.releasePointerCapture(event.pointerId);
  }

  // 抬手时几乎没挪动过：这一下就是戳了一下，按下时那句回话已经在说了，到此为止。
  // 接着往下走会跑完一整套落点判定（原因见 CLICK_SLOP_PX 那段），把刚说的那句顶掉
  if (Math.hypot(drag.shiftX, drag.shiftY) < CLICK_SLOP_PX) {
    resetSlotInline(slot);
    // 留着说话：那句 poke 还在气泡里，不能跟着「拎着时那句抱怨」一起收掉
    dropRelease(true);
    show.resume();
    return;
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
    } else if (target.kind === "bin") {
      // 寄养那条动画是「在落点上缩没 → 待一会儿 → 自己爬回来」，位移得留着才看得见；
      // 走 releaseDrag 的话 restoreCard 会把 data-retired 一起摘掉，动画永远启动不了。
      // 卡片由 retireCard 那笔收尾放回原位
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
    resetSlotInline(slot);
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
  if (armedDrag && event.pointerId === armedDrag.pointerId) armedDrag = null;
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
  const armedId = armedDrag?.pointerId;
  if (
    event.pointerId !== scrollId &&
    event.pointerId !== dragId &&
    event.pointerId !== holdId &&
    event.pointerId !== armedId
  ) {
    return;
  }
  window.setTimeout(() => {
    if (holdId !== undefined && touchHoldAt?.pointerId === holdId) cancelHold();
    // 「按着还没挪够」这一小段也得兜：它挂着的时候下一次按下会被那道守卫挡掉，
    // 表现就是「点了没反应、卡也拎不起来」
    if (armedId !== undefined && armedDrag?.pointerId === armedId) armedDrag = null;
    if (scrollId !== undefined && pageScroll?.pointerId === scrollId) glideAway();
    if (dragId !== undefined && drag?.pointerId === dragId) abortDrag();
  }, 0);
}

/** 窗口失去焦点（切到别的应用、Alt+Tab）：指针消息不会再有下文了，直接收拾 */
function onWindowBlur(): void {
  if (drag || armedDrag || touchHoldAt || pageScroll) abortDrag();
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
  streak = readStreak();
  doingToday = todayDoing(localDayNumber(new Date()));
  window.addEventListener("pointermove", noteActivity, { passive: true });
  window.addEventListener("keydown", noteActivity);
  window.addEventListener("pointerdown", noteActivity, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  // 指针消息丢了的兜底收尾（详见 onPointerEndFallback）
  window.addEventListener("pointerup", onPointerEndFallback, true);
  window.addEventListener("pointercancel", onPointerEndFallback, true);
  window.addEventListener("blur", onWindowBlur);

  // 「她在看着你」这条线的信号：指针走到哪、指针走了没、选中了什么、手机转没转
  touchDevice.value = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  lastViewW = window.innerWidth;
  lastViewH = window.innerHeight;
  window.addEventListener("pointermove", onLookMove, { passive: true });
  window.addEventListener("resize", onViewResize);
  // 指针移出窗口只有鼠标有这条路：手机上「人走了」是切后台，走 visibilitychange
  document.documentElement.addEventListener("mouseleave", onPointerGone);
  document.addEventListener("selectionchange", onSelectionChange);

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
  window.removeEventListener("pointermove", onLookMove);
  window.removeEventListener("resize", onViewResize);
  document.documentElement.removeEventListener("mouseleave", onPointerGone);
  document.removeEventListener("selectionchange", onSelectionChange);
  window.clearTimeout(lookResetTimer);
  if (lookFrame) window.cancelAnimationFrame(lookFrame);
});

</script>

<style scoped src="./home-live.css"></style>
