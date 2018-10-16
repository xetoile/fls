'use strict'

const gulp = require('gulp');
const csso = require('gulp-csso');
const data = require('gulp-data');
const pug = require('gulp-pug');

const ownerData = require('./private/config.json').owner;

// tasks

gulp.task('css', () => {
	gulp.src('css/*.css')
	.pipe(csso({comments: false}))
	.pipe(gulp.dest('public/styles/'));
});

gulp.task('pug', () => {
	gulp.src(['pug/components/*.pug', '!pug/components/_*.pug'])
	.pipe(pug())
	.pipe(gulp.dest('public/html/components/'));

	gulp.src(['pug/templates/*.pug', '!pug/templates/_*.pug'])
	.pipe(data((file) => {
		// required for _layout.pug (public config to head's meta)
		return {owner: ownerData};
	}))
	.pipe(pug())
	.pipe(gulp.dest('public/html/'));
});

// watchers

gulp.task('watch', () => {
	gulp.watch('css/*.css', ['css']);
	let wPug = gulp.watch('pug/**/*.pug', ['pug']);
});

// bundles

gulp.task('default', ['css', 'pug']);