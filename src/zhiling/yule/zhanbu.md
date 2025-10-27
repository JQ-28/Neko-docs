---
title: 趣味占卜
index: false
icon: /assets/icon/wand-sparkles.svg
category:
  - 趣味占卜
tag:
  - 占卜
copyright: false
footer: 使用 ShindanMaker 网站的趣味占卜
---

```component VPCard
title: nonebot-plugin-shindan
desc: 使用 ShindanMaker 网站的无聊趣味占卜
logo: /assets/icon/github.svg
link: https://github.com/noneplugin/nonebot-plugin-shindan
background: rgba(248, 248, 255, 0.3)
```

### 使用方式

默认占卜列表及对应的网站id如下：

- 今天是什么少女 (162207)
- 人设生成 (917962)
- 中二称号 (790697)
- 异世界转生 (587874)
- 魔法人生 (940824)
- 抽老婆 (1075116)
- 抽舰娘 (400813)
- 抽高达 (361845)
- 英灵召唤 (595068)
- 卖萌 (360578)

发送 “占卜指令 名字” 即可，如：`人设生成 小Q`

**以下命令需要加[命令前缀](https://nonebot.dev/docs/appendices/config#command-start-和-command-separator) (默认为`/`)，可自行设置为空**

发送 “占卜列表” 可以查看如下列表；

<div align="left">
  <img src="https://s2.loli.net/2024/03/04/2or48fjK3ECS7Iy.png" width="500" />
</div>


#### **超级用户** 可用的命令：

超级用户设置方式：[Nonebot 超级用户配置](https://nonebot.dev/docs/appendices/config#superusers)

发送 “添加占卜 id 指令” 添加占卜

发送 “删除占卜 id” 删除占卜

发送 “设置占卜指令 id 指令” 设置占卜指令

发送 “设置占卜模式 id text/image” 设置占卜输出形式
