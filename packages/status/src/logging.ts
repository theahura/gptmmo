import * as status from '@/status';

/**
 * Logs the status only if it's an error.
 *
 * @param message - The prefix message for any logs.
 * @param maybeValue - The status.
 *
 * @returns The status with no modifications.
 */
export const logIfError = <T, E>(
  message: string,
  maybeValue: status.StatusOr<T, E>,
): status.StatusOr<T, E> => {
  if (!status.isOk(maybeValue)) {
    console.log(message, maybeValue);
  }
  return maybeValue;
};

/**
 * Logs a warning for the status only if it's an error.
 *
 * @param message - The prefix message for any logs.
 * @param maybeValue - The status.
 *
 * @returns The status with no modifications.
 */
export const logWarningIfError = <T, E>(
  message: string,
  maybeValue: status.StatusOr<T, E>,
): status.StatusOr<T, E> => {
  if (!status.isOk(maybeValue)) {
    console.warn(message, maybeValue);
  }
  return maybeValue;
};

/**
 * Logs an error for the status only if it's an error.
 *
 * @param message - The prefix message for any logs.
 * @param maybeValue - The status.
 *
 * @returns The status with no modifications.
 */
export const logErrorIfError = <T, E>(
  message: string,
  maybeValue: status.StatusOr<T, E>,
): status.StatusOr<T, E> => {
  if (!status.isOk(maybeValue)) {
    console.error(message, maybeValue);
  }
  return maybeValue;
};
