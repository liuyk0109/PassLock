// 加密 API 类型定义 (供渲染进程使用)

export interface CryptoAPI {
  // 加密解密
  encrypt(plaintext: string, password: string): Promise<string>
  decrypt(encryptedData: string, password: string): Promise<string>
  
  // 密码验证
  verifyPassword(encryptedVerifyData: string, password: string): Promise<boolean>
  createVerifyData(password: string): Promise<string>
  
  // 密码生成
  generatePassword(length?: number, options?: PasswordOptions): Promise<string>
  
  // 密码强度
  getPasswordStrength(password: string): Promise<number>
  getPasswordStrengthLevel(password: string): Promise<StrengthLevel>
}

export interface PasswordOptions {
  lowercase?: boolean
  uppercase?: boolean
  numbers?: boolean
  symbols?: boolean
}

export type StrengthLevel = 'weak' | 'medium' | 'strong' | 'very-strong'