// 一键清空数据库所有数据
const os = require('os')
const path = require('path')
const { execSync } = require('child_process')

let Database
try {
  Database = require('better-sqlite3')
} catch (error) {
  if (error.code === 'ERR_DLOPEN_FAILED' || error.message.includes('NODE_MODULE_VERSION')) {
    console.error('❌ better-sqlite3 模块版本不匹配')
    console.log('\n💡 解决方案：')
    console.log('   1. 确保 Electron 应用已完全关闭')
    console.log('   2. 运行: npm rebuild better-sqlite3')
    console.log('   3. 然后重新运行此脚本')
    console.log('\n   或者：')
    console.log('   - 在应用内使用"表单配置"页面的"清空所有数据"功能')
    console.log('   - 或手动删除数据库文件后重新初始化')
    process.exit(1)
  }
  throw error
}

// 获取数据库路径
function getDbPath() {
  const platform = os.platform()
  let userDataPath
  
  if (platform === 'win32') {
    userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'air-cargo-analytics')
  } else if (platform === 'darwin') {
    userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'air-cargo-analytics')
  } else {
    userDataPath = path.join(os.homedir(), '.config', 'air-cargo-analytics')
  }
  
  return path.join(userDataPath, 'cargo_data.db')
}

const dbPath = getDbPath()

console.log('🗑️  开始清空数据库...')
console.log('数据库路径:', dbPath)

try {
  if (!require('fs').existsSync(dbPath)) {
    console.log('⚠️  数据库文件不存在，无需清空')
    process.exit(0)
  }
  
  const db = new Database(dbPath)
  
  // 禁用外键约束检查
  db.pragma('foreign_keys = OFF')
  
  // 按顺序清空表（考虑外键关系）
  const tables = [
    'cargo_records',        // 先删除数据记录（有外键约束）
    'form_configs',         // 然后删除表单配置
    'dashboard_configs',   // 大屏配置
    'ai_templates'         // AI模板
  ]
  
  let totalDeleted = 0
  
  for (const table of tables) {
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${table}`)
    const result = stmt.get()
    const count = result ? result.count : 0
    
    if (count > 0) {
      db.prepare(`DELETE FROM ${table}`).run()
      console.log(`✅ 清空表 ${table}: 删除了 ${count} 条记录`)
      totalDeleted += count
    } else {
      console.log(`ℹ️  表 ${table}: 无数据`)
    }
  }
  
  // 重置自增ID（可选）
  console.log('\n🔄 重置自增ID...')
  for (const table of tables) {
    try {
      db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table)
    } catch (e) {
      // 如果表没有使用 AUTOINCREMENT，可能会失败，忽略
    }
  }
  
  // 重新启用外键约束
  db.pragma('foreign_keys = ON')
  
  db.close()
  
  console.log('\n✅ 数据库清空完成！')
  console.log(`📊 共删除 ${totalDeleted} 条记录`)
  console.log('💡 提示：表结构已保留，可以运行 npm run init:all 重新初始化数据')
  
} catch (error) {
  console.error('\n❌ 清空数据库失败:', error.message)
  console.error('详细错误:', error)
  process.exit(1)
}

