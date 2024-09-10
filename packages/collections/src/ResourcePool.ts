import * as promises from '@/promises';

import type * as tsEssentials from 'ts-essentials';

export type Lock<T> = {
  resource: T;
  released: boolean;

  /**
   * Releases the resource. After calling this, any access to `resource` is
   * unsafe.
   *
   * @returns True if the lock was released, false otherwise.
   */
  release: () => boolean;
};

/**
 * The "ResourcePool" is used to provide exclusive access to a pool of
 * resources. This primitive is the backbone of many common structures such as
 * thread pools or ID allocation systems.
 */
export type ResourcePool<T> = {
  /**
   * Acquires an available resource from the pool immediately.
   *
   * @returns A lock on a resource or null of no resources are immediately
   *   available.
   */
  acquireImmediate: () => Lock<T> | null;

  /**
   * Acquires an available resource from the pool once ready.
   *
   * @returns A lock on a resource.
   */
  acquire: () => tsEssentials.AsyncOrSync<Lock<T>>;

  /**
   * (read-only) The current number of locks acquired and therefore not
   * available in the pool.
   */
  activeLocks: number;
};

/**
 * Creates a new pool from the given resources.
 *
 * @param domain - The resources this pool will manage. Note that the Iterable
 *   will be drained only as needed to allocate resources.
 *
 * @returns A new resource pool.
 */
export const createResourcePool = <T>(
  domain: Iterable<T>,
): ResourcePool<T> => {
  // The domain is drained lazily. Already drained resources which are currently
  // available are stored here.
  const available: Array<T> = [];

  // Any clients which desire a lock, but no resources are available, are
  // enqueued here.
  const pendingAcquisitions: Array<(lock: Lock<T>) => void> = [];

  const domainIterator = domain[Symbol.iterator]();
  let isDomainExhausted = false;

  let activeLocks = 0;

  const createLock = (resource: T): Lock<T> => {
    let released = false;
    ++activeLocks;

    return {
      get resource() {
        if (released) {
          // We almost always prefer to return status monads instead of raising
          // exceptions. This is grounded in our desire for transparency in
          // function signatures and exceptions governing control flow. It's
          // often the case that an error impacts how a program functions, and
          // without status monads we don't have typesafety which makes control
          // flow based on Exceptions risky.
          //
          // However, in this case, accessing a resource after releasing it
          // should never impact control flow and only results from developer
          // misuse. Using a status here unnecessarily encumbers client code
          // with managing a situation that should never happen. For that reason
          // we use a native JS error here instead.
          throw new Error('Refusing to access released resource.');
        }

        return resource;
      },

      release() {
        if (released) {
          return false;
        }

        released = true;
        --activeLocks;

        const nextContext = pendingAcquisitions.shift();
        if (nextContext != null) {
          nextContext(createLock(resource));
        } else {
          available.push(resource);
        }

        return true;
      },

      get released() {
        return released;
      },
    };
  };

  const drainNextFromDomain = (): Lock<T> | null => {
    if (isDomainExhausted) {
      return null;
    }

    const { value: resource, done } = domainIterator.next();
    if (done) {
      isDomainExhausted = true;
      return null;
    }

    return createLock(resource);
  };

  const acquireImmediate: ResourcePool<T>['acquireImmediate'] = () => {
    if (available.length === 0) {
      return drainNextFromDomain();
    }

    // TypeScript does not narrow arrays when evaluating against length, so
    // it thinks the return type of `pop` could be undefined here when we know
    // it can't be.
    //
    // See https://github.com/microsoft/TypeScript/issues/30406
    return createLock(available.pop() as T);
  };

  const acquire: ResourcePool<T>['acquire'] = () => {
    const lock = acquireImmediate();
    if (lock != null) {
      return lock;
    }

    const deferred = promises.createDeferred<Lock<T>>();
    pendingAcquisitions.push(deferred.resolve);
    return deferred.promise;
  };

  return {
    acquireImmediate,
    acquire,

    get activeLocks() {
      return activeLocks;
    },
  };
};
