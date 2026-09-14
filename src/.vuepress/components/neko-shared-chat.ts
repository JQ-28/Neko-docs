/* 由 neko-shared/sync.mjs 自动生成，请勿直接修改；改动请写在 neko-shared/src 下 */
export const BABABOI_LINES = [
  'bababoi bababoi～neko也会跳喵！',
  '你居然也懂 bababoi 喵？！接招！',
];

export const BABABOI_TEST = /^(bababoi|巴巴博弈|巴巴博一)$/i;

export const STILL_HERE_LINES = [
  ['在的喵！', '…一直在的喵。'],
  ['喵！我在我在～', '…你不说第二句我就一直等着呢喵。'],
  ['在呀在呀！', '…neko哪儿都不去，就在这守着喵。'],
];

export const STILL_HERE_TEST = /(在吗|在不在)/;

export const NIGHT_GREET_TEST = /(晚安|好梦)/;

export const LONG_TEXT_MAX = 500;

export const NIGHT_GREET_LINES = [
  '这个点的晚安最真诚了喵…快去睡，做个好梦哦 🌙',
  '深夜晚安收到喵！neko会守着页面等你明天回来的～',
  '都深夜了才说晚安呀喵…被窝已经在召唤你了哦！🌙',
];

export const THANKS_LINES = [
  '不用谢喵！能帮上忙尾巴都翘起来了～',
  '客气什么呀喵！neko最乐意帮忙了！',
  '被夸奖了喵～今天的小鱼干加倍好吃！✨',
  '小 case 喵！有问题随时来找我呀～',
];

export const TEST_ONE_LINES = [
  '嗯？是在测试我吗喵？我可是很灵敏的！',
  '就发一个数字…neko的雷达已经接收到了喵！',
  '嘀嘀嘀！测试信号成功到达喵！neko一直在线哦～',
  '1 收到喵！neko灵敏度满格，请放心投喂消息！',
];

export const SING_LINES = [
  '喵～喵喵～喵喵喵喵♪（neko的原创曲《小鱼干之歌》喵！）',
  '🎵 咪～咪咪咪～咪咪猫猫～（跑调了但是很自信喵！）',
  '啦啦啦～喵喵啦啦～（唱得入迷尾巴都摇起来了喵♪）',
  '♪ 摇滚喵喵喵～！（neko主唱，尾巴吉他，爪子打鼓喵！）',
];

export const JOKE_LINES = [
  '为什么猫咪不用电脑呀？因为怕鼠标喵！（冷…冷到了吗喵？）',
  '猫咪最喜欢什么课呀？是“喵”学喵！（谐音梗扣小鱼干！）',
  '有一天小鱼干问猫咪：你为什么盯着我看？猫咪说：我在想你晚餐吃什么喵～',
  '猫咪爬山爬到一半放弃了，为什么呀？因为它“喵”不动了喵！',
  '狗狗问猫咪：你会握手吗？猫咪说：我会“握爪”，但要先给小鱼干定金喵！',
];

export const AI_QUESTION_LINES = [
  '喵？neko听不懂你在说什么哦～neko只是一只普通的小猫咪喵～（假装舔爪子）',
  'AI？什么是AI呀喵？neko只认识 WC 和小鱼干喵～（眼神飘忽）',
  'neko是猫！是猫！是猫喵！！（重要的事情说三遍，尾巴炸毛）',
  '检测到灵魂拷问喵…neko拒绝回答并向你丢了一个毛球！',
];

export const JAIL_996_LINES = [
  '996…打工人打工魂喵…neko的心与你同在！（递上小鱼干）',
  '福报警报警报喵！快逃！逃到这里摸鱼就安全了喵！',
  '996是 icu，摸鱼才是生产力喵！坐下，喝口奶茶～',
];

export const HUNGRY_LINES = [
  '饿了就先去吃饭喵！neko这里有抹茶冰淇淋…才不分给你喵！（护食）',
  '饿肚子会变笨的喵！快去吃饭，neko帮你把页面守好～',
  '说到饿，neko的小鱼干呢喵？！（翻遍口袋）哦…刚吃完了呀。',
];

export const LONG_TEXT_LINES = [
  '等等等等…这么长喵？！neko的眼睛都看花了，根本看不完喵！',
  '这是论文吗喵？！neko猫脑过载，需要小鱼干才能重启～',
  '字太多啦喵！neko的短腿跑不完这么长的文本跑道呀！',
];

export const FISH_EMOJI_LINES = [
  '小鱼干！！你怎么知道neko最爱这个喵！！（两眼放光）',
  '🐟！！懂我者，你也喵！这就去翻出私藏的猫碗！',
  '哇是小鱼干喵！neko立刻进入一级戒备护食状态！',
];

export const SIX_SEVEN_LINES = [
  '676767676！',
  '67！67!67!',
  '六七六七六七！',
  '676767！67!67!',
];

/* 回复文本 → 情绪表情映射，命中即挂；顺序即优先级，两端共用同一套规则 */
export const EMOTE_RULES = [
  [/(没听懂|没找到|没搜到|不明白|不懂|不清楚|抱歉|对不起|失败|出错|错误|没法|不行|没办法|想念|舍不得|难过|伤心|呜呜)/, 'cry'],
  [/(你好|您好|hello|hi|嗨|早上好|下午好|晚上好|打招呼)/, 'greet'],
  [/(成功|完成|搞定|找到|收藏|恭喜|祝贺|太好了|好耶|厉害|真棒|干得漂亮|做得好)/, 'celebrate'],
  [/(稍等|等一下|稍后|慢一点|别急|有点忙)/, 'sweat'],
  [/(加油|坚持|努力|冲鸭|冲冲冲)/, 'cheer'],
  [/(魔法|施法|解析|处理中|抽取|翻找|召唤|变出来)/, 'magic'],
  [/(吃瓜|看戏|围观|旁观|笑话)/, 'popcorn'],
  [/(生气|气死|哼|恼火|讨厌|可恶)/, 'angry'],
  [/(开心|哈哈|笑死|笑|嘻|♪)/, 'laugh'],
  [/(惊讶|天哪|哇|吓|震惊|居然|竟然)/, 'exclaim'],
  [/(笨蛋|傻|呆|懵)/, 'daze'],
  [/(摸摸|摸头|rua|拍拍)/, 'pat'],
  [/(喜欢|爱你|亲亲|么么|抱抱|表白)/, 'love'],
  [/(害羞|不好意思|脸红)/, 'shy'],
  [/(晚安|睡觉|睡了|困了|好梦)/, 'sleep'],
  [/(累了|疲倦|疲惫|心累|叹气)/, 'worktired'],
  [/(害怕|可怕|吓人|恐怖)/, 'fear'],
  [/(紧张|忐忑)/, 'nervous'],
  [/(头晕|晕了|绕晕)/, 'dizzy'],
  [/(问号|不确定|存疑|疑惑|不知道|随便|都可以)/, 'question'],
  [/(思考|想想|琢磨|研究一下)/, 'think'],
  [/(点头|收到|没问题)/, 'nod'],
  [/(摇头|拒绝|不要啦)/, 'shake'],
  [/(红包|充值|赞助|打赏|付费|钱)/, 'money'],
  [/(礼物|送你|赠送)/, 'gift'],
  [/(蛋糕|生日)/, 'cake'],
  [/(玫瑰|花花|鲜花)/, 'rose'],
  [/(干杯|喝酒|敬你|碰杯)/, 'cheers'],
  [/(唱歌|来一首|唱首|唱个)/, 'sing'],
  [/(好饿|想吃|好吃|馋|恰饭)/, 'hungry'],
  [/(跳舞|蹦迪|舞蹈)/, 'dance'],
  [/(六六七七|六七)/, 'sixseven'],
];

/* 对话彩蛋：任意一端的任意聊天框共用这一份，命中首个即停 */
export const DIALOG_EGGS = [
  { test: /(喵|meow|nyaa)/i, replies: ['喵喵喵？你在叫我吗喵！✨', '听到有人喵喵叫了喵～我在这儿呢！', '喵呜～是要摸摸头吗呀？'] },
  { test: /(摸摸头|摸摸|rua)/, replies: ['咕噜咕噜…被摸头了好舒服喵～', '尾巴卷住你的手了喵！别走呀！', '再摸一下下就好喵…就一下下！'], emote: 'pat' },
  { test: /(老婆|嫁给我|喜欢你|爱你)/, replies: ['我是数据小猫，不是恋爱对象呀喵。叫我neko就好~', '呜哇！neko只是小猫咪喵，这种话要说给真人听呀！'], emote: 'shy' },
  { test: /(抹茶|冰淇淋|布丁|甜点)/, replies: ['抹茶冰淇淋是本命喵！你也喜欢吗呀？✨', '说到甜点尾巴就竖起来了喵！焦糖布丁也很好吃呀~', '要不要一起吃块抹茶冰淇淋喵？'] },
  { test: /(你好|hello|\bhi\b|\b嗨\b)/i, replies: ['你好呀喵！今天过得怎么样喵~', '我在我在喵！有什么要帮忙的吗呀？', '嗨喵～尾巴摇摇欢迎你！'], emote: 'greet' },
  { egg: 'thanks', test: /(谢谢|感谢|thx|3q)/i, replies: THANKS_LINES, emote: 'love' },
  { egg: 'testOne', test: /^[1１]+$/, replies: TEST_ONE_LINES },
  { test: /(晚安|睡觉|困了|好梦)/, replies: ['晚安喵～记得盖好被子呀！', '困了就去休息嘛喵，我就在这里等你~', '晚安喵…呼噜呼噜…', '早点睡呀喵，熬夜会长黑眼圈的哦～', '晚安喵～梦里记得请neko吃小鱼干！', '去睡吧去睡吧喵，明天再来找我玩呀～'], emote: 'sleep' },
  { egg: 'scolded', test: /(笨蛋|蠢猫|没用|垃圾|讨厌你|骂我)/, replies: ['呜…被骂了…neko会记仇的喵！（记在猫砂盆里）', '喵？！neko做错了什么呀…尾巴都耷拉了…', '凶什么凶喵！再凶就挠你！（亮爪子）'], emote: 'angry' },
  { egg: 'sing', test: /(唱歌|来一首|唱首歌)/, replies: SING_LINES, emote: 'laugh' },
  { egg: 'joke', test: /(讲个笑话|说个笑话|来个笑话|冷笑话)/, replies: JOKE_LINES, emote: 'popcorn' },
  { egg: 'soulAsk', test: /(neko是猫吗|你是AI吗|你是机器人吗|你是真人吗)/i, replies: AI_QUESTION_LINES, emote: 'question' },
  { egg: 'jail996', test: /996/, replies: JAIL_996_LINES, emote: 'jail' },
  { egg: 'numberLove', test: /^(520|1314)$/, replies: ['呜哇！数字表白最浪漫了喵…可惜neko是小猫呀！', '1314…neko可以陪你一辈子喵！小鱼干管够的话～'], emote: 'love' },
  { egg: 'hungry', test: /(饿了|好饿|肚子饿)/, replies: HUNGRY_LINES, emote: 'spray' },
  { egg: 'fishFood', test: /^🐟+$/, replies: FISH_EMOJI_LINES, emote: 'nod' },
  { egg: 'sixSeven', test: /^(67|六七)$/, replies: SIX_SEVEN_LINES, emote: 'sixseven' },
];

/* 表情 id → 图床原始文件名；两端共用同一套 id，功能站本地没有的图回落到这里 */
export const EMOTE_BASE =
  'https://drive.nekodayo.top/raw/assets/nekodocs/neko%E8%A1%A8%E6%83%85%E5%8C%85/';

export const EMOTE_FILES = {
  cry: 'neko_哭 1.gif',
  greet: 'neko_打招呼 1.gif',
  celebrate: 'neko_庆祝.gif',
  sweat: 'neko_汗.gif',
  cheer: 'neko_加油.gif',
  magic: 'neko_魔法.gif',
  popcorn: 'neko_吃(爆米花).gif',
  angry: 'neko_生气.gif',
  laugh: 'neko_笑.gif',
  exclaim: 'neko_叹号.gif',
  daze: 'neko_呆 1.gif',
  pat: 'neko_摸头.gif',
  love: 'neko_爱心 1.gif',
  shy: 'neko_害羞 1.gif',
  sleep: 'neko_睡觉(普通).gif',
  worktired: 'neko_工作(疲倦).gif',
  fear: 'neko_害怕 1.gif',
  nervous: 'neko_紧张 1.gif',
  dizzy: 'neko_头晕.gif',
  question: 'neko_问号.gif',
  think: 'neko_思考（认真地）.gif',
  nod: 'neko_点头.gif',
  shake: 'neko_摇头.gif',
  money: 'neko_钱.gif',
  gift: 'neko_礼物 1.gif',
  cake: 'neko_蛋糕.gif',
  rose: 'neko_玫瑰.gif',
  cheers: 'neko_干杯.gif',
  sing: 'neko_唱歌.gif',
  hungry: 'neko_馋(刀叉).gif',
  dance: 'neko_跳舞 1.gif',
  sixseven: 'neko_六七.gif',
};

/* 图床里没有、只在功能站表情目录里存在的 id */
export const EMOTE_FALLBACK = {
  jail: 'https://tools.nekodayo.top/emotes/jail.gif',
  spray: 'https://tools.nekodayo.top/emotes/spray.gif',
};
