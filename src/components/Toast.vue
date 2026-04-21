<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { useVaultStore } from '../stores/vault'

const vaultStore = useVaultStore()

// 定时器引用（用于清理）
let hideTimer: number | null = null

// 监听toast状态变化，自动隐藏
watch(() => vaultStore.toast.visible, (visible) => {
  if (visible) {
    // 清除旧定时器
    if (hideTimer !== null) {
      clearTimeout(hideTimer)
    }
    // 3秒后自动隐藏
    hideTimer = window.setTimeout(() => {
      vaultStore.toast.visible = false
      hideTimer = null
    }, 3000)
  }
})

// 手动关闭Toast
function closeToast() {
  if (hideTimer !== null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  vaultStore.toast.visible = false
}

// 组件卸载时清理定时器
onUnmounted(() => {
  if (hideTimer !== null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div 
        v-if="vaultStore.toast.visible"
        class="toast-container"
        :class="vaultStore.toast.type"
      >
        <!-- 图标 -->
        <svg class="toast-icon" viewBox="0 0 24 24">
          <!-- 错误图标 -->
          <template v-if="vaultStore.toast.type === 'error'">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
          </template>
          <!-- 成功图标 -->
          <template v-else>
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor"/>
          </template>
        </svg>
        
        <!-- 内容 -->
        <div class="toast-content">
          <span class="toast-title">{{ vaultStore.toast.title }}</span>
          <span v-if="vaultStore.toast.details" class="toast-details">{{ vaultStore.toast.details }}</span>
        </div>
        
        <!-- 关闭按钮 -->
        <button class="toast-close" @click="closeToast">
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 320px;
  min-width: 200px;
  padding: 12px 16px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 9999;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* 错误样式 */
.toast-container.error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.2);
}

/* 成功样式 */
.toast-container.success {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
  box-shadow: 0 4px 20px rgba(34, 197, 94, 0.2);
}

.toast-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toast-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.toast-details {
  font-size: 12px;
  opacity: 0.8;
  line-height: 1.3;
}

.toast-close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.toast-close:hover {
  opacity: 1;
}

.toast-close svg {
  width: 16px;
  height: 16px;
}

/* Toast动画 - 使用全局样式中的动画定义 */
.toast-enter-active {
  animation: toast-in 0.3s ease;
}

.toast-leave-active {
  animation: toast-out 0.25s ease forwards;
}
</style>