<template>
  <Transition name="announcement-fade">
    <div v-if="currentAnnouncement" class="announcement" role="dialog" aria-live="polite">
      <header class="announcement-head">
        <span class="announcement-title">{{ currentAnnouncement.title }}</span>
        <button class="announcement-close" type="button" aria-label="关闭公告" @click="dismiss">
          <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
              fill="currentColor"
              d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"
            />
          </svg>
        </button>
      </header>
      <p class="announcement-body">{{ currentAnnouncement.content }}</p>
      <div v-if="currentAnnouncement.actions?.length" class="announcement-actions">
        <button
          v-for="action in currentAnnouncement.actions"
          :key="action.text"
          type="button"
          class="announcement-action"
          :class="{ primary: action.type === 'primary' }"
          @click="handleAction(action)"
        >
          {{ action.text }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { usePageData, useRouter } from "vuepress/client";

interface AnnouncementAction {
  text: string;
  link?: string;
  type?: "default" | "primary";
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  actions?: AnnouncementAction[];
  showOnce?: boolean;
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "neko-feature-release",
    title: "网站更新公告 · 指令速查与 neko 小助手",
    content:
      "「指令速查」页面现已上线，支持按关键词检索并一键复制指令。同时新增 neko 小助手，点击导航栏的 neko 头像或按下 Ctrl+Shift+K 即可唤起，欢迎使用并反馈问题。",
    showOnce: true,
    actions: [
      { text: "前往查看", link: "/zhiling/cheatsheet.html", type: "primary" },
      { text: "我知道了" },
    ],
  },
  {
    id: "community-invite",
    title: "群聊邀请 · 小猫窝地下室",
    content:
      "欢迎加入「✦小猫窝地下室✩」交流群，第一时间获取网站动态与指令帮助。遇到问题也欢迎在群里反馈。",
    showOnce: false,
    actions: [
      {
        text: "加入群聊",
        link: "https://qun.qq.com/universal-share/share?ac=1&authKey=vMjh2ULH9US8HuGMccqVtTpewIbIm%2Bl0f7XCAjnYAFJlJQCjRDNLYr0OTT%2FjpXFa&busi_data=eyJncm91cENvZGUiOiIxMDYxODc4MDQyIiwidG9rZW4iOiJsOWFlbzdBK251SnlLbEdjMUtlbGNIbTNVYlp3Y1lWQlFRWUJQOGFnQ0srSkt5NXVxR1o5VlV3VkE2R1lNaitmIiwidWluIjoiNDgwMzUyNzE2In0%3D&data=-2NyJE-uEwgwJLO5jZG9chSIH_vc1dPMVAASpB3akNFqV5Bcf7XRdwLgTMCqkoAB285vr36EeOcepSFMQzvI7Q&svctype=4&tempid=h5_group_info",
        type: "primary",
      },
      { text: "暂不加入" },
    ],
  },
];

const STORAGE_PREFIX = "announcement:";

const pageData = usePageData();
const router = useRouter();
const mounted = ref(false);
const dismissedIds = ref<string[]>([]);

function storageOf(announcement: Announcement): Storage {
  return announcement.showOnce === false ? sessionStorage : localStorage;
}

function hasRead(announcement: Announcement): boolean {
  return storageOf(announcement).getItem(`${STORAGE_PREFIX}${announcement.id}`) === "true";
}

const currentAnnouncement = computed<Announcement | null>(() => {
  if (!mounted.value) return null;
  return (
    ANNOUNCEMENTS.find(
      (item) => !dismissedIds.value.includes(item.id) && !hasRead(item)
    ) ?? null
  );
});

function dismiss(): void {
  const announcement = currentAnnouncement.value;
  if (!announcement) return;
  storageOf(announcement).setItem(`${STORAGE_PREFIX}${announcement.id}`, "true");
  dismissedIds.value = [...dismissedIds.value, announcement.id];
}

function handleAction(action: AnnouncementAction): void {
  const { link } = action;
  if (link) {
    if (/^https?:\/\//u.test(link)) window.open(link, "_blank", "noopener,noreferrer");
    else void router.push(link);
  }
  dismiss();
}

onMounted(() => {
  mounted.value = true;
});
</script>

<style scoped>
.announcement {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1500;
  width: min(272px, calc(100vw - 40px));
  padding: 14px 16px 12px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(248, 224, 248, 0.94), rgba(200, 232, 248, 0.94));
  box-shadow: 0 10px 25px rgba(255, 192, 203, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
}

.announcement-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.announcement-title {
  flex: 1;
  background: linear-gradient(120deg, #ff9ed5, #b48cf2, #7fb8f0);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.5;
}

.announcement-close {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  color: #8a6fa8;
  cursor: pointer;
  transition: background 0.2s var(--ease-out);
}

.announcement-close svg {
  width: 12px;
  height: 12px;
}

.announcement-close:hover {
  background: rgba(255, 255, 255, 0.95);
}

.announcement-body {
  margin: 0;
  color: var(--vp-c-text);
  font-size: 13px;
  line-height: 1.7;
}

.announcement-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.announcement-action {
  padding: 6px 14px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--vp-c-text);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s var(--ease-out), transform 0.2s var(--ease-out);
}

.announcement-action:hover {
  transform: translateY(-1px);
}

.announcement-action.primary {
  background: var(--vp-c-accent-bg, #096dd9);
  color: var(--vp-c-accent-text, #fff);
}

.announcement-fade-enter-active,
.announcement-fade-leave-active {
  transition: opacity 0.35s var(--ease-out), transform 0.35s var(--ease-out);
}

.announcement-fade-enter-from,
.announcement-fade-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

html.dark .announcement {
  border-color: rgba(255, 255, 255, 0.12);
  background: linear-gradient(135deg, rgba(90, 66, 110, 0.94), rgba(54, 74, 102, 0.94));
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

html.dark .announcement-close,
html.dark .announcement-action {
  background: rgba(255, 255, 255, 0.14);
  color: var(--vp-c-text);
}

html.dark .announcement-close:hover {
  background: rgba(255, 255, 255, 0.24);
}

@media (max-width: 768px) {
  .announcement {
    top: 62px;
    right: 12px;
    left: 12px;
    width: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .announcement-fade-enter-active,
  .announcement-fade-leave-active {
    transition: none;
  }

  .announcement-action:hover {
    transform: none;
  }
}
</style>
