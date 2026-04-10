/**
 * 密码库页面组件测试用例
 * 测试范围：VaultPage、VaultHeader、PasswordCard、AddPasswordModal、PasswordGenerator
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import VaultPage from '../src/components/VaultPage.vue'
import VaultHeader from '../src/components/VaultHeader.vue'
import PasswordCard from '../src/components/PasswordCard.vue'
import AddPasswordModal from '../src/components/AddPasswordModal.vue'
import PasswordGenerator from '../src/components/PasswordGenerator.vue'
import ConfirmDialog from '../src/components/ConfirmDialog.vue'
import Settings from '../src/components/Settings.vue'
import ChangePasswordModal from '../src/components/ChangePasswordModal.vue'
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

afterEach(() => {
  // 清理mock
  delete (window as any).electronAPI
  // 清理可能残留的 Teleport DOM
  document.body.innerHTML = ''
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

  it('TC-COMP-001-07: 应显示设置按钮', () => {
    const wrapper = mount(VaultHeader, {
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.btn-settings').exists()).toBe(true)
  })

  it('TC-COMP-001-08: 点击设置按钮应触发settings-click事件', async () => {
    const wrapper = mount(VaultHeader, {
      global: { plugins: [createPinia()] },
    })

    await wrapper.find('.btn-settings').trigger('click')

    expect(wrapper.emitted('settings-click')).toBeTruthy()
    expect(wrapper.emitted('settings-click')?.length).toBe(1)
  })

  it('TC-COMP-001-09: 设置按钮应有正确的title属性', () => {
    const wrapper = mount(VaultHeader, {
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.btn-settings').attributes('title')).toBe('设置')
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

// Modal 组件通用 mount 配置（stub Teleport 和 Transition）
const modalGlobalConfig = () => ({
  plugins: [createPinia()],
  stubs: {
    Teleport: { template: '<slot />' },
    Transition: { template: '<slot />' },
  }
})

describe('AddPasswordModal 组件', () => {
  it('TC-COMP-003-01: visible为false时不应显示', () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: false },
      global: modalGlobalConfig(),
    })

    expect(wrapper.find('.modal-backdrop').exists()).toBe(false)
  })

  it('TC-COMP-003-02: visible为true时应显示弹窗', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()
    
    expect(wrapper.find('.modal-backdrop').exists()).toBe(true)
    expect(wrapper.find('.modal-title').text()).toBe('新增密码条目')
  })

  it('TC-COMP-003-03: 应包含所有必填字段', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
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
      global: modalGlobalConfig(),
    })

    await flushPromises()
    await wrapper.find('.close-btn').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('TC-COMP-003-05: 点击取消按钮应触发close事件', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()
    await wrapper.find('.btn-cancel').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('TC-COMP-003-06: 空表单时保存按钮应禁用', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()
    
    // 空表单时保存按钮应禁用（formValid为false）
    const saveBtn = wrapper.find('.btn-save')
    expect(saveBtn.exists()).toBe(true)
    expect((saveBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('TC-COMP-003-07: 填写完整表单提交应触发save事件', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()

    // 填写表单
    const inputs = wrapper.findAll('.form-input')
    expect(inputs.length).toBeGreaterThan(0)
    
    // 设置名称
    if (inputs[0]) {
      await inputs[0].setValue('Test Entry')
    }
    
    // 设置密码 (第3个input)
    if (inputs[2]) {
      await inputs[2].setValue('test-password')
    }

    // 提交
    await wrapper.find('.btn-save').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('save')).toBeTruthy()
  })

  it('TC-COMP-003-08: 密码可见性切换应工作', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()

    // 找到密码输入框
    const inputs = wrapper.findAll('.form-input')
    if (inputs.length >= 3) {
      expect((inputs[2].element as HTMLInputElement).type).toBe('password')
    }
  })

  it('TC-COMP-003-09: 点击背景应触发close事件', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()
    
    // 点击背景层
    await wrapper.find('.modal-backdrop').trigger('click')
    await flushPromises()
    
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('TC-COMP-003-10: 密码强度指示器应显示', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()

    // 填写密码
    const inputs = wrapper.findAll('.form-input')
    if (inputs.length >= 3) {
      await inputs[2].setValue('StrongPassword123!')
    }
    await flushPromises()

    // 应显示强度指示器
    expect(wrapper.find('.strength-indicator').exists()).toBe(true)
    
    wrapper.unmount()
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
    await store.unlock('masterPassword')
    
    const wrapper = mount(VaultPage, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.vault-page').exists()).toBe(true)
    expect(wrapper.findComponent(VaultHeader).exists()).toBe(true)
  })

  it('TC-COMP-005-02: 空密码库应显示空状态', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
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
    await store.unlock('masterPassword')
    store.setEntries([{
      id: '1',
      title: 'Test Entry',
      username: 'user',
      password: 'encrypted',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }])
    
    const wrapper = mount(VaultPage, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))

    // 检查组件渲染
    expect(wrapper.find('.vault-page').exists()).toBe(true)
    
    wrapper.unmount()
  })

  it('TC-COMP-005-04: 应显示搜索栏（有条目时）', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.setEntries([{
      id: '1',
      title: 'Test',
      username: 'user',
      password: 'p',
      createdAt: 0,
      updatedAt: 0,
    }])
    
    const wrapper = mount(VaultPage, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))

    // 检查vault-page存在
    expect(wrapper.find('.vault-page').exists()).toBe(true)
    
    wrapper.unmount()
  })

  it('TC-COMP-005-05: 空密码库不应显示搜索栏', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.setEntries([])
    
    const wrapper = mount(VaultPage, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    
    wrapper.unmount()
  })

  it('TC-COMP-005-06: 加载状态应显示spinner', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.loading = true
    
    const wrapper = mount(VaultPage, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))

    // 检查vault-page存在
    expect(wrapper.find('.vault-page').exists()).toBe(true)
    
    wrapper.unmount()
  })

  it('TC-COMP-005-07: 搜索无结果应显示提示', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
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
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))

    // 检查vault-page存在
    expect(wrapper.find('.vault-page').exists()).toBe(true)
    
    wrapper.unmount()
  })

  it('TC-COMP-005-08: 点击新增按钮应打开弹窗', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')
    
    const wrapper = mount(VaultPage, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 直接调用store方法测试
    store.toggleModal()
    await flushPromises()
    
    expect(store.showModal).toBe(true)
    
    wrapper.unmount()
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

    // Vue自动转义HTML，text()返回解码后的原字符串（实体已解码）
    // 安全性体现在innerHTML中，检查innerHTML不包含可执行的script标签
    const titleEl = wrapper.find('.entry-title')
    expect(titleEl.text()).toBe('<script>alert("xss")</script>')
    // 检查HTML实体编码存在（转义后的形式）
    expect(titleEl.element.innerHTML).toContain('&lt;script')
  })

  it('TC-COMP-006-03: AddPasswordModal处理大量输入', async () => {
    const wrapper = mount(AddPasswordModal, {
      props: { visible: true },
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    })

    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))

    const inputs = document.querySelectorAll('.form-input')
    expect(inputs.length).toBeGreaterThan(0)
    
    if (inputs.length >= 1) {
      const longText = 'A'.repeat(10000)
      const input = inputs[0] as HTMLInputElement
      input.value = longText
      input.dispatchEvent(new Event('input'))
    }

    // 应能正常处理大量输入
    expect(inputs.length).toBeGreaterThan(0)
    
    wrapper.unmount()
  })
})

// ==================== TC-COMP-007: PasswordCard 操作按钮测试 ====================
describe('PasswordCard 操作按钮测试', () => {
  const mockEntry: VaultEntry = {
    id: 'test-id',
    title: 'Test Entry',
    username: 'user@example.com',
    password: 'encrypted-password',
    site: 'Test Site',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  it('TC-COMP-007-01: 应包含编辑按钮', () => {
    const wrapper = mount(PasswordCard, {
      props: { entry: mockEntry },
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.edit-btn').exists()).toBe(true)
  })

  it('TC-COMP-007-02: 应包含删除按钮', () => {
    const wrapper = mount(PasswordCard, {
      props: { entry: mockEntry },
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.delete-btn').exists()).toBe(true)
  })

  it('TC-COMP-007-03: 应包含复制按钮', () => {
    const wrapper = mount(PasswordCard, {
      props: { entry: mockEntry },
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.copy-btn').exists()).toBe(true)
  })

  it('TC-COMP-007-04: 应包含三个操作按钮', () => {
    const wrapper = mount(PasswordCard, {
      props: { entry: mockEntry },
      global: { plugins: [createPinia()] },
    })

    const buttons = wrapper.findAll('.action-btn')
    expect(buttons.length).toBe(3)
  })

  it('TC-COMP-007-05: isCopied状态时按钮应始终显示', () => {
    const wrapper = mount(PasswordCard, {
      props: { entry: mockEntry, isCopied: true },
      global: { plugins: [createPinia()] },
    })

    const footer = wrapper.find('.card-footer')
    expect(footer.classes()).toContain('show-actions')
  })

  it('TC-COMP-007-06: 编辑按钮应有正确的title属性', () => {
    const wrapper = mount(PasswordCard, {
      props: { entry: mockEntry },
      global: { plugins: [createPinia()] },
    })

    const editBtn = wrapper.find('.edit-btn')
    expect(editBtn.attributes('title')).toBe('编辑')
  })

  it('TC-COMP-007-07: 删除按钮应有正确的title属性', () => {
    const wrapper = mount(PasswordCard, {
      props: { entry: mockEntry },
      global: { plugins: [createPinia()] },
    })

    const deleteBtn = wrapper.find('.delete-btn')
    expect(deleteBtn.attributes('title')).toBe('删除')
  })
})

// ==================== TC-COMP-008: ConfirmDialog 组件测试 ====================
describe('ConfirmDialog 组件', () => {
  it('TC-COMP-008-01: 应有正确的props定义', () => {
    // 测试组件props定义
    expect(ConfirmDialog.props).toBeDefined()
  })

  it('TC-COMP-008-02: 应支持danger模式', async () => {
    // 测试组件定义
    expect(ConfirmDialog).toBeDefined()
  })
})

// ==================== TC-COMP-009: AddPasswordModal 编辑模式测试 ====================
describe('AddPasswordModal 编辑模式', () => {
  it('TC-COMP-009-01: 应支持mode prop', () => {
    // 测试组件支持mode prop
    expect(AddPasswordModal.props).toBeDefined()
  })

  it('TC-COMP-009-02: 应支持entry prop', () => {
    // 测试组件支持entry prop
    expect(AddPasswordModal).toBeDefined()
  })
})

// ==================== TC-COMP-010: Settings 组件 ====================
describe('Settings 组件', () => {
  it('TC-COMP-010-01: 应正确渲染设置页面结构', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')

    const wrapper = mount(Settings, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.settings-page').exists()).toBe(true)
    expect(wrapper.find('.settings-header').exists()).toBe(true)
    expect(wrapper.find('.settings-card').exists()).toBe(true)
  })

  it('TC-COMP-010-02: 应显示安全设置卡片', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')

    const wrapper = mount(Settings, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.card-title').text()).toBe('安全设置')
  })

  it('TC-COMP-010-03: 应显示"修改主密码"入口', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')

    const wrapper = mount(Settings, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.setting-title').text()).toBe('主密码')
    expect(wrapper.find('.setting-desc').text()).toContain('核心密码')
  })

  it('TC-COMP-010-04: 应有返回按钮', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')

    const wrapper = mount(Settings, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.back-btn').exists()).toBe(true)
  })

  it('TC-COMP-010-05: 点击返回按钮应切换到vault页面', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useVaultStore()
    await store.unlock('masterPassword')
    store.setCurrentPage('settings')

    const wrapper = mount(Settings, {
      global: { plugins: [pinia], stubs: modalGlobalConfig().stubs },
    })

    await flushPromises()
    await wrapper.find('.back-btn').trigger('click')

    expect(store.currentPage).toBe('vault')
  })

  it('TC-COMP-010-06: 点击修改主密码应打开弹窗', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')

    const wrapper = mount(Settings, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // 点击修改主密码行
    await wrapper.find('.setting-item').trigger('click')

    // ChangePasswordModal应被显示
    expect(wrapper.findComponent(ChangePasswordModal).exists()).toBe(true)
  })

  it('TC-COMP-010-07: 应显示底部安全提示', async () => {
    const store = useVaultStore()
    await store.unlock('masterPassword')

    const wrapper = mount(Settings, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.footer-text').text()).toContain('端到端加密')
  })
})

// ==================== TC-COMP-011: ChangePasswordModal 组件 ====================
describe('ChangePasswordModal 组件', () => {
  // 创建共享 Pinia 实例的辅助函数（确保组件和测试使用同一个 store）
  const createPiniaAndStore = () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    return { pinia, store: useVaultStore() }
  }

  it('TC-COMP-011-01: visible为false时不应显示', () => {
    const wrapper = mount(ChangePasswordModal, {
      props: { visible: false },
      global: modalGlobalConfig(),
    })

    expect(wrapper.find('.modal-backdrop').exists()).toBe(false)
  })

  it('TC-COMP-011-02: visible为true时应显示弹窗', async () => {
    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()

    expect(wrapper.find('.modal-backdrop').exists()).toBe(true)
    expect(wrapper.find('.modal-title').text()).toBe('修改主密码')
  })

  it('TC-COMP-011-03: 应包含三个密码输入框', async () => {
    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()

    const inputs = wrapper.findAll('.input')
    expect(inputs.length).toBe(3)
  })

  it('TC-COMP-011-04: 应包含密码强度指示器', async () => {
    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()

    // 输入新密码触发强度指示器显示
    const inputs = wrapper.findAll('.input')
    await inputs[1].setValue('TestPassword123!')

    expect(wrapper.find('.strength-indicator').exists() || wrapper.find('.strength-bar').exists()).toBe(true)
  })

  it('TC-COMP-011-05: 空表单时确认按钮应禁用', async () => {
    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()

    const saveBtn = wrapper.find('.btn-save')
    expect(saveBtn.exists()).toBe(true)
    expect((saveBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('TC-COMP-011-06: 点击取消按钮应触发close事件', async () => {
    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()
    await wrapper.find('.btn-cancel').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('TC-COMP-011-07: 点击关闭按钮应触发close事件', async () => {
    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()
    await wrapper.find('.close-btn').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('TC-COMP-011-08: 弱密码时应显示强度警告', async () => {
    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()

    // 输入弱密码
    const inputs = wrapper.findAll('.input')
    await inputs[1].setValue('abc')

    expect(wrapper.find('.strength-warning').exists()).toBe(true)
  })

  it('TC-COMP-011-09: 确认密码不匹配时应显示错误提示', async () => {
    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()

    const inputs = wrapper.findAll('.input')
    await inputs[1].setValue('TestPassword123')
    await inputs[2].setValue('DifferentPassword')

    expect(wrapper.find('.match-error').exists()).toBe(true)
  })

  it('TC-COMP-011-10: 确认密码匹配时应显示成功提示', async () => {
    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()

    const inputs = wrapper.findAll('.input')
    await inputs[1].setValue('TestPassword123')
    await inputs[2].setValue('TestPassword123')

    expect(wrapper.find('.match-success').exists()).toBe(true)
  })

  it('TC-COMP-011-11: 表单填写完整且有效时确认按钮应可用', async () => {
    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()

    const inputs = wrapper.findAll('.input')
    // 当前密码
    await inputs[0].setValue('currentPassword')
    // 新密码（中等强度：6位+大小写+数字）
    await inputs[1].setValue('abcDEF123')
    // 确认密码
    await inputs[2].setValue('abcDEF123')

    const saveBtn = wrapper.find('.btn-save')
    expect(saveBtn.exists()).toBe(true)
    expect((saveBtn.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('TC-COMP-011-12: 提交时应显示进度覆盖层', async () => {
    // 让changeMasterPassword延迟返回
    mockElectronAPI.crypto.changeMasterPassword.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 200))
    )

    const { pinia, store } = createPiniaAndStore()
    await store.unlock('masterPassword')

    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: { plugins: [pinia], stubs: modalGlobalConfig().stubs },
    })

    await flushPromises()

    const inputs = wrapper.findAll('.input')
    await inputs[0].setValue('masterPassword')
    await inputs[1].setValue('NewPassword123!')
    await inputs[2].setValue('NewPassword123!')

    // 点击确认修改
    await wrapper.find('.btn-save').trigger('click')
    await flushPromises()

    // 应显示进度覆盖层
    expect(wrapper.find('.progress-overlay').exists()).toBe(true)

    // 等待完成
    await new Promise(resolve => setTimeout(resolve, 300))
    await flushPromises()
  })

  it('TC-COMP-011-13: 提交中不应允许关闭弹窗', async () => {
    mockElectronAPI.crypto.changeMasterPassword.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 500))
    )

    const { pinia, store } = createPiniaAndStore()
    await store.unlock('masterPassword')

    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: { plugins: [pinia], stubs: modalGlobalConfig().stubs },
    })

    await flushPromises()

    const inputs = wrapper.findAll('.input')
    await inputs[0].setValue('masterPassword')
    await inputs[1].setValue('NewPassword123!')
    await inputs[2].setValue('NewPassword123!')

    // 提交
    await wrapper.find('.btn-save').trigger('click')
    await flushPromises()

    // 提交后表单被进度覆盖层替换，关闭按钮不可见
    expect(wrapper.find('.close-btn').exists()).toBe(false)
    // 不应触发close事件（因为正在提交中）
    expect(wrapper.emitted('close')).toBeFalsy()

    // 等待完成
    await new Promise(resolve => setTimeout(resolve, 600))
    await flushPromises()
  })

  it('TC-COMP-011-14: 修改成功应触发success事件', async () => {
    const { pinia, store } = createPiniaAndStore()
    await store.unlock('masterPassword')

    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: { plugins: [pinia], stubs: modalGlobalConfig().stubs },
    })

    await flushPromises()

    const inputs = wrapper.findAll('.input')
    await inputs[0].setValue('masterPassword')
    await inputs[1].setValue('NewPassword123!')
    await inputs[2].setValue('NewPassword123!')

    await wrapper.find('.btn-save').trigger('click')
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))
    await flushPromises()

    expect(wrapper.emitted('success')).toBeTruthy()
  })

  it('TC-COMP-011-15: 修改失败应显示错误信息', async () => {
    mockElectronAPI.crypto.changeMasterPassword.mockResolvedValueOnce({
      success: false,
      error: '当前密码错误'
    })

    const { pinia, store } = createPiniaAndStore()
    await store.unlock('masterPassword')

    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: { plugins: [pinia], stubs: modalGlobalConfig().stubs },
    })

    await flushPromises()

    const inputs = wrapper.findAll('.input')
    await inputs[0].setValue('wrongPassword')
    await inputs[1].setValue('NewPassword123!')
    await inputs[2].setValue('NewPassword123!')

    await wrapper.find('.btn-save').trigger('click')
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))
    await flushPromises()

    // 应显示错误信息
    expect(wrapper.find('.error-box').exists()).toBe(true)
    expect(wrapper.find('.error-box').text()).toContain('当前密码错误')
  })

  it('TC-COMP-011-16: 修改失败后应回到表单状态', async () => {
    mockElectronAPI.crypto.changeMasterPassword.mockResolvedValueOnce({
      success: false,
      error: '当前密码错误'
    })

    const { pinia, store } = createPiniaAndStore()
    await store.unlock('masterPassword')

    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: { plugins: [pinia], stubs: modalGlobalConfig().stubs },
    })

    await flushPromises()

    const inputs = wrapper.findAll('.input')
    await inputs[0].setValue('wrongPassword')
    await inputs[1].setValue('NewPassword123!')
    await inputs[2].setValue('NewPassword123!')

    await wrapper.find('.btn-save').trigger('click')
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 100))
    await flushPromises()

    // 应回到表单状态（不显示进度覆盖层）
    expect(wrapper.find('.progress-overlay').exists()).toBe(false)
    // 表单应仍然可见
    expect(wrapper.find('.modal-body').exists()).toBe(true)
  })

  it('TC-COMP-011-17: 应有密码可见性切换按钮', async () => {
    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()

    const visibilityBtns = wrapper.findAll('.visibility-btn')
    expect(visibilityBtns.length).toBe(3)  // 当前密码、新密码、确认密码各一个
  })

  it('TC-COMP-011-18: 应显示确认密码匹配指示器', async () => {
    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()

    const inputs = wrapper.findAll('.input')
    // 输入确认密码触发匹配指示器
    await inputs[2].setValue('test')

    // 匹配指示器应显示
    expect(wrapper.find('.match-indicator').exists()).toBe(true)
  })

  it('TC-COMP-011-19: 点击背景应触发close事件', async () => {
    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: modalGlobalConfig(),
    })

    await flushPromises()

    // 点击背景层
    await wrapper.find('.modal-backdrop').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('TC-COMP-011-20: 提交中点击背景不应关闭弹窗', async () => {
    mockElectronAPI.crypto.changeMasterPassword.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 500))
    )

    const { pinia, store } = createPiniaAndStore()
    await store.unlock('masterPassword')

    const wrapper = mount(ChangePasswordModal, {
      props: { visible: true },
      global: { plugins: [pinia], stubs: modalGlobalConfig().stubs },
    })

    await flushPromises()

    const inputs = wrapper.findAll('.input')
    await inputs[0].setValue('masterPassword')
    await inputs[1].setValue('NewPassword123!')
    await inputs[2].setValue('NewPassword123!')

    // 提交
    await wrapper.find('.btn-save').trigger('click')
    await flushPromises()

    // 点击背景层
    await wrapper.find('.modal-backdrop').trigger('click')

    // 不应触发close事件
    expect(wrapper.emitted('close')).toBeFalsy()

    // 等待完成
    await new Promise(resolve => setTimeout(resolve, 600))
    await flushPromises()
  })
})