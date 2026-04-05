import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 密码条目类型
export interface VaultEntry {
  id: string
  title: string
  username: string
  password: string
  url?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

// 密码库状态
export const useVaultStore = defineStore('vault', () => {
  // 状态
  const isLocked = ref(true)
  const masterKey = ref<string | null>(null)
  const entries = ref<VaultEntry[]>([])

  // 计算属性
  const entryCount = computed(() => entries.value.length)
  const isUnlocked = computed(() => !isLocked.value && masterKey.value !== null)

  // 解锁密码库
  function unlock(key: string) {
    masterKey.value = key
    isLocked.value = false
  }

  // 锁定密码库
  function lock() {
    masterKey.value = null
    isLocked.value = true
  }

  // 添加条目
  function addEntry(entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = Date.now()
    const newEntry: VaultEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }
    entries.value.push(newEntry)
    return newEntry
  }

  // 更新条目
  function updateEntry(id: string, updates: Partial<Omit<VaultEntry, 'id' | 'createdAt'>>) {
    const index = entries.value.findIndex(e => e.id === id)
    if (index !== -1) {
      entries.value[index] = {
        ...entries.value[index],
        ...updates,
        updatedAt: Date.now(),
      }
      return true
    }
    return false
  }

  // 删除条目
  function deleteEntry(id: string) {
    const index = entries.value.findIndex(e => e.id === id)
    if (index !== -1) {
      entries.value.splice(index, 1)
      return true
    }
    return false
  }

  // 获取条目
  function getEntry(id: string) {
    return entries.value.find(e => e.id === id)
  }

  // 设置所有条目 (从数据库加载)
  function setEntries(newEntries: VaultEntry[]) {
    entries.value = newEntries
  }

  return {
    // 状态
    isLocked,
    masterKey,
    entries,
    // 计算属性
    entryCount,
    isUnlocked,
    // 方法
    unlock,
    lock,
    addEntry,
    updateEntry,
    deleteEntry,
    getEntry,
    setEntries,
  }
})