import * as status from '@gptmmo/status';

import * as arrayToRecord from '@/array/toRecord';

describe('toRecord', () => {
  it('Returns empty record for empty array.', () => {
    expect(
      status.throwIfError(
        arrayToRecord.toRecord(
          [],
          () => 'foo',
          (value) => value,
        ),
      ),
    ).toStrictEqual({});
  });

  it('Constructs a record given unique keys.', () => {
    expect(
      status.throwIfError(
        arrayToRecord.toRecord(
          [
            { id: 'foo', value: 100 },
            { id: 'bar', value: 100 },
            { id: 'baz', value: 200 },
          ],
          (value) => value.id,
          (value) => value,
        ),
      ),
    ).toStrictEqual({
      foo: { id: 'foo', value: 100 },
      bar: { id: 'bar', value: 100 },
      baz: { id: 'baz', value: 200 },
    });
  });
});

it('Returns an error if the key function is not unique.', () => {
  expect(
    arrayToRecord.toRecord(
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

it('Constructs a record based on the given value function.', () => {
  expect(
    status.throwIfError(
      arrayToRecord.toRecord(
        [
          { id: 'foo', value: 100 },
          { id: 'bar', value: 100 },
          { id: 'baz', value: 200 },
        ],
        (value) => value.id,
        (_) => 'pie in the sky',
      ),
    ),
  ).toStrictEqual({
    foo: 'pie in the sky',
    bar: 'pie in the sky',
    baz: 'pie in the sky',
  });
});
