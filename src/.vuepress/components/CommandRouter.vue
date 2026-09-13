<template>
  <ClientOnly>
    <div class="neko-mask" :class="{ open }" @click.self="close">
      <div class="neko-modal" role="dialog" aria-modal="true" aria-label="问问neko">
        <div class="neko-modal-head">
          <div class="neko-head-ico" aria-hidden="true">
            <img src="/assets/image/neko.webp" alt="" />
          </div>
          <h2>问问neko</h2>
          <button
            v-if="messages.length > 1"
            type="button"
            class="neko-head-btn"
            title="清空聊天记录"
            @click="clearChat"
          >
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 7h16m-10 4v6m4-6v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
              />
            </svg>
          </button>
          <button type="button" class="neko-head-btn" title="关闭" @click="close">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18 6L6 18M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="neko-chat-wrap">
          <div ref="chatEl" class="neko-chat" @scroll="onScroll">
            <TransitionGroup name="neko-msg">
            <div
              v-for="(message, index) in messages"
              :key="message.id"
              class="neko-msg"
              :class="message.role"
              :data-time="message.time"
              :style="{ '--i': Math.min(index, LEAVE_MAX) }"
            >
              <template v-if="message.role === 'user'">
                <div class="neko-bubble">
                  <span class="neko-text">{{ message.text }}</span>
                </div>
                <div class="neko-avatar user" aria-hidden="true"></div>
              </template>
              <template v-else>
                <div class="neko-avatar neko" aria-hidden="true"></div>
                <div class="neko-bubble" :class="{ wide: !!message.results?.length }">
                  <span v-if="message.text" class="neko-text">{{ message.text }}</span>
                  <div v-if="message.results?.length" class="neko-cards">
                    <div
                      v-for="(item, index) in message.results"
                      :key="item.link + index"
                      class="neko-card"
                    >
                      <div class="neko-card-info">
                        <span class="neko-card-title">{{ item.title }}</span>
                        <span v-if="item.hint" class="neko-card-hint">{{ item.hint }}</span>
                      </div>
                      <div class="neko-card-foot">
                        <code v-if="item.command" class="neko-card-cmd">{{ item.command }}</code>
                        <button
                          v-if="item.command"
                          type="button"
                          class="cp-btn"
                          @click="copy(item.command)"
                        >
                          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                            <path
                              fill="currentColor"
                              d="M832 64H296c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h496v688c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V96c0-17.7-14.3-32-32-32zM704 192H192c-17.7 0-32 14.3-32 32v530.7c0 8.5 3.4 16.6 9.4 22.6l173.3 173.3c2.2 2.2 4.7 4 7.4 5.3v.1h.1c5.1 2.5 10.6 3.9 16.4 3.9h.4H704c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32zM350 856.6L263.4 770H350v86.6zM672 864H414V746c0-22.1-17.9-40-40-40H256V256h416v608z"
                            />
                          </svg>
                          复制
                        </button>
                        <a class="cp-btn" :href="item.link" @click.prevent="go(item.link)">
                          查看文档
                        </a>
                      </div>
                    </div>
                  </div>
                  <a
                    v-else-if="message.fallback"
                    class="cp-btn"
                    href="/zhiling/cheatsheet"
                    @click.prevent="go('/zhiling/cheatsheet')"
                  >
                    去指令速查页看看
                  </a>
                  <img
                    v-if="message.emote"
                    class="neko-emote"
                    :src="emoteUrl(message.emote)"
                    alt=""
                    loading="lazy"
                  />
                </div>
              </template>
            </div>

            </TransitionGroup>

            <div v-if="typing" class="neko-msg neko typing">
              <div class="neko-avatar neko" aria-hidden="true"></div>
              <div class="neko-bubble typing-bubble">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="neko-to-bottom"
            :class="{ show: showToBottom }"
            title="回到底部"
            @click="scrollToBottom"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 5v14m-7-7l7 7 7-7" />
            </svg>
          </button>
        </div>

        <div class="neko-panel">
          <input
            ref="inputEl"
            v-model="query"
            type="text"
            placeholder="例如：想查今天运势、怎么联机求生之路、帮我找首歌…"
            spellcheck="false"
            @keydown.enter="submit"
            @keydown.esc="close"
          />
          <button type="button" class="neko-act" :disabled="typing" @click="submit">发送</button>
        </div>

        <div class="neko-qq-footer">
          <div title="语音" @click="openTools">
            <svg viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M192 0C139 0 96 43 96 96V256c0 53 43 96 96 96s96-43 96-96V96c0-53-43-96-96-96zM64 216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 89.1 66.2 162.7 152 174.4V464H120c-13.3 0-24 10.7-24 24s10.7 24 24 24h72 72c13.3 0 24-10.7 24-24s-10.7-24-24-24H216V430.4c85.8-11.7 152-85.3 152-174.4V216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 70.7-57.3 128-128 128s-128-57.3-128-128V216z"
              />
            </svg>
          </div>
          <div title="图片" @click="openTools">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zM323.8 202.5c-4.5-6.6-11.9-10.5-19.8-10.5s-15.4 3.9-19.8 10.5l-87 127.6L170.7 297c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6h96 32H424c8.9 0 17.1-4.9 21.2-12.8s3.6-17.4-1.4-24.7l-120-176zM112 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"
              />
            </svg>
          </div>
          <div title="相机" @click="openTools">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"
              />
            </svg>
          </div>
          <div title="文件" @click="openTools">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V192c0-35.3-28.7-64-64-64H80c-8.8 0-16-7.2-16-16s7.2-16 16-16H448c17.7 0 32-14.3 32-32s-14.3-32-32-32H64zM416 272a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"
              />
            </svg>
          </div>
          <div title="表情" @click="openTools">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM164.1 325.5C182 346.2 212.6 368 256 368s74-21.8 91.9-42.5c5.8-6.7 15.9-7.4 22.6-1.6s7.4 15.9 1.6 22.6C349.8 372.1 311.1 400 256 400s-93.8-27.9-116.1-53.5c-5.8-6.7-5.1-16.8 1.6-22.6s16.8-5.1 22.6 1.6zM144.4 208a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm156.4 25.6c-5.3 7.1-15.3 8.5-22.4 3.2s-8.5-15.3-3.2-22.4c30.4-40.5 91.2-40.5 121.6 0c5.3 7.1 3.9 17.1-3.2 22.4s-17.1 3.9-22.4-3.2c-17.6-23.5-52.8-23.5-70.4 0z"
              />
            </svg>
          </div>
          <div title="更多" @click="openTools">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 344V280H168c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V168c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H280v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { commandCategories, hintFor, routeAliases } from "./commands-data";
import { copyText, showTip } from "./copy-utils";

interface RouteResult {
  title: string;
  command: string;
  link: string;
  hint: string;
}

interface ChatMessage {
  id: number;
  role: "user" | "neko";
  text: string;
  time: string;
  results?: RouteResult[];
  fallback?: boolean;
  emote?: string;
}

const OPEN_EVENT = "neko-open-router";
const TOOLS_URL = "https://tools.nekodayo.top/";
const GREETING = "你好喵~ 我是 neko！说说你想做什么，我来帮你找到对应的指令。";
const CLEAR_HINT = "真的要扔掉我们的聊天记录吗喵…neko 会想念它们的。再点一次垃圾桶就清空啦。";
const HIT_REPLIES = [
  "找到啦，看看这几个喵~",
  "喵！这几个应该对得上~",
  "翻到啦，拿去用吧喵~",
];
const MISS_REPLIES = [
  "没听懂喵，换个说法试试，也可以直接翻翻指令速查页~",
  "neko 没找到对应的指令喵，要不要去速查页翻翻？",
];
const BUSY = "neko 现在有点忙喵，稍后再试试吧~";
const STORAGE_KEY = "neko-chat-history";
const STORAGE_MAX = 40;
const STICK_THRESHOLD = 40;
const LEAVE_STEP = 26;
const LEAVE_DURATION = 220;
const LEAVE_MAX = 12;

// 情绪 → 表情包规则，顺序即优先级，命中首个即停
const EMOTE_RULES: Array<[RegExp, string]> = [
  [/(没听懂|没找到|没搜到|不明白|不懂|不清楚|抱歉|对不起|失败|出错|错误|没法|不行|没办法|想念|舍不得|难过|伤心|呜呜)/, "cry1"],
  [/(你好|您好|hello|hi|嗨|早上好|下午好|晚上好|打招呼)/, "greet1"],
  [/(成功|完成|搞定|找到|收藏|恭喜|祝贺|太好了|好耶|厉害|真棒|干得漂亮|做得好)/, "celebrate"],
  [/(稍等|等一下|稍后|慢一点|别急|有点忙)/, "sweat"],
  [/(加油|坚持|努力|冲鸭|冲冲冲)/, "cheer"],
  [/(魔法|施法|解析|处理中|抽取|翻找|召唤|变出来)/, "magic"],
  [/(吃瓜|看戏|围观|旁观|笑话)/, "popcorn"],
  [/(生气|气死|哼|恼火|讨厌|可恶)/, "angry"],
  [/(开心|哈哈|笑死|笑|嘻|♪)/, "laugh"],
  [/(惊讶|天哪|哇|吓|震惊|居然|竟然)/, "exclaim"],
  [/(笨蛋|傻|呆|懵)/, "daze1"],
  [/(摸摸|摸头|rua|拍拍)/, "pat"],
  [/(喜欢|爱你|亲亲|么么|抱抱|表白)/, "love1"],
  [/(害羞|不好意思|脸红)/, "shy1"],
  [/(晚安|睡觉|睡了|困了|好梦)/, "sleep"],
  [/(累了|疲倦|疲惫|心累|叹气)/, "work-tired"],
  [/(害怕|可怕|吓人|恐怖)/, "fear1"],
  [/(紧张|忐忑)/, "nervous1"],
  [/(头晕|晕了|绕晕)/, "dizzy"],
  [/(问号|不确定|存疑|疑惑|不知道|随便|都可以)/, "question"],
  [/(思考|想想|琢磨|研究一下)/, "think"],
  [/(点头|收到|没问题)/, "nod"],
  [/(摇头|拒绝|不要啦)/, "shake"],
  [/(红包|充值|赞助|打赏|付费|钱)/, "money"],
  [/(礼物|送你|赠送)/, "gift1"],
  [/(蛋糕|生日)/, "cake"],
  [/(玫瑰|花花|鲜花)/, "rose"],
  [/(干杯|喝酒|敬你|碰杯)/, "cheers"],
  [/(唱歌|来一首|唱首|唱个)/, "sing"],
  [/(好饿|想吃|好吃|馋|恰饭)/, "hungry-fork"],
  [/(跳舞|蹦迪|舞蹈)/, "dance1"],
  [/(六六七七|六七)/, "sixseven"],
];

// 情绪 id → R2 图床原始文件名，未登记的 id 不渲染图片
const EMOTE_FILES: Record<string, string> = {
  cry1: "neko_哭 1.gif",
  greet1: "neko_打招呼 1.gif",
  celebrate: "neko_庆祝.gif",
  sweat: "neko_汗.gif",
  cheer: "neko_加油.gif",
  magic: "neko_魔法.gif",
  popcorn: "neko_吃(爆米花).gif",
  angry: "neko_生气.gif",
  laugh: "neko_笑.gif",
  exclaim: "neko_叹号.gif",
  daze1: "neko_呆 1.gif",
  pat: "neko_摸头.gif",
  love1: "neko_爱心 1.gif",
  shy1: "neko_害羞 1.gif",
  sleep: "neko_睡觉(普通).gif",
  "work-tired": "neko_工作(疲倦).gif",
  fear1: "neko_害怕 1.gif",
  nervous1: "neko_紧张 1.gif",
  dizzy: "neko_头晕.gif",
  question: "neko_问号.gif",
  think: "neko_思考（认真地）.gif",
  nod: "neko_点头.gif",
  shake: "neko_摇头.gif",
  money: "neko_钱.gif",
  gift1: "neko_礼物 1.gif",
  cake: "neko_蛋糕.gif",
  rose: "neko_玫瑰.gif",
  cheers: "neko_干杯.gif",
  sing: "neko_唱歌.gif",
  "hungry-fork": "neko_馋(刀叉).gif",
  dance1: "neko_跳舞 1.gif",
  sixseven: "neko_六七.gif",
};

const EMOTE_BASE = "https://drive.nekodayo.top/raw/assets/nekodocs/neko%E8%A1%A8%E6%83%85%E5%8C%85/";

function emoteUrl(id: string): string {
  const file = EMOTE_FILES[id];
  return file ? EMOTE_BASE + encodeURI(file) : "";
}

const open = ref(false);
const query = ref("");
const messages = ref<ChatMessage[]>([]);
const typing = ref(false);
const clearArmed = ref(false);
const showToBottom = ref(false);
const chatEl = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const router = useRouter();

let messageId = 0;
let clearTimer: number | undefined;

function fmtTime(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s,，。！？!?、;；:：'"“”‘’<>《》（）()\[\]{}]+/g, "");
}

// 本地规则匹配：复用速查页数据，命中即展示，无需请求后端
function localMatch(raw: string): RouteResult[] {
  const q = normalize(raw);
  if (!q) return [];
  const scored: Array<{ result: RouteResult; score: number }> = [];
  for (const category of commandCategories) {
    for (const item of category.items) {
      const mainHint = hintFor(item.title, item.command);
      let score = 0;
      const mainCmd = normalize(item.command);
      if (mainCmd === q) score += 100;
      if (mainCmd && mainCmd.includes(q) && q.length >= 2) score += 50;
      if (item.commands.some((c) => normalize(c) === q)) score += 60;
      if (item.commands.some((c) => normalize(c).includes(q) && q.length >= 2)) score += 40;
      if (normalize(item.title).includes(q) && q.length >= 2) score += 30;
      if (mainHint && (q.includes(normalize(mainHint)) || normalize(mainHint).includes(q))) score += 35;
      const alias = routeAliases[item.link] ?? [];
      for (const keyword of alias) {
        const k = normalize(keyword);
        if (!k) continue;
        if (q.includes(k)) score += 30;
        if (k.includes(q) && q.length >= 2) score += 20;
      }
      if (score > 0) {
        scored.push({
          result: { title: item.title, command: item.command, link: item.link, hint: mainHint },
          score,
        });
      }
    }
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((entry) => entry.result);
}

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)] ?? list[0] ?? "";
}

function emoteForText(text: string): string | undefined {
  return EMOTE_RULES.find(([pattern]) => pattern.test(text))?.[1];
}

function historyPayload(): Array<{ role: string; text: string }> {
  return messages.value.slice(-6).map((message) => ({
    role: message.role === "neko" ? "assistant" : "user",
    text: message.results?.length
      ? `${message.text}（推荐：${message.results.map((item) => item.title).join("、")}）`
      : message.text,
  }));
}

function isNearBottom(): boolean {
  const box = chatEl.value;
  if (!box) return true;
  return box.scrollHeight - box.scrollTop - box.clientHeight < STICK_THRESHOLD;
}

function scrollToBottom(): void {
  const box = chatEl.value;
  if (!box) return;
  box.scrollTop = box.scrollHeight;
  showToBottom.value = false;
}

function onScroll(): void {
  showToBottom.value = !isNearBottom();
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (message) =>
        !!message &&
        typeof message.id === "number" &&
        typeof message.text === "string" &&
        (message.role === "user" || message.role === "neko"),
    );
  } catch {
    return [];
  }
}

function saveMessages(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value.slice(-STORAGE_MAX)));
  } catch {
    return;
  }
}

function restoreMessages(): void {
  if (messages.value.length > 0) return;
  messages.value = loadMessages();
  messageId = messages.value.reduce((max, message) => Math.max(max, message.id), 0);
}

function pushMessage(payload: Omit<ChatMessage, "id" | "time">): void {
  const stick = isNearBottom();
  const emote = payload.emote ?? (payload.role === "neko" ? emoteForText(payload.text) : undefined);
  messages.value.push({ ...payload, emote, id: ++messageId, time: fmtTime(new Date()) });
  saveMessages();
  nextTick(() => {
    if (stick) scrollToBottom();
    else showToBottom.value = true;
  });
}

async function submit(): Promise<void> {
  const raw = query.value.trim();
  if (!raw || typing.value) return;

  const history = historyPayload();
  pushMessage({ role: "user", text: raw });
  query.value = "";

  typing.value = true;
  nextTick(scrollToBottom);

  try {
    const resp = await fetch("/api/command-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: raw, history }),
    });
    if (!resp.ok) throw new Error(String(resp.status));
    const data = (await resp.json()) as {
      ok: boolean;
      reply?: string;
      matches?: Array<{ title: string; command?: string; link: string; keywords?: string[] }>;
    };
    const reply = (data.reply ?? "").trim();
    const results: RouteResult[] = (data.matches ?? []).map((match) => ({
      title: match.title,
      command: match.command ?? "",
      link: match.link,
      hint: (match.keywords ?? []).slice(0, 3).join("、"),
    }));
    typing.value = false;
    if (results.length > 0) pushMessage({ role: "neko", text: reply || pick(HIT_REPLIES), results });
    else pushMessage({ role: "neko", text: reply || pick(MISS_REPLIES), fallback: true });
  } catch {
    typing.value = false;
    // 接口挂了也不能让指令查不了，退回本地粗匹配结果
    const local = localMatch(raw);
    if (local.length > 0) pushMessage({ role: "neko", text: pick(HIT_REPLIES), results: local });
    else pushMessage({ role: "neko", text: BUSY, fallback: true });
  }
}

function copy(command: string): void {
  copyText(command)
    .then(() => showTip("已复制，快去群里发送吧"))
    .catch(() => showTip("复制失败"));
}

function go(link: string): void {
  close();
  nextTick(() => router.push(link));
}

function openTools(): void {
  window.open(TOOLS_URL, "_blank", "noopener");
}

function clearChat(): void {
  if (typing.value) return;

  if (!clearArmed.value) {
    clearArmed.value = true;
    pushMessage({ role: "neko", text: CLEAR_HINT });
    window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => {
      clearArmed.value = false;
    }, 4000);
    return;
  }

  clearArmed.value = false;
  window.clearTimeout(clearTimer);
  const removed = messages.value.length;
  messages.value = [];
  saveMessages();

  window.setTimeout(() => {
    messageId = 0;
    pushMessage({ role: "neko", text: GREETING });
  }, Math.min(removed - 1, LEAVE_MAX) * LEAVE_STEP + LEAVE_DURATION);
}

function openRouter(): void {
  open.value = true;
  query.value = "";
  typing.value = false;
  clearArmed.value = false;
  window.clearTimeout(clearTimer);
  restoreMessages();
  if (messages.value.length === 0) pushMessage({ role: "neko", text: GREETING });
  nextTick(() => {
    scrollToBottom();
    inputEl.value?.focus();
  });
}

function close(): void {
  open.value = false;
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openRouter();
  }
  if (event.key === "Escape" && open.value) close();
}

onMounted(() => {
  restoreMessages();
  window.addEventListener("keydown", onKeydown);
  window.addEventListener(OPEN_EVENT, openRouter);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener(OPEN_EVENT, openRouter);
  window.clearTimeout(clearTimer);
});
</script>

<style scoped>
.neko-mask {
  --card: var(--vp-c-bg, #fff);
  --sub: var(--vp-c-text-mute, #7a8699);
  --line: var(--vp-c-border, #e6ebf1);
  --brand: var(--vp-c-accent, #096dd9);
  --brand-light: var(--vp-c-accent-hover, #2196f3);
  --bg-soft: var(--vp-c-bg-soft, #f4f8fd);
  --shadow-hover: 0 8px 24px rgba(9, 109, 217, 0.16);
  display: flex;
  position: fixed;
  inset: 0;
  z-index: 9999;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease-out, visibility 0.2s;
}

.neko-mask.open {
  opacity: 1;
  visibility: visible;
}

.neko-modal {
  width: 100%;
  max-width: 600px;
  max-height: 86vh;
  max-height: 86dvh;
  overflow-y: auto;
  background: var(--card);
  border: 2px solid #f9bdeb;
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(249, 189, 235, 0.3);
  opacity: 0;
  transform: scale(0.92) translateY(10px);
  transition: opacity 0.2s var(--ease-out), transform 0.28s var(--ease-out);
}

.neko-mask.open .neko-modal {
  opacity: 1;
  transform: none;
  animation: modal-pop 0.28s var(--ease-out);
}

@keyframes modal-pop {
  0% {
    transform: scale(0.92) translateY(10px);
  }
  70% {
    transform: scale(1.015) translateY(-2px);
  }
  100% {
    transform: none;
  }
}

.neko-modal-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 20px;
  background: linear-gradient(135deg, #f9bdeb 0%, #c5d8f8 100%);
}

.neko-modal-head h2 {
  margin: 0 auto 0 0;
  min-width: 0;
  overflow: hidden;
  font-size: 19px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.neko-head-ico {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.28);
}

.neko-head-ico img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.neko-head-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #fff;
  cursor: pointer;
  opacity: 0.85;
  transition: opacity 0.25s, background 0.25s;
}

.neko-head-btn svg {
  width: 20px;
  height: 20px;
}

.neko-head-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.18);
}

.neko-chat-wrap {
  position: relative;
}

.neko-chat-wrap::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  background: url("/assets/image/neko17.png") 50% center / cover no-repeat;
  filter: blur(6px);
  opacity: 0.3;
}

.neko-chat {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 200px;
  max-height: 46vh;
  padding: 20px;
  overflow-y: auto;
  color: #333;
}

.neko-to-bottom {
  position: absolute;
  right: 16px;
  bottom: 14px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: var(--card);
  color: var(--brand);
  box-shadow: var(--shadow-hover);
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transform: translateY(6px);
  transition: opacity 0.18s ease-out, visibility 0.18s, transform 0.18s var(--ease-out);
}

.neko-to-bottom.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.neko-to-bottom svg {
  width: 18px;
  height: 18px;
}

.neko-msg {
  position: relative;
  display: flex;
  animation: msg-in 0.18s var(--ease-out) both;
}

.neko-msg.user {
  justify-content: flex-end;
}

.neko-msg.neko {
  animation-delay: 0.25s;
}

@keyframes msg-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.neko-msg-leave-active {
  animation: none;
  transition: opacity 0.22s var(--ease-out), transform 0.22s var(--ease-out);
  transition-delay: calc(var(--i, 0) * 26ms);
}

.neko-msg-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.9);
}

.neko-avatar {
  flex: none;
  width: 42px;
  height: 42px;
  margin: 0 10px;
  border: 2px solid #fff;
  border-radius: 50%;
  background-color: #f0e6f6;
  background-position: 50% center;
  background-size: cover;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: avatar-pop 0.25s var(--ease-out) both;
}

.neko-avatar.neko {
  background-image: url("/assets/image/neko.webp");
}

.neko-avatar.user {
  background-image: url("/assets/image/neko11.jpg");
}

@keyframes avatar-pop {
  0% {
    transform: scale(0.5);
  }
  70% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}

.neko-bubble {
  position: relative;
  max-width: 65%;
  padding: 12px 16px;
  border-radius: 18px;
  background: #fff;
  color: #000;
  font-size: 13.5px;
  line-height: 1.6;
  word-break: break-word;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.neko-bubble.wide {
  max-width: 82%;
}

.neko-text {
  white-space: pre-wrap;
}

.neko-emote {
  display: block;
  width: 120px;
  height: auto;
  margin-top: 8px;
  border-radius: 8px;
}

.neko-msg.neko .neko-bubble::before {
  content: "";
  position: absolute;
  left: -6px;
  top: 12px;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 6px 6px 6px 0;
  border-color: transparent #fff transparent transparent;
}

.neko-msg.user .neko-bubble::before {
  content: "";
  position: absolute;
  right: -6px;
  top: 12px;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 6px 0 6px 6px;
  border-color: transparent transparent transparent #fff;
}

.typing-bubble {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 14px 16px;
}

.neko-msg.typing {
  animation: none;
}

.typing-bubble span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--sub);
  animation: dot-bounce 1s ease-in-out infinite;
}

.typing-bubble span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-bubble span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes dot-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

.neko-msg::after {
  content: attr(data-time);
  position: absolute;
  bottom: -2px;
  font-size: 10px;
  color: var(--sub);
  opacity: 0;
  pointer-events: none;
  white-space: nowrap;
  transition: opacity 0.15s ease-out;
}

.neko-msg.user::after {
  right: 54px;
}

.neko-msg.neko::after {
  left: 54px;
}

.neko-msg:hover::after {
  opacity: 0.7;
}

.neko-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.neko-card {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--bg-soft);
}

.neko-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.neko-card-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--brand);
}

.neko-card-hint {
  font-size: 12px;
  color: var(--sub);
}

.neko-card-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.neko-card-cmd {
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(127, 176, 255, 0.18);
  color: var(--brand);
  font-family: inherit;
  font-size: 12px;
  word-break: break-all;
}

.cp-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: transparent;
  color: var(--sub);
  font-family: inherit;
  font-size: 11px;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.15s var(--ease-out);
}

.cp-btn svg {
  width: 12px;
  height: 12px;
}

.cp-btn:hover {
  background: var(--bg-soft);
  color: var(--brand);
  border-color: var(--brand-light);
}

.cp-btn:active {
  transform: scale(0.96);
}

.neko-panel {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 2;
  padding: 5px;
  background: #fbe4f8;
}

.neko-panel input {
  flex: 1;
  min-width: 0;
  height: 45px;
  margin: 0 5px 0 0;
  padding: 10px;
  border: 1px solid #3abff8;
  border-radius: 5px;
  background: var(--vp-c-bg, #fff);
  color: var(--vp-c-text, #2c3e50);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.25s;
}

.neko-act {
  flex: none;
  height: 45px;
  padding: 0 15px;
  border: 0;
  border-radius: 5px;
  background: #3abff8;
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 0 #2da8e0;
  transition: filter 0.2s, transform 0.15s var(--ease-out), box-shadow 0.15s var(--ease-out);
}

.neko-act:hover {
  filter: brightness(1.1);
}

.neko-act:active {
  transform: translateY(4px);
  box-shadow: 0 0 0 #2da8e0;
}

.neko-act:disabled {
  opacity: 0.6;
  cursor: default;
}

.neko-qq-footer {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  align-items: center;
  padding: 0.5rem 0;
  border-top: 1px solid rgba(249, 189, 235, 0.2);
  background: #f7e4fb;
  color: #b0a4c0;
  text-align: center;
}

.neko-qq-footer > div {
  cursor: pointer;
  transition: all 0.3s;
}

.neko-qq-footer > div:hover {
  color: #f9bdeb;
  transform: scale(1.1);
}

.neko-qq-footer svg {
  display: block;
  width: 22px;
  height: 22px;
  margin: 0 auto;
}

:global(html.dark) .neko-modal {
  border-color: #e8d5f8;
  box-shadow: 0 8px 24px rgba(232, 213, 248, 0.4);
}

:global(html.dark) .neko-modal-head {
  background: linear-gradient(135deg, #d4a5f5 0%, #9ab8e8 100%);
}

:global(html.dark) .neko-chat-wrap::before {
  opacity: 0.12;
}

:global(html.dark) .neko-chat {
  color: #ccc;
}

:global(html.dark) .neko-bubble {
  background: rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
}

:global(html.dark) .neko-msg.neko .neko-bubble::before {
  border-color: transparent rgba(255, 255, 255, 0.1) transparent transparent;
}

:global(html.dark) .neko-msg.user .neko-bubble::before {
  border-color: transparent transparent transparent rgba(255, 255, 255, 0.1);
}

:global(html.dark) .neko-panel {
  background: rgba(247, 228, 251, 0.1);
}

:global(html.dark) .neko-panel input {
  background: rgba(255, 255, 255, 0.05);
  border-color: #9ab8e8;
  color: #e0e0e0;
}

:global(html.dark) .neko-qq-footer {
  background: rgba(247, 228, 251, 0.1);
  border-top-color: rgba(249, 189, 235, 0.3);
}

@media (max-width: 780px) {
  .neko-mask {
    padding: 0;
    background: var(--vp-c-bg, #fff);
    backdrop-filter: none;
  }

  .neko-modal {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: none;
    height: 100%;
    max-height: none;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .neko-modal-head {
    position: sticky;
    top: 0;
    z-index: 5;
    flex: none;
  }

  .neko-chat-wrap {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .neko-chat {
    height: 100%;
    min-height: 0;
    max-height: none;
  }

  .neko-panel {
    flex: none;
  }

  .neko-qq-footer {
    padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .neko-modal {
    transform: none;
  }

  .neko-mask.open .neko-modal {
    animation: none;
  }

  .neko-msg,
  .neko-avatar {
    animation: none;
  }

  .typing-bubble span {
    animation: none;
    opacity: 0.6;
  }

  .neko-head-btn,
  .neko-to-bottom,
  .neko-qq-footer > div {
    transition: none;
  }

  .neko-act:active,
  .cp-btn:active {
    transform: none;
  }
}
</style>
