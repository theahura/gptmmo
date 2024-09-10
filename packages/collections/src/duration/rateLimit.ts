import * as status from '@gptmmo/status';

import * as conversions from '@/duration/conversions';
import * as promises from '@/promises';

import type * as core from '@/duration/Duration';

export type RateLimitStrategy = WindowedRateLimitStrategy;

export enum RateLimitStrategyType {
  WINDOWED = 'WINDOWED',
}

/**
 * Rate limits a function so that at most N calls occur within a given duration.
 *
 * This type of rate limiting *does* allow bursts. It does not even out load.
 * For example, if the strategy defines at most 10 calls in 1 second, it can
 * issue all 10 calls in the first millisecond, after which it would reject all
 * calls for 999 milliseconds.
 */
export type WindowedRateLimitStrategy = {
  type: RateLimitStrategyType.WINDOWED;
  duration: core.Duration;
  maxCalls: number;
};

export type RateLimitError<R> = {
  // It's often useful to throttle a function instead of forcing all calls to
  // error when the rate limit is exceeded. For this reason, rate limit errors
  // must provide an option to enqueue the rate limited call so that it'll
  // execute once the rate limit no longer applies.
  enqueue: () => Promise<Awaited<R>>;
};

/**
 * Creates a new function with the same signature as the provided callback with
 * the additional behavior that calls will be rate limited according to the
 * provided strategy.
 *
 * @param callback - The function to wrap with a rate limit.
 * @param strategy - Rate limit strategy.
 *
 * @returns A new method similar to `callback` which will return an error if the
 *   rate limit is exceeded.
 */
export const rateLimit = <Args extends Array<any>, R>(
  callback: (...args: Args) => R,
  strategy: RateLimitStrategy,
): ((...args: Args) => status.StatusOr<R, RateLimitError<R>>) => {
  switch (strategy.type) {
    case RateLimitStrategyType.WINDOWED:
      return windowedRateLimit(callback, strategy);
  }
};

/**
 * A variant of `rateLimit` which rather than returning an error when the rate
 * limit is exceeded, it always enqueues the failed call until a time when the
 * rate limit no longer applies.
 *
 * @param callback - The function to wrap with a rate limit.
 * @param strategy - Rate limit strategy.
 *
 * @returns A new method similar to `callback` which applies throttling.
 */
export const throttle = <Args extends Array<any>, R>(
  callback: (...args: Args) => R,
  strategy: RateLimitStrategy,
): ((...args: Args) => R | Promise<Awaited<R>>) => {
  const rateLimitedCallback = rateLimit(callback, strategy);

  return (...args) => {
    const maybeResult = rateLimitedCallback(...args);
    if (!status.isOk(maybeResult)) {
      return maybeResult.error.enqueue();
    }
    const result = maybeResult.value;

    return result;
  };
};

const windowedRateLimit = <Args extends Array<any>, R>(
  callback: (...args: Args) => R,
  strategy: WindowedRateLimitStrategy,
): ((...args: Args) => status.StatusOr<R, RateLimitError<R>>) => {
  // Rather than keep a call log with timestamps for each call to implement
  // windowing, we keep track of "tokens" where each token represents a call
  // that can be executed. Kindof like an admission ticket. When we execute the
  // callback, we consume a token, and when the sliding window progresses far
  // enough, we give the token back to the shared pool.
  let tokens = strategy.maxCalls;

  const pendingCalls: Array<() => void> = [];

  const executeCallback = (args: Args): R => {
    --tokens;
    setTimeout(() => {
      ++tokens;

      // When a token is added back to the shared pool, we immediately execute
      // the next pending call (if any).
      const pendingCall = pendingCalls.shift();
      if (pendingCall != null) {
        pendingCall();
      }
    }, conversions.toMilliseconds(strategy.duration));
    return callback(...args);
  };

  const enqueueCallback = (args: Args): Promise<Awaited<R>> => {
    const deferred = promises.createDeferred<Awaited<R>>();
    pendingCalls.push(async () => {
      deferred.resolve(await executeCallback(args));
    });
    return deferred.promise;
  };

  return (...args) => {
    if (tokens === 0) {
      return status.fromError({
        enqueue: () => enqueueCallback(args),
      });
    }

    return status.fromValue(executeCallback(args));
  };
};
