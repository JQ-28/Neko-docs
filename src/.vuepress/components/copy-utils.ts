import ClipboardJS from "clipboard";

const TIP_TITLE = "提示";
const TIP_TIME = 3000;

export function copyText(text: string): Promise<string> {
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
