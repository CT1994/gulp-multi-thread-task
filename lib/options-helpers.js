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
 * @param {Array<string>|Array<Array<string>>} globArray
 * @return {Array<string>|Array<Array<string>>}
 */
function _processGlobArray(globArray)
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
 * @param {Array<string>|Array<Array<string>>} globArray
 * @param {MultiThreadOptions} options
 * @return {MultiThreadOptions}
 * @private
 */
function validateOptions(globArray, options)
{
	const processedGlobArray = _processGlobArray(globArray)
	const defaultOptions = {
		concurrency: Math.min(os.cpus().length, processedGlobArray.length),
		silent: false,
	}

	const validatedOptions = {...defaultOptions, ...options};

	validate(schema, validatedOptions, {name: 'gulp-multi-thread-task'});

	return {
		processedGlobArray,
		validatedOptions
	};
}

module.exports.validateOptions = validateOptions;
