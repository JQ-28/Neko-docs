// 跨窗口联动：同一个浏览器里开着两个 neko 页面时，让两边的猫能互相串门。
// 走 BroadcastChannel，只有同源、同一个浏览器的窗口才通得上，别的浏览器和设备看不到彼此。
//
// 浏览器不允许一个页面控制另一个窗口、也不允许把 DOM 拖过去，
// 所以「把猫丢到隔壁窗口」是这么实现的：这边把猫收起来，把落点告诉隔壁，隔壁从对应的边把它滑进来。

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

/** 卡片标识：左边那只是 Neko 本猫，右边是在线猫猫 */
export type LiveCardId = "neko" | "online";

/** 卡片往哪条边出去/进来 */
export type LiveEdge = "left" | "right" | "top" | "bottom";

export interface HandoffPayload {
  card: LiveCardId;
  /** 卡片的去向：从自己这条边出去，也从对面这条边进来 */
  edge: LiveEdge;
  /** 交出去时越出边界多少像素，接手那边从同样的深度滑进来 */
  over: number;
}

/** 猫在大桌面上的位置（屏幕绝对坐标，跨显示器也是同一套坐标系） */
export interface RoamPoint {
  card: LiveCardId;
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

export interface PeerLink {
  /** 隔壁还开着几个 neko 页面 */
  peerCount: Ref<number>;
  /** 左边几个、右边几个（按屏幕位置算，摆窗口时实时跟着变） */
  peerSides: Ref<PeerSides>;
  /** 能不能做实时漫游：高频位置消息只有 BroadcastChannel 撑得住，localStorage 那条路只能等松手才传 */
  readonly liveRoam: boolean;
  hasPeers(): boolean;
  /** 所有窗口占的屏幕区域（含自己） */
  windowRects(): WindowRect[];
  /** 这个屏幕坐标现在落在谁的窗口里（含自己；谁都没盖住就是 null） */
  ownerAt(x: number, y: number): WindowRect | null;
  /** 屏幕上就在那一侧、离自己最近的那个窗口 */
  neighborTowards(edge: LiveEdge): PeerInfo | null;
  /** 报一次自己现在的位置，并请大家都报一遍（拎猫前调，免得用着几秒前的旧位置找人） */
  refresh(): void;
  /** 顶到边上、马上要把猫扔过去了，先喊一嗓子让对面把猫叫醒 */
  warnIncoming(target: string, edge: LiveEdge): void;
  /** 隔壁喊话说猫要来了 */
  onIncoming(listener: (edge: LiveEdge) => void): void;
  /** 拖动中：报一下猫现在飘在大桌面的哪个位置，让各个窗口接着往下传 */
  sendRoam(point: RoamPoint): void;
  /** 隔壁的猫正路过我这儿 */
  onRoam(listener: (point: RoamPoint) => void): void;
  /** 松手：把猫落到某个窗口手里 */
  sendDrop(target: string, point: RoamPoint): void;
  /** 隔壁把猫丢到我这儿了 */
  onDrop(listener: (point: RoamPoint) => void): void;
  /** 把卡片交给某个窗口（贴边松手那条路用，不需要实时位置） */
  sendHandoff(target: string, payload: HandoffPayload): void;
  /** 收到别人递过来的卡片 */
  onHandoff(listener: (payload: HandoffPayload) => void): void;
  /** 某个窗口关掉了（它手里可能还揣着我的猫） */
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
  | { kind: "hello"; peer: PeerInfo }
  | { kind: "bye"; id: string }
  /** 有人要拎猫了，问一句大家现在都在屏幕哪儿 */
  | { kind: "where" }
  /** 猫马上要扔过来了，先打个招呼 */
  | { kind: "incoming"; from: string; to: string; edge: LiveEdge }
  /** 猫正飘在大桌面上（拖动中高频发，只有 BroadcastChannel 那条路才发） */
  | { kind: "roam"; from: string; point: RoamPoint }
  /** 松手了，猫落在某块屏幕里 */
  | { kind: "drop"; from: string; to: string; point: RoamPoint }
  | { kind: "handoff"; from: string; to: string; payload: HandoffPayload };

interface PeerRecord {
  info: PeerInfo;
  /** 上次听到它的时间，用来判断死活 */
  seen: number;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
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

/** 不支持跨窗口通信（或跑在服务端）时给个空壳，调用方不用到处判空 */
function createIdleLink(): PeerLink {
  return {
    peerCount: ref(0),
    peerSides: ref({ ...NO_PEER_SIDES }),
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
    sendDrop: () => undefined,
    onDrop: () => undefined,
    sendHandoff: () => undefined,
    onHandoff: () => undefined,
    onPeerGone: () => undefined,
    stop: () => undefined,
  };
}

export function startPeerLink(): PeerLink {
  if (typeof window === "undefined") return createIdleLink();

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
  const peers = new Map<string, PeerRecord>();
  const handoffListeners: Array<(payload: HandoffPayload) => void> = [];
  const goneListeners: Array<(id: string) => void> = [];
  const incomingListeners: Array<(edge: LiveEdge) => void> = [];
  const roamListeners: Array<(point: RoamPoint) => void> = [];
  const dropListeners: Array<(point: RoamPoint) => void> = [];
  const peerCount = ref(0);
  const peerSides = ref<PeerSides>({ ...NO_PEER_SIDES });

  let wire: Wire | null = null;

  const post = (message: LiveMessage): void => wire?.post(message);

  const dropPeer = (id: string): void => {
    if (!peers.delete(id)) return;
    peerCount.value = peers.size;
    syncSides();
    goneListeners.forEach((listener) => listener(id));
  };

  const postHello = (): void => post({ kind: "hello", peer: selfInfo() });

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
      peers.set(peer.id, { info: peer, seen: Date.now() });
      peerCount.value = peers.size;
      syncSides();
      // 头一次见就自报家门，让对面也把我记上；已经认识就不用再回，免得互相刷
      if (!known) postHello();
      return;
    }

    // 有人要拎猫了，赶紧报一下自己现在的位置
    if (message.kind === "where") {
      postHello();
      return;
    }

    if (message.kind === "bye") {
      dropPeer(message.id);
      return;
    }

    if (message.kind === "incoming") {
      if (message.to === selfId) {
        incomingListeners.forEach((listener) => listener(message.edge));
      }
      return;
    }

    // 隔壁的猫正飘着，谁的地盘谁把它画出来；发起方不用看自己那条
    if (message.kind === "roam") {
      if (message.from === selfId) return;
      roamListeners.forEach((listener) => listener(message.point));
      return;
    }

    // 松手了，猫落在哪块屏幕里就归谁接
    if (message.kind === "drop") {
      if (message.to !== selfId) return;
      dropListeners.forEach((listener) => listener(message.point));
      return;
    }

    if (message.kind === "handoff") {
      // 递猫是点名给某个窗口的，别人收到只当没看见
      if (message.to !== selfId) return;
      handoffListeners.forEach((listener) => listener(message.payload));
    }
  }

  wire = createWire(handleMessage);
  if (!wire) return createIdleLink();
  const activeWire = wire;

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
  const moveWatch = window.setInterval(() => {
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

  const sayBye = (): void => post({ kind: "bye", id: selfId });
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
    sendRoam: (point) => post({ kind: "roam", from: selfId, point }),
    onRoam: (listener) => roamListeners.push(listener),
    sendDrop: (target, point) => post({ kind: "drop", from: selfId, to: target, point }),
    onDrop: (listener) => dropListeners.push(listener),
    sendHandoff: (target, payload) =>
      post({ kind: "handoff", from: selfId, to: target, payload }),
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
      dropListeners.length = 0;
      peers.clear();
      peerCount.value = 0;
      peerSides.value = { ...NO_PEER_SIDES };
    },
  };
}
