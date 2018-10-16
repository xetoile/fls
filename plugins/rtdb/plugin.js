exports.plugin = {
	name: 'rtdb',
	version: '1.0.0',
	register: async function (server, options) {

		// French cuisine
		const r = require('rethinkdb');

		// get in touch... (no try-catch, on server boot-up we afford to crash)
		var connection = await r.connect(options.connection);
		// ...and stay in touch! (in case DB restarts/blows)
		var tryingReconnection = false; // flag to handle only one reconnection chain at once
		var innerReconnector = async function() { // calls to this will be chained until DB is back
			try {
				connection = await connection.reconnect();
				tryingReconnection = false; // reconnected: set flag back to normal
			} catch (err) {
				setTimeout(innerReconnector, 1000); // DB still off: chain
			}
		};
		// reconnection entry point
		const reconnector = () => {
			if (tryingReconnection) {
				return;
			}
			tryingReconnection = true; // only one shall pass
			innerReconnector();
		};
		// finally attach reconnector listener, like EVERYWHERE!
		connection.on('close', reconnector);
		connection.on('timeout', reconnector);
		connection.on('error', reconnector);

		// general helper methods
		const rDb = () => {
			return r.db(options.dbName);
		};
		const rTable = (tableName) => {
			return rDb().table(tableName);
		};

		// query runner
		const rRun = async (query) => {
			var cursorOrData = await query.run(connection);
			if (cursorOrData['toArray']) {
				return cursorOrData.toArray();
			}
			return cursorOrData;
		};

		// augment the server with DB helpers
		server.decorate('server', 'r', r);
		server.decorate('server', 'rDb', rDb);
		server.decorate('server', 'rTable', rTable);
		server.decorate('server', 'rRun', rRun);

	}
}