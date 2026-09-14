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
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 11.6c-3.5 0-6.5 2.6-6.5 5.8 0 1.3 1.1 2.4 2.5 2.4 2.3 0 4-1.7 4-1.7s1.7 1.7 4 1.7c1.4 0 2.5-1.1 2.5-2.4 0-3.2-3-5.8-6.5-5.8z"
        />
        <circle cx="6.2" cy="9.6" r="2.2" />
        <circle cx="11.6" cy="6.8" r="2.2" />
        <circle cx="17.8" cy="9.6" r="2.2" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { isMiao, toggleMiao } from "./miao";

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

.vp-miao-mode-switch svg {
  display: block;
  width: 1.15rem;
  height: 1.15rem;
}

.vp-miao-mode-switch[aria-pressed="true"] {
  border-color: transparent;
  background: var(--vp-c-accent);
  color: var(--vp-c-bg);
}

@media (hover: hover) and (pointer: fine) {
  .vp-miao-mode-switch:hover {
    transform: scale(1.06);
  }
}
</style>
