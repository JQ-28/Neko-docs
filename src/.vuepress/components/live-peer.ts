// 跨窗口联动：同一个浏览器里开着两个 neko 页面时，两边的卡片可以互相串门。
// 走 BroadcastChannel，只有同源、同一个浏览器的窗口才通得上，别的浏览器和设备看不到彼此。
//
// 卡片不归窗口所有，只归「此刻住在哪儿」：每扇窗口开窗时各生一张猫卡和一张在线猫卡，
// 拖动只是给卡片换个住处 —— 搬到隔壁窗口，隔壁就多出一张真卡，这边少一张。
// 窗口关掉或刷新时，它生的那两张卡（不管现在住在谁家）一起消失，寄放在它那儿的卡各自回家。
//
// 浏览器不允许一个页面控制另一个窗口、也不允许把 DOM 拖过去，
// 所以「搬过去」是这么实现的：这边把卡从列表里摘掉，把卡的身份证和落点告诉隔壁，
// 隔壁照着落点把同一张卡插进自己的列表里。

import { ref, type Ref } from "vue";

/** 隔壁窗口的自我介绍 */
export interface PeerInfo {
  id: string;
  /** 窗口在屏幕上的坐标与大小，用来判断谁在哪、这片地方归谁 */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 加入时间，屏幕坐标分不出上下左右时（比如叠在一起）按它排队 */
  at: number;
}

/** 卡片种类：左边那只是 Neko 本猫，右边是在线猫猫 */
export type CardKind = "neko" | "online";

/** 一张卡片：id 全局唯一（出生窗口 + 种类），窗口只是它此刻住的地方 */
export interface CardSpec {
  id: string;
  kind: CardKind;
}

/** 卡片往哪条边出去/进来 */
export type LiveEdge = "left" | "right" | "top" | "bottom";

export interface HandoffPayload {
  card: CardSpec;
  /** 卡片的去向：从自己这条边出去，也从对面这条边进来 */
  edge: LiveEdge;
  /** 交出去时越出边界多少像素，接手那边从同样的深度滑进来 */
  over: number;
}

/** 卡片在大桌面上的位置（屏幕绝对坐标，跨显示器也是同一套坐标系） */
export interface RoamPoint {
  card: CardSpec;
  x: number;
  y: number;
}

/** 一块屏幕区域：某个窗口占的地方 */
export interface WindowRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 是不是自己 */
  self: boolean;
}

/** 屏幕上下左右四个方向各开着几个 neko 页面（按窗口真正摆在哪儿算） */
export interface PeerSides {
  left: number;
  right: number;
  above: number;
  below: number;
}

const NO_PEER_SIDES: PeerSides = { left: 0, right: 0, above: 0, below: 0 };

/** 渲染时的排序：猫在前、在线猫在后，同类之间按抵达顺序 */
const KIND_ORDER: readonly CardKind[] = ["neko", "online"];

export interface PeerLink {
  /** 隔壁还开着几个 neko 页面 */
  peerCount: Ref<number>;
  /** 左边几个、右边几个（按屏幕位置算，摆窗口时实时跟着变） */
  peerSides: Ref<PeerSides>;
  /** 眼下住在我这儿的卡片：本地生的 + 别人搬过来的 */
  cards: Ref<CardSpec[]>;
  /** 能不能做实时漫游：高频位置消息只有 BroadcastChannel 撑得住，localStorage 那条路只能等松手才传 */
  readonly liveRoam: boolean;
  hasPeers(): boolean;
  /** 所有窗口占的屏幕区域（含自己） */
  windowRects(): WindowRect[];
  /** 这个屏幕坐标现在落在谁的窗口里（含自己；谁都没盖住就是 null） */
  ownerAt(x: number, y: number): WindowRect | null;
  /** 屏幕上就在那一侧、离自己最近的那个窗口 */
  neighborTowards(edge: LiveEdge): PeerInfo | null;
  /** 报一次自己现在的位置与家当，并请大家都报一遍（拎卡前调，免得用着几秒前的旧位置找人） */
  refresh(): void;
  /** 顶到边上、马上要把卡扔过去了，先喊一嗓子让对面把卡叫醒 */
  warnIncoming(target: string, edge: LiveEdge): void;
  /** 隔壁喊话说卡要来了 */
  onIncoming(listener: (edge: LiveEdge) => void): void;
  /** 拖动中：报一下卡现在飘在大桌面的哪个位置，让各个窗口接着往下传 */
  sendRoam(point: RoamPoint): void;
  /** 隔壁的卡正路过我这儿 */
  onRoam(listener: (point: RoamPoint) => void): void;
  /** 松手：把卡片正式落到某个窗口手里（这边立刻把它从自己的列表摘掉） */
  sendMove(target: string, point: RoamPoint): void;
  /** 有卡片搬到我这儿了（带落点，用来决定从哪条边滑进来） */
  onCardArrive(listener: (point: RoamPoint) => void): void;
  /** 住在我这儿的卡片被搬走了，或者主人没了被销毁了 */
  onCardLeave(listener: (cardId: string) => void): void;
  /** 把卡片交给某个窗口（贴边松手那条路用，不需要实时位置） */
  sendHandoff(target: string, payload: HandoffPayload): void;
  /** 收到别人递过来的卡片 */
  onHandoff(listener: (payload: HandoffPayload) => void): void;
  /** 某个窗口关掉了 */
  onPeerGone(listener: (id: string) => void): void;
  stop(): void;
}

const CHANNEL_NAME = "neko-live";
/** 心跳间隔，以及多久没动静就当对面关了 */
const BEAT_MS = 4000;
const PEER_TIMEOUT_MS = 12_000;
/**
 * 窗口被搬动时浏览器不给任何事件，只能隔一阵看一眼坐标变没变。
 * 1 秒一次读两个属性，开销可以忽略，摆好窗口对面的排位就跟上了
 */
const MOVE_POLL_MS = 1000;
/** 退化成 localStorage 中转时，每个窗口占一个 key，前缀区分于站里别的数据 */
const STORAGE_PREFIX = "neko-live-msg-";

type LiveMessage =
  | { kind: "hello"; peer: PeerInfo; cards: string[] }
  | { kind: "bye"; id: string; cards: string[] }
  /** 有人要拎卡了，问一句大家现在都在屏幕哪儿 */
  | { kind: "where" }
  /** 卡马上要扔过来了，先打个招呼 */
  | { kind: "incoming"; from: string; to: string; edge: LiveEdge }
  /** 卡正飘在大桌面上（拖动中高频发，只有 BroadcastChannel 那条路才发） */
  | { kind: "roam"; from: string; point: RoamPoint }
  /** 松手了，这张卡正式搬到某扇窗口住 */
  | { kind: "move"; from: string; to: string; point: RoamPoint }
  | { kind: "handoff"; from: string; to: string; payload: HandoffPayload };

interface PeerRecord {
  info: PeerInfo;
  /** 上次听到它的时间，用来判断死活 */
  seen: number;
  /** 它上一条心跳里报的家当：万一它来不及说再见就没了，靠这个把卡还回去 */
  cards: string[];
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** 卡片是谁生的：id 形如 `<出生窗口id>-<种类>`,窗口 id 里不含短横线 */
function bornOf(cardId: string): string {
  return cardId.slice(0, cardId.lastIndexOf("-"));
}

/** 发消息前把响应式对象拍回普通对象：Vue 的代理过不了 postMessage 的结构化克隆 */
function plainCard(card: CardSpec): CardSpec {
  return { id: card.id, kind: card.kind };
}

function plainPoint(point: RoamPoint): RoamPoint {
  return { card: plainCard(point.card), x: point.x, y: point.y };
}

/** 消息通道：优先用原生 BroadcastChannel，不行就退回 localStorage + storage 事件 */
interface Wire {
  /** 高频位置消息撑不撑得住：BroadcastChannel 撑得住，localStorage 每写一次都要落盘不行 */
  live: boolean;
  post(message: LiveMessage): void;
  close(): void;
}

function createWire(onMessage: (message: LiveMessage) => void): Wire | null {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<LiveMessage>) => onMessage(event.data);
    return {
      live: true,
      post: (message) => {
        try {
          channel.postMessage(message);
        } catch {
          /* 通道已经关了就算了，联动本来是添头 */
        }
      },
      close: () => channel.close(),
    };
  }

  // 老浏览器、部分 WebView、被限制的 iframe 里没有 BroadcastChannel：
  // 改成每个窗口占一个 key 写自己那条消息（各写各的，不会互相覆盖），
  // 别的窗口监听整个前缀，靠 storage 事件收到（这个事件本来就不会发给自己）
  try {
    window.localStorage.setItem("neko-live-probe", "1");
    window.localStorage.removeItem("neko-live-probe");
  } catch {
    return null;
  }

  const key = `${STORAGE_PREFIX}${randomId()}`;
  let sequence = 0;
  const listener = (event: StorageEvent): void => {
    if (!event.key || !event.key.startsWith(STORAGE_PREFIX)) return;
    if (event.key === key || !event.newValue) return;
    try {
      onMessage(JSON.parse(event.newValue) as LiveMessage);
    } catch {
      /* 别人写的格式不对就算了 */
    }
  };
  window.addEventListener("storage", listener);

  return {
    live: false,
    post: (message) => {
      try {
        // 值必须每次都不同，否则浏览器不会认为是"变化"，storage 事件就不发了
        window.localStorage.setItem(key, JSON.stringify({ ...message, seq: ++sequence }));
      } catch {
        /* 存储写不进去（满了/被禁）就算了 */
      }
    },
    close: () => {
      window.removeEventListener("storage", listener);
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* 删不掉也没关系，就一个几十字节的键 */
      }
    },
  };
}

/** 不支持跨窗口通信（或跑在服务端、或者用户把互动关了）时给个空壳，调用方不用到处判空 */
export function idlePeerLink(): PeerLink {
  return {
    peerCount: ref(0),
    peerSides: ref({ ...NO_PEER_SIDES }),
    cards: ref<CardSpec[]>([]),
    liveRoam: false,
    hasPeers: () => false,
    windowRects: () => [],
    ownerAt: () => null,
    neighborTowards: () => null,
    refresh: () => undefined,
    warnIncoming: () => undefined,
    onIncoming: () => undefined,
    sendRoam: () => undefined,
    onRoam: () => undefined,
    sendMove: () => undefined,
    onCardArrive: () => undefined,
    onCardLeave: () => undefined,
    sendHandoff: () => undefined,
    onHandoff: () => undefined,
    onPeerGone: () => undefined,
    stop: () => undefined,
  };
}

export function startPeerLink(): PeerLink {
  if (typeof window === "undefined") return idlePeerLink();

  const selfId = randomId();
  const joinedAt = Date.now();
  /** 窗口位置大小每次现读：用户把窗口摆到新位置以后，排位不能还按打开时那会儿算 */
  const selfInfo = (): PeerInfo => ({
    id: selfId,
    x: Math.round(window.screenX),
    y: Math.round(window.screenY),
    w: window.innerWidth,
    h: window.innerHeight,
    at: joinedAt,
  });

  /** 我这扇窗口生的两张卡，窗口没了它们也就没了 */
  const bornCards: CardSpec[] = [
    { id: `${selfId}-neko`, kind: "neko" },
    { id: `${selfId}-online`, kind: "online" },
  ];
  /** 眼下住在我这儿的卡（含别人搬过来的）；普通数组，往外发之前再拍成普通对象 */
  let held: CardSpec[] = [...bornCards];

  const peers = new Map<string, PeerRecord>();
  const handoffListeners: Array<(payload: HandoffPayload) => void> = [];
  const goneListeners: Array<(id: string) => void> = [];
  const incomingListeners: Array<(edge: LiveEdge) => void> = [];
  const roamListeners: Array<(point: RoamPoint) => void> = [];
  const arriveListeners: Array<(point: RoamPoint) => void> = [];
  const leaveListeners: Array<(cardId: string) => void> = [];
  const peerCount = ref(0);
  const peerSides = ref<PeerSides>({ ...NO_PEER_SIDES });
  const cards = ref<CardSpec[]>([]);

  let wire: Wire | null = null;

  const post = (message: LiveMessage): void => wire?.post(message);

  /** 把手上这份家当同步给界面：猫排前面、在线猫排后面 */
  function syncCards(): void {
    cards.value = [...held]
      .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
      .map(plainCard);
  }

  /** 收下一张卡（搬家搬来的，或者主人没了被收回来的） */
  function holdCard(card: CardSpec, point?: { x: number; y: number }): void {
    if (held.some((item) => item.id === card.id)) return;
    held = [...held, plainCard(card)];
    syncCards();
    if (!point) return;
    const arrived: RoamPoint = { card: plainCard(card), x: point.x, y: point.y };
    arriveListeners.forEach((listener) => listener(arrived));
  }

  /** 放走一张卡：搬去别的窗口，或者随主窗口一起消失 */
  function dropCard(cardId: string): void {
    if (!held.some((item) => item.id === cardId)) return;
    held = held.filter((item) => item.id !== cardId);
    syncCards();
    leaveListeners.forEach((listener) => listener(cardId));
  }

  /** 这些卡眼下没人要了：是我生的就自己收回来，别人生的等它的出生窗口去收 */
  function reclaim(cardIds: string[]): void {
    cardIds.forEach((cardId) => {
      const home = bornCards.find((card) => card.id === cardId);
      if (home) holdCard(home);
    });
  }

  const postHello = (): void =>
    post({ kind: "hello", peer: selfInfo(), cards: held.map((card) => card.id) });

  const dropPeer = (id: string, cards?: string[]): void => {
    const record = peers.get(id);
    if (!record) return;
    peers.delete(id);
    peerCount.value = peers.size;
    syncSides();
    // 它生的卡随它一起消失，不管现在住在谁家
    held.filter((card) => bornOf(card.id) === id).forEach((card) => dropCard(card.id));
    // 它手里别人的卡失去了主人，各自的出生窗口负责收回去
    reclaim(cards && cards.length > 0 ? cards : record.cards);
    goneListeners.forEach((listener) => listener(id));
  };

  /**
   * 数一数别的窗口都散在我哪几边，好告诉用户"四周还有几只猫在看着"。
   * 拿窗口中心比：中心落到我这扇窗口左沿以外就算在左边，上下同理，
   * 所以摆成一排、上下叠着、斜对角散着，都能数得清楚
   */
  function syncSides(): void {
    const self = selfInfo();
    const sides: PeerSides = { ...NO_PEER_SIDES };

    for (const { info } of peers.values()) {
      const x = info.x + info.w / 2;
      const y = info.y + info.h / 2;
      if (x < self.x) sides.left += 1;
      else if (x > self.x + self.w) sides.right += 1;
      if (y < self.y) sides.above += 1;
      else if (y > self.y + self.h) sides.below += 1;
    }

    peerSides.value = sides;
  }

  function handleMessage(message: LiveMessage): void {
    if (!message || typeof message !== "object") return;

    if (message.kind === "hello") {
      const peer = message.peer;
      if (!peer || peer.id === selfId) return;
      const known = peers.has(peer.id);
      peers.set(peer.id, {
        info: peer,
        seen: Date.now(),
        cards: Array.isArray(message.cards) ? message.cards : [],
      });
      peerCount.value = peers.size;
      syncSides();
      // 万一两边都以为同一张卡在自己手上（消息丢了才会发生），按窗口 id 定：
      // 小的那个留下，大的那个让出去，这样两边算出来的是同一个结果
      if (Array.isArray(message.cards) && peer.id < selfId) {
        message.cards
          .filter((cardId) => held.some((card) => card.id === cardId))
          .forEach(dropCard);
      }
      // 头一次见就自报家门，让对面也把我记上；已经认识就不用再回，免得互相刷
      if (!known) postHello();
      return;
    }

    // 有人要拎卡了，赶紧报一下自己现在的位置和家当
    if (message.kind === "where") {
      postHello();
      return;
    }

    if (message.kind === "bye") {
      dropPeer(message.id, Array.isArray(message.cards) ? message.cards : undefined);
      return;
    }

    if (message.kind === "incoming") {
      if (message.to === selfId) {
        incomingListeners.forEach((listener) => listener(message.edge));
      }
      return;
    }

    // 隔壁的卡正飘着，谁的地盘谁把它画出来；发起方不用看自己那条
    if (message.kind === "roam") {
      if (message.from === selfId) return;
      roamListeners.forEach((listener) => listener(message.point));
      return;
    }

    // 松手了，这张卡搬到哪扇窗口就归哪扇窗口渲染
    if (message.kind === "move") {
      if (message.to === selfId) holdCard(message.point.card, message.point);
      return;
    }

    if (message.kind === "handoff") {
      // 递卡是点名给某个窗口的，别人收到只当没看见
      if (message.to !== selfId) return;
      handoffListeners.forEach((listener) => listener(message.payload));
    }
  }

  wire = createWire(handleMessage);
  if (!wire) return createIdleLink();
  const activeWire = wire;
  syncCards();

  const beat = window.setInterval(() => {
    const now = Date.now();
    [...peers.entries()].forEach(([id, record]) => {
      if (now - record.seen > PEER_TIMEOUT_MS) dropPeer(id);
    });
    postHello();
  }, BEAT_MS);

  /** 自己这扇窗口挪了窝或者被拉伸了：报一遍新位置新大小，顺便重数四周的邻居 */
  const reportFrame = (): void => {
    postHello();
    syncSides();
  };

  // 窗口被搬动时没有任何事件，只能隔一阵看一眼坐标有没有变，变了就立刻告诉别人
  let seenX = Math.round(window.screenX);
  let seenY = Math.round(window.screenY);
  // 没有邻居时没人关心我摆在屏幕哪儿，这一轮连坐标都不用读；
  // 有人来了靠心跳认识彼此，那时候再开始盯着自己的位置
  const moveWatch = window.setInterval(() => {
    if (peers.size === 0) return;
    const x = Math.round(window.screenX);
    const y = Math.round(window.screenY);
    if (x === seenX && y === seenY) return;
    seenX = x;
    seenY = y;
    reportFrame();
  }, MOVE_POLL_MS);

  // 拉伸窗口时 resize 会连着来一串，等手停下来再报一次就够
  let resizeTimer = 0;
  const onResize = (): void => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(reportFrame, 200);
  };

  const sayBye = (): void =>
    post({ kind: "bye", id: selfId, cards: held.map((card) => card.id) });
  // 窗口真关掉时来不及发消息，能发就发
  window.addEventListener("pagehide", sayBye);
  window.addEventListener("resize", onResize);
  postHello();

  const toRect = (info: PeerInfo, self: boolean): WindowRect => ({
    id: info.id,
    x: info.x,
    y: info.y,
    w: info.w,
    h: info.h,
    self,
  });

  const covers = (rect: WindowRect, x: number, y: number): boolean =>
    x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;

  /** 所有窗口占的屏幕区域（含自己） */
  const windowRects = (): WindowRect[] => [
    toRect(selfInfo(), true),
    ...Array.from(peers.values(), (record) => toRect(record.info, false)),
  ];

  return {
    peerCount,
    peerSides,
    cards,
    liveRoam: activeWire.live,
    hasPeers: () => peers.size > 0,
    windowRects,
    ownerAt: (x, y) => {
      const rects = windowRects();
      // 自己的地盘优先认给自己，别人压在上面也先当自己的
      return (
        rects.find((rect) => rect.self && covers(rect, x, y)) ??
        rects.find((rect) => covers(rect, x, y)) ??
        null
      );
    },
    neighborTowards: (edge) => {
      const self = selfInfo();
      const horizontal = edge === "left" || edge === "right";
      /** 让开的距离：两块屏幕叠着的时候是负数，越小说明贴得越近 */
      const gap = (peer: PeerInfo): number => {
        if (edge === "left") return self.x - (peer.x + peer.w);
        if (edge === "right") return peer.x - (self.x + self.w);
        if (edge === "top") return self.y - (peer.y + peer.h);
        return peer.y - (self.y + self.h);
      };
      // 只看确实在那一侧的：窗口是斜着摆的也算，只要中心过了中线
      const mine = horizontal ? self.x + self.w / 2 : self.y + self.h / 2;
      const toward = Array.from(peers.values(), (record) => record.info).filter((peer) => {
        const theirs = horizontal ? peer.x + peer.w / 2 : peer.y + peer.h / 2;
        return edge === "right" || edge === "bottom" ? theirs > mine : theirs < mine;
      });

      return toward.sort((a, b) => gap(a) - gap(b) || a.at - b.at)[0] ?? null;
    },
    refresh: () => {
      postHello();
      post({ kind: "where" });
      syncSides();
    },
    warnIncoming: (target, edge) =>
      post({ kind: "incoming", from: selfId, to: target, edge }),
    onIncoming: (listener) => incomingListeners.push(listener),
    sendRoam: (point) => post({ kind: "roam", from: selfId, point: plainPoint(point) }),
    onRoam: (listener) => roamListeners.push(listener),
    sendMove: (target, point) => {
      post({ kind: "move", from: selfId, to: target, point: plainPoint(point) });
      dropCard(point.card.id);
    },
    onCardArrive: (listener) => arriveListeners.push(listener),
    onCardLeave: (listener) => leaveListeners.push(listener),
    sendHandoff: (target, payload) =>
      post({
        kind: "handoff",
        from: selfId,
        to: target,
        payload: { ...payload, card: plainCard(payload.card) },
      }),
    onHandoff: (listener) => handoffListeners.push(listener),
    onPeerGone: (listener) => goneListeners.push(listener),
    stop: () => {
      window.clearInterval(beat);
      window.clearInterval(moveWatch);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("pagehide", sayBye);
      window.removeEventListener("resize", onResize);
      sayBye();
      activeWire.close();
      handoffListeners.length = 0;
      goneListeners.length = 0;
      incomingListeners.length = 0;
      roamListeners.length = 0;
      arriveListeners.length = 0;
      leaveListeners.length = 0;
      peers.clear();
      peerCount.value = 0;
      peerSides.value = { ...NO_PEER_SIDES };
      cards.value = [];
    },
  };
}
