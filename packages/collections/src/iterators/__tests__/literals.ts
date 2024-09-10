import * as literals from '@/iterators/literals';

describe('range', () => {
  it('Returns empty array for length zero.', () => {
    expect(Array.from(literals.range(0))).toStrictEqual([]);
  });

  it('Increments from 0 by 1 by default.', () => {
    expect(Array.from(literals.range(5))).toStrictEqual([0, 1, 2, 3, 4]);
  });

  it('Step and starting values can be modified.', () => {
    expect(
      Array.from(literals.range(5, { start: 2, step: -0.5 })),
    ).toStrictEqual([2, 1.5, 1, 0.5, 0]);
  });
});
