const globby = require('globby');
const os = require('os');
const schema = require('./options-schema.json');
const validate = require('schema-utils');

/**
 * @typedef {Object} MultiThreadOptions
 * @property {number} [concurrency=os.cpus().length] - defaults to os.cpus().length
 * @property {boolean} [silent=false] - hide the spawn logging for child thread (will also hide child task errors)
 */

/**
 * @description expands glob array into a array of files to be processed
 * @description if Array will return array back at depth 1. Array<Array<string>>
 * @description if string will place result at depth 0. Array<sting>
 * @param globArray
 * @return {Array<string|Array<string>>}
 */
function processGlobArray(globArray)
{
	const fileList = [];

	globArray.forEach((glob) => {
		if (typeof glob === 'string')
		{
			fileList.push(...globby.sync(glob));
			return;
		}

		fileList.push(glob)
	});

	return fileList;
}

/**
 * @description validates and merges default options with user options
 * @param {MultiThreadOptions} options
 * @return {MultiThreadOptions}
 * @private
 */
function validateOptions(options)
{
	const defaultOptions = {
		concurrency: os.cpus().length,
		silent: false,
	}

	const mergedOptions = {...defaultOptions, ...options};

	validate(schema, mergedOptions, {name: 'gulp-multi-thread-task'});

	return mergedOptions;
}

module.exports.validateOptions = validateOptions;
module.exports.processGlobArray = processGlobArray;
