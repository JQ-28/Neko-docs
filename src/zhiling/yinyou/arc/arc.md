---
command: "arc"
title: ✨Arcaea表情包制作✨
icon: https://assets.nekodayo.top/nekodocs/image/luna.jpg
sticky: true
category:
  - arc
tag:
  - arc
  - 表情包
  - 全部超飞
star: true
copyright: false
footer: 什么时候禁止男的发这种表情包.webp
commands:
  - "arc"
  - "arc -h"
  - "arc <角色> <文字>"
commandTitle: "Arcaea表情包制作"
commandHints:
  "arc": "制作 Arcaea 表情包"
  "arc -h": "查看表情包指令帮助"
  "arc <角色> <文字>": "生成指定角色的 Arcaea 表情包"
commandKeywords:
  - "arcaea"
  - "arc"
  - "表情包"
commandOrder: 72
---

  ```component VPCard
  title: nonebot-plugin-arcaea-sticker
  desc: Arcaea 表情包生成插件
  logo: /assets/icon/github.svg
  link: https://github.com/JQ-28/nonebot-plugin-arcaea-sticker/
  background: rgba(248, 248, 255, 0.3)
  ```
我写的一个插件，请给我点个star🌟 谢谢!


## 🎮 **使用方法**

### **基础指令**
- `arc <角色> <文字>` - 生成表情包
- `arc -h` - 显示帮助
- `arc` - 进入交互模式

### **自定义参数（都是可选的）**
| 参数 | 说明 | 范围 | 默认值 | 补充说明 |
|------|------|------|--------|----------|
| `-s, --size` | 文字大小 | 20~45 | 35 | 数字越大文字越大,多行文字建议25-35 |
| `-x` | 横向位置 | 0~296 | 148 | 0=最左边,148=居中,296=最右边 |
| `-y` | 纵向位置 | 0~256 | 128 | 0=最上方,128=居中,256=最下方 |
| `-r, --rotate` | 旋转角度 | -180~180 | -12 | 正数顺时针,负数逆时针,建议-30~30度 |
| `-c, --color` | 文字颜色 | 十六进制 | 角色专属 | 支持`#ff0000`或`ff0000`格式 |
| `-w, --stroke-width` | 描边宽度 | 整数 | 9 | 文字边框的粗细 |
| `-C, --stroke-color` | 描边颜色 | 十六进制 | 自动生成 | 默认比文字颜色深30% |

💡  
**提示: 文字包含空格需要加引号,换行使用`\n`**  
**有以下几个链接参考十六进制颜色**  
[链接一](https://www.codeeeee.com/color/rgb.html)  [链接二](https://www.sioe.cn/yingyong/yanse-rgb-16/)  [链接三](https://blog.csdn.net/TommyXu8023/article/details/89279180)

### **使用示例**
```
arc luna coming!coming!   # 基础用法
```

![](https://assets.nekodayo.top/nekodocs/image/lunacoming.png =231x200)

```
arc hikari "你看我\n有五根手指"   # 多行文字
```
![](https://assets.nekodayo.top/nekodocs/image/hikari.png =231x200)

```
arc 17 喜欢... -x 150 -y 85 -r -10  # 调整位置和角度
```
![](https://assets.nekodayo.top/nekodocs/image/shirahime.png =231x200)

```
arc nami 龙笔! -c ff0000 # 自定义红色文字
```
![](https://assets.nekodayo.top/nekodocs/image/nami.png =231x200)

```
arc eto "Ciallo～(∠・ω<)⌒☆" -s 30 -c #fdae92 -r -28 -x 120 -y 80  # 组合多个参数
```
![](https://assets.nekodayo.top/nekodocs/image/eto.png =231x200)
