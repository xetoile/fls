'use strict'

/*
Interactively runs a RethinkDB instance
Ctrl-C to stop the instance
Based on ../private/data.json
Used through `npm run db`
*/

const childProcess = require('child_process');
const config = require('../private/config.json').db.instance;
const cli = require('../util/cli');

// format RDB's CLI args from config
let dbArgs = [];
for (let key in config) {
	dbArgs.push(`--${key}`);
	if (config[key] !== null) {
		dbArgs.push(config[key]);
	}
}

// run, Forrest!
cli.log(['RDB', 'SPAWN'], `rethinkdb ${dbArgs.join(' ')}`);
const runner = childProcess.spawn('rethinkdb', dbArgs);
let childRunning = true;
runner.stdout.on('data', (data) => {
	cli.log(['RDB', 'OUT'], data);
});
runner.stderr.on('data', (data) => {
	cli.log(['RDB', 'ERR'], data);
});
runner.on('close', (code) => {
	cli.log(['RDB', 'EOS'], `RethinkDB closed with code ${code}.`);
	childRunning = false;
});

// kill child first (I'm a horrible person)
process.on('SIGINT', () => {
	cli.newline();
	if (childRunning) {
		runner.kill('SIGINT');
	}
});