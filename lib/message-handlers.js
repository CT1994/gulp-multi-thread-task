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

    // initialise the gulp task
    _requestFile();

    return {
        end,
        file,
        workerPromise,
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

    function getFile(worker, message) {
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
