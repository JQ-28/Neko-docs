<template>
  <div class="qq-chat-interface">
    <!-- 头部 -->
    <div class="qq-header">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" class="qq-back" viewBox="0 0 1024 1024">
        <path fill="#fff" d="M314.258 511.803c107.013 97.708 211.7 193.09 316.387 288.47l160.52 146.562c23.264 20.938 27.917 44.202 11.632 62.813-18.61 20.937-41.875 18.61-65.138-4.653-162.847-144.235-321.04-290.797-481.56-435.033-9.306-9.305-18.611-16.284-27.917-23.263-20.937-18.611-20.937-48.854-2.326-65.139l376.873-341.977c44.2-41.875 90.728-81.424 134.93-123.298 23.263-20.938 51.18-18.611 65.138 4.652 11.632 18.611 6.98 39.549-13.958 60.486C674.846 186.11 560.854 290.797 444.535 395.484c-41.875 34.896-83.75 74.444-130.277 116.319"></path>
      </svg>
      <div class="qq-title">{{ title }}</div>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="qq-options" viewBox="0 0 1024 1024">
        <path fill="#fff" d="M133.31 296.552h757.207c19.782 0 35.951-16.169 35.951-35.95s-15.997-35.952-35.95-35.952H133.31c-19.782 0-35.951 16.17-35.951 35.951 0 19.782 16.17 35.951 35.95 35.951M890.517 476.135H133.311c-19.782 0-35.951 16.17-35.951 35.951 0 19.782 16.17 35.951 35.95 35.951h757.207c19.782 0 35.951-16.17 35.951-35.951 0-19.782-16.17-35.95-35.95-35.95M890.517 727.448H133.311c-19.782 0-35.951 15.997-35.951 35.95s16.17 35.952 35.95 35.952h757.207c19.782 0 35.951-15.998 35.951-35.951s-16.17-35.951-35.95-35.951"></path>
      </svg>
    </div>

    <!-- 聊天内容区域 -->
    <div class="chat-container-border">
      <div class="chat-container">
        <div class="qq-chat-content">
          <slot></slot>
        </div>
      </div>
    </div>

    <!-- 输入栏 -->
    <div class="qq-input-bar">
      <input class="qq-input" readonly placeholder="输入消息..." />
      <button class="qq-send-button">发送</button>
    </div>

    <!-- 底部工具栏 -->
    <div class="qq-footer">
      <div class="qq-fas">
        <svg aria-hidden="true" focusable="false" class="svg-inline--fa" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
          <path fill="currentColor" d="M192 0C139 0 96 43 96 96V256c0 53 43 96 96 96s96-43 96-96V96c0-53-43-96-96-96zM64 216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 89.1 66.2 162.7 152 174.4V464H120c-13.3 0-24 10.7-24 24s10.7 24 24 24h72 72c13.3 0 24-10.7 24-24s-10.7-24-24-24H216V430.4c85.8-11.7 152-85.3 152-174.4V216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 70.7-57.3 128-128 128s-128-57.3-128-128V216z"></path>
        </svg>
      </div>
      <div>
        <svg aria-hidden="true" focusable="false" class="svg-inline--fa" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path fill="currentColor" d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zM323.8 202.5c-4.5-6.6-11.9-10.5-19.8-10.5s-15.4 3.9-19.8 10.5l-87 127.6L170.7 297c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6h96 32H424c8.9 0 17.1-4.9 21.2-12.8s3.6-17.4-1.4-24.7l-120-176zM112 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"></path>
        </svg>
      </div>
      <div>
        <svg aria-hidden="true" focusable="false" class="svg-inline--fa" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path fill="currentColor" d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"></path>
        </svg>
      </div>
      <div>
        <svg aria-hidden="true" focusable="false" class="svg-inline--fa" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path fill="currentColor" d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V192c0-35.3-28.7-64-64-64H80c-8.8 0-16-7.2-16-16s7.2-16 16-16H448c17.7 0 32-14.3 32-32s-14.3-32-32-32H64zM416 272a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"></path>
        </svg>
      </div>
      <div>
        <svg aria-hidden="true" focusable="false" class="svg-inline--fa" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path fill="currentColor" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM164.1 325.5C182 346.2 212.6 368 256 368s74-21.8 91.9-42.5c5.8-6.7 15.9-7.4 22.6-1.6s7.4 15.9 1.6 22.6C349.8 372.1 311.1 400 256 400s-93.8-27.9-116.1-53.5c-5.8-6.7-5.1-16.8 1.6-22.6s16.8-5.1 22.6 1.6zM144.4 208a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm156.4 25.6c-5.3 7.1-15.3 8.5-22.4 3.2s-8.5-15.3-3.2-22.4c30.4-40.5 91.2-40.5 121.6 0c5.3 7.1 3.9 17.1-3.2 22.4s-17.1 3.9-22.4-3.2c-17.6-23.5-52.8-23.5-70.4 0z"></path>
        </svg>
      </div>
      <div>
        <svg aria-hidden="true" focusable="false" class="svg-inline--fa" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path fill="currentColor" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 344V280H168c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V168c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H280v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"></path>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: 'Neko 聊天'
  }
})
</script>

