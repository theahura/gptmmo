import * as status from '@/index';

describe('all', () => {
  it('correctly handles a list of successful statuses', () => {
    const list = [
      status.fromValue(1),
      status.fromValue(2),
      status.fromValue(3),
    ];
    const result = status.throwIfError(status.all(list));
    expect(result).toEqual([1, 2, 3]);
  });

  it('correctly handles a list of statuses with one error', () => {
    const list = [
      status.fromValue(1),
      status.fromError('error'),
      status.fromValue(3),
    ];
    const result = status.all(list);
    expect(result).toMatchObject({ error: 'error' });
  });
});

describe('allAsync', () => {
  it('correctly handles a list of successful statuses', async () => {
    const list = [
      Promise.resolve(status.fromValue(1)),
      Promise.resolve(status.fromValue(2)),
      Promise.resolve(status.fromValue(3)),
    ];
    const result = status.throwIfError(await status.allAsync(list));
    expect(result).toEqual([1, 2, 3]);
  });

  it('correctly handles a list of statuses with one error', async () => {
    const list = [
      Promise.resolve(status.fromValue(1)),
      Promise.resolve(status.fromError('error')),
      Promise.resolve(status.fromValue(3)),
    ];
    const result = await status.allAsync(list);
    expect(result).toMatchObject({ error: 'error' });
  });
});

describe('allRecord', () => {
  it('correctly handles a record of successful statuses', () => {
    const record = {
      a: status.fromValue(1),
      b: status.fromValue(2),
      c: status.fromValue(3),
    };
    const result = status.throwIfError(status.allRecord(record));
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('correctly handles a record of statuses with one error', () => {
    const record = {
      a: status.fromValue(1),
      b: status.fromError('error'),
      c: status.fromValue(3),
    };
    const result = status.allRecord(record);
    expect(result).toMatchObject({ error: 'error' });
  });
});

describe('allRecordAsync', () => {
  it('correctly handles a record of successful statuses', async () => {
    const record = {
      a: Promise.resolve(status.fromValue(1)),
      b: Promise.resolve(status.fromValue(2)),
      c: Promise.resolve(status.fromValue(3)),
    };
    const result = status.throwIfError(await status.allRecordAsync(record));
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('correctly handles a record of statuses with one error', async () => {
    const record = {
      a: Promise.resolve(status.fromValue(1)),
      b: Promise.resolve(status.fromError('error')),
      c: Promise.resolve(status.fromValue(3)),
    };
    const result = await status.allRecordAsync(record);
    expect(result).toMatchObject({ error: 'error' });
  });
});
