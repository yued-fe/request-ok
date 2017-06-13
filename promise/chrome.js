const chrome = require('chrome-remote-interface') // 按照这篇来尝试https://developers.google.com/web/updates/2017/04/headless-chrome 但是遇到了各种api坑 只好去翻了翻源码 修改了一部分地方

// const lighthouse = require('lighthouse')
const {Launcher} = require('lighthouse/chrome-launcher/chrome-launcher') // @@@ lighthouse是为了跨平台启动chrome 注意 这里引用路径与chrome文档上不同 文档上需要更新了 参考这儿 https://github.com/googlechrome/lighthouse/blob/HEAD/docs/readme.md#using-programmatically

// 检查端口占用
const portscanner = require('portscanner')

// 稍微封了一下打印的东西
const {red, green, warn, ok} = require('../util/colorify')

// 读取需要扫描的urls
const {urls} = require('../config/urls')

// 读取需要配置的header
const {headers} = require('../config/headers')

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
	// 检查是否指定了配置 如无 则采用文件中的默认配置
	if (!launchConfig) {
		console.log('launchChrome need params:launchConfig')
		return
		// launchConfig = require('../config/launch')
	}
	// 检查端口号
	let portStatus = await checkPort(launchConfig.port)
	if (portStatus !== 'closed') {
		console.log(`port ${launchConfig.port} is opened, use another one`)
		return
	}
	// 启动
	const launcher = new Launcher(launchConfig)
	// 这个地方launcher.run已经取消 改为launch
	// 要是没启动可能是端口占用了lsof -i tcp:9222看看 如果是就kill那个pid
	return launcher.launch()
		.then(() => launcher)
		.catch(err => {
			return launcher.kill()
				.then((err) => { // Kill Chrome if there's an error.
					throw err;
				});
		});
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

const runPage = (launcher) => {
	// 下面这一段也是要根据npm上新的文档改阿西吧fuck
	// chrome.Version().then(version => console.log(version['User-Agent']));
	// chrome(function)这种会在内部调用事件触发 once只执行一次传入的回调函数
	chrome(protocol => {
		let index = 0
		let curPage = ''// 用来把同一个url下的所有请求归到一起
		let visitDict = {} // 总感觉这会是个万恶之源
		let reqIdMap = {} // 这个也是
		// 测试用计数器
		let count = {}

		const length = urls.length

		const {Page, Runtime, Network} = protocol
		// 页面加载事件 页面加载好了之后才会触发……
		Page.loadEventFired(() => {
			// console.log(chalk.magenta('Page.loadEventFired'))
			onPageLoad(Runtime).then((result) => {
				// green(result)
				// 为了等待所有res的ugly代码
				setTimeout(()=>{
					protocol.close()
					launcher.kill() // Kill Chrome.
				},10000)
			})
		})

		// 在这里设置header
		Network.setExtraHTTPHeaders({
			'headers': headers // config/headers.js配置
		}).then(result => {
			// 请求发出前的事件
			Network.requestWillBeSent(params => {
				// console.log(chalk.red('Network.requestWillBeSent: ' + params.requestId + '  ' + params.documentURL))
				// 记录每个请求所属page
				reqIdMap[params.requestId] = params.documentURL

				count[params.documentURL] ? (count[params.documentURL]++) : (count[params.documentURL] = 1)
				// green(params.request.headers.key)
				// 请求发出前的加工
				// green(params.request.headers['MyKey']) // 可以看出setExtraHTTPHeaders是有用的
			})
		}).catch(err => {
			console.log(err)
		})

		// 收到响应的事件
		Network.responseReceived(params => {
			// console.log(chalk.blue('Network.responseReceived: ' + params.requestId + '   ' + reqIdMap[params.requestId]))
			// console.log(count)

			let page = reqIdMap[params.requestId]
			count[page]--
			if (count[page] === 0) delete count[page]
			let requestId = params.requestId
			let {status, url} = params.response
			// console.log(url)
			if (!(/^http/.test(url))) return

			if (status !== 200) {
				warn(status, reqIdMap[requestId], url)
			}
		})

		// navigate结束的事件 它发生在一个url所有的请求都发出去后……
		Page.frameNavigated(params => {
			// console.log(chalk.green('Page.frameNavigated' + ' ' + index))

			let {url, id} = params.frame
			// 会有不是http请求的东西 过滤掉
			if (!(/^http/.test(url))) return
			index++
			if (index < length) {
				curPage = urls[index] // 更新curPage
				visitDict[curPage] = [] // 更新dict

				return Page.navigate({url: urls[index]})
			}
		})

		Promise.all([
			Network.enable(),
			Page.enable(),
			Runtime.enable()
		]).then(() => {
			if (index < length) {
				curPage = urls[index] // 应该是第一次urls[0]
				visitDict[curPage] = []

				return Page.navigate({url: urls[index]})
			}
		}).catch((err) => {
			console.error(err)
			protocol.close()
		});

	})
}


module.exports.launchChrome = launchChrome
module.exports.runPage = runPage
