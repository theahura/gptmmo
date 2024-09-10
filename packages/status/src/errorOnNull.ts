/**
 * A helper function that maps any null result to a error status. This is
 * useful whenever you want to treat not-found results as an error.
 * Example usage:
 * ```
 * const maybeResult = await status.errorOnNull(
 *    persistence.collection.findOne({ _id: '123' })
 *  );
 * ...
 * const result = maybeResult.value;  // result is guaranteed to be non-null.
 * ```
 */

import * as status from '@/status';

export const errorOnNull = <T>(
  statusOr: status.StatusOr<T | null>,
): status.StatusOr<T> => {
  if (!status.isOk(statusOr)) {
    return statusOr;
  }
  const value = statusOr.value;

  if (value == null) {
    return status.fromError('Got null result when expecting a value.');
  }

  return status.fromValue(value);
};
