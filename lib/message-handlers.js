const cluster = require('cluster');
const PluginError = require('plugin-error');
const through2 = require('through2')

/**
 * @description returns a promise which can be resolved at a later point in time
 * @returns {Promise}
 * @private
 */
function _promiseDefer()
{
    let res;
    let rej;

    const promise = new Promise((resolve, reject) =>
    {
        res = resolve;
        rej = reject;
    });

    promise.resolve = res;
    promise.reject = rej;

    return promise;
}

/**
 * @typedef {Object} WorkerMessageHandlers
 * @property {Function} end - message to master to let the master know the child has finished
 * @property {Function} file - message to master to let the master know the child requires a new file
 * @property {Function} sendError - message to master that the child has thrown an error
 * @property {Promise} workerPromise - worker Promise which will be resolved on end or reject on sendError
 */

/**
 * @param {Function} builder
 * @return {WorkerMessageHandlers}
 */
function workerMessageHandlers(builder)
{
    function _taskFinishedHandler()
    {
        function bufferContents(file, enc, cb) {
            cb();
        }

        function endStream(cb) {
            _requestFile();
            cb();
        }

        return through2.obj(bufferContents, endStream)
    }

    const workerPromise = _promiseDefer();
    const _taskRunner = (done, src) => builder(done, src)
        .pipe(_taskFinishedHandler());

    function _requestFile() {
        process.send({
            type: 'getFile'
        });
    }

    function file(msg) {
        _taskRunner(() => {}, msg.file);
    }

    function end() {
        workerPromise.resolve();
        cluster.worker.disconnect();
    }

    function sendError(message)
    {
        workerPromise.reject(new PluginError(builder.name, message.message));
        process.send({
            type: 'workerError',
            taskName: builder.name,
            errorMessage: message.message
        });
    }

    // initialise the gulp task
    _requestFile();

    return {
        end,
        file,
        sendError,
        workerPromise,
    }
}

/**
 * @typedef {Object} MasterMessageHandlers
 * @property {function} getFile - sends a file to child process who requested a file
 * @property {function} workerError - error from child process will kill all child process and reject
 */

/**
 * @description initialise message handler for cluster master
 * @param {GlobArray} fileList - the list of globs that need to be processed by the child process
 * @return {MasterMessageHandlers}
 */
function masterMessageHandlers(fileList) {
    const processFiles = [...fileList];

    function _sendFile(worker, file) {
        worker.send({
            type: 'file',
            file
        });
    }

    function _sendDone(worker) {
        worker.send({
            type: 'end'
        });
    }

    function getFile(worker, message) {
        if (processFiles.length <= 0)
        {
            return _sendDone(worker)
        }

        const file = processFiles.shift();
        _sendFile(worker, file);
    }

    function workerError(worker, message, reject)
    {
        cluster.disconnect()
        return reject(new PluginError(message.taskName, message.errorMessage))
    }

    return {
        getFile,
        workerError,
    }
}

module.exports.masterMessageHandlers = masterMessageHandlers;
module.exports.workerMessageHandlers = workerMessageHandlers;
