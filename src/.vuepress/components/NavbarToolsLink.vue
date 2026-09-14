<template>
  <div class="vp-nav-item vp-action">
    <button
      type="button"
      class="vp-action-link"
      :aria-label="askLabel"
      :title="askTitle"
      @click="openRouter"
    >
      <img class="vp-action-neko" src="/assets/image/neko.webp" :alt="askLabel" />
    </button>
    <a
      class="vp-action-link"
      href="https://tools.nekodayo.top/"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="toolsLabel"
      :title="toolsLabel"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1024 1024"
        style="width: 1.25rem; height: 1.25rem; vertical-align: middle"
        fill="currentColor"
      >
        <path d="M0 0h1024v1024H0z" fill="none" />
        <path
          fill="currentColor"
          d="M876.6 239.5c-.5-.9-1.2-1.8-2-2.5c-5-5-13.1-5-18.1 0L684.2 409.3l-67.9-67.9L788.7 169c.8-.8 1.4-1.6 2-2.5c3.6-6.1 1.6-13.9-4.5-17.5c-98.2-58-226.8-44.7-311.3 39.7c-67 67-89.2 162-66.5 247.4l-293 293c-3 3-2.8 7.9.3 11l169.7 169.7c3.1 3.1 8.1 3.3 11 .3l292.9-292.9c85.5 22.8 180.5.7 247.6-66.4c84.4-84.5 97.7-213.1 39.7-311.5zM786 499.8c-58.1 58.1-145.3 69.3-214.6 33.6l-8.8 8.8l-.1-.1l-274 274.1l-79.2-79.2l230.1-230.1s0 .1.1.1l52.8-52.8c-35.7-69.3-24.5-156.5 33.6-214.6a184.2 184.2 0 0 1 144-53.5L537 318.9a32.05 32.05 0 0 0 0 45.3l124.5 124.5a32.05 32.05 0 0 0 45.3 0l132.8-132.8c3.7 51.8-14.4 104.8-53.6 143.9"
        />
      </svg>
    </a>
    <a
      class="vp-action-link"
      href="https://input.nekodayo.top/"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="mailLabel"
      :title="mailLabel"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        style="width: 1.25rem; height: 1.25rem; vertical-align: middle"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"
        />
      </svg>
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { miao } from "./miao";

const OPEN_EVENT = "neko-open-router";

const askLabel = computed(() => miao("问问neko", "喵喵neko"));
const askTitle = computed(() =>
  miao("问问neko（Ctrl+Shift+K）", "喵喵neko（Ctrl+Shift+K）")
);
const toolsLabel = computed(() => miao("功能网站", "喵功能站"));
const mailLabel = computed(() => miao("喵喵信箱", "投喂小鱼干"));

function openRouter(): void {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}
</script>

<style scoped>
.vp-nav-item.vp-action {
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.vp-nav-item.vp-action .vp-action-link {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 6px;
  border: none;
  background: transparent;
  line-height: 1;
  cursor: pointer;
}

.vp-action-neko {
  display: block;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  object-fit: cover;
  transition: transform 150ms var(--ease-out);
}

.vp-action-link svg {
  display: block;
  transition: transform 150ms var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .vp-action-link:hover svg,
  .vp-action-link:hover .vp-action-neko {
    transform: translateY(-1px);
  }
}

/* 窄屏收敛：缩小图标与间距，避免与 Repo/Outlook/Search 挤爆导航栏 */
@media (max-width: 768px) {
  .vp-nav-item.vp-action {
    gap: 0;
  }

  .vp-nav-item.vp-action .vp-action-link {
    padding: 4px;
  }

  .vp-action-link svg {
    width: 1.15rem;
    height: 1.15rem;
  }

  .vp-action-neko {
    width: 1.2rem;
    height: 1.2rem;
  }
}
</style>
