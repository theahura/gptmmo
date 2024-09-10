import * as _ from 'lodash';

/**
 * Creates an array of the given length filled with a static value.
 *
 * @param value The value which will fill the array.
 * @param length The size of the resulting array.
 * @param options Named options.
 * @param options.duplicate When true, makes a copy of value for each instance
 *   in the array. Defaults to true.
 *
 * @returns The filled array.
 */
export const filled = <T>(
  value: T,
  length: number,
  options?: { duplicate?: boolean },
): Array<T> => {
  const optionsWithDefaults = {
    duplicate: true,
    ...options,
  };

  const result: Array<T> = [];
  for (let i = 0; i < length; ++i) {
    result.push(optionsWithDefaults.duplicate ? _.cloneDeep(value) : value);
  }
  return result;
};
