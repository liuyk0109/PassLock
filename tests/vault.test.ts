/**
 * vault.ts Pinia Store 测试用例
 * 测试范围：密码库状态管理、条目CRUD操作、锁定/解锁逻辑
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVaultStore, type VaultEntry } from '../src/stores/vault'

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
}

// Mock clipboard
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
}

// 设置全局 mock
beforeEach(() => {
  // 直接修改window属性，保留原有构造函数
  ;(window as any).electronAPI = mockElectronAPI
  ;(navigator as any).clipboard = mockClipboard
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

// ==================== TC-STORE-001: 初始化状态 ====================
describe('VaultStore 初始化', () => {
  it('TC-STORE-001-01: 初始状态应为锁定', () => {
    const store = useVaultStore()
    expect(store.isLocked).toBe(true)
  })

  it('TC-STORE-001-02: 初始主密码应为null', () => {
    const store = useVaultStore()
    expect(store.masterKey).toBe(null)
  })

  it('TC-STORE-001-03: 初始条目列表应为空', () => {
    const store = useVaultStore()
    expect(store.entries).toEqual([])
  })

  it('TC-STORE-001-04: 初始条目计数应为0', () => {
    const store = useVaultStore()
    expect(store.entryCount).toBe(0)
  })

  it('TC-STORE-001-05: 初始isUnlocked应为false', () => {
    const store = useVaultStore()
    expect(store.isUnlocked).toBe(false)
  })
})

// ==================== TC-STORE-002: 解锁/锁定操作 ====================
describe('unlock/lock 操作', () => {
  it('TC-STORE-002-01: unlock应设置masterKey并解除锁定', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    expect(store.masterKey).toBe('masterPassword')
    expect(store.isLocked).toBe(false)
    expect(store.isUnlocked).toBe(true)
  })

  it('TC-STORE-002-02: lock应清除masterKey并锁定', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.lock()
    expect(store.masterKey).toBe(null)
    expect(store.isLocked).toBe(true)
    expect(store.isUnlocked).toBe(false)
  })

  it('TC-STORE-002-03: 边界测试 - 空密码解锁', async () => {
    const store = useVaultStore()
    await store.unlock('')
    expect(store.masterKey).toBe('')
    expect(store.isLocked).toBe(false)
  })

  it('TC-STORE-002-04: 多次解锁应更新masterKey', async () => {
    const store = useVaultStore()
    await store.unlock('password1')
    expect(store.masterKey).toBe('password1')
    await store.unlock('password2')
    expect(store.masterKey).toBe('password2')
  })

  it('TC-STORE-002-05: 锁定后再次解锁应恢复正常状态', async () => {
    const store = useVaultStore()
    await store.unlock('password')
    store.lock()
    await store.unlock('newPassword')
    expect(store.isUnlocked).toBe(true)
    expect(store.masterKey).toBe('newPassword')
  })
})

// ==================== TC-STORE-003: 条目添加 ====================
describe('addEntry 操作', () => {
  it('TC-STORE-003-01: 应成功添加条目并返回新条目', () => {
    const store = useVaultStore()
    const entry = store.addEntry({
      title: 'Test Entry',
      username: 'user@example.com',
      password: 'secret123',
    })
    expect(entry.id).toBeDefined()
    expect(entry.title).toBe('Test Entry')
    expect(entry.createdAt).toBeDefined()
    expect(entry.updatedAt).toBeDefined()
  })

  it('TC-STORE-003-02: 添加后条目计数应增加', () => {
    const store = useVaultStore()
    store.addEntry({ title: 'Entry 1', username: 'user1', password: 'pass1' })
    expect(store.entryCount).toBe(1)
    store.addEntry({ title: 'Entry 2', username: 'user2', password: 'pass2' })
    expect(store.entryCount).toBe(2)
  })

  it('TC-STORE-003-03: 添加的条目应在entries列表中', () => {
    const store = useVaultStore()
    const entry = store.addEntry({ title: 'Test', username: 'user', password: 'pass' })
    expect(store.entries).toContainEqual(entry)
  })

  it('TC-STORE-003-04: 创建和更新时间应相同', () => {
    const store = useVaultStore()
    const entry = store.addEntry({ title: 'Test', username: 'user', password: 'pass' })
    expect(entry.createdAt).toBe(entry.updatedAt)
  })

  it('TC-STORE-003-05: 边界测试 - 空标题', () => {
    const store = useVaultStore()
    const entry = store.addEntry({ title: '', username: 'user', password: 'pass' })
    expect(entry.title).toBe('')
  })

  it('TC-STORE-003-06: 边界测试 - 包含所有可选字段', () => {
    const store = useVaultStore()
    const entry = store.addEntry({
      title: 'Full Entry',
      username: 'user',
      password: 'pass',
      url: 'https://example.com',
      notes: 'Additional notes',
    })
    expect(entry.url).toBe('https://example.com')
    expect(entry.notes).toBe('Additional notes')
  })

  it('TC-STORE-003-07: ID应为有效的UUID格式', () => {
    const store = useVaultStore()
    const entry = store.addEntry({ title: 'Test', username: 'user', password: 'pass' })
    // UUID格式验证
    expect(entry.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })
})

// ==================== TC-STORE-004: 条目更新 ====================
describe('updateEntry 操作', () => {
  

  it('TC-STORE-004-01: 应成功更新指定条目', () => {
    const store = useVaultStore()
    const entry = store.addEntry({ title: 'Original', username: 'user', password: 'pass' })
    const result = store.updateEntry(entry.id, { title: 'Updated' })
    expect(result).toBe(true)
    expect(store.getEntry(entry.id)?.title).toBe('Updated')
  })

  it('TC-STORE-004-02: 更新后updatedAt应变化', async () => {
    const store = useVaultStore()
    const entry = store.addEntry({ title: 'Original', username: 'user', password: 'pass' })
    const originalUpdatedAt = entry.updatedAt
    
    // 等待确保时间戳不同
    await new Promise(resolve => setTimeout(resolve, 10))
    
    store.updateEntry(entry.id, { title: 'Updated' })
    expect(store.getEntry(entry.id)?.updatedAt).toBeGreaterThan(originalUpdatedAt)
  })

  it('TC-STORE-004-03: 更新不存在的条目应返回false', () => {
    const store = useVaultStore()
    const result = store.updateEntry('non-existent-id', { title: 'Test' })
    expect(result).toBe(false)
  })

  it('TC-STORE-004-04: 更新应保留其他字段不变', () => {
    const store = useVaultStore()
    const entry = store.addEntry({
      title: 'Test',
      username: 'user',
      password: 'pass',
      url: 'https://example.com',
    })
    store.updateEntry(entry.id, { password: 'newpass' })
    const updated = store.getEntry(entry.id)
    expect(updated?.title).toBe('Test')
    expect(updated?.username).toBe('user')
    expect(updated?.url).toBe('https://example.com')
    expect(updated?.password).toBe('newpass')
  })

  it('TC-STORE-004-05: createdAt不应被更新', () => {
    const store = useVaultStore()
    const entry = store.addEntry({ title: 'Test', username: 'user', password: 'pass' })
    const originalCreatedAt = entry.createdAt
    store.updateEntry(entry.id, { title: 'Updated' })
    expect(store.getEntry(entry.id)?.createdAt).toBe(originalCreatedAt)
  })

  it('TC-STORE-004-06: 边界测试 - 更新为空值', () => {
    const store = useVaultStore()
    const entry = store.addEntry({ title: 'Test', username: 'user', password: 'pass' })
    store.updateEntry(entry.id, { title: '' })
    expect(store.getEntry(entry.id)?.title).toBe('')
  })
})

// ==================== TC-STORE-005: 条目删除 ====================
describe('deleteEntry 操作', () => {
  

  it('TC-STORE-005-01: 应成功删除指定条目', async () => {
    const store = useVaultStore()
    const entry = store.addEntry({ title: 'Test', username: 'user', password: 'pass' })
    const result = await store.deleteEntry(entry.id)
    expect(result).toBe(true)
    expect(store.entryCount).toBe(0)
  })

  it('TC-STORE-005-02: 删除后条目不应在列表中', async () => {
    const store = useVaultStore()
    const entry = store.addEntry({ title: 'Test', username: 'user', password: 'pass' })
    await store.deleteEntry(entry.id)
    expect(store.entries.find(e => e.id === entry.id)).toBeUndefined()
  })

  it('TC-STORE-005-03: 删除不存在的条目应返回false', async () => {
    const store = useVaultStore()
    const result = await store.deleteEntry('non-existent-id')
    expect(result).toBe(false)
  })

  it('TC-STORE-005-04: 删除一个条目不应影响其他条目', async () => {
    const store = useVaultStore()
    const entry1 = store.addEntry({ title: 'Entry 1', username: 'user1', password: 'pass1' })
    const entry2 = store.addEntry({ title: 'Entry 2', username: 'user2', password: 'pass2' })
    await store.deleteEntry(entry1.id)
    expect(store.entryCount).toBe(1)
    expect(store.getEntry(entry2.id)).toBeDefined()
  })

  it('TC-STORE-005-05: 边界测试 - 删除最后一个条目', async () => {
    const store = useVaultStore()
    const entry = store.addEntry({ title: 'Test', username: 'user', password: 'pass' })
    await store.deleteEntry(entry.id)
    expect(store.entries).toEqual([])
  })
})

// ==================== TC-STORE-006: 条目获取 ====================
describe('getEntry 操作', () => {
  

  it('TC-STORE-006-01: 应正确获取指定条目', () => {
    const store = useVaultStore()
    const entry = store.addEntry({ title: 'Test', username: 'user', password: 'pass' })
    const retrieved = store.getEntry(entry.id)
    expect(retrieved).toEqual(entry)
  })

  it('TC-STORE-006-02: 获取不存在的条目应返回undefined', () => {
    const store = useVaultStore()
    const retrieved = store.getEntry('non-existent-id')
    expect(retrieved).toBeUndefined()
  })

  it('TC-STORE-006-03: 获取的条目应与原条目内容一致', () => {
    const store = useVaultStore()
    const entry = store.addEntry({
      title: 'Test',
      username: 'user@example.com',
      password: 'secret123',
      url: 'https://example.com',
      notes: 'Notes here',
    })
    const retrieved = store.getEntry(entry.id)
    expect(retrieved?.title).toBe(entry.title)
    expect(retrieved?.username).toBe(entry.username)
    expect(retrieved?.password).toBe(entry.password)
    expect(retrieved?.url).toBe(entry.url)
    expect(retrieved?.notes).toBe(entry.notes)
  })
})

// ==================== TC-STORE-007: 批量设置条目 ====================
describe('setEntries 操作', () => {
  

  it('TC-STORE-007-01: 应正确设置条目列表', () => {
    const store = useVaultStore()
    const entries: VaultEntry[] = [
      {
        id: 'uuid-1',
        title: 'Entry 1',
        username: 'user1',
        password: 'pass1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'uuid-2',
        title: 'Entry 2',
        username: 'user2',
        password: 'pass2',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]
    store.setEntries(entries)
    expect(store.entries).toEqual(entries)
    expect(store.entryCount).toBe(2)
  })

  it('TC-STORE-007-02: 设置应替换现有条目', () => {
    const store = useVaultStore()
    store.addEntry({ title: 'Old Entry', username: 'old', password: 'old' })
    const newEntries: VaultEntry[] = [
      {
        id: 'new-uuid',
        title: 'New Entry',
        username: 'new',
        password: 'new',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]
    store.setEntries(newEntries)
    expect(store.entryCount).toBe(1)
    expect(store.entries[0].title).toBe('New Entry')
  })

  it('TC-STORE-007-03: 边界测试 - 设置空列表', () => {
    const store = useVaultStore()
    store.addEntry({ title: 'Entry', username: 'user', password: 'pass' })
    store.setEntries([])
    expect(store.entries).toEqual([])
    expect(store.entryCount).toBe(0)
  })

  it('TC-STORE-007-04: 边界测试 - 大量条目', () => {
    const store = useVaultStore()
    const entries: VaultEntry[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `uuid-${i}`,
      title: `Entry ${i}`,
      username: `user${i}`,
      password: `pass${i}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))
    store.setEntries(entries)
    expect(store.entryCount).toBe(1000)
  })
})

// ==================== TC-STORE-008: 计算属性 ====================
describe('计算属性', () => {
  

  it('TC-STORE-008-01: entryCount应实时反映条目数量', async () => {
    const store = useVaultStore()
    expect(store.entryCount).toBe(0)
    store.addEntry({ title: 'Entry 1', username: 'user1', password: 'pass1' })
    expect(store.entryCount).toBe(1)
    store.addEntry({ title: 'Entry 2', username: 'user2', password: 'pass2' })
    expect(store.entryCount).toBe(2)
    await store.deleteEntry(store.entries[0].id)
    expect(store.entryCount).toBe(1)
  })

  it('TC-STORE-008-02: isUnlocked应反映锁定状态', async () => {
    const store = useVaultStore()
    expect(store.isUnlocked).toBe(false)
    await store.unlock('password')
    expect(store.isUnlocked).toBe(true)
    store.lock()
    expect(store.isUnlocked).toBe(false)
  })

  it('TC-STORE-008-03: isUnlocked需要同时满足两个条件', () => {
    const store = useVaultStore()
    // 仅解锁不设置key(不可能的状态，但测试逻辑)
    store.isLocked = false
    store.masterKey = null
    expect(store.isUnlocked).toBe(false)
  })
})

// ==================== TC-STORE-009: 综合场景测试 ====================
describe('综合场景', () => {
  

  it('TC-STORE-009-01: 完整CRUD流程', async () => {
    const store = useVaultStore()
    
    // 解锁
    await store.unlock('masterPassword')
    expect(store.isUnlocked).toBe(true)
    
    // 添加条目
    const entry = store.addEntry({ title: 'New Entry', username: 'user', password: 'pass' })
    expect(store.entryCount).toBe(1)
    
    // 更新条目
    store.updateEntry(entry.id, { title: 'Updated Entry' })
    expect(store.getEntry(entry.id)?.title).toBe('Updated Entry')
    
    // 删除条目
    await store.deleteEntry(entry.id)
    expect(store.entryCount).toBe(0)
    
    // 锁定
    store.lock()
    expect(store.isLocked).toBe(true)
  })

  it('TC-STORE-009-02: 多条目管理', async () => {
    const store = useVaultStore()
    
    // 添加多个条目
    const entries = []
    for (let i = 0; i < 10; i++) {
      entries.push(store.addEntry({
        title: `Entry ${i}`,
        username: `user${i}@example.com`,
        password: `password${i}`,
      }))
    }
    expect(store.entryCount).toBe(10)
    
    // 更新特定条目
    store.updateEntry(entries[5].id, { password: 'newPassword' })
    expect(store.getEntry(entries[5].id)?.password).toBe('newPassword')
    
    // 删除部分条目
    await store.deleteEntry(entries[0].id)
    await store.deleteEntry(entries[9].id)
    expect(store.entryCount).toBe(8)
  })

  it('TC-STORE-009-03: 锁定应清除条目数据', async () => {
    const store = useVaultStore()
    await store.unlock('password')
    const entry = store.addEntry({ title: 'Test', username: 'user', password: 'pass' })
    expect(store.entries.length).toBe(1)
    
    // 锁定后条目数据应被清除
    store.lock()
    expect(store.entries.length).toBe(0)
    
    // 状态为锁定
    expect(store.isLocked).toBe(true)
  })
})

// ==================== TC-STORE-010: editEntry 操作 ====================
describe('editEntry 操作', () => {
  it('TC-STORE-010-01: 应成功编辑条目并更新标题', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    // 先创建一个条目
    const entry = store.addEntry({ 
      title: 'Original Title', 
      username: 'user', 
      password: 'encrypted-password' 
    })
    
    // 编辑条目
    const result = await store.editEntry(entry.id, {
      title: 'Updated Title',
      username: 'user',
      site: '',
      notes: ''
    })
    
    expect(result.title).toBe('Updated Title')
    expect(store.getEntry(entry.id)?.title).toBe('Updated Title')
  })

  it('TC-STORE-010-02: 编辑时密码修改应重新加密', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    const entry = store.addEntry({ 
      title: 'Test', 
      username: 'user', 
      password: 'old-encrypted' 
    })
    
    await store.editEntry(entry.id, {
      title: 'Test',
      username: 'user',
      password: 'new-password',
      site: '',
      notes: ''
    })
    
    // 应调用加密API
    expect(mockElectronAPI.crypto.encrypt).toHaveBeenCalledWith(
      'new-password',
      'masterPassword'
    )
    // 应更新数据库
    expect(mockElectronAPI.db.updateEntry).toHaveBeenCalled()
  })

  it('TC-STORE-010-03: 编辑时密码未修改不应重新加密', async () => {
    vi.clearAllMocks()
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    const entry = store.addEntry({ 
      title: 'Test', 
      username: 'user', 
      password: 'encrypted' 
    })
    
    await store.editEntry(entry.id, {
      title: 'Updated Title',
      username: 'user',
      password: undefined,  // 未修改
      site: '',
      notes: ''
    })
    
    // 不应调用加密API
    expect(mockElectronAPI.crypto.encrypt).not.toHaveBeenCalled()
    // 应仍调用更新
    expect(mockElectronAPI.db.updateEntry).toHaveBeenCalled()
  })

  it('TC-STORE-010-04: 锁定状态编辑应抛出错误', async () => {
    const store = useVaultStore()
    // 默认锁定状态
    store.setEntries([{
      id: 'test-id',
      title: 'Test',
      username: 'user',
      password: 'p',
      createdAt: 0,
      updatedAt: 0
    }])
    
    await expect(store.editEntry('test-id', {
      title: 'Updated',
      username: 'user'
    })).rejects.toThrow('Vault is locked')
  })

  it('TC-STORE-010-05: 编辑不存在的条目应抛出错误', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    await expect(store.editEntry('non-existent-id', {
      title: 'Test',
      username: 'user'
    })).rejects.toThrow('Entry not found')
  })

  it('TC-STORE-010-06: 编辑应更新updatedAt时间戳', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    const entry = store.addEntry({ 
      title: 'Test', 
      username: 'user', 
      password: 'pass' 
    })
    const originalUpdatedAt = entry.updatedAt
    
    // 等待确保时间戳不同
    await new Promise(resolve => setTimeout(resolve, 10))
    
    await store.editEntry(entry.id, {
      title: 'Updated',
      username: 'user',
      site: '',
      notes: ''
    })
    
    expect(store.getEntry(entry.id)?.updatedAt).toBeGreaterThan(originalUpdatedAt)
  })
})

// ==================== TC-STORE-011: getDecryptedPassword 操作 ====================
describe('getDecryptedPassword 操作', () => {
  it('TC-STORE-011-01: 应成功解密密码', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    store.setEntries([{
      id: 'test-id',
      title: 'Test',
      username: 'user',
      password: 'encrypted-password',
      createdAt: 0,
      updatedAt: 0
    }])
    
    const decrypted = await store.getDecryptedPassword('test-id')
    
    expect(mockElectronAPI.crypto.decrypt).toHaveBeenCalledWith(
      'encrypted-password',
      'masterPassword'
    )
    expect(decrypted).toBe('decrypted-password')
  })

  it('TC-STORE-011-02: 锁定状态获取密码应抛出错误', async () => {
    const store = useVaultStore()
    // 默认锁定状态
    store.setEntries([{
      id: 'test-id',
      title: 'Test',
      username: 'user',
      password: 'encrypted',
      createdAt: 0,
      updatedAt: 0
    }])
    
    await expect(store.getDecryptedPassword('test-id')).rejects.toThrow('Vault is locked')
  })

  it('TC-STORE-011-03: 条目不存在应抛出错误', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    await expect(store.getDecryptedPassword('non-existent-id')).rejects.toThrow('Entry not found')
  })
})

// ==================== TC-STORE-012: 剪贴板安全清除 ====================
describe('剪贴板安全清除', () => {
  it('TC-STORE-012-01: 复制密码后应设置30秒清除定时器', async () => {
    vi.useFakeTimers()
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.setEntries([{
      id: 'test-id',
      title: 'Test',
      username: 'user',
      password: 'encrypted',
      createdAt: 0,
      updatedAt: 0
    }])
    
    await store.copyPassword('test-id')
    expect(store.copiedEntryId).toBe('test-id')
    
    vi.useRealTimers()
  })

  it('TC-STORE-012-02: 锁定时应清除剪贴板定时器和状态', async () => {
    vi.useFakeTimers()
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.setEntries([{
      id: 'test-id',
      title: 'Test',
      username: 'user',
      password: 'encrypted',
      createdAt: 0,
      updatedAt: 0
    }])
    
    await store.copyPassword('test-id')
    expect(store.copiedEntryId).toBe('test-id')
    
    // 锁定
    store.lock()
    
    // 剪贴板应被立即清除
    expect(mockClipboard.writeText).toHaveBeenCalledWith('')
    expect(store.copiedEntryId).toBe(null)
    
    vi.useRealTimers()
  })

  it('TC-STORE-012-03: 锁定时应清除所有状态', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    store.setEntries([{
      id: '1', title: 'Test', username: 'user', password: 'p', createdAt: 0, updatedAt: 0,
    }])
    store.copiedEntryId = '1'
    store.setCurrentPage('settings')

    // 锁定
    store.lock()

    // 所有状态应被清除
    expect(store.masterKey).toBe(null)
    expect(store.isLocked).toBe(true)
    expect(store.entries.length).toBe(0)
    expect(store.copiedEntryId).toBe(null)
    expect(store.currentPage).toBe('vault')  // 锁定时重置页面状态
  })
})

// ==================== TC-STORE-013: 空闲检测功能 ====================
describe('空闲检测功能', () => {
  it('TC-STORE-013-01: 初始状态应未激活空闲检测', () => {
    const store = useVaultStore()
    expect(store.isIdleDetectionActive).toBe(false)
    expect(store.idleTimer).toBe(null)
    expect(store.autoLockTimeout).toBe(5) // 默认5分钟
  })

  it('TC-STORE-013-02: 解锁后应启动空闲检测', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    expect(store.isIdleDetectionActive).toBe(true)
    expect(store.idleTimer).not.toBe(null)
  })

  it('TC-STORE-013-03: 锁定后应停止空闲检测', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    expect(store.isIdleDetectionActive).toBe(true)
    
    store.lock()
    
    expect(store.isIdleDetectionActive).toBe(false)
    expect(store.idleTimer).toBe(null)
  })

  it('TC-STORE-013-04: 用户活动应重置计时器', async () => {
    vi.useFakeTimers()
    
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    const firstTimer = store.idleTimer
    expect(firstTimer).not.toBe(null)
    
    // 模拟用户活动
    store.resetIdleTimer()
    
    // 计时器应该被重置（新定时器ID不同）
    expect(store.idleTimer).not.toBe(firstTimer)
    
    vi.useRealTimers()
  })

  it('TC-STORE-013-05: 未激活时空闲检测重置无效', () => {
    const store = useVaultStore()
    // 默认未激活
    expect(store.isIdleDetectionActive).toBe(false)
    
    // 重置应该无效（不抛出错误）
    store.resetIdleTimer()
    expect(store.idleTimer).toBe(null)
  })

  it('TC-STORE-013-06: autoLockTimeout为0时永不锁定', async () => {
    // 先初始化，确保不会重新加载配置
    mockElectronAPI.db.getSettings.mockResolvedValueOnce({ autoLockTimeout: 0 })
    
    const store = useVaultStore()
    await store.initialize()
    expect(store.autoLockTimeout).toBe(0)
    
    await store.unlock('masterPassword')
    expect(store.isIdleDetectionActive).toBe(true)
    
    // autoLockTimeout为0时，idleTimer应为null（不设置定时器）
    expect(store.idleTimer).toBe(null)
  })

  it('TC-STORE-013-07: 空闲超时应触发锁定', async () => {
    vi.useFakeTimers()
    
    // 先初始化，设置1分钟超时
    mockElectronAPI.db.getSettings.mockResolvedValueOnce({ autoLockTimeout: 1 })
    
    const store = useVaultStore()
    await store.initialize()
    expect(store.autoLockTimeout).toBe(1)
    
    await store.unlock('masterPassword')
    
    expect(store.isLocked).toBe(false)
    expect(store.idleTimer).not.toBe(null)
    
    // 快进1分钟
    vi.advanceTimersByTime(60 * 1000)
    
    // 应该自动锁定
    expect(store.isLocked).toBe(true)
    expect(store.masterKey).toBe(null)
    
    vi.useRealTimers()
  })

  it('TC-STORE-013-08: 解锁后重新激活空闲检测', async () => {
    const store = useVaultStore()
    
    // 第一次解锁
    await store.unlock('masterPassword')
    expect(store.isIdleDetectionActive).toBe(true)
    
    // 锁定
    store.lock()
    expect(store.isIdleDetectionActive).toBe(false)
    
    // 再次解锁
    await store.unlock('masterPassword')
    expect(store.isIdleDetectionActive).toBe(true)
    expect(store.idleTimer).not.toBe(null)
  })

  it('TC-STORE-013-09: 加载配置应正确设置autoLockTimeout', async () => {
    mockElectronAPI.db.getSettings.mockResolvedValueOnce({ autoLockTimeout: 10 })
    
    const store = useVaultStore()
    await store.loadAutoLockTimeout()
    
    expect(store.autoLockTimeout).toBe(10)
  })

  it('TC-STORE-013-10: 配置加载失败应使用默认值', async () => {
    mockElectronAPI.db.getSettings.mockRejectedValueOnce(new Error('DB error'))
    
    const store = useVaultStore()
    await store.loadAutoLockTimeout()
    
    // 应使用默认值5分钟
    expect(store.autoLockTimeout).toBe(5)
  })

  it('TC-STORE-013-11: initialize应加载配置并设置标记', async () => {
    const store = useVaultStore()
    expect(store.isInitialized).toBe(false)
    
    await store.initialize()
    
    expect(store.isInitialized).toBe(true)
    expect(mockElectronAPI.db.getSettings).toHaveBeenCalled()
  })
})

// ==================== TC-STORE-014: currentPage 状态管理 ====================
describe('currentPage 状态管理', () => {
  it('TC-STORE-014-01: 初始currentPage应为vault', () => {
    const store = useVaultStore()
    expect(store.currentPage).toBe('vault')
  })

  it('TC-STORE-014-02: setCurrentPage应更新currentPage', () => {
    const store = useVaultStore()
    store.setCurrentPage('settings')
    expect(store.currentPage).toBe('settings')
  })

  it('TC-STORE-014-03: setCurrentPage可切换回vault', () => {
    const store = useVaultStore()
    store.setCurrentPage('settings')
    expect(store.currentPage).toBe('settings')
    store.setCurrentPage('vault')
    expect(store.currentPage).toBe('vault')
  })

  it('TC-STORE-014-04: lock时应重置currentPage为vault', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.setCurrentPage('settings')
    expect(store.currentPage).toBe('settings')
    
    store.lock()
    expect(store.currentPage).toBe('vault')
  })

  it('TC-STORE-014-05: 多次切换页面状态应正确', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    store.setCurrentPage('settings')
    expect(store.currentPage).toBe('settings')
    
    store.setCurrentPage('vault')
    expect(store.currentPage).toBe('vault')
    
    store.setCurrentPage('settings')
    expect(store.currentPage).toBe('settings')
  })
})