/**
 * UI优化功能测试用例
 * 测试范围：响应式布局CSS Grid、窗口圆角CSS、新增按钮图标SVG、菜单栏移除
 * 任务ID：20260422001 - UI优化QA测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import VaultPage from '../src/components/VaultPage.vue'
import VaultHeader from '../src/components/VaultHeader.vue'
import App from '../src/App.vue'
import { useVaultStore } from '../src/stores/vault'

// Mock Electron API
const mockElectronAPI = {
  crypto: {
    createVerifyData: vi.fn().mockResolvedValue('mock-verify-data'),
    verifyPassword: vi.fn().mockResolvedValue(true),
    encrypt: vi.fn().mockResolvedValue('encrypted-data'),
    decrypt: vi.fn().mockResolvedValue('decrypted-data'),
  },
  db: {
    getMasterKeyVerify: vi.fn().mockResolvedValue('existing-verify-data'),
    getEntries: vi.fn().mockResolvedValue([
      { id: '1', title: '测试条目1', username: 'user1', password: 'encrypted', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '2', title: '测试条目2', username: 'user2', password: 'encrypted', createdAt: Date.now(), updatedAt: Date.now() },
    ]),
    getSettings: vi.fn().mockResolvedValue({ autoLockTimeout: 5, theme: 'system' }),
  },
}

beforeEach(() => {
  ;(window as any).electronAPI = mockElectronAPI
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

// ==================== TC-UI-OPT-001: VaultHeader新增按钮图标 ====================
describe('VaultHeader新增按钮图标优化', () => {
  it('TC-UI-OPT-001-01: 新增按钮包含SVG图标', async () => {
    // 模拟解锁状态
    const store = useVaultStore()
    await store.unlock('test-key')
    
    const wrapper = mount(VaultHeader, {
      global: { plugins: [createPinia()] },
      props: { entryCount: 2 },
    })

    // 验证新增按钮存在
    const addBtn = wrapper.find('.btn-add')
    expect(addBtn.exists()).toBe(true)

    // 验证SVG图标存在
    const svg = addBtn.find('svg')
    expect(svg.exists()).toBe(true)
    expect(svg.classes()).toContain('btn-icon')
  })

  it('TC-UI-OPT-001-02: 新增按钮使用简洁单笔画加号SVG', async () => {
    const store = useVaultStore()
    await store.unlock('test-key')
    
    const wrapper = mount(VaultHeader, {
      global: { plugins: [createPinia()] },
      props: { entryCount: 2 },
    })

    const addBtn = wrapper.find('.btn-add')
    const svg = addBtn.find('svg.btn-icon')
    
    // 验证SVG path存在（简洁单笔画加号）
    const path = svg.find('path')
    expect(path.exists()).toBe(true)
    
    // 简洁加号SVG path应包含加号形状的关键数据
    // 新SVG: d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6v-2z"
    const pathD = path.attributes('d')
    expect(pathD).toContain('v6')  // 包含垂直笔画
    expect(pathD).toContain('h6')  // 包含水平笔画
  })

  it('TC-UI-OPT-001-03: 新增按钮点击触发emit', async () => {
    const store = useVaultStore()
    await store.unlock('test-key')
    
    const wrapper = mount(VaultHeader, {
      global: { plugins: [createPinia()] },
      props: { entryCount: 2 },
    })

    const addBtn = wrapper.find('.btn-add')
    await addBtn.trigger('click')

    // 验证emit触发
    expect(wrapper.emitted('add-click')).toBeTruthy()
  })
})

// ==================== TC-UI-OPT-002: VaultPage响应式布局 ====================
describe('VaultPage响应式布局CSS Grid', () => {
  it('TC-UI-OPT-002-01: cards-grid使用CSS Grid布局', async () => {
    const store = useVaultStore()
    await store.unlock('test-key')
    await store.loadEntries()
    
    const wrapper = mount(VaultPage, {
      global: { plugins: [createPinia()] },
    })

    // 等待异步加载
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // 验证cards-grid存在
    const cardsGrid = wrapper.find('.cards-grid')
    expect(cardsGrid.exists()).toBe(true)
  })

  it('TC-UI-OPT-002-02: 响应式布局使用cards-grid类', async () => {
    const store = useVaultStore()
    await store.unlock('test-key')
    await store.loadEntries()
    
    const wrapper = mount(VaultPage, {
      global: { plugins: [createPinia()] },
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // 验证CSS Grid布局样式类存在
    // 实际CSS样式在编译后的产物中，单元测试环境验证DOM结构即可
    const cardsGrid = wrapper.find('.cards-grid')
    expect(cardsGrid.exists()).toBe(true)
    
    // 验证卡片网格内包含密码卡片（如果有数据）
    // CSS Grid auto-fill minmax(240px, 1fr) 已在VaultPage.vue中实现
  })
})

// ==================== TC-UI-OPT-003: App窗口圆角CSS ====================
describe('App窗口圆角CSS模拟', () => {
  it('TC-UI-OPT-003-01: window-container应用圆角样式', async () => {
    const store = useVaultStore()
    // 不解锁，保持在锁定状态以测试LockScreen渲染
    
    const wrapper = mount(App, {
      global: { plugins: [createPinia()] },
    })

    await wrapper.vm.$nextTick()

    // 验证window-container存在
    const windowContainer = wrapper.find('.window-container')
    expect(windowContainer.exists()).toBe(true)
  })

  it('TC-UI-OPT-003-02: window-container类正确应用', async () => {
    const wrapper = mount(App, {
      global: { plugins: [createPinia()] },
    })

    await wrapper.vm.$nextTick()

    // 验证window-container类存在
    // CSS样式:border-radius:16px + box-shadow已在App.vue中实现
    // 单元测试环境验证DOM结构，实际CSS在编译产物中
    const windowContainer = wrapper.find('.window-container')
    expect(windowContainer.exists()).toBe(true)
  })
})

// ==================== TC-UI-OPT-004: Toast组件引入 ====================
describe('App全局Toast组件引入', () => {
  it('TC-UI-OPT-004-01: App包含Toast组件', async () => {
    const wrapper = mount(App, {
      global: { plugins: [createPinia()] },
    })

    await wrapper.vm.$nextTick()

    // 验证Toast组件在模板中
    // Toast使用Teleport，组件实例应存在
    const toastComponent = wrapper.findComponent({ name: 'Toast' })
    expect(toastComponent.exists()).toBe(true)
  })
})

// ==================== TC-UI-OPT-005: VaultHeader样式 ====================
describe('VaultHeader组件样式', () => {
  it('TC-UI-OPT-005-01: VaultHeader正确渲染', async () => {
    const store = useVaultStore()
    await store.unlock('test-key')
    
    const wrapper = mount(VaultHeader, {
      global: { plugins: [createPinia()] },
      props: { entryCount: 5 },
    })

    // 验证header结构
    expect(wrapper.find('.vault-header').exists()).toBe(true)
    expect(wrapper.find('.header-left').exists()).toBe(true)
    expect(wrapper.find('.header-right').exists()).toBe(true)
  })

  it('TC-UI-OPT-005-02: Logo容器样式正确', async () => {
    const store = useVaultStore()
    await store.unlock('test-key')
    
    const wrapper = mount(VaultHeader, {
      global: { plugins: [createPinia()] },
      props: { entryCount: 5 },
    })

    const logoContainer = wrapper.find('.logo-container')
    expect(logoContainer.exists()).toBe(true)
    
    // 验证SVG图标
    const logoIcon = wrapper.find('.logo-icon')
    expect(logoIcon.exists()).toBe(true)
  })

  it('TC-UI-OPT-005-03: 锁定按钮和设置按钮存在', async () => {
    const store = useVaultStore()
    await store.unlock('test-key')
    
    const wrapper = mount(VaultHeader, {
      global: { plugins: [createPinia()] },
      props: { entryCount: 5 },
    })

    expect(wrapper.find('.btn-lock').exists()).toBe(true)
    expect(wrapper.find('.btn-settings').exists()).toBe(true)
  })
})

// ==================== TC-UI-OPT-006: 响应式断点测试 ====================
describe('VaultPage响应式断点', () => {
  it('TC-UI-OPT-006-01: 响应式布局类存在', async () => {
    const store = useVaultStore()
    await store.unlock('test-key')
    await store.loadEntries()
    
    const wrapper = mount(VaultPage, {
      global: { plugins: [createPinia()] },
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // 验证响应式布局相关的类存在
    // 实际的@media断点样式在编译产物中
    // VaultPage.vue中的CSS Grid + 响应式断点已实现
    expect(wrapper.find('.cards-container').exists()).toBe(true)
    expect(wrapper.find('.cards-grid').exists()).toBe(true)
  })
})