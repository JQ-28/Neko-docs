import { nextTick, ref } from "vue";
import { markEgg } from "../eggs/egg-utils";

// 喵语模式：全站可见文字统一追加「喵」
const STORAGE_KEY = "neko-miao";

const isMiao = ref(false);

try {
  isMiao.value = localStorage.getItem(STORAGE_KEY) === "1";
} catch {
  // 隐私模式下存储不可用，保持默认正常语言
}

// 记录处理前的原文，切回正常语言时原样还原
const originalText = new WeakMap<Text, string>();

function applyMiaoText(): void {
  if (typeof document === "undefined") return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null = null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  for (const textNode of nodes) {
    const value = textNode.nodeValue ?? "";
    if (!value.trim()) continue;
    // 组件可显式声明「这段文字别管」（如每帧重写的打字机），否则每改一次就被追加一个喵
    // 代码块同样跳过：它是给人原样复制的内容，被加上尾巴就废了（脚本、指令示例、可粘走的文案都在这类里）
    if (textNode.parentElement?.closest("[data-miao-skip], pre")) continue;
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
  if (isMiao.value) markEgg("miaoMode");
  try {
    localStorage.setItem(STORAGE_KEY, isMiao.value ? "1" : "0");
  } catch {
    // 存储不可用时仅本次会话内生效
  }
  applyMiaoClass();
  // 先等 Vue 把依赖状态的组件文案刷新完，再统一追加尾巴，避免被重渲染覆盖
  await nextTick();
  applyMiaoText();
}

// 路由切换/动态注入产生的新文本，处于喵语模式时补一次全量追加
export function applyMiaoTextToPage(): void {
  if (isMiao.value) applyMiaoText();
}

applyMiaoClass();
