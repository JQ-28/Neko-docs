---
title: 机器人在线状态
icon: /assets/icon/terminal.svg
pageview: true
copyright: false
footer: Neko docs - 机器人状态
---

neko 的各个账号和后台服务是不是还活着，这里一眼就能看到。账号状态由 nonebot 程序上报，服务状态由独立的看门狗上报，谁也不依赖谁，超过 2 分钟没收到某一方的上报，那一块就会显示「状态未知」。

<BotStatus />

:::tip 想看电脑实时面板
在群里发送 `#状态` 或 `/status`，neko 会直接回一张硬件状态图。详见 [系统状态查询](/zhiling/shiyong/status)。
:::
