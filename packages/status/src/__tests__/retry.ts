import * as retry from '@/retry';
import * as status from '@/status';

describe('doWithRetry', () => {
  test('Infinite maxRetries only returns after a success.', async () => {
    const mockCallback = jest.fn();
    mockCallback.mockImplementation(() =>
      status.fromError('Expected test error.'),
    );

    let callbackResult: status.StatusOr<string> | null = null;
    retry
      .doWithRetry<string, string>(mockCallback, {
        maxRetries: Infinity,
        base: { milliseconds: 50 },
      })
      .then((result) => {
        callbackResult = result;
      });

    // Wait 150ms and check that the doWithRetry has not yet returned a result
    // and that our operation has been called several times.

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 150);
    });
    expect(callbackResult).toBeNull();
    expect(mockCallback.mock.calls.length).toBeGreaterThan(2);

    // Change the mocked function to return a successful status and wait 500ms.
    // Then validate that doWithRetry has returned the successful status.

    mockCallback.mockImplementation(() => status.fromValue('foo'));
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 500);
    });
    expect(callbackResult).toStrictEqual(status.fromValue('foo'));
  });

  test('Will early return an error if max retries is hit.', async () => {
    const mockCallback = jest.fn();
    mockCallback.mockImplementation(() =>
      status.fromError('Expected test error.'),
    );

    expect(
      await retry.doWithRetry(mockCallback, {
        maxRetries: 3,
        base: { milliseconds: 100 },
      }),
    ).toMatchObject({
      error: 'Expected test error.',
    });

    // We expect 4 calls, the first and then 3 retries.
    expect(mockCallback).toHaveBeenCalledTimes(4);
  });
});
