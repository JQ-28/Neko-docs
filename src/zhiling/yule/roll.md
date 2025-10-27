---
title: Roll 随机选择
icon: /assets/icon/superpowers.svg
category:
  - 互动娱乐
tag:
  - roll
  - 随机
  - 选择
star: true
copyright: false
footer: Neko docs - Roll
---

```component VPCard
title: nonebot-plugin-sayoroll
desc: 不知道怎么选择? 让bot帮你决定吧！
logo: /assets/icon/github.svg
link: https://github.com/mas-alone/nonebot-plugin-sayoroll
background: rgba(248, 248, 255, 0.3)
```

## **使用**

### 基础 Roll

**`roll`** - 在 1-100 之间随机一个数字

**`roll 数字`** - 在 1 到指定数字之间随机

```
示例: roll 50
→ 返回 1-50 之间的随机数
```

### 是非判断

**`roll x不x / x没x`**

```
示例: roll 我是不是耳聋
→ 返回: "我觉得你不是耳聋" 或 "我觉得你是耳聋"
```

### 二选一

**`roll xxx还是xxx`**

```
示例: roll 今晚刷pp还是摆烂
→ 返回: "当然是今晚刷pp咯" 或 "当然是摆烂咯"
```

**限制：** 只允许两个选项

### 多选一

**`roll 选项1 选项2 选项3 ...`**

```
示例: roll 吃饭 睡觉 打游戏 运动 点蚊香
→ 从所有选项中随机选择一个
```

**特点：** 支持无限多个选项

### 概率查询

**`roll xxx概率`**

```
示例: roll 我今晚刷到pp的概率
→ 返回: "你今晚刷到pp的概率为: 0.01-100%"
```

**注意：** 参数结尾必须是"概率"二字

:::tip ⌗ 提示
所有 roll 指令都需要加命令前缀（默认为 `/`）

如：`/roll`、`/roll 100`、`/roll 吃饭 睡觉`
:::

