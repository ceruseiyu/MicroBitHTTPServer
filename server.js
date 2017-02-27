var noble = require('noble');
var http = require('http');
var urlLib = require('url');

var serviceUUID = '1351634a09d1484699b9ee3112c3f55b';
var urlCharacteristicUUID = '13513f0209d1484699b9ee3112c3f55b';
var requestCharacteristicUUID = '1351149e09d1484699b9ee3112c3f55b';
var responseCharacteristicUUID = '1351578009d1484699b9ee3112c3f55b';

var urlCharacteristic;
var requestCharacteristic;
var responseCharacteristic;

var storedURL = '';
var storedRequest = '';

function startScan(state) {
	if(state === 'poweredOn') {
		noble.startScanning();
	} else {
		noble.stopScanning();
	}
}

function checkMicroBit(services) {
	if(services === undefined) {
		return false;
	}
	console.log(services);
	
	if(services[0] === undefined) {
		return false;
	}
	
	if(services[0].uuid === serviceUUID) {
		return true;
	}
	return false;
}

function readUrlCharacteristic(error, data) {
	storedURL = data.toString('utf8');
};

function readRequestCharacteristic(error, data) {
	storedRequest = data.toString('utf8');
}

function onUrlUpdate(data, isNotification) {
	console.log('URL Updated');
	storedUrl = data.toString('utf8');
}

function parseURL(url) {
	var preParseUrl;
	if(url.substring(0, 4) != "http") {
		preParseUrl = 'http://' + url;
	} else{
		preParseUrl = url;
	}
	/*var flag = false;
	for(var i = 6; i < preParseUrl.length; i++) {
		if(preParseUrl.charAt(i) == ':') {
			flag = true;
			break;
		}
	}
	if(flag == true) {
		preParseUrl = preParseUrl + ':80';
	}*/
	
	var urlDoc = urlLib.parse(preParseUrl);
	//Here we should check for bit.ly link and expand it.
	
	
	
	return [urlDoc.hostname, urlDoc.pathname, urlDoc.port];
}

function parseSendData(httpData, parseParam) {
	var obj = JSON.parse(httpData);
	var fieldData = obj(parseParam);
	responseCharacteristic.write(Buffer.from(fieldData), true, function(error){});
}

function onRequestUpdate(data, isNotification) {
	console.log('Request Received');
	storedRequest = data.toString('utf8');

	var rawOptions = parseURL(storedUrl);
	var requestOptions = {
		host:rawOptions[0], 
		path:rawOptions[1], 
		port: 80,
		type: '',
		headers: undefined
	};
	
	var requestType = storedRequest.substring(0,1);
	switch(requestType) {
		case 'G':
			requestOptions.type = 'GET';
			break;
		case 'P':
			break;
		case 'p':
			break;
		case 'D':
			break;
	}
	console.log(requestOptions);
	var httpData;
	//Works with JSON
	//NOT BIT.LY LINKS.
	//They need to be expanded out.
	//This requires restructuring of flow of program to stack the two HTTP requests needed.
	http.request(requestOptions, function(response) {
		response.on('data', function receiveData(httpChunk) {
			httpData += httpChunk;
		});
		
		response.on('end', function gotData() {
			console.log(httpData);
			parseParam = storedRequest.substring(1);
			parseSendData(httpData, parseParam);
			//Here's where we'll return the data to the Micro:bit
		});
	}).end();
}

function connectService(peripheral) {
	noble.stopScanning();
	peripheral.connect(function deviceConnect(error) {
		//console.log('connected');
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
					
					/*for (var i in characteristics) {
						console.log(characteristics[i].uuid);
						characteristics[i].read(function(error, data) {
							console.log('+' + data.toString('utf8') + '+');
							
						});
						
					}*/

				});
			} else {
				console.log('Connected to unknown device, disconnecting');
				peripheral.disconnect(function(error) {});
				noble.startScanning();
			}
		});
	});
}
	

noble.on('stateChange', startScan);
noble.on('discover', connectService);
