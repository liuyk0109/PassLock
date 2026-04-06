import {
  randomFillSync,
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  createHash,
} from 'crypto'

// 加密算法配置
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 12 // 96 bits (NIST SP 800-38D 推荐)
const IV_LENGTH_OLD = 16 // 旧格式兼容 (128 bits)
const SALT_LENGTH = 32
const AUTH_TAG_LENGTH = 16
const PBKDF2_ITERATIONS = 100000

/**
 * 生成随机字节
 */
export function randomBytes(length: number): Buffer {
  const buffer = Buffer.alloc(length)
  randomFillSync(buffer)
  return buffer
}

/**
 * 从密码派生密钥 (PBKDF2)
 */
export function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
}

/**
 * 加密数据
 * @param plaintext 明文
 * @param password 密码
 * @returns Base64 编码的加密数据 (salt:iv:authTag:ciphertext)
 */
export function encrypt(plaintext: string, password: string): string {
  // 生成随机盐和 IV
  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)

  // 派生密钥
  const key = deriveKey(password, salt)

  // 创建加密器
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  // 加密
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  // 获取认证标签
  const authTag = cipher.getAuthTag()

  // 组合: salt:iv:authTag:ciphertext
  const combined = Buffer.concat([salt, iv, authTag, ciphertext])

  return combined.toString('base64')
}

/**
 * 解密数据（兼容双格式 IV）
 * @param encryptedData Base64 编码的加密数据
 * @param password 密码
 * @returns 解密后的明文
 */
export function decrypt(encryptedData: string, password: string): string {
  // 解码 Base64
  const combined = Buffer.from(encryptedData, 'base64')

  // 提取各部分
  let offset = 0
  const salt = combined.subarray(offset, offset + SALT_LENGTH)
  offset += SALT_LENGTH

  // 自动检测 IV 长度：新格式12字节，旧格式16字节
  // 通过计算剩余数据长度来推断 IV 长度
  const remainingAfterSalt = combined.length - SALT_LENGTH
  // 剩余数据 = IV + authTag + ciphertext
  // 最小密文长度为1，所以剩余至少为 IV_LENGTH + AUTH_TAG_LENGTH + 1
  // 尝试两种 IV 长度进行解密
  let iv: Buffer
  let ciphertext: Buffer
  let authTag: Buffer

  // 检测 IV 长度：尝试先使用新格式12字节
  // 如果解密失败，再尝试旧格式16字节
  const ivLengthNew = IV_LENGTH
  const ivLengthOld = IV_LENGTH_OLD

  // 计算两种可能的密文长度
  const possibleCiphertextLengthNew = remainingAfterSalt - ivLengthNew - AUTH_TAG_LENGTH
  const possibleCiphertextLengthOld = remainingAfterSalt - ivLengthOld - AUTH_TAG_LENGTH

  // 根据数据长度判断使用哪种格式
  // 如果密文长度合理（>=1），使用对应格式
  if (possibleCiphertextLengthNew >= 1 && possibleCiphertextLengthOld < 1) {
    // 只能是新格式
    iv = combined.subarray(offset, offset + ivLengthNew)
    offset += ivLengthNew
    authTag = combined.subarray(offset, offset + AUTH_TAG_LENGTH)
    offset += AUTH_TAG_LENGTH
    ciphertext = combined.subarray(offset)
  } else if (possibleCiphertextLengthOld >= 1 && possibleCiphertextLengthNew < 1) {
    // 只能是旧格式
    iv = combined.subarray(offset, offset + ivLengthOld)
    offset += ivLengthOld
    authTag = combined.subarray(offset, offset + AUTH_TAG_LENGTH)
    offset += AUTH_TAG_LENGTH
    ciphertext = combined.subarray(offset)
  } else {
    // 两种格式都可能，先尝试新格式（12字节）
    // 如果失败再尝试旧格式（16字节）
    try {
      iv = combined.subarray(offset, offset + ivLengthNew)
      offset += ivLengthNew
      authTag = combined.subarray(offset, offset + AUTH_TAG_LENGTH)
      offset += AUTH_TAG_LENGTH
      ciphertext = combined.subarray(offset)

      const key = deriveKey(password, salt)
      const decipher = createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      })
      decipher.setAuthTag(authTag)
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ])
      return plaintext.toString('utf8')
    } catch {
      // 新格式失败，尝试旧格式
      offset = SALT_LENGTH
      iv = combined.subarray(offset, offset + ivLengthOld)
      offset += ivLengthOld
      authTag = combined.subarray(offset, offset + AUTH_TAG_LENGTH)
      offset += AUTH_TAG_LENGTH
      ciphertext = combined.subarray(offset)
    }
  }

  // 派生密钥
  const key = deriveKey(password, salt)

  // 创建解密器
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  // 设置认证标签
  decipher.setAuthTag(authTag)

  // 解密
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return plaintext.toString('utf8')
}

/**
 * 验证密码是否正确
 * 通过尝试解密验证数据来验证
 */
export function verifyPassword(encryptedVerifyData: string, password: string): boolean {
  try {
    decrypt(encryptedVerifyData, password)
    return true
  } catch {
    return false
  }
}

/**
 * 创建主密码验证数据
 * 用于后续验证主密码是否正确
 */
export function createVerifyData(password: string): string {
  // 加密一个固定的验证字符串
  return encrypt('PASSLOCK_VERIFY', password)
}

/**
 * 密码哈希 (用于存储验证)
 */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

/**
 * 生成随机密码
 * @param length 密码长度
 * @param options 选项
 */
export function generatePassword(
  length: number = 16,
  options: {
    lowercase?: boolean
    uppercase?: boolean
    numbers?: boolean
    symbols?: boolean
  } = {}
): string {
  const {
    lowercase = true,
    uppercase = true,
    numbers = true,
    symbols = true,
  } = options

  let chars = ''
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (numbers) chars += '0123456789'
  if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'

  if (chars.length === 0) {
    chars = 'abcdefghijklmnopqrstuvwxyz'
  }

  const buffer = randomBytes(length)
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars[buffer[i] % chars.length]
  }

  return password
}

/**
 * 计算密码强度分数 (0-100)
 */
export function getPasswordStrength(password: string): number {
  let score = 0

  // 长度评分
  if (password.length >= 8) score += 20
  if (password.length >= 12) score += 10
  if (password.length >= 16) score += 10

  // 字符类型评分
  if (/[a-z]/.test(password)) score += 15
  if (/[A-Z]/.test(password)) score += 15
  if (/[0-9]/.test(password)) score += 15
  if (/[^a-zA-Z0-9]/.test(password)) score += 15

  return Math.min(100, score)
}

/**
 * 获取密码强度等级
 */
export function getPasswordStrengthLevel(password: string): 'weak' | 'medium' | 'strong' | 'very-strong' {
  const score = getPasswordStrength(password)
  if (score < 40) return 'weak'
  if (score < 60) return 'medium'
  if (score < 80) return 'strong'
  return 'very-strong'
}