const fs = require('fs')
const path = require('path')

// 复制preload.ts编译后的文件
const preloadJs = path.join(__dirname, '../dist-electron/preload.js')
if (!fs.existsSync(preloadJs)) {
  console.log('Warning: preload.js not found')
} else {
  console.log('Preload compiled successfully')
}

