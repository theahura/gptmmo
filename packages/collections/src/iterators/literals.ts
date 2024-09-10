/**
 * Creates an iterator of incrementing/decrementing numbers of the given length.
 *
 * Example Usage:
 *
 * ```ts
 * expect(Array.from(range(5))).toStrictEqual([0, 1, 2, 3, 4]);
 *
 * expect(Array.from(range(5, { start: 2, step: -0.5 })))
 *   .toStrictEqual([2, 1.5, 1, 0.5, 0 ]);
 * ```
 *
 * @param length - The amount of numbers to generate.
 * @param options -
 * @param options.start - The initial value of the iterator. Defaults to 0.
 * @param options.step - The step from which values are derived from the
 *   starting value. Defaults to 1.
 *
 * @returns The iterator.
 */
export const range = (
  length: number,
  options?: {
    start?: number;
    step?: number;
  },
): IterableIterator<number> => {
  const optionsWithDefaults = {
    start: 0,
    step: 1,
    ...options,
  };

  let i = 0;
  const iterator: IterableIterator<number> = {
    next: () => {
      if (i >= length) {
        return { value: undefined, done: true };
      }

      return {
        value: optionsWithDefaults.start + optionsWithDefaults.step * i++,
        done: false,
      };
    },

    [Symbol.iterator]: () => iterator,
  };

  return iterator;
};
