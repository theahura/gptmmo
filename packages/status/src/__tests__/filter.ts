import * as status from '@/index';
import * as filter from '@/index';

let warnSpy: jest.SpyInstance<void, jest.ArgsType<typeof console.warn>>;

beforeAll(() => {
  warnSpy = jest.spyOn(console, 'warn');
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('filterOk', () => {
  test('accepts empty array.', () => {
    expect(filter.filterOk([])).toStrictEqual([]);
  });

  test('removes non-OK statuses.', () => {
    expect(
      filter.filterOk([
        status.fromValue(100),
        status.fromError('Expected error foo.'),
        status.fromValue(200),
        status.fromError('Expected error bar.'),
      ]),
    ).toStrictEqual([100, 200]);
  });

  test('logs filtered errors by default.', () => {
    expect(
      filter.filterOk([
        status.fromError('Expected error foo.'),
        status.fromError('Expected error bar.'),
      ]),
    ).toStrictEqual([]);

    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Expected error foo.'),
    );
    expect(warnSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Expected error bar.'),
    );
  });

  test('does not log filtered errors when logging is disabled.', () => {
    expect(
      filter.filterOk(
        [
          status.fromError('Expected error foo.'),
          status.fromError('Expected error bar.'),
        ],
        { log: false },
      ),
    ).toStrictEqual([]);

    expect(warnSpy).toHaveBeenCalledTimes(0);
  });
});

describe('split', () => {
  test('accepts empty array.', () => {
    expect(filter.split([])).toStrictEqual([[], []]);
  });

  test('splits OK values and statuses.', () => {
    const errors = [
      status.fromError('Expected error foo.'),
      status.fromError('Expected error bar.'),
    ];

    expect(
      filter.split([status.fromValue(100), status.fromValue(200), ...errors]),
    ).toStrictEqual([[100, 200], errors]);
  });
});
