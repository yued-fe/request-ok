const CDP = require('chrome-remote-interface') // 按照这篇来尝试https://developers.google.com/web/updates/2017/04/headless-chrome 但是遇到了各种api坑 只好去翻了翻源码 修改了一部分地方
const chromeLauncher = require('lighthouse/chrome-launcher/chrome-launcher') // @@@ lighthouse是为了跨平台启动chrome 注意 这里引用路径与chrome文档上不同 文档上需要更新了 参考这儿 https://github.com/googlechrome/lighthouse/blob/HEAD/docs/readme.md#using-programmatically
const chalk = require('chalk')

const sendMail = require('../util/sendmail')
const checkPort = require('../util/port')// 检查端口占用
const {warn} = require('../util/format')// 稍微封了一下打印的东西

const {pages} = require('../config/pages')// 读取需要扫描的urls
const {headers} = require('../config/headers') // 读取需要配置的header
const launchConfig = require('../config/launch') // lauchChrome配置
const mailConfig = require('../config/mail') // mail配置 from、to之类的

// 根据源码里这里会产生一个chrome的实例(headless)
const launchChrome = async (launchConfig) => {
	// 检查是否指定了配置
	if (!launchConfig) {
		console.log('launchChrome need params: launchConfig')
		return
	}
	// 检查端口号
	let portStatus = await checkPort(launchConfig.port)
	if (portStatus !== 'closed') {
		console.log(`port ${launchConfig.port} is opened, use another one. Of course, maybe the reason of an existing headless chrome`)
		return
	}
	// 启动(为了好读就不合成一行了)
	const launcher = await chromeLauncher.launch(launchConfig)
	return launcher
}


const printDocumentTitle = async (Runtime) => {
	// 其实如果要检验404 写爬虫啥的估计就是在这个位置了吧 不知道
	const js = "document.querySelector('title').textContent"
	return await Runtime.evaluate({expression: js}).then(result => {
		return 'Title of page: ' + result.result.value
	}).catch(err => {
		console.log('fuck @printDocumentTitle')
	})
}

// 根据reqIdMap滤出有问题的请求
const filterNoResReq = (reqIdMap) => {
	let reqIdArr = Object.keys(reqIdMap)
	return reqIdArr.map(id => {
		return reqIdMap[id]
	}).filter(item => {
		return item.cnt !== 0
	})
}

const start = async () => {
	const chrome = await launchChrome(launchConfig)
	const protocol = await CDP({port: chrome.port})

	let index = 0 // 记录在扫描的page是第几个
	let end = pages.length - 1 // index可能的最大值

	let reqIdMap = {} // 用于连通req和res与page的对应关系
	let httpCount = {	// 测试用计数器
		reqSent: 0,
		resReceived: 0
	}

	let errList = [] // 最后交给sendmail的信息

	const {Page, Runtime, Network} = protocol

	// 请求发出前的事件
	Network.requestWillBeSent(params => {
		if (!/^http/.test(params.request.url)) return // 为了找出数量对不上的问题 只清算http请求 目前看到base64……
		httpCount.reqSent++ // 累加

		let {requestId, documentURL} = params
		let {url} = params.request
		console.log(chalk.red('Network.requestWillBeSent: ' + requestId + '  所属页面: ' + documentURL))

		// 记录每个请求所属page
		// 很多页面会有stat1.txt、stat2.txt等 会在无头浏览器里触发多于一次的Network.requestWillBeSent但却得不到对应的响应 为了应对重复情形故做此处理
		let isIdExist = !!reqIdMap[requestId]
		if (isIdExist) {
			reqIdMap[requestId].cnt++
		} else {
			reqIdMap[requestId] = {
				id: requestId,
				cnt: 1,
				url: url,
				page: documentURL
			}
		}
	})

	// 收到响应的事件
	Network.responseReceived(params => {
		if (!/^http/.test(params.response.url)) return // 这里就没管非http了 比如base64
		httpCount.resReceived++

		let {requestId} = params
		let {status, statusText, url, mimeType} = params.response
		let page = reqIdMap[requestId].page
		console.log(chalk.blue(status + '  Network.responseReceived: ' + requestId + '  所属页面: ' + page))

		// 核心语句 所有非200的按格式打印
		if (status !== 200) {
			warn(status, page, url)
			// todo 等转换成邮件模式后 这里应该是用来存储报警数据的
			errList.push({
				status: status,
				statusText: statusText,
				mimeType: mimeType,
				page: page,
				url: url
			}) // 按表格顺序排的
		}
		reqIdMap[requestId].cnt--
	})

	// 发生在Page那个url收到响应后 尼玛鸡肋的一逼
	Page.frameNavigated(params => {
		console.log(chalk.green('主Page响应后-Page.frameNavigated: ' + index))
	})

	// 页面加载事件 window.load触发
	Page.loadEventFired(async () => {
		console.log(chalk.magenta('Page.loadEventFired'))

		let documentTitle = await printDocumentTitle(Runtime)

		console.log(chalk.gray('当前Page的title: ' + documentTitle))

		// 为了等待所有res的ugly代码
		setTimeout(() => {
			console.log(chalk.yellow(`reqSent:${httpCount.reqSent}  resReceived:${httpCount.resReceived}`))
			let noResReqList = filterNoResReq(reqIdMap)
			let num = noResReqList.length
			console.log('多的请求： ' + chalk.yellow(num))
			console.log('数量是否对的上: ' + (num + httpCount.resReceived === httpCount.reqSent))
			console.log(noResReqList)

			// 扫描结束的地方
			if (index === end) {
				if(errList.length > 0) { // 有非200的情况下 发送邮件
					console.log('mail\'s sending...')
					sendMail(Object.assign({}, {errList: errList}, mailConfig)) // Object {errList: Array(2), from: "aaa", to: "bbb", subject: "hhh"}
				}
				protocol.close()
				chrome.kill() // Kill Chrome.
			} else {
				index++
				console.log('='.repeat(20))
				reqIdMap = {} // 清空当前page的记录
				httpCount = {	// 清空测试用计数器
					reqSent: 0,
					resReceived: 0
				}
				Page.navigate({url: pages[index]})
			}
		}, 1000)
	})

	// enable这些玩意
	await Promise.all([Network.enable(), Page.enable(), Runtime.enable()])

	// 禁用cache
	Network.setCacheDisabled({ 'cacheDisabled': true 	})
	// 设置header(也有专门的setCookie方法)
	Network.setExtraHTTPHeaders({'headers': headers})

	console.log('='.repeat(20))
	Page.navigate({url: pages[index]}) // 开始翱翔 目前index==0
}


module.exports.start = start
