---
command: "更新b50"
title: maimaiDX
icon: https://assets.nekodayo.top/nekodocs/image/maimai.webp
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
  - "更新b50"
  - "水鱼绑定"
  - "mai2_pcount_help"
  - "pcount on"
  - "pcount off"
  - "添加机厅"
  - "/net"
commandHints:
  "更新b50": "更新 maimai b50 成绩"
  "水鱼绑定": "绑定水鱼查分账号"
  "mai2_pcount_help": "查看局数统计帮助"
  "pcount on": "开启局数统计"
  "pcount off": "关闭局数统计"
  "添加机厅": "添加常去的机厅"
  "/net": "查看舞萌DX 服务器实时状态"
commandKeywords:
  - "maimai"
  - "b50"
  - "水鱼"
  - "机厅"
  - "服务器"
  - "断网"
  - "状态"
commandOrder: 69
---

  ```component VPCard
  title: nonebot-plugin-maimaidx
  desc: maimai查分功能
  logo: /assets/icon/github.svg
  link: https://github.com/Yuri-YuzuChaN/nonebot-plugin-maimaidx
  background: rgba(248, 248, 255, 0.3)
  ```

:::warning 注意
**暂未适配官方机器人**
:::

## **指令**
![](https://assets.nekodayo.top/nekodocs/image/maimaidxhelp.png)


# **更新b50**


**使用了maimai_py库开发的舞萌更新b50功能**
## **使用指南**
**1.在群内发送你在微信** `舞萌|中二` **获取到的**`玩家二维码`  
**用于绑定你的舞萌账号**  ，bot识别到二维码会自动绑定，在有管理员权限下会自动撤回二维码  
:::caution DANGER
若bot没有管理员权限请自己撤回！以免被不怀好意的人偷盗账号  
:::
**2.前往** [水鱼网](https://www.diving-fish.com/maimaidx/prober/)**→个人资料→成绩导入Token 获取token**  
**按照命令格式把token发送给bot** → 命令：`水鱼绑定 你的token`  
3.在群内发送`更新b50` bot则会自动更新你的b50上传到水鱼网并回复更新好的b50成绩图

:::info 🔐 关于账号凭证
绑定的玩家二维码与水鱼 Token 会保存在机器人服务端，仅用于代您更新并查询 b50 成绩，不会用于其他用途。

如需解绑或删除凭证，请联系 [JQ-28](/about/me)，详见 [隐私政策](/zhuyi/privacy)。
:::

---

  ```component VPCard
  title: mai2_pcount
  desc: wmc的机厅在线人数信息查询
  logo: /assets/icon/github.svg
  link: https://github.com/MWNya520/mai2_pcount
  background: rgba(248, 248, 255, 0.3)
  ```



### **以下文档均转自github项目文档**  
**如有侵权请联系删除**

## **功能**
使用 `mai2_pcount_help` 来查看帮助信息喔~  

pcount on: 在本群开启这个插件~ 不开启的话，下面的指令（除了关闭）都用不了唔~

- pcount off: 在本群关闭这个插件~

- 添加机厅: 使用 `添加机厅 机厅名 机厅代号` 来添加哦~

- 删除机厅: 使用 `删除机厅 机厅代号` 来删除哦~

- [机厅代号]+ - =[数字]: 使用类似于 `mw=6` 的指令来修改机厅人数哦~

- [机厅代号]几: 使用类似于 `mw几` 的指令来查询机厅人数哦~

- 修改地区名 [地区名]: 使用类似于 `修改地区名 wmc聚集地` 的指令来修改地区名哦~

注意注意~！各个群聊的数据都是不一样的，需要自行配置机厅哦~

---

  ```component VPCard
  title: nonebot-plugin-maimaimonitor
  desc: 舞萌DX 服务器状态实时查询
  logo: /assets/icon/github.svg
  link: https://github.com/CEPATECH/nonebot-plugin-maimaimonitor
  background: rgba(248, 248, 255, 0.3)
  ```

### **以下文档均转自github项目文档**  
**如有侵权请联系删除**

## **查看服务器状态**

不用配置私钥也能查，直接在群里发 `/net`、`网咋样` 或 `炸了吗`，就会回一份当前状态：

```
【舞萌DX游戏服务器状态】
🟢 一切正常
【服务状态】
🟢 NET      42ms
🟢 会员      38ms
🟢 标题      45ms
🟢 公众号(NET)  51ms
🟢 公众号(二维码) 60ms
🟢 计费  62ms
⏱ 当前延迟：42ms｜服务器负载：流畅｜延迟稳定
💬 服务器运行正常
• 1小时前 中国 机台断网
• 4小时前 JP 机台无法登录
🔗 详情请查看 https://mai.chongxi.us/
```

哪台服务器出了问题，这份状态里会直接标出来，不用自己挨个试。

数据来自 [isMaiDown](https://mai.chongxi.us)，不想在群里问也可以直接开网页看。