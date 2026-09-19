import { defineUserConfig, type App } from "vuepress";
import { getDirname, path } from "vuepress/utils";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import theme from "./theme.js";

import { removeHtmlExtensionPlugin } from 'vuepress-plugin-remove-html-extension'
import { llmsPlugin } from "@vuepress/plugin-llms"

const __dirname = getDirname(import.meta.url);

const RECENT_COUNT = 8;
const REPO_SLUG = "JQ-28/Neko-docs";
const TIME_ZONE = "Asia/Shanghai";

const SITE_URL = "https://docs.nekodayo.top";
const SITE_NAME = "Neko docs";
const SITE_DESC = "一个可爱的超多功能QQ群机器人";
const OG_IMAGE = `${SITE_URL}/assets/image/neko.jpg`;

interface RecentCommit {
  time: string;
  message: string;
}

// 本地读取 git 历史；CI（Cloudflare Pages）为浅克隆，通常只能拿到 1 条
function readFromGit(): RecentCommit[] {
  try {
    // 用 execFileSync 传参数组，避免 Windows shell 把 format 里的 %占位符 当作变量展开
    // --date=format 按提交自带的时区渲染，不受构建机时区影响
    const output = execFileSync(
      "git",
      [
        "log",
        `--pretty=format:%h%x1f%ad%x1f%s`,
        "--date=format:%Y-%m-%d %H:%M",
        "-n",
        String(RECENT_COUNT),
      ],
      { cwd: process.cwd(), encoding: "utf-8", maxBuffer: 16 * 1024 * 1024 }
    );
    // 每行格式：短哈希 \x1f 提交时间 \x1f 提交说明
    const items: RecentCommit[] = [];
    for (const rawLine of output.split(/\r?\n/)) {
      const [hash, time, message] = rawLine.trim().split("\u001f");
      if (!hash || !/^[0-9a-f]+$/i.test(hash) || !time || !message) continue;
      items.push({ time, message });
    }
    return items;
  } catch {
    return [];
  }
}

function formatTime(isoTime: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(isoTime));
  const pick = (type: string): string => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")} ${pick("hour")}:${pick("minute")}`;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// 浅克隆时从 commits 页的 Atom 订阅补齐；它不需 token，也不吃 API 的频率限制
async function readFromAtomFeed(): Promise<RecentCommit[]> {
  const response = await fetch(`https://github.com/${REPO_SLUG}/commits.atom`);
  if (!response.ok) throw new Error(`GitHub Atom ${response.status}`);
  const xml = await response.text();
  const items: RecentCommit[] = [];
  for (const entry of xml.split("<entry>").slice(1)) {
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const updated = entry.match(/<updated>([\s\S]*?)<\/updated>/)?.[1];
    if (!title || !updated) continue;
    items.push({ time: formatTime(updated.trim()), message: decodeXmlText(title) });
    if (items.length >= RECENT_COUNT) break;
  }
  if (!items.length) throw new Error("Atom 订阅里没解析出提交");
  return items;
}

// 手写条目读 src/.vuepress/recent-updates.md，一行一条：- 2026-09-17 21:30 内容
function readHandWrittenUpdates(): RecentCommit[] {
  try {
    const markdown = readFileSync(path.resolve(__dirname, "recent-updates.md"), "utf-8");
    const items: RecentCommit[] = [];
    for (const line of markdown.split(/\r?\n/)) {
      const match = line.match(/^- (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) (.+)$/);
      if (match) items.push({ time: match[1], message: match[2].trim() });
    }
    return items;
  } catch {
    return [];
  }
}

// 多个来源按时间倒序混排，去掉重复的，最多留 RECENT_COUNT 条
function mergeUpdates(sources: RecentCommit[][]): RecentCommit[] {
  const seen = new Set<string>();
  const merged: RecentCommit[] = [];
  for (const item of sources.flat().sort((a, b) => b.time.localeCompare(a.time))) {
    const key = `${item.time}\u001f${item.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= RECENT_COUNT) break;
  }
  return merged;
}

// 构建期读取 git 提交历史（与 GitHub commits 页一致）与手写条目，写入 public/recent-updates.json 供首页展示
async function generateRecentUpdates(): Promise<void> {
  const handWritten = readHandWrittenUpdates();
  let items = readFromGit();
  if (items.length < RECENT_COUNT) {
    try {
      const remote = await readFromAtomFeed();
      if (remote.length > items.length) items = remote;
    } catch (error) {
      console.warn(`[recent-updates] 远端提交列表没取到，沿用 git 的 ${items.length} 条：`, error);
    }
  }
  items = mergeUpdates([handWritten, items]);
  if (!items.length) {
    console.warn("[recent-updates] 提交历史为空，首页会隐藏「最近更新」区块");
    return;
  }
  console.log(`[recent-updates] 写入 ${items.length} 条更新记录`);
  const publicDir = path.resolve(__dirname, "public");
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(path.resolve(publicDir, "recent-updates.json"), JSON.stringify(items), "utf-8");
}

// 指令页普遍没写 description，取不到就一路退到全站默认 —— 那样几十个指令页在搜索结果
// 与分享卡片里会共用同一句描述。所以补一层兜底：拿页面标题 + 第一条指令说明拼一句
function pageDescription(title: string, frontmatter: Record<string, unknown>): string {
  const explicit = frontmatter.description as string | undefined;
  if (explicit) return explicit;
  const hints = frontmatter.commandHints as Record<string, string> | undefined;
  const [firstHint] = Object.values(hints ?? {});
  return firstHint ? `${title} · ${firstHint}` : SITE_DESC;
}

// 给每页注入 OG/Twitter 社交卡片与 canonical，搜索引擎和聊天分享都能拿到正确的标题
function injectSEO(app: App): void {
  for (const page of app.pages) {
    if (page.path === "/404.html") continue;
    const canonical = `${SITE_URL}${page.path}`;
    const title = page.title || SITE_NAME;
    const description = pageDescription(title, page.frontmatter);
    const head: [string, Record<string, string>][] = [
      ["meta", { property: "og:title", content: title }],
      ["meta", { property: "og:description", content: description }],
      ["meta", { property: "og:url", content: canonical }],
      ["meta", { property: "og:image", content: OG_IMAGE }],
      ["meta", { property: "og:type", content: "website" }],
      ["meta", { property: "og:site_name", content: SITE_NAME }],
      ["meta", { name: "twitter:card", content: "summary" }],
      ["link", { rel: "canonical", href: canonical }],
    ];
    page.frontmatter.head = [...(page.frontmatter.head ?? []), ...head];
  }
}

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "Neko docs",
  description: "免费公益的猫娘 QQ 群机器人：指令文档、在线状态、邀群申请与常见问题。",

  theme,

  clientConfigFile: path.resolve(__dirname, './client.ts'),

  onInitialized: async (app) => {
    await generateRecentUpdates();
    injectSEO(app);
  },

  plugins: [
    removeHtmlExtensionPlugin(),
    // 构建时产出 llms.txt / llms-full.txt 与每页的纯 Markdown 版，
    // 让 AI 直接读到「Neko 是什么、怎么用」，不用去扒 HTML
    llmsPlugin({
      domain: SITE_URL,
      // 默认模板会塞一句英文的 alternateLinks，夹在中文里很突兀，去掉
      llmsTxtTemplate: "# {title}\n\n{description}\n\n## Table of Contents\n\n{toc}",
    }),
  ],
  head: [
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    [
      "link",
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    ],
    [
      "link",
      {
        href: "https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Ma+Shan+Zheng&family=Noto+Sans+SC:wght@100..900&family=ZCOOL+KuaiLe&display=swap",
        rel: "stylesheet",
      },
    ]
  ],


  // 与 PWA 配套：SW 接管资源缓存，关闭 VuePress 预取避免冲突
  shouldPrefetch: false,
});

