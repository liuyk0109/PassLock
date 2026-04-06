# PassLock v0.0.1-alpha.01 Release Notes

## 发布信息

- **版本**: 0.0.1-alpha.01
- **发布日期**: 2026-04-05
- **发布类型**: Alpha (内部测试)
- **平台**: Windows x64

## 安装包

| 文件 | 大小 |
|-----|------|
| PassLock Setup 0.0.1-alpha.1.exe | ~97 MB |

## 功能概要

### 已实现功能
- AES-256-GCM 加密算法
- PBKDF2 密钥派生 (100,000 iterations)
- 主密码验证机制
- 密码强度评估
- 密码生成器
- Pinia 状态管理
- LockScreen UI组件

### 测试覆盖
- crypto.ts: 48/48 PASS (100%)
- vault.ts: 41/41 PASS (100%)
- LockScreen.vue: 11/39 PASS (环境兼容性问题阻塞部分测试)

## 技术栈

- Electron v41.1.1
- Vue v3.5.30
- Pinia v3.0.4
- Vite v8.0.3
- TypeScript v5.9.3

## 已知问题

1. 使用默认Electron图标（需后续添加.ico格式图标）
2. 部分组件测试因vitest/@vue/test-utils兼容性问题被阻塞

## 安装说明

1. 运行 `PassLock Setup 0.0.1-alpha.1.exe`
2. 选择安装目录
3. 完成安装后启动 PassLock
4. 创建主密码以初始化密码库

## 下一步计划

- 添加自定义应用图标
- 完善密码条目管理UI
- 添加密码分类/搜索功能
- 解决组件测试兼容性问题