var server = require('./server');

/* Macro for OpeanWeatherMap:
 * Opens APIs from:
 * openweathermap.org/current
 * Returns the current temperature and current weather.
 * The temperature is submitted as an integer from -128 to 127
 * The current weather is sent as a string after the 1 byte of
 * temperature data
 */
const weatherMacro = {
	macroID: 0x01,
	host: undefined,
	path: undefined,
	type: 'GET',
	port: undefined,
	postData: undefined,
	
	runMacro: function(data, macroParam) {
		var obj = JSON.parse(httpData); 
		var curWeather = obj.weather.main;
		var temp = round(obj.main.temp - 273.15);
		var tempChar = String.fromCharCode(temp + 128);
		return tempChar + curWeather;
	},
	
	preMacro: function(options, macroParam) {
		return options;
	}
}

server.addMacro(exampleMacro);
server.startServer();
