import * as arrayMoveAfter from '@/array/moveAfter';

describe('moveAfter', () => {
  it('Inserts `target` element after `after` element if `target < after`.', () => {
    expect(arrayMoveAfter.moveAfter([0, 1, 2, 3, 4, 5], 1, 2)).toStrictEqual([
      0, 2, 1, 3, 4, 5,
    ]);
  });

  it('Inserts `target` element after `after` element if `target > after`.', () => {
    expect(arrayMoveAfter.moveAfter([0, 1, 2, 3, 4, 5], 4, 2)).toStrictEqual([
      0, 1, 2, 4, 3, 5,
    ]);
  });

  it('Returns array in original order if `target == after`.', () => {
    expect(arrayMoveAfter.moveAfter([0, 1, 2, 3, 4, 5], 2, 2)).toStrictEqual([
      0, 1, 2, 3, 4, 5,
    ]);
  });

  it('Inserts `target` element at index 0 if `after` is null.', () => {
    expect(
      arrayMoveAfter.moveAfter([0, 1, 2, 3, 4, 5], 1, null),
    ).toStrictEqual([1, 0, 2, 3, 4, 5]);
  });

  it('Return the original array if the `target` index is not in the array.', () => {
    expect(arrayMoveAfter.moveAfter([0, 1, 2, 3, 4, 5], 100, 3)).toStrictEqual(
      [0, 1, 2, 3, 4, 5],
    );
  });

  it('Treat the `after` index as `null` if  it is less than 0.', () => {
    expect(arrayMoveAfter.moveAfter([0, 1, 2, 3, 4, 5], 1, -1)).toMatchObject([
      1, 0, 2, 3, 4, 5,
    ]);
  });

  it('Treat the `after` index as the last element if  it is greater than the length of the array.', () => {
    expect(arrayMoveAfter.moveAfter([0, 1, 2, 3, 4, 5], 1, 100)).toMatchObject(
      [0, 2, 3, 4, 5, 1],
    );
  });
});
