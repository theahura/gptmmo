import * as status from '@/status';
import * as tryCatch from '@/tryCatch';

export type RetryOptions = {
  // The maximum amount of times to retry a failed operation.
  //
  // Defaults to Infinity.
  maxRetries?: number;

  // The exponential factor used for backoff.
  //
  // Defaults to 2.
  factor?: number;

  // The base used for exponential backoff.
  //
  // Defaults to 1000ms.
  base?: { milliseconds: number };

  // The maximum timeout between retries.
  //
  // Defaults to Infinity.
  maxTimeout?: { milliseconds: number };
};

/**
 * Executes the provided operation and retries failures.
 *
 * Uses exponential backoff with full jitter as out lined here:
 * https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 *
 * @param operation - The operation to execute.
 * @param options - Retry options.
 *
 * @returns The operation response. It may be an error if `maxRetries` has been
 *   hit and the last recorded operation execution was an error.
 */
export const doWithRetry = async <T, E>(
  operation: () => status.StatusOr<T, E> | Promise<status.StatusOr<T, E>>,
  options?: RetryOptions,
): Promise<status.StatusOr<T, E>> => {
  const optionsWithDefaults: Required<RetryOptions> = {
    maxRetries: Infinity,
    factor: 2,
    base: { milliseconds: 1000 },
    maxTimeout: { milliseconds: Infinity },
    ...options,
  };

  let operationResult: status.StatusOr<T, E> = await operation();
  let retries = 0;

  while (
    !status.isOk(operationResult) &&
    retries < optionsWithDefaults.maxRetries
  ) {
    await delay(retries++, optionsWithDefaults);
    operationResult = await operation();
  }

  return operationResult;
};

/**
 * Executes the provided operation until it responds with a successful status.
 *
 * Uses exponential backoff with full jitter as outlined here:
 * https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 *
 * @param operation - The operation to execute.
 * @param options - Retry options.
 *
 * @returns The successful operation response.
 */
export const retryUntilSuccessful = async <T, E>(
  operation: () => status.StatusOr<T, E> | Promise<status.StatusOr<T, E>>,
  options?: Omit<RetryOptions, 'maxRetries'>,
): Promise<T> =>
  // This "throwIfError" should NEVER throw an error because maxRetries is set
  // to Infinity. We're using it here to forceably unwrap the StatusOr.
  tryCatch.throwIfError(
    await doWithRetry(operation, {
      maxRetries: Infinity,
      ...options,
    }),
  );

/**
 * Given a number of retries and retry options, returns a promise which will
 * resolve after exponential backoff has been applied between the last retry and
 * the next.
 *
 * Uses exponential backoff with full jitter as out lined here:
 * https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 *
 * @param retries - The number of retries already attempted.
 * @param options - Retry options.
 *
 * @returns A promise which will resolve after backoff has been applied.
 */
const delay = async (
  retries: number,
  options: Required<RetryOptions>,
): Promise<void> =>
  new Promise<void>((resolve) => {
    const exponentialBackoff =
      options.base.milliseconds * Math.pow(options.factor, retries);
    const withCap = Math.min(
      options.maxTimeout.milliseconds,
      exponentialBackoff,
    );
    const withFullJitter = Math.random() * withCap;

    setTimeout(() => {
      resolve();
    }, withFullJitter);
  });
