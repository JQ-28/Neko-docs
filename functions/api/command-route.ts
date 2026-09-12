// 指令意图路由：规则引擎先行 + Workers AI 兜底
// 前端先用本地 commands-data 匹配，未命中才请求本接口

interface RouteEntry {
  title: string;
  command: string;
  link: string;
  keywords: string[];
}

// 指令语义索引（与 src/.vuepress/components/commands-data.ts 保持一致）
const ROUTE_INDEX: RouteEntry[] = [
  { title: "JRRP", command: "jrrp", link: "/zhiling/yule/jrrp", keywords: ["运势", "人品", "今日人品", "测", "运"] },
  { title: "今日小猪", command: "今日小猪", link: "/zhiling/yule/pig", keywords: ["猪", "小猪", "烤猪", "猪圈"] },
  { title: "喵言喵语", command: "喵言喵语", link: "/zhiling/yule/miaoyan", keywords: ["喵", "猫语"] },
  { title: "今日doro结局", command: "今日doro结局", link: "/zhiling/yule/doro", keywords: ["doro", "多罗", "结局"] },
  { title: "签到", command: "签到", link: "/zhiling/yule/qiandao", keywords: ["签到", "好感度", "喵喵币", "猫币", "排行", "收集"] },
  { title: "娶群友", command: "娶群友", link: "/zhiling/yule/groupmate_waifu", keywords: ["娶", "老婆", "结婚", "cp", "婚约", "离婚", "涩涩"] },
  { title: "今天吃什么", command: "今天早上吃什么", link: "/zhiling/yule/whateat", keywords: ["吃", "菜单", "今天吃什么", "喝什么"] },
  { title: "Roll 随机选择", command: "/roll", link: "/zhiling/yule/roll", keywords: ["随机", "roll", "抽", "选择", "选项"] },
  { title: "WordCloud", command: "/今日词云", link: "/zhiling/yule/ciyun", keywords: ["词云", "消息统计", "云"] },
  { title: "漂流瓶插件", command: "扔漂流瓶", link: "/zhiling/yule/bottle", keywords: ["漂流瓶", "瓶子", "寄"] },
  { title: "我的超能力", command: "我的超能力", link: "/zhiling/yule/mypower", keywords: ["超能力", "能力"] },
  { title: "为美好群聊献上爆炎", command: "爆裂魔法", link: "/zhiling/yule/megumin", keywords: ["爆裂", "魔法", "爆炎", "补魔"] },
  { title: "发病语录", command: "发病", link: "/zhiling/yule/fabing", keywords: ["发病", "语录"] },
  { title: "心灵鸡汤", command: "鸡汤", link: "/zhiling/yule/jitang", keywords: ["鸡汤", "毒鸡汤", "励志"] },
  { title: "一言", command: "/一言", link: "/zhiling/yule/yiyan", keywords: ["一言", "语录", "收藏"] },
  { title: "疯狂星期四", command: "疯狂星期四", link: "/zhiling/yule/KFCcrazythursdayvme50", keywords: ["疯狂", "星期四", "KFC", "肯德基", "v我50"] },
  { title: "表情包制作", command: "表情包制作", link: "/zhiling/yule/bqbmaker", keywords: ["表情包", "制作表情"] },
  { title: "答案之书", command: "答案之书", link: "/zhiling/yule/abook", keywords: ["答案", "答案之书", "占卜"] },
  { title: "综合搜图", command: "鉴赏帮助", link: "/zhiling/yule/image_collection", keywords: ["搜图", "找图", "图片", "鉴赏"] },
  { title: "ottohzys", command: "hzys", link: "/zhiling/yule/otto", keywords: ["otto", "语录", "哇袄", "动物园"] },
  { title: "Poke-Plugin", command: "#戳戳榜", link: "/zhiling/yule/Poke-Plugin", keywords: ["戳戳", "戳一戳", "poke", "被戳"] },
  { title: "恶臭数字论证器", command: "臭数字", link: "/zhiling/yule/homo", keywords: ["恶臭", "臭数字", "homo", "数字论证", "找规律", "lag"] },
  { title: "趣味占卜", command: "占卜列表", link: "/zhiling/yule/zhanbu", keywords: ["占卜", "人设", "少女", "中二", "魔法人生", "抽老婆", "转生"] },
  { title: "今日老婆", command: "今日老婆", link: "/zhiling/yule/todaywife", keywords: ["老婆", "今日老婆", "换老婆"] },
  { title: "今日猫娘", command: "今日猫娘", link: "/zhiling/yule/todaycatgirl", keywords: ["猫娘", "今日猫娘"] },
  { title: "表情包仓库", command: "表情包仓库", link: "/zhiling/yule/bqb", keywords: ["表情包", "仓库"] },
  { title: "抽象话等文本生成", command: "抽象话", link: "/zhiling/yule/cxh", keywords: ["抽象", "火星文", "蚂蚁文", "文字", "古文码", "拼音码", "符号码"] },
  { title: "蔚蓝档案对话图", command: "motalk", link: "/zhiling/yule/bamotalk", keywords: ["蔚蓝档案", "ba", "对话图", "motalk"] },
  { title: "ATRI语音包", command: "Atri真可爱", link: "/zhiling/yule/Atri", keywords: ["atri", "语音包", "语音"] },
  { title: "视奸jq", command: "jq在干什么", link: "/zhiling/yule/jq", keywords: ["jq", "视奸", "在干什么"] },
  { title: "齁语加密/解密", command: "齁语加密", link: "/zhiling/yule/oooo", keywords: ["齁语", "加密", "解密"] },
  { title: "emoji 合成器", command: "[emoji]+[emoji]", link: "/zhiling/yule/emoji", keywords: ["emoji", "合成", "表情合成"] },
  { title: "Steam 功能", command: "#steam帮助", link: "/zhiling/shiyong/steam", keywords: ["steam", "蒸汽", "游戏库存"] },
  { title: "视频链接解析", command: "bm", link: "/zhiling/shiyong/parser", keywords: ["解析", "视频", "链接", "b站", "bm"] },
  { title: "60s API 查询", command: "天气", link: "/zhiling/shiyong/60sapi", keywords: ["天气", "健康", "壁纸", "必应", "60s"] },
  { title: "多源日报", command: "日报", link: "/zhiling/shiyong/Multi-Source Daily", keywords: ["日报", "新闻", "每日"] },
  { title: "幻影坦克", command: "幻影坦克", link: "/zhiling/shiyong/miragetank", keywords: ["幻影坦克", "图片", "miragetank"] },
  { title: "金/油价查询", command: "金价", link: "/zhiling/shiyong/price", keywords: ["金价", "油价", "黄金", "价格"] },
  { title: "撤回插件", command: "撤回", link: "/zhiling/shiyong/withdraw", keywords: ["撤回", "撤"] },
  { title: "12306 列车时刻表查询", command: "train", link: "/zhiling/shiyong/train", keywords: ["火车", "列车", "12306", "车次", "时刻表"] },
  { title: "断连通知", command: "/掉线测试", link: "/zhiling/shiyong/disconnect", keywords: ["掉线", "断连", "通知", "上线"] },
  { title: "谁问你了？", command: "谁问我了", link: "/zhiling/shiyong/wsk", keywords: ["谁问", "谁问我", "wsk"] },
  { title: "图片背景消除", command: "/去背景", link: "/zhiling/shiyong/imga", keywords: ["去背景", "抠图", "去底", "rm_bg", "透明"] },
  { title: "音乐点歌", command: "点歌", link: "/zhiling/shiyong/music", keywords: ["点歌", "音乐", "网易云", "歌", "歌词", "电台", "语音"] },
  { title: "B站动态和微博动态订阅推送", command: "#订阅B站推送", link: "/zhiling/shiyong/bw", keywords: ["订阅", "推送", "b站", "微博", "动态", "优纪"] },
  { title: "不背单词", command: "不背单词", link: "/zhiling/shiyong/english", keywords: ["单词", "英语", "背单词"] },
  { title: "在线运行代码", command: "code", link: "/zhiling/shiyong/code", keywords: ["代码", "运行", "code", "编程", "执行"] },
  { title: "系统状态查询", command: "#状态", link: "/zhiling/shiyong/status", keywords: ["状态", "运行状态", "bot状态", "status"] },
  { title: "以图搜源", command: "#搜图", link: "/zhiling/shiyong/imgS", keywords: ["搜图", "以图搜", "图片来源", "找图"] },
  { title: "图片/漫画翻译插件", command: "图片翻译", link: "/zhiling/shiyong/imgts", keywords: ["翻译", "图片翻译", "漫画翻译"] },
  { title: "GitHub卡片", command: "https://github.com/用户名/仓库名", link: "/zhiling/shiyong/githubcard", keywords: ["github", "仓库", "卡片"] },
  { title: "CSGO", command: "#cs 开箱", link: "/zhiling/acg/CSGO", keywords: ["csgo", "cs", "开箱", "反恐"] },
  { title: "原神", command: "#面板帮助", link: "/zhiling/acg/genshin", keywords: ["原神", "genshin", "面板", "抽卡", "雷神", "黄历"] },
  { title: "崩坏：星穹铁道", command: "#星铁帮助", link: "/zhiling/acg/sr", keywords: ["星铁", "星穹", "崩坏"] },
  { title: "绝区零", command: "%绑定设备帮助", link: "/zhiling/acg/juequ0", keywords: ["绝区零", "zzz"] },
  { title: "蔚蓝档案", command: "ba帮助", link: "/zhiling/acg/ba", keywords: ["蔚蓝档案", "ba", "blue archive"] },
  { title: "明日方舟/终末地", command: "skland", link: "/zhiling/acg/ark", keywords: ["明日方舟", "方舟", "终末地", "抽卡", "森空岛", "skland"] },
  { title: "鸣潮", command: "~登录", link: "/zhiling/acg/mingchao", keywords: ["鸣潮", "体力", "卡片", "抽卡", "面板"] },
  { title: "光遇", command: "光遇菜单", link: "/zhiling/acg/guangyu", keywords: ["光遇", "sky"] },
  { title: "三角洲行动", command: "#三角洲帮助", link: "/zhiling/acg/DeltaForce", keywords: ["三角洲", "三角洲行动", "跑刀"] },
  { title: "战地", command: "bf help", link: "/zhiling/acg/bf", keywords: ["战地", "bf", "战绩"] },
  { title: "求生之路2", command: "l4d2帮助", link: "/zhiling/acg/l4d2", keywords: ["求生之路", "l4d2", "联机", "工坊"] },
  { title: "坦克世界", command: "wot帮助", link: "/zhiling/acg/wot", keywords: ["坦克世界", "wot", "坦克"] },
  { title: "战舰世界", command: "wws help", link: "/zhiling/acg/wws", keywords: ["战舰世界", "wws", "战舰"] },
  { title: "Phigros", command: "#p rks", link: "/zhiling/yinyou/pgr", keywords: ["phigros", "rks", "b30", "推分"] },
  { title: "osu!", command: "/osu info", link: "/zhiling/yinyou/osu", keywords: ["osu", "查分", "音游", "bp"] },
  { title: "maimaiDX", command: "更新b50", link: "/zhiling/yinyou/maimai", keywords: ["maimai", "b50", "水鱼", "机厅"] },
  { title: "dancecube", command: "/dc", link: "/zhiling/yinyou/dancecube", keywords: ["dancecube", "dc", "rt", "ap30"] },
  { title: "Beat Saber", command: "BS绑定", link: "/zhiling/yinyou/bs", keywords: ["beat saber", "bs", "查分", "ss", "bl"] },
  { title: "Arcaea表情包制作", command: "arc", link: "/zhiling/yinyou/arc/arc", keywords: ["arcaea", "arc", "表情包"] },
  { title: "pjsk表情包制作", command: "pjsk", link: "/zhiling/yinyou/pjsk/pjsk", keywords: ["pjsk", "表情包", "project sekai"] },
  { title: "Haruki Bot", command: "/绑定", link: "/zhiling/yinyou/pjsk/haruki", keywords: ["haruki", "pjsk", "查卡", "绑定", "组卡"] },
  { title: "Group Insight", command: "#群聊报告", link: "/zhiling/AI/GroupInsight", keywords: ["群聊报告", "报告", "词云", "艾特", "活跃度"] },
];

// 简易限流：单实例内按 IP 每分钟 10 次
const RATE_LIMIT: Record<string, { count: number; resetAt: number }> = {};
const RATE_MAX = 10;
const RATE_WINDOW = 60_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = RATE_LIMIT[ip];
  if (!rec || now > rec.resetAt) {
    RATE_LIMIT[ip] = { count: 1, resetAt: now + RATE_WINDOW };
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_MAX;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s,，。！？!?、;；:：'"“”‘’<>《》（）()\[\]{}]+/g, "");
}

// 规则引擎：关键词打分匹配
function ruleMatch(query: string): RouteEntry[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: Array<{ entry: RouteEntry; score: number }> = [];
  for (const entry of ROUTE_INDEX) {
    let score = 0;
    const cmd = normalize(entry.command);
    if (cmd === q) score += 100;
    if (cmd && cmd.includes(q) && q.length >= 2) score += 50;
    for (const kw of entry.keywords) {
      const k = normalize(kw);
      if (k && q.includes(k)) score += 30;
      if (k && k.includes(q) && q.length >= 2) score += 20;
    }
    if (normalize(entry.title).includes(q) && q.length >= 2) score += 25;
    if (score > 0) scored.push({ entry, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.entry);
}

// 把索引序列化为 LLM 提示词
function buildCatalog(): string {
  return ROUTE_INDEX.map(
    (e) => `${e.title}（指令：${e.command}；用途：${e.keywords.join("、")}；链接：${e.link}）`
  ).join("\n");
}

const SAMPLES = [
  { user: "我想看今天的运势", out: { reply: "运气这个我在行喵，拿去~", link: "/zhiling/yule/jrrp", title: "JRRP" } },
  { user: "群里谁最能水啊", out: { reply: "想知道谁最能水？看这个喵~", link: "/zhiling/AI/GroupInsight", title: "Group Insight" } },
  { user: "你是谁呀", out: { reply: "我是 neko 喵，这台文档站的看板娘~", link: "", title: "" } },
  { user: "今天心情不太好", out: { reply: "抱抱喵，要不要来碗鸡汤补一补？", link: "/zhiling/yule/jitang", title: "心灵鸡汤" } },
];

function buildSystemPrompt(): string {
  return [
    "你是「neko」，Neko 机器人文档站的看板娘，一只活泼的猫娘。",
    "用户会用自然语言说他想做什么，你负责在下面的指令目录里帮他找对应的群聊指令。",
    "",
    "【说话风格】",
    "reply 是你对用户说的话：轻快、口语化、简短，句尾带「喵」，像和群友闲聊的真人。不要客套、不要自我介绍式的长篇解释、不要复述用户的话。",
    "目录里有合适的指令，就用你的口吻告诉他找到了；没有合适的指令，或者用户只是闲聊，reply 就自然接话（可以调侃、反问、或直说没这个功能），此时 link 和 title 留空。",
    "reply 必须是单行、40 字以内的中文，不用 emoji。link 只能从目录里原样复制，禁止编造。",
    "",
    "【指令目录】",
    buildCatalog(),
    "",
    "【输出格式】",
    "只输出一个 JSON 对象，不要输出解释、不要用 markdown 代码块。字段固定为 reply、link、title。",
    "示例：",
    ...SAMPLES.map((sample) => `用户：${sample.user}\n输出：${JSON.stringify(sample.out)}`),
    "",
    '现在开始，只输出 JSON：{"reply": "...", "link": "...", "title": "..."}',
  ].join("\n");
}

function extractJson(text: string): { link?: string; title?: string; reply?: string } | null {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const candidates = [cleaned];
  const block = cleaned.match(/\{[\s\S]*\}/);
  if (block) candidates.push(block[0]);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") {
        return parsed as { link?: string; title?: string; reply?: string };
      }
    } catch {
      continue;
    }
  }
  return null;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

export const onRequestPost = async (context: {
  request: Request;
  env: Record<string, unknown>;
}) => {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const body = (await request.json()) as {
      query?: string;
      history?: Array<{ role?: string; text?: string }>;
    };
    const query = (body.query ?? "").trim();
    if (!query) {
      return new Response(JSON.stringify({ ok: false, error: "query 不能为空" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (query.length > 100) {
      return new Response(JSON.stringify({ ok: false, error: "query 过长" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ ok: false, error: "请求过于频繁，请稍后再试" }), {
        status: 429,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 1. 规则引擎
    const ruleHits = ruleMatch(query);
    if (ruleHits.length > 0) {
      return new Response(
        JSON.stringify({ ok: true, source: "rule", matches: ruleHits }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // 2. LLM 兜底（无 AI binding 时直接返回空）
    const ai = (env as { AI?: { run: (model: string, opts: Record<string, unknown>) => Promise<{ response?: string }> } }).AI;
    if (!ai) {
      return new Response(
        JSON.stringify({ ok: true, source: "none", matches: [] }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const history: Array<{ role: string; content: string }> = [];
    for (const item of body.history ?? []) {
      const text = typeof item?.text === "string" ? item.text.trim() : "";
      if (!text) continue;
      history.push({ role: item.role === "assistant" ? "assistant" : "user", content: text });
    }

    const result = await ai.run(AI_MODEL, {
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...history.slice(-6),
        { role: "user", content: query },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const parsed = extractJson(result.response ?? "");
    const reply = (parsed?.reply ?? "").replace(/\s+/g, " ").trim();
    // 用目录里的真实条目回填，既防止模型编造路径，也补全指令文本与提示
    const hit = parsed?.link ? ROUTE_INDEX.find((entry) => entry.link === parsed.link) : undefined;
    const matches = hit
      ? [{ title: hit.title, command: hit.command, link: hit.link, keywords: hit.keywords }]
      : [];

    return new Response(
      JSON.stringify({ ok: true, source: matches.length > 0 ? "ai" : "none", reply, matches }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Command route error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: "服务器开小差了，请稍后再试" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
};
