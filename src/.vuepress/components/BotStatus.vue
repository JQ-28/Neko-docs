<template>
  <div class="bot-status" role="status" aria-live="polite">
    <div class="bot-status-head" :class="`is-${viewState}`">
      <span class="bot-status-head-dot" aria-hidden="true"></span>
      <span class="bot-status-head-text">{{ summaryText }}</span>
      <span v-if="updatedText" class="bot-status-head-time">{{ updatedText }}</span>
    </div>

    <section class="bot-status-block">
      <h3 class="bot-status-title">
        <span class="bot-status-bar" aria-hidden="true"></span>
        NapCat 账号与官方机器人
        <span class="bot-status-count">
          {{ accountStale ? "状态未知" : `${accountOnline}/${accountRows.length} 在线` }}
        </span>
      </h3>
      <div class="bot-status-list">
        <div
          v-for="row in accountRows"
          :key="row.key"
          class="bot-status-item"
          :class="`is-${row.state}`"
        >
          <span class="bot-status-glass" aria-hidden="true"></span>
          <span class="bot-status-badge" aria-hidden="true"></span>
          <span class="bot-status-name">{{ row.name }}</span>
          <span class="bot-status-meta">{{ row.meta }}</span>
          <span class="bot-status-state">{{ STATE_TEXT[row.state] }}</span>
        </div>
      </div>
    </section>

    <section class="bot-status-block">
      <h3 class="bot-status-title">
        <span class="bot-status-bar" aria-hidden="true"></span>
        后台服务
        <span class="bot-status-count">
          {{ serviceStale ? "状态未知" : `${serviceOnline}/${serviceRows.length} 运行中` }}
        </span>
      </h3>
      <div class="bot-status-list">
        <div
          v-for="row in serviceRows"
          :key="row.key"
          class="bot-status-item"
          :class="`is-${row.state}`"
        >
          <span class="bot-status-glass" aria-hidden="true"></span>
          <span class="bot-status-badge" aria-hidden="true"></span>
          <span class="bot-status-name">{{ row.name }}</span>
          <span class="bot-status-meta" v-if="row.meta">{{ row.meta }}</span>
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
}

type RowState = "online" | "offline" | "unknown";

interface StatusRow extends InventoryItem {
  state: RowState;
}

type ViewState = "loading" | "error" | "empty" | "stale" | "partial" | "ready";

const STATE_TEXT: Record<RowState, string> = {
  online: "在线",
  offline: "离线",
  unknown: "未知",
};

const REFRESH_INTERVAL = 30_000;
const ENDPOINT = "/api/bot-status";

const ACCOUNTS: InventoryItem[] = [
  { key: "3582537505", name: "neko 主账号", meta: "3582537505" },
  { key: "3309739044", name: "neko 一号机", meta: "3309739044" },
  { key: "2760015052", name: "neko 二号机", meta: "2760015052" },
  { key: "3278327679", name: "neko 三号机", meta: "3278327679" },
  { key: "2854207094", name: "neko 官方机器人", meta: "2854207094" },
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
  background: #34c759;
  box-shadow: 0 0 0 4px rgba(52, 199, 89, 0.2);
}

.bot-status-head.is-stale .bot-status-head-dot,
.bot-status-head.is-partial .bot-status-head-dot,
.bot-status-head.is-error .bot-status-head-dot {
  background: #ff9f0a;
  box-shadow: 0 0 0 4px rgba(255, 159, 10, 0.2);
}

.bot-status-head-time {
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: #a397b2;
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
  padding: 12px 14px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--accent) 10%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
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

.bot-status-item > :not(.bot-status-glass) {
  position: relative;
  z-index: 2;
}

.bot-status-badge {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
  background: #34c759;
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.18);
}

.bot-status-item.is-offline .bot-status-badge {
  background: #c4becd;
  box-shadow: 0 0 0 3px rgba(196, 190, 205, 0.2);
}

.bot-status-item.is-unknown .bot-status-badge {
  background: #ff9f0a;
  box-shadow: 0 0 0 3px rgba(255, 159, 10, 0.18);
}

.bot-status-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--accent);
}

.bot-status-item.is-offline .bot-status-name {
  color: #9a92a8;
}

.bot-status-meta {
  flex: none;
  font-size: 11px;
  color: #a397b2;
}

.bot-status-state {
  flex: none;
  font-size: 11px;
  font-weight: 700;
  color: #34c759;
}

.bot-status-item.is-offline .bot-status-state {
  color: #b0a8be;
}

.bot-status-item.is-unknown .bot-status-state {
  color: #ff9f0a;
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

html.dark .bot-status-glass {
  opacity: 0.3;
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
</style>
