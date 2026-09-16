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
  | "card"
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
  "card",
  "other",
];

/** 一张卡身上的小件（名字、小字、指示灯、气泡）：落到自己身上也有话说 */
const CARD_PARTS = ".home-live-slot, .home-live-card, .home-online, .home-live-name, .home-live-meta, .home-live-light, .home-live-bubble";

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
  { category: "card", selector: CARD_PARTS },
  { category: "text", selector: "p, blockquote, figcaption, .home-feat-desc, .home-more" },
];

/** 兜底那一层给的反馈对象：往上找回一个有点面积的容器，别去抖一个行内小字 */
const BLOCK_FALLBACK = "section, article, aside, nav, main, form, table, ul, ol, div";

/** 这个元素认成哪一类落点（认不出就是 other）。
    从命中元素一层层往上找，找到最近的一层为止 —— 所以点到 <a> 里那个 <span>，
    认的还是外面那个链接 */
export function classifyDropTarget(hit: Element | null): DropCategory {
  for (let el: Element | null = hit; el && el !== document.body; el = el.parentElement) {
    for (const rule of RULES) {
      if (el.matches(rule.selector)) return rule.category;
    }
  }
  return "other";
}

/** 落点归到哪个元素上：反馈（描边、弹一下）要打在整块东西上，不是那一粒小字上 */
export function resolveDropTarget(hit: Element | null): { el: HTMLElement; category: DropCategory } | null {
  if (!(hit instanceof HTMLElement)) return null;
  const category = classifyDropTarget(hit);
  if (category === "other") {
    const block = hit.closest<HTMLElement>(BLOCK_FALLBACK);
    return { el: block ?? hit, category };
  }
  // 往上找到第一个属于这个类别的元素：从 <p> 里那截 <strong> 认到的是外面那段话
  for (let el: Element | null = hit; el && el !== document.body; el = el.parentElement) {
    if (RULES.some((rule) => rule.category === category && el!.matches(rule.selector))) {
      return el instanceof HTMLElement ? { el, category } : null;
    }
  }
  return { el: hit, category };
}

/** 主题那个「回到顶部」按钮 */
export function isBackToTop(el: Element | null): boolean {
  return el?.closest(".vp-back-to-top-button") != null;
}
