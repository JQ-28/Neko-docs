---
command: "/dc"
title: dancecube
icon: https://ts4.tc.mm.bing.net/th/id/OIP-C.z0P5wn_5cwtt1vpa-MJOwQAAAA?w=108&h=108&c=1&bgcl=56418f&r=0&o=7&pid=ImgRC&rm=3
sticky: true
category:
  - maimaiDX
tag:
  - mai
  - 舞萌
  - 帮助
star: true
copyright: false
footer: 多练​
commands:
  - "/dc login"
  - "/dc myrt"
  - "/dc myrtall"
  - "/dc ap30"
  - "/dc song"
commandHints:
  "/dc login": "登录 dancecube 账号"
  "/dc myrt": "查询我的 RT 值"
  "/dc myrtall": "查询全部模式 RT 值"
  "/dc ap30": "查询 AP 30 首成绩"
  "/dc song": "查询曲目信息"
commandKeywords:
  - "dancecube"
  - "dc"
  - "rt"
  - "ap30"
commandOrder: 70
---

  ```component VPCard
  title: nonebot-plugin-dancecube
  desc: 提供舞立方战力分析等基础功能
  logo: /assets/icon/github.svg
  link: https://github.com/1v7w/nonebot-plugin-dancecube
  background: rgba(248, 248, 255, 0.3)
  ```


## 📖 介绍

目前支持二维码/手机号登录、战力分析、战力分析(包含自制谱)、战绩最好的30首ap歌曲(可选官铺、自制谱)、获取指定歌曲id的个人成绩、自动更新官方曲目封面。

## 🎉 使用
### 指令表
| 指令 | 权限 | 需要@ | 范围 | 说明 |
|:-----:|:----:|:----:|:----:|:----:|
| /dc | 群员 | 否 | 私聊/群聊 | 获取指令帮助 |
| /dc login | 群员 | 否 | 私聊 | 登录舞立方账号，交互式选择登录方式 |
| /dc myrt | 群员 | 否 | 群聊 | 获取战力分析 |
| /dc myrtall | 群员 | 否 | 群聊 | 获取战力分析(含自制谱) |
| /dc ap30 [o/c] | 群员 | 否 | 群聊 | 获取最好的30首AP战绩(默认混合, o官方, c自制) |
| /dc song [id] | 群员 | 否 | 群聊 | 获取歌曲id为[id]的个人成绩 |
| /dc updatecover | 超级用户/管理员 | 否 | 私聊/群聊 | 更新官方曲目封面 |

:::info 🔐 关于账号凭证
`/dc login` 登录时提供的账号凭证会保存在机器人服务端，仅用于代您查询战力数据，不会用于其他用途。

如需解绑或删除凭证，请联系 [JQ-28](/about/me)，详见 [隐私政策](/zhuyi/privacy)。
:::