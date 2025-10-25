import { defineUserConfig } from "vuepress";
import { getDirname, path } from "vuepress/utils";

import theme from "./theme.js";

import { oml2dPlugin } from 'vuepress-plugin-oh-my-live2d';
import { copyCodePlugin } from '@vuepress/plugin-copy-code'
import { noticePlugin } from '@vuepress/plugin-notice'
import { backToTopPlugin } from '@vuepress/plugin-back-to-top'
import { searchProPlugin } from "vuepress-plugin-search-pro";
import { removeHtmlExtensionPlugin } from 'vuepress-plugin-remove-html-extension'

const __dirname = getDirname(import.meta.url);

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "Neko docs",
  description: "一个可爱的超多功能QQ群机器人",

  theme,

  clientConfigFile: path.resolve(__dirname, './client.ts'),

  plugins: [
    copyCodePlugin({
      showInMobile: true // options
    }),
    noticePlugin({
      config: [
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
    }),
    backToTopPlugin(),
    searchProPlugin({
      locales: {
        '/': {
          placeholder: '搜索',
        }
      },
    }),
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


  
  // 和 PWA 一起启用
  // shouldPrefetch: false,
});

