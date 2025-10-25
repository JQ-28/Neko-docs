<template>
  <div 
    class="qq-voice-bubble" 
    :class="{ playing: isPlaying }"
    @click="togglePlay"
  >
    <!-- 播放图标 -->
    <div class="voice-play-icon">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5v14l11-7z" fill="currentColor"/>
      </svg>
    </div>
    
    <!-- 音量指示器（点状） -->
    <div class="voice-dots">
      <span 
        v-for="i in 5" 
        :key="i" 
        class="voice-dot"
        :style="{ animationDelay: `${i * 0.1}s` }"
      ></span>
    </div>
    
    <!-- 时长显示 -->
    <div class="voice-duration">{{ duration }}"</div>
    
    <audio ref="audioPlayer" :src="src" @ended="onEnded"></audio>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  duration: {
    type: [String, Number],
    default: '3'
  }
})

const audioPlayer = ref(null)
const isPlaying = ref(false)

const togglePlay = () => {
  if (!audioPlayer.value) return
  
  if (isPlaying.value) {
    audioPlayer.value.pause()
    isPlaying.value = false
  } else {
    audioPlayer.value.play()
    isPlaying.value = true
  }
}

const onEnded = () => {
  isPlaying.value = false
}

onUnmounted(() => {
  if (audioPlayer.value) {
    audioPlayer.value.pause()
  }
})
</script>

<style scoped>
.qq-voice-bubble {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
  user-select: none;
  padding: 2px 0;
}

.qq-voice-bubble:active {
  opacity: 0.8;
}

/* 播放图标 */
.voice-play-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: #333;
}

.voice-play-icon svg {
  width: 18px;
  height: 18px;
}

/* 音量点状指示器 */
.voice-dots {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: 1;
}

.voice-dot {
  width: 4px;
  height: 4px;
  background: #333;
  border-radius: 50%;
  display: inline-block;
  opacity: 0.5;
}

/* 播放时的动画 */
.qq-voice-bubble.playing .voice-dot {
  animation: dot-pulse 1s ease-in-out infinite;
}

.qq-voice-bubble.playing .voice-dot:nth-child(1) {
  animation-delay: 0s;
}

.qq-voice-bubble.playing .voice-dot:nth-child(2) {
  animation-delay: 0.1s;
}

.qq-voice-bubble.playing .voice-dot:nth-child(3) {
  animation-delay: 0.2s;
}

.qq-voice-bubble.playing .voice-dot:nth-child(4) {
  animation-delay: 0.3s;
}

.qq-voice-bubble.playing .voice-dot:nth-child(5) {
  animation-delay: 0.4s;
}

@keyframes dot-pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.3);
  }
}

/* 时长显示 */
.voice-duration {
  color: #666;
  font-size: 13px;
  font-weight: 400;
  white-space: nowrap;
  flex-shrink: 0;
}
</style>

