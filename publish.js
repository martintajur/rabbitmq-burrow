var amqp = require('amqp'),
	_ = require('lodash'),
	total = parseInt(process.argv[2], 10),
	debug = true;

if (debug) console.log('Starting with ' + total);

var connections = {},
	publishers = {};

if (!process.env.RHOST || !process.env.RUSER || !process.env.RPASS) {
	throw new Error('The following env variables are required: RHOST, RUSER, RPASS');
}

var amqpOpts = { host: process.env.RHOST, login: process.env.RUSER, password: process.env.RPASS };

_.each(_.range(total), function(r) {

	connections[r] = new amqp.createConnection(amqpOpts);

	// Wait for connection[r] to become established.
	connections[r].on('ready', function () {
		if (debug) console.log('Connection ' + r + ' ready');
		var exchange = connections[r].exchange('rabbitmq-burrow-test', {passive: false, durable: true, autoDelete: false});
		
		publishers[r] = setInterval(function() {
			if (debug) console.log(r + ' published');
			exchange.publish('rabbit.testing', JSON.stringify({"test": new Date().toISOString(), "connection": r }), { contentType: 'application/json' });
		}, 100);
	});

	connections[r].on('error', function(err) {
		console.error('Error occurred with connection ' + r);
		console.error(err.stack ? err.stack : err);
		terminate();
	});

});

var terminate = function() {
	var i = 0;
	setTimeout(function() {
		process.exit(130);
	}, 5000);
	_.each(publishers, function(p) {
		clearInterval(p);
		console.log('Publishing interval ' + p + ' cleared');
	});
	_.each(connections, function(c, i) {
		c.on('close', function() {
			i++;
			if (i == total) {
				console.log('Clean shutdown! Yay!');
				process.exit(0);
			}
		})
		c.disconnect();
		console.log('Connection ' + i + ' disconnect issued');
	});
	console.log('Exiting in 5 seconds');
}

process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);
