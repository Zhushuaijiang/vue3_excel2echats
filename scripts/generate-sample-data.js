const path = require('path')
const os = require('os')

console.log('📊 生成模拟货运数据...')

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

if (!require('fs').existsSync(dbPath)) {
  console.error('❌ 数据库不存在，请先运行 node scripts/init-sample-forms.js')
  process.exit(1)
}

const db = new Database(dbPath)

// 模拟数据生成函数
function generateRandomData(fields) {
  const data = {}
  const cities = ['北京', '上海', '广州', '深圳', '成都', '杭州', '武汉', '西安', '南京', '重庆']
  const airlines = ['中国国航', '东方航空', '南方航空', '海南航空', '深圳航空', '厦门航空']
  const statuses = ['已发货', '运输中', '已到达', '已签收', '待发货']
  const goods = ['电子产品', '服装', '食品', '医药', '机械', '化工', '日用品']
  
  fields.forEach(field => {
    switch(field.name) {
      case '运单号':
      case '提货单号':
      case '转运单号':
      case '危险品单号':
      case '配送单号':
        data[field.name] = 'W' + Math.random().toString(36).substr(2, 9).toUpperCase()
        break
      case '航班号':
        data[field.name] = ['CA', 'MU', 'CZ', 'HU'][Math.floor(Math.random() * 4)] + 
                          String(Math.floor(Math.random() * 9000) + 1000)
        break
      case '仓库编号':
      case '航班号':
        data[field.name] = 'W' + Math.floor(Math.random() * 1000)
        break
      case '出发机场':
      case '目的地机场':
      case '出发城市':
      case '目的城市':
      case '中转机场':
      case '收件地址':
        data[field.name] = cities[Math.floor(Math.random() * cities.length)]
        break
      case '货物重量(kg)':
      case '货物体积(m³)':
      case '入库数量':
      case '货运舱位(吨)':
      case '实际载货(吨)':
      case '提货件数':
      case '提货重量(kg)':
      case '转运货物量(kg)':
      case '重量(kg)':
      case '配送重量(kg)':
        data[field.name] = (Math.random() * 5000 + 100).toFixed(2)
        break
      case '运费(元)':
        data[field.name] = (Math.random() * 50000 + 1000).toFixed(2)
        break
      case '载货率(%)':
        data[field.name] = Math.floor(Math.random() * 40 + 60)
        break
      case '发货日期':
      case '起飞时间':
      case '入库日期':
      case '执飞日期':
      case '提货日期':
      case '转入日期':
      case '运输日期':
      case '配送日期':
        const daysAgo = Math.floor(Math.random() * 90)
        const date = new Date()
        date.setDate(date.getDate() - daysAgo)
        data[field.name] = date.toISOString().split('T')[0]
        break
      case '预计出库日期':
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + Math.floor(Math.random() * 30) + 1)
        data[field.name] = tomorrow.toISOString().split('T')[0]
        break
      case '起飞时间':
        const hour = String(Math.floor(Math.random() * 24)).padStart(2, '0')
        const minute = String(Math.floor(Math.random() * 60)).padStart(2, '0')
        const day = Math.floor(Math.random() * 30) + 1
        data[field.name] = `2024-01-${String(day).padStart(2, '0')} ${hour}:${minute}`
        break
      case '承运航空公司':
      case '客户名称':
      case '机长姓名':
      case '仓库管理员':
      case '客户姓名':
      case '收件人姓名':
        data[field.name] = ['张三', '李四', '王五', '赵六', '孙七', '周八'][Math.floor(Math.random() * 6)]
        break
      case '运输状态':
      case '货物状态':
      case '航班状态':
      case '提货状态':
      case '转运状态':
      case '配送状态':
        data[field.name] = statuses[Math.floor(Math.random() * statuses.length)]
        break
      case '货物类型':
      case '货物名称':
        data[field.name] = goods[Math.floor(Math.random() * goods.length)]
        break
      case '危险品分类':
        data[field.name] = ['一类', '二类', '三类', '四类', '五类'][Math.floor(Math.random() * 5)]
        break
      case '危险等级':
        data[field.name] = ['低', '中', '高'][Math.floor(Math.random() * 3)]
        break
      case '联系电话':
        data[field.name] = '1' + String(Math.floor(Math.random() * 9000000000) + 1000000000)
        break
      case '验收人':
      case '客户签名':
      case '专业运输员':
      case '配送员':
        data[field.name] = ['管理员1', '管理员2', '管理员3'][Math.floor(Math.random() * 3)]
        break
      case '特殊防护措施':
        data[field.name] = ['防震', '防潮', '防晒', '防爆', '保温'][Math.floor(Math.random() * 5)]
        break
      case '原运单号':
        data[field.name] = 'W' + Math.random().toString(36).substr(2, 9).toUpperCase()
        break
      default:
        // 其他文本字段
        if (field.type === 'text') {
          data[field.name] = '测试数据'
        } else if (field.type === 'number') {
          data[field.name] = Math.floor(Math.random() * 1000) + 1
        } else if (field.type === 'date') {
          const randomDate = new Date(2024, 0, Math.floor(Math.random() * 365) + 1)
          data[field.name] = randomDate.toISOString().split('T')[0]
        } else if (field.type === 'select') {
          data[field.name] = '选项1'
        }
    }
  })
  return data
}

// 获取所有表单配置
const configs = db.prepare('SELECT * FROM form_configs').all()

console.log(`找到 ${configs.length} 个表单配置\n`)

let totalRecords = 0

configs.forEach((config, index) => {
  console.log(`处理配置 ${index + 1}/${configs.length}: ${config.name}`)
  
  const fields = JSON.parse(config.fields)
  
  // 为每个配置生成20-50条记录
  const recordCount = Math.floor(Math.random() * 30) + 20
  
  const insertRecord = db.prepare('INSERT INTO cargo_records (config_id, data) VALUES (?, ?)')
  
  for (let i = 0; i < recordCount; i++) {
    const data = generateRandomData(fields)
    insertRecord.run(config.id, JSON.stringify(data))
  }
  
  console.log(`  ✅ 生成 ${recordCount} 条记录`)
  totalRecords += recordCount
})

console.log(`\n🎉 完成！共生成 ${totalRecords} 条模拟数据记录`)

// 显示统计信息
const stats = db.prepare(`
  SELECT 
    fc.name as form_name,
    COUNT(cr.id) as record_count
  FROM form_configs fc
  LEFT JOIN cargo_records cr ON fc.id = cr.config_id
  GROUP BY fc.id, fc.name
`).all()

console.log('\n📊 数据统计：')
stats.forEach(stat => {
  console.log(`  ${stat.form_name}: ${stat.record_count} 条记录`)
})

db.close()

