module.exports = {
	port: 9222,
	autoSelectChrome: true, // False to manually select which Chrome install.
	chromeFlags: [ // 这里的参数也是看源码改的!WORIGUGEDEWENDANG!!!
		'--disable-gpu', // 为了避免现版本的bug
		'--headless'
	]
}