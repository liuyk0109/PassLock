import type { VaultEntry, NewEntryInput } from '../stores/vault'

export type StrengthLevel = 'weak' | 'medium' | 'strong' | 'very-strong'

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

// 修改主密码结果类型
interface ChangeMasterPasswordResult {
  success: boolean
  error?: string
}

// ============ Dialog API 类型 ============

interface FileFilter {
  name: string
  extensions: string[]
}

interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: FileFilter[]
}

interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  filters?: FileFilter[]
  properties?: Array<'openFile' | 'multiSelections'>
}

interface SaveDialogResult {
  canceled: boolean
  filePath?: string
}

interface OpenDialogResult {
  canceled: boolean
  filePaths: string[]
}

interface DialogAPI {
  showSaveDialog: (options?: SaveDialogOptions) => Promise<SaveDialogResult>
  showOpenDialog: (options?: OpenDialogOptions) => Promise<OpenDialogResult>
}

// ============ Backup API 类型 ============

interface ExportResult {
  success: boolean
  error?: string
  entryCount: number
  filePath: string
}

interface ValidateResult {
  success: boolean
  error?: string
  isValid: boolean
}

interface ParseResult {
  success: boolean
  error?: string
  version?: number
  exportedAt?: string
  appVersion?: string
  entryCount?: number
}

type ConflictAction = 'override' | 'skip' | 'keepboth'

interface ConflictResolution {
  entryId: string
  action: ConflictAction
}

interface EntrySummary {
  title: string
  username: string
  createdAt: number
  updatedAt: number
}

interface ConflictEntry {
  id: string
  local: EntrySummary
  backup: EntrySummary
}

interface ConflictCheckResult {
  success: boolean
  error?: string
  conflicts: ConflictEntry[]
  noConflictCount: number
}

interface ImportResult {
  success: boolean
  error?: string
  stats: {
    added: number
    overridden: number
    skipped: number
    keptBoth: number
  }
}

interface BackupAPI {
  exportData: (filePath: string) => Promise<ExportResult>
  validateBackup: (filePath: string, password: string) => Promise<ValidateResult>
  parseBackup: (filePath: string) => Promise<ParseResult>
  checkConflicts: (filePath: string) => Promise<ConflictCheckResult>
  importData: (filePath: string, resolutions: ConflictResolution[]) => Promise<ImportResult>
}

interface CryptoAPI {
  encrypt: (plaintext: string, password: string) => Promise<string>
  decrypt: (encryptedData: string, password: string) => Promise<string>
  verifyPassword: (encryptedVerifyData: string, password: string) => Promise<boolean>
  createVerifyData: (password: string) => Promise<string>
  generatePassword: (length?: number, options?: PasswordOptions) => Promise<string>
  getPasswordStrength: (password: string) => Promise<number>
  getPasswordStrengthLevel: (password: string) => Promise<StrengthLevel>
  changeMasterPassword: (
    currentPassword: string,
    newPassword: string,
    onProgress?: (current: number, total: number) => void
  ) => Promise<ChangeMasterPasswordResult>
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
  dialog: DialogAPI
  backup: BackupAPI
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// 导出类型供外部使用
export type {
  VaultEntry,
  NewEntryInput,
  PasswordOptions,
  ChangeMasterPasswordResult,
  ConflictAction,
  ConflictResolution,
  ConflictEntry,
  ConflictCheckResult,
  EntrySummary,
  ExportResult,
  ImportResult,
  ParseResult,
  ValidateResult,
}