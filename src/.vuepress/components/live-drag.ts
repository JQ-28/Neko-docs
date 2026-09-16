// 首页卡片拖拽里那些跟 DOM 没关系的东西：能拎多远、算不算扔出门、甩得多歪、
// 以及顺手统计的两个彩蛋动作。指针事件本身留在组件里，这里只放算式与状态。

import type { LiveEdge, RoamPoint } from "./live-peer";
import { EGG_THRESHOLDS } from "./neko-shared-eggs";

/** 拎到屏幕边上就停下，别把页面顶出横向滚动条。卡片拖起来会带上倾斜和放大，
    包围盒比原尺寸宽一圈，所以留的余量要够 */
export const DRAG_MARGIN = 16;
/** 手指拎起来时卡片往上浮多少：手指肚正好会盖住要丢的地方 */
export const DRAG_LIFT_PX = 30;
/** 顶边的余量：拎起来的那张浮在手指上方，上沿得按浮起来的高度留，
    否则一路往窗口顶部拖时卡片上沿会被裁掉一截（左右两侧不受影响） */
export const DRAG_TOP_MARGIN = Math.max(DRAG_MARGIN, DRAG_LIFT_PX);
/** 贴着边松手就当扔出去，但得先真的拖动过，轻轻一碰就贴边不算数 */
export const PRESS_MIN_TRAVEL_PX = 56;
/** 拎到窗口边上还能再往外推这么远，推过线就交给隔壁窗口 */
export const HANDOFF_PUSH_PX = 120;
/** 推过这么多就当场交出去，不用等松手 */
export const HANDOFF_GO_PX = 64;
/** 卡片从窗口外滑进来的起步深度：没真越界的就按这个量从边上滑 */
export const SLIDE_IN_OVER_PX = 48;
/** 卡片顶在窗口边上等着出手时，隔这么久跟对面打一次招呼（别刷屏） */
export const WARN_INTERVAL_MS = 2000;
/** 拖动中报位置：最快这个间隔发一次，位移不够也先攒着 */
export const ROAM_MIN_MS = 45;
export const ROAM_MIN_PX = 6;
/** 过路卡的「还在路上」有效期：这么久没收到新位置就收掉 */
export const ROAM_STALE_MS = 320;
/** 手移动多快就把猫甩多歪：单位是「每一像素/毫秒带多少度」，甩到头就封顶 */
const SWING_PER_SPEED = 6;
const SWING_MAX = 16;
/** 摇猫猫：折返一次至少要挪这么多像素，连续折返的时间窗口 */
const SHAKE_SWING_STEP = 20;
const SHAKE_SWING_WINDOW_MS = 900;
/** 叠猫猫：两张卡的中心离这么近就算叠上了 */
export const STACK_GAP_PX = 60;
/** 手（指针）贴到视口上/下边缘这么近，页面就自己滚起来（px）。窄屏上寄养处与
    「快速上手 / 拉进群」都在视口外，拖拽又被锁在视口内，不给自动滚页就够不到 */
export const EDGE_SCROLL_ZONE_PX = 60;
/** 自动滚页的速度：刚进边缘区最慢、贴到边缘线最快（px/帧，按 60fps 基准写） */
export const EDGE_SCROLL_MIN_PX = 8;
export const EDGE_SCROLL_MAX_PX = 12;
/** 60fps 一帧的毫秒数：低帧率下按实际帧间隔折算，滚动才不会一顿一顿 */
export const EDGE_SCROLL_FRAME_MS = 1000 / 60;

/** 一只手拎着的那张卡，从按下去到松手期间的所有现场 */
export interface DragState {
  pointerId: number;
  /** 手心里这张卡是谁（搬去别的窗口时靠它认身份） */
  cardId: string;
  kind: "neko" | "online";
  slot: HTMLElement;
  /** 真正抓住的那个元素，指针捕获挂在它身上 */
  handle: HTMLElement;
  startX: number;
  startY: number;
  /** 上一次移动的位置和时间，用来算甩动的速度 */
  lastX: number;
  lastMoveAt: number;
  /** 拎起来之前的位置和大小，用来算最多能拎多远 */
  baseLeft: number;
  baseTop: number;
  width: number;
  height: number;
  /** 最近一次算出来的位移，松手时用它判断猫是不是顶在窗口边上 */
  shiftX: number;
  shiftY: number;
  /** 手指头拎起来的：手机上看不见手指底下，卡片要浮上去一点 */
  touch: boolean;
}

/** 对面那条边：从左边进来的卡片，是从右边的窗口出去的 */
export const OPPOSITE_EDGE: Record<LiveEdge, LiveEdge> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

/** 把位移限制在屏幕内，猫拎到边上就停，页面也不会被顶宽。
    slack 是给跨窗口接力留的口子：边上还开着别的窗口时，允许再往外推一截 */
export function limitShift(
  shift: number,
  base: number,
  size: number,
  viewport: number,
  slack = 0
): number {
  const min = DRAG_MARGIN - base - slack;
  const max = Math.max(min, viewport - DRAG_MARGIN - base - size + slack);
  return Math.min(Math.max(shift, min), max);
}

/** 越出边界的距离：负数是从左边出去，正数是从右边出去，0 表示还在窗口里 */
export function overshootOf(
  shift: number,
  base: number,
  size: number,
  viewport: number
): number {
  const min = DRAG_MARGIN - base;
  const max = viewport - DRAG_MARGIN - base - size;
  if (shift < min) return shift - min;
  if (shift > max) return shift - max;
  return 0;
}

/** 卡片是不是已经顶到窗口边上了：贴着边松手就当扔出去，不必真的推越界 */
export function pressedEdge(state: DragState): LiveEdge | null {
  const minX = DRAG_MARGIN - state.baseLeft;
  const maxX = Math.max(
    minX,
    window.innerWidth - DRAG_MARGIN - state.baseLeft - state.width
  );
  // 手指拎的这张浮在手指上方，顶边那条线得跟着浮上去，不然它永远够不到顶边
  //（limitShift 那边留的余量与此处同一个数，两处必须一致）
  const minY = (state.touch ? DRAG_TOP_MARGIN : DRAG_MARGIN) - state.baseTop;
  const maxY = Math.max(
    minY,
    window.innerHeight - DRAG_MARGIN - state.baseTop - state.height
  );

  // 得先真的拖动过，轻轻一碰就贴边不算数
  if (state.shiftX <= minX + 1 && Math.abs(state.shiftX) >= PRESS_MIN_TRAVEL_PX) {
    return "left";
  }
  if (state.shiftX >= maxX - 1 && state.shiftX >= PRESS_MIN_TRAVEL_PX) {
    return "right";
  }
  if (state.shiftY <= minY + 1 && Math.abs(state.shiftY) >= PRESS_MIN_TRAVEL_PX) {
    return "top";
  }
  if (state.shiftY >= maxY - 1 && state.shiftY >= PRESS_MIN_TRAVEL_PX) {
    return "bottom";
  }
  return null;
}

/** 拿一个屏幕坐标去问：这地方贴着我哪条边（用来决定卡片从哪边滑进来） */
export function edgeFromPoint(x: number, y: number): LiveEdge {
  const localX = x - window.screenX;
  const localY = y - window.screenY;
  const dx = localX - window.innerWidth / 2;
  const dy = localY - window.innerHeight / 2;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "top" : "bottom";
}

/** 被拎着的卡片现在在大桌面的哪个位置（卡片中心点的屏幕绝对坐标） */
export function cardPointAbs(
  state: DragState,
  shiftX: number,
  shiftY: number
): RoamPoint {
  return {
    card: { id: state.cardId, kind: state.kind },
    x: Math.round(window.screenX + state.baseLeft + shiftX + state.width / 2),
    y: Math.round(window.screenY + state.baseTop + shiftY + state.height / 2),
  };
}

/** 手移动多快就把猫甩多歪 */
export function leanFromSpeed(speed: number): number {
  return Math.max(-SWING_MAX, Math.min(SWING_MAX, speed * SWING_PER_SPEED));
}

/** 拎着卡片的手贴到上/下边缘时这一帧该滚多少像素：负数往上、正数往下，0 表示不用滚。
    速度从边缘线往里线性递减，越贴边滚得越快；离开边缘带立刻回 0 */
export function edgeScrollSpeed(y: number, viewportHeight: number): number {
  const above = EDGE_SCROLL_ZONE_PX - y;
  if (above > 0) return -edgeScrollRate(above);
  const below = y - (viewportHeight - EDGE_SCROLL_ZONE_PX);
  if (below > 0) return edgeScrollRate(below);
  return 0;
}

/** 越进边缘带多深（0 到 ZONE_PX）：从最慢线性加到最快 */
function edgeScrollRate(depth: number): number {
  const ratio = Math.min(depth / EDGE_SCROLL_ZONE_PX, 1);
  return EDGE_SCROLL_MIN_PX + (EDGE_SCROLL_MAX_PX - EDGE_SCROLL_MIN_PX) * ratio;
}

/** 从某条边滑进来：先摆到窗口外，再把过渡交还给样式，让卡片自己跑回原位 */
export function slideInFrom(slot: HTMLElement, edge: LiveEdge, over: number): void {
  const rect = slot.getBoundingClientRect();
  const offscreenX =
    edge === "right"
      ? window.innerWidth + over - rect.left
      : edge === "left"
        ? -(rect.left + rect.width + over)
        : 0;
  const offscreenY =
    edge === "bottom"
      ? window.innerHeight + over - rect.top
      : edge === "top"
        ? -(rect.top + rect.height + over)
        : 0;

  slot.style.transition = "none";
  slot.style.translate = `${offscreenX}px ${offscreenY}px`;
  void slot.offsetWidth;
  slot.style.transition = "";
  slot.style.translate = "";
}

/** 拎着卡片时顺手统计的动作：摇猫猫（左右疯狂折返）、遛猫（拖过的总里程） */
export interface DragTrack {
  /** 每次拎起来重开一轮统计，遛猫的里程跨多次拖拽累计 */
  reset(positionX: number): void;
  /** 摇猫猫：折返够了就返回 true，由调用方去点亮彩蛋 */
  shake(positionX: number, now: number): boolean;
  /** 遛猫：累计里程够了就返回 true */
  walk(dx: number, dy: number): boolean;
}

export function createDragTrack(): DragTrack {
  /** 上次用于判定折返的位置 */
  let swingX = 0;
  let swingDirection = 0;
  let swings = 0;
  let swingAt = 0;
  /** 上次的目标位移，用来累计遛猫的行程 */
  let lastDx = 0;
  let lastDy = 0;
  /** 遛猫总里程，跨多次拖拽累计 */
  let walkedPx = 0;

  return {
    reset: (positionX) => {
      swingX = positionX;
      swingDirection = 0;
      swings = 0;
      swingAt = 0;
      lastDx = 0;
      lastDy = 0;
    },
    shake: (positionX, now) => {
      const delta = positionX - swingX;
      swingX = positionX;
      if (Math.abs(delta) < SHAKE_SWING_STEP) return false;

      const direction = delta > 0 ? 1 : -1;
      if (direction === swingDirection) return false;
      swingDirection = direction;
      swings = now - swingAt < SHAKE_SWING_WINDOW_MS ? swings + 1 : 1;
      swingAt = now;

      if (swings < EGG_THRESHOLDS.cardShakeSwings) return false;
      swings = 0;
      return true;
    },
    walk: (dx, dy) => {
      walkedPx += Math.hypot(dx - lastDx, dy - lastDy);
      lastDx = dx;
      lastDy = dy;
      if (walkedPx < EGG_THRESHOLDS.cardWalkPx) return false;
      walkedPx = 0;
      return true;
    },
  };
}
