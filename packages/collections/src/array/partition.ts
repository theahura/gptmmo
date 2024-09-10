/**
 * Contains utilits for partitioning data. Most commonly this means splitting
 * arrays into multiple groups based on some selection criteria.
 */

import * as pLimit from 'p-limit';

import type * as tsEssentials from 'ts-essentials';

/**
 * Given an array of values, returns a view of that array partitioned by a
 * discriminator. For example, you could partition an array of numbers into two
 * groups, odds and evens with the discriminator `(v) => v % 2 === 0` or
 * partition an array of numbers by last digit with `(v) => v % 10`.
 *
 * Note that this method partitions data in a stable manner. Values within each
 * partition will exhibit the same ordering relative to each other as they did
 * in the original `values` array.
 *
 * @param values The values to partition.
 * @param discriminator A function which identifies the partition each value
 *   belongs in by returning a partition key. This must be a primitive type so
 *   that keys can be trivially compared.
 *
 * @returns The partitions represented as a Map keyed by the partition key.
 */
export const partition = <T, K extends tsEssentials.Primitive>(
  values: Array<T>,
  discriminator: (value: T, index: number) => K,
): Map<K, Array<T>> => {
  const partitions = new Map<K, Array<T>>();
  for (let i = 0; i < values.length; ++i) {
    const value = values[i];
    const discrimination = discriminator(value, i);
    const existingPartition = partitions.get(discrimination);
    if (existingPartition == null) {
      partitions.set(discrimination, [value]);
    } else {
      existingPartition.push(value);
    }
  }
  return partitions;
};

export const EMPTY_RESULT: unique symbol = Symbol('NoResult');

/**
 * Given an array of values, partitions those values into groups given a
 * discriminator and then applied logic to each partition. This is helpful in
 * cases where batch processing can only occur when like-data is grouped
 * together.
 *
 * @param values The values to partition.
 * @param discriminator A function which identifies the partition each value
 *   belongs in by returning a partition key. This must be a primitive type so
 *   that keys can be trivially compared.
 * @param handler A function which executes against a partition and returns an
 *   array of results of the same length as there are values in the partition.
 *   Each result represents the result for a single value in the partition and
 *   must be ordered in the same order as values are received.
 * @param options Named options.
 * @param options.concurrencyLimit By default all partitions will be handled
 *   concurrently. If you'd like to constraint concurrency so that at most N
 *   partitions are handled at a time, you can use this option to specify N.
 *
 * @returns An array of results for each value (meaning the same length and order
 *   as `values`). If a result is not available for a value this is the result
 *   of a usage error and is represented by the unique value `EMPTY_RESULT`.
 */
export const forEachPartition = async <T, R, K extends tsEssentials.Primitive>(
  values: Array<T>,
  discriminator: (value: T, index: number) => K,
  handler: (
    discrimination: K,
    values: Array<T>,
  ) => tsEssentials.AsyncOrSync<Array<R>>,
  options?: {
    concurrencyLimit?: number;
  },
): Promise<Array<R | typeof EMPTY_RESULT>> => {
  const partitions = partition(values, discriminator);

  const concurrencyLimit = pLimit.default(
    options?.concurrencyLimit ?? partitions.size,
  );
  const unorderedResults = new Map<T, R | typeof EMPTY_RESULT>();
  await Promise.all(
    Array.from(partitions.entries()).map((entry) =>
      concurrencyLimit(async ([key, values]) => {
        const partitionResults = await handler(key, values);
        for (let i = 0; i < values.length; ++i) {
          if (i < partitionResults.length) {
            unorderedResults.set(values[i], partitionResults[i]);
          } else {
            unorderedResults.set(values[i], EMPTY_RESULT);
          }
        }
      }, entry),
    ),
  );

  return values.map((value) => {
    if (!unorderedResults.has(value)) {
      return EMPTY_RESULT;
    }
    return unorderedResults.get(value) as R;
  });
};
