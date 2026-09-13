import { defineClientConfig, usePageData } from "vuepress/client";
import { createApp, nextTick, onBeforeUnmount, onMounted, watch } from "vue";
import { Popper } from "@moefy-canvas/theme-popper";
import { copyText, showTip } from "./components/copy-utils";
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

const COPY_TEXT = "复制代码";
const TIP_CONTENT = "复制成功";

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
  },

  rootComponents: [CommandRouter, AnnouncementPopup],

  setup() {
    let popper: Popper | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let observer: MutationObserver | null = null;

    let copyApp: ReturnType<typeof createApp> | null = null;
    let copyHolder: HTMLElement | null = null;
    let contentObserver: MutationObserver | null = null;
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

    watch(
      () => pageData.value.path,
      (path) => {
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
    });

    onBeforeUnmount(() => {
      popper?.unmount();
      canvas?.remove();
      observer?.disconnect();
      contentObserver?.disconnect();
      clearCommandCard();
    });
  },
});
