const chalk = require('chalk')

module.exports.green = function (str) {
	console.log(chalk.green(str))
}

module.exports.red = function (str) {
	console.log(chalk.red(str))
}

// 专门用来打印非200
module.exports.warn = function (status, url) {
	process.stdout.write(chalk.white.bgRed(status))
	process.stdout.write(chalk.red(' --> '))
	process.stdout.write(chalk.red(url) + '\n')
}
// 专门用来打印200
module.exports.ok = function (status, url) {
	process.stdout.write(chalk.white.bgGreen(status))
	process.stdout.write(chalk.green(' --> '))
	process.stdout.write(chalk.green(url) + '\n')
}