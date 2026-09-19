import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme({
  hostname: "https://docs.nekodayo.top/",

  author: {
    name: "JQ-28",
    url: "https://qm.qq.com/q/fadFl22av6",
  },

  favicon: "/assets/image/neko.webp",

  logo: "https://assets.nekodayo.top/nekodocs/image/neko.webp",

  logoDark: "https://assets.nekodayo.top/nekodocs/image/nekosleep.webp",

  docsDir: "src",

  // GitHub 仓库配置
  repo: "JQ-28/Neko-docs",
  repoLabel: "GitHub",
  repoDisplay: true,

  // 导航栏
  navbar,
  navbarLayout: {
    start: ["Brand"],
    center: ["Links"],
    end: ["NavbarToolsLink", "Repo", "CustomOutlook", "Search"],
  },
  

  // 侧边栏
  sidebar,

  // 页脚
  footer: "喵",
  displayFooter: true,

  // 多语言配置
  metaLocales: {
    editLink: "在 GitHub 上编辑此页",
  },

  

  // Markdown 能力（主题 rc.100 起从 plugins 挪到了顶层 markdown）
  markdown: {
    // 图片：图注、懒加载；点击放大由主题内置的 photoSwipe 负责
    figure: true,
    imgLazyload: true,
    // 尺寸两种写法都开：站内现用的是 `![alt](url =15x15)`（theme-hope 里叫 legacyImgSize，上游已标废弃），
    // 新写法是 `![alt =15x15](url)`。等正文都迁到新写法，前一条就能去掉
    imgSize: true,
    legacyImgSize: true,

    // 站内互链改路径后容易静默 404，构建时扫一遍；dev 关掉，免得每次热更新都扫
    linksCheck: {
      dev: false,
      build: true,
    },

    align: true,
    attrs: true,
    component: true,
    demo: true,
    include: true,
    mark: true,
    plantuml: true,
    spoiler: true,
    sub: true,
    sup: true,
    tabs: true,
    codeTabs: true,
    tasklist: true,
    vPre: true,

    // 启用前先安装对应依赖
    // chart: true,          // chart.js
    // echarts: true,        // echarts
    // flowchart: true,      // flowchart.ts
    // mermaid: true,        // mermaid
    // math: { type: "katex" },
    // playground: { presets: ["ts", "vue"] },
    // vuePlayground: true,
    // sandpack: true,
  },

  // 如果想要实时查看任何改变，启用它。注: 这对更新性能有很大负面影响
  // hotReload: true,

  // 在这里配置主题提供的插件
  plugins: {
    // 图标（rc.100 起从顶层 iconAssets 挪到这里）
    icon: {
      assets: "fontawesome-with-brands",
    },

    // 注意: 仅用于测试! 你必须自行生成并在生产环境中使用自己的评论服务
    comment: {
        provider: "Waline",
        serverURL: "https://waline.vercel.nekodayo.top/", // your server url
        login: "force",
        emoji: ["//unpkg.com/@waline/emojis@1.2.0/bilibili",
          "//unpkg.com/@waline/emojis@1.2.0/bmoji",
          "//unpkg.com/@waline/emojis@1.2.0/qq",
          "//unpkg.com/@waline/emojis@1.2.0/tieba",
          "//unpkg.com/@waline/emojis@1.2.0/tw-emoji",
          "//unpkg.com/@waline/emojis@1.2.0/soul-emoji"
        ],
      },

    // 代码复制按钮由 client.ts 自行注入，主题自带的 copyCode 保持关闭
    // copyCode: {
    //   showInMobile: true,
    // },

    // 通知公告由 AnnouncementPopup 组件实现（notice 插件仅支持同时展示一条）

    // 搜索（search-pro 已被官方标记废弃，改用 slimsearch）
    slimsearch: {
      locales: {
        '/': {
          placeholder: '搜索',
        }
      },
    },

    components: {
      components: ["Badge", "VPCard"],
    },

    // PWA 支持
    pwa: {
      favicon: "/assets/image/neko.webp",
      cacheHTML: false,
      cacheImage: false,
      appendBase: true,
      update: "disable",
      generateSWConfig: {
        globIgnores: ["index.html", "404.html"],
        navigateFallback: null,
      },
      apple: {
        icon: "/assets/image/neko.webp",
        statusBarColor: "black",
      },
      msTile: {
        image: "/assets/image/neko.webp",
        color: "#ffffff",
      },
      manifest: {
        icons: [
          {
            src: "/assets/image/neko.webp",
            sizes: "512x512",
            type: "image/webp",
          },
          {
            src: "/assets/image/neko.webp",
            sizes: "192x192",
            type: "image/webp",
          },
        ],
      },
    },

    // 如果你需要幻灯片，安装 @vuepress/plugin-revealjs 并取消下方注释
    // revealjs: {
    //   plugins: ["highlight", "math", "search", "notes", "zoom"],
    // },
  },
});