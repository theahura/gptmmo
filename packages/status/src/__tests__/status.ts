import * as status from '@/status';

test('graftValue successfully grafts if the status is OK.', () => {
  const okStatus: status.Status = status.okStatus();

  expect(status.graftValue(okStatus, 100)).toStrictEqual(
    status.fromValue(100),
  );
});

test('graftValue copies the error for a non-OK status.', () => {
  const errorStatus: status.Status = status.fromError('Error');

  expect(status.graftValue(errorStatus, 100)).toMatchObject({
    error: 'Error',
  });
});
