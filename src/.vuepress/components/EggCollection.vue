<template>
  <Transition name="egg-fade">
    <div
      v-if="eggPanelOpen"
      class="egg-mask"
      role="dialog"
      aria-modal="true"
      aria-label="彩蛋收集册"
      @click.self="closeEggPanel"
    >
      <div class="egg-panel">
        <header class="egg-head">
          <h2 class="egg-title">彩蛋收集册</h2>
          <button class="egg-close" type="button" aria-label="关闭收集册" @click="closeEggPanel">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                fill="currentColor"
                d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"
              />
            </svg>
          </button>
        </header>

        <div class="egg-progress"><span :style="{ width: progressWidth }" /></div>
        <p class="egg-count">已收集 {{ foundCount }} / {{ total }} 个，名字就是线索</p>

        <div v-if="allDone" class="egg-done">彩蛋全收集达成，你是 neko 认证的资深铲屎官</div>

        <div class="egg-body">
          <button
            v-for="item in items"
            :key="item.id"
            type="button"
            class="egg-item"
            :class="{ locked: !eggFound.has(item.id), 'show-hint': revealed.has(item.id) }"
            @click="reveal(item.id)"
          >
            <span class="egg-mark" :class="eggFound.has(item.id) ? 'ok' : 'lock'">
              <svg viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path v-if="eggFound.has(item.id)" fill="currentColor" d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z" />
                <path v-else fill="currentColor" d="M144 144v48H304V144c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192V144C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z" />
              </svg>
            </span>
            <span class="egg-info">
              <span
                :key="shaking?.id === item.id ? shaking.token : 0"
                class="egg-name"
                :class="{ 'egg-poke': shaking?.id === item.id }"
                >{{ item.name }}</span
              >
              <span v-if="eggFound.has(item.id) || revealed.has(item.id)" class="egg-hint">
                {{ eggHintOf(item.id) }}
              </span>
            </span>
          </button>
        </div>

        <p class="egg-foot">在搜索框里输入「彩蛋」，就能翻开这本册子</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import {
  EGGS,
  EGG_TOTAL,
  closeEggPanel,
  eggFound,
  eggHintOf,
  eggPanelOpen,
  showEggTip,
} from "./egg-utils";
import { EGG_POKE_1, EGG_POKE_2, EGG_REVEAL_TIP } from "./neko-shared-eggs";

interface EggItem {
  id: string;
  name: string;
}

function pick(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)] ?? "";
}

function toItems(eggs: Record<string, string>): EggItem[] {
  return Object.entries(eggs).map(([id, name]) => ({ id, name }));
}

const items = computed(() =>
  toItems(EGGS).sort(
    (itemA, itemB) =>
      Number(eggFound.value.has(itemA.id)) - Number(eggFound.value.has(itemB.id)),
  ),
);

const revealed = ref<Set<string>>(new Set());
const shaking = ref<{ id: string; token: number } | null>(null);
const pokeCounts = new Map<string, number>();
let shakeToken = 0;
const total = EGG_TOTAL;
const foundCount = computed(() => eggFound.value.size);
const allDone = computed(() => foundCount.value >= total);
const progressWidth = computed(() => `${Math.round((foundCount.value / total) * 100)}%`);

/* 未收集的彩蛋可以戳：1 次抖一下，2 次 neko 吐槽，3 次欲言又止，4 次揭晓答案 */
function reveal(id: string): void {
  if (eggFound.value.has(id) || revealed.value.has(id)) return;
  const pokes = (pokeCounts.get(id) ?? 0) + 1;
  pokeCounts.set(id, pokes);
  shaking.value = { id, token: ++shakeToken };
  if (pokes === 2) showEggTip(pick(EGG_POKE_1));
  else if (pokes === 3) showEggTip(pick(EGG_POKE_2));
  else if (pokes >= 4) {
    revealed.value = new Set([...revealed.value, id]);
    showEggTip(EGG_REVEAL_TIP);
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && eggPanelOpen.value) closeEggPanel();
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<style scoped>
.egg-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(20, 18, 30, 0.42);
}

.egg-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 620px;
  max-height: min(78vh, 720px);
  padding: 18px 20px 14px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 18px;
  background: rgba(255, 252, 254, 0.96);
  box-shadow: 0 18px 40px rgba(127, 176, 255, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(14px);
}

.egg-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.egg-title {
  flex: 1;
  margin: 0;
  color: var(--vp-c-accent, #096dd9);
  font-weight: 700;
  font-size: 17px;
}

.egg-close {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(127, 176, 255, 0.14);
  color: var(--vp-c-text);
  cursor: pointer;
  transition: background 0.2s var(--ease-out, ease-out);
}

.egg-close svg {
  width: 12px;
  height: 12px;
}

.egg-close:hover {
  background: rgba(127, 176, 255, 0.28);
}

.egg-progress {
  overflow: hidden;
  height: 7px;
  margin-top: 14px;
  border-radius: 999px;
  background: rgba(127, 176, 255, 0.16);
}

.egg-progress span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff9ed5, #7fb0ff);
  transition: width 0.35s var(--ease-out, ease-out);
}

.egg-count {
  margin: 8px 0 0;
  color: var(--vp-c-text-mute, #6b7280);
  font-size: 12.5px;
}

.egg-done {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(255, 158, 213, 0.2), rgba(127, 176, 255, 0.2));
  color: var(--vp-c-accent, #096dd9);
  font-weight: 600;
  font-size: 13px;
  text-align: center;
}

.egg-body {
  flex: 1;
  overflow-y: auto;
  margin-top: 12px;
  padding-right: 4px;
  overscroll-behavior: contain;
}

.egg-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  margin-bottom: 6px;
  padding: 9px 12px;
  border: 1px solid rgba(127, 176, 255, 0.22);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--vp-c-text);
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s var(--ease-out, ease-out), border-color 0.2s var(--ease-out, ease-out);
}

.egg-item:hover {
  border-color: rgba(255, 158, 213, 0.5);
  transform: translateY(-1px);
}

.egg-item.locked {
  background: rgba(240, 242, 248, 0.72);
}

.egg-item:active {
  transform: scale(0.99);
}

.egg-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  border-radius: 50%;
}

.egg-mark svg {
  width: 11px;
  height: 11px;
}

.egg-mark.ok {
  background: rgba(255, 158, 213, 0.22);
  color: #e0679f;
}

.egg-mark.lock {
  background: rgba(127, 176, 255, 0.16);
  color: #7a8aa0;
}

.egg-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.egg-name {
  font-size: 13.5px;
  line-height: 1.4;
}

.egg-item.locked .egg-name {
  color: var(--vp-c-text-mute, #6b7280);
}

.egg-poke {
  animation: egg-poke-shake 0.36s var(--ease-out, ease-out);
}

@keyframes egg-poke-shake {
  0%,
  100% {
    transform: translateX(0);
  }

  20% {
    transform: translateX(-4px);
  }

  40% {
    transform: translateX(4px);
  }

  60% {
    transform: translateX(-3px);
  }

  80% {
    transform: translateX(3px);
  }
}

.egg-hint {
  color: var(--vp-c-text-mute, #8b93a5);
  font-size: 12px;
  line-height: 1.6;
}

.egg-foot {
  margin: 10px 0 0;
  color: var(--vp-c-text-mute, #9aa3b2);
  font-size: 11.5px;
  text-align: center;
}

.egg-fade-enter-active,
.egg-fade-leave-active {
  transition: opacity 0.28s var(--ease-out, ease-out);
}

.egg-fade-enter-active .egg-panel,
.egg-fade-leave-active .egg-panel {
  transition: transform 0.28s var(--ease-out, ease-out);
}

.egg-fade-enter-from,
.egg-fade-leave-to {
  opacity: 0;
}

.egg-fade-enter-from .egg-panel,
.egg-fade-leave-to .egg-panel {
  transform: translateY(12px);
}

html.dark .egg-panel {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(38, 36, 48, 0.96);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

html.dark .egg-item {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
}

html.dark .egg-item.locked {
  background: rgba(255, 255, 255, 0.03);
}

html.dark .egg-close {
  background: rgba(255, 255, 255, 0.12);
}

@media (max-width: 768px) {
  .egg-mask {
    padding: 0;
  }

  .egg-panel {
    max-width: none;
    height: 100%;
    max-height: none;
    padding: 16px 14px 12px;
    border: none;
    border-radius: 0;
  }

  .egg-title {
    font-size: 16px;
  }

  .egg-item {
    padding: 10px 12px;
  }

  .egg-close {
    width: 30px;
    height: 30px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .egg-fade-enter-active,
  .egg-fade-leave-active,
  .egg-fade-enter-active .egg-panel,
  .egg-fade-leave-active .egg-panel,
  .egg-progress span,
  .egg-item {
    transition: none;
  }

  .egg-item:hover,
  .egg-item:active {
    transform: none;
  }

  .egg-poke {
    animation: none;
  }
}
</style>
