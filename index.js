const cluster = require('cluster');
const log = require('fancy-log');
const {masterMessageHandlers, workerMessageHandlers} = require("./lib/message-handlers");
const {processGlobArray, validateOptions} = require('./lib/options-helpers');
require('colors');

/**
 * @description initialises a new worker and returns a Promise that resolves when the worker process ends.
 * @param {Object} handlers
 * @return {Promise}
 */
function createWorker(handlers) {
    const worker = cluster.fork();

    return new Promise(function (resolve, reject) {
        worker.on('message', message => handlers[message.type](worker, message));
        worker.on('exit', resolve);
        worker.on('error', reject);
    });
}

/**
 * @description Sets up the IPC message handlers, and spawn `workerCount` child processes to actually process the files.
 * @param {Array<string>|Array<Array<string>>} globArray
 * @param {number} workerCount
 * @return {Promise<Array<Promise>>}
 */
function spawnWorkers(globArray, workerCount) {
    log(`spawning ${workerCount.toString().yellow} worker`);

    const handlers = masterMessageHandlers(globArray);

    const promises = [];
    for (let i = 0; i < workerCount; ++i) {
        promises.push(createWorker(handlers));
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
        const validatedOptions = validateOptions(options);
        const workerCount = validatedOptions.concurrency;
        const fileList = processGlobArray(globArray);
        return spawnWorkers(fileList, workerCount);
    } else {
        const messageHandlers = workerMessageHandlers(builder)
        process.on('message', message => messageHandlers[message.type](message));
        return messageHandlers.workerPromise;
    }
}

module.exports.GulpMultiThreadTask = GulpMultiThreadTask
