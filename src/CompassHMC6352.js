function CompassHMC6352(board, address) {

	address = address || 0x21;
	
	var self = this;
	var _heading = 0;
	var _lastHeading = 0;
	
	I2CBase.call(self, board, address);
		
	// 0x51 = 10 Hz measurement rate, Query mode
	self.sendI2C(I2CBase.I2C_REQUEST, [I2CBase.WRITE, address, 0x47, 0x74, 0x51]);
	self.sendI2C(I2CBase.I2C_REQUEST, [I2CBase.WRITE, address, 0x41]);
	self.sendI2C(I2CBase.I2C_REQUEST, [I2CBase.READ_CONTINUOUS, address, 0x7F, 0x02]);
	
	
	this.getHeading = function() {
		return _heading;
	}
	
	this.handleI2C = function(data) {
		// data[0] = register
		_heading = Math.floor(((data[1] << 8) | data[2]) / 10.0);
		
		if (_heading != _lastHeading) {
			self.dispatchEvent(new Event(Event.CHANGE));
		}
		_lastHeading = _heading;
	}

}

CompassHMC6352.prototype = new I2CBase;
CompassHMC6352.prototype.constructor = CompassHMC6352;