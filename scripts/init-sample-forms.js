const path = require('path')
const os = require('os')

console.log('📝 初始化货运公司表单模版数据...')

// 尝试加载 better-sqlite3，如果版本不匹配则给出提示
let Database
try {
  Database = require('better-sqlite3')
} catch (error) {
  if (error.code === 'ERR_DLOPEN_FAILED' || error.message.includes('NODE_MODULE_VERSION')) {
    console.error('\n❌ better-sqlite3 模块版本不匹配！')
    console.log('\n💡 解决方案：')
    console.log('   1. 确保 Electron 应用已完全关闭（如果有运行）')
    console.log('   2. 运行以下命令重新编译模块：')
    console.log('      npm rebuild better-sqlite3')
    console.log('   3. 然后重新运行: npm run init:all')
    console.log('\n   或者使用应用内功能初始化数据')
    process.exit(1)
  }
  throw error
}

// 获取数据库路径
const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'air-cargo-analytics')
const dbPath = path.join(userDataPath, 'cargo_data.db')

console.log('数据库路径:', dbPath)

if (!require('fs').existsSync(userDataPath)) {
  require('fs').mkdirSync(userDataPath, { recursive: true })
}

const db = new Database(dbPath)

// 确保表已创建
db.exec(`
  CREATE TABLE IF NOT EXISTS form_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    fields TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// 货运公司表单模版数据
const formTemplates = [
  {
    name: '国际货运单',
    fields: [
      { name: '运单号', type: 'text' },
      { name: '出发机场', type: 'text' },
      { name: '目的地机场', type: 'text' },
      { name: '货物重量(kg)', type: 'number' },
      { name: '货物体积(m³)', type: 'number' },
      { name: '起飞时间', type: 'date' },
      { name: '货物类型', type: 'select' },
      { name: '承运航空公司', type: 'text' }
    ]
  },
  {
    name: '国内货运单',
    fields: [
      { name: '运单号', type: 'text' },
      { name: '出发城市', type: 'text' },
      { name: '目的城市', type: 'text' },
      { name: '货物重量(kg)', type: 'number' },
      { name: '运费(元)', type: 'number' },
      { name: '发货日期', type: 'date' },
      { name: '运输状态', type: 'select' },
      { name: '客户名称', type: 'text' },
      { name: '联系电话', type: 'text' }
    ]
  },
  {
    name: '仓储信息单',
    fields: [
      { name: '仓库编号', type: 'text' },
      { name: '货物名称', type: 'text' },
      { name: '入库数量', type: 'number' },
      { name: '入库日期', type: 'date' },
      { name: '预计出库日期', type: 'date' },
      { name: '货物状态', type: 'select' },
      { name: '仓库管理员', type: 'text' }
    ]
  },
  {
    name: '航班调度单',
    fields: [
      { name: '航班号', type: 'text' },
      { name: '执飞日期', type: 'date' },
      { name: '货运舱位(吨)', type: 'number' },
      { name: '实际载货(吨)', type: 'number' },
      { name: '载货率(%)', type: 'number' },
      { name: '航班状态', type: 'select' },
      { name: '机长姓名', type: 'text' }
    ]
  },
  {
    name: '客户提货单',
    fields: [
      { name: '提货单号', type: 'text' },
      { name: '客户名称', type: 'text' },
      { name: '提货日期', type: 'date' },
      { name: '提货件数', type: 'number' },
      { name: '提货重量(kg)', type: 'number' },
      { name: '提货状态', type: 'select' },
      { name: '验收人', type: 'text' },
      { name: '客户签名', type: 'text' }
    ]
  },
  {
    name: '转运单据',
    fields: [
      { name: '转运单号', type: 'text' },
      { name: '原运单号', type: 'text' },
      { name: '中转机场', type: 'text' },
      { name: '转入日期', type: 'date' },
      { name: '转出日期', type: 'date' },
      { name: '转运货物量(kg)', type: 'number' },
      { name: '转运状态', type: 'select' }
    ]
  },
  {
    name: '危险品运输单',
    fields: [
      { name: '危险品单号', type: 'text' },
      { name: '危险品分类', type: 'text' },
      { name: '货物名称', type: 'text' },
      { name: '重量(kg)', type: 'number' },
      { name: '运输日期', type: 'date' },
      { name: '危险等级', type: 'select' },
      { name: '特殊防护措施', type: 'text' },
      { name: '专业运输员', type: 'text' }
    ]
  },
  {
    name: '快递配送单',
    fields: [
      { name: '配送单号', type: 'text' },
      { name: '收件人姓名', type: 'text' },
      { name: '收件地址', type: 'text' },
      { name: '联系电话', type: 'text' },
      { name: '配送重量(kg)', type: 'number' },
      { name: '配送日期', type: 'date' },
      { name: '配送状态', type: 'select' },
      { name: '配送员', type: 'text' }
    ]
  }
]

// 插入表单模版
const insertForm = db.prepare('INSERT OR IGNORE INTO form_configs (name, fields) VALUES (?, ?)')

let insertedCount = 0
formTemplates.forEach(form => {
  const fieldsJson = JSON.stringify(form.fields)
  const result = insertForm.run(form.name, fieldsJson)
  if (result.changes > 0) {
    insertedCount++
    console.log(`✅ 创建表单: ${form.name}`)
  }
})

console.log(`\n🎉 共创建 ${insertedCount} 个表单模版`)

// 检查现有表单数量
const count = db.prepare('SELECT COUNT(*) as total FROM form_configs').get()
console.log(`📊 数据库中现有 ${count.total} 个表单配置\n`)

db.close()

