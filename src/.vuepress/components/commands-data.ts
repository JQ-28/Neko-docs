export interface CommandEntry {
  title: string;
  command: string;
  commands: string[];
  link: string;
}

export interface CommandCategory {
  name: string;
  items: CommandEntry[];
}

const featureHints: Record<string, string> = {
  WordCloud: "群聊消息词云统计",
  "Poke-Plugin": "戳一戳次数统计榜",
};

const commandHints: Record<string, string> = {
  jrrp: "今日人品值",
  zrrp: "昨日人品值",
  weekjrrp: "本周人品概览",
  monthjrrp: "本月人品概览",
  alljrrp: "历史人品总览",
  运势趋势: "近期人品走势",
  "/roll": "1-100 中随机取数",
  "/roll 100": "1-100 中随机取数",
  "/roll 吃饭 睡觉": "从给定选项中随机选一个",
  "hzys -h": "查看指令帮助",
  "hzys 哇袄": "生成 otto 语录",
  "#查询戳戳": "查询指定用户的戳戳次数",
  "[emoji]+[emoji]": "把两个 emoji 合成为一张图",
  "[emoji][emoji]": "把两个 emoji 合成为一张图",
  motalk: "生成蔚蓝档案风格对话图",

  bm: "解析并发送视频链接信息",
  train: "按车次查询 12306 时刻表",
  code: "在线运行代码片段",
  "#状态": "查看 Bot 运行状态",
  "/status": "查看 Bot 运行状态",
  "#搜图": "以图搜图，查找图片来源",
  "/rm_bg": "去除图片背景",
  "/自定义去背景": "自定义去背景的提示词",
  网易声音: "点播网易云声音",
  网易电台: "点播网易云电台节目",
  解析: "解析歌曲直链",
  直链: "获取歌曲直链",
  必应壁纸: "获取必应每日壁纸",
  取消: "取消幻影坦克合成",
  "/掉线测试": "测试掉线通知是否生效",
  "https://github.com/用户名/仓库名": "发送 GitHub 链接生成仓库卡片",

  "bf help": "查看战地指令帮助",
  "bf init": "初始化战地账号绑定",
  "[game] [玩家id]": "查询指定游戏与玩家的战绩",
  "bf1 senpai": "查询 bf1 玩家 senpai 的战绩（示例）",
  skland: "森空岛每日签到",
  "skland bind": "绑定森空岛账号",
  "skland rogue": "查询集成战略战绩",
  "skland gacha": "查询抽卡记录",
  arkstart: "明日方舟抽卡开局",
  方舟抽卡: "模拟抽取卡池",
  "~卡片": "生成鸣潮角色卡片",
  "~体力": "查询当前体力",

  "#p rks": "查询 Phigros RKS 值",
  "#p b30": "查询 Phigros 最佳 30 首成绩",
  "#p 绑定 <token>": "绑定 Phigros 存档数据",
  "#p 更新存档": "刷新本地存档数据",
  "#p 单曲成绩 <曲名>": "查询指定曲目的成绩",
  "#p 曲 <曲名>": "查询曲目信息",
  "/osu info": "查询 osu! 玩家信息",
  更新b50: "更新 maimai b50 成绩",
  水鱼绑定: "绑定水鱼查分账号",
  添加机厅: "添加常去的机厅",
  "pcount on": "开启局数统计",
  "/dc login": "登录 dancecube 账号",
  "/dc myrt": "查询我的 RT 值",
  "/dc ap30": "查询 AP 30 首成绩",
  "/dc song": "查询曲目信息",
  BS绑定: "绑定 Beat Saber 成绩账号",
  SS查分: "查询 ScoreSaber 成绩",
  BL查分: "查询 BeatLeader 成绩",
  BS查分: "查询 Beat Saber 成绩",
  "BS search": "搜索 Beat Saber 曲目",
  arc: "制作 Arcaea 表情包",
  "arc -h": "查看表情包指令帮助",
  pjsk: "制作 pjsk 表情包",
  "pjsk -h": "查看表情包指令帮助",

  "#群聊报告": "生成群聊活跃度报告",
  "#词云": "生成群聊词云",
  "#个人词云": "生成个人消息词云",
  谁艾特我: "查询谁艾特过我",
  "#清除艾特数据": "清除艾特记录",
};

export function hintFor(title: string, command: string): string {
  return commandHints[command] ?? featureHints[title] ?? title;
}

const yule = (name: string, title: string, command: string, commands: string[]): CommandEntry => ({
  title,
  command,
  commands,
  link: `/zhiling/yule/${name}`,
});

const shiyong = (name: string, title: string, command: string, commands: string[]): CommandEntry => ({
  title,
  command,
  commands,
  link: `/zhiling/shiyong/${name}`,
});

const acg = (name: string, title: string, command: string, commands: string[]): CommandEntry => ({
  title,
  command,
  commands,
  link: `/zhiling/acg/${name}`,
});

const yinyou = (name: string, title: string, command: string, commands: string[]): CommandEntry => ({
  title,
  command,
  commands,
  link: `/zhiling/yinyou/${name}`,
});

export const commandCategories: CommandCategory[] = [
  {
    name: "娱乐",
    items: [
      yule("jrrp", "JRRP", "jrrp", ["jrrp", "zrrp", "weekjrrp", "monthjrrp", "alljrrp", "运势趋势"]),
      yule("pig", "今日小猪", "今日小猪", ["今日小猪", "昨日小猪", "明日小猪", "我的猪圈", "本周小猪"]),
      yule("miaoyan", "喵言喵语", "喵言喵语", ["喵言喵语"]),
      yule("doro", "今日doro结局", "今日doro结局", ["今日doro结局", "列出doro结局", "添加doro结局", "删除doro结局"]),
      yule("qiandao", "签到", "签到", ["签到", "签到帮助", "好感度", "喵喵币", "收集册"]),
      yule("groupmate_waifu", "娶群友", "娶群友", ["娶群友", "强娶", "分手", "本群cp", "透群友"]),
      yule("whateat", "今天吃什么", "今天早上吃什么", ["今天早上吃什么", "今天早上喝什么", "查看菜单", "查看全部菜单", "添加菜单"]),
      yule("roll", "Roll 随机选择", "/roll", ["/roll", "/roll 100", "/roll 吃饭 睡觉"]),
      yule("ciyun", "WordCloud", "/今日词云", ["/今日词云", "/昨日词云", "/本周词云", "/年度词云", "/历史词云"]),
      yule("bottle", "漂流瓶插件", "扔漂流瓶", ["扔漂流瓶", "捡漂流瓶", "查看漂流瓶", "点赞漂流瓶", "我的漂流瓶"]),
      yule("mypower", "我的超能力", "我的超能力", ["我的超能力"]),
      yule("megumin", "为美好群聊献上爆炎", "爆裂魔法", ["爆裂魔法", "补魔", "补魔帮助"]),
      yule("fabing", "发病语录", "发病", ["发病"]),
      yule("jitang", "心灵鸡汤", "鸡汤", ["鸡汤", "毒鸡汤"]),
      yule("yiyan", "一言", "/一言", ["/一言", "/一言收藏", "/一言收藏列表", "/一言查看收藏", "/一言删除收藏"]),
      yule("KFCcrazythursdayvme50", "疯狂星期四", "疯狂星期四", ["疯狂星期四", "疯狂星期一", "疯狂星期天", "狂乱曜日"]),
      yule("bqbmaker", "表情包制作", "表情包制作", ["表情包制作"]),
      yule("abook", "答案之书", "答案之书", ["答案之书"]),
      yule("image_collection", "综合搜图", "鉴赏帮助", ["鉴赏帮助", "鉴赏菜单", "我的鉴赏次数", "鉴赏一下"]),
      yule("otto", "ottohzys", "hzys -h", ["hzys -h", "hzys 哇袄"]),
      yule("Poke-Plugin", "Poke-Plugin", "#戳戳榜", ["#戳戳榜", "#今日戳戳榜", "#戳戳总榜", "#被戳戳榜", "#查询戳戳"]),
      yule("homo", "恶臭数字论证器", "臭数字", ["臭数字", "找规律"]),
      yule("zhanbu", "趣味占卜", "占卜列表", ["占卜列表", "人设生成", "今天是什么少女", "抽老婆", "异世界转生"]),
      yule("todaywife", "今日老婆", "今日老婆", ["今日老婆", "换老婆", "今日老婆帮助", "今日老婆信息"]),
      yule("todaycatgirl", "今日猫娘", "今日猫娘", ["今日猫娘", "今日猫娘帮助", "今日猫娘信息"]),
      yule("bqb", "表情包仓库", "表情包仓库", ["表情包仓库"]),
      yule("cxh", "抽象话等文本生成", "抽象话", ["抽象话", "火星文", "蚂蚁文", "翻转文字", "故障文字"]),
      yule("bamotalk", "蔚蓝档案对话图", "motalk", ["motalk"]),
      yule("Atri", "ATRI语音包", "Atri真可爱", ["Atri真可爱"]),
      yule("jq", "视奸jq", "jq在干什么", ["jq在干什么", "jq在听什么"]),
      yule("oooo", "齁语加密/解密", "齁语加密", ["齁语加密", "齁语解密"]),
      yule("emoji", "emoji 合成器", "[emoji]+[emoji]", ["[emoji]+[emoji]", "[emoji][emoji]"]),
    ],
  },
  {
    name: "实用",
    items: [
      shiyong("steam", "Steam 功能", "#steam帮助", ["#steam帮助"]),
      shiyong("parser", "视频链接解析", "bm", ["bm", "开启解析", "关闭解析"]),
      shiyong("60sapi", "60s API 查询", "天气", ["天气", "天气预报", "健康分析", "必应壁纸"]),
      shiyong("Multi-Source Daily", "多源日报", "日报", ["日报", "日报详情", "日报列表", "定时日报"]),
      shiyong("miragetank", "幻影坦克", "幻影坦克", ["幻影坦克", "分离幻影坦克", "取消"]),
      shiyong("price", "金/油价查询", "金价", ["金价", "今日油价", "油价推送+设置"]),
      shiyong("withdraw", "撤回插件", "撤回", ["撤回"]),
      shiyong("train", "12306 列车时刻表查询", "train", ["train", "列车信息", "查询列车"]),
      shiyong("disconnect", "断连通知", "/掉线测试", ["/掉线测试"]),
      shiyong("wsk", "谁问你了？", "谁问我了", ["谁问我了"]),
      shiyong("imga", "图片背景消除", "/去背景", ["/去背景", "/rm_bg", "/自定义去背景", "自定义去背景帮助"]),
      shiyong("music", "音乐点歌", "点歌", ["点歌", "网易声音", "网易电台", "解析", "直链"]),
      shiyong("bw", "B站动态和微博动态订阅推送", "#订阅B站推送", ["#订阅B站推送", "#取消B站推送", "#订阅微博推送", "#B站订阅列表", "#优纪帮助"]),
      shiyong("english", "不背单词", "不背单词", ["不背单词"]),
      shiyong("code", "在线运行代码", "code", ["code"]),
      shiyong("status", "系统状态查询", "#状态", ["#状态", "/status"]),
      shiyong("imgS", "以图搜源", "#搜图", ["#搜图", "#imgS帮助"]),
      shiyong("imgts", "图片/漫画翻译插件", "图片翻译", ["图片翻译", "多图片翻译", "切换翻译api"]),
      shiyong("githubcard", "GitHub卡片", "https://github.com/用户名/仓库名", ["https://github.com/用户名/仓库名"]),
    ],
  },
  {
    name: "游戏",
    items: [
      acg("CSGO", "CSGO", "#cs 开箱", ["#cs 开箱", "#cs 签到", "#cs 商城", "#cs 仓库", "#cs 记录"]),
      acg("genshin", "原神", "#面板帮助", ["#面板帮助", "#更新面板", "#扫码登录", "#图鉴帮助", "#原神黄历"]),
      acg("sr", "崩坏：星穹铁道", "#星铁帮助", ["#星铁帮助"]),
      acg("juequ0", "绝区零", "%绑定设备帮助", ["%绑定设备帮助", "%更新展柜面板"]),
      acg("ba", "蔚蓝档案", "ba帮助", ["ba帮助"]),
      acg("ark", "明日方舟/终末地", "skland", ["skland", "skland bind", "skland rogue", "skland gacha", "arkstart", "方舟抽卡"]),
      acg("mingchao", "鸣潮", "~登录", ["~登录", "~签到", "~卡片", "~体力", "~抽卡记录"]),
      acg("guangyu", "光遇", "光遇菜单", ["光遇菜单", "光遇娱乐菜单"]),
      acg("DeltaForce", "三角洲行动", "#三角洲帮助", ["#三角洲帮助", "开始跑刀", "还要吃"]),
      acg("bf", "战地", "bf help", ["bf help", "bf init", "[game] [玩家id]", "bf1 senpai"]),
      acg("l4d2", "求生之路2", "l4d2帮助", ["l4d2帮助", "l4 图片开启", "l4 查找用户", "l4 工坊下载"]),
      acg("wot", "坦克世界", "wot帮助", ["wot帮助"]),
      acg("wws", "战舰世界", "wws help", ["wws help"]),
    ],
  },
  {
    name: "音游",
    items: [
      yinyou("pgr", "Phigros", "#p rks", ["#p rks", "#p b30", "#p 绑定 <token>", "#p 更新存档", "#p 单曲成绩 <曲名>", "#p 曲 <曲名>"]),
      yinyou("osu", "osu!", "/osu info", ["/osu info"]),
      yinyou("maimai", "maimaiDX", "更新b50", ["更新b50", "水鱼绑定", "添加机厅", "pcount on"]),
      yinyou("dancecube", "dancecube", "/dc", ["/dc login", "/dc myrt", "/dc ap30", "/dc song"]),
      yinyou("bs", "Beat Saber", "BS绑定", ["BS绑定", "SS查分", "BL查分", "BS查分", "BS search"]),
      yinyou("arc/arc", "Arcaea表情包制作", "arc", ["arc", "arc -h"]),
      yinyou("pjsk/pjsk", "pjsk表情包制作", "pjsk", ["pjsk", "pjsk -h"]),
    ],
  },
  {
    name: "AI",
    items: [
      {
        title: "Group Insight",
        command: "#群聊报告",
        commands: ["#群聊报告", "#词云", "#个人词云", "谁艾特我", "#清除艾特数据"],
        link: "/zhiling/AI/GroupInsight",
      },
    ],
  },
];
