const cluster = require('cluster');
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

function workerMessageHandlers(builder)
{
    const workerPromise = _promiseDefer();
    const taskRunner = (done, src) => builder(done, src)
            .pipe(through2.obj((file, enc, done) => {
                _requestFile();
                done();
            }));

    function _requestFile() {
        process.send({
            type: 'getFile'
        });
    }

    function _sendError(worker, e) {
        process.send({
            type: 'error',
            message: e
        });
    }

    function file(msg) {
        taskRunner(() => {}, msg.file);
    }

    function end() {
        //sendLog(`Task '${taskName.cyan}' DONE`);
        workerPromise.resolve();
        cluster.worker.disconnect();
    }

    // initialise the gulp task
    _requestFile();

    return {
        workerPromise,
        file,
        end
    }
}

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

    function getFile(worker) {
        if (processFiles.length <= 0)
        {
            return _sendDone(worker)
        }

        const file = processFiles.shift();
        _sendFile(worker, file);
    }

    return {
        getFile,
    }
}

module.exports.masterMessageHandlers = masterMessageHandlers;
module.exports.workerMessageHandlers = workerMessageHandlers;
