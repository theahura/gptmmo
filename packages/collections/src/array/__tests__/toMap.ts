import * as status from '@gptmmo/status';

import * as arrayToMap from '@/array/toMap';

describe('toMap', () => {
  it('Returns empty map for empty array.', () => {
    expect(
      status.throwIfError(
        arrayToMap.toMap(
          [],
          () => 'foo',
          (value) => value,
        ),
      ),
    ).toStrictEqual(new Map());
  });

  it('Constructs a map given unique keys.', () => {
    expect(
      status.throwIfError(
        arrayToMap.toMap(
          [
            { id: 'foo', value: 100 },
            { id: 'bar', value: 100 },
            { id: 'baz', value: 200 },
          ],
          (value) => value.id,
          (value) => value,
        ),
      ),
    ).toStrictEqual(
      new Map([
        ['foo', { id: 'foo', value: 100 }],
        ['bar', { id: 'bar', value: 100 }],
        ['baz', { id: 'baz', value: 200 }],
      ]),
    );
  });

  it('Returns an error if the key function is not unique.', () => {
    expect(
      arrayToMap.toMap(
        [
          { id: 'foo', value: 100 },
          { id: 'bar', value: 200 },
          { id: 'bar', value: 300 },
        ],
        (value) => value.id,
        (value) => value,
      ),
    ).toMatchObject({
      error: expect.any(String),
    });
  });
});

it('Constructs a map based on the given value function.', () => {
  expect(
    status.throwIfError(
      arrayToMap.toMap(
        [
          { id: 'foo', value: 100 },
          { id: 'bar', value: 100 },
          { id: 'baz', value: 200 },
        ],
        (value) => value.id,
        (_) => 'pie in the sky',
      ),
    ),
  ).toStrictEqual(
    new Map([
      ['foo', 'pie in the sky'],
      ['bar', 'pie in the sky'],
      ['baz', 'pie in the sky'],
    ]),
  );
});
