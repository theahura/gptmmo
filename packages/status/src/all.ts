import * as status from '@/status';

export const all = <T, E>(
  list: Array<status.StatusOr<T, E>>,
): status.StatusOr<Array<T>, E> => {
  const resultList: Array<T> = [];
  for (const statusOr of list) {
    if (!status.isOk(statusOr)) {
      return statusOr;
    }
    resultList.push(statusOr.value);
  }
  return status.fromValue(resultList);
};

export const allAsync = async <T, E>(
  list: Array<Promise<status.StatusOr<T, E>>>,
): Promise<status.StatusOr<Array<T>, E>> => {
  const maybes = await Promise.all(list);
  return all(maybes);
};

export const allRecord = <K extends string, T, E>(
  record: Record<K, status.StatusOr<T, E>>,
): status.StatusOr<Record<K, T>, E> => {
  const resultRecord: Partial<Record<K, T>> = {};
  for (const [key, statusOr] of Object.entries<status.StatusOr<T, E>>(
    record,
  )) {
    if (!status.isOk(statusOr)) {
      return statusOr;
    }
    resultRecord[key as K] = statusOr.value;
  }
  return status.fromValue(resultRecord as Record<K, T>);
};

export const allRecordAsync = async <K extends string, T, E>(
  record: Record<K, Promise<status.StatusOr<T, E>>>,
): Promise<status.StatusOr<Record<K, T>, E>> => {
  const keys = Object.keys(record);

  const maybeResults = await allAsync<T, E>(Object.values(record));
  if (!status.isOk(maybeResults)) {
    return maybeResults;
  }
  const results = maybeResults.value;

  return status.fromValue(
    Object.fromEntries(
      keys.map((key, index) => [key, results[index]]),
    ) as Record<K, T>,
  );
};
