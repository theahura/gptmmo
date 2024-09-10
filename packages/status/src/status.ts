// For most typeguards we'd just check if the unknown type has the same shape as
// our target type. However, `StatusOr` has very common structure (literally
// just the field `value`). To more clearly distinguish it from other unknown
// types we add this identifier to all StatusOr instances.
//
// Note that we don't use a `Symbol` because this type must be serializable.
const STATUS_OR_IDENTIFIER = '@gptmmo/libs.common.status#StatusOr';

export type OkStatusOr<T> = {
  __typename: typeof STATUS_OR_IDENTIFIER;
  value: T;
};

export type ErrorStatusOr<E> = {
  __typename: typeof STATUS_OR_IDENTIFIER;
  error: E;
  retriable: boolean;
  traceback?: string;
};

export type StatusOr<T, E = string> = OkStatusOr<T> | ErrorStatusOr<E>;

// `Status` is a specialization of `StatusOr` with no assignable value. It's
// useful in cases where a method wants to return a Status but has no return
// value on success.
export const OK_VALUE = 'Status{THIS_MUST_BE_UNIQUE_AND_SERIALIZABLE}';
export type Status<E = string> = StatusOr<typeof OK_VALUE, E>;

export const isStatusOr = (thing: any): thing is StatusOr<unknown, unknown> =>
  typeof thing === 'object' &&
  thing != null &&
  '__typename' in thing &&
  thing.__typename === STATUS_OR_IDENTIFIER;

export const isOk = <T, E>(
  statusOr: StatusOr<T, E>,
): statusOr is OkStatusOr<T> => 'value' in statusOr;

export const okStatus = (): OkStatusOr<typeof OK_VALUE> => fromValue(OK_VALUE);

export const fromValue = <T>(value: T): OkStatusOr<T> => ({
  __typename: STATUS_OR_IDENTIFIER,
  value,
});

export type FromErrorOptions = {
  retriable?: boolean;
};

export const fromError = <E>(
  error: E,
  options?: FromErrorOptions,
): ErrorStatusOr<E> => {
  const optionsWithDefaults: Required<FromErrorOptions> = {
    retriable: false,
    ...(options ?? {}),
  };

  return {
    __typename: STATUS_OR_IDENTIFIER,
    error,
    retriable: optionsWithDefaults.retriable,
    traceback: getTraceback(),
  };
};

/**
 * Rewrites the error details of an `ErrorStatusOr` without modifying any error
 * metadata (such as traceback or retriable state).
 *
 * @param errorStatusOr - The error status to rewrite.
 * @param mapper - The mapper to rewrite the error details.
 *
 * @returns The rewritten ErrorStatusOr.
 */
export const rewriteError = <E_IN, E_OUT>(
  errorStatusOr: ErrorStatusOr<E_IN>,
  mapper: (error: E_IN) => E_OUT,
): ErrorStatusOr<E_OUT> => ({
  ...errorStatusOr,
  error: mapper(errorStatusOr.error),
});

const getTraceback = (): string => {
  const stack = new Error().stack;
  return stack ? stack : '';
};

export const stripValue = <E>(statusOr: StatusOr<any, E>): Status<E> => {
  if (isOk(statusOr)) {
    return okStatus();
  }

  return statusOr;
};

export const stripTraceback = <E>(
  error: ErrorStatusOr<E>,
): ErrorStatusOr<E> => ({
  ...error,
  traceback: undefined,
});

/**
 * Allows clients to graft a value onto an "OK" `Status`. If the provided status
 * is not "OK", the error will be copied as the relevant `StatusOr<T>`.
 *
 * @param status The status maybe receiving a new value.
 * @param value The value to graft.
 *
 * @returns `StatusOr<T>` the grafted StatusOr.
 */
export const graftValue = <T, E>(
  status: Status<E>,
  value: T,
): StatusOr<T, E> => {
  if (!isOk(status)) {
    return status;
  }

  return fromValue(value);
};
