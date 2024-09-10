import * as promises from '@/promises';

/**
 * A `BufferedAsyncIterator` is an AsyncIterator backed by an in-memory buffer.
 * This is useful in cases where an iterator is needed and you wish to buffer
 * data into that iterator asychronously.
 *
 * For Example:
 *
 * The below code will log `100` and then `200`.
 *
 * ```ts
 * const iterator = createBufferedAsyncIterator<number, null>();
 *
 * iterator.push({ done: false, value: 100 });
 * setTimeout(() => {
 *   iterator.push({ done: false, value: 200 });
 *   iterator.push({ done: true, value: null });
 * }, 1000);
 *
 * for await (const value of iterator) {
 *   console.log(value);
 * }
 * ```
 */
export type BufferedAsyncIterator<T, R> = AsyncIterator<T, R> & {
  /**
   * Buffers an iterator result to be drained by consumers of the iterator.
   *
   * @param result An iterator result.
   */
  push: (result: IteratorResult<T, R>) => void;
};

/**
 * Creates a new AsyncIterator which is backed by an in-memory buffer. Clients
 * can push data into this buffer whenever they wish and listening clients will
 * asychronously drain the buffer as data becomes available.
 *
 * @returns BufferedAsyncIterator<T, R>
 */
export const createBufferedAsyncIterator = <T, R>(): BufferedAsyncIterator<
  T,
  R
> => {
  const buffer: Array<IteratorResult<T, R>> = [];
  let nextPromise: promises.Deferred<IteratorResult<T, R>> | null = null;

  return {
    async next() {
      if (nextPromise != null) {
        return nextPromise.promise;
      }

      if (buffer.length > 0) {
        // TypeScript does not narrow arrays when evaluating against length, so
        // it thinks the return type of `shift` could be undefined here when we
        // know it can't be.
        //
        // See https://github.com/microsoft/TypeScript/issues/30406
        return buffer.shift() as IteratorResult<T, R>;
      }

      nextPromise = promises.createDeferred<IteratorResult<T, R>>();
      return nextPromise.promise;
    },

    push(result) {
      if (nextPromise != null) {
        nextPromise.resolve(result);
        nextPromise = null;
        return;
      }

      buffer.push(result);
    },
  };
};
