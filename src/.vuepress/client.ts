import { defineClientConfig, usePageData } from "vuepress/client";
import { createApp, nextTick, onBeforeUnmount, onMounted, watch } from "vue";
import { Popper } from "@moefy-canvas/theme-popper";
import { copyText, showTip } from "./components/copy-utils";
import NavbarToolsLink from "./components/NavbarToolsLink.vue";
import CustomOutlook from "./components/CustomOutlook.vue";
import MiaoToggle from "./components/MiaoToggle.vue";
import HomeIntro from "./components/HomeIntro.vue";
import QQChat from "./components/QQChat.vue";
import QQMessage from "./components/QQMessage.vue";
import QQVoice from "./components/QQVoice.vue";
import QQImage from "./components/QQImage.vue";
import TimelineGallery from "./components/TimelineGallery.vue";
import ApplyForm from "./components/ApplyForm.vue";
import CopyCommand from "./components/CopyCommand.vue";
import CommandCheatsheet from "./components/CommandCheatsheet.vue";
import CommandRouter from "./components/CommandRouter.vue";
import AnnouncementPopup from "./components/AnnouncementPopup.vue";
import BotStatus from "./components/BotStatus.vue";
import EggCollection from "./components/EggCollection.vue";
import {
  EGGS,
  EGG_TOTAL,
  eggFound,
  initEggs,
  markEgg,
  onEggUnlocked,
  openEggPanel,
  showEggTip,
} from "./components/egg-utils";
import { initEggEvents, trackPageVisit } from "./components/egg-events";
import { EGG_THRESHOLDS } from "./components/neko-shared-eggs";
import { SEARCH_MIRROR_EGGS, matchSearchEgg } from "./components/neko-shared-search-eggs";
import { applyMiaoTextToPage } from "./components/miao";

const COPY_TEXT = "复制代码";
const TIP_CONTENT = "复制成功";
const SEARCH_INPUT_CLASS = "search-pro-input";

function injectCopyButtons(): void {
  document
    .querySelectorAll<HTMLElement>('div[class*="language-"] pre')
    .forEach((el) => {
      if (el.classList.contains("v-copy")) return;
      el.classList.add("v-copy");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "v-copy-code-btn";
      btn.textContent = COPY_TEXT;
      btn.addEventListener("click", () => {
        copyText(el.textContent ?? "")
          .then(() => showTip(TIP_CONTENT))
          .catch(() => showTip("复制失败"));
      });
      el.parentElement?.appendChild(btn);
    });
}

export default defineClientConfig({
  enhance: ({ app }) => {
    app.component("NavbarToolsLink", NavbarToolsLink);
    app.component("CustomOutlook", CustomOutlook);
    app.component("HomeIntro", HomeIntro);
    app.component("QQChat", QQChat);
    app.component("QQMessage", QQMessage);
    app.component("QQVoice", QQVoice);
    app.component("QQImage", QQImage);
    app.component("TimelineGallery", TimelineGallery);
    app.component("ApplyForm", ApplyForm);
    app.component("CopyCommand", CopyCommand);
    app.component("CommandCheatsheet", CommandCheatsheet);
    app.component("CommandRouter", CommandRouter);
    app.component("AnnouncementPopup", AnnouncementPopup);
    app.component("BotStatus", BotStatus);
    app.component("EggCollection", EggCollection);
  },

  rootComponents: [CommandRouter, AnnouncementPopup, EggCollection],

  setup() {
    let popper: Popper | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let observer: MutationObserver | null = null;

    let copyApp: ReturnType<typeof createApp> | null = null;
    let copyHolder: HTMLElement | null = null;
    let contentObserver: MutationObserver | null = null;
    let themeObserver: MutationObserver | null = null;
    let activePath = "";
    let themeFlips = 0;
    let lastDark = false;
    let cleanupEggEvents: (() => void) | null = null;
    let copyInjectScheduled = false;
    let miaoApp: ReturnType<typeof createApp> | null = null;
    let miaoHolder: HTMLElement | null = null;

    // DOM 每次变动都全量重扫一遍太费，合并到下一帧统一处理
    function scheduleInjectCopyButtons(): void {
      if (copyInjectScheduled) return;
      copyInjectScheduled = true;
      requestAnimationFrame(() => {
        copyInjectScheduled = false;
        injectCopyButtons();
        mountMiaoToggle();
        // 路由切换后导航/侧边栏/正文重建，喵语模式需要对新文本补一次追加
        applyMiaoTextToPage();
      });
    }

    // 移动端汉堡菜单（NavScreen）由主题 v-if 每次开合重建，
    // 其内部外观区不含喵语开关，需跟随面板重建重新挂载
    function mountMiaoToggle(): void {
      const wrapper = document.querySelector<HTMLElement>(".vp-outlook-wrapper");
      if (!wrapper) {
        if (miaoHolder && !miaoHolder.isConnected) {
          miaoApp?.unmount();
          miaoApp = null;
          miaoHolder = null;
        }
        return;
      }
      if (miaoHolder && wrapper.contains(miaoHolder)) return;
      miaoApp?.unmount();
      miaoHolder = document.createElement("div");
      wrapper.appendChild(miaoHolder);
      miaoApp = createApp(MiaoToggle);
      miaoApp.mount(miaoHolder);
    }

    function mountCommandCard(command: string): void {
      if (typeof document === "undefined") return;
      const content = document.querySelector<HTMLElement>(".theme-hope-content");
      if (!content) return;
      // 内容容器在路由切换时会被整体重建，只有卡片仍挂在当前容器内才视为已注入
      if (copyHolder && content.contains(copyHolder)) return;
      clearCommandCard();
      copyHolder = document.createElement("div");
      copyHolder.className = "command-copy-card-root";
      content.prepend(copyHolder);
      copyApp = createApp(CopyCommand, { command });
      copyApp.mount(copyHolder);
    }

    function clearCommandCard(): void {
      copyApp?.unmount();
      copyApp = null;
      copyHolder?.remove();
      copyHolder = null;
    }

    // 搜索框由 vuepress-plugin-search-pro 内部渲染且每次开合都会重建，
    // 故用文档级事件委托监听输入，命中关键词即翻开收集册
    function onSearchInput(event: Event): void {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.classList.contains(SEARCH_INPUT_CLASS)) return;
      const keyword = target.value.trim().toLowerCase();
      if (!keyword) return;
      const id = matchSearchEgg(keyword);
      if (!id) return;
      markEgg(id);
      SEARCH_MIRROR_EGGS[id]?.forEach((mirrorId) => markEgg(mirrorId));
      if (id === "docsEggsSearch") {
        // 收起搜索模态，避免两层弹层叠在一起
        document.querySelector<HTMLButtonElement>(".search-pro-close-button")?.click();
        openEggPanel();
      }
    }

    // 深色/浅色切换由主题内部管理，只观察 html 上的 dark 类翻转来计数
    function countThemeFlip(): void {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark === lastDark) return;
      lastDark = isDark;
      if (++themeFlips >= EGG_THRESHOLDS.themeTen) markEgg("themeTen");
    }

    const pageData = usePageData();

    watch(
      () => pageData.value.path,
      (path) => {
        const command = pageData.value.frontmatter?.command;
        activePath = path;
        trackPageVisit(path);
        contentObserver?.disconnect();
        contentObserver = null;
        clearCommandCard();
        if (typeof command !== "string" || !command) return;
        if (typeof document === "undefined") return;
        // 路由切换后页面为异步渲染，.theme-hope-content 会被销毁重建，
        // 故监听 body 而非该容器本身，待内容就绪或重建后重新注入
        contentObserver = new MutationObserver(() => {
          if (pageData.value.path !== activePath) return;
          mountCommandCard(command);
        });
        contentObserver.observe(document.body, { childList: true, subtree: true });
        nextTick(() => mountCommandCard(command));
      },
      { immediate: true }
    );

    onMounted(() => {
      // 星星光标只在支持悬停的设备上挂载（触屏无 mousemove，纯白费性能）
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(hover: hover) and (pointer: fine)").matches
      ) {
        canvas = document.createElement("canvas");
        canvas.id = "vuepress-canvas-cursor";
        document.body.appendChild(canvas);
        popper = new Popper(
          { shape: "star", size: 2 },
          { opacity: 1, zIndex: 999999999 }
        );
        popper.mount(canvas);
      }

      injectCopyButtons();
      mountMiaoToggle();
      applyMiaoTextToPage();
      observer = new MutationObserver(scheduleInjectCopyButtons);
      observer.observe(document.body, { childList: true, subtree: true });

      onEggUnlocked((id) => {
        const name = EGGS[id];
        if (name) showEggTip(`彩蛋发现：${name}（${eggFound.value.size}/${EGG_TOTAL}）`);
      });
      initEggs();
      cleanupEggEvents = initEggEvents();
      offMiao = onMiaoChange(refreshCopyButtons);

      document.addEventListener("input", onSearchInput, true);
      lastDark = document.documentElement.classList.contains("dark");
      themeObserver = new MutationObserver(countThemeFlip);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    });

    onBeforeUnmount(() => {
      popper?.unmount();
      canvas?.remove();
      observer?.disconnect();
      contentObserver?.disconnect();
      themeObserver?.disconnect();
      cleanupEggEvents?.();
      document.removeEventListener("input", onSearchInput, true);
      miaoApp?.unmount();
      clearCommandCard();
    });
  },
});
