/**
 * Used to update the inclusion/exclusion of many values in a Set.
 *
 * Example Usage:
 *
 * ```ts
 * const mySet = new Set<string>();
 *
 * collections.set.bulkModify(
 *   mySet,
 *   ['foo', true],
 *   ['bar', false],
 *   ['baz', true],
 * );
 * ```
 *
 * @param set - The set to update.
 * @param entries - An array of value-condition tuples where the value will be
 *   added if the condition is true, and removed if false.
 */
export const bulkModify = <T>(
  set: Set<T>,
  ...entries: Array<[T, boolean]>
): void => {
  for (const [value, condition] of entries) {
    if (condition) {
      set.add(value);
    } else {
      set.delete(value);
    }
  }
};
