import * as status from '@gptmmo/status';

import * as sleep from '@/duration/sleep';
import * as timeout from '@/duration/timeout';

beforeEach(() => {
  jest.useFakeTimers();
});

describe('doWithTimeout', () => {
  it('Returns the callback result when it resolves before the timeout.', async () => {
    const result = timeout.doWithTimeout({
      callback: async () => {
        await sleep.sleep({ seconds: 0.5 });
        return status.fromValue(100);
      },
      duration: { seconds: 1 },
    });

    jest.advanceTimersByTime(500);
    // Ensure that we wait for one iteration of the event loop so that our async
    // code has an opportunity to fire.
    await Promise.resolve();
    expect(status.throwIfError(await result)).toStrictEqual(100);
  });

  it('Returns error when a callback times out.', async () => {
    const result = timeout.doWithTimeout({
      callback: async () => {
        await sleep.sleep({ seconds: 2 });
        return status.fromValue(100);
      },
      duration: { seconds: 1 },
    });

    jest.advanceTimersByTime(1000);
    // Ensure that we wait for one iteration of the event loop so that our async
    // code has an opportunity to fire.
    await Promise.resolve();
    expect(await result).toMatchObject({
      error: expect.any(String),
    });
  });

  it('Calls the cleanup function when a timeout occurs.', async () => {
    const cleanupCallback = jest.fn();
    const result = timeout.doWithTimeout({
      callback: async () => {
        await sleep.sleep({ seconds: 2 });
        return status.fromValue(100);
      },
      duration: { seconds: 1 },
      cleanup: cleanupCallback,
    });

    jest.advanceTimersByTime(1000);
    // Ensure that we wait for one iteration of the event loop so that our async
    // code has an opportunity to fire.
    await Promise.resolve();
    expect(await result).toMatchObject({
      error: expect.any(String),
    });

    expect(cleanupCallback).toHaveBeenCalledTimes(1);
  });

  it('Does not call the cleanup function when the callback returns in time.', async () => {
    const cleanupCallback = jest.fn();
    const result = timeout.doWithTimeout({
      callback: async () => {
        return status.fromValue(100);
      },
      duration: { seconds: 1 },
      cleanup: cleanupCallback,
    });

    // Ensure that we wait for one iteration of the event loop so that our async
    // code has an opportunity to fire.
    await Promise.resolve();
    expect(status.throwIfError(await result)).toStrictEqual(100);

    expect(cleanupCallback).not.toHaveBeenCalled();
  });
});
