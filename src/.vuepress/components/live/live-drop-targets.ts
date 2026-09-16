/** 首页上「普通的元素」也能当落点：拎着卡片扫过什么，就按它是什么认一句。
 *
 * 以前只有自己标了 `data-drop` 的元素接得住（标题、功能卡、最近更新、跳转位、寄养处），
 * 别处一律没反应。这里改成按**类别**归类，不逐个元素手写 —— 首页上任何东西都接得住，
 * 以后加了新板块也不用再改这份清单。
 *
 * 纯 DOM 判定，不碰 Vue、不碰台词（台词在 live-lines.ts 的 ANY_DROP_LINES 里）。
 */

export type DropCategory =
  | "link"
  | "heading"
  | "image"
  | "code"
  | "list"
  | "button"
  | "nav"
  | "footer"
  | "text"
  | "other";

/** 全部类别（体检脚本照着它核对台词池有没有漏项） */
export const DROP_CATEGORIES: readonly DropCategory[] = [
  "link",
  "heading",
  "image",
  "code",
  "list",
  "button",
  "nav",
  "footer",
  "text",
  "other",
];

/** 越靠前越先认。同一层里可能几个都命中（比如 hero 上那个既是 <a> 又是按钮的胶囊），
    顺序就是取舍：胶囊当按钮、导航里的条目当链接 */
const RULES: readonly { category: DropCategory; selector: string }[] = [
  // 回顶按钮：它本来就是「回到顶部」，猫放上去就真的送你上去
  { category: "button", selector: ".vp-back-to-top-button, .vp-hero-action, [role='button'], button" },
  { category: "code", selector: "pre, code, kbd, samp, .home-feat-cmd" },
  { category: "heading", selector: "h1, h2, h3, h4, h5, h6, .home-intro-title, .vp-page-title" },
  { category: "image", selector: "img, picture, .vp-hero-image, .vp-hero-mask" },
  { category: "list", selector: "li" },
  { category: "link", selector: "a[href]" },
  // 只认导航栏本体：hero 那块信息容器本身也是个 <header>，写 header 会把它算成导航
  { category: "nav", selector: "nav, .vp-navbar, .vp-navbar-container, .vp-navbar-items" },
  { category: "footer", selector: "footer, .vp-footer" },
  { category: "text", selector: "p, blockquote, figcaption, .home-feat-desc, .home-more" },
];

/** 兜底那一层给的反馈对象：往上找回一个有点面积的容器，别去抖一个行内小字 */
const BLOCK_FALLBACK = "section, article, aside, nav, main, form, table, ul, ol, div";

/** 兜底的块最多能有多大（占视口面积的比例）。首页上最近的那层块状容器往往是整块 hero，
    再往上就是整段首页 —— 拖到空白处会给整屏描蓝框，只认不超过这个比例的 */
const MAX_FALLBACK_AREA_RATIO = 0.6;

/** 最近的 HTML 祖先：命中的是内联 SVG（导航栏的画笔图标、公告的关闭叉、CTA 胶囊里的小图标）
    时，反馈不能打在 `<svg>` / `<path>` 上 —— outline 与那几条动画都是给 HTML 元素写的。
    少了这一步，压在这些图标上一点反应都没有，而旁边挪 20 像素又有 */
export function nearestHtml(el: Element): HTMLElement | null {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (node instanceof HTMLElement) return node;
  }
  return null;
}

/** 认不出类别时的反馈对象：往上找最近的、面积不超限的块状容器。
    最近那层就已经比视口还大（整块 hero / 整段首页）就不再往上找，直接退回命中元素自己 */
function fallbackBlock(hit: Element): HTMLElement | null {
  const limit = window.innerWidth * window.innerHeight * MAX_FALLBACK_AREA_RATIO;
  for (let el: Element | null = hit; el && el !== document.body; el = el.parentElement) {
    if (!el.matches(BLOCK_FALLBACK)) continue;
    const rect = el.getBoundingClientRect();
    const area = rect.width * rect.height;
    // 零高度的包裹层（子元素全靠绝对定位撑着）：描上去看不见，接着往上找
    if (area === 0) continue;
    if (area > limit) break;
    return nearestHtml(el);
  }
  return nearestHtml(hit);
}

/** 落点归到哪个元素上：反馈（描边、弹一下）要打在整块东西上，不是那一粒小字上。
    归类与挑反馈元素是同一次向上遍历 —— 认到类别之后，再把这一层收到最近的 HTML 祖先 */
export function resolveDropTarget(hit: Element | null): { el: HTMLElement; category: DropCategory } | null {
  if (!hit) return null;
  for (let node: Element | null = hit; node && node !== document.body; node = node.parentElement) {
    const el = node;
    const rule = RULES.find((item) => el.matches(item.selector));
    if (!rule) continue;
    const target = nearestHtml(el);
    return target ? { el: target, category: rule.category } : null;
  }
  const block = fallbackBlock(hit);
  return block ? { el: block, category: "other" } : null;
}

/** 主题那个「回到顶部」按钮 */
export function isBackToTop(el: Element | null): boolean {
  return el?.closest(".vp-back-to-top-button") != null;
}
