import { createBufferedAsyncIterator } from '@/iterators/BufferedAsyncIterator';

describe('createBufferedAsyncIterator', () => {
  it('Data buffered before next can still be drained.', async () => {
    const iterator = createBufferedAsyncIterator<number, null>();

    iterator.push({ done: false, value: 100 });
    iterator.push({ done: false, value: 200 });
    iterator.push({ done: false, value: 300 });

    expect(await iterator.next()).toStrictEqual({ done: false, value: 100 });
    expect(await iterator.next()).toStrictEqual({ done: false, value: 200 });
    expect(await iterator.next()).toStrictEqual({ done: false, value: 300 });
  });

  it('Data buffered after next can still be drained.', async () => {
    const iterator = createBufferedAsyncIterator<number, null>();

    const next = iterator.next();
    iterator.push({ done: false, value: 100 });
    iterator.push({ done: false, value: 200 });
    iterator.push({ done: false, value: 300 });

    expect(await next).toStrictEqual({ done: false, value: 100 });
    expect(await iterator.next()).toStrictEqual({ done: false, value: 200 });
    expect(await iterator.next()).toStrictEqual({ done: false, value: 300 });
  });

  it('Iterator can toggle between buffered and waiting states.', async () => {
    const iterator = createBufferedAsyncIterator<number, null>();

    let next = iterator.next();
    iterator.push({ done: false, value: 100 });
    iterator.push({ done: false, value: 200 });

    expect(await next).toStrictEqual({ done: false, value: 100 });
    expect(await iterator.next()).toStrictEqual({ done: false, value: 200 });

    next = iterator.next();
    iterator.push({ done: false, value: 300 });
    iterator.push({ done: false, value: 400 });

    expect(await next).toStrictEqual({ done: false, value: 300 });
    expect(await iterator.next()).toStrictEqual({ done: false, value: 400 });
  });

  it('Concurrent waits for future data return the same result.', async () => {
    const iterator = createBufferedAsyncIterator<number, null>();

    const firstNext = iterator.next();
    const secondNext = iterator.next();
    iterator.push({ done: false, value: 100 });
    iterator.push({ done: false, value: 200 });

    expect(await firstNext).toStrictEqual({ done: false, value: 100 });
    expect(await secondNext).toStrictEqual({ done: false, value: 100 });
    expect(await iterator.next()).toStrictEqual({ done: false, value: 200 });
  });
});
