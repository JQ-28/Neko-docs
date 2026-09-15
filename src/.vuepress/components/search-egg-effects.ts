import { showEggTip } from "./egg-utils";

/* 搜索彩蛋的文档站反馈：对齐功能站行为（666 数字雨、摸鱼倒计时、404 跳转、喵气泡） */

const RAIN_COUNT = 14;
const MIAO_COUNT = 12;
const SPAWN_LIFETIME_MS = 3600;
const NOT_FOUND_JUMP_DELAY_MS = 1200;

const MOYER_WEEKEND_LINES = [
  "今天是休息日呀喵！摸什么鱼，去晒太阳吧～",
  "周末还惦记上班喵？快去玩，neko批准了！",
];
const MOYER_OFF_LINES = [
  "早就下班啦喵！还想钓neko吗？",
  "下班时间摸鱼是合法的喵～不过已经没有班可摸了哦！",
];
const MOYER_ON_DUTY_LINES = [
  "摸鱼倒计时喵～距离下班还有 {h} 小时 {m} 分钟！",
  "坚持住喵！还有 {h} 小时 {m} 分钟就下班啦～",
  "下班倒计时启动喵：{h} 小时 {m} 分钟！摸鱼要低调哦～",
];

const pickLine = (lines: string[]): string => lines[Math.floor(Math.random() * lines.length)] ?? lines[0];

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* 随机位置/延时/时长撒一把字符，动画结束后自清理 */
function spawnRain(className: string, text: () => string, minSize: number, maxSize: number): void {
  for (let i = 0; i < RAIN_COUNT; i++) {
    const el = document.createElement("span");
    el.className = className;
    el.textContent = text();
    el.style.left = `${(4 + Math.random() * 88).toFixed(2)}vw`;
    el.style.animationDuration = `${(1.1 + Math.random() * 0.9).toFixed(2)}s`;
    el.style.animationDelay = `${(Math.random() * 0.7).toFixed(2)}s`;
    el.style.fontSize = `${Math.floor(minSize + Math.random() * (maxSize - minSize))}px`;
    document.body.appendChild(el);
    window.setTimeout(() => el.remove(), SPAWN_LIFETIME_MS);
  }
}

function sixRain(): void {
  if (prefersReducedMotion()) return;
  spawnRain("neko-six-rain", () => "666", 20, 38);
}

function miaoBurst(): void {
  if (prefersReducedMotion()) return;
  for (let i = 0; i < MIAO_COUNT; i++) {
    const el = document.createElement("span");
    el.className = "neko-miao-rise";
    el.textContent = Math.random() < 0.5 ? "🐾" : "喵";
    el.style.left = `${(4 + Math.random() * 90).toFixed(2)}vw`;
    el.style.setProperty("--flip", Math.random() < 0.5 ? "-1" : "1");
    el.style.animationDuration = `${(1.6 + Math.random() * 1.1).toFixed(2)}s`;
    el.style.animationDelay = `${(Math.random() * 0.8).toFixed(2)}s`;
    el.style.fontSize = `${Math.floor(18 + Math.random() * 16)}px`;
    document.body.appendChild(el);
    window.setTimeout(() => el.remove(), SPAWN_LIFETIME_MS);
  }
  const pop = document.createElement("span");
  pop.className = "neko-miao-pop";
  pop.textContent = "喵呜～";
  document.body.appendChild(pop);
  window.setTimeout(() => pop.remove(), 1400);
}

/* 与功能站同款摸鱼倒计时：周末劝玩、下班劝退、在班报剩余时间 */
function moyerLine(): string {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return pickLine(MOYER_WEEKEND_LINES);
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes >= 18 * 60) return pickLine(MOYER_OFF_LINES);
  const left = 18 * 60 - minutes;
  const hours = Math.floor(left / 60);
  const mins = left % 60;
  return pickLine(MOYER_ON_DUTY_LINES).replace("{h}", String(hours)).replace("{m}", String(mins));
}

function scheduleNotFoundJump(): void {
  window.setTimeout(() => {
    window.location.href = "/404";
  }, NOT_FOUND_JUMP_DELAY_MS);
}

export function playSearchEggEffect(id: string): void {
  if (typeof document === "undefined") return;
  if (id === "s666") sixRain();
  else if (id === "moyer") showEggTip(moyerLine());
  else if (id === "s404") scheduleNotFoundJump();
  else if (id === "sMiao") miaoBurst();
}
