/**
 * Wraps a promise-returning function to prevent concurrent execution. If called
 * while a promise is already pending, it returns the existing promise instead
 * of creating a new one.
 *
 * @param runner - The function to debounce.
 *
 * @returns A function that, when invoked, either starts a new operation or
 *   returns the currently pending promise.
 */
export const debounceWhenPending = <R>(
  runner: () => Promise<R>,
): (() => Promise<R>) => {
  let pendingPromise: Promise<R> | null = null;

  return () => {
    if (pendingPromise != null) {
      return pendingPromise;
    }

    pendingPromise = runner();
    pendingPromise.finally(() => {
      pendingPromise = null;
    });
    return pendingPromise;
  };
};
