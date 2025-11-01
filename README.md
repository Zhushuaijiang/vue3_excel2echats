# 航空货运统计和分析软件

基于 Vue3 + TypeScript + Electron + ECharts 开发的航空货运数据分析软件

## 功能特性

### 1. 数据看板
- K线图展示
- 趋势图展示
- 点击图表查看历史数据详情

### 2. 表单配置
- 自定义表单字段配置
- 支持多种字段类型：文本、数字、日期、选择
- 灵活的配置管理

### 3. 数据录入
- 基于配置表单的数据录入
- 数据列表管理
- 数据增删改查

### 4. 大屏展示
- 类似心电图的折线图实时刷新
- 可拖拽配置统计组件
- 自定义刷新间隔（30秒/1分钟/5分钟）
- 全屏展示模式

### 5. AI功能
- 提示语模板管理
- 自动生成大屏统计配置
- 支持自定义AI提示

### 6. 数据存储
- 本地SQLite数据库
- 百万级数据支持
- 高效的数据查询

## 技术栈

- **前端框架**: Vue 3.4 + TypeScript
- **UI组件**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router
- **图表**: ECharts 5
- **桌面应用**: Electron 28
- **数据库**: SQLite (better-sqlite3)
- **构建工具**: Vite 5

## 项目结构

```
航空货运APP/
├── electron/              # Electron主进程
│   ├── main.ts           # 主进程入口
│   ├── preload.ts        # 预加载脚本
│   └── ipc-handlers.ts   # IPC通信处理器
├── src/
│   ├── views/            # 页面视图
│   │   ├── Dashboard.vue      # 数据看板
│   │   ├── FormConfig.vue     # 表单配置
│   │   ├── DataEntry.vue      # 数据录入
│   │   ├── BigScreen.vue      # 大屏展示
│   │   └── AITemplates.vue    # AI模板
│   ├── layouts/          # 布局组件
│   ├── stores/           # Pinia状态管理
│   ├── router/           # 路由配置
│   ├── types/            # TypeScript类型定义
│   ├── App.vue           # 根组件
│   └── main.ts           # 应用入口
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 安装与运行

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式

```bash
npm run dev
```

这将启动：
- Vite开发服务器 (http://localhost:5173)
- Electron桌面应用窗口

### 3. 构建生产版本

```bash
npm run build
```

构建完成后，可执行文件位于 `dist` 目录

## 主要功能说明

### 表单字段配置
在"表单配置"页面可以创建自定义表单，支持以下字段类型：
- **文本**: 普通文本输入
- **数字**: 数字输入
- **日期**: 日期选择器
- **选择**: 下拉选择

### 数据录入
选择配置好的表单，录入对应的数据。所有数据保存在本地SQLite数据库中。

### 大屏展示
- 支持拖拽添加图表组件
- 实时数据刷新
- 全屏模式显示
- AI自动生成大屏配置（开发中）

### AI功能
- 管理AI提示语模板
- 使用 {user_input} 占位符
- 自动生成大屏统计（需集成AI服务）

## 数据库表结构

### form_configs (表单配置表)
- id: 主键
- name: 配置名称
- fields: 字段配置(JSON)
- created_at: 创建时间

### cargo_records (货运记录表)
- id: 主键
- config_id: 配置ID
- data: 记录数据(JSON)
- created_at: 创建时间

### dashboard_configs (大屏配置表)
- id: 主键
- name: 配置名称
- layout: 布局配置(JSON)
- widgets: 组件配置(JSON)
- updated_at: 更新时间

### ai_templates (AI模板表)
- id: 主键
- name: 模板名称
- prompt: 提示语
- created_at: 创建时间

## 待完善功能

- [ ] 集成真实AI服务（OpenAI/Claude等）
- [ ] 数据导入导出功能
- [ ] 图表更多配置选项
- [ ] 数据权限管理
- [ ] 报表生成功能

## 许可证

MIT License

