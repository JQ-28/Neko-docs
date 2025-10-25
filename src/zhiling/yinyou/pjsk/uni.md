---
title: Unibot
icon: https://drive.nekodayo.top/raw/nekodocs/image/mzk.png
sticky: true
category:
  - pjsk
tag:
  - pjsk
  - unibot
  - 帮助
star: true
copyright: false
footer: 一緒に歌おう！
---

:::caution
### Unibot已于2024年11月1日22点正式停止所有公开服务。Unibot所提供的全部服务及其分布式客户端已无法继续使用。
:::



### **以下文档均转自[Unibot使用文档](https://docs.unipjsk.com/)**
如有侵权请联系删除

:::warning WARNING
Unibot内猜曲，猜卡面等功能需要联系bot主单独开放
:::

# 功能列表

> 本文档将引导您使用 UniBot

- UniBot 是一款功能型机器人，主要提供《世界计划 多彩舞台》相关查询服务。
- 该 Bot 不提供私聊服务
- 使用该 Bot，即意味着你同意 [使用条款](https://docs.unipjsk.com/licence/) 及 [隐私条款](https://docs.unipjsk.com/privacy/)

::: warning
注意: Unibot 将在 11 月停止所有服务。Bot 仅保留类似 wiki 的游戏公开信息查询功能，包括查谱、查歌、查卡、查活动，其他功能停用。
:::

## 查询 pjsk 歌曲信息

### pjskinfo

- `pjskinfo+曲名` 查看当前歌曲详细信息
- `pjskbpm+曲名` 查看当前歌曲的 bpm（频道可直接使用 `bpm+曲名`）
- `查 bpm+数字` 查询对应 bpm 所有歌曲

### 谱面预览

- `谱面预览 曲名 难度` 查询对应曲名、难度的谱面预览（来源：[ぷろせかもえ！](https://pjsekai.moe/)）

  - **难度**支持的输入: `easy`, `normal`, `hard`, `expert`, `master`, `append`, `ez`, `nm`, `hd`, `ex`, `ma`, `ap`, `apd`
  - 如果查询 `master` 可省略难度

### 昵称设置

- `pjskset昵称to歌名`
- `pjskdel昵称` 删除对应昵称
- `pjskalias昵称` 查看所有昵称
- `charaset昵称to角色名(可以是现有昵称)` 设置角色所有群通用昵称, 如 `charasetkndto宵崎奏`
- `charadel昵称` 删除角色所有群通用昵称
- `grcharaset新昵称to已有昵称` 设置仅当前群可用角色昵称
- `grcharadel已有昵称` 删除仅当前群可用角色昵称
- `charainfo昵称` 查看该角色群内和全群昵称

::: warning
注意: 所有歌曲昵称设置、角色昵称设置的日志内容将会在[实时日志](https://docs.unipjsk.com/dailylog/)页面按日公示。
:::

### 查询卡牌及活动信息

> 查卡面/查活动功能为 [Yozora](https://github.com/cYanosora) 所写，非常感谢

- `查卡/查卡面/查询卡面/findcard [角色昵称]`: 获取当前角色所有卡牌
- `查卡/查卡面/查询卡面/cardinfo [卡面id]`: 获取卡牌 id 详细卡面信息
- `查活动/查询活动/event [活动id]`: 查看指定活动信息（可直接使用 `event` 查看当前活动信息）
- `查活动/查询活动/findevent [关键字]`: 通过关键字筛选活动，返回活动概要图，没有关键字则会返回提示图
  - 单关键字方式：
    - 查活动 5v5：返回活动类型为 5v5 的活动概要
    - 查活动 紫月：返回活动属性为紫月的活动概要
    - 查活动 knd：返回当期出卡（包括报酬）含 knd 的活动概要
    - 查活动 miku：返回当期出卡含任意组合的 miku 的活动概要
    - 查活动 25miku：返回当期出卡含白葱的活动概要
    - 查活动 25h：返回当期出卡含任意 25 成员（不含 vs）的活动概要
  - 多关键字方式：
    - 查活动 草 5v5：返回活动类型为 5v5，活动属性为绿草的活动概要
    - 查活动 knd 蓝：返回活动属性为蓝星，出卡含 knd 的活动概要
    - 查活动 普活 紫月 knd：返回活动类型为马拉松，活动属性为紫月，出卡含 knd 的活动概要
  - 使用例：
    - 查活动 25h：仅返回 25 箱活的活动概要
    - 查活动 25h 25miku：返回 25 箱活且 vs 出卡为白葱的活动概要
    - 查活动 knd ick：返回出卡同时包括 knd、ick 混活的活动概要
- `活动图鉴/活动列表/活动总览/findevent all`: 返回当前所有活动的概要（该功能由于图片过大无法在频道 bot 使用）

## pjsk 竞猜

::: warning
注意: 由于风控问题，猜曲、猜卡面、看卡图、模拟抽卡功能已开启白名单模式。如你所在的群未开启以上功能，请使用官方平台的频道 bot 游玩。
:::

::: warning
关于频道版猜曲: 请在规定时间内回答，由于主动消息限制，bot 不会自动结束猜曲，如果回答超时会自动结束并提示超时。
:::

- pjsk 猜曲（截彩色曲绘）：`pjsk猜曲`
- pjsk 阴间猜曲（截黑白曲绘）：`pjsk阴间猜曲` 或 `/pjsk猜曲 2`
- pjsk 非人类猜曲（截 30*30）：`pjsk非人类猜曲`
- pjsk 猜谱面：`pjsk猜谱面` 或 `/pjsk猜曲 3`
- pjsk 猜卡面：`pjsk猜卡面` 或 `/pjsk猜曲 4`
- pjsk 歌词猜曲：`pjsk歌词猜曲` 或 `/pjsk猜曲 5`
- pjsk 听歌猜曲（频道不可用）：`pjsk听歌猜曲`
- pjsk 倒放猜曲（频道不可用）：`pjsk倒放猜曲`

查看排行榜：猜曲命令 + `排行榜`。如 `pjsk猜曲排行榜`、`pjsk猜谱面排行榜`

## pjsk 模拟抽卡

> 十连抽卡模拟会生成图片

- `sekai抽卡` 模拟十连
- `sekaiXX连` 模拟 `XX` 抽（只显示四星）, `XX` 接受的输入为 `1-200`（频道内 `1-400`）
- `sekai反抽卡` 反转 2 星 4 星概率
- `sekai抽卡+卡池id` 对应卡池模拟十连
- `sekai100连+卡池id` 对应卡池模拟 100 抽（只显示四星）
- `sekai200连+卡池id` 对应卡池模拟 200 抽（只显示四星）
- `sekai反抽卡+卡池id` 对应卡池反转 2 星 4 星概率

::: tip
关于卡池 id: 卡池 id 可去 [https://sekai.best/gacha](https://sekai.best/gacha) 进入对应卡池页面查看网址最后的数字，如网址是 [https://sekai.best/gacha/159](https://sekai.best/gacha/159)，卡池 id 就是 159。
:::

## 随机卡图

- `看[角色昵称]` 或 `来点[角色昵称]`

## 其他游戏

### WDS

- `wdsinfo 曲名` 查看歌曲信息
- `wdschart 曲名` 查看谱面预览
- `wdsset昵称to歌名`
- `wdsdel 昵称` 删除对应昵称
- `wdsalias 昵称` 查看所有昵称

## 关于

- 开发者: [綿菓子ウニ](https://space.bilibili.com/622551112)
- 联系我: 1103479519[at]qq.com（[at]更改为@）
- 交流群: 883721511
- Unibot频道: [点击进入](https://qun.qq.com/qqweb/qunpro/share?_wv=3&_wwv=128&appChannel=share&inviteCode=7Pe26&appChannel=share&businessType=9&from=181074&biz=ka&shareSource=5#/pc)

## 使用框架
- QQbot框架: [Mrs4s/go-cqhttp](https://github.com/Mrs4s/go-cqhttp)
- SDK: [nonebot/aiocqhttp](https://github.com/nonebot/aiocqhttp)
- QQ官方版bot框架：[Hoshinonyaruko/Gensokyo](https://github.com/Hoshinonyaruko/Gensokyo)

## 数据来源
- 预测线: [33Kit](https://3-3.dev/)
- 谱面预览: [ぷろせかもえ！](https://pjsekai.moe/), [プロセカ譜面保管所](https://github.com/Hoshinonyaruko/Gensokyo)
- 台服国际服牌子图片：[Sekai Viewer](https://sekai.best/)