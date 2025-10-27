---
title: 撤回插件
icon: /assets/icon/share.svg
category:
  - 指令列表
tag:
  - 撤回
  - 指令
  - 帮助
star: true
copyright: false
footer: Neko docs - 撤回插件
---

```component VPCard
title: nonebot-plugin-withdraw
desc: 让机器人撤回自己发出的消息
logo: /assets/icon/github.svg
link: https://github.com/noneplugin/nonebot-plugin-withdraw
background: rgba(248, 248, 255, 0.3)
```

## **功能**

让机器人撤回**自己发出的消息**

**使用场景：** 如果机器人发出了不和谐的消息，群友可以帮忙及时撤回

## **使用方法**

### 方式 1：@机器人撤回

```
@机器人 撤回      # 撤回倒数第一条消息
@机器人 撤回 1    # 撤回倒数第二条消息
@机器人 撤回 2    # 撤回倒数第三条消息
```

**说明：**
- `num` 指机器人发的倒数第几条消息
- 从 `0` 开始计数
- 默认为 `0`（最新一条）

### 方式 2：回复撤回

回复需要撤回的消息，回复"撤回"

:::tip ⌗ 提示
部分适配器不支持回复方式
:::

