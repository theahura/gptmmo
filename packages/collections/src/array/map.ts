import * as status from '@gptmmo/status';

/**
 * Transforms the values in an array.
 *
 * Unlike `Array.map`, this method allows the transformer function to return
 * errors, which will cause the mapping to stop early. This means if an error is
 * encountered, the function will exit immediately instead of processing the
 * entire array.
 *
 * For example, you might usually write code like so to transform an array with
 * error handling:
 *
 * ```ts
 * const foo: Array<In> = ...;
 * const transformer: (value: In) => status.StatusOr<Out> = ...;
 * status.all(foo.map(transformer));
 * ```
 *
 * This approach is inefficient because it processes the entire array even if
 * the first element results in an error. Whereas, this function improves
 * efficiency by halting as soon as an error is encountered.
 *
 * @param values - The array of values to transform.
 * @param transformer - The function that transforms each value and may return
 *   an error.
 *
 * @returns A status object that contains either the transformed array or an
 *   error.
 */
export const map = <In, Out, E>(
  values: Array<In>,
  transformer: (value: In) => status.StatusOr<Out, E>,
): status.StatusOr<Array<Out>, E> => {
  const transformedValues: Array<Out> = [];

  for (const value of values) {
    const maybeTransformedValue = transformer(value);
    if (!status.isOk(maybeTransformedValue)) {
      return maybeTransformedValue;
    }
    const transformedValue = maybeTransformedValue.value;

    transformedValues.push(transformedValue);
  }

  return status.fromValue(transformedValues);
};
