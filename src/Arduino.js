// Arduino.js
// jeff hoefs 7/20/11
// based on as3glue (http://code.google.com/p/as3glue/)
// 
// to do:
// 1. implement Firmata i2c spec
// 2. finalize the event model
// 3. support full Firmata 2.2 protocol
// 4. decouple socket (so you could use web socket, flash socket via swf, or other)?
// 5. align code to js best practices


/**
 * Creates a new Arduino object representing the digital and analog inputs and
 * outputs of the device as well as support for sending strings between the Arduino
 * sketch and your javascript application. Also support for hardware such as controlling
 * a servo motor from javascript and additional libraries for an RFID reader with more
 * to follow such as Button, Accelerometer, i2c device implementation, etc.
 *
 * @constructor
 * @param {String} host The host address of the web server
 * @param {Number} port The port to connect to on the web server
 */
function Arduino(host, port, boardType) {
	"use strict";
	
	var _boardType = boardType || Arduino.STANDARD;

	this.className = "Arduino"; 	// for testing

	var		FIRMATA_MAJOR_VERSION	= 2,
			FIRMATA_MINOR_VERSION	= 2;
	
	// message command bytes (128-255/0x80-0xFF)
	var		DIGITAL_MESSAGE			= 0x90,
			ANALOG_MESSAGE			= 0xE0,
			REPORT_ANALOG			= 0xC0,
			REPORT_DIGITAL			= 0xD0,
			SET_PIN_MODE			= 0xF4,
			REPORT_VERSION			= 0xF9,
			SYSEX_RESET				= 0xFF,
			START_SYSEX				= 0xF0,
			END_SYSEX				= 0xF7;
	
	// extended command set using sysex (0-127/0x00-0x7F)
	var		SERVO_CONFIG			= 0x70,
			STRING_DATA				= 0x71,
			SHIFT_DATA				= 0x75,
			I2C_REQUEST				= 0x76,
			I2C_REPLY				= 0x77,
			I2C_CONFIG				= 0x78,
			EXTENDED_ANALOG			= 0x6F,
			PIN_STATE_QUERY			= 0x6D,
			PIN_STATE_RESPONSE		= 0x6E,
			CAPABILITY_QUERY		= 0x6B,
			CAPABILITY_RESPONSE		= 0x6C,
			ANALOG_MAPPING_QUERY	= 0x69,
			ANALOG_MAPPING_RESPONSE	= 0x6A,
			REPORT_FIRMWARE			= 0x79,
			SAMPLING_INTERVAL		= 0x7A,
			SYSEX_NON_REALTIME		= 0x7E,
			SYSEX_REALTIME			= 0x7F;
	

	// private properties
	var self = this;	// get a reference to this class
	var host = host;
	var port = port;
	var socket;
	
	var _analogData = [];
	var _digitalData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	//var _digitalPins = 0;
	var _executeMultiByteCommand = 0;
	var _firmwareVersion = 0;
	var _multiByteChannel = 0;
	var _previousAnalogData = [];
	var _previousDigitalData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	var _storedInputData = [];
	var _sysExData = [];
	var _waitForData = 0;
	
	var _analogPinMapping = [];
	var _digitalPinMapping = [];
	var _ioPins = [];
	var _totalPins = 0;
	var _isAutoConfig = false;
	
	var _evtDispatcher = new EventDispatcher(this);
			
	connect();
	
	configure();
					
	// private methods:
	
	// to do: 
	// Create a wrapper for WebSocket and compose the wrapper in this class
	// rather than using WebSockets directly.
	// This will enable the user to swap the wrapper object if do not want to
	// use WebSockets as long as all Socket wrappers maintain a consistent interface.
	/**
	 * @private
	 */
	function connect () {
		
		if(!("WebSocket" in window)) {
			console.log("Websockets not supported by this browser");
			throw "Websockets not supported by this browser";
			return;
		}
		
		try{
			socket = new WebSocket("ws://"+host+":"+port);
			console.log("Starting up...");
			/**
			 * @private
			 */
			socket.onopen = function(){
				console.log("Socket Status: "+socket.readyState+" (open)");
				self.dispatchEvent(new Event(Event.CONNECTED));
				
				//self.addEventListener(ArduinoEvent.FIRMWARE_VERSION, onVersion);
				//self.reportVersion();
			}
			/**
			 * @private
			 */
			socket.onmessage = function(msg){
				processData(msg.data);
			}
			/**
			 * @private
			 */
			socket.onclose = function(){
				console.log("Socket Status: "+socket.readyState+' (Closed)');
			}			
				
		} catch(exception){
			console.log("Error "+exception);
		}

	}
	
	// contemplating...
	/*
	function onVersion(event) {
		self.removeEventListener(ArduinoEvent.FIRMWARE_VERSION, onVersion);
		var version = event.data.version * 10;
		
		if (version >= 22) {
			autoConfigure();
		} else {
			configure();
		}
	}
	*/
	
	/**
	 * Automatically configure using queryCapabilities. This only works with StandardFirmata
	 * using Firmata version 2.2 (Arduino 0022) or higher
	 *
	 * @private
	 */
	//function autoConfigure() {
	//	_isAutoConfig = true;
	//	self.queryCapabilities();
	//}
	
	/**
	 * currently only Arduino with ATMega168 or ATMega328 is supported
	 * to do: create Configuration class in order to support different arduino boards
	 * such as: mega, teensy, etc.
	 * 
	 * @private
	 */
	function configure() {	
		var pinTypes = [];
		
		if (_boardType == Arduino.STANDARD) {
					
			var TOTAL_PINS = 24;	// 14 digital + 2 unused + 8 analog (only 6 on some boards)
			// map pins
			_analogPinMapping = [16, 17, 18, 19, 20, 21, 22, 23];	
			// pins 14 & 15 are not used (the pin numbering by Firmata is kinda weird... 
			// this is just the way it is unfortunately
			_digitalPinMapping = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21];
			
			// default pin configuration
			pinTypes = [
				Arduino.OUTPUT, Arduino.OUTPUT, Arduino.OUTPUT, Arduino.OUTPUT, Arduino.OUTPUT,
				Arduino.OUTPUT, Arduino.OUTPUT, Arduino.OUTPUT, Arduino.OUTPUT, Arduino.OUTPUT,
				Arduino.OUTPUT, Arduino.OUTPUT, Arduino.OUTPUT, Arduino.OUTPUT, undefined, undefined,
				Arduino.ANALOG, Arduino.ANALOG, Arduino.ANALOG, Arduino.ANALOG,
				Arduino.ANALOG, Arduino.ANALOG, Arduino.ANALOG, Arduino.ANALOG
			];
			
			// create a new Pin object for each pin specified by Firmata (which may not align
			// with the actual Arduino board)
			for (var i=0; i<TOTAL_PINS; i++) {
				var pin = new Pin(i, pinTypes[i]);
				_ioPins[i] = pin;
			}
			
		} else {
			// to do: configuration for other board types
		}
		
	}
	
	/**
	 * @private
	 */
	function processData(inputData) {
		inputData *= 1;	// force inputData to integer (is there a better way to do this?)
		var command;
		
		// we have command data
		if (_waitForData > 0 && inputData < 128) {
			_waitForData--;
			// collect the data
			_storedInputData[_waitForData]=inputData;
			// we have all data executeMultiByteCommand
			if (_waitForData == 0) {
				switch (_executeMultiByteCommand) {
					case DIGITAL_MESSAGE:
						processDigitalPortBytes(_multiByteChannel, _storedInputData[1], _storedInputData[0]); //(LSB, MSB)
						break;
					case REPORT_VERSION:
						_firmwareVersion=_storedInputData[1] + _storedInputData[0] / 10;
						self.dispatchEvent(new ArduinoEvent(ArduinoEvent.FIRMWARE_VERSION, {version: _firmwareVersion}));
						break;
					case ANALOG_MESSAGE:
						_analogData[_multiByteChannel] = self.getValueFromTwo7bitBytes(_storedInputData[1], _storedInputData[0]);
						if (_analogData[_multiByteChannel] != _previousAnalogData[_multiByteChannel]) {
							self.dispatchEvent(new ArduinoEvent(ArduinoEvent.ANALOG_DATA, {pin: _multiByteChannel, value: _analogData[_multiByteChannel]}));		
						}
						_previousAnalogData[_multiByteChannel]=_analogData[_multiByteChannel];
						break;
				}
			}
		}
		// we have SysEx command data
		else if (_waitForData < 0) {
			// we have all sysex data
			if (inputData == END_SYSEX) {
				_waitForData = 0;
				switch (_sysExData[0]) {
					case REPORT_FIRMWARE:
						processQueryFirmwareResult(_sysExData);
						break;
					case STRING_DATA:
						processSysExString(_sysExData);
						break;
					case CAPABILITY_RESPONSE:
						processCapabilitiesResponse(_sysExData);
						break;
					case PIN_STATE_RESPONSE:
						processPinStateResponse(_sysExData);
						break;
					case ANALOG_MAPPING_RESPONSE:
						processAnalogMappingResponse(_sysExData);
						break;
					default:
						// custom sysEx message
						self.dispatchEvent(new ArduinoEvent(ArduinoEvent.SYSEX_MESSAGE, {message: _sysExData}));
						break;
				}
				_sysExData = [];
			}
			else {
				_sysExData.push(inputData);
			}
		}
		// we have a command
		else {
			// extract the command and channel info from a byte if it is less than 0xF0
			if (inputData < 240) {
				command = inputData & 240;
				_multiByteChannel = inputData & 15;
			}
			else {
				// commands in the 0xF* range don't use channel data
				command = inputData;
			}
			switch (command) {
				case REPORT_VERSION:
				case DIGITAL_MESSAGE:
				case ANALOG_MESSAGE:
					_waitForData = 2;	// 2 bytes needed
					_executeMultiByteCommand = command;
					break;
				case START_SYSEX:
					_waitForData = -1; // n bytes needed
					_executeMultiByteCommand = command;
					break;
				default:
					break;
			}
		}
	}
	/**
	 * @private
	 */
	function processDigitalPortBytes(port, bits0_6, bits7_13) {
		var low;
		var high;
		var offset;
		// if port is 0, write bits 2..7 into _digitalData[2..7]
		// if port is 1, write bits 0..5 into _digitalData[8..13]
		if (port == 0) {
			low=2;
			high=7;
			offset=0;
		}
		else {
			low=0;
			high=5;
			offset=8;
		}
		var twoBytesForPorts = bits0_6 + (bits7_13 << 7);
		var mask;
		for (var i = low; i <= high; i++) {
			mask=1 << i;
			_digitalData[i + offset]=(twoBytesForPorts & mask) >> i;
			if (_digitalData[i + offset] != _previousDigitalData[i + offset]) {
				self.dispatchEvent(new ArduinoEvent(ArduinoEvent.DIGITAL_DATA, {pin: (i+offset), value: _digitalData[i + offset]}));
			}
			_previousDigitalData[i + offset]=_digitalData[i + offset];
		}	
	}
	/**
	 * @private
	 */
	function processQueryFirmwareResult(msg) {
		var fname ="";
		var data;
		for (var i = 3; i < msg.length; i+=2)
		{
			data = String.fromCharCode(msg[i]);
			data += String.fromCharCode(msg[i+1]);
			fname+=data;
		}
		_firmwareVersion=msg[1] + msg[2] / 10;
		self.dispatchEvent(new ArduinoEvent(ArduinoEvent.FIRMWARE_NAME, {name: fname, version: _firmwareVersion}));
		
	}
	/**
	 * @private
	 */
	function processSysExString(msg) {
		var str = "";
		var data;
		for (var i = 1; i < msg.length; i+=2) {
			data = String.fromCharCode(msg[i]);
			data += String.fromCharCode(msg[i+1]);
			str+=data;
		}
		self.dispatchEvent(new ArduinoEvent(ArduinoEvent.STRING_MESSAGE, {message: str}));
	}
	/**
	 * note: this implementation may change
	 *
	 * @private
	 */
	function processCapabilitiesResponse(msg) {
		var pinCapabilities = {};
		var byteCounter = 1; // skip 1st byte because it's the command
		var pinCounter = 0;
		var len = msg.length;
				
		while (byteCounter <= len) {
			// 127 denotes end of pin's modes
			if (msg[byteCounter] == 127) {
				_ioPins[pinCounter].capabilities = pinCapabilities;
				pinCapabilities = {};
				pinCounter++;
				byteCounter++;
			} else {
				// create capabilities object (mode: resolution) for each  mode
				// supported by each pin
				pinCapabilities[msg[byteCounter]] = msg[byteCounter + 1];
				byteCounter += 2;
			}
		}

		self.dispatchEvent(new ArduinoEvent(ArduinoEvent.CAPABILITY_RESPONSE));
	}

	// auto configure using capabilities response
	// not sure if this is a good idea... could cause more problems than it solves
	/*
	function processCapabilitiesResponse(msg) {
		var pinCapabilities = {};
		var byteCounter = 1; // skip 1st byte because it's the command
		var pinCounter = 0;
		var digitalPinCounter = 2;
		var analogPinCounter = 0;
		var len = msg.length;
		var type;
		
		// map rx and tx pins
		_digitalPinMapping[0] = 0;
		_digitalPinMapping[1] = 1;
				
		while (byteCounter <= len) {
			// 127 denotes end of pin's modes
			if (msg[byteCounter] == 127) {

				if (pinCapabilities[Arduino.OUTPUT]) {
					// map digital pins
					_digitalPinMapping[digitalPinCounter++] = pinCounter;
					// set default type
					if (pinCapabilities[Arduino.ANALOG]) {
						type = Arduino.ANALOG;
						_analogPinMapping[analogPinCounter++] = pinCounter;
					} else {
						type = Arduino.OUTPUT;
					}
				} else {
					type = undefined;
				}
				
				var pin = new Pin(pinCounter, type);
				pin.capabilities = pinCapabilities;
				_ioPins[pinCounter] = pin;
				
				pinCapabilities = {};
				pinCounter++;
				byteCounter++;
			} else {
				// create capabilities object (mode: resolution) for each  mode
				// supported by each pin
				pinCapabilities[msg[byteCounter]] = msg[byteCounter + 1];
				byteCounter += 2;
			}
		}
		
		_totalPins = pinCounter;

		self.dispatchEvent(new ArduinoEvent(ArduinoEvent.READY));
	}
	*/
	
	/**
	 * note: this implementation may change
	 *
	 * @private
	 */
	function processPinStateResponse(msg) {
		var len = msg.length;
		var pinNumber = msg[1];
		var pinType = msg[2];
		var value;
		
		if (len > 4) {
			// get value
			value = self.getValueFromTwo7bitBytes(msg[3], msg[4]);
		} else if (len > 3) {
			value = msg[3];
		}
		
		_ioPins[pinNumber].type = pinType;
		_ioPins[pinNumber].setValue(value);
		
		self.dispatchEvent(new ArduinoEvent(ArduinoEvent.PIN_STATE_RESPONSE));
	}
	
	/**
	 * note: this implementation may change
	 *
	 * @private
	 */
	function processAnalogMappingResponse(msg) {
		var len = msg.length;		
		for (var i=1; i<len; i++) {
			if (msg[i] != 127) {
				_analogPinMapping[msg[i]] = i - 1;
			}
		}
	}
	
	/**
	 * convert char to decimal value
	 * @private
	 */
	function toDec(ch) {
		ch = ch.substring(0, 1);
		var decVal = ch.charCodeAt(0);		
		return decVal;
	}
	
	//public methods:
	
	/**
	 * A utility class to assemble a single value from the 2 bytes returned from the
	 * Arduino (since data is passed in 7 bit Bytes rather than 8 bit it must be 
	 * reassembled. This is to be used as a protected method and should not be needed
	 * in any application level code.
	 *
	 * @private
	 * @param {Number} lsb The least-significant byte of the 2 values to be concatentated
	 * @param {Number} msb The most-significant byte of the 2 values to be concatenated
	 * @return {Number} The result of merging the 2 bytes
	 */
	this.getValueFromTwo7bitBytes = function(lsb, msb) {
		return (msb <<7) | lsb;
	}
	
	/**
	 * @return {WebSocket} A reference to the WebSocket
	 */
	this.getSocket = function() { return socket }
	
	/**
	 * Resets the Arduino. To know when the Arduino is available after reset, listen for
	 * Arduino.FIRMWARE_VERSION, because the version is automatically send from Arduino
	 * upon reset.
	 */
	this.resetBoard = function() {
		self.send(SYSEX_RESET);
	}
	
	/**
	 * Request the Firmata version implemented in the firmware (sketch) running
	 * on the Arduino.
	 * Listen for the Arduino.FIRMWARE_VERSION event to be notified of when 
	 * the Firmata version is returned from the Arduino.
	 */	
	this.reportVersion = function() {
		self.send(REPORT_VERSION);
	}
	
	/**
	 * Request the name of the firmware (the sketch) running on the Arduino.
	 * Listen for the Arduino.FIRMWARE_NAME event to be notified of when 
	 * the name is returned from the Arduino. The version number is also returned.
	 */
	this.reportFirmware = function() {
		self.send([START_SYSEX,REPORT_FIRMWARE,END_SYSEX]);
	}
	
	/**
	 * Disables digital pin reporting for all digital pins
	 */
	this.disableDigitalPinReporting = function() {
		self.send([REPORT_DIGITAL, 0]);
		self.send([REPORT_DIGITAL + 1, 0]);
	}
	
	/**
	 * Enables digital pin reporting for all digital pins. You must call this
	 * before you can receive digital pin data from the Arduino.
	 */
	this.enableDigitalPinReporting = function() {
		self.send([REPORT_DIGITAL + 0, 1]);
		self.send([REPORT_DIGITAL + 1, 1]);
	}
	
	/**
	 * Call this method to enable or disable analog input for the specified pin.
	 * Listen for the ArduinoEvent.ANALOG_DATA to be notified of incoming analog data.
	 *
	 * @param {Number} pin The pin connected to the analog input
	 * @param {Number} mode Arduino.ON to enable input or Arduino.OFF to disable input
	 * for the specified pin.
	 */
	this.setAnalogPinReporting = function(pin, mode) {
		self.send([REPORT_ANALOG | pin, mode]);
	}
	
	/**
	 * Set the specified pin to Input or Output. Also used to enable the pull-up resistor
	 * for the specified pin by writing Arduino.HIGH to the pin.
	 * For example, setPinMode(4, Arduino.HIGH) will enable the pull-up resistor for digital
	 * pin 4.
	 * For digital input, listen for the ArduinoEvent.DIGITAL_DATA to be notified 
	 * of incoming digital data.
	 *
	 * @param {Number} pin The pin connected to the digital input or output
	 * @param {Number} mode Arduino.INPUT or Arduino.OUTPUT and optionally Arduino.HIGH to 
	 * enable the pull-up resistor.
	 */
	this.setPinMode = function(pin, mode) {
		self.send([SET_PIN_MODE, pin, mode]);
	}
	
	/**
	 * Returns the analog data for a specified pin. When an analog value
	 * is received it is stored. However it is best in most cases to listen
	 * for the ArduinoEvent.ANALOG_DATA and get the analog value from the
	 * event parameter (event.data.value) rather than using this getter method.
	 *
	 * @param {Number} pin The pin number to return analog data for
	 * @return {Number} The analog data for the specified pin
	 */
	this.getAnalogData = function(pin) {
		return _analogData[pin];
	}
	
	/**
	 * Returns the digital data for a specified pin. When a digital value
	 * is received it is stored. However it is best in most cases to listen
	 * for the ArduinoEvent.DIGITAL_DATA and get the digital value from the
	 * event parameter (event.data.value) rather than using this getter method.
	 
	 * @param {Number} pin The pin number to return digital data for
	 * @return {Number} The digital data for the specified pin
	 */	
	this.getDigitalData = function(pin) {
		return _digitalData[pin];
	}
	
	/**
	 * @return {String} The version of the Firmata firmware running on the Arduino.
	 */
	this.getFirmwareVersion = function() {
		return _firmwareVersion;
	}
	
	/**
	 * Simulate an analog signal on a PWM pin. For example use this method to fade an LED or
	 * send an 8-bit waveform.
	 *
	 * @param {Number} pin The pin to send the analog signal to.
	 * @param {Number} value The value (to do: check on max resolution) to send
	 */
	this.sendAnalog = function(pin, value) {
		self.send([ANALOG_MESSAGE | (pin & 0x0F), value & 0x007F,(value >> 7) & 0x007F]);
	}
	
	/**
	 * An alternative to the normal analog message allowing addressing beyond pin 15
	 * and supports sending analog values up to 16 bits.
	 *
	 * @param {Number} pin The pin to send the analog signal to
	 * @param {Number} value The value to send to the specified pin
	 */
	this.sendExtendedAnalog = function(pin, value) {
		var tempArray = [];
		
		// if > 16 bits
		if (value > Math.pow(2, 16)) {
			var err = "Extended Analog values > 16 bits are not currently supported by StandardFirmata";
			console.log(err);
			throw err;
			return;
		}
		
		tempArray[0] = START_SYSEX;
		tempArray[1] = EXTENDED_ANALOG;
		tempArray[2] = pin;
		tempArray[3] = value & 0x007F;
	 	tempArray[4] = (value >> 7) & 0x007F;	// up to 14 bits
				
	 	// if > 14 bits
	 	if (value >= Math.pow(2, 14)) {
	 		tempArray[5] = (value >> 14) & 0x007F;
	 	}

		tempArray.push(END_SYSEX);
		self.send(tempArray);	
	}	
	
	/**
	 * Set a digital pin on the Arduino to High or Low.
	 *
	 * @param {Number} pin The pin number to set or clear.
	 * @param {Number} mode Either Arduino.HIGH or Arduino.LOW
	 */
	this.sendDigital = function(pin, mode) {
		var digitalPin = 0;
		if (mode == Arduino.HIGH) {
			// set the bit
			//_digitalPins |= (mode << pin);
			digitalPin |= (mode << pin);
		}
		else if (mode == Arduino.LOW) {
			// clear the bit
			//_digitalPins &= ~(1 << pin);
			digitalPin &= ~(1 << pin);
		}
		if (pin <= 7) {
			//self.send([DIGITAL_MESSAGE|0, _digitalPins % 128, (_digitalPins >> 7) & 1]);
			self.send([DIGITAL_MESSAGE|0, digitalPin % 128, (digitalPin >> 7) & 1]);
		}
		else {
			//self.send([DIGITAL_MESSAGE|1, _digitalPins >> 8, 0]);
			self.send([DIGITAL_MESSAGE|1, digitalPin >> 8, 0]);
		}
	}
	
	// to do: test this function... I've never actually used it.
	this.sendDigitalPort = function(portNumber, portData) {
		self.send([DIGITAL_MESSAGE | (portNumber & 0x0F), portData % 128, portData >> 7]);
	}
	
	// to do: allow 1 or 2 params
	// (string) and (command, string)
	/**
	 * Send a string message to the Arduino. This is useful if you have a custom sketch
	 * running on the Arduino rather than StandardFirmata and want to communicate with
	 * your javascript message via string messages that you then parse in javascript.
	 * You can receive string messages as well.
	 *
	 * <p>To test, load the EchoString.pde example from Firmata->Examples menu in the
	 * Arduino Application, then use sendString("your string message") to have it
	 * echoed back to your javascript application.</p>
	 * 
	 * @param {String} str The string message to send to the Arduino
	 */
	this.sendString = function(str) {
		// convert chars to decimal values
		var decValues = [];
		for (var i=0, len=str.length; i<len; i++) {
			decValues.push(toDec(str[i]) & 0x007F);
			decValues.push((toDec(str[i]) >> 7) & 0x007F);
		}
		// data > 7 bits in length must be split into 2 bytes and packed into an
		// array before passing to the sendSysex method
		this.sendSysex(STRING_DATA, decValues);
	}
	
	/**
	 * Send a sysEx message to the Arduino. This is useful for sending custom sysEx data
	 * to the Arduino, for example if you are not using StandardFirmata. You would likely
	 * use it in a class rather than calling it from your main application.
	 *
	 * @private
	 * @param {Number} command The sysEx command value (see firmata.org)
	 * @param {Number[]} data A packet of data representing the sysEx message to be sent
	 * @see <a href="http://firmata.org/wiki/Protocol#Sysex_Message_Format">Firmata Sysex Message Format"</a>
	 */
	this.sendSysex = function(command, data) {
		var tempArray = [];
		tempArray[0] = START_SYSEX;
		tempArray[1] = command;
		// this would be problematic since the sysex message format does not enforce
		// splitting all bytes after the command byte
		//for (var i=0, len=data.length; i<len; i++) {
		//	tempArray.push(data[i] & 0x007F);
		//	tempArray.push((data[i] >> 7) & 0x007F);				
		//}
		
		for (var i=0, len=data.length; i<len; i++) {
			tempArray.push(data[i]);			
		}
		tempArray.push(END_SYSEX);
		self.send(tempArray);		
	}
		
	/**
	 * Set the angle (in degrees) to rotate the servo head to. Only tested for 0-180 degrees
	 * so far since that's the limit of my servo.
	 *
	 * @param {Number} pin The pin the servo is connected to.
	 * @param {Number} value The angle (in degrees) to rotate the servo head to
	 */
	this.sendServo = function(pin, value) {
		//if (_digitalPinMode[pin]==Arduino.SERVO && (_digitalData[pin]!=value || force)) {
			self.send([ANALOG_MESSAGE | (pin & 0x0F), value % 128, value >> 7]);
			_digitalData[pin] = value;
		//}
	}
	
	/**
	 * Call to associate a pin with a connected servo motor. See the documentation for your
	 * servo motor for the minimum and maximum pulse width. If you can't find it, then the
	 * default values should be close enough so call sendServoAttach(pin) omitting the
	 * min and max values.
	 *
	 * @param {Number} pin The pin the server is connected to.
	 * @param {Number} minPulse [optional] The minimum pulse width for the servo. Default = 544.
	 * @param {Number} maxPulse [optional] The maximum pulse width for the servo. Default = 2400.
	 */
	this.sendServoAttach = function(pin, minPulse, maxPulse) {

		minPulse = minPulse || 544; 	// default value = 544
		maxPulse = maxPulse || 2400;	// default value = 2400
	
		var tempArray = [];
		tempArray[0] = START_SYSEX;
		tempArray[1] = SERVO_CONFIG;
		tempArray[2] = pin;
		tempArray[3] = minPulse % 128;
		tempArray[4] = minPulse >> 7;
		tempArray[5] = maxPulse % 128;
		tempArray[6] = maxPulse >> 7;
		tempArray[7] = END_SYSEX;
		//_digitalPinMode[pin] = Arduino.SERVO;
		
		self.send(tempArray);
	}
	
	/**
	 * Checks if a servo is connected to the specified pin number
	 *
	 * @param {Number} pin The pin number you are checking for a servo on.
	 * @return {Number} The pin number if it contains a servo, else -1
	 */
	this.getServo = function(pin) {
		if (_digitalPinMode[pin] == Arduino.SERVO) {
			return _digitalData[pin];
		} else {
			return -1;
		}
	}
	
	/**
	 * Query the cababilities and current state any board running Firmata.
	 * 
	 * @private
	 */
	this.queryCapabilities = function() {
		self.send([START_SYSEX,CAPABILITY_QUERY,END_SYSEX]);
	}
	
	/**
	 * Query the current configuration and state of any pin
	 * 
	 * @param {Pin} pin The Pin to be queried
	 */
	this.queryPinState = function(pin) {
		// to do: ensure that pin is a Pin object
		var pinNumber = pin.number;
		self.send([START_SYSEX,PIN_STATE_QUERY,pinNumber,END_SYSEX]);
	}
	
	/**
	 * Query which pins correspond to the analog channels
	 */
	this.queryAnalogMapping = function() {
		self.send([START_SYSEX,ANALOG_MAPPING_QUERY,END_SYSEX]);
	}
	
	/**
	 * Set the sampling interval (how often to run the main loop on the Arduino). Normally
	 * this method should not be called.
	 *
	 * @param {Number} interval The interval for main loop in the Arduino application. Default = 19ms.
	 */
	this.setSamplingInterval = function(interval) {
		// to do: test this to ensure it is working properly
		// also set a range to prevent people from entering extreme values.
		self.send([START_SYSEX,SAMPLING_INTERVAL, interval & 0x007F, (interval >> 7) & 0x007F, END_SYSEX]);
	}
	
	/**
	 * @return {Pin} A reference to the Pin object.
	 */
	this.getPin = function(pinNumber) {
		return _ioPins[pinNumber];
	}
	
	/**
	 * @return {Pin} A reference to the Pin object.
	 */	
	this.getAnalogPin = function(pinNumber) {
		return _ioPins[_analogPinMapping[pinNumber]];
	}
	
	/**
	 * @return {Pin} A reference to the Pin object.
	 */	
	this.getDigitalPin = function(pinNumber) {
		return _ioPins[_digitalPinMapping[pinNumber]];
	}
	
	/**
	 * Call this method to print the capabilities for all pins to the console
	 */
	this.reportCapabilities = function() {
		var modeNames = {0:"input", 1:"output", 2:"analog", 3:"pwm", 4:"servo", 5:"shift", 6:"i2c"};
		for (var i=0, len=_ioPins.length; i<len; i++) {
			for (var mode in _ioPins[i].capabilities) {
				console.log("pin " + i + "\tmode: " + modeNames[mode] + "\tresolution (# of bits): " + _ioPins[i].capabilities[mode]);
			}
		}
	}
	
	/**
	 * A wrapper for the send method of the WebSocket
	 * I'm not sure there is a case for the user to call this method
	 * So I'm making this private for now.
	 *
	 * @private
	 * @param {Number[]} message Message data to be sent to the Arduino
	 */
	this.send = function(message) {
		socket.send(message);
	}
	
	/**
	 * A wrapper for the close method of the WebSocket
	 */
	this.close = function() {
		console.log("socket = " + socket);
		socket.close();
	}
	
	/* implement EventDispatcher */
	
	/**
	 * @param {String} type The event type
	 * @param {Function} listener The function to be called when the event is fired
	 */
	this.addEventListener = function(type, listener) {
		_evtDispatcher.addEventListener(type, listener);
	}
	
	/**
	 * @param {String} type The event type
	 * @param {Function} listener The function to be called when the event is fired
	 */
	this.removeEventListener = function(type, listener) {
		_evtDispatcher.removeEventListener(type, listener);
	}
	
	/**
	 * @param {String} type The event type
	 * return {boolean} True is listener exists for this type, false if not.
	 */
	this.hasEventListener = function(type) {
		return _evtDispatcher.hasEventListener(type);
	}
	
	/**
	 * @param {Event} type The Event object
	 * return {boolean} True if dispatch is successful, false if not.
	 */		
	this.dispatchEvent = function(event) {
		return _evtDispatcher.dispatchEvent(event);
	}	

}

// to do: use a static object to represent constants?

// board types:
Arduino.STANDARD				= 0; // UNO, Duemilanove, Diecimila, NG
Arduino.MEGA					= 1; // not yet supported

/** @constant */
Arduino.HIGH					= 1;
/** @constant */
Arduino.LOW						= 0;
/** @constant */
Arduino.ON						= 1;
/** @constant */
Arduino.OFF						= 0;
	
// pin modes
/** @constant */
Arduino.INPUT					= 0x00;
/** @constant */
Arduino.OUTPUT					= 0x01;
/** @constant */
Arduino.ANALOG					= 0x02;
/** @constant */
Arduino.PWM						= 0x03;
/** @constant */
Arduino.SERVO					= 0x04;
/** @constant */
Arduino.SHIFT					= 0x05;
/** @constant */
Arduino.I2C						= 0x06;
/** @constant */
Arduino.TOTAL_PIN_MODES			= 7;


/**
 * An object to represent an Arduino pin
 * @constructor
 * @param {Number} number The pin number
 * @param {Number} type The type of pin
 */
function Pin(number, type) {
	this.number = number;
	this.type = type;
	this.capabilities;
	
	var _value = 0;
	var _lastValue = 0;
	
	this.getValue = function() {
		return _value;
	}
	
	this.setValue = function(val) {
		_lastValue = _value;
		_value = val;
	}
	
	this.getLastValue = function() {
		return _lastValue;
	}
}


/**
 * @constructor
 * @augments Event
 * @param {String} type The event type
 * @param {Object} data An object containing additional parameters
 */
function ArduinoEvent(type, data) {
	this.data = data;
	// call the super class
	// 2nd parameter is passed to EventDispatcher constructor
	Event.call(this, type);
}

// events
/** @constant */
ArduinoEvent.ANALOG_DATA				= "analodData";
/** @constant */
ArduinoEvent.DIGITAL_DATA				= "digitalData";
/** @constant */
ArduinoEvent.FIRMWARE_VERSION			= "firmwareVersion";
/** @constant */
ArduinoEvent.FIRMWARE_NAME				= "firmwareName";
/** @constant */
ArduinoEvent.STRING_MESSAGE				= "stringMessage";
/** @constant */
ArduinoEvent.SYSEX_MESSAGE				= "sysexMessage";
/** @constant */
ArduinoEvent.CAPABILITY_RESPONSE		= "capabilityResponse";
/** @constant */
ArduinoEvent.PIN_STATE_RESPONSE			= "pinStateResponse";
/** @constant */
ArduinoEvent.ANALOG_MAPPING_RESPONSE	= "analogMappingResponse";
/** @constant */
ArduinoEvent.READY						= "arduinoReady";


// to do: figure out how to inherit a class without using 'new' when we want
// to call the super class in the subclass constructor (as we do in this case)
ArduinoEvent.prototype = new Event;
ArduinoEvent.prototype.constructor = ArduinoEvent;
