import * as resourcePoolModule from '@/ResourcePool';

describe('ResourcePool', () => {
  describe('acquireImmediate', () => {
    it('returns null once all resources are allocated.', () => {
      const resourcePool = resourcePoolModule.createResourcePool([1, 2, 3]);
      expect(resourcePool.acquireImmediate()).toMatchObject({ resource: 1 });
      expect(resourcePool.acquireImmediate()).toMatchObject({ resource: 2 });
      expect(resourcePool.acquireImmediate()).toMatchObject({ resource: 3 });
      expect(resourcePool.acquireImmediate()).toBe(null);
    });

    it('can reallocate freed resources.', () => {
      const resourcePool = resourcePoolModule.createResourcePool([1, 2, 3]);

      const firstLock = resourcePool.acquireImmediate();
      const secondLock = resourcePool.acquireImmediate();
      const thirdLock = resourcePool.acquireImmediate();

      expect(firstLock).toMatchObject({ resource: 1 });
      expect(secondLock).toMatchObject({ resource: 2 });
      expect(thirdLock).toMatchObject({ resource: 3 });

      expect(resourcePool.acquireImmediate()).toBe(null);

      secondLock?.release();
      expect(resourcePool.acquireImmediate()).toMatchObject({ resource: 2 });

      firstLock?.release();
      expect(resourcePool.acquireImmediate()).toMatchObject({ resource: 1 });

      thirdLock?.release();
      expect(resourcePool.acquireImmediate()).toMatchObject({ resource: 3 });

      expect(resourcePool.acquireImmediate()).toBe(null);
    });

    it('lazily exhausts the domain.', () => {
      let i = 0;
      const domain: IterableIterator<number> = {
        next: jest.fn(() => {
          if (i < 3) {
            return { value: ++i, done: false };
          }

          return { value: undefined, done: true };
        }),

        [Symbol.iterator]() {
          return domain;
        },
      };

      const resourcePool = resourcePoolModule.createResourcePool(domain);
      expect(domain.next).toHaveBeenCalledTimes(0);

      expect(resourcePool.acquireImmediate()).toMatchObject({ resource: 1 });
      expect(domain.next).toHaveBeenCalledTimes(1);

      // It's important that our test checks that the resourcePool prefers released
      // resources before allocating new ones.
      const lock = resourcePool.acquireImmediate();
      expect(lock).toMatchObject({ resource: 2 });
      expect(domain.next).toHaveBeenCalledTimes(2);
      lock?.release();

      expect(resourcePool.acquireImmediate()).toMatchObject({ resource: 2 });
      expect(domain.next).toHaveBeenCalledTimes(2);

      expect(resourcePool.acquireImmediate()).toMatchObject({ resource: 3 });
      expect(domain.next).toHaveBeenCalledTimes(3);
    });
  });

  describe('acquire', () => {
    it('waits for resources once all are acquired.', () => {
      const resourcePool = resourcePoolModule.createResourcePool([1, 2, 3]);
      expect(resourcePool.acquire()).toMatchObject({ resource: 1 });
      expect(resourcePool.acquire()).toMatchObject({ resource: 2 });
      expect(resourcePool.acquire()).toMatchObject({ resource: 3 });
      expect(resourcePool.acquire()).toBeInstanceOf(Promise);
    });

    it('freed resources are provided to waiting acquisitions.', async () => {
      const resourcePool = resourcePoolModule.createResourcePool([1, 2, 3]);

      const firstLock = resourcePool.acquire();
      const secondLock = resourcePool.acquire();
      const thirdLock = resourcePool.acquire();
      const fourthLock = resourcePool.acquire();
      const fifthLock = resourcePool.acquire();

      expect(firstLock).toMatchObject({ resource: 1 });
      expect(secondLock).toMatchObject({ resource: 2 });
      expect(thirdLock).toMatchObject({ resource: 3 });
      expect(fourthLock).toBeInstanceOf(Promise);
      expect(fifthLock).toBeInstanceOf(Promise);

      (await secondLock)?.release();
      expect(await fourthLock).toMatchObject({ resource: 2 });

      (await firstLock)?.release();
      expect(await fifthLock).toMatchObject({ resource: 1 });
    });

    it('freed resources are buffered if no acquisition is waiting.', async () => {
      const resourcePool = resourcePoolModule.createResourcePool([1, 2, 3]);

      const firstLock = resourcePool.acquire();
      const secondLock = resourcePool.acquire();
      const thirdLock = resourcePool.acquire();

      expect(firstLock).toMatchObject({ resource: 1 });
      expect(secondLock).toMatchObject({ resource: 2 });
      expect(thirdLock).toMatchObject({ resource: 3 });

      (await secondLock)?.release();
      expect(resourcePool.acquire()).toMatchObject({ resource: 2 });
    });
  });
});

describe('Lock', () => {
  it('throws an error when accessing freed resources.', () => {
    const resourcePool = resourcePoolModule.createResourcePool([1, 2, 3]);

    const lock = resourcePool.acquireImmediate();
    expect(lock?.resource).toBe(1);
    expect(lock?.released).toBe(false);

    expect(lock?.release()).toBe(true);

    expect(() => lock?.resource).toThrow();
    expect(lock?.released).toBe(true);
  });

  it('cannot be released multiple times.', () => {
    const resourcePool = resourcePoolModule.createResourcePool([1, 2, 3]);

    const lock = resourcePool.acquireImmediate();
    expect(lock?.resource).toBe(1);
    expect(lock?.released).toBe(false);

    expect(lock?.release()).toBe(true);
    expect(lock?.released).toBe(true);

    expect(lock?.release()).toBe(false);
    expect(lock?.released).toBe(true);
  });
});
