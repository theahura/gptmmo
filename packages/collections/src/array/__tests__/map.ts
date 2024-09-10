import * as status from '@gptmmo/status';

import * as map from '@/array/map';

describe('map', () => {
  it('Returns empty array given an empty array.', () => {
    const transformer = jest.fn();

    expect(status.throwIfError(map.map([], transformer))).toStrictEqual([]);

    expect(transformer).toHaveBeenCalledTimes(0);
  });

  it('Returns the transformed array when there are no errors.', () => {
    const transformer = jest.fn((value) => status.fromValue(value + 50));

    expect(
      status.throwIfError(map.map([100, 200, 300], transformer)),
    ).toStrictEqual([150, 250, 350]);

    expect(transformer).toHaveBeenCalledTimes(3);
  });

  it('Exits early when an error is emitted.', () => {
    const transformer = jest.fn((value) => {
      if (value == 200) {
        return status.fromError('Expected error.');
      }
      return status.fromValue(value + 50);
    });

    expect(map.map([100, 200, 300], transformer)).toMatchObject({
      error: expect.any(String),
    });

    expect(transformer).toHaveBeenCalledTimes(2);
  });
});
