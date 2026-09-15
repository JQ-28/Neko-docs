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

/** 对话里的一句：由哪种卡来说、说什么 */
export interface ChatTurn {
  readonly by: CardSpec["kind"];
  readonly line: string;
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
}

/** 专门为某个光景写的对话：眼下正赶上就说这一档，赶不上就回落到常备的那几套 */
export interface ChatMoment {
  readonly cast: ChatCast;
  readonly when: (mood: ChatMood) => boolean;
  readonly turns: readonly ChatTurn[];
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
    ],
    arrive: [
      "喵？这里是哪儿…",
      "又换了个窝喵~",
      "隔壁的猫，你也在呀喵",
      "打扰啦，我借住一下喵",
      "这里的光线不错喵",
      "行李就一条尾巴，很好搬喵",
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
    ],
    arrive: [
      "换块屏幕接着数",
      "这边的猫，我都看见了",
      "搬家不耽误统计",
      "新地方，人头数从头算",
      "又挪了一次窝",
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
  ],
};

/** 拎完卡片多久之内算「刚被拎过」，说这话的时候还新鲜 */
export const JUST_DRAGGED_MS = 30_000;
/** 演完一段多久之内算「刚演过」 */
export const JUST_PLAYED_MS = 25_000;
/** 正赶上某个光景时，这一档的对话占多大比例；余下的说常备那几套，免得翻来覆去就那几句 */
export const MOMENT_CHANCE = 0.7;

export const CHAT_MOMENTS: readonly ChatMoment[] = [
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
];
