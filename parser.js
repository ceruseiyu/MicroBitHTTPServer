var urlLib = require('url');

//Splits a URL into the hostname and path.
//It also unescapes escaped ampersands that would otherwise break requests
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

//Takes the raw data of a bit.ly page after a HTTP request to it
// and returns the stored URL
module.exports.parseBitly = function(httpData) {
	var wipUrl = httpData.split('\"')
	console.log("Expanded bitly url to " + wipUrl[1]);
	return wipUrl[1];
}

// Takes a parameter formatted with  "[1]" or otherwise at the end and returns
// the value at that index in the array in the JSON file
function getArrayData(obj, param) {
	var splitParam = param.split('[');
	var indexString = splitParam[1].substring(0, splitParam[1].length - 1);
	var array = obj[splitParam[0]];
	return array[parseInt(indexString)];g
}


// Recursive function to traverse nested objects and return either the value of a field
// or the value of an provided index of an array
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
		return this.retrieveFieldData(newObj, parseParams);
	}
}
