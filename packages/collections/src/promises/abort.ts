export type RaceWithAbortResult<T> = { aborted: true } | { value: T };

/**
 * Convenience function for making a promise "cancelable" by racing it with an
 * abort signal. If the abort signal is flipped first, the race will resolve
 * without waiting on the promise passed in.
 *
 * Note that the provided promise will still execute, it just wont be returned
 * by this method. It's important to ensure you cleanup any memory / side
 * effects from the provided promise.
 *
 * @param abortSignal - The signal indicating if the promise has ben canceled.
 * @param promise - The promise to control with the abort signal.
 *
 * @returns A new promise representing either possible aborted or successful
 *   states.
 */
export const raceWithAbort = <T>(
  abortSignal: AbortSignal,
  promise: Promise<T>,
): Promise<RaceWithAbortResult<T>> =>
  new Promise<RaceWithAbortResult<T>>((resolve) => {
    if (abortSignal.aborted) {
      resolve({ aborted: true });
      return;
    }

    const onAbort = () => {
      abortSignal.removeEventListener('abort', onAbort);
      resolve({ aborted: true });
    };
    abortSignal.addEventListener('abort', onAbort);

    promise
      .then((response) => {
        resolve({ value: response });
      })
      .finally(() => {
        abortSignal.removeEventListener('abort', onAbort);
      });
  });
