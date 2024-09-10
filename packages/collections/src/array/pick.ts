import * as status from '@gptmmo/status';

/**
 * Picks a random element from an array.
 *
 * @param values - The array to pick from.
 *
 * @returns The picked value or an error if the array was empty.
 */
export const pickRandomElement = <T>(values: Array<T>): status.StatusOr<T> => {
  if (values.length === 0) {
    return status.fromError('Cannot pick one from an empty array.');
  }

  return status.fromValue(values[Math.floor(values.length * Math.random())]);
};
