import * as status from '@/status';

export type FilterOkOptions = {
  // When true, StatusOr instances which are filtered out by `filterOk` will be
  // logged with their error message.
  //
  // Defaults to `true`.
  log?: boolean;
};

/**
 * Given a list of StatusOr instances, filters out all OK statuses and returns
 * their values.
 *
 * Note that this method is preferred to `maybeValues.filter(status.isOk)`
 * because this method additionally logs filtered statuses. Otherwise, errors
 * are removed silently.
 *
 * @param maybeValues The StatusOr instances to filter.
 * @param options Options which alter the behavior of `filterOk`.
 *
 * @returns All OK values from `maybeValues`.
 */
export const filterOk = <T>(
  maybeValues: Array<status.StatusOr<T>>,
  options?: FilterOkOptions,
): Array<T> => {
  const optionsWithDefaults: FilterOkOptions = {
    log: true,
    ...options,
  };

  const values = [];
  for (const maybeValue of maybeValues) {
    if (status.isOk(maybeValue)) {
      values.push(maybeValue.value);
      continue;
    }

    if (optionsWithDefaults.log) {
      console.warn(`Filtering out status with error: ${maybeValue.error}`);
    }
  }

  return values;
};

/**
 * Given a list of StatusOr instances, splits them into two lists: one of all
 * OK values, and one of all errors.
 *
 * @param maybeValues The StatusOr instances to split.
 *
 * @returns A tuple of two lists: one of all OK values, and one of all
 *   errors.
 */
export const split = <T, E>(
  maybeValues: Array<status.StatusOr<T, E>>,
): [Array<T>, Array<status.ErrorStatusOr<E>>] => {
  const values: Array<T> = [];
  const errors: Array<status.ErrorStatusOr<E>> = [];

  for (const maybeValue of maybeValues) {
    if (status.isOk(maybeValue)) {
      values.push(maybeValue.value);
    } else {
      errors.push(maybeValue);
    }
  }

  return [values, errors];
};
