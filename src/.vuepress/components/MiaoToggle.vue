<template>
  <button
    type="button"
    class="vp-action-link miao-toggle"
    :aria-label="isMiao ? '切换回正常语言' : '开启喵语模式'"
    :title="isMiao ? '喵语模式已开启，点击切回正常' : '开启喵语模式'"
    :aria-pressed="isMiao"
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
</template>

<script setup lang="ts">
import { isMiao, toggleMiao } from "./miao";
</script>

<style scoped>
.miao-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 6px;
  border: none;
  background: transparent;
  line-height: 1;
  cursor: pointer;
  color: var(--vp-c-text-mute, #6b7280);
  transition: transform 150ms var(--ease-out), color 150ms var(--ease-out);
}

.miao-toggle svg {
  display: block;
  width: 1.15rem;
  height: 1.15rem;
}

.miao-toggle[aria-pressed="true"] {
  color: var(--vp-c-accent, #096dd9);
}

@media (hover: hover) and (pointer: fine) {
  .miao-toggle:hover svg {
    transform: translateY(-1px);
  }
}

@media (max-width: 768px) {
  .miao-toggle {
    padding: 4px;
  }

  .miao-toggle svg {
    width: 1.05rem;
    height: 1.05rem;
  }
}
</style>
