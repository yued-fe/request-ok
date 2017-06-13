const CDP = require('chrome-remote-interface') // 按照这篇来尝试https://developers.google.com/web/updates/2017/04/headless-chrome 但是遇到了各种api坑 只好去翻了翻源码 修改了一部分地方

// const lighthouse = require('lighthouse')
const chromeLauncher = require('lighthouse/chrome-launcher/chrome-launcher') // @@@ lighthouse是为了跨平台启动chrome 注意 这里引用路径与chrome文档上不同 文档上需要更新了 参考这儿 https://github.com/googlechrome/lighthouse/blob/HEAD/docs/readme.md#using-programmatically

// 检查端口占用
const portscanner = require('portscanner')

// 稍微封了一下打印的东西
const {red, green, warn, ok} = require('../util/colorify')

// 读取需要扫描的urls
const {pages} = require('../config/pages')

// 读取需要配置的header
const {headers} = require('../config/headers')

// lauch配置
const launchConfig = require('../config/launch')

const chalk = require('chalk')

// 检查端口占用的promise
const checkPort = (port) => {
	return new Promise((resolve, reject) => {
		try {
			portscanner.checkPortStatus(port, '127.0.0.1', (error, status) => {
				resolve(status)
			})
		} catch (err) {
			reject(err)
		}
	}).then(status => status)
}

// 根据源码里这里会产生一个chrome的实例(headless)
const launchChrome = async (launchConfig) => {
	// 检查是否指定了配置
	if (!launchConfig) {
		console.log('launchChrome need params:launchConfig')
		return
	}
	// 检查端口号
	let portStatus = await checkPort(launchConfig.port)
	if (portStatus !== 'closed') {
		console.log(`port ${launchConfig.port} is opened, use another one. Of course, maybe the reason of an existing headless chrome`)
		return
	}
	// 启动
	const launcher = await chromeLauncher.launch(launchConfig)
	return launcher
}


const onPageLoad = (Runtime) => {
	// 其实如果要检验404 写爬虫啥的估计就是在这个位置了吧 不知道
	const js = "document.querySelector('title').textContent"

	return Runtime.evaluate({expression: js}).then(result => {
		return 'Title of page: ' + result.result.value
	}).catch(err => {
		console.log('fuck @onPageLoad')
	})
}

const start = async () => {
	const chrome = await launchChrome(launchConfig)
	const protocol = await CDP({port: chrome.port})


	let index = 0
	let end = pages.length - 1

	let curPage = ''// 用来把同一个url下的所有请求归到一起
	let visitDict = {} // 总感觉这会是个万恶之源
	let reqIdMap = {} // 这个也是
	// 测试用计数器
	let httpCount = {
		reqSent: 0,
		resReceived: 0
	}

	const {Page, Runtime, Network} = protocol
	// 页面加载事件 页面加载好了之后才会触发……
	Page.loadEventFired(() => {
		console.log(chalk.magenta('Page.loadEventFired'))
		onPageLoad(Runtime).then((result) => {
			console.log(chalk.gray('onPageLoad in Page.loadEventFired'))

			// 为了等待所有res的ugly代码
			setTimeout(() => {
				console.log(chalk.yellow(`reqSent:${httpCount.reqSent}  resReceived:${httpCount.resReceived}`))
				let num = Object.keys(reqIdMap).length
				console.log('多的请求： ' + chalk.yellow(num))
				console.log('数量是否对的上: ' + (num + httpCount.resReceived === httpCount.reqSent))
				console.log(reqIdMap)

				if (index === end) {
					protocol.close()
					chrome.kill() // Kill Chrome.
				} else {
					index++
					Page.navigate({url: pages[index]})
				}


			}, 3000)
		})
	})

	// 在这里设置header
	Network.setExtraHTTPHeaders({
		'headers': headers // config/headers.js配置
	}).then(result => {
		// 请求发出前的事件
		Network.requestWillBeSent(params => {
			if (!/^http/.test(params.request.url)) return // 为了找出数量对不上的问题 目前看到base64……

			httpCount.reqSent++
			console.log(chalk.red('Network.requestWillBeSent: ' + params.requestId + '  ' + params.documentURL))
			// 记录每个请求所属page
			if (reqIdMap[params.requestId]) {
				reqIdMap[params.requestId + '*'] = {
					url: params.request.url,
					page: params.documentURL
				}
			} else {
				reqIdMap[params.requestId] = {
					url: params.request.url,
					page: params.documentURL
				}
			}

			// green(params.request.headers.key)
			// 请求发出前的加工
			// green(params.request.headers['MyKey']) // 可以看出setExtraHTTPHeaders是有用的
		})
	}).catch(err => {
		console.log(err)
	})

	// 收到响应的事件
	Network.responseReceived(params => {
		httpCount.resReceived++
		if (!reqIdMap[params.requestId]) {
			console.log(chalk.red(params.response.url))
			return
		}
		console.log(chalk.blue('Network.responseReceived: ' + params.requestId + '   ' + reqIdMap[params.requestId].page))
		let page = reqIdMap[params.requestId].page

		let requestId = params.requestId
		let {status, url} = params.response
		// console.log(url)
		if (!(/^http/.test(url))) return

		if (status !== 200) {
			warn(status, reqIdMap[requestId].page, url)
		}
		// todo
		delete reqIdMap[requestId]
	})

	// navigate结束的事件 发生在Page那个url收到响应后 尼玛鸡肋的一逼……
	Page.frameNavigated(params => {
		console.log(chalk.green('Page.frameNavigated' + ' ' + index))
	})

	Promise.all([
		Network.enable(),
		Page.enable(),
		Runtime.enable()
	]).then(() => {
		if (index < end + 1) {
			curPage = pages[index] // 应该是第一次urls[0]
			visitDict[curPage] = []

			Page.navigate({url: pages[index]})
		}
	}).catch((err) => {
		console.error(err)
		protocol.close()
	});

}


module.exports.start = start
