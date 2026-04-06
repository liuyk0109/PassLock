<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Emits 定义
interface Emits {
  (e: 'use-password', password: string): void
}

const emit = defineEmits<Emits>()

// 生成配置状态
const length = ref(16)
const lowercase = ref(true)
const uppercase = ref(true)
const numbers = ref(true)
const symbols = ref(true)

// 生成的密码
const generatedPassword = ref('')
const strengthLevel = ref<'weak' | 'medium' | 'strong' | 'very-strong'>('medium')
const generating = ref(false)

// 强度显示文本
const strengthText = computed(() => {
  const levels = {
    'weak': '弱',
    'medium': '中等',
    'strong': '强',
    'very-strong': '非常强'
  }
  return levels[strengthLevel.value]
})

// 强度显示颜色
const strengthColor = computed(() => {
  const colors = {
    'weak': 'var(--strength-weak)',
    'medium': 'var(--strength-medium)',
    'strong': 'var(--strength-strong)',
    'very-strong': 'var(--strength-excellent)'
  }
  return colors[strengthLevel.value]
})

// 强度进度条宽度
const strengthPercent = computed(() => {
  const percentages = {
    'weak': 25,
    'medium': 50,
    'strong': 75,
    'very-strong': 100
  }
  return percentages[strengthLevel.value]
})

// 生成密码
async function generateNewPassword() {
  generating.value = true
  try {
    // 调用 Electron API 生成密码
    const password = await window.electronAPI.crypto.generatePassword(length.value, {
      lowercase: lowercase.value,
      uppercase: uppercase.value,
      numbers: numbers.value,
      symbols: symbols.value
    })
    generatedPassword.value = password

    // 获取密码强度
    const level = await window.electronAPI.crypto.getPasswordStrengthLevel(password)
    strengthLevel.value = level
  } catch (error) {
    console.error('Failed to generate password:', error)
    generatedPassword.value = ''
    strengthLevel.value = 'weak'
  } finally {
    generating.value = false
  }
}

// 使用生成的密码
function handleUsePassword() {
  if (generatedPassword.value) {
    emit('use-password', generatedPassword.value)
  }
}

// 监听配置变化，自动重新生成
watch([length, lowercase, uppercase, numbers, symbols], () => {
  // 确保至少选择一个字符类型
  if (lowercase.value || uppercase.value || numbers.value || symbols.value) {
    generateNewPassword()
  }
})

// 初始生成
generateNewPassword()
</script>

<template>
  <div class="password-generator">
    <!-- 密码预览 -->
    <div class="password-preview">
      <div class="preview-header">
        <span class="preview-label">生成的密码</span>
        <div class="strength-indicator">
          <div class="strength-bar">
            <div 
              class="strength-fill"
              :style="{ width: strengthPercent + '%', background: strengthColor }"
            ></div>
          </div>
          <span class="strength-text" :style="{ color: strengthColor }">
            {{ strengthText }}
          </span>
        </div>
      </div>
      <div class="preview-content">
        <span v-if="generating" class="preview-loading">生成中...</span>
        <span v-else class="preview-password">{{ generatedPassword }}</span>
      </div>
    </div>

    <!-- 配置选项 -->
    <div class="generator-options">
      <!-- 密码长度 -->
      <div class="option-row">
        <label class="option-label">密码长度</label>
        <div class="length-control">
          <input 
            type="range"
            v-model.number="length"
            min="8"
            max="32"
            class="length-slider"
          />
          <span class="length-value">{{ length }}</span>
        </div>
      </div>

      <!-- 字符类型选项 -->
      <div class="option-row checkbox-row">
        <label class="checkbox-item">
          <input type="checkbox" v-model="lowercase" />
          <span class="checkbox-label">小写字母 (a-z)</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" v-model="uppercase" />
          <span class="checkbox-label">大写字母 (A-Z)</span>
        </label>
      </div>
      <div class="option-row checkbox-row">
        <label class="checkbox-item">
          <input type="checkbox" v-model="numbers" />
          <span class="checkbox-label">数字 (0-9)</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" v-model="symbols" />
          <span class="checkbox-label">特殊符号</span>
        </label>
      </div>
    </div>

    <!-- 使用按钮 -->
    <button class="use-btn" @click="handleUsePassword" :disabled="!generatedPassword || generating">
      <svg class="btn-icon" viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
      </svg>
      使用此密码
    </button>
  </div>
</template>

<style scoped>
.password-generator {
  padding: var(--space-lg);
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

/* 密码预览 */
.password-preview {
  margin-bottom: var(--space-lg);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.preview-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.preview-content {
  padding: var(--space-md);
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.05);
  min-height: 32px;
  display: flex;
  align-items: center;
}

.preview-loading {
  font-size: 14px;
  color: var(--text-muted);
}

.preview-password {
  font-size: 14px;
  font-family: 'Consolas', 'Monaco', monospace;
  color: var(--text-primary);
  word-break: break-all;
  letter-spacing: 0.5px;
}

/* 强度指示器 */
.strength-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.strength-bar {
  width: 60px;
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

/* 配置选项 */
.generator-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.checkbox-row {
  justify-content: flex-start;
  gap: var(--space-xl);
}

.option-label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 密码长度控制 */
.length-control {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.length-slider {
  width: 100px;
  height: 4px;
  cursor: pointer;
}

.length-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary-500);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(20, 184, 166, 0.3);
}

.length-slider::-webkit-slider-runnable-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
}

.length-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-400);
  min-width: 24px;
}

/* 复选框样式 */
.checkbox-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
}

.checkbox-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  appearance: none;
  position: relative;
}

.checkbox-item input[type="checkbox"]:checked {
  background: var(--primary-500);
  border-color: var(--primary-500);
}

.checkbox-item input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 使用按钮 */
.use-btn {
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--primary-gradient);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
}

.use-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
  box-shadow: 0 6px 16px rgba(20, 184, 166, 0.35);
}

.use-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.use-btn .btn-icon {
  width: 16px;
  height: 16px;
}
</style>