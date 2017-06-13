/**
 * 用来封装发邮件api的
 */

const nodemailer = require('nodemailer');

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
	host: 'smtp.qq.com',
	port: 465,
	secure: true, // secure:true for port 465, secure:false for port 587
	auth: {
		user: '459743905@qq.com', // 如想使用个人账户 可
		pass: 'fkutksllqgdpbjdb' // 在qq邮箱里 设置-账户-开启POP3/SMTP获取这串pass
	}
});

// 默认的参数
const defaultMailOptions = {
	from: '"ReqOk监控报告" <459743905@qq.com>', // sender address 这个就写死吧
	to: 'gezhen_auto@163.com', // list of receivers 其实应该删掉 这应该是用户自己配置的
	subject: '请确认本次监控的结果', // Subject line
	text: 'This is a mail from ReqOk, but if you see this, there might be something wrong with configs or codes. Check it for a while.', // plain text body
	html: '<b>This is a mail from ReqOk, but if you see this, there might be something wrong with configs or codes. Check it for a while.</b>' // html body
}

// 模拟输入的参数 测试好了可以删掉
const mayGetMailOptions = {
	to: ['gezhen_auto@163.com', '320gezhen_auto@tongji.edu.cn'], // list of receivers
	text: [
		{status: 401, url: 'www.qidian.com/1'},
		{status: 402, url: 'www.qidian.com/2'},
		{status: 403, url: 'www.qidian.com/3'},
		{status: 404, url: 'www.qidian.com/4'},
		{status: 404, url: 'www.qidian.com/5'},
		{status: 404, url: 'www.qidian.com/6'},
	]
}

function createOptions(originOptions) {
	let options
	if (originOptions) {
		newOptions = {}
		originOptions.to && (newOptions.to = originOptions.to.join(', '))
		originOptions.text && (newOptions.text = createText(originOptions.text))
		originOptions.text && (newOptions.html = createHtml(originOptions.text))
		options = Object.assign({}, defaultMailOptions, newOptions)
	} else {
		options = defaultMailOptions
	}
	return options
}

function createText(text) {
	if (typeof text === undefined) {
		throw Error('options.text is undefined')
	}
	let str = ''
	for (let item of text) {
		str += `${item.status} --- ${item.url}\n`
	}
	return str
}

function createHtml(textArr) {
	// 打个表格吧
	let headArr
	if (textArr.length !== 0) {
		headArr = Object.keys(textArr[0]) // ['status', 'url']这样
	}
	let head = headArr.map(head => `<th>${head}</th>`).join('')

	let body = textArr.map((item, index, arr) => {
		let tds = headArr.map(head => {
			return `<td>${item[head]}</td>` // 算了不加a标签了
		}).join('') // '<td>404</td><td>www.qidian.com/1</td>' 这样
		let row = `<tr>${tds}</tr>`
		return row
	}).join('') // '<tr>...</tr><tr>...</tr>'这样
	let table = `<table border="1">${head}${body}</table>`
	return table
}

// console.log(createHtml(mayGetMailOptions.text))

// 只暴露一个发邮件接口好了
module.exports = function (options) {
	/**
	 * options: {
	 *   name: 'your name',
	 *   from: 'your mail address', // 这里会把name和from拼接起来交给sendMail函数实际的options
	 *   to: ['where to send'], // 这里改成数组 join(',')之后再交给sendMail
	 *   subject: '这里给个默认然后assign一下好了', // 邮件的主题
	 *   text: [{'key:val'}] // 这里可能需要一些模板字符串生成一哈 传入有问题的url对象数组
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