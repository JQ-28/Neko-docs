<template>
  <Transition name="courier">
    <div v-if="arrived" class="card-courier" aria-hidden="true">
      <img
        class="card-courier-face"
        :src="kind === 'online' ? ONLINE_FACE : NEKO_FACE"
        alt=""
        width="30"
        height="30"
      />
      <span class="card-courier-say">{{ line }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { usePageData } from "vuepress/client";
import { DROP_LINES } from "./live-lines";

/** 首页把这个键写下再跳转，这边读到就说明有张卡跟着过来了 */
const CARRIED_KEY = "neko-carried";
/** 打声招呼挂在这儿多久 */
const SHOW_MS = 3400;
const NEKO_FACE = "https://q1.qlogo.cn/g?b=qq&nk=3582537505&s=160";
const ONLINE_FACE = "/assets/image/neko11.jpg";

const pageData = usePageData();
const arrived = ref(false);
const kind = ref("neko");
const line = ref("");
let hideTimer = 0;

/** 有卡跟着过来就迎一下：滑进来说句话，过会儿自己走 */
function greetIfCarried(): void {
  // 首页自己就是出发的地方，不用回头迎一次
  if (pageData.value.path === "/") return;

  let carried: string | null = null;
  try {
    carried = window.sessionStorage.getItem(CARRIED_KEY);
    window.sessionStorage.removeItem(CARRIED_KEY);
  } catch {
    // 隐私模式下读不到，就当没这回事
    return;
  }
  if (!carried) return;

  kind.value = carried === "online" ? "online" : "neko";
  line.value = kind.value === "online" ? DROP_LINES.carriedOnline : DROP_LINES.carried;
  arrived.value = true;
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    arrived.value = false;
  }, SHOW_MS);
}

onMounted(greetIfCarried);
watch(() => pageData.value.path, greetIfCarried);
onBeforeUnmount(() => window.clearTimeout(hideTimer));
</script>

<style scoped>
.card-courier {
  position: fixed;
  right: 20px;
  /* 全面屏手机的手势条正好压在这一带，照站内既有范式（.neko-egg-tips）让出安全区 */
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  z-index: 58;
  display: flex;
  align-items: center;
  gap: 9px;
  max-width: min(76vw, 320px);
  padding: 9px 15px 9px 9px;
  border-radius: 16px;
  background: var(--vp-c-bg-elv, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(0, 0, 0, 0.1));
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.16);
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-1, #333333);
  /* 它本来就是 aria-hidden 的纯装饰：这 3.4 秒别把右下角（回顶按钮那一带）的点击吞掉 */
  pointer-events: none;
}

.card-courier-face {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--vp-c-divider, rgba(0, 0, 0, 0.1));
}

.courier-enter-active,
.courier-leave-active {
  transition: opacity 0.3s ease, transform 0.3s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
}

.courier-enter-from,
.courier-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.94);
}

@media (prefers-reduced-motion: reduce) {
  .courier-enter-active,
  .courier-leave-active {
    transition: none;
  }
}
</style>
