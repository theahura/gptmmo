import * as batch from '@/iterators/batch';
import * as toArray from '@/iterators/toArray';

describe('batch (with sychronous iterator)', () => {
  it('Empty iterable returns empty iterable.', () => {
    expect(
      toArray.toArray(
        batch.batch({
          iterable: [],
          maxBatchSize: 10,
        }),
      ),
    ).toStrictEqual([]);
  });

  it('Correctly batches when the batch size divides evenly into the total.', () => {
    expect(
      toArray.toArray(
        batch.batch({
          iterable: [1, 2, 3, 4, 5, 6],
          maxBatchSize: 2,
        }),
      ),
    ).toStrictEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  it('Correctly batches when the batch size does not divide evenly into the total.', () => {
    expect(
      toArray.toArray(
        batch.batch({
          iterable: [1, 2, 3, 4, 5, 6],
          maxBatchSize: 4,
        }),
      ),
    ).toStrictEqual([
      [1, 2, 3, 4],
      [5, 6],
    ]);
  });
});

describe('batch (with asychronous iterator)', () => {
  it('Empty iterable returns empty iterable.', async () => {
    expect(
      await toArray.toArray(
        batch.batch({
          iterable: (async function* () {
            /* intentionally empty */
          })(),
          maxBatchSize: 10,
        }),
      ),
    ).toStrictEqual([]);
  });

  it('Correctly batches when the batch size divides evenly into the total.', async () => {
    expect(
      await toArray.toArray(
        batch.batch({
          iterable: (async function* () {
            for (const value of [1, 2, 3, 4, 5, 6]) {
              yield value;
            }
          })(),
          maxBatchSize: 2,
        }),
      ),
    ).toStrictEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  it('Correctly batches when the batch size does not divide evenly into the total.', async () => {
    expect(
      await toArray.toArray(
        batch.batch({
          iterable: (async function* () {
            for (const value of [1, 2, 3, 4, 5, 6]) {
              yield value;
            }
          })(),
          maxBatchSize: 4,
        }),
      ),
    ).toStrictEqual([
      [1, 2, 3, 4],
      [5, 6],
    ]);
  });
});
