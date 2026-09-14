import { ref } from "vue";

import { EGG_HINTS, EGG_TIP, EGGS } from "./neko-shared-eggs";

const COOKIE_KEY = "neko-eggs";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const COOKIE_ROOT_DOMAIN = "nekodayo.top";

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

function readLocalIds(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(COOKIE_KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function cookieDomainAttr(): string {
  return location.hostname.endsWith(`.${COOKIE_ROOT_DOMAIN}`) ? `;domain=.${COOKIE_ROOT_DOMAIN}` : "";
}

function readCookieIds(): string[] {
  const prefix = `${COOKIE_KEY}=`;
  const raw = document.cookie.split("; ").find((item) => item.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return [];
  try {
    return decodeURIComponent(raw).split(",").map((id) => id.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function writeCookieIds(ids: string[]): void {
  const value = encodeURIComponent(ids.join(","));
  document.cookie = `${COOKIE_KEY}=${value};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax${cookieDomainAttr()}`;
}

/* 两端的进度取并集后回写：本站 localStorage 与父域 cookie 任一有新进度都不会丢 */
function persist(): void {
  allEggIds = [...new Set([...allEggIds, ...eggFound.value])];
  try {
    localStorage.setItem(COOKIE_KEY, JSON.stringify(allEggIds));
  } catch {
    /* 隐私模式等场景忽略 */
  }
  writeCookieIds(allEggIds);
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
  const shared = [...new Set([...readLocalIds(), ...readCookieIds()])];
  allEggIds = shared;
  eggFound.value = new Set(shared.filter((id) => id in EGGS));
  persist();
  if (eggFound.value.size >= EGG_TOTAL) markEgg("eggAll");
  // 深夜来访两个站点都能触发：文档站半夜打开同样点亮功能站那颗「深夜来访」
  if (new Date().getHours() < 5) {
    markEgg("docsNight");
    markEgg("night");
  }
}

/* 另一端（功能站）触发后只写进了父域 cookie，翻开册子前重新合一次并集，进度立刻对齐 */
export function syncEggs(): void {
  if (typeof window === "undefined") return;
  const shared = [...new Set([...readLocalIds(), ...readCookieIds()])];
  const added = shared.filter((id) => id in EGGS && !eggFound.value.has(id));
  if (added.length === 0) return;
  eggFound.value = new Set([...eggFound.value, ...added]);
  persist();
  if (eggFound.value.size >= EGG_TOTAL) markEgg("eggAll");
}

let copyCount = 0;

export function countEggCopy(): void {
  if (++copyCount >= 10) markEgg("docsCopyTen");
}
