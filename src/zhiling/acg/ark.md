---
title: 明日方舟
icon: https://drive.nekodayo.top/raw/nekodocs/image/ark.webp
sticky: true
category:
  - 指令列表
tag:
  - 明日方舟
  - 指令
  - 帮助
star: true
copyright: false
footer: ✟ALL门✟
---

  ```component VPCard
  title: nonebot-plugin-skland
  desc: 通过森空岛查询游戏数据
  logo: /assets/icon/github.svg
  link: https://github.com/FrostN0v0/nonebot-plugin-skland
  background: rgba(248, 248, 255, 0.3)
  ```

### **以下文档均转自github项目文档**  
**如有侵权请联系删除**


## 🎉 **使用**
### 🪧 **指令表**

| 指令                                | 权限       | 参数                          | 说明                             |
|:-----------------------------------:|:----------:|:-----------------------------:|:--------------------------------:|
| `skland`                            | 所有       | 无 or `@`                     | 角色信息卡片                     |
| `skland bind`                       | 所有       | `token` or `cred`            | 绑定森空岛账号                   |
| `skland bind -u`                   | 所有       | `token` or `cred`            | 更新绑定的 token 或 cred         |
| `skland qrcode`                     | 所有       | 无                            | 扫码绑定森空岛账号               |
| `skland arksign sign`              | 所有       | 无                            | 个人角色明日方舟签到             |
| `skland arksign sign -u <uid>`     | 所有       | `uid`                         | 指定绑定的个人角色 UID 进行签到 |
| `skland arksign --all`             | 超级用户   | 无                            | 签到所有绑定到该 bot 的角色     |
| `skland arksign status`            | 所有       | 无                            | 查询个人角色自动签到状态         |
| `skland arksign status --all`      | 超级用户   | 无                            | 查询所有绑定角色的签到状态       |
| `skland arksign --all`             | 所有       | 无                            | 签到所有绑定角色                 |
| `skland char update`               | 所有       | 无                            | 更新森空岛绑定角色信息           |
| `skland sync`                       | 超级用户   | 无                            | 本地资源更新                     |
| `skland rogue`                     | 所有       | `@` \| `topic`               | 肉鸽战绩查询                     |
| `skland rginfo`                    | 所有       | `战绩id`                      | 根据 ID 查询最近战绩详情         |
| `skland rginfo -f`                 | 所有       | `战绩id`                      | 查询收藏的战绩详情               |


> **💡 Note**  
> Token 获取相关文档还没写~~才不是懒得写~~  
> 可以参考 [`token获取`](https://docs.qq.com/doc/p/2f705965caafb3ef342d4a979811ff3960bb3c17) 获取  
> 本插件支持 cred 和 token 两种方式手动绑定，使用二维码绑定时会提供 token，请勿将 token 提供给不信任的 Bot 所有者

### 🎯 **快捷指令**

| 触发词         | 执行指令                                |
|:--------------:|:---------------------------------------:|
| 森空岛绑定     | `skland bind`                           |
| 扫码绑定       | `skland qrcode`                         |
| 明日方舟签到   | `skland arksign sign --all`/ `方舟签到`             |
| 签到详情       | `skland arksign status`                 |
| 全体签到       | `skland arksign --all`                  |
| 全体签到详情   | `skland arksign status --all`           |
| 角色更新       | `skland char update`                    |
| 资源更新       | `skland sync`                           |
| 萨卡兹肉鸽     | `skland rogue --topic 萨卡兹`           |
| 萨米肉鸽       | `skland rogue --topic 萨米`             |
| 水月肉鸽       | `skland rogue --topic 水月`             |
| 傀影肉鸽       | `skland rogue --topic 傀影`             |
| 战绩详情       | `skland rginfo`                         |
| 收藏战绩详情   | `skland rginfo --favored`               |

### **🫣 暗语表**

> **💡 Note**  
> 🧭 暗语使用~~指北~~  
> 暗语消息来自 [nonebot-plugin-argot](https://github.com/KomoriDev/nonebot-plugin-argot) 插件  
> 对暗语对象 `回复对应的暗语指令` 即可获取暗语消息



---

### 📸 效果图

#### 🔮 游戏信息

[![示例图1](https://github.com/FrostN0v0/nonebot-plugin-skland/raw/master/docs/example_1.png)](https://github.com/FrostN0v0/nonebot-plugin-skland/blob/master/docs/example_1.png)

---

### 🔐 暗语指令列表

|     暗语指令     |        对象       |   说明  |
| :----------: | :-------------: | :---: |
| `background` | [`信息卡片`](#-效果图) | 查看背景图 |

### 🫖 肉鸽战绩

[![示例图2](https://github.com/FrostN0v0/nonebot-plugin-skland/raw/master/docs/example_2.png)](https://github.com/FrostN0v0/nonebot-plugin-skland/blob/master/docs/example_2.png)



### 🏆 战绩详情

[![示例图3](https://github.com/FrostN0v0/nonebot-plugin-skland/raw/master/docs/example_3.png)](https://github.com/FrostN0v0/nonebot-plugin-skland/blob/master/docs/example_3.png)



---




--- 

## ✨ 明日方舟抽卡模拟器 ✨
### 指令如下:
>方舟抽卡  
>方舟抽卡 200  
>方舟十连  
>方舟卡池更新  