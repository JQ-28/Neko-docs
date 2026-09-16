import ClipboardJS from "clipboard";

import { countEggCopy } from "../eggs/egg-utils";
import { scheduleToastDismiss } from "./toast-utils";

const TIP_TITLE = "提示";
const TIP_TIME = 3000;
const TIP_LEAVE_MS = 300;

export function copyText(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const btn = document.createElement("div");
    btn.style.display = "none";
    document.body.appendChild(btn);
    const cli = new ClipboardJS(btn, { text: () => text });
    cli.on("success", () => {
      cli.destroy();
      btn.remove();
      // 复制狂魔统一在这里计数，各个复制入口不必各自记得加一次
      countEggCopy();
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
  scheduleToastDismiss(tip, "v-notification__leave", TIP_TIME, TIP_LEAVE_MS);
}
