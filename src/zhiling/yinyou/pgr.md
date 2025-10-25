---
title: Phigros
icon: https://drive.nekodayo.top/raw/nekodocs/image/pgr.webp
sticky: true
category:
  - Phi
tag:
  - phi
  - pgr
  - 帮助
star: true
copyright: false
footer: 多练​.webp
---

  ```component VPCard
  title: https://github.com/catrong/phi-plugin
  desc: 适用于Yunzai的Phigros辅助插件
  logo: /assets/icon/github.svg
  link: https://github.com/catrong/phi-plugin
  background: rgba(248, 248, 255, 0.3)
  ```

### **以下文档均转自github项目文档**  
**如有侵权请联系删除**

## **功能**
### 以下#均可用/代替，命令头可自定义
## **以下为用户功能**
|        功能名称         |                功能说明                |
| :---------------------: | :-----------------------------------: |
|      `#phi帮助`        |              获取帮助                 |
|   `#phi (bind/绑定)xxx` |           绑定sessionToken            |
|   `#phi (unbind/解绑)`  |   删除sessionToken和存档记录          |
|      `#phi clean`      |            删除所有记录               |
|  `#phi (update/更新存档)`|            更新存档                 |
|    `#phi (rks/pgr/b19)` |      查询rks，会提供得出的b21结果    |
|     `杠批比三零`       |                同上                   |
|     `#phi info(1/2)?`  |          查询个人统计信息            |
| `#phi (lvsco(re)/scolv) <定数范围> <难度>` | 获取区间成绩              |
|   `#phi chap <章节名称/help>` |          获取章节成绩              |
| `#phi list <定数范围> <EZ/HD/IN/AT> <NEW/C/B/A/S/V/FC/PHI>` | 获取区间每首曲目的成绩 |
|      `#phi best1(+）`  |      查询文字版b19（或更多），最高b99 |
|   `#phi (score/单曲成绩)xxx` |     获取单曲成绩及这首歌的推分建议 |
|     `#phi (suggest/推分)` |  获取可以让RKS+0.01的曲目及其所需ACC |
|     `#phi (ranklist/排行榜)` |           获取 RKS 排行榜          |
|      `#phi data`       |          获取用户data数量            |
|     `#phi (guess/猜曲绘)` |   猜曲绘，回答无特殊命令，直接回复     |
|     `#phi (ltr/开字母)` | 根据字母猜曲名，#出/#open... 开指定的字母 |
|   `#phi (tipgame/提示猜曲)` | 根据提示猜曲名，#tip获得下一条提示  |
|     `#phi (song/曲) xxx` | 查询phigros中某一曲目的图鉴，支持设定别名 |
|      `#phi tips`       |            随机tips                 |
|      `#phi jrrp`       |           今日人品                   |
|     `#phi nick xxx`    |          查询某一曲目的别名         |
|   `#phi (rand/随机) <条件>` | 根据条件随机曲目，支持难度、定数   |
|  `#phi (曲绘/ill/Ill) xxx` | 查询phigros中某一曲目的曲绘        |
| `#phi (search/查询/检索) <条件 值>` | 检索曲库中的曲目，支持BPM 定数 物量 |
|   `#phi (theme/主题) [0-2]` | 切换绘图主题，仅对 b19 update 生效 |
|       `sign/签到`      |          签到获取Notes              |
|      `task/我的任务`   |          查看自己的任务              |
|     `retask/刷新任务`  |      刷新任务，需要花费20Notes      |
| `#phi (send/送/转) <目标> <数量>` | 送给目标Note，支持@或QQ号      |

## **以下为管理功能**
|             功能名称              |                                           功能说明                                           |
| :-------------------------------: | :------------------------------------------------------------------------------------------: |
|      `#phi backup (back)?`       | 备份存档文件，+ back 发送该备份文件，自动保存在 /phi-plugin/backup/ 目录下                |
|         `#phi restore`           | 从备份中还原，不会丢失已有数据，需要将文件放在 /phi-plugin/backup/ 目录下                 |
| `#phi(设置别名/setnick) xxx ---> xxx` | 设置某一歌曲的别名，格式为 原名(或已有别名) ---> 别名（会自动过滤---两边的空格）          |
|      `#phi(删除别名/delnick) xxx` |               删除某一歌曲的别名                                                        |
|         `#phi(强制/qz)?(更新/gx)` |                             更新本插件                                                    |
|           `#phi repu`            |                             重启puppeteer                                                |
|        `#下载曲绘/down ill`      |                             下载曲绘到本地                                              |
|         `#phi get <名次>`        |                 获取排行榜上某一名次的sessionToken                                       |
|       `#phi del <sessionToken>`   |                       禁用某一sessionToken                                               |
|       `#phi allow <sessionToken>` |                       恢复某一sessionToken                                               |
|   `#phi (set/设置)<功能><值>`     |     修改设置，建议先/phi set查看功能名称，没有空格                                       |
|        `#phi ban <功能>`          |                       禁用某一类功能，详见下表                                           |

## **功能参数说明**

| 参数     | 功能                     | 影响指令                                 |
| -------- | ------------------------ | ---------------------------------------- |
| all      | 全部功能                 | -.-                                      |
| help     | 帮助功能                 | /help /tkhelp                           |
| bind     | 绑定功能                 | /bind /unbind                           |
| b19      | 图片查分功能             | /pgr /update /info /list /pb30 /score /lvsco /chap /suggest |
| wb19     | 文字查分功能             | /data /best                              |
| song     | 图鉴功能                 | /song /ill /search /alias /rand        |
| ranklist | 排行榜功能，不会禁用用户排名 | /ranklist /godlist                      |
| fnc      | 小功能                   | /com /tips                               |
| tipgame  | tip猜歌                  | /tipgame                                 |
| guessgame| 猜歌                     | /guess                                    |
| ltrgame  | 猜字母                   | /letter /ltr                             |
| sign     | 娱乐功能                 | /sign /send /task /retask /jrrp        |
| setting  | 系统设置                 | /theme                                   |
| dan      | 段位认证相关             | /dan /danupdate                         |
