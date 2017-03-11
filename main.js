var server = require('./server');

/* Macro for OpeanWeatherMap:
 * Opens APIs from:
 * openweathermap.org/current
 * Returns the current temperature and current weather.
 * The temperature in celsius is submitted as an integer from -64 to 63
 * The current weather is sent as a string after thebyte of
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
		var obj = JSON.parse(data); 
		var curWeather = obj.weather[0].main;
		var temp = Math.round(obj.main.temp - 273.15);
		var tempChar = String.fromCharCode(temp + 64);
		return tempChar + curWeather;
	},
	
	preMacro: function(options, macroParam) {
		return options;
	}
}

server.addMacro(weatherMacro);
server.startServer();
