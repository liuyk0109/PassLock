# PassLock Agent 入口

> 渐进式披露入口 - 按需导航至详细信息

---

## 快速开始

1. **开始新任务** → 阅读 [.agents/WORKFLOW.md](.agents/WORKFLOW.md)
2. **了解Subagent** → 查看 [.agents/agents/](.agents/agents/) 目录
3. **项目技术栈** → 继续阅读本文下方

---

## Agent 体系导航

| Agent | 职责 | 文件路径 |
|-------|------|----------|
| UI/UX | 用户界面设计 | [.agents/agents/ui-ux.md](.agents/agents/ui-ux.md) |
| Architect | 系统架构设计 | [.agents/agents/architect.md](.agents/agents/architect.md) |
| Developer | 代码实现 | [.agents/agents/developer.md](.agents/agents/developer.md) |
| Reviewer | 代码审查 | [.agents/agents/reviewer.md](.agents/agents/reviewer.md) |
| QA | 质量验证 | [.agents/agents/qa.md](.agents/agents/qa.md) |
| Cryptographer | 加密方案 | [.agents/agents/cryptographer.md](.agents/agents/cryptographer.md) |
| Publisher | 打包发布 | [.agents/agents/publisher.md](.agents/agents/publisher.md) |

---

## 任务流转

```
需求 → UI/UX → Architect → Developer ← Cryptographer
                              ↓
                           Reviewer → QA → Publisher
```

---

## 绝对禁止

做不属于自身职责的事情

---

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Electron | 41.1.1 |
| 前端 | Vue 3 | 3.5.32 |
| 构建 | Vite | 8.0.3 |
| 类型 | TypeScript | 5.9.3 |
| 包管理 | pnpm | 优先使用 |

---

## 常用命令

```bash
pnpm install    # 安装依赖
pnpm dev        # 开发模式
pnpm build      # 生产构建
```

---

## 详细文档位置

- **工作流规范**: [.agents/WORKFLOW.md](.agents/WORKFLOW.md)
- **文档沉淀**: [.agents/docs/](.agents/docs/)
- **任务记录**: [.agents/tasks/](.agents/tasks/)
- **IDE配置**: [.qoder/](.qoder/) (Git排除)