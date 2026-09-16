// 首页 hero 副标题的打字机：逐字打出 → 停留 → 逐字删掉 → 重来。
// 只在首页 hero 存在时接管，且用 data 标记防止重复接管（hero 会随路由重建）。

const TAGLINE_SELECTOR = ".vp-hero-description";
const BOUND_KEY = "nekoTyping";
const TYPE_MS = 88;
const HOLD_MS = 2600;
const ERASE_MS = 38;
const RESTART_MS = 520;

/** 接管成功时返回清理函数；不在首页或已被接管时返回 null */
export function setupTypingTagline(): (() => void) | null {
  if (typeof document === "undefined") return null;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

  const el = document.querySelector<HTMLElement>(TAGLINE_SELECTOR);
  if (!el || el.dataset[BOUND_KEY] === "1") return null;

  const source = (el.textContent ?? "").trim();
  if (!source) return null;

  el.dataset[BOUND_KEY] = "1";
  // 文本每帧都在变，若不排除喵语追加，每个字都会被再补一个「喵」
  el.setAttribute("data-miao-skip", "");
  el.classList.add("neko-typing");

  let index = 0;
  let erasing = false;
  let timer = 0;

  const tick = (): void => {
    if (!erasing) {
      index += 1;
      el.textContent = source.slice(0, index);
      if (index >= source.length) {
        erasing = true;
        timer = window.setTimeout(tick, HOLD_MS);
        return;
      }
      timer = window.setTimeout(tick, TYPE_MS);
      return;
    }

    index -= 1;
    el.textContent = source.slice(0, Math.max(index, 0));
    if (index <= 0) {
      erasing = false;
      timer = window.setTimeout(tick, RESTART_MS);
      return;
    }
    timer = window.setTimeout(tick, ERASE_MS);
  };

  timer = window.setTimeout(tick, TYPE_MS);

  return () => {
    window.clearTimeout(timer);
    el.textContent = source;
    el.classList.remove("neko-typing");
    el.removeAttribute("data-miao-skip");
    delete el.dataset[BOUND_KEY];
  };
}
