<script setup lang="ts">
import { useVaultStore } from './stores/vault'
import LockScreen from './components/LockScreen.vue'

const vaultStore = useVaultStore()
</script>

<template>
  <!-- 锁定状态：显示锁定屏幕 -->
  <LockScreen v-if="vaultStore.isLocked" />
  
  <!-- 解锁状态：显示密码列表（占位） -->
  <div v-else class="vault">
    <h1>密码库</h1>
    <p>已解锁，共 {{ vaultStore.entryCount }} 条记录</p>
    <p class="hint">（密码列表页面待开发）</p>
  </div>
</template>

<style scoped>
.vault {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
}

.vault h1 {
  font-size: 24px;
  margin-bottom: 16px;
}

.vault p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.vault .hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 8px;
}
</style>
