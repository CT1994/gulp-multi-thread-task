const cluster = require('cluster');
const log = require('fancy-log');

const {
  masterMessageHandlers,
  workerMessageHandlers,
} = require('./lib/message-handlers');
const {processOptions} = require('./lib/options-helpers');
require('colors');

/**
 * @description initialises a new worker and returns a Promise that resolves when the worker process ends.
 * @param {string} taskName
 * @param {Object} handlers
 * @param {MultiThreadOptions} options
 * @return {Promise}
 * @private
 */
function _createWorker(taskName, handlers, options) {
  cluster.setupMaster({
    exec: process.argv[1],
    args: [taskName, ...process.argv.slice(3)],
    silent: options.silent,
  });

  const worker = cluster.fork();

  return new Promise(function(resolve, reject) {
    worker.on('message', (message) => {
      handlers[message.type](worker, message, reject);
    });
    worker.on('exit', resolve);
    worker.on('error', reject);
  });
}

/**
 * @description Sets up the IPC message handlers, and spawn `workerCount` child processes to actually process the files.
 * @param {string} taskName
 * @param {Array<string>|Array<Array<string>>} processedGlobArray
 * @param {MultiThreadOptions} options
 * @return {Promise<Array<Promise>>}
 * @private
 */
function _spawnWorkers(taskName, processedGlobArray, options) {
  log(`spawning ${options.concurrency.toString().yellow} worker`);

  const handlers = masterMessageHandlers(processedGlobArray);

  const promises = [];
  for (let i = 0; i < options.concurrency; ++i) {
    promises.push(_createWorker(taskName, handlers, options));
  }

  return Promise.all(promises);
}

/**
 * @description Initialise the worker threads and start processing the glob using the builder
 * @param {string} taskName - the registered task name within gulpfile.js
 * @param {Array<string>|Array<Array<string>>} globArray
 * @param {function} builder - The gulp task which will run on the glob
 * @param {MultiThreadOptions} [options]
 * @return {Promise<void>}
 * @constructor
 */
function GulpMultiThreadTask(taskName, globArray, builder, options = {}) {
  if (cluster.isMaster) {
    const {
      processedGlobArray,
      validatedOptions,
    } = processOptions(globArray, options);

    return _spawnWorkers(taskName, processedGlobArray, validatedOptions);
  }

  const messageHandlers = workerMessageHandlers(builder);
  process.on('message', (message) => messageHandlers[message.type](message));
  process.on('uncaughtException', (error) => messageHandlers.sendError(error));
  process.on('unhandledRejection', (error) => messageHandlers.sendError(error));
  return messageHandlers.workerPromise;
}

module.exports.GulpMultiThreadTask = GulpMultiThreadTask;
