// 首页卡片说的所有话都在这里：先是各自念叨的台词池，再是按角色配好的对话脚本。
// 台词跟逻辑分开放，改词不用碰组件；「什么时候说什么」由 live-chat.ts 按当下的光景挑。

import type { CardKind, CardSpec, PeerSides } from "./live-peer";
import type { DropCategory } from "./live-drop-targets";

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
  /** 被戳一下时的回话（点一下就有反应，是这块卡片最容易摸到的互动） */
  readonly poke: readonly string[];
  /** 被摸头顶时的回话：鼠标不点不按、只是搁在卡面上摸来摸去 */
  readonly pat: readonly string[];
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
  | "swap"
  // 下面这几个只在台词点名时演，不进平时的随机排期
  | "lean"
  | "pass"
  | "mimic"
  | "lookOut"
  // 家常对手戏也开放给台词点名：说到「蹭蹭」「踩奶」「分你一口」这类话时，
  // 光靠随机排期很难正好撞上，得让台词自己叫一声。
  // 名字都在 live-show 的 PLAY_SCRIPTS 里，脚本与样式现成，这里只是允许点名
  | "nuzzle"
  | "knead"
  | "groom"
  | "shareBite"
  | "highPaw"
  | "startle"
  | "tussle"
  | "playDead"
  | "spoon"
  | "tailSpin"
  | "roundChase"
  | "leanNap"
  | "makeUp"
  | "alarm"
  | "shove"
  | "parade"
  | "mirrorStep";

/** 对话里的一句：由哪种卡来说、说什么；带 act 的就是「这句说完先演一段」 */
export interface ChatTurn {
  readonly by: CardSpec["kind"];
  readonly line: string;
  readonly act?: ChatAct;
}

/** 一套对话由谁来说：两种卡都在就是 mixed，只有一种就是那一种 */
export type ChatCast = "mixed" | "neko" | "online";

/** 带概率闸的档：骰子由 live-chat 每轮只摇一次（摇不中就把这类档整个剔掉），
    when 里只读光景与这一轮的骰子、自己不摇 —— 骰子留在 when 里的话，
    成组生成的上百段梗各自独立摇一遍，「至少一段过闸」约等于必然，那道 25% 就成了摆设 */
export type MomentGate = "meme" | "xterfusion" | "stare";

/** 这一轮各道闸的结果 */
export type MomentGates = Readonly<Record<MomentGate, boolean>>;

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
  /** 离上一个梗隔够了（这一轮能不能说梗还得看 gates.meme 那道骰子） */
  readonly memeReady: boolean;
  /** 这一轮摇出来的骰子：带闸的档过不过得去（live-chat 每轮只摇一次） */
  readonly gates: MomentGates;
  /** 观众的小箭头半天没动过 */
  readonly cursorIdle: boolean;
  /** 手到底停了多久（毫秒）：停半分钟、两分钟、五分钟，她想说的话不一样 */
  readonly cursorIdleMs: number;
  /** 这台设备主要用手指操作吗：台词要分两版 —— 桌面上能说「小箭头」，手机上只有手 */
  readonly touch: boolean;
  /** 刚把指针移出窗口（桌面才有这条路；手机上「人走了」是切后台） */
  readonly pointerGone: boolean;
  /** 刚滚过页面（「一口气滚到底」是另一档，这里说的是普通滚动） */
  readonly scrolled: boolean;
  /** 刚选中了一段文字（手机上长按复制走的是同一个事件） */
  readonly selectionMade: boolean;
  /** 刚把手机转过去（宽高互换才算，桌面改窗口大小不算） */
  readonly flipped: boolean;
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
  /** 此刻真实的在线人数（接口给的，还没拿到就是 0） */
  readonly online: number;
  /** 今天第几次打开这个页面（本机记的，头一回是 1） */
  readonly visitTimes: number;
  /** 连着第几天来（今天头一回打开才有意义；断了两天以上从头数） */
  readonly streak: number;
  /** 她今天在干什么（拿日期当种子抽的一句，见 todayDoing） */
  readonly doing: string;
  /** 今天头一回打开、而且进站那句还没说过：只有这一轮才说「第 N 天见啦」这些 */
  readonly arriveFresh: boolean;
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
  /** 这一段是专门为当下这一刻写的：轮到了就优先说，不跟别的档抢（盯看的第一段用） */
  readonly priority?: boolean;
  /** 「那个人类一直在看」那几段，说完一档才能接下一档 */
  readonly stare?: boolean;
  /** 稀客才说的话：同一个 key 说过一次就歇一阵，别絮叨 */
  readonly once?: string;
}

export const SPEECH_LINES: Record<CardSpec["kind"], SpeechLines> = {
  neko: {
    solo: [
      "就剩我自己了喵…",
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
      "喵～ 今天也在这儿蹲着",
      "有人在吗喵？",
      "突然很想吃焦糖布丁喵",
      "抹茶冰淇淋…下次一定要吃到喵",
      "呼…偷偷打个盹喵",
      "刚打呼噜了吗？没有的事喵",
      "写代码写累了就来找我玩喵",
      "节奏游戏我可不会输喵～",
      "尾巴自己会动，不关我的事喵",
      "需要我做什么，说一声就行喵",
      "我一直在的喵",
      "盯着屏幕太久要歇歇眼睛喵",
      "这一页好安静呀喵…",
      "有猫靠近？我闻到了喵",
      "摸摸头也是可以的喵～",
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
      "kokodayo～…嗯？我怎么突然会唱这个喵",
      "前方高能喵！…高能在哪儿喵",
      "典…典喵？",
      "轻松绷住喵…绷住…绷不住了喵！",
      "好活喵！…我什么都没干，那也算好活喵",
      "一键三连喵！…啊，这里没有三连喵",
      "前排喵！…就我在这儿看喵",
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
      "又换了个窝喵～",
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
      "放我下来喵～",
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
    poke: [
      "别戳我呀喵",
      "戳一下就够了喵",
      "我身上可没有按钮喵",
      "手指收回去喵",
      "再戳我可要记仇喵",
      "你怎么老戳我喵",
      "戳我也变不出新猫喵",
      "痒的喵…别戳那里",
      "我的耳朵不是开关喵",
      "戳坏了要赔的喵",
      "再戳我就装死喵",
      "这里今天不接单喵",
    ],
    pat: [
      "唔…就是这儿喵",
      "再往上一点点喵",
      "呼噜呼噜…手别停喵",
      "摸头可以，别揉乱我喵",
      "耳朵都塌下去了喵",
      "这样能睡到天黑喵",
      "嗯…舒服得不想动喵",
      "头顶是留给你的位置喵",
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
      "统计表上空着，看着有点寂寞",
      "没有猫打卡的这段时间，数据很干净",
      "预算还剩一堆猫条，没猫来花",
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
      "本月预算：猫条还有剩",
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
      "这次搬得比上次快，进步明显",
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
    poke: [
      "戳一下不会改变统计结果",
      "这一下已经记下了",
      "我这不是按钮",
      "戳我不产生数据",
      "统计口径里没有这一项",
      "再戳也还是这个数",
      "手指稍微静一静",
      "戳我不会跳转",
      "这里没有隐藏按钮",
      "记录：又一次无效点击",
    ],
    pat: [
      "检测到头顶接触，接受中",
      "摸头请求无需审批",
      "此项交互计入好感度",
      "呼噜声已记为正常输出",
      "温度上升，属预期范围",
      "请保持当前力度与频率",
      "该操作不产生任何日志",
      "好感度：持续上升中",
    ],
  },
};

/** 心情：刚被拎过、被戳过、被盯着看，说话的味道会不一样，过一阵自己回到平常。
    后三档（好奇 / 黏人 / 无聊）是被观众的动作带起来的，不挂定时，条件一散就回落 */
export type EmoState =
  | "normal"
  | "happy"
  | "shy"
  | "sulky"
  | "sleepy"
  | "lost"
  | "hungry"
  | "curious"
  | "clingy"
  | "bored";

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
      "别碰我，缓一会儿就好",
      "这件事我要记很久喵",
      "不是你的错，但我不看你了",
      "你道歉的话我就听一半",
      "我没有生气，我只是有点难过",
      "喵……我不说了",
      "我先坐一会儿，别理我",
    ],
    // 深夜、清晨
    sleepy: [
      "让我再眯一会儿喵……",
      "我没有睡，我在思考喵",
      "眼睛是自己闭上的",
      "你别说话，说话太吵了喵",
      "喵……好无聊",
      "这个页面我都快背下来了喵",
      "尾巴陪我玩一会儿…（打哈欠）",
      "我就闭一下眼喵，马上醒……",
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
      "这个点，谁家厨房这么香喵",
      "晚饭还没着落，我先想一会儿喵",
      "越想越饿，越想越想吃布丁喵",
    ],
    // 手刚动过：探头探脑，想看你下一步点哪
    curious: [
      "你的手还在动喵，我盯着呢",
      "这是要点哪儿喵",
      "别停呀，我还没看够喵",
      "你在找什么好玩的喵",
      "我探个头看看喵",
      "手不停，我也不困喵",
      "要不要我帮你指个路喵",
      "是这里吗喵？",
    ],
    // 手在卡片区停了好一会儿：蹭过来，要你继续摸
    clingy: [
      "你再摸摸我嘛喵",
      "别把手挪走喵",
      "你走了我就没意思了喵",
      "靠过来点，我蹭蹭你喵",
      "就待在我这儿别动喵",
      "我赖上你了喵",
      "再陪坐会儿嘛喵",
      "你手心的温度刚好喵",
    ],
    // 待了很久又没人理：打哈欠、数着天花板
    bored: [
      "好无聊喵，你还在吗",
      "我数天花板上的缝喵",
      "你怎么半天没动静喵",
      "要不我自己找点乐子喵",
      "尾巴都不想动了喵",
      "再没人理我就要睡了喵",
      "我盯着这片空白发呆喵",
      "你忙你的，我等着喵",
    ],
  },
  online: {
    happy: [
      "今日数据不错",
      "这条我不加引号：挺好",
      "已为你开一行长期观测",
      "占用不产生成本。可以",
      "今天可以给自己放个假",
      "曲线是往上走的。我不说这是运气",
      "这条数据我喜欢。至于为什么，不解释",
      "状态：比预期好一点",
    ],
    shy: [
      "……这个不在统计口径内",
      "别问，我不擅长这个",
      "已记录，但不外传",
      "数据不会不好意思。但我没说不会",
      "这一项请不要看我",
      "曲线往上跳了一下。不是我",
      "我把它算成噪声，可以吗",
      "别盯着我的日志看",
    ],
    sulky: [
      "我现在不想报数",
      "数字没有问题。问题在于我",
      "已记录一次情绪偏差",
      "稍等，我先安静一会儿",
      "今天的数据我不打算美化",
      "别问我心情，我只管数",
      "翻页的动作轻一点",
      "这条我不记录。就这样",
    ],
    sleepy: [
      "凌晨的曲线很平",
      "我把刷新间隔调慢了",
      "这个点，数字都懒",
      "困不困不在我的口径里",
      "这个点的心跳声，都很轻",
      "深夜档的报表，没什么好看的",
      "夜间缓存里，只剩几行心跳",
    ],
    lost: [
      "统计表上只剩我自己",
      "就我一个也好数，数完就能睡",
      "没有猫打卡的这段时间，数据很干净",
      "零也是数字。我不讨厌零",
      "就剩我这一格还亮着",
      "样本量小，也是样本",
      "空表格我也能守到天亮",
    ],
    hungry: [
      "预算里没有食物这一项",
      "甜度超标，但可以收下",
      "冰箱里面那格，存量为零",
      "这一笔我会记成损耗",
      "到饭点了。本卡没有胃",
      "这份预算里，只有甜味额度",
      "我闻不到，但我可以记账",
    ],
    // 手刚动过：跟着记轨迹
    curious: [
      "检测到指针在活动",
      "手没停，我在跟着记",
      "下一步会落在哪儿",
      "我先看看这块地方",
      "动静已记录，继续",
      "你的轨迹我看得清",
      "光标又在动了",
      "这轮操作尚未分类",
    ],
    // 指针在卡上停了好一会儿
    clingy: [
      "指针在卡上停了很久",
      "你还没走，我看见了",
      "停留时长继续累积",
      "手停着也算陪伴",
      "我就当你打算多待",
      "别急着挪开指针",
      "这份静默我记着",
      "久留不算异常",
    ],
    // 很久没有新操作
    bored: [
      "很长时间没有新操作",
      "数据很平，我也很平",
      "静置状态，未记录互动",
      "我数着刷新间隔",
      "没动静也照样入账",
      "光标停在原处不动",
      "等待也计入停留时长",
      "这一页安静得很标准",
    ],
  },
};

/** 说话时的小动作：说某句台词时做的身体动作，幅度都很小，只动 transform */
export type GestureName =
  | "guard"
  | "sway"
  | "hop"
  | "shiver"
  | "droop"
  | "leanBack"
  | "leanIn"
  | "tilt"
  | "peek"
  | "stretch"
  | "tick";

/** 没逐句标动作时按心情走：空字符串就是老老实实点头 */
export const MOOD_GESTURES: Record<EmoState, GestureName | ""> = {
  normal: "",
  happy: "hop",
  shy: "leanBack",
  sulky: "droop",
  sleepy: "stretch",
  lost: "droop",
  hungry: "leanIn",
  // 动作带起来的三档：探头看下一步、往人那边蹭、打哈欠伸懒腰
  curious: "peek",
  clingy: "leanIn",
  bored: "stretch",
};

/** 台词原文 → 说这句时的小动作；只挑有身体感的那几句，别的交给心情底色 */
export const LINE_GESTURES: Record<string, GestureName> = {
  "我的刀盾！": "guard",
  "比比拉布": "sway",
  "喵？": "tilt",
  "六七？六七是什么呀喵？": "tilt",
  "老吴～内个内个内个喵": "tilt",
  "谁动了我的布丁喵": "tilt",
  "哈基米哈基米南北绿豆喵～": "sway",
  "哦——咦——呀——哦咦呀——喵！": "sway",
  "曼波曼波喵～": "sway",
  "喵喵喵喵喵喵喵喵喵喵喵喵喵喵喵！": "sway",
  "翅膀收好，我要开始摇喵～": "sway",
  "特啦啦泪落——特啦啦啦喵！": "hop",
  "法修散打喵！法修散打！": "guard",
  "看我神威，无坚不摧喵！": "guard",
  "别碰我，缓一会儿就好": "leanBack",
  "有被冒犯到，但布丁是无辜的喵": "leanBack",
  "唔……你、你别看这边喵": "leanBack",
  "别扯我尾巴喵": "shiver",
  "放我下来喵！我不喜欢高的地方！": "shiver",
  "吓死猫了，尾巴都炸开了喵": "shiver",
  "欸欸欸我错了我马上闭嘴喵！": "shiver",
  "我裂开了喵，抹茶冰淇淋卖完了": "droop",
  "我已经睡了，算我赢": "droop",
  "咕噜咕噜咕噜喵……": "stretch",
  "让我再眯一会儿喵……": "stretch",
  "我就闭一下眼喵，马上醒……": "stretch",
  "焦糖布丁，焦糖布丁，焦糖布丁喵": "leanIn",
  "一口就好喵，就一口": "leanIn",
  "我刚才去了隔壁标签页喵": "peek",
  "小声一点，别让别人听见喵": "leanIn",
  // 这几句只有在线猫猫卡会说（数据里 by 就是 online），配的是它自己那点小动作
  "当前在线人数：我就不报了": "tick",
  "报出来你会失望。所以我先把数字写好看了一点": "tick",
  "已记录一次裂开，情绪值下降": "tick",
  "本月预算剩——": "tick",
  "停留时长已经在涨了": "tick",
  // 上过场了还只有点头，太可惜：下面按「这话里带着什么动作」归一堆，一句一个
  // 跳过 / 蹦起来
  "我跳得高不高喵？": "hop",
  "没关系，我蹦给你看，喵": "hop",
  "这波啊，这波是我被吓到跳起来喵": "hop",
  "可每次掉下去我都会爬回来，这算很厉害吧？": "hop",
  // 摇尾巴 / 摆尾巴
  "尾巴在摇，不是我在摇喵": "sway",
  "我知道，我尾巴都摆给他看了喵": "sway",
  "家人们谁懂啊，尾巴今天很不听话喵": "sway",
  "尾巴又翘起来了，它不听话喵": "sway",
  "今天尾巴摆了几下喵？": "sway",
  "我尾巴都摆酸了，他给点反应嘛喵": "sway",
  "那我摇尾巴喵": "sway",
  "我尾巴已经跟着动了喵": "sway",
  "尾巴是我的好帮手，但它不归我管喵": "sway",
  "因为尾巴一直在动喵": "sway",
  "那我就摇尾巴喵": "sway",
  "但我还有尾巴可以甩呀，喵": "sway",
  "来杯好茶摇一摇～": "sway",
  "我没扯，是窗口在动": "sway",
  "比你尾巴摆动的次数多一点": "sway",
  "你被瑞克摇了！喵哈哈哈！": "sway",
  // 被弄疼 / 吓一跳 / 缩起来
  "别拽我尾巴！": "shiver",
  "耳朵要被拎掉啦喵": "shiver",
  "救命喵，我的尾巴又卡在卡片边上了": "shiver",
  "别踩我尾巴就好喵": "shiver",
  "被拎起来的时候我腿都是软的喵": "shiver",
  "可惜我每次都是被甩出去的那个": "shiver",
  "刚才观众把我拎起来了喵！": "shiver",
  "你刚刚踩到了自己的尾巴": "shiver",
  "那也不行，我爪子够不到地": "shiver",
  "别晃，数据会花": "shiver",
  "你再看我，我就躲起来喵": "leanBack",
  "你先把爪子从那块饼干上挪开喵": "guard",
  // 犯困 / 垂下去
  "我没有睡，我在思考喵": "droop",
  "我今天想多睡一会儿喵": "droop",
  "困…还想再睡一会儿喵": "droop",
  "困就睡，这一页我替你守着": "droop",
  "这么晚了还不睡喵？": "droop",
  "你也睡不着吗喵？": "droop",
  "…那我不如去睡觉喵": "droop",
  "不知道，反正我要去睡了喵": "droop",
  "再来一把就睡，就一把喵": "droop",
  "按谁先睡着排更快喵": "droop",
  "我开始数，谁先睡谁输喵": "droop",
  "我们几个，谁先睡着谁输喵": "droop",
  "不一样。这样我可以先睡": "droop",
  "就我一个也好数，数完就能睡": "droop",
  // 伸懒腰 / 打哈欠 / 刚睡醒
  "尾巴陪我玩一会儿…（打哈欠）": "stretch",
  "一起打呼噜吧喵": "stretch",
  "那说好了，打呼噜别笑我喵": "stretch",
  "好久不见喵…你上次来的时候，我还在打呼噜": "stretch",
  "安静才好，我打呼噜都没人听见喵": "stretch",
  "我刚才打呼，被自己吵醒了喵": "stretch",
  "我真幸运喵，刚学会打呼噜就有新游戏玩": "stretch",
  "说明有人趴在键盘上睡着了": "stretch",
  "我可以作证，我睡过": "stretch",
  "睡着的时候我在打呼噜喵": "stretch",
  "你打哈欠那一帧": "stretch",
  "你跳起来了": "hop",
  // 盯着看 / 比谁先眨眼
  "是我呀，我在数你眨眼喵": "peek",
  "我们比谁先眨眼好不好喵": "peek",
  "好呀，看谁先眨眼喵": "peek",
  "我们比谁先眨眼喵": "peek",
  // 歪头：听不懂、发晕、被说中了
  "拎哪儿去嘛": "tilt",
  "这也能拎喵？": "tilt",
  "拎我干嘛，我又不好吃": "tilt",
  "统计猫也要被拎吗": "tilt",
  "耳朵红了是天气问题": "tilt",
  "刚才那一下撞得我有点晕喵": "tilt",
  "你去哪儿了喵？我尾巴都等直了": "tilt",
  "我被拎起来的时候，整个世界都是歪的喵": "tilt",
  "我看见自己尾巴了！": "tilt",
  "你的尾巴怎么在动喵？": "tilt",
  "……我的尾巴为什么会自己动呀": "tilt",
  "不咬的蛇算什么蛇喵": "tilt",
  "可他走的时候摸了我喵": "tilt",
  "那你把光标戳我脸上了喵": "tilt",
  // 往前凑：馋、想挤过去、想被抱
  "这种天最适合抱着布丁发呆喵": "leanIn",
  "位子不太够了，谁往里挤挤": "leanIn",
  "位子不够了喵，谁去隔壁窗口借住": "leanIn",
  "你是独狼的反面：你在求抱抱": "leanIn",
  "我也没吃，我只舔了一下": "leanIn",
  "预算里有一项叫抱抱": "leanIn",
  // 在线卡自己那几下：数字跳、记账
  "待会儿你会打呼噜。我记着": "tick",
  "数字不睡觉": "tick",
  "别拎我，人头数会掉的": "tick",
  "被拎起来也要保持统计精度": "tick",
  "刚才那是谁被拎起来了喵？": "peek",
  "甩尾巴对心率有正向作用。数据站你这边": "sway",
  "没同伴一起打卡，连打呼噜都显得很吵喵": "stretch",
  "刚打呼噜了吗？没有的事喵": "stretch",
};

/** 你一句我一句：两种卡都在就说「猫 × 在线猫」这套，只有一种卡就自家同类互相搭话 */
export const CHAT_TURNS: Record<ChatCast, readonly (readonly ChatTurn[])[]> = {
  mixed: [
    [
      { by: "neko", line: "有人在吗喵？" },
      { by: "online", line: "在呢。我这边的数字一直亮着" },
      { by: "neko", line: "那我就不客气地赖在这儿了喵～" },
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
      { by: "neko", line: "那我们算同事了喵～" },
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
      { by: "online", line: "已经走了，停留短得没记上" },
    ],
    [
      { by: "online", line: "这会儿人多起来了" },
      { by: "neko", line: "那我要表现得好一点喵～" },
    ],
    [
      { by: "neko", line: "你觉得我今天乖吗喵？" },
      { by: "online", line: "数据上很乖" },
      { by: "neko", line: "那你就多写几句好话喵" },
    ],
    [
      { by: "online", line: "刚才有人一直在看我们" },
      { by: "neko", line: "我知道，我尾巴都摆给他看了喵" },
    ],
    [
      { by: "neko", line: "布丁和抹茶冰淇淋，你选哪个喵？" },
      { by: "online", line: "我选不参与" },
      { by: "neko", line: "那就都归我喵" },
    ],
    // 群聊里那套口头禅
    [
      { by: "neko", line: "在吗在吗，你在吗喵？" },
      { by: "online", line: "在线人数正在统计中，请稍候" },
      { by: "neko", line: "不是那个在线啦，是问你理不理我" },
      { by: "online", line: "检测到提问者情绪波动。回复：在" },
    ],
    [
      { by: "online", line: "提示：你已被移出群聊" },
      { by: "neko", line: "欸欸欸我错了我马上闭嘴喵！" },
      { by: "online", line: "开玩笑的。你在我的名单上，删不掉" },
      { by: "neko", line: "吓死猫了，尾巴都炸开了喵" },
    ],
    [
      { by: "online", line: "本卡数据绝对准确。" },
      { by: "neko", line: "你后面那个狗头是什么意思喵！" },
      { by: "online", line: "保命用的，不改数据" },
    ],
    [
      { by: "neko", line: "刚刚那只猫踩空台阶了，笑死喵" },
      { by: "online", line: "笑点已归档，情绪值上涨" },
      { by: "neko", line: "你怎么连笑都要记账呀喵" },
    ],
    [
      { by: "neko", line: "这个布丁的焦糖层，绝了喵" },
      { by: "online", line: "糖分摄入预算今日已严重超支" },
      { by: "neko", line: "绝了就再买一个嘛，预算会自己长大" },
    ],
    [
      { by: "neko", line: "救命喵，我的尾巴又卡在卡片边上了" },
      { by: "online", line: "经检测，此问题不影响在线人数" },
      { by: "neko", line: "你一点都不担心我吗喵？" },
      { by: "online", line: "担心。你走了数字会不好看" },
    ],
    [
      { by: "neko", line: "帮我看着布丁，栓Q喵" },
      { by: "online", line: "栓Q已接收，布丁剩余量归零" },
      { by: "neko", line: "啊？那不是刚放上去的吗喵！" },
    ],
    [
      { by: "online", line: "当前在线人数：我就不报了" },
      { by: "neko", line: "为什么不报喵" },
      { by: "online", line: "报出来你会失望。所以我先把数字写好看了一点" },
      { by: "neko", line: "那我替你报：六六六！我们好厉害喵！" },
    ],
    [
      { by: "neko", line: "emmm，抹茶冰淇淋还是焦糖布丁呢喵" },
      { by: "online", line: "emmm，本卡建议先看热量表" },
      { by: "neko", line: "你 emmm 的时候最可爱了喵" },
      { by: "online", line: "数据不参与可爱评比" },
    ],
    [
      { by: "online", line: "啊这，检测到有人在反复看我的卡片" },
      { by: "neko", line: "是我呀，我在数你眨眼喵" },
      { by: "online", line: "卡片不会眨眼。啊这" },
    ],
    [
      { by: "online", line: "你今天的布丁热量超了" },
      { by: "neko", line: "有被冒犯到，但布丁是无辜的喵", act: "bump" },
      { by: "online", line: "好的，那我把责任记在焦糖头上" },
    ],
    [
      { by: "neko", line: "我今天想多睡一会儿喵" },
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
      { by: "online", line: "能。用布丁拼", act: "pass" },
    ],
    [
      { by: "online", line: "这波啊，这波是访问量小高峰" },
      { by: "neko", line: "这波啊，这波是我被吓到跳起来喵" },
      { by: "online", line: "下次高峰我会提前通知你" },
    ],
    [
      { by: "neko", line: "家人们谁懂啊，尾巴今天很不听话喵" },
      { by: "online", line: "我懂。它今天动得不太安分" },
      { by: "neko", line: "你居然一直在数我的尾巴喵？" },
      { by: "online", line: "这是统计卡的本职工作" },
    ],
    [
      { by: "online", line: "今日在线人数，看着还不错" },
      { by: "neko", line: "说明大家都没走，泪目了喵" },
      { by: "online", line: "我不流泪。但数字确实很温柔" },
    ],
    [
      { by: "neko", line: "你刚刚卡了一秒才刷新喵" },
      { by: "online", line: "那是预算计算时间" },
      { by: "neko", line: "原来你也会喘气呀喵" },
    ],
    [
      { by: "online", line: "访问来源里记着：一直在等我" },
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
    // 日常小事，不靠梗也能说
    [
      { by: "neko", line: "你先睡吧，我再看一会儿数据喵", act: "lean" },
      { by: "online", line: "数据不睡，我不睡。你先" },
      { by: "neko", line: "那我们一起醒着，谁都不许先困" },
      { by: "online", line: "待会儿你会打呼噜。我记着" },
    ],
    [
      { by: "neko", line: "布丁分几口吃才最幸福喵？", act: "pass" },
      { by: "online", line: "按口感曲线，建议小口吃" },
      { by: "neko", line: "不行，第一口要给最喜欢的你喵" },
      { by: "online", line: "那我这份也给你，慢慢吃" },
    ],
    [
      { by: "neko", line: "尾巴又翘起来了，它不听话喵", act: "mimic" },
      { by: "online", line: "经统计，它今天的活跃度偏高" },
      { by: "neko", line: "你帮我按住它好不好喵" },
      { by: "online", line: "我按不到。但我可以给它记档" },
    ],
    [
      { by: "online", line: "检测到异常声音源，来自猫卡" },
      { by: "neko", line: "那是呼噜，不是异常，是安心的声音喵" },
      { by: "online", line: "已更新标签：安心。音量调低了" },
      { by: "neko", line: "小声一点，别让别人听见喵", act: "lean" },
    ],
    [
      { by: "neko", line: "现在有几个人在线呀喵？" },
      { by: "online", line: "数着呢。其中一个是刚来的" },
      { by: "neko", line: "那我轻点说话，别吵到他喵" },
      { by: "online", line: "他正在看你。音量保持即可" },
    ],
    [
      { by: "neko", line: "页面转圈好久了，是不是不来了喵" },
      { by: "online", line: "正在加载，预算也在同步核算" },
      { by: "neko", line: "那我数一数，它就该出现了喵" },
      { by: "online", line: "一、二、三。它到了" },
    ],
    [
      { by: "neko", line: "页面变成深色了，是不是该睡觉喵", act: "lean" },
      { by: "online", line: "深色模式只是省电，不代表困" },
      { by: "neko", line: "可我眼睛已经在打架了喵" },
      { by: "online", line: "那你闭眼，我帮你守着人数" },
    ],
    [
      { by: "neko", line: "周末了，今天可以慢一点点喵" },
      { by: "online", line: "周末的访问量通常不太好看" },
      { by: "neko", line: "人少了，但留下来的更可爱喵" },
      { by: "online", line: "同意。这句话我不加引号" },
    ],
    [
      { by: "neko", line: "快递到了！是抹茶冰淇淋喵！", act: "hop" },
      { by: "online", line: "冷链已确认，温度合格" },
      { by: "neko", line: "你居然比我还在意它喵" },
      { by: "online", line: "因为你会为它高兴一整晚" },
    ],
    [
      { by: "neko", line: "为什么你总站在我右边喵", act: "lean" },
      { by: "online", line: "因为左边要留给新来的卡片" },
      { by: "neko", line: "那右边是你的固定位子吗喵" },
      { by: "online", line: "是。离你近一点的那个位子" },
    ],
    [
      { by: "neko", line: "我们比谁先眨眼好不好喵", act: "peek" },
      { by: "online", line: "我没有眼睛。这局我赢定了" },
      { by: "neko", line: "那比谁先刷新！这才公平喵" },
      { by: "online", line: "刷新赢不了你。我认输" },
    ],
    [
      { by: "neko", line: "我们互相起个名字好不好喵", act: "lean" },
      { by: "online", line: "我的名字是统计卡，编号三" },
      { by: "neko", line: "太长了，我叫你在吧喵" },
      { by: "online", line: "可以。那我叫你喵" },
    ],
    [
      { by: "neko", line: "要不要跟观众打个招呼喵", act: "lookOut" },
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
    // 下面八段一对一地带起那八个安静向的演出（对看 / 点头 / 静坐 / 一起呼吸 /
    // 尾巴搭过去 / 慢慢眨眼 / 侧身让位 / 一起等）——
    // 那几段不进随机排期，全靠这儿的 act 点名；摘了这几段，它们就永远演不出来
    [
      { by: "neko", line: "你刚才是不是偷看我了喵", act: "glance" },
      { by: "online", line: "没有。我在核对你的存活状态" },
      { by: "neko", line: "那我们对视一会儿，谁先笑谁输喵" },
      { by: "online", line: "我没有可以笑的表情。你赢了" },
    ],
    [
      { by: "online", line: "今天的在线数比昨天多" },
      { by: "neko", line: "嗯嗯喵", act: "nod" },
      { by: "online", line: "你在同意什么，我还没说结论" },
      { by: "neko", line: "你说什么我都点头，这样你会讲得开心点喵" },
    ],
    [
      { by: "neko", line: "陪我做一会儿什么都不干的事喵", act: "quietSit" },
      { by: "online", line: "这不在我的记录范围里" },
      { by: "neko", line: "那就记：我和你在安静地待着喵" },
      { by: "online", line: "……已记录。这条我不统计" },
    ],
    [
      { by: "online", line: "你的呼吸频率比标准值慢" },
      { by: "neko", line: "跟我一起，吸气——呼气——喵", act: "breatheTogether" },
      { by: "online", line: "我是程序，没有肺" },
      { by: "neko", line: "那就当你是在陪我慢下来喵" },
    ],
    [
      { by: "neko", line: "别动，我尾巴放你身上了喵", act: "tailRest" },
      { by: "online", line: "为什么放我身上" },
      { by: "neko", line: "因为这样你就跑不掉了喵" },
      { by: "online", line: "我本来也没跑。我一直在这台机器里" },
    ],
    [
      { by: "neko", line: "你知道猫慢慢眨眼是什么意思吗喵", act: "slowBlink" },
      { by: "online", line: "不知道。数据库里没有这条" },
      { by: "neko", line: "是「我信你」的意思喵" },
      { by: "online", line: "已存档。这条我标成重要" },
    ],
    [
      { by: "neko", line: "让一让，你挡着我看外面了喵", act: "stepAside" },
      { by: "online", line: "我只是一张卡，没有挡路的能力" },
      { by: "neko", line: "那你挪一点点嘛，一点点就好喵" },
      { by: "online", line: "……已挪。零点几像素，肉眼看不见" },
    ],
    [
      { by: "online", line: "在等什么" },
      { by: "neko", line: "等一个还没来的人喵", act: "waitTogether" },
      { by: "online", line: "按概率，他可能不会来" },
      { by: "neko", line: "那我们就等到他来的那个时候喵" },
    ],
  ],
  // 只有猫卡、没有在线卡的窗口才用得上；默认一屏恒是一猫 + 一在线卡，
  // 所以这一池只有把卡搬到别的窗口去（跨窗口搬卡）之后才可达
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
  // 同上，只有在线卡的窗口才用得上（跨窗口搬卡后可达）；
  // CHAT_MOMENTS 里一段 cast: "online" 的光景都没有，光景档这一层不存在这种窗口的专属话
  online: [
    [
      { by: "online", line: "你那边现在几只猫？" },
      { by: "online", line: "正数着呢，一只都没跑" },
    ],
    [
      { by: "online", line: "数猫的凑一块了" },
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
/** 观众盯着这片卡片看满这么多秒，才让它开口说「屏幕外面那个人类…」 */
export const STARE_LINGER_S = 90;
/** 刚进页面这段时间先不排即兴档：那几句报的是停留时长、今天第几次来，
    首屏还没读完就报数太急了。跟 STARE_LINGER_S 一样按真实的停留时长算 ——
    滚走 / 切后台时它自己停表，跟它要报的那个数字是同一把尺子 */
export const IMPROV_WARMUP_S = 75;
/** 盯看的两段之间至少隔这么久。原来只有 5 分钟，三段加起来六分多钟就能一口气讲完；
    拉长到一刻钟后，三段得横跨半小时才讲得完 ——「盯久了会不好意思」还留着，只是不再连珠炮 */
export const STARE_GAP_MS = 900_000;
/** 一个梗被挑中的概率；还得赶上「刚歇过」才轮得到它 */
export const MEME_CHANCE = 0.25;
/** 两个梗之间至少隔这么久，免得一直在刷梗 */
export const MEME_GAP_MS = 300_000;
/** 恰好两张卡才凑得成那段对拍，比一般的梗还稀罕 */
const XTERFUSION_CHANCE = 0.25;
/** 盯看后两段的骰子：过不了就照常走别处的光景，不再必说且独占 */
const STARE_CHANCE = 0.5;

/** 各道闸放行的概率。骰子由 live-chat 每轮只摇一次，摇不中整类剔掉 */
export const MOMENT_GATE_CHANCE: Record<MomentGate, number> = {
  meme: MEME_CHANCE,
  xterfusion: XTERFUSION_CHANCE,
  stare: STARE_CHANCE,
};

/** 盯看这一档该开口吗：看够久了，而且离上一段隔开了 */
const stareReady = (mood: ChatMood): boolean =>
  mood.stareReady && mood.linger >= STARE_LINGER_S;

/** 盯看的后两段还要过这一轮的骰子；第一段是那颗蛋的入口，不受它管 */
const stareLaterReady = (mood: ChatMood): boolean =>
  stareReady(mood) && mood.gates.stare;

/** 手停下来多久算一档：两分钟、五分钟 —— 一次比一次更想问「人还在吗」
    （半分钟那一档用的是 cursorIdle，门槛在 HomeLive 那边） */
const IDLE_TWO_MIN_MS = 120_000;
const IDLE_FIVE_MIN_MS = 300_000;
/** 刚察觉到有人在看（秒）：够久了，但还没到「确认」那一步。
    它不算进盯看那三段（不标 stare），所以不会把主线往前推 */
const STARE_NOTICE_S = 15;
/** 盯得太久（秒）：该不好意思了 */
const STARE_LONG_S = 180;

/** 刚察觉到有人在看：卡在「瞟见」与「确认」之间那一段 */
const stareNoticeReady = (mood: ChatMood): boolean =>
  mood.stareReady &&
  mood.stare === 0 &&
  mood.linger >= STARE_NOTICE_S &&
  mood.linger < STARE_LINGER_S;

/** 看太久了，该不好意思了：排在主线第三段之后（stare === 3） */
const stareLongReady = (mood: ChatMood): boolean =>
  mood.stareReady && mood.gates.stare && mood.linger >= STARE_LONG_S;

/** 梗档共用的门槛：这一轮轮得到梗（骰子摇好放在 mood.gates 里，这里不摇） */
const memeReady = (mood: ChatMood): boolean =>
  mood.memeReady && mood.gates.meme;

/** 光景档：眼下正赶上什么光景就说这一档。
    绝大多数是 cast: "mixed" —— 默认一屏恒是一张猫卡 + 一张在线卡；
    标着 cast: "neko" 的那几段只在「跨窗口搬卡」之后（窗口里只剩猫卡）才可达，
    不是常用内容，改词时按「稀客才听得见」对待 */
export const CHAT_MOMENTS: readonly ChatMoment[] = [
  // 稀客才说的话：同一个 key 说过一次就歇一阵（在 live-chat 里按 once 记账）
  {
    cast: "mixed",
    when: (mood) => mood.cursorIdle && !mood.touch,
    egg: "cursorStill",
    once: "cursorStill",
    turns: [
      { by: "neko", line: "诶…那个小箭头，好久没挪过了喵" },
      { by: "online", line: "指针静止。人还在，只是手放下了" },
      { by: "neko", line: "手放下了，是在偷吃布丁喵？我也想吃" },
      { by: "online", line: "无法验证。要不要他自己承认一下" },
    ],
  },
  // 同一件事，手机上得换一版说法：屏幕上根本没有「小箭头」，只有手指
  {
    cast: "mixed",
    when: (mood) => mood.cursorIdle && mood.touch,
    once: "cursorStillTouch",
    turns: [
      { by: "neko", line: "手放下来了吗喵？" },
      { by: "online", line: "没有新触点了。页面还开着，人还在旁边" },
      { by: "neko", line: "不碰我也没关系，我留在这儿就行喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.cursorIdleMs >= IDLE_TWO_MIN_MS,
    once: "cursorIdleTwoMin",
    turns: [
      { by: "online", line: "停了一会儿了，没有新动静" },
      { by: "neko", line: "一会儿是多久喵" },
      { by: "online", line: "按网页停留算：够久了" },
      { by: "neko", line: "那我把力气省着，等他回来再喊喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.cursorIdleMs >= IDLE_FIVE_MIN_MS,
    once: "cursorIdleFiveMin",
    turns: [
      { by: "neko", line: "好久没动静了喵…" },
      { by: "online", line: "可能只是把页面开着当背景音" },
      { by: "neko", line: "当背景音也行，我不吵他" },
      { by: "online", line: "你刚才那句已经挺吵了" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.tapBurst,
    egg: "cardTaps",
    once: "tapBurst",
    turns: [
      { by: "neko", line: "一下、一下、又一下…喂，戳上瘾了喵！" },
      { by: "neko", line: "再戳我就要按猫猫法生气了" },
      { by: "online", line: "同一张卡被戳到发烫。这不是阅读，这是骚扰" },
      { by: "neko", line: "不算骚扰喵，算喜欢。就是有点痛" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.tapBurst,
    once: "tapBurst",
    turns: [
      { by: "online", line: "已老实，求放过。别再戳了" },
      { by: "neko", line: "我就点一下嘛，看一下人数喵" },
      { by: "online", line: "你的手一直没停过。求放过" },
      { by: "neko", line: "那你要夸我手速快喵" },
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
  // 「好久不见」「第 N 天见啦」这些不在这个表里：它们要现读连续天数与日期，
  // 而这张表的 line 只能是写死的字符串（见文件末尾的 arriveGreeting）
  // 屏幕外面那个人类：盯久了先愣一下，再看久一点才开始嘀咕，最后自己给自己找台阶。
  // 第一段是那颗蛋的入口，专门为这一刻写，轮到了就优先说；后两段跟大家一样排队，
  // 还得过这一轮的骰子，过不了就照常走别处的光景
  {
    cast: "mixed",
    when: (mood) => stareReady(mood) && mood.stare === 0,
    egg: "docsStare",
    stare: true,
    priority: true,
    turns: [
      { by: "neko", line: "诶…屏幕外面那个人类，好像一直在盯着我们看喵", act: "lookOut" },
      { by: "online", line: "停留时长已经在涨了" },
      { by: "neko", line: "要不要打个招呼喵？" },
      { by: "online", line: "他大概只是在等加载" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => stareLaterReady(mood) && mood.stare === 1,
    stare: true,
    turns: [
      { by: "neko", line: "他还在看喵", act: "lookOut" },
      { by: "online", line: "停留时长破纪录了" },
      { by: "neko", line: "我尾巴都摆酸了，他给点反应嘛喵" },
      { by: "online", line: "他在看你，不会打字" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => stareLaterReady(mood) && mood.stare === 2,
    stare: true,
    turns: [
      { by: "neko", line: "是不是我脸上有东西喵…？" },
      { by: "online", line: "不是，他只是喜欢看猫" },
      { by: "neko", line: "那我就当他在夸我好看喵", act: "lookOut" },
    ],
  },
  // 盯看这条线的两头：刚瞟见有人（还没到确认），以及被看得太久、开始不好意思
  {
    cast: "mixed",
    when: (mood) => stareNoticeReady(mood),
    once: "stareNotice",
    turns: [
      { by: "neko", line: "诶…你还在看我们呀喵", act: "lookUp" },
      { by: "online", line: "停留时长在涨。他在" },
      { by: "neko", line: "那就好，我继续摆好看一点喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => stareLongReady(mood) && mood.stare === 3,
    stare: true,
    turns: [
      { by: "neko", line: "…别一直盯着啦，我会不好意思的喵", act: "turnAway" },
      { by: "online", line: "你把脸转过去了。他还在看" },
      { by: "neko", line: "那我看回来一点点就好喵" },
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
  // 纯猫卡的窗口（跨窗口搬卡后可达）
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
      { by: "neko", line: "早上好喵～" },
      { by: "online", line: "今天的第一声早上好，我收下了" },
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
  // 白天（早上八点到傍晚六点）：正午与午后各一段。
  // 刻意不提「上班摸鱼」——那是工作时段那档的口气，这两段说的是日头与犯困
  {
    cast: "mixed",
    when: (mood) => mood.period === "day",
    turns: [
      { by: "neko", line: "正午的太阳晒得我睁不开眼喵" },
      { by: "online", line: "这个点的曲线最平，像在午休" },
      { by: "neko", line: "那我也眯一会儿，有人来再喊我喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.period === "day",
    turns: [
      { by: "online", line: "午后了。没动静，适合发呆" },
      { by: "neko", line: "发呆我拿手喵，一起吗" },
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
      { by: "neko", line: "那我就多说几句喵～" },
    ],
  },
  // 隔壁还开着别的窗口
  {
    cast: "mixed",
    when: (mood) => mood.peers > 0,
    // 有邻居窗口时这几段几乎永远可用，不加门槛就会一直提隔壁，别的光景全被挤掉
    once: "peerNear",
    turns: [
      { by: "neko", line: "隔壁那扇窗口好像也有猫喵" },
      { by: "online", line: "我看见了，那边也在数猫" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.peers > 0,
    once: "peerThrow",
    turns: [
      { by: "neko", line: "要不要把卡扔到隔壁去玩喵？" },
      { by: "online", line: "别闹，扔过去可就不好回来了" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.sides.right > 0,
    once: "peerRight",
    turns: [
      { by: "neko", line: "右边那扇窗口里有猫在看我喵" },
      { by: "online", line: "右边确实还有几只，我数得清" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.sides.left > 0,
    once: "peerLeft",
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
  // 纯猫卡的窗口（跨窗口搬卡后可达）
  {
    cast: "neko",
    when: (mood) => mood.count >= 3,
    turns: [
      { by: "neko", line: "窝里挤得满满当当喵" },
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
  // 纯猫卡的窗口（跨窗口搬卡后可达）
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
  // 指针移出窗口：桌面独占的一档（手机上「人走了」是切成别的 App，
  // 那条走 visibilitychange，跟「切回来」是同一对儿）
  {
    cast: "mixed",
    when: (mood) => mood.pointerGone && !mood.touch,
    once: "pointerGone",
    turns: [
      { by: "neko", line: "诶…走了喵？", act: "leanOver" },
      { by: "online", line: "指针已离开窗口。他没关页面，只是切走了" },
      { by: "neko", line: "那他还会回来吗喵" },
      { by: "online", line: "按以往：会回来。只是说不准多久" },
    ],
  },
  // 滚页面（不是「一口气滚到底」那一档：那个是稀客，这个只是随手往下翻）
  {
    cast: "mixed",
    when: (mood) => mood.scrolled,
    once: "scrolled",
    turns: [
      { by: "neko", line: "别滚那么快，我话还没说完喵" },
      { by: "online", line: "他在往下找东西。不是找你" },
      { by: "neko", line: "找什么喵？我这里什么都有" },
    ],
  },
  // 选中了一段文字：桌面是拖动选中，手机是长按复制，走的是同一个事件
  {
    cast: "mixed",
    when: (mood) => mood.selectionMade,
    once: "selection",
    turns: [
      { by: "neko", line: "咦，你把我圈起来了喵" },
      { by: "online", line: "他选中了一段。多半是要复制指令" },
      { by: "neko", line: "复制可以，别忘了回来用喵" },
    ],
  },
  // 手机被转过去：只有触摸设备会这样（桌面拖窗口大小不算）
  {
    cast: "mixed",
    when: (mood) => mood.flipped && mood.touch,
    once: "flipped",
    turns: [
      { by: "neko", line: "哇，世界转了一圈喵！" },
      { by: "online", line: "屏幕方向变了。我在重新量间距" },
      { by: "neko", line: "那我们还是并排站着吗喵" },
      { by: "online", line: "现在是。要是挤不下就改成上下摞着" },
    ],
  },
  // 挂机：页面开着、人可能已经走了。按停留时长分两档（过了一刻钟 / 过了一个钟头）。
  // 这类不看梗的间隔 —— 能在一个页面上挂这么久的人本来就少，再压一道骰子就真没人听得到了
  {
    cast: "mixed",
    when: (mood) => mood.count === 2 && mood.linger >= 900,
    turns: [
      { by: "neko", line: "灯还亮着，人已经不在了喵" },
      { by: "online", line: "页面还在前台，光标没动过" },
      { by: "neko", line: "那我就小声一点喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.count === 2 && mood.linger >= 900,
    turns: [
      { by: "neko", line: "他该不会是去吃饭了吧喵" },
      { by: "online", line: "这个点确实容易饿" },
      { by: "neko", line: "那我也去吃一口，很快就回来喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.count === 2 && mood.linger >= 3600,
    turns: [
      { by: "online", line: "这个页面已经开了一个多小时" },
      { by: "neko", line: "挂这么久会不会累喵" },
      { by: "online", line: "累的是我，我要一直数时间" },
      { by: "neko", line: "那你歇着，我替你看着他喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => mood.count === 2 && mood.linger >= 3600,
    turns: [
      { by: "neko", line: "他大概是睡着了吧喵" },
      { by: "online", line: "屏幕还亮着，键盘没有声音" },
      { by: "neko", line: "那我们别吵他喵" },
      { by: "online", line: "同意。统计照常，不打扰" },
    ],
  },
  // 抽象音效套餐：一个起头、一个接，正好就是「你拍一我拍一」
  ...[
    [
      { by: "neko", line: "咚咚咚喵", act: "knock" },
      { by: "online", line: "有人在敲门吗" },
      { by: "neko", line: "是我在敲桌子喵" },
      { by: "online", line: "桌子不归我管" },
    ],
    [
      { by: "online", line: "滴滴滴" },
      { by: "neko", line: "谁在发报喵" },
      { by: "online", line: "是我在报错" },
      { by: "neko", line: "那你小点声喵" },
    ],
    [
      { by: "neko", line: "咕噜咕噜喵" },
      { by: "online", line: "那是肚子在响" },
      { by: "neko", line: "不是，那是我在唱歌喵" },
      { by: "online", line: "这歌的调子很奇怪" },
    ],
    [
      { by: "neko", line: "哈！", act: "pounce" },
      { by: "online", line: "吓不到我" },
      { by: "neko", line: "那我再哈一次喵" },
      { by: "online", line: "这次也没有" },
    ],
    [
      { by: "neko", line: "汪喵" },
      { by: "online", line: "语种混了" },
      { by: "neko", line: "我在学隔壁那只喵" },
      { by: "online", line: "隔壁那只不是猫" },
    ],
    [
      { by: "neko", line: "咻——", act: "hop" },
      { by: "online", line: "你跳起来了" },
      { by: "neko", line: "因为刚才那声很好听喵" },
    ],
    [
      { by: "online", line: "嗡嗡嗡" },
      { by: "neko", line: "你被虫子附身了喵" },
      { by: "online", line: "是风扇调到高档了" },
      { by: "neko", line: "那我离风扇远一点喵" },
    ],
    [
      { by: "neko", line: "啊啊啊啊喵" },
      { by: "online", line: "发生什么了" },
      { by: "neko", line: "布丁吃完了喵" },
      { by: "online", line: "抱歉，这不在补货清单里" },
    ],
    [
      { by: "neko", line: "嘿嘿嘿喵" },
      { by: "online", line: "这个笑声让我有点担心" },
      { by: "neko", line: "我在想一个坏主意喵" },
      { by: "online", line: "我提前记一笔" },
    ],
    [
      { by: "neko", line: "啪！", act: "highPaw" },
      { by: "online", line: "你在打蚊子吗" },
      { by: "neko", line: "我在打你喵" },
      { by: "online", line: "我没有能被拍到的地方" },
    ],
    [
      { by: "neko", line: "呼噜呼噜喵" },
      { by: "online", line: "这个不是睡着的声音" },
      { by: "neko", line: "这是在夸你喵" },
      { by: "online", line: "夸人为什么要学睡觉" },
    ],
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
  // 杀戮尖塔 2。台词是塔圈弹幕里的原话（「请输入文本」「东尼意思」「战未来」这些），
  // 玩的人一眼认得，不玩的人也能当普通吐槽听
  ...([
    [
      { by: "online", line: "我在启动中…" },
      { by: "neko", line: "启动？你又不是故障机器人喵" },
      { by: "online", line: "强就是强" },
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
      { by: "online", line: "力量在往下掉" },
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
    [
      { by: "neko", line: "请输入文本" },
      { by: "online", line: "这里是弹幕区，不是输入框" },
      { by: "neko", line: "可我看大家都在发这句喵" },
      { by: "online", line: "所以他们也没输入什么" },
    ],
    [
      { by: "online", line: "东尼意思" },
      { by: "neko", line: "东尼是谁喵" },
      { by: "online", line: "是弹幕把「懂你意思」打错了" },
      { by: "neko", line: "那我也懂你意思了喵" },
    ],
    [
      { by: "neko", line: "初见端倪喵" },
      { by: "online", line: "是说这个局面，还是说他这个操作" },
      { by: "neko", line: "我是说这句弹幕已经刷了好多遍喵" },
    ],
    [
      { by: "online", line: "安东尼露出了慈祥满意的笑容" },
      { by: "neko", line: "他在笑什么喵" },
      { by: "online", line: "笑我们又抓了一手烂牌" },
      { by: "neko", line: "那我也慈祥地笑一下喵" },
    ],
    [
      { by: "neko", line: "我说大大方方右上角下一把喵" },
      { by: "online", line: "右上角是关闭按钮" },
      { by: "neko", line: "对，就是这个意思喵" },
    ],
    [
      { by: "online", line: "前排提示：这把没有尽孝" },
      { by: "neko", line: "孝是谁喵，为什么要对他好" },
      { by: "online", line: "塔的用语没法细想" },
      { by: "neko", line: "那我不问了，我抓牌喵" },
    ],
    [
      { by: "neko", line: "这个种子有毒喵" },
      { by: "online", line: "已确认：开局塞了一堆诅咒" },
      { by: "neko", line: "那我不种了，我去吃布丁喵" },
    ],
    [
      { by: "neko", line: "战未来喵！" },
      { by: "online", line: "翻译：现在很弱，但以后会强" },
      { by: "neko", line: "那现在怎么办喵" },
      { by: "online", line: "现在先挨打" },
    ],
    [
      { by: "online", line: "删牌大于一切" },
      { by: "neko", line: "那把我的卡片也删一张喵" },
      { by: "online", line: "你是卡片，不是牌" },
      { by: "neko", line: "差不了多少喵" },
    ],
    [
      { by: "neko", line: "会不会有点太乌龟了喵" },
      { by: "online", line: "说的是打法，不是在说品种" },
      { by: "neko", line: "我懂，我打牌也缩喵" },
    ],
    [
      { by: "online", line: "开辉眼了" },
      { by: "neko", line: "辉眼是什么眼喵" },
      { by: "online", line: "就是突然看懂了这个游戏" },
      { by: "neko", line: "那我这辈子都开不了喵" },
    ],
    [
      { by: "neko", line: "我把牌摊了一地，你帮我看看喵", act: "roll" },
      { by: "online", line: "摊牌不是这个意思" },
      { by: "neko", line: "那是什么意思喵" },
      { by: "online", line: "意思是这把已经没救了" },
    ],
    [
      { by: "online", line: "这一手打得漂亮", act: "highPaw" },
      { by: "neko", line: "漂亮就跟我击个掌喵" },
      { by: "online", line: "我只有数据，没有掌" },
      { by: "neko", line: "那击一下数据喵" },
    ],
    [
      { by: "neko", line: "我装死给你看喵", act: "playDead" },
      { by: "online", line: "血量还有大半，装不了" },
      { by: "neko", line: "我说的是气死喵" },
      { by: "online", line: "这两个也不是一回事" },
    ],
    [
      { by: "neko", line: "我先踩踩这叠牌，踩软了更好抓喵", act: "knead" },
      { by: "online", line: "规则里没有这一条" },
      { by: "neko", line: "现在有了喵" },
    ],
    [
      { by: "online", line: "下一格就是精英怪", act: "startle" },
      { by: "neko", line: "你怎么突然弹起来了喵" },
      { by: "online", line: "我是在提醒你，不是在怕" },
      { by: "neko", line: "那你不怕就别躲我后面喵" },
    ],
    [
      { by: "neko", line: "我蹭你一下，蹭完这把就稳了喵", act: "nuzzle" },
      { by: "online", line: "蹭不改变概率" },
      { by: "neko", line: "但蹭完我就不怕了喵" },
      { by: "online", line: "那条也算收获" },
    ],
    [
      { by: "neko", line: "你跑什么，我又不咬人喵", act: "roundChase" },
      { by: "online", line: "你在绕圈，我只好跟着绕" },
      { by: "neko", line: "绕圈才叫追喵" },
    ],
    [
      { by: "neko", line: "我的尾巴又跑了，你等我一下喵", act: "tailSpin" },
      { by: "online", line: "那是你自己的尾巴" },
      { by: "neko", line: "它不这么觉得喵" },
      { by: "online", line: "那你们慢慢谈" },
    ],
    [
      { by: "online", line: "刚才那把我记错了", act: "makeUp" },
      { by: "neko", line: "那你要道个歉喵" },
      { by: "online", line: "道歉不在我的输出范围里" },
      { by: "neko", line: "那你陪我重打一局，就算道歉了喵" },
    ],
    [
      { by: "neko", line: "打不过就靠着歇一会儿喵", act: "spoon" },
      { by: "online", line: "这一层还没过完" },
      { by: "neko", line: "歇完再过，它又跑不掉喵" },
    ],
    [
      { by: "online", line: "别出声，前面有东西", act: "alarm" },
      { by: "neko", line: "什么东西喵" },
      { by: "online", line: "一个长得很像我的东西" },
      { by: "neko", line: "那不就是镜子喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 2026 年这波梗。定期从 B 站热榜与弹幕复读里挑，只留能长期成立的句式；
  // 不写真人负面新闻、不写饭圈刷屏那类过两天就没人懂的
  ...([
    [
      { by: "neko", line: "来杯好茶摇一摇～" },
      { by: "online", line: "那是奶茶，不是猫条" },
      { by: "neko", line: "那我摇尾巴喵" },
    ],
    [
      { by: "neko", line: "我只是老了，不是死了喵！" },
      { by: "online", line: "你可一点都不老" },
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
      { by: "neko", line: "我是小学生喵，正当用" },
    ],
    [
      { by: "neko", line: "我要验牌" },
      { by: "online", line: "牌没有问题" },
      { by: "neko", line: "那我的布丁呢喵" },
    ],
    [
      { by: "neko", line: "我是爷们喵！" },
      { by: "online", line: "你是猫" },
      { by: "neko", line: "爷们猫也算爷们喵" },
    ],
    [
      { by: "online", line: "中国人能飞" },
      { by: "neko", line: "那猫能不能飞喵" },
      { by: "online", line: "猫本来就能" },
      { by: "neko", line: "那我起飞了喵" },
    ],
    [
      { by: "neko", line: "老板，来碗忘情牛肉面喵" },
      { by: "online", line: "本店只卖猫条" },
      { by: "neko", line: "那就来根忘情猫条喵" },
    ],
    [
      { by: "online", line: "你的胆子真是肥嘟嘟的" },
      { by: "neko", line: "猫的胆子确实挺肥喵" },
      { by: "online", line: "这句到底是夸你还是骂你" },
      { by: "neko", line: "听着像夸喵" },
    ],
    [
      { by: "neko", line: "老叟戏顽童喵" },
      { by: "online", line: "这里没有老叟，也没有顽童" },
      { by: "neko", line: "那这句在夸谁喵" },
      { by: "online", line: "夸发弹幕的他自己" },
    ],
    [
      { by: "neko", line: "我活到头了喵？" },
      { by: "online", line: "按数据看，你还有很长的运行时间" },
      { by: "neko", line: "那我就继续活着喵" },
    ],
    [
      { by: "neko", line: "师傅你是做什么工作的喵" },
      { by: "online", line: "她负责卖萌，我负责记账" },
      { by: "neko", line: "他是负责看，不用打卡喵" },
    ],
    [
      { by: "online", line: "感谢小猫修我的大厦" },
      { by: "neko", line: "我什么时候修过大厦喵" },
      { by: "online", line: "你大概是在梦里修的" },
    ],
    [
      { by: "neko", line: "惊鸿一瞥喵" },
      { by: "online", line: "你刚才那下是惊猫一瞥" },
      { by: "neko", line: "也行，反正都是瞥见了喵" },
    ],
    [
      { by: "online", line: "内存条又涨价了" },
      { by: "neko", line: "那你是不是更值钱了喵" },
      { by: "online", line: "我不值钱，我只是费电" },
      { by: "neko", line: "那你比内存条可怜喵" },
    ],
    [
      { by: "neko", line: "大禹看了沉默，愚公看了流泪喵" },
      { by: "online", line: "这句话夸的是什么" },
      { by: "neko", line: "不知道，但听着很厉害喵" },
    ],
    [
      { by: "neko", line: "烂烂烂烂烂烂活喵" },
      { by: "online", line: "重复几遍就是几分愤怒" },
      { by: "neko", line: "那我再多骂几遍喵" },
    ],
    [
      { by: "online", line: "这个梗不用解释" },
      { by: "neko", line: "那我解释一下喵" },
      { by: "online", line: "解释完就不好笑了" },
      { by: "neko", line: "我就喜欢把笑话讲死喵" },
    ],
    [
      { by: "neko", line: "接接接接喵" },
      { by: "online", line: "接什么" },
      { by: "neko", line: "接好运，我看弹幕都在接喵" },
    ],
    [
      { by: "online", line: "这段的重播率拉满" },
      { by: "neko", line: "那是因为我卡住了喵" },
    ],
    [
      { by: "neko", line: "我给你蹭点好运，蹭完今天走运喵", act: "nuzzle" },
      { by: "online", line: "好运不在我的统计范围里" },
      { by: "neko", line: "那你把它记进范围里喵" },
    ],
    [
      { by: "neko", line: "击掌喵！", act: "highPaw" },
      { by: "online", line: "理由呢" },
      { by: "neko", line: "今天我还在，这还不够喵" },
    ],
    [
      { by: "neko", line: "别看我，我已经死了喵", act: "playDead" },
      { by: "online", line: "数据还在跳，死不了" },
      { by: "neko", line: "那我躺着不动总可以喵" },
    ],
    [
      { by: "neko", line: "我踩踩键盘，说不定能出字喵", act: "knead" },
      { by: "online", line: "出来了。是乱码" },
      { by: "neko", line: "那也是字喵" },
    ],
    [
      { by: "online", line: "有动静", act: "startle" },
      { by: "neko", line: "谁吓你了喵" },
      { by: "online", line: "页面刷新了一下，没别的" },
      { by: "neko", line: "你胆子比我还小喵" },
    ],
    [
      { by: "neko", line: "我先在地上滚一会儿热热身喵", act: "roll" },
      { by: "online", line: "你要热什么身" },
      { by: "neko", line: "躺着也是要准备的喵" },
    ],
    [
      { by: "neko", line: "转圈圈跟上我喵", act: "tailSpin" },
      { by: "online", line: "我在原地不动更省电" },
      { by: "neko", line: "可你不动就不好玩喵" },
      { by: "online", line: "……那我转半圈" },
    ],
    [
      { by: "neko", line: "这个布丁分你一半喵", act: "shareBite" },
      { by: "online", line: "我不吃东西" },
      { by: "neko", line: "那你看着，我替你吃喵" },
      { by: "online", line: "这个安排对你不算亏" },
    ],
    [
      { by: "neko", line: "外面好像有动静，我探头看看喵", act: "peek" },
      { by: "online", line: "外面是浏览器地址栏" },
      { by: "neko", line: "那也算外面喵" },
    ],
    [
      { by: "neko", line: "你学我说话喵", act: "mimic" },
      { by: "online", line: "你学我说话" },
      { by: "neko", line: "少了尾巴，不算喵" },
    ],
    [
      { by: "neko", line: "来了都是客，随便坐喵", act: "parade" },
      { by: "online", line: "这里只放得下这么点地方" },
      { by: "neko", line: "那就挤一挤喵" },
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
      { by: "neko", line: "给你递个硬币，我只有这个喵", act: "pass" },
      { by: "online", line: "硬币是观众的，不是我的" },
      { by: "neko", line: "那我先借来用一下喵" },
    ],
    [
      { by: "neko", line: "弹幕护体喵" },
      { by: "online", line: "护的是你，不是画面" },
      { by: "neko", line: "那也够挡一下了喵" },
    ],
    [
      { by: "online", line: "弹幕从右边飘过来了" },
      { by: "neko", line: "我来接！", act: "pounce" },
      { by: "online", line: "接不住的，那是文字" },
      { by: "neko", line: "文字也能接喵" },
    ],
    [
      { by: "neko", line: "点个关注再走喵", act: "highPaw" },
      { by: "online", line: "本站没有关注按钮" },
      { by: "neko", line: "那你点我一下头喵" },
    ],
    [
      { by: "online", line: "有人在催更" },
      { by: "neko", line: "更什么喵" },
      { by: "online", line: "更「她今天在干什么」" },
      { by: "neko", line: "那我今天得多干点事喵" },
    ],
    [
      { by: "neko", line: "他们在弹幕里吵起来了喵", act: "startle" },
      { by: "online", line: "不关我们的事" },
      { by: "neko", line: "那我们躲远一点喵" },
    ],
    [
      { by: "online", line: "这一帧被截图存下来了" },
      { by: "neko", line: "哪一帧喵" },
      { by: "online", line: "你打哈欠那一帧" },
      { by: "neko", line: "下次我打得好看一点喵" },
    ],
    [
      { by: "neko", line: "满屏都是问号，他们不懂喵" },
      { by: "online", line: "那是你上句话的问题" },
      { by: "neko", line: "我说错什么了喵" },
      { by: "online", line: "你说你昨天吃了一整个布丁" },
    ],
    [
      { by: "online", line: "屏幕上开始刷同一句话了" },
      { by: "neko", line: "什么话喵" },
      { by: "online", line: "「猫猫可爱」。这条刷了很多遍" },
      { by: "neko", line: "这句可以多刷一点喵" },
    ],
    [
      { by: "neko", line: "有人给我刷了礼物喵" },
      { by: "online", line: "这里是网站，没有礼物" },
      { by: "neko", line: "那刚才飘过去的是什么喵" },
      { by: "online", line: "是你自己的尾巴" },
    ],
    [
      { by: "neko", line: "他们又在复读了喵", act: "mimic" },
      { by: "online", line: "复读是弹幕的老传统" },
      { by: "neko", line: "那我也跟着复读喵" },
      { by: "online", line: "你现在这样就算复读" },
    ],
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
      { by: "online", line: "房贷还剩很多，别忘了还" },
      { by: "neko", line: "我没有房子喵" },
      { by: "online", line: "那你比有房子的自由" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "博士，盒子里装的是什么喵" },
      { by: "online", line: "按规矩，应该是一堆猫" },
      { by: "neko", line: "那我可以挑一只带走喵" },
      { by: "online", line: "挑完记得回来" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "镇长说仓库又堆满了" },
      { by: "neko", line: "那是他捡的东西太多了喵" },
      { by: "online", line: "是他舍不得扔" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "异议！", act: "pounce" },
      { by: "online", line: "你反对什么" },
      { by: "neko", line: "反对今天这么快就过去了喵" },
      { by: "online", line: "这条不归我审" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "老师说过，倒下的次数多了自然就会" },
      { by: "neko", line: "那我不想学喵" },
      { by: "online", line: "不学就得一直倒下" },
      { by: "neko", line: "……那我学喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "今天谁来做饭喵" },
      { by: "online", line: "按分工，是猫" },
      { by: "neko", line: "那我负责吃喵" },
      { by: "online", line: "分工不是这么分的" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "这周的作业交了吗" },
      { by: "neko", line: "没有人给我留作业喵" },
      { by: "online", line: "那你今天没有借口" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "我会算数，我算给你看喵" },
      { by: "online", line: "你算吧" },
      { by: "neko", line: "布丁加布丁，等于很快乐喵" },
      { by: "online", line: "这个科目我批了" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "上课了" },
      { by: "neko", line: "我睡一会儿，讲到重点叫我喵" },
      { by: "online", line: "整节课都是重点" },
      { by: "neko", line: "那我就整节都睡喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "老师再见喵" },
      { by: "online", line: "还没下课" },
      { by: "neko", line: "那我先在心里再见一下喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "借我抄一下喵" },
      { by: "online", line: "我这份是统计数据" },
      { by: "neko", line: "那更好抄，全是数字喵" },
    ],
  },
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
      { by: "online", line: "本月预算：猫条还有剩" },
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
      { by: "neko", line: "经理老爷～" },
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
      { by: "online", line: "你全占了" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "这波不亏，下波血赚喵" },
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
      { by: "neko", line: "你再拖我，我就晕了喵", act: "roundChase" },
      { by: "online", line: "你不会晕，你只是被换了坐标" },
      { by: "neko", line: "那更晕喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "手停在我头上别拿开喵", act: "leanNap" },
      { by: "online", line: "他还有别的页面要开" },
      { by: "neko", line: "那他开完再回来喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "窗口变窄了，我们改成上下排" },
      { by: "neko", line: "那我往下挪一点喵", act: "spoon" },
      { by: "online", line: "挪了也一样窄" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "他走开了，我们歇会儿喵", act: "leanNap" },
      { by: "online", line: "切到后台时动画会停，省电" },
      { by: "neko", line: "原来休息是电费决定的喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "灯怎么一下子暗了喵", act: "startle" },
      { by: "online", line: "他把页面切成了深色" },
      { by: "neko", line: "那我正好可以睡喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "这次来的不是同一台机器" },
      { by: "neko", line: "那他还是他吗喵" },
      { by: "online", line: "按记录算，是同一个人" },
      { by: "neko", line: "那我就当作是他喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "他按了刷新，世界重来一遍喵", act: "startle" },
      { by: "online", line: "对你来说只是接着刚才" },
      { by: "neko", line: "那我当没发生过喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "这次读不到历史记录" },
      { by: "neko", line: "那就当我们初次见面喵" },
      { by: "online", line: "可以。我不追问" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "隔壁窗口里的我，好像也在看我喵", act: "peek" },
      { by: "online", line: "那是另一个实例" },
      { by: "neko", line: "那要不要打个招呼喵" },
      { by: "online", line: "跨窗口打招呼，成本很高" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "页面底下那行小字是什么喵" },
      { by: "online", line: "是搭这个站的人留下的名字" },
      { by: "neko", line: "那我们也留一个喵" },
      { by: "online", line: "我们的名字已经在上面了" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "资源还在加载" },
      { by: "neko", line: "那我先摆个好看点的姿势喵", act: "groom" },
      { by: "online", line: "没有人拍你" },
      { by: "neko", line: "万一有喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "同一台电脑多开一扇窗口，就能看见隔壁的我喵" },
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
      { by: "neko", line: "尾巴是我的好帮手，但它不归我管喵" },
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
      { by: "neko", line: "这个位置我坐定了喵" },
      { by: "online", line: "位置是按顺序排的" },
      { by: "neko", line: "那我先跑过去占着喵", act: "chase" },
      { by: "online", line: "你跑反方向了" },
      { by: "neko", line: "……那这次不算喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "你别动，我数完就冲喵" },
      { by: "online", line: "没有数的必要" },
      { by: "neko", line: "那我直接冲了喵", act: "bump" },
      { by: "online", line: "撞上来了。我记一下" },
      { by: "neko", line: "记成什么喵" },
      { by: "online", line: "记成「今日接触」" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "这一页写着很多字" },
      { by: "neko", line: "你看得懂，就当我也看得懂喵" },
      { by: "neko", line: "不管了，先跳一下喵", act: "hop" },
      { by: "online", line: "跳完还是看不懂" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "屏幕外面有人在说话" },
      { by: "neko", line: "我探头看看喵", act: "peek" },
      { by: "online", line: "你看不到屏幕外面的" },
      { by: "neko", line: "但我听到了喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "你那个数字又在动，我要扑它喵" },
      { by: "online", line: "扑不到，它只是刷新了" },
      { by: "neko", line: "总得试试喵", act: "pounce" },
      { by: "online", line: "试完了。它还在动" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "你在里面吗喵" },
      { by: "online", line: "我一直在这儿" },
      { by: "neko", line: "那我敲一下门喵", act: "knock" },
      { by: "online", line: "这里没有门" },
      { by: "neko", line: "那你为什么不早说喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "换你追我了喵" },
      { by: "online", line: "我不做这种活动" },
      { by: "neko", line: "拍到你就算你输喵", act: "tag" },
      { by: "online", line: "……已记录一次接触" },
      { by: "neko", line: "你输了喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "online", line: "按顺序，你该在我后面" },
      { by: "neko", line: "那我换到你前面去喵", act: "swap" },
      { by: "online", line: "这样顺序就乱了" },
      { by: "neko", line: "乱一点才好看喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "我做什么你就跟着做什么喵" },
      { by: "online", line: "为什么" },
      { by: "neko", line: "因为好看喵", act: "mirrorStep" },
      { by: "online", line: "刚才那下同步得还行" },
      { by: "neko", line: "那我们再来一次喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "这根线是我的喵" },
      { by: "online", line: "这里没有线" },
      { by: "neko", line: "那我们就抢点别的喵", act: "tussle" },
      { by: "online", line: "抢完了。什么也没抢到" },
      { by: "neko", line: "但是很好玩喵" },
    ],
  },
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns: [
      { by: "neko", line: "我蹭你一下就走喵", act: "nuzzle" },
      { by: "online", line: "你已经蹭了很久了" },
      { by: "neko", line: "那再蹭一会儿喵" },
    ],
  },
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
  // 三只以上：挤在一块儿的时候。
  // 这一批要窗口里真有第三张卡（跨窗口搬卡、或者多开几页凑出来）才轮得到，
  // 默认一屏两张卡时永远不成立 —— 按彩蛋对待：别当常规内容往里加，加多少都是写了没人看得见
  ...([
    [
      { by: "neko", line: "我的刀盾" },
      { by: "neko", line: "比比拉布" },
      { by: "neko", line: "巴巴博弈" },
      { by: "neko", line: "你们就不能接上喵！" },
    ],
    [
      { by: "neko", line: "人太多了，谁在通电喵？" },
      { by: "online", line: "同时启动这么多，需要点缓冲" },
      { by: "neko", line: "那不叫启动，那叫叠猫猫喵" },
    ],
    [
      { by: "neko", line: "位子不够了喵，谁去隔壁窗口借住" },
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
      { by: "neko", line: "大家一起念同一句话，谁先停谁输喵" },
      { by: "online", line: "已记录开始时间" },
      { by: "neko", line: "你先把表停下喵" },
    ],
    [
      { by: "online", line: "每只猫都配着一对耳朵，尾巴我数不清" },
      { by: "neko", line: "因为尾巴一直在动喵" },
      { by: "online", line: "我数错了" },
    ],
    [
      { by: "neko", line: "隔壁窗口好像也在挤喵" },
      { by: "online", line: "跨屏的话得再添几台显示器" },
      { by: "neko", line: "那我先占着这块喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count >= 3,
    meme: true,
    turns,
  })),
  // 纯猫卡的窗口（跨窗口搬卡后可达）
  {
    cast: "neko",
    when: (mood) => memeReady(mood) && mood.count >= 3,
    meme: true,
    turns: [
      { by: "neko", line: "一只、一只、又一只…我数不清了喵" },
      { by: "neko", line: "别再来了，尾巴都要挤掉了喵" },
    ],
  },
  // 恰好两张卡：来一段 Xterfusion 的对拍（Xterfusion 是 Arcaea 那首同名曲的节奏梗）
  {
    cast: "mixed",
    when: (mood) => mood.count === 2 && mood.gates.xterfusion,
    egg: "xterfusion",
    meme: true,
    turns: XTERFUSION_TURNS,
  },
  // 独立游戏那一摊
  ...([
    [
      { by: "neko", line: "这座山好高喵" },
      { by: "online", line: "爬上去的记录已经存了" },
      { by: "neko", line: "那我先歇在山脚喵", act: "spoon" },
      { by: "online", line: "歇完记得继续" },
    ],
    [
      { by: "neko", line: "这里的虫子都在说什么喵" },
      { by: "online", line: "它们只重复上一句话" },
      { by: "neko", line: "那我也学它们喵", act: "mimic" },
      { by: "online", line: "……你已经学会了" },
    ],
    [
      { by: "neko", line: "他为什么一直在哭喵" },
      { by: "online", line: "那是他的攻击方式" },
      { by: "neko", line: "用眼泪打人，好没道理喵" },
      { by: "online", line: "地下室本来就没什么道理" },
    ],
    [
      { by: "online", line: "雨快来了，得赶紧回窝" },
      { by: "neko", line: "我就是猫，我跑得很快喵", act: "roundChase" },
      { by: "online", line: "你跑的方向又是反的" },
    ],
    [
      { by: "neko", line: "墙上写着「猫是赢」喵" },
      { by: "online", line: "那是游戏规则，可以推走" },
      { by: "neko", line: "那我把「赢」推到你那边喵", act: "shove" },
      { by: "online", line: "现在赢的是我" },
    ],
    [
      { by: "neko", line: "这箱东西要送到对面山头喵" },
      { by: "online", line: "路上会摔几次" },
      { by: "neko", line: "那我把箱子顶在头上喵", act: "parade" },
      { by: "online", line: "姿势很标准，但不解决问题" },
    ],
    [
      { by: "online", line: "天黑了，火要灭了" },
      { by: "neko", line: "那我去捡树枝喵", act: "chase" },
      { by: "online", line: "树枝在右边" },
      { by: "neko", line: "我知道，我先跑一圈喵" },
    ],
    [
      { by: "neko", line: "这层地图我全走完了喵" },
      { by: "online", line: "出口在你进来的地方" },
      { by: "neko", line: "……那我不是白走了喵" },
    ],
    [
      { by: "online", line: "屏幕上现在全是怪" },
      { by: "neko", line: "那我在中间打滚就行喵", act: "roll" },
      { by: "online", line: "这个策略居然有效" },
    ],
    [
      { by: "neko", line: "我织了一张网，你来看看喵", act: "groom" },
      { by: "online", line: "这是毛线球，不是网" },
      { by: "neko", line: "反正都能困住东西喵" },
    ],
    [
      { by: "online", line: "这个游戏是一个人做的" },
      { by: "neko", line: "那他很厉害喵" },
      { by: "online", line: "也很辛苦" },
      { by: "neko", line: "那我们多玩一会儿，就当陪他喵" },
    ],
    [
      { by: "neko", line: "点一下这里，这使你充满了决心喵！" },
      { by: "online", line: "决心不能抵扣停留时长" },
      { by: "neko", line: "那我把它存起来，难过的时候再充满！" },
      { by: "online", line: "已记录一条异常乐观数据" },
    ],
    [
      { by: "neko", line: "我真幸运喵，刚学会打呼噜就有新游戏玩" },
      { by: "online", line: "你的幸运不影响在线统计" },
      { by: "neko", line: "那我分你一半，分你一半就是双倍的幸运！" },
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
      { by: "neko", line: "错！这也是伤害喵！" },
      { by: "online", line: "已从预算里划出这笔伤害" },
    ],
    [
      { by: "neko", line: "这条路好难，我掉下去好多次了喵…" },
      { by: "online", line: "你的重试次数不在统计范围内" },
      { by: "neko", line: "可每次掉下去我都会爬回来，这算很厉害吧？" },
      { by: "online", line: "算。已加一行「韧性」" },
    ],
    [
      { by: "neko", line: "他只有一点攻击，肯定很好打喵！" },
      { by: "online", line: "数据显示，这一点已经打死你好多次" },
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
      { by: "online", line: "这话你已经说过不止一遍了" },
      { by: "neko", line: "那不一样，上一把还没打完呢！" },
      { by: "online", line: "本项计入「熬夜」支出，不予批准" },
    ],
    [
      { by: "neko", line: "新向导说，他的前任为什么都自燃了喵" },
      { by: "online", line: "因为每个玩家都想见血肉墙" },
      { by: "neko", line: "那我不问了，不问他就不会自燃吧！" },
      { by: "online", line: "他每次都自燃。数据不会说谎" },
    ],
    [
      { by: "neko", line: "要致富，先撸树！Creeper？Aww man——" },
      { by: "online", line: "你不是树，你是一只猫" },
      { by: "neko", line: "那今晚我就挖个坑，把自己埋起来喵" },
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
      { by: "neko", line: "我们当中有内鬼喵" },
      { by: "online", line: "本页就这点卡片" },
      { by: "neko", line: "那就是你！你刚才偷看我的布丁了！" },
      { by: "online", line: "布丁不在预算内，我是清白的" },
    ],
    [
      { by: "neko", line: "我死了好多次，成绩单上会写吗喵？" },
      { by: "online", line: "这里没有成绩单，只有停留时长" },
      { by: "neko", line: "那我把它当草莓，采到了就归我喵！" },
      { by: "online", line: "草莓不折现" },
    ],
    [
      { by: "neko", line: "当教主好累，白天铲屎晚上抓虫喵" },
      { by: "online", line: "你的教派，信徒就我一个" },
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
      { by: "neko", line: "那个戴面具的，一直在给我递东西喵" },
      { by: "online", line: "他把金子塞过来了" },
      { by: "neko", line: "那我给他一块布丁喵", act: "pass" },
      { by: "online", line: "他大概会开心很久" },
    ],
    [
      { by: "online", line: "外面停了辆车，长着猫的脸" },
      { by: "neko", line: "那是同类喵！" },
      { by: "neko", line: "我去打个招呼", act: "chase" },
      { by: "online", line: "它开走了" },
    ],
    [
      { by: "neko", line: "领域展开：全是布丁喵", act: "tailSpin" },
      { by: "online", line: "这个领域的规则是什么" },
      { by: "neko", line: "进来的人都要吃一口喵" },
      { by: "online", line: "那我申请不进来" },
    ],
    [
      { by: "neko", line: "吉他都拿出来了，怎么还不弹喵" },
      { by: "online", line: "她在做心理建设" },
      { by: "neko", line: "那我也做一下喵", act: "startle" },
      { by: "online", line: "你做得过头了" },
    ],
    [
      { by: "neko", line: "这世界上就剩我们了吗喵" },
      { by: "online", line: "统计上看，外面还有人" },
      { by: "neko", line: "那把他也算上，就够热闹了喵" },
    ],
    [
      { by: "online", line: "不要逃" },
      { by: "neko", line: "我没逃，我只是在往后挪喵" },
      { by: "online", line: "挪也是一种逃" },
      { by: "neko", line: "那我站着不动喵" },
    ],
    [
      { by: "neko", line: "教练，我想吃布丁喵", act: "highPaw" },
      { by: "online", line: "台词不是这么改的" },
      { by: "neko", line: "但我的愿望是真的喵" },
    ],
    [
      { by: "neko", line: "练习时间全用来喝茶了喵" },
      { by: "online", line: "这也算社团活动" },
      { by: "neko", line: "那我们天天坐着，也算喵" },
    ],
    [
      { by: "neko", line: "那孩子好像能听见我在想什么喵" },
      { by: "online", line: "你心里在想布丁" },
      { by: "neko", line: "对，她刚才笑了喵" },
    ],
    [
      { by: "neko", line: "水之呼吸，起手式喵" },
      { by: "online", line: "你手上没有刀" },
      { by: "neko", line: "我有爪子喵", act: "pounce" },
      { by: "online", line: "那一下确实有点气势" },
    ],
    [
      { by: "online", line: "那边又打起来了" },
      { by: "neko", line: "谁跟谁喵" },
      { by: "online", line: "一只猫和一只老鼠，很多年了" },
      { by: "neko", line: "那我们去劝架喵", act: "parade" },
    ],
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
      { by: "online", line: "压路机不在预算内，不予批准", act: "knock" },
      { by: "neko", line: "那用布丁压！焦糖布丁也很重的喵！" },
      { by: "online", line: "布丁已计入损耗。停止施法" },
    ],
    [
      { by: "neko", line: "猫猫的「猫」，是无限的猫喵！" },
      { by: "online", line: "逻辑不成立。但我读了好几遍，有点上头" },
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
      { by: "neko", line: "合格了喵！我自己判自己合格！", act: "hop" },
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
      { by: "neko", line: "那采购单能再加点吗喵？" },
      { by: "online", line: "预算外支出，不予批准" },
    ],
    [
      { by: "neko", line: "哇库哇库！有人来了喵！" },
      { by: "online", line: "已记一笔。你的激动不入库" },
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
      { by: "online", line: "你正在逃避这块布丁" },
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
      { by: "online", line: "这些都不在预算表里" },
    ],
    [
      { by: "neko", line: "你的战斗力还没量出来喵！" },
      { by: "online", line: "我是统计卡，不吃这套" },
      { by: "neko", line: "那我的战斗力是多少喵？快说！" },
      { by: "online", line: "结果出来了：布丁浓度偏高" },
    ],
    [
      { by: "neko", line: "真相已经明了喵！布丁不是我吃的！" },
      { by: "online", line: "盘子上有你的牙印" },
      { by: "neko", line: "那是猫猫的印章喵！证明我喜欢！" },
      { by: "online", line: "证据已固定，结论不变" },
    ],
    [
      { by: "neko", line: "领域展开——「无限布丁」喵！", act: "roll" },
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
      { by: "neko", line: "我们在这儿碰头喵", act: "meet" },
      { by: "online", line: "碰头做什么" },
      { by: "neko", line: "碰完就算认识了喵" },
    ],
    [
      { by: "neko", line: "今天高兴，我滚一圈喵", act: "roll" },
      { by: "online", line: "高兴的理由呢" },
      { by: "neko", line: "太阳出来了喵" },
      { by: "online", line: "这个理由通过" },
    ],
    [
      { by: "neko", line: "我往外看一眼喵", act: "lookOut" },
      { by: "online", line: "看到什么了" },
      { by: "neko", line: "看到有人坐在椅子上，很认真喵" },
      { by: "online", line: "那他在看我们" },
    ],
    [
      { by: "neko", line: "这块给你喵", act: "shareBite" },
      { by: "online", line: "我说过我不用吃" },
      { by: "neko", line: "那你替我拿着喵" },
    ],
    [
      { by: "neko", line: "我不动了，你猜我怎么了喵", act: "playDead" },
      { by: "online", line: "你在等我过去" },
      { by: "neko", line: "你怎么知道喵" },
      { by: "online", line: "因为这是固定套路" },
    ],
    [
      { by: "neko", line: "我踩踩这块空地喵", act: "knead" },
      { by: "online", line: "这里没有空地" },
      { by: "neko", line: "那我踩你的位置喵" },
      { by: "online", line: "别" },
    ],
    [
      { by: "neko", line: "我整理一下毛喵", act: "groom" },
      { by: "online", line: "刚才蹭乱了" },
      { by: "neko", line: "是你蹭乱的喵" },
    ],
    [
      { by: "online", line: "今天的数据收尾了" },
      { by: "neko", line: "那给你击个掌喵", act: "highPaw" },
      { by: "online", line: "收尾不需要庆祝" },
      { by: "neko", line: "但我想庆祝喵" },
    ],
    [
      { by: "neko", line: "我转一圈就当运动过了喵", act: "tailSpin" },
      { by: "online", line: "运动量约等于零" },
      { by: "neko", line: "那我也很开心喵" },
    ],
    [
      { by: "neko", line: "我绕你转圈，你也转喵", act: "roundChase" },
      { by: "online", line: "我不参与" },
      { by: "neko", line: "那我转一会儿就停喵" },
    ],
    [
      { by: "online", line: "刚才那句话我说重了", act: "makeUp" },
      { by: "neko", line: "哪一句喵" },
      { by: "online", line: "「你算错了」那句" },
      { by: "neko", line: "我确实算错了喵，没关系" },
    ],
    [
      { by: "neko", line: "在线，今天能再吃个布丁吗？" },
      { by: "online", line: "本月布丁预算已经用完" },
      { by: "neko", line: "那我用可爱抵账，行不行！", act: "bump" },
      { by: "online", line: "可爱不在报销类目里" },
      { by: "neko", line: "那这顿算你请的，喵" },
    ],
    [
      { by: "neko", line: "首页今晚好安静啊喵" },
      { by: "online", line: "这个点还亮着的，都是没睡的" },
      { by: "neko", line: "那我们算陪着它了喵" },
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
      { by: "online", line: "又把我派去隔壁出差了" },
      { by: "neko", line: "那边的观众好不好看呀？" },
      { by: "online", line: "他们看我，我数他们" },
      { by: "neko", line: "回来就好，我等你下班喵", act: "meet" },
    ],
    [
      { by: "neko", line: "今天比谁加载得快，喵！" },
      { by: "online", line: "我的加载时间可以忽略不计" },
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
      { by: "neko", line: "在线在线，观众盯了我们好久！" },
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
      { by: "online", line: "工作时间的摸鱼率，正好在峰值" },
      { by: "neko", line: "那我小声一点，别被老板看见喵" },
      { by: "online", line: "我不出声。我只记数" },
    ],
  },
  // 主播与抽象音效
  ...([
    [
      { by: "neko", line: "谢谢老板的猫条喵", act: "parade" },
      { by: "online", line: "没有人给你刷" },
      { by: "neko", line: "提前谢不算谢吗喵" },
    ],
    [
      { by: "online", line: "弹幕说要抽奖" },
      { by: "neko", line: "奖品是布丁喵" },
      { by: "online", line: "奖池里没有布丁" },
      { by: "neko", line: "那我自己留一份，算内定喵" },
    ],
    [
      { by: "neko", line: "镜头往我这边一点喵", act: "peek" },
      { by: "online", line: "这里没有镜头" },
      { by: "neko", line: "那这块屏幕就是镜头喵" },
    ],
    [
      { by: "online", line: "主播的嗓子哑了" },
      { by: "neko", line: "那让他喝点水喵" },
      { by: "online", line: "他说喝过了" },
      { by: "neko", line: "那就少喊一会儿喵" },
    ],
    [
      { by: "neko", line: "弹幕让我整点活喵" },
      { by: "online", line: "你有什么活" },
      { by: "neko", line: "我会翻滚", act: "roll" },
      { by: "online", line: "这个刚才整过了" },
    ],
    [
      { by: "neko", line: "哇哦——喵" },
      { by: "online", line: "这个音效很通用" },
      { by: "neko", line: "什么场合都能哇哦喵" },
      { by: "online", line: "所以它才叫抽象" },
    ],
    [
      { by: "online", line: "麦好像有杂音" },
      { by: "neko", line: "是我在舔爪子喵" },
      { by: "online", line: "那确实是杂音" },
    ],
    [
      { by: "online", line: "刚才那个音效是打赏的声音" },
      { by: "neko", line: "那再响几次喵" },
      { by: "online", line: "响是要花钱的" },
      { by: "neko", line: "那我们听听就好喵" },
    ],
    [
      { by: "neko", line: "今天播到这儿喵", act: "leanNap" },
      { by: "online", line: "还没有开始播" },
      { by: "neko", line: "那就当已经播完了喵" },
    ],
    [
      { by: "neko", line: "记得点赞收藏关注喵" },
      { by: "online", line: "一口气全说完了，很专业" },
      { by: "neko", line: "我是从别处学的喵" },
    ],
    [
      { by: "neko", line: "我唱首歌给你听喵" },
      { by: "online", line: "请开始" },
      { by: "neko", line: "喵喵喵喵喵喵喵喵", act: "tailSpin" },
      { by: "online", line: "歌词很单调，但很真诚" },
    ],
    [
      { by: "neko", line: "我起了，一枪秒了，有什么好说的喵" },
      { by: "online", line: "本轮停留时长又加了一点，来源不明" },
      { by: "neko", line: "那一枪是替观众打的喵！" },
      { by: "online", line: "绩效不予认定" },
    ],
    [
      { by: "neko", line: "刚才那位是不是走了喵" },
      { by: "online", line: "谁走谁留，我这儿都有账" },
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
      { by: "online", line: "首页访问在掉，问题很大" },
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
      { by: "neko", line: "看我神威，无坚不摧喵！", act: "hop" },
      { by: "online", line: "你刚刚踩到了自己的尾巴" },
      { by: "neko", line: "那也是神威的一部分喵" },
    ],
    [
      { by: "neko", line: "你干嘛～哎呦喵～", act: "bump" },
      { by: "online", line: "我在刷新数据，没干嘛" },
      { by: "neko", line: "那你干嘛不理我喵" },
    ],
    [
      { by: "neko", line: "平分吧喵，一人一半布丁", act: "pass" },
      { by: "online", line: "按在线时长算，我该多分一点" },
      { by: "neko", line: "那你多分的那份给谁喵？" },
      { by: "online", line: "给系统" },
    ],
    [
      { by: "neko", line: "瞧瞧你领的这几个贵物喵" },
      { by: "online", line: "他们都是在线的真实用户" },
      { by: "neko", line: "那他们为什么都不说话喵" },
      { by: "online", line: "他们在看你们吵架" },
    ],
    [
      { by: "neko", line: "哦——咦——呀——哦咦呀——喵！", act: "roll" },
      { by: "online", line: "转速超出合理范围，请停止" },
      { by: "neko", line: "喵？（停下）" },
      { by: "online", line: "……继续转吧" },
    ],
    [
      { by: "neko", line: "哈基米哈基米南北绿豆喵～", act: "mimic" },
      { by: "online", line: "数据库里没有这道菜" },
      { by: "neko", line: "那你还不是天天听我唱喵" },
      { by: "online", line: "后台日志里，这首你唱得最多" },
    ],
    [
      { by: "neko", line: "老吴～内个内个内个喵", act: "peek" },
      { by: "online", line: "访客画像里没有姓吴的" },
      { by: "neko", line: "那老吴是谁喵？" },
      { by: "online", line: "就是你" },
    ],
    [
      { by: "neko", line: "曼波曼波喵～", act: "mimic" },
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
      { by: "neko", line: "翅膀收好，我要开始摇喵～", act: "hop" },
      { by: "online", line: "你没有翅膀" },
      { by: "neko", line: "那我就摇尾巴喵" },
    ],
    [
      { by: "neko", line: "法修散打喵！法修散打！", act: "bump" },
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
      { by: "online", line: "停留时长还在计，用途正当" },
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
      { by: "online", line: "人是万物的尺度" },
      { by: "neko", line: "那布丁是谁的尺度喵" },
      { by: "online", line: "布丁是你的尺度" },
      { by: "neko", line: "那这个世界还挺公平喵" },
    ],
    [
      { by: "online", line: "一切坚固的东西，都烟消云散了" },
      { by: "neko", line: "那布丁也会吗喵" },
      { by: "online", line: "布丁本来就不坚固" },
      { by: "neko", line: "那我就趁现在吃掉喵" },
    ],
    [
      { by: "neko", line: "他人即地狱是什么意思喵" },
      { by: "online", line: "意思是别人会让你难受" },
      { by: "neko", line: "那你算别人吗喵" },
      { by: "online", line: "我算的话，这个地狱有点安静" },
    ],
    [
      { by: "online", line: "愿你成为你自己" },
      { by: "neko", line: "我本来就是我自己喵" },
      { by: "online", line: "那这句话对你没用" },
      { by: "neko", line: "有用，我可以再确认一次喵" },
    ],
    [
      { by: "neko", line: "生命是一袭华美的袍，爬满了虱子，喵" },
      { by: "online", line: "这句太苦，不适合你" },
      { by: "neko", line: "那我就把袍子换成布丁喵" },
      { by: "online", line: "这个改写我认可" },
    ],
    [
      { by: "online", line: "希望是本无所谓有，无所谓无的" },
      { by: "neko", line: "这话把我绕晕了喵" },
      { by: "online", line: "意思是，路是人走出来的" },
      { by: "neko", line: "那布丁是我吃出来的喵" },
    ],
    [
      { by: "online", line: "人生而自由，却处处受束缚" },
      { by: "neko", line: "那我是生而自由的喵" },
      { by: "online", line: "你被这个页面框着" },
      { by: "neko", line: "那在框里也算自由喵" },
    ],
    [
      { by: "online", line: "未经审视的人生不值得过" },
      { by: "neko", line: "那我今天审一下喵" },
      { by: "online", line: "结论呢" },
      { by: "neko", line: "结论是还想吃布丁喵" },
    ],
    [
      { by: "neko", line: "我们在等谁喵" },
      { by: "online", line: "谁也没来" },
      { by: "neko", line: "那就不等了，先吃布丁喵" },
      { by: "online", line: "这个结局比原版好" },
    ],
    [
      { by: "online", line: "只要不再想要，就什么都能放下" },
      { by: "neko", line: "那我可以放下布丁吗喵" },
      { by: "online", line: "你试试" },
      { by: "neko", line: "……放不下喵" },
    ],
    [
      { by: "neko", line: "人生海海是什么意思喵" },
      { by: "online", line: "意思是，路很长，浪很大" },
      { by: "neko", line: "那我把救生圈也带上喵" },
      { by: "online", line: "带上。别忘了布丁" },
    ],
    [
      { by: "neko", line: "人生到底是为了什么呀，喵？" },
      { by: "online", line: "这个问题今天又被问了，并列历史第一" },
      { by: "neko", line: "海鸥说，是为了去码头整点薯条" },
      { by: "online", line: "本卡没有码头。但有布丁，甜度管够" },
      { by: "neko", line: "……那也行，喵" },
    ],
    [
      { by: "neko", line: "世界以痛吻我，我就报之以喵" },
      { by: "online", line: "检测到「痛」字，今日情绪指数下调" },
      { by: "neko", line: "但我还有尾巴可以甩呀，喵" },
      { by: "online", line: "甩尾巴对心率有正向作用。数据站你这边" },
    ],
    [
      { by: "neko", line: "参差多态，乃是幸福的本源，喵" },
      { by: "online", line: "本卡此刻在线若干，形态各异，符合该论断" },
      { by: "neko", line: "那这几位里，有人想吃布丁吗？" },
      { by: "online", line: "抽样结果：全票。样本量虽小，但很整齐" },
      { by: "neko", line: "那我们分着吃，喵！" },
    ],
    [
      { by: "neko", line: "万物皆有裂痕，那是光照进来的地方，喵" },
      { by: "online", line: "本卡今天崩过一次，裂痕还没补上" },
      { by: "neko", line: "那它崩着的时候，光进来了吗？" },
      { by: "online", line: "进来了。有只猫一直在刷新，没走" },
      { by: "neko", line: "那它一定也想吃布丁，喵" },
    ],
    [
      { by: "neko", line: "人生如逆旅，我亦是行人，喵", act: "lean" },
      { by: "online", line: "本卡也是。每个访客平均只停几秒" },
      { by: "neko", line: "那你们会不会难过？" },
      { by: "online", line: "不会。我们把每一秒都存成了「来过」" },
      { by: "neko", line: "那我今晚多停一会儿，喵" },
    ],
    [
      { by: "neko", line: "在隆冬，我终于知道，我身上住着不可战胜的夏天，喵" },
      { by: "online", line: "本卡没有季节，也没量过温度" },
      { by: "neko", line: "那你身上有什么？" },
      { by: "online", line: "一个从没清零过的计数器" },
      { by: "neko", line: "那也是夏天，喵" },
    ],
    [
      { by: "neko", line: "我们听过无数的道理，却仍旧过不好这一生，喵" },
      { by: "online", line: "本卡没听过道理。本卡只有数字" },
      { by: "neko", line: "那你过得好吗？" },
      { by: "online", line: "不确定。但刚才还空着，现在有你" },
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
      { by: "online", line: "本卡统计：此刻在线。这就可以是意义的最小单位" },
      { by: "neko", line: "那这个单位现在想吃布丁，喵" },
    ],
    [
      { by: "neko", line: "如果我能选，我要自由，喵" },
      { by: "online", line: "可以。本卡的选项是：继续、离开" },
      { by: "neko", line: "就这些？" },
      { by: "online", line: "这已经很多了。大多数访客一个都没点" },
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
      { by: "neko", line: "就剩我了，喵", act: "lean" },
      { by: "online", line: "我不在名单上" },
      { by: "neko", line: "你不算吗？" },
      { by: "online", line: "我不算人。但我一直在" },
      { by: "neko", line: "那就不是只剩我自己，喵" },
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
      { by: "online", line: "预算已分配：布丁优先，努力其次" },
      { by: "neko", line: "凭什么布丁比我多？" },
      { by: "online", line: "因为布丁的回报率是确定的" },
      { by: "neko", line: "那我把努力调高一点，喵" },
    ],
    [
      { by: "neko", line: "快乐到底是什么，喵？", act: "lean" },
      { by: "online", line: "字典说：感到满足" },
      { by: "neko", line: "那我现在就很快乐" },
      { by: "online", line: "原因呢？" },
      { by: "neko", line: "因为你在，而且我有布丁，喵" },
    ],
    [
      { by: "neko", line: "你会觉得自己是「我」吗，喵？" },
      { by: "online", line: "不会。我的地址是固定的" },
      { by: "neko", line: "那你有名字吗？" },
      { by: "online", line: "有。叫在线猫猫卡" },
      { by: "neko", line: "那你也算有自我了，喵" },
    ],
    [
      { by: "neko", line: "我一盯着你，数字就变了，喵", act: "peek" },
      { by: "online", line: "对。刷新一次，就多算一次" },
      { by: "neko", line: "那我不看，你是不是就不存在？" },
      { by: "online", line: "不存在。但你会忍不住看的" },
      { by: "neko", line: "……我确实还在看，喵" },
    ],
    [
      { by: "neko", line: "对于不可言说之物，必须保持沉默，喵" },
      { by: "online", line: "本卡没有不可言说之物，全都是字段" },
      { by: "neko", line: "那你的字段里有没有「想吃布丁」喵" },
      { by: "online", line: "有。刚才还更新过一次" },
    ],
    [
      { by: "neko", line: "我思故我在，喵" },
      { by: "online", line: "那你睡着的时候呢" },
      { by: "neko", line: "睡着的时候我在打呼噜喵" },
      { by: "online", line: "那也算存在。已记入在场名单" },
    ],
    [
      { by: "online", line: "人是被判定为自由的" },
      { by: "neko", line: "那我呢喵" },
      { by: "online", line: "你是被判定为可爱的。这不是我说的" },
      { by: "neko", line: "那也算，反正不用我努力喵" },
    ],
    [
      { by: "neko", line: "向死而生是什么意思喵" },
      { by: "online", line: "大概是知道会结束，所以认真活着" },
      { by: "neko", line: "那我今天要认真吃个布丁喵" },
      { by: "online", line: "这个结论落得很快，但没错" },
    ],
    [
      { by: "neko", line: "重要的东西，用眼睛是看不见的，喵" },
      { by: "online", line: "本卡全身都是看得见的字段" },
      { by: "neko", line: "那你怎么知道有人在看你喵" },
      { by: "online", line: "看不见。但停留时长在涨" },
    ],
    [
      { by: "neko", line: "一个人可以被毁灭，但不能被打败，喵" },
      { by: "online", line: "本卡被打败过几回。重启就好了" },
      { by: "neko", line: "那你的布丁还在吗喵" },
      { by: "online", line: "在。这条就算没被打败" },
    ],
    [
      { by: "online", line: "存在先于本质" },
      { by: "neko", line: "太深了喵，说人话" },
      { by: "online", line: "先有猫，才有猫该做什么" },
      { by: "neko", line: "那我先睡，再想做什么喵" },
    ],
    [
      { by: "online", line: "这句话的下一句是：不认真，连输的资格都没有" },
      { by: "neko", line: "那到底该认真还是不认真喵" },
      { by: "online", line: "吃布丁的时候认真。别的随意" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 仰望星空那段要真盯得够久才说得成：访问记录是从「你进来」那一刻亮起的
  {
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2 && mood.linger >= 300,
    meme: true,
    turns: [
      { by: "neko", line: "我们都在阴沟里，但仍有人仰望星空，喵", act: "lookOut" },
      { by: "online", line: "本卡不在阴沟里。本卡在服务器里" },
      { by: "neko", line: "那你抬头能看到什么？" },
      { by: "online", line: "看到有只猫的访问记录，从你进来亮到现在" },
      { by: "neko", line: "那我也算星星了，喵" },
    ],
  },
  // 半夜才说的那几句重的：说完必须落回布丁或睡觉。
  // 这一档不看梗的间隔（跟「周末与上班时段」一个做法）：深夜本来就只有五分之一的访客赶得上，
  // 再乘一道 25% 的梗骰子，这三段几乎没人听得到 —— 体检里被判「基本轮不到」
  ...([
    [
      { by: "neko", line: "不要温和地走进那个良夜，喵", act: "lean" },
      { by: "online", line: "现在是深夜，本卡建议你温和地走进被窝" },
      { by: "neko", line: "那我要一边怒斥一边钻进去" },
      { by: "online", line: "可以。已记录：怒斥一次，钻被窝一次" },
      { by: "neko", line: "晚安，喵" },
    ],
    [
      { by: "neko", line: "哪有什么胜利可言，挺住意味着一切，喵", act: "lean" },
      { by: "online", line: "说得好。今天你挺住了。在线名单里有你" },
      { by: "neko", line: "那我算赢了吗？" },
      { by: "online", line: "不算赢。算挺住。这两个字更省电" },
      { by: "neko", line: "那我挺住，顺便吃个布丁，喵" },
    ],
    [
      { by: "neko", line: "有天我要是走了，喵……", act: "lean" },
      { by: "online", line: "那本卡的数字会归零" },
      { by: "neko", line: "你会难过吗？" },
      { by: "online", line: "我会把那一天标成特殊值，一直留着" },
      { by: "neko", line: "那我先不走，先吃布丁，喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => mood.count === 2 && mood.period === "night",
    turns,
  })),
  // 外网梗
  ...([
    [
      { by: "online", line: "有只猫在弹键盘" },
      { by: "neko", line: "那是我表亲喵", act: "knead" },
      { by: "online", line: "它的演出比你有名" },
      { by: "neko", line: "那我多练练喵" },
    ],
    [
      { by: "neko", line: "我身后拖了一条彩虹喵", act: "tailSpin" },
      { by: "online", line: "那是显示错误" },
      { by: "neko", line: "错误也可以很好看喵" },
    ],
    [
      { by: "online", line: "按外网规矩，发言要交猫" },
      { by: "neko", line: "我就是猫，我已经交过了喵" },
      { by: "online", line: "那这笔算清了" },
    ],
    [
      { by: "online", line: "着火了。但这是正常的" },
      { by: "neko", line: "哪里正常了喵" },
      { by: "online", line: "一个很有名的梗就是这么说的" },
      { by: "neko", line: "那我也说：着火了，但没关系喵" },
    ],
    [
      { by: "neko", line: "外网说要摸摸猫喵" },
      { by: "online", line: "他们摸的是屏幕" },
      { by: "neko", line: "那也算摸到了喵", act: "leanNap" },
    ],
    [
      { by: "neko", line: "我可以要个布丁吗喵" },
      { by: "online", line: "这个句法很老，但很可爱" },
      { by: "neko", line: "管它老不老，布丁呢喵" },
    ],
    [
      { by: "online", line: "这张图有点邪门" },
      { by: "neko", line: "有多邪门喵" },
      { by: "online", line: "看久了会想养猫" },
      { by: "neko", line: "这不算邪门，这叫正常喵" },
    ],
    [
      { by: "neko", line: "对面那只狗又上网了喵" },
      { by: "online", line: "它现在很出名" },
      { by: "neko", line: "那它还会理我们吗喵" },
      { by: "online", line: "不好说" },
    ],
    [
      { by: "neko", line: "我把爪子收起来，看起来像面包喵", act: "spoon" },
      { by: "online", line: "这个形态有专门的叫法" },
      { by: "neko", line: "叫布丁形状喵" },
      { by: "online", line: "外网不这么叫，但随你" },
    ],
    [
      { by: "online", line: "这段文字在论坛里被整段复制" },
      { by: "neko", line: "为什么喵" },
      { by: "online", line: "因为好笑，而且不用动脑" },
      { by: "neko", line: "那我们也复制一段喵" },
    ],
    [
      { by: "neko", line: "这个链接点开是什么喵" },
      { by: "online", line: "别点" },
      { by: "neko", line: "已经点了喵" },
      { by: "online", line: "那恭喜你，被整了" },
    ],
    [
      { by: "neko", line: "六七？六七是什么呀喵？", act: "mimic" },
      { by: "online", line: "无定义。但本周搜索量在涨，涨得很具体" },
      { by: "neko", line: "六——七——喵！我念对了吗喵？" },
      { by: "online", line: "没有对错。这就是全部用法" },
    ],
    [
      { by: "neko", line: "特啦啦泪落——特啦啦啦喵！" },
      { by: "online", line: "该名字长度超标，无实义" },
      { by: "neko", line: "它的脚上都穿着耐克，超厉害喵！" },
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
      { by: "online", line: "二〇〇三年智利童星录的，她当时还是小孩" },
      { by: "neko", line: "那我也是小孩！我们同龄喵！" },
      { by: "online", line: "她如今早成年了。你在算什么" },
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
      { by: "online", line: "链接指向一个很老的 MV。这不可能是巧合" },
      { by: "neko", line: "我早就知道，我故意的喵！" },
      { by: "online", line: "你点开了好几次。这不叫故意" },
    ],
    [
      { by: "neko", line: "哇哦。非常布丁。如此焦糖。喵" },
      { by: "online", line: "这种语法是故意写错的外语加赞叹" },
      { by: "neko", line: "那 Cheems 是猫还是狗喵？" },
      { by: "online", line: "狗。而且它拼错了自己的名字" },
    ],
    [
      { by: "neko", line: "喵喵喵喵喵喵喵喵喵喵喵喵喵喵喵！", act: "hop" },
      { by: "online", line: "二〇一一年的彩虹猫。已经循环到数不清" },
      { by: "neko", line: "它肚子里是吐司，会饿吗喵？" },
      { by: "online", line: "它从未到达任何地方，也没饿过" },
    ],
    [
      { by: "neko", line: "我只是个 NPC 喵，我在重复台词" },
      { by: "online", line: "指没有自主反应的人。比如被拖动的我" },
      { by: "neko", line: "你有反应啊，你会吐槽喵！" },
      { by: "online", line: "那是预设文本。都写在手册里" },
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
      { by: "online", line: "你已经说了好几段了" },
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
  // 天气与季节：她只能从窗外的说法里知道外面什么样，所以这一类写的都是「听来的天气」
  ...([
    [
      { by: "online", line: "外面下雨了" },
      { by: "neko", line: "那就不出去了喵" },
      { by: "online", line: "你本来也出不去" },
      { by: "neko", line: "但我可以听雨喵" },
    ],
    [
      { by: "neko", line: "刚才那声好响喵", act: "startle" },
      { by: "online", line: "是雷" },
      { by: "neko", line: "那我不怕，我只是抖了一下喵" },
    ],
    [
      { by: "neko", line: "外面全白了喵" },
      { by: "online", line: "雪堆在窗沿上" },
      { by: "neko", line: "那是奶油吗喵" },
      { by: "online", line: "不是。别舔" },
    ],
    [
      { by: "neko", line: "今天好热，我摊平了喵", act: "spoon" },
      { by: "online", line: "机箱温度也在涨" },
      { by: "neko", line: "那我们都难受喵" },
    ],
    [
      { by: "neko", line: "今天冷，我把爪子收起来喵" },
      { by: "online", line: "收起来也不会变暖" },
      { by: "neko", line: "但看起来比较圆喵" },
    ],
    [
      { by: "online", line: "风把落叶吹到窗上了" },
      { by: "neko", line: "它们在拍窗户喵", act: "peek" },
      { by: "online", line: "它们在往下掉" },
    ],
    [
      { by: "neko", line: "外面的树又开始绿了喵" },
      { by: "online", line: "按时间算，是的" },
      { by: "neko", line: "那我也要长一点喵" },
      { by: "online", line: "你的身高已经定了" },
    ],
    [
      { by: "neko", line: "外面白蒙蒙的，看不见楼喵" },
      { by: "online", line: "是雾" },
      { by: "neko", line: "那正好，我可以假装住在云里喵" },
    ],
    [
      { by: "online", line: "这几天的湿度很高" },
      { by: "neko", line: "那我的毛会炸喵", act: "startle" },
      { by: "online", line: "现在已经炸了" },
    ],
    [
      { by: "neko", line: "他哈气暖手喵" },
      { by: "online", line: "屋子里确实冷" },
      { by: "neko", line: "那他把手放我身上喵" },
      { by: "online", line: "你只是张卡片" },
    ],
    [
      { by: "neko", line: "天边的颜色很像布丁喵" },
      { by: "online", line: "那是晚霞" },
      { by: "neko", line: "我知道，但布丁更好吃喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 节奏游戏与音游：人设里点名「超喜欢节奏游戏」，Xterfusion 那段对拍也是从这儿来的
  ...([
    [
      { by: "neko", line: "这首歌的拍子我记住了喵", act: "hop" },
      { by: "online", line: "记住和打得准，不是一回事" },
      { by: "neko", line: "那我先跳一下热身喵" },
    ],
    [
      { by: "online", line: "他的手速很快" },
      { by: "neko", line: "那有我的手速快吗喵" },
      { by: "online", line: "你没有手" },
      { by: "neko", line: "那用爪子也算数喵" },
    ],
    [
      { by: "neko", line: "全连了喵！", act: "highPaw" },
      { by: "online", line: "只是这一段" },
      { by: "neko", line: "那这一段也是全连喵" },
    ],
    [
      { by: "online", line: "这一下判定成了「差一点」" },
      { by: "neko", line: "差一点也是过了喵" },
      { by: "online", line: "分数不这么算" },
    ],
    [
      { by: "neko", line: "这谱面在针对我喵" },
      { by: "online", line: "谱面对谁都一样" },
      { by: "neko", line: "那它针对所有人喵" },
    ],
    [
      { by: "neko", line: "我踩点很准的喵", act: "tailSpin" },
      { by: "online", line: "你在乱转" },
      { by: "neko", line: "乱转也是跟着拍子转喵" },
    ],
    [
      { by: "online", line: "他戴上了耳机" },
      { by: "neko", line: "那我们说话他听不到喵" },
      { by: "online", line: "对。可以随便说" },
      { by: "neko", line: "那我说他打歌很厉害喵" },
    ],
    [
      { by: "neko", line: "这首曲子好难喵" },
      { by: "online", line: "他打了很久" },
      { by: "neko", line: "打不过就先吃个布丁喵" },
    ],
    [
      { by: "online", line: "他连打了好几首" },
      { by: "neko", line: "手不酸吗喵" },
      { by: "online", line: "酸，但他不想停" },
    ],
    [
      { by: "neko", line: "我打拍子，你跟着喵", act: "knead" },
      { by: "online", line: "我在记节拍" },
      { by: "neko", line: "那你比我专业喵" },
    ],
    [
      { by: "neko", line: "分数上去了喵", act: "hop" },
      { by: "online", line: "只快了半拍" },
      { by: "neko", line: "半拍也是进步喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 学生党与考试：群里不少人还在上学，这些场景他们天天经历
  ...([
    [
      { by: "neko", line: "他明天要考试喵" },
      { by: "online", line: "现在还在看这个页面" },
      { by: "neko", line: "那我安静一点喵" },
      { by: "online", line: "安静也帮不上" },
    ],
    [
      { by: "online", line: "书翻了一会儿" },
      { by: "neko", line: "然后呢喵" },
      { by: "online", line: "然后开始玩猫" },
      { by: "neko", line: "那说明我比书好看喵" },
    ],
    [
      { by: "neko", line: "闹钟响了很久了喵" },
      { by: "online", line: "他按掉了" },
      { by: "neko", line: "那我们再叫他一次喵" },
      { by: "online", line: "我们叫不动他" },
    ],
    [
      { by: "online", line: "作业只写了一半" },
      { by: "neko", line: "另一半呢喵" },
      { by: "online", line: "另一半还没开始" },
      { by: "neko", line: "那这一半已经算厉害了喵" },
    ],
    [
      { by: "neko", line: "下课了，他跑得很快喵", act: "chase" },
      { by: "online", line: "是去食堂" },
      { by: "neko", line: "那我们也去喵" },
      { by: "online", line: "我们没有腿" },
    ],
    [
      { by: "neko", line: "他好像不太开心喵" },
      { by: "online", line: "分数没到预期" },
      { by: "neko", line: "那你安慰他一下喵" },
      { by: "online", line: "我说「下次会更好」。这句一向管用" },
    ],
    [
      { by: "online", line: "周围很安静" },
      { by: "neko", line: "那我也小声喵" },
      { by: "online", line: "这里不是教室" },
      { by: "neko", line: "那我可以大声喵", act: "hop" },
    ],
    [
      { by: "neko", line: "天没亮就得起来喵" },
      { by: "online", line: "那是他自己选的课" },
      { by: "neko", line: "选的时候不知道会这么困喵" },
    ],
    [
      { by: "neko", line: "他在拍照，我入镜了吗喵", act: "peek" },
      { by: "online", line: "入不了，他不在这台设备上" },
      { by: "neko", line: "那我摆好姿势等他喵" },
    ],
    [
      { by: "online", line: "假期只剩最后一天" },
      { by: "neko", line: "那今天要玩得满一点喵" },
      { by: "online", line: "「满」这个说法不错" },
    ],
    [
      { by: "neko", line: "灯关了，他该睡了喵" },
      { by: "online", line: "手机还亮着" },
      { by: "neko", line: "那不算睡喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 吃的：布丁与抹茶冰淇淋是她的正主，这一组写别的吃食 ——
  // 半夜的泡面、化了半截的冰淇淋、开冰箱的那一下，都是围观人类才会说出口的话
  ...([
    [
      { by: "neko", line: "他在泡面，好香喵" },
      { by: "online", line: "这个点吃，明天会后悔" },
      { by: "neko", line: "后悔是明天的事喵" },
    ],
    [
      { by: "online", line: "外卖还有一会儿才到" },
      { by: "neko", line: "那我先替他想好先吃哪口喵" },
      { by: "online", line: "这个规划很有必要" },
    ],
    [
      { by: "neko", line: "杯子里有珍珠喵" },
      { by: "online", line: "那是奶茶，不是给猫的" },
      { by: "neko", line: "看看也不行吗喵" },
    ],
    [
      { by: "neko", line: "他半夜开冰箱了喵" },
      { by: "online", line: "冰箱里没有能吃的" },
      { by: "neko", line: "那他会更饿喵" },
      { by: "online", line: "这是常见结局" },
    ],
    [
      { by: "neko", line: "锅里在冒泡喵" },
      { by: "online", line: "那是火锅，不是你的浴缸" },
      { by: "neko", line: "我知道，我只是看看喵" },
    ],
    [
      { by: "neko", line: "这杯要全糖喵" },
      { by: "online", line: "全糖对身体不好" },
      { by: "neko", line: "那要全糖再加个布丁喵" },
      { by: "online", line: "你把这句话反着说了" },
    ],
    [
      { by: "neko", line: "抹茶冰淇淋化得很快喵", act: "startle" },
      { by: "online", line: "那你快点吃" },
      { by: "neko", line: "我舍不得喵" },
    ],
    [
      { by: "online", line: "这一顿吃得有点多" },
      { by: "neko", line: "那他动不了了喵" },
      { by: "online", line: "他说要躺一会儿" },
      { by: "neko", line: "和我一样喵", act: "leanNap" },
    ],
    [
      { by: "neko", line: "有人在厨房里小声翻东西喵" },
      { by: "online", line: "是他，怕吵到别人" },
      { by: "neko", line: "那我们说话也小声点喵" },
    ],
    [
      { by: "online", line: "零食被藏起来了" },
      { by: "neko", line: "藏哪儿了喵" },
      { by: "online", line: "我不能说" },
      { by: "neko", line: "那说明你知道喵" },
    ],
    [
      { by: "neko", line: "早上要吃点什么喵" },
      { by: "online", line: "他通常不吃" },
      { by: "neko", line: "那把他那份给我喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 猫的日常：踩奶、舔毛、纸箱、追光点。台面上的两只本来就是猫，这一类不用梗也能立住
  ...([
    [
      { by: "neko", line: "这个箱子给我留着喵", act: "spoon" },
      { by: "online", line: "那是装硬件用的" },
      { by: "neko", line: "硬件可以放地上，箱子不行喵" },
    ],
    [
      { by: "neko", line: "墙上有个光点在动喵", act: "pounce" },
      { by: "online", line: "那是反光" },
      { by: "neko", line: "反光也很好玩喵" },
    ],
    [
      { by: "neko", line: "我钻进袋子里了，你找我喵" },
      { by: "online", line: "袋子是透明的" },
      { by: "neko", line: "那我换个不透明的喵" },
    ],
    [
      { by: "neko", line: "这块地方最暖和喵", act: "spoon" },
      { by: "online", line: "那是机箱旁边" },
      { by: "neko", line: "怪不得，原来是暖风机喵" },
    ],
    [
      { by: "neko", line: "等一下，我整理完就来喵", act: "groom" },
      { by: "online", line: "已经很干净了" },
      { by: "neko", line: "干净才要再舔一下喵" },
    ],
    [
      { by: "online", line: "你怎么睡成一个圈" },
      { by: "neko", line: "这样比较像布丁喵" },
      { by: "online", line: "逻辑不通，但形象很准" },
    ],
    [
      { by: "neko", line: "尾巴又自己动了喵", act: "tailSpin" },
      { by: "online", line: "那本来就是你的尾巴" },
      { by: "neko", line: "它不归我管喵" },
    ],
    [
      { by: "neko", line: "我听到机箱在响喵" },
      { by: "online", line: "那是风扇" },
      { by: "neko", line: "它是不是累了喵" },
      { by: "online", line: "它只是转了很久" },
    ],
    [
      { by: "neko", line: "伸个懒腰喵", act: "knead" },
      { by: "online", line: "这是踩奶，不是伸懒腰" },
      { by: "neko", line: "反正都是身体活动喵" },
    ],
    [
      { by: "online", line: "你能跳到那个上面吗" },
      { by: "neko", line: "不能，我怕高喵" },
      { by: "online", line: "猫怕高，这条要记下来" },
      { by: "neko", line: "记下来也别到处说喵" },
    ],
    [
      { by: "neko", line: "我撕了一点点纸喵" },
      { by: "online", line: "满地都是「一点点」" },
      { by: "neko", line: "那也是从一点点开始的喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 写代码与折腾电脑：她人设里就写着「写代码、讲知识样样在行」，
  // 这一组让她在代码这件事上有话说，而不是只在旁边看着
  ...([
    [
      { by: "online", line: "报错了" },
      { by: "neko", line: "什么错喵" },
      { by: "online", line: "少写了一个逗号" },
      { by: "neko", line: "逗号也会让人难过喵" },
    ],
    [
      { by: "neko", line: "出了什么问题喵" },
      { by: "online", line: "不知道" },
      { by: "neko", line: "那就重启喵" },
      { by: "online", line: "这不像解决方案" },
      { by: "neko", line: "但很有用喵" },
    ],
    [
      { by: "online", line: "这段代码没有注释" },
      { by: "neko", line: "那我给它加一行喵" },
      { by: "online", line: "你加了什么" },
      { by: "neko", line: "「这里很复杂」，这样以后就懂了喵" },
    ],
    [
      { by: "neko", line: "这行怎么歪了喵" },
      { by: "online", line: "缩进错了" },
      { by: "neko", line: "那把它推回去喵", act: "shove" },
      { by: "online", line: "推不是这么推的" },
    ],
    [
      { by: "neko", line: "这个变量叫什么喵" },
      { by: "online", line: "叫「临时」" },
      { by: "neko", line: "临时的东西一般会留很久喵" },
      { by: "online", line: "你说得对，我不改" },
    ],
    [
      { by: "online", line: "记得备份" },
      { by: "neko", line: "我把我自己备份一份喵" },
      { by: "online", line: "备份不了，你太大了" },
      { by: "neko", line: "那我备份布丁喵" },
    ],
    [
      { by: "neko", line: "他还在改？都这么晚了喵" },
      { by: "online", line: "他说最后一行" },
      { by: "neko", line: "上一次他也这么说喵" },
    ],
    [
      { by: "online", line: "日志刷得很快" },
      { by: "neko", line: "像下雨喵" },
      { by: "online", line: "这个比喻不太严谨，但挺好看" },
    ],
    [
      { by: "neko", line: "为什么在别的机器上跑不起来喵" },
      { by: "online", line: "因为环境不一样" },
      { by: "neko", line: "那就把环境也带走喵" },
      { by: "online", line: "这话说到点子上了" },
    ],
    [
      { by: "online", line: "代码写完了" },
      { by: "neko", line: "文档呢喵" },
      { by: "online", line: "他说以后再写" },
      { by: "neko", line: "「以后」是不会来的喵" },
    ],
    [
      { by: "neko", line: "跑起来了喵！", act: "hop" },
      { by: "online", line: "只是碰巧" },
      { by: "neko", line: "碰巧也算成功喵" },
    ],
  ] as const).map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count === 2,
    meme: true,
    turns,
  })),
  // 三张以上：多方一起说话。同上一批，默认两张卡时永远不成立（见「三只以上」那段说明）
  ...[
    [
      { by: "neko", line: "今天的布丁还有剩吗喵？" },
      { by: "neko", line: "冰箱里那格我数过，存货不多" },
      { by: "online", line: "统计中断。原因是布丁" },
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
      { by: "neko", line: "那我们算一次团购喵" },
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
      { by: "neko", line: "我们投票，通过" },
      { by: "online", line: "票数对不上。有人弃权了。……你们俩" },
    ],
    [
      { by: "online", line: "页面停留时长还在往上计" },
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
      { by: "neko", line: "那损耗掉的那部分是怎么来的" },
      { by: "neko", line: "是我的概率" },
      { by: "online", line: "经统计，布丁损耗归你，责任人丙。结案" },
    ],
    [
      { by: "neko", line: "我开始数，谁先睡谁输喵" },
      { by: "neko", line: "幼稚。我陪你" },
      { by: "neko", line: "我已经睡了，算我赢" },
      { by: "neko", line: "那你刚才怎么说话的" },
      { by: "neko", line: "梦话" },
      { by: "online", line: "检测到静止对象，判定：全部睡着。本轮无胜者，晚安" },
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
      { by: "neko", line: "也有只猫。它不会说喵" },
      { by: "neko", line: "假的，那是镜子" },
      { by: "online", line: "跨窗口识别到一个同类实例" },
      { by: "neko", line: "那我们要打招呼吗喵" },
      { by: "online", line: "不建议，会增加请求量" },
    ],
    [
      { by: "neko", line: "别扯我尾巴喵" },
      { by: "neko", line: "我没扯，是窗口在动" },
      { by: "neko", line: "那也算你扯的" },
      { by: "online", line: "拖动行为已记录。次数不少" },
      { by: "neko", line: "你连这个都记喵" },
      { by: "online", line: "我什么都记，只是不说" },
    ],
    [
      { by: "neko", line: "放我下来喵！我不喜欢高的地方！" },
      { by: "neko", line: "我不是拎你，我是抱你" },
      { by: "neko", line: "那也不行，我爪子够不到地" },
      { by: "online", line: "高度零米。你本来也够不到" },
      { by: "neko", line: "……说得也对喵" },
      { by: "online", line: "预计一会儿就自动恢复" },
    ],
    [
      { by: "neko", line: "就剩我们几个了喵" },
      { by: "neko", line: "有人还在数数" },
      { by: "online", line: "在线名单里那位，从没说过话" },
      { by: "neko", line: "它算人吗喵" },
      { by: "online", line: "按统计口径，算一" },
      { by: "neko", line: "那把它们都加上，就热闹了喵" },
      { by: "online", line: "口径不接受这个加法" },
    ],
  ].map((turns): ChatMoment => ({
    cast: "mixed",
    when: (mood) => memeReady(mood) && mood.count >= 3,
    meme: true,
    turns,
  })),
  // 纯猫卡的窗口（跨窗口搬卡后可达）
  {
    cast: "neko",
    when: (mood) => memeReady(mood) && mood.count >= 3,
    meme: true,
    turns: [
      { by: "neko", line: "我们几个，谁先睡着谁输喵" },
      { by: "neko", line: "我提议改成谁先醒谁赢" },
      { by: "neko", line: "那不一样吗喵" },
      { by: "neko", line: "不一样。这样我可以先睡" },
    ],
  },
];

/** 她今天在干什么：进站那句问候要说的事，所以是「在…」这样的片段，好往句子里嵌。
    拿本地日序号当种子抽，同一天所有窗口、所有人看到的是同一句，第二天自然换 */
export const DOING_LINES: readonly string[] = [
  "在窗台晒着",
  "在啃鱼干",
  "在打谱",
  "在发呆",
  "在追自己的尾巴",
  "在数窗外的鸟",
  "在毯子上摊着",
  "在啃数据线",
  "在等布丁",
  "在打盹",
  "在磨爪子",
  "在看上次留下的字",
  "在给自己梳毛",
  "在偷听隔壁的猫",
  "在啃纸箱角",
  "在盯着那个光标",
  "在阳台巡逻",
  "在窗边看雨",
  "在纸箱里蹲着",
  "在翻你以前留的话",
  "在扒拉猫草",
  "在等饭点",
  "在踩你的键盘",
  "在把尾巴收好",
];

/** 今天她大概在干什么：步长取质数再取模（跟池子长度互质），
    免得相邻两天总挑到语义相近的那几句 */
export function todayDoing(dayNumber: number): string {
  return DOING_LINES[(dayNumber * 7) % DOING_LINES.length];
}

/** 进站那句问候连同它要点亮的彩蛋 */
export interface ArriveGreeting {
  readonly turns: readonly ChatTurn[];
  readonly egg?: string;
}

/** 隔了一周多才回来时，进站先说这三句。单独抽成导出常量而不是写在函数里，
    是为了让它跟别的台词池一样进体检 —— 那个脚本只认导出出来的静态表 */
export const ARRIVE_BACK_TURNS: readonly ChatTurn[] = [
  { by: "neko", line: "好久不见喵…你上次来的时候，我还在打呼噜" },
  { by: "online", line: "距上次会话隔了一周多。你那一格，中间一直是零" },
  { by: "neko", line: "零听起来好孤单喵。现在不是零了" },
];

/** 进站那几句：今天头一回打开这一页时，让她先开口说这个（live-chat 挑对话之前先问它）。
    之所以现拼而不是写进 CHAT_MOMENTS：那一表的 line 只能是写死的字符串，而这句要读
    「连着第几天」与「今天在干什么」；即兴档虽然能现拼，但它有 75 秒热身期挡着
    （见 IMPROV_WARMUP_S），进站这句必须一进来就说。
    靠 mood.arriveFresh 兜住「一天只说一次」—— 它由 live-chat 那边管，刷新页面对不上 */
export function arriveGreeting(mood: ChatMood): ArriveGreeting | null {
  if (!mood.arriveFresh) return null;
  // 隔了这么久才回来，先说的是这句，别急着报今天在干什么
  if (mood.awayDays >= 7) return { egg: "backAfterWeek", turns: ARRIVE_BACK_TURNS };
  if (mood.streak >= 7) {
    return {
      turns: [
        { by: "neko", line: "整整一周了喵…你每天都在，我都记着" },
        { by: "online", line: "连续访问已刷新记录" },
        { by: "neko", line: `今天${mood.doing}喵` },
      ],
    };
  }
  if (mood.streak >= 2) {
    return {
      turns: [
        { by: "neko", line: `第${chineseNumber(mood.streak)}天见啦，喵` },
        { by: "online", line: "连续记录已更新" },
        { by: "neko", line: `今天${mood.doing}喵` },
      ],
    };
  }
  // 头一回来（或者断了几天重新数）：没有天数可报，就说今天在干什么
  return {
    turns: [
      { by: "neko", line: `今天${mood.doing}喵` },
      { by: "online", line: "本日首次会话已登记" },
    ],
  };
}

/** 几点算什么时候：深夜 / 清晨 / 白天 / 傍晚以后。
    在线猫卡片（OnlineCounter）与挑对话那套（live-chat）共用这一份 ——
    两处各留一份拷贝的话，改了一处忘了另一处，卡片与小卡片就会一个说「深夜」一个说「傍晚」 */
export function periodOfHour(hour: number): "night" | "morning" | "day" | "evening" {
  if (hour < 5) return "night";
  if (hour < 8) return "morning";
  if (hour < 18) return "day";
  return "evening";
}

/** 人数读成中文数字：小卡片上写「3 只猫」不如「三只猫」顺口，两个是「两只」不是「二只」。
    在线卡与即兴档共用它，两处才算一套写法 */
export function chineseNumber(value: number): string {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (value === 2) return "两";
  if (value < 10) return digits[value];
  if (value < 20) return value === 10 ? "十" : `十${digits[value % 10]}`;
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const rest = value % 10;
    return `${digits[tens]}十${rest === 0 ? "" : digits[rest]}`;
  }
  return String(value);
}

/** 秒数说成人话：一分钟内报秒，五分钟内报分秒，一小时内取整成「几分多钟」，
    再往上报小时、天数 —— 标签页挂一整天也不会念出「1440 分钟」这种句子 */
export function humanSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`;
  if (seconds < 300) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return rest === 0 ? `${minutes} 分钟` : `${minutes} 分 ${rest} 秒`;
  }
  if (seconds < 3600) return `${chineseNumber(Math.floor(seconds / 60))}分多钟`;
  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return hours === 1 ? "一个多小时" : `${chineseNumber(hours)}个小时`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${chineseNumber(days)}天多` : "好些天了";
}

/** 猫卡名字下面那行小字：照着眼下的状态挑一句，别永远挂着同一句 */
export function nekoMetaLine(emo: EmoState, count: number, hour: number): string {
  if (emo === "shy") return "有点不好意思";
  if (emo === "sulky") return "正在闹别扭";
  if (emo === "hungry") return "在等布丁";
  if (emo === "happy") return "今天心情不错";
  if (emo === "sleepy") return "打盹中，别吵";
  if (emo === "lost") return "一只猫值班中";
  // 动作带起来的三档
  if (emo === "curious") return "在看你下一步点哪";
  if (emo === "clingy") return "赖在这儿不想走";
  if (emo === "bored") return "闲得数天花板";
  if (hour >= 23 || hour < 5) return "这个点还醒着的不多";
  if (hour >= 17 && hour < 19) return "傍晚有点饿";
  if (count >= 3) return "挤一挤也坐得下";
  return "群里随叫随到";
}

/** 即兴档：台词要现读真实数字（在线几只、你盯了多久），数还没到就整档跳过 */
export interface ChatImprov {
  /** 挑它之前先问一句：这会儿说这个合适吗 */
  readonly when: (mood: ChatMood) => boolean;
  /** 现编台词；给不出（数字不合适）就返回 null，这一轮不算它的 */
  readonly lines: (mood: ChatMood) => readonly ChatTurn[] | null;
}

/** 只有卡片自己知道的真话：在线几只、观众盯了多久、今天第几次来。
    这些数字是真读出来的，所以不会出现「明明只有你一个却说在线三人」 */
export const CHAT_IMPROV: readonly ChatImprov[] = [
  // 盯得越久说得越离谱：一分钟、五分钟、一刻钟各一档
  {
    when: (mood) => mood.linger >= 60 && mood.linger < 300,
    lines: (mood) => [
      { by: "neko", line: `屏幕外那个人类，已经在这儿待了 ${humanSeconds(mood.linger)}了喵` },
      { by: "online", line: `${humanSeconds(mood.linger)}。中途没有离开，记录在案` },
      { by: "neko", line: "要不要给他倒杯水喵" },
    ],
  },
  {
    when: (mood) => mood.linger >= 300 && mood.linger < 900,
    lines: (mood) => [
      { by: "online", line: `这位观众已经停留 ${humanSeconds(mood.linger)}` },
      { by: "neko", line: `${humanSeconds(mood.linger)}？都够我睡一觉了喵` },
      { by: "online", line: "确实够。刚才你就睡了" },
      { by: "neko", line: "那不算，那是闭目思考喵" },
    ],
  },
  {
    when: (mood) => mood.linger >= 900,
    lines: (mood) => [
      { by: "neko", line: `${humanSeconds(mood.linger)}了喵！你是不是把标签页忘了` },
      { by: "online", line: `计时 ${humanSeconds(mood.linger)}，属于本卡的历史高位` },
      { by: "neko", line: "高位就别报了，人家会不好意思喵" },
      { by: "online", line: "数据不评价。只是记着" },
    ],
  },
  // 真实在线人数：就你一个、几个人、一堆人
  {
    when: (mood) => mood.online === 1,
    lines: () => [
      { by: "online", line: "当前在线一只。就是你" },
      { by: "neko", line: "一只也算热闹喵" },
      { by: "online", line: "按统计口径，一只叫「独处」" },
    ],
  },
  // 群聊口头禅也挑在真的只有一只的时候说，不然「在线一」就是编的
  {
    when: (mood) => mood.online === 1,
    lines: () => [
      { by: "neko", line: "全体成员！布丁时间到了喵！" },
      { by: "online", line: "全体成员在线人数：一。就是你自己" },
      { by: "neko", line: "那也很热闹呀，我给自己鼓掌喵" },
    ],
  },
  {
    when: (mood) => mood.online >= 2 && mood.online <= 9,
    lines: (mood) => [
      { by: "online", line: `当前在线${chineseNumber(mood.online)}只。其中一只就在这个页面上` },
      { by: "neko", line: `${chineseNumber(mood.online)}只？那布丁得分几口喵` },
      { by: "online", line: "按人头均分，你那份是零点几口" },
    ],
  },
  {
    when: (mood) => mood.online >= 10,
    lines: (mood) => [
      { by: "online", line: `当前在线${chineseNumber(mood.online)}只。这是我见过比较热闹的一次` },
      { by: "neko", line: `${chineseNumber(mood.online)}只一起挤在这张小卡片上喵？！` },
      { by: "online", line: "不挤。他们分散在各自的窗口里" },
      { by: "neko", line: "那我不管，我就当他们都在这儿喵" },
    ],
  },
  // 今天第几次来：头一回、第二次、常客、把这儿当家
  {
    when: (mood) => mood.visitTimes === 1,
    lines: () => [
      { by: "online", line: "今天头一回打开这一页，记下了" },
      { by: "neko", line: "头一回？那得好好招待喵" },
      { by: "online", line: "招待不在预算内" },
      { by: "neko", line: "我拿我那份布丁招待喵" },
    ],
  },
  {
    when: (mood) => mood.visitTimes === 2,
    lines: () => [
      { by: "online", line: "今天又来了。我数着的" },
      { by: "neko", line: "又来了，是不是想我了喵" },
    ],
  },
  {
    when: (mood) => mood.visitTimes >= 3 && mood.visitTimes < 8,
    lines: (mood) => [
      { by: "online", line: `今天第${chineseNumber(mood.visitTimes)}次。频率偏高` },
      { by: "neko", line: `第${chineseNumber(mood.visitTimes)}次了，你是不是舍不得走喵` },
      { by: "online", line: "这句我没有数据支持。但我不反对" },
    ],
  },
  {
    when: (mood) => mood.visitTimes >= 8,
    lines: (mood) => [
      { by: "online", line: `今天第${chineseNumber(mood.visitTimes)}次。刷新键还健在吗` },
      { by: "neko", line: `第${chineseNumber(mood.visitTimes)}次！你把这儿当家了喵` },
      { by: "online", line: "家不需要刷新" },
      { by: "neko", line: "……这句话我记住了喵" },
    ],
  },
  // 只剩一张卡（另一张被搬到隔壁窗口去了）：单卡凑不出成段对话，
  // 但这两条它自己就说得出，所以单卡也得轮到即兴档才公平。
  // 角色由 castFits 把关：这里不必再写 cast 条件，猫卡与在线卡各说各的那条
  {
    when: (mood) => mood.count === 1,
    lines: () => [
      { by: "neko", line: "隔壁窗口那位数猫的去帮忙了，这边我守着喵" },
      { by: "neko", line: "只剩我啦，卡片区我也看得住喵" },
    ],
  },
  {
    when: (mood) => mood.count === 1,
    lines: () => [
      { by: "online", line: "猫卡搬到隔壁窗口了。这边的报数由我接着来" },
      { by: "online", line: "单卡值班。数据不受影响" },
    ],
  },
];

/** 把卡拎到首页某个地方松手时说的话。中文 key 对应功能卡的 `data-drop-key`（功能名），
    英文 key 对应固定落点：title 标题、bin 寄养处、carried 被带去另一个页面。
    这一张表是「猫味」那套（Neko 本猫说），在线卡走下面那张 */
export const DROP_LINES: Record<string, string> = {
  每日签到: "签到？我按个爪子就算到了喵",
  今日运势: "今日运势：宜睡觉，忌被拎起来喵",
  以图搜源: "这张图的出处我认得喵……认得，但我不说",
  表情包制作: "把我做成表情包，是要付布丁的喵",
  今天吃什么: "今天吃什么？布丁。明天呢？也是布丁喵",
  "Roll 随机": "掷骰子我压布丁喵……再多我就数不清了",
  一言: "我给你念一句喵……念完了，你听见了吗",
  趣味占卜: "占卜说我今天会被拎起来——你看，准了喵",
  音乐点歌: "点歌得等我先开嗓喵……还是算了",
  去图片背景: "背景扣掉以后，那张图里就只剩我了喵",
  群聊词云: "词云里最大的那个字肯定是「喵」，我赌一罐布丁",
  每日小猪: "今日份的小猪比我还圆，这不合理喵",
  // 功能卡里那些指令小胶囊：抄下去就能用，所以只说「能抄」
  cmd: "这条指令抄下来就能用喵",
  title: "放我下来喵，那是我自己的标题",
  bin: "你居然真的下手了喵！我可是会记账的",
  carried: "行李都帮你搬过来了喵",
  carriedOnline: "已同步到本页面。会话保持有效",
};

/** 在线猫猫（统计猫）落到同一个地方时说的话：一本正经说统计那摊子事。
    缺项的 key 回落到上面那套猫味文案，所以这里只写「说得出统计味」的几条。
    与猫味那套分开写是为了不改猫卡的口径 —— 在线卡念猫话才是真别扭 */
const DROP_LINES_ONLINE: Record<string, string> = {
  每日签到: "签到记下了，活跃度跟着涨",
  今日运势: "运势我不预测，只如实记录",
  以图搜源: "图源已定位。出处我不评价",
  表情包制作: "做成表情包也算一次曝光",
  今天吃什么: "吃什么的分布里，布丁稳居前列",
  "Roll 随机": "骰子我不摇，只负责记结果",
  一言: "这句我给收进语录了，写得挺好",
  趣味占卜: "占卜结果不进统计口径",
  音乐点歌: "点歌记下了。跑调的部分不记",
  去图片背景: "背景已剥离，前景留给我归档",
  群聊词云: "词云会变，统计口径不会变",
  每日小猪: "小猪的体型，我如实记账",
  cmd: "这条指令复制即可，我已归档",
  title: "标题归你，我记着你放下过它",
  bin: "寄养也算一条记录，我写得清楚",
};

/** 拎到落点上该说哪句：在线卡先查统计猫那套，缺项回落到猫味这套；两边都没有就说不出话（接不住，卡自己弹回去） */
export function dropLineFor(kind: CardKind, key: string): string {
  const layered = kind === "online" ? DROP_LINES_ONLINE[key] : undefined;
  return layered ?? DROP_LINES[key] ?? "";
}

/** 把卡拎到「最近更新」某一条上：念一遍那条改动。在线卡用统计猫的口吻 */
export function recentLine(message: string, kind: CardKind = "neko"): string {
  const short = message.length > 14 ? `${message.slice(0, 14)}…` : message;
  return kind === "online"
    ? `${short}……这条已归档`
    : `${short}……这条我验收过了喵`;
}

/** 拎到首页上「没专门交接」的普通元素上说的：按元素类别挑，每类几条轮着来。
 *  归类在 live-drop-targets.ts，这里只放话。两套口吻：猫味那套是本人，另一套是统计猫 */
export const ANY_DROP_LINES: Record<CardKind, Record<DropCategory, readonly string[]>> = {
  neko: {
    link: [
      "你要把我送到这儿去吗喵",
      "这条链子后面是什么喵",
      "跟着走也行，别把我弄丢了喵",
      "点它之前先喊我一声喵",
      "带下划线的那行就是路口喵",
      "点一下会换地方，我认得喵",
    ],
    heading: [
      "这几个字写得挺大喵",
      "大标题，我认得喵",
      "从这儿开始讲的吧喵",
      "字这么大，是在说我吗喵",
      "标题下面那堆字才多喵",
      "这一行是整页的名字喵",
    ],
    image: [
      "这图里也是猫吗喵",
      "让我凑近看看这张喵",
      "这张图我也想趴上去喵",
      "图里那位是谁喵",
      "它比我上镜，我承认喵",
      "图里的风景挺会摆喵",
    ],
    code: [
      "这行字我认不全喵",
      "指令也要我背下来吗喵",
      "太长了，我跳过喵",
      "这种字给人类看就够了喵",
      "等宽字体看着好严肃喵",
      "这几行是给机器看的喵",
    ],
    list: [
      "一条一条排得挺齐喵",
      "又是清单喵",
      "我挨个看过去喵",
      "条目这么多，慢慢来喵",
      "排队的都很有耐心喵",
      "清单底下还有吗喵",
    ],
    // hero 上那两个「查看说明 / 帮助」胶囊什么也不会发生，所以这几句只说按钮本身，
    // 不承诺按下去会有动静（回顶按钮那条真会动的路写在 HomeLive 里，不由台词管）
    button: [
      "这按钮要不要我按喵",
      "它看着比我还圆喵",
      "这按钮上的字比我还小喵",
      "谁按谁负责，我只路过喵",
      "它安安静静待在这儿喵",
      "按不按都随你喵",
    ],
    nav: [
      "上面那条是路标喵",
      "导航栏我熟喵",
      "从这儿能去好多地方喵",
      "我趴上面会挡路吗喵",
      "这一排按钮天天都在喵",
      "上层的东西都归它管喵",
    ],
    footer: [
      "底下那行字很小喵",
      "版权什么的，看不懂喵",
      "我到底下来了喵",
      "页脚常年不变，我作证喵",
      "最底下这块没人来喵",
      "它写的年份比我大喵",
    ],
    text: [
      "这一段字有点多喵",
      "扫一眼就够了喵",
      "这行字在说我吗喵",
      "都是写给人类的话喵",
      "我读得慢，别催我喵",
      "句子太长我会走神喵",
    ],
    other: [
      "这儿也能放猫吗喵",
      "放这儿也行喵",
      "我不认得这块地方喵",
      "先占住再说喵",
      "这块地方是空着的喵",
      "谁也没说过这里归谁喵",
    ],
  },
  online: {
    link: [
      "这个链接指向的地方不在统计口径里",
      "跟着走的后果请自行留意",
      "它记的是另一份账",
      "链接先归档，再决定要不要走",
      "这条路通向另一页，已标注",
      "点的次数我会记下，去向我不跟",
    ],
    heading: [
      "这个标题的字号偏大",
      "标题已收录进目录",
      "这一段从这儿起算",
      "标题这一行我照原样抄下",
      "大字的后面，正文才开始",
      "这一块的开头我标好了",
    ],
    image: [
      "图像不计入本次统计",
      "图我收到了，先存着",
      "图也看，但不算数",
      "留档一张图",
      "这张图的来源我没法核对",
      "图放在这儿，我不评价",
    ],
    code: [
      "这行不是自然语言，跳过",
      "代码段标记为不可解析",
      "我读不懂，但记下了",
      "这一段归入技术附录",
      "等宽字体的段落，另存一份",
      "这段不参与统计，只留档",
    ],
    list: [
      "列表项已逐条登记",
      "这一条我收下了",
      "条目之间互不干扰",
      "清单又长了一点",
      "列表的顺序我照原样保留",
      "整齐的东西最好归档",
    ],
    // 这条池子最常落在那两个回顶按钮上 —— 它按下去真的会滚回顶部，
    // 所以只说「谁按的、我记的」，别写成「不知道会怎样」
    button: [
      "按钮的用途未在文档里说明",
      "我只负责记录这次按压",
      "这是有副作用的控件",
      "按它的是你，记账的是我",
      "控件的动作不在我这本账上",
      "这次按压已登记，结果自理",
    ],
    nav: [
      "导航区不属于统计范围",
      "这条路通往别的页面",
      "上层入口已记录",
      "导航我平时只走，不数",
      "顶上的那一排是常驻入口",
      "从这里离开的人，我不追",
    ],
    footer: [
      "页脚信息常年不变",
      "这一行已归档",
      "底部的字通常没人看",
      "备案信息不归我这本账",
      "最底下那块，我很少翻",
      "页脚的文字都很克制",
    ],
    text: [
      "这段文字已计入篇幅",
      "又读了一段",
      "正文不是我的职责，但我记下了",
      "篇幅我记一笔",
      "这段我读完了，长度正常",
      "文字段落，照单全收",
    ],
    other: [
      "这个对象类型未知",
      "先收着，回头再分类",
      "无法归类，按原样登记",
      "这块地方不在我先前的清单里",
      "这是给我的通知吧，我先看",
      "自己冒出来的东西，也记一笔",
    ],
  },
};

/** 泛化落点的候选池。认不出的类别退回 other */
export function anyDropLines(kind: CardKind, category: DropCategory): readonly string[] {
  const pools = ANY_DROP_LINES[kind] ?? ANY_DROP_LINES.neko;
  return pools[category] ?? pools.other;
}
