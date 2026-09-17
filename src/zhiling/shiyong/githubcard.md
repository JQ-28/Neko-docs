---
title: Git 仓库助手
icon: /assets/icon/github.svg
category:
  - 指令列表
tag:
  - git
  - github
  - gitee
  - 指令
  - 帮助
star: true
copyright: false
footer: Neko docs - Git 仓库助手
commands:
  - "#githubrepo"
  - "#githubissue"
  - "#githubpr"
  - "#githubreadme"
  - "#githubsub"
  - "#gitunsub"
  - "#gitlist"
  - "#gitsub"
  - "#gitrepo"
  - "#gitlimit"
commandMain: "#githubrepo"
commandHints:
  "#githubrepo": "查仓库（描述 / Star / Fork / 默认分支 / 更新时间）"
  "#githubissue": "查 Issue，只填仓库时列出开启中的编号"
  "#githubpr": "查 PR，只填仓库时列出开启中的编号"
  "#githubreadme": "读取仓库的 README"
  "#githubsub": "订阅仓库更新，有新动静就推到当前会话"
  "#gitunsub": "取消订阅仓库"
  "#gitlist": "查看当前会话订阅了哪些仓库"
  "#gitsub": "通用订阅命令，第一个参数填平台"
  "#gitrepo": "通用查询命令，第一个参数填平台"
  "#gitlimit": "查询 GitHub API 限流"
commandKeywords:
  - "github"
  - "gitee"
  - "gitcode"
  - "gitea"
  - "git"
  - "仓库"
  - "issue"
  - "pr"
  - "订阅"
  - "readme"
commandOrder: 52
---

```component VPCard
title: Git-Plugin
desc: Git 仓库助手，支持 GitHub / Gitee / GitCode / Gitea
logo: /assets/icon/github.svg
link: https://github.com/QingYingX-Bot/Git-Plugin
background: rgba(248, 248, 255, 0.3)
```

:::tip 说明
这几个命令由云崽侧的 Git-Plugin 提供，机器人在其他框架上的账号用不了。
:::

## **能做什么**

- **查仓库**：描述、Star、Fork、默认分支、最近更新时间
- **查 Issue / PR**：按编号看详情；只填仓库时列出所有开启中的编号
- **读 README**：直接把仓库的说明读出来
- **订阅更新**：订阅过的仓库有了新 Issue / PR / 提交，第一时间推到当前会话
- **链接自动解析**：群里发一条 Git 仓库链接，自动回一张仓库卡片
- **其他**：查 GitHub API 限流、插件帮助图

## **支持平台**

GitHub、Gitee、GitCode、Gitea 四个平台。前三个直接写 `用户名/仓库名` 就行，**Gitea 要带上你自己的实例地址**（写在仓库前面）。

## **常用命令**

下表是 GitHub 的直达命令，其他平台把前缀换成 `gitee` / `gitcode` / `gitea` 即可（例如 `#giteerepo`）。

| 命令 | 说明 |
|---|---|
| `#githubrepo 用户名/仓库名` | 查仓库信息 |
| `#githubissue 用户名/仓库名` | 列出开启中的 Issue 编号 |
| `#githubissue 用户名/仓库名#1` | 看 1 号 Issue 的详情 |
| `#githubpr 用户名/仓库名` | 列出开启中的 PR 编号 |
| `#githubpr 用户名/仓库名#1` | 看 1 号 PR 的详情 |
| `#githubreadme 用户名/仓库名` | 读仓库的 README |
| `#githubsub 用户名/仓库名` | 订阅这个仓库的更新 |
| `#gitunsub 用户名/仓库名` | 取消订阅 |
| `#gitlist` | 看当前会话订阅了哪些仓库 |
| `#gitsub github 用户名/仓库名` | 通用订阅命令，第一个参数填平台 |
| `#gitlimit` | 查 GitHub API 限流 |

订阅多个仓库时，一次写几个、用 `,` 或 `、` 隔开就行：

```
#githubsub owner/repo,owner2/repo2、owner3/repo3
```

Gitea 的命令要多带一个实例地址：

```
#gitrepo gitea https://gitea.example.com owner/repo
```

## **推送会发到哪**

**在哪发的命令，就推到哪** —— 群里订阅就推到这个群，私聊订阅就推给这个好友，不用另外设置。

推送有两种方式，互不冲突：

- **定时轮询**：插件按固定间隔去平台拉一次，有新 Issue / PR 或新提交就推送
- **Webhook 实时推送**：平台那边一有动静就回调过来（需要公网地址，得在仓库页面里加一次 webhook）

## **链接解析**

群里直接发 Git 仓库链接，会自动回一张仓库卡片。不想要就发 `#gitlink off` 关掉，`#gitlink on` 再打开（按会话记）。

## **小提示**

- Issue / PR 编号连着的会压缩显示，比如 `1~4, 8, 10~12`
- 不想看某个仓库了，`#gitunsub` 取消订阅就行，不影响别的会话
