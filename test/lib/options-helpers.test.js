const {processOptions} = require('../../lib/options-helpers');

describe('Options', () => {
  test('should get options and files back', () => {
    const validatedResults = processOptions(
        ['fakeSearch', ['fakeSearch']],
        {concurrency: 1, silent: true},
    );
    const expectedResults = {
      processedGlobArray: [['fakeSearch']],
      validatedOptions: {concurrency: 1, silent: true},
    };

    expect(validatedResults).toEqual(expectedResults);
  });

  test('passing an unexpected option should throw an error', () => {
    expect(() => processOptions([], {fakeOption: false})).toThrowError();
  });

  test('passing an invalid value for concurrency should throw an error', () => {
    expect(() => processOptions([], {concurrency: '2'})).toThrowError();
  });

  test('passing an invalid value for silent should throw an error', () => {
    expect(() => processOptions([], {concurrency: 'false'})).toThrowError();
  });

  test('invalid type for globArray should throw an error', () => {
    expect(() => processOptions('', {}))
        .toThrowError(new Error('globArray should be an Array'));
    expect(() => processOptions([{}], {}))
        .toThrowError(new Error('only supports Array of string'));
  });
});
