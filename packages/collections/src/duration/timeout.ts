import * as status from '@gptmmo/status';

import * as sleep from '@/duration/sleep';
import * as toString from '@/duration/toString';

import type * as core from '@/duration/Duration';

/**
 * Executes the provided callback and if no result is returned by the provided
 * duration, calls the cleanup function and returns a timeout error.
 *
 * This is typically used to enforce constraints on a long-running task. For
 * example:
 *
 * ```ts
 * const maybeSocket = await doWithTimeout(
 *   () => connectSocket(),
 *   { seconds: 5 },
 * );
 * ```
 *
 * @param args -
 * @param args.callback - The callback to execute.
 * @param args.duration - The duration to wait before canceling the callback.
 * @param args.cleanup - An optional cleanup subroutine to execute only if the
 *   callback times out.
 * @param args.additionalErrorMessage - An optional message to append to the
 *   error message if the callback times out.
 *
 * @returns The result of your callback, or an error if it timed out.
 */
export const doWithTimeout = async <T>(args: {
  callback: () => Promise<status.StatusOr<T>>;
  duration: core.Duration;
  cleanup?: () => Promise<void> | void;
  additionalErrorMessage?: string;
}): Promise<status.StatusOr<T>> => {
  const {
    callback,
    duration,
    cleanup,
    additionalErrorMessage = 'The operation took too long',
  } = args;

  const COMPLETED_TIMER: unique symbol = Symbol();
  const waitUntilTimeout = async (): Promise<typeof COMPLETED_TIMER> => {
    await sleep.sleep(duration);
    return COMPLETED_TIMER;
  };

  const result = await Promise.race([waitUntilTimeout(), callback()]);

  if (result === COMPLETED_TIMER) {
    if (cleanup !== undefined) {
      await cleanup();
    }
    return status.fromError(
      `Callback timed out after ${toString.toString(
        duration,
      )}: ${additionalErrorMessage}.`,
    );
  }

  return result;
};
