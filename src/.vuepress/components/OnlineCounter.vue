<template>
  <div v-if="count > 0" class="home-online" role="status" aria-live="polite">
    <span class="home-online-glass" aria-hidden="true"></span>
    <img
      class="home-online-avatar"
      src="/assets/image/neko11.jpg"
      alt=""
      width="34"
      height="34"
      aria-hidden="true"
    />
    <span class="home-online-text">
      <span class="home-online-name">在线猫猫</span>
      <span class="home-online-meta">每 30 秒自动刷新</span>
    </span>
    <span class="home-online-light" aria-hidden="true">
      <span class="home-online-light-ring"></span>
      <span class="home-online-light-core"></span>
    </span>
    <span class="home-online-count">{{ count }} 只</span>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const ENDPOINT = "/api/online";
/** 心跳间隔，与后端判定「掉线」的窗口配套：后端容忍 3 次心跳的静默 */
const HEARTBEAT_MS = 30_000;
const VISITOR_KEY = "neko-visitor-id";
const REQUEST_TIMEOUT_MS = 5_000;

const count = ref(0);

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
      count.value = data.count;
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
  timer = window.setInterval(() => {
    if (!document.hidden) void beat();
  }, HEARTBEAT_MS);
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});
</script>

<style scoped>
/* 视觉沿用状态页账号卡片：渐变描边玻璃层 + 圆头像 + 双层呼吸灯 */
.home-online {
  --online-state: #22c55e;
  --online-tilt: 0.6deg;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 232px;
  margin: 0 0 16px;
  padding: 10px 16px 10px 14px;
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

.home-online-count {
  flex: none;
  font-size: 15px;
  font-weight: 700;
  color: var(--vp-c-accent, #096dd9);
  font-variant-numeric: tabular-nums;
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
  .home-online-light-ring {
    animation: none;
  }

  .home-online {
    rotate: 0deg;
    transition: none;
  }
}
</style>
