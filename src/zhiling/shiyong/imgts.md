---
command: "图片翻译"
title: 图片/漫画翻译插件
index: false
icon: /assets/icon/image.svg
category:
  - img
tag:
  - img
  - 图片
  - 翻译
copyright: false
footer: 图片/漫画翻译插件
commands:
  - "图片翻译"
  - "多图片翻译"
  - "切换翻译api"
commandKeywords:
  - "翻译"
  - "图片翻译"
  - "漫画翻译"
commandOrder: 51
---
  ```component VPCard
  title: nonebot-plugin-manga-translator
  desc: 图片/漫画翻译插件
  logo: /assets/icon/github.svg
  link: https://github.com/maoxig/nonebot-plugin-manga-translator
  background: rgba(248, 248, 255, 0.3)
  ```
### **以下文档均转自github项目文档**  
**如有侵权请联系删除**

## **🎉命令**
1. 图片翻译 [图片]：单张图片翻译，也可以先发送/图片翻译再发送图片,可以如下组合

  - 文字+图片
  - 先文字，后图片
  - 文字回复图片
1. 多图片翻译 [图片]：n张图片翻译，将会以合并转发消息（如果平台支持，否则则一张一张发出）的形式发出,可以如下组合

  - 先文字，后多张图片
  - 文字+图片*n
1. 切换翻译api [api]: 将该api优先级提到最高，目前有youdao baidu huoshan offline

