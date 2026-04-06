<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue'
import PasswordGenerator from './PasswordGenerator.vue'
import type { NewEntryInput, EditEntryInput, VaultEntry } from '../stores/vault'

// Props 定义
interface Props {
  visible: boolean
  mode?: 'add' | 'edit'              // 模式区分，默认 'add'
  entry?: VaultEntry                 // 编辑模式下的条目数据
  decryptedPassword?: string         // 编辑模式下的解密密码
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'add',
  entry: undefined,
  decryptedPassword: undefined
})

// Emits 定义
interface Emits {
  (e: 'close'): void
  (e: 'save', input: NewEntryInput): void
  (e: 'update', id: string, input: EditEntryInput): void  // 编辑模式保存
}

const emit = defineEmits<Emits>()

// 表单状态
const title = ref('')
const site = ref('')
const password = ref('')
const notes = ref('')
const showPassword = ref(false)
const showGenerator = ref(false)
const submitting = ref(false)
const error = ref('')
const titleInputRef = ref<HTMLInputElement | null>(null)

// 密码自动隐藏相关状态（编辑模式安全增强）
const passwordMaskTimeout = ref<number | null>(null)  // 5秒自动隐藏定时器
const isPasswordMasked = ref(true)  // 密码是否掩码显示

// 表单验证
const formValid = computed(() => {
  return title.value.trim() !== '' && password.value.trim() !== ''
})

// 密码强度计算（本地计算用于显示）
const passwordStrength = computed(() => {
  const pwd = password.value
  if (!pwd) return { level: 0, text: '', color: '', percent: 0 }

  const hasLower = /[a-z]/.test(pwd)
  const hasUpper = /[A-Z]/.test(pwd)
  const hasNumber = /[0-9]/.test(pwd)
  const hasSymbol = /[^a-zA-Z0-9]/.test(pwd)

  const mixedCount = [hasLower && hasUpper, hasNumber, hasSymbol].filter(Boolean).length
  const length = pwd.length

  if (length >= 10 && mixedCount === 3) {
    return { level: 4, text: '非常强', color: 'var(--strength-excellent)', percent: 100 }
  }
  if (length >= 10 && mixedCount >= 2) {
    return { level: 3, text: '强', color: 'var(--strength-strong)', percent: 75 }
  }
  if (length >= 6 && mixedCount >= 2) {
    return { level: 2, text: '中等', color: 'var(--strength-medium)', percent: 50 }
  }
  if (length >= 6 && mixedCount >= 1) {
    return { level: 1, text: '弱', color: 'var(--strength-weak)', percent: 25 }
  }
  return { level: 0, text: '太短', color: 'var(--strength-weak)', percent: 10 }
})

// 监听弹窗显示状态，自动聚焦和预填充
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await nextTick()
    titleInputRef.value?.focus()

    // 编辑模式：预填充数据
    if (props.mode === 'edit' && props.entry) {
      title.value = props.entry.title
      site.value = props.entry.site ?? ''
      notes.value = props.entry.notes ?? ''
      // 密码预填充（默认掩码显示）
      if (props.decryptedPassword) {
        password.value = props.decryptedPassword
        isPasswordMasked.value = true
        showPassword.value = false
      }
    }
  } else {
    // 弹窗关闭时重置表单
    resetForm()
  }
})

// 清除密码自动隐藏定时器
function clearPasswordTimeout() {
  if (passwordMaskTimeout.value !== null) {
    clearTimeout(passwordMaskTimeout.value)
    passwordMaskTimeout.value = null
  }
}

// 密码显示切换（带自动隐藏逻辑）
function togglePasswordVisibility() {
  if (props.mode === 'edit' && isPasswordMasked.value) {
    // 编辑模式：显示密码后5秒自动隐藏
    clearPasswordTimeout()
    isPasswordMasked.value = false
    showPassword.value = true
    passwordMaskTimeout.value = window.setTimeout(() => {
      isPasswordMasked.value = true
      showPassword.value = false
      passwordMaskTimeout.value = null
    }, 5000)  // 5秒
  } else {
    // 新增模式或已经显示时：简单切换
    showPassword.value = !showPassword.value
  }
}

// 密码输入框失焦时自动隐藏（编辑模式）
function handlePasswordBlur() {
  if (props.mode === 'edit' && showPassword.value) {
    clearPasswordTimeout()
    isPasswordMasked.value = true
    showPassword.value = false
  }
}

// 重置表单
function resetForm() {
  title.value = ''
  site.value = ''
  password.value = ''
  notes.value = ''
  showPassword.value = false
  showGenerator.value = false
  submitting.value = false
  error.value = ''
  isPasswordMasked.value = true
  clearPasswordTimeout()
}

// 处理密码生成器使用密码
function handleUsePassword(newPassword: string) {
  password.value = newPassword
  showGenerator.value = false
}

// 处理保存（区分新增和编辑模式）
async function handleSave() {
  error.value = ''

  if (!title.value.trim()) {
    error.value = '请输入名称'
    return
  }

  if (!password.value.trim()) {
    error.value = '请输入密码'
    return
  }

  submitting.value = true

  try {
    if (props.mode === 'edit' && props.entry) {
      // 编辑模式：检测密码是否被修改
      const passwordChanged = password.value !== props.decryptedPassword
      
      const input: EditEntryInput = {
        title: title.value.trim(),
        site: site.value.trim(),
        password: passwordChanged ? password.value : undefined,  // 仅修改时传递
        notes: notes.value.trim()
      }
      emit('update', props.entry.id, input)
    } else {
      // 新增模式
      const input: NewEntryInput = {
        title: title.value.trim(),
        site: site.value.trim(),
        password: password.value,
        notes: notes.value.trim()
      }
      emit('save', input)
    }
  } catch (e) {
    error.value = '保存失败，请重试'
    console.error(e)
  } finally {
    submitting.value = false
  }
}

// 处理关闭
function handleClose() {
  emit('close')
}

// 处理背景点击关闭
function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}

// 处理 ESC 键关闭
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleClose()
  }
}

// 组件挂载时添加键盘监听
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

// 组件卸载时清理定时器和事件监听
onUnmounted(() => {
  clearPasswordTimeout()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="props.visible"
        class="modal-backdrop"
        @click="handleBackdropClick"
      >
        <div class="modal-container">
          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">{{ props.mode === 'edit' ? '编辑密码条目' : '新增密码条目' }}</h2>
            <button class="close-btn" @click="handleClose">
              <svg class="close-icon" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z" fill="currentColor"/>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- 名称输入 -->
            <div class="form-group">
              <label class="form-label">
                名称 <span class="required">*</span>
              </label>
              <input
                ref="titleInputRef"
                v-model="title"
                type="text"
                placeholder="例如：微信、支付宝"
                class="form-input"
                :disabled="submitting"
              />
            </div>

            <!-- 网站/应用输入 -->
            <div class="form-group">
              <label class="form-label">网站/应用</label>
              <input
                v-model="site"
                type="text"
                placeholder="例如：微信"
                class="form-input"
                :disabled="submitting"
              />
            </div>

            <!-- 密码输入 -->
            <div class="form-group">
              <label class="form-label">
                密码 <span class="required">*</span>
              </label>
              <div class="password-input-wrapper">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="输入密码"
                  class="form-input password-input"
                  :disabled="submitting"
                  @blur="handlePasswordBlur"
                />
                <div class="password-actions">
                  <button
                    type="button"
                    class="action-btn generate-btn"
                    @click="showGenerator = !showGenerator"
                    :disabled="submitting"
                  >
                    生成
                  </button>
                  <button
                    type="button"
                    class="action-btn"
                    @click="togglePasswordVisibility"
                    :disabled="submitting"
                  >
                    <svg v-if="showPassword" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="currentColor"/>
                    </svg>
                    <svg v-else viewBox="0 0 24 24">
                      <path d="M12 7C14.76 7 17 9.24 17 12C17 12.65 16.87 13.26 16.63 13.83L19.56 16.76C21.07 15.49 22.26 13.86 22.97 12C21.26 7.61 17 4.5 12 4.5C10.63 4.5 9.32 4.74 8.11 5.17L10.23 7.29C10.74 7.11 11.36 7 12 7ZM2.71 3.16L5.26 5.71C3.53 7.02 2.14 8.85 1.31 11C2.92 15.39 7.16 18.5 12 18.5C13.49 18.5 14.91 18.21 16.21 17.67L18.82 20.28L20.23 18.87L4.12 2.75L2.71 3.16ZM7.53 8.98L9.19 10.64C9.07 11.07 9 11.53 9 12C9 14.21 10.79 16 13 16C13.47 16 13.93 15.93 14.36 15.81L16.02 17.47C15.08 17.94 14.05 18.2 12.97 18.2C9.18 18.2 6.17 15.19 6.17 11.4C6.17 10.52 6.32 9.68 6.58 8.9L7.53 8.98Z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- 密码强度指示器 -->
              <div v-if="password" class="strength-indicator">
                <div class="strength-bar">
                  <div 
                    class="strength-fill"
                    :style="{ width: passwordStrength.percent + '%', background: passwordStrength.color }"
                  ></div>
                </div>
                <span class="strength-text" :style="{ color: passwordStrength.color }">
                  {{ passwordStrength.text }}
                </span>
              </div>

              <!-- 密码生成器面板 -->
              <Transition name="slide">
                <div v-if="showGenerator" class="generator-panel">
                  <PasswordGenerator @use-password="handleUsePassword" />
                </div>
              </Transition>
            </div>

            <!-- 备注输入 -->
            <div class="form-group">
              <label class="form-label">备注</label>
              <textarea
                v-model="notes"
                placeholder="备注信息（可选）"
                class="form-input form-textarea"
                :disabled="submitting"
                rows="3"
              ></textarea>
            </div>

            <!-- 错误提示 -->
            <div v-if="error" class="error-box">
              <svg class="error-icon" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
              </svg>
              <span>{{ error }}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn-cancel" @click="handleClose" :disabled="submitting">
              取消
            </button>
            <button 
              class="btn-save" 
              @click="handleSave" 
              :disabled="submitting || !formValid"
            >
              <svg v-if="submitting" class="btn-spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
              </svg>
              {{ submitting ? (props.mode === 'edit' ? '更新中...' : '保存中...') : (props.mode === 'edit' ? '更新' : '保存') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 背景层 */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* 弹窗容器 */
.modal-container {
  width: 420px;
  max-width: 90vw;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-2xl);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(16px);
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.close-icon {
  width: 18px;
  height: 18px;
}

/* Body */
.modal-body {
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* 表单组 */
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.required {
  color: var(--error);
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-lg);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.form-input:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.12);
}

.form-input:focus:not(:disabled) {
  border-color: var(--input-border-focus);
  background: var(--input-bg-focus);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.12);
}

.form-input:disabled {
  opacity: 0.6;
}

.form-input::placeholder {
  color: var(--text-placeholder);
}

.form-textarea {
  resize: none;
  min-height: 80px;
}

/* 密码输入区域 */
.password-input-wrapper {
  position: relative;
}

.password-input {
  padding-right: 80px;
}

.password-actions {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

.generate-btn {
  width: auto;
  padding: 0 var(--space-sm);
  font-size: 12px;
  color: var(--primary-400);
}

.generate-btn:hover:not(:disabled) {
  background: rgba(20, 184, 166, 0.15);
  color: var(--primary-500);
}

/* 密码强度指示器 */
.strength-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s, background 0.3s;
}

.strength-text {
  font-size: 12px;
  font-weight: 500;
}

/* 密码生成器面板 */
.generator-panel {
  margin-top: var(--space-md);
}

/* 错误提示框 */
.error-box {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--error-bg);
  border: 1px solid var(--error-border);
  border-radius: 10px;
  padding: var(--space-md) var(--space-lg);
}

.error-icon {
  width: 18px;
  height: 18px;
  color: var(--error);
}

.error-box span {
  font-size: 13px;
  color: var(--error);
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-md);
  padding: var(--space-lg) var(--space-xl);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.btn-cancel {
  padding: 10px 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-cancel:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-save {
  padding: 10px 24px;
  border: none;
  border-radius: var(--radius-lg);
  background: var(--primary-gradient);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
  box-shadow: 0 4px 14px rgba(20, 184, 166, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

.btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
  box-shadow: 0 6px 20px rgba(20, 184, 166, 0.4);
  transform: translateY(-1px);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 动画 */
.modal-enter-active {
  animation: modal-in 0.3s ease;
}

.modal-leave-active {
  animation: modal-out 0.25s ease;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes modal-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(20px);
  }
}

.slide-enter-active {
  animation: slide-in 0.2s ease;
}

.slide-leave-active {
  animation: slide-out 0.15s ease;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}
</style>