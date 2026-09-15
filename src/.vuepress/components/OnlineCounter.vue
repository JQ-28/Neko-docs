<template>
  <div v-if="count > 0" class="home-online" role="status" aria-live="polite">
    <span class="home-online-glass" aria-hidden="true"></span>
    <img
      ref="avatarRef"
      class="home-online-avatar"
      src="/assets/image/neko11.jpg"
      alt=""
      width="34"
      height="34"
      aria-hidden="true"
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
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const ENDPOINT = "/api/online";
/** 心跳间隔，与后端判定「掉线」的窗口配套：后端容忍 3 次心跳的静默 */
const HEARTBEAT_MS = 30_000;
const VISITOR_KEY = "neko-visitor-id";
const REQUEST_TIMEOUT_MS = 5_000;

const count = ref(0);
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
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.clearTimeout(idleTimer);
  const delay = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS);
  idleTimer = window.setTimeout(() => {
    nudgeAvatar();
    scheduleIdleMove();
  }, delay);
}

function periodOfHour(hour: number): "night" | "morning" | "day" {
  if (hour < 5) return "night";
  if (hour < 8) return "morning";
  return "day";
}

// 换个时段就换个说法，同一个小网站早中晚读起来不一样
const baseHeadline = computed(() => {
  const total = count.value;
  if (total <= 0) return "";

  const period = periodOfHour(new Date().getHours());
  if (total === 1) {
    if (period === "night") return "就剩你一只猫还没睡";
    if (period === "morning") return "你是今天第一只来的猫";
    return "现在就你一只猫在逛这个小网站";
  }

  if (period === "night") return `深夜还有 ${total} 只猫没睡`;
  if (period === "morning") return `早起的 ${total} 只猫已经在逛了`;
  return `现在有 ${total} 只猫在逛这个小网站`;
});

const headline = computed(() => hint.value || baseHeadline.value);

// 有人来就报一声；有人走不吭声，免得像在赶客
function applyCount(next: number): void {
  const previous = count.value;
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

async function beat(): Promise<void> {
  if (inFlight) return;
  inFlight = true;

  const controller = new AbortController();
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
    if (typeof data.count === "number" && data.count > 0) {
      applyCount(data.count);
    }
  } catch {
    // 统计坏掉不该影响页面，静默失败，等下一次心跳自愈
  } finally {
    window.clearTimeout(abortTimer);
    inFlight = false;
  }
}

function handleVisibilityChange(): void {
  // 页面在后台时定时器仍会跑，回到前台补一次，避免显示过期的数字
  if (!document.hidden) void beat();
}

onMounted(() => {
  visitorId = readVisitorId();
  void beat();
  scheduleIdleMove();
  timer = window.setInterval(() => {
    if (!document.hidden) void beat();
  }, HEARTBEAT_MS);
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
  window.clearTimeout(arriveTimer);
  window.clearTimeout(idleTimer);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});
</script>

<style scoped>
/* 小卡片：贴在标题行右侧，与标题成组，不另占一行 */
.home-online {
  --online-state: #22c55e;
  --online-tilt: 0.6deg;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 232px;
  padding: 10px 18px 10px 14px;
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
  gap: 1px;
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
  color: #a397b2;
  transition: color 0.25s ease-out;
}

/* 有人进来的那几秒，文案跟着提亮一下，像有人在说话 */
.home-online-meta.is-hint {
  color: var(--vp-c-accent, #096dd9);
  font-weight: 600;
}

/* 右端补一句刷新说明，通栏右侧才不会空落落 */
.home-online-note {
  flex: none;
  font-size: 11px;
  letter-spacing: 0.2px;
  white-space: nowrap;
  color: #b6adc4;
}

html.dark .home-online-note {
  color: #7d7689;
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

.home-online-light-core {
  width: 9px;
  height: 9px;
  background: var(--online-state);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--online-state) 18%, transparent);
  animation: home-online-breathe 2.4s ease-in-out infinite;
}

.home-online-light-ring {
  width: 9px;
  height: 9px;
  border: 1.5px solid var(--online-state);
  opacity: 0;
  animation: home-online-ripple 2.4s ease-out infinite;
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
    opacity: 0.72;
  }
}

@keyframes home-online-ripple {
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
