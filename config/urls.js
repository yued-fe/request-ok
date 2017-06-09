let begin = 1006459590
let urls = []
for (let i = 0; i < 10; i++) {
	urls.push(begin++)
}
urls = urls.map(num => {
	return 'http://book.qidian.com/info/' + num
})

module.exports = {
	urls: urls
}