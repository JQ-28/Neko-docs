// 深色模式萤火虫：夜里飘几颗缓慢明灭的光点，浅色模式不出现。
// 只是氛围，所以固定在最底层且不拦截任何指针事件。

const FIREFLY_COUNT = 9;
const FIELD_CLASS = "neko-firefly-field";
const DOT_CLASS = "neko-firefly";

interface FireflySeed {
  /** 水平起始位置（百分比） */
  x: number;
  /** 垂直起始位置（百分比） */
  y: number;
  /** 漂移幅度（像素） */
  drift: number;
  /** 单个循环耗时（秒） */
  duration: number;
  /** 入场延迟（秒），错开明灭节奏 */
  delay: number;
  /** 光点直径（像素） */
  size: number;
}

function createSeed(index: number): FireflySeed {
  // 用序号做伪随机，保证每次刷新分布不同但同一批内不重叠
  const seed = Math.sin(index * 12.9898) * 43758.5453;
  const ratio = seed - Math.floor(seed);
  const second = Math.sin(index * 78.233) * 12345.6789;
  const ratio2 = second - Math.floor(second);
  return {
    x: 6 + ratio * 88,
    y: 12 + ratio2 * 76,
    drift: 14 + ratio2 * 26,
    duration: 9 + ratio * 7,
    delay: -ratio2 * 9,
    size: 2 + ratio2 * 2.5,
  };
}

function createDot(seed: FireflySeed): HTMLElement {
  const dot = document.createElement("span");
  dot.className = DOT_CLASS;
  dot.style.setProperty("--firefly-x", `${seed.x.toFixed(1)}%`);
  dot.style.setProperty("--firefly-y", `${seed.y.toFixed(1)}%`);
  dot.style.setProperty("--firefly-drift", `${seed.drift.toFixed(0)}px`);
  dot.style.setProperty("--firefly-duration", `${seed.duration.toFixed(1)}s`);
  dot.style.setProperty("--firefly-delay", `${seed.delay.toFixed(1)}s`);
  dot.style.setProperty("--firefly-size", `${seed.size.toFixed(1)}px`);
  return dot;
}

export function setupFirefly(): () => void {
  if (typeof document === "undefined") return () => {};
  // 常驻氛围动画，尊重系统的减少动效设置
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  const field = document.createElement("div");
  field.className = FIELD_CLASS;
  field.setAttribute("aria-hidden", "true");
  for (let index = 0; index < FIREFLY_COUNT; index += 1) {
    field.appendChild(createDot(createSeed(index)));
  }
  document.body.appendChild(field);

  return () => field.remove();
}
