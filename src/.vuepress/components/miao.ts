import { ref } from "vue";

// 喵语模式：全站界面文案在「正常/喵化」之间切换，正文内容不受影响
const STORAGE_KEY = "neko-miao";
const CHANGE_EVENT = "neko-miao-change";

const isMiao = ref(false);

try {
  isMiao.value = localStorage.getItem(STORAGE_KEY) === "1";
} catch {
  // 隐私模式下存储不可用，保持默认正常语言
}

export { isMiao };

function applyMiaoClass(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("miao-speak", isMiao.value);
}

export function toggleMiao(): void {
  isMiao.value = !isMiao.value;
  try {
    localStorage.setItem(STORAGE_KEY, isMiao.value ? "1" : "0");
  } catch {
    // 存储不可用时仅本次会话内生效
  }
  applyMiaoClass();
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

// 读取当前模式下的文案；模板中调用时会建立响应依赖，切换后自动更新
export function miao(normal: string, miaoed: string): string {
  return isMiao.value ? miaoed : normal;
}

// 供非组件代码（如 client.ts 动态注入的按钮）监听切换
export function onMiaoChange(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

applyMiaoClass();
