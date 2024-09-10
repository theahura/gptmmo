/**
 * Filters all null values from an array with type narrowing.
 *
 * As per https://github.com/microsoft/TypeScript/issues/20812 to type narrow
 * within a filter, our filter function needs to be a type guard. This utility
 * is a generic filter for removing nulls with type narrowing.
 *
 * @param array The array to filter.
 *
 * @returns The filtered array.
 */
export const filterNull = <T>(array: Array<T | null>): Array<T> =>
  array.filter((value): value is T => value !== null);

/**
 * Filters all null-like values from an array with type narrowing.
 *
 * As per https://github.com/microsoft/TypeScript/issues/20812 to type narrow
 * within a filter, our filter function needs to be a type guard. This utility
 * is a generic filter for removing null-like values with type narrowing.
 *
 * @param array The array to filter.
 *
 * @returns The filtered array.
 */
export const filterNullLike = <T>(
  array: Array<T | null | undefined>,
): Array<T> => array.filter((value): value is T => value != null);
