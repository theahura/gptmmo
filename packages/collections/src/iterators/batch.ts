import * as typeGuards from '@/iterators/typeGuards';

export function batch<T>(args: {
  iterable: Iterable<T>;
  maxBatchSize: number;
}): IterableIterator<Array<T>>;

export function batch<T>(args: {
  iterable: AsyncIterable<T>;
  maxBatchSize: number;
}): AsyncIterableIterator<Array<T>>;

/**
 * Groups elements of an iterable or async iterable into batches of a specified
 * size. It creates batches by collecting elements sequentially until reaching
 * the maximum batch size.
 *
 * Note: For async iterables, if immediate processing of available items is
 * preferred over waiting for a full batch, consider alternatives like
 * `MessageQueue` that offer more flexible batching strategies.
 *
 * @param args -
 * @param args.iterable - The iterable or async iterable to be batched.
 * @param args.maxBatchSize - The maximum number of elements in each batch.
 *
 * @returns A new iterable or async iterable where each element is an array
 *   representing a batch of the original elements.
 */
// eslint-disable-next-line func-style
export function batch<T>(args: {
  iterable: Iterable<T> | AsyncIterable<T>;
  maxBatchSize: number;
}): IterableIterator<Array<T>> | AsyncIterableIterator<Array<T>> {
  const { iterable, maxBatchSize } = args;

  if (typeGuards.isIterable(iterable)) {
    return sychronousBatch({ iterable, maxBatchSize });
  }

  return asychronousBatch({ iterable, maxBatchSize });
}

const sychronousBatch = <T>(args: {
  iterable: Iterable<T>;
  maxBatchSize: number;
}): IterableIterator<Array<T>> => {
  const { iterable, maxBatchSize } = args;

  return (function* () {
    let currentBatch: Array<T> = [];
    for (const value of iterable) {
      currentBatch.push(value);
      if (currentBatch.length === maxBatchSize) {
        yield currentBatch;
        currentBatch = [];
      }
    }

    if (currentBatch.length > 0) {
      yield currentBatch;
    }
  })();
};

const asychronousBatch = <T>(args: {
  iterable: AsyncIterable<T>;
  maxBatchSize: number;
}): AsyncIterableIterator<Array<T>> => {
  const { iterable, maxBatchSize } = args;

  return (async function* () {
    let currentBatch: Array<T> = [];
    for await (const value of iterable) {
      currentBatch.push(value);
      if (currentBatch.length === maxBatchSize) {
        yield currentBatch;
        currentBatch = [];
      }
    }

    if (currentBatch.length > 0) {
      yield currentBatch;
    }
  })();
};
