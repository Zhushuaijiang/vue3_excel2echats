# 安装指南

## 前置要求

- Node.js 18+ 
- npm 或 yarn 包管理器
- Windows 10/11 操作系统（开发环境）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

**注意**：better-sqlite3 需要编译原生模块，首次安装可能需要较长时间。

### 2. 开发模式运行

```bash
npm run dev
```

这将启动：
- Vite 开发服务器（http://localhost:5173）
- Electron 桌面应用窗口

### 3. 构建生产版本

```bash
npm run build:electron
```

构建完成后，可执行文件位于 `dist` 目录。

## 常见问题

### Electron 下载失败 (ECONNRESET 错误)

如果遇到 Electron 下载失败，请尝试：

**方法 1: 使用配置好的镜像源（推荐）**
```bash
# 项目已配置 .npmrc 文件，直接重新安装
npm install
```

**方法 2: 手动配置镜像源**
```bash
# 设置 Electron 镜像
npm config set electron_mirror https://npmmirror.com/mirrors/electron/

# 设置 electron-builder 镜像
npm config set electron_builder_binaries_mirror https://npmmirror.com/mirrors/electron-builder-binaries/

# 然后重新安装
npm install
```

**方法 3: 使用安装脚本**
```bash
npm run install:electron
```

**方法 4: 配置代理（如果有）**
```bash
npm config set proxy http://your-proxy:port
npm config set https-proxy http://your-proxy:port
npm install
```

### better-sqlite3 安装失败

如果遇到 better-sqlite3 安装失败，请尝试：

```bash
# Windows
npm install better-sqlite3 --build-from-source

# 或使用全局安装
npm config set msvs_version 2022
npm install --global windows-build-tools
npm install better-sqlite3
```

### Electron 应用无法启动

1. 确保已安装所有依赖：`npm install`
2. 清理并重新安装：`rm -rf node_modules package-lock.json && npm install`
3. 检查 Node.js 版本是否符合要求
4. 如果仍有问题，尝试：`npm run rebuild:native`

### 数据库文件位置

应用数据存储在：
- Windows: `%APPDATA%/air-cargo-analytics/cargo_data.db`
- macOS: `~/Library/Application Support/air-cargo-analytics/cargo_data.db`
- Linux: `~/.config/air-cargo-analytics/cargo_data.db`

## 开发提示

### 调试 Electron 主进程

在 `electron/main.ts` 中添加 `console.log` 语句，输出会在终端显示。

### 调试渲染进程

开发模式下 Electron 会自动打开开发者工具（DevTools）。

### 热重载

Vue 组件支持热重载，修改后自动刷新。Electron 主进程修改需要重启应用。

## 目录结构说明

```
航空货运APP/
├── electron/              # Electron主进程代码
│   ├── main.ts           # 应用入口
│   ├── preload.ts        # 预加载脚本
│   ├── ipc-handlers.ts   # IPC通信处理器
│   └── tsconfig.json     # TypeScript配置
├── src/                  # 前端源码
│   ├── views/            # 页面组件
│   ├── layouts/          # 布局组件
│   ├── stores/           # Pinia状态管理
│   ├── router/           # 路由配置
│   └── types/            # 类型定义
├── scripts/              # 构建脚本
├── public/               # 静态资源
├── dist/                 # 构建输出（生产环境）
└── dist-electron/        # Electron构建输出
```

## 下一步

查看 [README.md](./README.md) 了解功能特性和使用说明。

