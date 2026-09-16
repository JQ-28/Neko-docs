<template>
  <div class="vp-miao-mode">
    <label class="vp-miao-mode-title" for="miao-mode-switch">喵语模式</label>
    <button
      id="miao-mode-switch"
      type="button"
      class="vp-miao-mode-switch"
      :aria-pressed="isMiao"
      :aria-label="switchLabel"
      :title="switchLabel"
      @click="toggleMiao"
    >
      <svg
        class="miao-ico miao-ico--off"
        :class="{ show: !isMiao }"
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M0 0h24v24H0z" fill="none" />
        <path
          fill="currentColor"
          fill-rule="evenodd"
          d="M6.5 5c0-1.47.955-3 2.5-3s2.5 1.53 2.5 3s-.955 3-2.5 3s-2.5-1.53-2.5-3M9 3.5c-.388 0-1 .485-1 1.5s.612 1.5 1 1.5s1-.485 1-1.5s-.612-1.5-1-1.5M2 10c0-1.47.955-3 2.5-3S7 8.53 7 10s-.955 3-2.5 3S2 11.47 2 10m2.5-1.5c-.388 0-1 .485-1 1.5s.612 1.5 1 1.5s1-.485 1-1.5s-.612-1.5-1-1.5M15 2c-1.545 0-2.5 1.53-2.5 3s.955 3 2.5 3s2.5-1.53 2.5-3s-.955-3-2.5-3m-1 3c0-1.015.612-1.5 1-1.5s1 .485 1 1.5s-.612 1.5-1 1.5s-1-.485-1-1.5m3 5c0-1.47.955-3 2.5-3S22 8.53 22 10s-.955 3-2.5 3s-2.5-1.53-2.5-3m2.5-1.5c-.388 0-1 .485-1 1.5s.612 1.5 1 1.5s1-.485 1-1.5s-.612-1.5-1-1.5M12 9c-1.412 0-2.3.655-2.937 1.479c-.303.392-.553.827-.776 1.225l-.1.18c-.191.343-.365.657-.561.95c-.185.277-.455.532-.818.826q-.147.12-.32.255c-.278.218-.59.463-.87.72C4.761 15.42 4 16.483 4 18.25C4 20.32 5.68 22 7.75 22c.944 0 1.779-.456 2.42-.807l.064-.035c.726-.396 1.242-.658 1.766-.658s1.04.262 1.766.658l.064.035c.641.35 1.476.807 2.42.807c2.07 0 3.75-1.68 3.75-3.75c0-1.767-.76-2.83-1.618-3.615a15 15 0 0 0-.87-.72q-.173-.135-.32-.255c-.363-.294-.633-.549-.818-.826a14 14 0 0 1-.56-.95l-.1-.18c-.224-.399-.474-.833-.777-1.225C14.301 9.655 13.412 9 12 9m-3.126 4.666c.232-.348.44-.722.629-1.062l.093-.168c.222-.398.425-.745.654-1.04c.426-.551.912-.896 1.75-.896s1.324.345 1.75.896c.229.295.431.642.654 1.04l.093.168c.19.34.397.714.629 1.062c.315.473.732.843 1.12 1.158q.206.167.394.314c.255.2.491.385.728.602c.643.59 1.132 1.277 1.132 2.51c0 1.24-1.01 2.25-2.25 2.25c-.524 0-1.04-.262-1.766-.658l-.064-.035C13.78 19.457 12.944 19 12 19s-1.779.456-2.42.807l-.064.035c-.726.396-1.242.658-1.766.658c-1.24 0-2.25-1.01-2.25-2.25c0-1.233.49-1.92 1.132-2.51c.237-.217.473-.402.728-.602q.188-.148.394-.314c.388-.315.805-.685 1.12-1.158"
          clip-rule="evenodd"
        />
      </svg>
      <svg
        class="miao-ico miao-ico--on"
        :class="{ show: isMiao }"
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M0 0h24v24H0z" fill="none" />
        <path
          fill="currentColor"
          fill-rule="evenodd"
          d="M9 8c1.38 0 2.5-1.343 2.5-3S10.38 2 9 2S6.5 3.343 6.5 5S7.62 8 9 8m-4.5 5C5.88 13 7 11.657 7 10S5.88 7 4.5 7S2 8.343 2 10s1.12 3 2.5 3m13-8c0 1.657-1.12 3-2.5 3s-2.5-1.343-2.5-3s1.12-3 2.5-3s2.5 1.343 2.5 3m2 8c1.38 0 2.5-1.343 2.5-3s-1.12-3-2.5-3S17 8.343 17 10s1.12 3 2.5 3m-1.963.933l.003.002l.011.009C18.644 14.807 20 15.878 20 18.25c0 2.07-1.68 3.75-3.75 3.75c-.94 0-1.76-.445-2.485-.84c-.62-.34-1.205-.66-1.765-.66s-1.145.32-1.765.66c-.725.395-1.545.84-2.485.84C5.68 22 4 20.32 4 18.25c0-2.383 1.363-3.453 2.457-4.313l.003-.002l.037-.03c.451-.358.875-.695 1.128-1.075c.182-.268.343-.558.514-.864l.051-.091c.71-1.285 1.6-2.88 3.81-2.88c2.207 0 3.093 1.591 3.808 2.876l.002.004c.19.34.37.66.565.955c.26.394.698.739 1.162 1.103"
          clip-rule="evenodd"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { isMiao, toggleMiao } from "./shared/miao";

const switchLabel = computed(() =>
  isMiao.value ? "喵语模式已开启，点击切回正常" : "开启喵语模式"
);
</script>

<style scoped>
.vp-miao-mode {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.25rem 0;
}

.vp-miao-mode-title {
  margin: 0;
  padding: 0 0.25rem;
  color: var(--vp-c-text-subtle);
  font-weight: 600;
  font-size: 0.75rem;
  line-height: 2;
}

.vp-miao-mode-switch {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 1.9rem;
  height: 1.9rem;
  padding: 0;
  border: 1px solid var(--vp-c-gutter);
  border-radius: 50%;
  background: transparent;
  color: var(--vp-c-text-mute);
  cursor: pointer;
  transition: color 0.2s, background 0.2s, border-color 0.2s, transform 0.15s var(--ease-out);
}

.miao-ico {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 1em;
  height: 1em;
  font-size: 1.15rem;
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.2s var(--ease-out, ease-out), transform 0.2s var(--ease-out, ease-out);
}

.miao-ico.show {
  opacity: 1;
  transform: scale(1);
}

.vp-miao-mode-switch[aria-pressed="true"] {
  border-color: var(--vp-c-accent);
  background: var(--vp-c-accent-soft);
  color: var(--vp-c-accent);
}

@media (hover: hover) and (pointer: fine) {
  .vp-miao-mode-switch:hover {
    transform: scale(1.06);
  }
}

/* 移动端：触控区放大，图标同步变大 */
@media (max-width: 719px) {
  .vp-miao-mode-switch {
    width: 2.4rem;
    height: 2.4rem;
    flex: none;
  }

  .miao-ico {
    font-size: 1.3rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vp-miao-mode-switch,
  .miao-ico {
    transition: none;
  }

  .miao-ico,
  .miao-ico.show {
    transform: none;
  }
}
</style>
