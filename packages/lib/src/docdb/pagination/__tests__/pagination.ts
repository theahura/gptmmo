import '@shelf/jest-mongodb/lib/types';

import * as status from '@gptmmo/status';
import * as schema from '@gptmmo/validation';
import * as mongodb from 'mongodb';

import { paginate } from '@/docdb/pagination';
import { createPermissionedCollection } from '@/docdb/PermissionedCollection';
import {
  TypedCollection,
  createTypedCollectionValidators,
} from '@/docdb/TypedCollection';

import type { PaginationSpec } from '@/docdb/pagination';
import type { PermissionedCollection } from '@/docdb/PermissionedCollection';

// Setup an in-memory MongoDB server + client.
//
// See https://github.com/shelfio/jest-mongodb

let mongoClient: mongodb.MongoClient;
let db: mongodb.Db;

type Document = {
  _id: string;
  value?: number;
};

const SCHEMA: schema.Schema<Document> = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
    },
    value: {
      type: 'number',
      nullable: true,
    },
  },
  required: ['_id'],
  additionalProperties: false,
};

let untypedCollection: mongodb.Collection<Document>;
let typedCollection: TypedCollection<Document>;
let permissionedCollection: PermissionedCollection<Document>;

beforeAll(async () => {
  mongoClient = await new mongodb.MongoClient(global.__MONGO_URI__).connect();
  db = await mongoClient.db(global.__MONGO_DB_NAME__);
  untypedCollection = db.collection('test');
  typedCollection = new TypedCollection<Document>({
    untypedCollection,
    validators: createTypedCollectionValidators({
      compiler: schema.createCompiler({ useDefaults: true }),
      schema: SCHEMA,
    }),
  });
  permissionedCollection = createPermissionedCollection({
    collection: typedCollection,
    canAccessDocument: () => status.fromValue(true),
  });
});

afterEach(async () => {
  await untypedCollection.deleteMany({});
});

afterAll(async () => {
  await mongoClient.close();
});

// Tests.

describe('paginate', () => {
  test('Can retrieve an entire collection in a single page.', async () => {
    status.throwIfError(
      await permissionedCollection.insertMany([
        {
          _id: 'foo',
          value: 100,
        },
        {
          _id: 'bar',
          value: 200,
        },
      ]),
    );

    const page = status.throwIfError(
      await paginate(permissionedCollection, {
        sort: {
          property: '_id',
          direction: 'desc',
          validator: schema.getStringValidator(),
        },
        limit: 10,
      }),
    );

    expect(page).toStrictEqual({
      totalCount: 2,
      edges: [
        {
          node: {
            _id: 'foo',
            value: 100,
          },
          cursor: expect.any(String),
        },
        {
          node: {
            _id: 'bar',
            value: 200,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: false,
      },
    });

    expect(page.edges[0].cursor).not.toBe(page.edges[1].cursor);
    expect(page.pageInfo.endCursor).toBe(page.edges[1].cursor);
  });

  test('Can paginate using an ascending cursor.', async () => {
    status.throwIfError(
      await permissionedCollection.insertMany([
        {
          _id: 'foo',
          value: 100,
        },
        {
          _id: 'bar',
          value: 200,
        },
      ]),
    );

    const spec: PaginationSpec<Document, '_id'> = {
      sort: {
        property: '_id',
        direction: 'asc',
        validator: schema.getStringValidator(),
      },
      limit: 1,
    };

    const firstPage = status.throwIfError(
      await paginate(permissionedCollection, spec),
    );

    expect(firstPage).toStrictEqual({
      totalCount: 1,
      edges: [
        {
          node: {
            _id: 'bar',
            value: 200,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: true,
      },
    });

    expect(firstPage.edges[0].cursor).toBe(firstPage.pageInfo.endCursor);

    const secondPage = status.throwIfError(
      await paginate(permissionedCollection, spec, {
        after: firstPage.pageInfo.endCursor,
      }),
    );

    expect(secondPage).toStrictEqual({
      totalCount: 1,
      edges: [
        {
          node: {
            _id: 'foo',
            value: 100,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: false,
      },
    });

    expect(secondPage.edges[0].cursor).toBe(secondPage.pageInfo.endCursor);
    expect(firstPage.edges[0].cursor).not.toBe(secondPage.edges[0].cursor);
  });

  test('Can paginate using a descending cursor.', async () => {
    status.throwIfError(
      await permissionedCollection.insertMany([
        {
          _id: 'foo',
          value: 100,
        },
        {
          _id: 'bar',
          value: 200,
        },
      ]),
    );

    const spec: PaginationSpec<Document, '_id'> = {
      sort: {
        property: '_id',
        direction: 'desc',
        validator: schema.getStringValidator(),
      },
      limit: 1,
    };

    const firstPage = status.throwIfError(
      await paginate(permissionedCollection, spec),
    );

    expect(firstPage).toStrictEqual({
      totalCount: 1,
      edges: [
        {
          node: {
            _id: 'foo',
            value: 100,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: true,
      },
    });

    expect(firstPage.edges[0].cursor).toBe(firstPage.pageInfo.endCursor);

    const secondPage = status.throwIfError(
      await paginate(permissionedCollection, spec, {
        after: firstPage.pageInfo.endCursor,
      }),
    );

    expect(secondPage).toStrictEqual({
      totalCount: 1,
      edges: [
        {
          node: {
            _id: 'bar',
            value: 200,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: false,
      },
    });

    expect(secondPage.edges[0].cursor).toBe(secondPage.pageInfo.endCursor);
    expect(firstPage.edges[0].cursor).not.toBe(secondPage.edges[0].cursor);
  });

  test('Can paginate using a non-string cursor.', async () => {
    status.throwIfError(
      await permissionedCollection.insertMany([
        {
          _id: 'foo',
          value: 100,
        },
        {
          _id: 'bar',
          value: 200,
        },
      ]),
    );

    const spec: PaginationSpec<Document, 'value'> = {
      sort: {
        property: 'value',
        direction: 'asc',
        validator: schema.getNumberValidator(),
      },
      limit: 1,
    };

    const firstPage = status.throwIfError(
      await paginate(permissionedCollection, spec),
    );

    expect(firstPage).toStrictEqual({
      totalCount: 1,
      edges: [
        {
          node: {
            _id: 'foo',
            value: 100,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: true,
      },
    });

    expect(firstPage.edges[0].cursor).toBe(firstPage.pageInfo.endCursor);

    const secondPage = status.throwIfError(
      await paginate(permissionedCollection, spec, {
        after: firstPage.pageInfo.endCursor,
      }),
    );

    expect(secondPage).toStrictEqual({
      totalCount: 1,
      edges: [
        {
          node: {
            _id: 'bar',
            value: 200,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: false,
      },
    });

    expect(secondPage.edges[0].cursor).toBe(secondPage.pageInfo.endCursor);
    expect(firstPage.edges[0].cursor).not.toBe(secondPage.edges[0].cursor);
  });

  test('Pagination safely removes malformed documents.', async () => {
    await untypedCollection.insertMany([
      {
        _id: 'a',
        value: 100,
      },
      {
        _id: 'b',
        value: 'INVALID',
      } as unknown as Document,
      {
        _id: 'c',
        value: 300,
      },
    ]);

    const spec: PaginationSpec<Document, '_id'> = {
      sort: {
        property: '_id',
        direction: 'asc',
        validator: schema.getStringValidator(),
      },
      limit: 2,
    };

    const firstPage = status.throwIfError(
      await paginate(permissionedCollection, spec),
    );

    expect(firstPage).toStrictEqual({
      totalCount: 1,
      edges: [
        {
          node: {
            _id: 'a',
            value: 100,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: true,
      },
    });

    expect(firstPage.edges[0].cursor).toBe(firstPage.pageInfo.endCursor);

    const secondPage = status.throwIfError(
      await paginate(permissionedCollection, spec, {
        after: firstPage.pageInfo.endCursor,
      }),
    );

    expect(secondPage).toStrictEqual({
      totalCount: 1,
      edges: [
        {
          node: {
            _id: 'c',
            value: 300,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: false,
      },
    });

    expect(secondPage.edges[0].cursor).toBe(secondPage.pageInfo.endCursor);
    expect(firstPage.edges[0].cursor).not.toBe(secondPage.edges[0].cursor);
  });

  test('Can retrieve fewer documents than the limit.', async () => {
    status.throwIfError(
      await permissionedCollection.insertMany([
        {
          _id: 'a',
          value: 100,
        },
        {
          _id: 'b',
          value: 200,
        },
        {
          _id: 'c',
          value: 300,
        },
      ]),
    );

    const page = status.throwIfError(
      await paginate(
        permissionedCollection,
        {
          sort: {
            property: '_id',
            direction: 'asc',
            validator: schema.getStringValidator(),
          },
          limit: 10,
        },
        { first: 2 },
      ),
    );

    expect(page).toStrictEqual({
      totalCount: 2,
      edges: [
        {
          node: {
            _id: 'a',
            value: 100,
          },
          cursor: expect.any(String),
        },
        {
          node: {
            _id: 'b',
            value: 200,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: true,
      },
    });
  });

  test('Cannot retrieve more documents than the limit.', async () => {
    status.throwIfError(
      await permissionedCollection.insertMany([
        {
          _id: 'a',
          value: 100,
        },
        {
          _id: 'b',
          value: 200,
        },
        {
          _id: 'c',
          value: 300,
        },
      ]),
    );

    const page = status.throwIfError(
      await paginate(
        permissionedCollection,
        {
          sort: {
            property: '_id',
            direction: 'asc',
            validator: schema.getStringValidator(),
          },
          limit: 2,
        },
        { first: 100 },
      ),
    );

    expect(page).toStrictEqual({
      totalCount: 2,
      edges: [
        {
          node: {
            _id: 'a',
            value: 100,
          },
          cursor: expect.any(String),
        },
        {
          node: {
            _id: 'b',
            value: 200,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: true,
      },
    });
  });

  test('Can apply additional filters', async () => {
    status.throwIfError(
      await permissionedCollection.insertMany([
        {
          _id: 'a',
          value: 100,
        },
        {
          _id: 'b',
          value: 200,
        },
        {
          _id: 'c',
          value: 300,
        },
      ]),
    );

    const page = status.throwIfError(
      await paginate(
        permissionedCollection,
        {
          sort: {
            property: '_id',
            direction: 'asc',
            validator: schema.getStringValidator(),
          },
          limit: 100,
        },
        {
          filter: { value: { $lt: 150 } },
        },
      ),
    );

    expect(page).toStrictEqual({
      totalCount: 1,
      edges: [
        {
          node: {
            _id: 'a',
            value: 100,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: false,
      },
    });
  });

  test('Can paginate using a non-unique ascending cursor.', async () => {
    status.throwIfError(
      await permissionedCollection.insertMany([
        {
          _id: 'foo',
          value: 100,
        },
        {
          _id: 'bar_1',
          value: 200,
        },
        {
          _id: 'bar_2',
          value: 200,
        },
        {
          _id: 'bar_3',
          value: 200,
        },
        {
          _id: 'baz',
          value: 300,
        },
      ]),
    );

    const spec: PaginationSpec<Document, 'value', '_id'> = {
      sort: {
        property: 'value',
        direction: 'asc',
        validator: schema.getNumberValidator(),
      },
      discriminator: {
        property: '_id',
        validator: schema.getStringValidator(),
      },
      limit: 3,
    };

    const firstPage = status.throwIfError(
      await paginate(permissionedCollection, spec),
    );

    expect(firstPage).toStrictEqual({
      totalCount: 3,
      edges: [
        {
          node: {
            _id: 'foo',
            value: 100,
          },
          cursor: expect.any(String),
        },
        {
          node: {
            _id: 'bar_1',
            value: 200,
          },
          cursor: expect.any(String),
        },
        {
          node: {
            _id: 'bar_2',
            value: 200,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: true,
      },
    });

    const secondPage = status.throwIfError(
      await paginate(permissionedCollection, spec, {
        after: firstPage.pageInfo.endCursor,
      }),
    );

    expect(secondPage).toStrictEqual({
      totalCount: 2,
      edges: [
        {
          node: {
            _id: 'bar_3',
            value: 200,
          },
          cursor: expect.any(String),
        },
        {
          node: {
            _id: 'baz',
            value: 300,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: false,
      },
    });
  });

  test('Can paginate using a non-unique descending cursor.', async () => {
    status.throwIfError(
      await permissionedCollection.insertMany([
        {
          _id: 'foo',
          value: 100,
        },
        {
          _id: 'bar_1',
          value: 200,
        },
        {
          _id: 'bar_2',
          value: 200,
        },
        {
          _id: 'bar_3',
          value: 200,
        },
        {
          _id: 'baz',
          value: 300,
        },
      ]),
    );

    const spec: PaginationSpec<Document, 'value', '_id'> = {
      sort: {
        property: 'value',
        direction: 'desc',
        validator: schema.getNumberValidator(),
      },
      discriminator: {
        property: '_id',
        validator: schema.getStringValidator(),
      },
      limit: 3,
    };

    const firstPage = status.throwIfError(
      await paginate(permissionedCollection, spec),
    );

    expect(firstPage).toStrictEqual({
      totalCount: 3,
      edges: [
        {
          node: {
            _id: 'baz',
            value: 300,
          },
          cursor: expect.any(String),
        },
        {
          node: {
            _id: 'bar_3',
            value: 200,
          },
          cursor: expect.any(String),
        },
        {
          node: {
            _id: 'bar_2',
            value: 200,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: true,
      },
    });

    const secondPage = status.throwIfError(
      await paginate(permissionedCollection, spec, {
        after: firstPage.pageInfo.endCursor,
      }),
    );

    expect(secondPage).toStrictEqual({
      totalCount: 2,
      edges: [
        {
          node: {
            _id: 'bar_1',
            value: 200,
          },
          cursor: expect.any(String),
        },
        {
          node: {
            _id: 'foo',
            value: 100,
          },
          cursor: expect.any(String),
        },
      ],
      pageInfo: {
        endCursor: expect.any(String),
        hasNextPage: false,
      },
    });
  });
});
