<template>
  <div class="timeline-item">
    <div class="timeline-marker">
      <div class="timeline-dot"></div>
    </div>
    <div class="timeline-content">
      <div class="timeline-date">{{ date }}</div>
      <div class="timeline-images" @mouseover="handleImageHover">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  mounted() {
    // 为所有图片添加描述浮层包装
    const images = this.$el.querySelectorAll('.timeline-images img');
    images.forEach(img => {
      if (!img.parentElement.classList.contains('img-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'img-wrapper';
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
        
        const overlay = document.createElement('div');
        overlay.className = 'img-overlay';
        overlay.textContent = img.alt || '';
        wrapper.appendChild(overlay);
      }
    });
  },
  methods: {
    handleImageHover() {
      // 可以添加额外的交互逻辑
    }
  }
}
</script>

<script setup>
defineProps({
  date: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.timeline-item {
  display: flex;
  margin-bottom: 40px;
  position: relative;
}

.timeline-marker {
  position: relative;
  margin-right: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeline-dot {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #f9bdeb 0%, #c5d8f8 100%);
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(249, 189, 235, 0.2);
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
  animation: pulse 2s ease-in-out infinite;
}

.timeline-dot::before {
  content: '';
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 100px;
  background: linear-gradient(180deg, 
    rgba(249, 189, 235, 0.3) 0%, 
    rgba(197, 216, 248, 0.3) 50%,
    rgba(232, 213, 248, 0.3) 100%
  );
  z-index: -1;
}

.timeline-item:hover .timeline-dot {
  transform: scale(1.3);
  box-shadow: 0 0 0 8px rgba(249, 189, 235, 0.4);
  animation: none;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 4px rgba(249, 189, 235, 0.2);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(249, 189, 235, 0.1);
  }
}

.timeline-content {
  flex: 1;
  animation: fadeInUp 0.6s ease;
}

.timeline-date {
  font-size: 18px;
  font-weight: 600;
  color: #f9bdeb;
  margin-bottom: 15px;
  display: inline-block;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(249, 189, 235, 0.1) 0%, rgba(197, 216, 248, 0.1) 100%);
  border-radius: 20px;
  border-left: 3px solid #f9bdeb;
}

/* 深色模式 - 日期 */
html.dark .timeline-date {
  color: #fdd6f1;
  background: linear-gradient(135deg, rgba(249, 189, 235, 0.2) 0%, rgba(197, 216, 248, 0.2) 100%);
  border-left-color: #fdd6f1;
}

.timeline-images {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  align-items: flex-start;
}

/* 深色模式 - 图片容器 */
html.dark .timeline-images {
  background: rgba(0, 0, 0, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.timeline-images:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(249, 189, 235, 0.2);
}

html.dark .timeline-images:hover {
  box-shadow: 0 6px 20px rgba(249, 189, 235, 0.4);
}

/* 图片包装器 */
.timeline-images :deep(.img-wrapper) {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

html.dark .timeline-images :deep(.img-wrapper) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.timeline-images :deep(.img-wrapper:hover) {
  transform: translateY(-5px) scale(1.03);
  box-shadow: 0 6px 20px rgba(249, 189, 235, 0.4);
  z-index: 10;
}

html.dark .timeline-images :deep(.img-wrapper:hover) {
  box-shadow: 0 6px 20px rgba(249, 189, 235, 0.6);
}

.timeline-images :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  transition: all 0.3s ease;
}

.timeline-images :deep(.img-wrapper:hover img) {
  filter: brightness(0.9);
}

/* 图片描述浮层 */
.timeline-images :deep(.img-overlay) {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  color: white;
  padding: 15px 10px 10px;
  font-size: 14px;
  text-align: center;
  opacity: 0;
  transform: translateY(100%);
  transition: all 0.3s ease;
}

.timeline-images :deep(.img-wrapper:hover .img-overlay) {
  opacity: 1;
  transform: translateY(0);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .timeline-item {
    margin-bottom: 30px;
  }

  .timeline-marker {
    margin-right: 15px;
  }

  .timeline-dot {
    width: 12px;
    height: 12px;
    box-shadow: 0 0 0 3px rgba(249, 189, 235, 0.2);
  }

  .timeline-dot::before {
    top: 12px;
    height: 60px;
  }
  
  .timeline-date {
    font-size: 15px;
    padding: 6px 12px;
  }
  
  .timeline-images {
    padding: 12px;
    gap: 10px;
    justify-content: center;
  }

  .timeline-images :deep(.img-overlay) {
    font-size: 12px;
    padding: 10px 8px 8px;
  }
}

/* 小屏幕（手机竖屏）*/
@media (max-width: 480px) {
  .timeline-item {
    margin-bottom: 25px;
  }

  .timeline-marker {
    margin-right: 10px;
  }

  .timeline-dot {
    width: 10px;
    height: 10px;
  }

  .timeline-dot::before {
    top: 10px;
    height: 50px;
  }

  .timeline-date {
    font-size: 14px;
    padding: 5px 10px;
  }

  .timeline-images {
    padding: 10px;
    gap: 8px;
    justify-content: center;
  }

  .timeline-images :deep(img) {
    max-width: 150px;
  }

  .timeline-images :deep(.img-overlay) {
    font-size: 11px;
    padding: 8px 6px 6px;
  }

  /* 移动端触摸优化 */
  .timeline-images :deep(.img-wrapper) {
    -webkit-tap-highlight-color: transparent;
  }

  /* 移动端也显示描述（点击） */
  .timeline-images :deep(.img-wrapper:active .img-overlay) {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

