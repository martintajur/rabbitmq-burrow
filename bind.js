var amqp = require('amqp'),
	_ = require('lodash');

var total = parseInt(process.argv[2], 10);
var debug = true;

var ready = 0;
var readyPool = [];
var done = 0;
var startTime = new Date().getTime();

var stats = { ready: -1, done: -1, end: -1 };

if (debug) console.log('Starting with ' + total);

if (!process.env.RHOST || !process.env.RUSER || !process.env.RPASS) {
	throw new Error('The following env variables are required: RHOST, RUSER, RPASS');
}

var amqpOpts = { host: process.env.RHOST, login: process.env.RUSER, password: process.env.RPASS };

var exchangeConnection = new amqp.createConnection(amqpOpts);


exchangeConnection.on('ready', function () {
	var exchange = connection.exchange('rtest', {durable:true,autoDelete:false});

	var connection = {};

	_.each(_.range(total), function(r) {

		if (debug) console.log(r + ' ...');
		connection[r] = new amqp.createConnection(amqpOpts);

		// Wait for connection[r] to become established.
		connection[r].on('ready', function () {
			if (readyPool.indexOf(r) > -1) {
				throw new Error('"ready" fired twice');
			}
			readyPool.push(r);
			ready++;
			if (ready == total) {
				stats.ready = (new Date().getTime() - startTime) / 1000;
			}
			if (!exchange) {
				exchange = connection.exchange('rtest', {durable:true,autoDelete:false});
			}
			if (debug) console.log('ready '+ready);
			// Use the default 'amq.topic' exchange
			connection[r].queue('my-queue-'+process.pid+'-'+r, function (q) {
				if (debug) console.log('queue ' + r);
				// Catch all messages
				q.bind(exchange, 'user.#', function() {
					q.bind(exchange, 'company.#', function() {

						// Receive messages
						q.subscribe(function (message) {
							// Print messages to stdout
							console.log(message);
						}).addCallback(function(ok) {
							done++;
							if (done == total) {
								stats.done = (new Date().getTime() - startTime) / 1000;
								var i = 0;
								_.each(connection, function(c) {
									i++;
									c.disconnect();
									if (i == total) {
										stats.end = (new Date().getTime() - startTime) / 1000;
										console.log(stats);
									}
								})
							}
						});

					});
				});
			});
		});


	});

});
