const cluster = require('cluster');
const log = require('fancy-log');

const {masterMessageHandlers, workerMessageHandlers} = require("./lib/message-handlers");
const {validateOptions} = require('./lib/options-helpers');
require('colors');

/**
 * @description initialises a new worker and returns a Promise that resolves when the worker process ends.
 * @param {Object} handlers
 * @param {MultiThreadOptions} options
 * @return {Promise}
 */
function createWorker(handlers, options) {
    cluster.setupMaster({
        silent: options.silent
    });

    const worker = cluster.fork();

    return new Promise(function (resolve, reject) {
        worker.on('message', message => handlers[message.type](worker, message, reject));
        worker.on('exit', resolve);
        worker.on('error', reject);
    });
}

/**
 * @description Sets up the IPC message handlers, and spawn `workerCount` child processes to actually process the files.
 * @param {Array<string>|Array<Array<string>>} processedGlobArray
 * @param {MultiThreadOptions} options
 * @return {Promise<Array<Promise>>}
 */
function spawnWorkers(processedGlobArray, options) {
    log(`spawning ${options.concurrency.toString().yellow} worker`);

    const handlers = masterMessageHandlers(processedGlobArray);

    const promises = [];
    for (let i = 0; i < options.concurrency; ++i) {
        promises.push(createWorker(handlers, options));
    }

    return Promise.all(promises);
}

/**
 * @description Initialise the worker threads and start processing the glob using the builder
 * @param {Array<string>|Array<Array<string>>} globArray
 * @param {function} builder - The gulp task which will run on the glob
 * @param {MultiThreadOptions} [options]
 * @return {Promise<void>}
 * @constructor
 */
function GulpMultiThreadTask(globArray, builder, options = {}) {
    if (cluster.isMaster) {
        const {processedGlobArray, validatedOptions} = validateOptions(globArray, options);
        return spawnWorkers(processedGlobArray, validatedOptions);
    } else {
        const messageHandlers = workerMessageHandlers(builder)
        process.on('message', message => messageHandlers[message.type](message));
        process.on('uncaughtException', (error) => messageHandlers.sendError(error));
        return messageHandlers.workerPromise;
    }
}

module.exports.GulpMultiThreadTask = GulpMultiThreadTask
