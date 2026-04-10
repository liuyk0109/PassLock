<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { ConflictEntry, ConflictAction } from '../types/electron'

// Props 定义
interface Props {
  visible: boolean
  conflicts: ConflictEntry[]
  noConflictCount: number
  resolutions: Map<string, ConflictAction>
}

const props = defineProps<Props>()

// Emits 定义
interface Emits {
  (e: 'set-resolution', entryId: string, action: ConflictAction): void
  (e: 'remove-resolution', entryId: string): void
  (e: 'set-all-resolutions', action: ConflictAction): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

// 获取条目的当前选择
function getResolution(entryId: string): ConflictAction | undefined {
  return props.resolutions.get(entryId)
}

// 选择冲突解决方案
function handleSetResolution(entryId: string, action: ConflictAction) {
  emit('set-resolution', entryId, action)
}

// 清除冲突解决方案（撤销选择）
function handleRemoveResolution(entryId: string) {
  emit('remove-resolution', entryId)
}

// 快捷操作
function handleSetAll(action: ConflictAction) {
  emit('set-all-resolutions', action)
}

// 确认导入
function handleConfirm() {
  emit('confirm')
}

// 取消
function handleCancel() {
  emit('cancel')
}

// 处理背景点击关闭
function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    handleCancel()
  }
}

// ESC键关闭
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleCancel()
  }
}

// 格式化时间戳
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// 获取操作显示文本
function getActionLabel(action: ConflictAction): string {
  const labels: Record<ConflictAction, string> = {
    override: '覆盖',
    skip: '跳过',
    keepboth: '保留两者',
  }
  return labels[action]
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="conflict">
      <div
        v-if="props.visible"
        class="conflict-dialog-backdrop"
        @click="handleBackdropClick"
      >
        <div class="conflict-dialog-container">
          <!-- Header -->
          <div class="conflict-header">
            <h2 class="conflict-title">导入冲突处理</h2>
            <button class="conflict-close" @click="handleCancel">
              <svg class="close-icon" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z" fill="currentColor"/>
              </svg>
            </button>
          </div>

          <!-- 描述 -->
          <div class="conflict-description">
            检测到 <span class="conflict-count">{{ props.conflicts.length }}</span> 条冲突条目，请选择处理方式：
          </div>

          <!-- 冲突列表 -->
          <div class="conflict-list">
            <div
              v-for="(conflict, index) in props.conflicts"
              :key="conflict.id"
              class="conflict-item"
            >
              <!-- 条目标题 -->
              <div class="conflict-item-header">
                <span class="conflict-badge"></span>
                <span class="conflict-item-title">冲突条目 {{ index + 1 }}</span>
              </div>

              <!-- 条目详情 -->
              <div class="entry-details">
                <div class="entry-row">
                  <span class="entry-label">本地：</span>
                  <span class="entry-title">{{ conflict.local.title }}</span>
                  <span class="entry-info">· {{ conflict.local.username }}</span>
                  <span class="entry-info">· 创建于 {{ formatDate(conflict.local.createdAt) }}</span>
                </div>
                <div class="entry-row">
                  <span class="entry-label">备份：</span>
                  <span class="entry-title">{{ conflict.backup.title }}</span>
                  <span class="entry-info">· {{ conflict.backup.username }}</span>
                  <span class="entry-info">· 创建于 {{ formatDate(conflict.backup.createdAt) }}</span>
                </div>
              </div>

              <!-- 操作按钮 / 已选择状态 -->
              <div v-if="getResolution(conflict.id)" class="selected-indicator">
                <svg class="selected-icon" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17z" fill="currentColor"/>
                </svg>
                <span>已选择：{{ getActionLabel(getResolution(conflict.id)!) }}</span>
                <button class="change-btn" @click="handleRemoveResolution(conflict.id)">更改</button>
              </div>
              <div v-else class="action-buttons">
                <button
                  class="action-btn override"
                  @click="handleSetResolution(conflict.id, 'override')"
                >
                  覆盖
                </button>
                <button
                  class="action-btn skip"
                  @click="handleSetResolution(conflict.id, 'skip')"
                >
                  跳过
                </button>
                <button
                  class="action-btn keepboth"
                  @click="handleSetResolution(conflict.id, 'keepboth')"
                >
                  保留两者
                </button>
              </div>
            </div>
          </div>

          <!-- 快捷操作 + 统计 -->
          <div class="quick-actions">
            <span class="quick-label">快捷操作：</span>
            <div class="quick-buttons">
              <button class="quick-btn" @click="handleSetAll('override')">全部覆盖</button>
              <button class="quick-btn" @click="handleSetAll('skip')">全部跳过</button>
              <button class="quick-btn" @click="handleSetAll('keepboth')">全部保留两者</button>
            </div>
          </div>

          <div class="stats-info" v-if="props.noConflictCount > 0">
            无冲突条目：<span class="stats-count">{{ props.noConflictCount }}</span> 条将自动导入
          </div>

          <!-- Footer -->
          <div class="conflict-footer">
            <button class="btn-cancel" @click="handleCancel">
              取消
            </button>
            <button class="btn-confirm" @click="handleConfirm">
              确认导入
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 背景层 */
.conflict-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

/* 弹窗容器 */
.conflict-dialog-container {
  width: 520px;
  max-width: 90vw;
  max-height: 70vh;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-2xl);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
}

/* Header */
.conflict-header {
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conflict-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.conflict-close {
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

.conflict-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.close-icon {
  width: 18px;
  height: 18px;
}

/* 描述区域 */
.conflict-description {
  padding: var(--space-lg) var(--space-xl);
  font-size: 14px;
  color: var(--text-secondary);
}

.conflict-count {
  color: var(--error);
  font-weight: 500;
}

/* 冲突列表 */
.conflict-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md) var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* 冲突条目 */
.conflict-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-lg);
}

.conflict-item-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.conflict-badge {
  width: 8px;
  height: 8px;
  background: var(--error);
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.conflict-item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

/* 条目详情 */
.entry-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: var(--space-sm);
}

.entry-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 13px;
}

.entry-label {
  color: var(--text-tertiary);
  min-width: 40px;
}

.entry-info {
  color: var(--text-secondary);
}

.entry-title {
  color: var(--text-primary);
  font-weight: 500;
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding-top: var(--space-sm);
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

/* 覆盖按钮 */
.action-btn.override {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
  color: var(--error);
}

.action-btn.override:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* 跳过按钮 */
.action-btn.skip {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
}

.action-btn.skip:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 保留两者按钮 */
.action-btn.keepboth {
  background: rgba(20, 184, 166, 0.1);
  border-color: rgba(20, 184, 166, 0.2);
  color: var(--primary-400);
}

.action-btn.keepboth:hover {
  background: rgba(20, 184, 166, 0.15);
}

/* 已选择状态 */
.selected-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding: var(--space-sm);
  font-size: 13px;
  color: var(--text-secondary);
}

.selected-icon {
  width: 14px;
  height: 14px;
  color: var(--success-text);
}

.change-btn {
  padding: 2px 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-tertiary);
  font-size: 12px;
  cursor: pointer;
  margin-left: var(--space-xs);
  transition: background 0.2s;
}

.change-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

/* 快捷操作 */
.quick-actions {
  padding: var(--space-md) var(--space-xl);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.quick-label {
  font-size: 13px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.quick-buttons {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.quick-btn {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.quick-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

/* 统计信息 */
.stats-info {
  padding: var(--space-sm) var(--space-xl);
  font-size: 13px;
  color: var(--text-muted);
}

.stats-count {
  color: var(--text-secondary);
  font-weight: 500;
}

/* Footer */
.conflict-footer {
  padding: var(--space-lg) var(--space-xl);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-md);
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

.btn-confirm {
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

.btn-confirm:hover {
  background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
  box-shadow: 0 6px 20px rgba(20, 184, 166, 0.4);
  transform: translateY(-1px);
}

/* 弹窗动画 */
.conflict-enter-active {
  animation: conflict-in 0.3s ease;
}

.conflict-leave-active {
  animation: conflict-out 0.25s ease;
}

@keyframes conflict-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes conflict-out {
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
@media (max-width: 599px) {
  .conflict-dialog-container {
    width: 90vw;
    min-width: 320px;
  }
}

@media (max-width: 479px) {
  .conflict-list {
    max-height: 50vh;
  }
}
</style>
