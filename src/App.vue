<script setup lang="ts">
import { Transition, onMounted, onUnmounted } from 'vue'
import { useVaultStore } from './stores/vault'
import LockScreen from './components/LockScreen.vue'
import VaultPage from './components/VaultPage.vue'
import Settings from './components/Settings.vue'

const vaultStore = useVaultStore()

// 节流函数（泛型类型定义）
function throttle<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let lastCall = 0
  return ((...args: unknown[]) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn(...args)
    }
  }) as T
}

// 节流处理后的重置函数 (mousemove 150ms节流)
const throttledReset = throttle(() => {
  vaultStore.resetIdleTimer()
}, 150)

// 事件处理器
function handleUserActivity(eventType: string) {
  if (!vaultStore.isIdleDetectionActive) return

  // mousemove已节流，其他事件直接调用
  if (eventType === 'mousemove') {
    throttledReset()
  } else {
    vaultStore.resetIdleTimer()
  }
}

// 事件监听器引用（用于清理）
const eventHandlers = {
  mousemove: () => handleUserActivity('mousemove'),
  keydown: () => handleUserActivity('keydown'),
  click: () => handleUserActivity('click'),
}

// 生命周期管理
onMounted(async () => {
  // 预加载配置
  await vaultStore.initialize()

  // 添加全局事件监听
  window.addEventListener('mousemove', eventHandlers.mousemove)
  window.addEventListener('keydown', eventHandlers.keydown)
  window.addEventListener('click', eventHandlers.click)
})

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('mousemove', eventHandlers.mousemove)
  window.removeEventListener('keydown', eventHandlers.keydown)
  window.removeEventListener('click', eventHandlers.click)
})
</script>

<template>
  <Transition name="page" mode="out-in">
    <!-- 锁定状态：显示锁定屏幕 -->
    <LockScreen v-if="vaultStore.isLocked" key="lock" />
    
    <!-- 设置页面 -->
    <Settings v-else-if="vaultStore.currentPage === 'settings'" key="settings" />

    <!-- 解锁状态：显示密码库页面 -->
    <VaultPage v-else key="vault" />
  </Transition>
</template>

<style scoped>
/* 页面过渡动画 */
.page-enter-active {
  animation: page-in 0.3s ease;
}

.page-leave-active {
  animation: page-out 0.25s ease;
}

@keyframes page-in {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes page-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.98);
  }
}
</style>
