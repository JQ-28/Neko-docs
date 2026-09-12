<template>
  <div class="command-copy-card">
    <span class="command-copy-label">群内发送</span>
    <code class="command-copy-text">{{ command }}</code>
    <button type="button" class="command-copy-btn" @click="copy">复制</button>
  </div>
</template>

<script setup lang="ts">
import { copyText, showTip } from "./copy-utils";

const props = defineProps<{ command: string }>();

function copy(): void {
  copyText(props.command)
    .then(() => showTip("指令已复制"))
    .catch(() => showTip("复制失败"));
}
</script>

<style scoped>
.command-copy-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  margin: 16px 0;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(127, 176, 255, 0.14), rgba(255, 158, 213, 0.14));
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 24px rgba(127, 176, 255, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.command-copy-label {
  flex: none;
  font-size: 12px;
  color: #7fb0ff;
  font-weight: 700;
}

.command-copy-text {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: #666;
  word-break: break-all;
}

.command-copy-btn {
  flex: none;
  padding: 5px 14px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(144deg, #ffc0e3, #a8d5ff);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.16s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)), opacity 0.2s;
}

.command-copy-btn:hover {
  opacity: 0.85;
}

.command-copy-btn:active {
  transform: scale(0.95);
}

html.dark .command-copy-card {
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

html.dark .command-copy-text {
  color: #e6e8ee;
}
</style>
