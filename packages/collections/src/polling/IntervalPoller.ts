import * as webStream from 'web-streams-polyfill';

import * as duration from '@/duration';

import type * as tsEssentials from 'ts-essentials';

/**
 * Polls a resource at a pre-specified interval.
 */
export type IntervalPoller<T> = {
  /**
   * @returns The latest value received by polling, or undefined if the poller
   *   has not received an initial value yet.
   */
  getLatestValue(): T | undefined;

  /**
   * It's frequently useful to respond to each polling update. This can be
   * achieved by consuming a stream of data from the poller.
   *
   * @returns A stream of polled results.
   */
  getValueStream(): webStream.ReadableStream<T>;

  /**
   * Stops polling, cannot be resumed.
   */
  stop: () => void;
};

export type IntervalPollerOptions<T> = {
  // After the callback has resolved, the interval poller will wait this long
  // before issuing the callback again.
  interval: duration.Duration;

  // The poller will be updated with the result of this callback.
  callback: () => tsEssentials.AsyncOrSync<T>;
};

export const createIntervalPoller = <T>(
  options: IntervalPollerOptions<T>,
): IntervalPoller<T> => {
  let latestValue: T | undefined = undefined;
  const streamControllers = new Set<ReadableStreamDefaultController<T>>();
  const abortController = new AbortController();

  // Detached polling loop.
  (async () => {
    while (!abortController.signal.aborted) {
      latestValue = await options.callback();
      for (const streamController of streamControllers) {
        streamController.enqueue(latestValue);
      }

      await duration.sleep(options.interval, {
        abortSignal: abortController.signal,
      });
    }
  })();

  const getLatestValue: IntervalPoller<T>['getLatestValue'] = () =>
    latestValue;

  const getValueStream: IntervalPoller<T>['getValueStream'] = () => {
    if (abortController.signal.aborted) {
      return new webStream.ReadableStream<T>({
        start(controller) {
          controller.close();
        },
      });
    }

    let streamController: webStream.ReadableStreamDefaultController<T>;
    return new webStream.ReadableStream<T>({
      start(controller) {
        streamController = controller;
        streamControllers.add(controller);
      },

      cancel() {
        streamControllers.delete(streamController);
      },
    });
  };

  const stop: IntervalPoller<T>['stop'] = () => {
    abortController.abort();
    for (const streamController of streamControllers) {
      streamController.close();
    }
    streamControllers.clear();
  };

  return {
    getLatestValue,
    getValueStream,
    stop,
  };
};
