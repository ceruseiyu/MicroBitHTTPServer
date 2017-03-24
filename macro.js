var http = require('http');

var parser = require('./parser');

var macroArray = [];
var responseCharacteristic;

module.exports.addMacro = function(macro) {
	macroArray.push(macro);
}

function findMacro(macroID) {
	for(var i = 0; i < macroArray.length; i++) {
		if(macroArray[i].macroID === macroID) {
			return macroArray[i];
		}
	}
	return undefined;
}

function macroBitlyRequest(requestOptions, macro) {
	var httpData;
	http.request(requestOptions, function(response) {
		response.on('data', function receiveData(httpChunk) {
			httpData += httpChunk;
		});
		
		response.on('end', function gotData() {
			var expandedUrl = parser.parseBitly(httpData);
			var rawOptions = parser.parseURL(expandedUrl);
			
			var newRequestOptions = requestOptions;
			newRequestOptions.host = rawOptions[0];
			newRequestOptions.path = rawOptions[1];
			
			macroRequest(newRequestOptions, macro);
		});
	}).end();
}

function macroRequest(requestOptions, macro) {
	if(macro.preMacro !== undefined) {
		requestOptions = macro.preMacro(requestOptions, macro.param);
	}
	
	var httpData;
	http.request(requestOptions, function(response) {
		response.on('data', function receiveData(httpChunk) {
			httpData += httpChunk;
		});
		
		response.on('end', function gotData() {
			if(httpData == undefined) {
				console.log("Retrieval of JSON failed");
				return;
			}
			if(httpData.substring(0,9) === "undefined") {
				httpData = httpData.substring(9);
			}
			var responseData = macro.runMacro(httpData, macro.param);
			console.log("Writing response data: " + responseData);
			responseCharacteristic.write(Buffer.from(responseData), true, function(error){});
		});
	}).end();
}

module.exports.setResponseCharacteristic = function(characteristic) {
	responseCharacteristic = characteristic;
}

module.exports.runMacro = function(macroID, param, options) {
	var macro = findMacro(macroID);
	if(macro === undefined) {
		console.log('Macro of ID ' + macroID + ' was not found!');
		return;
	}

	if(macro.host !== undefined) {
		options.host = macro.host;
	}
	if(macro.path !== undefined) {
		options.path = macro.path;
	}
	if(macro.port !== undefined) {
		options.port = macro.port;
	}
	
	if(macro.method === undefined) {
		console.log('No HTTP Request method set for macro');
		return;
	}
	options.method = macro.method;
	macro.param = param;
	
	if(options.host === 'bit.ly') {
		macroBitlyRequest(options, macro);
	} else {
		macroRequest(options, macro);
	}

}
