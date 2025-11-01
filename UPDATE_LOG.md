# 更新日志

## 2024 - 重大更新

### ✨ 新增功能

#### 1. 表单模版数据初始化 ✅
- 新增 `scripts/init-sample-forms.js` 脚本
- 自动创建 8 个专业的货运公司表单模版：
  - 国际货运单
  - 国内货运单
  - 仓储信息单
  - 航班调度单
  - 客户提货单
  - 转运单据
  - 危险品运输单
  - 快递配送单

**使用方法**:
```bash
node scripts/init-sample-forms.js
```

#### 2. 大屏拖拽功能完善 ✅
- **自由拖拽移动**：组件可以通过拖拽头部移动到任意位置
- **点击拖拽**：按住组件头部拖动即可移动
- **边界检测**：自动限制组件在容器范围内
- **尺寸调整**：右键点击组件头部可调整大小
- **保存布局**：新增"保存布局"按钮
- **实时预览**：拖拽时实时显示组件位置

**使用方法**:
1. 在大屏页面添加组件
2. 按住组件头部拖拽移动
3. 点击组件头部的调整按钮可以修改大小
4. 点击"保存布局"保存当前配置

#### 3. DeepSeek AI 集成 ✅
- 完整的 DeepSeek API 集成
- 智能生成大屏布局
- 自动解析 AI 返回的 JSON 配置
- 错误处理和降级机制
- 配置文件和文档支持

**配置步骤**:
1. 复制 `electron/config.json.example` 为 `electron/config.json`
2. 在 DeepSeek 官网获取 API Key
3. 将 API Key 填入配置文件
4. 重启应用

**详细配置**: 查看 [AI_CONFIG_GUIDE.md](./AI_CONFIG_GUIDE.md)

#### 4. 辅助脚本 ✅
- `scripts/rebuild-native.js` - 重建原生模块
- `scripts/install-electron.js` - 自动配置 Electron 镜像
- `scripts/init-sample-forms.js` - 初始化表单模版

#### 5. 文档完善 ✅
- 新增 `AI_CONFIG_GUIDE.md` - AI 配置完整指南
- 新增 `UPDATE_LOG.md` - 更新日志
- 更新 `.gitignore` - 保护 AI 配置
- 更新 `INSTALL.md` - 更详细的安装说明

### 🔧 技术改进

#### 大屏拖拽实现
- 使用原生 mouse 事件实现拖拽
- 支持鼠标移动和释放事件
- 自动计算百分比位置
- 防止组件拖出容器边界

#### AI 功能架构
- 模块化设计，易于扩展
- 支持多种 AI 服务（当前 DeepSeek）
- 自动 JSON 解析和验证
- Fallback 默认配置

#### 错误处理
- 完善的 try-catch 机制
- 用户友好的错误提示
- 自动降级策略
- 详细的日志输出

### 🐛 修复问题

1. **大屏组件无法拖拽移动** - 已修复
   - 之前：只能添加组件，无法移动
   - 现在：支持拖拽移动和调整大小

2. **AI 功能不可用** - 已修复
   - 之前：仅返回占位消息
   - 现在：完整的 DeepSeek API 集成

3. **依赖安装问题** - 已改进
   - 新增自动重建脚本
   - 配置国内镜像源
   - 更友好的错误提示

### 📦 依赖更新

- `cross-env` - 新增，跨平台环境变量支持
- `prebuild-install` - 新增，预构建安装支持

### 🎯 使用建议

#### 首次使用
1. 运行 `npm install` 安装依赖
2. 运行 `node scripts/init-sample-forms.js` 初始化表单
3. 配置 DeepSeek API（可选，如需要 AI 功能）
4. 运行 `npm run dev` 启动应用

#### 使用 AI 功能
1. 参考 `AI_CONFIG_GUIDE.md` 配置 API
2. 进入"大屏展示"页面
3. 点击"AI生成"按钮
4. 选择模板并输入需求
5. AI 自动生成布局

#### 大屏配置
1. 添加图表组件
2. 拖拽移动位置
3. 调整组件大小
4. 保存布局

### ⚠️ 重要变更

1. **配置文件新增**
   - `electron/config.json` - AI 配置（需手动创建）
   - `.gitignore` 已更新，忽略配置文件

2. **数据初始化**
   - 表单模版脚本需手动运行
   - AI 模版自动初始化

3. **API 配置**
   - AI 功能需要有效的 API Key
   - 配置错误会提示友好消息

### 🔮 未来计划

- [ ] 支持更多 AI 服务提供商
- [ ] 组件拖拽时的网格对齐
- [ ] 组件大小拖拽调整
- [ ] 大屏布局导出/导入
- [ ] 数据导入导出功能
- [ ] 更多图表类型

### 📚 相关文档

- [AI_CONFIG_GUIDE.md](./AI_CONFIG_GUIDE.md) - AI 配置指南
- [INSTALL.md](./INSTALL.md) - 安装指南
- [QUICKSTART.md](./QUICKSTART.md) - 快速开始
- [FEATURES.md](./FEATURES.md) - 功能说明

---

**更新日期**: 2024年  
**版本**: 1.1.0  
**状态**: ✅ 所有功能已完成并测试

