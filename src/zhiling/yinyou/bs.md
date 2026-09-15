---
command: "BS绑定"
title: Beat Saber
icon: https://drive.nekodayo.top/raw/nekodocs/image/Beat_Saber_Logo.png
sticky: true
category:
  - Beat Saber
tag:
  - Beat Saber
  - 帮助
star: true
copyright: false
footer: 你吃灰的VR有救了！
commands:
  - "BS帮助"
  - "BS绑定"
  - "SS查分"
  - "BL查分"
  - "BS查分"
  - "BS search"
  - "BS查歌"
commandHints:
  "BS帮助": "查看 Beat Saber 指令帮助"
  "BS绑定": "绑定 Beat Saber 成绩账号"
  "SS查分": "查询 ScoreSaber 成绩"
  "BL查分": "查询 BeatLeader 成绩"
  "BS查分": "查询 Beat Saber 成绩"
  "BS search": "搜索 Beat Saber 曲目"
  "BS查歌": "搜索 Beat Saber 曲目"
commandKeywords:
  - "beat saber"
  - "bs"
  - "查分"
  - "ss"
  - "bl"
commandOrder: 71
---

  ```component VPCard
  title: nonebot-plugin-beatsaberscore
  desc: BeatLeader&ScoreSaber查分
  logo: /assets/icon/github.svg
  link: https://github.com/qwq12738qwq/nonebot-plugin-beatsaberscore
  background: rgba(248, 248, 255, 0.3)
  ```

:::warning 注意
**暂未适配官方机器人**
:::

### **以下文档均转自github项目文档**  
**如有侵权请联系删除**

## 🎉 使用

如果设置了响应前缀,使用以下命令的时候不要忘记加上响应前缀

可以发送` BS help `或` BS帮助 `获取帮助(其实也就导航到这里力)

` BS绑定 ` + SteamID 绑定SteamID,绑定ID才可以查分,也可发送` BS bind `,等效` BS绑定 `  
***注意:***  
先绑定SteamID再查分!!!

:::info 🔐 关于账号绑定
`BS绑定` 提供的 SteamID 会保存在机器人服务端，仅用于代您查询 ScoreSaber / BeatLeader 成绩。

如需解绑或更换，请联系 [JQ-28](/about/me)，详见 [隐私政策](/zhuyi/privacy)。
:::

***ScoreSaber查分***

` s40 `,` ss40 `,` SS查分 `,` SS score `都可用于触发查分指令

***BeatLeader查分***

` b40 `,` bl40 `,` BL查分 `,` BL score `都可用于触发查分指令

***BeatLeader&ScoreSaber查分***  
` BS查分 `,` bs查分 `,双倍快乐  


***Song_ID查歌***

发送` BS search ` + 歌曲的ID或者` BS查歌 ` + 歌曲的id可以查询歌曲的信息

***Song计算准度***  
` 谱面计算 `+ 歌曲id + 难度 + 需要的准度(歌曲id/难度/需要的准度顺序可以打乱)  
举个例子:  
![](https://drive.nekodayo.top/raw/nekodocs/image/calculation_example.png)
**注意**  
此功能尚未完善,miss Note数仅供看着玩(),但我能确保需求分数是准确的

**SteamID是什么?**

 在登入` beatleader.xyz `后打开个人信息
 
![](https://drive.nekodayo.top/raw/nekodocs/image/explanation.png)
 
 这个就是你的` SteamID `辣(即使ID不是纯数字也是可以用的)

 即使是scoresaber排行榜网站也是同理
 
 也可以到Steam个人主页去找SteamID,这里就不多赘述了

## ✨ 未来规划
- [X] 添加对ScoreSaber的查分支持
- [X] 重做优化查分图
- [ ] 定时推送beatsaver的新曲,渲染新曲图片
- [ ] 给自制谱投票功能
- [ ] 歌曲的推荐
- [ ] 优化运行速度,使用线上+本地缓存来提高响应速度
