var user = process.env.RUSER;
var pass = process.env.RPASS;
var host = process.env.RHOST;

var amqp = require('amqp'),
	_ = require('lodash');

var debug = true;

if (!process.env.RHOST || !process.env.RUSER || !process.env.RPASS) {
	throw new Error('The following env variables are required: RHOST, RUSER, RPASS');
}

var amqpOpts = { host: process.env.RHOST, login: process.env.RUSER, password: process.env.RPASS };

var connection = new amqp.createConnection(amqpOpts);

// Wait for connection to become established.
connection.on('ready', function () {
	if (debug) console.log('ready');
	// Use the default 'amq.topic' exchange
	connection.queue('_activity_updated_test', {passive:true}, function (q) {
		if (debug) console.log('queue declared');
		// Catch all messages
		// Receive messages
		q.subscribe(function (message) {
			// Print messages to stdout
			console.log('updated activity ' + message.meta.id);
			if (message.meta && message.previous === null) {
				console.log('NULL previous data for ' + message.meta.id + ', company_id = ' + message.meta.company_id + ' user_id = ' + message.meta.user_id);
			}
		}).addCallback(function(ok) {
			console.log('listener set...');
		});
	});
});
