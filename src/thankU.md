---
title: 感谢名单
icon: /assets/icon/heart.svg
pageview: true
copyright: false
footer: Neko docs - 感谢名单
---

<script setup lang="ts">
import { onMounted, ref } from "vue";

const BIRTH_YEAR = 2022;
const BIRTH_MONTH = 2;
const BIRTH_DAY = 22;

const ageText = ref("");

function formatAge(now: Date): string {
  let months = (now.getFullYear() - BIRTH_YEAR) * 12 + (now.getMonth() + 1 - BIRTH_MONTH);
  if (now.getDate() < BIRTH_DAY) months -= 1;
  if (months < 0) return "";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} 个月`;
  return rest === 0 ? `${years} 岁` : `${years} 岁 ${rest} 个月`;
}

// 挂载后再算：SSR 与客户端首帧都是空的，不会水合对不上
onMounted(() => {
  ageText.value = formatAge(new Date());
});
</script>

<style scoped>
/* ===== 玻璃卡片通用（参考功能站侧边栏一言卡片） ===== */
.glass-card {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, .3);
  box-shadow: 0 8px 24px rgba(127, 176, 255, .14), inset 0 1px 0 rgba(255, 255, 255, .4);
  transition: border-color .2s, transform .2s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)), box-shadow .2s;
}
.glass-card::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 158, 213, .42), rgba(127, 176, 255, .28), transparent);
  filter: blur(26px);
  opacity: .7;
  pointer-events: none;
  animation: aurora-bounce 7s infinite ease;
}
.glass-card::after {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: 9px;
  background: rgba(255, 255, 255, .16);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  outline: 2px solid rgba(255, 255, 255, .5);
  pointer-events: none;
}
.glass-card > * { position: relative; z-index: 2; }
.glass-card:hover {
  border-color: rgba(255, 158, 213, .55);
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(127, 176, 255, .2), inset 0 1px 0 rgba(255, 255, 255, .5);
}
@keyframes aurora-bounce {
  0%   { transform: translate(-100%, -100%) translate3d(0, 0, 0); }
  25%  { transform: translate(-100%, -100%) translate3d(120%, 0, 0); }
  50%  { transform: translate(-100%, -100%) translate3d(120%, 120%, 0); }
  75%  { transform: translate(-100%, -100%) translate3d(0, 120%, 0); }
  100% { transform: translate(-100%, -100%) translate3d(0, 0, 0); }
}

/* ===== 标题装饰图标 ===== */
.title-ico {
  width: 26px;
  height: 26px;
  vertical-align: -4px;
  margin-left: 6px;
}

/* ===== 赞助统计 ===== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin: 28px 0;
}
.stat-card {
  padding: 24px 16px 20px;
  text-align: center;
}
.stat-ico {
  width: 44px;
  height: 44px;
  margin: 0 auto 10px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(127, 176, 255, .18), rgba(255, 158, 213, .18));
  color: var(--brand-light, #7fb0ff);
  transition: transform .25s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
}
.stat-card:hover .stat-ico { transform: rotate(8deg) scale(1.12); }
.stat-ico img { width: 22px; height: 22px; }
.stat-card b {
  display: block;
  font-size: 1.9em;
  line-height: 1.2;
  font-weight: 800;
}
.stat-card p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #666;
}
html.dark .stat-card p { color: #9aa3b2; }

/* ===== 赞助者名单 ===== */
.names-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
  margin: 28px 0;
}
.name-card {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 13px 16px;
  font-size: 14px;
  color: #666;
  cursor: default;
}
.name-card::before { opacity: 0; transition: opacity .3s; }
.name-card:hover::before { opacity: .7; }
.name-card::after { display: none; }
.name-card img {
  width: 16px;
  height: 16px;
  flex: none;
  opacity: .85;
}
html.dark .name-card { color: #e6e8ee; }

/* ===== 底部支持按钮 ===== */
.support-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 30px;
  background: linear-gradient(135deg, #f9bdeb 0%, #c5d8f8 100%);
  color: white;
  text-decoration: none;
  border-radius: 25px;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(249, 189, 235, .3);
  transition: all .3s;
}
.support-btn:hover {
  opacity: .92;
  box-shadow: 0 6px 20px rgba(249, 189, 235, .45);
  transform: translateY(-2px);
}
.support-btn img { width: 16px; height: 16px; }

/* 卡片入场 */
.stat-card,
.name-card {
  animation: card-fade-up 0.24s ease-out both;
}
.name-card:nth-child(3n) {
  animation-delay: 40ms;
}
@keyframes card-fade-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .stat-card,
  .name-card {
    animation: none;
  }
}

/* 移动端 */
@media (max-width: 768px) {
  .stats-grid { gap: 12px; }
  .names-grid { gap: 10px; }
}
</style>

# 感谢名单 <img class="title-ico" src="https://api.iconify.design/mdi:heart-multiple.svg?color=%23f9bdeb" alt="heart">

:::info 致赞助者
她 2022 年 2 月 22 日出生，到今天已经陪大家走过四年多。名单上的每一个昵称，都是这段路上真实出现过的人。

谢谢你们。

Neko 的电费、网费、话费一直是 JQ 自己扛着的，日复一日。你们帮的这一把，实实在在让她能接着跑下去 —— 具体够她跑多久，我没敢细算，怕算完又想去找份活干（笑）。

她不需要很多，只是别让她因为"养不起"而停下来。谢谢你们一起分担了这件事 ฅ^•ﻌ•^ฅ
:::

***

## 赞助统计

<div class="stats-grid">
  <div class="stat-card glass-card">
    <span class="stat-ico"><img src="https://api.iconify.design/mdi:account-heart.svg?color=%237fb0ff" alt="sponsors"></span>
    <b style="color: #7fb0ff;">23</b>
    <p>位赞助者</p>
  </div>

  <div class="stat-card glass-card">
    <span class="stat-ico"><img src="https://api.iconify.design/mdi:hand-coin.svg?color=%2381c995" alt="money"></span>
    <b style="color: #81c995;">¥600+</b>
    <p>累计赞助</p>
  </div>

  <div class="stat-card glass-card">
    <span class="stat-ico"><img src="https://api.iconify.design/mdi:cake-variant.svg?color=%23f9bdeb" alt="age"></span>
    <b style="color: #f9bdeb;">{{ ageText }}</b>
    <p>她多大了</p>
  </div>
</div>

***

## 赞助者名单

排名不分先后 —— 这份名单只是按我手上记录的顺序排的 ww

<div class="names-grid">
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:heart-outline.svg?color=%23f9bdeb" alt="">心燃</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:star-four-points-outline.svg?color=%237fb0ff" alt="">Nớvậ、星辰</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:flower-outline.svg?color=%2381c995" alt="">宝宝你是一个大葱</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:heart-outline.svg?color=%23f9bdeb" alt="">世一晴</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:star-four-points-outline.svg?color=%237fb0ff" alt="">守宸</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:flower-outline.svg?color=%2381c995" alt="">巡林官小小提</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:heart-outline.svg?color=%23f9bdeb" alt="">八戒</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:star-four-points-outline.svg?color=%237fb0ff" alt="">yee~</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:flower-outline.svg?color=%2381c995" alt="">Al8sN</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:heart-outline.svg?color=%23f9bdeb" alt="">French wooden egg</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:star-four-points-outline.svg?color=%237fb0ff" alt="">奕迟</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:flower-outline.svg?color=%2381c995" alt="">Napart</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:heart-outline.svg?color=%23f9bdeb" alt="">彩叶</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:star-four-points-outline.svg?color=%237fb0ff" alt="">whiteLT</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:flower-outline.svg?color=%2381c995" alt="">孤枫</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:heart-outline.svg?color=%23f9bdeb" alt="">攸枫凝</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:star-four-points-outline.svg?color=%237fb0ff" alt="">Meow!</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:flower-outline.svg?color=%2381c995" alt="">✞Fu聚乙烯✞</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:heart-outline.svg?color=%23f9bdeb" alt="">isAe</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:star-four-points-outline.svg?color=%237fb0ff" alt="">Cloud_Yume</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:flower-outline.svg?color=%2381c995" alt="">迷途归</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:heart-outline.svg?color=%23f9bdeb" alt="">爱发电用户_86fb0</div>
  <div class="name-card glass-card"><img src="https://api.iconify.design/mdi:star-four-points-outline.svg?color=%237fb0ff" alt="">一般路过Youkia</div>
</div>

:::tip 说明
以上昵称均使用微信/QQ/支付宝/爱发电昵称\
如有遗漏，[找 JQ-28 说一声](/about/me) 就行，或者直接在群里 @ 一下 ww
:::

***

<div style="text-align: center; margin: 40px 0;">
  <p style="font-size: 18px; color: #666; margin-bottom: 15px; line-height: 1.8;">
    <strong>名单还会一直长下去</strong><br>
    下次加人时，希望上面有你 ฅ^•ﻌ•^ฅ
  </p>

  <p style="margin: 30px 0;">
    <a class="support-btn" href="/zanzhu">
      <img src="https://api.iconify.design/mdi:heart.svg?color=%23fff" alt="">
      我也想支持 Neko
    </a>
  </p>

  <p style="margin-top: 30px; font-style: italic; color: #aaa; font-size: 14px;">
    —— JQ-28
  </p>
</div>
