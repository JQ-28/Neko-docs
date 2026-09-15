// 鼠标轨迹爪印：指针划过处留下一串渐隐的小爪印，朝向跟随移动方向。
// 只在带指针的悬停设备上启用，且同时存在的爪印有上限，避免长时间滑动堆积元素。

const PAW_CLASS = "neko-paw";
/** 两次落印的最小间隔（毫秒） */
const MIN_INTERVAL_MS = 70;
/** 两次落印的最小位移（像素），原地抖动不落印 */
const MIN_DISTANCE_PX = 30;
/** 同时存在的爪印上限 */
const PAW_MAX = 16;
/** 单个爪印存活时长（毫秒） */
const PAW_LIFE_MS = 880;

function spawnPaw(x: number, y: number, moveX: number, moveY: number): void {
  const paw = document.createElement("span");
  paw.className = PAW_CLASS;
  paw.setAttribute("aria-hidden", "true");
  const rotation = (Math.atan2(moveY, moveX) * 180) / Math.PI + 90;
  paw.style.left = `${x}px`;
  paw.style.top = `${y}px`;
  paw.style.setProperty("--paw-rotate", `${rotation.toFixed(0)}deg`);
  paw.style.setProperty("--paw-scale", (0.72 + Math.random() * 0.3).toFixed(2));
  document.body.appendChild(paw);
  window.setTimeout(() => paw.remove(), PAW_LIFE_MS);
}

export function setupPawTrail(): () => void {
  if (typeof window === "undefined") return () => {};
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  let lastTime = 0;
  let lastX = 0;
  let lastY = 0;
  let alive = 0;
  let primed = false;

  const onMouseMove = (event: MouseEvent): void => {
    const moveX = event.clientX - lastX;
    const moveY = event.clientY - lastY;
    const first = !primed;
    primed = true;
    if (first) {
      lastX = event.clientX;
      lastY = event.clientY;
      return;
    }
    const now = performance.now();
    if (now - lastTime < MIN_INTERVAL_MS) return;
    if (Math.hypot(moveX, moveY) < MIN_DISTANCE_PX) return;
    lastTime = now;
    lastX = event.clientX;
    lastY = event.clientY;
    if (alive >= PAW_MAX) return;
    alive += 1;
    spawnPaw(event.clientX, event.clientY, moveX, moveY);
    window.setTimeout(() => {
      alive -= 1;
    }, PAW_LIFE_MS);
  };

  document.addEventListener("mousemove", onMouseMove, { passive: true });
  return () => document.removeEventListener("mousemove", onMouseMove);
}
