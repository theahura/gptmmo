import * as typeGuards from '@/iterators/typeGuards';

export function toArray<T>(iterable: Iterable<T>): Array<T>;
export function toArray<T>(iterable: AsyncIterable<T>): Promise<Array<T>>;

/**
 * Drains an iterator into an array. This behaves much like `Array.from` and it
 * exists only because `Array.fromAsync` is not supported by all browsers/node.
 *
 * @param iterable - The iterable to drain.
 *
 * @returns All values from the iterable, as an array in the order they were
 *   drained from the iterable.
 */
// eslint-disable-next-line func-style
export function toArray<T>(
  iterable: Iterable<T> | AsyncIterable<T>,
): Array<T> | Promise<Array<T>> {
  if (typeGuards.isIterable(iterable)) {
    return Array.from(iterable);
  }

  return new Promise(async (resolve) => {
    const values: Array<T> = [];
    for await (const value of iterable) {
      values.push(value);
    }
    resolve(values);
  });
}
