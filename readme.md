# request-ok

## 简介

request-ok是一个监测程序，旨在实现对站点加载中的每一个http请求及响应的状态
进行监控，并告知订阅者当前存在问题的站点及资源信息。

这里的不同之处在于使用了Headless Chrome。Headless Chrome在Chrome59中得到支持(之前得靠Chromium)。
它为命令行提供了Chromium所支持的所有现代web平台特性和Blink渲染引擎，这样一来就可以在命令行中“无Chrome”的操作Chrome了。(翻的…)

## 依赖

[chrome dev tools](https://chromedevtools.github.io/devtools-protocol/)：
Chrome DevTools Protocol是应用、检查、调试和描述Chromium、Chrome等基于Blink的浏览器的协议。

[chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface/blob/master/README.md)：
chrome-remote-interface提供了一系列对Chrome DevTools Protocol封装的JavaScript API。

[lighthouse](https://github.com/GoogleChrome/lighthouse/tree/master/docs)：用其中的laucher来跨平台启动chrome

## 运行

> $ npm i

> 设置需要监控的urls in config/pages.js

> 设置需要发送到的邮箱 in config/mail.js

> 设置header in config/headers.js

> $ node index.js


## 布局

```
.
├── index.js      // 启动入口
├── modules/      // 封装模块
├── util/         // 工具函数
├── config/       // 配置文件

```

## 备注

1. [chrome-remote-interface的使用](./docs/2017_0614.md)

2. 暂时新加了models和app.js 请忽略。。。