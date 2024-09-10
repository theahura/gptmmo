import * as status from '@gptmmo/status';

import * as arrays from '@/array';
import * as sets from '@/set';

export type ComparisonResult<V> = {
  //  Contains entries that are present in the second record but not in the
  //  first.
  added: Record<string, V>;

  // Contains entries that are present in the first record but not in the
  // second.
  deleted: Record<string, V>;

  // Contains entries that exist in both records but have different values.
  modified: Record<string, ComparisonModification<V>>;
};

export type ComparisonModification<V> = {
  from: V;
  to: V;
};

/**
 * Compares the entries of two records and returns a comparison result.
 *
 * This function performs a shallow comparison, meaning entries compare their
 * values using `===` and not deep equality checks.
 *
 * @param from - The first record to compare.
 * @param to - The second record to compare.
 *
 * @returns The result of the comparison, highlighting the added, deleted, and
 *   modified entries.
 */
export const compareEntries = <V>(
  from: Record<string, V>,
  to: Record<string, V>,
): ComparisonResult<V> => {
  const fromKeys = new Set(Object.keys(from));
  const toKeys = new Set(Object.keys(to));

  const addedKeys = sets.difference(toKeys, fromKeys);
  const deletedKeys = sets.difference(fromKeys, toKeys);
  const commonKeys = sets.intersection(fromKeys, toKeys);

  // Note that we use `status.throwIfError` several times here. This is because
  // `toRecord` throws errors if the key function returns duplicate keys. We
  // know this will never happen because our keys are already in a Set. We're
  // just using `throwIfError` here to narrow the type to a successful value
  // since we always expect a successful value.
  return {
    added: status.throwIfError(
      arrays.toRecord(
        Array.from(addedKeys),
        (key) => key,
        (key) => to[key],
      ),
    ),
    deleted: status.throwIfError(
      arrays.toRecord(
        Array.from(deletedKeys),
        (key) => key,
        (key) => from[key],
      ),
    ),
    modified: status.throwIfError(
      arrays.toRecord(
        Array.from(commonKeys).filter((key) => to[key] !== from[key]),
        (key) => key,
        (key) => ({ from: from[key], to: to[key] }),
      ),
    ),
  };
};
