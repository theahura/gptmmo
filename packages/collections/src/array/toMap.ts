import * as status from '@gptmmo/status';

import type * as tsEssentials from 'ts-essentials';

/**
 * Given an array and key function, converts the array to a Map.
 *
 * Note that this is similar to `partition.ts` but differs in that the key
 * function must return unique keys whereas partition creates groups based on
 * keys which collide.
 *
 * @param values - The array to convert.
 * @param keyFunction - Maps values to unique keys.
 * @param valueFunction - Maps values to a specific value of any type.
 *
 * @returns The map.
 */
export const toMap = <T, K extends tsEssentials.Primitive, V>(
  values: Array<T>,
  keyFunction: (value: T, index: number) => K,
  valueFunction: (value: T, index: number) => V,
): status.StatusOr<Map<K, V>> => {
  const map = new Map<K, V>();
  for (let i = 0; i < values.length; ++i) {
    const key = keyFunction(values[i], i);
    if (map.has(key)) {
      return status.fromError(`Key ${String(key)} found more than once.`);
    }

    map.set(key, valueFunction(values[i], i));
  }
  return status.fromValue(map);
};
