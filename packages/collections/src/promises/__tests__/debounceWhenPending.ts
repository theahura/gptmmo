import * as promises from '@/promises';

beforeEach(() => {
  jest.useFakeTimers();
});

describe('debounceWhenPending', () => {
  it('Only calls the callback once while the promise is still pending.', async () => {
    const mockCallback = jest.fn(
      async () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(true), 1000);
        }),
    );
    const debouncedCallback = promises.debounceWhenPending(mockCallback);

    const resultPromise = debouncedCallback();
    expect(mockCallback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    debouncedCallback();
    expect(mockCallback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(900);
    await resultPromise;

    jest.advanceTimersByTime(100);
    debouncedCallback();
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });
});
