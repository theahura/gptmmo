import * as defaultRecord from '@/record/DefaultRecord';

describe('DefaultRecord', () => {
  it('An unknown key to be the default value.', () => {
    const record = defaultRecord.createDefaultRecord<string, number>(
      {},
      () => 100,
    );
    expect(record['foo']).toStrictEqual(100);
  });

  it('Returns an existing value.', () => {
    const record = defaultRecord.createDefaultRecord({ foo: 200 }, () => 100);
    expect(record['foo']).toStrictEqual(200);
  });

  it('An undefined value to remain undefined.', () => {
    const record = defaultRecord.createDefaultRecord<
      string,
      number | undefined
    >({ foo: undefined }, () => 100);
    expect(record['foo']).toStrictEqual(undefined);
  });

  it('A null value to remain null.', () => {
    const record = defaultRecord.createDefaultRecord<string, number | null>(
      { foo: null },
      () => 100,
    );
    expect(record['foo']).toStrictEqual(null);
  });

  it('Increment and decrement operators work.', () => {
    const record = defaultRecord.createDefaultRecord<string, number>(
      {},
      () => 0,
    );

    expect(++record['foo']).toStrictEqual(1);
    expect(record['foo']).toStrictEqual(1);

    expect(--record['foo']).toStrictEqual(0);
    expect(record['foo']).toStrictEqual(0);
  });

  it('Saves the default value to the record so that identity is preserved.', () => {
    const record = defaultRecord.createDefaultRecord<string, Array<number>>(
      {},
      () => [],
    );
    const firstLookup = record['foo'];
    const secondLookup = record['foo'];
    expect(firstLookup).toBe(secondLookup);
  });

  it('Object.keys lists known keys.', () => {
    const record = defaultRecord.createDefaultRecord<string, number>(
      { foo: 200 },
      () => 100,
    );
    expect(Object.keys(record)).toStrictEqual(['foo']);
    record['bar'];
    expect(Object.keys(record)).toStrictEqual(['foo', 'bar']);
    record['baz'] = 300;
    expect(Object.keys(record)).toStrictEqual(['foo', 'bar', 'baz']);
  });
});
