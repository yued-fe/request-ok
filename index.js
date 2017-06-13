// launchChrome: chrome启动器 runPage: 扫描page的方法 内部会根据URL实例化单独的page对象
const {launchChrome, runPage} = require('./promise/chrome')
// lauch配置
const launchConfig = require('./config/launch')

launchChrome(launchConfig)
	.then(runPage).catch(err => {
	console.log('fuck launchChrome @index.js')
})












