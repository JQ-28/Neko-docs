<template>
  <div :class="['qq-message', align]">
    <div v-if="align === 'left'" class="qq-avatar" :style="{ backgroundImage: `url(${avatar})` }"></div>
    <div class="qq-image-container">
      <img 
        :src="src" 
        :alt="alt" 
        class="qq-chat-image"
        @click="handleImageClick"
      />
    </div>
    <div v-if="align === 'right'" class="qq-avatar" :style="{ backgroundImage: `url(${avatar})` }"></div>
  </div>
</template>

<script setup>
defineProps({
  align: {
    type: String,
    default: 'left',
    validator: (value) => ['left', 'right'].includes(value)
  },
  avatar: {
    type: String,
    default: '/assets/icon/robot.svg'
  },
  src: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: '图片'
  }
})

const handleImageClick = (e) => {
  // 图片点击会自动触发 photo-swipe
}
</script>

<style scoped>
.qq-image-container {
  max-width: 180px;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
}

.qq-chat-image {
  display: block;
  width: 100%;
  height: auto;
  max-width: 180px;
  border-radius: 8px;
  transition: transform 0.2s;
}

.qq-chat-image:hover {
  transform: scale(1.02);
}
</style>

