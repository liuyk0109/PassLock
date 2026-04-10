<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useVaultStore } from '../stores/vault'
import VaultHeader from './VaultHeader.vue'
import PasswordCard from './PasswordCard.vue'
import AddPasswordModal from './AddPasswordModal.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import type { NewEntryInput, EditEntryInput, VaultEntry } from '../stores/vault'

const vaultStore = useVaultStore()

// 窗口宽度状态（用于响应式）
const windowWidth = ref(window.innerWidth)

// 编辑状态
const editingEntry = ref<VaultEntry | null>(null)
const editingDecryptedPassword = ref<string | null>(null)
const showEditModal = ref(false)

// 删除确认状态
const showDeleteConfirm = ref(false)
const deletingEntryId = ref<string | null>(null)

// 处理新增按钮点击
function handleAddClick() {
  vaultStore.toggleModal()
}

// 处理锁定按钮点击
function handleLockClick() {
  vaultStore.lock()
}

// 处理设置按钮点击
function handleSettingsClick() {
  vaultStore.setCurrentPage('settings')
}

// 处理复制密码
async function handleCopyPassword(entryId: string) {
  try {
    await vaultStore.copyPassword(entryId)
  } catch (error) {
    console.error('Failed to copy password:', error)
  }
}

// 处理保存新条目
async function handleSaveEntry(input: NewEntryInput) {
  try {
    await vaultStore.createEntry(input)
    vaultStore.toggleModal()
  } catch (error) {
    console.error('Failed to save entry:', error)
  }
}

// 处理关闭弹窗
function handleCloseModal() {
  vaultStore.showModal = false
}

// 处理编辑按钮点击
async function handleEditEntry(entryId: string) {
  try {
    const entry = vaultStore.getEntry(entryId)
    if (!entry) return

    // 获取解密后的密码
    const decryptedPassword = await vaultStore.getDecryptedPassword(entryId)

    // 设置编辑状态
    editingEntry.value = entry
    editingDecryptedPassword.value = decryptedPassword
    showEditModal.value = true
  } catch (error) {
    console.error('Failed to edit entry:', error)
  }
}

// 处理删除按钮点击
function handleDeleteEntry(entryId: string) {
  deletingEntryId.value = entryId
  showDeleteConfirm.value = true
}

// 处理删除确认
async function handleConfirmDelete() {
  if (!deletingEntryId.value) return

  try {
    await vaultStore.deleteEntry(deletingEntryId.value)
  } catch (error) {
    console.error('Failed to delete entry:', error)
  } finally {
    showDeleteConfirm.value = false
    deletingEntryId.value = null
  }
}

// 处理删除取消
function handleCancelDelete() {
  showDeleteConfirm.value = false
  deletingEntryId.value = null
}

// 处理编辑保存
async function handleUpdateEntry(id: string, input: EditEntryInput) {
  try {
    await vaultStore.editEntry(id, input)
    // 关闭编辑弹窗并清理状态
    handleCloseEditModal()
  } catch (error) {
    console.error('Failed to update entry:', error)
  }
}

// 关闭编辑弹窗并清理状态
function handleCloseEditModal() {
  showEditModal.value = false
  editingEntry.value = null
  editingDecryptedPassword.value = null  // 安全：清除明文密码引用
}

// resize 处理函数
function handleResize() {
  windowWidth.value = window.innerWidth
}

// 组件挂载时加载条目
onMounted(async () => {
  await vaultStore.loadEntries()
  
  // 监听窗口宽度变化
  window.addEventListener('resize', handleResize)
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="vault-page">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
    </div>

    <!-- Header -->
    <VaultHeader 
      :entry-count="vaultStore.entryCount"
      @add-click="handleAddClick"
      @lock-click="handleLockClick"
      @settings-click="handleSettingsClick"
    />

    <!-- 卡片网格区域 -->
    <div class="cards-container">
      <!-- 搜索栏 -->
      <div v-if="vaultStore.entryCount > 0" class="search-bar">
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24">
            <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3S3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.5L20.5 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14Z" fill="currentColor"/>
          </svg>
          <input 
            type="text"
            placeholder="搜索密码条目..."
            class="search-input"
            :value="vaultStore.searchQuery"
            @input="vaultStore.setSearchQuery(($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="vaultStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p class="loading-text">正在加载密码库...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="vaultStore.entryCount === 0" class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24">
          <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM18 11C18 14.21 15.96 17.32 12 18.9C8.04 17.32 6 14.21 6 11V6.3L12 3.19L18 6.3V11ZM12 7C10.34 7 9 8.34 9 10C9 11.66 10.34 13 12 13C13.66 13 15 11.66 15 10C15 8.34 13.66 7 12 7ZM12 11C11.45 11 11 10.55 11 10C11 9.45 11.45 9 12 9C12.55 9 13 9.45 13 10C13 10.55 12.55 11 12 11Z" fill="currentColor"/>
        </svg>
        <h3 class="empty-title">暂无密码条目</h3>
        <p class="empty-desc">点击右上角「新增」添加第一条密码</p>
      </div>

      <!-- 卡片网格 -->
      <div v-else class="cards-grid">
        <TransitionGroup name="card">
          <PasswordCard
            v-for="entry in vaultStore.filteredEntries"
            :key="entry.id"
            :entry="entry"
            :is-copied="vaultStore.copiedEntryId === entry.id"
            @copy-password="handleCopyPassword"
            @edit-entry="handleEditEntry"
            @delete-entry="handleDeleteEntry"
          />
        </TransitionGroup>
      </div>

      <!-- 搜索无结果提示 -->
      <div v-if="vaultStore.entryCount > 0 && vaultStore.filteredEntries.length === 0" class="no-results">
        <p class="no-results-text">未找到匹配的密码条目</p>
      </div>
    </div>

    <!-- 新增密码弹窗 -->
    <AddPasswordModal
      :visible="vaultStore.showModal"
      @close="handleCloseModal"
      @save="handleSaveEntry"
    />

    <!-- 编辑密码弹窗 -->
    <AddPasswordModal
      :visible="showEditModal"
      mode="edit"
      :entry="editingEntry ?? undefined"
      :decrypted-password="editingDecryptedPassword ?? undefined"
      @close="handleCloseEditModal"
      @update="handleUpdateEntry"
    />

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      :visible="showDeleteConfirm"
      title="确定删除该密码条目吗？"
      message="删除后无法恢复。"
      confirm-text="删除"
      cancel-text="取消"
      :danger="true"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />
  </div>
</template>

<style scoped>
.vault-page {
  min-height: 100vh;
  background: var(--bg-gradient);
  position: relative;
  overflow-x: hidden;
}

/* 背景装饰 */
.bg-decoration {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.decoration-circle {
  position: absolute;
  border-radius: var(--radius-full);
  opacity: 0.02;
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

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30px, 20px); }
}

/* 卡片容器 */
.cards-container {
  position: relative;
  z-index: 1;
  padding: var(--space-2xl) 32px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 搜索栏 */
.search-bar {
  margin-bottom: var(--space-xl);
}

.search-input-wrapper {
  position: relative;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--text-muted);
}

.search-input {
  width: 100%;
  padding: 10px 16px 10px 40px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.search-input:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

.search-input:focus {
  border-color: var(--input-border-focus);
  background: var(--input-bg-focus);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.12);
}

.search-input::placeholder {
  color: var(--text-placeholder);
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-5xl);
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

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-5xl) var(--space-xl);
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--text-muted);
  margin-bottom: var(--space-xl);
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}

.empty-desc {
  font-size: 14px;
  color: var(--text-muted);
}

/* 卡片网格 */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(var(--card-columns, 4), 260px);
  gap: 24px 20px;
  justify-content: center;
}

/* 搜索无结果提示 */
.no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5xl);
}

.no-results-text {
  font-size: 14px;
  color: var(--text-muted);
}

/* 卡片动画 */
.card-enter-active {
  animation: card-in 0.3s ease;
}

.card-leave-active {
  animation: card-out 0.2s ease;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes card-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}

/* 响应式适配 - 使用 1199px 作为边界，确保 1200px 及以上保持4列 */
@media (max-width: 1199px) {
  .cards-grid {
    --card-columns: 3;
  }
}

@media (max-width: 1023px) {
  .cards-grid {
    --card-columns: 2;
    gap: 20px 16px;
  }

  .cards-container {
    padding: var(--space-xl);
  }
}

@media (max-width: 639px) {
  .cards-grid {
    --card-columns: 1;
    gap: 16px;
  }

  .cards-container {
    padding: var(--space-lg);
  }

  .cards-grid > * {
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
  }
}
</style>