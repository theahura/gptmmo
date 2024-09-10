import * as status from '@gptmmo/status';

/**
 * Given an array and key function, converts the array to a Record.
 *
 * Note that this is similar to collections.toMap(), with one main difference
 * that the keys are constrained to be strings, which lets us return a Record.
 *
 * @param values - The array to convert.
 * @param keyFunction - Maps values to unique keys, which must be primitives.
 * @param valueFunction - Maps values to a specific value of any type.
 *
 * @returns The map.
 */
export const toRecord = <T, V>(
  values: Array<T>,
  keyFunction: (value: T, index: number) => string,
  valueFunction: (value: T, index: number) => V,
): status.StatusOr<Record<string, V>> => {
  const record: Record<string, V> = {};

  for (let i = 0; i < values.length; ++i) {
    const key = keyFunction(values[i], i);
    if (key in record) {
      return status.fromError(`Key ${String(key)} found more than once.`);
    }
    record[key] = valueFunction(values[i], i);
  }

  return status.fromValue(record);
};
