exports.BackendApiError = function(code) {
	this.code = code;
};

exports.dictToSortedQueryStr = function(dict) {
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
