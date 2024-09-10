/**
 * Given an array, `target` index, and `after` index, returns a copy of the
 * array with the `target` element moved after the `after` element.
 *
 * If the `after` index is null, the `target` element is moved to the 0th index.
 *
 * @param values - The array to convert.
 * @param target - The index of the target (element to be moved).
 * @param after - The index of the element after which the target should be
 *   inserted. If set to null, the target element will be moved to the 0th
 *   index.
 *
 * @returns A shallow copy of the array with the target moved to the new
 *   location.
 */
export const moveAfter = <T>(
  values: Array<T>,
  target: number,
  after: number | null,
): Array<T> => {
  if (target >= values.length || target < 0) {
    return values;
  }

  if (after != null && after < 0) {
    after = null;
  }

  if (after != null && after > values.length - 1) {
    after = values.length - 1;
  }

  if (after == null) {
    return [
      values[target],
      ...values.slice(0, target),
      ...values.slice(target + 1),
    ];
  }

  const valuesWithoutTarget = [
    ...values.slice(0, target),
    ...values.slice(target + 1),
  ];

  // If the target index was less than the after index, all the indices after
  // the target index will have been reduced by 1 when we removed the target
  // element.
  if (target <= after) {
    after--;
  }

  return [
    ...valuesWithoutTarget.slice(0, after + 1),
    values[target],
    ...valuesWithoutTarget.slice(after + 1),
  ];
};
