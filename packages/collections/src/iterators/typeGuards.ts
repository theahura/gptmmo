export const isIterable = <T>(
  maybeIterable: any,
): maybeIterable is Iterable<T> => {
  return (
    maybeIterable != null &&
    typeof maybeIterable[Symbol.iterator] === 'function'
  );
};

export const isAsyncIterable = <T>(
  maybeIterable: any,
): maybeIterable is AsyncIterable<T> => {
  return (
    maybeIterable != null &&
    typeof maybeIterable[Symbol.asyncIterator] === 'function'
  );
};
