/**
 * Vitest 测试环境设置
 * 解决 @vue/test-utils 与 jsdom 兼容性问题
 */
import { vi } from 'vitest'

// 设置全局 DOM 事件接口
if (typeof window !== 'undefined') {
  // @ts-ignore
  if (!window.Event) {
    // @ts-ignore
    window.Event = function Event(type: string, eventInitDict?: EventInit) {
      const event = document.createEvent('Event')
      event.initEvent(type, eventInitDict?.bubbles ?? false, eventInitDict?.cancelable ?? false)
      return event
    }
  }
  
  // 修复 CustomEvent 支持
  // @ts-ignore
  if (!window.CustomEvent) {
    // @ts-ignore
    window.CustomEvent = function CustomEvent(type: string, eventInitDict?: CustomEventInit) {
      const event = document.createEvent('CustomEvent')
      event.initCustomEvent(
        type,
        eventInitDict?.bubbles ?? false,
        eventInitDict?.cancelable ?? false,
        eventInitDict?.detail ?? null
      )
      return event
    }
  }
  
  // 修复 InputEvent 支持
  // @ts-ignore
  if (!window.InputEvent) {
    // @ts-ignore
    window.InputEvent = function InputEvent(type: string, eventInitDict?: InputEventInit) {
      const event = document.createEvent('Event')
      event.initEvent(type, eventInitDict?.bubbles ?? false, eventInitDict?.cancelable ?? false)
      return event
    }
  }
}

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})