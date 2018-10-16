var theApp = angular.module('theApp', []);

theApp.factory('sharedData', function() {
	var metadata = {};
	// server passed front-relevant config into <meta>
	document.querySelector('head').querySelectorAll('meta').forEach((meta) => {
		if (meta.hasAttribute('name')) {
			metadata[meta.getAttribute('name')] = meta.getAttribute('content');
		}
	});
	return {
		getPlan: function() {
			return {
				home: {
					name: 'home',
					url: '/public/html/home.html'
				},
				services: {
					name: 'services',
					url: '/public/html/services.html'
				},
				calculator: {
					name: 'calculator',
					url: '/public/html/calculator.html'
				},
				contact: {
					name: 'contact',
					url: '/public/html/contact.html'
				},
				legal: {
					name: 'legal',
					url: '/public/html/legal.html'
				}
			};
		},
		getMeta: function(name) {
			return metadata[name] || `UNKNOWN_KEY(${name})`;
		}
	};
});

theApp.controller('LayoutHeadCtrl', function LayoutHeadCtrl(sharedData) {
	this.headTitle = sharedData.getMeta('name');
});

theApp.controller('LayoutCtrl', function LayoutCtrl(sharedData) {
	this.copyright = [
		'©',
		sharedData.getMeta('name'),
		'2018 A.D.',
		'all rights reserved'
	].join(' - ');
	this.leftMenu = sharedData.getPlan();
});

theApp.controller('HomeCtrl', function HomeCtrl(sharedData) {
	this.getMeta = sharedData.getMeta;
	this.plan = sharedData.getPlan();
});

theApp.controller('ServicesCtrl', function ServicesCtrl(sharedData) {
	this.calculatorSectionUrl = sharedData.getPlan().calculator.url;
});

theApp.controller('CalculatorCtrl', function CalculatorCtrl(
	$scope,
	$http,
	$compile,
	$q
) {
	this.meuh = () => {
		console.log(this.output);
	};
	this.loadingError = false;
	this.estimateError = '';

	this.families = [];
	this.criteria = [];
	this.selectedCriteriaIds = [];
	this.output = {};
	// handle missing fields with a $watch, if all OK then call for computation
	// logic: say if fields are missing, and if not then say if ratios are NOK
	this.missingOutputFamilies = [];
	this.invalidRatioFamilies = [];
	var watcher = () => {
		// dc about args here
		// first reset about everything, it always works better after that
		this.missingOutputFamilies = [];
		this.invalidRatioFamilies = [];
		for (var i = 0; i < this.families.length; i++) {
			var f = this.families[i];
			this.missingOutputFamilies.push(f);
			// don't re-populate invalidRatioFamilies, we do that on the fly later
		}
		// second, parse output and do the job
		for (var k in this.output) {
			var familyId = parseInt(k.split('_')[0]);
			var index = this.missingOutputFamilies.findIndex((f) => {
				return f.id === familyId;
			});
			if (index === -1) {
				// already processed that family
				continue;
			}
			var family = this.missingOutputFamilies.splice(index, 1)[0];
			if (family.multiple && !family.fullview && 100 !== this.getTotalRatioForFamily(familyId)) {
				this.invalidRatioFamilies.push(family);
			}
		}
		// sort for display
		this.missingOutputFamilies.sort((a, b) => {
			return a.id - b.id;
		});
		this.invalidRatioFamilies.sort((a, b) => {
			return a.id - b.id;
		});
		// compute? check families to ensure server answered already
		if (this.families.length && !this.missingOutputFamilies.length && !this.invalidRatioFamilies.length) {
			this.compute();
		}
	};
	// estimate block logic: missing fields
	this.displayMissingOutputFamilies = () => {
		return this.missingOutputFamilies.map((x) => {
			return x.name;
		}).join(', ');
	};
	// estimate block logic: invalid ratios
	this.displayInvalidRatioFamilies = () => {
		return this.invalidRatioFamilies.map((x) => {
			return x.name;
		}).join(', ');
	};
	// used for multiple selects/inputs' model targeting in this.output
	this.getIndex = function (element) {
		element = element[0];
		for (var index = 0; element = element.previousSibling; index++) {
			if (element.nodeName === '#comment') { // HTML FTW...
				index--;
			}
		}
		return index;
	};
	// used for multiple-typed families, to show total reached 100% or not
	this.getTotalRatioForFamily = (familyId) => {
		var total = 0;
		for (var k in this.output) {
			if (parseInt(k.split('_')[0]) !== familyId) {
				continue;
			}
			//total += parseInt(this.output[k].split('_')[1]);
			total += this.output[k].value;
		}
		return total;
	};
	//collections management, called by sub-components
	this.refresh = (elem, key, newVal, oldVal) => {
		if (elem.prop('localName').toLowerCase() === 'calculator-fullview-input') {
			// easy case: range inputs always have a value, never get deleted, nor have siblings appended
			this.output[key] = newVal;
			return;
		}
		if (!oldVal.criterium && !newVal.criterium) {
			return; // limit case: when deleting an item, ng-change fires and we need to do... nothing
		}
		var splitKey = key.split('_');
		var familyPrefix = parseInt(splitKey[0]);
		var itemIndex = parseInt(splitKey[1]);
		var parent = elem.parent();
		// case: removing a value (removes the select - if it's among a multiple-typed family - and cleanse its stored data)
		if (!newVal.criterium) {
			// remove from selectedCriteriaIds (i.e. "un-exclude" the criterium from the other lists)
			this.selectedCriteriaIds.splice(
				this.selectedCriteriaIds.indexOf(oldVal.criterium),
				1
			);
			// remove from output (i.e. our form storage)
			delete this.output[key];
			// if not last index then remove select (actually the last index is *always* empty, I'm just formal with myself)
			if (itemIndex + 1 < parent.children().length) {
				elem.remove();
				// rework this family's indexes in output (TODO? probably a more efficient way, especially with all the deletes)
				itemIndex++;
				while ([familyPrefix, itemIndex].join('_') in this.output) {
					var currentIndex = [familyPrefix, itemIndex].join('_');
					this.output[[familyPrefix, itemIndex - 1].join('_')] = this.output[currentIndex];
					delete this.output[currentIndex];
					itemIndex++;
				}
			}
			// return
			return;
		}
		// case: adding a new value (add to output storage and excluded set, and if in a multiple-typed family then append a select)
		if (!oldVal.criterium) {
			// add to selectedCriteriaIds
			this.selectedCriteriaIds.push(newVal.criterium);
			// add to output
			this.output[key] = newVal;
			// if last index (formality, it's always the last index that's empty) add a select, only when family is multiple-typed
			var isMultiple = this.families.find((f) => {
				return f.id === familyPrefix;
			}).multiple;
			if (isMultiple && itemIndex + 1 === parent.children().length) {
				parent.append($compile(`
					<calculator-multiple-select
						family="family"
						criteria-set="$ctrl.criteria"
						excluded-ids="$ctrl.selectedCriteriaIds"
						update="$ctrl.refresh"
						get-index="$ctrl.getIndex"
					></calculator-multiple-select>
				`)(parent.scope()));
			}
			// return
			return;
		}
		// final case: updating a value, easy-peasy, just replace stored data
		// update selectedCriteriaIds
		this.selectedCriteriaIds.splice(
			this.selectedCriteriaIds.indexOf(oldVal.criterium),
			1,
			newVal.criterium
		);
		// update output
		this.output[key] = newVal;
		// return
		return;
	};
	// once form is OK, this calls for daily rate estimate
	this.compute = () => {
		// first, let user be patient
		//  TODO
		// format payload
		var payload = [];
		for (var k in this.output) {
			payload.push(this.output[k]);
		}
		// call API
		$http.post('/calculator/compute', {criteria: payload})
		.then((response) => {
			this.estimateError = '';
			this.estimate = parseFloat(response.data).toFixed(2);
		}).catch((error) => {
			this.estimateError = 'error... error? error! :('
		})
	};
	// register a watcher on our output
	$scope.$watch(
		() => {
			return this.output;
		},
		watcher,
		true // yes, we're watching an object
	);
	// immediate job: call for data
	$q.all([
		$http.get('/calculator/families'),
		$http.get('/calculator/criteria')
	])
	.then((formData) => {
		this.families = formData[0].data;
		this.criteria = formData[1].data;
		// add some criterium-wise data to family, helping UI form management
		for (var i in this.criteria) {
			var c = this.criteria[i];
			if (c.data && c.data.logic) {
				this.families.find((e) => {
					return e.id === c.family_id;
				}).fullview = true;
				break; // can break because only one family to augment
			}
		}
		watcher(); // first call to watcher for init
	}).catch((err) => {
		this.loadingError = true;
	});
});

theApp.controller('ContactCtrl', function ContactCtrl(
	$http
) {
	// models
	this.mailSender = '';
	this.mailBody = '';
	// confirmation toggle
	this.confirmSendStep = false;
	// to prevent double sending
	this.mailSending = false;
	// 0 = nothing, 1 = success, -1 = failure
	this.result = 0;
	// if this.result === -1, this holds server response displayed to user
	this.errorMessage = '';
	// let the user re-confirm if need be
	this.changedMailSender = () => {
		this.confirmSendStep = false;
	};
	// go to confirmation
	this.mailConfirm = () => {
		this.confirmSendStep = true;
	}
	// send the mail
	this.mailSend = () => {
		this.mailSending = true;
		$http.post('/contact', {
			copyTo: this.mailSender,
			body: this.mailBody
		}).then((response) => {
			this.mailBody = '';
			this.confirmSendStep = false;
			this.mailSending = false;
			this.result = 1
		}).catch((response) => {
			this.mailSending = false;
			this.errorMessage = `${response.data.error}`;
			if (response.data.message) {
				this.errorMessage += ` (${response.data.message})`;
			}
			this.result = -1;
		})
	};
});

theApp.controller('LegalCtrl', function LegalCtrl(sharedData) {
	this.getMeta = sharedData.getMeta;
	this.contactSectionUrl = sharedData.getPlan().contact.url;
});