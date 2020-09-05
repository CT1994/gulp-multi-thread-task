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
 * @typedef {Array<string>|Array<Array<string>>} GlobArray
 */

/**
 * @description expands glob array into a array of files to be processed
 * @description if Array will return array back at depth 1. Array<Array<string>>
 * @description if string will place result at depth 0. Array<sting>
 * @param {GlobArray} globArray
 * @return {GlobArray}
 */
function _processGlobArray(globArray)
{
	if (!Array.isArray(globArray))
	{
		throw Error('globArray should be an Array');
	}

	const fileList = [];

	globArray.forEach((glob) => {
		if (typeof glob === 'string')
		{
			fileList.push(...globby.sync(glob));
			return;
		}

		if (Array.isArray(glob))
		{
			fileList.push(glob);
			return;
		}

		throw new Error(`only supports Array of string`)
	});

	return fileList;
}

/**
 * @description validates and merges default options with user options
 * @param {GlobArray} globArray
 * @param {MultiThreadOptions} options
 * @return {{processedGlobArray: GlobArray, validatedOptions: MultiThreadOptions}}
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
