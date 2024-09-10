import * as status from '@gptmmo/status';

import * as priorityQueue2 from '@/priorityQueue/PriorityQueue';

describe('insert', () => {
  it('can insert several nodes and remove in priority order', () => {
    const { consumer, publisher } =
      priorityQueue2.createPriorityQueue<string>();

    publisher.insert('hello', 0);
    publisher.insert('omg', 2);
    publisher.insert('wow', 1);

    expect(Array.from(consumer.drain())).toStrictEqual([
      'omg',
      'wow',
      'hello',
    ]);
  });

  it('can insert several nodes and pop in priority order', () => {
    const { consumer, publisher } =
      priorityQueue2.createPriorityQueue<string>();

    publisher.insert('hello', 0);
    publisher.insert('omg', 2);
    publisher.insert('wow', 1);

    expect(consumer.pop()).toStrictEqual('omg');
    expect(consumer.pop()).toStrictEqual('wow');
    expect(consumer.pop()).toStrictEqual('hello');
    expect(consumer.pop()).toStrictEqual(null);
  });

  it('can increase node priority', () => {
    const { consumer, publisher } =
      priorityQueue2.createPriorityQueue<string>();

    publisher.insert('hello', 0);
    publisher.insert('omg', 2);
    const { updatePriority } = status.throwIfError(publisher.insert('wow', 1));

    expect(updatePriority(5)).toBe(true);

    expect(Array.from(consumer.drain())).toStrictEqual([
      'wow',
      'omg',
      'hello',
    ]);
  });

  it('can decrease node priority', () => {
    const { consumer, publisher } =
      priorityQueue2.createPriorityQueue<string>();

    publisher.insert('hello', 0);
    publisher.insert('omg', 2);
    const { updatePriority } = status.throwIfError(publisher.insert('wow', 1));

    expect(updatePriority(-1)).toBe(true);

    expect(Array.from(consumer.drain())).toStrictEqual([
      'omg',
      'hello',
      'wow',
    ]);
  });

  it('cannot modify priority on a node that has already been popped from the queue', () => {
    const { consumer, publisher } =
      priorityQueue2.createPriorityQueue<string>();

    publisher.insert('hello', 0);
    publisher.insert('omg', 2);
    const { updatePriority } = status.throwIfError(publisher.insert('wow', 1));

    expect(Array.from(consumer.drain())).toStrictEqual([
      'omg',
      'wow',
      'hello',
    ]);

    expect(updatePriority(5)).toBe(false);
  });

  it('Can apply several priority updates to a single node.', () => {
    const { consumer, publisher } =
      priorityQueue2.createPriorityQueue<string>();

    publisher.insert('foo', 0);
    const bar = status.throwIfError(publisher.insert('bar', 1));
    publisher.insert('baz', 2);

    expect(bar.updatePriority(-10)).toBe(true);
    expect(bar.updatePriority(20)).toBe(true);
    expect(bar.updatePriority(1.5)).toBe(true);

    expect(Array.from(consumer.drain())).toStrictEqual(['baz', 'bar', 'foo']);
  });

  it('can remove nodes', () => {
    const { consumer, publisher } =
      priorityQueue2.createPriorityQueue<string>();

    publisher.insert('hello', 0);
    publisher.insert('omg', 2);
    const { remove } = status.throwIfError(publisher.insert('wow', 1));

    expect(remove()).toBe(true);

    expect(Array.from(consumer.drain())).toStrictEqual(['omg', 'hello']);
  });

  it('cannot remove nodes that have already been popped from the queue', () => {
    const { consumer, publisher } =
      priorityQueue2.createPriorityQueue<string>();

    publisher.insert('hello', 0);
    publisher.insert('omg', 2);
    const { remove } = status.throwIfError(publisher.insert('wow', 1));

    expect(Array.from(consumer.drain())).toStrictEqual([
      'omg',
      'wow',
      'hello',
    ]);

    expect(remove()).toBe(false);
  });

  it('returns an empty iterator when calling .drain() on an empty priority queue', () => {
    const { consumer } = priorityQueue2.createPriorityQueue<string>();

    expect(Array.from(consumer.drain())).toStrictEqual([]);
  });

  it('errors when the queue is closed', () => {
    const { publisher } = priorityQueue2.createPriorityQueue<string>();

    publisher.close();

    expect(status.isOk(publisher.insert('wow', 1))).toBe(false);
  });
});

describe('waitForData', () => {
  test('Resolves immediately when data is already buffered.', async () => {
    const { consumer, publisher } =
      priorityQueue2.createPriorityQueue<string>();

    publisher.insert('wow', 100);
    expect(await consumer.waitForData()).toBe(true);
    expect(Array.from(consumer.drain())).toStrictEqual(['wow']);
  });

  test('Resolves immediately when the publisher is already closed.', async () => {
    const { consumer, publisher } =
      priorityQueue2.createPriorityQueue<string>();

    publisher.close();
    expect(await consumer.waitForData()).toBe(false);
  });

  test('Resolves when data is available.', async () => {
    const { consumer, publisher } =
      priorityQueue2.createPriorityQueue<string>();

    const dataIsReady = consumer.waitForData();
    publisher.insert('wow', 100);
    expect(await dataIsReady).toBe(true);
    expect(Array.from(consumer.drain())).toStrictEqual(['wow']);
  });

  test('Resolves if the publisher is closed while waiting.', async () => {
    const { consumer, publisher } =
      priorityQueue2.createPriorityQueue<string>();

    const dataIsReady = consumer.waitForData();
    publisher.close();
    expect(await dataIsReady).toBe(false);
  });

  test('Duplicate calls return the same promise.', async () => {
    const { consumer, publisher } =
      priorityQueue2.createPriorityQueue<string>();

    const dataIsReadyOne = consumer.waitForData();
    const dataIsReadyTwo = consumer.waitForData();
    expect(dataIsReadyOne).toBe(dataIsReadyTwo);

    publisher.insert('wow', 100);
    await dataIsReadyOne;
    expect(Array.from(consumer.drain())).toStrictEqual(['wow']);
  });
});

describe('toAsyncIterator', () => {
  test('Drains until closed.', async () => {
    const { consumer, publisher } =
      priorityQueue2.createPriorityQueue<number>();

    const log: Array<any> = [];

    const push = (value: number) => {
      log.push({ push: value });
      publisher.insert(value, value);
    };

    const drainedEverything = new Promise<void>(async (resolve) => {
      for await (const value of consumer.toAsyncIterator()) {
        log.push({ receive: value });
      }
      resolve();
    });

    push(100);
    push(200);
    for (let i = 0; i < 100; ++i) await Promise.resolve();
    push(300);
    for (let i = 0; i < 100; ++i) await Promise.resolve();
    push(400);
    push(500);
    publisher.close();

    await drainedEverything;

    // We use a log here to test that not only is the message queue being
    // drained, but it's doing to incrementally as data becomes available.
    expect(log).toStrictEqual([
      { push: 100 },
      { push: 200 },
      { receive: 200 },
      { receive: 100 },
      { push: 300 },
      { receive: 300 },
      { push: 400 },
      { push: 500 },
      { receive: 500 },
      { receive: 400 },
    ]);
  });
});

describe('depth', () => {
  test('Defaults to zero.', async () => {
    const { consumer } = priorityQueue2.createPriorityQueue<number>();

    expect(consumer.depth).toBe(0);
  });

  test('Immediately increases once messages are received.', async () => {
    const { publisher, consumer } =
      priorityQueue2.createPriorityQueue<number>();

    publisher.insert(100, 2);
    expect(consumer.depth).toBe(1);

    publisher.insert(200, 1);
    expect(consumer.depth).toBe(2);
  });

  test('Immediately decreases once messages are drained.', async () => {
    const { publisher, consumer } =
      priorityQueue2.createPriorityQueue<number>();

    publisher.insert(100, 2);
    publisher.insert(200, 1);
    expect(consumer.depth).toBe(2);

    consumer.drain().next();
    expect(consumer.depth).toBe(1);

    consumer.drain().next();
    expect(consumer.depth).toBe(0);
  });
});
