import * as arrayLiterals from '@/array/literals';

describe('filled', () => {
  it('Returns empty array for length zero.', () => {
    expect(arrayLiterals.filled('foo', 0)).toStrictEqual([]);
  });

  it('Reapplies value across the desired length.', () => {
    expect(arrayLiterals.filled('foo', 5)).toStrictEqual([
      'foo',
      'foo',
      'foo',
      'foo',
      'foo',
    ]);
  });

  it('Duplicates the filled value by default.', () => {
    const array = arrayLiterals.filled({ foo: 100 }, 2);
    expect(array).toStrictEqual([{ foo: 100 }, { foo: 100 }]);

    array[1].foo = 200;
    expect(array).toStrictEqual([{ foo: 100 }, { foo: 200 }]);
  });

  it('Duplication can be disabled.', () => {
    const array = arrayLiterals.filled({ foo: 100 }, 2, { duplicate: false });
    expect(array).toStrictEqual([{ foo: 100 }, { foo: 100 }]);

    array[1].foo = 200;
    expect(array).toStrictEqual([{ foo: 200 }, { foo: 200 }]);
  });

  it('Duplication is deep.', () => {
    const array = arrayLiterals.filled({ foo: { bar: 100 } }, 2);
    expect(array).toStrictEqual([
      { foo: { bar: 100 } },
      { foo: { bar: 100 } },
    ]);

    array[1].foo.bar = 200;
    expect(array).toStrictEqual([
      { foo: { bar: 100 } },
      { foo: { bar: 200 } },
    ]);
  });
});
