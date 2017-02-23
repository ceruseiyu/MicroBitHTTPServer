var noble = require('noble');

var serviceUUID = "1351634a09d1484699b9ee3112c3f55b";

function startScan(state) {
	if(state === 'poweredOn') {
		noble.startScanning();
	} else {
		noble.stopScanning();
	}
}

function checkMicroBit(services) {
	for (var i in services) {
		if(services[i].uuid === serviceUUID) {
			return true;
		}
	}
	return false;
}

function connectService(peripheral) {
	peripheral.connect(function errorCallback(error) {
		peripheral.discoverServices(null, function(error, services) {
			if(checkMicroBit(services)) {
				console.log('Connected to Micro:bit');
			} else {
				console.log('Connected to unknown device');
				peripheral.disconnect(function(error) {});
			}
		});
	});
}
	

noble.on('stateChange', startScan);
noble.on('discover', connectService);
