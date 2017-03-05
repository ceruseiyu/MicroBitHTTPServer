var urlLib = require('url');

module.exports.parseURL = function(url) {
	var preParseUrl;
	if(url.substring(0, 4) != "http") {
		preParseUrl = 'http://' + url;
	} else{
		preParseUrl = url;
	}
	var urlDoc = urlLib.parse(preParseUrl);
	
	return [urlDoc.hostname, urlDoc.path.replace(/&amp;/g, '&')];
}

module.exports.parseBitly = function(httpData) {
	var wipUrl = httpData.split('\"')
	console.log("Expanded bitly url to " + wipUrl[1]);
	return wipUrl[1];
}

function getArrayData(obj, param) {
	var splitParam = param.split('[');
	var indexString = splitParam[1].substring(0, splitParam[1].length - 1);
	var array = obj[splitParam[0]];
	return array[parseInt(indexString)];g
}

module.exports.retrieveFieldData = function(obj, parseParams) {
	var newObj;
	if(parseParams.length <= 1) {
		if(parseParams[0].charAt(parseParams[0].length - 1) === ']') {
			return getArrayData(obj, parseParams[0]);
		}
		return obj[parseParams[0]];
	} else {
		newObj = obj[parseParams[0]];
		parseParams.shift();
		return retrieveFieldData(newObj, parseParams);
	}
}
