---
command: "/osu info"
title: osu!
icon: https://drive.nekodayo.top/raw/nekodocs/image/osu.png
sticky: true
category:
  - osu
tag:
  - osu!
  - 帮助
star: true
copyright: false
footer: 你的双手是为了osu服务的而不是你的一生
commands:
  - "/osu info"
  - "/osu bind"
  - "/osu bp"
  - "/osu bl"
  - "/osu re"
  - "/osu sc"
commandHints:
  "/osu info": "查询 osu! 玩家信息"
  "/osu bind": "绑定 osu! 账号"
  "/osu bp": "查询最佳成绩（BP）"
  "/osu bl": "查询最佳成绩列表"
  "/osu re": "查询最近成绩"
  "/osu sc": "查询指定谱面成绩"
commandKeywords:
  - "osu"
  - "查分"
  - "音游"
  - "bp"
commandOrder: 68
---

  ```component VPCard
  title: nonebot-plugin-osubot
  desc: osu查分功能
  logo: /assets/icon/github.svg
  link: https://github.com/yaowan233/nonebot-plugin-osubot
  background: rgba(248, 248, 255, 0.3)
  ```

## **:tada: 使用**
**为防止群内聊天误触，本插件所有命令开头为/osu ,例： /osu info**  
![](https://drive.nekodayo.top/raw/nekodocs/image/osuhelp.png)

:::info 🔐 关于账号绑定
`/osu bind` 绑定账号后，绑定信息会保存在机器人服务端，仅用于代您查询 osu! 成绩，不会用于其他用途。

如需解绑或更换，请联系 [JQ-28](/about/me)，详见 [隐私政策](/zhuyi/privacy)。
:::