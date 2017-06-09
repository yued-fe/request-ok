// 按照这篇来尝试https://developers.google.com/web/updates/2017/04/headless-chrome
// 但是遇到了各种api坑 只好去翻了翻源码 修改了一部分地方
const chrome = require('chrome-remote-interface');
// @@@ 注意 这里的路径与chrome文档上不同 文档上需要更新了
// 参考这儿 https://github.com/googlechrome/lighthouse/blob/HEAD/docs/readme.md#using-programmatically
const lighthouse = require('lighthouse');
const {Launcher} = require('lighthouse/chrome-launcher/chrome-launcher');

// 稍微封了一下打印的东西
const {red, green, warn} = require('./util/colorify')

function launchChrome(headless = true) {
  const launcher = new Launcher({
    port: 9222,
    autoSelectChrome: true, // False to manually select which Chrome install.
    additionalFlags: [
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
      return launcher
	      .kill()
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

function onRequestWillBeSent(Network) {
  return Network.setExtraHTTPHeaders({
    'headers': {
      'key': 'val'
    }
  }).then(result => {
    return result
  }).catch(err => {
    console.log(err)
  })
}


launchChrome(true).then(launcher => {
	// 下面这一段也是要根据npm上新的文档改阿西吧fuck
	// chrome.Version().then(version => console.log(version['User-Agent']));
	// chrome(function)这种会在内部调用事件触发 once只执行一次传入的回调函数
  chrome(protocol => {
  	const {Page, Runtime, Network} = protocol

  	// 这边一定要先enable才能用
  	Promise.all([
  		Network.enable(),
  		Page.enable(),
  		Runtime.enable()
		]).then(() => {
			Page.navigate({url: 'http://book.qidian.com/info/1003354632'})

			Page.loadEventFired(() => {
        onPageLoad(Runtime).then((result) => {
        	green(result)

          protocol.close();
          launcher.kill(); // Kill Chrome.
        });
      });

      // 在这里设置header todo 好像headers发生变化了……是不是应该把willbesent写在里面?
      Network.requestWillBeSent(params => {
				onRequestWillBeSent(Network).then((result) => {
          console.log(params.request.headers)
          red('fuck @onRequestWillBeSent')
        }).catch(err => {
          console.log(err)
        })
			})

			// 在这里根据响应看有无非200
			Network.responseReceived(params => {
				let row = {}
				let status = params.response.status
				let url = params.response.url
        if(status !== 200) {
          warn(status, url)
        }
				  
			})

		}).catch(err => {
			red('fuck @launchChrome(true)')
		})
  })
});












