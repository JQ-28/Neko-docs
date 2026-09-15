// 复制成功时的粒子迸射：从点击位置向外散出几颗小爪印，随即消失。

/** 所有复制入口 */
const BURST_SELECTOR = [
  ".cheatsheet-cmd",
  ".home-feat-cmd",
  ".v-copy-code-btn",
  ".command-copy-btn",
].join(", ");

const PARTICLE_COUNT = 7;
const LIFE_MS = 620;
const CLEANUP_DELAY_MS = 240;

function spawnBurst(x: number, y: number): void {
  const host = document.createElement("div");
  host.className = "neko-burst";
  host.style.left = `${x}px`;
  host.style.top = `${y}px`;
  host.setAttribute("aria-hidden", "true");

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const dot = document.createElement("span");
    dot.className = "neko-burst-dot";
    const angle = (Math.PI * 2 * index) / PARTICLE_COUNT + Math.random() * 0.4;
    const distance = 16 + Math.random() * 16;
    dot.style.setProperty("--burst-x", `${(Math.cos(angle) * distance).toFixed(1)}px`);
    dot.style.setProperty("--burst-y", `${(Math.sin(angle) * distance).toFixed(1)}px`);
    dot.style.setProperty("--burst-delay", `${(index * 14).toFixed(0)}ms`);
    dot.style.setProperty("--burst-scale", (0.7 + Math.random() * 0.5).toFixed(2));
    host.appendChild(dot);
  }

  document.body.appendChild(host);
  window.setTimeout(() => host.remove(), LIFE_MS + CLEANUP_DELAY_MS);
}

export function setupCopyBurst(): () => void {
  if (typeof document === "undefined") return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  const onClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest(BURST_SELECTOR)) return;
    spawnBurst(event.clientX, event.clientY);
  };

  // 捕获阶段监听，即便按钮自己阻止了冒泡也能拿到坐标
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
