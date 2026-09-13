import fs from "node:fs";
import path from "node:path";

const HOSTS = ["https://moegirl.uk", "https://mzh.moegirl.org.cn"];
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
const OUT_FILE = path.resolve("functions/_shared/memes-auto.ts");
const PAGE_CAP = Number(process.env.PAGE_CAP ?? 4000);
const DEPTH_MAX = Number(process.env.DEPTH_MAX ?? 3);

const SEED_CATEGORIES = [
  "Category:中国网络流行语句",
  "Category:欧美网络流行语句",
  "Category:ACG圈成句",
  "Category:ACG经典台词",
  "Category:弹幕网站成句",
  "Category:弹幕网站用语",
  "Category:定型文",
  "Category:汉语新词",
];

async function api(params, tries = 3) {
  const qs = new URLSearchParams({ ...params, format: "json", formatversion: "2" });
  for (const host of HOSTS) {
    for (let i = 0; i < tries; i++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(`${host}/api.php?${qs}`, { headers: UA, signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (json?.error) throw new Error(json.error.code);
        return json;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 700 + i * 500));
      }
    }
  }
  return null;
}

async function categoryMembers(category) {
  const members = [];
  let cont = null;
  do {
    const json = await api(
      cont
        ? { action: "query", list: "categorymembers", cmtitle: category, cmlimit: "500", cmcontinue: cont }
        : { action: "query", list: "categorymembers", cmtitle: category, cmlimit: "500" }
    );
    if (!json?.query?.categorymembers) break;
    members.push(...json.query.categorymembers);
    cont = json.continue?.cmcontinue ?? null;
  } while (cont);
  return members;
}

async function collectPages() {
  const pages = new Set();
  const visited = new Set();
  let queue = SEED_CATEGORIES.map((title) => ({ title, depth: 0 }));

  while (queue.length > 0) {
    const batch = queue.splice(0, 4);
    const results = await Promise.all(batch.map((node) => categoryMembers(node.title)));
    batch.forEach((node, index) => {
      if (visited.has(node.title)) return;
      visited.add(node.title);
      for (const member of results[index]) {
        if (member.ns === 0) pages.add(member.title);
        else if (member.ns === 14 && node.depth < DEPTH_MAX) queue.push({ title: member.title, depth: node.depth + 1 });
      }
    });
    console.error(`分类已访问 ${visited.size}，词条累计 ${pages.size}，队列 ${queue.length}`);
    if (pages.size >= PAGE_CAP) break;
  }
  return [...pages].slice(0, PAGE_CAP);
}

function cleanExtract(text) {
  return text
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toDesc(text) {
  const plain = cleanExtract(text);
  if (!plain) return "";
  const sentences = plain.split(/(?<=[。！？!?])/);
  let desc = "";
  for (const sentence of sentences) {
    if (desc.length + sentence.length > 90) break;
    desc += sentence;
    if (desc.length >= 30) break;
  }
  desc = desc.trim();
  return desc.length >= 10 ? desc.slice(0, 100) : "";
}

// 与 functions/api/command-route.ts 的 normalize 保持一致，保证检索时能命中
function normalize(text) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200b-\u200f\u202a-\u202e\ufeff]/g, "")
    .replace(/[\s,，。！？!?、;；:：'"“”‘’`<>《》（）()\[\]{}*_~·|/\\+=%#@&^$—…-]+/g, "");
}

const BANNED_KEYS = new Set([
  "二次元", "弹幕", "吐槽", "萌", "宅", "梗", "网络", "表情包", "鬼畜", "玩梗", "野生", "大佬",
  "打卡", "梗图", "出圈", "翻车", "吃瓜", "名场面", "人设", "发疯", "整活", "破防", "典", "麻了",
  "不会吧", "不安", "元", "草", "233", "滑稽", "彩虹", "柠檬", "真香", "打脸", "钓鱼", "水贴",
  "互联网", "不得了", "想多了", "这么强", "那个人", "我好了", "我干的", "该罚", "提供", "靠谱",
  "计划通", "真实", "害怕", "呵呵", "套路", "高血压", "三姐妹", "战队", "早鸟",
]);

function toKey(title) {
  const base = title.replace(/[（(][^）)]*[）)]\s*$/, "").trim();
  const key = normalize(base);
  if (key.includes("oo")) return "";
  if (base.startsWith("《")) return "";
  if (key.length < 3 || key.length > 24) return "";
  if (/^[a-z0-9]+$/.test(key) && key.length > 16) return "";
  return BANNED_KEYS.has(key) ? "" : key;
}

const manualKeys = new Set(
  [...fs.readFileSync(path.resolve("functions/_shared/memes.ts"), "utf8").matchAll(/keys:\s*\[([^\]]+)\]/g)]
    .flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]))
);

const CACHE_FILE = path.resolve(".cache/moegirl-extracts.json");
let extractCache = {};
try {
  extractCache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
} catch {
  extractCache = {};
}

async function fetchExtracts(titles) {
  const missing = titles.filter((title) => !(title in extractCache));
  for (let i = 0; i < missing.length; i += 20) {
    const chunk = missing.slice(i, i + 20);
    const json = await api({
      action: "query",
      prop: "extracts",
      titles: chunk.join("|"),
      exintro: "1",
      explaintext: "1",
      redirects: "1",
      exchars: "600",
    });
    for (const title of chunk) extractCache[title] = "";
    const pages = json?.query?.pages ?? {};
    for (const page of Object.values(pages)) {
      if (!page.missing && page.extract) extractCache[page.title] = page.extract;
    }
    console.error(`已抓取简介 ${Math.min(i + 20, missing.length)}/${missing.length}（缓存 ${titles.length - missing.length}）`);
  }
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(extractCache), "utf8");

  const result = new Map();
  for (const title of titles) {
    if (extractCache[title]) result.set(title, extractCache[title]);
  }
  return result;
}

const allPages = await collectPages();
console.error(`共收集词条 ${allPages.length} 条，开始抓取简介…`);

const extracts = await fetchExtracts(allPages);

const entries = [];
const seen = new Set();
for (const title of allPages) {
  const key = toKey(title);
  if (!key || seen.has(key) || manualKeys.has(key)) continue;
  const desc = toDesc(extracts.get(title) ?? "");
  if (!desc) continue;
  seen.add(key);
  entries.push({ keys: [key], desc });
}

const lines = entries
  .map((entry) => `  { keys: ${JSON.stringify(entry.keys)}, desc: ${JSON.stringify(entry.desc)} },`)
  .join("\n");

const output = `// 本文件由 scripts/scrape-moegirl-memes.mjs 自动生成，请勿手工修改
import type { MemeEntry } from "./memes";

export const MEMES_AUTO: MemeEntry[] = [
${lines}
];
`;

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, output, "utf8");
console.error(`已写入 ${OUT_FILE}，共 ${entries.length} 条`);
