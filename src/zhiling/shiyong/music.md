---
title: 音乐点歌
index: false
icon: https://drive.nekodayo.top/raw/nekodocs/image/wyy.png
category:
  - 点歌
tag:
  - 网易云
  - QQ音乐
  - 点歌
copyright: false
footer: This is the true music.webp
---

:::warning 注意
**暂未适配官方机器人**
:::

  ```component VPCard
  title: NoneBot-Plugin-MultiNCM
  desc: ✨ 网易云多选点歌 ✨
  logo: /assets/icon/github.svg
  link: https://github.com/lgc-NB2Dev/nonebot-plugin-multincm
  background: rgba(248, 248, 255, 0.3)
  ```

## **指令**
### **网易云点歌系列**
#### **搜索指令**
- **点歌 [歌曲名 / 音乐 ID]**
  - **介绍：搜索歌曲。当输入音乐 ID 时会直接发送对应音乐**
  - **别名：`网易云`、`wyy`、`网易点歌`、`wydg`、`wysong`**
- **网易声音 [声音名 / 节目 ID]**
  - **介绍：搜索声音。当输入声音 ID 时会直接发送对应声音**
  - **别名：`wysy`、`wyprog`**
- **网易电台 [电台名 / 电台 ID]**
  - **介绍：搜索电台。当输入电台 ID 时会直接发送对应电台**
  - **别名：`wydt`、`wydj`**
- **网易歌单 [歌单名 / 歌单 ID]**
  - **介绍：搜索歌单。当输入歌单 ID 时会直接发送对应歌单**
  - **别名：`wygd`、`wypli`**
- **网易专辑 [专辑名 / 专辑 ID]**
  - **介绍：搜索专辑。当输入专辑 ID 时会直接发送对应专辑**
  - **别名：`wyzj`、`wyal`**
#### **操作指令**
- **解析 [回复 音乐卡片 / 链接]**
  - **介绍：获取该音乐信息并发送，也可以解析歌单等**
  - **别名：`resolve`、`parse`、`get`**
- **直链 [回复 音乐卡片 / 链接]**
  - **介绍：获取该音乐的下载链接**
  - **别名：`direct`**
- **上传 [回复 音乐卡片 / 链接]**
  - **介绍：下载该音乐并上传到群文件**
  - **别名：`upload`**
- **歌词 [回复 音乐卡片 / 链接]**
  - **介绍：获取该音乐的歌词，以图片形式发送**
  - **别名：`lrc`、`lyric`、`lyrics`**
#### **Tip**
- **点击 Bot 发送的音乐卡片会跳转到官网歌曲页**
- **使用需要回复音乐卡片的指令时，如果没有回复，会自动使用你触发发送的最近一个音乐卡片的信息**