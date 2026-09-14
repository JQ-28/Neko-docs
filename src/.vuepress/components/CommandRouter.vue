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
                  <img
                    v-if="message.image"
                    class="bababoi-img"
                    :src="message.image"
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
            :maxlength="QUERY_MAX_LENGTH"
            spellcheck="false"
            @keydown.enter="submit"
            @keydown.esc="close"
          />
          <button type="button" class="neko-act" :disabled="typing" @click="submit">发送</button>
        </div>

        <div class="neko-qq-footer">
          <div
            title="语音输入"
            role="button"
            :aria-label="listening ? '正在聆听，点按结束' : '语音输入'"
            :class="{ 'is-listening': listening }"
            @click="startVoice"
          >
            <svg viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M192 0C139 0 96 43 96 96V256c0 53 43 96 96 96s96-43 96-96V96c0-53-43-96-96-96zM64 216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 89.1 66.2 162.7 152 174.4V464H120c-13.3 0-24 10.7-24 24s10.7 24 24 24h72 72c13.3 0 24-10.7 24-24s-10.7-24-24-24H216V430.4c85.8-11.7 152-85.3 152-174.4V216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 70.7-57.3 128-128 128s-128-57.3-128-128V216z"
              />
            </svg>
          </div>
          <div title="以图搜源" role="button" aria-label="以图搜源" @click="go('/zhiling/shiyong/imgS')">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zM323.8 202.5c-4.5-6.6-11.9-10.5-19.8-10.5s-15.4 3.9-19.8 10.5l-87 127.6L170.7 297c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6h96 32H424c8.9 0 17.1-4.9 21.2-12.8s3.6-17.4-1.4-24.7l-120-176zM112 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"
              />
            </svg>
          </div>
          <div title="图片背景消除" role="button" aria-label="图片背景消除" @click="go('/zhiling/shiyong/imga')">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"
              />
            </svg>
          </div>
          <div title="在线运行代码" role="button" aria-label="在线运行代码" @click="go('/zhiling/shiyong/code')">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V192c0-35.3-28.7-64-64-64H80c-8.8 0-16-7.2-16-16s7.2-16 16-16H448c17.7 0 32-14.3 32-32s-14.3-32-32-32H64zM416 272a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"
              />
            </svg>
          </div>
          <div title="表情包制作" role="button" aria-label="表情包制作" @click="go('/zhiling/yule/bqbmaker')">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM164.1 325.5C182 346.2 212.6 368 256 368s74-21.8 91.9-42.5c5.8-6.7 15.9-7.4 22.6-1.6s7.4 15.9 1.6 22.6C349.8 372.1 311.1 400 256 400s-93.8-27.9-116.1-53.5c-5.8-6.7-5.1-16.8 1.6-22.6s16.8-5.1 22.6 1.6zM144.4 208a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm156.4 25.6c-5.3 7.1-15.3 8.5-22.4 3.2s-8.5-15.3-3.2-22.4c30.4-40.5 91.2-40.5 121.6 0c5.3 7.1 3.9 17.1-3.2 22.4s-17.1 3.9-22.4-3.2c-17.6-23.5-52.8-23.5-70.4 0z"
              />
            </svg>
          </div>
          <div title="更多功能" role="button" aria-label="更多功能" @click="openTools">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 344V280H168c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V168c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H280v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"
              />
            </svg>
          </div>
        </div>
      </div>

      <Transition name="neko-voice-hint">
        <div v-if="listening" class="neko-voice-hint">
          <button
            type="button"
            class="neko-voice-orb"
            title="点一下结束语音"
            aria-label="正在聆听，点按结束"
            @click="stopVoice(true)"
          >
            <span class="neko-voice-ring"></span>
            <span class="neko-voice-ring neko-voice-ring--slow"></span>
            <span class="neko-voice-ico">
              <svg viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient id="neko-voice-gradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#ff9ec8" />
                    <stop offset="1" stop-color="#7cc4ff" />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#neko-voice-gradient)"
                  d="M192 0C139 0 96 43 96 96V256c0 53 43 96 96 96s96-43 96-96V96c0-53-43-96-96-96zM64 216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 89.1 66.2 162.7 152 174.4V464H120c-13.3 0-24 10.7-24 24s10.7 24 24 24h72 72c13.3 0 24-10.7 24-24s-10.7-24-24-24H216V430.4c85.8-11.7 152-85.3 152-174.4V216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 70.7-57.3 128-128 128s-128-57.3-128-128V216z"
                />
              </svg>
            </span>
          </button>
          <p class="neko-voice-text"><span>正在聆听…</span></p>
        </div>
      </Transition>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { commandCategories, hintFor } from "../../../functions/_shared/command-catalog";
import { copyText, showTip } from "./copy-utils";
import { markEgg } from "./egg-utils";
import {
  BABABOI_LINES,
  BABABOI_TEST,
  DIALOG_EGGS,
  EMOTE_BASE,
  EMOTE_FALLBACK,
  EMOTE_FILES,
  EMOTE_RULES,
  LONG_TEXT_LINES,
  LONG_TEXT_MAX,
  NEKO_BUSY_LINE,
  NEKO_HIT_LINES,
  NEKO_MISS_LINES,
  NIGHT_GREET_TEST,
  STILL_HERE_LINES,
  STILL_HERE_TEST,
} from "./neko-shared-chat";

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
  emote?: string | null;
  image?: string;
}

const OPEN_EVENT = "neko-open-router";
const TOOLS_URL = "https://tools.nekodayo.top/";
const GREETING = "你好喵~ 我是 neko！说说你想做什么，我来帮你找到对应的指令。";
const CLEAR_HINT = "真的要扔掉我们的聊天记录吗喵…neko 会想念它们的。再点一次垃圾桶就清空啦。";
const STORAGE_KEY = "neko-chat-history";
const STORAGE_MAX = 40;
const STICK_THRESHOLD = 40;
const LEAVE_STEP = 26;
const LEAVE_DURATION = 220;
const LEAVE_MAX = 12;
const QUERY_MAX_LENGTH = 50;
const ROUTE_TIMEOUT_MS = 10_000;

const emoteRules = EMOTE_RULES as Array<[RegExp, string]>;
const emoteFiles = EMOTE_FILES as Record<string, string>;
const emoteFallback = EMOTE_FALLBACK as Record<string, string>;

function emoteUrl(id: string): string {
  const file = emoteFiles[id];
  if (file) return EMOTE_BASE + encodeURI(file);
  return emoteFallback[id] ?? "";
}

const open = ref(false);
const query = ref("");
const messages = ref<ChatMessage[]>([]);
const typing = ref(false);
const clearArmed = ref(false);
const showToBottom = ref(false);
const chatEl = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const listening = ref(false);
const transcribing = ref(false);
const router = useRouter();

let messageId = 0;
let clearTimer: number | undefined;
let greetingTimer: number | undefined;
let routeAbort: AbortController | undefined;
const eggTimers: number[] = [];
let voiceTimeout: number | undefined;
let voiceSilenceTimer: number | undefined;
let voiceFinal = "";
let voiceInterim = "";
let recognition: SpeechRecognition | null = null;
let voiceMode: "speech" | "record" | null = null;
let recorder: MediaRecorder | null = null;
let recordStream: MediaStream | null = null;
let recordChunks: Blob[] = [];
let recordTimer: number | undefined;
let recordSegmentTimer: number | undefined;
let recordSegmentIndex = 0;
let recordDrain: Promise<void> = Promise.resolve();
let recordQueue: Blob[] = [];
let recordText = "";
let recordActive = false;
let recordFailed = false;
let pendingRecordSubmit = false;

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

// 本地规则匹配：直接读指令目录真源，命中即展示，无需请求后端
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
      const alias = item.keywords;
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

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)] ?? list[0];
}

function emoteForText(text: string): string | undefined {
  return emoteRules.find(([pattern]) => pattern.test(text))?.[1];
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
  const emote = payload.emote !== undefined
    ? payload.emote
    : payload.role === "neko"
      ? emoteForText(payload.text)
      : undefined;
  messages.value.push({ ...payload, emote, id: ++messageId, time: fmtTime(new Date()) });
  saveMessages();
  nextTick(() => {
    if (stick) scrollToBottom();
    else showToBottom.value = true;
  });
}

interface DialogEgg {
  egg?: string;
  test: RegExp;
  replies: string[];
  emote?: string;
}

const BABABOI_IMG = "https://tools.nekodayo.top/images/bababoi.jpg";
const BABABOI_AUDIO = "https://tools.nekodayo.top/images/bababoi.mp3";

const dialogEggs = DIALOG_EGGS as DialogEgg[];

function scheduleEgg(fn: () => void, delay: number): void {
  const id = window.setTimeout(() => {
    const index = eggTimers.indexOf(id);
    if (index >= 0) eggTimers.splice(index, 1);
    fn();
  }, delay);
  eggTimers.push(id);
}

// 所有可输入文本的聊天框都能触发对话彩蛋：命中就地回复并返回 true，本轮不再走指令路由
function tryDialogEgg(raw: string): boolean {
  if (raw.length > LONG_TEXT_MAX) {
    pushMessage({ role: "user", text: `${raw.slice(0, 120)}…（${raw.length} 字）` });
    markEgg("longText");
    pushMessage({ role: "neko", text: pick(LONG_TEXT_LINES), emote: "daze" });
    return true;
  }
  if (BABABOI_TEST.test(raw)) {
    pushMessage({ role: "user", text: raw });
    pushMessage({ role: "neko", text: pick(BABABOI_LINES), emote: null });
    pushMessage({ role: "neko", text: "", emote: null, image: BABABOI_IMG });
    const audio = new Audio(BABABOI_AUDIO);
    scheduleEgg(() => {
      audio.play().catch(() => undefined);
    }, 2000);
    markEgg("bababoi");
    return true;
  }
  if (STILL_HERE_TEST.test(raw)) {
    pushMessage({ role: "user", text: raw });
    const [first, second] = pick(STILL_HERE_LINES);
    pushMessage({ role: "neko", text: first, emote: "question" });
    scheduleEgg(() => pushMessage({ role: "neko", text: second, emote: null }), 2000);
    markEgg("stillHere");
    return true;
  }
  const hit = dialogEggs.find((item) => item.test.test(raw));
  if (!hit) return false;
  pushMessage({ role: "user", text: raw });
  if (hit.egg) markEgg(hit.egg);
  pushMessage({ role: "neko", text: pick(hit.replies), emote: hit.emote ?? null });
  if (NIGHT_GREET_TEST.test(raw) && new Date().getHours() < 5) markEgg("nightGreet");
  return true;
}

async function submit(): Promise<void> {
  const raw = query.value.trim();
  if (!raw || typing.value) return;
  if (raw.length > QUERY_MAX_LENGTH) {
    pushMessage({ role: "neko", text: `说太长啦，${QUERY_MAX_LENGTH} 个字以内 neko 才听得明白喵~` });
    return;
  }

  if (tryDialogEgg(raw)) {
    query.value = "";
    return;
  }

  const history = historyPayload();
  pushMessage({ role: "user", text: raw });
  query.value = "";
  typing.value = true;
  nextTick(scrollToBottom);

  const controller = new AbortController();
  routeAbort = controller;
  // 后端长时间不回包时主动断开，否则 typing 卡住会让发送键一直禁用
  let timedOut = false;
  const timeoutTimer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ROUTE_TIMEOUT_MS);

  try {
    const resp = await fetch("/api/command-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: raw, history }),
      signal: controller.signal,
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
    if (results.length > 0) pushMessage({ role: "neko", text: reply || pick(NEKO_HIT_LINES), results });
    else pushMessage({ role: "neko", text: reply || pick(NEKO_MISS_LINES), fallback: true });
  } catch {
    if (controller.signal.aborted && !timedOut) return;
    typing.value = false;
    // 后端不可用时退回本地匹配，至少还能给出指令卡片
    const local = localMatch(raw);
    if (local.length > 0) pushMessage({ role: "neko", text: pick(NEKO_HIT_LINES), results: local });
    else pushMessage({ role: "neko", text: NEKO_BUSY_LINE, fallback: true });
  } finally {
    window.clearTimeout(timeoutTimer);
    if (routeAbort === controller) routeAbort = undefined;
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

// 语音输入：电脑走 Web Speech 边说边出字，手机走录音上传转写
const VOICE_SILENCE_MS = 1600;
const VOICE_RECORD_MAX_MS = 30_000;
const VOICE_SEGMENT_MS = 4000;
// 第一段短一点，开口后很快就能看到字，确认已经在录了
const VOICE_FIRST_SEGMENT_MS = 2000;
const ASR_ENDPOINT = "/api/asr";
const RECORD_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function voiceTranscript(): string {
  return `${voiceFinal}${voiceInterim}`.trim();
}

function resetVoiceText(): void {
  voiceFinal = "";
  voiceInterim = "";
}

// 每次拿到识别结果都重置计时：说完停住一会儿就自动发出去
function scheduleVoiceSubmit(): void {
  window.clearTimeout(voiceSilenceTimer);
  voiceSilenceTimer = window.setTimeout(() => {
    if (voiceTranscript()) stopVoice(true);
  }, VOICE_SILENCE_MS);
}

function startVoice(): void {
  // 取消优先：无论是否在等待回复，正在聆听就停止（此分支不受 typing 限制）
  if (listening.value) {
    stopVoice(true);
    return;
  }
  // voiceMode 还是 record 说明正在等麦克风授权，别重复弹窗
  if (typing.value || transcribing.value || voiceMode === "record") return;

  const SpeechCtor =
    window.SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition })
      .webkitSpeechRecognition;
  // 触屏设备（微信/QQ 内置浏览器、安卓 WebView、iOS Safari）里 Web Speech 基本不出字，直接走录音转写
  if (!SpeechCtor || window.matchMedia("(pointer: coarse)").matches) {
    startRecording();
    return;
  }
  startSpeech(SpeechCtor);
}

function startSpeech(SpeechCtor: typeof SpeechRecognition): void {
  // SpeechRecognition 实例 start 后不可复用，每次重新创建，避免二次 start 抛 InvalidStateError
  const current = new SpeechCtor();
  recognition = current;
  voiceMode = "speech";
  resetVoiceText();
  current.lang = "zh-CN";
  // 连续识别 + 显示中间结果：说话过程中就能看到字，而不是等到最后一片空白
  current.continuous = true;
  current.interimResults = true;
  current.maxAlternatives = 1;
  current.onstart = () => {
    listening.value = true;
  };
  current.onresult = (event: SpeechRecognitionEvent) => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results.item(index);
      const transcript = result.item(0).transcript;
      if (result.isFinal) voiceFinal += transcript;
      else interim += transcript;
    }
    voiceInterim = interim;
    const text = voiceTranscript();
    if (text) {
      query.value = text;
      scheduleVoiceSubmit();
    }
  };
  current.onerror = (event: SpeechRecognitionErrorEvent) => {
    const { error } = event;
    if (error === "aborted") return;
    const heard = voiceTranscript();
    if (error === "no-speech") {
      if (heard) stopVoice(true);
      else {
        stopVoice(false);
        pushMessage({ role: "neko", text: "没听到声音喵，再点一次麦克风试试~" });
      }
      return;
    }
    if (error === "not-allowed" || error === "service-not-allowed") {
      stopVoice(false);
      pushMessage({ role: "neko", text: "麦克风权限被拒绝了喵，去浏览器设置里允许一下~" });
      return;
    }
    // 识别服务连不上（Chrome 走的是谷歌服务器）时，改走录音上传转写
    if (error === "network") {
      stopVoice(false);
      pushMessage({ role: "neko", text: "网络语音识别连不上喵，换成录音识别再试一次~" });
      startRecording();
      return;
    }
    if (heard) {
      stopVoice(true);
      return;
    }
    stopVoice(false);
    pushMessage({ role: "neko", text: "没听清喵，再说一次试试？" });
  };
  current.onend = () => {
    // 引擎自行断开（常见于长时间静音）时收尾，避免一直亮着聆听状态
    if (!listening.value) return;
    if (voiceTranscript()) stopVoice(true);
    else {
      stopVoice(false);
      pushMessage({ role: "neko", text: "语音识别断开了喵，再点一次麦克风试试~" });
    }
  };

  try {
    current.start();
  } catch {
    stopVoice(false);
    startRecording();
    return;
  }

  // 3 秒内 onstart 未触发（安卓 WebView 常见：start 不报错但静默失败）→ 判定 Web Speech 不可用，改走录音
  window.clearTimeout(voiceTimeout);
  voiceTimeout = window.setTimeout(() => {
    if (listening.value) return;
    stopVoice(false);
    startRecording();
  }, 3000);
}

function stopVoice(submitText = false): void {
  window.clearTimeout(voiceTimeout);
  window.clearTimeout(voiceSilenceTimer);
  window.clearTimeout(recordTimer);
  window.clearTimeout(recordSegmentTimer);
  voiceTimeout = undefined;
  voiceSilenceTimer = undefined;
  recordTimer = undefined;
  recordSegmentTimer = undefined;
  listening.value = false;

  // 录音模式：交给 onstop 收尾，把最后一段也转写完再决定发不发
  if (voiceMode === "record") {
    voiceMode = null;
    pendingRecordSubmit = submitText;
    const currentRecorder = recorder;
    // stop 事件是异步的：片段还在就一律交给 onstop 收尾，否则会漏掉刚录满的那一段
    if (currentRecorder) {
      if (currentRecorder.state !== "inactive") currentRecorder.stop();
      return;
    }
    void finishRecording();
    return;
  }
  voiceMode = null;
  releaseRecordStream();

  const text = voiceTranscript();
  resetVoiceText();
  const current = recognition;
  recognition = null;
  if (current) {
    // 先摘掉回调再 abort，避免 abort 触发的 onerror/onend 递归进来
    current.onstart = null;
    current.onresult = null;
    current.onerror = null;
    current.onend = null;
    try {
      current.abort();
    } catch {
      // 实例可能已结束，忽略
    }
  }
  // 只发送语音识别出来的内容，不动用户手打的字
  if (submitText && text) {
    query.value = text;
    void submit();
  }
}

function pickRecordMime(): string {
  return RECORD_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function releaseRecordStream(): void {
  recordStream?.getTracks().forEach((track) => track.stop());
  recordStream = null;
}

function takeSegment(): Blob {
  const chunks = recordChunks;
  recordChunks = [];
  return new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
}

const CJK_CHAR = /[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]/;

// 中文直接接上，英文和数字之间补个空格，免得两段粘成一坨
function mergeSegmentText(accumulated: string, segment: string): string {
  if (!accumulated || CJK_CHAR.test(accumulated.slice(-1)) || CJK_CHAR.test(segment.slice(0, 1))) {
    return accumulated + segment;
  }
  return `${accumulated} ${segment}`;
}

// 每段封口后进队列，串行转写并按顺序拼起来，聊天框里就能随说随出字
async function transcribeQueuedSegments(): Promise<void> {
  while (recordQueue.length > 0) {
    const blob = recordQueue.shift();
    if (!blob) continue;
    try {
      const text = await transcribe(blob);
      if (!text) continue;
      recordText = mergeSegmentText(recordText, text);
      if (recordActive) query.value = recordText;
    } catch {
      // 单段转写失败不影响整句，记下来方便最后给个准确提示
      recordFailed = true;
    }
  }
}

// 转写串成一条链，await 它就能等到队里最后一段也拼完
function drainRecordQueue(): Promise<void> {
  recordDrain = recordDrain.then(transcribeQueuedSegments);
  return recordDrain;
}

// 一段录满就 stop() 封口成完整音频：半截的 webm/mp4 容器 Whisper 认不出来，只有整段才转得出字
function startSegment(): void {
  const stream = recordStream;
  if (!stream || voiceMode !== "record") return;
  recordChunks = [];
  const mimeType = pickRecordMime();
  const current = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  recorder = current;
  current.ondataavailable = (event) => {
    if (event.data.size > 0) recordChunks.push(event.data);
  };
  current.onstop = () => {
    const blob = takeSegment();
    if (blob.size > 0) {
      recordQueue.push(blob);
      void drainRecordQueue();
    }
    // 用户还没喊停就接着录下一段；喊停了就把最后一段转完再收尾
    if (voiceMode === "record") startSegment();
    else void finishRecording();
  };
  try {
    current.start();
  } catch {
    // 片段没起来就别留着 recorder，否则停录时会等一个永远不来的 stop 事件
    recorder = null;
    stopVoice(true);
    return;
  }
  const segmentMs = recordSegmentIndex === 0 ? VOICE_FIRST_SEGMENT_MS : VOICE_SEGMENT_MS;
  recordSegmentIndex += 1;
  window.clearTimeout(recordSegmentTimer);
  recordSegmentTimer = window.setTimeout(() => {
    if (voiceMode === "record" && current.state === "recording") current.stop();
  }, segmentMs);
}

// 录音模式：点一下开始录，再点一下停止并提交（移动端唯一能出字的通道）
function startRecording(): void {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    pushMessage({
      role: "neko",
      text: "这个浏览器录不了音喵，试试 Chrome 或 Edge，或者直接用键盘打字吧~",
    });
    return;
  }
  voiceMode = "record";
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      // 等授权的工夫用户已经取消了，就别再录
      if (voiceMode !== "record") {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      recordStream = stream;
      recordText = "";
      recordFailed = false;
      recordActive = true;
      recordSegmentIndex = 0;
      listening.value = true;
      startSegment();
      window.clearTimeout(recordTimer);
      recordTimer = window.setTimeout(() => {
        if (listening.value) stopVoice(true);
      }, VOICE_RECORD_MAX_MS);
    })
    .catch(() => {
      voiceMode = null;
      recordActive = false;
      releaseRecordStream();
      pushMessage({ role: "neko", text: "麦克风权限被拒绝了喵，去浏览器设置里允许一下~" });
    });
}

function toBase64(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(binary);
}

async function transcribe(blob: Blob): Promise<string> {
  const audio = toBase64(new Uint8Array(await blob.arrayBuffer()));
  const response = await fetch(ASR_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio }),
  });
  if (!response.ok) throw new Error(`语音识别接口返回 ${response.status}`);
  const data = (await response.json()) as { text?: string };
  return (data.text ?? "").trim();
}

async function finishRecording(): Promise<void> {
  const shouldSubmit = pendingRecordSubmit;
  pendingRecordSubmit = false;
  recorder = null;
  releaseRecordStream();
  window.clearTimeout(recordSegmentTimer);
  recordSegmentTimer = undefined;

  transcribing.value = true;
  listening.value = true;
  // 录音期间已经边转边拼，这里只等最后一段也转完再决定发不发
  await drainRecordQueue();
  transcribing.value = false;
  listening.value = false;
  recordActive = false;

  const text = recordText.trim();
  const failed = recordFailed;
  recordText = "";
  recordFailed = false;
  if (!shouldSubmit) return;
  if (!text) {
    pushMessage({
      role: "neko",
      text: failed ? "语音识别服务连不上喵，稍后再试，或者用键盘打字吧~" : "没听清喵，再说一次试试？",
    });
    return;
  }
  query.value = text;
  void submit();
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

  window.clearTimeout(greetingTimer);
  greetingTimer = window.setTimeout(() => {
    messageId = 0;
    pushMessage({ role: "neko", text: GREETING });
  }, Math.min(removed - 1, LEAVE_MAX) * LEAVE_STEP + LEAVE_DURATION);
}

function openRouter(): void {
  if (open.value) {
    inputEl.value?.focus();
    return;
  }

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
  // 压一条历史记录：移动端返回键/滑动手势先关窗口，而不是直接退到别的页面
  history.pushState({ nekoOpen: true }, "");
}

function close(): void {
  if (!open.value) return;
  open.value = false;
  // 弹出 openRouter 压入的记录；popstate 回调里 open 已为 false，不会递归
  if (history.state?.nekoOpen) history.back();
}

function onPopState(): void {
  if (open.value) close();
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
  window.addEventListener("popstate", onPopState);
});

onBeforeUnmount(() => {
  stopVoice();
  routeAbort?.abort();
  eggTimers.forEach((id) => window.clearTimeout(id));
  eggTimers.length = 0;
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener(OPEN_EVENT, openRouter);
  window.removeEventListener("popstate", onPopState);
  window.clearTimeout(clearTimer);
  window.clearTimeout(greetingTimer);
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
  background: url("/assets/image/neko17.webp") 50% center / cover no-repeat;
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

.bababoi-img {
  display: block;
  width: 160px;
  height: auto;
  margin-top: 6px;
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

.neko-qq-footer > div.is-listening {
  color: #ff5f8f;
  animation: neko-voice-pulse 1.2s ease-in-out infinite;
}

@keyframes neko-voice-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.18);
  }
}

.neko-qq-footer svg {
  display: block;
  width: 22px;
  height: 22px;
  margin: 0 auto;
}

.neko-voice-hint {
  display: flex;
  position: fixed;
  bottom: clamp(96px, 18vh, 200px);
  left: 50%;
  z-index: 10000;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  transform: translateX(-50%);
  pointer-events: none;
}

.neko-voice-orb {
  display: grid;
  position: relative;
  width: 104px;
  height: 104px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  place-items: center;
  pointer-events: auto;
  cursor: pointer;
  animation: neko-voice-breathe 1.4s var(--ease-out) infinite;
}

.neko-voice-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9ec8, #7cc4ff);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
  animation: neko-voice-ripple 2s var(--ease-out) infinite;
}

.neko-voice-ring--slow {
  animation-delay: 1s;
}

@keyframes neko-voice-ripple {
  0% {
    opacity: 0.8;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.9);
  }
}

.neko-voice-ico {
  display: flex;
  position: relative;
  z-index: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--card);
  box-shadow: 0 12px 32px rgba(255, 158, 200, 0.32);
}

@keyframes neko-voice-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}

.neko-voice-ico svg {
  display: block;
  width: 42px;
  height: 42px;
}

.neko-voice-text {
  margin: 0;
  padding: 5px 16px;
  border-radius: 999px;
  background: var(--card);
  box-shadow: 0 4px 14px rgba(255, 158, 200, 0.24);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.neko-voice-text span {
  background-image: linear-gradient(135deg, #ff9ec8, #7cc4ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.neko-voice-hint-enter-active,
.neko-voice-hint-leave-active {
  transition: opacity 0.24s var(--ease-out), transform 0.24s var(--ease-out);
}

.neko-voice-hint-enter-from,
.neko-voice-hint-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(14px) scale(0.9);
}

:global(html.dark) .neko-voice-ico {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
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

  /* iOS Safari 聚焦时会自动放大 font-size < 16px 的输入框，整页跟着被顶大 */
  .neko-panel input {
    font-size: 16px;
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

  .neko-voice-orb {
    animation: none;
  }

  .neko-voice-ring {
    animation: none;
    opacity: 0.35;
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

  .neko-qq-footer > div.is-listening {
    animation: none;
  }

  .neko-act:active,
  .cp-btn:active {
    transform: none;
  }
}
</style>
