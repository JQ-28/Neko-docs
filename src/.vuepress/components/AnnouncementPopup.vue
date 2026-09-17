<template>
  <Transition name="announcement-fade">
    <div v-if="currentAnnouncement" class="announcement" role="dialog" aria-label="公告" aria-live="polite">
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
    // 正文改过就要换 id：老访客读过旧 id，不换的话永远看不到新的这一版
    id: "neko-feature-release-v3",
    title: "网站更新公告 · 最近攒了一堆新东西，还养了两只会唠嗑的小猫",
    content:
      "这段时间的更新大总结，都是能直接上手的：\n" +
      "· 首页那两只小猫会说话了：心情不同，语气、点头幅度、旁边小灯的呼吸都不一样\n" +
      "· 戳一下、摸个头、拎起来拖都有反应；拖到栏目上说对应的话，拎到窗口外能去隔壁那只身边\n" +
      "· 「指令速查」页面：输关键词就能搜指令，点一下直接复制\n" +
      "· 「在线状态」页面：neko 的账号和后台服务还活着没，一眼就能看清；账号被腾讯下线会单独标红提示\n" +
      "· neko 小助手：点导航栏的 neko 头像，或按 Ctrl+Shift+K 随时唤起\n" +
      "· 语音输入：懒得打字就点麦克风说话，边说边出字\n" +
      "· 彩蛋互通：文档站和功能站点亮的彩蛋双向同步，两边进度都不会丢\n" +
      "· 功能站聊两句和文档站同款：同一个「问问neko」，回答口径与限流完全一致\n" +
      "玩得开心，有问题群里喊 neko 喵，我叼着小鱼干等你们。",
    showOnce: true,
    actions: [
      { text: "指令速查", link: "/zhiling/cheatsheet", type: "primary" },
      { text: "在线状态", link: "/zhuangtai" },
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
  try {
    return storageOf(announcement).getItem(`${STORAGE_PREFIX}${announcement.id}`) === "true";
  } catch {
    return false;
  }
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
  try {
    storageOf(announcement).setItem(`${STORAGE_PREFIX}${announcement.id}`, "true");
  } catch {
    /* 存储不可用时仅本次会话内关闭 */
  }
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
  border: 1px solid var(--vp-c-divider, rgba(0, 0, 0, 0.1));
  border-radius: 12px;
  background: var(--vp-c-bg-elv, #fff);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.announcement-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.announcement-title {
  flex: 1;
  color: var(--vp-c-text);
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
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-mute, #6b7280);
  cursor: pointer;
  transition: background 0.2s var(--ease-out);
}

.announcement-close svg {
  width: 12px;
  height: 12px;
}

.announcement-close:hover {
  background: rgba(127, 176, 255, 0.14);
  color: var(--vp-c-accent, #096dd9);
}

.announcement-body {
  margin: 0;
  color: var(--vp-c-text);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-line;
}

.announcement-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.announcement-action {
  padding: 5px 13px;
  border: 1px solid var(--vp-c-divider, rgba(0, 0, 0, 0.1));
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s var(--ease-out), border-color 0.2s var(--ease-out), background 0.2s var(--ease-out);
}

.announcement-action:hover {
  border-color: var(--vp-c-accent, #096dd9);
  color: var(--vp-c-accent, #096dd9);
}

.announcement-action.primary {
  border-color: transparent;
  background: var(--vp-c-accent-bg, #096dd9);
  color: var(--vp-c-accent-text, #fff);
}

.announcement-action.primary:hover {
  border-color: transparent;
  color: var(--vp-c-accent-text, #fff);
  opacity: 0.88;
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
  background: #22202a;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
}

html.dark .announcement-close:hover,
html.dark .announcement-action:hover {
  background: rgba(255, 255, 255, 0.08);
}

@media (max-width: 768px) {
  .announcement {
    top: 66px;
    right: 12px;
    left: auto;
    width: min(280px, calc(100vw - 24px));
    padding: 12px 14px 10px;
  }

  .announcement-title {
    font-size: 13px;
  }

  .announcement-body {
    font-size: 12px;
  }

  .announcement-actions {
    margin-top: 10px;
  }

  .announcement-action {
    padding: 5px 12px;
    font-size: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .announcement-fade-enter-active,
  .announcement-fade-leave-active {
    transition: none;
  }
}
</style>
