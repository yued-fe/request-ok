/**
 * 用来封装发邮件api的
 */

const nodemailer = require('nodemailer')

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
	host: 'smtp.qq.com',
	port: 465,
	secure: true, // secure:true for port 465, secure:false for port 587
	auth: {
		user: '459743905@qq.com', // 如想使用个人账户 可
		pass: 'fkutksllqgdpbjdb' // 在qq邮箱里 设置-账户-开启POP3/SMTP获取这串pass
	}
})

// 默认的参数
const defaultMailOptions = {
	from: '"ReqOk监控报告" <459743905@qq.com>', // sender address 这个就写死吧
	to: 'gezhen_auto@163.com', // list of receivers 其实应该删掉 这应该是用户自己配置的
	subject: '请确认本次监控的结果', // Subject line
	text: 'This is a mail from ReqOk, but if you see this, there might be something wrong with configs or codes. Check it for a while.', // plain text body
	html: '<b>This is a mail from ReqOk, but if you see this, there might be something wrong with configs or codes. Check it for a while.</b>' // html body
}

const createOptions = (originOptions) => {
	let options
	if (originOptions) {
		newOptions = {}
		originOptions.from && (newOptions.from = originOptions.from)
		originOptions.to && (newOptions.to = originOptions.to.join(', '))
		originOptions.subject && (newOptions.subject = originOptions.subject)
		originOptions.errList && (newOptions.text = createText(originOptions.errList))
		originOptions.errList && (newOptions.html = createHtml(originOptions.errList))
		options = Object.assign({}, defaultMailOptions, newOptions)
	} else {
		options = defaultMailOptions
	}
	return options
}

const createText = (errList) => {
	if (typeof errList === undefined) {
		throw Error('options.errList is undefined')
	}
	let str = ''
	for (let err of errList) {
		str += `${err.status} --- ${err.page} --- ${err.url}\n`
	}
	return str
}

const createHtml = (errList) => {
	let time = `<div>发送时间：${new Date()}</div>`
	// 打个表格吧
	let headArr
	if (errList.length >= 0) {
		headArr = Object.keys(errList[0]) // ['status', 'url']这样
	}
	let head = headArr.map(head => `<th>${head}</th>`).join('')

	let body = errList.map((item, index, arr) => {
		let tds = headArr.map(head => {
			return `<td>${item[head]}</td>` // 算了不加a标签了
		}).join('') // '<td>404</td><td>www.qidian.com/1</td>' 这样
		let row = `<tr>${tds}</tr>`
		return row
	}).join('') // '<tr>...</tr><tr>...</tr>'这样
	let table = `${time}<table border="1">${head}${body}</table>`
	return table
}

// console.log(createHtml(mayGetMailOptions.errList))

// 只暴露一个发邮件接口好了
module.exports = (options) => {
	/**
	 * options: {
	 *   name: 'your name',
	 *   from: 'your mail address', // 这里会把name和from拼接起来交给sendMail函数实际的options
	 *   to: ['where to send'], // 这里改成数组 join(',')之后再交给sendMail
	 *   subject: '这里给个默认然后assign一下好了', // 邮件的主题
	 *   errList: [{'key:val'}] // 这里可能需要一些模板字符串生成一哈 传入有问题的url对象数组
	 * }
	 * */

		// send mail with defined transport object
	let mailOptions = createOptions(options)
	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			return console.log(error);
		}
		console.log('Message %s sent: %s', info.messageId, info.response);
	})
}