/**
 * Given an `AsyncIterator`, maps the values from that iterator as they're
 * iterated over.
 *
 * @param asyncIterator The iterator to map.
 * @param transformer The mapping function.
 *
 * @returns A new AsyncIterator.
 */
export const map = <T1, T2, R>(
  asyncIterator: AsyncIterator<T1, R>,
  transformer: (value: T1) => T2,
): AsyncIterator<T2, R> => {
  const newIterator: AsyncIterator<T2, R> = {
    async next() {
      return convertIteratorResult(await asyncIterator.next(), transformer);
    },

    async return(value) {
      if (asyncIterator.return != null) {
        return convertIteratorResult(
          await asyncIterator.return(value),
          transformer,
        );
      }

      if (value === undefined) {
        // Typescript should prevent us from being able to return `undefined`
        // while iterating over an async iterator because typesafety will
        // disallow plain `return;` unless the return type can be undefined.
        // However, we still need to write a base case for it to conform with
        // the JS `AsyncIterator` interface. So we force the `undefined` type to
        // be `R` here knowing that this should always be true in Typescript.
        return {
          value: undefined as unknown,
          done: true,
        } as IteratorReturnResult<R>;
      }

      return { value: await value, done: true };
    },

    async throw(error) {
      if (asyncIterator.throw != null) {
        return convertIteratorResult(
          await asyncIterator.throw(error),
          transformer,
        );
      }

      return Promise.reject(error);
    },
  };

  return newIterator;
};

const convertIteratorResult = <T1, T2, R>(
  result: IteratorResult<T1, R>,
  transformer: (value: T1) => T2,
): IteratorResult<T2, R> => {
  if (result.done) {
    return result;
  }

  return {
    done: false,
    value: transformer(result.value),
  };
};
