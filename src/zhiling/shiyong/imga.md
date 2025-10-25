---
title: 图片背景消除
index: false
icon: /assets/icon/image.svg
category:
  - img
tag:
  - img
  - 图片
  - 背景消除
copyright: false
footer: 图片背景消除
---
  ```component VPCard
  title: nonebot_plugin_remove_bg
  desc: 基于remove.bg的图片背景消除插件
  logo: /assets/icon/github.svg
  link: https://github.com/Ikaros-521/nonebot_plugin_remove_bg
  background: rgba(248, 248, 255, 0.3)
  ```
### **以下文档均转自github项目文档**  
**如有侵权请联系删除**

::: caution 因为QQ特性，png透明图片发出来不是透明是黑的，望周知
:::

## **:tada: 功能**
基于remove.bg，上传图片调用API消除背景后返回处理后的图片

## **:point_right: 命令**
### ①默认配置的背景消除  
#### 1、先发送命令，再发送图片（命令前缀请自行替换）  
先发送`/去背景`或`/rm_bg`，等bot返回`请发送需要去除背景的图片喵~`后，发送需要去除背景的图片即可。

#### 2、命令+图片
编辑消息`/去背景[待去除背景的图片]或/rm_bg[待去除背景的图片]`发送即可。  
bot返回内容：

![功能演示](https://drive.nekodayo.top/raw/nekodocs/image/imga.webp =300x300)

#### 3、回复图片+命令
回复需要处理的图片，然后追加命令`/去背景`或`/rm_bg`发送即可。

### ②自定义配置的背景消除
#### 1、命令+图片
命令如下(命令前缀自行添加)：

```bash
自定义去背景 -img <IMAGE> [-s --size -最大输出分辨率 <最大输出图像分辨率 'preview/full/auto'>] [-t --type -前景类型 <前景类型 'auto/person/product/car'>] [-tl --type_level -前景类型级别 <检测到的前景类型的分类级别 'none/1/2/latest'>]\n [-r --roi -感兴趣区域 <感兴趣区域 x1 y1 x2 y2，如'0% 0% 100% 100%'>] [-c --crop -裁剪空白区 <是否裁剪掉所有空白区域 'true/false'>] [-p --position -定位主题 <在图像画布中定位主题 'center/original/从“0%”到“100%”的一个值(水平和垂直)或两个值(水平、垂直)'>]\n [-sc --scale -缩放主体 <相对于图像总尺寸缩放主体 从“10%”到“100%”之间的任何值，也可以是“original”(默认)。缩放主体意味着“位置=中心”(除非另有说明)。>] [-ad --add_shadow -人工阴影 <是否向结果添加人工阴影 'true/false'>] [-se --semitransparency -半透明区域 <结果中是否包含半透明区域 'true/false'>]
```

命令起始：`自定义去背景` 或 `remove_bg`
`-img` 必选参数，后面追加`<IMAGE>`图片（回复的话，图片就不用了）
`-s` 可选参数 `-s`可以改成 `--size` 或 `-最大输出分辨率`，含义是最大输出图像分辨率，传参内容是`'preview/full/auto'`（3选1）
其他的[]都是可选参数，含义和-s相同，不再赘述。  

例如：  
```bash
/自定义去背景 -img <IMAGE> -s 'preview'
/remove_bg -img <IMAGE> -s 'full' -r '30% 30% 60% 60%' -ad 'true'
/自定义去背景 -图片 <IMAGE> -最大输出分辨率 'preview' -前景类型 'person' -前景类型级别 '1' -感兴趣区域 '0% 0% 100% 100%' -裁剪空白区 'true' -定位主题 'center' -缩放主体 '50%' -人工阴影 'false'  -半透明区域 'false'
```

#### 2、回复图片+命令  
命令与上面相同，注意必选参数 `-img`，不要忘记了。

#### 3、自定义去背景帮助  
获取命令的帮助说明命令为`自定义去背景帮助` 或 `自定义去背景help  `
例如：  
```bash
/自定义去背景帮助
/自定义去背景help
```

