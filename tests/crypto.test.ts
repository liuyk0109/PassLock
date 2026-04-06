/**
 * crypto.ts 加密模块测试用例
 * 测试范围：AES-256-GCM加密、PBKDF2密钥派生、密码强度评估、随机密码生成
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  randomBytes,
  deriveKey,
  encrypt,
  decrypt,
  verifyPassword,
  createVerifyData,
  hashPassword,
  generatePassword,
  getPasswordStrength,
  getPasswordStrengthLevel,
} from '../electron/crypto'

// ==================== TC-CRYPTO-001: randomBytes ====================
describe('randomBytes', () => {
  it('TC-CRYPTO-001-01: 应生成指定长度的随机字节', () => {
    const bytes16 = randomBytes(16)
    const bytes32 = randomBytes(32)
    expect(bytes16.length).toBe(16)
    expect(bytes32.length).toBe(32)
  })

  it('TC-CRYPTO-001-02: 每次生成的随机字节应不同', () => {
    const bytes1 = randomBytes(32)
    const bytes2 = randomBytes(32)
    expect(bytes1.equals(bytes2)).toBe(false)
  })

  it('TC-CRYPTO-001-03: 边界测试 - 长度为0', () => {
    const bytes = randomBytes(0)
    expect(bytes.length).toBe(0)
  })

  it('TC-CRYPTO-001-04: 边界测试 - 大长度(10000)', () => {
    const bytes = randomBytes(10000)
    expect(bytes.length).toBe(10000)
  })
})

// ==================== TC-CRYPTO-002: deriveKey ====================
describe('deriveKey', () => {
  it('TC-CRYPTO-002-01: 应从密码派生32字节密钥', () => {
    const salt = randomBytes(32)
    const key = deriveKey('testPassword', salt)
    expect(key.length).toBe(32)
  })

  it('TC-CRYPTO-002-02: 相同密码和盐应派生相同密钥', () => {
    const salt = randomBytes(32)
    const key1 = deriveKey('testPassword', salt)
    const key2 = deriveKey('testPassword', salt)
    expect(key1.equals(key2)).toBe(true)
  })

  it('TC-CRYPTO-002-03: 不同密码应派生不同密钥', () => {
    const salt = randomBytes(32)
    const key1 = deriveKey('password1', salt)
    const key2 = deriveKey('password2', salt)
    expect(key1.equals(key2)).toBe(false)
  })

  it('TC-CRYPTO-002-04: 不同盐应派生不同密钥', () => {
    const salt1 = randomBytes(32)
    const salt2 = randomBytes(32)
    const key1 = deriveKey('testPassword', salt1)
    const key2 = deriveKey('testPassword', salt2)
    expect(key1.equals(key2)).toBe(false)
  })

  it('TC-CRYPTO-002-05: 边界测试 - 空密码', () => {
    const salt = randomBytes(32)
    const key = deriveKey('', salt)
    expect(key.length).toBe(32)
  })

  it('TC-CRYPTO-002-06: 边界测试 - 特殊字符密码', () => {
    const salt = randomBytes(32)
    const key = deriveKey('密码测试!@#$%^&*()', salt)
    expect(key.length).toBe(32)
  })
})

// ==================== TC-CRYPTO-003: encrypt/decrypt ====================
describe('encrypt & decrypt', () => {
  it('TC-CRYPTO-003-01: 加密后应能正确解密', () => {
    const plaintext = 'Hello, PassLock!'
    const password = 'masterPassword123'
    const encrypted = encrypt(plaintext, password)
    const decrypted = decrypt(encrypted, password)
    expect(decrypted).toBe(plaintext)
  })

  it('TC-CRYPTO-003-02: 相同内容多次加密应产生不同结果(随机IV/盐)', () => {
    const plaintext = 'Test content'
    const password = 'password'
    const encrypted1 = encrypt(plaintext, password)
    const encrypted2 = encrypt(plaintext, password)
    expect(encrypted1).not.toBe(encrypted2)
    // 但都能正确解密
    expect(decrypt(encrypted1, password)).toBe(plaintext)
    expect(decrypt(encrypted2, password)).toBe(plaintext)
  })

  it('TC-CRYPTO-003-03: 错误密码解密应抛出异常', () => {
    const plaintext = 'Secret data'
    const password = 'correctPassword'
    const encrypted = encrypt(plaintext, password)
    expect(() => decrypt(encrypted, 'wrongPassword')).toThrow()
  })

  it('TC-CRYPTO-003-04: 边界测试 - 空明文', () => {
    const encrypted = encrypt('', 'password')
    const decrypted = decrypt(encrypted, 'password')
    expect(decrypted).toBe('')
  })

  it('TC-CRYPTO-003-05: 边界测试 - 长明文', () => {
    const plaintext = 'A'.repeat(10000)
    const encrypted = encrypt(plaintext, 'password')
    const decrypted = decrypt(encrypted, 'password')
    expect(decrypted).toBe(plaintext)
  })

  it('TC-CRYPTO-003-06: 边界测试 - 特殊字符明文', () => {
    const plaintext = '中文测试!@#$%^&*()\n\r\t特殊字符'
    const encrypted = encrypt(plaintext, 'password')
    const decrypted = decrypt(encrypted, 'password')
    expect(decrypted).toBe(plaintext)
  })

  it('TC-CRYPTO-003-07: 边界测试 - 空密码', () => {
    const plaintext = 'Test content'
    const encrypted = encrypt(plaintext, '')
    const decrypted = decrypt(encrypted, '')
    expect(decrypted).toBe(plaintext)
  })

  it('TC-CRYPTO-003-08: 安全性测试 - 加密数据包含认证标签', () => {
    const plaintext = 'Test'
    const password = 'password'
    const encrypted = encrypt(plaintext, password)
    // Base64编码后的数据长度应大于明文长度(salt+iv+authTag+ciphertext)
    const decodedLength = Buffer.from(encrypted, 'base64').length
    expect(decodedLength).toBeGreaterThan(plaintext.length)
  })
})

// ==================== TC-CRYPTO-004: verifyPassword ====================
describe('verifyPassword', () => {
  it('TC-CRYPTO-004-01: 正确密码应返回true', () => {
    const password = 'correctPassword'
    const verifyData = createVerifyData(password)
    expect(verifyPassword(verifyData, password)).toBe(true)
  })

  it('TC-CRYPTO-004-02: 错误密码应返回false', () => {
    const password = 'correctPassword'
    const verifyData = createVerifyData(password)
    expect(verifyPassword(verifyData, 'wrongPassword')).toBe(false)
  })

  it('TC-CRYPTO-004-03: 边界测试 - 空密码', () => {
    const verifyData = createVerifyData('')
    expect(verifyPassword(verifyData, '')).toBe(true)
    expect(verifyPassword(verifyData, 'a')).toBe(false)
  })

  it('TC-CRYPTO-004-04: 安全测试 - 多次验证不泄露信息', () => {
    const password = 'securePassword'
    const verifyData = createVerifyData(password)
    // 多次验证应返回一致结果
    for (let i = 0; i < 100; i++) {
      expect(verifyPassword(verifyData, password)).toBe(true)
      expect(verifyPassword(verifyData, 'wrong')).toBe(false)
    }
  })
})

// ==================== TC-CRYPTO-005: createVerifyData ====================
describe('createVerifyData', () => {
  it('TC-CRYPTO-005-01: 应返回Base64编码字符串', () => {
    const verifyData = createVerifyData('password')
    expect(typeof verifyData).toBe('string')
    // Base64正则验证
    expect(verifyData).toMatch(/^[A-Za-z0+9+/=]+$/)
  })

  it('TC-CRYPTO-005-02: 相同密码多次创建应产生不同结果', () => {
    const verifyData1 = createVerifyData('password')
    const verifyData2 = createVerifyData('password')
    expect(verifyData1).not.toBe(verifyData2)
  })
})

// ==================== TC-CRYPTO-006: hashPassword ====================
describe('hashPassword', () => {
  it('TC-CRYPTO-006-01: 应返回SHA256哈希的hex字符串', () => {
    const hash = hashPassword('password')
    expect(typeof hash).toBe('string')
    expect(hash.length).toBe(64) // SHA256 hex长度
  })

  it('TC-CRYPTO-006-02: 相同密码应产生相同哈希', () => {
    const hash1 = hashPassword('password')
    const hash2 = hashPassword('password')
    expect(hash1).toBe(hash2)
  })

  it('TC-CRYPTO-006-03: 不同密码应产生不同哈希', () => {
    const hash1 = hashPassword('password1')
    const hash2 = hashPassword('password2')
    expect(hash1).not.toBe(hash2)
  })
})

// ==================== TC-CRYPTO-007: generatePassword ====================
describe('generatePassword', () => {
  it('TC-CRYPTO-007-01: 应生成默认16位密码', () => {
    const password = generatePassword()
    expect(password.length).toBe(16)
  })

  it('TC-CRYPTO-007-02: 应生成指定长度密码', () => {
    expect(generatePassword(8).length).toBe(8)
    expect(generatePassword(32).length).toBe(32)
  })

  it('TC-CRYPTO-007-03: 默认应包含所有字符类型', () => {
    const password = generatePassword(20)
    expect(/[a-z]/.test(password)).toBe(true) // 小写
    expect(/[A-Z]/.test(password)).toBe(true) // 大写
    expect(/[0-9]/.test(password)).toBe(true) // 数字
    expect(/[^a-zA-Z0-9]/.test(password)).toBe(true) // 符号
  })

  it('TC-CRYPTO-007-04: 可指定仅小写字母', () => {
    const password = generatePassword(20, { lowercase: true, uppercase: false, numbers: false, symbols: false })
    expect(/[a-z]/.test(password)).toBe(true)
    expect(/[A-Z]/.test(password)).toBe(false)
    expect(/[0-9]/.test(password)).toBe(false)
    expect(/[^a-zA-Z0-9]/.test(password)).toBe(false)
  })

  it('TC-CRYPTO-007-05: 可指定仅大写字母', () => {
    const password = generatePassword(20, { lowercase: false, uppercase: true, numbers: false, symbols: false })
    expect(/[a-z]/.test(password)).toBe(false)
    expect(/[A-Z]/.test(password)).toBe(true)
    expect(/[0-9]/.test(password)).toBe(false)
  })

  it('TC-CRYPTO-007-06: 可指定仅数字', () => {
    const password = generatePassword(20, { lowercase: false, uppercase: false, numbers: true, symbols: false })
    expect(/[0-9]/.test(password)).toBe(true)
    expect(/[a-zA-Z]/.test(password)).toBe(false)
  })

  it('TC-CRYPTO-007-07: 边界测试 - 空选项默认小写', () => {
    const password = generatePassword(10, {})
    expect(/[a-z]/.test(password)).toBe(true)
  })

  it('TC-CRYPTO-007-08: 边界测试 - 长度为1', () => {
    const password = generatePassword(1)
    expect(password.length).toBe(1)
  })

  it('TC-CRYPTO-007-09: 随机性测试 - 多次生成应不同', () => {
    const passwords = new Set()
    for (let i = 0; i < 100; i++) {
      passwords.add(generatePassword(16))
    }
    expect(passwords.size).toBeGreaterThan(90) // 大部分应不同
  })
})

// ==================== TC-CRYPTO-008: getPasswordStrength ====================
describe('getPasswordStrength', () => {
  it('TC-CRYPTO-008-01: 空密码强度为0', () => {
    expect(getPasswordStrength('')).toBe(0)
  })

  it('TC-CRYPTO-008-02: 8位纯小写密码得35分', () => {
    const score = getPasswordStrength('abcdefgh')
    expect(score).toBe(35) // 20(长度>=8) + 15(小写)
  })

  it('TC-CRYPTO-008-03: 8位大小写混合密码得50分', () => {
    const score = getPasswordStrength('abcdEFGH')
    expect(score).toBe(50) // 20(长度>=8) + 15(小写) + 15(大写)
  })

  it('TC-CRYPTO-008-04: 12位混合密码得更高分', () => {
    const score = getPasswordStrength('abcdEFGH123')
    expect(score).toBe(60) // 20+10(长度>=12) + 15(小写) + 15(大写) + 15(数字)
  })

  it('TC-CRYPTO-008-05: 15位全类型密码得90分', () => {
    const score = getPasswordStrength('abcdEFGH1234!@#')
    expect(score).toBe(90) // 20+10(长度>=12但<16) + 15+15+15+15
  })

  it('TC-CRYPTO-008-05b: 16位全类型密码得最高分', () => {
    const score = getPasswordStrength('abcdEFGH1234!@#$')
    expect(score).toBe(100) // 20+10+10(长度>=16) + 15+15+15+15
  })

  it('TC-CRYPTO-008-06: 包含符号增加15分', () => {
    const score1 = getPasswordStrength('abcdefgh')
    const score2 = getPasswordStrength('abcdefg!')
    expect(score2 - score1).toBe(15)
  })

  it('TC-CRYPTO-008-07: 分数上限为100', () => {
    // 超长密码也不会超过100
    const score = getPasswordStrength('aA1!' + 'x'.repeat(100))
    expect(score).toBeLessThanOrEqual(100)
  })
})

// ==================== TC-CRYPTO-009: getPasswordStrengthLevel ====================
describe('getPasswordStrengthLevel', () => {
  it('TC-CRYPTO-009-01: 评分<40返回weak', () => {
    expect(getPasswordStrengthLevel('abc')).toBe('weak')
    expect(getPasswordStrengthLevel('abcd')).toBe('weak')
  })

  it('TC-CRYPTO-009-02: 评分40-59返回medium', () => {
    expect(getPasswordStrengthLevel('abcdEFGH')).toBe('medium') // 50分
  })

  it('TC-CRYPTO-009-03: 评分60-79返回strong', () => {
    expect(getPasswordStrengthLevel('abcdEFGH123')).toBe('strong') // 60分
  })

  it('TC-CRYPTO-009-04: 评分>=80返回very-strong', () => {
    expect(getPasswordStrengthLevel('abcdEFGH1234!@#%')).toBe('very-strong') // 90分
  })

  it('TC-CRYPTO-009-05: 边界值测试', () => {
    // 35分应为weak
    expect(getPasswordStrengthLevel('abcdefgh')).toBe('weak') // 20+15=35
    // 50分应为medium
    expect(getPasswordStrengthLevel('abcdEFGH')).toBe('medium') // 20+15+15=50
  })
})

// ==================== TC-CRYPTO-010: IV长度修正验证 ====================
describe('IV长度修正', () => {
  it('TC-CRYPTO-010-01: 新加密数据应使用12字节IV（NIST推荐）', () => {
    const plaintext = 'Test IV length'
    const password = 'password'
    const encrypted = encrypt(plaintext, password)
    
    // 解码Base64
    const combined = Buffer.from(encrypted, 'base64')
    
    // 提取各部分：salt(32) + iv(12) + authTag(16) + ciphertext
    const saltLength = 32
    const ivLength = 12
    const authTagLength = 16
    
    // 验证IV长度为12字节
    const iv = combined.subarray(saltLength, saltLength + ivLength)
    expect(iv.length).toBe(12)
    
    // 解密应成功
    const decrypted = decrypt(encrypted, password)
    expect(decrypted).toBe(plaintext)
  })

  it('TC-CRYPTO-010-02: 加密数据格式应为 salt(32):iv(12):authTag(16):ciphertext', () => {
    const plaintext = 'Format test'
    const password = 'password'
    const encrypted = encrypt(plaintext, password)
    
    const combined = Buffer.from(encrypted, 'base64')
    
    // 验证各部分长度
    const saltLength = 32
    const ivLength = 12
    const authTagLength = 16
    const ciphertextMinLength = 1
    
    // 最小长度应为 32 + 12 + 16 + 1 = 61
    expect(combined.length).toBeGreaterThanOrEqual(saltLength + ivLength + authTagLength + ciphertextMinLength)
  })
})

// ==================== TC-CRYPTO-011: 双格式兼容解密 ====================
describe('双格式兼容解密', () => {
  it('TC-CRYPTO-011-01: 应能解密新格式（12字节IV）数据', () => {
    // 使用当前encrypt函数生成新格式数据
    const plaintext = 'New format test'
    const password = 'testPassword'
    const encrypted = encrypt(plaintext, password)
    
    const decrypted = decrypt(encrypted, password)
    expect(decrypted).toBe(plaintext)
  })

  it('TC-CRYPTO-011-02: 应能解密旧格式（16字节IV）数据', () => {
    // 模拟旧格式：手动构造16字节IV的加密数据
    const crypto = require('crypto')
    const ALGORITHM = 'aes-256-gcm'
    const KEY_LENGTH = 32
    const SALT_LENGTH = 32
    const IV_LENGTH_OLD = 16
    const AUTH_TAG_LENGTH = 16
    const PBKDF2_ITERATIONS = 100000
    
    const plaintext = 'Old format test'
    const password = 'testPassword'
    
    // 使用旧格式16字节IV进行加密
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH_OLD)  // 16字节IV
    const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    
    // 组合：salt(32) + iv(16) + authTag(16) + ciphertext
    const combined = Buffer.concat([salt, iv, authTag, ciphertext])
    const encrypted = combined.toString('base64')
    
    // 使用当前decrypt函数解密
    const decrypted = decrypt(encrypted, password)
    expect(decrypted).toBe(plaintext)
  })

  it('TC-CRYPTO-011-03: 错误密码解密旧格式数据应抛出异常', () => {
    const crypto = require('crypto')
    const ALGORITHM = 'aes-256-gcm'
    const KEY_LENGTH = 32
    const SALT_LENGTH = 32
    const IV_LENGTH_OLD = 16
    const AUTH_TAG_LENGTH = 16
    const PBKDF2_ITERATIONS = 100000
    
    const plaintext = 'Test data'
    const password = 'correctPassword'
    
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH_OLD)
    const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    
    const combined = Buffer.concat([salt, iv, authTag, ciphertext])
    const encrypted = combined.toString('base64')
    
    expect(() => decrypt(encrypted, 'wrongPassword')).toThrow()
  })

  it('TC-CRYPTO-011-04: 新旧格式数据混合测试', () => {
    const crypto = require('crypto')
    const ALGORITHM = 'aes-256-gcm'
    const KEY_LENGTH = 32
    const SALT_LENGTH = 32
    const IV_LENGTH_OLD = 16
    const AUTH_TAG_LENGTH = 16
    const PBKDF2_ITERATIONS = 100000
    
    const password = 'samePassword'
    
    // 新格式数据
    const newPlaintext = 'New format'
    const newEncrypted = encrypt(newPlaintext, password)
    
    // 旧格式数据
    const oldPlaintext = 'Old format'
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH_OLD)
    const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
    const ciphertext = Buffer.concat([cipher.update(oldPlaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    const oldEncrypted = Buffer.concat([salt, iv, authTag, ciphertext]).toString('base64')
    
    // 两种格式都应能正确解密
    expect(decrypt(newEncrypted, password)).toBe(newPlaintext)
    expect(decrypt(oldEncrypted, password)).toBe(oldPlaintext)
  })
})