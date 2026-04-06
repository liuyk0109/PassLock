// @ts-nocheck
/**
 * Vitest 测试环境设置
 * 解决 @vue/test-utils 与 jsdom 兼容性问题
 */
import { vi } from 'vitest'

// 修复 Event 构造函数（jsdom 兼容性）
if (typeof window !== 'undefined') {
  // 修复 Event
  if (typeof window.Event !== 'function') {
    window.Event = function Event(type, eventInitDict) {
      const event = document.createEvent('Event')
      event.initEvent(type, eventInitDict?.bubbles ?? false, eventInitDict?.cancelable ?? false)
      return event
    }
  }
  
  // 修复 CustomEvent 支持
  if (typeof window.CustomEvent !== 'function') {
    window.CustomEvent = function CustomEvent(type, eventInitDict) {
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
  if (typeof window.InputEvent !== 'function') {
    window.InputEvent = function InputEvent(type, eventInitDict) {
      const event = document.createEvent('Event')
      event.initEvent(type, eventInitDict?.bubbles ?? false, eventInitDict?.cancelable ?? false)
      return event
    }
  }

  // 修复 KeyboardEvent
  if (typeof window.KeyboardEvent !== 'function') {
    window.KeyboardEvent = function KeyboardEvent(type, eventInitDict) {
      const event = document.createEvent('KeyboardEvent')
      event.initKeyboardEvent(
        type,
        eventInitDict?.bubbles ?? false,
        eventInitDict?.cancelable ?? false,
        window,
        eventInitDict?.key ?? '',
        0,
        false,
        false,
        false
      )
      return event
    }
  }

  // 修复 MouseEvent
  if (typeof window.MouseEvent !== 'function') {
    window.MouseEvent = function MouseEvent(type, eventInitDict) {
      const event = document.createEvent('MouseEvent')
      event.initMouseEvent(
        type,
        eventInitDict?.bubbles ?? false,
        eventInitDict?.cancelable ?? false,
        window,
        0,
        0, 0, 0, 0,
        false, false, false, false,
        0,
        null
      )
      return event
    }
  }

  // 修复 FocusEvent
  if (typeof window.FocusEvent !== 'function') {
    window.FocusEvent = function FocusEvent(type, eventInitDict) {
      const event = document.createEvent('Event')
      event.initEvent(type, eventInitDict?.bubbles ?? false, eventInitDict?.cancelable ?? false)
      return event
    }
  }

  // 修复 window.setTimeout
  if (typeof window.setTimeout !== 'function') {
    window.setTimeout = setTimeout
  }

  // 修复 window.clearTimeout
  if (typeof window.clearTimeout !== 'function') {
    window.clearTimeout = clearTimeout
  }

  // 修复 window.addEventListener
  if (typeof window.addEventListener !== 'function') {
    window.addEventListener = function(type, listener, options) {
      // 简单模拟
    }
    window.removeEventListener = function(type, listener, options) {
      // 简单模拟
    }
  }

  // 修复 crypto.randomUUID
  if (typeof window.crypto === 'undefined') {
    window.crypto = {
      randomUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0
          const v = c === 'x' ? r : (r & 0x3 | 0x8)
          return v.toString(16)
        })
      }
    }
  }
}

// 修复 SupportedEventInterface 问题 - @vue/test-utils 需要
// 为 global 添加 Event 相关构造函数
if (typeof globalThis !== 'undefined') {
  const win = globalThis as any
  if (win.Event && !win.SupportedEventInterface) {
    win.SupportedEventInterface = win.Event
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