const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')

/******* 添加数据库模型 *******/
let db = 'mongodb://localhost/request-ok'
mongoose.Promise = global.Promise
mongoose.connect(db)

// 递归读取所以模型 (先不放进util了 晚些再说)
let models_path = `${__dirname}/models`
let walk = (modelPath) => {
	fs
		.readdirSync(modelPath)
		.forEach((file) => {
			let filePath = `${modelPath}/${file}`
			let stat = fs.statSync(filePath)
			if (stat.isFile()) {
				if (/(.*)\.(js|coffee)/.test(file)) {
					require(filePath)
				} else if (stat.isDirectory()) {
					walk(filePath)
				}
			}
		})
}

walk(models_path) // 其实现在只有一个Inspect 对应于一个page的信息

/******* 启动服务 *******/
const Koa = require('koa')
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')

const app = new Koa()

// 中间件
app.use(logger())
app.use(bodyParser())

// 启动
app.listen(1234)
console.log('listening on port 1234')