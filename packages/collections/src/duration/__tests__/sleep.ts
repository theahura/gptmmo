import * as sleep from '@/duration/sleep';

beforeEach(() => {
  jest.useFakeTimers();
});

describe('sleep', () => {
  it('Resolves after the designated duration.', async () => {
    let sleepResult: sleep.SleepResult | null = null;
    sleep.sleep({ seconds: 5 }).then((resolvedSleepResult) => {
      sleepResult = resolvedSleepResult;
    });

    jest.advanceTimersByTime(4999);
    // Ensure that we wait for one iteration of the event loop so that our async
    // code has an opportunity to fire.
    await Promise.resolve();
    expect(sleepResult).toBe(null);

    jest.advanceTimersByTime(5000);
    // Ensure that we wait for one iteration of the event loop so that our async
    // code has an opportunity to fire.
    await Promise.resolve();
    expect(sleepResult).toStrictEqual({ cancelled: false });
  });

  it('Can be cancelled before the desired duration.', async () => {
    const abortController = new AbortController();

    let sleepResult: sleep.SleepResult | null = null;
    sleep
      .sleep({ seconds: 5 }, { abortSignal: abortController.signal })
      .then((resolvedSleepResult) => {
        sleepResult = resolvedSleepResult;
      });

    jest.advanceTimersByTime(2000);
    // Ensure that we wait for one iteration of the event loop so that our async
    // code has an opportunity to fire.
    await Promise.resolve();
    expect(sleepResult).toBe(null);

    abortController.abort();
    // Ensure that we wait for one iteration of the event loop so that our async
    // code has an opportunity to fire.
    await Promise.resolve();
    expect(sleepResult).toStrictEqual({ cancelled: true });
  });

  it('Cancellation after the desired duration does nothing.', async () => {
    const abortController = new AbortController();

    let sleepResult: sleep.SleepResult | null = null;
    sleep
      .sleep({ seconds: 5 }, { abortSignal: abortController.signal })
      .then((resolvedSleepResult) => {
        sleepResult = resolvedSleepResult;
      });

    jest.advanceTimersByTime(5000);
    // Ensure that we wait for one iteration of the event loop so that our async
    // code has an opportunity to fire.
    await Promise.resolve();
    expect(sleepResult).toStrictEqual({ cancelled: false });

    abortController.abort();
    // Ensure that we wait for one iteration of the event loop so that our async
    // code has an opportunity to fire.
    await Promise.resolve();
    expect(sleepResult).toStrictEqual({ cancelled: false });
  });
});
