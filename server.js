'use strict';

// get the French cuisine
const Hapi = require('hapi');
const Joi = require('joi');
const config = require('./private/config.json');

// assert back-end-required config, no transformations
let joiValidationError = Joi.validate(
	config,
	{
		owner: {
			name: Joi.string()
		},
		db: {
			name: Joi.string()
		},
		server: {},
		tjm: Joi.number(),
		nodemailer: {
			transport: {},
			contact: {
				target: Joi.string().email(),
				server: Joi.string().email()
			}
		}
	},
	{
		convert: false,
		allowUnknown: true,
		presence: 'required'
	}
).error;
if (joiValidationError) {
	throw joiValidationError;
}


// define server
const server = Hapi.server(config.server);

// server init handler
const init = async () => {

	// register core plugins
	await server.register([
		require('inert'),
		{
			plugin: require('./plugins/rtdb/plugin'),
			options: {
				dbName: config.db.name,
				connection: config.db.connection
			}
		}
	]);

	// register high-end plugins
	await Promise.all([
		server.register({
			plugin: require('./plugins/base/plugin'),
			options: {
				dirname: __dirname,
				transport: config.nodemailer.transport,
				owner: config.owner,
				contact: {
					target: config.nodemailer.contact.target,
					server: config.nodemailer.contact.server
				}
			}
		}),
		server.register(
			{
				plugin: require('./plugins/calculator/plugin'),
				options: {
					tjm: config.tjm
				}
			},
			{
				routes: {
					prefix: '/calculator'
				}
			}
		)
	]);

	// boot up
	await server.start();

	// be Hapi
	console.log(
		`Running on ${server.info.uri} using hapi@${server.version}`
	);
}

// topmost error catcher
process.on('unhandledRejection', (err) => {
	console.log("TOPMOST ERROR CATCHER:");
	console.log(err);
});

// ALIVE, IT'S ALIVE!
init();