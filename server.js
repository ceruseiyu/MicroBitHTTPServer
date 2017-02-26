var noble = require('noble');

var serviceUUID = '1351634a09d1484699b9ee3112c3f55b';
var urlCharacteristicUUID = '13513f0209d1484699b9ee3112c3f55b';
var requestCharacteristicUUID = '1351149e09d1484699b9ee3112c3f55b';

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
		return false
	}
	
	if(services[0].uuid === serviceUUID) {
		return true;
	}
	return false;
}
	

function connectService(peripheral) {
	noble.stopScanning();
	peripheral.connect(function deviceConnect(error) {
		//console.log('connected');
		peripheral.discoverServices(serviceUUID, function accessServivces(error, services) {
			if(checkMicroBit(services)) {
				console.log('Connected to Micro:bit with HTTP Service');
				HTTPService = services[0];
				readCharacteristics = [urlCharacteristicUUID, requestCharacteristicUUID];
				HTTPService.discoverCharacteristics(requestCharacteristics, function accessCharacteristics(error, characteristics) {
					characteristics[0].read(function(error, data) {
						storedURL = data.toString('utf8');
					});
					characteristics[1].read(function(error, data) {
						storedRequest = data.toString('utf8');
					});
					storedRequest = characteristics[1];
					
					for (var i in characteristics) {
						console.log(characteristics[i].uuid);
						characteristics[i].read(function(error, data) {
							console.log('+' + data.toString('utf8') + '+');
							
						});
						
					}

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
