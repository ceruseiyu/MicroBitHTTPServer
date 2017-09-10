# BBC micro:bit HTTP Proxy Server
[![noble](https://github.com/sandeepmistry/noble/raw/master/assets/noble-logo.png)](https://github.com/sandeepmistry/noble)<sub>Built with noble</sub>

The micro:bit HTTP proxy server is one half of the micro:bit HTTP service, it runs on a machine with bluetooth capability and access to the internet, such as a Raspberry Pi 3B, which it was tested on. The proxy server handles the following tasks in the service:
 - Decoding the short form request sent from the micro:bit
 - Making the HTTP Requests to an external server
 - Retrieving the requested JSON element from a request
 - Returning the requested data to the micro:bit
 - Storing macros to adjust how requests are sent and how data is parsed to return to the micro:bit

The server natively supports retrieving elements from JSON files, but can also utilise macros to retrieve data from any given file on the web.

## Using the server
 1. Install [noble](https://github.com/sandeepmistry/noble)
 2. Clone/download this repository
 3. Run the server (sudo required for bluetooth):
```sh
$ sudo node main.js
```
 4. Bring a micro:bit with running HTTP service in range to connect
 5. Begin making HTTP requests

### Adjusting the server
The server has been provided with main.js as a default setup that contains an example macro and starts the server. To build your own, simply start with:
```js
var server = require('./server');
// Add Macros here
server.startServer();
```

### Adding macros
Macros are objects that have an 8-bit ID, parameters for a request and two functions that are called when the request is being made. The basic skeleton for a Macro is as follows:
```js
const weatherMacro = {
	macroID: 0x01,
	host: undefined,
	path: undefined,
	method: 'GET',
	port: undefined,
	postData: undefined,
	
	runMacro: function(data, macroParam) {
		return 'String';
	},
	
	preMacro: function(options, macroParam) {
		return options;
	}
}
```
Here is a full breakdown of the individual parts of the Macro:
 - **macroID** An 8-bit ID used the reference the macro in a request
 - **host** The host name to make a request to, e.g. www.github.com, defaults to the URL sent by micro:bit
 - **path** The path to make a request to, e.g. /ceruseiyu/MicroBitHTTPServer/, defaults to the path sent by micro:bit
 - **method** Verb for the HTTP request: GET, POST, PUT or DELETE
 - **port** The port to send the request, default 80
 - **postData** The data to send with POST requests, defaults to the post data sent from the micro:bit
 - **runMacro** The macro function called after the web resource is retrieved, returns the string data to send to the micro:bit
 - **preMacro** The macro function called before a HTTP request is sent, returns the options to use in a HTTP request
 - **macroParam** The string data sent from the micro:bit with the request to configure the macro

Typically a macro will be used to retrieve different pieces of data from the JSON file and encode them efficiently, e.g. a temperature value may only need a single 8-bit character to store the data before sending it to the Micro:bit, which is what is used for the example weather macro in main.js

The options object that is used to configure the request for the preMacro is defined as:
```js
{
	host:undefined, 
	path:undefined,
	port: 80,
	method: 'GET',
	postData: undefined
}
```
