<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

// Props 定义
interface Props {
  visible: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '确定删除？',
  message: '此操作无法撤销。',
  confirmText: '删除',
  cancelText: '取消',
  danger: true
})

// Emits 定义
interface Emits {
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

// 处理确认
function handleConfirm() {
  emit('confirm')
}

// 处理取消
function handleCancel() {
  emit('cancel')
}

// 处理背景点击关闭
function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    handleCancel()
  }
}

// 处理 ESC 键关闭
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleCancel()
  }
}

// 组件挂载时添加键盘监听
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

// 组件卸载时移除键盘监听
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div 
        v-if="props.visible"
        class="confirm-backdrop"
        @click="handleBackdropClick"
      >
        <div class="confirm-container">
          <!-- 警告图标 -->
          <div class="warning-icon-wrapper">
            <svg class="warning-icon" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
            </svg>
          </div>

          <!-- 标题 -->
          <h3 class="confirm-title">{{ props.title }}</h3>

          <!-- 描述 -->
          <p class="confirm-message">{{ props.message }}</p>

          <!-- 按钮区 -->
          <div class="confirm-actions">
            <button class="btn-cancel" @click="handleCancel">
              {{ props.cancelText }}
            </button>
            <button 
              class="btn-confirm" 
              :class="{ 'btn-danger': props.danger }"
              @click="handleConfirm"
            >
              {{ props.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 背景层 */
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

/* 对话框容器 */
.confirm-container {
  width: 360px;
  max-width: 90vw;
  background: var(--card-bg);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-xl);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

/* 警告图标 */
.warning-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.warning-icon {
  width: 48px;
  height: 48px;
  color: var(--error);
}

/* 标题 */
.confirm-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

/* 描述 */
.confirm-message {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.5;
}

/* 按钮区 */
.confirm-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding-top: var(--space-md);
}

/* 取消按钮 */
.btn-cancel {
  padding: 10px 24px;
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

/* 确认按钮 */
.btn-confirm {
  padding: 10px 24px;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}

/* 危险风格按钮 */
.btn-confirm.btn-danger {
  background: rgba(239, 68, 68, 0.9);
  color: white;
}

.btn-confirm.btn-danger:hover {
  background: #ef4444;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* 动画 */
.confirm-enter-active {
  animation: confirm-in 0.25s ease;
}

.confirm-leave-active {
  animation: confirm-out 0.2s ease;
}

@keyframes confirm-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes confirm-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}
</style>