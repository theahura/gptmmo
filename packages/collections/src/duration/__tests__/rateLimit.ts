import * as status from '@gptmmo/status';

import * as rateLimit from '@/duration/rateLimit';

beforeEach(() => {
  jest.useFakeTimers();
});

describe('RateLimitStrategy.WINDOWED', () => {
  it('Can burst up to the window maximum.', async () => {
    let callCount = 0;
    const rawFunction = jest.fn(() => ++callCount);
    const rateLimitedFunction = rateLimit.rateLimit(rawFunction, {
      type: rateLimit.RateLimitStrategyType.WINDOWED,
      duration: { seconds: 1 },
      maxCalls: 10,
    });

    for (let i = 0; i < 10; ++i) {
      expect(status.throwIfError(rateLimitedFunction())).toBe(i + 1);
    }

    assertErrorStatusOr(rateLimitedFunction());
    expect(rawFunction).toHaveBeenCalledTimes(10);
  });

  it('Can enqueue pending calls.', async () => {
    let callCount = 0;
    const rawFunction = jest.fn(() => ++callCount);
    const rateLimitedFunction = rateLimit.rateLimit(rawFunction, {
      type: rateLimit.RateLimitStrategyType.WINDOWED,
      duration: { seconds: 1 },
      maxCalls: 2,
    });

    expect(status.throwIfError(rateLimitedFunction())).toBe(1);
    expect(status.throwIfError(rateLimitedFunction())).toBe(2);
    const thirdCall = assertErrorStatusOr(rateLimitedFunction()).enqueue();
    expect(rawFunction).toHaveBeenCalledTimes(2);

    // The sliding window should allow additional calls in exactly 1000ms. So
    // first we forward to 999 to ensure the pending call doesn't execute early.
    jest.advanceTimersByTime(999);
    for (let i = 0; i < 100; ++i) await Promise.resolve();
    expect(rawFunction).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(1);
    expect(await thirdCall).toBe(3);
    expect(rawFunction).toHaveBeenCalledTimes(3);
  });

  it('Executes pending calls serially.', async () => {
    let callCount = 0;
    const rawFunction = jest.fn(() => ++callCount);
    const rateLimitedFunction = rateLimit.rateLimit(rawFunction, {
      type: rateLimit.RateLimitStrategyType.WINDOWED,
      duration: { seconds: 1 },
      maxCalls: 2,
    });

    expect(status.throwIfError(rateLimitedFunction())).toBe(1);
    // By using a slight offset here we capture more edge cases in the test by
    // ensuring that our sliding window contains calls at different timestamps.
    jest.advanceTimersByTime(500);
    expect(status.throwIfError(rateLimitedFunction())).toBe(2);
    const thirdCall = assertErrorStatusOr(rateLimitedFunction()).enqueue();
    expect(thirdCall).toBeInstanceOf(Promise);
    const fourthCall = assertErrorStatusOr(rateLimitedFunction()).enqueue();
    expect(fourthCall).toBeInstanceOf(Promise);
    const fifthCall = assertErrorStatusOr(rateLimitedFunction()).enqueue();
    expect(fifthCall).toBeInstanceOf(Promise);

    expect(rawFunction).toHaveBeenCalledTimes(2);

    // The sliding window should allow additional calls in exactly 500ms. So
    // first we forward to 499 to ensure the pending call doesn't execute early.
    jest.advanceTimersByTime(499);
    for (let i = 0; i < 100; ++i) await Promise.resolve();
    expect(rawFunction).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(1);
    expect(await thirdCall).toBe(3);
    expect(rawFunction).toHaveBeenCalledTimes(3);

    // The sliding window should allow additional calls in exactly 500ms. So
    // first we forward to 499 to ensure the pending call doesn't execute early.
    jest.advanceTimersByTime(499);
    for (let i = 0; i < 100; ++i) await Promise.resolve();
    expect(rawFunction).toHaveBeenCalledTimes(3);

    jest.advanceTimersByTime(1);
    expect(await fourthCall).toBe(4);
    expect(rawFunction).toHaveBeenCalledTimes(4);

    // The sliding window should allow additional calls in exactly 500ms. So
    // first we forward to 499 to ensure the pending call doesn't execute early.
    jest.advanceTimersByTime(499);
    for (let i = 0; i < 100; ++i) await Promise.resolve();
    expect(rawFunction).toHaveBeenCalledTimes(4);

    jest.advanceTimersByTime(1);
    expect(await fifthCall).toBe(5);
    expect(rawFunction).toHaveBeenCalledTimes(5);
  });
});

const assertErrorStatusOr = <T, E>(maybeValue: status.StatusOr<T, E>): E => {
  if (status.isOk(maybeValue)) {
    throw new Error('Expected an error.');
  }
  return maybeValue.error;
};
