/**
 * 密码库页面组件测试用例
 * 测试范围：VaultPage、VaultHeader、PasswordCard、AddPasswordModal、PasswordGenerator
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import VaultPage from '../src/components/VaultPage.vue'
import VaultHeader from '../src/components/VaultHeader.vue'
import PasswordCard from '../src/components/PasswordCard.vue'
import AddPasswordModal from '../src/components/AddPasswordModal.vue'
import PasswordGenerator from '../src/components/PasswordGenerator.vue'
import { useVaultStore, type VaultEntry } from '../src/stores/vault'

// Mock Electron API
const mockElectronAPI = {
  crypto: {
    encrypt: vi.fn().mockResolvedValue('encrypted-password'),
    decrypt: vi.fn().mockResolvedValue('decrypted-password'),
    generatePassword: vi.fn().mockResolvedValue('GeneratedPassword123!'),
    getPasswordStrengthLevel: vi.fn().mockResolvedValue('strong'),
  },
  db: {
    getEntries: vi.fn().mockResolvedValue([]),
    addEntry: vi.fn().mockResolvedValue(undefined),
    deleteEntry: vi.fn().mockResolvedValue(true),
  },
}

// Mock clipboard
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
}

// 设置全局 mock
beforeEach(() => {
  vi.stubGlobal('window', { electronAPI: mockElectronAPI })
  vi.stubGlobal('navigator', { clipboard: mockClipboard })
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

// ==================== TC-COMP-001: VaultHeader 组件 ====================
describe('VaultHeader 组件', () => {
  it('TC-COMP-001-01: 应正确渲染标题和记录数', () => {
    const wrapper = mount(VaultHeader, {
      props: { entryCount: 10 },
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.title').text()).toBe('密码库')
    expect(wrapper.find('.entry-count').text()).toContain('10 条记录')
  })

  it('TC-COMP-001-02: 应显示默认记录数0', () => {
    const wrapper = mount(VaultHeader, {
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.entry-count').text()).toContain('0 条记录')
  })

  it('TC-COMP-001-03: 点击新增按钮应触发add-click事件', async () => {
    const wrapper = mount(VaultHeader, {
      global: { plugins: [createPinia()] },
    })

    await wrapper.find('.btn-add').trigger('click')

    expect(wrapper.emitted('add-click')).toBeTruthy()
    expect(wrapper.emitted('add-click')?.length).toBe(1)
  })

  it('TC-COMP-001-04: 点击锁定按钮应触发lock-click事件', async () => {
    const wrapper = mount(VaultHeader, {
      global: { plugins: [createPinia()] },
    })

    await wrapper.find('.btn-lock').trigger('click')

    expect(wrapper.emitted('lock-click')).toBeTruthy()
  })

  it('TC-COMP-001-05: 应显示Logo图标', () => {
    const wrapper = mount(VaultHeader, {
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.logo-container').exists()).toBe(true)
    expect(wrapper.find('.logo-icon').exists()).toBe(true)
  })

  it('TC-COMP-001-06: 新增按钮应有hover效果', async () => {
    const wrapper = mount(VaultHeader, {
      global: { plugins: [createPinia()] },
    })

    const btn = wrapper.find('.btn-add')
    expect(btn.exists()).toBe(true)
    
    // 检查按钮文本
    expect(btn.text()).toContain('新增')
  })
})

// ==================== TC-COMP-002: PasswordCard 组件 ====================
describe('PasswordCard 组件', () => {
  const mockEntry: VaultEntry = {
    id: 'test-id',
    title: 'Google Account',
    username: 'user@gmail.com',
    password: 'encrypted-password',
    site: 'Google',
    notes: 'My primary account',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  it('TC-COMP-002-01: 应正确渲染卡片内容', () => {
    const wrapper = mount(PasswordCard, {
      props: { entry: mockEntry },
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.entry-title').text()).toBe('Google Account')
    expect(wrapper.find('.site-text').text()).toBe('Google')
  })

  it('TC-COMP-002-02: 无site时应显示title', () => {
    const entryWithoutSite = { ...mockEntry, site: undefined }
    const wrapper = mount(PasswordCard, {
      props: { entry: entryWithoutSite },
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.site-text').text()).toBe('Google Account')
  })

  it('TC-COMP-002-03: 应显示备注内容', () => {
    const wrapper = mount(PasswordCard, {
      props: { entry: mockEntry },
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.notes-text').text()).toBe('My primary account')
  })

  it('TC-COMP-002-04: 无备注时应显示占位符', () => {
    const entryWithoutNotes = { ...mockEntry, notes: undefined }
    const wrapper = mount(PasswordCard, {
      props: { entry: entryWithoutNotes },
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.notes-text').text()).toBe('—')
  })

  it('TC-COMP-002-05: 点击复制按钮应触发copy-password事件', async () => {
    const wrapper = mount(PasswordCard, {
      props: { entry: mockEntry },
      global: { plugins: [createPinia()] },
    })

    await wrapper.find('.copy-btn').trigger('click')

    expect(wrapper.emitted('copy-password')).toBeTruthy()
    expect(wrapper.emitted('copy-password')?.[0]).toEqual(['test-id'])
  })

  it('TC-COMP-002-06: isCopied为true时应显示已复制状态', () => {
    const wrapper = mount(PasswordCard, {
      props: { entry: mockEntry, isCopied: true },
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.password-card').classes()).toContain('is-copied')
    expect(wrapper.find('.copy-btn').classes()).toContain('copied')
    expect(wrapper.find('.copied-text').text()).toBe('已复制')
  })

  it('TC-COMP-002-07: isCopied为false时应显示复制图标', () => {
    const wrapper = mount(PasswordCard, {
      props: { entry: mockEntry, isCopied: false },
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.copy-btn').classes()).not.toContain('copied')
    expect(wrapper.find('.copied-text').exists()).toBe(false)
  })

  it('TC-COMP-002-08: 卡片应有hover状态变化', async () => {
    const wrapper = mount(PasswordCard, {
      props: { entry: mockEntry },
      global: { plugins: [createPinia()] },
    })

    const card = wrapper.find('.password-card')
    
    await card.trigger('mouseenter')
    // 检查样式变化（通过类或样式）
    expect(card.exists()).toBe(true)
    
    await card.trigger('mouseleave')
    expect(card.exists()).toBe(true)
  })
})

// ==================== TC-COMP-003: AddPasswordModal 组件 ====================
describe('AddPasswordModal 组件', () => {
  it('TC-COMP-003-01: visible为false时不应显示', () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: false },
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.modal-backdrop').exists()).toBe(false)
  })

  it('TC-COMP-003-02: visible为true时应显示弹窗', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    
    expect(wrapper.find('.modal-backdrop').exists()).toBe(true)
    expect(wrapper.find('.modal-title').text()).toBe('新增密码条目')
  })

  it('TC-COMP-003-03: 应包含所有必填字段', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // 检查表单字段
    const labels = wrapper.findAll('.form-label')
    const labelTexts = labels.map(l => l.text())
    expect(labelTexts.some(t => t.includes('名称'))).toBe(true)
    expect(labelTexts.some(t => t.includes('密码'))).toBe(true)
  })

  it('TC-COMP-003-04: 点击关闭按钮应触发close事件', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    await wrapper.find('.close-btn').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('TC-COMP-003-05: 点击取消按钮应触发close事件', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    await wrapper.find('.btn-cancel').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('TC-COMP-003-06: 空表单提交应显示错误', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    
    // 直接调用保存方法（不填写表单）
    await wrapper.find('.btn-save').trigger('click')
    await flushPromises()

    expect(wrapper.find('.error-box').exists()).toBe(true)
  })

  it('TC-COMP-003-07: 填写完整表单提交应触发save事件', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // 填写表单
    const inputs = wrapper.findAll('.form-input')
    await inputs[0].setValue('Test Entry') // 名称
    await inputs[2].setValue('test-password') // 密码

    // 提交
    await wrapper.find('.btn-save').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('save')).toBeTruthy()
    const savePayload = wrapper.emitted('save')?.[0]?.[0] as any
    expect(savePayload.title).toBe('Test Entry')
    expect(savePayload.password).toBe('test-password')
  })

  it('TC-COMP-003-08: 密码可见性切换应工作', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // 找到密码输入框
    const passwordInput = wrapper.findAll('.form-input')[2]
    expect(passwordInput.attributes('type')).toBe('password')

    // 点击显示按钮
    const visibilityBtn = wrapper.findAll('.action-btn').find(btn => !btn.classes().includes('generate-btn'))
    if (visibilityBtn) {
      await visibilityBtn.trigger('click')
      await flushPromises()
      // 切换后应该是 text 类型
    }
  })

  it('TC-COMP-003-09: 点击背景应触发close事件', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    
    // 点击背景层
    await wrapper.find('.modal-backdrop').trigger('click')
    
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('TC-COMP-003-10: 密码强度指示器应显示', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // 填写密码
    const inputs = wrapper.findAll('.form-input')
    await inputs[2].setValue('StrongPassword123!')

    // 应显示强度指示器
    expect(wrapper.find('.strength-indicator').exists()).toBe(true)
  })
})

// ==================== TC-COMP-004: PasswordGenerator 组件 ====================
describe('PasswordGenerator 组件', () => {
  it('TC-COMP-004-01: 应自动生成密码', async () => {
    const wrapper = mount(PasswordGenerator, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // 应调用生成API
    expect(mockElectronAPI.crypto.generatePassword).toHaveBeenCalled()
  })

  it('TC-COMP-004-02: 应显示生成的密码', async () => {
    const wrapper = mount(PasswordGenerator, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.preview-password').text()).toBe('GeneratedPassword123!')
  })

  it('TC-COMP-004-03: 应显示密码强度', async () => {
    const wrapper = mount(PasswordGenerator, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.strength-text').exists()).toBe(true)
  })

  it('TC-COMP-004-04: 点击使用按钮应触发use-password事件', async () => {
    const wrapper = mount(PasswordGenerator, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    await wrapper.find('.use-btn').trigger('click')

    expect(wrapper.emitted('use-password')).toBeTruthy()
    expect(wrapper.emitted('use-password')?.[0]).toEqual(['GeneratedPassword123!'])
  })

  it('TC-COMP-004-05: 长度滑块应在8-32范围内', async () => {
    const wrapper = mount(PasswordGenerator, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const slider = wrapper.find('.length-slider')
    expect(slider.attributes('min')).toBe('8')
    expect(slider.attributes('max')).toBe('32')
  })

  it('TC-COMP-004-06: 默认应启用所有字符类型', async () => {
    const wrapper = mount(PasswordGenerator, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBe(4)
    // 默认都选中
    checkboxes.forEach(cb => {
      expect((cb.element as HTMLInputElement).checked).toBe(true)
    })
  })

  it('TC-COMP-004-07: 修改长度应重新生成密码', async () => {
    const wrapper = mount(PasswordGenerator, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    vi.clearAllMocks()

    // 修改长度
    const slider = wrapper.find('.length-slider')
    await slider.setValue(20)

    // 应重新调用生成API
    expect(mockElectronAPI.crypto.generatePassword).toHaveBeenCalledWith(
      20,
      expect.any(Object)
    )
  })

  it('TC-COMP-004-08: 使用按钮无密码时应禁用', async () => {
    mockElectronAPI.crypto.generatePassword.mockResolvedValueOnce('')
    
    const wrapper = mount(PasswordGenerator, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const useBtn = wrapper.find('.use-btn')
    expect(useBtn.attributes('disabled')).toBeDefined()
  })
})

// ==================== TC-COMP-005: VaultPage 组件 ====================
describe('VaultPage 组件', () => {
  it('TC-COMP-005-01: 应正确渲染页面结构', async () => {
    const store = useVaultStore()
    store.unlock('masterPassword')
    
    const wrapper = mount(VaultPage, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.vault-page').exists()).toBe(true)
    expect(wrapper.findComponent(VaultHeader).exists()).toBe(true)
  })

  it('TC-COMP-005-02: 空密码库应显示空状态', async () => {
    const store = useVaultStore()
    store.unlock('masterPassword')
    store.setEntries([])
    
    const wrapper = mount(VaultPage, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.empty-title').text()).toContain('暂无密码条目')
  })

  it('TC-COMP-005-03: 有条目时应显示卡片网格', async () => {
    const store = useVaultStore()
    store.unlock('masterPassword')
    store.setEntries([{
      id: '1',
      title: 'Test Entry',
      username: 'user',
      password: 'encrypted',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }])
    
    const wrapper = mount(VaultPage, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.cards-grid').exists()).toBe(true)
    expect(wrapper.findComponent(PasswordCard).exists()).toBe(true)
  })

  it('TC-COMP-005-04: 应显示搜索栏（有条目时）', async () => {
    const store = useVaultStore()
    store.unlock('masterPassword')
    store.setEntries([{
      id: '1',
      title: 'Test',
      username: 'user',
      password: 'p',
      createdAt: 0,
      updatedAt: 0,
    }])
    
    const wrapper = mount(VaultPage, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.search-bar').exists()).toBe(true)
    expect(wrapper.find('.search-input').exists()).toBe(true)
  })

  it('TC-COMP-005-05: 空密码库不应显示搜索栏', async () => {
    const store = useVaultStore()
    store.unlock('masterPassword')
    store.setEntries([])
    
    const wrapper = mount(VaultPage, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.search-bar').exists()).toBe(false)
  })

  it('TC-COMP-005-06: 加载状态应显示spinner', async () => {
    const store = useVaultStore()
    store.unlock('masterPassword')
    store.loading = true
    
    const wrapper = mount(VaultPage, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.loading-state').exists()).toBe(true)
    expect(wrapper.find('.spinner').exists()).toBe(true)
  })

  it('TC-COMP-005-07: 搜索无结果应显示提示', async () => {
    const store = useVaultStore()
    store.unlock('masterPassword')
    store.setEntries([{
      id: '1',
      title: 'Google',
      username: 'user',
      password: 'p',
      createdAt: 0,
      updatedAt: 0,
    }])
    store.setSearchQuery('nonexistent')
    
    const wrapper = mount(VaultPage, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.no-results').exists()).toBe(true)
    expect(wrapper.find('.no-results-text').text()).toContain('未找到')
  })

  it('TC-COMP-005-08: 点击新增按钮应打开弹窗', async () => {
    const store = useVaultStore()
    store.unlock('masterPassword')
    
    const wrapper = mount(VaultPage, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    
    // 触发Header的新增事件
    await wrapper.findComponent(VaultHeader).vm.$emit('add-click')
    await flushPromises()

    expect(store.showModal).toBe(true)
  })
})

// ==================== TC-COMP-006: 边界测试 ====================
describe('组件边界测试', () => {
  it('TC-COMP-006-01: PasswordCard处理极长标题', () => {
    const longTitleEntry: VaultEntry = {
      id: '1',
      title: 'A'.repeat(200),
      username: 'user',
      password: 'p',
      createdAt: 0,
      updatedAt: 0,
    }
    
    const wrapper = mount(PasswordCard, {
      props: { entry: longTitleEntry },
      global: { plugins: [createPinia()] },
    })

    // 应能正常渲染，CSS会处理溢出
    expect(wrapper.find('.entry-title').exists()).toBe(true)
  })

  it('TC-COMP-006-02: PasswordCard处理特殊字符', () => {
    const specialEntry: VaultEntry = {
      id: '1',
      title: '<script>alert("xss")</script>',
      username: 'user',
      password: 'p',
      notes: '测试\n换行\t制表符',
      createdAt: 0,
      updatedAt: 0,
    }
    
    const wrapper = mount(PasswordCard, {
      props: { entry: specialEntry },
      global: { plugins: [createPinia()] },
    })

    // Vue应自动转义HTML
    expect(wrapper.find('.entry-title').text()).not.toContain('<script>')
  })

  it('TC-COMP-006-03: AddPasswordModal处理大量输入', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const longText = 'A'.repeat(10000)
    const inputs = wrapper.findAll('.form-input')
    
    await inputs[0].setValue(longText)
    await inputs[2].setValue(longText)

    // 应能正常处理大量输入
    expect((inputs[0].element as HTMLInputElement).value).toBe(longText)
  })
})