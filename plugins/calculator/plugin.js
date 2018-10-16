exports.plugin = {
	name: 'calculator',
	version: '1.0.0',
	register: async function (server, options) {

		// French cuisine
		const Joi = require('joi');
		const Boom = require('boom');

		// expose criteria data for form to be built front-side
		server.route({
			method: 'GET',
			path: '/criteria',
			handler: (request, h) => {
				return server.rRun(
					server.rTable('criteria').without(['modifier'])
				).catch((err) => {
					throw Boom.serverUnavailable();
				});
			}
		});

		// expose family data for form to be built front-side
		server.route({
			method: 'GET',
			path: '/families',
			handler: (request, h) => {
				return server.rRun(
					server.rTable('families')
				).catch((err) => {
					throw Boom.serverUnavailable();
				});
			}
		});

		// compute the cost for a set of criteria
		server.route({
			method: 'POST',
			path: '/compute',
			options: {
				validate: {
					payload: {
						criteria: Joi.array().items(
							Joi.object().keys({
								criterium: Joi.string().required().min(1).description("Criterium ID"),
								value: Joi.number().integer().description("Criterium-related value, depending on its nature")
							})
						)
					}
				}
			},
			handler: (request, h) => {
				return Promise.all([
					server.rRun(server.rTable('families')),
					server.rRun(server.rTable('criteria').getAll(server.r.args(
						request.payload.criteria.map((c) => {
							return c.criterium;
						})
					)))
				]).then(([dbFamilies, dbCriteria]) => {
					// index DB stuff by ID, payload by family
					let indexedFamilies = {};
					dbFamilies.forEach((f) => {
						indexedFamilies[f.id] = f;
					});
					let indexedCriteria = {};
					dbCriteria.forEach((c) => {
						indexedCriteria[c.id] = c;
					});
					let indexedPayload = {};
					request.payload.criteria.forEach((input) => {
						let dbCriterium = indexedCriteria[input.criterium];
						if (!indexedPayload[dbCriterium.family_id]) {
							indexedPayload[dbCriterium.family_id] = [];
						}
						indexedPayload[dbCriterium.family_id].push({
							dbCriterium: dbCriterium,
							inputValue: input.value
						});
					});
					// parse the payload, 2 jobs:
					// - some more checking Joi couldn't handle (DB-related): family values @ 100% + range values... well, in range
					// - compute estimate according to tjm + range/logic + ratios
					// contrary to UI, API allows not all families provided, and not all criteria from 'fullview' (range) families
					let tjm = options.tjm;
					let estimate = tjm;
					console.log(`\n\n\n------------------------\nRunning estimate on base ${tjm}`);
					for (let familyId in indexedPayload) {
						let dataArray = indexedPayload[familyId];
						let family = indexedFamilies[familyId];
						let totalPercent = 0;
						let throwables = [];
						dataArray.forEach((data, index) => {
							if (data.dbCriterium.data && data.dbCriterium.data.range) {
								if (typeof data.inputValue !== 'number' || data.inputValue < data.dbCriterium.data.range[0] || data.inputValue > data.dbCriterium.data.range[1]) {
									throwables.push(`Criterium "${data.dbCriterium.name}" must be in ${data.dbCriterium.data.range[0]} and ${data.dbCriterium.data.range[1]}`);
									return;
								}
								switch (data.dbCriterium.data.logic) {
									case '*': // only case implemented for now
										estimate += tjm * data.dbCriterium.modifier * data.inputValue / 100;
										console.log(`"${data.dbCriterium.name}" mod=${data.dbCriterium.modifier} (x${data.inputValue}): ${tjm * data.dbCriterium.modifier * data.inputValue / 100}`);
										break;
								}
							} else if (family.multiple) {
								if (typeof data.inputValue !== 'number') {
									throwables.push(`Criterium "${data.dbCriterium.name}" requires a numeric value`);
									return;
								}
								totalPercent += data.inputValue;
								if (index === dataArray.length - 1 && totalPercent !== 100) {
									throwables.push(`Error in section ${family.name}: values do not add up to 100%`);
								}
								estimate += tjm * data.dbCriterium.modifier * data.inputValue / 10000;
								console.log(`"${data.dbCriterium.name}" mod=${data.dbCriterium.modifier} @${data.inputValue}%: ${tjm * data.dbCriterium.modifier * data.inputValue / 10000}`);
							} else {
								estimate += tjm * data.dbCriterium.modifier / 100;
								console.log(`"${data.dbCriterium.name}" mod=${data.dbCriterium.modifier}: ${tjm * data.dbCriterium.modifier / 100}`);
							}
						});
						if (throwables.length) {
							throwables.unshift(`Error in section ${family.name}:`);
							throw Boom.badRequest(throwables.join("\n"));
						}
					}
					console.log(`Final computation: ${Math.round(estimate * 100) / 100}\n`);
					return Math.round(estimate * 100) / 100;
				}).catch((err) => {
					throw Boom.serverUnavailable();
				})
			}
		});

	}
}