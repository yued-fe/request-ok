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

module.exports = checkPort