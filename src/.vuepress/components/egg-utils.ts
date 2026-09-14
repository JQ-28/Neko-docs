import { ref } from "vue";

import { isKnownEgg, readEggIdUnion, writeEggIds } from "./neko-shared-egg-sync";
import { EGG_HINTS, EGG_THRESHOLDS, EGG_TIP, EGGS } from "./neko-shared-eggs";

export { EGGS };

export const EGG_TOTAL = Object.keys(EGGS).length;

export const eggPanelOpen = ref(false);

export const eggFound = ref<Set<string>>(new Set());

let allEggIds: string[] = [];
const unlockListeners: Array<(id: string) => void> = [];

export function onEggUnlocked(listener: (id: string) => void): void {
  unlockListeners.push(listener);
}

export function openEggPanel(): void {
  syncEggs();
  eggPanelOpen.value = true;
}

export function closeEggPanel(): void {
  eggPanelOpen.value = false;
}

const hints = EGG_HINTS as Record<string, string>;

export function eggHintOf(id: string): string {
  return hints[id] ?? EGG_TIP;
}

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

/* 两端进度取并集后回写，任一端有新进度都不会丢；存取细节见共享层 neko-shared-egg-sync */
function persist(): void {
  allEggIds = [...new Set([...allEggIds, ...eggFound.value])];
  writeEggIds(allEggIds);
}

export function markEgg(id: string): boolean {
  if (typeof window === "undefined" || eggFound.value.has(id)) return false;
  eggFound.value = new Set([...eggFound.value, id]);
  persist();
  unlockListeners.forEach((listener) => listener(id));
  return true;
}

export function initEggs(): void {
  if (typeof window === "undefined") return;
  const shared = readEggIdUnion();
  allEggIds = shared;
  eggFound.value = new Set(shared.filter((id) => isKnownEgg(EGGS, id)));
  persist();
  // eggAll 不在自身计数内，集齐其余彩蛋即达成
  if (eggFound.value.size >= EGG_TOTAL - 1) markEgg("eggAll");
  // 深夜来访两个站点都能触发：文档站半夜打开同样点亮功能站那颗「深夜来访」
  if (new Date().getHours() < 5) {
    markEgg("docsNight");
    markEgg("night");
  }
}

/* 另一端（功能站）触发后只写进了父域 cookie，翻开册子前重新合一次并集，进度立刻对齐 */
export function syncEggs(): void {
  if (typeof window === "undefined") return;
  const added = readEggIdUnion().filter((id) => isKnownEgg(EGGS, id) && !eggFound.value.has(id));
  if (added.length === 0) return;
  eggFound.value = new Set([...eggFound.value, ...added]);
  persist();
  if (eggFound.value.size >= EGG_TOTAL - 1) markEgg("eggAll");
}

let copyCount = 0;

/* 复制狂魔：与功能站的复制按钮共用同一颗彩蛋，任一端连复制 10 次都点亮 */
export function countEggCopy(): void {
  if (++copyCount >= EGG_THRESHOLDS.copyTen) markEgg("copyTen");
}
