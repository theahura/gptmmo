import * as arrayPartition from '@/array/partition';

describe('partition', () => {
  it('Returns empty map for empty array.', () => {
    const partitions = arrayPartition.partition([], () => Math.random());

    expect(partitions).toStrictEqual(new Map());
  });

  it('Can partition boolean discriminators.', () => {
    const partitions = arrayPartition.partition(
      ['foo', 'bar', 'baz'],
      (value) => value.startsWith('b'),
    );

    expect(partitions).toStrictEqual(
      new Map([
        [false, ['foo']],
        [true, ['bar', 'baz']],
      ]),
    );
  });

  it('Can partition string discriminators.', () => {
    const partitions = arrayPartition.partition(
      [
        { name: 'foo', value: 100 },
        { name: 'bar', value: 200 },
        { name: 'baz', value: 300 },
        { name: 'foo', value: 400 },
      ],
      (value) => value.name,
    );

    expect(partitions).toStrictEqual(
      new Map([
        [
          'foo',
          [
            { name: 'foo', value: 100 },
            { name: 'foo', value: 400 },
          ],
        ],
        ['bar', [{ name: 'bar', value: 200 }]],
        ['baz', [{ name: 'baz', value: 300 }]],
      ]),
    );
  });
});

describe('forEach', () => {
  it('Returns results in the same order the values were given.', async () => {
    const results = await arrayPartition.forEachPartition(
      [
        { name: 'foo', value: 100 },
        { name: 'bar', value: 200 },
        { name: 'baz', value: 300 },
        { name: 'bar', value: 400 },
        { name: 'foo', value: 500 },
      ],
      (value) => value.name,
      (_, documents) => documents.map((document) => document.value),
    );

    expect(results).toStrictEqual([100, 200, 300, 400, 500]);
  });

  it('Only calls the handler once per partition.', async () => {
    const mockHandler = jest.fn(
      (_, documents: Array<{ name: string; value: number }>) =>
        documents.map((document) => document.value),
    );

    await arrayPartition.forEachPartition(
      [
        { name: 'foo', value: 100 },
        { name: 'bar', value: 200 },
        { name: 'baz', value: 300 },
        { name: 'bar', value: 400 },
        { name: 'foo', value: 500 },
      ],
      (value) => value.name,
      mockHandler,
    );

    expect(mockHandler).toBeCalledTimes(3);
    expect(mockHandler).nthCalledWith(1, 'foo', [
      { name: 'foo', value: 100 },
      { name: 'foo', value: 500 },
    ]);
    expect(mockHandler).nthCalledWith(2, 'bar', [
      { name: 'bar', value: 200 },
      { name: 'bar', value: 400 },
    ]);
    expect(mockHandler).nthCalledWith(3, 'baz', [{ name: 'baz', value: 300 }]);
  });

  it('Missing results are represented as a unique symbol.', async () => {
    const results = await arrayPartition.forEachPartition(
      [
        { name: 'foo', value: 100 },
        { name: 'bar', value: 200 },
        { name: 'baz', value: 300 },
        { name: 'bar', value: 400 },
        { name: 'foo', value: 500 },
      ],
      (value) => value.name,
      (_, documents) => [documents[0].value],
    );

    expect(results).toStrictEqual([
      100,
      200,
      300,
      arrayPartition.EMPTY_RESULT,
      arrayPartition.EMPTY_RESULT,
    ]);
  });
});
