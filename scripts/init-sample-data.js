const Database = require('better-sqlite3')
const path = require('path')
const os = require('os')

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'air-cargo-analytics', 'cargo_data.db')
console.log('Initializing database at:', dbPath)

const db = new Database(dbPath)

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS form_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    fields TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS cargo_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_id INTEGER NOT NULL,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (config_id) REFERENCES form_configs(id)
  );
  
  CREATE TABLE IF NOT EXISTS dashboard_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    layout TEXT NOT NULL,
    widgets TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS ai_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// 插入示例AI模板
const templates = [
  ['货运量分析', '请生成一个展示航空货运量的统计大屏，包含：1. 总体货运量趋势图（折线图）2. 各航线货运量对比（柱状图）3. 货运量占比分析（饼图）。根据用户输入：{user_input}'],
  ['航线效率分析', '请生成一个航线效率分析大屏，展示：1. 各航线准点率对比（柱状图）2. 效率趋势（折线图）3. 问题航线预警（列表）。用户需求：{user_input}'],
  ['成本收益分析', '生成成本收益分析大屏，包含：1. 月度成本趋势 2. 收益对比 3. 利润率分析。详细需求：{user_input}']
]

const insertTemplate = db.prepare('INSERT OR IGNORE INTO ai_templates (name, prompt) VALUES (?, ?)')

for (const [name, prompt] of templates) {
  insertTemplate.run(name, prompt)
}

console.log('Sample data initialized successfully')
db.close()

