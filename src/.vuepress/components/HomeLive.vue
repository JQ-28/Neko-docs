<template>
  <section class="home-live">
    <h2 class="home-intro-title">
      <span class="home-intro-bar" aria-hidden="true"></span>
      此刻的小站
      <span class="home-intro-sub">两只猫正蹲在这里</span>
    </h2>

    <div class="home-live-cards">
      <div class="home-live-card">
        <span class="home-live-glass" aria-hidden="true"></span>
        <img
          ref="nekoAvatar"
          class="home-live-avatar"
          :src="nekoAvatarSrc"
          alt=""
          width="34"
          height="34"
          aria-hidden="true"
          @error="onAvatarError"
        />
        <span class="home-live-text">
          <span class="home-live-name">Neko 本猫</span>
          <span class="home-live-meta">群里随叫随到</span>
        </span>
        <span class="home-live-light" aria-hidden="true">
          <span class="home-live-light-ring"></span>
          <span class="home-live-light-core"></span>
        </span>
      </div>

      <OnlineCounter />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import OnlineCounter from "./OnlineCounter.vue";

/** 隔多久自己动一下，与在线卡错开，看起来像两只猫互相打量 */
const NUDGE_MIN_MS = 14_000;
const NUDGE_MAX_MS = 30_000;

/** Neko 主账号的头像，走 QQ 头像服务，换头像这里会跟着变 */
const QQ_AVATAR = "https://q1.qlogo.cn/g?b=qq&nk=3582537505&s=160";
const FALLBACK_AVATAR = "/assets/image/neko.webp";

const nekoAvatar = ref<HTMLImageElement | null>(null);
const nekoAvatarSrc = ref(QQ_AVATAR);

// QQ 头像服务偶尔抽风或被网络挡住，退回本地那张，别让卡片开天窗
function onAvatarError(): void {
  if (nekoAvatarSrc.value !== FALLBACK_AVATAR) {
    nekoAvatarSrc.value = FALLBACK_AVATAR;
  }
}

let idleTimer = 0;

function nudgeAvatar(): void {
  const avatar = nekoAvatar.value;
  if (!avatar) return;
  avatar.classList.remove("is-moving");
  void avatar.offsetWidth;
  avatar.classList.add("is-moving");
}

function scheduleNudge(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.clearTimeout(idleTimer);
  const delay = NUDGE_MIN_MS + Math.random() * (NUDGE_MAX_MS - NUDGE_MIN_MS);
  idleTimer = window.setTimeout(() => {
    nudgeAvatar();
    scheduleNudge();
  }, delay);
}

onMounted(scheduleNudge);

onBeforeUnmount(() => window.clearTimeout(idleTimer));
</script>

<style scoped>
.home-live {
  margin: 0 0 30px;
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

/* 两张卡片居中并排，间距留够，像聊天窗里面对面坐着的两个人 */
.home-live-cards {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 22px;
}

/* 让在线卡与右边的 Neko 卡取同一个宽度，并排才整齐。
   Neko 卡在左，在线卡在右，内边距取 Neko 卡的镜像值 */
.home-live-cards :deep(.home-online) {
  box-sizing: border-box;
  flex: 0 1 264px;
  max-width: 264px;
  padding: 10px 12px 10px 14px;
}

/* 视觉与在线卡保持一致：渐变描边玻璃层 + 圆头像 + 双层呼吸灯 */
.home-live-card {
  --live-state: #22c55e;
  --live-tilt: -0.6deg;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  flex: 0 1 264px;
  max-width: 264px;
  padding: 10px 14px 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--vp-c-accent, #096dd9) 10%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  rotate: var(--live-tilt);
  scale: 1;
  transition: rotate 0.3s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
    scale 0.3s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)),
    box-shadow 0.45s ease, border-color 0.3s ease;
  /* 浮动相位与在线卡错开，一上一下才像在互相招呼 */
  animation: home-live-in 0.44s cubic-bezier(0.22, 1, 0.36, 1),
    neko-card-float 10s cubic-bezier(0.455, 0.03, 0.515, 0.955) -4.3s infinite;
}

.home-live-glass {
  position: absolute;
  inset: 0;
  z-index: 1;
  padding: 2px;
  border-radius: inherit;
  background: linear-gradient(120deg, #ffd6f5, #e2cdfb, #bfe4ff);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.5;
  pointer-events: none;
}

.home-live-card > :not(.home-live-glass) {
  position: relative;
  z-index: 2;
}

.home-live-avatar {
  flex: none;
  width: 34px;
  height: 34px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  object-fit: cover;
  background: #f0e6f6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform-origin: 42% 82%;
}

/* 朝右歪，像在打量旁边的在线猫猫 */
.home-live-avatar.is-moving {
  animation: home-live-peek 0.86s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.home-live-text {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.home-live-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--vp-c-accent, #096dd9);
}

.home-live-meta {
  font-size: 11px;
  letter-spacing: 0.2px;
  color: #a397b2;
}

.home-live-light {
  flex: none;
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
}

.home-live-light-core,
.home-live-light-ring {
  grid-area: 1 / 1;
  border-radius: 50%;
}

.home-live-light-core {
  width: 9px;
  height: 9px;
  background: var(--live-state);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--live-state) 18%, transparent);
  animation: home-live-breathe 2.4s ease-in-out infinite;
}

.home-live-light-ring {
  width: 9px;
  height: 9px;
  border: 1.5px solid var(--live-state);
  opacity: 0;
  animation: home-live-ripple 2.4s ease-out infinite;
}

html.dark .home-live-card {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(30, 34, 42, 0.86);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

html.dark .home-live-glass {
  opacity: 0.32;
}

html.dark .home-live-avatar {
  background: #262a33;
  border-color: rgba(255, 255, 255, 0.18);
}

@media (hover: hover) and (pointer: fine) {
  .home-live-card:hover {
    rotate: 0deg;
    scale: 1.03;
    border-color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 15px 40px color-mix(in srgb, var(--vp-c-accent, #096dd9) 18%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }
}

@keyframes home-live-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes home-live-peek {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }

  30% {
    transform: rotate(8deg) scale(1.07);
  }

  62% {
    transform: rotate(-5deg) scale(1.03);
  }
}

@keyframes home-live-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(0.82);
    opacity: 0.72;
  }
}

@keyframes home-live-ripple {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }

  70%,
  100% {
    transform: scale(2.1);
    opacity: 0;
  }
}

/* 窄屏改两张平分，各让一半宽度就不会换行成一上一下。
   必须放在各卡片宽度定义之后，同特异性下才覆盖得掉 */
@media (max-width: 560px) {
  .home-live-cards {
    gap: 10px;
  }

  .home-live-cards :deep(.home-online),
  .home-live-card {
    flex: 1 1 0;
    min-width: 0;
    max-width: none;
    padding: 10px 10px 10px 10px;
  }

  /* 半宽放不下整句，让文案换行而不是被省略号截掉 */
  .home-live-cards :deep(.home-online-meta) {
    white-space: normal;
    line-height: 1.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-live-card,
  .home-live-avatar.is-moving,
  .home-live-light-core,
  .home-live-light-ring {
    animation: none;
  }

  .home-live-card {
    rotate: 0deg;
    transition: none;
  }
}
</style>
