<template>
  <section class="home-intro">
    <h2 class="home-intro-title">
      <span class="home-intro-bar" aria-hidden="true"></span>
      Neko 能做什么？
      <span class="home-intro-sub">挑几个代表性的看看，全部功能在指令速查</span>
    </h2>

    <div class="home-feats">
      <div v-for="feat in feats" :key="feat.link" class="home-feat">
        <span class="home-feat-glass" aria-hidden="true"></span>
        <RouterLink :to="feat.link" class="home-feat-name">
          {{ feat.name }}
        </RouterLink>
        <span class="home-feat-desc">{{ feat.desc }}</span>
        <div class="home-feat-cmds">
          <button
            v-for="cmd in feat.commands"
            :key="cmd"
            type="button"
            class="home-feat-cmd"
            :title="feat.desc"
            :aria-label="`复制指令 ${cmd}`"
            @click="copy(cmd)"
          >
            {{ cmd }}
          </button>
        </div>
      </div>
    </div>

    <section v-if="recents.length" class="home-recent">
      <h2 class="home-intro-title">
        <span class="home-intro-bar" aria-hidden="true"></span>
        最近更新
      </h2>
      <div class="home-recent-list">
        <a
          v-for="item in recents"
          :key="item.link"
          :href="item.link"
          class="home-recent-item"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="home-recent-time">{{ item.time }}</span>
          <span class="home-recent-message">{{ item.message }}</span>
        </a>
      </div>
    </section>

    <div class="home-cta">
      <RouterLink class="home-cta-ghost" to="/start">
        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            fill="currentColor"
            d="M448 256L192 512v-192H0L256 0v192z"
          />
        </svg>
        <span>5 分钟快速上手</span>
      </RouterLink>
      <RouterLink class="home-cta-ghost" to="/qunliao">
        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            fill="currentColor"
            d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z"
          />
        </svg>
        <span>把 neko 拉进群</span>
      </RouterLink>
    </div>

    <p class="home-more">
      还不知道 neko 有哪些本事？去
      <RouterLink to="/zhiling/cheatsheet">指令速查</RouterLink>
      全看一遍喵~
    </p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { copyText, showTip } from "./copy-utils";

interface HomeFeat {
  name: string;
  desc: string;
  link: string;
  commands: string[];
}

interface RecentItem {
  time: string;
  message: string;
  link: string;
}

const feats: HomeFeat[] = [
  {
    name: "每日签到",
    desc: "攒好感度、赚喵喵币",
    link: "/zhiling/yule/qiandao",
    commands: ["签到", "好感度排行"],
  },
  {
    name: "今日运势",
    desc: "测测你今天的人品值",
    link: "/zhiling/yule/jrrp",
    commands: ["jrrp", "zrrp"],
  },
  {
    name: "以图搜源",
    desc: "不知道出处？发图让它找",
    link: "/zhiling/shiyong/imgS",
    commands: ["#搜图"],
  },
  {
    name: "表情包制作",
    desc: "一键生成各种表情包",
    link: "/zhiling/yule/bqbmaker",
    commands: ["表情包制作"],
  },
];

function copy(command: string): void {
  copyText(command)
    .then(() => showTip("指令已复制"))
    .catch(() => showTip("复制失败"));
}

const recents = ref<RecentItem[]>([]);

onMounted(() => {
  void (async () => {
    try {
      const response = await fetch("/recent-updates.json", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;
      recents.value = (await response.json()) as RecentItem[];
    } catch {
      // 构建期无 git 或文件缺失时静默隐藏「最近更新」区块
    }
  })();
});
</script>

<style scoped>
.home-intro {
  --accent: var(--vp-c-accent, #096dd9);
  margin: 36px 0 8px;
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

.home-feats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

/* ===== 卡片（与指令速查页指令卡同风格） ===== */
.home-feat {
  position: relative;
  overflow: hidden;
  padding: 16px 18px;
  border-radius: 22px;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 10px 25px color-mix(in srgb, var(--accent) 12%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  --rotation: 0deg;
  rotate: var(--rotation);
  scale: 1;
  transition: rotate 0.3s var(--ease-out), scale 0.3s var(--ease-out),
    box-shadow 0.45s ease, border-color 0.3s ease;
}

.home-feat:nth-child(4n + 1) { --rotation: 0.8deg; }
.home-feat:nth-child(4n + 2) { --rotation: -0.6deg; }
.home-feat:nth-child(4n + 3) { --rotation: 0.5deg; }
.home-feat:nth-child(4n + 4) { --rotation: -0.4deg; }

.home-feat-glass {
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
  transition: opacity 0.4s ease;
}

.home-feat > :not(.home-feat-glass) {
  position: relative;
  z-index: 2;
}

.home-feat-name {
  display: inline-block;
  font-size: 15px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 4px;
  text-decoration: none;
  background-image: linear-gradient(var(--accent), var(--accent));
  background-repeat: no-repeat;
  background-position: 0 100%;
  background-size: 0% 2px;
  transition: background-size 0.22s var(--ease-out);
}

.home-feat-desc {
  display: block;
  font-size: 12px;
  color: #7d6c8e;
  line-height: 1.5;
  margin-bottom: 12px;
}

.home-feat-cmds {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--accent) 15%, transparent);
}

.home-feat-cmd {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 4px 12px;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease,
    transform 0.15s var(--ease-out);
}

.home-feat-cmd:active {
  transform: scale(0.94);
}

@media (hover: hover) and (pointer: fine) {
  .home-feat:hover {
    rotate: 0deg;
    scale: 1.03;
    border-color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 15px 40px color-mix(in srgb, var(--accent) 18%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  .home-feat:hover .home-feat-glass {
    opacity: 1;
  }

  .home-feat-name:hover {
    background-size: 100% 2px;
  }

  .home-feat-cmd:hover {
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    border-color: color-mix(in srgb, var(--accent) 55%, transparent);
    transform: translateY(-2px);
  }
}

html.dark .home-feat {
  background: rgba(44, 44, 44, 0.6);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

html.dark .home-feat-glass {
  opacity: 0.3;
}

html.dark .home-feat-desc {
  color: #a9a2b8;
}

html.dark .home-feat-cmds {
  border-top-color: rgba(255, 255, 255, 0.12);
}

html.dark .home-feat-cmd {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
}

@media (hover: hover) and (pointer: fine) {
  html.dark .home-feat:hover {
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }

  html.dark .home-feat:hover .home-feat-glass {
    opacity: 0.6;
  }

  html.dark .home-feat-cmd:hover {
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    border-color: color-mix(in srgb, var(--accent) 60%, transparent);
  }
}

/* ===== CTA ===== */
.home-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

.home-cta-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  color: var(--accent);
  background: linear-gradient(var(--vp-c-bg, #fff), var(--vp-c-bg, #fff)) padding-box,
    linear-gradient(135deg, #ff9ed5, #7fb0ff) border-box;
  border: 1px solid transparent;
  transition: transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
}

.home-cta svg {
  width: 15px;
  height: 15px;
}

@media (hover: hover) and (pointer: fine) {
  .home-cta-ghost:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(255, 158, 213, 0.3);
  }
}

.home-cta-ghost:active {
  transform: scale(0.97);
}

.home-more {
  margin: 18px 0 0;
  font-size: 13px;
  color: #7d6c8e;
}

.home-more a {
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
}

html.dark .home-more {
  color: #a9a2b8;
}

/* ===== 最近更新 ===== */
.home-recent {
  margin-top: 24px;
}

.home-recent-list {
  display: grid;
  gap: 8px;
}

.home-recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--accent) 8%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: transform 0.22s var(--ease-out), box-shadow 0.22s ease,
    border-color 0.22s ease;
}

.home-recent-time {
  flex: none;
  font-size: 12px;
  color: #a397b2;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
}

.home-recent-message {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (hover: hover) and (pointer: fine) {
  .home-recent-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 22px color-mix(in srgb, var(--accent) 14%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.85);
    border-color: rgba(255, 255, 255, 0.9);
  }
}

html.dark .home-recent-item {
  background: rgba(44, 44, 44, 0.6);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

html.dark .home-recent-time {
  color: #8b8398;
}

@media (hover: hover) and (pointer: fine) {
  html.dark .home-recent-item:hover {
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
}

@media (max-width: 768px) {
  .home-intro-title {
    flex-wrap: wrap;
    gap: 6px;
  }

  .home-intro-sub {
    margin-left: 0;
    width: 100%;
  }

  .home-feats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .home-feat {
    padding: 13px 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-feat,
  .home-feat-glass,
  .home-feat-name,
  .home-feat-cmd,
  .home-cta-ghost,
  .home-recent-item {
    transition: none;
  }

  .home-feat {
    rotate: 0deg;
  }
}
</style>
