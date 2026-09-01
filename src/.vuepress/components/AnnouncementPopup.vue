<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition name="announcement-fade">
      <div v-if="visible" class="announcement-mask" @click.self="close">
        <div class="announcement-dialog" role="dialog" aria-modal="true">
          <div class="announcement-header">
            <span class="announcement-title">{{ title }}</span>
            <button
              class="announcement-close"
              type="button"
              aria-label="关闭"
              @click="close"
            >
              ×
            </button>
          </div>
          <div class="announcement-body" v-html="content"></div>
          <div class="announcement-footer">
            <label class="announcement-never">
              <input v-model="neverShow" type="checkbox" />
              <span>不再显示</span>
            </label>
            <button class="announcement-confirm" type="button" @click="close">
              我知道了
            </button>
          </div>
        </div>
      </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

const announcementId = "2026-09-01";
const title = "公告";
const content = `<p>因开发者个人原因，neko将于2026年9月2日中午起暂停服务，恢复时间暂时还不太确定呢。不过别担心，开发者已经准备好了一个功能网站，暂时可以去那里玩：<a href="https://tools.nekodayo.top/" target="_blank" rel="noopener noreferrer">https://tools.nekodayo.top/</a></p><p>等neko回来的时候，会第一时间通知大家的喵！感谢一直以来的陪伴呀~</p>`;

const storageKey = `neko-announcement-closed:${announcementId}`;
const visible = ref(false);
const neverShow = ref(false);

onMounted(() => {
  visible.value = window.localStorage.getItem(storageKey) !== "true";
});

const close = (): void => {
  if (neverShow.value) {
    window.localStorage.setItem(storageKey, "true");
  }
  visible.value = false;
};
</script>

<style>
.announcement-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgb(0 0 0 / 45%);
}

.announcement-dialog {
  width: min(420px, 100%);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg, #fff);
  box-shadow: 0 12px 32px rgb(0 0 0 / 20%);
}

.announcement-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: var(--theme-color, #3eaf7c);
}

.announcement-title {
  color: #fff;
  font-size: 17px;
  font-weight: 600;
}

.announcement-close {
  border: none;
  background: none;
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.85;
}

.announcement-close:hover {
  opacity: 1;
}

.announcement-body {
  padding: 18px 20px 6px;
  color: var(--vp-c-text, #2c3e50);
  font-size: 15px;
  line-height: 1.7;
}

.announcement-body p {
  margin: 0 0 8px;
}

.announcement-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 18px;
}

.announcement-never {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--vp-c-text-mute, #666);
  font-size: 14px;
  cursor: pointer;
  user-select: none;
}

.announcement-confirm {
  padding: 7px 18px;
  border: none;
  border-radius: 6px;
  background: var(--theme-color, #3eaf7c);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.announcement-confirm:hover {
  filter: brightness(1.08);
}

html.dark .announcement-dialog {
  background: var(--vp-c-bg, #22272e);
}

html.dark .announcement-body {
  color: var(--vp-c-text, #e7e9ea);
}

.announcement-fade-enter-active,
.announcement-fade-leave-active {
  transition: opacity 0.25s ease;
}

.announcement-fade-enter-from,
.announcement-fade-leave-to {
  opacity: 0;
}
</style>
