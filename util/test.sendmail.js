const sendMail = require('./sendmail')

const mayGetMailOptions = {
	to: ['gezhen_auto@163.com', '320gezhen_auto@tongji.edu.cn'], // list of receivers
	text: [
		{status: 401, url: 'http://www.qidian.com/1'},
		{status: 402, url: 'http://www.qidian.com/2'},
		{status: 403, url: 'http://www.qidian.com/3'},
		{status: 404, url: 'http://www.qidian.com/4'},
		{status: 404, url: 'http://www.qidian.com/5'},
		{status: 404, url: 'http://www.qidian.com/6'},
	]
}

sendMail(mayGetMailOptions)
