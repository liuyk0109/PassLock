<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useVaultStore } from '../stores/vault'
import ChangePasswordModal from './ChangePasswordModal.vue'
import ImportConflictDialog from './ImportConflictDialog.vue'

const vaultStore = useVaultStore()

// 修改密码弹窗状态
const showChangePasswordModal = ref(false)

// 导入密码验证弹窗状态
const showImportVerifyModal = ref(false)
const importPassword = ref('')
const showImportPassword = ref(false)
const importVerifyError = ref('')
const importVerifyLoading = ref(false)

// 返回密码库
function handleBack() {
  vaultStore.setCurrentPage('vault')
}

// 打开修改密码弹窗
function handleChangePassword() {
  showChangePasswordModal.value = true
}

// 关闭修改密码弹窗
function handleCloseChangePassword() {
  showChangePasswordModal.value = false
}

// 修改密码成功
function handlePasswordChangeSuccess() {
  showChangePasswordModal.value = false
}

// 导出数据
function handleExport() {
  if (vaultStore.exportStatus === 'exporting') return
  vaultStore.exportData()
}

// 导入数据 - 选择文件
function handleImport() {
  if (vaultStore.importStatus !== 'idle') return
  vaultStore.selectAndImportFile()
}

// 监听导入状态变化，弹出密码验证弹窗
watch(() => vaultStore.importStatus, (newStatus) => {
  if (newStatus === 'verifying') {
    showImportVerifyModal.value = true
    importPassword.value = ''
    showImportPassword.value = false
    importVerifyError.value = ''
  } else {
    showImportVerifyModal.value = false
  }
})

// 验证导入密码
async function handleImportVerify() {
  if (!importPassword.value) return
  importVerifyLoading.value = true
  importVerifyError.value = ''

  try {
    const isValid = await vaultStore.validateBackupPassword(importPassword.value)
    if (!isValid) {
      importVerifyError.value = vaultStore.importError || '密码不匹配，无法导入此备份文件'
    }
  } catch (error: any) {
    importVerifyError.value = error.message || '验证失败'
  } finally {
    importVerifyLoading.value = false
  }
}

// 关闭导入密码验证弹窗
function handleCloseImportVerify() {
  showImportVerifyModal.value = false
  vaultStore.resetImportState()
}

// 处理导入验证弹窗背景点击
function handleImportVerifyBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    handleCloseImportVerify()
  }
}

// ESC键关闭验证弹窗
function handleImportKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showImportVerifyModal.value) {
    handleCloseImportVerify()
  }
}

// 格式化时间戳
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// 导出中状态
const isExporting = computed(() => vaultStore.exportStatus === 'exporting')

onMounted(() => {
  window.addEventListener('keydown', handleImportKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleImportKeydown)
})
</script>

<template>
  <div class="settings-page">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
    </div>

    <!-- Header -->
    <header class="settings-header">
      <div class="header-left">
        <button class="back-btn" @click="handleBack" title="返回密码库">
          <svg viewBox="0 0 24 24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
          </svg>
        </button>
        <h1 class="header-title">PassLock Settings</h1>
      </div>
    </header>

    <!-- 设置内容区域 -->
    <div class="settings-content">
      <!-- 安全设置卡片 -->
      <div class="settings-card">
        <!-- 卡片标题 -->
        <div class="card-header">
          <svg class="card-icon" viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="currentColor"/>
          </svg>
          <span class="card-title">安全设置</span>
        </div>

        <!-- 修改主密码行 -->
        <div class="setting-item" @click="handleChangePassword">
          <div class="setting-info">
            <span class="setting-title">主密码</span>
            <span class="setting-desc">用于解锁密码库的核心密码</span>
          </div>
          <div class="setting-right">
            <svg class="setting-icon" viewBox="0 0 24 24">
              <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.71.29l-1.96 1.96 3.92 3.92 1.96-1.96c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zM3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>
            </svg>
            <svg class="setting-arrow" viewBox="0 0 24 24">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- 数据管理卡片 -->
      <div class="settings-card data-card">
        <div class="card-header">
          <svg class="card-icon data-icon" viewBox="0 0 24 24">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
          <span class="card-title">数据管理</span>
        </div>

        <!-- 导出数据 -->
        <div class="setting-item" :class="{ 'setting-item-disabled': isExporting }" @click="handleExport">
          <div class="setting-info">
            <span class="setting-title">导出数据</span>
            <span class="setting-desc">将密码库导出为加密JSON备份文件</span>
          </div>
          <div class="setting-right">
            <svg v-if="isExporting" class="setting-icon spinning" viewBox="0 0 24 24">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" fill="currentColor"/>
            </svg>
            <svg v-else class="setting-icon" viewBox="0 0 24 24">
              <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z" fill="currentColor"/>
            </svg>
            <svg class="setting-arrow" viewBox="0 0 24 24">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/>
            </svg>
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="card-divider"></div>

        <!-- 导入数据 -->
        <div class="setting-item" @click="handleImport">
          <div class="setting-info">
            <span class="setting-title">导入数据</span>
            <span class="setting-desc">从备份文件恢复密码库数据</span>
          </div>
          <div class="setting-right">
            <svg class="setting-icon" viewBox="0 0 24 24">
              <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6-.67l2.59 2.58L17 14.5l-5-5-5 5 1.41 1.41L11 12.67V21h2v-8.67z" fill="currentColor"/>
            </svg>
            <svg class="setting-arrow" viewBox="0 0 24 24">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部安全提示 -->
    <div class="settings-footer">
      <div class="footer-divider"></div>
      <div class="footer-content">
        <svg class="footer-icon" viewBox="0 0 24 24">
          <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 11.99H19C18.47 16.11 15.72 19.78 12 20.93V12H5V6.3L12 3.19V11.99Z" fill="currentColor"/>
        </svg>
        <span class="footer-text">端到端加密 · 本地存储</span>
      </div>
    </div>

    <!-- 修改密码弹窗 -->
    <ChangePasswordModal
      :visible="showChangePasswordModal"
      @close="handleCloseChangePassword"
      @success="handlePasswordChangeSuccess"
    />

    <!-- 导入密码验证弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showImportVerifyModal"
          class="modal-backdrop"
          @click="handleImportVerifyBackdropClick"
        >
          <div class="modal-container">
            <!-- Header -->
            <div class="modal-header">
              <h2 class="modal-title">验证主密码</h2>
              <button class="close-btn" @click="handleCloseImportVerify">
                <svg class="close-icon" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z" fill="currentColor"/>
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="modal-body">
              <p class="verify-description">导入备份文件需要验证当前主密码</p>

              <div class="input-wrapper">
                <input
                  v-model="importPassword"
                  :type="showImportPassword ? 'text' : 'password'"
                  placeholder="输入当前主密码"
                  class="input"
                  :disabled="importVerifyLoading"
                  @keyup.enter="handleImportVerify"
                  @input="importVerifyError = ''"
                />
                <button
                  type="button"
                  class="visibility-btn"
                  @click="showImportPassword = !showImportPassword"
                >
                  <svg v-if="showImportPassword" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="currentColor"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24">
                    <path d="M12 7C14.76 7 17 9.24 17 12C17 12.65 16.87 13.26 16.63 13.83L19.56 16.76C21.07 15.49 22.26 13.86 22.97 12C21.26 7.61 17 4.5 12 4.5C10.63 4.5 9.32 4.74 8.11 5.17L10.23 7.29C10.74 7.11 11.36 7 12 7ZM2.71 3.16L5.26 5.71C3.53 7.02 2.14 8.85 1.31 11C2.92 15.39 7.16 18.5 12 18.5C13.49 18.5 14.91 18.21 16.21 17.67L18.82 20.28L20.23 18.87L4.12 2.75L2.71 3.16ZM7.53 8.98L9.19 10.64C9.07 11.07 9 11.53 9 12C9 14.21 10.79 16 13 16C13.47 16 13.93 15.93 14.36 15.81L16.02 17.47C15.08 17.94 14.05 18.2 12.97 18.2C9.18 18.2 6.17 15.19 6.17 11.4C6.17 10.52 6.32 9.68 6.58 8.9L7.53 8.98Z" fill="currentColor"/>
                  </svg>
                </button>
              </div>

              <!-- 警告提示 -->
              <div class="verify-warning">
                <svg class="warning-icon" viewBox="0 0 24 24">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>
                </svg>
                <span>密码必须与备份文件的主密码一致才能导入</span>
              </div>

              <!-- 错误提示 -->
              <div v-if="importVerifyError" class="error-box">
                <svg class="error-icon" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
                </svg>
                <span>{{ importVerifyError }}</span>
              </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer">
              <button class="btn-cancel" @click="handleCloseImportVerify">
                取消
              </button>
              <button
                class="btn-save"
                :disabled="!importPassword || importVerifyLoading"
                @click="handleImportVerify"
              >
                {{ importVerifyLoading ? '验证中...' : '验证并导入' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 冲突处理弹窗 -->
    <ImportConflictDialog
      :visible="vaultStore.importStatus === 'conflict'"
      :conflicts="vaultStore.importConflicts"
      :no-conflict-count="vaultStore.noConflictCount"
      :resolutions="vaultStore.conflictResolutions"
      @set-resolution="vaultStore.setConflictResolution"
      @remove-resolution="vaultStore.removeConflictResolution"
      @set-all-resolutions="vaultStore.setAllConflictResolutions"
      @confirm="vaultStore.executeImport()"
      @cancel="vaultStore.resetImportState()"
    />

    <!-- Toast 提示 -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="vaultStore.toast.visible"
          class="toast"
          :class="vaultStore.toast.type"
        >
          <div class="toast-icon-wrapper">
            <svg v-if="vaultStore.toast.type === 'success'" class="toast-icon" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17z" fill="currentColor"/>
            </svg>
            <svg v-else class="toast-icon" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
            </svg>
          </div>
          <div class="toast-content">
            <span class="toast-title">{{ vaultStore.toast.title }}</span>
            <span v-if="vaultStore.toast.details" class="toast-details">{{ vaultStore.toast.details }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.settings-page {
  min-height: 100vh;
  background: var(--bg-gradient);
  position: relative;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
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

/* Header */
.settings-header {
  height: 72px;
  padding: 0 var(--space-2xl);
  background: rgba(38, 38, 38, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.back-btn {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.back-btn svg {
  width: 18px;
  height: 18px;
}

.header-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 设置内容区域 */
.settings-content {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: var(--space-3xl) 32px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 设置卡片 */
.settings-card {
  width: 420px;
  max-width: 90vw;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-2xl);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(16px);
  margin-bottom: var(--space-3xl);
}

.card-header {
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.card-icon {
  width: 18px;
  height: 18px;
  color: var(--primary-400);
}

.data-icon {
  color: var(--accent-500);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 设置项行 */
.setting-item {
  padding: var(--space-lg) var(--space-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background 0.2s;
}

.setting-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.setting-item:active {
  background: rgba(255, 255, 255, 0.06);
}

.setting-item-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.setting-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.setting-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.setting-right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.setting-icon {
  width: 18px;
  height: 18px;
  color: var(--text-muted);
}

.setting-arrow {
  width: 20px;
  height: 20px;
  color: var(--text-muted);
}

/* 卡片内分隔线 */
.card-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: 0 var(--space-xl);
}

/* 旋转动画 */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 底部安全提示 */
.settings-footer {
  position: relative;
  z-index: 1;
  padding: 0 32px var(--space-2xl);
  margin-top: auto;
}

.footer-divider {
  height: 1px;
  background: rgba(250, 250, 250, 0.05);
  margin-bottom: var(--space-lg);
  max-width: 420px;
  margin-left: auto;
  margin-right: auto;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

.footer-icon {
  width: 16px;
  height: 16px;
  color: var(--primary-400);
  opacity: 0.6;
}

.footer-text {
  font-size: 12px;
  color: var(--text-muted);
}

/* ============ 导入验证弹窗样式 ============ */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  width: 420px;
  max-width: 90vw;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-2xl);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(16px);
  position: relative;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
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

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.close-icon {
  width: 18px;
  height: 18px;
}

.modal-body {
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.verify-description {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
}

.input-wrapper {
  position: relative;
}

.input {
  width: 100%;
  padding: 14px 48px 14px 16px;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-lg);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.input:hover:not(:disabled) {
  border-color: rgba(250, 250, 250, 0.12);
}

.input:focus:not(:disabled) {
  border-color: var(--input-border-focus);
  background: var(--input-bg-focus);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.12);
}

.input:disabled {
  opacity: 0.6;
}

.input::placeholder {
  color: var(--text-placeholder);
}

.visibility-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: var(--space-xs);
  cursor: pointer;
  color: rgba(250, 250, 250, 0.4);
  transition: color 0.2s;
}

.visibility-btn:hover {
  color: rgba(250, 250, 250, 0.7);
}

.visibility-btn svg {
  width: 20px;
  height: 20px;
}

.verify-warning {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 12px;
  color: var(--warning);
}

.warning-icon {
  width: 14px;
  height: 14px;
  color: var(--warning);
  flex-shrink: 0;
}

.error-box {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--error-bg);
  border: 1px solid var(--error-border);
  border-radius: 10px;
  padding: var(--space-md) var(--space-lg);
}

.error-icon {
  width: 18px;
  height: 18px;
  color: var(--error);
  flex-shrink: 0;
}

.error-box span {
  font-size: 13px;
  color: var(--error);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-md);
  padding: var(--space-lg) var(--space-xl);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
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

.btn-save {
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

.btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
  box-shadow: 0 6px 20px rgba(20, 184, 166, 0.4);
  transform: translateY(-1px);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ============ Toast 样式 ============ */
.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-xl);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 1200;
  min-width: 280px;
  max-width: 90vw;
}

.toast.success {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.toast.error {
  background: var(--error-bg);
  border: 1px solid var(--error-border);
}

.toast-icon-wrapper {
  flex-shrink: 0;
}

.toast-icon {
  width: 20px;
  height: 20px;
}

.toast.success .toast-icon {
  color: var(--success-text);
}

.toast.error .toast-icon {
  color: var(--error);
}

.toast-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.toast-title {
  font-size: 14px;
  font-weight: 600;
}

.toast.success .toast-title {
  color: var(--success-text);
}

.toast.error .toast-title {
  color: var(--error);
}

.toast-details {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 弹窗动画 */
.modal-enter-active {
  animation: modal-in 0.3s ease;
}

.modal-leave-active {
  animation: modal-out 0.25s ease;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes modal-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(20px);
  }
}

/* Toast 动画 */
.toast-enter-active {
  animation: toast-in 0.3s ease;
}

.toast-leave-active {
  animation: toast-out 0.3s ease;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes toast-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* 响应式适配 */
@media (max-width: 639px) {
  .settings-header {
    padding: 0 var(--space-lg);
  }

  .header-title {
    display: none;
  }

  .settings-content {
    padding: var(--space-xl);
  }
}
</style>
