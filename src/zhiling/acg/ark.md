---
title: 明日方舟/终末地
icon: https://drive.nekodayo.top/raw/nekodocs/image/ark.webp
sticky: true
category:
  - 指令列表
tag:
  - 明日方舟
  - 终末地
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



---

## 🎉 使用

> [!NOTE]
> 记得使用[命令前缀](https://nonebot.dev/docs/appendices/config#command-start-%E5%92%8C-command-separator)哦

### 🪧 指令总览

<details open>
<summary><b>🔐 账号管理</b></summary>

| 指令                           | 权限 | 说明                     |
| ------------------------------ | ---- | ------------------------ |
| `skland bind <token\|cred>`    | 所有 | 绑定森空岛账号           |
| `skland bind -u <token\|cred>` | 所有 | 更新绑定的 token 或 cred |
| `skland qrcode`                | 所有 | 扫码绑定森空岛账号       |
| `skland unbind`                | 所有 | 解绑森空岛账号           |
| `skland char update`           | 所有 | 更新森空岛绑定角色信息   |

**快捷指令：** `森空岛绑定` `扫码绑定` `森空岛解绑` `角色更新`

</details>

<details open>
<summary><b>🎮 游戏信息</b></summary>

| 指令            | 权限 | 说明                   |
| --------------- | ---- | ---------------------- |
| `skland`        | 所有 | 查询默认角色信息卡片   |
| `skland @某人`  | 所有 | 查询指定用户的角色信息 |
| `skland <QQ号>` | 所有 | 查询指定QQ号的角色信息 |

</details>

<details open>
<summary><b>✍️ 每日签到</b></summary>

#### 明日方舟签到

| 指令                           | 权限     | 说明                      |
| ------------------------------ | -------- | ------------------------- |
| `skland arksign sign --all`    | 所有     | 签到所有绑定角色          |
| `skland arksign sign -u <uid>` | 所有     | 指定 UID 角色签到         |
| `skland arksign status`        | 所有     | 查询个人角色签到状态      |
| `skland arksign all`           | 超级用户 | 签到所有绑定到 bot 的角色 |
| `skland arksign status --all`  | 超级用户 | 查询所有角色的签到状态    |

**快捷指令：** `明日方舟签到` `签到详情` `全体签到` `全体签到详情`

#### 终末地签到

| 指令                          | 权限     | 说明                      |
| ----------------------------- | -------- | ------------------------- |
| `skland efsign sign --all`    | 所有     | 签到所有绑定角色          |
| `skland efsign sign -u <uid>` | 所有     | 指定 UID 角色签到         |
| `skland efsign status`        | 所有     | 查询个人角色签到状态      |
| `skland efsign all`           | 超级用户 | 签到所有绑定到 bot 的角色 |
| `skland efsign status --all`  | 超级用户 | 查询所有角色的签到状态    |

**快捷指令：** `终末地签到` `终末地签到详情` `终末地全体签到` `终末地全体签到详情`

#### 终末地角色卡片

| 指令                  | 权限 | 说明                         |
| --------------------- | ---- | ---------------------------- |
| `skland efcard`       | 所有 | 查询终末地角色信息卡片       |
| `skland efcard @某人` | 所有 | 查询指定用户的终末地角色信息 |
| `skland efcard -a`    | 所有 | 展示所有角色                 |
| `skland efcard -s`    | 所有 | 使用简化背景                 |

**快捷指令：** `ef`

</details>

> [!TIP]
> 插件会在每天 00:15 自动为所有明日方舟绑定角色签到，00:20 自动为所有终末地绑定角色签到，一般无需手动签到

<details open>
<summary><b>🎲 肉鸽战绩</b></summary>

| 指令                          | 权限 | 说明                       |
| ----------------------------- | ---- | -------------------------- |
| `skland rogue`                | 所有 | 查询默认角色的最新肉鸽战绩 |
| `skland rogue @某人`          | 所有 | 查询指定用户的肉鸽战绩     |
| `skland rogue --topic <主题>` | 所有 | 查询指定主题的肉鸽战绩     |
| `skland rginfo <战绩id>`      | 所有 | 查询最近战绩的详细信息     |
| `skland rginfo <战绩id> -f`   | 所有 | 查询收藏战绩的详细信息     |

**主题选项：** `傀影` `水月` `萨米` `萨卡兹` `界园`

**快捷指令：** `战绩详情` `收藏战绩详情` `傀影肉鸽` `水月肉鸽` `萨米肉鸽` `萨卡兹肉鸽` `界园肉鸽`

</details>

> [!TIP]
> 查询战绩详情时需要回复一条通过肉鸽战绩查询获取的图片消息

<details open>
<summary><b>🎰 抽卡记录</b></summary>

| 指令                               | 权限 | 说明                   |
| ---------------------------------- | ---- | ---------------------- |
| `skland gacha`                     | 所有 | 查询完整抽卡记录       |
| `skland gacha -b <起始id>`         | 所有 | 从指定位置开始查询     |
| `skland gacha -l <结束id>`         | 所有 | 查询到指定位置结束     |
| `skland gacha -b <起始> -l <结束>` | 所有 | 查询指定范围的抽卡记录 |
| `skland import <url>`              | 所有 | 导入小黑盒抽卡记录     |

**快捷指令：** `方舟抽卡记录` `导入抽卡记录`

</details>

> [!TIP]
> 抽卡记录使用提示：
>
> - 支持指定范围查询，如 `skland gacha -b -3` 查询倒数 3 个卡池
> - 或者 `skland gacha -b 3 -l 25` 查询第 3 到 25 个卡池
> - 导入记录时，在小黑盒抽卡分析页底部点击`数据管理`导出并复制链接
> - 单页卡池数超过配置的 `skland__gacha_render_max` 会输出多张图片

<details open>
<summary><b>🎰 终末地抽卡记录</b></summary>

| 指令                                 | 权限 | 说明                               |
| ------------------------------------ | ---- | ---------------------------------- |
| `skland efgacha`                     | 所有 | 查询终末地抽卡记录（从数据库缓存） |
| `skland efgacha -u`                  | 所有 | 从接口拉取最新数据并更新           |
| `skland efgacha -b <起始> -l <结束>` | 所有 | 指定各类别卡池渲染范围             |
| `skland efgacha -u -l 3`             | 所有 | 更新数据并只渲染各类别前3个卡池    |

**快捷指令：** `终末地抽卡记录` `终末地抽卡更新`

</details>

> [!TIP]
> 终末地抽卡记录使用提示：
>
> - 默认从数据库缓存读取渲染，首次使用或需要更新时请加 `-u` 参数
> - `-b`/`-l` 对各类别卡池（限定/武器/常驻/新手）分别计数
> - 单页卡池数超过配置的 `skland__ef_gacha_render_max` 会自动分页发送多张图片

<details open>
<summary><b>🔧 资源管理</b></summary>

| 指令                   | 权限     | 说明                   |
| ---------------------- | -------- | ---------------------- |
| `skland sync`          | 超级用户 | 同时更新图片和数据资源 |
| `skland sync --img`    | 超级用户 | 仅更新图片资源         |
| `skland sync --data`   | 超级用户 | 仅更新数据资源         |
| `skland sync --force`  | 超级用户 | 强制更新，忽略版本检查 |
| `skland sync --update` | 超级用户 | 覆盖已存在的文件       |

**快捷指令：** `资源更新`

</details>

> [!TIP]
> 资源更新选项说明：
>
> - 可以组合使用选项，如 `skland sync --img --force --update`
> - 图片资源包括干员立绘、技能图标等，数据资源包括卡池数据、角色数据等
> - 默认跳过已存在的文件，使用 `--update` 可强制覆盖
> - 本地资源优先，不存在时从网络获取，非必要无需更新

<details>
<summary><b>🎨 暗语功能</b></summary>

暗语功能由 [nonebot-plugin-argot](https://github.com/KomoriDev/nonebot-plugin-argot) 提供支持

**使用方法：** 回复插件渲染的图片消息，发送对应的暗语指令

| 暗语指令     | 对象     | 说明           |
| ------------ | -------- | -------------- |
| `background` | 信息卡片 | 查看卡片背景图 |
| `clue`       | 游戏信息 | 查看角色线索板 |

</details>

### 🎯 快捷指令速查

<details>
<summary>查看所有快捷指令</summary>

| 触发词               | 执行指令                      | 说明               |
| -------------------- | ----------------------------- | ------------------ |
| `森空岛绑定`         | `skland bind`                 | 绑定账号           |
| `扫码绑定`           | `skland qrcode`               | 扫码绑定           |
| `森空岛解绑`         | `skland unbind`               | 解绑账号           |
| `明日方舟签到`       | `skland arksign sign --all`   | 签到所有角色       |
| `签到详情`           | `skland arksign status`       | 个人签到状态       |
| `全体签到`           | `skland arksign all`          | 全部角色签到       |
| `全体签到详情`       | `skland arksign status --all` | 全部签到状态       |
| `ef`                 | `skland efcard`               | 终末地角色卡片     |
| `终末地签到`         | `skland efsign sign --all`    | 终末地签到         |
| `终末地签到详情`     | `skland efsign status`        | 终末地签到状态     |
| `终末地全体签到`     | `skland efsign all`           | 终末地全部签到     |
| `终末地全体签到详情` | `skland efsign status --all`  | 终末地全部签到状态 |
| `角色更新`           | `skland char update`          | 更新角色信息       |
| `全体角色更新`       | `skland char update --all`    | 更新所有用户角色   |
| `资源更新`           | `skland sync`                 | 更新资源文件       |
| `界园肉鸽`           | `skland rogue --topic 界园`   | 界园主题战绩       |
| `萨卡兹肉鸽`         | `skland rogue --topic 萨卡兹` | 萨卡兹主题战绩     |
| `萨米肉鸽`           | `skland rogue --topic 萨米`   | 萨米主题战绩       |
| `水月肉鸽`           | `skland rogue --topic 水月`   | 水月主题战绩       |
| `傀影肉鸽`           | `skland rogue --topic 傀影`   | 傀影主题战绩       |
| `战绩详情`           | `skland rginfo`               | 查询战绩详情       |
| `收藏战绩详情`       | `skland rginfo -f`            | 查询收藏战绩       |
| `方舟抽卡记录`       | `skland gacha -l 3`           | 查询抽卡记录       |
| `导入抽卡记录`       | `skland import`               | 导入抽卡数据       |
| `终末地抽卡记录`     | `skland efgacha`              | 终末地抽卡记录     |
| `终末地抽卡更新`     | `skland efgacha -u`           | 拉取最新抽卡数据   |

</details>

### 🪄 自定义快捷指令

基于 [Alconna 快捷指令](https://nonebot.dev/docs/best-practice/alconna/command#command%E7%9A%84%E4%BD%BF%E7%94%A8) 实现

<details>
<summary>点击查看详细说明</summary>

**语法：**

```bash
# 添加快捷指令
/skland --shortcut <自定义指令> <目标指令>

# 删除快捷指令
/skland --shortcut delete <自定义指令>

# 列出所有快捷指令
/skland --shortcut list
```

**示例：**

```bash
# 添加一个签到快捷指令
用户: /skland --shortcut /兔兔签到 "/skland arksign sign --all"
Bot: skland::skland 的快捷指令: "/兔兔签到" 添加成功

# 添加一个查询战绩的快捷指令
用户: /skland --shortcut 查战绩 "skland rogue"
Bot: skland::skland 的快捷指令: "查战绩" 添加成功
```

</details>

> [!NOTE]
>
> - 自定义指令不自动带命令前缀，需要时请手动添加
> - 指令中包含空格时，需要用引号 `""` 包裹

> [!NOTE]
> Token 获取相关文档还没写~~才不是懒得写~~
>
> 可以参考[`token获取`](https://docs.qq.com/doc/p/2f705965caafb3ef342d4a979811ff3960bb3c17)获取
>
> 本插件支持 cred 和 token 两种方式手动绑定，使用二维码绑定时会提供 token，请勿将 token 提供给不信任的 Bot 所有者


---



---

  ```component VPCard
  title: nonebot-plugin-arkguesser
  desc: 猜干员小游戏
  logo: /assets/icon/github.svg
  link: https://github.com/lizhiqi233-rgb/nonebot-plugin-arkguesser
  background: rgba(248, 248, 255, 0.3)
  ```

## 使用摘要

- `arkstart`：开始游戏（别名：`明日方舟开始`）
- 游戏中直接输入干员名猜测；`结束` 结束本局
- `arkstart 题库 …` / `arkstart 模式 …` / `arkstart 连战 …`：题库、模式、连战相关设置
- 管理员：`arkstart 更新`（更新数据库）、`arkstart 别称 …`（维护别称表）




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