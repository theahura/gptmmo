/**
 * Variant of `Array.filter` that returns both the values included by the filter
 * and the values excluded by the filter.
 *
 * @param values - The values to split.
 * @param filter - Determines which values are included or excluded. Returns
 *   true for included values.
 *
 * @returns A tuple of [included, excluded] values.
 */
export const split = <T>(
  values: ReadonlyArray<T>,
  filter: (value: T) => boolean,
): [Array<T>, Array<T>] => {
  const included: Array<T> = [];
  const excluded: Array<T> = [];

  for (const value of values) {
    if (filter(value)) {
      included.push(value);
    } else {
      excluded.push(value);
    }
  }

  return [included, excluded];
};
