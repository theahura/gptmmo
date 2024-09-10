import * as conversions from '@/duration/conversions';

import type * as core from '@/duration/Duration';
import type * as tsEssentials from 'ts-essentials';

export type DebounceOptions = {
  // The duration the debounced function waits after the last invocation before
  // calling the provided callback. This acts as the "cooldown" period: if the
  // debounced function is not called again within this time, the callback is
  // executed.
  maxIdleTime: core.Duration;

  // The maximum duration the debounced function can delay calling the provided
  // callback. This is a fail-safe to ensure the callback is executed even if
  // the debounced function keeps receiving invocations without exceeding the
  // `maxIdleTime`.
  maxWaitTime?: core.Duration | null;

  // If the debounced function is still processing when the next invocation
  // would be triggered, this option determines if we allow parallel execution
  // of both invocations or wait until the in-flight invocation finishes.
  //
  // Note that this means that we may exceed `maxWaitTime` in cases where the
  // debounced function takes longer than `maxWaitTime` to complete.
  allowParallelExecution: boolean;
};

/**
 * Creates a debounced function that collects and delays the invoked function's
 * arguments until after `maxIdleTime` milliseconds have elapsed since the last
 * time the debounced function was invoked. The function can also guarantee
 * execution of the callback after a `maxWait` time, even if new calls are still
 * coming in.
 *
 * @param callback - The function to debounce. It is called with an array of
 *   arguments that were passed to the debounced function during the debounce
 *   period.
 * @param options - Debounce options.
 *
 * @returns The new debounced function.
 */
export const debounce = <Args extends Array<any>>(
  callback: (calls: Array<Args>) => tsEssentials.AsyncOrSync<void>,
  options: DebounceOptions,
): ((...args: Args) => void) => {
  let calls: Array<Args> = [];

  let maxWaitTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  let callbackInProgress = false;
  let requiresExecutionAfterInProgressCallback = false;

  const executeCallback = async () => {
    // A sanity check that calls isn't empty. We technically should never
    // encounter this scenario unless there's a bug or maxWaitTimer and
    // idleTimer fire at the exact same time (which while improbable, is
    // possible);
    if (calls.length === 0) {
      return;
    }

    // When parallel execution is disallowed, we early exit out of the callback
    // execution if a callback invocation is already in progress. However, we
    // set `requiresExecutionAfterInProgressCallback` which indicates that once
    // the callback invocation completes, we need to immediately schedule our
    // next invocation. In the meantime we'll continue to collect desired calls
    // to be delivered to the next invocation.
    if (!options.allowParallelExecution && callbackInProgress) {
      requiresExecutionAfterInProgressCallback = true;
      return;
    }

    const capturedCalls = calls;

    // We clear the state of debounce before calling the callback so that the
    // callback can call the debounced method with reset state.
    clearTimeout(maxWaitTimer);
    clearTimeout(idleTimer);
    maxWaitTimer = undefined;
    idleTimer = undefined;
    calls = [];
    requiresExecutionAfterInProgressCallback = false;

    callbackInProgress = true;
    try {
      await callback(capturedCalls);
    } finally {
      callbackInProgress = false;
      if (requiresExecutionAfterInProgressCallback) {
        executeCallback();
      }
    }
  };

  return (...args: Args) => {
    calls.push(args);

    if (options.maxWaitTime != null && maxWaitTimer == null) {
      maxWaitTimer = setTimeout(
        executeCallback,
        conversions.toMilliseconds(options.maxWaitTime),
      );
    }

    clearTimeout(idleTimer);
    idleTimer = setTimeout(
      executeCallback,
      conversions.toMilliseconds(options.maxIdleTime),
    );
  };
};
