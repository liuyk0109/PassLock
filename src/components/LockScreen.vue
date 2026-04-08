<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useVaultStore } from '../stores/vault'

const vaultStore = useVaultStore()

// 状态
const isFirstTime = ref(true)
const loading = ref(true)
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const submitting = ref(false)

// 密码可见性
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// 密码强度计算
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

// 确认密码匹配状态
const confirmPasswordMatch = computed(() => {
  if (!confirmPassword.value) return null
  return password.value === confirmPassword.value
})

// 初始化：检查是否首次使用
onMounted(async () => {
  try {
    const verifyData = await window.electronAPI.db.getMasterKeyVerify()
    isFirstTime.value = !verifyData
    error.value = ''
  } catch (e) {
    console.error('LockScreen init error:', e)
    isFirstTime.value = true
    error.value = ''
  } finally {
    loading.value = false
  }
})

// 切换密码可见性
function togglePasswordVisibility(field: 'password' | 'confirm') {
  if (field === 'password') {
    showPassword.value = !showPassword.value
  } else {
    showConfirmPassword.value = !showConfirmPassword.value
  }
}

// 初始化主密码
async function handleInit() {
  error.value = ''

  if (password.value.length < 6) {
    error.value = '密码长度至少 6 位'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = '两次密码不一致'
    return
  }

  submitting.value = true

  try {
    const verifyData = await window.electronAPI.crypto.createVerifyData(password.value)
    await window.electronAPI.db.setMasterKeyVerify(verifyData)
    await vaultStore.unlock(password.value)
  } catch (e) {
    error.value = '初始化失败，请重试'
    console.error(e)
  } finally {
    submitting.value = false
  }
}

// 解锁密码库
async function handleUnlock() {
  error.value = ''

  if (password.value.length === 0) {
    error.value = '请输入主密码'
    return
  }

  submitting.value = true

  try {
    const verifyData = await window.electronAPI.db.getMasterKeyVerify()
    if (!verifyData) {
      error.value = '数据异常，请重新初始化'
      isFirstTime.value = true
      return
    }

    const valid = await window.electronAPI.crypto.verifyPassword(verifyData, password.value)
    if (valid) {
      await vaultStore.unlock(password.value)
    } else {
      error.value = '密码错误'
    }
  } catch (e) {
    error.value = '解锁失败，请重试'
    console.error(e)
  } finally {
    submitting.value = false
  }
}

// 清除错误
function clearError() {
  error.value = ''
}
</script>

<template>
  <div class="lock-screen">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
      <div class="decoration-circle circle-3"></div>
    </div>

    <div class="lock-card">
      <!-- Logo 区域 -->
      <div class="brand-area">
        <div class="logo-container">
          <svg class="logo-icon" viewBox="0 0 24 24">
            <path d="M12 2C9.243 2 7 4.243 7 7V9H6C4.895 9 4 9.895 4 11V20C4 21.105 4.895 22 6 22H18C19.105 22 20 21.105 20 20V11C20 9.895 19.105 9 18 9H17V7C17 4.243 14.757 2 12 2ZM12 4C13.654 4 15 5.346 15 7V9H9V7C9 5.346 10.346 4 12 4Z" fill="currentColor"/>
          </svg>
        </div>
        <h1 class="title">PassLock</h1>
        <p class="subtitle">安全密码管理器</p>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p class="loading-text">正在初始化...</p>
      </div>

      <!-- 首次使用：初始化主密码 -->
      <form v-else-if="isFirstTime" @submit.prevent="handleInit" class="form">
        <p class="hint">
          <svg class="hint-icon" viewBox="0 0 24 24">
            <path d="M12 2C9.243 2 7 4.243 7 7V9H6C4.895 9 4 9.895 4 11V20C4 21.105 4.895 22 6 22H18C19.105 22 20 21.105 20 20V11C20 9.895 19.105 9 18 9H17V7C17 4.243 14.757 2 12 2ZM12 4C13.654 4 15 5.346 15 7V9H9V7C9 5.346 10.346 4 12 4Z" fill="currentColor"/>
          </svg>
          创建主密码
        </p>

        <!-- 主密码输入框 -->
        <div class="input-wrapper">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="主密码"
            class="input"
            :disabled="submitting"
            @input="clearError"
          />
          <button
            type="button"
            class="visibility-btn"
            @click="togglePasswordVisibility('password')"
            :disabled="submitting"
          >
            <!-- 睁眼图标 -->
            <svg v-if="showPassword" viewBox="0 0 24 24">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="currentColor"/>
            </svg>
            <!-- 闭眼图标 -->
            <svg v-else viewBox="0 0 24 24">
              <path d="M12 7C14.76 7 17 9.24 17 12C17 12.65 16.87 13.26 16.63 13.83L19.56 16.76C21.07 15.49 22.26 13.86 22.97 12C21.26 7.61 17 4.5 12 4.5C10.63 4.5 9.32 4.74 8.11 5.17L10.23 7.29C10.74 7.11 11.36 7 12 7ZM2.71 3.16L5.26 5.71C3.53 7.02 2.14 8.85 1.31 11C2.92 15.39 7.16 18.5 12 18.5C13.49 18.5 14.91 18.21 16.21 17.67L18.82 20.28L20.23 18.87L4.12 2.75L2.71 3.16ZM7.53 8.98L9.19 10.64C9.07 11.07 9 11.53 9 12C9 14.21 10.79 16 13 16C13.47 16 13.93 15.93 14.36 15.81L16.02 17.47C15.08 17.94 14.05 18.2 12.97 18.2C9.18 18.2 6.17 15.19 6.17 11.4C6.17 10.52 6.32 9.68 6.58 8.9L7.53 8.98Z" fill="currentColor"/>
            </svg>
          </button>
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

        <!-- 确认密码输入框 -->
        <div class="input-wrapper">
          <input
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="确认密码"
            class="input"
            :disabled="submitting"
            @input="clearError"
          />
          <button
            type="button"
            class="visibility-btn"
            @click="togglePasswordVisibility('confirm')"
            :disabled="submitting"
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
          <span v-if="confirmPasswordMatch" class="match-success">密码匹配</span>
          <span v-else class="match-error">密码不一致</span>
        </div>

        <!-- 提交按钮 -->
        <button type="submit" class="btn-primary" :disabled="submitting">
          <svg v-if="submitting" class="btn-spinner" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
          </svg>
          {{ submitting ? '创建中...' : '创建密码库' }}
        </button>

        <!-- 错误提示框 -->
        <div v-if="error" class="error-box">
          <svg class="error-icon" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
          </svg>
          <span>{{ error }}</span>
        </div>
      </form>

      <!-- 解锁密码库 -->
      <form v-else @submit.prevent="handleUnlock" class="form">
        <p class="hint">
          <svg class="hint-icon" viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="currentColor"/>
          </svg>
          解锁密码库
        </p>

        <!-- 主密码输入框 -->
        <div class="input-wrapper">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="主密码"
            class="input"
            :disabled="submitting"
            @input="clearError"
          />
          <button
            type="button"
            class="visibility-btn"
            @click="togglePasswordVisibility('password')"
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

        <!-- 提交按钮 -->
        <button type="submit" class="btn-primary" :disabled="submitting">
          <svg v-if="submitting" class="btn-spinner" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
          </svg>
          {{ submitting ? '解锁中...' : '解锁' }}
        </button>

        <!-- 错误提示框 -->
        <div v-if="error" class="error-box">
          <svg class="error-icon" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
          </svg>
          <span>{{ error }}</span>
        </div>
      </form>

      <!-- 底部安全提示 -->
      <div class="footer">
        <div class="footer-divider"></div>
        <div class="footer-content">
          <svg class="footer-icon" viewBox="0 0 24 24">
            <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 11.99H19C18.47 16.11 15.72 19.78 12 20.93V12H5V6.3L12 3.19V11.99Z" fill="currentColor"/>
          </svg>
          <span class="footer-text">端到端加密 · 本地存储</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lock-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--bg-gradient);
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  border-radius: var(--radius-full);
  opacity: 0.03;
}

.circle-1 {
  width: 400px;
  height: 400px;
  background: var(--primary-500);
  top: -100px;
  right: -100px;
  animation: float 20s ease-in-out infinite;
}

.circle-2 {
  width: 300px;
  height: 300px;
  background: var(--accent-500);
  bottom: -50px;
  left: -50px;
  animation: float 15s ease-in-out infinite reverse;
}

.circle-3 {
  width: 200px;
  height: 200px;
  background: var(--strength-strong);
  top: 50%;
  left: 20%;
  animation: pulse 10s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30px, 20px); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.03; }
  50% { transform: scale(1.1); opacity: 0.02; }
}

/* 卡片 */
.lock-card {
  background: var(--card-bg);
  border-radius: var(--radius-2xl);
  padding: var(--space-5xl) 40px;
  width: 380px;
  backdrop-filter: blur(16px);
  border: 1px solid var(--card-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Brand 区域 */
.brand-area {
  text-align: center;
  margin-bottom: var(--space-3xl);
}

.logo-container {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--space-lg);
  background: var(--primary-gradient);
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(20, 184, 166, 0.25);
}

.logo-icon {
  width: 36px;
  height: 36px;
  color: white;
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-3xl);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(250, 250, 250, 0.1);
  border-top-color: var(--primary-500);
  border-radius: var(--radius-full);
  animation: spin 1s linear infinite;
  margin-bottom: var(--space-lg);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: var(--text-tertiary);
}

/* 表单 */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
}

.hint-icon {
  width: 18px;
  height: 18px;
  color: var(--primary-400);
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
  font-size: 15px;
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

.visibility-btn:hover:not(:disabled) {
  color: rgba(250, 250, 250, 0.7);
}

.visibility-btn:disabled {
  cursor: not-allowed;
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

/* 确认密码匹配提示 */
.match-indicator {
  margin-top: var(--space-xs);
  font-size: 12px;
  font-weight: 500;
}

.match-success {
  color: var(--success-text);
}

.match-error {
  color: var(--error);
}

/* 主按钮 */
.btn-primary {
  width: 100%;
  padding: 14px 24px;
  border: none;
  border-radius: var(--radius-lg);
  background: var(--primary-gradient);
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
  box-shadow: 0 4px 14px rgba(20, 184, 166, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
  box-shadow: 0 6px 20px rgba(20, 184, 166, 0.4);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
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
  margin-top: var(--space-lg);
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

/* 底部 */
.footer {
  margin-top: var(--space-2xl);
}

.footer-divider {
  height: 1px;
  background: rgba(250, 250, 250, 0.05);
  margin-bottom: var(--space-lg);
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

.footer-icon {
  width: 16px;
  height: 16px;
  color: var(--primary-400);
  opacity: 0.6;
}

.footer-text {
  font-size: 12px;
  color: var(--text-muted);
}
</style>