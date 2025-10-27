---
title: 幻影坦克
icon: /assets/icon/image.svg
category:
  - 指令列表
tag:
  - 幻影坦克
  - 图片
  - 合成
star: true
copyright: false
footer: Neko docs - 幻影坦克
---

```component VPCard
title: nonebot_plugin_miragetank
desc: 生成幻影坦克图（在黑白背景下显示不同的图）
logo: /assets/icon/github.svg
link: https://github.com/1umine/nonebot_plugin_miragetank
background: rgba(248, 248, 255, 0.3)
```

## **功能**

- 🎨 **合成幻影坦克图** - 在黑白背景下显示不同的图
- 🔍 **分离幻影坦克图** - 还原出原始图片

## **使用**

### 合成幻影坦克

**指令：** `幻影坦克` / `miragetank` / `合成幻影坦克` / `生成幻影坦克`

**参数：**
- 合成模式：`gray`（黑白）或 `color`（彩色里图）
- 至少两张图片
- 可随时发送 `取消` 中断

**示例：**
```
/合成幻影坦克 color [图片1] [图片2]
/合成幻影坦克 [图片1] [图片2]
/合成幻影坦克 gray
```

### 分离幻影坦克

**指令：** `分离幻影坦克`

**参数：**
- 一张幻影坦克图片
- 可选：亮度增强值（1-6，默认 2）

**示例：**
```
/分离幻影坦克 [图片]
/分离幻影坦克 [图片] 5.5
/分离幻影坦克 4.9
```

:::tip ⌗ 使用技巧
- 支持从回复的消息中获取图片
- gray 模式适合纯黑白对比
- color 模式里图是彩色的
- 分离时亮度值越大，里图越亮
:::

