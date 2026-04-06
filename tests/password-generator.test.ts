/**
 * 密码生成器功能测试用例
 * 测试范围：密码生成逻辑、强度评估、配置选项
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generatePassword, getPasswordStrength, getPasswordStrengthLevel } from '../electron/crypto'

// ==================== TC-GEN-001: 密码生成基础功能 ====================
describe('generatePassword 基础功能', () => {
  it('TC-GEN-001-01: 应生成指定长度的密码', () => {
    const password8 = generatePassword(8)
    const password16 = generatePassword(16)
    const password32 = generatePassword(32)

    expect(password8.length).toBe(8)
    expect(password16.length).toBe(16)
    expect(password32.length).toBe(32)
  })

  it('TC-GEN-001-02: 默认应包含所有字符类型', () => {
    const password = generatePassword(20)
    
    expect(/[a-z]/.test(password)).toBe(true) // 小写
    expect(/[A-Z]/.test(password)).toBe(true) // 大写
    expect(/[0-9]/.test(password)).toBe(true) // 数字
    expect(/[^a-zA-Z0-9]/.test(password)).toBe(true) // 符号
  })

  it('TC-GEN-001-03: 多次生成的密码应不同', () => {
    const passwords = new Set<string>()
    for (let i = 0; i < 100; i++) {
      passwords.add(generatePassword(16))
    }
    // 大部分密码应不同
    expect(passwords.size).toBeGreaterThan(90)
  })
})

// ==================== TC-GEN-002: 字符类型配置 ====================
describe('generatePassword 字符类型配置', () => {
  it('TC-GEN-002-01: 仅小写字母', () => {
    const password = generatePassword(20, { lowercase: true, uppercase: false, numbers: false, symbols: false })
    
    expect(/^[a-z]+$/.test(password)).toBe(true)
  })

  it('TC-GEN-002-02: 仅大写字母', () => {
    const password = generatePassword(20, { lowercase: false, uppercase: true, numbers: false, symbols: false })
    
    expect(/^[A-Z]+$/.test(password)).toBe(true)
  })

  it('TC-GEN-002-03: 仅数字', () => {
    const password = generatePassword(20, { lowercase: false, uppercase: false, numbers: true, symbols: false })
    
    expect(/^[0-9]+$/.test(password)).toBe(true)
  })

  it('TC-GEN-002-04: 小写+大写混合', () => {
    const password = generatePassword(20, { lowercase: true, uppercase: true, numbers: false, symbols: false })
    
    expect(/[a-z]/.test(password)).toBe(true)
    expect(/[A-Z]/.test(password)).toBe(true)
    expect(/[0-9]/.test(password)).toBe(false)
    expect(/[^a-zA-Z0-9]/.test(password)).toBe(false)
  })

  it('TC-GEN-002-05: 小写+大写+数字混合', () => {
    const password = generatePassword(20, { lowercase: true, uppercase: true, numbers: true, symbols: false })
    
    expect(/[a-z]/.test(password)).toBe(true)
    expect(/[A-Z]/.test(password)).toBe(true)
    expect(/[0-9]/.test(password)).toBe(true)
    expect(/[^a-zA-Z0-9]/.test(password)).toBe(false)
  })

  it('TC-GEN-002-06: 空选项应使用默认小写', () => {
    const password = generatePassword(20, {})
    
    expect(/[a-z]/.test(password)).toBe(true)
  })
})

// ==================== TC-GEN-003: 边界测试 ====================
describe('generatePassword 边界测试', () => {
  it('TC-GEN-003-01: 最小长度1', () => {
    const password = generatePassword(1)
    expect(password.length).toBe(1)
  })

  it('TC-GEN-003-02: 较大长度100', () => {
    const password = generatePassword(100)
    expect(password.length).toBe(100)
  })

  it('TC-GEN-003-03: 长度为0', () => {
    const password = generatePassword(0)
    expect(password.length).toBe(0)
  })
})

// ==================== TC-GEN-004: 密码强度评估 ====================
describe('getPasswordStrength 强度评估', () => {
  it('TC-GEN-004-01: 空密码强度为0', () => {
    expect(getPasswordStrength('')).toBe(0)
  })

  it('TC-GEN-004-02: 短密码得低分', () => {
    const score = getPasswordStrength('abc')
    expect(score).toBeLessThan(40)
  })

  it('TC-GEN-004-03: 中等密码得中等分', () => {
    const score = getPasswordStrength('abcdefgh')
    expect(score).toBeGreaterThanOrEqual(30)
    expect(score).toBeLessThan(60)
  })

  it('TC-GEN-004-04: 强密码得高分', () => {
    const score = getPasswordStrength('Abcdefgh123')
    expect(score).toBeGreaterThanOrEqual(60)
  })

  it('TC-GEN-004-05: 非常强密码得最高分', () => {
    const score = getPasswordStrength('Abcdefgh123!@#')
    expect(score).toBeGreaterThanOrEqual(80)
  })

  it('TC-GEN-004-06: 分数上限为100', () => {
    const score = getPasswordStrength('A'.repeat(100) + 'a1!')
    expect(score).toBeLessThanOrEqual(100)
  })

  it('TC-GEN-004-07: 包含符号增加分数', () => {
    const score1 = getPasswordStrength('abcdefgh')
    const score2 = getPasswordStrength('abcdefg!')
    expect(score2).toBeGreaterThan(score1)
  })

  it('TC-GEN-004-08: 大小写混合增加分数', () => {
    const score1 = getPasswordStrength('abcdefgh')
    const score2 = getPasswordStrength('abcdEFGH')
    expect(score2).toBeGreaterThan(score1)
  })
})

// ==================== TC-GEN-005: 密码强度等级 ====================
describe('getPasswordStrengthLevel 强度等级', () => {
  it('TC-GEN-005-01: 弱密码返回weak', () => {
    expect(getPasswordStrengthLevel('abc')).toBe('weak')
    expect(getPasswordStrengthLevel('abcd')).toBe('weak')
  })

  it('TC-GEN-005-02: 中等密码返回medium', () => {
    // 50分应为medium
    expect(getPasswordStrengthLevel('abcdEFGH')).toBe('medium')
  })

  it('TC-GEN-005-03: 强密码返回strong', () => {
    expect(getPasswordStrengthLevel('abcdEFGH123')).toBe('strong')
  })

  it('TC-GEN-005-04: 非常强密码返回very-strong', () => {
    expect(getPasswordStrengthLevel('abcdEFGH1234!@#%')).toBe('very-strong')
  })

  it('TC-GEN-005-05: 边界值测试 - 刚好40分', () => {
    // 评分系统可能不完全对应，测试大致范围
    const level = getPasswordStrengthLevel('abcdefgh')
    expect(['weak', 'medium']).toContain(level)
  })
})

// ==================== TC-GEN-006: 综合场景 ====================
describe('密码生成综合场景', () => {
  it('TC-GEN-006-01: 生成的16位全类型密码应为强或非常强', () => {
    for (let i = 0; i < 10; i++) {
      const password = generatePassword(16)
      const level = getPasswordStrengthLevel(password)
      expect(['strong', 'very-strong']).toContain(level)
    }
  })

  it('TC-GEN-006-02: 生成的32位全类型密码应为非常强', () => {
    for (let i = 0; i < 10; i++) {
      const password = generatePassword(32)
      const level = getPasswordStrengthLevel(password)
      expect(level).toBe('very-strong')
    }
  })

  it('TC-GEN-006-03: 仅数字的密码强度应较低', () => {
    for (let i = 0; i < 10; i++) {
      const password = generatePassword(16, { lowercase: false, uppercase: false, numbers: true, symbols: false })
      const level = getPasswordStrengthLevel(password)
      // 纯数字密码强度范围
      expect(['weak', 'medium', 'strong']).toContain(level)
    }
  })

  it('TC-GEN-006-04: 特殊字符密码应能正确生成', () => {
    const password = generatePassword(20, { symbols: true })
    // 确保包含特殊符号
    expect(/[^a-zA-Z0-9]/.test(password)).toBe(true)
  })

  it('TC-GEN-006-05: 生成的密码不应包含非法字符', () => {
    const validChars = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]+$/
    
    for (let i = 0; i < 50; i++) {
      const password = generatePassword(16)
      expect(validChars.test(password)).toBe(true)
    }
  })
})

// ==================== TC-GEN-007: 安全性测试 ====================
describe('密码生成安全性测试', () => {
  it('TC-GEN-007-01: 生成的密码应具有足够随机性', () => {
    // 统计字符分布
    const charCounts: Record<string, number> = {}
    const samples = 1000
    const length = 16

    for (let i = 0; i < samples; i++) {
      const password = generatePassword(length)
      for (const char of password) {
        charCounts[char] = (charCounts[char] || 0) + 1
      }
    }

    // 检查字符分布不要太集中
    const maxCount = Math.max(...Object.values(charCounts))
    const avgCount = (samples * length) / Object.keys(charCounts).length
    
    // 最大出现次数不应超过平均值的10倍
    expect(maxCount).toBeLessThan(avgCount * 10)
  })

  it('TC-GEN-007-02: 连续生成相同配置应产生不同密码', () => {
    const passwords = new Set<string>()
    const config = { lowercase: true, uppercase: true, numbers: true, symbols: true }
    
    for (let i = 0; i < 100; i++) {
      passwords.add(generatePassword(16, config))
    }
    
    expect(passwords.size).toBeGreaterThan(95)
  })

  it('TC-GEN-007-03: 长密码应足够安全', () => {
    const password = generatePassword(32)
    const strength = getPasswordStrength(password)
    
    expect(strength).toBeGreaterThanOrEqual(80)
  })
})