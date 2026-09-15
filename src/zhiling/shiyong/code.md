---
command: "code"
title: 在线运行代码
index: false
icon: /assets/icon/code.svg
category:
  - code
tag:
  - code
copyright: false
footer: 在线运行代码
commands:
  - "code"
commandHints:
  "code": "在线运行代码片段"
commandKeywords:
  - "代码"
  - "运行"
  - "code"
  - "编程"
  - "执行"
commandOrder: 48
---

  ```component VPCard
  title: nonebot_plugin_code
  desc: 在线运行代码<_ 
  logo: /assets/icon/github.svg
  link: https://github.com/yzyyz1387/nonebot_plugin_code
  background: rgba(248, 248, 255, 0.3)
  ```

:::warning 注意
**暂未适配官方机器人**
:::

## 指令💻
```
code [语言] [inputText(空格将被转换为回车)]
[代码]

运行代码示例(python)(无输入)：
    code py
        print("sb")
运行代码示例(python)(有输入)：
    code py 你好
        print(input())
```