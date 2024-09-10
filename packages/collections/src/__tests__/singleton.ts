import * as singleton from '@/singleton';

describe('fromFactory with lazy construction', () => {
  test('Does not call the factory until the getter is called.', () => {
    const factory = jest.fn(() => 100);
    const getter = singleton.fromFactory(factory);
    expect(factory.mock.calls).toHaveLength(0);
    expect(getter()).toEqual(100);
    expect(factory.mock.calls).toHaveLength(1);
  });

  test('Calls the factory once.', () => {
    const factory = jest.fn(() => 100);
    const getter = singleton.fromFactory(factory);
    expect(getter()).toEqual(100);
    expect(factory.mock.calls).toHaveLength(1);
    expect(getter()).toEqual(100);
    expect(factory.mock.calls).toHaveLength(1);
  });

  test('Calls the factory once when undefined.', () => {
    const factory = jest.fn(() => undefined);
    const getter = singleton.fromFactory(factory);
    expect(getter()).toBe(undefined);
    expect(factory.mock.calls).toHaveLength(1);
    expect(getter()).toBe(undefined);
    expect(factory.mock.calls).toHaveLength(1);
  });

  test('Calls the factory once when null.', () => {
    const factory = jest.fn(() => null);
    const getter = singleton.fromFactory(factory);
    expect(getter()).toBe(null);
    expect(factory.mock.calls).toHaveLength(1);
    expect(getter()).toBe(null);
    expect(factory.mock.calls).toHaveLength(1);
  });
});

describe('fromFactory with immediate construction', () => {
  test('Calls the factory before the getter is called.', () => {
    const factory = jest.fn(() => 100);
    singleton.fromFactory(factory, { lazy: false });
    expect(factory.mock.calls).toHaveLength(1);
  });

  test('Calls the factory once.', () => {
    const factory = jest.fn(() => 100);
    const getter = singleton.fromFactory(factory, { lazy: false });
    expect(factory.mock.calls).toHaveLength(1);
    expect(getter()).toEqual(100);
    expect(factory.mock.calls).toHaveLength(1);
  });

  test('Calls the factory once when undefined.', () => {
    const factory = jest.fn(() => undefined);
    const getter = singleton.fromFactory(factory, { lazy: false });
    expect(factory.mock.calls).toHaveLength(1);
    expect(getter()).toBe(undefined);
    expect(factory.mock.calls).toHaveLength(1);
  });

  test('Calls the factory once when null.', () => {
    const factory = jest.fn(() => null);
    const getter = singleton.fromFactory(factory, { lazy: false });
    expect(factory.mock.calls).toHaveLength(1);
    expect(getter()).toBe(null);
    expect(factory.mock.calls).toHaveLength(1);
  });
});
