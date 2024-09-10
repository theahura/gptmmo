import * as conversions from '@/duration/conversions';

import type * as core from '@/duration/Duration';

export type SleepOptions = {
  abortSignal?: AbortSignal;
};

export type SleepResult = {
  cancelled: boolean;
};

/**
 * Returns a promise which resolves in the provided number of milliseconds.
 *
 * Useful for replicating `sleep`-like behavior in async methods like so:
 *
 * ```ts
 * const foo = async () => {
 *   ... logic ...
 *
 *   await collections.duration.sleep({ seconds: 0.5 });
 *
 *   ... logic ...
 * };
 * ```
 *
 * @param duration - The duration to wait for.
 * @param options - Sleep options.
 *
 * @returns A promise which will resolve after `duration`.
 */
export const sleep = (
  duration: core.Duration,
  options?: SleepOptions,
): Promise<SleepResult> => {
  return new Promise((resolve) => {
    const onAbort = () => {
      resolve({ cancelled: true });
    };

    if (options?.abortSignal != null) {
      options.abortSignal.addEventListener('abort', onAbort);
    }

    setTimeout(() => {
      options?.abortSignal?.removeEventListener('abort', onAbort);
      resolve({ cancelled: false });
    }, conversions.toMilliseconds(duration));
  });
};
