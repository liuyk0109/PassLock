import { app } from 'electron'
import { join } from 'path'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { VaultEntry } from '../src/stores/vault'

// 数据库数据结构
interface DatabaseData {
  version: number
  settings: {
    autoLockTimeout: number // 自动锁定时间(分钟)
    theme: 'light' | 'dark' | 'system'
  }
  entries: VaultEntry[]
  // 加密的主密码验证数据
  masterKeyVerify: string | null
}

// 默认数据
const defaultData: DatabaseData = {
  version: 1,
  settings: {
    autoLockTimeout: 5,
    theme: 'system',
  },
  entries: [],
  masterKeyVerify: null,
}

// 数据库实例
let db: Low<DatabaseData> | null = null

// 初始化数据库
export async function initDatabase(): Promise<Low<DatabaseData>> {
  if (db) return db

  // 获取用户数据目录
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'vault.json')

  // 创建适配器
  const adapter = new JSONFile<DatabaseData>(dbPath)

  // 创建数据库实例
  db = new Low<DatabaseData>(adapter, defaultData)

  // 读取数据
  await db.read()

  // 如果数据为空，使用默认数据初始化
  if (!db.data) {
    db.data = defaultData
    await db.write()
  }

  return db
}

// 获取数据库实例
export function getDatabase(): Low<DatabaseData> {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

// 保存数据
export async function saveDatabase(): Promise<void> {
  const database = getDatabase()
  await database.write()
}

// 获取设置
export function getSettings() {
  return getDatabase().data.settings
}

// 更新设置
export async function updateSettings(settings: Partial<DatabaseData['settings']>) {
  const database = getDatabase()
  database.data.settings = { ...database.data.settings, ...settings }
  await saveDatabase()
}

// 获取所有条目
export function getEntries(): VaultEntry[] {
  return getDatabase().data.entries
}

// 设置所有条目
export async function setEntries(entries: VaultEntry[]): Promise<void> {
  const database = getDatabase()
  database.data.entries = entries
  await saveDatabase()
}

// 添加条目
export async function addEntry(entry: VaultEntry): Promise<void> {
  const database = getDatabase()
  database.data.entries.push(entry)
  await saveDatabase()
}

// 更新条目
export async function updateEntry(id: string, updates: Partial<VaultEntry>): Promise<boolean> {
  const database = getDatabase()
  const index = database.data.entries.findIndex(e => e.id === id)
  if (index !== -1) {
    database.data.entries[index] = {
      ...database.data.entries[index],
      ...updates,
      updatedAt: Date.now(),
    }
    await saveDatabase()
    return true
  }
  return false
}

// 删除条目
export async function deleteEntry(id: string): Promise<boolean> {
  const database = getDatabase()
  const index = database.data.entries.findIndex(e => e.id === id)
  if (index !== -1) {
    database.data.entries.splice(index, 1)
    await saveDatabase()
    return true
  }
  return false
}

// 主密码验证数据操作
export function getMasterKeyVerify(): string | null {
  return getDatabase().data.masterKeyVerify
}

export async function setMasterKeyVerify(verify: string): Promise<void> {
  const database = getDatabase()
  database.data.masterKeyVerify = verify
  await saveDatabase()
}