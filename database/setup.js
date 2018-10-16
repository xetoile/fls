'use strict'

/*
Overwrites database `hapi` (name as per the config actually)
Based on ../private/data.json
Used through `npm run setup-db`
*/

// French cuisine
const Path = require('path');
const r = require('rethinkdb');
const fs = require('fs');
const cli = require('../util/cli');
const config = require('../private/config.json').db;
const data = require('../private/data.json');
const dbName = config.name;
const tableNames = Object.keys(data);
var logDomains = ['RDB'];
var connection;


// helper DB methods
const rDb = () => {
	return r.db(dbName);
};
const rTable = (tableName) => {
	return rDb().table(tableName);
};
const run = (query) => {
	return query.run(connection)
	.then((cursorOrData) => {
		if (cursorOrData['toArray']) {
			return cursorOrData.toArray();
		}
		return cursorOrData;
	});
};

// job
try {
	//connection
	r.connect(config.connection)
	.then((c) => {
		cli.log(logDomains, 'Connected to RethinkDB!');
		connection = c;
		cli.log(logDomains, 'Checking existing DBs...');
		return run(r.dbList());
	// DB creation
	}).then((dbList) => {
		if (dbList.includes(dbName)) {
			cli.log(logDomains, `Dropping DB "${dbName}"...`);
			return run(r.dbDrop(dbName));
		} else {
			cli.log(logDomains, `DB name "${dbName}" is not used.`);
		}
	}).then(() => {
		cli.log(logDomains, `Creating DB "${dbName}"...`);
		return run(r.dbCreate(dbName));
	// tables creation
	}).then(() => {
		cli.log(logDomains, `Creating ${tableNames.length} tables from datafile...`);
		return Promise.all(tableNames.map((t) => {
			return run(rDb().tableCreate(t));
		}));
	}).then(() => {
		cli.log(logDomains, `Populating tables...`);
		return Promise.all(tableNames.map((t) => {
			return run(rTable(t).insert(data[t]));
		}));
	// clean finish
	}).then(() => {
		cli.log(logDomains, `Job done, closing connection...`);
		return connection.close()
	}).then(() => {
		cli.log(logDomains, `Process done.`);
	}).catch((err) => {
		cli.log(logDomains, `Error during the process!`);
		cli.log(logDomains, err);
		if (connection) {
			try {
				connection.close();
			} catch (err) {}
		}
	});
} catch (err) {
	cli.log(logDomains, `Exception caught!`);
	cli.log(logDomains, err);
	if (connection) {
		try {
			connection.close();
		} catch (err) {}
	}
}
