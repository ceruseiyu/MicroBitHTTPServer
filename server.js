var noble = require('noble');
var http = require('http');

//Include the other modules
var parser = require('./parser');
var macro = require('./macro');

// UUID for the HTTP Service
const serviceUUID = '1351634a09d1484699b9ee3112c3f55b';

// Characteristic UUIDs
const urlCharacteristicUUID = '13513f0209d1484699b9ee3112c3f55b';
const requestCharacteristicUUID = '1351149e09d1484699b9ee3112c3f55b';
const responseCharacteristicUUID = '1351578009d1484699b9ee3112c3f55b';
const postDataCharacteristicUUID = '13514c6f09d1484699b9ee3112c3f55b';

// Variables to hold characteristic objects
var urlCharacteristic;
var requestCharacteristic;
var responseCharacteristic;

// Variables to hold stored characteristic data
var storedURL = '';
var storedRequest = '';
var storedPostData = '';

//These are called to read their characteristics for the first time.
function readUrlCharacteristic(error, data) {
	storedURL = data.toString('utf8');
};

function readRequestCharacteristic(error, data) {
	storedRequest = data.toString('utf8');
}


function readPostDataCharacteristic(error, data) {
	storedPostData = data.toString('utf8');
}

//Retrieve the field from the raw HTTP data (JSON format) and write it to the Response characteristic
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
	console.log("Writing response data: " + fieldData);
	responseCharacteristic.write(Buffer.from(fieldData), true, function(error){});
}

// Make a HTTP request to a bit.ly URL to a get a full URL, then call makeRequest
function makeBitlyRequest(requestOptions) {
	var httpData;
	var bitlyOptions = {
		host:requestOptions.host, 
		path:requestOptions.path,
		port: 80,
	}
	http.request(bitlyOptions, function(response) {
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

// Make a HTTP request
function makeRequest(requestOptions) {
	var httpData;
	var request = http.request(requestOptions, function(response) {
		response.setEncoding('utf8');
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
	
	if(requestOptions.postData !== undefined) { //Write data in the case of POST and PUT
		request.write(requestOptions.postData);
	}
	
	request.end();
}

// When request received from Micro:bit
function onRequestUpdate(data, isNotification) {
	storedRequest = data.toString('utf8');
	console.log('Request Received: ' + storedRequest);
	var rawOptions = parser.parseURL(storedUrl);
	var requestOptions = { //Set up request options
		host:rawOptions[0], 
		path:rawOptions[1], 
		port: 80,
	};
	
	var requestType = storedRequest.substring(0,1);
	switch(requestType) { // Determine intended HTTP request method
		case 'G':
			requestOptions.method = 'GET';
			break;
		case 'P':
			requestOptions.method = 'POST'; //POST and PUT need to write data to the request
			requestOptions.postData = storedPostData;
			requestOptions.headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(requestOptions.postData)
			};
			break;
		case 'p':
			requestOptions.method = 'PUT';
			requestOptions.postData = storedPostData;
			requestOptions.headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(requestOptions.postData)
			};
			break;
		case 'D':
			requestOptions.method = 'DELETE';
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

// Stores the data from the URL characteristic when updated
function onUrlUpdate(data, isNotification) {
	console.log('URL Updated: ' + data);
	storedUrl = data.toString('utf8');
}

//Stores the data from the Post Data characteristic when updated
function onPostDataUpdate(data, isNotification) {
	console.log('Post data updated: ' + data);
	storedPostData = data.toString('utf8');
}
 
 //Check if the services contains the HTTP service
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

/* Search for and connect to the Micro:bit, setting up all the
 * required fields and event bindings to allow the rest of
 * the server to work
 */
function connectService(peripheral) {
	noble.stopScanning();
	peripheral.connect(function deviceConnect(error) {
		peripheral.discoverServices([serviceUUID], function accessServivces(error, services) {
			if(checkMicroBit(services)) { //Check for the HTTP Service
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
					urlCharacteristic.on('data', onUrlUpdate);
					urlCharacteristic.notify(true, function(error){});
					
					postDataCharacteristic.read(readPostDataCharacteristic);
					postDataCharacteristic.on('data', onPostDataUpdate);
					postDataCharacteristic.notify(true, function(error){});
					
					requestCharacteristic.read(readRequestCharacteristic);
					requestCharacteristic.on('data', onRequestUpdate);
					requestCharacteristic.notify(true, function(error){});
					
				});
			} else { // Disconnect if no HTTP Service
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

module.exports.addMacro = function(newMacro) { // Add new macro
	macro.addMacro(newMacro);
}

module.exports.startServer = function() {
	console.log('Starting server...');
	noble.on('stateChange', startScan);
	noble.on('discover', connectService); //Start looking for Micro:bit
}

