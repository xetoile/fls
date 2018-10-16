angular.module('theApp').component('calculatorMultipleSelect', {
	templateUrl: '../components/calculatorMultipleSelect.html',
	bindings: {
		family: '<',
		criteriaSet: '<',
		excludedIds: '<',
		update: '&',
		getIndex: '&'
	},
	controller: function CalculatorMultipleSelectCtrl($scope, $element) {
		this.onChange = (oldModel, oldRatio) => {
			var oldValue = {
				criterium: oldModel
			};
			var newValue = {
				criterium: this.model
			};
			if (this.family.multiple) {
				oldValue.value = oldRatio;
				newValue.value = this.ratio;
			}
			this.update()(
				$element,
				[this.family.id, this.getIndex()($element)].join('_'),
				newValue,
				oldValue
			);
		};
		this.criteriaFilter = (criterium) => {
			if (criterium.family_id !== this.family.id) {
				return false;
			}
			if (criterium.id === this.model) {
				return true;
			}
			if (this.excludedIds.includes(criterium.id)) {
				return false;
			}
			return true; 
		};
	}
});