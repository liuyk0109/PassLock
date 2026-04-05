import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase, getEntries, setEntries, addEntry, updateEntry, deleteEntry, getMasterKeyVerify, setMasterKeyVerify, getSettings, updateSettings } from './database'
import { encrypt, decrypt, verifyPassword, createVerifyData, generatePassword, getPasswordStrength, getPasswordStrengthLevel } from './crypto'
import type { VaultEntry } from '../src/stores/vault'

// ESM 兼容的 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 禁用硬件加速（可选，某些系统上可能需要）
// app.disableHardwareAcceleration()

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 开发模式下加载 Vite 开发服务器
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    // 生产模式下加载打包后的文件
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// IPC 处理器 - 加密相关
ipcMain.handle('crypto:encrypt', (_event, plaintext: string, password: string) => {
  return encrypt(plaintext, password)
})

ipcMain.handle('crypto:decrypt', (_event, encryptedData: string, password: string) => {
  return decrypt(encryptedData, password)
})

ipcMain.handle('crypto:verifyPassword', (_event, encryptedVerifyData: string, password: string) => {
  return verifyPassword(encryptedVerifyData, password)
})

ipcMain.handle('crypto:createVerifyData', (_event, password: string) => {
  return createVerifyData(password)
})

ipcMain.handle('crypto:generatePassword', (_event, length?: number, options?: { lowercase?: boolean; uppercase?: boolean; numbers?: boolean; symbols?: boolean }) => {
  return generatePassword(length ?? 16, options)
})

ipcMain.handle('crypto:getPasswordStrength', (_event, password: string) => {
  return getPasswordStrength(password)
})

ipcMain.handle('crypto:getPasswordStrengthLevel', (_event, password: string) => {
  return getPasswordStrengthLevel(password)
})

// IPC 处理器 - 数据库相关
ipcMain.handle('db:getEntries', () => {
  return getEntries()
})

ipcMain.handle('db:setEntries', (_event, entries: VaultEntry[]) => {
  return setEntries(entries)
})

ipcMain.handle('db:addEntry', (_event, entry: VaultEntry) => {
  return addEntry(entry)
})

ipcMain.handle('db:updateEntry', (_event, id: string, updates: Partial<VaultEntry>) => {
  return updateEntry(id, updates)
})

ipcMain.handle('db:deleteEntry', (_event, id: string) => {
  return deleteEntry(id)
})

ipcMain.handle('db:getMasterKeyVerify', () => {
  return getMasterKeyVerify()
})

ipcMain.handle('db:setMasterKeyVerify', (_event, verify: string) => {
  return setMasterKeyVerify(verify)
})

ipcMain.handle('db:getSettings', () => {
  return getSettings()
})

ipcMain.handle('db:updateSettings', (_event, settings: { autoLockTimeout?: number; theme?: 'light' | 'dark' | 'system' }) => {
  return updateSettings(settings)
})

app.whenReady().then(async () => {
  // 初始化数据库
  await initDatabase()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})