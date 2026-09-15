// 指令卡 3D 倾斜：鼠标在卡片上移动时，卡片朝指针方向轻微倾斜，高光跟着指针走。
// 用事件委托实现，卡片被搜索过滤重建后依然生效，不必在组件里挂监听。

const CARD_SELECTOR = ".cheatsheet-card";
/** 卡片四角朝指针方向倾斜的最大角度（度） */
const MAX_TILT_DEG = 5;

function resetTilt(card: HTMLElement): void {
  card.classList.remove("is-tilting");
  card.style.removeProperty("--tilt-x");
  card.style.removeProperty("--tilt-y");
  card.style.removeProperty("--glare-x");
  card.style.removeProperty("--glare-y");
}

function applyTilt(card: HTMLElement, event: MouseEvent): void {
  const rect = card.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratioX = (event.clientX - rect.left) / rect.width - 0.5;
  const ratioY = (event.clientY - rect.top) / rect.height - 0.5;
  card.classList.add("is-tilting");
  card.style.setProperty("--tilt-y", `${(ratioX * MAX_TILT_DEG * 2).toFixed(2)}deg`);
  card.style.setProperty("--tilt-x", `${(-ratioY * MAX_TILT_DEG * 2).toFixed(2)}deg`);
  card.style.setProperty("--glare-x", `${((ratioX + 0.5) * 100).toFixed(1)}%`);
  card.style.setProperty("--glare-y", `${((ratioY + 0.5) * 100).toFixed(1)}%`);
}

export function setupCardTilt(): () => void {
  if (typeof window === "undefined") return () => {};
  // 触屏没有指针悬停，倾斜只会白算；偏好减少动效时整体不启用
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  let activeCard: HTMLElement | null = null;
  let frame = 0;
  let pendingEvent: MouseEvent | null = null;

  // mousemove 触发极密，合并到下一帧统一写样式，避免每移动一像素就排版
  const flush = (): void => {
    frame = 0;
    const event = pendingEvent;
    pendingEvent = null;
    if (!event) return;
    const target = event.target;
    const card =
      target instanceof Element ? target.closest<HTMLElement>(CARD_SELECTOR) : null;
    if (card !== activeCard) {
      if (activeCard) resetTilt(activeCard);
      activeCard = card;
    }
    if (card) applyTilt(card, event);
  };

  const onMouseMove = (event: MouseEvent): void => {
    pendingEvent = event;
    if (frame) return;
    frame = requestAnimationFrame(flush);
  };

  const onMouseOut = (event: MouseEvent): void => {
    if (!activeCard) return;
    const related = event.relatedTarget;
    if (related instanceof Node && activeCard.contains(related)) return;
    resetTilt(activeCard);
    activeCard = null;
  };

  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("mouseout", onMouseOut, { passive: true });

  return () => {
    if (frame) cancelAnimationFrame(frame);
    if (activeCard) resetTilt(activeCard);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseout", onMouseOut);
  };
}
