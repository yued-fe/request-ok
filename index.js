// launchChrome: chrome启动器 runPage: 扫描page的方法 内部会根据URL实例化单独的page对象
const {start} = require('./promise/chrome')


start().catch(err => {
	console.log('fuck start @index.js')
})












