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

# 🎉 使用

> ⚠ 记得使用命令前缀
> 参考：[https://nonebot.dev/docs/appendices/config#command-start-%E5%92%8C-command-separator](https://nonebot.dev/docs/appendices/config#command-start-%E5%92%8C-command-separator)

---

## 🪧 指令总览

---

## 🔐 账号管理

| 指令                             | 权限 | 说明                 |
| ------------------------------ | -- | ------------------ |
| `skland bind <token\|cred>`    | 所有 | 绑定森空岛账号            |
| `skland bind -u <token\|cred>` | 所有 | 更新绑定的 token 或 cred |
| `skland qrcode`                | 所有 | 扫码绑定森空岛账号          |
| `skland char update`           | 所有 | 更新森空岛绑定角色信息        |

**快捷指令：**

```
森空岛绑定
扫码绑定
角色更新
```

---

## 🎮 游戏信息

| 指令             | 权限 | 说明           |
| -------------- | -- | ------------ |
| `skland`       | 所有 | 查询默认角色信息卡片   |
| `skland @某人`   | 所有 | 查询指定用户的角色信息  |
| `skland <QQ号>` | 所有 | 查询指定QQ号的角色信息 |

---

## ✍️ 每日签到

### 明日方舟签到

| 指令                             | 权限   | 说明              |
| ------------------------------ | ---- | --------------- |
| `skland arksign sign --all`    | 所有   | 签到所有绑定角色        |
| `skland arksign sign -u <uid>` | 所有   | 指定 UID 角色签到     |
| `skland arksign status`        | 所有   | 查询个人角色签到状态      |
| `skland arksign all`           | 超级用户 | 签到所有绑定到 bot 的角色 |
| `skland arksign status --all`  | 超级用户 | 查询所有角色的签到状态     |

**快捷指令：**

```
明日方舟签到
签到详情
全体签到
全体签到详情
```

---

### 终末地签到

| 指令                             | 权限   | 说明              |
| ------------------------------ | ---- | --------------- |
| `skland zmdsign sign --all`    | 所有   | 签到所有绑定角色        |
| `skland zmdsign sign -u <uid>` | 所有   | 指定 UID 角色签到     |
| `skland zmdsign status`        | 所有   | 查询个人角色签到状态      |
| `skland zmdsign all`           | 超级用户 | 签到所有绑定到 bot 的角色 |
| `skland zmdsign status --all`  | 超级用户 | 查询所有角色的签到状态     |

**快捷指令：**

```
终末地签到
终末地签到详情
终末地全体签到
终末地全体签到详情
```

---

### 终末地角色卡片

| 指令                   | 权限 | 说明             |
| -------------------- | -- | -------------- |
| `skland zmdcard`     | 所有 | 查询终末地角色信息卡片    |
| `skland zmdcard @某人` | 所有 | 查询指定用户的终末地角色信息 |
| `skland zmdcard -a`  | 所有 | 展示所有角色         |
| `skland zmdcard -s`  | 所有 | 使用简化背景         |

**快捷指令：**

```
zmd
```

---

> 💡 插件会在每天 00:15 自动为所有明日方舟绑定角色签到，00:20 自动为所有终末地绑定角色签到，一般无需手动签到。

---

## 🎲 肉鸽战绩

| 指令                          | 权限 | 说明            |
| --------------------------- | -- | ------------- |
| `skland rogue`              | 所有 | 查询默认角色的最新肉鸽战绩 |
| `skland rogue @某人`          | 所有 | 查询指定用户的肉鸽战绩   |
| `skland rogue --topic <主题>` | 所有 | 查询指定主题的肉鸽战绩   |
| `skland rginfo <战绩id>`      | 所有 | 查询最近战绩的详细信息   |
| `skland rginfo <战绩id> -f`   | 所有 | 查询收藏战绩的详细信息   |

**主题选项：**

```
傀影
水月
萨米
萨卡兹
界园
```

**快捷指令：**

```
战绩详情
收藏战绩详情
傀影肉鸽
水月肉鸽
萨米肉鸽
萨卡兹肉鸽
界园肉鸽
```

> 💡 查询战绩详情时需要回复一条通过肉鸽战绩查询获取的图片消息。

---

## 🎰 抽卡记录

| 指令                             | 权限 | 说明          |
| ------------------------------ | -- | ----------- |
| `skland gacha`                 | 所有 | 查询完整抽卡记录    |
| `skland gacha -b <起始id>`       | 所有 | 从指定位置开始查询   |
| `skland gacha -l <结束id>`       | 所有 | 查询到指定位置结束   |
| `skland gacha -b <起始> -l <结束>` | 所有 | 查询指定范围的抽卡记录 |
| `skland import <url>`          | 所有 | 导入小黑盒抽卡记录   |

**快捷指令：**

```
方舟抽卡记录
导入抽卡记录
```

抽卡记录说明：

* 支持范围查询，如 `skland gacha -b -3`
* 或 `skland gacha -b 3 -l 25`
* 小黑盒导出路径：抽卡分析页 → 数据管理 → 导出
* 单页卡池数超过 `skland__gacha_render_max` 会输出多张图片

---

## 🔧 资源管理

| 指令                     | 权限   | 说明          |
| ---------------------- | ---- | ----------- |
| `skland sync`          | 超级用户 | 同时更新图片和数据资源 |
| `skland sync --img`    | 超级用户 | 仅更新图片资源     |
| `skland sync --data`   | 超级用户 | 仅更新数据资源     |
| `skland sync --force`  | 超级用户 | 强制更新，忽略版本检查 |
| `skland sync --update` | 超级用户 | 覆盖已存在的文件    |

**快捷指令：**

```
资源更新
```

---

## 🎨 暗语功能

暗语功能由 nonebot-plugin-argot 提供支持。

使用方法：

> 回复插件渲染的图片消息，然后发送暗语指令。

| 暗语指令         | 对象   | 说明      |
| ------------ | ---- | ------- |
| `background` | 信息卡片 | 查看卡片背景图 |
| `clue`       | 游戏信息 | 查看角色线索板 |

---

## 🎯 快捷指令速查

| 触发词       | 执行指令                          | 说明        |
| --------- | ----------------------------- | --------- |
| 森空岛绑定     | `skland bind`                 | 绑定账号      |
| 扫码绑定      | `skland qrcode`               | 扫码绑定      |
| 明日方舟签到    | `skland arksign sign --all`   | 签到所有角色    |
| 签到详情      | `skland arksign status`       | 个人签到状态    |
| 全体签到      | `skland arksign all`          | 全部角色签到    |
| 全体签到详情    | `skland arksign status --all` | 全部签到状态    |
| zmd       | `skland zmdcard`              | 终末地角色卡片   |
| 终末地签到     | `skland zmdsign sign --all`   | 终末地签到     |
| 终末地签到详情   | `skland zmdsign status`       | 终末地签到状态   |
| 终末地全体签到   | `skland zmdsign all`          | 终末地全部签到   |
| 终末地全体签到详情 | `skland zmdsign status --all` | 终末地全部签到状态 |
| 角色更新      | `skland char update`          | 更新角色信息    |
| 全体角色更新    | `skland char update --all`    | 更新所有用户角色  |
| 资源更新      | `skland sync`                 | 更新资源文件    |
| 界园肉鸽      | `skland rogue --topic 界园`     | 界园主题战绩    |
| 萨卡兹肉鸽     | `skland rogue --topic 萨卡兹`    | 萨卡兹主题战绩   |
| 萨米肉鸽      | `skland rogue --topic 萨米`     | 萨米主题战绩    |
| 水月肉鸽      | `skland rogue --topic 水月`     | 水月主题战绩    |
| 傀影肉鸽      | `skland rogue --topic 傀影`     | 傀影主题战绩    |
| 战绩详情      | `skland rginfo`               | 查询战绩详情    |
| 收藏战绩详情    | `skland rginfo -f`            | 查询收藏战绩    |
| 方舟抽卡记录    | `skland gacha`                | 查询抽卡记录    |
| 导入抽卡记录    | `skland import`               | 导入抽卡数据    |

---

## 🪄 自定义快捷指令

基于 Alconna 快捷指令实现。

### 语法

```bash
# 添加快捷指令
/skland --shortcut <自定义指令> <目标指令>

# 删除快捷指令
/skland --shortcut delete <自定义指令>

# 列出所有快捷指令
/skland --shortcut list
```

### 示例

```bash
/skland --shortcut /兔兔签到 "/skland arksign sign --all"
/skland --shortcut 查战绩 "skland rogue"
```

---

> ⚠ 自定义指令不自动带命令前缀
> ⚠ 指令中包含空格时需使用引号 `""`

---


---






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