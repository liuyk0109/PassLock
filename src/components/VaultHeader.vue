<script setup lang="ts">
// Props 定义
interface Props {
  entryCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  entryCount: 0
})

// Emits 定义
interface Emits {
  (e: 'add-click'): void
  (e: 'lock-click'): void
  (e: 'settings-click'): void
}

const emit = defineEmits<Emits>()

// 处理新增按钮点击
function handleAddClick() {
  emit('add-click')
}

// 处理设置按钮点击
function handleSettingsClick() {
  emit('settings-click')
}

// 处理锁定按钮点击
function handleLockClick() {
  emit('lock-click')
}
</script>

<template>
  <header class="vault-header">
    <!-- 左侧：Logo + 标题 -->
    <div class="header-left">
      <div class="logo-container">
        <svg class="logo-icon" viewBox="0 0 24 24">
          <path d="M12 2C9.243 2 7 4.243 7 7V9H6C4.895 9 4 9.895 4 11V20C4 21.105 4.895 22 6 22H18C19.105 22 20 21.105 20 20V11C20 9.895 19.105 9 18 9H17V7C17 4.243 14.757 2 12 2ZM12 4C13.654 4 15 5.346 15 7V9H9V7C9 5.346 10.346 4 12 4Z" fill="currentColor"/>
        </svg>
      </div>
      <div class="header-title">
        <h1 class="title">密码库</h1>
        <span class="entry-count">共 {{ props.entryCount }} 条记录</span>
      </div>
    </div>

    <!-- 右侧：操作按钮 -->
    <div class="header-right">
      <!-- 新增按钮 -->
      <button class="btn-add" @click="handleAddClick">
        <svg class="btn-icon" viewBox="0 0 24 24">
          <path d="M19 13H13V19H11V13H5V11H13V5H19V11H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
        </svg>
        <span class="btn-text">新增</span>
      </button>

      <!-- 设置按钮 -->
      <button class="btn-settings" @click="handleSettingsClick" title="设置">
        <svg class="btn-icon" viewBox="0 0 24 24">
          <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.46,5.33c-0.59,0.24-1.13,0.57-1.62,0.94L5.45,5.31c-0.22-0.08-0.47,0-0.59,0.22L2.94,8.84 c-0.12,0.21-0.08,0.47,0.12,0.61l2.03,1.58C5.05,11.33,5.03,11.64,5.03,12c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" fill="currentColor"/>
        </svg>
      </button>

      <!-- 锁定按钮 -->
      <button class="btn-lock" @click="handleLockClick" title="锁定密码库">
        <svg class="btn-icon" viewBox="0 0 24 24">
          <path d="M18 8H17V6C17 3.24 14.76 1 12 1S7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15S10.9 13 12 13 14 13.9 14 15 13.1 17 12 17ZM15 8H9V6C9 4.34 10.34 3 12 3S15 4.34 15 6V8Z" fill="currentColor"/>
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.vault-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
  padding: 0 var(--space-2xl);
  background: rgba(38, 38, 38, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

/* 左侧区域 */
.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.logo-container {
  width: 32px;
  height: 32px;
  background: var(--primary-gradient);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.2);
}

.logo-icon {
  width: 18px;
  height: 18px;
  color: white;
}

.header-title {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.entry-count {
  font-size: 14px;
  color: var(--text-secondary);
}

/* 右侧区域 */
.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

/* 新增按钮 */
.btn-add {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 10px 20px;
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

.btn-add:hover {
  background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
  box-shadow: 0 6px 20px rgba(20, 184, 166, 0.4);
  transform: translateY(-1px);
}

.btn-add:active {
  transform: translateY(0);
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* 锁定按钮 */
.btn-lock, .btn-settings {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.btn-lock:hover, .btn-settings:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
}

.btn-lock .btn-icon, .btn-settings .btn-icon {
  width: 18px;
  height: 18px;
}

/* 响应式适配 */
@media (max-width: 639px) {
  .vault-header {
    padding: 0 var(--space-lg);
  }

  .header-title {
    display: none;
  }

  .btn-add .btn-text {
    display: none;
  }

  .btn-add {
    padding: 10px;
  }
}
</style>