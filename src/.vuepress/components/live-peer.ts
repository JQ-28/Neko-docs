// 跨窗口联动：同一个浏览器里开着两个 neko 页面时，让两边的猫能互相串门。
// 走 BroadcastChannel，只有同源、同一个浏览器的窗口才通得上，别的浏览器和设备看不到彼此。
//
// 浏览器不允许一个页面控制另一个窗口、也不允许把 DOM 拖过去，
// 所以「把猫丢到隔壁窗口」是这么实现的：这边把猫收起来，把落点告诉隔壁，隔壁从对应的边把它滑进来。

import { ref, type Ref } from "vue";

/** 隔壁窗口的自我介绍 */
export interface PeerInfo {
  id: string;
  /** 窗口在屏幕上的坐标，用来判断谁在谁左边 */
  x: number;
  y: number;
  /** 加入时间，屏幕坐标分不出左右时（比如叠在一起）按它排队 */
  at: number;
}

/** 卡片标识：左边那只是 Neko 本猫，右边是在线猫猫 */
export type LiveCardId = "neko" | "online";

/** 从哪条边出去/进来 */
export type LiveEdge = "left" | "right";

export interface HandoffPayload {
  card: LiveCardId;
  /** 卡片的去向：从自己这条边出去，也从对面这条边进来 */
  edge: LiveEdge;
  /** 交出去时越出边界多少像素，接手那边从同样的深度滑进来 */
  over: number;
}

/** 屏幕上左右两边各开着几个 neko 页面 */
export interface PeerSides {
  left: number;
  right: number;
}

export interface PeerLink {
  /** 隔壁还开着几个 neko 页面 */
  peerCount: Ref<number>;
  /** 左边几个、右边几个（按屏幕位置算，摆窗口时实时跟着变） */
  peerSides: Ref<PeerSides>;
  hasPeers(): boolean;
  /** 屏幕上就在那一侧、离自己最近的那个窗口 */
  neighborTowards(edge: LiveEdge): PeerInfo | null;
  /** 报一次自己现在的位置，并请大家都报一遍（拎猫前调，免得用着几秒前的旧位置找人） */
  refresh(): void;
  /** 顶到边上、马上要把猫扔过去了，先喊一嗓子让对面把猫叫醒 */
  warnIncoming(target: string, edge: LiveEdge): void;
  /** 隔壁喊话说猫要来了 */
  onIncoming(listener: (edge: LiveEdge) => void): void;
  /** 把卡片交给某个窗口 */
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
  post(message: LiveMessage): void;
  close(): void;
}

function createWire(onMessage: (message: LiveMessage) => void): Wire | null {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<LiveMessage>) => onMessage(event.data);
    return {
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
    peerSides: ref({ left: 0, right: 0 }),
    hasPeers: () => false,
    neighborTowards: () => null,
    refresh: () => undefined,
    warnIncoming: () => undefined,
    onIncoming: () => undefined,
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
  /** 窗口位置每次现读：用户把窗口摆到新位置以后，排位不能还按打开时那会儿算 */
  const selfInfo = (): PeerInfo => ({
    id: selfId,
    x: Math.round(window.screenX),
    y: Math.round(window.screenY),
    at: joinedAt,
  });
  const peers = new Map<string, PeerRecord>();
  const handoffListeners: Array<(payload: HandoffPayload) => void> = [];
  const goneListeners: Array<(id: string) => void> = [];
  const incomingListeners: Array<(edge: LiveEdge) => void> = [];
  const peerCount = ref(0);
  const peerSides = ref<PeerSides>({ left: 0, right: 0 });

  let wire: Wire | null = null;

  const post = (message: LiveMessage): void => wire?.post(message);

  const dropPeer = (id: string): void => {
    if (!peers.delete(id)) return;
    peerCount.value = peers.size;
    syncSides();
    goneListeners.forEach((listener) => listener(id));
  };

  const postHello = (): void => post({ kind: "hello", peer: selfInfo() });

  /** 所有窗口按「屏幕上从左到右」排队 */
  const line = (): PeerInfo[] =>
    [selfInfo(), ...Array.from(peers.values(), (record) => record.info)].sort(
      (a, b) => a.x - b.x || a.y - b.y || a.at - b.at
    );

  /** 数一数自己在队伍里的位置，好告诉用户"左边几只、右边几只" */
  function syncSides(): void {
    const queue = line();
    const index = queue.findIndex((peer) => peer.id === selfId);
    peerSides.value = {
      left: index < 0 ? 0 : index,
      right: index < 0 ? 0 : queue.length - 1 - index,
    };
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

  // 窗口被搬动时没有任何事件，只能隔一阵看一眼坐标有没有变，变了就立刻告诉别人
  let seenX = Math.round(window.screenX);
  let seenY = Math.round(window.screenY);
  const moveWatch = window.setInterval(() => {
    const x = Math.round(window.screenX);
    const y = Math.round(window.screenY);
    if (x === seenX && y === seenY) return;
    seenX = x;
    seenY = y;
    postHello();
    syncSides();
  }, MOVE_POLL_MS);

  const sayBye = (): void => post({ kind: "bye", id: selfId });
  // 窗口真关掉时来不及发消息，能发就发
  window.addEventListener("pagehide", sayBye);
  postHello();

  return {
    peerCount,
    peerSides,
    hasPeers: () => peers.size > 0,
    neighborTowards: (edge) => {
      const queue = line();
      const index = queue.findIndex((peer) => peer.id === selfId);
      if (index < 0) return null;
      const next = edge === "right" ? queue[index + 1] : queue[index - 1];
      return next ?? null;
    },
    refresh: () => {
      postHello();
      post({ kind: "where" });
      syncSides();
    },
    warnIncoming: (target, edge) =>
      post({ kind: "incoming", from: selfId, to: target, edge }),
    onIncoming: (listener) => incomingListeners.push(listener),
    sendHandoff: (target, payload) =>
      post({ kind: "handoff", from: selfId, to: target, payload }),
    onHandoff: (listener) => handoffListeners.push(listener),
    onPeerGone: (listener) => goneListeners.push(listener),
    stop: () => {
      window.clearInterval(beat);
      window.clearInterval(moveWatch);
      window.removeEventListener("pagehide", sayBye);
      sayBye();
      activeWire.close();
      handoffListeners.length = 0;
      goneListeners.length = 0;
      incomingListeners.length = 0;
      peers.clear();
      peerCount.value = 0;
      peerSides.value = { left: 0, right: 0 };
    },
  };
}
