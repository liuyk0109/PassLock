// Electron preload script - 使用 CommonJS 兼容写法
// @ts-ignore
const { contextBridge, ipcRenderer } = require('electron')

// 类型导入 (仅用于类型检查，不会打包)
type VaultEntry = {
  id: string
  title: string
  username: string
  password: string
  site?: string
  url?: string
  notes?: string
  icon?: string
  createdAt: number
  updatedAt: number
}

interface PasswordOptions {
  lowercase?: boolean
  uppercase?: boolean
  numbers?: boolean
  symbols?: boolean
}

interface Settings {
  autoLockTimeout?: number
  theme?: 'light' | 'dark' | 'system'
}

// 文件对话框类型
interface FileFilter {
  name: string
  extensions: string[]
}

interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: FileFilter[]
}

interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  filters?: FileFilter[]
  properties?: Array<'openFile' | 'multiSelections'>
}

// 修改主密码结果类型
interface ChangeMasterPasswordResult {
  success: boolean
  error?: string
}

// 备份相关类型
interface ExportResult {
  success: boolean
  error?: string
  entryCount: number
  filePath: string
}

interface ValidateResult {
  success: boolean
  error?: string
  isValid: boolean
}

interface ParseResult {
  success: boolean
  error?: string
  version?: number
  exportedAt?: string
  appVersion?: string
  entryCount?: number
}

type ConflictAction = 'override' | 'skip' | 'keepboth'

interface ConflictResolution {
  entryId: string
  action: ConflictAction
}

interface EntrySummary {
  title: string
  username: string
  createdAt: number
  updatedAt: number
}

interface ConflictEntry {
  id: string
  local: EntrySummary
  backup: EntrySummary
}

interface ConflictCheckResult {
  success: boolean
  error?: string
  conflicts: ConflictEntry[]
  noConflictCount: number
}

interface ImportResult {
  success: boolean
  error?: string
  stats: {
    added: number
    overridden: number
    skipped: number
    keptBoth: number
  }
}

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 加密 API
  crypto: {
    encrypt: (plaintext: string, password: string) =>
      ipcRenderer.invoke('crypto:encrypt', plaintext, password),
    decrypt: (encryptedData: string, password: string) =>
      ipcRenderer.invoke('crypto:decrypt', encryptedData, password),
    verifyPassword: (encryptedVerifyData: string, password: string) =>
      ipcRenderer.invoke('crypto:verifyPassword', encryptedVerifyData, password),
    createVerifyData: (password: string) =>
      ipcRenderer.invoke('crypto:createVerifyData', password),
    generatePassword: (length?: number, options?: PasswordOptions) =>
      ipcRenderer.invoke('crypto:generatePassword', length, options),
    getPasswordStrength: (password: string) =>
      ipcRenderer.invoke('crypto:getPasswordStrength', password),
    getPasswordStrengthLevel: (password: string) =>
      ipcRenderer.invoke('crypto:getPasswordStrengthLevel', password),
    // 修改主密码（含进度回调）
    changeMasterPassword: (
      currentPassword: string,
      newPassword: string,
      onProgress?: (current: number, total: number) => void
    ): Promise<ChangeMasterPasswordResult> => {
      const progressChannel = 'change-password-progress'
      let handler: ((_event: any, current: number, total: number) => void) | null = null

      // 注册进度监听（保存引用，用于精确移除）
      if (onProgress) {
        handler = (_event: any, current: number, total: number) => {
          onProgress(current, total)
        }
        ipcRenderer.on(progressChannel, handler)
      }

      // 调用主进程
      return ipcRenderer.invoke('crypto:changeMasterPassword', currentPassword, newPassword)
        .finally(() => {
          // 精确移除本次注册的监听器，不影响其他来源
          if (handler) {
            ipcRenderer.removeListener(progressChannel, handler)
          }
        })
    },
  },

  // 数据库 API
  db: {
    getEntries: () => ipcRenderer.invoke('db:getEntries'),
    setEntries: (entries: VaultEntry[]) => ipcRenderer.invoke('db:setEntries', entries),
    addEntry: (entry: VaultEntry) => ipcRenderer.invoke('db:addEntry', entry),
    updateEntry: (id: string, updates: Partial<VaultEntry>) =>
      ipcRenderer.invoke('db:updateEntry', id, updates),
    deleteEntry: (id: string) => ipcRenderer.invoke('db:deleteEntry', id),
    getMasterKeyVerify: () => ipcRenderer.invoke('db:getMasterKeyVerify'),
    setMasterKeyVerify: (verify: string) => ipcRenderer.invoke('db:setMasterKeyVerify', verify),
    getSettings: () => ipcRenderer.invoke('db:getSettings'),
    updateSettings: (settings: Settings) => ipcRenderer.invoke('db:updateSettings', settings),
  },

  // 文件对话框 API
  dialog: {
    showSaveDialog: (options?: SaveDialogOptions) =>
      ipcRenderer.invoke('dialog:showSaveDialog', options),
    showOpenDialog: (options?: OpenDialogOptions) =>
      ipcRenderer.invoke('dialog:showOpenDialog', options),
  },

  // 备份操作 API
  backup: {
    exportData: (filePath: string): Promise<ExportResult> =>
      ipcRenderer.invoke('backup:exportData', filePath),
    validateBackup: (filePath: string, password: string): Promise<ValidateResult> =>
      ipcRenderer.invoke('backup:validateBackup', filePath, password),
    parseBackup: (filePath: string): Promise<ParseResult> =>
      ipcRenderer.invoke('backup:parseBackup', filePath),
    checkConflicts: (filePath: string): Promise<ConflictCheckResult> =>
      ipcRenderer.invoke('backup:checkConflicts', filePath),
    importData: (filePath: string, resolutions: ConflictResolution[]): Promise<ImportResult> =>
      ipcRenderer.invoke('backup:importData', filePath, resolutions),
  },
})

console.log('Preload script loaded successfully')