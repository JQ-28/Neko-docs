import { nextTick, ref } from "vue";

// 喵语模式：全站可见文字统一追加「喵」，代码/指令/输入类保持原样
const STORAGE_KEY = "neko-miao";
const CHANGE_EVENT = "neko-miao-change";

const isMiao = ref(false);

try {
  isMiao.value = localStorage.getItem(STORAGE_KEY) === "1";
} catch {
  // 隐私模式下存储不可用，保持默认正常语言
}

const EXCLUDED_TAGS = new Set([
  "CODE",
  "PRE",
  "KBD",
  "SAMP",
  "SCRIPT",
  "STYLE",
  "TEXTAREA",
]);

// 可点击复制的指令按钮：文字即命令本体，不能加尾巴
const EXCLUDED_CLASSES = ["cheatsheet-cmd", "home-feat-cmd", "neko-card-cmd"];

// 记录处理前的原文，切回正常语言时原样还原
const originalText = new WeakMap<Text, string>();

function skipNode(textNode: Text): boolean {
  let node: Node | null = textNode;
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement;
    if (EXCLUDED_TAGS.has(element.tagName)) return true;
    if (element.classList && EXCLUDED_CLASSES.some((name) => element.classList.contains(name))) {
      return true;
    }
    node = element.parentNode;
  }
  return false;
}

function applyMiaoText(): void {
  if (typeof document === "undefined") return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null = null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  for (const textNode of nodes) {
    const value = textNode.nodeValue ?? "";
    if (!value.trim() || skipNode(textNode)) continue;
    if (isMiao.value) {
      if (originalText.has(textNode)) continue;
      originalText.set(textNode, value);
      // 已带喵的句子不重复追加
      if (!value.includes("喵")) textNode.nodeValue = `${value}喵`;
    } else {
      const original = originalText.get(textNode);
      if (original !== undefined) {
        textNode.nodeValue = original;
        originalText.delete(textNode);
      }
    }
  }
}

function applyMiaoClass(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("miao-speak", isMiao.value);
}

export { isMiao };

export async function toggleMiao(): Promise<void> {
  isMiao.value = !isMiao.value;
  try {
    localStorage.setItem(STORAGE_KEY, isMiao.value ? "1" : "0");
  } catch {
    // 存储不可用时仅本次会话内生效
  }
  applyMiaoClass();
  // 先等 Vue 把依赖状态的组件文案刷新完，再统一追加尾巴，避免被重渲染覆盖
  await nextTick();
  applyMiaoText();
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

// 路由切换/动态注入产生的新文本，处于喵语模式时补一次全量追加
export function applyMiaoTextToPage(): void {
  if (isMiao.value) applyMiaoText();
}

export function onMiaoChange(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

applyMiaoClass();
