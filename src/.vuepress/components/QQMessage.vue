<template>
  <div :class="['qq-message', align]">
    <div v-if="align === 'left'" class="qq-avatar" :style="{ backgroundImage: `url(${avatar})` }"></div>
    <div class="qq-text">
      <slot></slot>
    </div>
    <div v-if="align === 'right'" class="qq-avatar" :style="{ backgroundImage: `url(${avatar})` }"></div>
  </div>
</template>

<script setup>
defineProps({
  align: {
    type: String,
    default: 'left',
    validator: (value) => ['left', 'right', 'mid'].includes(value)
  },
  avatar: {
    type: String,
    default: '/assets/icon/robot.svg'
  }
})
</script>

