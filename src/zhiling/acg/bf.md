---
title: 战地
icon: https://drive.nekodayo.top/raw/nekodocs/image/bf.webp
sticky: true
category:
  - 指令列表
tag:
  - 战地一
  - 战地五
  - 战地2042
star: true
copyright: false
footer: 他们敢推进，我们就推回去！
---

  ```component VPCard
  title: nonebot-plugin-bfchat
  desc: 基于nonebot2平台的战地1/5/2042聊天机器人
  logo: /assets/icon/github.svg
  link: https://github.com/050644zf/nonebot-plugin-bfchat
  background: rgba(248, 248, 255, 0.3)
  ```


## **命令列表**

将 `[game]` 替换为 `bf1` , `bfv` , `bf2042` 查询对应游戏。

| 命令                                         | 作用                                                                                                                                      | 备注                                                             |
|----------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------|
| `bf help`                                     | 返回本列表                                                                                                                                |                                                                  |
| `bf init`                                     | 初始化本群绑定功能，未初始化的群，群员不能使用绑定功能                                                                                   | 仅SUPERUSER和群管理员有效                                       |
| `[game] [玩家id]`                             | 查询 `[玩家id]` 的战绩信息<br>例如查询 `senpai` 的 `bf1` 信息：`bf1 senpai`                                                              | 如果查询玩家是 me，则会将数据保存至本地<br>且一小时内不会再请求 |
| `[game] [玩家id] weapons`                     | 查询 `[玩家id]` 的武器信息                                                                                                                |                                                                  |
| `[game] [玩家id] vehicles`                    | 查询 `[玩家id]` 的载具信息                                                                                                                |                                                                  |
| `bf2042 [玩家id] classes`                     | 查询 `[玩家id]` 的 bf2042 专家信息                                                                                                        |                                                                  |
| `[game] bind [玩家id]`                        | 将对应游戏的 `[玩家id]` 与命令发送人绑定，绑定后可使用 `me` 代替 `[玩家id]`<br>例如 `bfv me`                                            | 游戏间绑定不互通                                                |
| `[game] list`                                 | 列出该服务器所有已绑定的 bf1/bfv 玩家信息                                                                                                 | 使用本地数据，不会自动更新                                      |
| `[game] server [服务器名]`                    | 查询名字包含 `[服务器名]` 的 bf1/bfv 服务器                                                                                               |                                                                  |
