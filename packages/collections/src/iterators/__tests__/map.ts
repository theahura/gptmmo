import * as map from '@/iterators/map';

describe('map', () => {
  it('Returns the original objects for a no-op transformer.', async () => {
    const foo = { foo: 100 };
    const bar = { bar: 200 };
    const baz = { baz: 300 };

    const iterator = (async function* () {
      yield foo;
      yield bar;
      yield baz;
    })();

    const mappedIterator = map.map(iterator, (value) => value);

    expect(await mappedIterator.next()).toEqual({ done: false, value: foo });
    expect(await mappedIterator.next()).toEqual({ done: false, value: bar });
    expect(await mappedIterator.next()).toEqual({ done: false, value: baz });
    expect(await mappedIterator.next()).toEqual({
      done: true,
      value: undefined,
    });
  });

  it('Returns transformed objects.', async () => {
    const iterator = (async function* () {
      yield { value: 100 };
      yield { value: 200 };
      yield { value: 300 };
    })();

    const mappedIterator = map.map(iterator, ({ value }) => ({
      newValue: value + 50,
    }));

    expect(await mappedIterator.next()).toStrictEqual({
      done: false,
      value: { newValue: 150 },
    });
    expect(await mappedIterator.next()).toStrictEqual({
      done: false,
      value: { newValue: 250 },
    });
    expect(await mappedIterator.next()).toStrictEqual({
      done: false,
      value: { newValue: 350 },
    });
    expect(await mappedIterator.next()).toStrictEqual({
      done: true,
      value: undefined,
    });
  });

  it('Does not transform an early return.', async () => {
    const iterator = (async function* () {
      yield { value: 100 };
      yield { value: 200 };
      return 'A very different return type.';
      yield { value: 300 };
    })();

    const mappedIterator = map.map(iterator, ({ value }) => ({
      newValue: value + 50,
    }));

    expect(await mappedIterator.next()).toStrictEqual({
      done: false,
      value: { newValue: 150 },
    });
    expect(await mappedIterator.next()).toStrictEqual({
      done: false,
      value: { newValue: 250 },
    });
    expect(await mappedIterator.next()).toStrictEqual({
      done: true,
      value: 'A very different return type.',
    });
  });
});
