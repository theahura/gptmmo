/**
 * Maps a Record to a new Record where each value is replaced by calling
 * `mapper` on the value and key of that entry. Currently only supports string keys since `Object.entries` and `Object.fromEntries` are typed to assume the keys are strings.
 *
 * @param record The record to map.
 * @param mapper The mapping function.
 *
 * @returns A new mapped record.
 */
export const mapValues = <K extends string, V, R>(
  record: Record<K, V>,
  mapper: (value: V, key: K) => R,
): Record<K, R> =>
  Object.fromEntries(
    Object.entries<V>(record).map(([key, value]: [K, V]) => [
      key,
      mapper(value, key),
    ]),
  ) as Record<K, R>;
