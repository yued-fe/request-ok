/**
 * 用来颜色化log的
 */
const chalk = require('chalk')

// 专门用来打印非200
module.exports.warn = (status, documentURL, url) => {
	// documentULR即当前页面 url为当前页面下的某个请求
	process.stdout.write(chalk.white.bgRed(`【${status}】`))
	process.stdout.write(chalk.red(' --> '))
	process.stdout.write(chalk.magenta(documentURL) + '\n')
	process.stdout.write(chalk.black(`请求URL为: ${url}`) + '\n')
}
