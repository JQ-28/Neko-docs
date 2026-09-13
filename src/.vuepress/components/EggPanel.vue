<template>
  <ClientOnly>
    <div class="egg-mask" :class="{ open }" @click.self="close">
      <div class="egg-panel" role="dialog" aria-modal="true" aria-label="彩蛋收集册">
        <header class="egg-head">
          <span class="egg-head-icon" aria-hidden="true">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M256 16C150 16 64 102 64 208c0 58 23 111 60 149l-29 86c-4 11 8 21 18 17l65-27c22 10 47 17 78 17 106 0 192-86 192-192C448 102 362 16 256 16zM160 208a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zm112 0a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zm112 0a24 24 0 1 1 48 0 24 24 0 1 1 -48 0z"
              />
            </svg>
          </span>
          <h2>neko 彩蛋收集册</h2>
          <button type="button" class="egg-close" aria-label="关闭收集册" @click="close">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="2"
                d="M18 6L6 18M6 6l12 12"
              />
            </svg>
          </button>
        </header>

        <div class="egg-progress">
          <div class="egg-progress-bar" :style="{ width: `${progress}%` }"></div>
        </div>
        <p class="egg-count">已收集 {{ found }} / {{ total }} 个喵～名字就是线索哦</p>

        <div class="egg-list">
          <div
            v-for="egg in eggs"
            :key="egg.id"
            class="egg-item"
            :class="{ locked: !egg.found, revealed: egg.revealed }"
            :style="{ '--i': egg.index }"
            @click="poke(egg)"
          >
            <span class="egg-mark" :class="egg.found ? 'ok' : 'lock'" aria-hidden="true">
              <svg v-if="egg.found" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill="currentColor"
                  d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm113 113c-9.4-9.4-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 195c9.4-9.4 9.4-24.6 0-33.9z"
                />
              </svg>
              <svg v-else viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill="currentColor"
                  d="M144 144v48H304v-48c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192v-48C80 68.5 148.5 0 224 0s144 68.5 144 152v40h16c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z"
                />
              </svg>
            </span>
            <span class="egg-body">
              <span class="egg-name">{{ egg.name }}</span>
              <span class="egg-hint" :class="{ done: egg.found }">
                {{ egg.hint }}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { allEggs, EGG_HINTS, EGGS, eggCount, hasEgg, markEgg } from "../eggs";

const OPEN_EVENT = "neko-open-eggs";

interface EggItem {
  id: string;
  name: string;
  hint: string;
  found: boolean;
  revealed: boolean;
  index: number;
}

const open = ref(false);
const revealed = ref<Set<string>>(new Set());
const pokes = ref<Map<string, number>>(new Map());

const { found, total } = eggCount();
const progress = computed(() => (total === 0 ? 0 : (found / total) * 100));

const eggs = computed<EggItem[]>(() =>
  Object.entries(EGGS)
    .map(([id, name], index) => ({
      id,
      name,
      hint: EGG_HINTS[id] ?? "藏得很深喵…继续探索吧",
      found: hasEgg(id),
      revealed: revealed.value.has(id),
      index,
    }))
    .sort((a, b) => Number(a.found) - Number(b.found))
);

function poke(egg: EggItem): void {
  if (egg.found || egg.revealed) return;
  const n = (pokes.value.get(egg.id) ?? 0) + 1;
  pokes.value.set(egg.id, n);
  if (n >= 4) {
    const next = new Set(revealed.value);
    next.add(egg.id);
    revealed.value = next;
  }
}

function openPanel(): void {
  open.value = true;
}

function close(): void {
  open.value = false;
}

function onOpen(): void {
  openPanel();
}

onMounted(() => {
  window.addEventListener(OPEN_EVENT, onOpen);
});

onBeforeUnmount(() => {
  window.removeEventListener(OPEN_EVENT, onOpen);
});
</script>

<style scoped>
.egg-mask {
  position: fixed;
  inset: 0;
  z-index: 1600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s var(--ease-out), visibility 0.2s;
}

.egg-mask.open {
  opacity: 1;
  visibility: visible;
}

.egg-panel {
  width: 100%;
  max-width: 480px;
  max-height: 82vh;
  max-height: 82dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 20px;
  background: var(--vp-c-bg, #fff);
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.egg-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #f9bdeb 0%, #c5d8f8 100%);
}

.egg-head-icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: none;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: rgba(255, 255, 255, 0.25);
}

.egg-head-icon svg {
  width: 18px;
  height: 18px;
}

.egg-head h2 {
  flex: 1;
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
}

.egg-close {
  display: grid;
  width: 28px;
  height: 28px;
  flex: none;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: background 0.2s var(--ease-out);
}

.egg-close:hover {
  background: rgba(255, 255, 255, 0.35);
}

.egg-close svg {
  width: 15px;
  height: 15px;
}

.egg-progress {
  height: 6px;
  margin: 14px 18px 6px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--vp-c-accent, #096dd9) 12%, transparent);
}

.egg-progress-bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ff9ed5, #7fb0ff);
  transition: width 0.5s var(--ease-out);
}

.egg-count {
  margin: 0 18px 10px;
  font-size: 12px;
  color: #7d6c8e;
}

.egg-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px 14px;
}

.egg-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  animation: egg-in 0.4s var(--ease-out) backwards;
  animation-delay: calc(var(--i, 0) * 16ms);
  cursor: pointer;
}

.egg-item:hover {
  background: color-mix(in srgb, var(--vp-c-accent, #096dd9) 6%, transparent);
}

.egg-item.locked {
  opacity: 0.82;
}

.egg-mark {
  display: grid;
  width: 26px;
  height: 26px;
  flex: none;
  place-items: center;
  border-radius: 50%;
}

.egg-mark.ok {
  color: #34c759;
  background: color-mix(in srgb, #34c759 14%, transparent);
}

.egg-mark.lock {
  color: #a397b2;
  background: color-mix(in srgb, #a397b2 14%, transparent);
}

.egg-mark svg {
  width: 15px;
  height: 15px;
}

.egg-body {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.egg-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--vp-c-text, #2c3e50);
}

.egg-hint {
  font-size: 11.5px;
  color: #a397b2;
  line-height: 1.5;
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition: opacity 0.3s var(--ease-out), max-height 0.3s var(--ease-out);
}

.egg-item.revealed .egg-hint,
.egg-item .egg-hint.done {
  opacity: 1;
  max-height: 60px;
}

@keyframes egg-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

:global(html.dark) .egg-panel {
  background: #26262a;
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

:global(html.dark) .egg-count,
:global(html.dark) .egg-hint {
  color: #8b8398;
}

:global(html.dark) .egg-name {
  color: #e0e0e0;
}

@media (max-width: 768px) {
  .egg-mask {
    padding: 0;
    align-items: stretch;
  }

  .egg-panel {
    max-width: none;
    max-height: none;
    height: 100%;
    border: 0;
    border-radius: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .egg-item,
  .egg-hint {
    animation: none;
    transition: none;
  }
}
</style>
