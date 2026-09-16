<template>
  <div :class="['qq-message', align]">
    <div v-if="align === 'left'" class="qq-avatar" :style="{ backgroundImage: `url(${avatar})` }"></div>
    <div class="qq-image-container">
      <img
        ref="imageEl"
        :src="src"
        :alt="alt"
        class="qq-chat-image"
        :class="{ loaded }"
        @load="loaded = true"
        @error="loaded = true"
      />
    </div>
    <div v-if="align === 'right'" class="qq-avatar" :style="{ backgroundImage: `url(${avatar})` }"></div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

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

const imageEl = ref(null)
const loaded = ref(false)

// 图片命中缓存时 load 事件可能早于挂载完成
onMounted(() => {
  if (imageEl.value?.complete) loaded.value = true
})
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
  opacity: 0;
  transition: transform 0.2s var(--ease-out, ease-out), opacity 0.3s var(--ease-out, ease-out);
}

.qq-chat-image.loaded {
  opacity: 1;
}

.qq-chat-image:hover {
  transform: scale(1.02);
}

.qq-chat-image:active {
  transform: scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .qq-chat-image {
    transition: none;
  }

  .qq-chat-image:hover,
  .qq-chat-image:active {
    transform: none;
  }
}
</style>
