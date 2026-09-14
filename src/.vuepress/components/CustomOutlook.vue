<template>
  <div v-if="enabled" class="vp-nav-item hide-in-mobile">
    <button
      v-if="!compact"
      type="button"
      class="vp-outlook-button"
      :class="{ open }"
      tabindex="-1"
      aria-hidden="true"
    >
      <component :is="OutlookIcon" />
      <div class="vp-outlook-dropdown">
        <component :is="ThemeColor" v-if="enableThemeColor" />
        <component :is="ColorMode" />
        <component :is="ToggleFullScreen" v-if="enableFullScreen" />
        <MiaoToggle />
      </div>
    </button>
    <component :is="ColorModeSwitch" v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { usePageData } from "vuepress/client";
import { useFullscreen } from "@vueuse/core";
import { usePure, useThemeData } from "@theme-hope/composables/index";
import ColorModeSwitch from "@theme-hope/modules/outlook/components/ColorModeSwitch";
import ThemeColor, {
  enableThemeColor,
} from "@theme-hope/modules/outlook/components/ThemeColor";
import ColorMode from "@theme-hope/modules/outlook/components/ColorMode";
import ToggleFullScreen from "@theme-hope/modules/outlook/components/ToggleFullScreen";
import { useDarkmode } from "@theme-hope/modules/outlook/composables/index";
import { OutlookIcon } from "@theme-hope/modules/outlook/components/icons/index";
import MiaoToggle from "./MiaoToggle.vue";

// 覆盖主题自带的 Outlook：外观下拉里保留 主题色/明暗/全屏，末尾追加喵语模式开关
const themeData = useThemeData();
const page = usePageData();
const { canToggle } = useDarkmode();
const { isSupported } = useFullscreen();
const isPure = usePure();
const open = ref(false);
const enableFullScreen = computed(
  () => !isPure.value && themeData.value.fullscreen && isSupported
);
const enabled = computed(() => enableThemeColor || canToggle.value || enableFullScreen.value);
const compact = computed(() => canToggle.value && !enableFullScreen.value && !enableThemeColor);

watch(
  () => page.value.path,
  () => {
    open.value = false;
  }
);
</script>

<style>
/* 复刻主题 outlook-button 样式（包 exports 不允许直接导入库内 scss） */
.vp-outlook-button {
  position: relative;
  padding: 0.375rem;
  border: 0;
  background: transparent;
  color: var(--vp-c-text-mute);
  cursor: pointer;
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
  min-width: 100px;
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

  transition: all 0.18s ease-out;

  transform: scale(0.8);

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
</style>
