/**
 * Iterators are a powerful type that represent data which can be iterated over.
 * They are meaningfully different from things like `Array` because they are not
 * required to be in-memory. This package exposes helpers such as `map` which
 * extend common functional data patterns to `Iterator` interfaces.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator
 */

export * from '@/iterators/BufferedAsyncIterator';
export * from '@/iterators/batch';
export * from '@/iterators/literals';
export * from '@/iterators/map';
export * from '@/iterators/toArray';
export * from '@/iterators/toIterable';
export * from '@/iterators/typeGuards';
