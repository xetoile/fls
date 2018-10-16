const os = require('os');

module.exports.log = function (prefixes, data, trailingNewLine = true) {
	if (!Array.isArray(prefixes)) {
		prefixes = [prefixes];
	}
	let prefixChain = prefixes.map((p) => {
		return `[${p}]`;
	}).join(' ');
	let formatted = data
	.toString()
	.split(os.EOL)
	.filter((line) => {
		return line.length;
	}).map((line) => {
		return `${prefixChain} ${line}`;
	}).join(os.EOL);
	if (trailingNewLine) {
		formatted += os.EOL;
	}
	process.stdout.write(formatted);
};

module.exports.newline = function () {
	process.stdout.write(os.EOL);
};