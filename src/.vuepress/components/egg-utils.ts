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
  docsNight: "凌晨 0 点到 5 点之间打开任意一端，neko 会陪你一起看",
  docsSearchNeko: "在任意一端的搜索框里输入 neko 或 猫",
  docsEggsSearch: "在任意一端的搜索框里输入 彩蛋 或 eggs（会直接翻开这本册子）",
  docsThemeTen: "在文档站来回切换深色/浅色主题 10 次",
  docsCopyTen: "在文档站连续复制指令 10 次",
};

// 这些原本只在功能站存在的彩蛋已经能在文档站本地触发，提示改成两端通用的说法
const LOCAL_TOOL_HINTS: Record<string, string> = {
  nekoSearch: "在任意一端的搜索框里输入 neko 或 猫",
  s666: "在任意一端的搜索框里输入 666",
  moyer: "在任意一端的搜索框里输入 摸鱼 或 上班",
  s404: "在任意一端的搜索框里输入 404",
  sMiao: "在任意一端的搜索框里输入 miao 或 喵",
  shake: "摇晃手机，或在电脑上快速左右甩鼠标 7 个来回",
  titleMeow: "切到别的标签页再切回来，反复两次",
  multiTab: "同时开两个 neko 的网页标签",
  printNeko: "在任意一端按 Ctrl+P 唤出打印",
  offline: "把网络断掉试试",
  cinema: "让网页进入全屏（F11 或视频全屏都可以喵）",
  logoTap: "快速连点左上角的 logo 6 次",
  logo22: "连点不松劲儿，把 logo 戳到 22 次",
  idleSleep: "打开网站后什么都不做，等 2 分钟",
  longPress: "按住任意按钮 3 秒不松手",
  clearTwice: "在聊天窗口里点一次垃圾桶按钮",
  copyNeko: "复制 neko 说过的话，累计 3 次（点消息上的复制按钮也算喵）",
  footerTour: "把聊天窗口底部那排按钮挨个点一遍",
  explorer: "一次不关网页的情况下，打开 3 个不同的页面",
  visit3: "连续 3 天都来访问网站（neko 会记得你喵）",
  monday: "星期一打开网站",
  thursday: "星期四当天打开疯四彩蛋",
  onTime: "整点前后 1 分钟内在网站上（11:44-11:46 有特别版喵）",
  festival: "元旦、春节、中秋等节日当天访问网站",
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
  syncEggs();
  eggPanelOpen.value = true;
}

export function closeEggPanel(): void {
  eggPanelOpen.value = false;
}

export function eggHintOf(id: string): string {
  return DOCS_EGG_HINTS[id] ?? LOCAL_TOOL_HINTS[id] ?? TOOLS_EGG_TIP;
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
  const added = shared.filter((id) => (id in TOOLS_EGGS || id in DOCS_EGGS) && !eggFound.value.has(id));
  if (added.length === 0) return;
  eggFound.value = new Set([...eggFound.value, ...added]);
  persist();
  if (eggFound.value.size >= EGG_TOTAL) markEgg("eggAll");
}

let copyCount = 0;

export function countEggCopy(): void {
  if (++copyCount >= 10) markEgg("docsCopyTen");
}
