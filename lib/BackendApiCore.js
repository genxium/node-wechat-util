const baseAbsPath = __dirname + '/';

const request = require('request');
const cacheManager = require('cache-manager');

const yaml = require('js-yaml');
const fs = require('fs');

const sharedLib = require(baseAbsPath + './shared');

class BackendApiCore {
  constructor(props) {
    this.jsApiCache = cacheManager.caching({
      store: 'memory',
      max: 1024
    });

		this.configFilePath = null;
		this.apiProtocol = null;
		this.apiGateway = null;
		this.webLoginEndpoint = null;
		this.appId = null;
		this.appSecret = null;
  }

	loadConfigFileSync(ymlFilePath) {
    try {
      const config = yaml.safeLoad(fs.readFileSync(ymlFilePath, 'utf8'));
      this.apiProtocol = config.protocol;
      this.apiGateway = config.gateway;
      this.webLoginEndpoint = config.webLoginEndpoint;
      this.appId = config.appId;
      this.appSecret = config.appSecret;

			this.configFilePath = ymlFilePath;
    } catch (e) {
			this.apiProtocol = null;
			this.apiGateway = null;
			this.webLoginEndpoint = null;
			this.appId = null;
			this.appSecret = null;

			this.configFilePath = null;
    }
	}

  queryWebLoginInfoDictSync() {
    const instance = this;
    return {
      protocol: instance.apiProtocol,
      endpoint: instance.webLoginEndpoint,
      appId: instance.appId,
    };
  }

  queryOauth2BasicAsync(authcode) {
    const instance = this;
    return new Promise(function(resolve, reject) {
      const paramDict = {
        appid: instance.appId,
        secret: instance.appSecret,
        code: authcode,
        grant_type: 'authorization_code'
      };
      const oauth2Path = '/sns/oauth2/access_token';
      const url = instance.apiProtocol + '//' + instance.apiGateway + oauth2Path + '?' + sharedLib.dictToSortedQueryStr(paramDict);
      
      request({
        url: url
      }, function(error, wxResp, body) {
        if (null !== error) {
          resolve(null);
          return;
        }
        if (undefined === wxResp || null === wxResp) {
          resolve(null);
          return;
        }
        if (200 != wxResp.statusCode) {
          resolve(null);
          return;
        }
        resolve(JSON.parse(body));
      });
    });
  }

  queryMoreInfoAsync(accessToken, openid) {
    const instance = this;
    const userInfoPath = '/sns/userinfo';
    const paramDict = {
      access_token: accessToken,
      openid: openid,
      appid: instance.appId,
    };
    const url = instance.apiProtocol + '//' + instance.apiGateway + userInfoPath + '?' + sharedLib.dictToSortedQueryStr(paramDict);
    return new Promise(function(resolve, reject) {
      request({
        url: url
      }, function(error, wxResp, body) {
        if (null !== error) {
          resolve(null);
          return;
        }
        if (undefined === wxResp || null === wxResp) {
          resolve(null);
          return;
        }
        if (200 != wxResp.statusCode) {
          resolve(null);
          return;
        }
        resolve(JSON.parse(body));
      });
    });
  }

  queryCachedJsApiAccessTokenAsync() {
    const instance = this;
    return new Promise(function(resolve, reject) {
      instance.jsApiCache.get(constants.WECHAT_JSAPI_ACCESS_TOKEN, function(err, result) {
        if (undefined !== err && null !== err) resolve(null);
        else if (null === result || undefined === result) resolve(null);
        else resolve(result);
      });
    });
  }

  queryCachedJsApiTicketAsync() {
    const instance = this;
    return new Promise(function(resolve, reject) {
      instance.jsApiCache.get(constants.WECHAT_JSAPI_TICKET, function(err, result) {
        if (undefined !== err && null !== err) resolve(null);
        else if (null === result || undefined === result) resolve(null);
        else resolve(result);
      });
    });
  }

  queryJsApiAccessTokenAsync() {
    const instance = this;
    return new Promise(function(resolve, reject) {
      const paramDict = {
        appid: instance.appId,
        grant_type: 'client_credential',
        secret: instance.appSecret
      };
      request({
        url: instance.protocol + '//' + instance.apiGateway + '/cgi-bin/token?' + sharedLib.dictToSortedQueryStr(paramDict)
      }, function(error, wxResp, body) {
        if (undefined !== error && null !== error) {
          resolve(null);
          return;
        }
        ;
        if (undefined === wxResp || null === wxResp) {
          resolve(null);
          return;
        }
        if (200 != wxResp.statusCode) {
          resolve(null);
          return;
        }
        let tmp = null;
        try {
          tmp = JSON.parse(body);
        } catch (e) {
          tmp = null;
        }
        resolve(tmp);
      });
    })
      .then(function(tmp) {
        if (null === tmp || undefined === tmp) {
          throw new sharedLib.BackendApiError();
        }
        return new Promise(function(resolve, reject) {
          const accessToken = tmp.access_token;
          const ttlSecs = parseInt(tmp.expires_in);
          instance.jsApiCache.set(constants.WECHAT_JSAPI_ACCESS_TOKEN, accessToken, {
            ttl: ttlSecs
          }, function(err) {
            if (undefined !== err && null !== err) {
              throw new sharedLib.BackendApiError();
            }
            resolve(accessToken);
          });
        });
      })
      .catch(function(err) {
        return new Promise(function(resolve, reject) {
          resolve(null);
        });
      })
  }

  queryJsApiTicketAsync() {
    const instance = this;
    return instance.queryCachedJsApiAccessTokenAsync()
      .then(function(cachedAccessToken) {
        if (undefined !== cachedAccessToken && null !== cachedAccessToken) {
          return new Promise(function(resolve, reject) {
            resolve(cachedAccessToken);
          });
        } else {
          return instance.queryJsApiAccessTokenAsync();
        }
      })
      .then(function(accessToken) {
        if (undefined === accessToken || null === accessToken)
          throw new sharedLib.BackendApiError();
        return new Promise(function(resolve, reject) {
          const paramDict = {
            access_token: accessToken,
            type: 'jsapi'
          };
          request({
            url: instance.protocol + '//' + instance.apiGateway + '/cgi-bin/ticket/getticket?' + sharedLib.dictToSortedQueryStr(paramDict)
          }, function(error, wxResp, body) {
            if (undefined !== error && null !== error) {
              throw new sharedLib.BackendApiError();
            }
            if (undefined === wxResp || null === wxResp) {
              throw new sharedLib.BackendApiError();
            }
            if (200 != wxResp.statusCode) {
              throw new sharedLib.BackendApiError();
            }
            const tmp = JSON.parse(body);
            resolve(tmp);
          });
        });
      })
      .then(function(tmp) {
        if (null === tmp || undefined === tmp) {
					throw new sharedLib.BackendApiError();
				}
        const jsApiTicket = tmp.ticket;
        const ttlSecs = parseInt(tmp.expires_in);
        return new Promise(function(resolve, reject) {
          instance.jsApiCache.set(constants.WECHAT_JSAPI_TICKET, jsApiTicket, {
            ttl: ttlSecs
          }, function(err) {
            if (undefined !== err && null !== err) {
							throw new sharedLib.BackendApiError();
						}
            resolve(jsApiTicket);
          });
        });
      });
  }

  sendMessageToSinglePubsrvSubscriberAsync(openid, textMessage) {
    // Reference https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421140547&token=&lang=zh_CN
    const instance = this;
    return instance.queryCachedJsApiAccessTokenAsync()
      .then(function(cachedAccessToken) {
        if (null != cachedAccessToken && undefined != cachedAccessToken) {
          return new Promise(function(resolve, reject) {
            resolve(cachedAccessToken);
          });
        } else {
          return instance.queryJsApiAccessTokenAsync();
        }
      })
      .then(function(accessToken) {
        if (null === accessToken || undefined === accessToken) {
          throw new sharedLib.BackendApiError();
				}
        const toPostObject = {
          'touser': openid,
          'msgtype': 'text',
          'text': {
            'content': textMessage
          }
        };
        const toPostStr = JSON.stringify(toPostObject);
        return new Promise(function(resolve, reject) {
          request.post({
            url: instance.protocol + '//' + instance.apiGateway + '/cgi-bin/message/custom/send?access_token=' + accessToken,
            form: toPostStr,
          }, function(error, wxResp, body) {
            if (undefined !== error && null !== error) {
          		throw new sharedLib.BackendApiError();
            }
            if (undefined === wxResp || null === wxResp) {
          		throw new sharedLib.BackendApiError();
            }
            if (200 != wxResp.statusCode) {
          		throw new sharedLib.BackendApiError();
            }
            resolve(true);
          });
        });
      });
  }
}

exports.default = BackendApiCore;
