const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')

console.log('Building Electron...')

// 编译TypeScript
exec('npx tsc -p electron/tsconfig.json', (error, stdout, stderr) => {
  if (error) {
    console.error(`TypeScript compilation error: ${error}`)
    return
  }
  console.log(stdout)
  console.log('Electron compiled successfully')
  
  // 复制preload.js
  const preloadPath = path.join(__dirname, '../electron/preload.ts')
  const distPreloadPath = path.join(__dirname, '../dist-electron/preload.ts')
  
  if (fs.existsSync(preloadPath)) {
    fs.copyFileSync(preloadPath, distPreloadPath)
    console.log('Preload copied')
  }
})

