// 首页几张卡片之间怎么说话：台词在 live-lines.ts，这里管什么时候说、由谁来说。
// 只有一张卡就自己念叨，凑齐两张以上就按脚本你一句我一句；
// 说话期间会让开演戏的排期，中途有人拎卡、搬卡就整段作废。

import { onBeforeUnmount, ref, type Ref } from "vue";
import { markEgg } from "./egg-utils";
import type { CardSpec, PeerSides } from "./live-peer";
import {
  CHAT_MOMENTS,
  CHAT_TURNS,
  JUST_DRAGGED_MS,
  JUST_PLAYED_MS,
  MEME_GAP_MS,
  MOOD_LINES,
  MOMENT_CHANCE,
  SPEECH_LINES,
  STARE_GAP_MS,
  type ChatAct,
  type ChatCast,
  type ChatMood,
  type ChatTurn,
  type EmoState,
  type SpeechLines,
} from "./live-lines";

/** 有猫落地先聊两句，第二句隔这么久接上 */
export const GREETING_REPLY_MS = 1800;
/** 一段说完隔多久再来一段（20–45 秒之间随便挑，不固定才不像机器） */
const CHAT_MIN_MS = 20_000; const CHAT_MAX_MS = 45_000;
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
/** 说完带戏的那句、插戏还没落地时的兜底：演不出来也不能把后半截晾着 */
const ACT_FALLBACK_MS = 6_000;
/** 带 once 的档（稀客才说的话）说过一次，歇这么久才允许再说 */
const ONCE_GAP_MS = 10 * 60_000;
/** 正赶上某种心情时，单句台词有多大概率从心情池里挑 */
const MOOD_CHANCE = 0.55;
/** 手里不止一张卡时，也留一点机会让它自己嘀咕一句——心情就是从这儿露出来的 */
const MUTTER_CHANCE = 0.3;
/** 事件带起来的心情各挂多久 */
const SULKY_HOLD_MS = 90_000;
const HAPPY_HOLD_MS = 90_000;
const SHY_HOLD_MS = 120_000;
/** 上班时段：工作日九点到十八点 */
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;

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
  /** 观众盯着这片卡片看了多久（秒）；切走、切到后台就停表 */
  linger: () => number;
  /** 刚切回这个页面吗 */
  justReturned: () => boolean;
  /** 观众的小箭头半天没动过吗（动一下就重新计时） */
  cursorIdle: () => boolean;
  /** 刚刚在同一个地方连戳了好几下吗 */
  tapBurst: () => boolean;
  /** 刚刚一口气把整页滚到了底吗 */
  scrollDash: () => boolean;
  /** 距上一次来隔了多少天（头一回来是 0） */
  awayDays: () => number;
  /** 中间插一段戏（用演出脚本的名字）；演不成返回 false，好让话接着往下说 */
  act: (name: ChatAct) => boolean;
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
  /** 中间插的那段戏演完了：接着往下说，返回是否真的接上了 */
  actDone(): boolean;
}

/** 挑中的这一段：台词本身，外加要不要顺手点亮某个彩蛋 */
interface PickedChat {
  readonly turns: readonly ChatTurn[];
  readonly egg?: string;
  readonly meme?: boolean;
  readonly stare?: boolean;
  readonly once?: string;
}

/** 一句话说完要插戏时，把「接下来该说什么」先寄存下来 */
interface PendingTurn {
  readonly turns: readonly ChatTurn[];
  readonly index: number;
  readonly run: number;
  readonly previous: string;
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
  /** 「屏幕外面那个人类」说到第几段了、上一段是什么时候说的 */
  let stareLevel = 0;
  let lastStareAt = 0;
  /** 上一回说梗是什么时候：说完隔一阵才允许下一个梗 */
  let lastMemeAt = 0;
  /** 带 once 的档（稀客才说的话）上一次是什么时候说的 */
  const lastOnce = new Map<string, number>();
  /** 一句话说完要插戏时，后半截先寄在这儿，等戏演完再接上 */
  let pending: PendingTurn | null = null;
  /** 每张卡上一句说了什么，下一句尽量不重样 */
  const lastLine = new Map<string, string>();
  /** 眼下的心情，以及它挂到什么时候（事件带起来的，过一会儿自己回落） */
  let emo: EmoState = "normal";
  let emoUntil = 0;

  /** 记一笔心情：被人拎过就闹别扭、演完一段就得意、被盯着看就害羞 */
  function holdEmo(next: EmoState, holdMs: number): void {
    emo = next;
    emoUntil = Date.now() + holdMs;
  }

  /** 这会儿是什么心情：事件带起来的优先，其次看夜里、看是不是只剩自己 */
  function currentEmo(count: number): EmoState {
    if (emo !== "normal" && Date.now() < emoUntil) return emo;
    if (count === 1) return "lost";
    const hour = new Date().getHours();
    if (hour < 5 || hour >= 23) return "sleepy";
    if (hour >= 17 && hour < 19) return "hungry";
    return "normal";
  }

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

  /** 从这张卡的池子里挑一句，连着两句不重样；自己待着或顺口搭话时，先照着眼下的心情说 */
  function pickLine(card: CardSpec, type: keyof SpeechLines): string {
    const moodPool =
      type === "solo" || type === "idle"
        ? MOOD_LINES[card.kind][currentEmo(host.cards().length)]
        : undefined;
    const pool =
      moodPool && Math.random() < MOOD_CHANCE ? moodPool : SPEECH_LINES[card.kind][type];
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
    const today = new Date();
    const hour = today.getHours();
    const day = today.getDay();
    return {
      period: periodOfHour(hour),
      cast: castOf(kinds) ?? "mixed",
      count: cards.length,
      peers: around.count,
      sides: around.sides,
      justDragged: now - lastDragAt < JUST_DRAGGED_MS,
      justPlayed: now - host.lastPlayedAt() < JUST_PLAYED_MS,
      weekday: day,
      linger: host.linger(),
      stare: stareLevel,
      stareReady: now - lastStareAt >= STARE_GAP_MS,
      justReturned: host.justReturned(),
      memeReady: now - lastMemeAt >= MEME_GAP_MS,
      cursorIdle: host.cursorIdle(),
      tapBurst: host.tapBurst(),
      scrollDash: host.scrollDash(),
      awayDays: host.awayDays(),
      weekend: day === 0 || day === 6,
      workHours: day >= 1 && day <= 5 && hour >= WORK_START_HOUR && hour < WORK_END_HOUR,
    };
  }

  /** 挑一段当下说得成的对话：正赶上什么光景就多说几句那档的，剩下的留给常备的那几套 */
  function pickChatTurns(): PickedChat | null {
    const mood = readMood();
    const now = Date.now();
    const moments = CHAT_MOMENTS.filter(
      (moment) =>
        moment.cast === mood.cast &&
        moment.when(mood) &&
        // 稀客才说的话说过一次就歇一阵，别絮叨
        (!moment.once || now - (lastOnce.get(moment.once) ?? 0) >= ONCE_GAP_MS)
    );
    // 「那个人类一直在看」是专门为这一刻写的，轮到了就优先说，不跟别的档抢
    const stares = moments.filter((moment) => moment.stare);
    const pool: readonly PickedChat[] =
      stares.length > 0
        ? stares
        : moments.length > 0 && Math.random() < MOMENT_CHANCE
          ? moments
          : CHAT_TURNS[mood.cast].map((turns) => ({ turns }));
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

  /** 戏演完了、或者根本演不出来：把刚才那段话的后半截接上 */
  function resumePending(): boolean {
    const next = pending;
    pending = null;
    window.clearTimeout(turnTimer);
    if (!next || next.run !== chatRun) return false;
    playTurn(next.turns, next.index, next.run, next.previous);
    return true;
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

    const turn = turns[index];
    const speaker = speakerFor(turn.by, previous);
    if (!speaker) {
      chatRun += 1;
      host.releaseShow();
      return;
    }
    showSpeech(speaker.id, turn.line);

    // 这句说完要插一段戏：让位给演出，戏演完（或兜底到点）再把后半截接上
    const act = turn.act;
    window.clearTimeout(turnTimer);
    if (act) {
      pending = { turns, index: index + 1, run, previous: speaker.id };
      turnTimer = window.setTimeout(() => {
        if (run !== chatRun) {
          pending = null;
          return;
        }
        if (!host.act(act)) {
          resumePending();
          return;
        }
        turnTimer = window.setTimeout(resumePending, ACT_FALLBACK_MS);
      }, CHAT_TURN_MS);
      return;
    }

    turnTimer = window.setTimeout(
      () => playTurn(turns, index + 1, run, speaker.id),
      CHAT_TURN_MS
    );
  }

  /** 轮到说话了：偶尔只是自己嘀咕一句，多数时候两张以上就来一段你一句我一句 */
  function startChat(): void {
    const cards = host.cards();
    const mutter = cards.length === 1 || Math.random() < MUTTER_CHANCE;
    const picked = !mutter && cards.length > 1 ? pickChatTurns() : null;
    if (!picked) {
      const speaker = nextSpeaker();
      if (speaker) showSpeech(speaker.id, pickLine(speaker, cards.length === 1 ? "solo" : "idle"));
      return;
    }

    // 说这一档的同时顺手把彩蛋、梗的间隔、盯看说到第几段都记上
    if (picked.egg) markEgg(picked.egg);
    const now = Date.now();
    if (picked.meme) lastMemeAt = now;
    if (picked.once) lastOnce.set(picked.once, now);
    if (picked.stare) {
      lastStareAt = now;
      stareLevel += 1;
      // 被人盯着看这么久，会不好意思
      holdEmo("shy", SHY_HOLD_MS);
    }
    // 被人连戳了一顿：也是被盯着看的一种
    if (picked.once === "tapBurst") holdEmo("shy", SHY_HOLD_MS);
    chatRun += 1;
    // 这一段对话期间先别演戏：不然刚开口就被一段动画打断，后半截就说不下去了
    host.holdShow();
    playTurn(picked.turns, 0, chatRun, "");
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
      // 正在等戏的那半截也算废掉，别一会儿又冒出来
      pending = null;
      window.clearTimeout(turnTimer);
    },
    scheduleAfterGreeting: () => schedule(GREETING_REPLY_MS + nextChatDelay()),
    markDragged: () => {
      lastDragAt = Date.now();
      // 刚被人拎来拎去：先闹一会儿别扭
      holdEmo("sulky", SULKY_HOLD_MS);
      schedule(DRAG_CHAT_MIN_MS + Math.random() * (DRAG_CHAT_MAX_MS - DRAG_CHAT_MIN_MS));
    },
    markPlayed: () => {
      // 刚演完一段：有点小得意
      holdEmo("happy", HAPPY_HOLD_MS);
      schedule(SHOW_CHAT_MIN_MS + Math.random() * (SHOW_CHAT_MAX_MS - SHOW_CHAT_MIN_MS));
    },
    scheduleNext: () => schedule(nextChatDelay()),
    actDone: resumePending,
  };
}
