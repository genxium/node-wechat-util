const sha1 = require('crypto-js/sha1');
const md5 = require('crypto-js/md5');

exports.BackendApiError = function (code) {
	this.code = code;
};

exports.sha1Sign = function (seed) {
	return sha1(seed.toString()).toString();
};

exports.md5Sign = function (seed) {
	return md5(seed.toString()).toString();
}

exports.dictToSortedQueryStr = function (dict, shouldIgnoreEmpty) {
	let keys = Object.keys(dict);
	keys.sort();
	let paramList = [];
	for (let idx = 0; idx < keys.length; ++idx) {
		const k = keys[idx];
		const v = dict[k];
    if ("" == v && true == shouldIgnoreEmpty) continue;
		paramList.push(k + "=" + v);
	}
	return paramList.join('&');
};

exports.dictToSortedAndURIEncodedQueryStr = function (dict) {
	let keys = Object.keys(dict);
	keys.sort();
	let paramList = [];
	for (let idx = 0; idx < keys.length; ++idx) {
		const k = keys[idx];
		const v = dict[k];
		paramList.push(k + "=" + encodeURIComponent(v));
	}
	return paramList.join('&');
};
exports.getQueryParamsFromURLStr = function(url) {
    var theParams = new Object();
    if (url.indexOf("?") != -1) {
        var str = url.substr(1);
        strs = str.split("&");
        for(var i = 0; i < strs.length; i ++) {
            theParams[strs[i].split("=")[0]] = unescape(strs[i].split("=")[1]);
        }
    }
    return theParams;
}

