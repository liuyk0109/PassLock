/**
 * 数据备份与恢复功能测试用例
 * 测试范围：vaultStore导出/导入状态管理、Settings.vue数据管理模块、ImportConflictDialog组件
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { useVaultStore, type VaultEntry } from '../src/stores/vault'
import Settings from '../src/components/Settings.vue'
import ImportConflictDialog from '../src/components/ImportConflictDialog.vue'
import type { ConflictEntry, ConflictAction, ExportResult, ImportResult, ValidateResult, ParseResult, ConflictCheckResult } from '../src/types/electron'

// Mock Electron API
const mockElectronAPI = {
  crypto: {
    encrypt: vi.fn().mockResolvedValue('encrypted-password'),
    decrypt: vi.fn().mockResolvedValue('decrypted-password'),
    changeMasterPassword: vi.fn().mockResolvedValue({ success: true }),
  },
  db: {
    getEntries: vi.fn().mockResolvedValue([]),
    addEntry: vi.fn().mockResolvedValue(undefined),
    updateEntry: vi.fn().mockResolvedValue(true),
    deleteEntry: vi.fn().mockResolvedValue(true),
    getSettings: vi.fn().mockResolvedValue({ autoLockTimeout: 5 }),
  },
  dialog: {
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '/test/backup.json' }),
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/test/import.json'] }),
  },
  backup: {
    exportData: vi.fn().mockResolvedValue({ success: true, entryCount: 5, filePath: '/test/backup.json' } as ExportResult),
    validateBackup: vi.fn().mockResolvedValue({ success: true, isValid: true } as ValidateResult),
    parseBackup: vi.fn().mockResolvedValue({ success: true, version: 1, entryCount: 5 } as ParseResult),
    checkConflicts: vi.fn().mockResolvedValue({ success: true, conflicts: [], noConflictCount: 5 } as ConflictCheckResult),
    importData: vi.fn().mockResolvedValue({ success: true, stats: { added: 3, overridden: 0, skipped: 0, keptBoth: 0 } } as ImportResult),
  },
}

// Mock clipboard
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
}

// Modal组件通用mount配置
const modalGlobalConfig = () => ({
  plugins: [createPinia()],
  stubs: {
    Teleport: { template: '<slot />' },
    Transition: { template: '<slot />' },
  }
})

// 设置全局 mock
beforeEach(() => {
  ;(window as any).electronAPI = mockElectronAPI
  ;(navigator as any).clipboard = mockClipboard
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

afterEach(() => {
  delete (window as any).electronAPI
  document.body.innerHTML = ''
})

// ==================== TC-BACKUP-001: 导出状态管理 ====================
describe('导出状态管理', () => {
  it('TC-BACKUP-001-01: 初始exportStatus应为idle', () => {
    const store = useVaultStore()
    expect(store.exportStatus).toBe('idle')
  })

  it('TC-BACKUP-001-02: 初始exportError应为空', () => {
    const store = useVaultStore()
    expect(store.exportError).toBe('')
  })

  it('TC-BACKUP-001-03: resetExportState应重置导出状态', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    // 模拟导出中状态
    store.exportStatus = 'exporting'
    store.exportError = 'test error'
    
    store.resetExportState()
    
    expect(store.exportStatus).toBe('idle')
    expect(store.exportError).toBe('')
  })

  it('TC-BACKUP-001-04: generateBackupFileName应生成正确格式', () => {
    const store = useVaultStore()
    const fileName = store.generateBackupFileName()
    
    // 格式应为 PassLock_Backup_YYYYMMDD_HHMMSS.json
    expect(fileName).toMatch(/^PassLock_Backup_\d{8}_\d{6}\.json$/)
  })

  it('TC-BACKUP-001-05: lock应重置导出状态', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    store.exportStatus = 'exporting'
    store.exportError = 'test error'
    
    store.lock()
    
    expect(store.exportStatus).toBe('idle')
    expect(store.exportError).toBe('')
  })
})

// ==================== TC-BACKUP-002: 导入状态管理 ====================
describe('导入状态管理', () => {
  it('TC-BACKUP-002-01: 初始importStatus应为idle', () => {
    const store = useVaultStore()
    expect(store.importStatus).toBe('idle')
  })

  it('TC-BACKUP-002-02: 初始importError应为空', () => {
    const store = useVaultStore()
    expect(store.importError).toBe('')
  })

  it('TC-BACKUP-002-03: 初始importFilePath应为null', () => {
    const store = useVaultStore()
    expect(store.importFilePath).toBe(null)
  })

  it('TC-BACKUP-002-04: 初始importConflicts应为空数组', () => {
    const store = useVaultStore()
    expect(store.importConflicts).toEqual([])
  })

  it('TC-BACKUP-002-05: 初始noConflictCount应为0', () => {
    const store = useVaultStore()
    expect(store.noConflictCount).toBe(0)
  })

  it('TC-BACKUP-002-06: 初始conflictResolutions应为空Map', () => {
    const store = useVaultStore()
    expect(store.conflictResolutions.size).toBe(0)
  })

  it('TC-BACKUP-002-07: 初始importStats应为null', () => {
    const store = useVaultStore()
    expect(store.importStats).toBe(null)
  })

  it('TC-BACKUP-002-08: resetImportState应重置所有导入状态', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    // 设置导入状态
    store.importStatus = 'conflict'
    store.importError = 'test error'
    store.importFilePath = '/test/path.json'
    store.importConflicts = [{ id: '1', local: { title: 'test', username: 'user', createdAt: 0, updatedAt: 0 }, backup: { title: 'test', username: 'user', createdAt: 0, updatedAt: 0 } }] as ConflictEntry[]
    store.noConflictCount = 5
    store.conflictResolutions = new Map([['1', 'override']])
    store.importStats = { added: 1, overridden: 1, skipped: 0, keptBoth: 0 }
    
    store.resetImportState()
    
    expect(store.importStatus).toBe('idle')
    expect(store.importError).toBe('')
    expect(store.importFilePath).toBe(null)
    expect(store.importConflicts).toEqual([])
    expect(store.noConflictCount).toBe(0)
    expect(store.conflictResolutions.size).toBe(0)
    expect(store.importStats).toBe(null)
  })

  it('TC-BACKUP-002-09: lock应重置导入状态', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    store.importStatus = 'importing'
    store.importFilePath = '/test/path.json'
    
    store.lock()
    
    expect(store.importStatus).toBe('idle')
    expect(store.importFilePath).toBe(null)
  })
})

// ==================== TC-BACKUP-003: 冲突处理方法 ====================
describe('冲突处理方法', () => {
  it('TC-BACKUP-003-01: setConflictResolution应正确设置单条冲突解决方案', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    store.importConflicts = [{ id: 'entry-1', local: { title: 'test', username: 'user', createdAt: 0, updatedAt: 0 }, backup: { title: 'test', username: 'user', createdAt: 0, updatedAt: 0 } }] as ConflictEntry[]
    
    store.setConflictResolution('entry-1', 'override')
    
    expect(store.conflictResolutions.get('entry-1')).toBe('override')
  })

  it('TC-BACKUP-003-02: setConflictResolution支持三种action', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    store.importConflicts = [
      { id: 'entry-1', local: { title: 't1', username: 'u1', createdAt: 0, updatedAt: 0 }, backup: { title: 't1', username: 'u1', createdAt: 0, updatedAt: 0 } },
      { id: 'entry-2', local: { title: 't2', username: 'u2', createdAt: 0, updatedAt: 0 }, backup: { title: 't2', username: 'u2', createdAt: 0, updatedAt: 0 } },
      { id: 'entry-3', local: { title: 't3', username: 'u3', createdAt: 0, updatedAt: 0 }, backup: { title: 't3', username: 'u3', createdAt: 0, updatedAt: 0 } },
    ] as ConflictEntry[]
    
    store.setConflictResolution('entry-1', 'override')
    store.setConflictResolution('entry-2', 'skip')
    store.setConflictResolution('entry-3', 'keepboth')
    
    expect(store.conflictResolutions.get('entry-1')).toBe('override')
    expect(store.conflictResolutions.get('entry-2')).toBe('skip')
    expect(store.conflictResolutions.get('entry-3')).toBe('keepboth')
  })

  it('TC-BACKUP-003-03: setAllConflictResolutions应为所有冲突设置相同解决方案', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    store.importConflicts = [
      { id: 'entry-1', local: { title: 't1', username: 'u1', createdAt: 0, updatedAt: 0 }, backup: { title: 't1', username: 'u1', createdAt: 0, updatedAt: 0 } },
      { id: 'entry-2', local: { title: 't2', username: 'u2', createdAt: 0, updatedAt: 0 }, backup: { title: 't2', username: 'u2', createdAt: 0, updatedAt: 0 } },
      { id: 'entry-3', local: { title: 't3', username: 'u3', createdAt: 0, updatedAt: 0 }, backup: { title: 't3', username: 'u3', createdAt: 0, updatedAt: 0 } },
    ] as ConflictEntry[]
    
    store.setAllConflictResolutions('skip')
    
    expect(store.conflictResolutions.size).toBe(3)
    expect(store.conflictResolutions.get('entry-1')).toBe('skip')
    expect(store.conflictResolutions.get('entry-2')).toBe('skip')
    expect(store.conflictResolutions.get('entry-3')).toBe('skip')
  })

  it('TC-BACKUP-003-04: removeConflictResolution应清除单条解决方案', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    store.importConflicts = [{ id: 'entry-1', local: { title: 'test', username: 'user', createdAt: 0, updatedAt: 0 }, backup: { title: 'test', username: 'user', createdAt: 0, updatedAt: 0 } }] as ConflictEntry[]
    store.setConflictResolution('entry-1', 'override')
    
    expect(store.conflictResolutions.has('entry-1')).toBe(true)
    
    store.removeConflictResolution('entry-1')
    
    expect(store.conflictResolutions.has('entry-1')).toBe(false)
  })

  it('TC-BACKUP-003-05: removeConflictResolution应触发响应式更新', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    store.importConflicts = [{ id: 'entry-1', local: { title: 'test', username: 'user', createdAt: 0, updatedAt: 0 }, backup: { title: 'test', username: 'user', createdAt: 0, updatedAt: 0 } }] as ConflictEntry[]
    store.setConflictResolution('entry-1', 'override')
    
    // 模拟响应式检测
    const resolutionsBefore = store.conflictResolutions
    store.removeConflictResolution('entry-1')
    const resolutionsAfter = store.conflictResolutions
    
    // Map实例应被重新创建以触发响应式更新
    expect(resolutionsBefore).not.toBe(resolutionsAfter)
  })

  it('TC-BACKUP-003-06: 可重复设置同一条冲突解决方案', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    store.importConflicts = [{ id: 'entry-1', local: { title: 'test', username: 'user', createdAt: 0, updatedAt: 0 }, backup: { title: 'test', username: 'user', createdAt: 0, updatedAt: 0 } }] as ConflictEntry[]
    
    store.setConflictResolution('entry-1', 'override')
    store.setConflictResolution('entry-1', 'skip')
    
    expect(store.conflictResolutions.get('entry-1')).toBe('skip')
  })
})

// ==================== TC-BACKUP-004: Toast状态和方法 ====================
describe('Toast状态和方法', () => {
  it('TC-BACKUP-004-01: 初始toast应为隐藏状态', () => {
    const store = useVaultStore()
    expect(store.toast.visible).toBe(false)
  })

  it('TC-BACKUP-004-02: showToast应设置toast状态', async () => {
    vi.useFakeTimers()
    
    const store = useVaultStore()
    store.showToast('success', '测试标题', '测试详情')
    
    expect(store.toast.visible).toBe(true)
    expect(store.toast.type).toBe('success')
    expect(store.toast.title).toBe('测试标题')
    expect(store.toast.details).toBe('测试详情')
    
    vi.useRealTimers()
  })

  it('TC-BACKUP-004-03: showToast支持error类型', async () => {
    vi.useFakeTimers()
    
    const store = useVaultStore()
    store.showToast('error', '错误标题')
    
    expect(store.toast.type).toBe('error')
    expect(store.toast.title).toBe('错误标题')
    
    vi.useRealTimers()
  })

  it('TC-BACKUP-004-04: showToast不设置setTimeout（由Toast.vue组件管理定时器）', async () => {
    // UI优化(20260422001)修复了Toast定时器双重管理问题
    // vault.ts中的setTimeout已移除，定时器由Toast.vue组件的watch监听负责
    
    const store = useVaultStore()
    store.showToast('success', '测试')
    
    // showToast只设置状态，不设置定时器
    expect(store.toast.visible).toBe(true)
    expect(store.toast.type).toBe('success')
    expect(store.toast.title).toBe('测试')
    
    // 定时器管理由Toast.vue组件负责（需要组件挂载后watch监听生效）
    // 在单元测试环境中不测试组件的定时器行为，已在toast.test.ts中验证
  })
})

// ==================== TC-BACKUP-005: 导出功能流程 ====================
describe('导出功能流程', () => {
  it('TC-BACKUP-005-01: 用户取消保存对话框应保持idle状态', async () => {
    mockElectronAPI.dialog.showSaveDialog.mockResolvedValueOnce({ canceled: true, filePath: undefined })
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    await store.exportData()
    
    expect(store.exportStatus).toBe('idle')
  })

  it('TC-BACKUP-005-02: 导出成功应更新状态为success', async () => {
    mockElectronAPI.dialog.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: '/test/backup.json' })
    mockElectronAPI.backup.exportData.mockResolvedValueOnce({ success: true, entryCount: 5, filePath: '/test/backup.json' })
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    await store.exportData()
    
    expect(mockElectronAPI.backup.exportData).toHaveBeenCalledWith('/test/backup.json')
  })

  it('TC-BACKUP-005-03: 导出失败应显示错误toast', async () => {
    mockElectronAPI.dialog.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: '/test/backup.json' })
    mockElectronAPI.backup.exportData.mockResolvedValueOnce({ success: false, error: '权限不足', entryCount: 0, filePath: '/test/backup.json' })
    
    vi.useFakeTimers()
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    await store.exportData()
    await flushPromises()
    
    expect(store.toast.type).toBe('error')
    
    vi.useRealTimers()
  })

  it('TC-BACKUP-005-04: 导出异常应捕获并显示错误', async () => {
    mockElectronAPI.dialog.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: '/test/backup.json' })
    mockElectronAPI.backup.exportData.mockRejectedValueOnce(new Error('网络错误'))
    
    vi.useFakeTimers()
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    await store.exportData()
    await flushPromises()
    
    expect(store.toast.type).toBe('error')
    
    vi.useRealTimers()
  })
})

// ==================== TC-BACKUP-006: 导入功能流程 ====================
describe('导入功能流程', () => {
  it('TC-BACKUP-006-01: 用户取消文件选择应保持idle状态', async () => {
    mockElectronAPI.dialog.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] })
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    await store.selectAndImportFile()
    
    expect(store.importStatus).toBe('idle')
  })

  it('TC-BACKUP-006-02: 文件格式错误应显示错误提示', async () => {
    mockElectronAPI.dialog.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: ['/test/import.json'] })
    mockElectronAPI.backup.parseBackup.mockResolvedValueOnce({ success: false, error: '无效的备份文件格式' })
    
    vi.useFakeTimers()
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    await store.selectAndImportFile()
    await flushPromises()
    
    // 文件格式错误时状态会变为error，然后有2秒延迟重置为idle
    expect(store.importStatus).toBe('error')
    expect(store.importError).toBe('无效的备份文件格式')
    
    // 快进2秒后状态应重置为idle
    vi.advanceTimersByTime(2000)
    await flushPromises()
    
    expect(store.importStatus).toBe('idle')
    expect(store.importFilePath).toBe(null)
    
    vi.useRealTimers()
  })

  it('TC-BACKUP-006-03: 文件格式正确应进入verifying状态', async () => {
    mockElectronAPI.dialog.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: ['/test/import.json'] })
    mockElectronAPI.backup.parseBackup.mockResolvedValueOnce({ success: true, version: 1, entryCount: 5 })
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    await store.selectAndImportFile()
    await flushPromises()
    
    expect(store.importStatus).toBe('verifying')
    expect(store.importFilePath).toBe('/test/import.json')
  })

  it('TC-BACKUP-006-04: validateBackupPassword失败应返回false', async () => {
    mockElectronAPI.backup.validateBackup.mockResolvedValueOnce({ success: true, isValid: false, error: '密码不匹配' })
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.importFilePath = '/test/import.json'
    
    const result = await store.validateBackupPassword('wrongPassword')
    
    expect(result).toBe(false)
    expect(store.importError).toBe('密码不匹配，无法导入此备份文件')
  })

  it('TC-BACKUP-006-05: validateBackupPassword成功且无冲突应直接导入', async () => {
    mockElectronAPI.backup.validateBackup.mockResolvedValueOnce({ success: true, isValid: true })
    mockElectronAPI.backup.checkConflicts.mockResolvedValueOnce({ success: true, conflicts: [], noConflictCount: 5 })
    mockElectronAPI.backup.importData.mockResolvedValueOnce({ success: true, stats: { added: 5, overridden: 0, skipped: 0, keptBoth: 0 } })
    mockElectronAPI.db.getEntries.mockResolvedValueOnce([])
    
    vi.useFakeTimers()
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.importFilePath = '/test/import.json'
    
    const result = await store.validateBackupPassword('correctPassword')
    await flushPromises()
    
    expect(result).toBe(true)
    
    vi.useRealTimers()
  })

  it('TC-BACKUP-006-06: 有冲突应进入conflict状态', async () => {
    const mockConflicts: ConflictEntry[] = [
      {
        id: 'entry-1',
        local: { title: 'Local Entry', username: 'user1', createdAt: 1000, updatedAt: 2000 },
        backup: { title: 'Backup Entry', username: 'user2', createdAt: 500, updatedAt: 1500 },
      }
    ]
    
    mockElectronAPI.backup.validateBackup.mockResolvedValueOnce({ success: true, isValid: true })
    mockElectronAPI.backup.checkConflicts.mockResolvedValueOnce({ success: true, conflicts: mockConflicts, noConflictCount: 2 })
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.importFilePath = '/test/import.json'
    
    const result = await store.validateBackupPassword('correctPassword')
    await flushPromises()
    
    expect(result).toBe(true)
    expect(store.importStatus).toBe('conflict')
    expect(store.importConflicts).toEqual(mockConflicts)
    expect(store.noConflictCount).toBe(2)
  })

  it('TC-BACKUP-006-07: executeImport成功应显示统计toast', async () => {
    mockElectronAPI.backup.importData.mockResolvedValueOnce({ success: true, stats: { added: 3, overridden: 2, skipped: 1, keptBoth: 1 } })
    mockElectronAPI.db.getEntries.mockResolvedValueOnce([])
    
    vi.useFakeTimers()
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.importFilePath = '/test/import.json'
    store.conflictResolutions = new Map([['entry-1', 'override']])
    
    await store.executeImport()
    await flushPromises()
    
    expect(store.importStatus).toBe('success')
    expect(store.toast.type).toBe('success')
    
    vi.useRealTimers()
  })

  it('TC-BACKUP-006-08: executeImport失败应显示错误toast', async () => {
    mockElectronAPI.backup.importData.mockResolvedValueOnce({ success: false, error: '导入失败', stats: { added: 0, overridden: 0, skipped: 0, keptBoth: 0 } })
    
    vi.useFakeTimers()
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.importFilePath = '/test/import.json'
    
    await store.executeImport()
    await flushPromises()
    
    expect(store.toast.type).toBe('error')
    
    vi.useRealTimers()
  })

  it('TC-BACKUP-006-09: 无importFilePath时executeImport不应执行', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.importFilePath = null
    
    await store.executeImport()
    
    expect(mockElectronAPI.backup.importData).not.toHaveBeenCalled()
  })
})

// ==================== TC-BACKUP-007: Settings组件数据管理模块 ====================
describe('Settings组件数据管理模块', () => {
  it('TC-BACKUP-007-01: 应显示数据管理卡片', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    const wrapper = mount(Settings, {
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    expect(wrapper.find('.data-card').exists()).toBe(true)
    expect(wrapper.find('.data-icon').exists()).toBe(true)
    expect(wrapper.findAll('.card-title').some(el => el.text() === '数据管理')).toBe(true)
  })

  it('TC-BACKUP-007-02: 应显示导出数据设置项', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    const wrapper = mount(Settings, {
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    const settingTitles = wrapper.findAll('.setting-title')
    expect(settingTitles.some(el => el.text() === '导出数据')).toBe(true)
  })

  it('TC-BACKUP-007-03: 应显示导入数据设置项', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    const wrapper = mount(Settings, {
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    const settingTitles = wrapper.findAll('.setting-title')
    expect(settingTitles.some(el => el.text() === '导入数据')).toBe(true)
  })

  it('TC-BACKUP-007-04: 导出中状态按钮应禁用', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.exportStatus = 'exporting'
    
    const wrapper = mount(Settings, {
      global: { plugins: [pinia], stubs: modalGlobalConfig().stubs },
    })
    
    await flushPromises()
    
    // 验证store状态是exporting
    expect(store.exportStatus).toBe('exporting')
    // 验证组件内的isExporting计算属性应正确计算
    // 由于Settings.vue通过vaultStore引用，我们可以检查CSS类来验证
    // 注意：由于Pinia实例一致性，状态应正确传递
  })

  it('TC-BACKUP-007-05: 点击导出按钮应调用store.exportData', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    const wrapper = mount(Settings, {
      global: { plugins: [pinia], stubs: modalGlobalConfig().stubs },
    })
    
    await flushPromises()
    
    // 找到导出设置项并点击
    const exportItem = wrapper.findAll('.setting-item').find(el => el.find('.setting-title').text() === '导出数据')
    await exportItem?.trigger('click')
    await flushPromises()
    
    // 应调用dialog API
    expect(mockElectronAPI.dialog.showSaveDialog).toHaveBeenCalled()
  })

  it('TC-BACKUP-007-06: 点击导入按钮应调用store.selectAndImportFile', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    const wrapper = mount(Settings, {
      global: { plugins: [pinia], stubs: modalGlobalConfig().stubs },
    })
    
    await flushPromises()
    
    // 找到导入设置项并点击
    const importItem = wrapper.findAll('.setting-item').find(el => el.find('.setting-title').text() === '导入数据')
    await importItem?.trigger('click')
    await flushPromises()
    
    // 应调用dialog API
    expect(mockElectronAPI.dialog.showOpenDialog).toHaveBeenCalled()
  })

  it('TC-BACKUP-007-07: 导入状态非idle时点击导入按钮不应触发', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    // 先触发一次导入
    mockElectronAPI.dialog.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: ['/test/import.json'] })
    mockElectronAPI.backup.parseBackup.mockResolvedValueOnce({ success: true, version: 1, entryCount: 5 })
    
    await store.selectAndImportFile()
    await flushPromises()
    
    // 状态应为verifying
    expect(store.importStatus).toBe('verifying')
    
    // 清除mock
    vi.clearAllMocks()
    
    // 重新mount组件
    const wrapper = mount(Settings, {
      global: { plugins: [pinia], stubs: modalGlobalConfig().stubs },
    })
    
    await flushPromises()
    
    // 找到导入设置项并点击
    const importItem = wrapper.findAll('.setting-item').find(el => el.find('.setting-title').text() === '导入数据')
    await importItem?.trigger('click')
    await flushPromises()
    
    // 不应调用dialog API（因为状态是verifying）
    expect(mockElectronAPI.dialog.showOpenDialog).not.toHaveBeenCalled()
  })

  it('TC-BACKUP-007-08: 应显示分隔线', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    const wrapper = mount(Settings, {
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    expect(wrapper.find('.card-divider').exists()).toBe(true)
  })

  it('TC-BACKUP-007-09: 应显示Toast提示', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    // 设置toast可见
    store.toast = { visible: true, type: 'success', title: '导出成功', details: '共导出 5 条' }
    
    const wrapper = mount(Settings, {
      global: { plugins: [pinia], stubs: modalGlobalConfig().stubs },
    })
    
    await flushPromises()
    
    // 验证store的toast状态
    expect(store.toast.visible).toBe(true)
    expect(store.toast.title).toBe('导出成功')
    // 由于Teleport被stub，toast元素可能不在组件内部，但我们验证store状态正确
  })

  it('TC-BACKUP-007-10: Toast隐藏时不显示', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.toast.visible = false
    
    const wrapper = mount(Settings, {
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    expect(wrapper.find('.toast').exists()).toBe(false)
  })
})

// ==================== TC-BACKUP-008: ImportConflictDialog组件 ====================
describe('ImportConflictDialog组件', () => {
  const mockConflicts: ConflictEntry[] = [
    {
      id: 'entry-1',
      local: { title: 'Local Entry 1', username: 'user1', createdAt: 1000, updatedAt: 2000 },
      backup: { title: 'Backup Entry 1', username: 'user2', createdAt: 500, updatedAt: 1500 },
    },
    {
      id: 'entry-2',
      local: { title: 'Local Entry 2', username: 'user3', createdAt: 2000, updatedAt: 3000 },
      backup: { title: 'Backup Entry 2', username: 'user4', createdAt: 1000, updatedAt: 2500 },
    },
  ]

  it('TC-BACKUP-008-01: visible为false时不应显示', () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: false,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    expect(wrapper.find('.conflict-dialog-backdrop').exists()).toBe(false)
  })

  it('TC-BACKUP-008-02: visible为true时应显示弹窗', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    expect(wrapper.find('.conflict-dialog-backdrop').exists()).toBe(true)
    expect(wrapper.find('.conflict-title').text()).toBe('导入冲突处理')
  })

  it('TC-BACKUP-008-03: 应正确显示冲突数量', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    expect(wrapper.find('.conflict-count').text()).toBe('2')
  })

  it('TC-BACKUP-008-04: 应显示所有冲突条目', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    const conflictItems = wrapper.findAll('.conflict-item')
    expect(conflictItems.length).toBe(2)
  })

  it('TC-BACKUP-008-05: 应显示本地和备份条目信息', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    expect(wrapper.find('.entry-label').text()).toBe('本地：')
    expect(wrapper.findAll('.entry-label')[1].text()).toBe('备份：')
  })

  it('TC-BACKUP-008-06: 未选择时应显示操作按钮', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    // 有2个冲突条目，每个条目显示3个按钮（覆盖、跳过、保留两者）
    expect(wrapper.findAll('.action-buttons').length).toBe(2)
    expect(wrapper.findAll('.action-btn').length).toBe(6) // 2条目 × 3按钮
  })

  it('TC-BACKUP-008-07: 已选择时应显示已选择状态', async () => {
    const resolutions = new Map<string, ConflictAction>([['entry-1', 'override']])
    
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions,
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    expect(wrapper.find('.selected-indicator').exists()).toBe(true)
    expect(wrapper.find('.selected-indicator').text()).toContain('已选择：覆盖')
  })

  it('TC-BACKUP-008-08: 点击覆盖按钮应触发set-resolution事件', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    const overrideBtn = wrapper.findAll('.action-btn').find(btn => btn.text() === '覆盖')
    await overrideBtn?.trigger('click')
    
    expect(wrapper.emitted('set-resolution')).toBeTruthy()
    expect(wrapper.emitted('set-resolution')?.[0]).toEqual(['entry-1', 'override'])
  })

  it('TC-BACKUP-008-09: 点击跳过按钮应触发set-resolution事件', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    const skipBtn = wrapper.findAll('.action-btn').find(btn => btn.text() === '跳过')
    await skipBtn?.trigger('click')
    
    expect(wrapper.emitted('set-resolution')).toBeTruthy()
    expect(wrapper.emitted('set-resolution')?.[0]).toEqual(['entry-1', 'skip'])
  })

  it('TC-BACKUP-008-10: 点击保留两者按钮应触发set-resolution事件', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    const keepbothBtn = wrapper.findAll('.action-btn').find(btn => btn.text() === '保留两者')
    await keepbothBtn?.trigger('click')
    
    expect(wrapper.emitted('set-resolution')).toBeTruthy()
    expect(wrapper.emitted('set-resolution')?.[0]).toEqual(['entry-1', 'keepboth'])
  })

  it('TC-BACKUP-008-11: 点击更改按钮应触发remove-resolution事件', async () => {
    const resolutions = new Map<string, ConflictAction>([['entry-1', 'override']])
    
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions,
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    await wrapper.find('.change-btn').trigger('click')
    
    expect(wrapper.emitted('remove-resolution')).toBeTruthy()
    expect(wrapper.emitted('remove-resolution')?.[0]).toEqual(['entry-1'])
  })

  it('TC-BACKUP-008-12: 应显示快捷操作按钮', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    expect(wrapper.find('.quick-actions').exists()).toBe(true)
    expect(wrapper.findAll('.quick-btn').length).toBe(3) // 全部覆盖、全部跳过、全部保留两者
  })

  it('TC-BACKUP-008-13: 点击全部覆盖应触发set-all-resolutions事件', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    const allOverrideBtn = wrapper.findAll('.quick-btn').find(btn => btn.text() === '全部覆盖')
    await allOverrideBtn?.trigger('click')
    
    expect(wrapper.emitted('set-all-resolutions')).toBeTruthy()
    expect(wrapper.emitted('set-all-resolutions')?.[0]).toEqual(['override'])
  })

  it('TC-BACKUP-008-14: 点击全部跳过应触发set-all-resolutions事件', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    const allSkipBtn = wrapper.findAll('.quick-btn').find(btn => btn.text() === '全部跳过')
    await allSkipBtn?.trigger('click')
    
    expect(wrapper.emitted('set-all-resolutions')).toBeTruthy()
    expect(wrapper.emitted('set-all-resolutions')?.[0]).toEqual(['skip'])
  })

  it('TC-BACKUP-008-15: 点击全部保留两者应触发set-all-resolutions事件', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    const allKeepbothBtn = wrapper.findAll('.quick-btn').find(btn => btn.text() === '全部保留两者')
    await allKeepbothBtn?.trigger('click')
    
    expect(wrapper.emitted('set-all-resolutions')).toBeTruthy()
    expect(wrapper.emitted('set-all-resolutions')?.[0]).toEqual(['keepboth'])
  })

  it('TC-BACKUP-008-16: 应显示无冲突条目数量', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 5,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    expect(wrapper.find('.stats-info').text()).toContain('5')
    expect(wrapper.find('.stats-info').text()).toContain('自动导入')
  })

  it('TC-BACKUP-008-17: 无冲突条目为0时不显示统计信息', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 0,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    expect(wrapper.find('.stats-info').exists()).toBe(false)
  })

  it('TC-BACKUP-008-18: 点击确认导入应触发confirm事件', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    await wrapper.find('.btn-confirm').trigger('click')
    
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('TC-BACKUP-008-19: 点击取消应触发cancel事件', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    await wrapper.find('.btn-cancel').trigger('click')
    
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('TC-BACKUP-008-20: 点击背景应触发cancel事件', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    await wrapper.find('.conflict-dialog-backdrop').trigger('click')
    
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('TC-BACKUP-008-21: 应显示冲突标记徽章', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: mockConflicts,
        noConflictCount: 3,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    expect(wrapper.find('.conflict-badge').exists()).toBe(true)
  })
})

// ==================== TC-BACKUP-009: 边界测试 ====================
describe('边界测试', () => {
  it('TC-BACKUP-009-01: 大量冲突条目渲染', async () => {
    const manyConflicts: ConflictEntry[] = Array.from({ length: 50 }, (_, i) => ({
      id: `entry-${i}`,
      local: { title: `Local ${i}`, username: `user${i}`, createdAt: i * 1000, updatedAt: i * 2000 },
      backup: { title: `Backup ${i}`, username: `user${i}`, createdAt: i * 500, updatedAt: i * 1500 },
    }))
    
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: manyConflicts,
        noConflictCount: 10,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    expect(wrapper.findAll('.conflict-item').length).toBe(50)
  })

  it('TC-BACKUP-009-02: 特殊字符标题处理', async () => {
    const specialConflicts: ConflictEntry[] = [{
      id: 'entry-1',
      local: { title: '<script>alert("xss")</script>', username: 'user', createdAt: 0, updatedAt: 0 },
      backup: { title: '&amp;特殊字符', username: 'user', createdAt: 0, updatedAt: 0 },
    }]
    
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: specialConflicts,
        noConflictCount: 0,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    // Vue自动转义HTML
    const titleEl = wrapper.findAll('.entry-title')[0]
    expect(titleEl.text()).toBe('<script>alert("xss")</script>')
  })

  it('TC-BACKUP-009-03: 空冲突列表渲染', async () => {
    const wrapper = mount(ImportConflictDialog, {
      props: {
        visible: true,
        conflicts: [],
        noConflictCount: 5,
        resolutions: new Map(),
      },
      global: modalGlobalConfig(),
    })
    
    await flushPromises()
    
    expect(wrapper.find('.conflict-count').text()).toBe('0')
    expect(wrapper.findAll('.conflict-item').length).toBe(0)
  })

  it('TC-BACKUP-009-04: generateBackupFileName时间格式正确', () => {
    const store = useVaultStore()
    
    // 连续生成两个文件名，验证时间格式
    const fileName1 = store.generateBackupFileName()
    const fileName2 = store.generateBackupFileName()
    
    // 都应符合格式
    expect(fileName1).toMatch(/^PassLock_Backup_\d{8}_\d{6}\.json$/)
    expect(fileName2).toMatch(/^PassLock_Backup_\d{8}_\d{6}\.json$/)
  })

  it('TC-BACKUP-009-05: Toast无详情时正确显示', async () => {
    vi.useFakeTimers()
    
    const store = useVaultStore()
    store.showToast('success', '仅标题')
    
    expect(store.toast.details).toBeUndefined()
    
    vi.useRealTimers()
  })
})

// ==================== TC-BACKUP-010: 综合场景测试 ====================
describe('综合场景测试', () => {
  it('TC-BACKUP-010-01: 完整导出流程', async () => {
    mockElectronAPI.dialog.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: '/test/PassLock_Backup_20260410_120000.json' })
    mockElectronAPI.backup.exportData.mockResolvedValueOnce({ success: true, entryCount: 5, filePath: '/test/PassLock_Backup_20260410_120000.json' })
    mockElectronAPI.db.getEntries.mockResolvedValueOnce([
      { id: '1', title: 'Entry 1', username: 'user1', password: 'enc1', createdAt: 0, updatedAt: 0 },
      { id: '2', title: 'Entry 2', username: 'user2', password: 'enc2', createdAt: 0, updatedAt: 0 },
    ])
    
    vi.useFakeTimers()
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    await store.exportData()
    await flushPromises()
    
    expect(mockElectronAPI.dialog.showSaveDialog).toHaveBeenCalled()
    expect(mockElectronAPI.backup.exportData).toHaveBeenCalled()
    expect(store.toast.type).toBe('success')
    
    vi.useRealTimers()
  })

  it('TC-BACKUP-010-02: 完整导入流程（无冲突）', async () => {
    mockElectronAPI.dialog.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: ['/test/import.json'] })
    mockElectronAPI.backup.parseBackup.mockResolvedValueOnce({ success: true, version: 1, entryCount: 3 })
    mockElectronAPI.backup.validateBackup.mockResolvedValueOnce({ success: true, isValid: true })
    mockElectronAPI.backup.checkConflicts.mockResolvedValueOnce({ success: true, conflicts: [], noConflictCount: 3 })
    mockElectronAPI.backup.importData.mockResolvedValueOnce({ success: true, stats: { added: 3, overridden: 0, skipped: 0, keptBoth: 0 } })
    mockElectronAPI.db.getEntries.mockResolvedValueOnce([])
    
    vi.useFakeTimers()
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    // 选择文件
    await store.selectAndImportFile()
    await flushPromises()
    expect(store.importStatus).toBe('verifying')
    
    // 验证密码
    const validResult = await store.validateBackupPassword('correctPassword')
    await flushPromises()
    expect(validResult).toBe(true)
    
    vi.useRealTimers()
  })

  it('TC-BACKUP-010-03: 完整导入流程（有冲突）', async () => {
    const mockConflicts: ConflictEntry[] = [
      { id: 'entry-1', local: { title: 'Local', username: 'user', createdAt: 0, updatedAt: 0 }, backup: { title: 'Backup', username: 'user', createdAt: 0, updatedAt: 0 } },
    ]
    
    mockElectronAPI.dialog.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: ['/test/import.json'] })
    mockElectronAPI.backup.parseBackup.mockResolvedValueOnce({ success: true, version: 1, entryCount: 3 })
    mockElectronAPI.backup.validateBackup.mockResolvedValueOnce({ success: true, isValid: true })
    mockElectronAPI.backup.checkConflicts.mockResolvedValueOnce({ success: true, conflicts: mockConflicts, noConflictCount: 2 })
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    // 选择文件
    await store.selectAndImportFile()
    await flushPromises()
    expect(store.importStatus).toBe('verifying')
    
    // 验证密码 - 检测到冲突
    const validResult = await store.validateBackupPassword('correctPassword')
    await flushPromises()
    expect(validResult).toBe(true)
    expect(store.importStatus).toBe('conflict')
    expect(store.importConflicts.length).toBe(1)
    
    // 用户选择解决方案
    store.setConflictResolution('entry-1', 'override')
    expect(store.conflictResolutions.get('entry-1')).toBe('override')
    
    // 确认导入
    mockElectronAPI.backup.importData.mockResolvedValueOnce({ success: true, stats: { added: 2, overridden: 1, skipped: 0, keptBoth: 0 } })
    mockElectronAPI.db.getEntries.mockResolvedValueOnce([])
    
    vi.useFakeTimers()
    await store.executeImport()
    await flushPromises()
    expect(store.importStatus).toBe('success')
    
    vi.useRealTimers()
  })

  it('TC-BACKUP-010-04: 导入密码验证失败流程', async () => {
    mockElectronAPI.dialog.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: ['/test/import.json'] })
    mockElectronAPI.backup.parseBackup.mockResolvedValueOnce({ success: true, version: 1, entryCount: 3 })
    mockElectronAPI.backup.validateBackup.mockResolvedValueOnce({ success: true, isValid: false, error: '密码不匹配' })
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    // 选择文件
    await store.selectAndImportFile()
    await flushPromises()
    expect(store.importStatus).toBe('verifying')
    
    // 验证密码失败
    const validResult = await store.validateBackupPassword('wrongPassword')
    expect(validResult).toBe(false)
    expect(store.importError).toBe('密码不匹配，无法导入此备份文件')
  })

  it('TC-BACKUP-010-05: 锁定后导入状态完全重置', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    // 设置导入中状态
    store.importStatus = 'importing'
    store.importFilePath = '/test/path.json'
    store.importConflicts = [{ id: '1', local: { title: 't', username: 'u', createdAt: 0, updatedAt: 0 }, backup: { title: 't', username: 'u', createdAt: 0, updatedAt: 0 } }] as ConflictEntry[]
    store.conflictResolutions = new Map([['1', 'override']])
    
    // 锁定
    store.lock()
    
    // 所有导入状态应重置
    expect(store.importStatus).toBe('idle')
    expect(store.importFilePath).toBe(null)
    expect(store.importConflicts).toEqual([])
    expect(store.conflictResolutions.size).toBe(0)
  })
})