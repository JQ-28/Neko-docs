---
title: 添加至群聊
icon: /assets/icon/circle-nodes.svg
index: false
pageview: true
copyright: false
# 一个页面可以有多个分类
category:
  - 邀群
footer: Neko docs - 邀群
---

<style scoped>
.section-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 48px auto;
  max-width: 600px;
  padding: 0 20px;
}

.divider-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, transparent, #ffc0e3, transparent);
  position: relative;
}

.divider-line::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: #ffc0e3;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(255, 192, 227, 0.6);
}

.divider-text {
  font-size: 16px;
  font-weight: 600;
  color: #ffa8d5;
  white-space: nowrap;
  padding: 8px 20px;
  background: linear-gradient(135deg, rgba(255, 192, 227, 0.15), rgba(168, 213, 255, 0.15));
  border-radius: 20px;
  border: 2px solid #ffc0e3;
  position: relative;
  overflow: hidden;
}

.divider-text::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

html.dark .divider-line {
  background: linear-gradient(to right, transparent, #ffd4ea, transparent);
}

html.dark .divider-line::before {
  background: #ffd4ea;
  box-shadow: 0 0 12px rgba(255, 212, 234, 0.8);
}

html.dark .divider-text {
  color: #ffc0e3;
  background: linear-gradient(135deg, rgba(255, 192, 227, 0.2), rgba(168, 213, 255, 0.2));
  border-color: #ffc0e3;
}

@media (max-width: 768px) {
  .section-divider {
    margin: 32px auto;
    gap: 12px;
  }

  .divider-text {
    font-size: 14px;
    padding: 6px 16px;
  }
}
</style>

<QQChat title="如何领养小猫咪?">
  <QQMessage align="right" avatar="https://drive.nekodayo.top/raw/nekodocs/image/neko11.jpg">
    <div>我想邀请Neko来我的群聊玩，请问应该怎么弄鸭</div>
  </QQMessage>
  
  <QQMessage align="left" avatar="http://q2.qlogo.cn/headimg_dl?dst_uin=480352716&spec=640">
    <div>填写问卷或者下面的表单都可以喵~审核通过后我会让Neko来加群或者你加Neko好友后发送邀群链接</div>
  </QQMessage>
  
  <QQMessage align="right" avatar="https://drive.nekodayo.top/raw/nekodocs/image/neko11.jpg">
    <div>好的好的，在哪里填写呢？</div>
  </QQMessage>
  
  <QQMessage align="left" avatar="http://q2.qlogo.cn/headimg_dl?dst_uin=480352716&spec=640">
    <div>问卷和表单都在下面哦~ 填写完我会尽快审核的喵</div>
  </QQMessage>
  
  <QQImage 
    align="left" 
    avatar="http://q2.qlogo.cn/headimg_dl?dst_uin=480352716&spec=640"
    src="https://drive.nekodayo.top/raw/nekodocs/image/poster.webp"
    alt="芝士问卷"
  />

  <QQMessage align="left" avatar="http://q2.qlogo.cn/headimg_dl?dst_uin=480352716&spec=640">
    <div>⚠️ BOT曾经加过的群可以直接邀请，无需重复申请</div>
  </QQMessage>

  <QQMessage align="left" avatar="http://q2.qlogo.cn/headimg_dl?dst_uin=480352716&spec=640">
    <div>⚠️ 未经允许请不要擅自将BOT拉进群聊</div>
  </QQMessage>
</QQChat>

<div class="section-divider">
  <div class="divider-line"></div>
  <div class="divider-text">在线申请</div>
  <div class="divider-line"></div>
</div>

<ApplyForm />