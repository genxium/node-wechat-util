const singleton = Symbol();
const singletonEnforcer = Symbol();

const baseAbsPath = __dirname + '/';

const gen32bytes = function() {
	const s4 = function() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	};
	return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
};

const getRandomInt = function(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min;
}

const BackendApiCore = require(baseAbsPath + '../lib/BackendApiCore').default;

class BackendApiSingleton extends BackendApiCore {
  constructor(enforcer) {
    if (enforcer != singletonEnforcer) throw 'Cannot construct singleton';

		super(enforcer);
  }

  static get instance() {
    if (!this[singleton]) {
      this[singleton] = new BackendApiSingleton(singletonEnforcer);
    }
    return this[singleton];
  }
}

const instance = BackendApiSingleton.instance; 
instance.loadConfigFileSync(baseAbsPath + './configs/fserver.conf');

/* Info dict loading. */
const webLoginInfoDict = instance.queryWebLoginInfoDictSync();
console.log('The login info dictionary');
console.dir(webLoginInfoDict);
console.log('\n');

const miniServerPort = 9999;
const miniServerAsyncNotiPath = '/async-cb/v1/wechat-pubsrv/payment/notify';

const parseString = require('xml2js').parseString;

/* Mini server for async notification */
const express = require('express');
const app = express();

// Body parser middleware.
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

const notificationRouter = express.Router({mergeParams: true});
notificationRouter.post(miniServerAsyncNotiPath, function(req, res) {
  console.log(miniServerAsyncNotiPath + ' called with req.body ');
	console.dir(req.body);
    
  instance.verifyPaymentNotificationAsync(req.body)
  .then(function(trueOrFalse) {
    const respStr = instance.generateRespStrSyncForPaymentNotification(trueOrFalse); 
    console.log('Should respond with \'' + respStr + '\'');
    res.send(respStr);
  });
});
app.use('/', notificationRouter);

app.listen(miniServerPort, function () {
  console.log('Mini server listening on port ' + miniServerPort)

	/* Unified order API of `NATIVE` type. */
	const outTradeNo = gen32bytes(); 
	const notifyUrl = 'http://localhost:' + miniServerPort + miniServerAsyncNotiPath;
	const nonceStr = gen32bytes();
	const body = 'This is a testing order';
	const totalFeeCents = getRandomInt(100, 10000);
	const tradeType = 'NATIVE';
	const openId = null;
	const limitPay = null;

	instance.queryUnifiedOrderRespAsync(outTradeNo, notifyUrl, nonceStr, body, totalFeeCents, tradeType)
	.then(function(respBody) {
		parseString(respBody, function (err, result) {
			console.log('Response from payment server is');
			console.dir(result);
		});
	});
});
