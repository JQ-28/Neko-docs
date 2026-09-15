<template>
  <div class="vp-nav-item vp-action">
    <button
      type="button"
      class="vp-action-link"
      aria-label="问问neko"
      title="问问neko（Ctrl+Shift+K）"
      @click="openRouter"
    >
      <img class="vp-action-neko" src="/assets/image/neko.webp" alt="问问neko" />
    </button>
    <a
      class="vp-action-link"
      href="https://tools.nekodayo.top/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="功能网站"
      title="功能网站"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="125 117 778 778" aria-hidden="true">
        <path
          d="M865.3 244.7c-.3-.3-61.1 59.8-182.1 180.6l-84.9-84.9l180.9-180.9c-95.2-57.3-217.5-42.6-296.8 36.7A244.42 244.42 0 0 0 419 432l1.8 6.7l-283.5 283.4c-6.2 6.2-6.2 16.4 0 22.6l141.4 141.4c6.2 6.2 16.4 6.2 22.6 0l283.3-283.3l6.7 1.8c83.7 22.3 173.6-.9 236-63.3c79.4-79.3 94.1-201.6 38-296.6"
        />
      </svg>
    </a>
    <a
      class="vp-action-link"
      href="https://input.nekodayo.top/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="喵喵信箱"
      title="喵喵信箱"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 64 512 384" aria-hidden="true">
        <path
          d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"
        />
      </svg>
    </a>
  </div>
</template>

<script setup lang="ts">
const OPEN_EVENT = "neko-open-router";

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
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  object-fit: cover;
  transition: transform 150ms var(--ease-out);
}

.vp-action-link svg {
  display: block;
  width: 1.25rem;
  height: 1.25rem;
  fill: currentColor;
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
    width: 1.15rem;
    height: 1.15rem;
  }
}
</style>
