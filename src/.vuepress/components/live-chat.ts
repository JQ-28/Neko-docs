// 首页几张卡片之间怎么说话：台词在 live-lines.ts，这里管什么时候说、由谁来说。
// 只有一张卡就自己念叨，凑齐两张以上就按脚本你一句我一句；
// 说话期间会让开演戏的排期，中途有人拎卡、搬卡就整段作废。

import { onBeforeUnmount, ref, type Ref } from "vue";
import type { CardSpec, PeerSides } from "./live-peer";
import {
  CHAT_MOMENTS,
  CHAT_TURNS,
  JUST_DRAGGED_MS,
  JUST_PLAYED_MS,
  MOMENT_CHANCE,
  SPEECH_LINES,
  type ChatCast,
  type ChatMood,
  type ChatTurn,
  type SpeechLines,
} from "./live-lines";

/** 有猫落地先聊两句，第二句隔这么久接上 */
export const GREETING_REPLY_MS = 1800;
/** 一段说完隔多久再来一段（20–45 秒之间随便挑，不固定才不像机器） */
const CHAT_MIN_MS = 20_000;
const CHAT_MAX_MS = 45_000;
/** 对话里两句之间隔多久：上一句的气泡刚收，下一句就接上 */
const CHAT_TURN_MS = 2400;
/** 刚被人拎着玩过，隔这么久就嘀咕两句，趁这事还新鲜 */
const DRAG_CHAT_MIN_MS = 6_000;
const DRAG_CHAT_MAX_MS = 13_000;
/** 刚演完一段，隔这么久说说刚才那一下 */
const SHOW_CHAT_MIN_MS = 8_000;
const SHOW_CHAT_MAX_MS = 16_000;
/** 一句话最少挂多久，以及每个字多挂的时长：长句子给够读完的时间 */
const SPEECH_LINGER_MS = 1600;
const SPEECH_CHAR_MS = 170;

/** 说话要用到的几件外界情况，都由组件喂进来 */
export interface TalkHost {
  /** 眼下住在这扇窗口里的卡片 */
  cards: () => CardSpec[];
  /** 卡片区在不在视野里 */
  visible: () => boolean;
  /** 眼下适不适合开口：没人拎着卡、没在演戏、卡片也没飘去隔壁 */
  ready: () => boolean;
  /** 隔壁还开着几扇 neko 页面，猫都在哪几边 */
  peers: () => { count: number; sides: PeerSides };
  /** 上一回开演是什么时候（时间戳，没演过就是 0） */
  lastPlayedAt: () => number;
  /** 说话期间先把演戏的排期让开 */
  holdShow: () => void;
  /** 说完了，把演戏的排期还回去 */
  releaseShow: () => void;
}

export interface LiveTalk {
  /** 哪张卡正在冒话（空串表示没在冒） */
  readonly speakingId: Ref<string>;
  /** 冒出来的那句话 */
  readonly speech: Ref<string>;
  /** 让某张卡从它的台词池里说一句 */
  say(card: CardSpec, type: keyof SpeechLines): void;
  /** 松手了：刚那句话再挂一会儿再收，像还在嘀咕 */
  lingerSpeech(): void;
  /** 立刻把话收掉（卡片被搬走、被拎去隔壁时用） */
  hush(): void;
  /** 这张卡走了，它的记录一并清掉 */
  forget(cardId: string): void;
  /** 正在说的那段别说了 */
  stop(): void;
  /** 落地那两句聊完以后，接着排平时的闲聊 */
  scheduleAfterGreeting(): void;
  /** 刚被拎起来玩过：趁热让它们嘀咕两句 */
  markDragged(): void;
  /** 刚演完一段：让它们说说刚才那一下 */
  markPlayed(): void;
  /** 重整下一次说话的排期（挂载、卡片数变了时调） */
  scheduleNext(): void;
}

/** 几点算什么时候：跟在线猫卡片的分法一致，傍晚以后单独算一档 */
function periodOfHour(hour: number): ChatMood["period"] {
  if (hour < 5) return "night";
  if (hour < 8) return "morning";
  if (hour < 18) return "day";
  return "evening";
}

/** 手里这几张卡凑得成哪一套对话；一张都没有就是 null */
function castOf(kinds: ReadonlySet<CardSpec["kind"]>): ChatCast | null {
  if (kinds.has("neko") && kinds.has("online")) return "mixed";
  if (kinds.has("neko")) return "neko";
  if (kinds.has("online")) return "online";
  return null;
}

export function useLiveTalk(host: TalkHost): LiveTalk {
  const speakingId = ref("");
  const speech = ref("");
  let speechTimer = 0;
  let chatTimer = 0;
  let turnTimer = 0;
  /** 对话的场次号：中途被拎走、卡片被搬走就加一，正在说的那段自己作废 */
  let chatRun = 0;
  /** 上一句是谁说的，下一句换张卡张嘴 */
  let lastSpeaker = "";
  /** 上一段说的是哪一段，下一段换一段 */
  let lastChatIndex = -1;
  /** 上一回被人拎着玩是什么时候，卡片会拿它嘀咕两句 */
  let lastDragAt = 0;
  /** 每张卡上一句说了什么，下一句尽量不重样 */
  const lastLine = new Map<string, string>();

  /** 话长就多挂一会儿 */
  function speechLingerMs(line: string): number {
    return Math.max(SPEECH_LINGER_MS, line.length * SPEECH_CHAR_MS);
  }

  /** 让某张卡冒一句话，过一会儿自己收（同一时刻只有一张卡在说话） */
  function showSpeech(cardId: string, line: string): void {
    speakingId.value = cardId;
    speech.value = line;
    window.clearTimeout(speechTimer);
    speechTimer = window.setTimeout(() => {
      speakingId.value = "";
      speech.value = "";
    }, speechLingerMs(line));
  }

  /** 从这张卡的池子里挑一句，连着两句不重样 */
  function pickLine(card: CardSpec, type: keyof SpeechLines): string {
    const pool = SPEECH_LINES[card.kind][type];
    let index = Math.floor(Math.random() * pool.length);
    if (pool[index] === lastLine.get(card.id)) index = (index + 1) % pool.length;
    const line = pool[index];
    lastLine.set(card.id, line);
    return line;
  }

  function nextChatDelay(): number {
    return CHAT_MIN_MS + Math.random() * (CHAT_MAX_MS - CHAT_MIN_MS);
  }

  /** 几张卡轮流搭话；只有一张就一直是它自己念叨 */
  function nextSpeaker(): CardSpec | null {
    const cards = host.cards();
    if (cards.length === 0) return null;
    const index = cards.findIndex((card) => card.id === lastSpeaker);
    const speaker = cards[(index + 1) % cards.length];
    lastSpeaker = speaker.id;
    return speaker;
  }

  /** 把眼下的光景读一遍 */
  function readMood(): ChatMood {
    const cards = host.cards();
    const kinds = new Set(cards.map((card) => card.kind));
    const now = Date.now();
    const around = host.peers();
    return {
      period: periodOfHour(new Date().getHours()),
      cast: castOf(kinds) ?? "mixed",
      count: cards.length,
      peers: around.count,
      sides: around.sides,
      justDragged: now - lastDragAt < JUST_DRAGGED_MS,
      justPlayed: now - host.lastPlayedAt() < JUST_PLAYED_MS,
    };
  }

  /** 挑一段当下说得成的对话：正赶上什么光景就多说几句那档的，剩下的留给常备的那几套 */
  function pickChatTurns(): readonly ChatTurn[] | null {
    const mood = readMood();
    const moments = CHAT_MOMENTS.filter(
      (moment) => moment.cast === mood.cast && moment.when(mood)
    );
    const pool: readonly (readonly ChatTurn[])[] =
      moments.length > 0 && Math.random() < MOMENT_CHANCE
        ? moments.map((moment) => moment.turns)
        : CHAT_TURNS[mood.cast];
    if (pool.length === 0) return null;

    let index = Math.floor(Math.random() * pool.length);
    if (index === lastChatIndex) index = (index + 1) % pool.length;
    lastChatIndex = index;
    return pool[index];
  }

  /** 这一句该谁张嘴：要那种卡，而且尽量别跟上一位是同一张 */
  function speakerFor(kind: CardSpec["kind"], previous: string): CardSpec | null {
    const sameKind = host.cards().filter((card) => card.kind === kind);
    if (sameKind.length === 0) return null;
    return sameKind.find((card) => card.id !== previous) ?? sameKind[0];
  }

  /** 一句一句往外冒：中途被拎走、被搬走、演起动画就整段作废 */
  function playTurn(
    turns: readonly ChatTurn[],
    index: number,
    run: number,
    previous: string
  ): void {
    // 已经作废的那段（卡片被拎走 / 被搬走）自己安静退场，不接管排期
    if (run !== chatRun) return;

    // 说完了，把演戏的节奏还回去
    if (index >= turns.length) {
      host.releaseShow();
      return;
    }

    if (!host.visible() || !host.ready()) {
      chatRun += 1;
      host.releaseShow();
      return;
    }

    const speaker = speakerFor(turns[index].by, previous);
    if (!speaker) {
      chatRun += 1;
      host.releaseShow();
      return;
    }
    showSpeech(speaker.id, turns[index].line);

    window.clearTimeout(turnTimer);
    turnTimer = window.setTimeout(
      () => playTurn(turns, index + 1, run, speaker.id),
      CHAT_TURN_MS
    );
  }

  /** 轮到说话了：只有一张卡就自己念叨，两张以上就来一段你一句我一句 */
  function startChat(): void {
    const turns = host.cards().length > 1 ? pickChatTurns() : null;
    if (!turns) {
      const speaker = nextSpeaker();
      if (speaker) showSpeech(speaker.id, pickLine(speaker, "solo"));
      return;
    }

    chatRun += 1;
    // 这一段对话期间先别演戏：不然刚开口就被一段动画打断，后半截就说不下去了
    host.holdShow();
    playTurn(turns, 0, chatRun, "");
  }

  function schedule(delayMs: number): void {
    window.clearTimeout(chatTimer);
    chatTimer = window.setTimeout(() => {
      if (host.visible() && host.ready()) startChat();
      schedule(nextChatDelay());
    }, delayMs);
  }

  onBeforeUnmount(() => {
    window.clearTimeout(speechTimer);
    window.clearTimeout(chatTimer);
    window.clearTimeout(turnTimer);
  });

  return {
    speakingId,
    speech,
    say: (card, type) => showSpeech(card.id, pickLine(card, type)),
    lingerSpeech: () => {
      window.clearTimeout(speechTimer);
      speechTimer = window.setTimeout(() => {
        speakingId.value = "";
        speech.value = "";
      }, speechLingerMs(speech.value));
    },
    hush: () => {
      window.clearTimeout(speechTimer);
      speakingId.value = "";
      speech.value = "";
    },
    forget: (cardId) => {
      lastLine.delete(cardId);
      if (lastSpeaker === cardId) lastSpeaker = "";
      // 说话的那张被搬走了，这段对话就说到这儿
      chatRun += 1;
      window.clearTimeout(turnTimer);
    },
    stop: () => {
      chatRun += 1;
      window.clearTimeout(turnTimer);
    },
    scheduleAfterGreeting: () => schedule(GREETING_REPLY_MS + nextChatDelay()),
    markDragged: () => {
      lastDragAt = Date.now();
      schedule(DRAG_CHAT_MIN_MS + Math.random() * (DRAG_CHAT_MAX_MS - DRAG_CHAT_MIN_MS));
    },
    markPlayed: () =>
      schedule(SHOW_CHAT_MIN_MS + Math.random() * (SHOW_CHAT_MAX_MS - SHOW_CHAT_MIN_MS)),
    scheduleNext: () => schedule(nextChatDelay()),
  };
}
