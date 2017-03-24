var http = require('http');

var parser = require('./parser');

//Array to store all of the macro objects
var macroArray = [];

//Reference to the response characteristic to perform writes to.
var responseCharacteristic;

// Add a new macro to the macroArray
module.exports.addMacro = function(macro) {
	macroArray.push(macro);
}

// Searches the array for a macro of the given ID, returns the macro if successful,
// returns undefined if macro not found.
function findMacro(macroID) {
	for(var i = 0; i < macroArray.length; i++) {
		if(macroArray[i].macroID === macroID) {
			return macroArray[i];
		}
	}
	return undefined;
}

//Expand out a bitly link, then call macroRequest
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

//Make the HTTP request using the macro
function macroRequest(requestOptions, macro) {
	// If there's a pre-macro to set up the request options, run it, if not, just continue
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
			//Parse the data using the macro function, then send the result over the Response characteristic
			var responseData = macro.runMacro(httpData, macro.param);
			console.log("Writing response data: " + responseData);
			responseCharacteristic.write(Buffer.from(responseData), true, function(error){});
		});
	}).end();
}

//Set the response characteristic object to perform writes to.
module.exports.setResponseCharacteristic = function(characteristic) {
	responseCharacteristic = characteristic;
}

//Takes a macro ID, requestoptions and parameters and runs the macro
module.exports.runMacro = function(macroID, param, options) {
	var macro = findMacro(macroID); //Find the macro first
	if(macro === undefined) { // Check if not found
		console.log('Macro of ID ' + macroID + ' was not found!');
		return;
	}

	if(macro.host !== undefined) { //Set values for the request options if available
		options.host = macro.host;
	}
	if(macro.path !== undefined) {
		options.path = macro.path;
	}
	if(macro.port !== undefined) {
		options.port = macro.port;
	}
	
	if(macro.method === undefined) { // Check if a HTTP method is set
		console.log('No HTTP Request method set for macro');
		return;
	}
	options.method = macro.method;
	macro.param = param;
	
	if(options.host === 'bit.ly') { // Check if bitly parsing is needed, then start the request
		macroBitlyRequest(options, macro);
	} else {
		macroRequest(options, macro);
	}

}
