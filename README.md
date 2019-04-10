This repository is built with a sandbox testing idea in mind. It's assumed to be running on an Ubuntu 14.04 LTS operating system with NodeJs 6.x runtime. Please install the mentioned components by [the script(s) here](https://github.com/genxium/Ubuntu14InitScripts/tree/master/backend/node).   

To test in a sandbox, please start an [WeChat sandbox/fserver](https://bitbucket.org/Roowe/fserver-go) daemon beforehand. 

```
shell@proj-root> npm install
shell@proj-root> ./examples/overwrite_configs 
shell@proj-root> node ./examples/singleton.js
```
支付订单流程 examples/singleton.js
  1.请求生成订单 instance.queryUnifiedOrderRespAsync(...) 
  2.支付订单（手动结算） instance.payUnifiedOrder({codeUrl from queryUnifiedOrderRespAsyncResp }, {intendedResultCode}, {intended_err_code})
  3.收到支付订单通知(由支付平台回调) 由notificationRouter监听
