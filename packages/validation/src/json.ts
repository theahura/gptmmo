import * as status from '@gptmmo/status';

import * as schema from '@/schema';

/**
 * A wrapper around `JSON.parse` that returns `StatusOr` instead of throwing
 * errors if JSON parsing fails *and* validates the returned result using JSON
 * Schema to ensure type safety.
 *
 * @param text The text to parse as JSON.
 * @param validator A schema validator for enforcing typesafety against the
 *   parsed JSON.
 *
 * @returns The parsed JSON.
 */
export const parseJson = <T>(
  text: string,
  validator: schema.Validator<T>,
): status.StatusOr<T> => {
  const maybeDeserialized = parseJsonWithoutTypeSafety(text);
  if (!status.isOk(maybeDeserialized)) {
    return maybeDeserialized;
  }

  return schema.validate(validator, maybeDeserialized.value);
};

/**
 * A thin wrapper around `JSON.parse` that returns `StatusOr` instead of
 * throwing errors if JSON parsing fails.
 *
 * @param text The text to parse as JSON.
 *
 * @returns Some untyped JS value.
 */
const parseJsonWithoutTypeSafety = (text: string): status.StatusOr<any> => {
  return status.tryCatch(
    () => JSON.parse(text),
    (error) =>
      status.fromError(
        `Failed to deserialize json with error: ${error.message}`,
      ),
  );
};
