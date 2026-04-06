/**
 * LockScreen.vue 组件测试用例
 * 测试范围：UI交互、密码验证、密码强度显示、表单提交
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LockScreen from '../src/components/LockScreen.vue'
import { useVaultStore } from '../src/stores/vault'

// 由于Vue Test Utils对script setup组件的类型推断限制
// 使用辅助函数获取组件状态
function getVM(wrapper: ReturnType<typeof mount>) {
  return wrapper.vm as {
    isFirstTime: boolean
    loading: boolean
    password: string
    confirmPassword: string
    error: string
    submitting: boolean
    showPassword: boolean
    showConfirmPassword: boolean
    passwordStrength: { level: number; text: string; color: string; percent: number }
    confirmPasswordMatch: boolean | null
    $nextTick: () => Promise<void>
  }
}

// Mock Electron API
const mockElectronAPI = {
  crypto: {
    createVerifyData: vi.fn().mockResolvedValue('mock-verify-data'),
    verifyPassword: vi.fn().mockResolvedValue(true),
    getPasswordStrength: vi.fn().mockResolvedValue(50),
    getPasswordStrengthLevel: vi.fn().mockResolvedValue('medium'),
    generatePassword: vi.fn().mockResolvedValue('GeneratedPassword123!'),
    encrypt: vi.fn().mockResolvedValue('encrypted-data'),
    decrypt: vi.fn().mockResolvedValue('decrypted-data'),
  },
  db: {
    getMasterKeyVerify: vi.fn().mockResolvedValue(null),
    setMasterKeyVerify: vi.fn().mockResolvedValue(undefined),
    getEntries: vi.fn().mockResolvedValue([]),
    setEntries: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({ autoLockTimeout: 5, theme: 'system' }),
    updateSettings: vi.fn().mockResolvedValue(undefined),
  },
}

// 设置全局 mock
beforeEach(() => {
  // 直接修改window属性，保留原有构造函数
  ;(window as any).electronAPI = mockElectronAPI
  setActivePinia(createPinia())
  // 重置所有 mock
  vi.clearAllMocks()
})

// ==================== TC-UI-001: 组件渲染 ====================
describe('LockScreen 组件渲染', () => {
  it('TC-UI-001-01: 应正确渲染组件结构', async () => {
    const wrapper = mount(LockScreen, {
      global: {
        plugins: [createPinia()],
      },
    })
    
    // 等待异步初始化完成
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 检查主要元素存在
    expect(wrapper.find('.lock-screen').exists()).toBe(true)
    expect(wrapper.find('.lock-card').exists()).toBe(true)
    expect(wrapper.find('.brand-area').exists()).toBe(true)
    expect(wrapper.find('.title').text()).toBe('PassLock')
  })

  it('TC-UI-001-02: 应显示加载状态', async () => {
    mockElectronAPI.db.getMasterKeyVerify.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(resolve, 500))
    )
    
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    // 初始应显示加载状态
    expect(wrapper.find('.loading-state').exists()).toBe(true)
    expect(wrapper.find('.spinner').exists()).toBe(true)
  })

  it('TC-UI-001-03: Logo应正确显示', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(wrapper.find('.logo-container').exists()).toBe(true)
    expect(wrapper.find('.logo-icon').exists()).toBe(true)
  })

  it('TC-UI-001-04: 底部安全提示应显示', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(wrapper.find('.footer').exists()).toBe(true)
    expect(wrapper.find('.footer-text').text()).toContain('端到端加密')
  })
})

// ==================== TC-UI-002: 首次使用流程 ====================
describe('首次使用流程', () => {
  beforeEach(() => {
    mockElectronAPI.db.getMasterKeyVerify.mockResolvedValue(null)
  })

  it('TC-UI-002-01: 首次使用应显示创建密码表单', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(getVM(wrapper).isFirstTime).toBe(true)
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('.hint').text()).toContain('创建主密码')
  })

  it('TC-UI-002-02: 首次使用应显示两个密码输入框', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const inputs = wrapper.findAll('.input')
    expect(inputs.length).toBe(2)
    expect(inputs[0].attributes('placeholder')).toBe('主密码')
    expect(inputs[1].attributes('placeholder')).toBe('确认密码')
  })

  it('TC-UI-002-03: 应显示密码强度指示器', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 输入密码
    const passwordInput = wrapper.findAll('.input')[0]
    await passwordInput.setValue('testPassword123')
    
    expect(wrapper.find('.strength-indicator').exists()).toBe(true)
    expect(wrapper.find('.strength-bar').exists()).toBe(true)
  })

  it('TC-UI-002-04: 短密码(<6位)提交应显示错误', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 输入短密码
    getVM(wrapper).password = 'abc'
    getVM(wrapper).confirmPassword = 'abc'
    
    // 触发提交
    await wrapper.find('form').trigger('submit.prevent')
    
    expect(getVM(wrapper).error).toBe('密码长度至少 6 位')
    expect(wrapper.find('.error-box').exists()).toBe(true)
  })

  it('TC-UI-002-05: 两次密码不一致应显示错误', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'password1'
    getVM(wrapper).confirmPassword = 'password2'
    
    await wrapper.find('form').trigger('submit.prevent')
    
    expect(getVM(wrapper).error).toBe('两次密码不一致')
  })

  it('TC-UI-002-06: 正确输入应成功创建密码库', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'validPassword123'
    getVM(wrapper).confirmPassword = 'validPassword123'
    
    await wrapper.find('form').trigger('submit.prevent')
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(mockElectronAPI.crypto.createVerifyData).toHaveBeenCalledWith('validPassword123')
    expect(mockElectronAPI.db.setMasterKeyVerify).toHaveBeenCalledWith('mock-verify-data')
  })

  it('TC-UI-002-07: 创建按钮文本正确', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(wrapper.find('.btn-primary').text()).toContain('创建密码库')
  })
})

// ==================== TC-UI-003: 解锁流程 ====================
describe('解锁流程', () => {
  beforeEach(() => {
    mockElectronAPI.db.getMasterKeyVerify.mockResolvedValue('existing-verify-data')
  })

  it('TC-UI-003-01: 已有密码库应显示解锁表单', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(getVM(wrapper).isFirstTime).toBe(false)
    expect(wrapper.find('.hint').text()).toContain('解锁密码库')
  })

  it('TC-UI-003-02: 解锁表单只有一个密码输入框', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const inputs = wrapper.findAll('.input')
    expect(inputs.length).toBe(1)
  })

  it('TC-UI-003-03: 空密码提交应显示错误', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = ''
    
    await wrapper.find('form').trigger('submit.prevent')
    
    expect(getVM(wrapper).error).toBe('请输入主密码')
  })

  it('TC-UI-003-04: 正确密码应成功解锁', async () => {
    mockElectronAPI.crypto.verifyPassword.mockResolvedValue(true)
    
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'correctPassword'
    
    await wrapper.find('form').trigger('submit.prevent')
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(mockElectronAPI.crypto.verifyPassword).toHaveBeenCalled()
    const store = useVaultStore()
    expect(store.isUnlocked).toBe(true)
  })

  it('TC-UI-003-05: 错误密码应显示错误信息', async () => {
    mockElectronAPI.crypto.verifyPassword.mockResolvedValue(false)
    
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'wrongPassword'
    
    await wrapper.find('form').trigger('submit.prevent')
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(getVM(wrapper).error).toBe('密码错误')
  })

  it('TC-UI-003-06: 解锁按钮文本正确', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(wrapper.find('.btn-primary').text()).toContain('解锁')
  })
})

// ==================== TC-UI-004: 密码强度计算 ====================
describe('密码强度显示', () => {
  beforeEach(() => {
    mockElectronAPI.db.getMasterKeyVerify.mockResolvedValue(null)
  })

  it('TC-UI-004-01: 空密码不显示强度', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(getVM(wrapper).passwordStrength.level).toBe(0)
    expect(wrapper.find('.strength-indicator').exists()).toBe(false)
  })

  it('TC-UI-004-02: 短密码显示"太短"', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'abc'
    await wrapper.vm.$nextTick()
    
    expect(getVM(wrapper).passwordStrength.text).toBe('太短')
  })

  it('TC-UI-004-03: 6位单一类型密码显示"弱"', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'abcdef'
    await wrapper.vm.$nextTick()
    
    expect(getVM(wrapper).passwordStrength.text).toBe('弱')
  })

  it('TC-UI-004-04: 6位混合类型密码显示"中等"', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'abcDEF'
    await wrapper.vm.$nextTick()
    
    expect(getVM(wrapper).passwordStrength.text).toBe('中等')
  })

  it('TC-UI-004-05: 10位混合密码显示"强"', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'abcDEF123'
    await wrapper.vm.$nextTick()
    
    expect(getVM(wrapper).passwordStrength.text).toBe('强')
  })

  it('TC-UI-004-06: 全类型10位密码显示"非常强"', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'abcDEF123!'
    await wrapper.vm.$nextTick()
    
    expect(getVM(wrapper).passwordStrength.text).toBe('非常强')
    expect(getVM(wrapper).passwordStrength.percent).toBe(100)
  })
})

// ==================== TC-UI-005: 确认密码匹配 ====================
describe('确认密码匹配检测', () => {
  beforeEach(() => {
    mockElectronAPI.db.getMasterKeyVerify.mockResolvedValue(null)
  })

  it('TC-UI-005-01: 空确认密码不显示匹配状态', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(getVM(wrapper).confirmPasswordMatch).toBe(null)
    expect(wrapper.find('.match-indicator').exists()).toBe(false)
  })

  it('TC-UI-005-02: 匹配显示"密码匹配"', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'testPassword'
    getVM(wrapper).confirmPassword = 'testPassword'
    await wrapper.vm.$nextTick()
    
    expect(getVM(wrapper).confirmPasswordMatch).toBe(true)
    expect(wrapper.find('.match-success').text()).toBe('密码匹配')
  })

  it('TC-UI-005-03: 不匹配显示"密码不一致"', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'testPassword1'
    getVM(wrapper).confirmPassword = 'testPassword2'
    await wrapper.vm.$nextTick()
    
    expect(getVM(wrapper).confirmPasswordMatch).toBe(false)
    expect(wrapper.find('.match-error').text()).toBe('密码不一致')
  })
})

// ==================== TC-UI-006: 密码可见性切换 ====================
describe('密码可见性切换', () => {
  beforeEach(() => {
    mockElectronAPI.db.getMasterKeyVerify.mockResolvedValue(null)
  })

  it('TC-UI-006-01: 默认密码不可见', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(getVM(wrapper).showPassword).toBe(false)
    const passwordInput = wrapper.findAll('.input')[0]
    expect(passwordInput.attributes('type')).toBe('password')
  })

  it('TC-UI-006-02: 点击按钮切换为可见', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const visibilityBtn = wrapper.findAll('.visibility-btn')[0]
    await visibilityBtn.trigger('click')
    
    expect(getVM(wrapper).showPassword).toBe(true)
    await wrapper.vm.$nextTick()
    const passwordInput = wrapper.findAll('.input')[0]
    expect(passwordInput.attributes('type')).toBe('text')
  })

  it('TC-UI-006-03: 再次点击切换回不可见', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const visibilityBtn = wrapper.findAll('.visibility-btn')[0]
    await visibilityBtn.trigger('click')
    await visibilityBtn.trigger('click')
    
    expect(getVM(wrapper).showPassword).toBe(false)
  })

  it('TC-UI-006-04: 确认密码有独立的可见性控制', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(getVM(wrapper).showConfirmPassword).toBe(false)
    
    const visibilityBtn = wrapper.findAll('.visibility-btn')[1]
    await visibilityBtn.trigger('click')
    
    expect(getVM(wrapper).showConfirmPassword).toBe(true)
    expect(getVM(wrapper).showPassword).toBe(false) // 主密码可见性不变
  })
})

// ==================== TC-UI-007: 提交状态 ====================
describe('提交状态处理', () => {
  beforeEach(() => {
    mockElectronAPI.db.getMasterKeyVerify.mockResolvedValue(null)
  })

  it('TC-UI-007-01: 提交时按钮显示加载状态', async () => {
    mockElectronAPI.crypto.createVerifyData.mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 500))
    )
    
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'validPassword'
    getVM(wrapper).confirmPassword = 'validPassword'
    
    await wrapper.find('form').trigger('submit.prevent')
    
    expect(getVM(wrapper).submitting).toBe(true)
    expect(wrapper.find('.btn-spinner').exists()).toBe(true)
    expect(wrapper.find('.btn-primary').text()).toContain('创建中')
  })

  it('TC-UI-007-02: 提交时输入框禁用', async () => {
    mockElectronAPI.crypto.createVerifyData.mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 500))
    )
    
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'validPassword'
    getVM(wrapper).confirmPassword = 'validPassword'
    
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    
    const inputs = wrapper.findAll('.input')
    expect(inputs[0].attributes('disabled')).toBeDefined()
    expect(inputs[1].attributes('disabled')).toBeDefined()
  })

  it('TC-UI-007-03: 提交完成后状态恢复', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'validPassword'
    getVM(wrapper).confirmPassword = 'validPassword'
    
    await wrapper.find('form').trigger('submit.prevent')
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(getVM(wrapper).submitting).toBe(false)
  })
})

// ==================== TC-UI-008: 错误处理 ====================
describe('错误处理', () => {
  beforeEach(() => {
    mockElectronAPI.db.getMasterKeyVerify.mockResolvedValue(null)
  })

  it('TC-UI-008-01: API错误应显示友好错误信息', async () => {
    mockElectronAPI.crypto.createVerifyData.mockRejectedValue(new Error('Network error'))
    
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).password = 'validPassword'
    getVM(wrapper).confirmPassword = 'validPassword'
    
    await wrapper.find('form').trigger('submit.prevent')
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(getVM(wrapper).error).toBe('初始化失败，请重试')
    expect(wrapper.find('.error-box').exists()).toBe(true)
  })

  it('TC-UI-008-02: 输入时清除错误信息', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 设置错误
    getVM(wrapper).error = 'Previous error'
    
    // 输入触发清除
    const passwordInput = wrapper.findAll('.input')[0]
    await passwordInput.setValue('new input')
    
    expect(getVM(wrapper).error).toBe('')
  })

  it('TC-UI-008-03: 错误框显示正确的样式', async () => {
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    getVM(wrapper).error = 'Test error'
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.error-box').exists()).toBe(true)
    expect(wrapper.find('.error-icon').exists()).toBe(true)
  })
})

// ==================== TC-UI-009: 边界测试 ====================
describe('边界测试', () => {
  it('TC-UI-009-01: 极长密码输入', async () => {
    mockElectronAPI.db.getMasterKeyVerify.mockResolvedValue(null)
    
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const longPassword = 'A'.repeat(1000)
    getVM(wrapper).password = longPassword
    getVM(wrapper).confirmPassword = longPassword
    
    await wrapper.find('form').trigger('submit.prevent')
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 应正常处理
    expect(getVM(wrapper).error).toBe('')
  })

  it('TC-UI-009-02: 特殊字符密码', async () => {
    mockElectronAPI.db.getMasterKeyVerify.mockResolvedValue(null)
    
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const specialPassword = '密码测试!@#$%^&*()_+-=[]{}|;:,.<>?'
    getVM(wrapper).password = specialPassword
    getVM(wrapper).confirmPassword = specialPassword
    
    await wrapper.find('form').trigger('submit.prevent')
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(mockElectronAPI.crypto.createVerifyData).toHaveBeenCalledWith(specialPassword)
  })

  it('TC-UI-009-03: 初始化异常处理', async () => {
    mockElectronAPI.db.getMasterKeyVerify.mockRejectedValue(new Error('DB error'))
    
    const wrapper = mount(LockScreen, {
      global: { plugins: [createPinia()] },
    })
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 异常时应默认显示首次使用
    expect(getVM(wrapper).isFirstTime).toBe(true)
    expect(getVM(wrapper).loading).toBe(false)
  })
})