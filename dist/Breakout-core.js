/***
	Breakout - 0.1.6

    Copyright (c) 2011-2012 Jeff Hoefs <soundanalogous@gmail.com>
    Released under the MIT license. See LICENSE file for details.
	http.//breakoutjs.com
	***/
'use strict';var BO=BO||{},BREAKOUT=BREAKOUT||BO;BREAKOUT.VERSION="0.1.6";BO.enableDebugging=!1;var JSUTILS=JSUTILS||{};JSUTILS.namespace=function(a){var a=a.split("."),b=window,f;for(f=0;f<a.length;f+=1)"undefined"===typeof b[a[f]]&&(b[a[f]]={}),b=b[a[f]];return b};JSUTILS.inherit=function(a){function b(){}if(null==a)throw TypeError();if(Object.create)return Object.create(a);var f=typeof a;if("object"!==f&&"function"!==f)throw TypeError();b.prototype=a;return new b};
if(!Function.prototype.bind)Function.prototype.bind=function(a){if("function"!==typeof this)throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");var b=Array.prototype.slice.call(arguments,1),f=this,k=function(){},g=function(){return f.apply(this instanceof k?this:a||window,b.concat(Array.prototype.slice.call(arguments)))};k.prototype=this.prototype;g.prototype=new k;return g};JSUTILS.namespace("JSUTILS.Event");
JSUTILS.Event=function(){var a;a=function(a){this._type=a;this._target=null;this.name="Event"};a.prototype={get type(){return this._type},set type(a){this._type=a},get target(){return this._target},set target(a){this._target=a}};a.CONNECTED="connected";a.CHANGE="change";a.COMPLETE="complete";return a}();JSUTILS.namespace("JSUTILS.EventDispatcher");
JSUTILS.EventDispatcher=function(){var a;a=function(a){this._target=a||null;this._eventListeners={};this.name="EventDispatcher"};a.prototype={addEventListener:function(a,f){this._eventListeners[a]||(this._eventListeners[a]=[]);this._eventListeners[a].push(f)},removeEventListener:function(a,f){for(var k=0,g=this._eventListeners[a].length;k<g;k++)this._eventListeners[a][k]===f&&this._eventListeners[a].splice(k,1)},hasEventListener:function(a){return this._eventListeners[a]&&0<this._eventListeners[a].length?
!0:!1},dispatchEvent:function(a,f){a.target=this._target;var k=!1,g;for(g in f)a[g.toString()]=f[g];if(this.hasEventListener(a.type)){g=0;for(var e=this._eventListeners[a.type].length;g<e;g++)try{this._eventListeners[a.type][g].call(this,a),k=!0}catch(s){}}return k}};return a}();JSUTILS.namespace("JSUTILS.TimerEvent");
JSUTILS.TimerEvent=function(){var a,b=JSUTILS.Event;a=function(a){this.name="TimerEvent";b.call(this,a)};a.TIMER="timerTick";a.TIMER_COMPLETE="timerComplete";a.prototype=JSUTILS.inherit(b.prototype);return a.prototype.constructor=a}();JSUTILS.namespace("JSUTILS.Timer");
JSUTILS.Timer=function(){var a,b=JSUTILS.TimerEvent,f=JSUTILS.EventDispatcher;a=function(a,g){f.call(this,this);this.name="Timer";this._count=0;this._delay=a;this._repeatCount=g||0;this._isRunning=!1;this._timer=null};a.prototype=JSUTILS.inherit(f.prototype);a.prototype.constructor=a;a.prototype.__defineGetter__("delay",function(){return this._delay});a.prototype.__defineSetter__("delay",function(a){this._delay=a;this._isRunning&&(this.stop(),this.start())});a.prototype.__defineGetter__("repeatCount",
function(){return this._repeatCount});a.prototype.__defineSetter__("repeatCount",function(a){this._repeatCount=a;this._isRunning&&(this.stop(),this.start())});a.prototype.__defineGetter__("running",function(){return this._isRunning});a.prototype.__defineGetter__("currentCount",function(){return this._count});a.prototype.start=function(){if(null===this._timer)this._timer=setInterval(this.onTick.bind(this),this._delay),this._isRunning=!0};a.prototype.reset=function(){this.stop();this._count=0};a.prototype.stop=
function(){if(null!==this._timer)clearInterval(this._timer),this._timer=null,this._isRunning=!1};a.prototype.onTick=function(){this._count+=1;0!==this._repeatCount&&this._count>this._repeatCount?(this.stop(),this.dispatchEvent(new b(b.TIMER_COMPLETE))):this.dispatchEvent(new b(b.TIMER))};return a}();JSUTILS.namespace("BO.IOBoardEvent");
BO.IOBoardEvent=function(){var a,b=JSUTILS.Event;a=function(a){this.name="IOBoardEvent";b.call(this,a)};a.ANALOG_DATA="analogData";a.DIGITAL_DATA="digitalData";a.FIRMWARE_VERSION="firmwareVersion";a.FIRMWARE_NAME="firmwareName";a.STRING_MESSAGE="stringMessage";a.SYSEX_MESSAGE="sysexMessage";a.PIN_STATE_RESPONSE="pinStateResponse";a.READY="ioBoardReady";a.CONNECTED="ioBoardConnected";a.DISCONNECTED="ioBoardDisonnected";a.prototype=JSUTILS.inherit(b.prototype);return a.prototype.constructor=a}();JSUTILS.namespace("BO.WSocketEvent");
BO.WSocketEvent=function(){var a,b=JSUTILS.Event;a=function(a){this.name="WSocketEvent";b.call(this,a)};a.CONNECTED="webSocketConnected";a.MESSAGE="webSocketMessage";a.CLOSE="webSocketClosed";a.prototype=JSUTILS.inherit(b.prototype);return a.prototype.constructor=a}();JSUTILS.namespace("BO.WSocketWrapper");
BO.WSocketWrapper=function(){var a,b=JSUTILS.EventDispatcher,f=BO.WSocketEvent;a=function(a,g,e,f){this.name="WSocketWrapper";b.call(this,this);this._host=a;this._port=g;this._protocol=f||"default-protocol";this._useSocketIO=e||!1;this._socket=null;this._readyState="";this.init(this)};a.prototype=JSUTILS.inherit(b.prototype);a.prototype.constructor=a;a.prototype.init=function(a){if(a._useSocketIO){a._socket=io.connect("http://"+a._host+":"+a._port);try{a._socket.on("connect",function(){a.dispatchEvent(new f(f.CONNECTED));
a._socket.on("message",function(g){a.dispatchEvent(new f(f.MESSAGE),{message:g})})})}catch(g){console.log("Error "+g)}}else try{if("MozWebSocket"in window)a._socket=new MozWebSocket("ws://"+a._host+":"+a._port,a._protocol);else if("WebSocket"in window)a._socket=new WebSocket("ws://"+a._host+":"+a._port);else throw console.log("Websockets not supported by this browser"),"Websockets not supported by this browser";a._socket.onopen=function(){a.dispatchEvent(new f(f.CONNECTED));a._socket.onmessage=function(g){a.dispatchEvent(new f(f.MESSAGE),
{message:g.data})};a._socket.onclose=function(){a._readyState=a._socket.readyState;a.dispatchEvent(new f(f.CLOSE))}}}catch(e){console.log("Error "+e)}};a.prototype.send=function(a){this.sendString(a)};a.prototype.sendString=function(a){this._socket.send(a.toString())};a.prototype.__defineGetter__("readyState",function(){return this._readyState});return a}();JSUTILS.namespace("BO.generators.GeneratorEvent");
BO.generators.GeneratorEvent=function(){var a,b=JSUTILS.Event;a=function(a){b.call(this,a);this.name="GeneratorEvent"};a.prototype=JSUTILS.inherit(b.prototype);a.prototype.constructor=a;a.UPDATE="update";return a}();JSUTILS.namespace("BO.generators.GeneratorBase");
BO.generators.GeneratorBase=function(){var a,b=JSUTILS.EventDispatcher;a=function(){b.call(this,this);this.name="GeneratorBase"};a.prototype=JSUTILS.inherit(b.prototype);a.prototype.constructor=a;a.prototype.__defineGetter__("value",function(){return this._value});a.prototype.__defineSetter__("value",function(a){this._value=a});return a}();JSUTILS.namespace("BO.PinEvent");
BO.PinEvent=function(){var a,b=JSUTILS.Event;a=function(a){this.name="PinEvent";b.call(this,a)};a.CHANGE="pinChange";a.RISING_EDGE="risingEdge";a.FALLING_EDGE="fallingEdge";a.prototype=JSUTILS.inherit(b.prototype);return a.prototype.constructor=a}();JSUTILS.namespace("BO.Pin");
BO.Pin=function(){var a,b=JSUTILS.EventDispatcher,f=BO.PinEvent,k=BO.generators.GeneratorEvent;a=function(a,e){this.name="Pin";this._type=e;this._number=a;this._analogNumber=void 0;this._maxPWMValue=255;this._value=0;this._lastValue=-1;this._average=0;this._minimum=Math.pow(2,16);this._numSamples=this._sum=this._maximum=0;this._generator=this._filters=null;this._autoSetValueCallback=this.autoSetValue.bind(this);this._evtDispatcher=new b(this)};a.prototype={setAnalogNumber:function(a){this._analogNumber=
a},get analogNumber(){return this._analogNumber},get number(){return this._number},setMaxPWMValue:function(){this._maxPWMValue=value},get maxPWMValue(){return this._maxPWMValue},get average(){return this._average},get minimum(){return this._minimum},get maximum(){return this._maximum},get value(){return this._value},set value(a){this._lastValue=this._value;this._preFilterValue=a;this._value=this.applyFilters(a);this.calculateMinMaxAndMean(this._value);this.detectChange(this._lastValue,this._value)},
get lastValue(){return this._lastValue},get preFilterValue(){return this._preFilterValue},get filters(){return this._filters},set filters(a){this._filters=a},get generator(){return this._generator},getType:function(){return this._type},setType:function(g){if(0<=g&&g<a.TOTAL_PIN_MODES)this._type=g},getCapabilities:function(){return this._capabilities},setCapabilities:function(a){this._capabilities=a},detectChange:function(a,e){a!==e&&(this.dispatchEvent(new f(f.CHANGE)),0>=a&&0!==e?this.dispatchEvent(new f(f.RISING_EDGE)):
0!==a&&0>=e&&this.dispatchEvent(new f(f.FALLING_EDGE)))},clearWeight:function(){this._sum=this._average;this._numSamples=1},calculateMinMaxAndMean:function(a){var e=Number.MAX_VALUE;this._minimum=Math.min(a,this._minimum);this._maximum=Math.max(a,this._maximum);this._sum+=a;this._average=this._sum/++this._numSamples;this._numSamples>=e&&this.clearWeight()},clear:function(){this._minimum=this._maximum=this._average=this._lastValue=this._preFilterValue;this.clearWeight()},addFilter:function(a){if(null!==
a){if(null===this._filters)this._filters=[];this._filters.push(a)}},addGenerator:function(a){this.removeGenerator();this._generator=a;this._generator.addEventListener(k.UPDATE,this._autoSetValueCallback)},removeGenerator:function(){null!==this._generator&&this._generator.removeEventListener(k.UPDATE,this._autoSetValueCallback);this._generator=null},removeAllFilters:function(){this._filters=null},autoSetValue:function(){this.value=this._generator.value},applyFilters:function(a){if(null===this._filters)return a;
for(var e=this._filters.length,f=0;f<e;f++)a=this._filters[f].processSample(a);return a},addEventListener:function(a,e){this._evtDispatcher.addEventListener(a,e)},removeEventListener:function(a,e){this._evtDispatcher.removeEventListener(a,e)},hasEventListener:function(a){return this._evtDispatcher.hasEventListener(a)},dispatchEvent:function(a,e){return this._evtDispatcher.dispatchEvent(a,e)}};a.HIGH=1;a.LOW=0;a.ON=1;a.OFF=0;a.DIN=0;a.DOUT=1;a.AIN=2;a.AOUT=3;a.PWM=3;a.SERVO=4;a.SHIFT=5;a.I2C=6;a.TOTAL_PIN_MODES=
7;return a}();JSUTILS.namespace("BO.PhysicalInputBase");
BO.PhysicalInputBase=function(){var a,b=JSUTILS.EventDispatcher;a=function(){this.name="PhysicalInputBase";this._evtDispatcher=new b(this)};a.prototype={addEventListener:function(a,b){this._evtDispatcher.addEventListener(a,b)},removeEventListener:function(a,b){this._evtDispatcher.removeEventListener(a,b)},hasEventListener:function(a){return this._evtDispatcher.hasEventListener(a)},dispatchEvent:function(a,b){return this._evtDispatcher.dispatchEvent(a,b)}};return a}();JSUTILS.namespace("BO.I2CBase");
BO.I2CBase=function(){var a,b=BO.Pin,f=JSUTILS.EventDispatcher,k=BO.IOBoardEvent;a=function(g,e,s){if(void 0!=g){this.name="I2CBase";this.board=g;var p=s||0,s=p&255,p=p>>8&255;this._address=e;this._evtDispatcher=new f(this);e=g.getI2cPins();2==e.length?(g.getPin(e[0]).getType()!=b.I2C&&(g.getPin(e[0]).setType(b.I2C),g.getPin(e[1]).setType(b.I2C)),g.addEventListener(k.SYSEX_MESSAGE,this.onSysExMessage.bind(this)),g.sendSysex(a.I2C_CONFIG,[s,p])):console.log("Error, this board does not support i2c")}};
a.prototype={get address(){return this._address},onSysExMessage:function(b){var b=b.message,e=this.board.getValueFromTwo7bitBytes(b[1],b[2]),f=[];if(b[0]==a.I2C_REPLY&&e==this._address){for(var e=3,k=b.length;e<k;e+=2)f.push(this.board.getValueFromTwo7bitBytes(b[e],b[e+1]));this.handleI2C(f)}},sendI2CRequest:function(b){var e=[],f=b[0];e[0]=b[1];e[1]=f<<3;for(var f=2,k=b.length;f<k;f++)e.push(b[f]&127),e.push(b[f]>>7&127);this.board.sendSysex(a.I2C_REQUEST,e)},update:function(){},handleI2C:function(){},
addEventListener:function(a,b){this._evtDispatcher.addEventListener(a,b)},removeEventListener:function(a,b){this._evtDispatcher.removeEventListener(a,b)},hasEventListener:function(a){return this._evtDispatcher.hasEventListener(a)},dispatchEvent:function(a,b){return this._evtDispatcher.dispatchEvent(a,b)}};a.I2C_REQUEST=118;a.I2C_REPLY=119;a.I2C_CONFIG=120;a.WRITE=0;a.READ=1;a.READ_CONTINUOUS=2;a.STOP_READING=3;return a}();JSUTILS.namespace("BO.IOBoard");
BO.IOBoard=function(){var a=224,b=240,f=247,k=111,g=107,e=BO.Pin,s=JSUTILS.EventDispatcher,p=BO.PinEvent,C=BO.WSocketEvent,Q=BO.WSocketWrapper,l=BO.IOBoardEvent;return function(R,y,E,S){function F(a){i.removeEventListener(l.FIRMWARE_NAME,F);var j=10*a.version;q("debug: Firmware name = "+a.name+"\t, Firmware version = "+a.version);23<=j?i.send([b,g,f]):console.log("error: You must upload StandardFirmata version 2.3 or greater from Arduino version 1.0 or higher")}function G(){q("debug: IOBoard ready");
H=!0;i.dispatchEvent(new l(l.READY));i.enableDigitalPins()}function I(a){a=a.substring(0,1);return a.charCodeAt(0)}function J(a){var b=a.target.getType(),c=a.target.number,a=a.target.value;switch(b){case e.DOUT:K(c,a);break;case e.AOUT:L(c,a);break;case e.SERVO:b=i.getDigitalPin(c),b.getType()==e.SERVO&&b.lastValue!=a&&L(c,a)}}function z(a){if(a.getType()==e.DOUT||a.getType()==e.AOUT||a.getType()==e.SERVO)a.hasEventListener(p.CHANGE)||a.addEventListener(p.CHANGE,J);else if(a.hasEventListener(p.CHANGE))try{a.removeEventListener(p.CHANGE,
J)}catch(b){q("debug: Caught pin removeEventListener exception")}}function L(h,j){var c=i.getDigitalPin(h).maxPWMValue,j=j*c,j=0>j?0:j,j=j>c?c:j;if(15<h||j>Math.pow(2,14)){var c=j,d=[];if(c>Math.pow(2,16))throw console.log("error: Extended Analog values > 16 bits are not currently supported by StandardFirmata"),"error: Extended Analog values > 16 bits are not currently supported by StandardFirmata";d[0]=b;d[1]=k;d[2]=h;d[3]=c&127;d[4]=c>>7&127;c>=Math.pow(2,14)&&(d[5]=c>>14&127);d.push(f);i.send(d)}else i.send([a|
h&15,j&127,j>>7&127])}function K(a,b){var c=Math.floor(a/8);if(b==e.HIGH)t[c]|=b<<a%8;else if(b==e.LOW)t[c]&=~(1<<a%8);else{console.log("warning: Invalid value passed to sendDigital, value must be 0 or 1.");return}i.sendDigitalPort(c,t[c])}function q(a){T&&console.log(a)}this.name="IOBoard";var i=this,r,m=[],t=[],u,D=[],M=[],N=[],n=[],v=0,O=19,H=!1,A="",w=0,x,P=!1,B=!1,T=BO.enableDebugging;x=new s(this);!E&&"number"===typeof y&&(y+="/websocket");r=new Q(R,y,E,S);r.addEventListener(C.CONNECTED,function(){q("debug: Socket Status: (open)");
i.dispatchEvent(new l(l.CONNECTED));i.addEventListener(l.FIRMWARE_NAME,F);i.reportFirmware()});r.addEventListener(C.MESSAGE,function(h){var j="";if(h.message.match(/config/))j=h.message.substr(h.message.indexOf(":")+2),"multiClient"===j&&(q("debug: Multi-client mode enabled"),P=!0);else if(h=h.message,h*=1,m.push(h),j=m.length,128<=m[0]&&m[0]!=b){if(3===j){var c=m,h=c[0],d;240>h&&(h&=240,d=c[0]&15);switch(h){case 144:var g=8*d;d=g+8;c=c[1]|c[2]<<7;h={};d>=v&&(d=v);for(var j=0,k=g;k<d;k++){h=i.getDigitalPin(k);
if(void 0==h)break;if(h.getType()==e.DIN&&(g=c>>j&1,g!=h.value))h.value=g,i.dispatchEvent(new l(l.DIGITAL_DATA),{pin:h});j++}break;case 249:w=c[1]+c[2]/10;i.dispatchEvent(new l(l.FIRMWARE_VERSION),{version:w});break;case a:if(h=c[1],c=c[2],d=i.getAnalogPin(d),void 0!==d)d.value=i.getValueFromTwo7bitBytes(h,c)/1023,d.value!=d.lastValue&&i.dispatchEvent(new l(l.ANALOG_DATA),{pin:d})}m=[]}}else if(m[0]===b&&m[j-1]===f){d=m;d.shift();d.pop();switch(d[0]){case 121:for(h=3;h<d.length;h+=2)c=String.fromCharCode(d[h]),
c+=String.fromCharCode(d[h+1]),A+=c;w=d[1]+d[2]/10;i.dispatchEvent(new l(l.FIRMWARE_NAME),{name:A,version:w});break;case 113:c="";j=d.length;for(g=1;g<j;g+=2)h=String.fromCharCode(d[g]),h+=String.fromCharCode(d[g+1]),c+=h.charAt(0);i.dispatchEvent(new l(l.STRING_MESSAGE),{message:c});break;case 108:if(!B){for(var h={},j=1,g=c=0,k=d.length,o;j<=k;)if(127==d[j]){M[c]=c;o=void 0;if(h[e.DOUT])o=e.DOUT;if(h[e.AIN])o=e.AIN,D[g++]=c;o=new e(c,o);o.setCapabilities(h);z(o);n[c]=o;o.getCapabilities()[e.I2C]&&
N.push(o.number);h={};c++;j++}else h[d[j]]=d[j+1],j+=2;u=Math.ceil(c/8);q("debug: Num ports = "+u);for(d=0;d<u;d++)t[d]=0;v=c;q("debug: Num pins = "+v);i.send([b,105,f])}break;case 110:if(!B){h=d.length;j=d[2];g=n[d[1]];4<h?c=i.getValueFromTwo7bitBytes(d[3],d[4]):3<h&&(c=d[3]);g.getType()!=j&&(g.setType(j),z(g));if(g.value!=c)g.value=c;i.dispatchEvent(new l(l.PIN_STATE_RESPONSE),{pin:g})}break;case 106:if(!B){c=d.length;for(h=1;h<c;h++)127!=d[h]&&(D[d[h]]=h-1,i.getPin(h-1).setAnalogNumber(d[h]));
if(P){for(d=0;d<i.getPinCount();d++)c=i.getDigitalPin(d),i.send([b,109,c.number,f]);setTimeout(G,500);B=!0}else q("debug: System reset"),i.send(255),setTimeout(G,500)}break;default:i.dispatchEvent(new l(l.SYSEX_MESSAGE),{message:d})}m=[]}else 128<=h&&128>m[0]&&(console.log("warning: Malformed input data... resetting buffer"),m=[],h!==f&&m.push(h))});r.addEventListener(C.CLOSE,function(){q("debug: Socket Status: "+r.readyState+" (Closed)");i.dispatchEvent(new l(l.DISCONNECTED))});this.__defineGetter__("samplingInterval",
function(){return O});this.__defineSetter__("samplingInterval",function(a){10<=a&&100>=a?(O=a,i.send([b,122,a&127,a>>7&127,f])):console.log("warning: Sampling interval must be between 10 and 100")});this.__defineGetter__("isReady",function(){return H});this.getValueFromTwo7bitBytes=function(a,b){return b<<7|a};this.getSocket=function(){return r};this.reportVersion=function(){i.send(249)};this.reportFirmware=function(){i.send([b,121,f])};this.disableDigitalPins=function(){for(var a=0;a<u;a++)i.sendDigitalPortReporting(a,
e.OFF)};this.enableDigitalPins=function(){for(var a=0;a<u;a++)i.sendDigitalPortReporting(a,e.ON)};this.sendDigitalPortReporting=function(a,b){i.send([208|a,b])};this.enableAnalogPin=function(a){i.send([192|a,e.ON]);i.getAnalogPin(a).setType(e.AIN)};this.disableAnalogPin=function(a){i.send([192|a,e.OFF]);i.getAnalogPin(a).setType(e.AIN)};this.setDigitalPinMode=function(a,b){i.getDigitalPin(a).setType(b);z(i.getDigitalPin(a));i.send([244,a,b])};this.enablePullUp=function(a){K(a,e.HIGH)};this.getFirmwareName=
function(){return A};this.getFirmwareVersion=function(){return w};this.getCapabilities=function(){for(var a=[],b={"0":"input",1:"output",2:"analog",3:"pwm",4:"servo",5:"shift",6:"i2c"},c=0;c<n.length;c++){var d=[],f=0,e;for(e in n[c].getCapabilities()){var g=[];0<=e&&(g[0]=b[e],g[1]=n[c].getCapabilities()[e]);d[f]=g;f++}a[c]=d}return a};this.sendDigitalPort=function(a,b){i.send([144|a&15,b&127,b>>7])};this.sendString=function(a){for(var b=[],c=0,d=a.length;c<d;c++)b.push(I(a[c])&127),b.push(I(a[c])>>
7&127);this.sendSysex(113,b)};this.sendSysex=function(a,e){var c=[];c[0]=b;c[1]=a;for(var d=0,g=e.length;d<g;d++)c.push(e[d]);c.push(f);i.send(c)};this.sendServoAttach=function(a,g,c){var d=[],g=g||544,c=c||2400;d[0]=b;d[1]=112;d[2]=a;d[3]=g%128;d[4]=g>>7;d[5]=c%128;d[6]=c>>7;d[7]=f;i.send(d);a=i.getDigitalPin(a);a.setType(e.SERVO);z(a)};this.getPin=function(a){return n[a]};this.getAnalogPin=function(a){return n[D[a]]};this.getDigitalPin=function(a){return n[M[a]]};this.analogToDigital=function(a){return i.getAnalogPin(a).number};
this.getPinCount=function(){return v};this.getI2cPins=function(){return N};this.reportCapabilities=function(){for(var a={"0":"input",1:"output",2:"analog",3:"pwm",4:"servo",5:"shift",6:"i2c"},b=0;b<n.length;b++)for(var c in n[b].getCapabilities())console.log("Pin "+b+"\tMode: "+a[c]+"\tResolution (# of bits): "+n[b].getCapabilities()[c])};this.send=function(a){r.sendString(a)};this.close=function(){r.close()};this.addEventListener=function(a,b){x.addEventListener(a,b)};this.removeEventListener=function(a,
b){x.removeEventListener(a,b)};this.hasEventListener=function(a){return x.hasEventListener(a)};this.dispatchEvent=function(a,b){return x.dispatchEvent(a,b)}}}();
