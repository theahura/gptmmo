/**
 * Given an object with fields that represent a oneOf, create a union type
 * representing each field as one of the possible types.
 */
export type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> &
      Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];

/**
 * Given an object, create a union type representing each field as a tuple.
 */
export type KeyValueTuple<T> = KeyValueTupleInner<T, keyof T>;
type KeyValueTupleInner<T, K> = K extends keyof T
  ? Required<[K, NonNullable<T[K]>]>
  : never;
