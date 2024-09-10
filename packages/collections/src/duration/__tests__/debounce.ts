import * as debounce from '@/duration/debounce';
import * as promises from '@/promises';

beforeEach(() => {
  jest.useFakeTimers();
});

describe('debounce', () => {
  it('Does not fire the callback until the idle threshold is met.', () => {
    const mockCallback = jest.fn();
    const debouncedCallback = debounce.debounce(mockCallback, {
      maxIdleTime: { milliseconds: 100 },
      allowParallelExecution: true,
    });

    debouncedCallback(100);
    jest.advanceTimersByTime(99);

    expect(mockCallback).toBeCalledTimes(0);

    debouncedCallback(200);
    jest.advanceTimersByTime(99);

    expect(mockCallback).toBeCalledTimes(0);

    debouncedCallback(300);
    jest.advanceTimersByTime(101);

    expect(mockCallback).toBeCalledTimes(1);
    expect(mockCallback).toBeCalledWith([[100], [200], [300]]);
  });

  it('Preempts the idle threshold if max wait time is met.', () => {
    const mockCallback = jest.fn();
    const debouncedCallback = debounce.debounce(mockCallback, {
      maxIdleTime: { milliseconds: 100 },
      maxWaitTime: { milliseconds: 150 },
      allowParallelExecution: true,
    });

    debouncedCallback(100);
    jest.advanceTimersByTime(99);

    expect(mockCallback).toBeCalledTimes(0);

    debouncedCallback(200);
    jest.advanceTimersByTime(99);

    expect(mockCallback).toBeCalledTimes(1);
    expect(mockCallback).nthCalledWith(1, [[100], [200]]);

    debouncedCallback(300);
    jest.advanceTimersByTime(101);

    expect(mockCallback).toBeCalledTimes(2);
    expect(mockCallback).nthCalledWith(2, [[300]]);
  });

  it('Triggers concurrent async callbacks when parallel execution is allowed.', () => {
    // We create a mock function which returns promises which never resolve.
    const mockCallback = jest.fn(() => new Promise<void>(() => undefined));
    const debouncedCallback = debounce.debounce(mockCallback, {
      maxIdleTime: { milliseconds: 100 },
      allowParallelExecution: true,
    });

    debouncedCallback(100);
    jest.advanceTimersByTime(101);

    expect(mockCallback).toBeCalledTimes(1);
    expect(mockCallback).nthCalledWith(1, [[100]]);

    debouncedCallback(200);
    jest.advanceTimersByTime(101);

    expect(mockCallback).toBeCalledTimes(2);
    expect(mockCallback).nthCalledWith(2, [[200]]);
  });

  it('Forces serial async callbacks when parallel execution is disallowed.', async () => {
    const mockCallback = jest.fn();
    const debouncedCallback = debounce.debounce(mockCallback, {
      maxIdleTime: { milliseconds: 100 },
      maxWaitTime: { milliseconds: 200 },
      allowParallelExecution: false,
    });

    /// First we modify our mock callback to return a Promise which can be
    /// resolved by calling `resolveMockCallback`. We leave it unresolved.

    const deferredMockCallbackResponse = promises.createDeferred<void>();
    mockCallback.mockImplementationOnce(
      () => deferredMockCallbackResponse.promise,
    );

    /// We observe that the first call to the debounce function schedules and
    /// executes the callback.

    debouncedCallback(100);
    jest.advanceTimersByTime(101);
    expect(mockCallback).toBeCalledTimes(1);
    expect(mockCallback).nthCalledWith(1, [[100]]);

    /// We observe that a second call to the debounce function does not get
    /// executed despite waiting for both timers (maxIdleTime and maxWaitTime)
    /// to elapse.

    debouncedCallback(200);
    jest.runAllTimers();
    expect(mockCallback).toBeCalledTimes(1);

    /// We observe that a third call to the debounce function still does not get
    /// executed. We do this to ensure that we're merging multiple deferred
    /// calls together when we finally execute the callback again.

    debouncedCallback(300);
    jest.runAllTimers();
    expect(mockCallback).toBeCalledTimes(1);

    /// We finally resolve the first execution and observe that our second
    /// execution begins immediately.

    deferredMockCallbackResponse.resolve();
    // We need to wait for the event loop to process a single tick for debounce
    // to step forward as per the resolved callback.
    await Promise.resolve();
    expect(mockCallback).toBeCalledTimes(2);
    expect(mockCallback).nthCalledWith(2, [[200], [300]]);
  });
});
