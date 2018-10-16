angular.module('theApp').component('calculatorFullviewInput', {
	templateUrl: '../components/calculatorFullviewInput.html',
	bindings: {
		family: '<',
		criterium: '<',
		update: '&',
		getIndex: '&'
	},
	controller: function CalculatorFullviewInputCtrl($scope, $element) {
		this.onChange = () => {
			this.update()(
				$element,
				[this.family.id, this.getIndex()($element)].join('_'),
				{
					criterium: this.criterium.id,
					value: this.model
				}
			);
		};
		this.$postLink = () => {
			this.onChange();
		};
	}
});