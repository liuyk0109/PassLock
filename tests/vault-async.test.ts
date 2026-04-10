/**
 * vault.ts 异步方法测试用例
 * 测试范围：loadEntries、createEntry、copyPassword等异步操作
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVaultStore, type VaultEntry } from '../src/stores/vault'

// Mock Electron API
const mockElectronAPI = {
  crypto: {
    encrypt: vi.fn().mockResolvedValue('encrypted-password'),
    decrypt: vi.fn().mockResolvedValue('decrypted-password'),
    generatePassword: vi.fn().mockResolvedValue('GeneratedPassword123!'),
    getPasswordStrengthLevel: vi.fn().mockResolvedValue('strong'),
    changeMasterPassword: vi.fn().mockResolvedValue({ success: true }),
  },
  db: {
    getEntries: vi.fn().mockResolvedValue([]),
    addEntry: vi.fn().mockResolvedValue(undefined),
    updateEntry: vi.fn().mockResolvedValue(true),
    deleteEntry: vi.fn().mockResolvedValue(true),
    getSettings: vi.fn().mockResolvedValue({ autoLockTimeout: 5 }),
  },
}

// Mock navigator.clipboard
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
}

// 设置全局 mock
beforeEach(() => {
  // 直接修改window属性，保留原有构造函数
  ;(window as any).electronAPI = mockElectronAPI
  ;(navigator as any).clipboard = mockClipboard
  setActivePinia(createPinia())
  // 重置所有 mock
  vi.clearAllMocks()
})

// ==================== TC-ASYNC-001: loadEntries ====================
describe('loadEntries 操作', () => {
  it('TC-ASYNC-001-01: 应成功从数据库加载条目', async () => {
    const mockEntries: VaultEntry[] = [
      {
        id: 'uuid-1',
        title: 'Entry 1',
        username: 'user1',
        password: 'encrypted1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'uuid-2',
        title: 'Entry 2',
        username: 'user2',
        password: 'encrypted2',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]
    mockElectronAPI.db.getEntries.mockResolvedValueOnce(mockEntries)

    const store = useVaultStore()
    await store.loadEntries()

    expect(mockElectronAPI.db.getEntries).toHaveBeenCalled()
    expect(store.entries).toEqual(mockEntries)
    expect(store.entryCount).toBe(2)
  })

  it('TC-ASYNC-001-02: 加载时应设置loading状态', async () => {
    mockElectronAPI.db.getEntries.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve([]), 100))
    )

    const store = useVaultStore()
    const promise = store.loadEntries()

    // loading 应为 true
    expect(store.loading).toBe(true)

    await promise

    // 完成后 loading 应为 false
    expect(store.loading).toBe(false)
  })

  it('TC-ASYNC-001-03: 数据库错误时应优雅处理', async () => {
    mockElectronAPI.db.getEntries.mockRejectedValueOnce(new Error('DB error'))

    const store = useVaultStore()
    await store.loadEntries()

    // 应清空条目列表
    expect(store.entries).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('TC-ASYNC-001-04: 加载空数据库', async () => {
    mockElectronAPI.db.getEntries.mockResolvedValueOnce([])

    const store = useVaultStore()
    await store.loadEntries()

    expect(store.entries).toEqual([])
    expect(store.entryCount).toBe(0)
  })

  it('TC-ASYNC-001-05: 加载大量条目', async () => {
    const mockEntries: VaultEntry[] = Array.from({ length: 500 }, (_, i) => ({
      id: `uuid-${i}`,
      title: `Entry ${i}`,
      username: `user${i}`,
      password: `encrypted${i}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))
    mockElectronAPI.db.getEntries.mockResolvedValueOnce(mockEntries)

    const store = useVaultStore()
    await store.loadEntries()

    expect(store.entryCount).toBe(500)
  })
})

// ==================== TC-ASYNC-002: createEntry ====================
describe('createEntry 操作', () => {
  it('TC-ASYNC-002-01: 应成功创建新条目并加密密码', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')

    const input = {
      title: 'Test Entry',
      username: 'user@example.com',
      password: 'plaintext-password',
    }

    const entry = await store.createEntry(input)

    // 应调用加密
    expect(mockElectronAPI.crypto.encrypt).toHaveBeenCalledWith(
      'plaintext-password',
      'masterPassword'
    )
    // 应保存到数据库
    expect(mockElectronAPI.db.addEntry).toHaveBeenCalled()
    // 返回的条目应包含加密后的密码
    expect(entry.password).toBe('encrypted-password')
    expect(entry.title).toBe('Test Entry')
    // 应添加到本地状态
    expect(store.entries[0]).toEqual(entry)
  })

  it('TC-ASYNC-002-02: 锁定状态创建条目应抛出错误', async () => {
    const store = useVaultStore()
    // 默认锁定状态

    await expect(store.createEntry({
      title: 'Test',
      password: 'pass',
    })).rejects.toThrow('Vault is locked')

    // 不应调用加密
    expect(mockElectronAPI.crypto.encrypt).not.toHaveBeenCalled()
  })

  it('TC-ASYNC-002-03: 空标题应抛出错误', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')

    await expect(store.createEntry({
      title: '',
      password: 'pass',
    })).rejects.toThrow('Title and password are required')
  })

  it('TC-ASYNC-002-04: 空密码应抛出错误', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')

    await expect(store.createEntry({
      title: 'Test',
      password: '',
    })).rejects.toThrow('Title and password are required')
  })

  it('TC-ASYNC-002-05: 应正确处理可选字段', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')

    const input = {
      title: 'Full Entry',
      username: 'user',
      password: 'pass',
      site: 'Example Site',
      url: 'https://example.com',
      notes: 'Some notes',
    }

    const entry = await store.createEntry(input)

    expect(entry.site).toBe('Example Site')
    expect(entry.url).toBe('https://example.com')
    expect(entry.notes).toBe('Some notes')
  })

  it('TC-ASYNC-002-06: 新条目应添加到列表顶部', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    // 先添加一个条目
    await store.createEntry({ title: 'First', password: 'pass1' })
    await store.createEntry({ title: 'Second', password: 'pass2' })

    // 最新条目应在顶部
    expect(store.entries[0].title).toBe('Second')
    expect(store.entries[1].title).toBe('First')
  })

  it('TC-ASYNC-002-07: 创建时间戳应正确设置', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')

    const beforeTime = Date.now()
    const entry = await store.createEntry({ title: 'Test', password: 'pass' })
    const afterTime = Date.now()

    expect(entry.createdAt).toBeGreaterThanOrEqual(beforeTime)
    expect(entry.createdAt).toBeLessThanOrEqual(afterTime)
    expect(entry.updatedAt).toBe(entry.createdAt)
  })

  it('TC-ASYNC-002-08: ID应为有效的UUID格式', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')

    const entry = await store.createEntry({ title: 'Test', password: 'pass' })

    expect(entry.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it('TC-ASYNC-002-09: 加密失败应抛出错误', async () => {
    mockElectronAPI.crypto.encrypt.mockRejectedValueOnce(new Error('Encryption failed'))

    const store = useVaultStore()
    await store.unlock('masterPassword')

    await expect(store.createEntry({
      title: 'Test',
      password: 'pass',
    })).rejects.toThrow('Encryption failed')
  })
})

// ==================== TC-ASYNC-003: copyPassword ====================
describe('copyPassword 操作', () => {
  it('TC-ASYNC-003-01: 应成功解密密码并复制到剪贴板', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    // 添加一个条目
    store.setEntries([{
      id: 'test-id',
      title: 'Test',
      username: 'user',
      password: 'encrypted-password',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }])

    await store.copyPassword('test-id')

    // 应调用解密
    expect(mockElectronAPI.crypto.decrypt).toHaveBeenCalledWith(
      'encrypted-password',
      'masterPassword'
    )
    // 应写入剪贴板
    expect(mockClipboard.writeText).toHaveBeenCalledWith('decrypted-password')
    // 应设置复制状态
    expect(store.copiedEntryId).toBe('test-id')
  })

  it('TC-ASYNC-003-02: 锁定状态复制应抛出错误', async () => {
    const store = useVaultStore()
    // 默认锁定状态
    store.setEntries([{
      id: 'test-id',
      title: 'Test',
      username: 'user',
      password: 'encrypted',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }])

    await expect(store.copyPassword('test-id')).rejects.toThrow('Vault is locked')
    
    // 不应调用解密和剪贴板
    expect(mockElectronAPI.crypto.decrypt).not.toHaveBeenCalled()
    expect(mockClipboard.writeText).not.toHaveBeenCalled()
  })

  it('TC-ASYNC-003-03: 条目不存在应抛出错误', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')

    await expect(store.copyPassword('non-existent-id')).rejects.toThrow('Entry not found')
  })

  it('TC-ASYNC-003-04: 复制状态应在30秒后清除', async () => {
    vi.useFakeTimers()
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.setEntries([{
      id: 'test-id',
      title: 'Test',
      username: 'user',
      password: 'encrypted',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }])

    const promise = store.copyPassword('test-id')
    await vi.runAllTimersAsync()
    await promise
    
    expect(store.copiedEntryId).toBe('test-id')

    // 快进30秒
    vi.advanceTimersByTime(30000)
    
    expect(store.copiedEntryId).toBe(null)
    
    vi.useRealTimers()
  })

  it('TC-ASYNC-003-05: 解密失败应抛出错误', async () => {
    mockElectronAPI.crypto.decrypt.mockRejectedValueOnce(new Error('Decryption failed'))

    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.setEntries([{
      id: 'test-id',
      title: 'Test',
      username: 'user',
      password: 'encrypted',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }])

    await expect(store.copyPassword('test-id')).rejects.toThrow('Decryption failed')
    expect(mockClipboard.writeText).not.toHaveBeenCalled()
  })
})

// ==================== TC-ASYNC-004: deleteEntry ====================
describe('deleteEntry 操作', () => {
  it('TC-ASYNC-004-01: 应成功删除条目', async () => {
    const store = useVaultStore()
    store.setEntries([{
      id: 'test-id',
      title: 'Test',
      username: 'user',
      password: 'pass',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }])

    const result = await store.deleteEntry('test-id')

    expect(result).toBe(true)
    expect(mockElectronAPI.db.deleteEntry).toHaveBeenCalledWith('test-id')
    expect(store.entryCount).toBe(0)
  })

  it('TC-ASYNC-004-02: 删除不存在的条目应返回false', async () => {
    const store = useVaultStore()

    const result = await store.deleteEntry('non-existent-id')

    expect(result).toBe(false)
    // 不应调用数据库删除
    expect(mockElectronAPI.db.deleteEntry).not.toHaveBeenCalled()
  })

  it('TC-ASYNC-004-03: 删除条目不应影响其他条目', async () => {
    const store = useVaultStore()
    store.setEntries([
      { id: 'id-1', title: 'Entry 1', username: 'user1', password: 'pass1', createdAt: 0, updatedAt: 0 },
      { id: 'id-2', title: 'Entry 2', username: 'user2', password: 'pass2', createdAt: 0, updatedAt: 0 },
      { id: 'id-3', title: 'Entry 3', username: 'user3', password: 'pass3', createdAt: 0, updatedAt: 0 },
    ])

    await store.deleteEntry('id-2')

    expect(store.entryCount).toBe(2)
    expect(store.entries.find(e => e.id === 'id-1')).toBeDefined()
    expect(store.entries.find(e => e.id === 'id-3')).toBeDefined()
    expect(store.entries.find(e => e.id === 'id-2')).toBeUndefined()
  })
})

// ==================== TC-ASYNC-005: 搜索过滤 ====================
describe('filteredEntries 搜索功能', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    ;(window as any).electronAPI = mockElectronAPI
  })

  it('TC-ASYNC-005-01: 空搜索应返回所有条目', () => {
    const store = useVaultStore()
    store.setEntries([
      { id: '1', title: 'Entry 1', username: 'user1', password: 'p', createdAt: 0, updatedAt: 0 },
      { id: '2', title: 'Entry 2', username: 'user2', password: 'p', createdAt: 0, updatedAt: 0 },
    ])
    store.setSearchQuery('')

    expect(store.filteredEntries.length).toBe(2)
  })

  it('TC-ASYNC-005-02: 应按标题搜索', () => {
    const store = useVaultStore()
    store.setEntries([
      { id: '1', title: 'Google Account', username: 'user1', password: 'p', createdAt: 0, updatedAt: 0 },
      { id: '2', title: 'GitHub', username: 'user2', password: 'p', createdAt: 0, updatedAt: 0 },
      { id: '3', title: 'Gmail', username: 'user3', password: 'p', createdAt: 0, updatedAt: 0 },
    ])
    store.setSearchQuery('g')

    expect(store.filteredEntries.length).toBe(3)
  })

  it('TC-ASYNC-005-03: 应按网站搜索', () => {
    const store = useVaultStore()
    store.setEntries([
      { id: '1', title: 'Entry 1', username: 'user1', password: 'p', site: 'Google', createdAt: 0, updatedAt: 0 },
      { id: '2', title: 'Entry 2', username: 'user2', password: 'p', site: 'GitHub', createdAt: 0, updatedAt: 0 },
    ])
    store.setSearchQuery('google')

    expect(store.filteredEntries.length).toBe(1)
    expect(store.filteredEntries[0].site).toBe('Google')
  })

  it('TC-ASYNC-005-04: 应按用户名搜索', () => {
    const store = useVaultStore()
    store.setEntries([
      { id: '1', title: 'Entry 1', username: 'alice@example.com', password: 'p', createdAt: 0, updatedAt: 0 },
      { id: '2', title: 'Entry 2', username: 'bob@example.com', password: 'p', createdAt: 0, updatedAt: 0 },
    ])
    store.setSearchQuery('alice')

    expect(store.filteredEntries.length).toBe(1)
    expect(store.filteredEntries[0].username).toBe('alice@example.com')
  })

  it('TC-ASYNC-005-05: 应按备注搜索', () => {
    const store = useVaultStore()
    store.setEntries([
      { id: '1', title: 'Entry 1', username: 'user1', password: 'p', notes: 'Work account', createdAt: 0, updatedAt: 0 },
      { id: '2', title: 'Entry 2', username: 'user2', password: 'p', notes: 'Personal', createdAt: 0, updatedAt: 0 },
    ])
    store.setSearchQuery('work')

    expect(store.filteredEntries.length).toBe(1)
    expect(store.filteredEntries[0].notes).toBe('Work account')
  })

  it('TC-ASYNC-005-06: 搜索应不区分大小写', () => {
    const store = useVaultStore()
    store.setEntries([
      { id: '1', title: 'GOOGLE', username: 'user', password: 'p', createdAt: 0, updatedAt: 0 },
      { id: '2', title: 'github', username: 'user', password: 'p', createdAt: 0, updatedAt: 0 },
    ])
    
    store.setSearchQuery('GOOGLE')
    expect(store.filteredEntries.length).toBe(1)
    
    store.setSearchQuery('GITHUB')
    expect(store.filteredEntries.length).toBe(1)
  })

  it('TC-ASYNC-005-07: 无匹配结果应返回空数组', () => {
    const store = useVaultStore()
    store.setEntries([
      { id: '1', title: 'Entry 1', username: 'user1', password: 'p', createdAt: 0, updatedAt: 0 },
    ])
    store.setSearchQuery('nonexistent')

    expect(store.filteredEntries.length).toBe(0)
  })
})

// ==================== TC-ASYNC-006: 综合场景 ====================
describe('综合场景测试', () => {
  it('TC-ASYNC-006-01: 完整密码库操作流程', async () => {
    const store = useVaultStore()

    // 1. 解锁
    await store.unlock('masterPassword')
    expect(store.isUnlocked).toBe(true)

    // 2. 创建条目
    const entry1 = await store.createEntry({
      title: 'Google',
      username: 'user@gmail.com',
      password: 'google-password',
      site: 'Google',
    })
    expect(store.entryCount).toBe(1)

    // 3. 创建更多条目
    await store.createEntry({
      title: 'GitHub',
      username: 'developer',
      password: 'github-password',
      site: 'GitHub',
    })
    expect(store.entryCount).toBe(2)

    // 4. 搜索
    store.setSearchQuery('google')
    expect(store.filteredEntries.length).toBe(1)

    // 5. 复制密码
    await store.copyPassword(entry1.id)
    expect(store.copiedEntryId).toBe(entry1.id)

    // 6. 删除条目
    await store.deleteEntry(entry1.id)
    expect(store.entryCount).toBe(1)

    // 7. 锁定
    store.lock()
    expect(store.isLocked).toBe(true)
    expect(store.entries.length).toBe(0)
  })

  it('TC-ASYNC-006-02: 弹窗状态管理', () => {
    const store = useVaultStore()

    expect(store.showModal).toBe(false)
    
    store.toggleModal()
    expect(store.showModal).toBe(true)
    
    store.toggleModal()
    expect(store.showModal).toBe(false)
    
    store.showModal = true
    expect(store.showModal).toBe(true)
  })

  it('TC-ASYNC-006-03: 锁定时清除所有状态', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    // 添加数据和状态
    store.setEntries([{
      id: '1', title: 'Test', username: 'user', password: 'p', createdAt: 0, updatedAt: 0,
    }])
    store.showModal = true
    store.setSearchQuery('test')
    store.copiedEntryId = '1'
    store.setCurrentPage('settings')

    // 锁定
    store.lock()

    // 所有状态应被清除
    expect(store.masterKey).toBe(null)
    expect(store.isLocked).toBe(true)
    expect(store.entries.length).toBe(0)
    expect(store.showModal).toBe(false)
    expect(store.searchQuery).toBe('')
    expect(store.copiedEntryId).toBe(null)
    expect(store.currentPage).toBe('vault')  // 锁定时重置页面状态
  })
})

// ==================== TC-ASYNC-007: changeMasterPassword ====================
describe('changeMasterPassword 操作', () => {
  it('TC-ASYNC-007-01: 应成功修改主密码', async () => {
    const store = useVaultStore()
    await store.unlock('oldPassword')

    await store.changeMasterPassword('oldPassword', 'newPassword123')

    // 应调用IPC API
    expect(mockElectronAPI.crypto.changeMasterPassword).toHaveBeenCalledWith(
      'oldPassword',
      'newPassword123',
      undefined
    )
  })

  it('TC-ASYNC-007-02: 成功后应更新masterKey为新密码', async () => {
    const store = useVaultStore()
    await store.unlock('oldPassword')

    await store.changeMasterPassword('oldPassword', 'newPassword123')

    expect(store.masterKey).toBe('newPassword123')
  })

  it('TC-ASYNC-007-03: 成功后应重新加载条目', async () => {
    const store = useVaultStore()
    await store.unlock('oldPassword')

    await store.changeMasterPassword('oldPassword', 'newPassword123')

    // 应调用getEntries重新加载
    expect(mockElectronAPI.db.getEntries).toHaveBeenCalled()
  })

  it('TC-ASYNC-007-04: 成功后应保持解锁状态', async () => {
    const store = useVaultStore()
    await store.unlock('oldPassword')

    await store.changeMasterPassword('oldPassword', 'newPassword123')

    expect(store.isLocked).toBe(false)
    expect(store.isUnlocked).toBe(true)
  })

  it('TC-ASYNC-007-05: 锁定状态修改密码应抛出错误', async () => {
    const store = useVaultStore()
    // 默认锁定状态

    await expect(store.changeMasterPassword('old', 'new'))
      .rejects.toThrow('Vault is locked')

    // 不应调用IPC
    expect(mockElectronAPI.crypto.changeMasterPassword).not.toHaveBeenCalled()
  })

  it('TC-ASYNC-007-06: 当前密码错误时应抛出错误', async () => {
    mockElectronAPI.crypto.changeMasterPassword.mockResolvedValueOnce({
      success: false,
      error: '当前密码错误'
    })

    const store = useVaultStore()
    await store.unlock('wrongPassword')

    await expect(store.changeMasterPassword('wrongPassword', 'newPassword123'))
      .rejects.toThrow('当前密码错误')

    // masterKey不应被更新
    expect(store.masterKey).toBe('wrongPassword')
  })

  it('TC-ASYNC-007-07: IPC失败时应抛出错误', async () => {
    mockElectronAPI.crypto.changeMasterPassword.mockRejectedValueOnce(
      new Error('IPC communication failed')
    )

    const store = useVaultStore()
    await store.unlock('masterPassword')

    await expect(store.changeMasterPassword('masterPassword', 'newPassword123'))
      .rejects.toThrow('IPC communication failed')
  })

  it('TC-ASYNC-007-08: 应传递进度回调到IPC', async () => {
    const onProgress = vi.fn()
    const store = useVaultStore()
    await store.unlock('masterPassword')

    await store.changeMasterPassword('masterPassword', 'newPassword123', onProgress)

    // 应传递回调函数
    expect(mockElectronAPI.crypto.changeMasterPassword).toHaveBeenCalledWith(
      'masterPassword',
      'newPassword123',
      onProgress
    )
  })

  it('TC-ASYNC-007-09: 无进度回调时应传undefined', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')

    await store.changeMasterPassword('masterPassword', 'newPassword123')

    expect(mockElectronAPI.crypto.changeMasterPassword).toHaveBeenCalledWith(
      'masterPassword',
      'newPassword123',
      undefined
    )
  })

  it('TC-ASYNC-007-10: 加密失败返回错误时应抛出并保持原密码', async () => {
    mockElectronAPI.crypto.changeMasterPassword.mockResolvedValueOnce({
      success: false,
      error: '加密失败，数据已恢复'
    })

    const store = useVaultStore()
    await store.unlock('originalPassword')

    await expect(store.changeMasterPassword('originalPassword', 'newPassword123'))
      .rejects.toThrow('加密失败，数据已恢复')

    // masterKey应保持不变
    expect(store.masterKey).toBe('originalPassword')
  })

  it('TC-ASYNC-007-11: 验证数据不存在时应返回错误', async () => {
    mockElectronAPI.crypto.changeMasterPassword.mockResolvedValueOnce({
      success: false,
      error: '验证数据不存在'
    })

    const store = useVaultStore()
    await store.unlock('masterPassword')

    await expect(store.changeMasterPassword('masterPassword', 'newPassword123'))
      .rejects.toThrow('验证数据不存在')
  })

  it('TC-ASYNC-007-12: 修改密码后用新密码可正常操作', async () => {
    const store = useVaultStore()
    await store.unlock('oldPassword')

    await store.changeMasterPassword('oldPassword', 'newPassword123')

    // 使用新密码应能正常创建条目
    const entry = await store.createEntry({
      title: 'Test After Change',
      password: 'test-pass',
    })

    expect(mockElectronAPI.crypto.encrypt).toHaveBeenCalledWith(
      'test-pass',
      'newPassword123'
    )
    expect(entry).toBeDefined()
  })

  it('TC-ASYNC-007-13: 空密码库修改密码应成功（仅更新验证数据）', async () => {
    // 空密码库场景 - changeMasterPassword成功
    const store = useVaultStore()
    await store.unlock('oldPassword')
    store.setEntries([])  // 空密码库

    await store.changeMasterPassword('oldPassword', 'newPassword123')

    expect(store.masterKey).toBe('newPassword123')
    expect(mockElectronAPI.crypto.changeMasterPassword).toHaveBeenCalled()
  })

  it('TC-ASYNC-007-14: 默认错误消息应为"修改密码失败"', async () => {
    mockElectronAPI.crypto.changeMasterPassword.mockResolvedValueOnce({
      success: false,
      error: undefined
    })

    const store = useVaultStore()
    await store.unlock('masterPassword')

    await expect(store.changeMasterPassword('masterPassword', 'newPassword123'))
      .rejects.toThrow('修改密码失败')
  })
})