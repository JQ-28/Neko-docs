---
title: Haruki Bot
icon: https://drive.nekodayo.top/raw/nekodocs/image/mzk.png
sticky: true
category:
  - pjsk
tag:
  - pjsk
  - harukibot
  - 帮助
star: true
copyright: false
footer: 一緒に歌おう！
---

## **前言**

HarukiBot介绍 a.k.a. 开发计划  
服务端(v1):  
· 重新实现Unibot绝大多数功能  
· API架构采用Quart开发  
· 绝大多数函数改写为async/await以尝试提升性能  
· 专为Linux部署开发以尝试提升性能  
· 在开发告一段落之后开源大部分源码，但涉及API交互的暂时没决定好是否开源  
客户端:  
· 支持选择黑名单模式与白名单模式  
· 支持全局仅开启部分功能(如pjsk/wds)  
· 支持群组仅开启部分功能  
· help指令可选开关  
· 支持通过API对bot进行管理(如开关与黑白名单)  

目前Haruki仍然在活跃开发中，可能存在各种各样的bug，如果遇到bug请及时找Haruki开发者反馈  



### **以下文档均转自[HarukiBot 帮助文档](https://docs.shiromiku.moe/)**
**如有侵权请联系删除**

--------
- **`感谢您使用HarukiBot，在使用之前，希望您能自觉遵守以下几点：`**
- **`HarukiBot是一款功能型机器人, 主要提供《世界计划 多彩舞台》相关查询服务。`**
- **`请不要在角色、歌曲以及其它允许自由设置别名的功能下使用低俗、恶俗以及会让他人产生厌恶相关的昵称。`**
- **`请不要将Haruki（以下简称为bot）以及其它分布式在国服相关群内公开贴脸。`**
- **`合理合规使用bot`**
--------


<div align="center">

![logo](https://images.shiromiku.moe/images/37baa23757a020fdd07fdcb75a70bf06.webp)

# HarukiBot

一款多功能QQ群机器人
Logo由[小沢翼](https://space.bilibili.com/3493133455198556)担当绘制

</div>

# 阅读前提示

* HarukiBot具有配套功能网站 [Haruki工具箱](https://haruki.seiunx.com)。
* 如果你不知道有什么群可以加，也可以访问 [Haruki工具箱](https://haruki.seiunx.com) 的 [推荐群聊](https://haruki.seiunx.com/friend_groups) 页面。
* 推荐群聊页面仅接受熟人申请。

# 功能列表

> 本文档将引导您使用 HarukiBot

* HarukiBot是一款功能型机器人, 目前主要提供《世界计划 多彩舞台》相关查询服务。
* 该Bot不提供私聊服务。
* 使用该Bot，即意味着你同意[使用条款](/licence/)及[隐私条款](/privacy/)。
* 如果你在使用过程中遇到任何问题，你可以在该页面最下方的 `关于` 下面联系 `开发者` 进行反馈。
* 目前HarukiBot**仍然处于开发状态**，**有多种功能仍在开发中**，如果没有你需要的功能，请不要着急，请耐心等待开发者开发完善。

## PJSK歌曲信息相关查询

### pjskinfo

* `pjskinfo<曲名>`, `song<曲名>`, `musicinfo<曲名>` 查看当前歌曲详细信息
* `pjskbpm<曲名>` 查看当前歌曲的bpm
* `查bpm<数字>` 查询对应bpm所有歌曲

### 谱面预览

* `谱面预览 <曲名> <难度>` 查询对应曲名，难度的谱面预览（来源：[ぷろせかもえ！](https://pjsekai.moe/)

  * `难度`支持的输入: `easy`, `normal`, `hard`, `expert`, `master`, `append`, `ez`, `nm`, `hd`, `ex`, `ma`, `ap`, `apd`
  * 如果查询`master`可省略难度

### 昵称设置

* `musicset<昵称>to<歌名>` 设置歌曲昵称
* `musicdel<昵称>` 删除歌曲昵称
* `charalias<昵称>` 查看特定角色所有昵称
* `charaset<昵称>to<角色名(可以是现有昵称)>` 设置角色群通用昵称,如`charasetkndto宵崎奏`
* `charadel<昵称>` 删除角色群通用昵称
* `grcharaset<新昵称>to<已有昵称>` 设置仅当前群可用角色昵称
* `grcharadel<已有昵称>` 删除仅当前群可用角色昵称
* \[后续将会添加] `charainfo<昵称>` 查看该角色的个人资料

:::warning
> 所有歌曲昵称设置，角色昵称设置的日志内容将会在实时日志页面按日公示。
> 若违反相关条例将会视情况采取删除对应昵称至禁止使用Bot不等的措施。
:::

## 查询玩家信息

> 在命令前加`en`即可查询国际服信息，如`en绑定`, `ensk`, `en逮捕`, `enpjskprofile`
> 在命令前加`tw`即可查询台服信息，如`tw绑定`, `twsk`, `tw逮捕`, `twpjskprofile`
> 在命令前加`kr`即可查询韩服信息，如`kr绑定`, `krsk`, `kr逮捕`, `krpjskprofile`
> 在命令前加`cn`即可查询国服信息，如`cn绑定`, `cnsk`, `cn逮捕`, `cnpjskprofile`

* `绑定+id` 通过游戏uid绑定你的游戏账号

## MySekai相关查询

:::warning
> Android 用户建议使用 [Haruki工具箱-上传MySekai数据](https://haruki.seiunx.com/upload_mysekai) 的`引继信息上传模式`
> iOS / iPadOS 用户 建议使用代理工具MitM模块更新，要求如下:
>
> * 拥有代理工具 ( 如 Shadowrocket / Quantumult X / Surge / Loon / Stash )
> * 有需要请加群**1026390204**咨询群友
:::

* `mysekai_analyze`、`mysekai分析`、`ms分析`、`msa`
  根据用户上传至Haruki数据库的数据分析MySekai现存材料
* `mysekai_analyze2`、`mysekai分析2`、`ms分析2`、`msa2`
  分析MySekai现存材料（新版UI设计，感谢Foglio）
* `mysekai_maps`、`msm`、`mysekai地图`、`ms地图`
  生成资源分布图（感谢 [中红(MiddleRed)](https://github.com/MiddleRed) 和 [ルナ茶(NeuraXmy)](https://github.com/NeuraXmy)）

:::warning
> `mysekai_maps`指令后面添加数字可以查询单图地图
>
> * 数字1: 草原
> * 数字2: 花田
> * 数字3: 沙滩
> * 数字4: 废墟
:::

* `mysekai照片 + 序号`、`ms照片 + 序号`、`msp + 序号`
  下载用户在MySekai里面拍摄的照片 (按拍摄顺序)

## 活动排名相关查询

:::warning
> 以下指令添加`wl`前缀可以查询World Link活动单榜的排名和分数
> 指令最后添加`-c <角色别名>`可以获取特定角色单榜的排名和分数，例：
>
> * `wlsk 100`获取目前单榜的100名的排名和分数
> * `wlsk 100 -c haruka`获取桐谷遥单榜的100名的排名和分数
:::

* `sk` 如果你在前100，可以用该命令查询排名和分数
* `sk <游戏数字id>` 查询特定玩家的排名和分数
* `sk <排名>` 查询某个排名的玩家信息（最多7个）
* `查房 <排名>`, `cf <排名>` 查询特定排名最近1小时相关信息
* `sk线` 查询榜线分数
* `时速`、`半日速`、`日速` 查看PT增长速度

:::warning
> `时速` 等指令后可加数字（最多1440分钟）转换为对应速度，如：`时速10`
:::

* `分数线 <排名>`、`rtr <排名>` 查看分数趋势
* `追踪`、`ptr` 自己的PT与排名趋势
* `追踪 <排名>`、`ptr <排名>` 特定排名的PT趋势与排名趋势

:::warning
> `追踪1 2` 可同时对比两个排名玩家的趋势
:::

* \[后续将会添加] `sk预测` 预测线（数据来自 [3-3.dev](https://3-3.dev/)）

## 打歌情况相关查询

* `逮捕@[xxx]` 查看绑定过id的用户fc/ap等
* `逮捕+id` 查看特定id玩家数据
* `pjskprofile`, `个人信息` 生成绑定id的profile图片

## 隐私相关指令

* `不给看` 不允许他人逮捕自己（自己可查）
* `给看` 允许他人逮捕自己

## 卡牌及活动信息相关查询

> 查卡面/查活动功能由 [Yozora](https://github.com/cYanosora) 编写，非常感谢

* `查卡/查卡面/查询卡面/findcard [角色昵称]`: 获取当前角色所有卡牌

* `查卡/查卡面/查询卡面/cardinfo [卡面id]`: 获取指定卡面信息

* `查活动/查询活动/event [活动id]`: 查看指定活动信息

* `查活动/查询活动/findevent [关键字]`: 通过关键字筛选活动

  * 单关键字：`查活动 5v5`, `查活动 紫月`, `查活动 miku`, `查活动 25h`
  * 多关键字：`查活动 草 5v5`, `查活动 knd 蓝`, `查活动 普活 紫月 knd`
  * 使用例：`查活动 25h 25miku`, `查活动 knd ick`

* `活动图鉴/活动列表/活动总览/findevent all`: 所有活动概要（频道bot无法使用）

## 关于

* 开发者: [星云希凪](https://github.com/MejiroRina)
* 联系我: [haruki@seiunx.com](mailto:haruki@seiunx.com)
* wiki原作者：[綿菓子ウニ](https://space.bilibili.com/622551112)
* 使用授权：[点击查看](https://images.shiromiku.moe/images/4f956d51aaa3d1b2f407d1922e397a42.jpg)

