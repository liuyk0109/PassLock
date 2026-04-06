# PassLock 密码库页面 - API接口规范

## IPC API 清单

### 现有API复用分析

密码库页面功能完全复用现有IPC API，无需新增。

| 功能 | IPC通道 | 参数 | 返回值 | 用途 |
|------|---------|------|--------|------|
| 获取条目列表 | `db:getEntries` | 无 | `VaultEntry[]` | 页面加载时获取所有密码条目 |
| 新增条目 | `db:addEntry` | `VaultEntry` | `void` | 保存新增的密码条目 |
| 更新条目 | `db:updateEntry` | `id, Partial<VaultEntry>` | `boolean` | 编辑密码条目（预留） |
| 删除条目 | `db:deleteEntry` | `id` | `boolean` | 删除密码条目（预留） |
| 加密密码 | `crypto:encrypt` | `plaintext, password` | `string` | 新增时加密明文密码 |
| 解密密码 | `crypto:decrypt` | `encryptedData, password` | `string` | 复制时解密密码 |
| 生成密码 | `crypto:generatePassword` | `length?, options?` | `string` | 密码生成器调用 |
| 密码强度 | `crypto:getPasswordStrengthLevel` | `password` | `StrengthLevel` | 密码强度评估 |

---

## 调用时机与数据流

### 1. 页面初始化

```
VaultPage mounted
  └── VaultStore.loadEntries()
      └── electronAPI.db.getEntries()
          └── IPC -> Database.getEntries()
              └── 返回 VaultEntry[] (加密状态)
```

### 2. 新增密码条目

```
AddPasswordModal 用户提交
  └── VaultStore.createEntry(input)
      ├── electronAPI.crypto.encrypt(input.password, masterKey)
      │   └── IPC -> Crypto.encrypt()
      │       └── 返回 encryptedPassword
      ├── 构建 VaultEntry { ...input, password: encryptedPassword }
      └── electronAPI.db.addEntry(entry)
          └── IPC -> Database.addEntry()
              └── 写入 vault.json
```

### 3. 复制密码

```
PasswordCard 用户点击复制
  └── VaultStore.copyPassword(entryId)
      ├── 获取 entry.password (加密状态)
      ├── electronAPI.crypto.decrypt(entry.password, masterKey)
      │   └── IPC -> Crypto.decrypt()
      │       └── 返回 plaintext
      └── navigator.clipboard.writeText(plaintext)
```

### 4. 密码生成器

```
PasswordGenerator 用户调整配置
  └── electronAPI.crypto.generatePassword(length, options)
      └── IPC -> Crypto.generatePassword()
          └── Node.js crypto.randomBytes
              └── 返回随机密码字符串
  
  └── electronAPI.crypto.getPasswordStrengthLevel(password)
      └── IPC -> Crypto.getPasswordStrengthLevel()
          └── 返回 'weak' | 'medium' | 'strong' | 'very-strong'
```

---

## 数据类型规范

### VaultEntry 完整定义

```typescript
/**
 * 密码库条目数据结构
 * 存储于数据库，password字段为加密状态
 */
export interface VaultEntry {
  /** UUID唯一标识 */
  id: string
  
  /** 条目名称/标题 (必填) */
  title: string
  
  /** 用户名 (可选，UI预留) */
  username: string
  
  /** 加密后的密码 (必填，AES-256-GCM加密) */
  password: string
  
  /** 网站/应用名称 (新增字段) */
  site?: string
  
  /** 网站URL (可选) */
  url?: string
  
  /** 备注 (可选，最多显示2行) */
  notes?: string
  
  /** 图标标识 (预留，默认钥匙图标) */
  icon?: string
  
  /** 创建时间戳 (毫秒) */
  createdAt: number
  
  /** 更新时间戳 (毫秒) */
  updatedAt: number
}
```

### NewEntryInput 定义

```typescript
/**
 * 新增密码条目输入
 * 用于弹窗表单，password为明文状态
 */
export interface NewEntryInput {
  /** 名称 (必填，验证规则：非空) */
  title: string
  
  /** 用户名 (可选) */
  username?: string
  
  /** 明文密码 (必填，验证规则：非空且长度>=8) */
  password: string
  
  /** 网站/应用 (可选) */
  site?: string
  
  /** URL (可选) */
  url?: string
  
  /** 备注 (可选) */
  notes?: string
}
```

### PasswordOptions 定义

```typescript
/**
 * 密码生成器配置选项
 */
export interface PasswordOptions {
  /** 包含小写字母 a-z */
  lowercase?: boolean
  
  /** 包含大写字母 A-Z */
  uppercase?: boolean
  
  /** 包含数字 0-9 */
  numbers?: boolean
  
  /** 包含特殊符号 */
  symbols?: boolean
}
```

### StrengthLevel 定义

```typescript
/**
 * 密码强度等级
 */
export type StrengthLevel = 'weak' | 'medium' | 'strong' | 'very-strong'

// 等级对应分数范围：
// weak:      0-39
// medium:    40-59  
// strong:    60-79
// very-strong: 80-100
```

---

## Store API规范

### VaultStore 方法签名

```typescript
/**
 * 密码库状态管理 Store
 */
interface VaultStoreAPI {
  // ========== 状态 ==========
  /** 是否锁定状态 */
  isLocked: Ref<boolean>
  
  /** 主密码 (仅内存，解锁后存在) */
  masterKey: Ref<string | null>
  
  /** 密码条目列表 */
  entries: Ref<VaultEntry[]>
  
  /** 新增弹窗显示状态 */
  showModal: Ref<boolean>
  
  /** 搜索关键词 */
  searchQuery: Ref<string>
  
  /** 最近复制的条目ID */
  copiedEntryId: Ref<string | null>
  
  // ========== 计算属性 ==========
  /** 条目总数 */
  entryCount: ComputedRef<number>
  
  /** 是否已解锁 */
  isUnlocked: ComputedRef<boolean>
  
  /** 过滤后的条目列表 */
  filteredEntries: ComputedRef<VaultEntry[]>
  
  // ========== 方法 ==========
  /** 解锁密码库 */
  unlock(key: string): void
  
  /** 锁定密码库 */
  lock(): void
  
  /** 从数据库加载条目 */
  async loadEntries(): Promise<void>
  
  /** 创建新条目 (加密并保存) */
  async createEntry(input: NewEntryInput): Promise<VaultEntry>
  
  /** 更新条目 */
  async updateEntry(id: string, updates: Partial<VaultEntry>): Promise<boolean>
  
  /** 删除条目 */
  async deleteEntry(id: string): Promise<boolean>
  
  /** 复制密码到剪贴板 */
  async copyPassword(entryId: string): Promise<void>
  
  /** 切换弹窗状态 */
  toggleModal(): void
  
  /** 设置搜索关键词 */
  setSearchQuery(query: string): void
}
```

### 方法实现规范

#### loadEntries()

```typescript
async function loadEntries(): Promise<void> {
  try {
    const entries = await window.electronAPI.db.getEntries()
    setEntries(entries)
  } catch (error) {
    console.error('Failed to load entries:', error)
    throw error
  }
}
```

#### createEntry()

```typescript
async function createEntry(input: NewEntryInput): Promise<VaultEntry> {
  if (!masterKey.value) {
    throw new Error('Vault is locked')
  }
  
  // 验证必填字段
  if (!input.title || !input.password) {
    throw new Error('Title and password are required')
  }
  
  // 加密密码
  const encryptedPassword = await window.electronAPI.crypto.encrypt(
    input.password,
    masterKey.value
  )
  
  // 构建条目对象
  const now = Date.now()
  const entry: VaultEntry = {
    id: crypto.randomUUID(),
    title: input.title,
    username: input.username ?? '',
    password: encryptedPassword,
    site: input.site,
    url: input.url,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  }
  
  // 保存到数据库
  await window.electronAPI.db.addEntry(entry)
  
  // 更新本地状态
  entries.value.unshift(entry) // 添加到顶部
  
  return entry
}
```

#### copyPassword()

```typescript
async function copyPassword(entryId: string): Promise<void> {
  if (!masterKey.value) {
    throw new Error('Vault is locked')
  }
  
  const entry = entries.value.find(e => e.id === entryId)
  if (!entry) {
    throw new Error('Entry not found')
  }
  
  // 解密密码
  const plaintext = await window.electronAPI.crypto.decrypt(
    entry.password,
    masterKey.value
  )
  
  // 写入剪贴板
  await navigator.clipboard.writeText(plaintext)
  
  // 设置复制状态 (用于UI反馈)
  copiedEntryId.value = entryId
  
  // 1.5秒后清除状态
  setTimeout(() => {
    copiedEntryId.value = null
  }, 1500)
}
```

---

## 组件Props规范

### PasswordCard.vue

```typescript
interface PasswordCardProps {
  /** 密码条目数据 */
  entry: VaultEntry
  
  /** 是否处于复制成功状态 (可选，用于父组件控制) */
  isCopied?: boolean
}

interface PasswordCardEmits {
  /** 复制密码事件 */
  'copy-password': (entryId: string) => void
  
  /** 编辑条目事件 (预留) */
  'edit-entry': (entryId: string) => void
  
  /** 删除条目事件 (预留) */
  'delete-entry': (entryId: string) => void
}
```

### AddPasswordModal.vue

```typescript
interface AddPasswordModalProps {
  /** 弹窗显示状态 */
  visible: boolean
}

interface AddPasswordModalEmits {
  /** 关闭弹窗事件 */
  'close': () => void
  
  /** 保存条目事件 */
  'save': (input: NewEntryInput) => void
}
```

### PasswordGenerator.vue

```typescript
interface PasswordGeneratorProps {
  // 无props，作为子组件嵌入
}

interface PasswordGeneratorEmits {
  /** 使用生成的密码 */
  'use-password': (password: string) => void
}
```

---

## 错误处理规范

### 错误类型定义

```typescript
/**
 * Vault操作错误类型
 */
export enum VaultErrorCode {
  VAULT_LOCKED = 'VAULT_LOCKED',
  ENTRY_NOT_FOUND = 'ENTRY_NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  DECRYPT_FAILED = 'DECRYPT_FAILED',
  ENCRYPT_FAILED = 'ENCRYPT_FAILED',
  DB_ERROR = 'DB_ERROR',
}

export class VaultError extends Error {
  code: VaultErrorCode
  
  constructor(code: VaultErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'VaultError'
  }
}
```

### 错误处理示例

```typescript
// VaultStore 方法错误处理
async function copyPassword(entryId: string): Promise<void> {
  try {
    if (!masterKey.value) {
      throw new VaultError(VaultErrorCode.VAULT_LOCKED, 'Vault is locked')
    }
    
    const entry = entries.value.find(e => e.id === entryId)
    if (!entry) {
      throw new VaultError(VaultErrorCode.ENTRY_NOT_FOUND, 'Entry not found')
    }
    
    const plaintext = await window.electronAPI.crypto.decrypt(
      entry.password,
      masterKey.value
    )
    
    await navigator.clipboard.writeText(plaintext)
    copiedEntryId.value = entryId
    
  } catch (error) {
    if (error instanceof VaultError) {
      // 业务错误，提示用户
      console.warn(`VaultError [${error.code}]: ${error.message}`)
    } else {
      // 系统错误，记录日志
      console.error('Unexpected error in copyPassword:', error)
    }
    throw error
  }
}
```

---

## API调用时机表

| 用户操作 | Store方法 | IPC调用序列 | UI反馈 |
|----------|-----------|-------------|--------|
| 页面加载 | loadEntries() | db:getEntries | 显示卡片列表 |
| 点击新增 | toggleModal() | 无 | 弹窗打开 |
| 生成密码 | (Generator组件) | crypto:generatePassword, crypto:getPasswordStrengthLevel | 显示密码预览和强度 |
| 点击保存 | createEntry() | crypto:encrypt -> db:addEntry | 弹窗关闭，新卡片出现 |
| 点击复制 | copyPassword() | crypto:decrypt | 显示"已复制"提示 |
| 输入搜索 | setSearchQuery() | 无 | filteredEntries更新 |

---

## 文件更新清单

| 文件 | 更改类型 | 更改内容 |
|------|----------|----------|
| `src/types/electron.d.ts` | 扩展 | 添加 site, icon 字段；新增 NewEntryInput 类型 |
| `src/stores/vault.ts` | 扩展 | 添加 showModal, searchQuery, filteredEntries, loadEntries, createEntry, copyPassword |
| `electron/database.ts` | 无需更改 | VaultEntry 已支持可选字段 |
| `electron/crypto.ts` | 无需更改 | generatePassword 已满足需求 |
| `electron/preload.ts` | 无需更改 | API已完备 |

---

## 下游传递

**传递给 Developer Agent**：
- API规范文档路径: `.agents/docs/api-design/api-spec.md`
- 架构文档路径: `.agents/docs/architecture/system-architecture.md`
- 实现指引：
  1. 先更新类型定义文件
  2. 扩展 VaultStore
  3. 创建组件文件
  4. 集成到 App.vue

---

*规范完成时间: 2026-04-06*
*架构师Agent: architect*