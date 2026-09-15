const EGG_TIP_ROOT_ID = "neko-egg-tips";
const EGG_TIP_DURATION = 3400;
const EGG_TIP_LEAVE_MS = 320;

// 彩蛋提示独立于复制弹窗：固定在底部居中、层级高于搜索模态，弹窗盖着也能看清
export function showEggTip(text: string): void {
  if (typeof document === "undefined" || !text) return;
  let root = document.getElementById(EGG_TIP_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = EGG_TIP_ROOT_ID;
    root.className = "neko-egg-tips";
    document.body.appendChild(root);
  }
  const card = document.createElement("div");
  card.className = "neko-egg-tip";
  const tag = document.createElement("span");
  tag.className = "neko-egg-tip-tag";
  tag.textContent = "彩蛋";
  const body = document.createElement("span");
  body.className = "neko-egg-tip-text";
  body.textContent = text;
  card.append(tag, body);
  root.appendChild(card);
  window.setTimeout(() => {
    card.classList.add("is-leaving");
    window.setTimeout(() => card.remove(), EGG_TIP_LEAVE_MS);
  }, EGG_TIP_DURATION);
}
