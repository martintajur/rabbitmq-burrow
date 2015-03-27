var cluster = require('cluster'),
	_ = require('lodash');


if (cluster.isMaster) {

	if (!process.env.WORKERS) {
		throw new Error('WORKERS env variable must be set (to number of workers to fork)');
	}

	var workers = [],
		exited = 0;

	_.each(_.range(parseInt(process.env.WORKERS, 10)), function() {
		var w = cluster.fork();
		w.on('exit', function() {
			exited++;

			if (exited === w.length) {
				console.log('All workers are gone, exiting!');
				process.exit();
			}
		});
		workers.push(w);
	});
	
	process.on('SIGINT', function() {
		console.log('SIGINT received by the master process!');
		_.each(workers, function(w) {
			w.disconnect();
		});
	});



}
else {

	var amqp = require('amqp');

	var total = parseInt(process.argv[2], 10);
	var debug = true;

	var ready = 0;
	var readyPool = [];
	var done = 0;
	var timeouts = {};
	var startTime = new Date().getTime();

	var timeStats = { ready: -1, done: -1, end: -1 };

	if (debug) console.log(process.pid + ' ::: ' + 'Starting with ' + total);

	if (!process.env.RHOST || !process.env.RUSER || !process.env.RPASS) {
		throw new Error('The following env variables are required: RHOST, RUSER, RPASS');
	}

	var ticker = setInterval(function() {
		console.log(process.pid + ' ::: ' + '2 seconds: ' + JSON.stringify(process.memoryUsage()));
	}, 2000);

	var amqpOpts = { host: process.env.RHOST, login: process.env.RUSER, password: process.env.RPASS };

	var exchangeConnection = new amqp.createConnection(amqpOpts);

	var connections = {};

	exchangeConnection.on('ready', function () {
		var exchange = exchangeConnection.exchange('rabbitmq-burrow-test', {passive: false, durable: true,autoDelete: false});


		_.each(_.range(total), function(r) {
			timeouts[r] = setTimeout(function() {
				if (debug) console.log(process.pid + ' ::: ' + r + ' ...');
				connections[r] = new amqp.createConnection(amqpOpts);

				// Wait for connection[r] to become established.
				connections[r].on('ready', function () {
					if (readyPool.indexOf(r) > -1) {
						throw new Error('"ready" fired twice');
					}
					readyPool.push(r);
					ready++;
					if (ready == total) {
						timeStats.ready = (new Date().getTime() - startTime) / 1000;
					}
					if (!exchange) {
						exchange = connections[r].exchange('rabbitmq-burrow-test', { passive: false, durable:true, autoDelete:false });
					}
					if (debug) console.log(process.pid + ' ::: ' + 'ready '+ready);
					// Use the default 'amq.topic' exchange
					connections[r].queue('my-queue-'+r, { autoDelete: true, durable: false }, function (q) {
						if (debug) console.log(process.pid + ' ::: ' + 'queue declared ' + r);
						// Catch all messages
						q.bind(exchange, 'rabbit.#', function() {
							if (debug) console.log(process.pid + ' ::: ' + 'first binding done ' + r);
							q.bind(exchange, 'bunny.#', function() {

								if (debug) console.log(process.pid + ' ::: ' + 'second binding done ' + r);

								// Receive messages
								q.subscribe(function (message) {
									// Print messages to stdout
									console.log(process.pid + ' ::: ' + message);
								}).addCallback(function(ok) {
									if (debug) console.log(process.pid + ' ::: ' + 'subscribed ' + r);
									done++;
									if (done == total) {
										timeStats.done = (new Date().getTime() - startTime) / 1000;
										terminate();
									}
								});

							});
						});
					});
				});
			}, 20 * r);
		});

	});


	var terminate = function() {
		var i = 0;
		_.each(timeouts, function(t) {
			clearTimeout(t);
		});
		_.each(connections, function(c) {
			c.on('close', function() {
				i++;
				console.log(process.pid + ' ::: ' + 'Disconnected '+i);

				if (i == total) {
					timeStats.end = (new Date().getTime() - startTime) / 1000;
					console.log(process.pid + ' ::: ' + JSON.stringify(timeStats));
					console.log(process.pid + ' ::: ' + JSON.stringify(process.memoryUsage()));
					exchangeConnection.on('close', function() {
						process.exit();
					});
					exchangeConnection.disconnect();
				}
			});
			c.disconnect();
		});
	}

	process.on('SIGINT', terminate);
	process.on('SIGTERM', terminate);

}