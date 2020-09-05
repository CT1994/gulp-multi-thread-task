const path = require('path');
const cluster = require('cluster');
const {masterMessageHandlers} = require("../../lib/message-handlers");

describe('message-handlers', () => {
    test(('testing getFile being called processedGlobArray.length + 1'), () => {
        cluster.setupMaster({
            exec: path.resolve(__dirname + '/__mocks__/message-handlers-mocks.js')
        });
        const worker = cluster.fork();

        // generate a random array size each time for test to validate getFile is called correct number of times regardless of array size
        const processArrayGlobSize = Math.floor(Math.random() * 10) + 1
        const processedGlobArray = Array.from({length: processArrayGlobSize}, () => 'fakeFile');

        const handlers = masterMessageHandlers(processedGlobArray);
        const getFileSpy = jest.spyOn(handlers, 'getFile')

        return new Promise((resolve, reject) => {
            worker.on('message', (message) => handlers[message.type](worker, message, reject));
            worker.on('exit', resolve);
            worker.on('error', reject);
        })
            .then(() => expect(getFileSpy).toHaveBeenCalledTimes(processArrayGlobSize + 1));
    })
})
