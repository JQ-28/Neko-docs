import { defineUserConfig } from "vuepress";
import { getDirname, path } from "vuepress/utils";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

import theme from "./theme.js";

import { removeHtmlExtensionPlugin } from 'vuepress-plugin-remove-html-extension'

const __dirname = getDirname(import.meta.url);

const RECENT_COUNT = 8;
const REPO_SLUG = "JQ-28/Neko-docs";
const TIME_ZONE = "Asia/Shanghai";

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

// 浅克隆时向 GitHub 补齐完整提交列表
async function readFromGitHub(): Promise<RecentCommit[]> {
  const response = await fetch(
    `https://api.github.com/repos/${REPO_SLUG}/commits?per_page=${RECENT_COUNT}`,
    { headers: { accept: "application/vnd.github+json", "user-agent": "neko-docs-build" } }
  );
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  const commits = (await response.json()) as {
    commit: { message: string; author: { date: string } };
  }[];
  return commits.map((item) => ({
    time: formatTime(item.commit.author.date),
    message: item.commit.message.split("\n")[0],
  }));
}

// 构建期读取 git 提交历史（与 GitHub commits 页一致），写入 public/recent-updates.json 供首页展示
async function generateRecentUpdates(): Promise<void> {
  let items = readFromGit();
  if (items.length < RECENT_COUNT) {
    try {
      items = await readFromGitHub();
    } catch {
      // 无网络时保留 git 结果；两者都拿不到则前端自动隐藏「最近更新」区块
    }
  }
  if (!items.length) return;
  const publicDir = path.resolve(__dirname, "public");
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(path.resolve(publicDir, "recent-updates.json"), JSON.stringify(items), "utf-8");
}

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "Neko docs",
  description: "一个可爱的超多功能QQ群机器人",

  theme,

  clientConfigFile: path.resolve(__dirname, './client.ts'),

  onInitialized: generateRecentUpdates,

  plugins: [
    removeHtmlExtensionPlugin()
    //  ...other plugins
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

