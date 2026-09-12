<template>
  <div class="cheatsheet">
    <div class="cheatsheet-search">
      <div class="search-shell">
        <div class="search-box">
          <svg viewBox="0 0 24 24" class="search-icon" aria-hidden="true">
            <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z" />
          </svg>
          <input
            v-model="keyword"
            type="search"
            class="cheatsheet-input"
            placeholder="搜索指令或功能名称…"
            aria-label="搜索指令"
          />
        </div>
      </div>
    </div>

    <div class="cheatsheet-hero">
      <span class="hero-glass"></span>
      <div class="hero-head">指令速查</div>
      <div class="hero-stats">
        <span class="hero-stat"><b ref="statCats">0</b> 类</span>
        <span class="hero-stat"><b ref="statFeats">0</b> 功能</span>
        <span class="hero-stat"><b ref="statCmds">0</b> 条指令</span>
      </div>
      <div class="hero-bar"><i></i></div>
    </div>

    <section
      v-for="cat in filteredCategories"
      :key="cat.name"
      class="cheatsheet-cat"
    >
      <h2 class="cat-head">
        <span class="cat-bar"></span>
        {{ cat.name }}
        <span class="cat-count">{{ cat.items.length }}</span>
      </h2>
      <TransitionGroup tag="div" name="card" class="cheatsheet-grid">
        <div v-for="item in cat.items" :key="item.link" class="cheatsheet-card">
          <span class="card-glass"></span>
          <RouterLink :to="item.link" class="cheatsheet-name">{{ item.title }}</RouterLink>
          <div class="cheatsheet-cmds">
            <button
              v-for="cmd in item.commands"
              :key="cmd"
              type="button"
              class="cheatsheet-cmd"
              :title="hintFor(item.title, cmd)"
              @click="copy(cmd)"
            >
              {{ cmd }}
            </button>
          </div>
        </div>
      </TransitionGroup>
    </section>

    <p v-if="filteredCategories.length === 0" class="cheatsheet-empty">
      没有找到匹配的指令
      <button type="button" class="cheatsheet-empty-reset" @click="keyword = ''">
        清空搜索
      </button>
    </p>

    <p class="cheatsheet-live" role="status" aria-live="polite">{{ liveMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { commandCategories, hintFor } from "./commands-data";
import { copyText, showTip } from "./copy-utils";

const keyword = ref("");
const liveMessage = ref("");
const statCats = ref<HTMLElement | null>(null);
const statFeats = ref<HTMLElement | null>(null);
const statCmds = ref<HTMLElement | null>(null);

const totalFeats = computed(() =>
  commandCategories.reduce((sum, cat) => sum + cat.items.length, 0)
);
const totalCmds = computed(() =>
  commandCategories.reduce(
    (sum, cat) => sum + cat.items.reduce((s, it) => s + it.commands.length, 0),
    0
  )
);

const filteredCategories = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return commandCategories;
  return commandCategories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.title.toLowerCase().includes(kw) ||
          item.command.toLowerCase().includes(kw) ||
          item.commands.some((cmd) => cmd.toLowerCase().includes(kw))
      ),
    }))
    .filter((cat) => cat.items.length > 0);
});

function animateNumber(el: HTMLElement, target: number): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = String(target);
    return;
  }
  const start = performance.now();
  const dur = 700;
  const tick = (now: number): void => {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = String(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

onMounted(() => {
  nextTick(() => {
    if (statCats.value) animateNumber(statCats.value, commandCategories.length);
    if (statFeats.value) animateNumber(statFeats.value, totalFeats.value);
    if (statCmds.value) animateNumber(statCmds.value, totalCmds.value);
  });
});

function announce(message: string): void {
  liveMessage.value = "";
  requestAnimationFrame(() => {
    liveMessage.value = message;
  });
}

function copy(text: string): void {
  copyText(text)
    .then(() => {
      showTip("指令已复制");
      announce(`已复制指令 ${text}`);
    })
    .catch(() => {
      showTip("复制失败");
      announce("复制失败");
    });
}
</script>

<style scoped>
.cheatsheet {
  margin: 24px 0;
  --neko-gradient: linear-gradient(135deg, #e6d6f6, #f8e0f8, #c8e8f8, #f8e0f8, #e6d6f6);
  --neko-glow: linear-gradient(120deg, #ffd6f5, #e2cdfb, #bfe4ff);
  --accent: var(--vp-c-accent, #096dd9);
}

/* ===== 总览卡 ===== */
.cheatsheet-hero {
  position: relative;
  overflow: hidden;
  padding: 18px 20px;
  margin-bottom: 18px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(248, 224, 248, 0.5), rgba(200, 232, 248, 0.5));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 10px 25px rgba(255, 192, 203, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.hero-glass {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  padding: 2px;
  background: var(--neko-glow);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.65;
  pointer-events: none;
}

.cheatsheet-hero > :not(.hero-glass) {
  position: relative;
  z-index: 2;
}

.hero-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 2px;
  color: var(--accent);
  margin-bottom: 8px;
}

.hero-head::before {
  content: "";
  width: 3px;
  height: 13px;
  flex: none;
  background: var(--neko-gradient);
  background-size: 300% auto;
  border-radius: 2px;
  animation: animated-gradient 8s ease infinite;
}

.hero-stats {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  font-size: 13px;
  color: #7d6c8e;
}

.hero-stat b {
  font-size: 20px;
  font-weight: 800;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  margin-right: 3px;
}

.hero-bar {
  height: 6px;
  margin-top: 12px;
  background: rgba(200, 232, 248, 0.65);
  border-radius: 3px;
  overflow: hidden;
}

.hero-bar i {
  display: block;
  height: 100%;
  width: 100%;
  background: var(--neko-gradient);
  background-size: 300% auto;
  border-radius: 3px;
  transform-origin: left;
  animation: hero-reveal 0.8s cubic-bezier(0.23, 1, 0.32, 1) both,
    animated-gradient 8s ease infinite;
}

html.dark .cheatsheet-hero {
  background: linear-gradient(135deg, rgba(90, 66, 110, 0.4), rgba(54, 74, 102, 0.4));
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

html.dark .hero-glass {
  opacity: 0.35;
}

html.dark .hero-stats {
  color: #a9a2b8;
}

html.dark .hero-stat b {
  color: var(--accent);
}

/* ===== 搜索框（胶囊流动渐变） ===== */
.cheatsheet-search {
  margin-bottom: 20px;
}

.search-shell {
  display: flex;
  max-width: 360px;
  padding: 3px;
  border-radius: 999px;
  background: var(--neko-gradient);
  background-size: 300% auto;
  animation: animated-gradient 8s ease infinite;
  box-shadow: 0 8px 20px rgba(255, 192, 203, 0.28);
}

.search-box {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 8px;
  padding: 4px 6px 4px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  transition: background 0.2s;
}

.search-box:focus-within {
  background: #fff;
}

.search-icon {
  width: 18px;
  height: 18px;
  flex: none;
}

.search-icon path {
  fill: var(--accent);
}

.cheatsheet-input {
  flex: 1;
  width: 100%;
  padding: 8px 10px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #5d4037;
  border-radius: 999px;
}

.cheatsheet-input::placeholder {
  color: color-mix(in srgb, var(--accent) 45%, transparent);
}

html.dark .search-shell {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
}

html.dark .search-box,
html.dark .search-box:focus-within {
  background: rgba(44, 44, 44, 0.85);
}

html.dark .cheatsheet-input {
  color: #f0f0f0;
}

html.dark .search-icon path {
  fill: var(--accent);
}

html.dark .cheatsheet-input::placeholder {
  color: color-mix(in srgb, var(--accent) 60%, transparent);
}

/* ===== 分组标题 ===== */
.cheatsheet-cat {
  margin: 0 0 28px;
}

.cat-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 1px;
  margin: 0 0 14px;
  line-height: 1.4;
  color: inherit;
}

.cat-bar {
  width: 4px;
  height: 18px;
  flex: none;
  background: var(--neko-gradient);
  background-size: 300% auto;
  border-radius: 2px;
  animation: animated-gradient 8s ease infinite;
}

.cat-count {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
  border-radius: 999px;
  padding: 2px 10px;
}

html.dark .cat-count {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
}

/* ===== 卡片网格 ===== */
.cheatsheet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.cheatsheet-card {
  position: relative;
  overflow: hidden;
  padding: 16px 18px;
  border-radius: 22px;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 10px 25px color-mix(in srgb, var(--accent) 12%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  --rotation: 0deg;
  --animation-delay: 0s;
  rotate: var(--rotation);
  scale: 1;
  animation: card-float 10s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
  animation-delay: var(--animation-delay);
  transition: rotate 0.3s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
    scale 0.3s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
    box-shadow 0.45s ease, border-color 0.3s ease;
}

.cheatsheet-card:nth-child(4n+1) { --rotation: 0.8deg; --animation-delay: -1s; }
.cheatsheet-card:nth-child(4n+2) { --rotation: -0.6deg; --animation-delay: -3s; }
.cheatsheet-card:nth-child(4n+3) { --rotation: 0.5deg; --animation-delay: -5s; }
.cheatsheet-card:nth-child(4n+4) { --rotation: -0.4deg; --animation-delay: -2s; }

@keyframes card-float {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -5px; }
}

.card-glass {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  padding: 2px;
  background: var(--neko-glow);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 0.4s ease;
}

.cheatsheet-card > :not(.card-glass) {
  position: relative;
  z-index: 2;
}

@media (hover: hover) and (pointer: fine) {
  .cheatsheet-card:hover {
    rotate: 0deg;
    scale: 1.03;
    border-color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 15px 40px color-mix(in srgb, var(--accent) 18%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  .cheatsheet-card:hover .card-glass {
    opacity: 1;
  }

  html.dark .cheatsheet-card:hover {
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }

  html.dark .cheatsheet-card:hover .card-glass {
    opacity: 0.6;
  }
}

html.dark .cheatsheet-card {
  background: rgba(44, 44, 44, 0.6);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

html.dark .card-glass {
  opacity: 0.3;
}

.cheatsheet-name {
  display: inline-block;
  font-size: 15px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 10px;
  text-decoration: none;
  background-image: linear-gradient(var(--accent), var(--accent));
  background-repeat: no-repeat;
  background-position: 0 100%;
  background-size: 0% 2px;
  transition: background-size 0.22s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
}

html.dark .cheatsheet-name {
  color: var(--accent);
}

@media (hover: hover) and (pointer: fine) {
  .cheatsheet-name:hover {
    background-size: 100% 2px;
  }
}

.cheatsheet-cmds {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--accent) 15%, transparent);
}

.cheatsheet-cmd {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 12px;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease,
    transform 0.15s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
}

@media (hover: hover) and (pointer: fine) {
  .cheatsheet-cmd:hover {
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 55%, transparent);
    transform: translateY(-2px);
  }
}

.cheatsheet-cmd:active {
  transform: scale(0.94);
}

html.dark .cheatsheet-cmds {
  border-top-color: rgba(255, 255, 255, 0.12);
}

html.dark .cheatsheet-cmd {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
}

html.dark .cheatsheet-cmd:hover {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 60%, transparent);
}

.cheatsheet-empty {
  text-align: center;
  color: #7d6c8e;
  padding: 60px 40px;
  margin: 0;
  border-radius: 30px;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.75);
  animation: card-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

html.dark .cheatsheet-empty {
  background: rgba(44, 44, 44, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
  color: #a9a9a9;
}

.cheatsheet-empty-reset {
  display: block;
  margin: 16px auto 0;
  padding: 6px 18px;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.25s ease, border-color 0.25s ease;
}

@media (hover: hover) and (pointer: fine) {
  .cheatsheet-empty-reset:hover {
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    border-color: color-mix(in srgb, var(--accent) 55%, transparent);
  }
}

.cheatsheet-live {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* ===== 搜索过滤过渡 ===== */
.card-enter-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

.card-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

.card-leave-active {
  transition: opacity 0.15s ease-in, transform 0.15s ease-in;
}

.card-leave-to {
  opacity: 0;
  transform: scale(0.94);
}

.card-move {
  transition: transform 0.2s ease-out;
}

/* ===== 动画 ===== */
@keyframes hero-reveal {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

@keyframes animated-gradient {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes card-enter {
  from { opacity: 0; transform: translateY(30px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .hero-head::before,
  .cat-bar,
  .hero-bar i,
  .search-shell {
    animation: none;
  }

  .cheatsheet-card {
    animation: none;
  }

  .cheatsheet-empty {
    animation: none;
  }
}

/* ===== 移动端 ===== */
@media (max-width: 768px) {
  .cheatsheet-grid {
    gap: 10px;
  }

  .hero-stats {
    gap: 14px;
  }

  .hero-stat b {
    font-size: 17px;
  }
}
</style>
