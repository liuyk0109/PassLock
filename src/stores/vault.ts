import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ConflictEntry, ConflictAction, ImportResult } from '../types/electron'

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

  // 空闲检测状态
  const autoLockTimeout = ref<number>(5)  // 自动锁定时间(分钟)，默认5分钟
  const idleTimer = ref<number | null>(null)  // 空闲计时器ID
  const isIdleDetectionActive = ref<boolean>(false)  // 检测是否激活
  const isInitialized = ref<boolean>(false)  // 配置是否已初始化（防止竞态条件）

  // 页面切换状态
  const currentPage = ref<'vault' | 'settings'>('vault')

  // 导出状态
  const exportStatus = ref<'idle' | 'selecting' | 'exporting' | 'success' | 'error'>('idle')
  const exportError = ref('')

  // 导入状态
  const importStatus = ref<'idle' | 'selecting' | 'verifying' | 'checking' | 'conflict' | 'importing' | 'success' | 'error'>('idle')
  const importError = ref('')
  const importFilePath = ref<string | null>(null)
  const importConflicts = ref<ConflictEntry[]>([])
  const noConflictCount = ref(0)
  const conflictResolutions = ref<Map<string, ConflictAction>>(new Map())
  const importStats = ref<ImportResult['stats'] | null>(null)

  // Toast 状态
  const toast = ref<{ visible: boolean; type: 'success' | 'error'; title: string; details?: string }>({
    visible: false,
    type: 'success',
    title: '',
  })

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
  async function unlock(key: string) {
    // 等待初始化完成（防止竞态条件）
    if (!isInitialized.value) {
      await initialize()
    }
    masterKey.value = key
    isLocked.value = false
    // 解锁后启动空闲检测
    startIdleDetection()
  }

  // 空闲检测方法
  // 从数据库加载自动锁定时间配置
  async function loadAutoLockTimeout(): Promise<void> {
    try {
      const settings = await window.electronAPI.db.getSettings()
      autoLockTimeout.value = settings.autoLockTimeout ?? 5
    } catch (error) {
      console.error('Failed to load autoLockTimeout:', error)
      autoLockTimeout.value = 5  // 使用默认值
    }
  }

  // 启动空闲检测
  function startIdleDetection(): void {
    if (isIdleDetectionActive.value) return

    isIdleDetectionActive.value = true
    resetIdleTimer()
  }

  // 停止空闲检测
  function stopIdleDetection(): void {
    if (idleTimer.value !== null) {
      clearTimeout(idleTimer.value)
      idleTimer.value = null
    }
    isIdleDetectionActive.value = false
  }

  // 重置空闲计时器
  function resetIdleTimer(): void {
    if (!isIdleDetectionActive.value) return

    // 清除旧定时器
    if (idleTimer.value !== null) {
      clearTimeout(idleTimer.value)
    }

    // 如果配置为0，永不锁定
    if (autoLockTimeout.value === 0) {
      idleTimer.value = null
      return
    }

    // 设置新定时器
    const timeoutMs = autoLockTimeout.value * 60 * 1000
    idleTimer.value = window.setTimeout(() => {
      lock()  // 空闲超时，自动锁定
    }, timeoutMs)
  }

  // 初始化（预加载配置）
  async function initialize(): Promise<void> {
    await loadAutoLockTimeout()
    isInitialized.value = true
  }

  // 锁定密码库
  function lock() {
    // 停止空闲检测
    stopIdleDetection()

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
    currentPage.value = 'vault'  // 锁定时重置页面状态
    // 重置导入/导出状态
    resetImportState()
    resetExportState()
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

  // 修改主密码（调用主进程原子性操作）
  async function changeMasterPassword(
    currentPassword: string,
    newPassword: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    if (!masterKey.value) {
      throw new Error('Vault is locked')
    }

    const result = await window.electronAPI.crypto.changeMasterPassword(
      currentPassword,
      newPassword,
      onProgress
    )

    if (!result.success) {
      throw new Error(result.error || '修改密码失败')
    }

    // 更新内存中的主密码
    masterKey.value = newPassword

    // 重新加载条目（数据库中的条目已被新密码加密）
    await loadEntries()
  }

  // 切换当前页面
  function setCurrentPage(page: 'vault' | 'settings') {
    currentPage.value = page
  }

  // ============ 导出功能 ============

  // 生成默认导出文件名
  function generateBackupFileName(): string {
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
    const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    return `PassLock_Backup_${dateStr}_${timeStr}.json`
  }

  // 显示Toast（定时器由Toast.vue组件负责管理）
  function showToast(type: 'success' | 'error', title: string, details?: string) {
    toast.value = { visible: true, type, title, details }
  }

  // 导出密码库数据
  async function exportData(): Promise<void> {
    exportStatus.value = 'selecting'
    exportError.value = ''

    try {
      // 弹出保存对话框
      const result = await window.electronAPI.dialog.showSaveDialog({
        title: '导出PassLock备份',
        defaultPath: generateBackupFileName(),
        filters: [
          { name: 'JSON文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      })

      if (result.canceled || !result.filePath) {
        exportStatus.value = 'idle'
        return
      }

      exportStatus.value = 'exporting'

      // 执行导出
      const exportResult = await window.electronAPI.backup.exportData(result.filePath)

      if (exportResult.success) {
        exportStatus.value = 'success'
        // 提取文件名用于Toast显示
        const fileName = result.filePath.split(/[/\\]/).pop() || result.filePath
        showToast('success', `导出成功：${fileName}`, `共导出 ${exportResult.entryCount} 条密码条目`)
        // 重置状态
        setTimeout(() => {
          exportStatus.value = 'idle'
        }, 1000)
      } else {
        exportStatus.value = 'error'
        exportError.value = exportResult.error || '导出失败'
        showToast('error', `导出失败：${exportResult.error}`)
        setTimeout(() => {
          exportStatus.value = 'idle'
        }, 2000)
      }
    } catch (error: any) {
      exportStatus.value = 'error'
      exportError.value = error.message || '导出失败'
      showToast('error', `导出失败：${error.message}`)
      setTimeout(() => {
        exportStatus.value = 'idle'
      }, 2000)
    }
  }

  // 重置导出状态
  function resetExportState() {
    exportStatus.value = 'idle'
    exportError.value = ''
  }

  // ============ 导入功能 ============

  // 选择并开始导入文件
  async function selectAndImportFile(): Promise<void> {
    importStatus.value = 'selecting'
    importError.value = ''

    try {
      // 弹出文件选择对话框
      const result = await window.electronAPI.dialog.showOpenDialog({
        title: '导入PassLock备份',
        filters: [
          { name: 'JSON文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] },
        ],
        properties: ['openFile'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        importStatus.value = 'idle'
        return
      }

      const filePath = result.filePaths[0]
      importFilePath.value = filePath

      // 验证文件格式
      importStatus.value = 'checking'
      const parseResult = await window.electronAPI.backup.parseBackup(filePath)

      if (!parseResult.success) {
        importStatus.value = 'error'
        importError.value = parseResult.error || '文件格式不正确'
        showToast('error', parseResult.error || '文件格式不正确，请选择PassLock备份文件')
        setTimeout(() => {
          importStatus.value = 'idle'
          importFilePath.value = null
        }, 2000)
        return
      }

      // 格式正确，进入密码验证阶段
      importStatus.value = 'verifying'
    } catch (error: any) {
      importStatus.value = 'error'
      importError.value = error.message || '文件读取失败'
      showToast('error', `文件读取失败：${error.message}`)
      setTimeout(() => {
        importStatus.value = 'idle'
        importFilePath.value = null
      }, 2000)
    }
  }

  // 验证备份文件密码
  async function validateBackupPassword(password: string): Promise<boolean> {
    if (!importFilePath.value) return false

    try {
      const result = await window.electronAPI.backup.validateBackup(
        importFilePath.value,
        password
      )

      if (!result.success) {
        importError.value = result.error || '验证失败'
        return false
      }

      if (!result.isValid) {
        importError.value = '密码不匹配，无法导入此备份文件'
        return false
      }

      // 密码验证成功，检测冲突
      importStatus.value = 'checking'
      const conflictResult = await window.electronAPI.backup.checkConflicts(
        importFilePath.value
      )

      if (!conflictResult.success) {
        importStatus.value = 'error'
        importError.value = conflictResult.error || '冲突检测失败'
        showToast('error', conflictResult.error || '冲突检测失败')
        setTimeout(() => {
          importStatus.value = 'idle'
          importFilePath.value = null
        }, 2000)
        return true // 密码验证本身成功
      }

      importConflicts.value = conflictResult.conflicts
      noConflictCount.value = conflictResult.noConflictCount

      // 初始化冲突解决方案
      conflictResolutions.value = new Map()

      if (conflictResult.conflicts.length > 0) {
        // 有冲突，进入冲突处理阶段
        importStatus.value = 'conflict'
      } else {
        // 无冲突，直接导入
        await executeImport()
      }

      return true
    } catch (error: any) {
      importError.value = error.message || '验证失败'
      return false
    }
  }

  // 设置单条冲突解决方案
  function setConflictResolution(entryId: string, action: ConflictAction): void {
    conflictResolutions.value.set(entryId, action)
    // 触发响应式更新
    conflictResolutions.value = new Map(conflictResolutions.value)
  }

  // 设置全部冲突解决方案
  function setAllConflictResolutions(action: ConflictAction): void {
    for (const conflict of importConflicts.value) {
      conflictResolutions.value.set(conflict.id, action)
    }
    // 触发响应式更新
    conflictResolutions.value = new Map(conflictResolutions.value)
  }

  // 清除单条冲突解决方案（用于撤销选择）
  function removeConflictResolution(entryId: string): void {
    conflictResolutions.value.delete(entryId)
    // 触发响应式更新
    conflictResolutions.value = new Map(conflictResolutions.value)
  }

  // 执行导入操作
  async function executeImport(): Promise<void> {
    if (!importFilePath.value) return

    importStatus.value = 'importing'
    importError.value = ''

    try {
      // 构建解决方案数组
      const resolutions = Array.from(conflictResolutions.value.entries()).map(
        ([entryId, action]) => ({ entryId, action })
      )

      const result = await window.electronAPI.backup.importData(
        importFilePath.value,
        resolutions
      )

      if (result.success) {
        importStats.value = result.stats
        importStatus.value = 'success'
        // 重新加载条目
        await loadEntries()
        // 显示成功Toast
        const { added, overridden, skipped, keptBoth } = result.stats
        const parts: string[] = []
        if (added > 0) parts.push(`新增 ${added} 条`)
        if (overridden > 0) parts.push(`覆盖 ${overridden} 条`)
        if (skipped > 0) parts.push(`跳过 ${skipped} 条`)
        if (keptBoth > 0) parts.push(`保留两者 ${keptBoth} 条`)
        showToast('success', '导入成功', parts.join('，'))
        // 延迟重置
        setTimeout(() => {
          importStatus.value = 'idle'
          importFilePath.value = null
          importConflicts.value = []
          noConflictCount.value = 0
          conflictResolutions.value = new Map()
          importStats.value = null
        }, 2000)
      } else {
        importStatus.value = 'error'
        importError.value = result.error || '导入失败'
        showToast('error', result.error || '导入失败，数据已恢复')
        setTimeout(() => {
          importStatus.value = 'idle'
          importFilePath.value = null
        }, 3000)
      }
    } catch (error: any) {
      importStatus.value = 'error'
      importError.value = error.message || '导入失败'
      showToast('error', `导入失败：${error.message}`)
      setTimeout(() => {
        importStatus.value = 'idle'
        importFilePath.value = null
      }, 3000)
    }
  }

  // 重置导入状态
  function resetImportState() {
    importStatus.value = 'idle'
    importError.value = ''
    importFilePath.value = null
    importConflicts.value = []
    noConflictCount.value = 0
    conflictResolutions.value = new Map()
    importStats.value = null
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
    // 空闲检测状态
    autoLockTimeout,
    idleTimer,
    isIdleDetectionActive,
    isInitialized,
    // 页面切换状态
    currentPage,
    // 导出状态
    exportStatus,
    exportError,
    // 导入状态
    importStatus,
    importError,
    importFilePath,
    importConflicts,
    noConflictCount,
    conflictResolutions,
    importStats,
    // Toast 状态
    toast,
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
    changeMasterPassword,
    setCurrentPage,
    // 空闲检测方法
    loadAutoLockTimeout,
    startIdleDetection,
    stopIdleDetection,
    resetIdleTimer,
    initialize,
    // 导出方法
    exportData,
    resetExportState,
    generateBackupFileName,
    showToast,
    // 导入方法
    selectAndImportFile,
    validateBackupPassword,
    setConflictResolution,
    setAllConflictResolutions,
    removeConflictResolution,
    executeImport,
    resetImportState,
  }
})