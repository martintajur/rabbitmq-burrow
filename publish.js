var amqp = require('amqp'),
	_ = require('lodash');

var total = parseInt(process.argv[2], 10);

if (debug) console.log('Starting with ' + total);

var connection = {};

if (!process.env.RHOST || !process.env.RUSER || !process.env.RPASS) {
	throw new Error('The following env variables are required: RHOST, RUSER, RPASS');
}

var amqpOpts = { host: process.env.RHOST, login: process.env.RUSER, password: process.env.RPASS };

_.each(_.range(total), function(r) {

	if (debug) console.log(r + ' ...');
	connection[r] = new amqp.createConnection(amqpOpts);

	// Wait for connection[r] to become established.
	connection[r].on('ready', function () {
		var exchange = connection.exchange('rtest', {durable:true,autoDelete:false});
		
		setInterval(function() {
			exchange.publish('rtest', '{"test":"123","connection":"'+r+'"}', { contentType: 'application/json' });
		}, 100);
	});


});

var terminate = function() {
	_.each(connection, function(c) {
		c.disconnect();
	});
}


process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);
