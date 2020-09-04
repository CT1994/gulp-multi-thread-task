const {validateOptions} = require('../../lib/options-helpers');

describe('Options', () => {
    test('should get options and files back', () => {
        const validatedResults = validateOptions(['fakeSearch'], {concurrency: 3, silent: true});
        const expectedResults = {processedGlobArray: [], validatedOptions: {concurrency: 3, silent: true}};

        expect(validatedResults).toEqual(expectedResults);
    })

    test('passing an unexpected option should throw an error', () => {
        expect(() => validateOptions([], {fakeOption: false})).toThrowError();
    })

    test('passing an invalid value for concurrency should throw an error', () => {
        expect(() => validateOptions([], {concurrency: '2'})).toThrowError();
    })

    test('passing an invalid value for silent should throw an error', () => {
        expect(() => validateOptions([], {concurrency: 'false'})).toThrowError();
    })

    test('invalid type for globArray should throw an error', () => {
        expect(() => validateOptions('', {})).toThrowError(new Error('globArray should be an Array'));
        expect(() => validateOptions([{}], {})).toThrowError(new Error('only supports Array of string'));
    });
})
