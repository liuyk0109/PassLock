# PassLock 项目配置

## 技术栈

- **Electron**: 41.1.1 - 桌面应用框架
- **Vite**: 8.0.3 - 构建工具
- **Vue**: 3.5.32 - 前端框架
- **TypeScript**: 5.9.3 - 类型支持
- **vite-plugin-electron**: 0.29.1 - Vite Electron 插件

## 包管理器

优先使用 **pnpm** 进行包管理。

## 国内镜像源配置

### pnpm 镜像源
```bash
# 设置 npm 镜像源
pnpm config set registry https://registry.npmmirror.com

# Electron 镜像源（安装 Electron 时需要）
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
pnpm install
```

### 常用国内镜像源
- npm: `https://registry.npmmirror.com`
- Electron: `https://npmmirror.com/mirrors/electron/`
- Node.js: `https://npmmirror.com/mirrors/node/`

## 构建命令

```bash
# 安装依赖
pnpm install

# 开发模式（启动 Electron 应用）
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

## 项目结构

```
d:\code\PassLock
├── electron/
│   └── main.ts          # Electron 主进程
├── src/
│   ├── App.vue          # 根组件
│   ├── main.ts          # 入口文件
│   └── vite-env.d.ts    # Vite 类型声明
├── dist-electron/       # Electron 编译输出（开发时自动生成）
├── dist/                # Web 构建输出
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
└── package.json         # 项目配置
```

## 开发注意事项

1. Electron 主进程代码放在 `electron/` 目录
2. 渲染进程代码放在 `src/` 目录
3. 开发时 Vite 会自动编译 Electron 主进程并热重载
4. 生产构建需要先编译 TypeScript，再打包应用