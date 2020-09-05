const gulp = require('gulp');
const {workerMessageHandlers} = require("../../../lib/message-handlers");

const fakeGulpTask = () => gulp.src(['test/lib/fixtures/hello.txt'])
const messageHandlers = workerMessageHandlers(fakeGulpTask)
process.on('message', message => messageHandlers[message.type](message));
