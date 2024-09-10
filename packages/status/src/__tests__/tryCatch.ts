import * as status from '@/status';
import * as tryCatch from '@/tryCatch';

describe('toNativeError', () => {
  it('By default JSON serializes the ErrorStatusOr', () => {
    const error = tryCatch.toNativeError(status.fromError('foobar'));
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toStrictEqual('"foobar"');
  });

  it('Accepts a custom formatter', () => {
    const error = tryCatch.toNativeError(
      status.fromError('foobar'),
      (error) => `Custom formatted ${error}`,
    );
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toStrictEqual('Custom formatted foobar');
  });
});

describe('fromNativeError', () => {
  it('Uses the error message.', () => {
    const error = tryCatch.fromNativeError(new Error('foobar'));
    expect(status.isStatusOr(error)).toBe(true);
    expect(error.error).toStrictEqual('foobar');
  });

  it('Is symmetrical with toNativeError', () => {
    const error = tryCatch.fromNativeError(
      tryCatch.toNativeError(
        status.fromError('foobar'),
        (error) => `Custom formatted ${error}`,
      ),
    );
    expect(status.isStatusOr(error)).toBe(true);
    expect(error.error).toStrictEqual('foobar');
  });
});

test('throwIfError throws if a statusOr is an error', () => {
  expect(() => tryCatch.throwIfError(status.fromError('error'))).toThrow();
});

test('throwIfError returns the value if a statusOr is ok', () => {
  expect(tryCatch.throwIfError(status.fromValue(10))).toEqual(10);
});
