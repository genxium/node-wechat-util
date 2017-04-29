'use strict';

const baseAbsPath = __dirname + '/';

const request = require('request');
const cacheManager = require('cache-manager');

const yaml = require('js-yaml');
const fs = require('fs');

const sharedLib = require(baseAbsPath + './shared');
const xmlbuilder = require('xmlbuilder');
const parseString = require('xml2js').parseString;

const WECHAT_JSAPI_ACCESS_TOKEN = 'wechatJsapiAccessToken';
const WECHAT_JSAPI_TICKET = 'wechatJsapiTicket';

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

    this.mchId = null;
    this.mchSecret = null;
    this.spbillCreateIp = null;
    this.mchApiGateway = null;

    this.callbackNotifyGateway = null;
  }

  loadConfigFileSync(ymlFilePath) {
    try {
      const config = yaml.safeLoad(fs.readFileSync(ymlFilePath, 'utf8'));
      this.apiProtocol = config.protocol;
      this.apiGateway = config.gateway;
      this.webLoginEndpoint = config.webLoginEndpoint;
      this.appId = config.appId;
      this.appSecret = config.appSecret;

      this.mchId = config.mchId;
      this.mchSecret = config.mchSecret;
      this.spbillCreateIp = config.spbillCreateIp;
      this.mchApiGateway = config.mchApiGateway;
      
      this.callbackNotifyGateway = config.callbackNotifyGateway;   
  
      this.configFilePath = ymlFilePath;
    } catch (e) {
      this.apiProtocol = null;
      this.apiGateway = null;
      this.webLoginEndpoint = null;
      this.appId = null;
      this.appSecret = null;

      this.mchId = null;
      this.mchSecret = null;
      this.spbillCreateIp = null;
      this.mchApiGateway = null;

      this.callbackNotifyGateway = null;   

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
      const url = instance.apiProtocol + '//' + instance.apiGateway + oauth2Path + '?' + sharedLib.dictToSortedAndURIEncodedQueryStr(paramDict);

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
    const url = instance.apiProtocol + '//' + instance.apiGateway + userInfoPath + '?' + sharedLib.dictToSortedAndURIEncodedQueryStr(paramDict);
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
      instance.jsApiCache.get(WECHAT_JSAPI_ACCESS_TOKEN, function(err, result) {
        if (undefined !== err && null !== err) resolve(null);
        else if (null === result || undefined === result) resolve(null);
        else resolve(result);
      });
    });
  }

  queryCachedJsApiTicketAsync() {
    const instance = this;
    return new Promise(function(resolve, reject) {
      instance.jsApiCache.get(WECHAT_JSAPI_TICKET, function(err, result) {
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
        url: instance.apiProtocol + '//' + instance.apiGateway + '/cgi-bin/token?' + sharedLib.dictToSortedAndURIEncodedQueryStr(paramDict)
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
          instance.jsApiCache.set(WECHAT_JSAPI_ACCESS_TOKEN, accessToken, {
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
        if (undefined === accessToken || null === accessToken) {
          throw new sharedLib.BackendApiError();
        }
        return new Promise(function(resolve, reject) {
          const paramDict = {
            access_token: accessToken,
            type: 'jsapi'
          };
          request({
            url: instance.apiProtocol + '//' + instance.apiGateway + '/cgi-bin/ticket/getticket?' + sharedLib.dictToSortedAndURIEncodedQueryStr(paramDict)
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
          instance.jsApiCache.set(WECHAT_JSAPI_TICKET, jsApiTicket, {
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
            url: instance.apiProtocol + '//' + instance.apiGateway + '/cgi-bin/message/custom/send?access_token=' + accessToken,
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

  _generateUnifiedOrderSignedDictSync(outTradeNo, notifyUrl, nonceStr, body, totalFeeCents, tradeType, options) {
    const instance = this;
    const toBeSignedDict = {};
    Object.assign(toBeSignedDict, {
      spbill_create_ip: instance.spbillCreateIp,
      appid: instance.appId,
      mch_id: instance.mchId,
      body: body,
      out_trade_no: outTradeNo.toString(),
      notify_url: notifyUrl.toString(),
      total_fee: totalFeeCents.toString(),
      nonce_str: nonceStr,
      trade_type: tradeType,
    });

    if (undefined !== options && null !== options) {
      Object.assign(toBeSignedDict, options);    
    }

    let toBeSignedStr = sharedLib.dictToSortedQueryStr(toBeSignedDict);
    toBeSignedStr += '&key=' + instance.mchSecret;

    const signedStr = sharedLib.md5Sign(toBeSignedStr).toUpperCase();

    const signedDict = {};
    Object.assign(signedDict, toBeSignedDict);
    Object.assign(signedDict, {
      sign: signedStr,
    });

    return signedDict;
  }

  _generateUnifiedOrderXmlStrSync(outTradeNo, notifyUrl, nonceStr, body, totalFeeCents, tradeType, options) {
    const instance = this;
    const signedDict = instance._generateUnifiedOrderSignedDictSync(outTradeNo, notifyUrl, nonceStr, body, totalFeeCents, tradeType, options);

    const wholeObj = {
      xml: signedDict,
    };
    // Reference https://github.com/oozcitak/xmlbuilder-js/wiki.
    const root = xmlbuilder.create(wholeObj, {
      headless: true,
    });

    const xmlStr = root.toString();
    return xmlStr;
  }

  _postXmlStrAsPlainTextAsync(endpoint, strData) {
    const instance = this;
    return new Promise(function(resolve, reject) {
      request.post({
        url: endpoint,
        header: {
          'Content-Type': 'text/plain'
        },
        body: strData,
      }, function(error, wxResp, respBody) {
        if (undefined !== error && null !== error) {
          throw new sharedLib.BackendApiError();
        }
        if (undefined === wxResp || null === wxResp) {
          throw new sharedLib.BackendApiError();
        }
        if (200 != wxResp.statusCode) {
          throw new sharedLib.BackendApiError();
        }
        resolve(respBody);
      });
    });
  }

  generateRespStrSyncForPaymentNotification(successfulOrNot) {
    // Reference https://github.com/oozcitak/xmlbuilder-js/wiki.
    let root = xmlbuilder.create('xml', {
      headless: true
    })
      .ele('return_code').dat((successfulOrNot ? 'SUCCESS' : 'FAIL')).up()
      .end({
        allowEmpty: true
      });
    return root.toString();
  }

  queryUnifiedOrderRespAsync(outTradeNo, notifyUrl, nonceStr, body, totalFeeCents, tradeType, options) {
    const instance = this;
    const postData = instance._generateUnifiedOrderXmlStrSync(outTradeNo, notifyUrl, nonceStr, body, totalFeeCents, tradeType, options);

    const endpoint = instance.apiProtocol + '//' + instance.mchApiGateway + '/pay/unifiedorder';
    return instance._postXmlStrAsPlainTextAsync(endpoint, postData);
  }

  xmlStr2ObjAsync(str) {
    return new Promise(function(resolve, reject) {
      parseString(str, {explicitArray: false}, function(err, result) {
        if (undefined !== err && null !== err) {
          resolve(null);
        } else if (undefined === result || null === result) {
          resolve(null);
        } else {
          resolve(result);
        }
      });
    });
  }

  verifyPaymentNotificationAsync(reqBody) {
    const instance = this;
    return instance.xmlStr2ObjAsync(reqBody)
      .then(function(result) {
        return new Promise(function(resolve, reject) {
          if (null === result) {
            resolve(false);
          } else {
            const signatureOfRequest = result.xml.sign;
            delete result.xml.sign;
            let toBeSignedStr = sharedLib.dictToSortedQueryStr(result.xml);
            toBeSignedStr += '&key=' + instance.mchSecret;
            const signatureComputed = sharedLib.md5Sign(toBeSignedStr).toUpperCase();
            resolve(signatureComputed == signatureOfRequest);
          }
        });
      });
  }
}

exports.default = BackendApiCore;
