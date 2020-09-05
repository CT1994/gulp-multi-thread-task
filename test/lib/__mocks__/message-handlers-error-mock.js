const {workerMessageHandlers} = require("../../../lib/message-handlers");

const messageHandlers = workerMessageHandlers(function fakeGulpTask(){})
process.on('message', message => messageHandlers.sendError(new Error('expected error mock')));
