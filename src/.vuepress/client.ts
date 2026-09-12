import { defineClientConfig } from "vuepress/client";
import { onBeforeUnmount, onMounted } from "vue";
import { Popper } from "@moefy-canvas/theme-popper";
import ClipboardJS from "clipboard";
import NavbarToolsLink from "./components/NavbarToolsLink.vue";
import QQChat from "./components/QQChat.vue";
import QQMessage from "./components/QQMessage.vue";
import QQVoice from "./components/QQVoice.vue";
import QQImage from "./components/QQImage.vue";
import TimelineGallery from "./components/TimelineGallery.vue";
import ApplyForm from "./components/ApplyForm.vue";

const COPY_TEXT = "复制代码";
const TIP_TITLE = "提示";
const TIP_CONTENT = "复制成功";
const TIP_TIME = 3000;

function copyText(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const btn = document.createElement("div");
    btn.style.display = "none";
    document.body.appendChild(btn);
    const cli = new ClipboardJS(btn, { text: () => text });
    cli.on("success", () => {
      cli.destroy();
      btn.remove();
      resolve(text);
    });
    cli.on("error", (e) => {
      cli.destroy();
      btn.remove();
      reject(e.action);
    });
    btn.dispatchEvent(new Event("click"));
  });
}

function showTip(content: string): void {
  let list = document.querySelector<HTMLElement>(".alert-list");
  if (!list) {
    list = document.createElement("div");
    list.className = "alert-list";
    document.body.appendChild(list);
  }
  const tip = document.createElement("div");
  tip.className = "v-notification__group";
  tip.innerHTML = `<h2 class="v-notification__title">${TIP_TITLE}</h2><div class="v-notification__content"><p>${content}</p></div>`;
  list.appendChild(tip);
  setTimeout(() => {
    tip.classList.add("v-notification__leave");
    setTimeout(() => tip.remove(), 300);
  }, TIP_TIME);
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
  },

  setup() {
    onMounted(() => {
      const canvas = document.createElement("canvas");
      canvas.id = "vuepress-canvas-cursor";
      document.body.appendChild(canvas);
      const popper = new Popper(
        { shape: "star", size: 2 },
        { opacity: 1, zIndex: 999999999 }
      );
      popper.mount(canvas);

      injectCopyButtons();
      const observer = new MutationObserver(() => injectCopyButtons());
      observer.observe(document.body, { childList: true, subtree: true });

      onBeforeUnmount(() => {
        popper.unmount();
        canvas.remove();
        observer.disconnect();
      });
    });
  },
});
