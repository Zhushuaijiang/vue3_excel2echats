# 数据初始化指南

## 📊 生成模拟数据

项目提供了完整的模拟数据生成脚本，可以快速创建测试数据。

## 🚀 快速开始

### 方法1：一键初始化所有数据（推荐）

```bash
npm run init:all
```

这将自动执行：
1. 创建8个表单模版配置
2. 为每个模版生成20-50条模拟数据

### 方法2：分步执行

#### 步骤1：创建表单模版

```bash
npm run init:forms
```

创建以下8个货运表单模版：
- 国际货运单
- 国内货运单
- 仓储信息单
- 航班调度单
- 客户提货单
- 转运单据
- 危险品运输单
- 快递配送单

#### 步骤2：生成模拟数据

```bash
npm run init:data
```

为所有表单模版生成对应的模拟数据记录。

## 📋 数据详情

### 生成的数据量

- 每个表单模版：20-50条随机记录
- 总数据量：约200-400条记录
- 数据时间范围：最近90天

### 数据字段

模拟数据包含真实货运业务的各类字段：

**通用字段**：
- 运单号（自动生成）
- 日期（最近90天内随机）
- 客户姓名（随机）
- 联系方式（随机）

**货运字段**：
- 出发地/目的地（10个城市随机）
- 货物重量（100-5100 kg）
- 货物类型（电子产品、服装、食品等）
- 运输状态（已发货、运输中、已到达等）

**特殊字段**：
- 航班号（格式：CA/MU/CZ/HU + 4位数字）
- 危险等级（低/中/高）
- 仓库编号
- 配送员信息

## 📊 数据可视化

生成的模拟数据会自动用于：

### 1. 数据看板
- **K线图**：展示最近6个月的货运量波动
- **趋势图**：展示最近30天的货运趋势
- 点击图表可查看详细历史数据

### 2. 大屏展示
- **折线图**：最近15天货运趋势
- **柱状图**：各城市货运量排名（Top 6）
- **饼图**：货物类型分布（Top 5）

### 3. 数据录入
- 可以查看所有模拟记录
- 支持手动新增记录
- 支持删除记录

## 🔄 重新生成数据

如果需要清空并重新生成数据：

### 方法1：删除数据库文件

```bash
# Windows
del %APPDATA%\air-cargo-analytics\cargo_data.db

# macOS/Linux  
rm ~/Library/Application\ Support/air-cargo-analytics/cargo_data.db
```

然后重新运行：
```bash
npm run init:all
```

### 方法2：重新运行初始化脚本

脚本会自动检测现有数据，使用 `INSERT OR IGNORE` 避免重复插入。

## 📈 数据统计

生成完成后，会显示统计信息：

```
📊 数据统计：
  国际货运单: 32 条记录
  国内货运单: 45 条记录
  仓储信息单: 28 条记录
  航班调度单: 39 条记录
  客户提货单: 42 条记录
  转运单据: 35 条记录
  危险品运输单: 29 条记录
  快递配送单: 41 条记录
```

## 🎯 验证数据

### 检查表单配置

1. 启动应用：`npm run dev`
2. 点击左侧菜单"表单配置"
3. 应该看到8个表单配置

### 检查数据记录

1. 点击左侧菜单"数据录入"
2. 查看不同表单的数据记录
3. 检查数据内容是否合理

### 检查图表展示

1. 点击首页"数据看板"
2. 查看K线图和趋势图是否正常显示
3. 图表应该有数据展示

## 🐛 常见问题

### Q: 生成的数据量太少？

修改 `scripts/generate-sample-data.js` 中的 `recordCount`：

```javascript
const recordCount = Math.floor(Math.random() * 30) + 20  // 改为更大值
```

### Q: 城市不够多？

修改 `scripts/generate-sample-data.js` 中的 `cities` 数组，添加更多城市。

### Q: 数据日期范围？

修改 `scripts/generate-sample-data.js` 中的日期生成逻辑：

```javascript
const daysAgo = Math.floor(Math.random() * 90)  // 90天改为其他值
```

### Q: 数据库路径在哪里？

- Windows: `%APPDATA%/air-cargo-analytics/cargo_data.db`
- macOS: `~/Library/Application Support/air-cargo-analytics/cargo_data.db`
- Linux: `~/.config/air-cargo-analytics/cargo_data.db`

## 📚 相关文档

- [SETUP.md](./SETUP.md) - 完整设置指南
- [QUICKSTART.md](./QUICKSTART.md) - 快速开始
- [FEATURES.md](./FEATURES.md) - 功能说明

---

**生成完成后，立即开始探索数据可视化功能！** 🎉

