type RecordKeyType = string | number;

/**
 * DefaultRecord behaves exactly the same as an ordinary record *except* that
 * accessing an unset key will set and return a default value.
 *
 * This is inspired by python's `defaultdict`.
 */
export type DefaultRecord<K extends RecordKeyType, V> = Record<K, V>;

/**
 * Creates a new `DefaultRecord`.
 *
 * @param initialValue - The initial contents of the default record.
 * @param defaultValueFactory - A factory for creating default values used when
 *   an unset key is accessed.
 *
 * @returns A new default record.
 */
export const createDefaultRecord = <K extends RecordKeyType, V>(
  initialValue: Record<K, V>,
  defaultValueFactory: () => V,
): DefaultRecord<K, V> =>
  new Proxy(initialValue, {
    get(target, property) {
      if (Reflect.has(target, property)) {
        return Reflect.get(target, property);
      }

      const defaultValue = defaultValueFactory();
      Reflect.set(target, property, defaultValue);
      return defaultValue;
    },
  });
