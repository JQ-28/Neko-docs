<template>
  <div class="vp-nav-item">
    <div
      class="vp-outlook-button"
      :class="{ open }"
      role="button"
      tabindex="0"
      :aria-expanded="open"
      :aria-label="'外观设置'"
      @click="open = !open"
      @keydown.enter.prevent="open = !open"
      @keydown.space.prevent="open = !open"
    >
      <svg
        class="icon"
        viewBox="123 74 780 880"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M224 800c0 9.6 3.2 44.8 6.4 54.4 6.4 48-48 76.8-48 76.8s80 41.6 147.2 0 134.4-134.4 38.4-195.2c-22.4-12.8-41.6-19.2-57.6-19.2C259.2 716.8 227.2 761.6 224 800zM560 675.2l-32 51.2c-51.2 51.2-83.2 32-83.2 32 25.6 67.2 0 112-12.8 128 25.6 6.4 51.2 9.6 80 9.6 54.4 0 102.4-9.6 150.4-32l0 0c3.2 0 3.2-3.2 3.2-3.2 22.4-16 12.8-35.2 6.4-44.8-9.6-12.8-12.8-25.6-12.8-41.6 0-54.4 60.8-99.2 137.6-99.2 6.4 0 12.8 0 22.4 0 12.8 0 38.4 9.6 48-25.6 0-3.2 0-3.2 3.2-6.4 0-3.2 3.2-6.4 3.2-6.4 6.4-16 6.4-16 6.4-19.2 9.6-35.2 16-73.6 16-115.2 0-105.6-41.6-198.4-108.8-268.8C704 396.8 560 675.2 560 675.2zM224 419.2c0-28.8 22.4-51.2 51.2-51.2 28.8 0 51.2 22.4 51.2 51.2 0 28.8-22.4 51.2-51.2 51.2C246.4 470.4 224 448 224 419.2zM320 284.8c0-22.4 19.2-41.6 41.6-41.6 22.4 0 41.6 19.2 41.6 41.6 0 22.4-19.2 41.6-41.6 41.6C339.2 326.4 320 307.2 320 284.8zM457.6 208c0-12.8 12.8-25.6 25.6-25.6 12.8 0 25.6 12.8 25.6 25.6 0 12.8-12.8 25.6-25.6 25.6C470.4 233.6 457.6 220.8 457.6 208zM128 505.6C128 592 153.6 672 201.6 736c28.8-60.8 112-60.8 124.8-60.8-16-51.2 16-99.2 16-99.2l316.8-422.4c-48-19.2-99.2-32-150.4-32C297.6 118.4 128 291.2 128 505.6zM764.8 86.4c-22.4 19.2-390.4 518.4-390.4 518.4-22.4 28.8-12.8 76.8 22.4 99.2l9.6 6.4c35.2 22.4 80 12.8 99.2-25.6 0 0 6.4-12.8 9.6-19.2 54.4-105.6 275.2-524.8 288-553.6 6.4-19.2-3.2-32-19.2-32C777.6 76.8 771.2 80 764.8 86.4z"
        />
      </svg>
      <div class="vp-outlook-dropdown" @click.stop>
        <div class="vp-theme-color">
          <label class="vp-theme-color-title" for="theme-color-picker">主题色</label>
          <ul class="vp-theme-color-picker" id="theme-color-picker">
            <li>
              <span
                class="theme-color"
                :class="{ active: !activeTheme }"
                title="默认"
                role="button"
                @click="setThemeColor()"
              ></span>
            </li>
            <li v-for="(color, index) in THEME_COLORS" :key="color">
              <span
                class="theme-color"
                :style="{ background: color }"
                :class="{ active: activeTheme === `theme-${index + 1}` }"
                :title="color"
                role="button"
                @click="setThemeColor(index + 1)"
              ></span>
            </li>
          </ul>
        </div>
        <div class="vp-color-mode">
          <label class="vp-color-mode-title" for="color-mode-switch">外观</label>
          <button
            type="button"
            class="vp-color-mode-switch"
            id="color-mode-switch"
            :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
            :title="isDark ? '切换到浅色模式' : '切换到深色模式'"
            @click="toggleDark"
          >
            <svg
              class="icon icon-moon"
              :class="{ show: isDark }"
              viewBox="0 0 1024 1024"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M524.8 938.667h-4.267a439.893 439.893 0 0 1-313.173-134.4 446.293 446.293 0 0 1-11.093-597.334A432.213 432.213 0 0 1 366.933 90.027a42.667 42.667 0 0 1 45.227 9.386 42.667 42.667 0 0 1 10.24 42.667 358.4 358.4 0 0 0 82.773 375.893 361.387 361.387 0 0 0 376.747 82.774 42.667 42.667 0 0 1 54.187 55.04 433.493 433.493 0 0 1-99.84 154.88 438.613 438.613 0 0 1-311.467 128z"
              />
            </svg>
            <svg
              class="icon icon-sun"
              :class="{ show: !isDark }"
              viewBox="0 0 1024 1024"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M952 552h-80a40 40 0 0 1 0-80h80a40 40 0 0 1 0 80zM801.88 280.08a41 41 0 0 1-57.96-57.96l57.96-58a41.04 41.04 0 0 1 58 58l-58 57.96zM512 752a240 240 0 1 1 0-480 240 240 0 0 1 0 480zm0-560a40 40 0 0 1-40-40V72a40 40 0 0 1 80 0v80a40 40 0 0 1-40 40zm-289.88 88.08-58-57.96a41.04 41.04 0 0 1 58-58l57.96 58a41 41 0 0 1-57.96 57.96zM192 512a40 40 0 0 1-40 40H72a40 40 0 0 1 0-80h80a40 40 0 0 1 40 40zm30.12 231.92a41 41 0 0 1 57.96 57.96l-57.96 58a41.04 41.04 0 0 1-58-58l58-57.96zM512 832a40 40 0 0 1 40 40v80a40 40 0 0 1-80 0v-80a40 40 0 0 1 40-40zm289.88-88.08 58 57.96a41.04 41.04 0 0 1-58 58l-57.96-58a41 41 0 0 1 57.96-57.96z"
              />
            </svg>
          </button>
        </div>
        <MiaoToggle />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { usePageData } from "vuepress/client";
import MiaoToggle from "./MiaoToggle.vue";

const THEME_COLOR_KEY = "VUEPRESS_THEME_COLOR";
const SCHEME_KEY = "vuepress-theme-hope-scheme";

// 与 src/.vuepress/styles/config.scss 的 $theme-colors 保持同步
const THEME_COLORS = [
  "#fcdfff",
  "#ffb7c5",
  "#fb6f92",
  "#ff8a65",
  "#f7b733",
  "#3eaf7c",
  "#14b8a6",
  "#2196f3",
  "#096dd9",
  "#5c6bc0",
  "#8e6bf5",
  "#ec407a",
];

const page = usePageData();
const open = ref(false);
const activeTheme = ref("");
const isDark = ref(false);

function applyScheme(status: string): void {
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches;
  isDark.value = status === "dark" || (status === "auto" && preferred);
  // class 与 data-theme 必须同步：主题的 CSS 变量（--vp-c-bg 等）跟随 data-theme，
  // 项目组件样式跟随 html.dark，只改一边会出现「暗色内容 + 浅色背景」的白罩错乱
  document.documentElement.classList.toggle("dark", isDark.value);
  document.documentElement.dataset.theme = isDark.value ? "dark" : "light";
}

function toggleDark(): void {
  const next = isDark.value ? "light" : "dark";
  try {
    localStorage.setItem(SCHEME_KEY, next);
  } catch {
    // 存储不可用时仅本次会话生效
  }
  // 广播 storage 事件，让主题内部 useStorage 同步同一状态
  window.dispatchEvent(new StorageEvent("storage", { key: SCHEME_KEY, newValue: next }));
  applyScheme(next);
}

function setThemeColor(index = 0): void {
  const classes = document.documentElement.classList;
  const themeClass = index > 0 ? `theme-${index}` : "";
  classes.forEach((name) => {
    if (name.startsWith("theme-")) classes.remove(name);
  });
  if (themeClass) classes.add(themeClass);
  activeTheme.value = themeClass;
  try {
    if (themeClass) localStorage.setItem(THEME_COLOR_KEY, themeClass);
    else localStorage.removeItem(THEME_COLOR_KEY);
  } catch {
    // 存储不可用
  }
}

watch(
  () => page.value.path,
  () => {
    open.value = false;
  }
);

// 移动端没有 hover，点面板外的地方收起
function onDocClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null;
  if (target && !target.closest(".vp-outlook-button")) open.value = false;
}

onMounted(() => {
  document.addEventListener("click", onDocClick);
  try {
    const theme = localStorage.getItem(THEME_COLOR_KEY);
    if (theme) setThemeColor(Number(theme.replace(/^theme-/, "")));
    const scheme = localStorage.getItem(SCHEME_KEY);
    applyScheme(scheme ?? "auto");
  } catch {
    applyScheme("auto");
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
});
</script>

<style>
/* 复刻主题外观面板样式（包 exports 不允许直接导入库内 scss） */
.vp-outlook-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  border: 0;
  border-radius: 0.25rem;
  background: transparent;
  color: var(--vp-c-text-mute);
  cursor: pointer;
  transition: color 0.2s;
}

.vp-outlook-button:hover {
  color: var(--vp-c-accent);
}

.vp-outlook-button:focus-visible {
  outline: 2px solid var(--vp-c-accent);
  outline-offset: 1px;
}

.vp-outlook-button .icon {
  vertical-align: middle;
  width: 1.25rem;
  height: 1.25rem;
}

.vp-outlook-dropdown {
  position: absolute;
  inset-inline-end: 0;
  top: 100%;

  overflow-y: auto;

  box-sizing: border-box;
  min-width: 120px;
  margin: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--vp-c-gutter);
  border-radius: 0.25rem;

  background: var(--vp-c-bg);
  box-shadow: 2px 2px 10px var(--vp-c-shadow);

  text-align: start;
  white-space: nowrap;

  opacity: 0;
  visibility: hidden;

  transition: opacity 0.18s var(--ease-out, ease-out),
    transform 0.18s var(--ease-out, ease-out), visibility 0.18s;

  transform: scale(0.8);
  transform-origin: top right;

  > *:not(:last-child) {
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--vp-c-border);
  }

  .vp-outlook-button:hover &,
  .vp-outlook-button.open & {
    z-index: 2;
    opacity: 1;
    visibility: visible;
    transform: scale(1);
  }
}

.vp-theme-color-title,
.vp-color-mode-title {
  display: block;
  margin: 0;
  padding: 0 0.25rem;
  color: var(--vp-c-text-subtle);
  font-weight: 600;
  font-size: 0.75rem;
  line-height: 2;
}

.vp-theme-color-picker {
  display: flex;
  margin: 0;
  padding: 0;
  list-style-type: none;
  font-size: 14px;
}

.vp-theme-color-picker li {
  display: flex;
}

.vp-theme-color-picker .theme-color {
  display: inline-block;
  vertical-align: middle;
  width: 15px;
  height: 15px;
  margin: 0 2px;
  border-radius: 2px;
  cursor: pointer;
}

.vp-theme-color-picker .theme-color:first-child,
.vp-theme-color-picker li:first-child .theme-color {
  background: var(--vp-c-accent-bg);
}

.vp-theme-color-picker .theme-color.active {
  outline: 1.5px solid var(--vp-c-accent);
  outline-offset: 1px;
}

.vp-color-mode {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vp-color-mode-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 1px solid var(--vp-c-gutter);
  border-radius: 50%;
  background: transparent;
  color: var(--vp-c-text-mute);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.vp-color-mode-switch:hover {
  color: var(--vp-c-accent-bg);
  border-color: var(--vp-c-accent);
}

.vp-color-mode-switch .icon {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 1.1rem;
  height: 1.1rem;
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.2s var(--ease-out, ease-out), transform 0.2s var(--ease-out, ease-out);
}

.vp-color-mode-switch .icon.show {
  opacity: 1;
  transform: scale(1);
}

/* 移动端：触控区放大到 44px 级，面板限宽防止溢出视口 */
@media (max-width: 719px) {
  .vp-outlook-dropdown {
    min-width: 220px;
    max-width: calc(100vw - 24px);
  }

  .vp-color-mode-switch {
    width: 2.4rem;
    height: 2.4rem;
    flex: none;
  }

  .vp-color-mode-switch .icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  /* 汉堡菜单面板：主题默认把主题色与外观并排 flex，
     13 个色块占满宽度后「外观」标签被挤成一字一行，改为纵向堆叠 */
  .vp-outlook-wrapper {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .vp-outlook-wrapper .vp-theme-color,
  .vp-outlook-wrapper .vp-color-mode,
  .vp-outlook-wrapper .vp-miao-mode {
    width: 100%;
  }

  .vp-theme-color-picker {
    flex-wrap: wrap;
    row-gap: 6px;
  }

  .vp-theme-color-title,
  .vp-color-mode-title,
  .vp-miao-mode-title {
    white-space: nowrap;
    flex: none;
  }

  .vp-outlook-wrapper .vp-color-mode-switch {
    width: 2.4rem;
    height: 2.4rem;
    flex: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vp-outlook-dropdown,
  .vp-color-mode-switch .icon {
    transition: none;
  }

  .vp-color-mode-switch .icon,
  .vp-color-mode-switch .icon.show {
    transform: none;
  }
}
</style>
