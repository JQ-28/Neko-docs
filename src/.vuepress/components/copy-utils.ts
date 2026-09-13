import ClipboardJS from "clipboard";
import { markEgg } from "../eggs";

const TIP_TITLE = "提示";
const TIP_TIME = 3000;

// 指令复制彩蛋：累计复制 3 次指令解锁（代码块复制不算）
const COPY_EGG_KEY = "neko-doc-copy-cmd";
const COPY_EGG_TARGET = 3;

export function copyText(text: string, countAsEgg = true): Promise<string> {
  if (countAsEgg) {
    try {
      const count = Number(localStorage.getItem(COPY_EGG_KEY) ?? 0) + 1;
      localStorage.setItem(COPY_EGG_KEY, String(count));
      if (count >= COPY_EGG_TARGET) markEgg("docCopyCmd");
    } catch {
      // 隐私模式等忽略
    }
  }
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

export function showTip(contentText: string): void {
  let list = document.querySelector<HTMLElement>(".alert-list");
  if (!list) {
    list = document.createElement("div");
    list.className = "alert-list";
    document.body.appendChild(list);
  }
  const tip = document.createElement("div");
  tip.className = "v-notification__group";
  const title = document.createElement("h2");
  title.className = "v-notification__title";
  title.textContent = TIP_TITLE;
  const content = document.createElement("div");
  content.className = "v-notification__content";
  const paragraph = document.createElement("p");
  paragraph.textContent = contentText;
  content.appendChild(paragraph);
  tip.append(title, content);
  list.appendChild(tip);
  setTimeout(() => {
    tip.classList.add("v-notification__leave");
    setTimeout(() => tip.remove(), 300);
  }, TIP_TIME);
}
