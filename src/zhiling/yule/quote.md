---
title: 群语录库
index: false
icon: /assets/icon/image.svg
category:
  - 互动娱乐
tag:
  - 语录
  - 图片
  - 语录库
copyright: false
footer: 记录群友的名言警句！
---

```component VPCard
title: nonebot-plugin-quote
desc: QQ群语录库 - 支持上传聊天截图为语录，随机投放语录，关键词搜索语录精准投放
logo: /assets/icon/github.svg
link: https://github.com/RongRongJi/nonebot_plugin_quote
background: rgba(248, 248, 255, 0.3)
```

## 🎉 使用

### 上传

以**上传**指令回复图片消息，即可直接将图片上传至语录库中。

<img src="https://github.com/RongRongJi/nonebot_plugin_quote/raw/main/screenshot/upload.jpg" width="40%" />


### 随机发送语录

@机器人，发送**语录**指令，机器人将从语录库中随机挑选一条语录发送。

<img src="https://github.com/RongRongJi/nonebot_plugin_quote/raw/main/screenshot/random.jpg" width="40%" />

### 关键词检索语录

@机器人，发送**语录**+关键词指令，机器人将从语录库中进行查找。若有匹配项，将从匹配项中随机一条发送；若无匹配项，将从整个语录库中随机挑选一条发送。

<img src="https://github.com/RongRongJi/nonebot_plugin_quote/raw/main/screenshot/select.jpg" width="40%" />
<img src="https://github.com/RongRongJi/nonebot_plugin_quote/raw/main/screenshot/non.jpg" width="40%" />

### 删除语录

回复机器人发出的语录，发送**删除**指令，机器人将执行删除操作。（该操作只允许设置的白名单用户进行，如何设置白名单请看下方配置）

<img src="https://github.com/RongRongJi/nonebot_plugin_quote/raw/main/screenshot/delete.jpg" width="40%" />

### 增加/删除标签

回复语录图片，发送**addtag**+标签（addtag后需加空格，可以多个标签，每个标签之间用空格分隔），为指定语录增加额外标签。

回复语录图片，发送**deltag**+标签（deltag后需加空格，可以多个标签，每个标签之间用空格分隔），为指定语录删除不需要的标签。

<img src="https://github.com/RongRongJi/nonebot_plugin_quote/raw/main/screenshot/tag.jpg" width="40%" />

### 指定标签检索语录

@机器人，发送**语录**+#号+标签，将从语录库中对指定标签进行查找。加#号后，将只对#号后的完整的词进行查找；不加#号会进行分词。

<img src="https://github.com/RongRongJi/nonebot_plugin_quote/raw/main/screenshot/usetag.jpg" width="40%" />

### 生成语录式图片

在配置好中文字体路径后，以“命令前缀+**生成**”，回复群内任意一句话，即可生成如下语录体图片，**不录入语录库和本地保存**，支持emoji渲染，推荐使用等宽黑体（例如[更纱黑体](https://github.com/be5invis/Iosevka)）以达到最好效果。

<img src="https://github.com/RongRongJi/nonebot_plugin_quote/raw/main/screenshot/auto_generate.png" width="40%" />

### 上传语录式图片

在配置好中文字体路径后，以“命令前缀+**记录**”，回复群内任意一句话，即可生成如下语录体图片，**录入语录库和本地保存**，支持emoji渲染，推荐使用等宽黑体（例如[更纱黑体](https://github.com/be5invis/Iosevka)）以达到最好效果。

<img src="https://github.com/RongRongJi/nonebot_plugin_quote/raw/main/screenshot/auto_record.jpg" width="40%" />

### 详细命令

默认配置下，@机器人加指令即可。

| 指令 | 需要@ | 范围 | 说明 |
|:-----:|:----:|:------:|:-----------:|
| 回复图片+上传 | 可选 | 群聊 | 上传图片至语录库 |
| 语录 + 关键词(可选) | 可选 | 群聊 | 根据关键词返回一个符合要求的图片, 没有关键词时随机返回 |
| 语录 + #标签 | 可选 | 群聊 | 根据标签返回一个符合要求的图片, 没有关键词时随机返回 |
| 回复机器人 + 删除 | 可选 | 群聊 | 删除该条语录 |
| 语句中包含语录 | 是 | 群聊 | 对如何使用语录进行说明 |
| 回复机器人 + addtag + 标签(addtag和标签之间需要空格)| 可选 | 群聊 | 为该条语录增加额外标签 |
| 回复机器人 + deltag + 标签(deltag和标签之间需要空格)| 可选 | 群聊 | 为该条语录删除指定标签 |
| 回复机器人 + alltag| 可选 | 群聊 | 查看该条语录所有标签 |
| 回复消息+记录 | 否 | 群聊 | 为回复消息生成语录式图片并**记录至语录库**，不能上传自己的语录 |
| 回复消息+生成 | 否 | 群聊 | 为回复消息生成语录式图片，**不在本地存储** |