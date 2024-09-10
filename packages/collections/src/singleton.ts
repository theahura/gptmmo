/**
 * A singleton is a software design pattern that restricts the instantiation of
 * a class to a singular instance. This file contains helpers for managing
 * singletons in JS.
 *
 * A note on one _very_ common use for lazily-evaluated singletons: We used to
 * initialize a LOT of caches like this in global scope in api-v2 and proxy.
 * This made data lifecycles hard to trace because caches would initialize not
 * when the server started, but then node imported the file. To make matters
 * worse, if a cache had a failure state during initialization we had no way to
 * exit the server safely. Just had to process.exit(1). However by using lazily
 * evaluated singletons we now have a way to carefully control when singletons
 * are initialized and handle errors from that initialization. We can ensure
 * that data is only initialized the first time it is used and that callsites
 * handle errors from that initialization.
 *
 * To learn more: https://en.wikipedia.org/wiki/Singleton_pattern
 */

import * as flavor from '@/Flavor';

const EMPTY_SINGLETON_SENTINEL: unique symbol = Symbol();

export type Factory<T> = () => T;
export type AsyncFactory<T> = Factory<Promise<T>>;

export type Getter<T> = flavor.Brand<() => T, 'collection.singleton.Getter'>;
export type AsyncGetter<T> = Getter<Promise<T>>;

/**
 * Given a factory for a singleton, creates a getter for that singleton.
 *
 * Example Usage:
 *
 * ```ts
 * const getFoo = libSingleton.fromFactory(() => createFoo());
 * ```
 *
 * Note that the singleton will be lazily constructed on the first call to the
 * getter.
 *
 * @param factory The factory which constructs the singleton.
 * @param options Additional optional parameters. See properties for details.
 * @param options.lazy When true, the singleton wont be constructed until the
 *   getter is called for the first time. When false the singleton will be
 *   constructed when `fromFactory` is called. By default is `true`.
 *
 * @returns A getter to retrieve the singleton.
 */
export const fromFactory = <T>(
  factory: Factory<T>,
  options?: { lazy?: boolean },
): Getter<T> => {
  const { lazy = true } = options ?? {};

  // We use a unique value (`EMPTY_SINGLETON_SENTINEL`) to indicate that the
  // singleton has not been constructed so that the singleton could be `null` or
  // `undefined`.
  let singleton: T | typeof EMPTY_SINGLETON_SENTINEL = lazy
    ? EMPTY_SINGLETON_SENTINEL
    : factory();

  return flavor.stampBrand(() => {
    if (singleton === EMPTY_SINGLETON_SENTINEL) {
      singleton = factory();
    }
    return singleton;
  });
};
