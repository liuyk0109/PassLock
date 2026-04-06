import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 密码条目类型
export interface VaultEntry {
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

// 新增密码条目输入类型（明文密码，用于表单）
export interface NewEntryInput {
  title: string
  username?: string
  password: string
  site?: string
  url?: string
  notes?: string
}

// 编辑密码条目输入类型（密码可选，仅修改时传入）
export interface EditEntryInput {
  title: string
  username?: string
  password?: string  // 可选，未修改时不需要重新加密
  site?: string
  url?: string
  notes?: string
}

// 密码库状态
export const useVaultStore = defineStore('vault', () => {
  // 状态
  const isLocked = ref(true)
  const masterKey = ref<string | null>(null)
  const entries = ref<VaultEntry[]>([])
  const showModal = ref(false)
  const searchQuery = ref('')
  const copiedEntryId = ref<string | null>(null)
  const loading = ref(false)
  const clipboardClearTimer = ref<number | null>(null)  // 剪贴板清除定时器

  // 计算属性
  const entryCount = computed(() => entries.value.length)
  const isUnlocked = computed(() => !isLocked.value && masterKey.value !== null)
  
  // 过滤后的条目列表
  const filteredEntries = computed(() => {
    if (!searchQuery.value) return entries.value
    const query = searchQuery.value.toLowerCase()
    return entries.value.filter(e =>
      e.title.toLowerCase().includes(query) ||
      e.site?.toLowerCase().includes(query) ||
      e.username.toLowerCase().includes(query) ||
      e.notes?.toLowerCase().includes(query)
    )
  })

  // 解锁密码库
  function unlock(key: string) {
    masterKey.value = key
    isLocked.value = false
  }

  // 锁定密码库
  function lock() {
    // 清除剪贴板定时器
    if (clipboardClearTimer.value !== null) {
      clearTimeout(clipboardClearTimer.value)
      clipboardClearTimer.value = null
    }
    
    // 尝试立即清除剪贴板（安全增强）
    navigator.clipboard.writeText('').catch(() => {
      // 忽略清除失败
    })
    
    masterKey.value = null
    isLocked.value = true
    entries.value = []
    showModal.value = false
    searchQuery.value = ''
    copiedEntryId.value = null
  }

  // 从数据库加载条目
  async function loadEntries() {
    loading.value = true
    try {
      const dbEntries = await window.electronAPI.db.getEntries()
      entries.value = dbEntries
    } catch (error) {
      console.error('Failed to load entries:', error)
      entries.value = []
    } finally {
      loading.value = false
    }
  }

  // 创建新条目（加密并保存）
  async function createEntry(input: NewEntryInput): Promise<VaultEntry> {
    if (!masterKey.value) {
      throw new Error('Vault is locked')
    }

    if (!input.title || !input.password) {
      throw new Error('Title and password are required')
    }

    // 加密密码
    const encryptedPassword = await window.electronAPI.crypto.encrypt(
      input.password,
      masterKey.value
    )

    // 构建条目对象
    const now = Date.now()
    const entry: VaultEntry = {
      id: crypto.randomUUID(),
      title: input.title,
      username: input.username ?? '',
      password: encryptedPassword,
      site: input.site,
      url: input.url,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    }

    // 保存到数据库
    await window.electronAPI.db.addEntry(entry)

    // 更新本地状态（添加到顶部）
    entries.value.unshift(entry)

    return entry
  }

  // 复制密码到剪贴板（30秒后自动清除）
  async function copyPassword(entryId: string): Promise<void> {
    if (!masterKey.value) {
      throw new Error('Vault is locked')
    }

    const entry = entries.value.find(e => e.id === entryId)
    if (!entry) {
      throw new Error('Entry not found')
    }

    // 解密密码
    const plaintext = await window.electronAPI.crypto.decrypt(
      entry.password,
      masterKey.value
    )

    // 清除之前的定时器
    if (clipboardClearTimer.value !== null) {
      clearTimeout(clipboardClearTimer.value)
      clipboardClearTimer.value = null
    }

    // 写入剪贴板
    await navigator.clipboard.writeText(plaintext)

    // 设置复制状态
    copiedEntryId.value = entryId

    // 30秒后清除剪贴板和状态
    clipboardClearTimer.value = window.setTimeout(async () => {
      try {
        await navigator.clipboard.writeText('')
      } catch {
        // 忽略清除失败
      }
      copiedEntryId.value = null
      clipboardClearTimer.value = null
    }, 30000)  // 30秒
  }

  // 切换弹窗状态
  function toggleModal() {
    showModal.value = !showModal.value
  }

  // 设置搜索关键词
  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  // 添加条目（本地操作，已弃用，使用 createEntry）
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

  // 更新条目（本地操作）
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

  // 编辑条目（加密并更新）
  async function editEntry(id: string, input: EditEntryInput): Promise<VaultEntry> {
    if (!masterKey.value) {
      throw new Error('Vault is locked')
    }

    const index = entries.value.findIndex(e => e.id === id)
    if (index === -1) {
      throw new Error('Entry not found')
    }

    // 构建 updates 对象
    const updates: Partial<VaultEntry> = {
      title: input.title,
      username: input.username ?? '',
      site: input.site,
      url: input.url,
      notes: input.notes,
      updatedAt: Date.now(),
    }

    // 如果密码有修改，加密新密码
    if (input.password) {
      const encryptedPassword = await window.electronAPI.crypto.encrypt(
        input.password,
        masterKey.value
      )
      updates.password = encryptedPassword
    }

    // 更新数据库
    await window.electronAPI.db.updateEntry(id, updates)

    // 更新本地状态
    entries.value[index] = {
      ...entries.value[index],
      ...updates,
    }

    return entries.value[index]
  }

  // 获取解密后的密码（供编辑弹窗使用）
  async function getDecryptedPassword(entryId: string): Promise<string> {
    if (!masterKey.value) {
      throw new Error('Vault is locked')
    }

    const entry = entries.value.find(e => e.id === entryId)
    if (!entry) {
      throw new Error('Entry not found')
    }

    // 解密密码
    const plaintext = await window.electronAPI.crypto.decrypt(
      entry.password,
      masterKey.value
    )

    return plaintext
  }

  // 删除条目
  async function deleteEntry(id: string): Promise<boolean> {
    const index = entries.value.findIndex(e => e.id === id)
    if (index !== -1) {
      await window.electronAPI.db.deleteEntry(id)
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
    showModal,
    searchQuery,
    copiedEntryId,
    loading,
    // 计算属性
    entryCount,
    isUnlocked,
    filteredEntries,
    // 方法
    unlock,
    lock,
    loadEntries,
    createEntry,
    copyPassword,
    toggleModal,
    setSearchQuery,
    addEntry,
    updateEntry,
    editEntry,
    getDecryptedPassword,
    deleteEntry,
    getEntry,
    setEntries,
  }
})