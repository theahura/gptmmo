import * as split from '@/array/split';

describe('split', () => {
  it('Returns empty array given an empty array.', () => {
    const filter = jest.fn();
    expect(split.split([], filter)).toStrictEqual([[], []]);
    expect(filter).toHaveBeenCalledTimes(0);
  });

  it('Can return both included and excluded values.', () => {
    const filter = jest.fn((value) => value % 2 === 0);
    expect(split.split([1, 2, 3, 4], filter)).toStrictEqual([
      [2, 4],
      [1, 3],
    ]);
    expect(filter).toHaveBeenCalledTimes(4);
  });
});
