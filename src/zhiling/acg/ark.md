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
### 🪧 指令表

|              指令              |   权限   |            参数            |                 说明                  |
| :----------------------------: | :------: | :------------------------: | :-----------------------------------: |
|            `skland`            |   所有   |         无 or `@`          |             角色信息卡片              |
|         `skland bind`          |   所有   |     `token` or `cred`      |            绑定森空岛账号             |
|        `skland bind -u`        |   所有   |     `token` or `cred`      |       更新绑定的 token 或 cred        |
|        `skland qrcode`         |   所有   |             无             |          扫码绑定森空岛账号           |
|     `skland arksign sign`      |   所有   |             无             |         个人角色明日方舟签到          |
| `skland arksign sign -u <uid>` |   所有   |           `uid`            |    指定绑定的个人角色 UID 进行签到    |
|      `skland arksign all`      | 超级用户 |             无             |      签到所有绑定到该 bot 的角色      |
|    `skland arksign status`     |   所有   |             无             |       查询个人角色自动签到状态        |
| `skland arksign status --all`  | 超级用户 |             无             | 查询所有绑定到该 bot 的角色的签到状态 |
|  `skland arksign sign --all`   |   所有   |             无             |           签到所有绑定角色            |
|      `skland char update`      |   所有   |             无             |        更新森空岛绑定角色信息         |
|         `skland sync`          | 超级用户 |             无             |             本地资源更新              |
|         `skland rogue`         |   所有   |       `@` \| `topic`       |             肉鸽战绩查询              |
|        `skland rginfo`         |   所有   |          `战绩id`          |       根据 ID 查询最近战绩详情        |
|       `skland rginfo -f`       |   所有   |          `战绩id`          |   根据 ID 查询森空岛收藏的战绩详情    |
|         `skland gacha`         |   所有   | `-b 起始id` \| `-l 结束id` |         查询明日方舟抽卡记录          |
|        `skland import`         |   所有   |           `url`            |         导入明日方舟抽卡记录          |

> [!NOTE]
> Token 获取相关文档还没写~~才不是懒得写~~
>
> 可以参考[`token获取`](https://docs.qq.com/doc/p/2f705965caafb3ef342d4a979811ff3960bb3c17)获取
>
> 本插件支持 cred 和 token 两种方式手动绑定，使用二维码绑定时会提供 token，请勿将 token 提供给不信任的 Bot 所有者

> [!TIP]
> 支持导入小黑盒记录的抽卡记录，请滑动至小黑盒抽卡分析页底部，点击`数据管理`导出数据并复制链接
>
> 查询抽卡记录支持指定范围，例如 `sk gacha -b -3` 是只渲染倒数 3 个卡池，或者 `sk gacha -b 3 -l 25` 是只渲染第 3 到 25 个卡池
>
> 若单页渲染卡池数量超过配置项 `skland__gacha_render_max` 会输出多张图片（QQ 会以合并消息方式发送）

### 🎯 快捷指令

|    触发词    |           执行指令            |
| :----------: | :---------------------------: |
|  森空岛绑定  |         `skland bind`         |
|   扫码绑定   |        `skland qrcode`        |
| 明日方舟签到 |  `skland arksign sign --all`  |
|   签到详情   |    `skland arksign status`    |
|   全体签到   |     `skland arksign all`      |
| 全体签到详情 | `skland arksign status --all` |
|   角色更新   |     `skland char update`      |
|   资源更新   |         `skland sync`         |
|   界园肉鸽   |  `skland rogue --topic 界园`  |
|  萨卡兹肉鸽  | `skland rogue --topic 萨卡兹` |
|   萨米肉鸽   |  `skland rogue --topic 萨米`  |
|   水月肉鸽   |  `skland rogue --topic 水月`  |
|   傀影肉鸽   |  `skland rogue --topic 傀影`  |
|   战绩详情   |        `skland rginfo`        |
| 收藏战绩详情 |   `skland rginfo --favored`   |
| 方舟抽卡记录 |        `skland gacha`         |
| 导入抽卡记录 |        `skland import`        |

#### 🪄 自定义快捷指令

> 该特性依赖于 [Alconna 快捷指令](https://nonebot.dev/docs/best-practice/alconna/command#command%E7%9A%84%E4%BD%BF%E7%94%A8)。自定义指令不带 `COMMAND_START`，若有必要需手动填写

```bash
# 增加
/skland --shortcut <自定义指令> /skland
# 删除
/skland --shortcut delete <自定义指令>
# 列出
/skland --shortcut list
```

> [!NOTE]
> 自定义指令中包含空格，需要用引号`""`包裹。

例子:

```bash
user: /skland --shortcut /兔兔签到 "/skland arksign sign --all"
bot: skland::skland 的快捷指令: "/兔兔签到" 添加成功
```

### 🫣 暗语表

> [!NOTE]
> 🧭 暗语使用~~指北~~
>
> 暗语消息来自 [nonebot-plugin-argot](https://github.com/KomoriDev/nonebot-plugin-argot) 插件
>
> 对暗语对象`回复对应的暗语指令`即可获取暗语消息

|   暗语指令   |         对象          |    说明    |
| :----------: | :-------------------: | :--------: |
| `background` |  [信息卡片](#效果图)  | 查看背景图 |
|    `clue`    | [游戏信息](#游戏信息) | 查看线索板 |

### 📸 效果图

<details id="效果图">
  <summary>🔮 游戏信息</summary>

![示例图1](https://github.com/FrostN0v0/nonebot-plugin-skland/raw/master/docs/example_1.png)

</details>

<details>
  <summary>🫖 肉鸽战绩</summary>

![示例图2](https://github.com/FrostN0v0/nonebot-plugin-skland/raw/master/docs/example_2.png)

</details>

<details>
  <summary>🏆 战绩详情</summary>

![示例图3](https://github.com/FrostN0v0/nonebot-plugin-skland/raw/master/docs/example_3.png)

</details>

<details id="游戏信息">
  <summary>🕵️‍♀ 线索板</summary>

![线索板](https://github.com/FrostN0v0/nonebot-plugin-skland/raw/master/docs/clue_board.png)

</details>

<details>
  <summary>🦭 抽卡记录</summary>

![抽卡记录](https://github.com/FrostN0v0/nonebot-plugin-skland/raw/master/docs/gacha_record.png)

</details>




---

  ```component VPCard
  title: nonebot-plugin-arkgacha
  desc: ✨ 明日方舟抽卡模拟器 ✨
  logo: /assets/icon/github.svg
  link: https://github.com/RF-Tar-Railt/nonebot-plugin-arkgacha
  background: rgba(248, 248, 255, 0.3)
  ```

## ✨ 明日方舟抽卡模拟器 ✨
### 指令如下:
>方舟抽卡  
>方舟抽卡 200  
>方舟十连  
>方舟卡池更新  