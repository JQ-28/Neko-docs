---
title: 断连通知
icon: /assets/icon/terminal.svg
category:
  - 指令列表
tag:
  - 断连通知
  - 指令
  - 帮助
star: true
copyright: false
footer: Neko docs - 断连通知
---

```component VPCard
title: nonebot-plugin-disconnect-notice
desc: 可以在bot断连时通过邮件、公众号消息等方式通知主人
logo: /assets/icon/github.svg
link: https://github.com/Cypas/nonebot_plugin_disconnect_notice
background: rgba(248, 248, 255, 0.3)
```

:::info 说明
此功能供 JQ 自己使用，用于在 Bot 断连时及时收到通知。

当 Neko 意外掉线或断开连接时，会通过多种方式（邮件、微信公众号等）通知管理员。
:::

## **使用**

**测试指令：**
```
/掉线测试
```

发送此指令可以主动触发掉线通知测试，用来验证通知配置是否正常。

**自动通知：**
- Bot 断开连接后自动触发
- 支持宽限时间（默认 10 秒）
- 宽限期内重连成功则不发送通知

**支持的通知方式：**
- **邮件通知** - 发送到指定邮箱
- **Server酱** - 微信公众号推送
- **PushPlus** - 微信公众号推送
- **Pushover** - 多平台客户端推送

:::tip 💡 提示
可以同时配置多种通知方式，确保消息不会错过！
:::

