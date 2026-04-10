<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useVaultStore } from '../stores/vault'

// Props 定义
interface Props {
  visible: boolean
}

const props = defineProps<Props>()

// Emits 定义
interface Emits {
  (e: 'close'): void
  (e: 'success'): void
}

const emit = defineEmits<Emits>()

const vaultStore = useVaultStore()

// 表单状态
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// 密码可见性
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// 弹窗阶段：form 表单填写 | submitting 加密中
const phase = ref<'form' | 'submitting'>('form')

// 进度状态
const progress = ref({ current: 0, total: 0 })

// 错误信息
const error = ref('')

// 成功状态
const success = ref(false)

// 新密码强度计算（本地计算，不调用IPC）
const newPasswordStrength = computed(() => {
  const pwd = newPassword.value
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

// 确认密码匹配状态
const confirmPasswordMatch = computed(() => {
  if (!confirmPassword.value) return null
  return newPassword.value === confirmPassword.value
})

// 表单是否有效：当前密码非空 + 新密码强度>=中等 + 确认密码匹配
const isFormValid = computed(() => {
  return currentPassword.value.length > 0
    && newPasswordStrength.value.level >= 2  // medium及以上
    && newPassword.value === confirmPassword.value
    && newPassword.value.length >= 6
})

// 进度百分比
const progressPercent = computed(() => {
  if (progress.value.total === 0) return 100  // 空密码库直接100%
  return Math.round((progress.value.current / progress.value.total) * 100)
})

// 监听弹窗显示状态，重置表单
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

// 重置表单
function resetForm() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  showCurrentPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
  phase.value = 'form'
  progress.value = { current: 0, total: 0 }
  error.value = ''
  success.value = false
}

// 切换密码可见性
function toggleVisibility(field: 'current' | 'new' | 'confirm') {
  if (field === 'current') {
    showCurrentPassword.value = !showCurrentPassword.value
  } else if (field === 'new') {
    showNewPassword.value = !showNewPassword.value
  } else {
    showConfirmPassword.value = !showConfirmPassword.value
  }
}

// 提交修改
async function handleSubmit() {
  phase.value = 'submitting'
  error.value = ''

  try {
    await vaultStore.changeMasterPassword(
      currentPassword.value,
      newPassword.value,
      (current, total) => {
        progress.value = { current, total }
      }
    )
    success.value = true
    emit('success')
    // 延迟关闭弹窗
    setTimeout(() => {
      handleClose()
    }, 500)
  } catch (e: any) {
    error.value = e.message || '修改密码失败'
    phase.value = 'form'
  }
}

// 关闭弹窗
function handleClose() {
  if (phase.value === 'submitting' && !success.value) {
    // 加密进行中不允许关闭
    return
  }
  emit('close')
}

// 处理背景点击关闭
function handleBackdropClick(e: MouseEvent) {
  if (phase.value === 'submitting') return  // 加密中禁止点击背景关闭
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

// 生命周期
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
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
          <!-- 表单阶段 -->
          <template v-if="phase === 'form'">
            <!-- Header -->
            <div class="modal-header">
              <h2 class="modal-title">修改主密码</h2>
              <button class="close-btn" @click="handleClose">
                <svg class="close-icon" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z" fill="currentColor"/>
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="modal-body">
              <!-- 当前密码 -->
              <div class="section-divider"></div>
              <div class="section-label">当前密码</div>
              <div class="input-wrapper">
                <input
                  v-model="currentPassword"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  placeholder="输入当前主密码"
                  class="input"
                  :disabled="phase !== 'form'"
                  @input="error = ''"
                />
                <button
                  type="button"
                  class="visibility-btn"
                  @click="toggleVisibility('current')"
                >
                  <svg v-if="showCurrentPassword" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="currentColor"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24">
                    <path d="M12 7C14.76 7 17 9.24 17 12C17 12.65 16.87 13.26 16.63 13.83L19.56 16.76C21.07 15.49 22.26 13.86 22.97 12C21.26 7.61 17 4.5 12 4.5C10.63 4.5 9.32 4.74 8.11 5.17L10.23 7.29C10.74 7.11 11.36 7 12 7ZM2.71 3.16L5.26 5.71C3.53 7.02 2.14 8.85 1.31 11C2.92 15.39 7.16 18.5 12 18.5C13.49 18.5 14.91 18.21 16.21 17.67L18.82 20.28L20.23 18.87L4.12 2.75L2.71 3.16ZM7.53 8.98L9.19 10.64C9.07 11.07 9 11.53 9 12C9 14.21 10.79 16 13 16C13.47 16 13.93 15.93 14.36 15.81L16.02 17.47C15.08 17.94 14.05 18.2 12.97 18.2C9.18 18.2 6.17 15.19 6.17 11.4C6.17 10.52 6.32 9.68 6.58 8.9L7.53 8.98Z" fill="currentColor"/>
                  </svg>
                </button>
              </div>

              <!-- 新密码 -->
              <div class="section-divider"></div>
              <div class="section-label">新密码</div>
              <div class="input-wrapper">
                <input
                  v-model="newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  placeholder="输入新主密码"
                  class="input"
                  :disabled="phase !== 'form'"
                  @input="error = ''"
                />
                <button
                  type="button"
                  class="visibility-btn"
                  @click="toggleVisibility('new')"
                >
                  <svg v-if="showNewPassword" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="currentColor"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24">
                    <path d="M12 7C14.76 7 17 9.24 17 12C17 12.65 16.87 13.26 16.63 13.83L19.56 16.76C21.07 15.49 22.26 13.86 22.97 12C21.26 7.61 17 4.5 12 4.5C10.63 4.5 9.32 4.74 8.11 5.17L10.23 7.29C10.74 7.11 11.36 7 12 7ZM2.71 3.16L5.26 5.71C3.53 7.02 2.14 8.85 1.31 11C2.92 15.39 7.16 18.5 12 18.5C13.49 18.5 14.91 18.21 16.21 17.67L18.82 20.28L20.23 18.87L4.12 2.75L2.71 3.16ZM7.53 8.98L9.19 10.64C9.07 11.07 9 11.53 9 12C9 14.21 10.79 16 13 16C13.47 16 13.93 15.93 14.36 15.81L16.02 17.47C15.08 17.94 14.05 18.2 12.97 18.2C9.18 18.2 6.17 15.19 6.17 11.4C6.17 10.52 6.32 9.68 6.58 8.9L7.53 8.98Z" fill="currentColor"/>
                  </svg>
                </button>
              </div>

              <!-- 新密码强度指示器 -->
              <div v-if="newPassword" class="strength-indicator">
                <div class="strength-bar">
                  <div
                    class="strength-fill"
                    :style="{ width: newPasswordStrength.percent + '%', background: newPasswordStrength.color }"
                  ></div>
                </div>
                <span class="strength-text" :style="{ color: newPasswordStrength.color }">
                  {{ newPasswordStrength.text }}
                </span>
              </div>

              <!-- 强度警告 -->
              <div v-if="newPassword && newPasswordStrength.level < 2" class="strength-warning">
                <svg class="warning-icon" viewBox="0 0 24 24">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>
                </svg>
                <span>新密码强度需达到「中等」以上</span>
              </div>

              <!-- 确认新密码 -->
              <div class="section-divider"></div>
              <div class="section-label">确认新密码</div>
              <div class="input-wrapper">
                <input
                  v-model="confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  placeholder="再次输入新主密码"
                  class="input"
                  :disabled="phase !== 'form'"
                  @input="error = ''"
                />
                <button
                  type="button"
                  class="visibility-btn"
                  @click="toggleVisibility('confirm')"
                >
                  <svg v-if="showConfirmPassword" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="currentColor"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24">
                    <path d="M12 7C14.76 7 17 9.24 17 12C17 12.65 16.87 13.26 16.63 13.83L19.56 16.76C21.07 15.49 22.26 13.86 22.97 12C21.26 7.61 17 4.5 12 4.5C10.63 4.5 9.32 4.74 8.11 5.17L10.23 7.29C10.74 7.11 11.36 7 12 7ZM2.71 3.16L5.26 5.71C3.53 7.02 2.14 8.85 1.31 11C2.92 15.39 7.16 18.5 12 18.5C13.49 18.5 14.91 18.21 16.21 17.67L18.82 20.28L20.23 18.87L4.12 2.75L2.71 3.16ZM7.53 8.98L9.19 10.64C9.07 11.07 9 11.53 9 12C9 14.21 10.79 16 13 16C13.47 16 13.93 15.93 14.36 15.81L16.02 17.47C15.08 17.94 14.05 18.2 12.97 18.2C9.18 18.2 6.17 15.19 6.17 11.4C6.17 10.52 6.32 9.68 6.58 8.9L7.53 8.98Z" fill="currentColor"/>
                  </svg>
                </button>
              </div>

              <!-- 确认密码匹配提示 -->
              <div v-if="confirmPassword" class="match-indicator">
                <span v-if="confirmPasswordMatch" class="match-success">
                  <svg class="match-icon" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17z" fill="currentColor"/>
                  </svg>
                  密码匹配
                </span>
                <span v-else class="match-error">密码不一致</span>
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
              <button class="btn-cancel" @click="handleClose">
                取消
              </button>
              <button
                class="btn-save"
                @click="handleSubmit"
                :disabled="!isFormValid"
              >
                确认修改
              </button>
            </div>
          </template>

          <!-- 加密进度阶段 -->
          <template v-else>
            <div class="progress-overlay">
              <!-- 成功状态 -->
              <template v-if="success">
                <svg class="progress-icon success-icon" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17z" fill="currentColor"/>
                </svg>
                <p class="progress-title">密码修改成功</p>
              </template>

              <!-- 加密中状态 -->
              <template v-else>
                <svg class="progress-icon" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="currentColor"/>
                </svg>
                <p class="progress-title">正在加密密码库...</p>
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: progressPercent + '%' }"
                  ></div>
                </div>
                <p class="progress-text">
                  {{ progress.total === 0 ? '正在更新验证数据...' : `正在加密 ${progress.current}/${progress.total} 条目` }}
                </p>
                <p class="progress-warning">请勿关闭窗口，数据正在重新加密</p>
              </template>
            </div>
          </template>
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
  position: relative;
  overflow: hidden;
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

/* 分隔线 */
.section-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: var(--space-sm) 0;
}

.section-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
  margin-bottom: var(--space-sm);
}

/* 输入框 */
.input-wrapper {
  position: relative;
}

.input {
  width: 100%;
  padding: 14px 48px 14px 16px;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-lg);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.input:hover:not(:disabled) {
  border-color: rgba(250, 250, 250, 0.12);
}

.input:focus:not(:disabled) {
  border-color: var(--input-border-focus);
  background: var(--input-bg-focus);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.12);
}

.input:disabled {
  opacity: 0.6;
}

.input::placeholder {
  color: var(--text-placeholder);
}

.visibility-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: var(--space-xs);
  cursor: pointer;
  color: rgba(250, 250, 250, 0.4);
  transition: color 0.2s;
}

.visibility-btn:hover {
  color: rgba(250, 250, 250, 0.7);
}

.visibility-btn svg {
  width: 20px;
  height: 20px;
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

/* 强度警告 */
.strength-warning {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
  font-size: 12px;
  color: var(--warning);
}

.warning-icon {
  width: 14px;
  height: 14px;
  color: var(--warning);
  flex-shrink: 0;
}

/* 确认密码匹配提示 */
.match-indicator {
  margin-top: var(--space-xs);
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.match-icon {
  width: 14px;
  height: 14px;
}

.match-success {
  color: var(--success-text);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.match-error {
  color: var(--error);
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
  flex-shrink: 0;
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

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
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

/* 进度覆盖层 */
.progress-overlay {
  padding: var(--space-5xl) var(--space-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-lg);
  min-height: 300px;
}

.progress-icon {
  width: 48px;
  height: 48px;
  color: var(--primary-400);
}

.progress-icon.success-icon {
  color: var(--success-text);
}

.progress-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.progress-bar {
  width: 80%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-gradient);
  transition: width 0.3s ease-out;
}

.progress-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.progress-warning {
  font-size: 12px;
  color: var(--text-muted);
}

/* 弹窗动画 */
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

/* 响应式适配 */
@media (max-width: 479px) {
  .modal-container {
    width: 90vw;
    min-width: 300px;
  }
}
</style>
