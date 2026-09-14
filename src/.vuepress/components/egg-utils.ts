import { ref } from "vue";

const COOKIE_KEY = "neko-eggs";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const COOKIE_ROOT_DOMAIN = "nekodayo.top";

export const TOOLS_EGGS: Record<string, string> = {
  night: "深夜来访",
  logoTap: "连点 logo",
  nekoSearch: "搜索 neko",
  clearTwice: "清空撒娇",
  thursday: "疯四正日子",
  idleSleep: "打瞌睡的neko",
  themeTen: "换装狂魔",
  dlTen: "下载达人",
  logo22: "戳穿 logo",
  monday: "周一综合征",
  onTime: "整点报时",
  festival: "节日问候",
  s666: "搜索 666",
  moyer: "摸鱼倒计时",
  nightGreet: "深夜晚安",
  visit3: "一日不见",
  fabingNeko: "对neko发病",
  explorer: "到处逛逛",
  eggAll: "全彩蛋达成",
  thanks: "道谢的乖孩子",
  testOne: "灵敏测试",
  stillHere: "在的喵",
  s404: "搜索 404",
  sMiao: "搜索喵叫",
  healthPig: "猪还是人",
  newsFan: "资讯达人",
  randPick: "选择困难晚期",
  accentTen: "彩虹收藏家",
  scolded: "反击的neko",
  sing: "neko的歌单",
  joke: "冷笑话大师",
  soulAsk: "灵魂拷问",
  jail996: "打工魂共鸣",
  numberLove: "数字表白",
  hungry: "馋猫护食",
  longText: "论文警告",
  fishFood: "小鱼干投喂",
  shake: "摇一摇",
  sixSeven: "六七接头",
  longPress: "长按感应",
  titleMeow: "标题栏喵叫",
  offline: "云端猫消失",
  footerTour: "全按钮巡礼",
  copyNeko: "偷学台词",
  multiTab: "猫界捉奸",
  printNeko: "neko海报",
  cinema: "影院模式",
  bababoi: "bababoi!",
};

export const DOCS_EGGS: Record<string, string> = {
  docsNight: "文档站夜读",
  docsSearchNeko: "搜索框喊猫",
  docsEggsSearch: "抽屉里的册子",
  docsThemeTen: "换装狂魔·文档版",
  docsCopyTen: "复制狂魔·文档版",
};

const DOCS_EGG_HINTS: Record<string, string> = {
  docsNight: "凌晨 0 点到 5 点之间打开文档站，neko 会陪你一起看",
  docsSearchNeko: "在文档站搜索框里输入 neko 或 猫",
  docsEggsSearch: "在文档站搜索框里输入 彩蛋 或 eggs（会直接翻开这本册子）",
  docsThemeTen: "在文档站来回切换深色/浅色主题 10 次",
  docsCopyTen: "在文档站连续复制指令 10 次",
};

export const TOOLS_EGG_TIP = "去功能站逛逛就能找到它喵";

export const EGG_TOTAL = Object.keys(TOOLS_EGGS).length + Object.keys(DOCS_EGGS).length;

export const eggPanelOpen = ref(false);

export const eggFound = ref<Set<string>>(new Set());

let allEggIds: string[] = [];
const unlockListeners: Array<(id: string) => void> = [];

export function onEggUnlocked(listener: (id: string) => void): void {
  unlockListeners.push(listener);
}

export function openEggPanel(): void {
  eggPanelOpen.value = true;
}

export function closeEggPanel(): void {
  eggPanelOpen.value = false;
}

export function eggHintOf(id: string): string {
  return DOCS_EGG_HINTS[id] ?? TOOLS_EGG_TIP;
}

export function isDocsEgg(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(DOCS_EGGS, id);
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
  eggFound.value = new Set(shared.filter((id) => id in TOOLS_EGGS || id in DOCS_EGGS));
  persist();
  if (eggFound.value.size >= EGG_TOTAL) markEgg("eggAll");
  if (new Date().getHours() < 5) markEgg("docsNight");
}

let copyCount = 0;

export function countEggCopy(): void {
  if (++copyCount >= 10) markEgg("docsCopyTen");
}
