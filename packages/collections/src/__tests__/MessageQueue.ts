import * as messageQueue from '@/MessageQueue';

describe('readBuffer', () => {
  test('Can sychronously read the buffer when data exists.', () => {
    const { publisher, consumer } = messageQueue.createMessageQueue<number>();

    publisher.push(100);
    publisher.push(200);
    expect(Array.from(consumer.readBuffer())).toStrictEqual([100, 200]);
    publisher.push(300);
    expect(Array.from(consumer.readBuffer())).toStrictEqual([300]);
  });

  test('Can sychronously read the buffer when empty.', () => {
    const { consumer } = messageQueue.createMessageQueue<number>();

    expect(Array.from(consumer.readBuffer())).toStrictEqual([]);
  });

  test('Can sychronously read the buffer when closed.', () => {
    const { publisher, consumer } = messageQueue.createMessageQueue<number>();

    publisher.push(100);
    publisher.push(200);
    publisher.close();
    expect(Array.from(consumer.readBuffer())).toStrictEqual([100, 200]);
  });
});

describe('waitForData', () => {
  test('Resolves immediately when data is already buffered.', async () => {
    const { publisher, consumer } = messageQueue.createMessageQueue<number>();

    publisher.push(100);
    expect(await consumer.waitForData()).toBe(true);
    expect(Array.from(consumer.readBuffer())).toStrictEqual([100]);
  });

  test('Resolves immediately when the publisher is already closed.', async () => {
    const { publisher, consumer } = messageQueue.createMessageQueue<number>();

    publisher.close();
    expect(await consumer.waitForData()).toBe(false);
  });

  test('Resolves when data is available.', async () => {
    const { publisher, consumer } = messageQueue.createMessageQueue<number>();

    const dataIsReady = consumer.waitForData();
    publisher.push(100);
    expect(await dataIsReady).toBe(true);
    expect(Array.from(consumer.readBuffer())).toStrictEqual([100]);
  });

  test('Resolves if the publisher is closed while waiting.', async () => {
    const { publisher, consumer } = messageQueue.createMessageQueue<number>();

    const dataIsReady = consumer.waitForData();
    publisher.close();
    expect(await dataIsReady).toBe(false);
  });

  test('Duplicate calls return the same promise.', async () => {
    const { publisher, consumer } = messageQueue.createMessageQueue<number>();

    const dataIsReadyOne = consumer.waitForData();
    const dataIsReadyTwo = consumer.waitForData();
    expect(dataIsReadyOne).toBe(dataIsReadyTwo);

    publisher.push(100);
    await dataIsReadyOne;
    expect(Array.from(consumer.readBuffer())).toStrictEqual([100]);
  });
});

describe('toAsyncIterator', () => {
  test('Drains until closed.', async () => {
    const { publisher, consumer } = messageQueue.createMessageQueue<number>();

    const log: Array<any> = [];

    const push = (value: number) => {
      log.push({ push: value });
      publisher.push(value);
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
      { receive: 100 },
      { receive: 200 },
      { push: 300 },
      { receive: 300 },
      { push: 400 },
      { push: 500 },
      { receive: 400 },
      { receive: 500 },
    ]);
  });
});

describe('depth', () => {
  test('Defaults to zero.', async () => {
    const { consumer } = messageQueue.createMessageQueue<number>();

    expect(consumer.depth).toBe(0);
  });

  test('Immediately increases once messages are received.', async () => {
    const { publisher, consumer } = messageQueue.createMessageQueue<number>();

    publisher.push(100);
    expect(consumer.depth).toBe(1);

    publisher.push(200);
    expect(consumer.depth).toBe(2);
  });

  test('Immediately decreases once messages are drained.', async () => {
    const { publisher, consumer } = messageQueue.createMessageQueue<number>();

    publisher.push(100);
    publisher.push(200);
    expect(consumer.depth).toBe(2);

    consumer.readBuffer().next();
    expect(consumer.depth).toBe(1);

    consumer.readBuffer().next();
    expect(consumer.depth).toBe(0);
  });
});
