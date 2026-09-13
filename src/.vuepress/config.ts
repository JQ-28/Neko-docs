import { defineUserConfig } from "vuepress";
import { getDirname, path } from "vuepress/utils";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

import theme from "./theme.js";

import { removeHtmlExtensionPlugin } from 'vuepress-plugin-remove-html-extension'

const __dirname = getDirname(import.meta.url);

const RECENT_COUNT = 8;
const GITHUB_REPO_URL = "https://github.com/JQ-28/Neko-docs";

interface RecentCommit {
  date: string;
  message: string;
  link: string;
}

// 构建期读取 git 提交历史（与 GitHub commits 页一致），写入 public/recent-updates.json 供首页展示
async function generateRecentUpdates(): Promise<void> {
  try {
    // 用 execFileSync 传参数组，避免 Windows shell 把 format 里的 %占位符 当作变量展开
    const output = execFileSync(
      "git",
      ["log", `--pretty=format:%h%x1f%ad%x1f%s`, "--date=short", "-n", String(RECENT_COUNT)],
      { cwd: process.cwd(), encoding: "utf-8", maxBuffer: 16 * 1024 * 1024 }
    );
    // 每行格式：短哈希 \x1f 日期 \x1f 提交说明
    const items: RecentCommit[] = [];
    for (const rawLine of output.split(/\r?\n/)) {
      const [hash, date, message] = rawLine.trim().split("\u001f");
      if (!hash || !/^[0-9a-f]+$/i.test(hash) || !date || !message) continue;
      items.push({ date, message, link: `${GITHUB_REPO_URL}/commit/${hash}` });
    }
    const publicDir = path.resolve(__dirname, "public");
    mkdirSync(publicDir, { recursive: true });
    writeFileSync(path.resolve(publicDir, "recent-updates.json"), JSON.stringify(items), "utf-8");
  } catch {
    // git 不可用（如 CI 浅克隆）时静默跳过，前端会自动隐藏「最近更新」区块
  }
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

