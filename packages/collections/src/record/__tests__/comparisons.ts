import * as comparisons from '@/record/comparisons';

describe('compareEntries', () => {
  it('Returns empty data for empty records.', () => {
    expect(comparisons.compareEntries({}, {})).toStrictEqual({
      added: {},
      deleted: {},
      modified: {},
    });
  });

  it('Identifies added entries.', () => {
    expect(
      comparisons.compareEntries(
        {},
        {
          foo: 100,
        },
      ),
    ).toStrictEqual({
      added: {
        foo: 100,
      },
      deleted: {},
      modified: {},
    });
  });

  it('Identifies deleted entries.', () => {
    expect(
      comparisons.compareEntries(
        {
          foo: 100,
        },
        {},
      ),
    ).toStrictEqual({
      added: {},
      deleted: {
        foo: 100,
      },
      modified: {},
    });
  });

  it('Identifies shallow modification entries.', () => {
    expect(
      comparisons.compareEntries(
        {
          foo: 100,
        },
        {
          foo: 150,
        },
      ),
    ).toStrictEqual({
      added: {},
      deleted: {},
      modified: {
        foo: { from: 100, to: 150 },
      },
    });
  });

  it('Identifies added/deleted/modified entries at once.', () => {
    expect(
      comparisons.compareEntries(
        {
          foo: 100,
          bar: 200,
          baz: 300,
        },
        {
          foo: 100,
          bar: 250,
          qux: 400,
        },
      ),
    ).toStrictEqual({
      added: {
        qux: 400,
      },
      deleted: {
        baz: 300,
      },
      modified: {
        bar: { from: 200, to: 250 },
      },
    });
  });

  it('Disambiguates different keys with the same values.', () => {
    expect(
      comparisons.compareEntries(
        {
          foo: 100,
          bar: 100,
        },
        {
          foo: 100,
          baz: 100,
        },
      ),
    ).toStrictEqual({
      added: {
        baz: 100,
      },
      deleted: {
        bar: 100,
      },
      modified: {},
    });
  });
});
