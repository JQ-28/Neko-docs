---
title: 视频链接解析
icon: /assets/icon/material-symbols--videocam-outline.svg
category:
  - 指令列表
tag:
  - 视频解析
  - 指令
  - 帮助
star: true
copyright: false
footer: Neko docs - 视频链接解析
---

```component VPCard
title: nonebot-plugin-parser
desc: nonebot2 音视频分享链接解析插件
logo: /assets/icon/github.svg
link: https://github.com/fllesser/nonebot-plugin-parser
background: rgba(248, 248, 255, 0.3)
```

## **功能**

自动识别并解析群聊中的音视频分享链接，支持多个主流平台：

**支持平台：**
- **B站** - BV号/链接/卡片/小程序
- **抖音** - 分享链接
- **微博** - 博文/视频/show
- **小红书** - 含短链/卡片
- **快手** - 标准链接和短链
- **acfun** - 链接
- **YouTube** - 含短链
- **TikTok** - 链接
- **Twitter** - 链接

## **使用**

直接在群聊中发送支持平台的链接即可自动解析！

**示例：**
```
发送 B站视频链接
→ 自动解析并发送视频信息/视频文件
```

## **管理指令**

|   指令   |         权限          | 需要@ | 范围  |   说明   |
| :------: | :-------------------: | :---: | :---: | :------: |
| 开启解析 | BOT拥有者/群主/管理员 |  是   | 群聊  | 开启解析 |
| 关闭解析 | BOT拥有者/群主/管理员 |  是   | 群聊  | 关闭解析 |

