import * as status from '@gptmmo/status';

import * as polling from '@/polling';
import * as stream from '@/stream';

beforeEach(() => {
  jest.useFakeTimers();
});

describe('IntervalPoller', () => {
  it('Updates at the desired interval.', async () => {
    let invocationCount = 0;
    const callback = jest.fn(() => ++invocationCount);
    const poller = polling.createIntervalPoller({
      interval: { seconds: 1 },
      callback,
    });

    expect(poller.getLatestValue()).toBe(undefined);

    await drainEventLoop();
    expect(poller.getLatestValue()).toBe(1);

    jest.advanceTimersByTime(999);
    await drainEventLoop();
    expect(poller.getLatestValue()).toBe(1);

    jest.advanceTimersByTime(1);
    await drainEventLoop();
    expect(poller.getLatestValue()).toBe(2);

    jest.advanceTimersByTime(999);
    await drainEventLoop();
    expect(poller.getLatestValue()).toBe(2);

    jest.advanceTimersByTime(1);
    await drainEventLoop();
    expect(poller.getLatestValue()).toBe(3);
  });

  it('Streams polled results.', async () => {
    let invocationCount = 0;
    const callback = jest.fn(() => ++invocationCount);
    const poller = polling.createIntervalPoller({
      interval: { seconds: 1 },
      callback,
    });

    const valueStream = poller.getValueStream();

    await drainEventLoop();
    jest.advanceTimersByTime(1000);
    await drainEventLoop();
    jest.advanceTimersByTime(1000);
    await drainEventLoop();
    jest.advanceTimersByTime(1000);
    await drainEventLoop();

    poller.stop();

    expect(
      status.throwIfError(await stream.toArray(valueStream)),
    ).toStrictEqual([1, 2, 3, 4]);
  });

  it('Value stream can be cancelled without affecting poller functionality.', async () => {
    let invocationCount = 0;
    const callback = jest.fn(() => ++invocationCount);
    const poller = polling.createIntervalPoller({
      interval: { seconds: 1 },
      callback,
    });

    const valueStream = poller.getValueStream();
    const valueStream2 = poller.getValueStream();

    await drainEventLoop();
    jest.advanceTimersByTime(1000);
    await drainEventLoop();

    await valueStream.cancel();

    expect((await valueStream.getReader().read()).done).toStrictEqual(true);

    await drainEventLoop();
    jest.advanceTimersByTime(1000);
    await drainEventLoop();

    poller.stop();

    expect(
      status.throwIfError(await stream.toArray(valueStream2)),
    ).toStrictEqual([1, 2, 3]);
  });
});

/**
 * It's often necessary when writing tests which mock time, to advance time
 * and* allow the event loop to resolve any outstanding promises.
 *
 * For example
 *
 * ```ts
 * await duration.sleep({ seconds: 1 });
 * console.log(100);
 * ```
 *
 * Just stepping forward one second wont emit a log statement, the resolved
 * sleep command will be in the event queue and we need to yield control to it
 * in order to log.
 *
 * To achieve this, we have this helper which enforces a 1000 event loop cycles
 * to complete, offering plenty of time for promises to resolve.
 */
const drainEventLoop = async () => {
  for (let i = 0; i < 1000; ++i) await Promise.resolve();
};
