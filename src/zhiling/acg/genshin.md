---
title: 原神
icon: https://drive.nekodayo.top/raw/nekodocs/image/genshin.webp
sticky: true
category:
  - 指令列表
tag:
  - 原神
  - 指令
  - 帮助
star: true
copyright: false
footer: 原来，你也...
---

## **主要功能如下**  
![](https://drive.nekodayo.top/raw/nekodocs/image/genshinhelp.jpg)

---

## **喵喵插件**
  ```component VPCard
  title: Miao-Plugin
  desc: 提供包括角色面板、角色查询等角色相关功能。
  logo: /assets/icon/github.svg
  link: https://github.com/yoimiya-kokomi/miao-plugin
  background: rgba(248, 248, 255, 0.3)
  ```
### **功能说明**
#### #雷神面板  
使用指令 `#面板帮助` 即可了解如何使用此功能。

#### #更新面板  
`#更新面板` 依赖于面板查询API，面板服务由 http://enka.network/ 提供。

>查询功能经Enka官方授权(issue#63)，感谢Enka提供的面板查询服务

#### #雷神伤害  
喵喵面板附带的伤害计算功能由喵喵本地计算。如计算有偏差 #雷神伤害 查看伤害加成信息，如确认伤害计算有误可提供伤害录屏截图及uid进行反馈

#### #雷神圣遗物
圣遗物评分为喵喵版评分规则

---
## **图鉴插件**
  ```component VPCard
  title: xiaoyao-cvs-plugin
  desc: 原神图鉴插件。
  logo: /assets/icon/github.svg
  link: https://github.com/Ctrlcvs/xiaoyao-cvs-plugin
  background: rgba(248, 248, 255, 0.3)
  ```
### **命令说明**
1. 发送 【#**图鉴】 进行触发，例如发送 #刻晴图鉴，即可返回对应的图片信息。  
1. 发送 #图鉴帮助 获取帮助面板  
1. 其余具体功能通过 #图鉴帮助 #图鉴版本 查看  
1. 发送 #崩坏3签到 可签到崩坏3游戏模块 具体支持【崩坏3、原神、崩坏2、未定义事件】原神模块(当前)支持过验证码  
1. 发送 #云原神签到 可签到云原神游戏  
1. 支持stoken绑定以及相关的操作。如：【#更新抽卡记录】  

  ```component VPCard
  title: Atlas
  desc: 图鉴查询插件
  logo: /assets/icon/github.svg
  link: https://github.com/Nwflower/atlas
  background: rgba(248, 248, 255, 0.3)
  ```

### **图鉴指令**

获取图鉴图片后，可以根据相应的指令获取图鉴。

| 指令示例        | 指令说明                         | 所属图鉴 |
| --------------- | -------------------------------- | -------- |
| #芙宁娜材料     | 查询角色突破材料信息             | 原神     |
| #黄金剧团       | 查询圣遗物信息                   | 原神     |
| #苍古自由之誓   | 查询武器信息                     | 原神     |
| #七圣珊瑚宫心海 | 查询七圣卡牌（**已停更**）       | 原神     |
| #甜甜花酿鸡     | 查询食物信息（更新频率较慢）     | 原神     |
| #无相之草       | 查询敌对单位信息（更新频率较慢） | 原神     |
| #鸣草           | 查询区域特产信息（更新频率较慢） | 原神     |



此外，如果对某些物品的名字记忆模糊，可以根据对应索引查询：
1. `#武器索引`口令唤出武器索引，逐级查询想要找的武器
2. `#原魔`口令唤出原魔索引，逐级查询想要找的原魔
3. `#圣遗物`口令唤出圣遗物一级索引，直接查询想要找的圣遗物
4. `七圣召唤`口令唤出七圣召唤卡牌索引，逐级查询想要找的七圣召唤卡牌

---

### **本人推荐丝滑使用小连招如下：**  
发送 `#扫码登录` Bot会发送二维码让你扫描，打开你的米游社 `我的-左上角扫码` 然后进行扫码  
然后你就可以任意使用查询角色面板等功能啦

<QQChat title="原神绑定查询">
  <QQMessage align="right" avatar="http://q2.qlogo.cn/headimg_dl?dst_uin=480352716&spec=640">
    <div>#扫码登录</div>
  </QQMessage>
  
  <QQMessage align="left" avatar="http://q2.qlogo.cn/headimg_dl?dst_uin=3582537505&spec=640">
    <div>@JQ-28 请使用米游社扫码登录</div>
  </QQMessage>

  <QQImage 
    align="left" 
    avatar="http://q2.qlogo.cn/headimg_dl?dst_uin=3582537505&spec=640"
    src="https://drive.nekodayo.top/raw/nekodocs/image/BABABOIQRCODE.png"
    alt="神秘二维码"
  />

  <QQMessage align="right" avatar="http://q2.qlogo.cn/headimg_dl?dst_uin=480352716&spec=640">
    <div>*使用米游社app扫描了二维码*</div>
  </QQMessage>
  
  <QQMessage align="left" avatar="http://q2.qlogo.cn/headimg_dl?dst_uin=3582537505&spec=640">
    <div>绑定Cookie成功</div>
    <div>【原神】:125993111</div>
    <div>【星穹铁道】:110130549</div>
  </QQMessage>

  <QQMessage align="left" avatar="http://q2.qlogo.cn/headimg_dl?dst_uin=3582537505&spec=640">
    <div>【此处省略其他信息】</div>
  </QQMessage>

  <QQMessage align="right" avatar="http://q2.qlogo.cn/headimg_dl?dst_uin=480352716&spec=640">
    <div>#更新面版</div>
  </QQMessage>

  <QQImage 
    align="left" 
    avatar="http://q2.qlogo.cn/headimg_dl?dst_uin=3582537505&spec=640"
    src="https://drive.nekodayo.top/raw/nekodocs/image/gxmb.jpg"
    alt="#更新面板"
  />
  

</QQChat>

## **黄历**
发送 `#原神黄历` 查看