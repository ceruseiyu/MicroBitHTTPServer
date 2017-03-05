var noble = require('noble');
var http = require('http');
var urlLib = require('url');

const serviceUUID = '1351634a09d1484699b9ee3112c3f55b';
const urlCharacteristicUUID = '13513f0209d1484699b9ee3112c3f55b';
const requestCharacteristicUUID = '1351149e09d1484699b9ee3112c3f55b';
const responseCharacteristicUUID = '1351578009d1484699b9ee3112c3f55b';

var urlCharacteristic;
var requestCharacteristic;
var responseCharacteristic;

var storedURL = '';
var storedRequest = '';

var macroArray = [];

const exampleMacro = {
	macroID: 0x01,
	host: undefined,
	path: undefined;
	type: 'GET',
	port: undefined,
	postData: undefined,
	runMacro: function(data) {
		return 'Success';
	}
}

function readUrlCharacteristic(error, data) {
	storedURL = data.toString('utf8');
};

function readRequestCharacteristic(error, data) {
	storedRequest = data.toString('utf8');
}

function onUrlUpdate(data, isNotification) {
	console.log('URL Updated:' + data);
	storedUrl = data.toString('utf8');
}

function parseURL(url) {
	var preParseUrl;
	if(url.substring(0, 4) != "http") {
		preParseUrl = 'http://' + url;
	} else{
		preParseUrl = url;
	}
	var urlDoc = urlLib.parse(preParseUrl);
	
	return [urlDoc.hostname, urlDoc.path.replace(/&amp;/g, '&')];
}

function getArrayData(obj, param) {
	var splitParam = param.split('[');
	var indexString = splitParam[1].substring(0, splitParam[1].length - 1);
	var array = obj[splitParam[0]];
	return array[parseInt(indexString)];
}

//Recursively locate nested object given list of object IDs
function retrieveFieldData(obj, parseParams) {
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

function parseSendData(httpData, parseParam) {
	if(httpData.substring(0,9) === "undefined") {
		httpData = httpData.substring(9);
	}
	var obj;
	try{
		obj = JSON.parse(httpData);
	} catch(err) {
		console.log("Unable to parse JSON. Is requested file valid JSON?");
		return;
	}
	obj = JSON.parse(httpData);
	var splitParams = parseParam.split(".");
	var fieldData = retrieveFieldData(obj, splitParams);
	console.log(fieldData);
	responseCharacteristic.write(Buffer.from(fieldData), true, function(error){});
}

function parseBitly(httpData) {
	var wipUrl = httpData.split('\"')
	console.log("Expanded bitly url to " + wipUrl[1]);
	return wipUrl[1];
}

function makeBitlyRequest(requestOptions) {
	var httpData;
	http.request(requestOptions, function(response) {
		response.on('data', function receiveData(httpChunk) {
			httpData += httpChunk;
		});
		
		response.on('end', function gotData() {
			var expandedUrl = parseBitly(httpData);
			var rawOptions = parseURL(expandedUrl);
			var newRequestOptions = {
				host:rawOptions[0], 
				path:rawOptions[1], 
				port: 80,
			};
			makeRequest(newRequestOptions);
		});
	}).end();
}

function makeRequest(requestOptions) {
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
			parseParam = storedRequest.substring(1);
			parseSendData(httpData, parseParam);
			//Here's where we'll return the data to the Micro:bit
		});
	}).end();
}

function addMacro(macro) {
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

function runMacro(macroID, param, options) {
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
	
	if(macro.type === undefined) {
		console.log('No HTTP Request type set for macro');
		return;
	}
	options.type = macro.type;

}

function onRequestUpdate(data, isNotification) {
	console.log('Request Received');
	storedRequest = data.toString('utf8');
	console.log(storedRequest);
	var rawOptions = parseURL(storedUrl);
	var requestOptions = {
		host:rawOptions[0], 
		path:rawOptions[1], 
		port: 80,
	};
	
	var requestType = storedRequest.substring(0,1);
	switch(requestType) {
		case 'G':
			requestOptions.type = 'GET';
			break;
		case 'P':
			requestOptions.type = 'POST';
			break;
		case 'p':
			requestOptions.type = 'PUT';
			break;
		case 'D':
			requestOptions.type = 'DELETE';
			break;
		case 'M':
			runMacro(data[1], storedRequest.substring(1, storedRequest.length), requestOptions);
			return;
		default:
			console.log('Request identifier not recognised!');
	}
	var httpData;
	
	if(requestOptions.host === 'bit.ly') {
		makeBitlyRequest(requestOptions);
	} else {
		makeRequest(requestOptions);
	}
}

function checkMicroBit(services) {
	if(services === undefined) {
		return false;
	}
	
	if(services[0] === undefined) {
		return false;
	}
	
	if(services[0].uuid === serviceUUID) {
		return true;
	}
	return false;
}

function connectService(peripheral) {
	noble.stopScanning();
	peripheral.connect(function deviceConnect(error) {
		peripheral.discoverServices(serviceUUID, function accessServivces(error, services) {
			if(checkMicroBit(services)) {
				console.log('Connected to Micro:bit with HTTP Service');
				
				var HTTPService = services[0];
				var readCharacteristics = [urlCharacteristicUUID, requestCharacteristicUUID, responseCharacteristicUUID];
				
				HTTPService.discoverCharacteristics(readCharacteristics, function accessCharacteristics(error, characteristics) {
					urlCharacteristic = characteristics[0];
					requestCharacteristic = characteristics[1];
					responseCharacteristic = characteristics[2];
					
					urlCharacteristic.read(readUrlCharacteristic);
					urlCharacteristic.on('read', onUrlUpdate);
					urlCharacteristic.notify(true, function(error){});
					
					requestCharacteristic.read(readRequestCharacteristic);
					requestCharacteristic.on('read', onRequestUpdate);
					requestCharacteristic.notify(true, function(error){});
				});
			} else {
				console.log('Connected to unknown device, disconnecting');
				peripheral.disconnect(function(error) {});
				noble.startScanning();
			}
		});
	});
}
	
function startScan(state) {
	if(state === 'poweredOn') {
		noble.startScanning();
	} else {
		noble.stopScanning();
	}
}

addMacro(exampleMacro);

noble.on('stateChange', startScan);
noble.on('discover', connectService);
