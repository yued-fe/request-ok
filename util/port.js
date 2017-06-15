const portscanner = require('portscanner')
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

const allotPort = async (port) => {
	let freePort = port
	while (await checkPort(freePort) === 'open') {
		freePort++ // 其实这个地方会有bug吧 不过应该也不至于同时那么多任务要跑吧。。。
	}
	return freePort
}

module.exports = allotPort