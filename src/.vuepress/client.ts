import { defineClientConfig, usePageData } from "vuepress/client";
import { createApp, nextTick, onBeforeUnmount, onMounted, watch } from "vue";
import { Popper } from "@moefy-canvas/theme-popper";
import { copyText, showTip } from "./components/copy-utils";
import { EGGS, eggCount as eggStats, markEgg } from "./eggs";
import NavbarToolsLink from "./components/NavbarToolsLink.vue";
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
import EggPanel from "./components/EggPanel.vue";

const COPY_TEXT = "复制代码";
const TIP_CONTENT = "复制成功";

function nameOfEgg(id: string): string {
  return EGGS[id] ?? id;
}

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
        copyText(el.textContent ?? "", false)
          .then(() => showTip(TIP_CONTENT))
          .catch(() => showTip("复制失败"));
      });
      el.parentElement?.appendChild(btn);
    });
}

export default defineClientConfig({
  enhance: ({ app }) => {
    app.component("NavbarToolsLink", NavbarToolsLink);
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
    app.component("EggPanel", EggPanel);
  },

  rootComponents: [CommandRouter, AnnouncementPopup, EggPanel],

  setup() {
    let popper: Popper | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let observer: MutationObserver | null = null;

    let copyApp: ReturnType<typeof createApp> | null = null;
    let copyHolder: HTMLElement | null = null;
    let contentObserver: MutationObserver | null = null;
    let searchInputListener: ((event: Event) => void) | null = null;
    let eggListener: ((event: Event) => void) | null = null;
    let activePath = "";

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

    const pageData = usePageData();

    // 彩蛋：逛 5 个不同页面（sessionStorage 统计，刷新不清）
    const EXPLORE_KEY = "neko-doc-explore";
    function trackExplore(path: string): void {
      try {
        const seen = new Set<string>(
          JSON.parse(sessionStorage.getItem(EXPLORE_KEY) ?? "[]") as string[]
        );
        seen.add(path);
        sessionStorage.setItem(EXPLORE_KEY, JSON.stringify([...seen]));
        if (seen.size >= 5) markEgg("docExplore");
      } catch {
        // 隐私模式等忽略
      }
    }

    // 彩蛋：连续 3 天回首页
    const HOME_KEY = "neko-doc-home";
    function trackHomeVisit(): void {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const days = JSON.parse(localStorage.getItem(HOME_KEY) ?? "[]") as string[];
        const next = days.includes(today) ? days : [...days, today].slice(-3);
        localStorage.setItem(HOME_KEY, JSON.stringify(next));
        if (next.length >= 3) markEgg("docHome");
      } catch {
        // 隐私模式等忽略
      }
    }

    // 页面级彩蛋：按路由解锁
    const ROUTE_EGGS: Record<string, string> = {
      "/zhiling/cheatsheet": "docCheat",
      "/zhuangtai": "docStatus",
      "/draw": "docGallery",
    };

    watch(
      () => pageData.value.path,
      (path) => {
        trackExplore(path);
        if (path === "/") trackHomeVisit();
        const eggId = ROUTE_EGGS[path];
        if (eggId) markEgg(eggId);
        const command = pageData.value.frontmatter?.command;
        activePath = path;
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
      observer = new MutationObserver(() => injectCopyButtons());
      observer.observe(document.body, { childList: true, subtree: true });

      // 彩蛋入口：搜索框输入「彩蛋」/「eggs」唤起收集册（search-pro 输入框由弹层动态挂载，用捕获监听）
      const EGG_KEYWORDS = new Set(["彩蛋", "eggs"]);
      const onSearchInput = (event: Event): void => {
        const target = event.target as HTMLInputElement | null;
        if (!target || !target.matches(".search-pro-input")) return;
        const value = target.value.trim().toLowerCase();
        if (!EGG_KEYWORDS.has(value)) return;
        window.dispatchEvent(new CustomEvent("neko-open-eggs"));
        target.value = "";
        // search-pro 的输入是受控组件，置空后派发 input 事件同步其内部状态
        target.dispatchEvent(new Event("input", { bubbles: true }));
      };
      window.addEventListener("input", onSearchInput, true);
      searchInputListener = onSearchInput;

      // 彩蛋解锁提示：markEgg 触发后给个轻提示
      const onEggFound = (event: Event): void => {
        const id = (event as CustomEvent<string>).detail;
        const { found, total } = eggStats();
        showTip(`彩蛋发现喵！${nameOfEgg(id)}（${found}/${total}）`);
      };
      window.addEventListener("neko-egg", onEggFound);
      eggListener = onEggFound;
    });

    onBeforeUnmount(() => {
      popper?.unmount();
      canvas?.remove();
      observer?.disconnect();
      contentObserver?.disconnect();
      if (searchInputListener) window.removeEventListener("input", searchInputListener, true);
      if (eggListener) window.removeEventListener("neko-egg", eggListener);
      clearCommandCard();
    });
  },
});
