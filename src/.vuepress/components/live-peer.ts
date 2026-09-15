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

export interface PeerLink {
  /** 隔壁还开着几个 neko 页面 */
  peerCount: Ref<number>;
  hasPeers(): boolean;
  /** 屏幕上就在那一侧、离自己最近的那个窗口 */
  neighborTowards(edge: LiveEdge): PeerInfo | null;
  /** 报一次自己现在的位置，并请大家都报一遍（拎猫前调，免得用着几秒前的旧位置找人） */
  refresh(): void;
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

type LiveMessage =
  | { kind: "hello"; peer: PeerInfo }
  | { kind: "bye"; id: string }
  /** 有人要拎猫了，问一句大家现在都在屏幕哪儿 */
  | { kind: "where" }
  | { kind: "handoff"; from: string; to: string; payload: HandoffPayload };

interface PeerRecord {
  info: PeerInfo;
  /** 上次听到它的时间，用来判断死活 */
  seen: number;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** 不支持跨窗口通信（或跑在服务端）时给个空壳，调用方不用到处判空 */
function createIdleLink(): PeerLink {
  return {
    peerCount: ref(0),
    hasPeers: () => false,
    neighborTowards: () => null,
    refresh: () => undefined,
    sendHandoff: () => undefined,
    onHandoff: () => undefined,
    onPeerGone: () => undefined,
    stop: () => undefined,
  };
}

export function startPeerLink(): PeerLink {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return createIdleLink();
  }

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
  const peerCount = ref(0);

  const channel = new BroadcastChannel(CHANNEL_NAME);

  const post = (message: LiveMessage): void => {
    try {
      channel.postMessage(message);
    } catch {
      /* 通道已经关了就算了，联动本来是添头 */
    }
  };

  const dropPeer = (id: string): void => {
    if (!peers.delete(id)) return;
    peerCount.value = peers.size;
    goneListeners.forEach((listener) => listener(id));
  };

  const postHello = (): void => post({ kind: "hello", peer: selfInfo() });

  channel.onmessage = (event: MessageEvent<LiveMessage>) => {
    const message = event.data;
    if (!message || typeof message !== "object") return;

    if (message.kind === "hello") {
      const peer = message.peer;
      if (!peer || peer.id === selfId) return;
      const known = peers.has(peer.id);
      peers.set(peer.id, { info: peer, seen: Date.now() });
      peerCount.value = peers.size;
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

    if (message.kind === "handoff") {
      // 递猫是点名给某个窗口的，别人收到只当没看见
      if (message.to !== selfId) return;
      handoffListeners.forEach((listener) => listener(message.payload));
    }
  };

  const beat = window.setInterval(() => {
    const now = Date.now();
    [...peers.entries()].forEach(([id, record]) => {
      if (now - record.seen > PEER_TIMEOUT_MS) dropPeer(id);
    });
    postHello();
  }, BEAT_MS);

  const sayBye = (): void => post({ kind: "bye", id: selfId });
  // 窗口真关掉时来不及发消息，能发就发
  window.addEventListener("pagehide", sayBye);
  postHello();

  /** 所有窗口按「屏幕上从左到右」排队 */
  const line = (): PeerInfo[] =>
    [selfInfo(), ...Array.from(peers.values(), (record) => record.info)].sort(
      (a, b) => a.x - b.x || a.y - b.y || a.at - b.at
    );

  return {
    peerCount,
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
    },
    sendHandoff: (target, payload) =>
      post({ kind: "handoff", from: selfId, to: target, payload }),
    onHandoff: (listener) => handoffListeners.push(listener),
    onPeerGone: (listener) => goneListeners.push(listener),
    stop: () => {
      window.clearInterval(beat);
      window.removeEventListener("pagehide", sayBye);
      sayBye();
      channel.close();
      handoffListeners.length = 0;
      goneListeners.length = 0;
      peers.clear();
      peerCount.value = 0;
    },
  };
}
