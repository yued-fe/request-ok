// 按照这篇来尝试https://developers.google.com/web/updates/2017/04/headless-chrome
// 但是遇到了各种api坑 只好去翻了翻源码 修改了一部分地方
const chrome = require('chrome-remote-interface');
// @@@ 注意 这里的路径与chrome文档上不同 文档上需要更新了
// 参考这儿 https://github.com/googlechrome/lighthouse/blob/HEAD/docs/readme.md#using-programmatically
const lighthouse = require('lighthouse');
const {Launcher} = require('lighthouse/chrome-launcher/chrome-launcher');

// 稍微封了一下打印的东西
const {red, green, warn, ok} = require('./util/colorify')

// 读取需要扫描的urls
const {urls} = require('./config/urls')

// 读取需要配置的header
const {headers} = require('./config/headers')

const chalk = require('chalk')

function launchChrome(headless = true) {
	const launcher = new Launcher({
		port: 9222,
		autoSelectChrome: true, // False to manually select which Chrome install.
		chromeFlags: [ // 这里的参数也是看源码改的!WORIGUGEDEWENDANG!!!
			'--window-size=412,732',
			'--disable-gpu', // 为了避免现版本的bug
			headless ? '--headless' : ''
		]
	});
	// 这个地方launcher.run已经取消 改为launch
	return launcher.launch()
		.then(() => {
			// 要是没启动可能是端口占用了lsof -i tcp:9222看看 如果是就kill那个pid
			return launcher
		})
		.catch(err => {
			return launcher.kill()
				.then((err) => { // Kill Chrome if there's an error.
					throw err;
				});
		});
}

function onPageLoad(Runtime) {
	// 其实如果要检验404 写爬虫啥的估计就是在这个位置了吧 不知道
	const js = "document.querySelector('title').textContent"

	return Runtime.evaluate({expression: js}).then(result => {
		return 'Title of page: ' + result.result.value
	}).catch(err => {
		red('fuck @onPageLoad')
	})
}


launchChrome(true).then(launcher => {
	// 下面这一段也是要根据npm上新的文档改阿西吧fuck
	// chrome.Version().then(version => console.log(version['User-Agent']));
	// chrome(function)这种会在内部调用事件触发 once只执行一次传入的回调函数
	chrome(protocol => {
		let index = 0
		let curPage // 用来把同一个url下的所有请求归到一起
		let curId // 标识Page 只不过是用id的形式

		const length = urls.length

		const {Page, Runtime, Network} = protocol
		// 页面加载事件
		Page.loadEventFired(() => {
			console.log(chalk.blue('Page.loadEventFired'))

			onPageLoad(Runtime).then((result) => {
				green(result)

				protocol.close()
				launcher.kill() // Kill Chrome.
			})
		})

		// 在这里设置header
		Network.setExtraHTTPHeaders({
			'headers': headers // config/headers.js配置
		}).then(result => {
			// 请求发出前的事件
			Network.requestWillBeSent(params => {
				// green(params.request.headers.key)
				// 请求发出前的加工
				// green(params.request.headers['MyKey']) // 可以看出setExtraHTTPHeaders是有用的
			})
		}).catch(err => {
			console.log(err)
		})

		// 收到响应的事件
		Network.responseReceived(params => {
			// todo 通过打印可以看出 该事件也是异步的 那么这些个对index的打印也都是异步的 也就是说 因为index全局所以闭包了…
			console.log(chalk.blue('Network.responseReceived' + ' ' + index))
			let row = {}
			let frameId = params.frameId
			let {status, url} = params.response
			if (!(/^http/.test(url))) return
			console.log('-'.repeat(20))
			// console.log(frameId)
			// console.log(url)
			if (status === 404) {
				warn(status, urls[index])
			}
		})

		// navigate结束的事件
		Page.frameNavigated(params => {
			console.log(chalk.blue('Page.frameNavigated' + ' ' + index))

			let {url, id} = params.frame
			// 会有不是http请求的东西 过滤掉
			if (!(/^http/.test(url))) return
			index++
			if (index < length) return Page.navigate({url: urls[index]})
		})

		Promise.all([
			Network.enable(),
			Page.enable(),
			Runtime.enable()
		]).then(() => {
			console.log(chalk.blue('Promise.all'))
			if (index < length) {
				curPage = urls[index] // 应该是第一次urls[0]
				return Page.navigate({url: urls[index]})
			}
		}).catch((err) => {
			console.error(err)
			protocol.close()
		});

	})
}).catch(err => {
	red('fuck @launchChrome(true)')
})












