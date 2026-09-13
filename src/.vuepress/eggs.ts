// 彩蛋系统：与功能站（tools.nekodayo.top）通过父域 Cookie 互通
// 存储：localStorage['neko-eggs']（本站）+ Cookie neko-eggs（domain=.nekodayo.top，跨站共享）
// 解锁：markEgg(id)，id 必须注册在 EGGS 中（功能站同步注册，互通时不会被过滤）

export const EGGS: Record<string, string> = {
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
  /* 文档站专属 */
  docExplore: "文档站巡礼",
  docCopyCmd: "复制小能手",
  docAskNeko: "搭话成功",
  docVoice: "开口说话",
  docCheat: "速查见闻",
  docStatus: "关心状态",
  docGallery: "画廊巡礼",
  docHome: "常回首页看看",
};

export const EGG_HINTS: Record<string, string> = {
  docExplore: "在文档站逛 5 个不同的页面",
  docCopyCmd: "在文档站复制 3 次指令",
  docAskNeko: "在文档站问 neko 小助手一句话",
  docVoice: "在文档站用语音向 neko 提问",
  docCheat: "打开文档站的指令速查页",
  docStatus: "打开文档站的状态页看看 neko 活得好不好",
  docGallery: "打开文档站的画作长廊",
  docHome: "在文档站连续 3 天回首页看看",
};

const STORAGE_KEY = "neko-eggs";
const COOKIE_NAME = "neko-eggs";
const COOKIE_DOMAIN = "nekodayo.top";

let eggFound: Set<string>;

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function readCookie(): string[] {
  try {
    const match = document.cookie.match(/(?:^|;\s*)neko-eggs=([^;]*)/);
    if (!match) return [];
    return JSON.parse(decodeURIComponent(match[1])) as string[];
  } catch {
    return [];
  }
}

function writeLocal(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...eggFound]));
  } catch {
    // 隐私模式等忽略
  }
}

function writeCookie(): void {
  try {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify([...eggFound]))}; domain=.${COOKIE_DOMAIN}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // 隐私模式等忽略
  }
}

export function initEggs(): void {
  if (eggFound) return;
  const merged = [...new Set([...readLocal(), ...readCookie()])];
  eggFound = new Set(merged.filter((id) => Object.prototype.hasOwnProperty.call(EGGS, id)));
}

export function hasEgg(id: string): boolean {
  return eggFound.has(id);
}

export function markEgg(id: string): void {
  initEggs();
  if (!Object.prototype.hasOwnProperty.call(EGGS, id) || eggFound.has(id)) return;
  eggFound.add(id);
  writeLocal();
  writeCookie();
  window.dispatchEvent(new CustomEvent("neko-egg", { detail: id }));
}

export function eggCount(): { found: number; total: number } {
  initEggs();
  return { found: eggFound.size, total: Object.keys(EGGS).length };
}

export function allEggs(): string[] {
  initEggs();
  return [...eggFound];
}
