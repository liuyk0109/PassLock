import type { VaultEntry } from '../stores/vault'

interface PasswordOptions {
  lowercase?: boolean
  uppercase?: boolean
  numbers?: boolean
  symbols?: boolean
}

interface Settings {
  autoLockTimeout?: number
  theme?: 'light' | 'dark' | 'system'
}

interface CryptoAPI {
  encrypt: (plaintext: string, password: string) => Promise<string>
  decrypt: (encryptedData: string, password: string) => Promise<string>
  verifyPassword: (encryptedVerifyData: string, password: string) => Promise<boolean>
  createVerifyData: (password: string) => Promise<string>
  generatePassword: (length?: number, options?: PasswordOptions) => Promise<string>
  getPasswordStrength: (password: string) => Promise<number>
  getPasswordStrengthLevel: (password: string) => Promise<'weak' | 'medium' | 'strong' | 'very-strong'>
}

interface DatabaseAPI {
  getEntries: () => Promise<VaultEntry[]>
  setEntries: (entries: VaultEntry[]) => Promise<void>
  addEntry: (entry: VaultEntry) => Promise<void>
  updateEntry: (id: string, updates: Partial<VaultEntry>) => Promise<boolean>
  deleteEntry: (id: string) => Promise<boolean>
  getMasterKeyVerify: () => Promise<string | null>
  setMasterKeyVerify: (verify: string) => Promise<void>
  getSettings: () => Promise<Settings>
  updateSettings: (settings: Settings) => Promise<void>
}

interface ElectronAPI {
  crypto: CryptoAPI
  db: DatabaseAPI
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}