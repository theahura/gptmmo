import * as status from '@/index';

describe('errorOnNull', () => {
  test('correctly returns an error when it gets a null.', () => {
    const nullStatus = status.fromValue(null);
    const maybeError = status.errorOnNull(nullStatus);
    expect(maybeError).toMatchObject({
      error: 'Got null result when expecting a value.',
    });
  });

  test('correctly passes through non-null values.', () => {
    const nonNullStatus = status.fromValue('hello');
    const maybeValue = status.errorOnNull(nonNullStatus);
    expect(maybeValue).toStrictEqual(status.fromValue('hello'));
  });

  test('correctly passes through errors.', () => {
    const errorStatus = status.fromError('custom error');
    const maybeValue = status.errorOnNull(errorStatus);
    expect(maybeValue).toMatchObject({
      error: 'custom error',
    });
  });
});
