<script setup lang="ts">
import { ref, computed } from 'vue'
import type { VaultEntry } from '../stores/vault'

// Props 定义
interface Props {
  entry: VaultEntry
  isCopied?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isCopied: false
})

// Emits 定义
interface Emits {
  (e: 'copy-password', entryId: string): void
  (e: 'edit-entry', entryId: string): void
  (e: 'delete-entry', entryId: string): void
}

const emit = defineEmits<Emits>()

// 本地 hover 状态
const isHovered = ref(false)

// 计算备注显示内容
const notesDisplay = computed(() => {
  if (!props.entry.notes) return '—'
  return props.entry.notes
})

// 处理复制按钮点击
function handleCopy() {
  emit('copy-password', props.entry.id)
}
</script>

<template>
  <div 
    class="password-card"
    :class="{ 'is-copied': props.isCopied }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- 卡片内容 -->
    <div class="card-content">
      <!-- 第一行：图标 + 名称 -->
      <div class="card-header">
        <div class="icon-wrapper">
          <svg class="entry-icon" viewBox="0 0 24 24">
            <path d="M12.65 10C11.7 7.31 9.05 5.25 6 5.25C2.69 5.25 0 7.94 0 11.25C0 14.56 2.69 17.25 6 17.25C9.05 17.25 11.7 15.19 12.65 12.5H18V17.25H21V12.5H23V8.5H12.65V10ZM6 14.25C4.34 14.25 3 12.91 3 11.25C3 9.59 4.34 8.25 6 8.25C7.66 8.25 9 9.59 9 11.25C9 12.91 7.66 14.25 6 14.25Z" fill="currentColor"/>
          </svg>
        </div>
        <span class="entry-title">{{ props.entry.title }}</span>
      </div>

      <!-- 第二行：网站/应用名 -->
      <div class="card-site">
        <span class="site-text">{{ props.entry.site || props.entry.title }}</span>
      </div>

      <!-- 第三行：备注 -->
      <div class="card-notes">
        <span class="notes-text">{{ notesDisplay }}</span>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="card-divider"></div>

    <!-- 底部：操作按钮区 -->
    <div class="card-footer">
      <!-- 复制按钮 -->
      <button 
        class="copy-btn"
        :class="{ 'copied': props.isCopied }"
        @click="handleCopy"
        title="复制密码"
      >
        <svg v-if="!props.isCopied" class="btn-icon" viewBox="0 0 24 24">
          <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
        </svg>
        <svg v-else class="btn-icon check-icon" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
        </svg>
        <span v-if="props.isCopied" class="copied-text">已复制</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.password-card {
  width: 260px;
  height: 160px;
  background: rgba(38, 38, 38, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-2xl);
  display: flex;
  flex-direction: column;
  padding: var(--space-lg);
  transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.password-card:hover {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  background: rgba(38, 38, 38, 0.85);
}

.password-card.is-copied {
  border-color: var(--primary-500);
  box-shadow: 0 4px 20px rgba(20, 184, 166, 0.25);
}

/* 卡片内容 */
.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-height: 0;
}

/* 第一行：图标 + 名称 */
.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.icon-wrapper {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.entry-icon {
  width: 24px;
  height: 24px;
  color: var(--primary-400);
}

.entry-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* 第二行：网站/应用名 */
.card-site {
  display: flex;
  align-items: center;
}

.site-text {
  font-size: 14px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 第三行：备注 */
.card-notes {
  display: flex;
  align-items: flex-start;
  min-height: 28px;
}

.notes-text {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 14px;
}

/* 分隔线 */
.card-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: var(--space-sm) 0;
}

/* 底部：操作按钮区 */
.card-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

/* 复制按钮 */
.copy-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  border: none;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.copy-btn:hover {
  background: rgba(20, 184, 166, 0.15);
  color: var(--primary-400);
}

.copy-btn.copied {
  background: rgba(20, 184, 166, 0.2);
  color: var(--primary-400);
  width: auto;
  padding: 0 var(--space-md);
}

.copy-btn .btn-icon {
  width: 16px;
  height: 16px;
}

.copy-btn .check-icon {
  color: var(--success);
}

.copy-btn .copied-text {
  font-size: 12px;
  font-weight: 500;
}

/* 响应式适配 */
@media (max-width: 640px) {
  .password-card {
    width: 100%;
    max-width: 320px;
  }
}
</style>