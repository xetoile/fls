exports.plugin = {
	name: 'base',
	version: '1.0.0',
	register: async function (server, options) {

		// French cuisine
		const Joi = require('joi');
		const Boom = require('boom');
		const Path = require('path');
		const Nodemailer = require('nodemailer');

		// page references
		const errorPage = '/public/html/error.html';
		const homePage = '/public/html/home.html';
		
		// introduce ourselves
		server.route({
			method: 'GET',
			path: '/',
			handler: (request, h) => {
				return h.redirect(homePage);
			}
		});

		// contact route (aka mailer)
		server.route({
			method: 'POST',
			path: '/contact',
			options: {
				validate: {
					payload: {
						copyTo: Joi.string().email().required().description("Contact e-mail of the writer"),
						// min in half the Universe
						body: Joi.string().required().min(21).description("Message itself")
					}
				}
			},
			handler: (request, h) => {
				return new Promise((resolve, reject) => {
					var d = new Date();
					console.log(`[MAILER ${d.toLocaleTimeString()}] in promise`);
					Nodemailer.createTransport(options.transport).sendMail(
						{
							from: options.contact.server,
							sender: options.contact.server,
							to: options.contact.target,
							replyTo: options.contact.target,
							cc: request.payload.copyTo,
							subject: `Contact from ${options.owner.name}`,
							text: request.payload.body
						},
						(err, info) => {
							d = new Date();
							console.log(`[MAILER ${d.toLocaleTimeString()}] in callback`);
							if (err) {
								console.log('[MAILER] throwing', err);
								throw Boom.badRequest(err);
							}
							console.log('[MAILER] continuing', info);
							return resolve(h.continue);
						}
					);
				});
			}
		});

		// static /public/* serving through Inert
		server.route({
			method: 'GET',
			path: '/public/{param*}',
			handler: {
				directory: {
					path: Path.join(options.dirname, 'public'),
					redirectToSlash: false,
					index: false
				}
			},
			options: {
				ext: {
					// redirect any hard Inert error to a decent HTML
					onPreResponse: {
						method: (request, h) => {
							if (request.response.isBoom) {
								return h.redirect(errorPage);
							}
							return h.continue;
						}
					}
				}
			}
		});

		// catch-all route to avoid hard 404
		// not called by Inert generic handler
		server.route({
			method: '*',
			path: '/{p*}',
			handler: (request, h) => {
				return h.redirect(errorPage);
			}
		});

	}
}