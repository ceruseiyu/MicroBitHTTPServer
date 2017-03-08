var noble = require('noble');
var http = require('http');
//var urlLib = require('url');

var parser = require('./parser');
var macro = require('./macro');

const serviceUUID = '1351634a09d1484699b9ee3112c3f55b';
const urlCharacteristicUUID = '13513f0209d1484699b9ee3112c3f55b';
const requestCharacteristicUUID = '1351149e09d1484699b9ee3112c3f55b';
const responseCharacteristicUUID = '1351578009d1484699b9ee3112c3f55b';
const postDataCharacteristicUUID = '13514c6f09d1484699b9ee3112c3f55b';

var urlCharacteristic;
var requestCharacteristic;
var responseCharacteristic;

var storedURL = '';
var storedRequest = '';
var storedPostData = '';

var macroArray = [];

const exampleMacro = {
	macroID: 0x01,
	host: undefined,
	path: undefined,
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

function readPostDataCharacteristic(error, data) {
	storedPostData = data.toString('utf8');
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
		console.log(httpData);
		return;
	}
	obj = JSON.parse(httpData);
	var splitParams = parseParam.split(".");
	var fieldData = parser.retrieveFieldData(obj, splitParams);
	console.log(fieldData);
	responseCharacteristic.write(Buffer.from(fieldData), true, function(error){});
}

function makeBitlyRequest(requestOptions) {
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
			makeRequest(newRequestOptions);
		});
	}).end();
}

function makeRequest(requestOptions) {
	var httpData;
	var request = http.request(requestOptions, function(response) {
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
		});
	});
	
	if(requestOptions.postData !== undefined) {
		request.write(postData);
	}
	
	request.end();
}

function onRequestUpdate(data, isNotification) {
	console.log('Request Received');
	storedRequest = data.toString('utf8');
	console.log(storedRequest);
	var rawOptions = parser.parseURL(storedUrl);
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
			requestOptions.postData = storedPostData;
			requestOptions.headers = {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
			break;
		case 'p':
			requestOptions.type = 'PUT';
			break;
		case 'D':
			requestOptions.type = 'DELETE';
			break;
		case 'M':
			macro.setResponseCharacteristic(responseCharacteristic);
			macro.runMacro(data[1], storedRequest.substring(1, storedRequest.length), requestOptions);
			return;
		default:
			console.log('Request identifier not recognised!');
			return;
	}
	var httpData;
	
	if(requestOptions.host === 'bit.ly') {
		makeBitlyRequest(requestOptions);
	} else {
		makeRequest(requestOptions);
	}
}

function onUrlUpdate(data, isNotification) {
	console.log('URL Updated: ' + data);
	storedUrl = data.toString('utf8');
}

function onPostDataUpdate(data, isNotification) {
	console.log('Post data updated: ' + data);
	storedPostData = data.toString('utf8');
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
		peripheral.discoverServices([serviceUUID], function accessServivces(error, services) {
			if(checkMicroBit(services)) {
				console.log('Connected to Micro:bit with HTTP Service');
				
				var HTTPService = services[0];
				var readCharacteristics = [
					urlCharacteristicUUID, 
					requestCharacteristicUUID, 
					responseCharacteristicUUID, 
					postDataCharacteristicUUID
				];
				
				HTTPService.discoverCharacteristics(readCharacteristics, function accessCharacteristics(error, characteristics) {
					urlCharacteristic = characteristics[0];
					requestCharacteristic = characteristics[1];
					responseCharacteristic = characteristics[2];
					postDataCharacteristic = characteristics[3];
					
					urlCharacteristic.read(readUrlCharacteristic);
					urlCharacteristic.on('read', onUrlUpdate);
					urlCharacteristic.notify(true, function(error){});
					
					requestCharacteristic.read(readRequestCharacteristic);
					requestCharacteristic.on('read', onRequestUpdate);
					requestCharacteristic.notify(true, function(error){});
					
					postDataCharacteristic.read(readPostDataCharacteristic);
					postDataCharacteristic.on('read', onPostDataUpdate);
					postDataCharacteristic.notify(true, function(error){});
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

macro.addMacro(exampleMacro);

noble.on('stateChange', startScan);
noble.on('discover', connectService);
