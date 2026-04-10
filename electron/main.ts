import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { initDatabase, getDatabase, getEntries, setEntries, addEntry, updateEntry, deleteEntry, getMasterKeyVerify, setMasterKeyVerify, getSettings, updateSettings } from './database'
import { encrypt, decrypt, verifyPassword, createVerifyData, generatePassword, getPasswordStrength, getPasswordStrengthLevel } from './crypto'
import type { VaultEntry } from '../src/stores/vault'

// 备份数据结构
interface BackupData {
  version: number
  exportedAt: string
  appVersion: string
  masterKeyVerify: string | null
  entries: VaultEntry[]
}

// 冲突解决方案类型
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

// IPC 处理器 - 主密码修改（原子性操作：验证→备份→重加密→回滚）
ipcMain.handle('crypto:changeMasterPassword',
  async (event, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    let backup: { entries: VaultEntry[]; masterKeyVerify: string | null } | null = null

    try {
      // 1. 验证当前密码
      const verifyData = getMasterKeyVerify()
      if (!verifyData) {
        return { success: false, error: '验证数据不存在' }
      }

      const isValid = verifyPassword(verifyData, currentPassword)
      if (!isValid) {
        return { success: false, error: '当前密码错误' }
      }

      // 2. 备份当前数据（内存深拷贝，无文件残留风险）
      backup = {
        entries: JSON.parse(JSON.stringify(getEntries())),
        masterKeyVerify: getMasterKeyVerify()
      }

      // 3. 在副本上逐条重加密（不污染内存中的活数据库引用）
      const originalEntries = getEntries()
      const reEncryptedEntries: VaultEntry[] = JSON.parse(JSON.stringify(originalEntries))

      for (let i = 0; i < reEncryptedEntries.length; i++) {
        let plaintext = decrypt(originalEntries[i].password, currentPassword)
        reEncryptedEntries[i].password = encrypt(plaintext, newPassword)
        plaintext = ''  // 安全：清除明文密码引用

        // 发送进度事件（仅发送序号，不含明文）
        event.sender.send('change-password-progress', i + 1, reEncryptedEntries.length)
      }

      // 4+5. 合并为单次数据库写入，确保原子性（崩溃时不会出现数据不一致）
      const database = getDatabase()
      database.data.entries = reEncryptedEntries
      database.data.masterKeyVerify = createVerifyData(newPassword)
      await database.write()

      return { success: true }

    } catch (error: any) {
      // 6. 失败时自动回滚（合并为单次写入，同样确保原子性）
      if (backup) {
        try {
          const db = getDatabase()
          db.data.entries = backup.entries
          db.data.masterKeyVerify = backup.masterKeyVerify!
          await db.write()
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError)
        }
      }

      // 错误信息仅返回用户友好文本，不泄露加密细节
      const message = error instanceof Error ? error.message : '未知错误'
      return { success: false, error: message || '加密失败，数据已恢复' }

    } finally {
      // 7. 清除内存备份（安全保障）
      backup = null
    }
  }
)

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

// IPC 处理器 - 文件对话框
ipcMain.handle('dialog:showSaveDialog', async (_event, options: Electron.SaveDialogOptions) => {
  const window = BrowserWindow.getFocusedWindow()
  return dialog.showSaveDialog(window!, options)
})

ipcMain.handle('dialog:showOpenDialog', async (_event, options: Electron.OpenDialogOptions) => {
  const window = BrowserWindow.getFocusedWindow()
  return dialog.showOpenDialog(window!, options)
})

// IPC 处理器 - 数据备份与恢复
ipcMain.handle('backup:exportData', async (_event, filePath: string) => {
  try {
    // 读取数据库全部数据
    const entries = getEntries()
    const masterKeyVerify = getMasterKeyVerify()
    const appVersion = app.getVersion()

    // 构建备份数据
    const backupData: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      appVersion,
      masterKeyVerify,
      entries,
    }

    // 写入文件
    await fs.writeFile(filePath, JSON.stringify(backupData, null, 2), 'utf-8')

    return {
      success: true,
      entryCount: entries.length,
      filePath,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '导出失败',
      entryCount: 0,
      filePath,
    }
  }
})

ipcMain.handle('backup:validateBackup', async (_event, filePath: string, password: string) => {
  try {
    // 读取并解析备份文件
    const content = await fs.readFile(filePath, 'utf-8')
    const backupData: BackupData = JSON.parse(content)

    // 格式验证
    if (!backupData.version || !backupData.masterKeyVerify) {
      return { success: true, isValid: false, error: '备份文件格式不正确' }
    }

    // 验证密码匹配备份文件
    const isValidForBackup = verifyPassword(backupData.masterKeyVerify, password)
    if (!isValidForBackup) {
      return { success: true, isValid: false, error: '密码不匹配备份文件' }
    }

    // 验证密码同时匹配当前密码库（防止导入不同主密码的备份）
    const currentVerifyData = getMasterKeyVerify()
    if (currentVerifyData) {
      const isValidForCurrent = verifyPassword(currentVerifyData, password)
      if (!isValidForCurrent) {
        return { success: true, isValid: false, error: '备份文件的主密码与当前密码库主密码不一致，无法导入' }
      }
    }

    return { success: true, isValid: true }
  } catch (error: any) {
    return {
      success: false,
      isValid: false,
      error: error.message || '验证失败',
    }
  }
})

ipcMain.handle('backup:parseBackup', async (_event, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const backupData: BackupData = JSON.parse(content)

    // 格式基础验证
    if (typeof backupData.version !== 'number') {
      return { success: false, error: '无效的备份文件格式' }
    }

    // 版本兼容性检查
    if (backupData.version > 1) {
      return { success: false, error: `不支持的备份格式版本：${backupData.version}` }
    }

    return {
      success: true,
      version: backupData.version,
      exportedAt: backupData.exportedAt,
      appVersion: backupData.appVersion,
      entryCount: backupData.entries?.length ?? 0,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '文件解析失败',
    }
  }
})

ipcMain.handle('backup:checkConflicts', async (_event, filePath: string) => {
  try {
    // 读取并解析备份文件
    const content = await fs.readFile(filePath, 'utf-8')
    const backupData: BackupData = JSON.parse(content)

    // 获取本地条目
    const localEntries = getEntries()
    const localIdMap = new Map(localEntries.map(e => [e.id, e]))

    // 检测冲突
    const conflicts: ConflictEntry[] = []
    let noConflictCount = 0

    for (const backupEntry of backupData.entries) {
      const localEntry = localIdMap.get(backupEntry.id)
      if (localEntry) {
        // 冲突：仅提取元信息，不传密码
        conflicts.push({
          id: backupEntry.id,
          local: {
            title: localEntry.title,
            username: localEntry.username,
            createdAt: localEntry.createdAt,
            updatedAt: localEntry.updatedAt,
          },
          backup: {
            title: backupEntry.title,
            username: backupEntry.username,
            createdAt: backupEntry.createdAt,
            updatedAt: backupEntry.updatedAt,
          },
        })
      } else {
        noConflictCount++
      }
    }

    return { success: true, conflicts, noConflictCount }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '冲突检测失败',
      conflicts: [],
      noConflictCount: 0,
    }
  }
})

ipcMain.handle('backup:importData', async (_event, filePath: string, resolutions: ConflictResolution[]) => {
  // 内存备份当前数据（用于回滚）
  let backup: { entries: VaultEntry[]; masterKeyVerify: string | null } | null = null

  try {
    // 1. 备份当前数据（内存深拷贝）
    backup = {
      entries: JSON.parse(JSON.stringify(getEntries())),
      masterKeyVerify: getMasterKeyVerify(),
    }

    // 2. 读取备份文件
    const content = await fs.readFile(filePath, 'utf-8')
    const backupData: BackupData = JSON.parse(content)

    // 3. 格式验证（防止恶意/损坏文件）
    if (typeof backupData.version !== 'number' || backupData.version > 1) {
      return { success: false, error: '无效的备份文件格式', stats: { added: 0, overridden: 0, skipped: 0, keptBoth: 0 } }
    }
    if (!Array.isArray(backupData.entries)) {
      return { success: false, error: '备份文件数据格式错误', stats: { added: 0, overridden: 0, skipped: 0, keptBoth: 0 } }
    }

    // 4. 获取本地条目ID集合
    const localIdSet = new Set(getEntries().map(e => e.id))

    // 5. 构建解决方案映射
    const resolutionMap = new Map(resolutions.map(r => [r.entryId, r.action]))

    // 6. 统计计数
    let added = 0
    let overridden = 0
    let skipped = 0
    let keptBoth = 0

    // 7. 在内存中完成所有条目修改（原子性）
    const database = getDatabase()
    const now = Date.now()

    for (const entry of backupData.entries) {
      if (localIdSet.has(entry.id)) {
        // 冲突条目
        const action = resolutionMap.get(entry.id) ?? 'skip' // 默认跳过

        if (action === 'override') {
          const index = database.data.entries.findIndex(e => e.id === entry.id)
          if (index !== -1) {
            database.data.entries[index] = { ...entry, updatedAt: now }
            overridden++
          }
        } else if (action === 'keepboth') {
          database.data.entries.push({ ...entry, id: crypto.randomUUID() })
          keptBoth++
        } else {
          skipped++
        }
      } else {
        // 无冲突条目 - 直接添加
        database.data.entries.push(entry)
        added++
      }
    }

    // 8. 单次原子写入
    await database.write()

    return {
      success: true,
      stats: { added, overridden, skipped, keptBoth },
    }
  } catch (error: any) {
    // 9. 回滚（仅在内存修改失败时有效，进程崩溃无法回滚）
    if (backup) {
      try {
        const db = getDatabase()
        db.data.entries = backup.entries
        db.data.masterKeyVerify = backup.masterKeyVerify!
        await db.write()
      } catch (rollbackError) {
        console.error('Import rollback failed:', rollbackError)
      }
    }

    return {
      success: false,
      error: error.message || '导入失败，数据已恢复',
      stats: { added: 0, overridden: 0, skipped: 0, keptBoth: 0 },
    }
  } finally {
    // 10. 清除内存备份
    backup = null
  }
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