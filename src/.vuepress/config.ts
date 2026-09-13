import { defineUserConfig } from "vuepress";
import { getDirname, path } from "vuepress/utils";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

import theme from "./theme.js";

import { removeHtmlExtensionPlugin } from 'vuepress-plugin-remove-html-extension'

const __dirname = getDirname(import.meta.url);

const RECENT_COUNT = 8;

interface RecentFileEntry {
  date: string;
  message: string;
}

// 构建期从 git 历史提取最近改动的文档页及其提交说明，写入 public/recent-updates.json 供首页展示
async function generateRecentUpdates(app: any): Promise<void> {
  try {
    // 用 execFileSync 传参数组，避免 Windows shell 把 format 里的 %占位符 当作变量展开
    const output = execFileSync(
      "git",
      [
        "log",
        `--pretty=format:%x01%ad%x1f%s`,
        "--date=short",
        "--name-only",
        "--",
        "src",
      ],
      { cwd: process.cwd(), encoding: "utf-8", maxBuffer: 16 * 1024 * 1024 }
    );
    // 输出格式：每个提交先是一行 \x01日期\x1f提交说明，随后是该提交改动的文件列表
    const latestByFile = new Map<string, RecentFileEntry>();
    let current: RecentFileEntry | null = null;
    for (const rawLine of output.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line.startsWith("\u0001")) {
        const [date, message = ""] = line.slice(1).split("\u001f");
        current = { date, message };
        continue;
      }
      if (!current || !line.startsWith("src/") || !line.endsWith(".md")) continue;
      const base = line.slice(line.lastIndexOf("/") + 1);
      if (base === "README.md" || base === "index.md" || line.startsWith("src/.vuepress/")) continue;
      if (!latestByFile.has(line)) latestByFile.set(line, current);
    }
    const items = [...latestByFile.entries()].slice(0, RECENT_COUNT).flatMap(([file, entry]) => {
      const relative = file.replace(/^src\//, "");
      const page = app.pages.find((p: any) => p.filePathRelative === relative);
      if (!page) return [];
      return [
        {
          title: page.title || relative,
          link: page.path,
          date: entry.date,
          message: entry.message,
        },
      ];
    });
    const publicDir = path.resolve(app.dir.source(), ".vuepress", "public");
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

