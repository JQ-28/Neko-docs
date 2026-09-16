<template>
  <!-- 永远渲染：这块槽位在首页是排好版的，数据没到就空着会留下一个洞，
       对手戏、拖拽「换位」还会把它当一张卡算进去 -->
  <div
    class="home-online"
    :class="{ 'is-static': props.static }"
    role="status"
    aria-live="polite"
  >
    <span class="home-online-glass" aria-hidden="true"></span>
    <img
      ref="avatarRef"
      class="home-online-avatar"
      src="/assets/image/neko11.jpg"
      alt=""
      width="34"
      height="34"
      aria-hidden="true"
      draggable="false"
    />
    <span class="home-online-text">
      <span class="home-online-name">在线猫猫</span>
      <span class="home-online-meta" :class="{ 'is-hint': hint }">{{ headline }}</span>
    </span>
    <span class="home-online-light" aria-hidden="true">
      <span class="home-online-light-ring"></span>
      <span class="home-online-light-core"></span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { markEgg } from "../eggs/egg-utils";
import { chineseNumber, periodOfHour } from "./live-lines";

/** 省电模式（地址带 ?static）：不发心跳、也不跑常驻动画，只安静地摆在那儿 */
const props = withDefaults(defineProps<{ static?: boolean }>(), { static: false });

const ENDPOINT = "/api/online";
/** 心跳间隔，与后端判定「掉线」的窗口配套：后端容忍 3 次心跳的静默 */
const HEARTBEAT_MS = 30_000;
const VISITOR_KEY = "neko-visitor-id";
const REQUEST_TIMEOUT_MS = 5_000;

const count = ref(0);
/** 人数到底拿到没有：「未知」（首次心跳还在路上 / 接口挂了）与「真的 0 只」是两回事，
    不能用同一个 0 混过去 —— 前者只能说句降级文案 */
type CountStatus = "unknown" | "known";
const status = ref<CountStatus>("unknown");
/** 降级与空场两句话：字数与常态那句接近，刷新时卡片高度不跳 */
const UNKNOWN_HEADLINE = "这会儿数不清，先按一只算";
const EMPTY_HEADLINE = "现在一只猫都没在逛";
/** 时间自己会走：人数没变时 computed 不会重算，跨过整点（例如 23:00 的深夜档）
    就会一直停在白天那句，所以敲一个会变的数让时段相关的文案跟着刷新 */
const clockTick = ref(0);

/** 人数也往外抛一份：卡片说话时要拿真实的在线数当梗，不能自己编 */
const emit = defineEmits<{ count: [value: number] }>();
watch(count, (value) => emit("count", value));
/** 有人进来时短暂顶替的文案，几秒后让位给常态统计 */
const hint = ref("");
const avatarRef = ref<HTMLImageElement | null>(null);

const ARRIVE_HINT_MS = 2600;
/** 头像隔多久自己动一下的随机区间：间隔不固定才不像机器 */
const IDLE_MIN_MS = 16_000;
const IDLE_MAX_MS = 38_000;

// 头像动一下：偶尔歪歪头，或者被新来的猫惊动
function nudgeAvatar(): void {
  const avatar = avatarRef.value;
  if (!avatar) return;
  // 先摘掉再强制重排，保证连续两次也能各自播出动画
  avatar.classList.remove("is-moving");
  void avatar.offsetWidth;
  avatar.classList.add("is-moving");
}

function scheduleIdleMove(): void {
  // 偏好减少动效时整个不调度，省得空转着往元素上贴 class
  if (reduceMotion) return;
  window.clearTimeout(idleTimer);
  const delay = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS);
  idleTimer = window.setTimeout(() => {
    // 后台标签页里不歪头：nudgeAvatar 要读一次 offsetWidth 强制重排，
    // 看不见的时候纯属白烧电。链子照排，回到前台自然就接上了
    if (!document.hidden) nudgeAvatar();
    scheduleIdleMove();
  }, delay);
}

/** 偏好减少动效的匹配器：构造一次、change 里更新即可，
    每次回调都现建一个 MediaQueryList 是白花钱 */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
let reduceMotionQuery: MediaQueryList | null = null;
let reduceMotion = false;

function onReduceMotionChange(event: MediaQueryListEvent): void {
  reduceMotion = event.matches;
}

function watchReducedMotion(): void {
  reduceMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  reduceMotion = reduceMotionQuery.matches;
  reduceMotionQuery.addEventListener("change", onReduceMotionChange);
}

// 换个时段就换个说法，同一个小网站早中晚读起来不一样
const period = computed(() => {
  // 读一下这个会变的数：人数一直不变时，跨过时段边界也要能重算
  void clockTick.value;
  return periodOfHour(new Date().getHours());
});

const baseHeadline = computed(() => {
  // 还没拿到过人数：先给一句降级文案，别让卡片空着
  if (status.value === "unknown") return UNKNOWN_HEADLINE;

  const total = count.value;
  if (total <= 0) return EMPTY_HEADLINE;

  const words = chineseNumber(total);
  if (total === 1) {
    if (period.value === "night") return "就剩你一只猫还没睡";
    if (period.value === "morning") return "这么早就你一只猫在逛";
    if (period.value === "evening") return "傍晚就你一只猫在看";
    return "现在就你一只猫在逛这个小网站";
  }

  if (period.value === "night") return `深夜还有${words}只猫没睡`;
  if (period.value === "morning") return `早起的${words}只猫已经在逛了`;
  if (period.value === "evening") return `傍晚有${words}只猫在这儿`;
  return `现在有${words}只猫在逛这个小网站`;
});

const headline = computed(() => hint.value || baseHeadline.value);

// 夜深了，整个站上只剩你一只猫在逛
const aloneLateNight = computed(() => count.value === 1 && period.value === "night");

watch(aloneLateNight, (alone) => {
  if (alone) markEgg("onlineAlone");
});

// 有人来就报一声；有人走不吭声，免得像在赶客
function applyCount(next: number): void {
  const previous = count.value;
  status.value = "known";
  count.value = next;
  if (previous > 0 && next > previous) {
    hint.value = "又来了一只猫";
    nudgeAvatar();
    window.clearTimeout(arriveTimer);
    arriveTimer = window.setTimeout(() => {
      hint.value = "";
    }, ARRIVE_HINT_MS);
  }
}

// 匿名访客 ID：只用于去重，不含任何身份信息，清掉浏览器数据就换新号
function readVisitorId(): string {
  try {
    const saved = window.localStorage.getItem(VISITOR_KEY);
    if (saved) return saved;
    const created =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    // 隐私模式下 localStorage 不可写，退化成一次性的临时 ID（只影响本次统计）
    return `temp${Date.now().toString(36)}`;
  }
}

let visitorId = "";
let timer: number | undefined;
let arriveTimer = 0;
let idleTimer = 0;
let inFlight = false;
/** 正在途中的那次心跳：卸载时得中断，不然 SPA 里来回切页会留下没人管的请求 */
let beatController: AbortController | null = null;

async function beat(): Promise<void> {
  if (inFlight) return;
  inFlight = true;

  const controller = new AbortController();
  beatController = controller;
  const abortTimer = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: visitorId }),
      signal: controller.signal,
    });
    if (!response.ok) return;
    const data = (await response.json()) as { count?: unknown };
    // 0 只也是合法结果（自己那份心跳已经算进去了，只是接口这么答），
    // 得让它落到「空场」那句上，别跟「还没拿到」混着
    if (typeof data.count === "number" && data.count >= 0) {
      applyCount(data.count);
    }
  } catch {
    // 统计坏掉不该影响页面，静默失败，等下一次心跳自愈
  } finally {
    window.clearTimeout(abortTimer);
    // 卸载时已经把记号撤了，这里别把它写回一个已作废的 controller
    if (beatController === controller) beatController = null;
    inFlight = false;
  }
}

function handleVisibilityChange(): void {
  // 页面在后台时定时器仍会跑，回到前台补一次，避免显示过期的数字
  if (!document.hidden) void beat();
}

onMounted(() => {
  // 省电模式：不打卡、也不排歪头，卡片就安安静静摆在那儿
  if (props.static) return;

  visitorId = readVisitorId();
  watchReducedMotion();
  void beat();
  scheduleIdleMove();
  timer = window.setInterval(() => {
    // 时段文案靠它跟着钟走；后台时不敲，反正也看不见
    if (document.hidden) return;
    clockTick.value = Date.now();
    void beat();
  }, HEARTBEAT_MS);
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
  window.clearTimeout(arriveTimer);
  window.clearTimeout(idleTimer);
  reduceMotionQuery?.removeEventListener("change", onReduceMotionChange);
  reduceMotionQuery = null;
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  // 卸载时把在途的那次心跳掐掉：组件走了，回来的响应也没人要了
  beatController?.abort();
  beatController = null;
});
</script>

<style scoped>
/* 小卡片：贴在标题行右侧，与标题成组，不另占一行 */
.home-online {
  --online-state: var(--live-hue, #22c55e);
  --online-tilt: 0.6deg;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  /* 这张卡在 Neko 卡右边，内部整体镜像：头像靠右、指示灯靠左，两张卡像面对面坐着 */
  flex-direction: row-reverse;
  align-items: center;
  gap: 10px;
  min-width: 232px;
  /* 左右内边距跟着镜像，头像一侧留白小、指示灯一侧留白大 */
  padding: 10px 14px 10px 18px;
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--vp-c-accent, #096dd9) 10%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  rotate: var(--online-tilt);
  scale: 1;
  transition: rotate 0.3s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
    scale 0.3s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
    box-shadow 0.45s ease, border-color 0.3s ease;
  /* 入场用 transform、常驻浮动用 translate 属性，两者互不覆盖 */
  animation: home-online-in 0.44s cubic-bezier(0.22, 1, 0.36, 1),
    neko-card-float 10s cubic-bezier(0.455, 0.03, 0.515, 0.955) 0.7s infinite;
}

/* 渐变描边：用 mask 把渐变裁成只有边框那一圈 */
.home-online-glass {
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

.home-online > :not(.home-online-glass) {
  position: relative;
  z-index: 2;
}

.home-online-avatar {
  flex: none;
  width: 34px;
  height: 34px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  object-fit: cover;
  background: #f0e6f6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  /* 从偏下处转，歪头才像歪脖子而不是原地打转 */
  transform-origin: 58% 82%;
  /* 头像不吃指针事件：手指按在头像上也算按着这张卡（否则安卓会把它当成「拖走这张图」，
     iOS 长按还会弹出「存储图像」那一套）。事件穿到卡片本体上，拖拽那几条判断才连得上 */
  pointer-events: none;
  -webkit-user-drag: none;
}

/* 偶尔歪下头，或被人来惊动一下 */
.home-online-avatar.is-moving {
  animation: home-online-peek 0.86s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes home-online-peek {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }

  30% {
    transform: rotate(-8deg) scale(1.07);
  }

  62% {
    transform: rotate(5deg) scale(1.03);
  }
}

.home-online-text {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  /* 文字整体靠右，贴着右侧的头像，与左边那张卡的左对齐互为镜像 */
  align-items: flex-end;
  gap: 1px;
  text-align: right;
}

.home-online-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--vp-c-accent, #096dd9);
}

.home-online-meta {
  font-size: 11px;
  letter-spacing: 0.2px;
  white-space: nowrap;
  /* 右对齐后文字块是收缩宽度，这里限死上限，人数涨到三位数时仍然截得住 */
  max-width: 100%;
  /* 卡片窄，人数涨到三位数时不让文案把卡片撑破 */
  overflow: hidden;
  text-overflow: ellipsis;
  /* 原来那版 #a397b2 在白色卡片上只有 2.76:1，11px 要 4.5:1 才达标；
     换成站内已有的次级文字色（标题行右侧小字同款），实测 4.76:1 */
  color: #7d6c8e;
  transition: color 0.25s ease-out;
}

html.dark .home-online-meta:not(.is-hint) {
  /* 深色下卡片底是 rgba(30, 34, 42, 0.86)，实测 6.5:1。
     带 :not(.is-hint) 是为了不盖掉下面「有人进来」那几秒的提亮色（它的特异性比 html.dark 低） */
  color: #a9a2b8;
}

/* 有人进来的那几秒，文案跟着提亮一下，像有人在说话 */
.home-online-meta.is-hint {
  color: var(--vp-c-accent, #096dd9);
  font-weight: 600;
}

.home-online-light {
  flex: none;
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
}

.home-online-light-core,
.home-online-light-ring {
  grid-area: 1 / 1;
  border-radius: 50%;
}

/* 指示灯的色与节奏可以由外面（首页那排卡片）从槽位上传下来，
   没传就是原来那盏绿 —— 其它地方引这个组件时不用管这些变量 */
.home-online-light-core {
  width: 9px;
  height: 9px;
  background: var(--online-state);
  box-shadow: 0 0 0 var(--live-glow, 3px) color-mix(in srgb, var(--online-state) 18%, transparent);
  animation: home-online-breathe var(--live-beat, 2.4s) ease-in-out infinite;
}

.home-online-light-ring {
  width: 9px;
  height: 9px;
  border: 1.5px solid var(--online-state);
  opacity: 0;
  animation: home-online-ripple var(--live-beat, 2.4s) ease-out infinite;
}

html.dark .home-online {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(30, 34, 42, 0.86);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

html.dark .home-online-glass {
  opacity: 0.32;
}

html.dark .home-online-avatar {
  background: #262a33;
  border-color: rgba(255, 255, 255, 0.18);
}

/* 与首页功能卡同款交互：回正并轻微放大 */
@media (hover: hover) and (pointer: fine) {
  .home-online:hover {
    rotate: 0deg;
    scale: 1.03;
    border-color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 15px 40px color-mix(in srgb, var(--vp-c-accent, #096dd9) 18%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }
}

@keyframes home-online-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes home-online-breathe {
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

@keyframes home-online-ripple {
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

/* 省电模式（?static）：常驻的浮动、呼吸、涟漪全关，卡片只是安静摆在那儿。
   特异性都比被覆盖的那几条高，位置也写在它们之后 */
.home-online.is-static,
.home-online.is-static .home-online-light-core,
.home-online.is-static .home-online-light-ring {
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .home-online,
  .home-online-light-core,
  .home-online-light-ring,
  .home-online-avatar.is-moving {
    animation: none;
  }

  .home-online {
    rotate: 0deg;
    transition: none;
  }
}
</style>
