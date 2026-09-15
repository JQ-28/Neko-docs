<template>
  <p v-if="text" class="home-online">
    <span class="home-online-dot" aria-hidden="true"></span>
    {{ text }}
  </p>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const ENDPOINT = "/api/online";
/** 心跳间隔，与后端判定「掉线」的窗口配套：后端容忍 3 次心跳的静默 */
const HEARTBEAT_MS = 30_000;
const VISITOR_KEY = "neko-visitor-id";
const REQUEST_TIMEOUT_MS = 5_000;

const count = ref(0);

const text = computed(() => {
  if (count.value <= 0) return "";
  if (count.value === 1) return "现在只有你一只猫在逛";
  return `现在有 ${count.value} 只猫在逛`;
});

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
.home-online {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 14px;
  color: var(--vp-c-text-2, #6b7280);
  font-size: 13px;
  line-height: 1;
  animation: home-online-in 0.3s var(--ease-out, ease-out);
}

.home-online-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4ade80;
  animation: home-online-pulse 2.4s ease-out infinite;
}

@keyframes home-online-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 用 box-shadow 扩散而不是改尺寸，避免触发重排 */
@keyframes home-online-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.55);
  }

  50% {
    box-shadow: 0 0 0 5px rgba(74, 222, 128, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-online,
  .home-online-dot {
    animation: none;
  }
}
</style>
