---
title: wordle 猜单词
index: false
icon: /assets/icon/book.svg
category:
  - wordle
tag:
  - wordle
  - 猜单词
copyright: false
footer: 妈妈生的
---
  ```component VPCard
  title: nonebot-plugin-wordle
  desc: 适用于 Nonebot2 的 wordle 猜单词插件
  logo: /assets/icon/github.svg
  link: https://github.com/noneplugin/nonebot-plugin-wordle
  background: rgba(248, 248, 255, 0.3)
  ```

### **以下文档均转自github项目文档**  
**如有侵权请联系删除**

## 使用
```bash
@机器人 + 猜单词/wordle
```

绿色块代表此单词中有此字母且位置正确；  

黄色块代表此单词中有此字母，但该字母所处位置不对；  

黄色块至多着色 **此单词中有这个字母的数量** 次；  

灰色块代表此单词中没有此字母；  

猜出单词或用光次数则游戏结束。  

可发送“结束”结束游戏；可发送“提示”查看提示。  

可使用 -l / --length 指定单词长度，默认为 5  

可使用 -d / --dictionary 指定词典，默认为 CET4  

支持的词典：GRE、考研、GMAT、专四、TOEFL、SAT、专八、IELTS、CET4、CET6  

## 示例
![](https://drive.nekodayo.top/raw/nekodocs/image/wordle.png)

## 说明
黄色块着色规则为：
```bash
黄色块至多着色 此单词中有这个字母的数量 次。
```

针对这个规则，下面的例子能帮您更好理解，并且更好猜测词语：

假设答案是 `xOOxxxxx`。（这个词并不存在，只是为了方便理解）

当用户猜测 `xxxxxxxO` 时，O这个字母由于存在但位置不同，会被着为黄色。

当用户猜测 `xxxxxxOO` 时，由于原先单词中有两个O，所以两个O都会被着色。

当用户猜测 `xxxxxOOO` 时，由于原先单词只有两个O，因此前两个O会被着色，第3个会被着为灰色。

当用户猜测 `xxOxxxxO` 时，第1个O由于位置正确，着为绿色。第2个O着为黄色。

当用户猜测 `xxOxxxOO` 时，第1个O着绿色，第2个O着黄色，第3个O着灰色。

当用户猜测 `xOOxxxxO` 时，前两个O着绿色，第3个O着灰色。