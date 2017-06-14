# request-ok

## structure

> index.js  入口

> modules/  模块

> util/     工具

> config/   配置

## deps

[chrome-remote-interface](https://chromedevtools.github.io/devtools-protocol/)： chrome headless 封装的api

[lighthouse](https://github.com/GoogleChrome/lighthouse/tree/master/docs)： 用其中的laucher来跨平台启动chrome

## start

> $ npm i

> set urls in config/pages.js

> set your mail in config/mail.js

> set request headers in config/headers.js

> $ node index.js

