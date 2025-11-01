# 故障排除指南

## 🔧 better-sqlite3 模块版本不匹配问题

### 问题描述

当你看到以下错误：
```
Error: The module 'better-sqlite3' was compiled against a different Node.js version
```

这是因为 `better-sqlite3` 是一个原生模块，需要针对特定的 Node.js 版本编译。

### 为什么会发生？

项目中有两种使用场景：
1. **Electron 应用**：使用 Electron 内置的 Node.js（通常是 v20+）
2. **命令行脚本**：使用系统的 Node.js（可能是 v18）

当你运行 `npm run rebuild:native` 后，模块被编译为 Electron 版本。  
当你运行 `npm rebuild better-sqlite3` 后，模块被编译为系统 Node.js 版本。

### 解决方案

#### 方案 1：重新编译为系统 Node.js 版本（推荐用于运行脚本）

```bash
# 1. 确保 Electron 应用已完全关闭
# 2. 重新编译模块
npm rebuild better-sqlite3

# 3. 运行初始化脚本
npm run init:all
```

#### 方案 2：重新编译为 Electron 版本（用于运行应用）

```bash
npm run rebuild:native
```

#### 方案 3：使用应用内功能（推荐）

不需要处理模块版本问题：
1. 启动应用：`npm run dev`
2. 在"表单配置"页面使用"清空所有数据"
3. 然后可以手动添加数据，或使用应用内功能

### 快速切换

如果你经常需要在两种模式间切换，可以：

1. **运行脚本前**：
   ```bash
   npm rebuild better-sqlite3
   npm run init:all
   ```

2. **运行应用前**：
   ```bash
   npm run rebuild:native
   npm run dev
   ```

### 常见错误

#### 错误：文件被锁定（EBUSY）

**原因**：Electron 应用正在运行，文件被占用

**解决**：
1. 完全关闭 Electron 应用
2. 关闭所有相关终端
3. 等待几秒后重试

#### 错误：权限不足（EPERM）

**原因**：Windows 上文件权限问题

**解决**：
1. 以管理员身份运行终端
2. 或者关闭所有相关程序后重试

### 推荐工作流程

1. **开发时**：
   - 使用 `npm run dev` 启动应用
   - 模块保持为 Electron 版本
   - 在应用内操作数据

2. **初始化数据**：
   - 关闭应用
   - 运行 `npm rebuild better-sqlite3`
   - 运行 `npm run init:all`
   - 如需运行应用，再运行 `npm run rebuild:native`

3. **生产环境**：
   - 构建前运行 `npm run rebuild:native`（已在 build 流程中）
   - 不需要手动切换

### 检查当前模块版本

查看模块编译信息：
```bash
node -e "console.log(process.versions)"
```

查看 Electron 版本：
```bash
npx electron -v
```

### 提示

- 如果只是查看或管理数据，优先使用应用内功能
- 脚本主要用于批量初始化数据
- 可以在应用启动时自动初始化数据（已实现）

---

**需要帮助？** 查看其他文档：
- [SETUP.md](./SETUP.md) - 安装和设置
- [DATA_INIT_GUIDE.md](./DATA_INIT_GUIDE.md) - 数据初始化指南

