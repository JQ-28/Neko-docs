import { defineClientConfig, usePageData } from "vuepress/client";
import { createApp, nextTick, onBeforeUnmount, onMounted, watch } from "vue";
import { Popper } from "@moefy-canvas/theme-popper";
import { copyText, showTip } from "./components/copy-utils";
import NavbarToolsLink from "./components/NavbarToolsLink.vue";
import QQChat from "./components/QQChat.vue";
import QQMessage from "./components/QQMessage.vue";
import QQVoice from "./components/QQVoice.vue";
import QQImage from "./components/QQImage.vue";
import TimelineGallery from "./components/TimelineGallery.vue";
import ApplyForm from "./components/ApplyForm.vue";
import CopyCommand from "./components/CopyCommand.vue";
import CommandCheatsheet from "./components/CommandCheatsheet.vue";

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
    app.component("QQChat", QQChat);
    app.component("QQMessage", QQMessage);
    app.component("QQVoice", QQVoice);
    app.component("QQImage", QQImage);
    app.component("TimelineGallery", TimelineGallery);
    app.component("ApplyForm", ApplyForm);
    app.component("CopyCommand", CopyCommand);
    app.component("CommandCheatsheet", CommandCheatsheet);
  },

  setup() {
    let popper: Popper | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let observer: MutationObserver | null = null;

    let copyApp: ReturnType<typeof createApp> | null = null;
    let copyHolder: HTMLElement | null = null;
    let contentObserver: MutationObserver | null = null;

    function mountCommandCard(command: string): void {
      if (typeof document === "undefined") return;
      if (copyHolder && document.contains(copyHolder)) return;
      const content = document.querySelector(".theme-hope-content");
      if (!content) return;
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
      () => {
        const command = pageData.value.frontmatter?.command;
        contentObserver?.disconnect();
        contentObserver = null;
        clearCommandCard();
        if (typeof command !== "string" || !command) return;
        nextTick(() => {
          if (typeof document === "undefined") return;
          const content = document.querySelector(".theme-hope-content");
          if (!content) return;
          // SPA 切换时页面内容异步渲染，监听内容容器，卡片被新内容冲掉后自动重注入
          contentObserver = new MutationObserver(() => {
            if (!document.querySelector(".command-copy-card-root")) {
              mountCommandCard(command);
            }
          });
          contentObserver.observe(content, { childList: true, subtree: true });
          mountCommandCard(command);
        });
      },
      { immediate: true }
    );

    onMounted(() => {
      canvas = document.createElement("canvas");
      canvas.id = "vuepress-canvas-cursor";
      document.body.appendChild(canvas);
      popper = new Popper(
        { shape: "star", size: 2 },
        { opacity: 1, zIndex: 999999999 }
      );
      popper.mount(canvas);

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
