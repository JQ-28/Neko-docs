---
title: 娶群友
index: false
icon: http://q2.qlogo.cn/headimg_dl?dst_uin=3582537505&spec=640
category:
  - 娶群友
tag:
  - 群友
  - CP
copyright: false
footer: 娶群友，做CP~~
---

```component VPCard
title: nonebot-plugin-groupmate-waifu
desc: 娶群友插件，支持锁定、NTR、CP等机制
logo: /assets/icon/github.svg
link: https://github.com/KarisAya/nonebot_plugin_groupmate_waifu
background: rgba(248, 248, 255, 0.3)
```

```component VPCard
title: clovers-groupmate-waifu
desc: 娶群友插件核心库
logo: /assets/icon/github.svg
link: https://github.com/clovers-project/clovers-groupmate-waifu
background: rgba(248, 248, 255, 0.3)
```

:::warning 注意
**暂未适配官方机器人**
:::

# 功能介绍

**锁定机制**

如果是通过@成功娶到的群友会和自己进入锁定。

一般情况下对方娶群友会娶到自己。但是对方@其他人娶群友的话，会无视你的锁定进入对方的成功判断。

如果对方也@自己的话，那么两个人会进入互相锁定，无法被 NTR,分手会有进一步确认等其他机制。

`娶群友`,`娶群友@name`

纯爱 **双向奔赴版**，两个人会互相抽到对方。

如果 at 的话，有机会娶到 at 的人。。。

`分手` `离婚`

把两个人重置为单身

`本群cp`

查看当前群内的 cp

`查看娶群友卡池`

查看当前群可以娶到的群友列表

`透群友`

ntr ~~宫吧老哥狂喜版~~，每次抽到的结果都不一样。

`涩涩记录`

查看当前群的群友今日透群友次数和被透的次数，记录是跨群的。~~也就是说群友在别的群挨透也会在记录里显示出来~~

~~群友背地里玩的挺花（bushi）~~

**管理员指令**：

`重置娶群友记录`

重置娶群友记录

`设置娶群友保护`,`设置娶群友保护@someone@someother`

将自己或 at 的人（可以 at 多人）加入保护名单。名单内的群友无法触发娶群友或透群友，也无法作为娶群友或透群友的目标。

`解除娶群友保护`,`解除娶群友保护@someone@someother`

将自己或 at 的人（可以 at 多人）从保护名单删除

`查看娶群友保护名单`

查看娶群友保护的保护名单