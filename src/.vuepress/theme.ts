import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme({
  hostname: "https://docs.nekodayo.top/",

  author: {
    name: "JQ-28",
    url: "https://qm.qq.com/q/fadFl22av6",
  },

  iconAssets: "fontawesome-with-brands",

  favicon: "https://drive.nekodayo.top/raw/nekodocs/image/neko.webp",

  logo: "https://drive.nekodayo.top/raw/nekodocs/image/neko.webp",

  logoDark: "https://drive.nekodayo.top/raw/nekodocs/image/nekosleep.webp",

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
    end: ["Repo", "Outlook", "Search"],
  },
  

  // 侧边栏
  sidebar,

  // 页脚
  footer: "喵",
  displayFooter: true,

  // 加密配置
  encrypt: {
    config: {
      "/demo/encrypt.html": ["1234"],
    },
  },

  // 多语言配置
  metaLocales: {
    editLink: "在 GitHub 上编辑此页",
  },

  

  // 如果想要实时查看任何改变，启用它。注: 这对更新性能有很大负面影响
  // hotReload: true,

  // 在这里配置主题提供的插件
  plugins: {
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

    // 代码复制
    copyCode: {
      showInMobile: true,
    },

    // 通知插件
    notice: [
      {
        path: '/',
        title: '您有一个群聊邀请！',
        content: 'ღ互联网小猫窝ღ邀请您加入游玩',
        showOnce: false,
        actions: [
          {
            text: '接受邀请',
            link: 'http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=sy5x0Bv8IJoMVviC3dRbXTVD9zLdpitx&authKey=OPfY0G2zfQwDQJmf5xV5cqJq7c6%2Beg1cqiCF%2BDHsSFEaGscmeo5ALIdyJ%2BYZmoJb&noverify=0&group_code=806446119',
            type: 'primary',
          },
          { text: 'TD' },
        ],
      }
    ],

    // 搜索
    searchPro: {
      locales: {
        '/': {
          placeholder: '搜索',
        }
      },
    },

    components: {
      components: ["Badge", "VPCard"],
    },

    // 此处开启了很多功能用于演示，你应仅保留用到的功能。
    markdownImage: {
      figure: true,
      lazyload: true,
      size: true,
    },

    // markdownMath: {
    //   // 启用前安装 katex
    //   type: "katex",
    //   // 或者安装 mathjax-full
    //   type: "mathjax",
    // },

    // 此功能被开启用于演示，你应仅当使用时保留。
    markdownTab: true,

    // 此处开启了很多功能用于演示，你应仅保留用到的功能。
    mdEnhance: {
      align: true,
      attrs: true,
      component: true,
      demo: true,
      include: true,
      mark: true,
      plantuml: true,
      spoiler: true,
      stylize: [
        {
          matcher: "Recommended",
          replacer: ({ tag }) => {
            if (tag === "em")
              return {
                tag: "Badge",
                attrs: { type: "tip" },
                content: "Recommended",
              };
          },
        },
      ],
      sub: true,
      sup: true,
      tasklist: true,
      vPre: true,

      // 在启用之前安装 chart.js
      // chart: true,

      // insert component easily

      // 在启用之前安装 echarts
      // echarts: true,

      // 在启用之前安装 flowchart.ts
      // flowchart: true,

      // gfm requires mathjax-full to provide tex support
      // gfm: true,

      // 在启用之前安装 mermaid
      // mermaid: true,

      // playground: {
      //   presets: ["ts", "vue"],
      // },

      // 在启用之前安装 @vue/repl
      // vuePlayground: true,

      // install sandpack-vue3 before enabling it
      // sandpack: true,
    },

    // 如果你需要 PWA。安装 @vuepress/plugin-pwa 并取消下方注释
    // pwa: {
    //   favicon: "/favicon.ico",
    //   cacheHTML: true,
    //   cacheImage: true,
    //   appendBase: true,
    //   apple: {
    //     icon: "/assets/icon/apple-icon-152.png",
    //     statusBarColor: "black",
    //   },
    //   msTile: {
    //     image: "/assets/icon/ms-icon-144.png",
    //     color: "#ffffff",
    //   },
    //   manifest: {
    //     icons: [
    //       {
    //         src: "/assets/icon/chrome-mask-512.png",
    //         sizes: "512x512",
    //         purpose: "maskable",
    //         type: "image/png",
    //       },
    //       {
    //         src: "/assets/icon/chrome-mask-192.png",
    //         sizes: "192x192",
    //         purpose: "maskable",
    //         type: "image/png",
    //       },
    //       {
    //         src: "/assets/icon/chrome-512.png",
    //         sizes: "512x512",
    //         type: "image/png",
    //       },
    //       {
    //         src: "/assets/icon/chrome-192.png",
    //         sizes: "192x192",
    //         type: "image/png",
    //       },
    //     ],
    //     shortcuts: [
    //       {
    //         name: "Demo",
    //         short_name: "Demo",
    //         url: "/demo/",
    //         icons: [
    //           {
    //             src: "/assets/icon/guide-maskable.png",
    //             sizes: "192x192",
    //             purpose: "maskable",
    //             type: "image/png",
    //           },
    //         ],
    //       },
    //     ],
    //   },
    // },

    // 如果你需要幻灯片，安装 @vuepress/plugin-revealjs 并取消下方注释
    // revealjs: {
    //   plugins: ["highlight", "math", "search", "notes", "zoom"],
    // },
  },
});