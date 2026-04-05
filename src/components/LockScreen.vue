<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useVaultStore } from '../stores/vault'

const vaultStore = useVaultStore()

// 状态
const isFirstTime = ref(true) // 默认为首次使用，等待检查结果
const loading = ref(true)
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const submitting = ref(false)

// 初始化：检查是否首次使用
onMounted(async () => {
  try {
    console.log('LockScreen: calling getMasterKeyVerify...')
    const verifyData = await window.electronAPI.db.getMasterKeyVerify()
    console.log('LockScreen: verifyData =', verifyData)
    // null 或 undefined 或空字符串都视为首次使用
    isFirstTime.value = !verifyData
    error.value = '' // 清除错误
  } catch (e) {
    console.error('LockScreen init error:', e)
    // 如果 API 调用失败，可能是首次使用（数据库未初始化）
    isFirstTime.value = true
    error.value = ''
  } finally {
    loading.value = false
  }
})

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
    // 创建验证数据
    const verifyData = await window.electronAPI.crypto.createVerifyData(password.value)
    // 存储验证数据
    await window.electronAPI.db.setMasterKeyVerify(verifyData)
    // 解锁密码库
    vaultStore.unlock(password.value)
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
      vaultStore.unlock(password.value)
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
    <div class="lock-card">
      <h1 class="title">PassLock</h1>
      <p class="subtitle">安全密码管理</p>
      
      <!-- 加载状态 -->
      <div v-if="loading" class="loading">加载中...</div>
      
      <!-- 首次使用：初始化主密码 -->
      <form v-else-if="isFirstTime" @submit.prevent="handleInit" class="form">
        <p class="hint">首次使用，请设置主密码</p>
        <input
          v-model="password"
          type="password"
          placeholder="主密码"
          class="input"
          :disabled="submitting"
          @input="clearError"
        />
        <input
          v-model="confirmPassword"
          type="password"
          placeholder="确认密码"
          class="input"
          :disabled="submitting"
          @input="clearError"
        />
        <button type="submit" class="btn" :disabled="submitting">
          {{ submitting ? '处理中...' : '初始化' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
      
      <!-- 解锁密码库 -->
      <form v-else @submit.prevent="handleUnlock" class="form">
        <p class="hint">请输入主密码解锁</p>
        <input
          v-model="password"
          type="password"
          placeholder="主密码"
          class="input"
          :disabled="submitting"
          @input="clearError"
        />
        <button type="submit" class="btn" :disabled="submitting">
          {{ submitting ? '处理中...' : '解锁' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.lock-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.lock-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 40px 32px;
  width: 320px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
  text-align: center;
}

.subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 32px;
  text-align: center;
}

.loading {
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  padding: 20px;
}

.hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 20px;
  text-align: center;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.input:focus {
  border-color: rgba(255, 255, 255, 0.4);
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #42b883;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 8px;
}

.btn:hover:not(:disabled) {
  background: #3aa876;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  font-size: 13px;
  color: #ff6b6b;
  text-align: center;
  margin-top: 8px;
}
</style>