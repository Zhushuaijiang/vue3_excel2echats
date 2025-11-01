# 完整设置指南

## 🚀 快速开始

### 第 1 步：安装依赖

```bash
npm install
```

### 第 2 步：初始化数据

创建表单模版数据：

```bash
node scripts/init-sample-forms.js
```

这将创建 8 个专业的货运表单模版。

### 第 3 步：配置 AI（可选）

如果需要使用 AI 生成大屏功能：

1. 复制配置文件：
```bash
copy electron\config.json.example electron\config.json
```

或者手动创建 `electron/config.json`：
```json
{
  "ai": {
    "provider": "deepseek",
    "apiKey": "sk-your-api-key-here",
    "baseUrl": "https://api.deepseek.com",
    "model": "deepseek-chat",
    "temperature": 0.7,
    "maxTokens": 2000
  }
}
```

2. 获取 DeepSeek API Key：
   - 访问 https://www.deepseek.com/
   - 注册并登录
   - 获取 API Key

3. 填入 API Key 到配置文件

详细配置：查看 [AI_CONFIG_GUIDE.md](./AI_CONFIG_GUIDE.md)

### 第 4 步：启动应用

```bash
npm run dev
```

## 📝 使用功能

### 1. 查看表单模版

1. 点击左侧菜单 **"表单配置"**
2. 查看所有可用的表单模版
3. 可以编辑或新增表单

### 2. 录入数据

1. 点击左侧菜单 **"数据录入"**
2. 选择表单模版
3. 填写数据并提交

### 3. 查看图表

1. 点击左侧菜单 **"数据看板"**（首页）
2. 查看 K线图和趋势图
3. 点击图表查看历史数据

### 4. 配置大屏

1. 点击左侧菜单 **"大屏展示"**
2. 点击 **"配置大屏"** 添加组件
3. **按住组件头部拖拽移动**
4. 点击组件头部的 ⛶ 按钮调整大小
5. 点击 **"保存布局"** 保存配置

### 5. 使用 AI 生成（需要配置）

1. 点击 **"AI生成"** 按钮
2. 选择 AI 模板
3. 输入需求描述
4. 设置生成数量（1-6 个）
5. 点击 **"生成"** 按钮
6. AI 自动创建大屏布局

## 🆘 常见问题

### Q: 启动时 Electron 下载失败？

```bash
npm run install:electron
```

或者配置镜像：
```bash
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
```

### Q: better-sqlite3 安装失败？

```bash
npm run rebuild:native
```

### Q: AI 功能报错？

1. 检查 `electron/config.json` 是否存在
2. 确认 API Key 是否正确
3. 检查网络连接
4. 查看控制台错误信息

### Q: 组件无法拖拽？

确保按住了组件的**头部标题栏**区域拖拽，不要按图表内容区域。

### Q: 表单模版没有显示？

运行初始化脚本：
```bash
node scripts/init-sample-forms.js
```

## 📊 数据存储位置

- **Windows**: `%APPDATA%/air-cargo-analytics/cargo_data.db`
- **macOS**: `~/Library/Application Support/air-cargo-analytics/cargo_data.db`
- **Linux**: `~/.config/air-cargo-analytics/cargo_data.db`

## 🔧 开发调试

### 查看日志

主进程日志在终端显示，渲染进程日志在 DevTools 控制台。

### 修改代码

- Vue 组件支持热重载
- Electron 主进程修改需要重启
- 数据库修改需要重启应用

### 重置数据库

删除数据库文件后重启应用，会自动重建：
```bash
# Windows
del %APPDATA%\air-cargo-analytics\cargo_data.db
```

## 📚 下一步

- 查看 [FEATURES.md](./FEATURES.md) 了解所有功能
- 查看 [QUICKSTART.md](./QUICKSTART.md) 快速上手
- 查看 [AI_CONFIG_GUIDE.md](./AI_CONFIG_GUIDE.md) 配置 AI
- 查看 [UPDATE_LOG.md](./UPDATE_LOG.md) 了解更新

---

**祝您使用愉快！** 🎉

