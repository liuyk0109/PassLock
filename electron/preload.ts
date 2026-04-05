// Electron preload script - 使用 CommonJS 兼容写法
// @ts-ignore
const { contextBridge, ipcRenderer } = require('electron')

// 类型导入 (仅用于类型检查，不会打包)
type VaultEntry = {
  id: string
  title: string
  username: string
  password: string
  url?: string
  notes?: string
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
})

console.log('Preload script loaded successfully')