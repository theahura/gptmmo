/**
 * Given an AsyncIterable, converts it into an `AsyncIterableIterator`. This
 * makes it usable in for-of loops.
 *
 * @param iterator The iterator to convert into an iterable.
 *
 * @returns An iterable iterator.
 */
export const toIterable = <T, R>(
  iterator: AsyncIterator<T, R>,
): AsyncIterableIterator<T> => {
  const iterableIterator: AsyncIterableIterator<T> = {
    next: (...args) => iterator.next(...args),

    [Symbol.asyncIterator]() {
      return iterableIterator;
    },
  };

  if (iterator.throw != null) {
    const narrowedThrow = iterator.throw;
    iterableIterator.throw = (...args) => narrowedThrow(...args);
  }
  if (iterator.return != null) {
    const narrowedReturn = iterator.return;
    iterableIterator.return = (...args) => narrowedReturn(...args);
  }

  return iterableIterator;
};
