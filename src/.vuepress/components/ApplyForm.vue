<template>
  <div class="apply-form-wrapper">
    <div class="apply-form-header">
      <div class="form-title">申请加入群聊</div>
    </div>

    <div class="apply-form-body">
      <form @submit.prevent="handleSubmit" class="apply-form">
        <div class="form-group">
          <label for="qq">你的联系方式 (QQ号) <span class="required">*</span></label>
          <input 
            type="text" 
            id="qq" 
            v-model="formData.qq"
            placeholder="请输入你的QQ号"
            required
            pattern="[0-9]{5,11}"
          />
        </div>

        <div class="form-group">
          <label for="groupNumber">群聊号码 <span class="required">*</span></label>
          <input 
            type="text" 
            id="groupNumber" 
            v-model="formData.groupNumber"
            placeholder="请输入群号"
            required
            pattern="[0-9]{6,11}"
          />
        </div>

        <div class="form-group">
          <label for="groupName">群聊名称</label>
          <input 
            type="text" 
            id="groupName" 
            v-model="formData.groupName"
            placeholder="群聊名称（选填）"
          />
        </div>

        <div class="form-group">
          <label for="groupSize">群聊人数</label>
          <select id="groupSize" v-model="formData.groupSize">
            <option value="">请选择</option>
            <option value="1-50">1-50人</option>
            <option value="51-100">51-100人</option>
            <option value="101-200">101-200人</option>
            <option value="201-500">201-500人</option>
            <option value="500+">500人以上</option>
          </select>
        </div>

        <div class="form-group">
          <label for="reason">申请理由 / 补充说明</label>
          <textarea 
            id="reason" 
            v-model="formData.reason"
            placeholder="请简单说明申请理由，或其他需要补充的信息"
            rows="4"
          ></textarea>
        </div>

        <div class="notice-box">
          <div class="notice-title">温馨提示</div>
          <ul class="notice-list">
            <li>审核时间通常为 1-3 个工作日</li>
            <li>请确保提供的 QQ 号可以正常接收消息</li>
            <li>BOT 曾经加过的群可以直接邀请，无需重复申请</li>
            <li>未经允许请勿擅自将 BOT 拉入群聊</li>
          </ul>
        </div>

        <div class="form-group checkbox-group">
          <label>
            <input 
              type="checkbox" 
              v-model="formData.agreeTerms"
              required
            />
            我已阅读并同意 <a href="/zhuyi/terms" target="_blank">《使用条款与注意事项》</a>
            <span class="required">*</span>
          </label>
        </div>

        <div class="form-group" v-if="showCaptcha">
          <div class="cf-turnstile" ref="turnstileWidget"></div>
        </div>

        <div v-if="errorMessage" class="message-box error">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="message-box success">
          {{ successMessage }}
        </div>

        <button 
          type="submit" 
          class="submit-btn"
          :disabled="isSubmitting || !formData.agreeTerms"
        >
          {{ isSubmitting ? '提交中...' : '提交申请' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const formData = ref({
  qq: '',
  groupNumber: '',
  groupName: '',
  groupSize: '',
  reason: '',
  agreeTerms: false
})

const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showCaptcha = ref(true)
const turnstileWidget = ref<HTMLElement | null>(null)
const captchaToken = ref('')

// Cloudflare Turnstile 验证码初始化
onMounted(() => {
  if (typeof window !== 'undefined' && showCaptcha.value) {
    loadTurnstile()
  }
})

const loadTurnstile = () => {
  const script = document.createElement('script')
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
  script.async = true
  script.defer = true
  script.onload = () => {
    if (window.turnstile && turnstileWidget.value) {
      window.turnstile.render(turnstileWidget.value, {
        sitekey: '0x4AAAAAADpK3LYdSz1EOy44',
        callback: (token: string) => {
          captchaToken.value = token
        },
        theme: 'auto'
      })
    }
  }
  document.head.appendChild(script)
}

const handleSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!formData.value.agreeTerms) {
    errorMessage.value = '请先同意使用条款'
    return
  }

  if (showCaptcha.value && !captchaToken.value) {
    errorMessage.value = '请完成人机验证'
    return
  }

  isSubmitting.value = true

  try {
    const response = await fetch('/api/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formData.value,
        captchaToken: captchaToken.value
      })
    })

    const result = await response.json()

    if (response.ok) {
      successMessage.value = '申请已提交！我们会尽快审核并通过 QQ 联系你'
      // 重置表单
      formData.value = {
        qq: '',
        groupNumber: '',
        groupName: '',
        groupSize: '',
        reason: '',
        agreeTerms: false
      }
      captchaToken.value = ''
      if (window.turnstile) {
        window.turnstile.reset()
      }
    } else {
      errorMessage.value = result.error || '提交失败，请稍后重试'
    }
  } catch (error) {
    errorMessage.value = '网络错误，请检查连接后重试'
    console.error('Submit error:', error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.apply-form-wrapper {
  max-width: 600px;
  margin: 20px auto;
  position: relative;
  overflow: hidden;
  z-index: 10;
  background: #fff;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.apply-form-wrapper::before {
  content: "";
  width: 96px;
  height: 96px;
  position: absolute;
  background: #ffe4f2;
  border-radius: 50%;
  z-index: -10;
  filter: blur(32px);
  top: -24px;
  left: -24px;
}

.apply-form-wrapper::after {
  content: "";
  width: 128px;
  height: 128px;
  position: absolute;
  background: #8fbaff;
  border-radius: 50%;
  z-index: -10;
  filter: blur(48px);
  top: 96px;
  right: -48px;
}

html.dark .apply-form-wrapper {
  background: #1f2937;
}

html.dark .apply-form-wrapper::before {
  background: #ffe0f0;
}

html.dark .apply-form-wrapper::after {
  background: #afd3ff;
}

.apply-form-header {
  margin-bottom: 24px;
}

.form-title {
  font-size: 28px;
  font-weight: 700;
  color: #0c4a6e;
  margin: 0;
}

html.dark .form-title {
  color: #e0f2fe;
}

.apply-form-body {
  width: 100%;
}

.apply-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #4b5563;
  margin-bottom: 4px;
}

html.dark label {
  color: #9ca3af;
}

.required {
  color: #ef4444;
}

input[type="text"],
select,
textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
  background: #fff;
  color: #111827;
}

html.dark input[type="text"],
html.dark select,
html.dark textarea {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #ffc0e3;
  box-shadow: 0 0 0 3px rgba(255, 192, 227, 0.2);
}

html.dark input:focus,
html.dark select:focus,
html.dark textarea:focus {
  border-color: #ffd4ea;
  box-shadow: 0 0 0 3px rgba(255, 212, 234, 0.3);
}

textarea {
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  font-weight: normal;
  flex-direction: row;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  margin-right: 8px;
  cursor: pointer;
}

.checkbox-group a {
  color: #ffa8d5;
  text-decoration: none;
  margin: 0 4px;
}

.checkbox-group a:hover {
  text-decoration: underline;
}

html.dark .checkbox-group a {
  color: #ffc0e3;
}

.notice-box {
  background: #fef2f2;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #fecaca;
}

html.dark .notice-box {
  background: rgba(254, 202, 202, 0.1);
  border-color: rgba(254, 202, 202, 0.2);
}

.notice-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #991b1b;
}

html.dark .notice-title {
  color: #fca5a5;
}

.notice-list {
  margin: 0;
  padding-left: 20px;
  list-style: disc;
}

.notice-list li {
  margin-bottom: 4px;
  line-height: 1.5;
  color: #7f1d1d;
  font-size: 13px;
}

html.dark .notice-list li {
  color: #fca5a5;
}

.notice-list li:last-child {
  margin-bottom: 0;
}

.submit-btn {
  background: linear-gradient(144deg, #ffc0e3, #ffd4ea 50%, #a8d5ff);
  color: #fff;
  padding: 12px 16px;
  font-weight: 700;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 16px;
  transition: opacity 0.2s;
  width: 100%;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.8;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.message-box {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.message-box.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

html.dark .message-box.error {
  background: rgba(254, 226, 226, 0.1);
  border-color: rgba(254, 202, 202, 0.3);
  color: #fca5a5;
}

.message-box.success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

html.dark .message-box.success {
  background: rgba(220, 252, 231, 0.1);
  border-color: rgba(187, 247, 208, 0.3);
  color: #86efac;
}

.cf-turnstile {
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .apply-form-wrapper {
    margin: 10px;
    padding: 24px;
  }

  .form-title {
    font-size: 24px;
  }

  .apply-form {
    gap: 14px;
  }

  input[type="text"],
  select,
  textarea {
    font-size: 16px;
  }

  .submit-btn {
    font-size: 15px;
  }
}
</style>