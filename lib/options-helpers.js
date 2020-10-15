const globby = require('globby');
const os = require('os');
const schema = require('./options-schema.json');
const validate = require('schema-utils');

/**
 * @typedef {Object} MultiThreadOptions
 * @property {number} [concurrency=os.cpus().length]
 * defaults to os.cpus().length
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
function _processGlobArray(globArray) {
  if (!Array.isArray(globArray)) {
    throw Error('globArray should be an Array');
  }

  const fileList = [];

  globArray.forEach((glob) => {
    if (typeof glob === 'string') {
      fileList.push(...globby.sync(glob));
      return;
    }

    if (Array.isArray(glob)) {
      fileList.push(glob);
      return;
    }

    throw new Error(`only supports Array of string`);
  });

  return fileList;
}

/**
 * @description this is to pass feedback to the developer if they have passed an invalid option
 * @param {MultiThreadOptions} options
 * @private
 */
function _validateUserOptions(options) {
  // base value here are used for type check
  const baseValues = {
    concurrency: 1,
    silent: false,
  };

  const validatedOptions = {...baseValues, ...options};

  validate(schema, validatedOptions, {name: 'gulp-multi-thread-task'});
}

/**
 * @description validates and merges default options with user options
 * @param {GlobArray} globArray
 * @param {MultiThreadOptions} options
 * @return {{processedGlobArray: GlobArray, validatedOptions: MultiThreadOptions}}
 * @private
 */
function processOptions(globArray, options) {
  _validateUserOptions(options);

  const processedGlobArray = _processGlobArray(globArray);
  const defaultOptions = {
    concurrency: Infinity,
    silent: false,
  };

  const userOptions = {...defaultOptions, ...options};

  const validatedOptions = {
    concurrency: Math.min(
        Math.ceil(os.cpus().length / 2),
        processedGlobArray.length,
        userOptions.concurrency,
    ),
    silent: userOptions.silent,
  };

  validate(schema, validatedOptions, {name: 'gulp-multi-thread-task'});

  return {
    processedGlobArray,
    validatedOptions,
  };
}

module.exports.processOptions = processOptions;
