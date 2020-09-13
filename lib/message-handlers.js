const cluster = require('cluster');
const PluginError = require('plugin-error');
const through2 = require('through2');

/**
 * @description returns a promise which can be resolved at a later point in time
 * @return {Promise}
 * @private
 */
function _promiseDefer() {
  let res;
  let rej;

  const promise = new Promise((resolve, reject) => {
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
function workerMessageHandlers(builder) {
  /**
   * @description pipe to handle request next file when current is finished
   * @return {Transform}
   * @private
   */
  function _taskFinishedHandler() {
    /**
     * @description handles buffer content
     * @param {File} file
     * @param {string} enc
     * @param {function} cb
     */
    function bufferContents(file, enc, cb) {
      cb();
    }

    /**
     * @description handles stream end
     * @param {function} cb
     */
    function endStream(cb) {
      _requestFile();
      cb();
    }

    return through2.obj(bufferContents, endStream);
  }

  const workerPromise = _promiseDefer();
  const _taskRunner = (done, src) => builder(done, src)
      .pipe(_taskFinishedHandler());

  /**
   * @description make a request for a file to process
   * @private
   */
  function _requestFile() {
    process.send({
      type: 'getFile',
    });
  }

  /**
   * process file received from master
   * @param {Object} msg
   */
  function file(msg) {
    _taskRunner(() => {}, msg.file);
  }

  /**
   * @description resolve thread promise and disconnects thread
   */
  function end() {
    workerPromise.resolve();
    cluster.worker.disconnect();
  }

  /**
   * @description sends error from child to master to kill all threads
   * @param {Object} message
   */
  function sendError(message) {
    workerPromise.reject(new PluginError(builder.name, message.message));
    process.send({
      type: 'workerError',
      taskName: builder.name,
      errorMessage: message.message,
    });
  }

  // initialise the gulp task
  _requestFile();

  return {
    end,
    file,
    sendError,
    workerPromise,
  };
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

  /**
   * @description send file to child thread
   * @param {Process} worker
   * @param {string} file - file to be processed
   * @private
   */
  function _sendFile(worker, file) {
    worker.send({
      type: 'file',
      file,
    });
  }

  /**
   * @description sendDone to child process to resolve promise
   * @param {Process} worker
   * @private
   */
  function _sendDone(worker) {
    worker.send({
      type: 'end',
    });
  }

  /**
   * @description handles getFile request from child process
   * @param {Process} worker
   * @param {Object} message
   */
  function getFile(worker, message) {
    if (processFiles.length <= 0) {
      _sendDone(worker);
      return;
    }

    const file = processFiles.shift();
    _sendFile(worker, file);
  }

  /**
   * @description handler worker error and kill all threads
   * @param {Process} worker
   * @param {Object} message
   * @param {Promise.reject} reject
   * @return {Promise.reject}
   */
  function workerError(worker, message, reject) {
    cluster.disconnect();
    return reject(new PluginError(message.taskName, message.errorMessage));
  }

  return {
    getFile,
    workerError,
  };
}

module.exports.masterMessageHandlers = masterMessageHandlers;
module.exports.workerMessageHandlers = workerMessageHandlers;
