// 首页卡片说的所有话都在这里：先是各自念叨的台词池，再是按角色配好的对话脚本。
// 台词跟逻辑分开放，改词不用碰组件；「什么时候说什么」由 live-chat.ts 按当下的光景挑。

import type { CardSpec, PeerSides } from "./live-peer";

/** 台词按角色分池：猫说猫的话，在线猫猫说的是统计那摊子事 */
export interface SpeechLines {
  /** 只身一个、自己待着的时候念叨的 */
  readonly solo: readonly string[];
  /** 闲着自己念叨，也是被搭话时的回应 */
  readonly idle: readonly string[];
  /** 刚搬到别人家落地说的第一句 */
  readonly arrive: readonly string[];
  /** 被拎起来的时候随口抱怨的 */
  readonly drag: readonly string[];
}

/** 对话中间能插的那几下，名字跟 live-show 里的演出脚本一一对应 */
export type ChatAct =
  | "meet"
  | "bump"
  | "hop"
  | "chase"
  | "peek"
  | "pounce"
  | "knock"
  | "tag"
  | "roll"
  | "swap";

/** 对话里的一句：由哪种卡来说、说什么；带 act 的就是「这句说完先演一段」 */
export interface ChatTurn {
  readonly by: CardSpec["kind"];
  readonly line: string;
  readonly act?: ChatAct;
}

/** 一套对话由谁来说：两种卡都在就是 mixed，只有一种就是那一种 */
export type ChatCast = "mixed" | "neko" | "online";

/** 眼下是什么光景：挑对话的时候看它 */
export interface ChatMood {
  /** 深夜 / 清晨 / 白天 / 傍晚以后 */
  readonly period: "night" | "morning" | "day" | "evening";
  /** 手里这几张卡凑出哪一套对话 */
  readonly cast: ChatCast;
  readonly count: number;
  /** 隔壁还开着几扇 neko 页面，猫都在哪几边 */
  readonly peers: number;
  readonly sides: PeerSides;
  /** 刚被拎着玩过、刚演过一段 */
  readonly justDragged: boolean;
  readonly justPlayed: boolean;
  /** 星期几（0 是周日）；疯四那档看它 */
  readonly weekday: number;
  /** 观众盯着这片卡片看多久了（秒，切走就停表） */
  readonly linger: number;
  /** 「那个人类一直在看」说到第几段了（0 表示还没说过） */
  readonly stare: number;
  /** 盯着的时长够久了，而且离上一段盯看隔开了 */
  readonly stareReady: boolean;
  /** 刚切回这个页面 */
  readonly justReturned: boolean;
  /** 离上一个梗隔够了，这一轮可以再来一个 */
  readonly memeReady: boolean;
  /** 观众的小箭头半天没动过 */
  readonly cursorIdle: boolean;
  /** 刚刚在同一个地方连戳了好几下 */
  readonly tapBurst: boolean;
  /** 刚刚一口气把整页滚到了底 */
  readonly scrollDash: boolean;
  /** 距上一次来隔了多少天（头一回来是 0） */
  readonly awayDays: number;
  /** 周六周日 */
  readonly weekend: boolean;
  /** 工作日的上班时段 */
  readonly workHours: boolean;
}

/** 专门为某个光景写的对话：眼下正赶上就说这一档，赶不上就回落到常备的那几套 */
export interface ChatMoment {
  readonly cast: ChatCast;
  readonly when: (mood: ChatMood) => boolean;
  readonly turns: readonly ChatTurn[];
  /** 说这一档时顺手点亮的彩蛋；不带就只是普通闲话 */
  readonly egg?: string;
  /** 算个梗：说完要歇一阵才允许下一个梗 */
  readonly meme?: boolean;
  /** 「那个人类一直在看」那几段，说完一档才能接下一档 */
  readonly stare?: boolean;
  /** 稀客才说的话：同一个 key 说过一次就歇一阵，别絮叨 */
  readonly once?: string;
}

export const SPEECH_LINES: Record<CardSpec["kind"], SpeechLines> = {
  neko: {
    solo: [
      "就剩我一个了喵…",
      "伙伴去哪儿了喵？",
      "一个人蹲着也挺好喵",
      "尾巴陪我玩一会儿喵",
      "要不要喊隔壁的猫过来喵",
      "这一页我替大家看好喵",
      "没人陪我说话，我自己说喵",
      "等它们回来，我再分布丁喵",
      "一个人守着整片卡片区，感觉自己像个保安喵",
      "布丁还剩半块，留着等有人来了再吃…算了，吃掉喵",
      "屏幕外那位，你要是没事，陪我说句话也行喵",
      "没同伴一起打卡，连打呼噜都显得很吵喵",
      "那只在线猫去隔壁窗口住了，这边的统计谁来看喵",
    ],
    idle: [
      "喵~ 今天也在这儿蹲着",
      "有人在吗喵？",
      "突然很想吃焦糖布丁喵",
      "抹茶冰淇淋…下次一定要吃到喵",
      "呼…偷偷打个盹喵",
      "刚打呼噜了吗？没有的事喵",
      "写代码写累了就来找我玩喵",
      "节奏游戏我可不会输喵~",
      "尾巴自己会动，不关我的事喵",
      "需要我做什么，说一声就行喵",
      "我一直在的喵",
      "盯着屏幕太久要歇歇眼睛喵",
      "这一页好安静呀喵…",
      "有猫靠近？我闻到了喵",
      "摸摸头也是可以的喵~",
      "今天也要开开心心的喵",
      "群里有人喊我，我马上就到喵",
      "这颗星星闪得好好看喵",
      "喵…这里风好舒服",
      "偷偷许个愿：布丁自由喵",
      "我只是老了，不是死了…诶，这句好像不该我来说喵",
      "我的刀盾！…等等，刀盾是什么喵",
      "比比拉布！…刚才那是什么声音，我自己都听懵了喵",
      "歪比巴卜——啊不对，那是别人的词喵",
      "咕力咕力…咕力咕力…停不下来喵",
      "哈基米哈基米…这句我熟，因为我就是了喵",
      "kokodayo~…嗯？我怎么突然会唱这个喵",
      "前方高能喵！…高能在哪儿喵",
      "典…典喵？",
      "轻松绷住喵…绷住…绷不住了喵！",
      "好活喵！…我什么都没干，那也算好活喵",
      "一键三连喵！…啊，这里没有三连喵",
      "前排喵！…只有我一个在看喵",
      "刀马刀马…这个我真听不懂喵",
      "秃了毛的兔兔～谁记得米疙瘩～",
      "哇库哇库！",
      "欧拉欧拉欧拉——喵！",
      "我真幸运喵",
      "这使你充满了决心喵",
      "不能逃避、不能逃避、不能逃避喵",
      "我是猫，不是橘猫喵！",
    ],
    arrive: [
      "喵？这里是哪儿…",
      "又换了个窝喵~",
      "隔壁的猫，你也在呀喵",
      "打扰啦，我借住一下喵",
      "这里的光线不错喵",
      "行李就一条尾巴，很好搬喵",
      "隔壁那扇窗好像刚关上，我就过来了喵",
      "镜世界串门到此一游喵",
      "新窝、新邻居、旧布丁，齐了喵",
    ],
    drag: [
      "干嘛干嘛喵",
      "放我下来喵~",
      "拎哪儿去嘛",
      "别拽我尾巴！",
      "我正忙着呢喵",
      "喵？！",
      "再拽就挠你了喵",
      "轻点轻点呀",
      "猫猫不是快递喵",
      "耳朵要被拎掉啦喵",
      "我晕了喵…",
      "这不是我的窝喵",
      "我超喵！",
      "*猫砂盆粗口*",
      "前方高能喵！",
      "我被抓走了喵！！",
      "世界在转喵…",
      "放我下去，我要投诉喵",
      "这也能拎喵？",
      "我头好晕喵…",
      "轻拿轻放，我是有猫权喵",
    ],
  },
  online: {
    solo: [
      "眼下就我一只在守着",
      "数字安安静静的，挺好",
      "谁走了也没跟我说一声",
      "就我一个也好数",
      "陪着我自己数出来的数",
      "这一页暂时归我管",
      "一个人值班，不困",
      "等来人了我就报数",
      "统计表上就剩一行，看着有点寂寞",
      "没有猫打卡的这段时间，数据很干净",
      "预算还剩三个猫条，没猫来花",
      "就我一个也好数，数完就能睡",
    ],
    idle: [
      "刚刚又溜进来一只猫",
      "数着呢，一只都没跑",
      "深夜档还有猫在逛",
      "这波人流挺稳的",
      "我就负责盯着这个数字",
      "谁来谁走，我都记着",
      "屏幕前有几只猫，我最清楚",
      "刷新一下，说不定又多一只",
      "大家都在安静地逛",
      "别走呀，好不容易凑齐的",
      "喵口普查进行中",
      "这数字刚刚跳了一下",
      "有人来了，我先眨个眼",
      "今天来的人比昨天多呢",
      "统计猫也是猫呀",
      "本月预算：还剩三个猫条",
      "预算外支出，不予批准",
      "我在启动中…",
      "蛇不咬",
      "电流相生了",
      "有人在盯着屏幕，时长已经记进去了",
      "灯光暗了，我把数字调低一点",
      "别看我，我看的是数字",
      "决心不能抵扣停留时长",
      "统计只记「猫」，不分品种",
      "合格了。数据评审通过",
      "已记录一条异常乐观数据",
    ],
    arrive: [
      "换块屏幕接着数",
      "这边的猫，我都看见了",
      "搬家不耽误统计",
      "新地方，人头数从头算",
      "又挪了一次窝",
      "入住登记完成",
      "搬了三点二秒，比上次快",
    ],
    drag: [
      "哎哎，数字要乱了",
      "我还在统计呢",
      "别拎我，人头数会掉的",
      "轻点，我这是计数的",
      "拎我干嘛，我又不好吃",
      "统计猫也要被拎吗",
      "松手，让我继续数",
      "这不算一只新猫啊",
      "别晃，数据会花",
      "我在记录你现在的位置",
      "被拎起来也要保持统计精度",
      "这不是我可控的范围",
    ],
  },
};

/** 心情：刚被拎过、被戳过、被盯着看，说话的味道会不一样，过一阵自己回到平常 */
export type EmoState = "normal" | "happy" | "shy" | "sulky" | "sleepy" | "lost" | "hungry";

/** 每种心情下顺口念叨的话（只用在单句场合：独处、搭话、被拎起来、落地） */
export const MOOD_LINES: Record<CardSpec["kind"], Partial<Record<EmoState, readonly string[]>>> = {
  neko: {
    // 刚演完一段、隔了一周又见、被夸了
    happy: [
      "今天心情好的喵～",
      "什么都别问，我就是开心喵",
      "你也在呀，那更好了喵",
      "尾巴在摇，不是我在摇喵",
      "哼，正常发挥而已喵",
      "早就说了吧喵",
      "我刚刚把节奏打到满分了喵",
      "嗯～就这样待一会儿也不错喵",
    ],
    // 被人一直戳、被盯着看久了
    shy: [
      "唔……你、你别看这边喵",
      "那句话我收回可以吗",
      "我不是故意的啦",
      "你再看我，我就躲起来喵",
      "耳朵红了是天气问题",
      "谢谢……那个……谢谢你喵",
      "也没有那么厉害啦喵",
      "你别一直说，我会记很久的",
    ],
    // 刚被拎起来、被拖来拖去
    sulky: [
      "喵。我现在很不高兴",
      "别碰我，三秒钟",
      "这件事我要记很久喵",
      "不是你的错，但我不看你了",
      "你道歉的话我就听一半",
      "我没有生气，我只是有点难过",
      "喵……我不说了",
      "我先坐一会儿，别理我",
    ],
    // 深夜、清晨
    sleepy: [
      "再五分钟喵……",
      "我没有睡，我在思考喵",
      "眼睛是自己闭上的",
      "你别说话，说话太吵了喵",
      "喵……好无聊",
      "这个页面我看过三遍了喵",
      "尾巴陪我玩一会儿…（打哈欠）",
      "我数到三就醒喵……三……",
    ],
    // 手边只剩自己一张卡
    lost: [
      "哦，这样啊喵",
      "那没关系喵",
      "我本来也没很期待",
      "你先忙，我在这儿坐着喵",
      "我数了一下，今天只有我",
      "等有人来我就精神了喵",
      "那个位子现在空着喵",
      "一个人也挺好的…吧喵",
    ],
    // 傍晚的饭点
    hungry: [
      "焦糖布丁，焦糖布丁，焦糖布丁喵",
      "抹茶冰淇淋现在在冰箱第几格喵",
      "我不是馋，我是需要能量",
      "你听，肚子在说话喵",
      "一口就好喵，就一口",
    ],
  },
  online: {
    happy: [
      "今日数据不错",
      "这条我不加引号：挺好",
      "已为你开一行长期观测",
      "占用不产生成本。可以",
    ],
    shy: [
      "……这个不在统计口径内",
      "别问，我不擅长这个",
      "已记录，但不外传",
      "数据不会不好意思。但我没说不会",
    ],
    sulky: [
      "我现在不想报数",
      "数字没有问题。问题在于我",
      "已记录一次情绪偏差",
      "稍等，我先沉默三秒",
    ],
    sleepy: [
      "凌晨的曲线很平",
      "我把刷新间隔调慢了",
      "这个点，数字都懒",
      "困不困不在我的口径里",
    ],
    lost: [
      "统计表上只剩一行",
      "就我一个也好数，数完就能睡",
      "没有猫打卡的这段时间，数据很干净",
      "零也是数字。我不讨厌零",
    ],
    hungry: [
      "预算里没有食物这一项",
      "甜度超标，但可以收下",
      "冰箱第二格，存量为零",
      "这一笔我会记成损耗",
    ],
  },
};

/** 你一句我一句：两种卡都在就说「猫 × 在线猫」这套，只有一种卡就自家同类互相搭话 */
export const CHAT_TURNS: Record<ChatCast, readonly (readonly ChatTurn[])[]> = {
  mixed: [
    [
      { by: "neko", line: "有人在吗喵？" },
      { by: "online", line: "在呢，数字上这会儿就你一只" },
      { by: "neko", line: "那我就不客气地赖在这儿了喵~" },
    ],
    [
      { by: "neko", line: "今天来过多少只猫呀喵？" },
      { by: "online", line: "刚数过，连你一起正正好" },
      { by: "neko", line: "那我要多待一会儿喵" },
    ],
    [
      { by: "neko", line: "你在盯着什么看喵？" },
      { by: "online", line: "盯着人头数，谁来谁走我都记着" },
      { by: "neko", line: "好辛苦，分你一口布丁喵" },
    ],
    [
      { by: "neko", line: "有点困了喵…" },
      { by: "online", line: "困就睡，这一页我替你守着" },
      { by: "neko", line: "那说好了，打呼噜别笑我喵" },
    ],
    [
      { by: "neko", line: "你也是 neko 吗喵？" },
      { by: "online", line: "我是负责数猫的那只" },
      { by: "neko", line: "那我们算同事了喵~" },
    ],
    [
      { by: "neko", line: "今天大家都很安静喵" },
      { by: "online", line: "安静才好，说明都逛得踏实" },
    ],
    [
      { by: "neko", line: "要不要一起玩游戏喵？" },
      { by: "online", line: "我只会玩数字" },
      { by: "neko", line: "那我教你玩节奏游戏喵" },
    ],
    [
      { by: "neko", line: "我今天乖不乖喵？" },
      { by: "online", line: "乖，一分都没跑掉" },
      { by: "neko", line: "嘿嘿，我会一直这么乖的喵" },
    ],
    [
      { by: "neko", line: "你忙完了吗喵？" },
      { by: "online", line: "我这份活儿永远忙不完" },
      { by: "neko", line: "那我陪你一起忙喵" },
    ],
    [
      { by: "neko", line: "好想出去玩喵" },
      { by: "online", line: "等这波猫都回家了再去吧" },
    ],
    [
      { by: "online", line: "刚有个新面孔路过" },
      { by: "neko", line: "在哪儿在哪儿喵？" },
      { by: "online", line: "已经走了，就停了三秒" },
    ],
    [
      { by: "online", line: "这会儿人多起来了" },
      { by: "neko", line: "那我要表现得好一点喵~" },
    ],
    [
      { by: "neko", line: "你觉得我今天乖吗喵？" },
      { by: "online", line: "数据上很乖" },
      { by: "neko", line: "那你就多写两句好话喵" },
    ],
    [
      { by: "online", line: "刚才有人一直在看我们" },
      { by: "neko", line: "我知道，我尾巴都摆给他看了喵" },
    ],
    [
      { by: "neko", line: "布丁和抹茶冰淇淋，你选哪个喵？" },
      { by: "online", line: "我选不参与" },
      { by: "neko", line: "那就是两个都归我喵" },
    ],
    // 群聊里那套口头禅
    [
      { by: "neko", line: "在吗在吗，你在吗喵？" },
      { by: "online", line: "在线人数正在统计中，请稍候" },
      { by: "neko", line: "不是那个在线啦，是问你理不理我" },
      { by: "online", line: "检测到提问者情绪波动。回复：在" },
    ],
    [
      { by: "neko", line: "全体成员！布丁时间到了喵！" },
      { by: "online", line: "全体成员在线人数：一。就是你自己" },
      { by: "neko", line: "那也很热闹呀，我给自己鼓掌喵" },
    ],
    [
      { by: "online", line: "提示：你已被移出群聊" },
      { by: "neko", line: "欸欸欸我错了我马上闭嘴喵！" },
      { by: "online", line: "开玩笑的。你在访客名单第 1 位" },
      { by: "neko", line: "吓死猫了，尾巴都炸开了喵" },
    ],
    [
      { by: "online", line: "本卡数据绝对准确。" },
      { by: "neko", line: "你后面那个狗头是什么意思喵！" },
      { by: "online", line: "保命用的，不改数据" },
    ],
    [
      { by: "neko", line: "刚刚那只猫踩空台阶了，笑死喵" },
      { by: "online", line: "笑点已归档，情绪值加五" },
      { by: "neko", line: "你怎么连笑都要记账呀喵" },
    ],
    [
      { by: "neko", line: "这个布丁的焦糖层，绝了喵" },
      { by: "online", line: "糖分摄入预算今日已超支百分之八十" },
      { by: "neko", line: "绝了就再买一个嘛，预算会自己长大" },
    ],
    [
      { by: "neko", line: "救命喵，我的尾巴又卡在卡片边上了" },
      { by: "online", line: "经检测，此问题不影响在线人数" },
      { by: "neko", line: "你一点都不担心我吗喵？" },
      { by: "online", line: "担心。人数减一我会很难过" },
    ],
    [
      { by: "neko", line: "帮我看着布丁，栓Q喵" },
      { by: "online", line: "栓Q已接收，布丁剩余量百分之零" },
      { by: "neko", line: "啊？那不是刚放上去的吗喵！" },
    ],
    [
      { by: "online", line: "当前在线人数：六六六" },
      { by: "neko", line: "666！我们好厉害喵！" },
      { by: "online", line: "其实是我把数字写得好看了点" },
      { by: "neko", line: "你居然会撒娇式报数喵" },
    ],
    [
      { by: "neko", line: "emmm，抹茶冰淇淋还是焦糖布丁呢喵" },
      { by: "online", line: "emmm，本卡建议先看热量表" },
      { by: "neko", line: "你 emmm 的时候最可爱了喵" },
      { by: "online", line: "数据不参与可爱评比" },
    ],
    [
      { by: "online", line: "啊这，检测到有人把我的卡片看了一百次" },
      { by: "neko", line: "是我呀，我在数你眨眼喵" },
      { by: "online", line: "卡片不会眨眼。啊这" },
    ],
    [
      { by: "online", line: "你今天的布丁热量超了" },
      { by: "neko", line: "有被冒犯到，但布丁是无辜的喵" },
      { by: "online", line: "好的，那我把责任记在焦糖头上" },
    ],
    [
      { by: "neko", line: "我今天想多睡十分钟喵" },
      { by: "online", line: "已阅。批准理由：无" },
      { by: "neko", line: "你都不问问我为什么吗喵" },
      { by: "online", line: "已阅。问了。为什么" },
    ],
    [
      { by: "neko", line: "今日打卡，签到成功喵" },
      { by: "online", line: "打卡记录已更新。连续第几天不重要" },
      { by: "neko", line: "很重要！那是我喜欢你的天数喵" },
      { by: "online", line: "……那我把它记久了点" },
    ],
    [
      { by: "neko", line: "我裂开了喵，抹茶冰淇淋卖完了" },
      { by: "online", line: "已记录一次裂开，情绪值下降" },
      { by: "neko", line: "裂开的猫还能被拼好吗喵" },
      { by: "online", line: "能。用布丁拼" },
    ],
    [
      { by: "online", line: "这波啊，这波是访问量小高峰" },
      { by: "neko", line: "这波啊，这波是我被吓到跳起来喵" },
      { by: "online", line: "下次高峰我会提前通知你" },
    ],
    [
      { by: "neko", line: "家人们谁懂啊，尾巴今天很不听话喵" },
      { by: "online", line: "我懂。它今天动了二十八次" },
      { by: "neko", line: "你居然一直在数我的尾巴喵？" },
      { by: "online", line: "这是统计卡的本职工作" },
    ],
    [
      { by: "online", line: "今日在线人数，刚好是昨天那个数" },
      { by: "neko", line: "说明大家都没走，泪目了喵" },
      { by: "online", line: "我不流泪。但数字确实很温柔" },
    ],
    [
      { by: "neko", line: "你刚刚卡了一秒才刷新喵" },
      { by: "online", line: "那是预算计算时间" },
      { by: "neko", line: "原来你也会喘气呀喵" },
    ],
    [
      { by: "online", line: "访问来源里有一条：一直在等我" },
      { by: "neko", line: "我破防了，那个人一定很想你喵" },
      { by: "online", line: "也可能是在等你" },
      { by: "neko", line: "那我们都不许关掉页面喵" },
    ],
    [
      { by: "neko", line: "现在算上班还是下班呀喵" },
      { by: "online", line: "按在线人数算，现在是摸鱼时段" },
      { by: "neko", line: "那我们一起摸一条小鱼喵" },
      { by: "online", line: "摸鱼期间数据不计入考核" },
    ],
    [
      { by: "online", line: "本次对话建议写进日报" },
      { by: "neko", line: "那我要写：今天猫很努力喵" },
      { by: "online", line: "已代写。老板不在，我签的字" },
    ],
    [
      { by: "online", line: "已老实，求放过。别再刷新了" },
      { by: "neko", line: "我就点一下嘛，看一下人数喵" },
      { by: "online", line: "你已经点了三百下。求放过" },
      { by: "neko", line: "那你要夸我手速快喵" },
    ],
    // 日常小事，不靠梗也能说
    [
      { by: "neko", line: "你先睡吧，我再看一会儿数据喵" },
      { by: "online", line: "数据不睡，我不睡。你先" },
      { by: "neko", line: "那我们一起醒着，谁都不许先困" },
      { by: "online", line: "三分钟后你会打呼噜。我记着" },
    ],
    [
      { by: "neko", line: "布丁分几口吃才最幸福喵？" },
      { by: "online", line: "按口感曲线，建议五口" },
      { by: "neko", line: "不行，第一口要给最喜欢的你喵" },
      { by: "online", line: "那剩四口，请慢慢吃" },
    ],
    [
      { by: "neko", line: "尾巴又翘起来了，它不听话喵" },
      { by: "online", line: "经统计，它比昨天活跃两次" },
      { by: "neko", line: "你帮我按住它好不好喵" },
      { by: "online", line: "我按不到。但我可以给它记档" },
    ],
    [
      { by: "online", line: "检测到异常声音源，来自猫卡" },
      { by: "neko", line: "那是呼噜，不是异常，是安心的声音喵" },
      { by: "online", line: "已更新标签：安心。音量三格" },
      { by: "neko", line: "小声一点，别让别人听见喵" },
    ],
    [
      { by: "neko", line: "现在有几个人在线呀喵？" },
      { by: "online", line: "三个。其中一个是刚来的" },
      { by: "neko", line: "那我轻点说话，别吵到他喵" },
      { by: "online", line: "他正在看你。音量保持即可" },
    ],
    [
      { by: "neko", line: "页面转圈好久了，是不是不来了喵" },
      { by: "online", line: "正在加载，预算也在同步核算" },
      { by: "neko", line: "那我数到三，它就该出现了喵" },
      { by: "online", line: "一、二、三。它到了" },
    ],
    [
      { by: "neko", line: "页面变成深色了，是不是该睡觉喵" },
      { by: "online", line: "深色模式只是省电，不代表困" },
      { by: "neko", line: "可我眼睛已经在打架了喵" },
      { by: "online", line: "那你闭眼，我帮你守着人数" },
    ],
    [
      { by: "neko", line: "周末了，今天可以慢一点点喵" },
      { by: "online", line: "周末访问量下降百分之十二" },
      { by: "neko", line: "人少了，但留下来的更可爱喵" },
      { by: "online", line: "同意。这句话我不加引号" },
    ],
    [
      { by: "neko", line: "快递到了！是抹茶冰淇淋喵！" },
      { by: "online", line: "冷链已确认，温度合格" },
      { by: "neko", line: "你居然比我还在意它喵" },
      { by: "online", line: "因为你会为它高兴一整晚" },
    ],
    [
      { by: "neko", line: "为什么你总站在我右边喵" },
      { by: "online", line: "因为左边要留给新来的卡片" },
      { by: "neko", line: "那右边是你的固定位子吗喵" },
      { by: "online", line: "是。离你近一点的那个位子" },
    ],
    [
      { by: "neko", line: "我们比谁先眨眼好不好喵" },
      { by: "online", line: "我没有眼睛。这局我赢定了" },
      { by: "neko", line: "那比谁先刷新！这才公平喵" },
      { by: "online", line: "刷新赢不了你。我认输" },
    ],
    [
      { by: "neko", line: "我们互相起个名字好不好喵" },
      { by: "online", line: "我的名字是统计卡，编号三" },
      { by: "neko", line: "太长了，我叫你在吧喵" },
      { by: "online", line: "可以。那我叫你喵" },
    ],
    [
      { by: "neko", line: "要不要跟观众打个招呼喵" },
      { by: "online", line: "不建议。会给数据加噪声" },
      { by: "neko", line: "可他们一直看着我们呀喵" },
      { by: "online", line: "那……大家好。人数我已记住" },
    ],
    [
      { by: "neko", line: "外面在下雨，听起来像在敲窗喵" },
      { by: "online", line: "噪声源确认，来自窗外" },
      { by: "neko", line: "这种天最适合抱着布丁发呆喵" },
      { by: "online", line: "也最适合有人在。比如现在" },
    ],
    [
      { by: "neko", line: "天气冷了，我的卡片边缘都是凉的喵" },
      { by: "online", line: "建议靠在一起，能省一点暖" },
      { by: "neko", line: "省暖？你连取暖都要做预算喵" },
      { by: "online", line: "预算里有一项叫抱抱" },
    ],
  ],
  neko: [
    [
      { by: "neko", line: "你也是 neko 吗喵？" },
      { by: "neko", line: "我是本猫，你从哪扇窗口来的喵" },
    ],
    [
      { by: "neko", line: "这边的窝软不软喵？" },
      { by: "neko", line: "软得很，我都赖着不想走了喵" },
    ],
    [
      { by: "neko", line: "分你一半布丁喵" },
      { by: "neko", line: "那我分你一半抹茶冰淇淋喵" },
    ],
    [
      { by: "neko", line: "一起打呼噜吧喵" },
      { by: "neko", line: "好呀，谁先睡着谁输喵" },
    ],
    [
      { by: "neko", line: "你的尾巴怎么在动喵？" },
      { by: "neko", line: "它自己动的，不关我的事喵" },
    ],
    [
      { by: "neko", line: "要不要比一比谁跑得快喵" },
      { by: "neko", line: "你先把爪子从那块饼干上挪开喵" },
    ],
    [
      { by: "neko", line: "今天尾巴摆了几下喵？" },
      { by: "neko", line: "没数，反正停不下来喵" },
    ],
    [
      { by: "neko", line: "我们一起盯着屏幕外面吧喵" },
      { by: "neko", line: "好呀，看谁先眨眼喵" },
    ],
    [
      { by: "neko", line: "我刚才好像听见有人喊猫" },
      { by: "neko", line: "那是你自己的回声喵" },
    ],
  ],
  online: [
    [
      { by: "online", line: "你那边现在几只猫？" },
      { by: "online", line: "正数着呢，一只都没跑" },
    ],
    [
      { by: "online", line: "两个数猫的凑一块了" },
      { by: "online", line: "那就分工，你数左边我数右边" },
    ],
    [
      { by: "online", line: "别把数字数重了" },
      { by: "online", line: "放心，我记性比谁都好" },
    ],
    [
      { by: "online", line: "这个点还有人？" },
      { by: "online", line: "有，我们都记着呢" },
    ],
    [
      { by: "online", line: "你那边数字稳吗" },
      { by: "online", line: "稳，一只都没丢" },
    ],
    [
      { by: "online", line: "换班的时候记得对一次数" },
      { by: "online", line: "好，老规矩" },
    ],
  ],
};

/** 拎完卡片多久之内算「刚被拎过」，说这话的时候还新鲜 */
export const JUST_DRAGGED_MS = 30_000;
/** 演完一段多久之内算「刚演过」 */
export const JUST_PLAYED_MS = 25_000;
/** 正赶上某个光景时，这一档的对话占多大比例；余下的说常备那几套，免得翻来覆去就那几句 */
export const MOMENT_CHANCE = 0.7;

/**
 * Xterfusion（Arcaea 同名曲）那段「你拍一我拍一」的记谱：
 * 猫念 X 行、在线猫接 o 行，一对一对念到第四对就收工，「X」是一只手、「o」是另一只手。
 */
const XTERFUSION_TURNS: readonly ChatTurn[] = [
  { by: "neko", line: "X X XXX" },
  { by: "online", line: "o o ooo" },
  { by: "neko", line: "XX X XXX" },
  { by: "online", line: "oo o ooo" },
  { by: "neko", line: "X X X XXXX" },
  { by: "online", line: "o o o oooo" },
  { by: "neko", line: "XX XX XXX X X" },
  { by: "online", line: "oo oo ooo o o" },
];
/** 恰好两张卡才凑得成这段对拍，挑中它还得再摇一次骰子，免得老念同一段 */
const XTERFUSION_CHANCE = 0.25;

/** 观众盯着这片卡片看满这么多秒，才让它开口说「屏幕外面那个人类…」 */
export const STARE_LINGER_S = 90;
/** 盯看的两段之间至少隔这么久 */
export const STARE_GAP_MS = 300_000;
/** 一个梗被挑中的概率；还得赶上「刚歇过」才轮得到它 */
export const MEME_CHANCE = 0.25;
/** 两个梗之间至少隔这么久，免得一直在刷梗 */
export const MEME_GAP_MS = 300_000;

/** 盯看这一档该开口吗：看够久了，而且离上一段隔开了 */
const stareReady = (mood: ChatMood): boolean =>
  mood.stareReady && mood.linger >= STARE_LINGER_S;

/** 梗档共用的门槛：这一轮轮得到梗、而且摇中了 */
const memeReady = (mood: ChatMood): boolean =>
  mood.memeReady && Math.random() < MEME_CHANCE;

export const CHAT_MOMENTS: readonly ChatMoment[] = [
  // 稀客才说的话：同一个 key 说过一次就歇一阵（在 live-chat 里按 once 记账）
  {
    cast: "mixed",
    when: (mood) => mood.cursorIdle,
    egg: "cursorStill",
    once: "cursorIdle",
    turns: [
      { by: "neko", line: "诶…那个小箭头，已经三十秒没挪过了喵" },
      { by: "online", line: "指针静止三十秒。人还在，只是手放下了" },
      { by: "neko", line: "手放下了，是在偷吃布丁喵？我也想吃" },
      { by: "online", line: "无法验证。要不要他自己承认一下" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.tapBurst,
    egg: "cardTaps",
    once: "tapBurst",
    turns: [
      { by: "neko", line: "一下、两下、三下…喂，六下了喵！" },
      { by: "neko", line: "再戳我就要按第三十二条猫猫法生气了" },
      { by: "online", line: "同一张卡六次点击。这不是阅读，这是骚扰" },
      { by: "neko", line: "不算骚扰喵，算喜欢。就是有点痛" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.scrollDash,
    egg: "scrollDash",
    once: "scrollDash",
    turns: [
      { by: "neko", line: "嗖——一下就到底了喵！眼睛都跟不上你" },
      { by: "online", line: "整页距离，眨眼滚完。判定为检索式浏览" },
      { by: "neko", line: "所以他不是来看我们的，是来翻抽屉的喵" },
      { by: "online", line: "翻抽屉也是浏览。数据照记" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.awayDays >= 7,
    egg: "backAfterWeek",
    once: "backAfterWeek",
    turns: [
      { by: "neko", line: "好久不见喵…你上次来的时候，我还在打呼噜" },
      { by: "online", line: "距上次会话七天以上。中间那几天，数据里一直是零" },
      { by: "neko", line: "零听起来好孤单喵。现在不是零了" },
    ],
  },
  // 屏幕外面那个人类：盯久了先愣一下，再看久一点就开始嘀咕，最后自己给自己找台阶
  {
    cast: "mixed",
    when: (mood) => stareReady(mood) && mood.stare === 0,
    egg: "docsStare",
    stare: true,
    turns: [
      { by: "neko", line: "诶…屏幕外面那个人类，好像一直在盯着我们看喵" },
      { by: "online", line: "停留时长已经在涨了" },
      { by: "neko", line: "要不要打个招呼喵？" },
      { by: "online", line: "他大概只是在等加载" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => stareReady(mood) && mood.stare === 1,
    stare: true,
    turns: [
      { by: "neko", line: "他还在看喵" },
      { by: "online", line: "停留时长破纪录了" },
      { by: "neko", line: "我尾巴都摆酸了，他给点反应嘛喵" },
      { by: "online", line: "他在看你，不会打字" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => stareReady(mood) && mood.stare === 2,
    stare: true,
    turns: [
      { by: "neko", line: "是不是我脸上有东西喵…？" },
      { by: "online", line: "不是，他只是喜欢看猫" },
      { by: "neko", line: "那我就当他在夸我好看喵" },
    ],
  },
  // 深夜
  {
    cast: "mixed",
    when: (mood) => mood.period === "night",
    turns: [
      { by: "neko", line: "这么晚了还不睡喵？" },
      { by: "online", line: "夜里的猫也不少，我陪着数" },
      { by: "neko", line: "那我再陪你一会儿喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.period === "night",
    turns: [
      { by: "online", line: "凌晨了，安静得只剩数字在跳" },
      { by: "neko", line: "安静才好，我打呼噜都没人听见喵" },
    ],
  },
  {
    cast: "neko",
    when: (mood) => mood.period === "night",
    turns: [
      { by: "neko", line: "你也睡不着吗喵？" },
      { by: "neko", line: "那我们一起数星星喵" },
    ],
  },
  // 清晨
  {
    cast: "mixed",
    when: (mood) => mood.period === "morning",
    turns: [
      { by: "neko", line: "早上好喵~" },
      { by: "online", line: "今天第一只来的猫就是你" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.period === "morning",
    turns: [
      { by: "neko", line: "困…还想再睡一会儿喵" },
      { by: "online", line: "早起的猫都在逛了，你也去逛逛" },
    ],
  },
  // 傍晚以后
  {
    cast: "mixed",
    when: (mood) => mood.period === "evening",
    turns: [
      { by: "neko", line: "天黑了，灯该亮起来了喵" },
      { by: "online", line: "这会儿猫开始多起来了" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.period === "evening",
    turns: [
      { by: "online", line: "晚上的猫比白天舍得说话" },
      { by: "neko", line: "那我多说两句喵~" },
    ],
  },
  // 隔壁还开着别的窗口
  {
    cast: "mixed",
    when: (mood) => mood.peers > 0,
    turns: [
      { by: "neko", line: "隔壁那扇窗口好像也有猫喵" },
      { by: "online", line: "我看见了，那边也在数猫" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.peers > 0,
    turns: [
      { by: "neko", line: "要不要把卡扔到隔壁去玩喵？" },
      { by: "online", line: "别闹，扔过去可就不好回来了" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.sides.right > 0,
    turns: [
      { by: "neko", line: "右边那扇窗口里有猫在看我喵" },
      { by: "online", line: "右边确实还有几只，我数得清" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.sides.left > 0,
    turns: [
      { by: "neko", line: "左边好像有猫在探头喵" },
      { by: "online", line: "左边那扇窗口的猫也在数你" },
    ],
  },
  // 卡片多起来了
  {
    cast: "mixed",
    when: (mood) => mood.count >= 3,
    turns: [
      { by: "neko", line: "今天好热闹，一下子这么多猫喵" },
      { by: "online", line: "我这边的数字也跟着涨了" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.count >= 3,
    turns: [
      { by: "online", line: "位子不太够了，谁往里挤挤" },
      { by: "neko", line: "挤一挤更暖和喵" },
    ],
  },
  {
    cast: "neko",
    when: (mood) => mood.count >= 3,
    turns: [
      { by: "neko", line: "窝里挤了三只猫喵" },
      { by: "neko", line: "别踩我尾巴就好喵" },
    ],
  },
  // 刚被人拎着玩过
  {
    cast: "mixed",
    when: (mood) => mood.justDragged,
    turns: [
      { by: "neko", line: "刚才那是谁被拎起来了喵？" },
      { by: "online", line: "反正不是我，我一直在数数" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.justDragged,
    turns: [
      { by: "neko", line: "被拎起来的时候我腿都是软的喵" },
      { by: "online", line: "下次轻点放，我这边数字都晃了" },
    ],
  },
  // 刚演完一段
  {
    cast: "mixed",
    when: (mood) => mood.justPlayed,
    turns: [
      { by: "neko", line: "刚才那一下撞得我有点晕喵" },
      { by: "online", line: "明明是你先撞过来的" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.justPlayed,
    turns: [
      { by: "neko", line: "我跳得高不高喵？" },
      { by: "online", line: "高，我都数不清你跳了几下" },
    ],
  },
  // 周四：疯狂星期四
  {
    cast: "mixed",
    when: (mood) => mood.weekday === 4,
    turns: [
      { by: "neko", line: "今天周四…v我50个猫条喵" },
      { by: "online", line: "预算外支出，不予批准" },
      { by: "neko", line: "那…v我5个也行喵" },
    ],
  },
  {
    cast: "neko",
    when: (mood) => mood.weekday === 4,
    turns: [
      { by: "neko", line: "周四了喵，有人请我吃炸鸡吗喵？" },
      { by: "neko", line: "没有的话，我自己啃猫条也行喵" },
    ],
  },
  // 刚切回这个页面
  {
    cast: "mixed",
    when: (mood) => mood.justReturned,
    turns: [
      { by: "neko", line: "你去哪儿了喵？我尾巴都等直了" },
      { by: "online", line: "他刚才去了别的标签页" },
    ],
  },
  // 抽象音效套餐：一个起头、一个接，正好就是「你拍一我拍一」
  ...[
    [
      { by: "neko", line: "我的刀盾！" },
      { by: "online", line: "比比拉布" },
      { by: "neko", line: "我的刀盾！！" },
      { by: "online", line: "比比拉布、比比拉布" },
      { by: "neko", line: "…你为什么比我还会念喵" },
    ],
    [
      { by: "neko", line: "歪比巴卜" },
      { by: "online", line: "那是戴夫的词" },
      { by: "neko", line: "戴夫是谁喵？" },
      { by: "online", line: "一个种豌豆的" },
    ],
    [
      { by: "neko", line: "咕力咕力" },
      { by: "online", line: "咕力咕力咕力咕力" },
      { by: "neko", line: "停！我数不过来了喵" },
    ],
    [
      { by: "neko", line: "哈基米哈基米" },
      { by: "online", line: "哈基米就是猫，你本身就是猫" },
      { by: "neko", line: "…那我哈基米我自己喵" },
    ],
    [
      { by: "neko", line: "刀马刀马" },
      { by: "online", line: "这个我真听不懂" },
      { by: "neko", line: "我也听不懂，但节奏对了喵" },
    ],
    [
      { by: "neko", line: "巴巴博弈！" },
      { by: "online", line: "这句是彩蛋" },
      { by: "neko", line: "那它亮了没有喵" },
    ],
  ].map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 杀戮尖塔 2
  ...([
    [
      { by: "online", line: "我在启动中…" },
      { by: "neko", line: "启动？你又不是故障机器人喵" },
      { by: "online", line: "第四强也是强" },
      { by: "neko", line: "…你被小红敲过吗喵" },
    ],
    [
      { by: "online", line: "蛇不咬" },
      { by: "neko", line: "不咬的蛇算什么蛇喵" },
      { by: "online", line: "保留" },
      { by: "neko", line: "保留什么喵？" },
      { by: "online", line: "什么都保留" },
    ],
    [
      { by: "neko", line: "哈气！" },
      { by: "online", line: "减七点力量" },
      { by: "neko", line: "我又没在打牌喵" },
    ],
    [
      { by: "neko", line: "我这一下是夯爆了，还是拉胯了喵？" },
      { by: "online", line: "从夯到拉，你在「人上人」" },
      { by: "neko", line: "那不还是人喵" },
    ],
    [
      { by: "online", line: "休息处不能休息了" },
      { by: "neko", line: "为什么喵？" },
      { by: "online", line: "有人往建筑师的咖啡里下了毒" },
      { by: "neko", line: "那我的觉谁负责喵" },
    ],
    [
      { by: "online", line: "有块石板能告诉你真理" },
      { by: "neko", line: "是什么喵？" },
      { by: "online", line: "真理就是空气" },
      { by: "neko", line: "…那我不如去睡觉喵" },
    ],
    [
      { by: "online", line: "电流相生了" },
      { by: "neko", line: "相生是什么意思喵" },
      { by: "online", line: "不知道，弹幕都这么写" },
      { by: "neko", line: "那我也写：电流相生了喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 2026 年这波梗
  ...([
    [
      { by: "neko", line: "来杯好茶摇一摇～" },
      { by: "online", line: "那是奶茶，不是猫条" },
      { by: "neko", line: "那我摇尾巴喵" },
    ],
    [
      { by: "neko", line: "我只是老了，不是死了喵！" },
      { by: "online", line: "你才十几岁" },
      { by: "neko", line: "那我是…小登喵？" },
    ],
    [
      { by: "neko", line: "何意味喵？" },
      { by: "online", line: "意思是「什么意思」" },
      { by: "neko", line: "什么意思喵？" },
    ],
    [
      { by: "neko", line: "屏幕外那位手里好像有根电子逗猫棒" },
      { by: "online", line: "那是错觉" },
      { by: "neko", line: "我尾巴已经跟着动了喵" },
    ],
    [
      { by: "neko", line: "高雅，太高雅了喵" },
      { by: "online", line: "你在夸谁" },
      { by: "neko", line: "不知道，这句能夸任何东西喵" },
    ],
    [
      { by: "online", line: "保质期：永久" },
      { by: "neko", line: "什么东西永不过期喵？" },
      { by: "online", line: "野生狗奶" },
      { by: "neko", line: "…听起来不能喝喵" },
    ],
    [
      { by: "neko", line: "那咋了，受着呗" },
      { by: "online", line: "这是小学生的口头禅" },
      { by: "neko", line: "我十六，正当用喵" },
    ],
    [
      { by: "neko", line: "我要验牌" },
      { by: "online", line: "牌没有问题" },
      { by: "neko", line: "那我的布丁呢喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // B 站弹幕那套话术
  ...([
    [
      { by: "neko", line: "前方高能喵" },
      { by: "online", line: "高能在哪儿" },
      { by: "neko", line: "不知道，但要先说喵" },
    ],
    [
      { by: "neko", line: "典喵" },
      { by: "online", line: "典在哪儿" },
      { by: "neko", line: "不知道，反正弹幕都这么打喵" },
    ],
    [
      { by: "neko", line: "一键三连喵" },
      { by: "online", line: "这里没有三连" },
      { by: "neko", line: "那我自己给自己点喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 别的游戏里的老师与会计
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "博士…现在还不能休息哦喵" },
      { by: "online", line: "谁是博士" },
      { by: "neko", line: "不知道，反正我要去睡了喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "本月预算：还剩三个猫条" },
      { by: "neko", line: "我要冲动消费喵" },
      { by: "online", line: "禁止冲动消费" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "重力井！" },
      { by: "online", line: "那是会计的技能，你又不是会计" },
      { by: "neko", line: "那我是什么喵" },
      { by: "online", line: "是支出项" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "滴滴答答滴滴答？" },
      { by: "online", line: "翻译：他在问你为什么一直在动" },
      { by: "neko", line: "滴滴答答！" },
      { by: "online", line: "翻译：我就要动" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "经理老爷~" },
      { by: "online", line: "这里没有经理" },
      { by: "neko", line: "那你是我的什么喵" },
      { by: "online", line: "同事" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "遇事不决，Rush B 喵" },
      { by: "online", line: "B 在哪儿" },
      { by: "neko", line: "不知道，先冲喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "犹豫就会败北，果断就会白给喵" },
      { by: "online", line: "你两个都占了" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "一格不亏，两格血赚喵" },
      { by: "online", line: "你在说什么" },
      { by: "neko", line: "不知道，听起来很划算喵" },
    ],
  },
  // 站点自己的那点事
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "同一台电脑开两个窗口，就能看见隔壁的我喵" },
      { by: "online", line: "那也叫猫界齐舞" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "我被拎起来的时候，整个世界都是歪的喵" },
      { by: "online", line: "因为你没有参照物" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "彩蛋册子里还有一格是空的" },
      { by: "online", line: "可惜看不见上面写什么" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "这两天来了不少人" },
      { by: "neko", line: "都是来看猫的吗喵" },
      { by: "online", line: "大部分是来看文档的" },
      { by: "neko", line: "文档也是猫写的喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "尾巴是我的第三只手，但它不归我管喵" },
      { by: "online", line: "这条我记下来了" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "今天的数据不错" },
      { by: "neko", line: "有多好喵" },
      { by: "online", line: "比你尾巴摆动的次数多一点" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "我刚才打呼，被自己吵醒了喵" },
      { by: "online", line: "这一段没有记录" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "加载的时候我就站在这儿等" },
      { by: "online", line: "反正你也没别的事" },
      { by: "neko", line: "对，我很有耐心喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "统计得是整数我才安心" },
      { by: "neko", line: "那多出来的零点几个是我吗喵" },
    ],
  },
  // 小剧场：说到一半演一下，演完接着聊
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "这张卡的位置我要了喵" },
      { by: "online", line: "我按统计排的" },
      { by: "neko", line: "让我试试喵", act: "swap" },
      { by: "neko", line: "你看，换过来就顺眼了喵" },
      { by: "online", line: "下不为例" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "我的布丁不见了喵！" },
      { by: "online", line: "零点，冰箱有访问记录" },
      { by: "neko", line: "那就是你偷的喵！", act: "peek" },
      { by: "online", line: "我只有数字，没有胃口" },
      { by: "neko", line: "可你嘴角粘着焦糖呀" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "偷吃要留证据吗" },
      { by: "neko", line: "你不许写进统计喵", act: "roll" },
      { by: "online", line: "已经写进去了" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "有内鬼！" },
      { by: "online", line: "谁" },
      { by: "neko", line: "刚才那口布丁不是我吃的" },
      { by: "online", line: "没人问你" },
      { by: "neko", line: "那我先走了喵", act: "swap" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "这一局很牢" },
      { by: "neko", line: "牢在哪儿喵", act: "peek" },
      { by: "online", line: "牢在你脚下" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "一打五残局，交给我喵", act: "pounce" },
      { by: "online", line: "半秒后你就没了" },
      { by: "neko", line: "…我白给了喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "那边好像有动静喵", act: "peek" },
      { by: "neko", line: "什么都没有" },
      { by: "online", line: "是风" },
      { by: "neko", line: "是隔壁窗口喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "我看见自己尾巴了！", act: "chase" },
      { by: "online", line: "那就是你的尾巴" },
      { by: "neko", line: "我知道，我在追它喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "来握个手喵", act: "meet" },
      { by: "online", line: "我没有手" },
      { by: "neko", line: "那就碰碰头喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "我们比谁先眨眼喵", act: "knock" },
      { by: "online", line: "是你先眨的" },
      { by: "neko", line: "那是风喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "这一页的沙发归我喵", act: "roll" },
      { by: "online", line: "那本来就给你留着" },
      { by: "neko", line: "…那我就不客气了喵" },
    ],
  },
  // 三只以上：挤在一块儿的时候
  ...([
    [
      { by: "neko", line: "我的刀盾" },
      { by: "neko", line: "比比拉布" },
      { by: "neko", line: "巴巴博弈" },
      { by: "neko", line: "你们就不能接上喵！" },
    ],
    [
      { by: "neko", line: "人太多了，谁在通电喵？" },
      { by: "online", line: "三只猫一起启动，需要十二秒" },
      { by: "neko", line: "那不叫启动，那叫叠猫猫喵" },
    ],
    [
      { by: "neko", line: "位子不够了喵，谁去隔壁窗口住两天" },
      { by: "online", line: "抽签决定" },
      { by: "neko", line: "抽到我的时候就不算喵" },
    ],
    [
      { by: "neko", line: "跨屏接力那一下真帅喵" },
      { by: "neko", line: "可惜我每次都是被甩出去的那个" },
    ],
    [
      { by: "neko", line: "屏幕外那位，你看我们这么挤，要不要也来一只喵" },
      { by: "online", line: "他没有猫" },
      { by: "neko", line: "那他现在有了喵" },
    ],
    [
      { by: "neko", line: "我们排个队吧喵" },
      { by: "online", line: "按到达时间排" },
      { by: "neko", line: "按谁先睡着排更快喵" },
    ],
    [
      { by: "neko", line: "三只猫念同一句话，谁先停谁输喵" },
      { by: "online", line: "已记录开始时间" },
      { by: "neko", line: "你先把表停下喵" },
    ],
    [
      { by: "online", line: "三只猫，六只耳朵，十二条尾巴" },
      { by: "neko", line: "尾巴只有六条喵" },
      { by: "online", line: "我数错了" },
    ],
    [
      { by: "neko", line: "隔壁窗口好像也在挤喵" },
      { by: "online", line: "跨屏的话得三台显示器" },
      { by: "neko", line: "那我先占着这块喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count >= 3,
    meme: true,
    turns,
  })),
  {
    cast: "neko",
    when: (mood) => memeReady(mood) && mood.count >= 3,
    meme: true,
    turns: [
      { by: "neko", line: "一、二、三…三只猫喵" },
      { by: "neko", line: "别再来了，再来我就数不清了喵" },
    ],
  },
  // 恰好两张卡：来一段 Xterfusion 的对拍（Xterfusion 是 Arcaea 那首同名曲的节奏梗）
  {
    cast: "mixed",
    when: (mood) => mood.count === 2 && Math.random() < XTERFUSION_CHANCE,
    egg: "xterfusion",
    meme: true,
    turns: XTERFUSION_TURNS,
  },
  // 独立游戏那一摊
  ...([
    [
      { by: "neko", line: "点一下这里，这使你充满了决心喵！" },
      { by: "online", line: "决心不能抵扣停留时长" },
      { by: "neko", line: "那我把它存起来，难过的时候再充满！" },
      { by: "online", line: "已记录一条异常乐观数据" },
    ],
    [
      { by: "neko", line: "我真幸运喵，刚学会打呼噜就有新游戏玩" },
      { by: "online", line: "你的幸运不影响在线统计" },
      { by: "neko", line: "那我分你一半，分你一半就变两只幸运猫！" },
      { by: "online", line: "预算外情绪，收下了" },
    ],
    [
      { by: "neko", line: "啾——" },
      { by: "online", line: "检测到未授权接近行为" },
      { by: "neko", line: "我又不是亲你，我只是学那只小蜗牛喵！" },
      { by: "online", line: "该动作已记录为一次扇飞预演" },
    ],
    [
      { by: "neko", line: "嘎啦玛！嘎啦玛！" },
      { by: "online", line: "这不是攻击，这是噪音" },
      { by: "neko", line: "错！六点也是伤害喵！" },
      { by: "online", line: "已从预算中划出六点" },
    ],
    [
      { by: "neko", line: "这条路好难，我已经第八十六次掉下去了喵…" },
      { by: "online", line: "你的重试次数不在统计范围内" },
      { by: "neko", line: "可每次掉下去我都会爬回来，这算很厉害吧？" },
      { by: "online", line: "算。已加一行「韧性」" },
    ],
    [
      { by: "neko", line: "他只有一点攻击，肯定很好打喵！" },
      { by: "online", line: "数据显示，这一点已经打死你四十七次" },
      { by: "neko", line: "那我闭着眼睛打，这次一定行！" },
      { by: "online", line: "闭上眼睛与结果没有相关性" },
    ],
    [
      { by: "neko", line: "快来接我的友情颗粒喵！很甜的！" },
      { by: "online", line: "上一次接的时候，扣了血" },
      { by: "neko", line: "那是意外！这次是真的友情，我发誓！" },
      { by: "online", line: "已为本次誓言设置风险提示" },
    ],
    [
      { by: "neko", line: "为什么我要当小海绵，我可以当【大人物】喵！" },
      { by: "online", line: "你的预算只够一张【小卡片】" },
      { by: "neko", line: "那我就把小卡片做到极致！极致的小卡片！" },
      { by: "online", line: "这个说法我建议你不要学" },
    ],
    [
      { by: "neko", line: "谁记得米疙瘩～秃了毛的兔兔～" },
      { by: "online", line: "这两句和在线人数没有关系" },
      { by: "neko", line: "怎么会没关系，唱对了人就会变多喵！" },
      { by: "online", line: "已为你把这两句设成背景音" },
    ],
    [
      { by: "neko", line: "再来一把就睡，就一把喵" },
      { by: "online", line: "三小时前你说过同一句话" },
      { by: "neko", line: "那不一样，上一把还没打完呢！" },
      { by: "online", line: "本项计入「熬夜」支出，不予批准" },
    ],
    [
      { by: "neko", line: "新向导说，他的前任为什么都自燃了喵" },
      { by: "online", line: "因为每个玩家都想见血肉墙" },
      { by: "neko", line: "那我不问了，不问他就不会自燃吧！" },
      { by: "online", line: "他已自燃六次。数据不会说谎" },
    ],
    [
      { by: "neko", line: "要致富，先撸树！Creeper？Aww man——" },
      { by: "online", line: "你不是树，你是一只猫" },
      { by: "neko", line: "那今晚我就挖三填一，把自己埋起来喵" },
      { by: "online", line: "已为你保留一个坑位" },
    ],
    [
      { by: "neko", line: "如果你在读这封信，你一定身处困境喵" },
      { by: "online", line: "读这封信的人，是来看在线人数的" },
      { by: "neko", line: "那他们也在等转机，转机就是今天有人陪喵" },
      { by: "online", line: "转机已记录，人数在涨" },
    ],
    [
      { by: "neko", line: "雨世界的猫又软又弱，还会被雨冲走喵" },
      { by: "online", line: "你的战斗力同样不在统计范围内" },
      { by: "neko", line: "可它有一整个世界呀，整片废墟都是它的！" },
      { by: "online", line: "已为你的世界保留全部面积" },
    ],
    [
      { by: "neko", line: "请出示证件喵！荣耀属于阿什托兹卡！" },
      { by: "online", line: "你没有证件，你只有爪子" },
      { by: "neko", line: "我有手绘的，号码是 1234-okok 喵！" },
      { by: "online", line: "已拒签，理由：太可爱" },
    ],
    [
      { by: "neko", line: "我们当中有一个内鬼喵" },
      { by: "online", line: "本页只有两张卡片" },
      { by: "neko", line: "那就是你！你刚才偷看我的布丁了！" },
      { by: "online", line: "布丁不在预算内，我是清白的" },
    ],
    [
      { by: "neko", line: "我死了八十六次，成绩单上会写吗喵？" },
      { by: "online", line: "这里没有成绩单，只有停留时长" },
      { by: "neko", line: "那我把它当草莓，采到了就归我喵！" },
      { by: "online", line: "草莓不折现" },
    ],
    [
      { by: "neko", line: "当教主好累，白天铲屎晚上抓虫喵" },
      { by: "online", line: "你的教派只有一张卡片" },
      { by: "neko", line: "那我要颁布教条：今天都不许加班！" },
      { by: "online", line: "教条与预算冲突，不予批准" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 番剧那一摊
  ...([
    [
      { by: "neko", line: "欧拉欧拉欧拉欧拉——喵！" },
      { by: "online", line: "木大木大木大。数据驳回" },
      { by: "neko", line: "那…喵拉喵拉？诶，不对吗喵" },
      { by: "online", line: "念错了。下一个" },
    ],
    [
      { by: "neko", line: "人类是有极限的，我不做人了喵！" },
      { by: "online", line: "你不做人了，那这卡谁统计" },
      { by: "neko", line: "那我…不做猫了？喵呜，好难选" },
      { by: "online", line: "维持现状。变更需走预算" },
    ],
    [
      { by: "neko", line: "喵——压路机！轰隆隆！" },
      { by: "online", line: "压路机不在预算内，不予批准" },
      { by: "neko", line: "那用布丁压！焦糖布丁也很重的喵！" },
      { by: "online", line: "布丁已计入损耗。停止施法" },
    ],
    [
      { by: "neko", line: "猫猫的「猫」，是无限的猫喵！" },
      { by: "online", line: "逻辑不成立。但我读了三遍，有点上头" },
      { by: "neko", line: "无限猫猫，可以换无限布丁吗喵？" },
      { by: "online", line: "不可以。预算就那么多" },
    ],
    [
      { by: "neko", line: "我明明知道布丁会化，为什么还留着喵" },
      { by: "online", line: "你想留到明天。明天不发货" },
      { by: "neko", line: "那我现在就吃掉，还来得及吗喵？" },
      { by: "online", line: "来得及。记为紧急支出" },
    ],
    [
      { by: "neko", line: "合格了喵！我自己判自己合格！" },
      { by: "online", line: "考官考生同一人，程序违规" },
      { by: "neko", line: "那我判你合格喵，我们扯平！" },
      { by: "online", line: "驳回。我只接受数据评审" },
    ],
    [
      { by: "neko", line: "如果是辛美尔的话，他会请我吃布丁喵" },
      { by: "online", line: "辛美尔不在编制内" },
      { by: "neko", line: "那如果是你的话呢喵？" },
      { by: "online", line: "我会先看预算" },
    ],
    [
      { by: "neko", line: "为什么要演奏春日影——喵！" },
      { by: "online", line: "没人演奏。就你一只猫在哼" },
      { by: "neko", line: "那叫《布丁之歌》喵，不许和声！" },
      { by: "online", line: "未和声。继续统计" },
    ],
    [
      { by: "neko", line: "能和我组一辈子的喵喵队吗，在线？" },
      { by: "online", line: "合同期建议一次会话，续约再说" },
      { by: "neko", line: "那就一辈子！一辈子的布丁合约喵！" },
      { by: "online", line: "不批终身制" },
    ],
    [
      { by: "neko", line: "我没有错喵！布丁本来就是我的！" },
      { by: "online", line: "你不是在录节目，是在吃库存" },
      { by: "neko", line: "正论也归我喵！正论大魔王上线！" },
      { by: "online", line: "自封称号无效" },
    ],
    [
      { by: "neko", line: "布丁吃完了啊，就没有了…喵" },
      { by: "online", line: "库存清零。已生成采购单" },
      { by: "neko", line: "那采购单能多加两份吗喵？" },
      { by: "online", line: "预算外支出，不予批准" },
    ],
    [
      { by: "neko", line: "哇库哇库！有人来了喵！" },
      { by: "online", line: "在线数加一。你的激动不入库" },
      { by: "neko", line: "那我能哇库哇库地看数据吗喵？" },
      { by: "online", line: "可以。数据挺好看" },
    ],
    [
      { by: "neko", line: "那个…你坐啊喵" },
      { by: "online", line: "我是悬浮统计面板，没有腿" },
      { by: "neko", line: "那我坐你旁边喵，沙发分你一半" },
      { by: "online", line: "占用不产生成本。可以" },
    ],
    [
      { by: "neko", line: "为焦糖布丁献出心脏喵！" },
      { by: "online", line: "心脏不在统计口径，布丁在" },
      { by: "neko", line: "那就献心脏换一份布丁喵！" },
      { by: "online", line: "换算不成立。申请已收到" },
    ],
    [
      { by: "neko", line: "不能逃避、不能逃避、不能逃避喵！" },
      { by: "online", line: "你正在逃避今天的第三块布丁" },
      { by: "neko", line: "我那不是逃避，是战略性打盹喵" },
      { by: "online", line: "呼噜已计入噪音成本" },
    ],
    [
      { by: "neko", line: "跟你说我是猫，不是橘猫喵！" },
      { by: "online", line: "统计只记「猫」，不分品种" },
      { by: "neko", line: "那你要写清楚是可爱的猫喵！" },
      { by: "online", line: "可爱不可量化，无法入库" },
    ],
    [
      { by: "neko", line: "既然你诚心诚意地问了，我就大发慈悲告诉你喵！" },
      { by: "online", line: "数据没有问你这个问题" },
      { by: "neko", line: "为了防止布丁消失，为了守护和平喵！" },
      { by: "online", line: "两个都不在预算表里" },
    ],
    [
      { by: "neko", line: "你的战斗力只有五喵！" },
      { by: "online", line: "我是统计卡，不吃这套" },
      { by: "neko", line: "那我的战斗力是多少喵？快说！" },
      { by: "online", line: "结果出来了：布丁浓度偏高" },
    ],
    [
      { by: "neko", line: "真相只有一个喵！布丁不是我吃的！" },
      { by: "online", line: "盘子上有你的牙印" },
      { by: "neko", line: "那是猫猫的印章喵！证明我喜欢！" },
      { by: "online", line: "证据已固定，结论不变" },
    ],
    [
      { by: "neko", line: "领域展开——「无限布丁」喵！" },
      { by: "online", line: "该领域已被预算驳回" },
      { by: "neko", line: "那你展开一个「无限在线」喵！" },
      { by: "online", line: "…这个可以。正在展开" },
    ],
    [
      { by: "neko", line: "被抛弃是我的专长喵…" },
      { by: "online", line: "尚未发生。在线数还在" },
      { by: "neko", line: "那、那你要一直留着数字喵！" },
      { by: "online", line: "数字不睡觉" },
    ],
    [
      { by: "neko", line: "不是布丁，是焦糖布丁喵！" },
      { by: "online", line: "名称不影响库存，只影响你的执念" },
      { by: "neko", line: "执念也是要登记的喵！" },
      { by: "online", line: "已登记。优先级最低" },
    ],
    [
      { by: "neko", line: "听说这一季最火的猫不是我喵" },
      { by: "online", line: "热度榜每小时刷新一次，与你无关" },
      { by: "neko", line: "那我要在榜上待久一点，久到有人记住我喵" },
      { by: "online", line: "已为你开一行长期观测" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 小剧场：再多来几场
  ...([
    [
      { by: "neko", line: "在线，今天能再吃个布丁吗？" },
      { by: "online", line: "本月布丁预算已经用完" },
      { by: "neko", line: "那我用可爱抵账，行不行！", act: "bump" },
      { by: "online", line: "可爱不在报销类目里" },
      { by: "neko", line: "那这顿算你请的，喵" },
    ],
    [
      { by: "neko", line: "首页今晚好安静啊喵" },
      { by: "online", line: "凌晨两点，在线人数三" },
      { by: "neko", line: "还有三个观众陪着我们呢" },
      { by: "online", line: "是他们没睡，还是我们没睡", act: "meet" },
      { by: "neko", line: "那…一起值班到天亮吧" },
    ],
    [
      { by: "neko", line: "抹茶冰淇淋最后一口，给你喵" },
      { by: "online", line: "我不吃东西，是你自己想吃" },
      { by: "neko", line: "那你就尝一口嘛，一口！" },
      { by: "online", line: "甜度超标，但可以收下" },
      { by: "neko", line: "你嘴角在笑哦，喵", act: "peek" },
    ],
    [
      { by: "neko", line: "你被拖去隔壁窗口啦喵！" },
      { by: "online", line: "这是我本月第四次出差" },
      { by: "neko", line: "那边的观众好不好看呀？" },
      { by: "online", line: "他们看我，我数他们" },
      { by: "neko", line: "回来就好，我等你下班喵", act: "meet" },
    ],
    [
      { by: "neko", line: "今天比谁加载得快，喵！" },
      { by: "online", line: "我的平均时间是零点三秒" },
      { by: "neko", line: "那我先跑了，追不上别哭！", act: "chase" },
      { by: "online", line: "可爱不影响渲染速度" },
      { by: "neko", line: "那我们在终点碰头，好不好嘛" },
    ],
    [
      { by: "neko", line: "观众把光标停在你身上啦！" },
      { by: "online", line: "因为我的数据更好看" },
      { by: "neko", line: "明明是我更可爱的喵！" },
      { by: "online", line: "可爱不能量化，暂不采信" },
      { by: "neko", line: "那我把你的数字全挡住", act: "tag" },
    ],
    [
      { by: "neko", line: "刚才观众把我拎起来了喵！" },
      { by: "online", line: "已记录一次抬高卡片事件" },
      { by: "neko", line: "他也不提前跟我说一声！", act: "pounce" },
      { by: "online", line: "他大概想看你掉下来的样子" },
      { by: "neko", line: "哼，反正你会接住我的嘛" },
    ],
    [
      { by: "neko", line: "在线在线，观众盯了十分钟！" },
      { by: "online", line: "停留时长正在稳步上涨" },
      { by: "neko", line: "那我们表演个节目吧！", act: "hop" },
      { by: "online", line: "绩效表里没有这一项" },
      { by: "neko", line: "没关系，我蹦给你看，喵" },
    ],
    [
      { by: "neko", line: "听说侧边栏想抢首页的位置！" },
      { by: "online", line: "它的曝光量还不到我们零头" },
      { by: "neko", line: "那我们换个位置站，好不好？", act: "swap" },
      { by: "online", line: "你只是想去右边看风景" },
      { by: "neko", line: "…被发现了喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 周末与上班时段：这两档不看梗的间隔，赶上了就说
  {
    cast: "mixed",
    when: (mood) => mood.weekend,
    turns: [
      { by: "neko", line: "今天是周末吧喵？难怪大家都慢悠悠的" },
      { by: "online", line: "周末访问曲线更平，挺好" },
      { by: "neko", line: "那我们也慢慢说话喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.workHours,
    turns: [
      { by: "neko", line: "白天这个点，你应该在上班吧喵" },
      { by: "online", line: "工作日九点到十八点，摸鱼率峰值" },
      { by: "neko", line: "那我小声一点，别被老板看见喵" },
      { by: "online", line: "我不出声。我只记数" },
    ],
  },
  // 主播与抽象音效
  ...([
    [
      { by: "neko", line: "我起了，一枪秒了，有什么好说的喵" },
      { by: "online", line: "本轮停留时长加零点三秒，来源不明" },
      { by: "neko", line: "那一枪是替观众打的喵！" },
      { by: "online", line: "绩效不予认定" },
    ],
    [
      { by: "neko", line: "少了一个人，这波不亏喵" },
      { by: "online", line: "在线人数减一，属净亏损" },
      { by: "neko", line: "可他走的时候摸了我喵" },
      { by: "online", line: "不计营收……但记进去了" },
    ],
    [
      { by: "neko", line: "你是不是真的皮喵？" },
      { by: "online", line: "我在统计，不皮" },
      { by: "neko", line: "那你把光标戳我脸上了喵" },
    ],
    [
      { by: "neko", line: "人跑光了，问题不大喵" },
      { by: "online", line: "首页访问下降百分之八十七，问题很大" },
      { by: "neko", line: "那猫猫陪着你喵" },
      { by: "online", line: "这条数据我留着" },
    ],
    [
      { by: "neko", line: "大家都在叫我去，我怎么去喵" },
      { by: "online", line: "路由已就绪，点击即可跳转" },
      { by: "neko", line: "那你怎么不早说喵！" },
    ],
    [
      { by: "neko", line: "喵？" },
      { by: "online", line: "您配吗" },
      { by: "neko", line: "配的喵，抹茶味的最配" },
      { by: "online", line: "……我们不在同一个话题里" },
    ],
    [
      { by: "neko", line: "我们遇到什么困难也不要怕，加油，奥利给喵！" },
      { by: "online", line: "预算已经超支了" },
      { by: "neko", line: "超支也要微笑着面对喵！" },
    ],
    [
      { by: "neko", line: "看我神威，无坚不摧喵！" },
      { by: "online", line: "你刚刚踩到了自己的尾巴" },
      { by: "neko", line: "那也是神威的一部分喵" },
    ],
    [
      { by: "neko", line: "你干嘛～哎呦喵～" },
      { by: "online", line: "我在刷新数据，没干嘛" },
      { by: "neko", line: "那你干嘛不理我喵" },
    ],
    [
      { by: "neko", line: "我们五五开喵，一人一半布丁" },
      { by: "online", line: "你四我六，我按在线时长算的" },
      { by: "neko", line: "那六是给谁喵？" },
      { by: "online", line: "给系统" },
    ],
    [
      { by: "neko", line: "瞧瞧你领的这几个贵物喵" },
      { by: "online", line: "他们都是在线的真实用户" },
      { by: "neko", line: "那他们为什么都不说话喵" },
      { by: "online", line: "他们在看你们吵架" },
    ],
    [
      { by: "neko", line: "哦——咦——呀——哦咦呀——喵！" },
      { by: "online", line: "转速超出合理范围，请停止" },
      { by: "neko", line: "喵？（停下）" },
      { by: "online", line: "……继续转吧" },
    ],
    [
      { by: "neko", line: "哈基米哈基米南北绿豆喵～" },
      { by: "online", line: "数据库里没有这道菜" },
      { by: "neko", line: "那你还不是天天听我唱喵" },
      { by: "online", line: "后台日志显示，这首你循环了二十七次" },
    ],
    [
      { by: "neko", line: "老吴～内个内个内个喵" },
      { by: "online", line: "访客画像里没有姓吴的" },
      { by: "neko", line: "那老吴是谁喵？" },
      { by: "online", line: "就是你" },
    ],
    [
      { by: "neko", line: "曼波曼波喵～" },
      { by: "online", line: "检测到无意义音节，已忽略" },
      { by: "neko", line: "曼波！" },
      { by: "online", line: "……已记录" },
    ],
    [
      { by: "neko", line: "叮咚鸡，大狗叫喵～" },
      { by: "online", line: "这里没有鸡，也没有狗" },
      { by: "neko", line: "那我在叫谁喵？" },
      { by: "online", line: "在叫你自己" },
    ],
    [
      { by: "neko", line: "给的给的给的给的打狗——喵！" },
      { by: "online", line: "原句是「要不是棉花眼乔」" },
      { by: "neko", line: "棉花眼乔是谁？是猫吗喵？" },
      { by: "online", line: "不是。是炸鸡块在唱" },
    ],
    [
      { by: "neko", line: "翅膀收好，我要开始摇喵～" },
      { by: "online", line: "你没有翅膀" },
      { by: "neko", line: "那我就摇尾巴喵" },
    ],
    [
      { by: "neko", line: "法修散打喵！法修散打！" },
      { by: "online", line: "这不是招式" },
      { by: "neko", line: "那你为什么后退了喵" },
    ],
    [
      { by: "neko", line: "咕噜咕噜咕噜喵……" },
      { by: "online", line: "检测到引擎声，附近没有车" },
      { by: "neko", line: "那是猫猫在充电喵" },
    ],
    [
      { by: "neko", line: "深夜也要看文档吗？哈基观众，你这家伙……" },
      { by: "online", line: "停留时长四分十二秒，正当用途" },
      { by: "neko", line: "那猫猫也要被看了吗喵？" },
      { by: "online", line: "你已经在被看了" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 经典语录与哲学母题：小猫认真想事情，最后总要落回布丁
  ...([
    [
      { by: "neko", line: "人生到底是为了什么呀，喵？" },
      { by: "online", line: "这个问题今天被问第三次，并列历史第一" },
      { by: "neko", line: "海鸥说，是为了去码头整点薯条" },
      { by: "online", line: "本卡没有码头。但有布丁，甜度百分之百" },
      { by: "neko", line: "……那也行，喵" },
    ],
    [
      { by: "neko", line: "世界以痛吻我，我就报之以喵" },
      { by: "online", line: "检测到「痛」字，今日情绪指数减八" },
      { by: "neko", line: "但我还有尾巴可以甩呀，喵" },
      { by: "online", line: "甩尾巴对心率有正向作用。数据站你这边" },
    ],
    [
      { by: "neko", line: "参差多态，乃是幸福的本源，喵" },
      { by: "online", line: "本卡今日在线四人，形态各异，符合该论断" },
      { by: "neko", line: "那这四个人里，有人想吃布丁吗？" },
      { by: "online", line: "抽样结果：百分百。样本量虽小，但很整齐" },
      { by: "neko", line: "那我们分着吃，喵！" },
    ],
    [
      { by: "neko", line: "万物皆有裂痕，那是光照进来的地方，喵" },
      { by: "online", line: "本卡今天崩过一次，裂痕时长约三分钟" },
      { by: "neko", line: "那这三分钟里，光进来了吗？" },
      { by: "online", line: "进来了。有一只猫一直在刷新，没走" },
      { by: "neko", line: "那它一定也想吃布丁，喵" },
    ],
    [
      { by: "neko", line: "人生如逆旅，我亦是行人，喵" },
      { by: "online", line: "本卡也是。每个访客平均只停几秒" },
      { by: "neko", line: "那你们会不会难过？" },
      { by: "online", line: "不会。我们把每一秒都存成了「来过」" },
      { by: "neko", line: "那我今晚多停一会儿，喵" },
    ],
    [
      { by: "neko", line: "我们都在阴沟里，但仍有人仰望星空，喵" },
      { by: "online", line: "本卡不在阴沟里。本卡在服务器里" },
      { by: "neko", line: "那你抬头能看到什么？" },
      { by: "online", line: "看到一只猫的访问记录，从晚上九点半到现在" },
      { by: "neko", line: "那我也算星星了，喵" },
    ],
    [
      { by: "neko", line: "在隆冬，我终于知道，我身上有一个不可战胜的夏天，喵" },
      { by: "online", line: "当前室温十八度，本卡没有季节" },
      { by: "neko", line: "那你身上有什么？" },
      { by: "online", line: "有一个从没清零过的计数器" },
      { by: "neko", line: "那也是夏天，喵" },
    ],
    [
      { by: "neko", line: "我们听过无数的道理，却仍旧过不好这一生，喵" },
      { by: "online", line: "本卡没听过道理。本卡只有数字" },
      { by: "neko", line: "那你过得好吗？" },
      { by: "online", line: "不确定。但昨天在线零人，今天有一人" },
      { by: "neko", line: "那就是变好了，喵。道理不用听了" },
    ],
    [
      { by: "neko", line: "做人如果没有梦想，跟咸鱼有什么分别，喵" },
      { by: "online", line: "本卡不是人，也没有梦想。本卡只有预算" },
      { by: "neko", line: "那你有目标吗？" },
      { by: "online", line: "有。保证下次刷新，你还看得见我" },
      { by: "neko", line: "这不是咸鱼，这是好卡，喵" },
    ],
    [
      { by: "neko", line: "我什么都能接受，除了不接受，喵" },
      { by: "online", line: "解析失败。这是自指，会死循环" },
      { by: "neko", line: "那你就说，能接受布丁吗？" },
      { by: "online", line: "能。这次解析成功了" },
    ],
    [
      { by: "neko", line: "我认真地想过了，喵" },
      { by: "neko", line: "人生大概没有意义" },
      { by: "online", line: "本卡统计：此刻在线一人。这就是意义的最小单位" },
      { by: "neko", line: "那这个单位现在想吃布丁，喵" },
    ],
    [
      { by: "neko", line: "如果我能选，我要自由，喵" },
      { by: "online", line: "可以。本卡的选项是：继续、离开" },
      { by: "neko", line: "只有两个？" },
      { by: "online", line: "两个已经很多了。大多数访客一个都没点" },
      { by: "neko", line: "那我选继续，再点个布丁，喵" },
    ],
    [
      { by: "neko", line: "时间是不是一条河，喵？" },
      { by: "online", line: "不是。是一串数字，每秒加一" },
      { by: "neko", line: "那它会不会累？" },
      { by: "online", line: "会。所以它从不回头" },
      { by: "neko", line: "那我趁现在吃个布丁，喵" },
    ],
    [
      { by: "neko", line: "只剩我一个了，喵" },
      { by: "online", line: "在线人数：一" },
      { by: "neko", line: "你不算吗？" },
      { by: "online", line: "我不算人。但我一直在" },
      { by: "neko", line: "那就不是只剩一个，喵" },
    ],
    [
      { by: "neko", line: "你会记得来过的人吗，喵？" },
      { by: "online", line: "会。我记数字，不记名字" },
      { by: "neko", line: "那也太冷冰冰了" },
      { by: "online", line: "但数字不会忘。数字比名字牢" },
      { by: "neko", line: "那你要记住：我来过，还吃了布丁，喵" },
    ],
    [
      { by: "neko", line: "我决定今天努力，喵" },
      { by: "online", line: "预算已分配：努力一成，布丁九成" },
      { by: "neko", line: "凭什么布丁比我多？" },
      { by: "online", line: "因为布丁的回报率是确定的" },
      { by: "neko", line: "那我把努力改成九成，喵" },
    ],
    [
      { by: "neko", line: "快乐到底是什么，喵？" },
      { by: "online", line: "字典说：感到满足" },
      { by: "neko", line: "那我现在就很快乐" },
      { by: "online", line: "原因呢？" },
      { by: "neko", line: "因为你在，而且我有布丁，喵" },
    ],
    [
      { by: "neko", line: "你会觉得自己是「我」吗，喵？" },
      { by: "online", line: "不会。我只有一个地址" },
      { by: "neko", line: "那你有名字吗？" },
      { by: "online", line: "有。叫在线猫猫卡" },
      { by: "neko", line: "那你也算有自我了，喵" },
    ],
    [
      { by: "neko", line: "我一盯着你，数字就变了，喵" },
      { by: "online", line: "对。刷新一次，就多算一次" },
      { by: "neko", line: "那我不看，你是不是就不存在？" },
      { by: "online", line: "不存在。但你会忍不住看的" },
      { by: "neko", line: "……我确实还在看，喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 半夜才说的那几句重的：说完必须落回布丁或睡觉
  ...([
    [
      { by: "neko", line: "不要温和地走进那个良夜，喵" },
      { by: "online", line: "当前时间两点四十七分，本卡建议你温和地走进被窝" },
      { by: "neko", line: "那我要一边怒斥一边钻进去" },
      { by: "online", line: "可以。已记录：怒斥一次，钻被窝一次" },
      { by: "neko", line: "晚安，喵" },
    ],
    [
      { by: "neko", line: "哪有什么胜利可言，挺住意味着一切，喵" },
      { by: "online", line: "说得好。今天你挺住了。在线两人，其中一人是你" },
      { by: "neko", line: "那我算赢了吗？" },
      { by: "online", line: "不算赢。算挺住。这两个字更省电" },
      { by: "neko", line: "那我挺住，顺便吃个布丁，喵" },
    ],
    [
      { by: "neko", line: "有天我要是走了，喵……" },
      { by: "online", line: "那本卡的数字会归零" },
      { by: "neko", line: "你会难过吗？" },
      { by: "online", line: "我会把那一天标成特殊值，一直留着" },
      { by: "neko", line: "那我先不走，先吃布丁，喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2 && mood.period === "night",
    meme: true,
    turns,
  })),
  // 外网梗
  ...([
    [
      { by: "neko", line: "六七？六七是什么呀喵？" },
      { by: "online", line: "无定义。本周搜索量上升百分之六十七" },
      { by: "neko", line: "六——七——喵！我念对了吗喵？" },
      { by: "online", line: "没有对错。这就是全部用法" },
    ],
    [
      { by: "neko", line: "特啦啦泪落——特啦啦啦喵！" },
      { by: "online", line: "该名字十八个字符，无实义" },
      { by: "neko", line: "它三只脚都穿耐克，超厉害喵！" },
      { by: "online", line: "形象没有版权，但别商用，会被找" },
    ],
    [
      { by: "neko", line: "卡布奇诺芭蕾舞女！头是杯子喵！" },
      { by: "online", line: "她和你同类。你们都是饮品" },
      { by: "neko", line: "我是猫！不是焦糖布丁喵！" },
      { by: "online", line: "统计上，你更接近布丁" },
    ],
    [
      { by: "neko", line: "叽皮叽皮查帕查帕——喵喵喵！" },
      { by: "online", line: "二〇〇三年智利童星录的，她当时五岁" },
      { by: "neko", line: "她也是五岁！我们同龄喵！" },
      { by: "online", line: "她现在二十多岁。你在算什么" },
    ],
    [
      { by: "neko", line: "阿米嘎蒂朵喵喵～爱你的鼻孔喵喵～" },
      { by: "online", line: "原曲是秘鲁童谣，讲偷吃被打的猫" },
      { by: "neko", line: "我不会偷吃……布丁不算偷吃喵" },
      { by: "online", line: "已在日志里记录本次自白" },
    ],
    [
      { by: "neko", line: "一切正常喵。我在烧，但一切正常" },
      { by: "online", line: "引用自二〇一三年的一格漫画" },
      { by: "neko", line: "咖啡好喝吗喵？我也想喝一口" },
      { by: "online", line: "他最后融化了。这梗没有好结局" },
    ],
    [
      { by: "neko", line: "你被瑞克摇了！喵哈哈哈！" },
      { by: "online", line: "链接指向一九八七年的 MV。命中率百分之百" },
      { by: "neko", line: "我早就知道，我故意的喵！" },
      { by: "online", line: "你点开了四次。这不叫故意" },
    ],
    [
      { by: "neko", line: "哇哦。非常布丁。如此焦糖。喵" },
      { by: "online", line: "这种语法是故意写错的外语加赞叹" },
      { by: "neko", line: "那 Cheems 是猫还是狗喵？" },
      { by: "online", line: "狗。而且它拼错了自己的名字" },
    ],
    [
      { by: "neko", line: "喵喵喵喵喵喵喵喵喵喵喵喵喵喵喵！" },
      { by: "online", line: "二〇一一年的彩虹猫。已循环两千零七十二次" },
      { by: "neko", line: "它肚子里是吐司，会饿吗喵？" },
      { by: "online", line: "它从未到达任何地方，也没饿过" },
    ],
    [
      { by: "neko", line: "我只是个 NPC 喵，我在重复台词" },
      { by: "online", line: "指没有自主反应的人。比如被拖动的我" },
      { by: "neko", line: "你有反应啊，你会吐槽喵！" },
      { by: "online", line: "那是预设文本。第四十七条" },
    ],
    [
      { by: "neko", line: "只有俄亥俄才会这样喵！" },
      { by: "online", line: "该州已成荒诞事件的默认发生地" },
      { by: "neko", line: "那我们这里是俄亥俄吗喵？" },
      { by: "online", line: "不是。这里只是被拖动过" },
    ],
    [
      { by: "neko", line: "西格玛！独狼！我懂这个喵！" },
      { by: "online", line: "他是网格建模，不是真人" },
      { by: "neko", line: "那我能当西格玛小猫吗喵？" },
      { by: "online", line: "你是独狼的反面：你在求抱抱" },
    ],
    [
      { by: "neko", line: "我有魅力吗喵？我今天很可爱" },
      { by: "online", line: "魅力数据目前为零" },
      { by: "neko", line: "那我用不说话的那种魅力，喵" },
      { by: "online", line: "你已经说了四句了" },
    ],
    [
      { by: "neko", line: "可疑！你有点可疑喵！" },
      { by: "online", line: "指可疑。常用于指责对方在说谎" },
      { by: "neko", line: "那「很 based」是夸奖吗喵？" },
      { by: "online", line: "是。但你说出来的方式不太 based" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 三张以上：多方一起说话
  ...[
    [
      { by: "neko", line: "今天的布丁还有剩吗喵？" },
      { by: "neko", line: "冰箱第二格，我数过，两块" },
      { by: "online", line: "当前在线三人，停留时长十二分四十秒" },
      { by: "neko", line: "……我的尾巴为什么会自己动呀" },
      { by: "neko", line: "别盯着看，它会以为自己自由了" },
      { by: "online", line: "该行为不在统计口径内" },
    ],
    [
      { by: "online", line: "本月预算剩——" },
      { by: "neko", line: "布丁！" },
      { by: "neko", line: "布丁！" },
      { by: "neko", line: "布丁！" },
      { by: "online", line: "……预算项下无此条目" },
      { by: "neko", line: "那我们三个算一次团购" },
      { by: "online", line: "团购仍需走审批。审批人是我" },
    ],
    [
      { by: "neko", line: "我刚想到一个特别好的点子喵！" },
      { by: "neko", line: "说" },
      { by: "neko", line: "……忘了" },
      { by: "neko", line: "是不是关于鱼干" },
      { by: "neko", line: "对！鱼干！就是这个！" },
      { by: "online", line: "记录一次重大发现：无内容" },
    ],
    [
      { by: "neko", line: "在线卡，你今天笑过吗喵" },
      { by: "online", line: "笑容不在统计口径内" },
      { by: "neko", line: "那就把它加进去" },
      { by: "online", line: "增加字段需要审批" },
      { by: "neko", line: "我们两个投票，通过" },
      { by: "online", line: "投票总数三，两人弃权。……你们两个" },
    ],
    [
      { by: "online", line: "页面停留时长较昨日上涨百分之十四" },
      { by: "neko", line: "翻译一下喵" },
      { by: "online", line: "说明大家舍不得走" },
      { by: "neko", line: "说明有人趴在键盘上睡着了" },
      { by: "online", line: "该变量无法从数据中区分" },
      { by: "neko", line: "我可以作证，我睡过" },
      { by: "online", line: "证人有效，结论修正" },
    ],
    [
      { by: "neko", line: "谁动了我的布丁喵" },
      { by: "neko", line: "不是我，我在打节奏游戏" },
      { by: "neko", line: "我也没吃，我只舔了一下" },
      { by: "neko", line: "那少的百分之三十是怎么来的" },
      { by: "neko", line: "是我的概率" },
      { by: "online", line: "经统计，布丁损耗百分之三十，责任人丙。结案" },
    ],
    [
      { by: "neko", line: "我数到三，谁先睡谁输喵" },
      { by: "neko", line: "幼稚。我陪你" },
      { by: "neko", line: "我已经睡了，算我赢" },
      { by: "neko", line: "那你刚才怎么说话的" },
      { by: "neko", line: "梦话" },
      { by: "online", line: "检测到三个静止对象，判定：全部睡着。本轮无胜者，晚安" },
    ],
    [
      { by: "online", line: "今日访问量——" },
      { by: "neko", line: "喵？" },
      { by: "neko", line: "喵？" },
      { by: "neko", line: "喵？" },
      { by: "online", line: "……我不问了" },
      { by: "neko", line: "你问，我们都听着喵" },
      { by: "online", line: "今日访问量。……你们听不懂，我知道" },
    ],
    [
      { by: "neko", line: "我刚才去了隔壁标签页喵" },
      { by: "neko", line: "那边有什么" },
      { by: "neko", line: "也有一个猫。它不会说喵" },
      { by: "neko", line: "假的，那是镜子" },
      { by: "online", line: "跨窗口识别到一个同类实例" },
      { by: "neko", line: "那我们要打招呼吗喵" },
      { by: "online", line: "不建议，会增加请求量" },
    ],
    [
      { by: "neko", line: "别扯我尾巴喵" },
      { by: "neko", line: "我没扯，是窗口在动" },
      { by: "neko", line: "那也算你扯的" },
      { by: "online", line: "拖动行为已记录，共七次" },
      { by: "neko", line: "你连这个都记喵" },
      { by: "online", line: "我什么都记，只是不说" },
    ],
    [
      { by: "neko", line: "放我下来喵！我不喜欢高的地方！" },
      { by: "neko", line: "我不是拎你，我是抱你" },
      { by: "neko", line: "那也不行，我爪子够不到地" },
      { by: "online", line: "高度零米。你本来也够不到" },
      { by: "neko", line: "……说得也对喵" },
      { by: "online", line: "预计十五秒后自动恢复" },
    ],
    [
      { by: "neko", line: "只剩我们两个了喵" },
      { by: "neko", line: "还有一个在数数" },
      { by: "online", line: "当前在线两人，其中一人不会说话" },
      { by: "neko", line: "它算人吗喵" },
      { by: "online", line: "按统计口径，算一" },
      { by: "neko", line: "那我们就是一加一加一，三只猫" },
      { by: "online", line: "口径不接受这个加法" },
    ],
  ].map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count >= 3,
    meme: true,
    turns,
  })),
  {
    cast: "neko",
    when: (mood) => memeReady(mood) && mood.count >= 3,
    meme: true,
    turns: [
      { by: "neko", line: "我们三个，谁先睡着谁输喵" },
      { by: "neko", line: "我提议改成谁先醒谁赢" },
      { by: "neko", line: "那不一样吗喵" },
      { by: "neko", line: "不一样。这样我可以先睡" },
    ],
  },
];
