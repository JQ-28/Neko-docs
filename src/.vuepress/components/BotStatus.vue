<template>
  <div class="bot-status" role="status" aria-live="polite">
    <div class="bot-status-head" :class="`is-${viewState}`">
      <span class="bot-status-head-dot" aria-hidden="true"></span>
      <span class="bot-status-head-text">{{ summaryText }}</span>
      <span v-if="updatedText && !failed" class="bot-status-head-time">{{ updatedText }}</span>
      <button v-if="failed" class="bot-status-retry" type="button" @click="load()">重试</button>
    </div>

    <section v-for="section in sections" :key="section.key" class="bot-status-block">
      <h3 class="bot-status-title">
        <span class="bot-status-bar" aria-hidden="true"></span>
        {{ section.title }}
        <span class="bot-status-count">
          {{ section.stale ? "状态未知" : `${section.onlineCount}/${section.rows.length} ${section.unit}` }}
        </span>
      </h3>
      <div v-if="!status && !failed" class="bot-status-list">
        <span
          v-for="index in section.rows.length"
          :key="index"
          class="bot-status-skeleton"
          aria-hidden="true"
        ></span>
      </div>
      <div v-else class="bot-status-list">
        <div
          v-for="(row, index) in section.rows"
          :key="row.key"
          class="bot-status-item"
          :class="[`is-${row.state}`, `is-${section.variant}`]"
          :style="{ '--row-index': index + section.offset }"
        >
          <template v-if="section.variant === 'blob'">
            <span class="bot-status-blob" aria-hidden="true"></span>
            <span class="bot-status-frost" aria-hidden="true"></span>
          </template>
          <span v-else class="bot-status-glass" aria-hidden="true"></span>
          <img
            v-if="row.avatar && !brokenAvatars.has(row.key)"
            class="bot-status-avatar"
            :src="row.avatar"
            :alt="`${row.name} 的头像`"
            width="34"
            height="34"
            loading="lazy"
            decoding="async"
            @error="brokenAvatars.add(row.key)"
          />
          <span
            v-else-if="row.avatar"
            class="bot-status-avatar bot-status-avatar-fallback"
            aria-hidden="true"
          >
            {{ row.name.trim().charAt(0) || "?" }}
          </span>
          <span class="bot-status-text">
            <span class="bot-status-name">{{ row.name }}</span>
            <span v-if="row.meta" class="bot-status-meta">{{ row.meta }}</span>
          </span>
          <span class="bot-status-light" aria-hidden="true">
            <span class="bot-status-light-ring"></span>
            <span class="bot-status-light-core"></span>
          </span>
          <span class="bot-status-state">{{ STATE_TEXT[row.state] }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

interface StatusResponse {
  updatedAt: number | null;
  accounts: Record<string, boolean>;
  accountsUpdatedAt: number | null;
  accountsStale: boolean;
  services: Record<string, boolean>;
  servicesUpdatedAt: number | null;
  servicesStale: boolean;
}

interface InventoryItem {
  key: string;
  name: string;
  meta?: string;
  avatar?: string;
}

type RowState = "online" | "offline" | "unknown";

interface StatusRow extends InventoryItem {
  state: RowState;
}

interface StatusSection {
  key: string;
  title: string;
  unit: string;
  stale: boolean;
  rows: StatusRow[];
  onlineCount: number;
  variant: "flat" | "blob";
  offset: number;
}

type ViewState = "loading" | "error" | "empty" | "stale" | "partial" | "ready";

const STATE_TEXT: Record<RowState, string> = {
  online: "在线",
  offline: "离线",
  unknown: "未知",
};

const REFRESH_INTERVAL = 30_000;
const ENDPOINT = "/api/bot-status";
const AVATAR_SIZE = 100;

const avatarUrl = (qq: string): string =>
  `https://q1.qlogo.cn/g?b=qq&nk=${qq}&s=${AVATAR_SIZE}`;

const ACCOUNTS: InventoryItem[] = [
  { key: "3582537505", name: "Neko_dayo~", meta: "3582537505", avatar: avatarUrl("3582537505") },
  { key: "3309739044", name: "Neko一号机", meta: "3309739044", avatar: avatarUrl("3309739044") },
  { key: "2760015052", name: "Neko二号机", meta: "2760015052", avatar: avatarUrl("2760015052") },
  { key: "3278327679", name: "Neko三号机", meta: "3278327679", avatar: avatarUrl("3278327679") },
  { key: "2854207094", name: "Neko官方机器人", meta: "2854207094", avatar: avatarUrl("2854207094") },
];

const SERVICES: InventoryItem[] = [
  { key: "redis", name: "Redis" },
  { key: "meme", name: "memeapi" },
  { key: "lhm", name: "LibreHardwareMonitor" },
  { key: "haruki", name: "Haruki" },
  { key: "yunzai", name: "TRSS-Yunzai" },
  { key: "nonebot", name: "Nonebot" },
];

const status = ref<StatusResponse | null>(null);
const failed = ref(false);
const brokenAvatars = ref<Set<string>>(new Set());

const accountStale = computed(() => !status.value || status.value.accountsStale);
const serviceStale = computed(() => !status.value || status.value.servicesStale);

const viewState = computed<ViewState>(() => {
  if (failed.value) return "error";
  if (!status.value) return "loading";
  if (status.value.updatedAt === null) return "empty";
  if (accountStale.value && serviceStale.value) return "stale";
  if (accountStale.value || serviceStale.value) return "partial";
  return "ready";
});

function buildRows(
  inventory: InventoryItem[],
  reported: Record<string, boolean>,
  stale: boolean
): StatusRow[] {
  const resolve = (online: boolean): RowState => {
    if (stale) return "unknown";
    return online ? "online" : "offline";
  };
  const rows = inventory.map<StatusRow>((item) => ({
    ...item,
    state: resolve(reported[item.key] === true),
  }));
  const known = new Set(inventory.map((item) => item.key));
  Object.entries(reported).forEach(([key, online]) => {
    if (!known.has(key)) rows.push({ key, name: key, state: resolve(online) });
  });
  return rows;
}

const accountRows = computed(() =>
  buildRows(ACCOUNTS, status.value?.accounts ?? {}, accountStale.value)
);
const serviceRows = computed(() =>
  buildRows(SERVICES, status.value?.services ?? {}, serviceStale.value)
);
const accountOnline = computed(
  () => accountRows.value.filter((row) => row.state === "online").length
);
const serviceOnline = computed(
  () => serviceRows.value.filter((row) => row.state === "online").length
);

const sections = computed<StatusSection[]>(() => {
  const accounts: StatusSection = {
    key: "accounts",
    title: "NapCat 账号与官方机器人",
    unit: "在线",
    stale: accountStale.value,
    rows: accountRows.value,
    onlineCount: accountOnline.value,
    variant: "flat",
    offset: 0,
  };
  return [
    accounts,
    {
      key: "services",
      title: "后台服务",
      unit: "运行中",
      stale: serviceStale.value,
      rows: serviceRows.value,
      onlineCount: serviceOnline.value,
      variant: "blob",
      offset: accounts.rows.length,
    },
  ];
});

const summaryText = computed(() => {
  switch (viewState.value) {
    case "error":
      return "暂时连不上状态接口，稍后自动重试";
    case "loading":
      return "正在读取 neko 的状态…";
    case "empty":
      return "还没收到 neko 的上报，等它打个招呼喵";
    case "stale":
      return "数据已停止更新，neko 可能睡了";
    case "partial":
      return accountStale.value
        ? "nonebot 主进程没有上报，账号状态暂时未知"
        : "看门狗没有上报，服务状态暂时未知";
    default:
      return `neko 正在营业：账号 ${accountOnline.value}/${accountRows.value.length} 、服务 ${serviceOnline.value}/${serviceRows.value.length} 在线`;
  }
});

const updatedText = computed(() => {
  const updatedAt = status.value?.updatedAt;
  if (!updatedAt) return "";
  const time = new Date(updatedAt * 1000).toLocaleTimeString("zh-CN", { hour12: false });
  return `更新于 ${time}`;
});

let timer: number | undefined;

function stopPolling(): void {
  if (timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
}

async function load(): Promise<void> {
  try {
    const response = await fetch(ENDPOINT, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    status.value = (await response.json()) as StatusResponse;
    failed.value = false;
  } catch {
    failed.value = true;
  }
}

function handleVisibilityChange(): void {
  if (!document.hidden) void load();
}

onMounted(() => {
  void load();
  // 页面不可见时跳过轮询，避免后台标签页空耗请求
  timer = window.setInterval(() => {
    if (!document.hidden) void load();
  }, REFRESH_INTERVAL);
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onBeforeUnmount(() => {
  stopPolling();
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});
</script>

<style scoped>
.bot-status {
  --accent: var(--vp-c-accent, #096dd9);
  --state-online: #34c759;
  --state-offline: #c4becd;
  --state-unknown: #ff9f0a;
  margin: 20px 0 8px;
}

.bot-status-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  color: #6b5c7d;
  background: color-mix(in srgb, var(--accent) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 14%, transparent);
}

.bot-status-head-dot {
  width: 9px;
  height: 9px;
  flex: none;
  border-radius: 50%;
  background: #b9b3c4;
  box-shadow: 0 0 0 4px color-mix(in srgb, #b9b3c4 22%, transparent);
}

.bot-status-head.is-ready .bot-status-head-dot {
  background: var(--state-online);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--state-online) 20%, transparent);
  animation: bot-status-head-pulse 3.2s ease-in-out infinite;
}

.bot-status-head.is-stale .bot-status-head-dot,
.bot-status-head.is-partial .bot-status-head-dot,
.bot-status-head.is-error .bot-status-head-dot {
  background: var(--state-unknown);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--state-unknown) 20%, transparent);
}

.bot-status-head-time {
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: #a397b2;
  font-variant-numeric: tabular-nums;
}

.bot-status-retry {
  margin-left: auto;
  padding: 4px 12px;
  border: 1px solid color-mix(in srgb, var(--state-unknown) 40%, transparent);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  color: #b26a00;
  background: color-mix(in srgb, var(--state-unknown) 12%, transparent);
  cursor: pointer;
  transition: background-color 0.25s ease-out, border-color 0.25s ease-out;
}

.bot-status-retry:hover {
  background: color-mix(in srgb, var(--state-unknown) 22%, transparent);
}

.bot-status-skeleton {
  display: block;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(90deg, #f0ecf6 25%, #fbfafe 37%, #f0ecf6 63%);
  background-size: 400% 100%;
  animation: bot-status-shimmer 1.5s ease-in-out infinite;
}

.bot-status-block {
  margin-top: 20px;
}

.bot-status-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.bot-status-bar {
  width: 4px;
  height: 16px;
  flex: none;
  border-radius: 2px;
  background: linear-gradient(135deg, #ff9ed5, #7fb0ff);
}

.bot-status-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: #7d6c8e;
  font-variant-numeric: tabular-nums;
}

.bot-status-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 10px;
}

.bot-status-item {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--accent) 10%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  animation: bot-status-enter 0.44s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(var(--row-index, 0) * 45ms);
  transition: transform 0.25s ease-out, box-shadow 0.25s ease-out,
    background-color 0.35s ease-out, border-color 0.35s ease-out;
}

.bot-status-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px color-mix(in srgb, var(--accent) 16%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.bot-status-glass {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  padding: 2px;
  background: linear-gradient(120deg, #ffd6f5, #e2cdfb, #bfe4ff);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.5;
  pointer-events: none;
}

.bot-status-item.is-blob {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.9);
}

.bot-status-blob {
  position: absolute;
  z-index: 0;
  top: 50%;
  left: 50%;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: radial-gradient(
    circle closest-side,
    var(--blob-color) 0%,
    color-mix(in srgb, var(--blob-color) 55%, transparent) 48%,
    transparent 100%
  );
  opacity: 0.85;
  animation: bot-status-blob 5s ease infinite;
  animation-delay: calc(var(--row-index, 0) * -0.85s);
  will-change: transform;
  pointer-events: none;
}

.bot-status-item.is-blob {
  --blob-color: var(--state-online);
}

.bot-status-item.is-blob.is-offline {
  --blob-color: var(--state-offline);
}

.bot-status-item.is-blob.is-offline .bot-status-blob {
  opacity: 0.5;
}

.bot-status-item.is-blob.is-unknown {
  --blob-color: var(--state-unknown);
}

.bot-status-frost {
  position: absolute;
  z-index: 1;
  inset: 3px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.76);
  outline: 1.5px solid rgba(255, 255, 255, 0.95);
  pointer-events: none;
}

.bot-status-item > :not(.bot-status-glass):not(.bot-status-blob):not(.bot-status-frost) {
  position: relative;
  z-index: 2;
}

.bot-status-avatar {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  background: #f4f1f8;
  border: 1.5px solid color-mix(in srgb, var(--accent) 18%, transparent);
  filter: grayscale(0.85) opacity(0.6);
  transition: filter 0.4s ease-out, border-color 0.4s ease-out, box-shadow 0.4s ease-out;
}

.bot-status-item.is-online .bot-status-avatar {
  filter: none;
  border-color: color-mix(in srgb, var(--state-online) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--state-online) 14%, transparent);
}

.bot-status-avatar-fallback {
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--accent);
}

.bot-status-text {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.bot-status-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--accent);
  transition: color 0.35s ease-out;
}

.bot-status-item.is-offline .bot-status-name {
  color: #9a92a8;
}

.bot-status-meta {
  font-size: 11px;
  letter-spacing: 0.2px;
  color: #a397b2;
  font-variant-numeric: tabular-nums;
}

.bot-status-light {
  flex: none;
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
}

.bot-status-light-core,
.bot-status-light-ring {
  grid-area: 1 / 1;
  border-radius: 50%;
}

.bot-status-light-core {
  width: 9px;
  height: 9px;
  background: var(--state-online);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--state-online) 18%, transparent);
  animation: bot-status-breathe 2.4s ease-in-out infinite;
  transition: background-color 0.35s ease-out, box-shadow 0.35s ease-out;
}

.bot-status-light-ring {
  width: 9px;
  height: 9px;
  border: 1.5px solid var(--state-online);
  opacity: 0;
  animation: bot-status-ripple 2.4s ease-out infinite;
  will-change: transform, opacity;
}

.bot-status-item.is-offline .bot-status-light-core {
  background: var(--state-offline);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--state-offline) 22%, transparent);
  animation: none;
}

.bot-status-item.is-offline .bot-status-light-ring {
  animation: none;
}

.bot-status-item.is-unknown .bot-status-light-core {
  background: var(--state-unknown);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--state-unknown) 20%, transparent);
  animation: bot-status-blink 1.8s ease-in-out infinite;
}

.bot-status-item.is-unknown .bot-status-light-ring {
  border-color: var(--state-unknown);
  animation: bot-status-ripple 1.8s ease-out infinite;
}

.bot-status-state {
  flex: none;
  font-size: 11px;
  font-weight: 700;
  color: var(--state-online);
  transition: color 0.35s ease-out;
}

.bot-status-item.is-offline .bot-status-state {
  color: #b0a8be;
}

.bot-status-item.is-unknown .bot-status-state {
  color: var(--state-unknown);
}

@keyframes bot-status-enter {
  from {
    opacity: 0;
    transform: translateY(7px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes bot-status-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.68);
    opacity: 0.72;
  }
}

@keyframes bot-status-ripple {
  0% {
    transform: scale(0.7);
    opacity: 0.85;
  }
  70% {
    transform: scale(2.5);
    opacity: 0;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

@keyframes bot-status-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

@keyframes bot-status-shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

@keyframes bot-status-blob {
  0% {
    transform: translate(-100%, -100%) translate3d(0, 0, 0);
  }
  25% {
    transform: translate(-100%, -100%) translate3d(100%, 0, 0);
  }
  50% {
    transform: translate(-100%, -100%) translate3d(100%, 100%, 0);
  }
  75% {
    transform: translate(-100%, -100%) translate3d(0, 100%, 0);
  }
  100% {
    transform: translate(-100%, -100%) translate3d(0, 0, 0);
  }
}

@keyframes bot-status-head-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.16);
  }
}

html.dark .bot-status-head {
  color: #b9b1c6;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-color: color-mix(in srgb, var(--accent) 22%, transparent);
}

html.dark .bot-status-head-time,
html.dark .bot-status-count,
html.dark .bot-status-meta {
  color: #8b8398;
}

html.dark .bot-status-item {
  background: rgba(44, 44, 44, 0.6);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

html.dark .bot-status-item:hover {
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

html.dark .bot-status-item.is-blob {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.1);
}

html.dark .bot-status-item.is-blob .bot-status-blob {
  opacity: 0.7;
}

html.dark .bot-status-item.is-blob.is-offline .bot-status-blob {
  opacity: 0.4;
}

html.dark .bot-status-item.is-blob .bot-status-frost {
  background: rgba(38, 38, 40, 0.78);
  outline-color: rgba(255, 255, 255, 0.12);
}

html.dark .bot-status-skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 25%,
    rgba(255, 255, 255, 0.11) 37%,
    rgba(255, 255, 255, 0.05) 63%
  );
  background-size: 400% 100%;
}

html.dark .bot-status-retry {
  color: #ffc46b;
}

html.dark .bot-status-glass {
  opacity: 0.3;
}

html.dark .bot-status-avatar {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.14);
}

html.dark .bot-status-item.is-offline .bot-status-name {
  color: #7d7689;
}

@media (max-width: 768px) {
  .bot-status-list {
    grid-template-columns: 1fr;
  }

  .bot-status-head {
    flex-wrap: wrap;
  }

  .bot-status-head-time {
    margin-left: 0;
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bot-status-item,
  .bot-status-light-core,
  .bot-status-light-ring,
  .bot-status-blob,
  .bot-status-skeleton,
  .bot-status-head.is-ready .bot-status-head-dot {
    animation: none;
  }

  .bot-status-item {
    transition: none;
  }

  .bot-status-blob {
    transform: translate(-50%, -50%);
  }

  .bot-status-item:hover {
    transform: none;
  }
}
</style>
