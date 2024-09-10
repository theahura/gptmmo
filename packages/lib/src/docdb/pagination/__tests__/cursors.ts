import * as status from '@gptmmo/status';
import * as schema from '@gptmmo/validation';

import * as cursors from '@/docdb/pagination/cursors';

import type * as paginationSpec from '@/docdb/pagination/PaginationSpec';

type Document = {
  _id: string;
  value?: number;
};

const specWithoutDiscrimination: paginationSpec.PaginationSpec<
  Document,
  '_id'
> = {
  sort: {
    property: '_id',
    direction: 'desc',
    validator: schema.getStringValidator(),
  },
  limit: 10,
};

const specWithDiscrimination: paginationSpec.PaginationSpec<
  Document,
  'value',
  '_id'
> = {
  sort: {
    property: 'value',
    direction: 'desc',
    validator: schema.getNumberValidator(),
  },
  discriminator: {
    property: '_id',
    validator: schema.getStringValidator(),
  },
  limit: 10,
};

describe('getCursor', () => {
  test('Can create cursors without a discriminator.', async () => {
    expect(
      cursors.getCursor(specWithoutDiscrimination, {
        _id: 'foo',
        value: 100,
      }),
    ).toStrictEqual({
      sortValue: 'foo',
    });

    expect(
      cursors.getCursor(specWithoutDiscrimination, {
        _id: 'bar',
        value: 200,
      }),
    ).toStrictEqual({
      sortValue: 'bar',
    });
  });

  test('Can create cursors with a discriminator.', async () => {
    expect(
      cursors.getCursor(specWithDiscrimination, {
        _id: 'foo',
        value: 100,
      }),
    ).toStrictEqual({
      sortValue: 100,
      discriminatorValue: 'foo',
    });

    expect(
      cursors.getCursor(specWithDiscrimination, {
        _id: 'bar',
        value: 200,
      }),
    ).toStrictEqual({
      sortValue: 200,
      discriminatorValue: 'bar',
    });
  });
});

describe('serialization/deserialization', () => {
  test('Serialized cursor can be deserialized without a discriminator.', async () => {
    const serializedCursor = status.throwIfError(
      cursors.serializeCursor<Document, '_id', '_id'>({
        sortValue: 'foo',
      }),
    );

    const deserializedCursor = status.throwIfError(
      cursors.deserializeCursor(specWithoutDiscrimination, serializedCursor),
    );

    expect(deserializedCursor).toStrictEqual({
      sortValue: 'foo',
    });
  });

  test('Serialized cursor can be deserialized with a discriminator.', async () => {
    const serializedCursor = status.throwIfError(
      cursors.serializeCursor<Document, 'value', '_id'>({
        sortValue: 100,
        discriminatorValue: 'foo',
      }),
    );

    const deserializedCursor = status.throwIfError(
      cursors.deserializeCursor(specWithDiscrimination, serializedCursor),
    );

    expect(deserializedCursor).toStrictEqual({
      sortValue: 100,
      discriminatorValue: 'foo',
    });
  });

  test('Deserialization denies an invalid sort value.', async () => {
    const serializedCursor = status.throwIfError(
      cursors.serializeCursor<Document, '_id', '_id'>({
        sortValue: true as unknown as string,
      }),
    );

    expect(
      cursors.deserializeCursor(specWithoutDiscrimination, serializedCursor),
    ).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Deserialization denies an invalid discriminator value.', async () => {
    const serializedCursor = status.throwIfError(
      cursors.serializeCursor<Document, 'value', '_id'>({
        sortValue: 100,
        discriminatorValue: [] as unknown as string,
      }),
    );

    expect(
      cursors.deserializeCursor(specWithDiscrimination, serializedCursor),
    ).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Deserialization denies a cursor missing an expected discriminator.', async () => {
    const serializedCursor = status.throwIfError(
      cursors.serializeCursor<Document, 'value', '_id'>({
        sortValue: 100,
      }),
    );

    expect(
      cursors.deserializeCursor(specWithDiscrimination, serializedCursor),
    ).toMatchObject({
      error: expect.any(String),
    });
  });
});
