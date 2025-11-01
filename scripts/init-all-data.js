// 一键初始化所有数据
console.log('🚀 开始初始化航空货运数据...\n')

const { spawn } = require('child_process')
const path = require('path')

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n📝 运行: ${scriptName}...`)
    const child = spawn('node', [path.join(__dirname, scriptName)], {
      stdio: 'inherit',
      shell: true
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${scriptName} exited with code ${code}`))
      }
    })
    
    child.on('error', (error) => {
      reject(error)
    })
  })
}

async function initAll() {
  try {
    // 1. 创建表单配置
    await runScript('init-sample-forms.js')
    
    // 2. 生成模拟数据
    await runScript('generate-sample-data.js')
    
    console.log('\n\n✅ 所有数据初始化完成！')
    console.log('现在可以运行 npm run dev 启动应用了')
  } catch (error) {
    console.error('\n❌ 初始化失败:', error.message)
    process.exit(1)
  }
}

initAll()

