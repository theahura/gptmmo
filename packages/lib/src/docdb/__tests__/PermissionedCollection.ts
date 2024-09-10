import '@shelf/jest-mongodb/lib/types';

import * as status from '@gptmmo/status';
import * as schema from '@gptmmo/validation';
import * as mongodb from 'mongodb';

import * as accessControl from '@/docdb/AccessControl';
import { createPermissionedCollection } from '@/docdb/PermissionedCollection';
import {
  TypedCollection,
  createTypedCollectionValidators,
} from '@/docdb/TypedCollection';

import type { PermissionedCollection } from '@/docdb/PermissionedCollection';

// Setup an in-memory MongoDB server + client.
//
// See https://github.com/shelfio/jest-mongodb

let mongoClient: mongodb.MongoClient;
let db: mongodb.Db;

type Document = {
  _id: string;
  value: number;
  allowedEventTypes?: Array<accessControl.DocumentAccessType>;
};

const SCHEMA: schema.Schema<Document> = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
    },
    value: {
      type: 'number',
    },
    allowedEventTypes: {
      type: 'array',
      nullable: true,
      items: {
        type: 'string',
        enum: Object.values(accessControl.DocumentAccessType),
      },
    },
  },
  required: ['_id', 'value'],
  additionalProperties: false,
};

let untypedCollection: mongodb.Collection<any>;
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
  permissionedCollection = createPermissionedCollection<Document>({
    collection: typedCollection,
    canAccessDocument: (event) =>
      status.fromValue(
        new Set(event.document.allowedEventTypes ?? []).has(event.type),
      ),
  });
});

afterEach(async () => {
  await untypedCollection.deleteMany({});
});

afterAll(async () => {
  await mongoClient.close();
});

// Tests.

describe('insertOne', () => {
  test('Fails if document is disallowed by the gatekeeper.', async () => {
    expect(
      await permissionedCollection.insertOne({
        _id: 'foo',
        value: 100,
        allowedEventTypes: [
          accessControl.DocumentAccessType.READ,
          accessControl.DocumentAccessType.UPDATE,
          accessControl.DocumentAccessType.DELETE,
        ],
      }),
    ).toMatchObject({
      error: expect.any(String),
    });

    expect(await typedCollection.find({}).toArray()).toHaveLength(0);
  });

  test('Succeeds when document is permitted.', async () => {
    expect(
      status.isOk(
        await permissionedCollection.insertOne({
          _id: 'foo',
          value: 100,
          allowedEventTypes: [accessControl.DocumentAccessType.INSERT],
        }),
      ),
    ).toBe(true);

    expect(await typedCollection.find({}).toArray()).toHaveLength(1);
  });
});

describe('insertMany', () => {
  test('Fails if any document is disallowed by the gatekeeper.', async () => {
    expect(
      await permissionedCollection.insertMany([
        {
          _id: 'foo',
          value: 100,
          allowedEventTypes: [accessControl.DocumentAccessType.INSERT],
        },
        {
          _id: 'bar',
          value: 200,
          allowedEventTypes: [
            accessControl.DocumentAccessType.READ,
            accessControl.DocumentAccessType.UPDATE,
            accessControl.DocumentAccessType.DELETE,
          ],
        },
      ]),
    ).toMatchObject({
      error: expect.any(String),
    });

    expect(await typedCollection.find({}).toArray()).toHaveLength(0);
  });

  test('Succeeds when all documents are permitted.', async () => {
    expect(
      status.isOk(
        await permissionedCollection.insertMany([
          {
            _id: 'foo',
            value: 100,
            allowedEventTypes: [accessControl.DocumentAccessType.INSERT],
          },
          {
            _id: 'bar',
            value: 200,
            allowedEventTypes: [
              accessControl.DocumentAccessType.READ,
              accessControl.DocumentAccessType.INSERT,
            ],
          },
        ]),
      ),
    ).toBe(true);

    expect(await typedCollection.find({}).toArray()).toHaveLength(2);
  });
});

describe('replaceOne', () => {
  test('Fails if disallowed by gatekeeper.', async () => {
    const DOCUMENT: Document = {
      _id: 'foo',
      value: 100,
      allowedEventTypes: [
        accessControl.DocumentAccessType.READ,
        accessControl.DocumentAccessType.INSERT,
        accessControl.DocumentAccessType.DELETE,
      ],
    };

    status.throwIfError(await typedCollection.insertOne(DOCUMENT));

    expect(
      await permissionedCollection.replaceOne({ value: 100 }, { value: 200 }),
    ).toMatchObject({
      error: expect.any(String),
    });

    // Remains unchanged.
    expect(await typedCollection.find({}).toArray()).toStrictEqual([
      status.fromValue(DOCUMENT),
    ]);
  });

  test('Succeeds if allowed by gatekeeper.', async () => {
    status.throwIfError(
      await typedCollection.insertOne({
        _id: 'foo',
        value: 100,
        allowedEventTypes: [accessControl.DocumentAccessType.UPDATE],
      }),
    );

    expect(
      status.isOk(
        await permissionedCollection.replaceOne(
          { value: 100 },
          { value: 200 },
        ),
      ),
    ).toBe(true);

    expect(await typedCollection.find({}).toArray()).toStrictEqual([
      status.fromValue({
        _id: 'foo',
        value: 200,
      }),
    ]);
  });
});

describe('findOne', () => {
  test('Fails if disallowed by gatekeeper.', async () => {
    status.throwIfError(
      await typedCollection.insertOne({
        _id: 'foo',
        value: 100,
        allowedEventTypes: [
          accessControl.DocumentAccessType.INSERT,
          accessControl.DocumentAccessType.UPDATE,
          accessControl.DocumentAccessType.DELETE,
        ],
      }),
    );

    expect(await permissionedCollection.findOne({ _id: 'foo' })).toMatchObject(
      {
        error: expect.any(String),
      },
    );
  });

  test('Succeeds if allowed by gatekeeper.', async () => {
    const DOCUMENT: Document = {
      _id: 'foo',
      value: 100,
      allowedEventTypes: [accessControl.DocumentAccessType.READ],
    };

    status.throwIfError(await typedCollection.insertOne(DOCUMENT));

    expect(
      status.throwIfError(
        await permissionedCollection.findOne({ _id: 'foo' }),
      ),
    ).toStrictEqual(DOCUMENT);
  });

  test('Returns null when a document is not found.', async () => {
    expect(await permissionedCollection.findOne({ _id: 'foo' })).toMatchObject(
      status.fromValue(null),
    );
  });
});

describe('find', () => {
  test('Cursor disallows documents using the gatekeeper.', async () => {
    const UNREADABLE_DOCUMENT: Document = {
      _id: 'foo',
      value: 100,
      allowedEventTypes: [
        accessControl.DocumentAccessType.INSERT,
        accessControl.DocumentAccessType.UPDATE,
        accessControl.DocumentAccessType.DELETE,
      ],
    };

    const READABLE_DOCUMENT: Document = {
      _id: 'bar',
      value: 200,
      allowedEventTypes: [accessControl.DocumentAccessType.READ],
    };

    status.throwIfError(
      await typedCollection.insertMany([
        UNREADABLE_DOCUMENT,
        READABLE_DOCUMENT,
      ]),
    );

    const cursor = await permissionedCollection.find({});

    expect(await cursor.next()).toMatchObject({
      error: expect.any(String),
    });
    expect(await cursor.next()).toMatchObject(
      status.fromValue(READABLE_DOCUMENT),
    );
  });
});

describe('findOneAndDelete', () => {
  test('Fails if READ disallowed by gatekeeper.', async () => {
    status.throwIfError(
      await typedCollection.insertOne({
        _id: 'foo',
        value: 100,
        allowedEventTypes: [
          accessControl.DocumentAccessType.INSERT,
          accessControl.DocumentAccessType.UPDATE,
          accessControl.DocumentAccessType.DELETE,
        ],
      }),
    );

    expect(
      await permissionedCollection.findOneAndDelete({ _id: 'foo' }),
    ).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Fails if DELETE disallowed by gatekeeper.', async () => {
    status.throwIfError(
      await typedCollection.insertOne({
        _id: 'foo',
        value: 100,
        allowedEventTypes: [
          accessControl.DocumentAccessType.READ,
          accessControl.DocumentAccessType.INSERT,
          accessControl.DocumentAccessType.UPDATE,
        ],
      }),
    );

    expect(
      await permissionedCollection.findOneAndDelete({ _id: 'foo' }),
    ).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Succeeds if allowed by gatekeeper.', async () => {
    const DOCUMENT: Document = {
      _id: 'foo',
      value: 100,
      allowedEventTypes: [
        accessControl.DocumentAccessType.READ,
        accessControl.DocumentAccessType.DELETE,
      ],
    };

    status.throwIfError(await typedCollection.insertOne(DOCUMENT));

    expect(
      status.throwIfError(
        await permissionedCollection.findOneAndDelete({ _id: 'foo' }),
      ),
    ).toStrictEqual({
      ok: 1,
      document: status.fromValue(DOCUMENT),
      lastErrorObject: expect.anything(),
    });
  });

  test('Returns null when no document is found.', async () => {
    expect(
      status.throwIfError(
        await permissionedCollection.findOneAndDelete({ _id: 'foo' }),
      ),
    ).toStrictEqual({
      ok: 1,
      document: status.fromValue(null),
    });
  });
});

describe('findOneAndReplace', () => {
  test('Fails if READ disallowed by gatekeeper.', async () => {
    status.throwIfError(
      await typedCollection.insertOne({
        _id: 'foo',
        value: 100,
        allowedEventTypes: [
          accessControl.DocumentAccessType.INSERT,
          accessControl.DocumentAccessType.UPDATE,
          accessControl.DocumentAccessType.DELETE,
        ],
      }),
    );

    expect(
      await permissionedCollection.findOneAndReplace(
        { value: 100 },
        { value: 200 },
      ),
    ).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Fails if UPDATE disallowed by gatekeeper.', async () => {
    status.throwIfError(
      await typedCollection.insertOne({
        _id: 'foo',
        value: 100,
        allowedEventTypes: [
          accessControl.DocumentAccessType.READ,
          accessControl.DocumentAccessType.INSERT,
          accessControl.DocumentAccessType.DELETE,
        ],
      }),
    );

    expect(
      await permissionedCollection.findOneAndReplace(
        { value: 100 },
        { value: 200 },
      ),
    ).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Succeeds if allowed by gatekeeper.', async () => {
    status.throwIfError(
      await typedCollection.insertOne({
        _id: 'foo',
        value: 100,
        allowedEventTypes: [
          accessControl.DocumentAccessType.READ,
          accessControl.DocumentAccessType.UPDATE,
        ],
      }),
    );

    expect(
      status.throwIfError(
        await permissionedCollection.findOneAndReplace(
          { value: 100 },
          { value: 200 },
          { returnDocument: 'after' },
        ),
      ),
    ).toStrictEqual({
      ok: 1,
      document: status.fromValue({
        _id: 'foo',
        value: 200,
      }),
      lastErrorObject: expect.anything(),
    });
  });

  test('Returns null when no document is found.', async () => {
    expect(
      status.throwIfError(
        await permissionedCollection.findOneAndReplace(
          { value: 100 },
          { value: 200 },
        ),
      ),
    ).toStrictEqual({
      ok: 1,
      document: status.fromValue(null),
    });
  });
});

describe('findOneAndUpdate', () => {
  test('Fails if READ disallowed by gatekeeper.', async () => {
    status.throwIfError(
      await typedCollection.insertOne({
        _id: 'foo',
        value: 100,
        allowedEventTypes: [
          accessControl.DocumentAccessType.INSERT,
          accessControl.DocumentAccessType.UPDATE,
          accessControl.DocumentAccessType.DELETE,
        ],
      }),
    );

    expect(
      await permissionedCollection.findOneAndUpdate(
        { value: 100 },
        { $set: { value: 200 } },
      ),
    ).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Fails if UPDATE disallowed by gatekeeper.', async () => {
    status.throwIfError(
      await typedCollection.insertOne({
        _id: 'foo',
        value: 100,
        allowedEventTypes: [
          accessControl.DocumentAccessType.READ,
          accessControl.DocumentAccessType.INSERT,
          accessControl.DocumentAccessType.DELETE,
        ],
      }),
    );

    expect(
      await permissionedCollection.findOneAndUpdate(
        { value: 100 },
        { $set: { value: 200 } },
      ),
    ).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Succeeds if allowed by gatekeeper.', async () => {
    status.throwIfError(
      await typedCollection.insertOne({
        _id: 'foo',
        value: 100,
        allowedEventTypes: [
          accessControl.DocumentAccessType.READ,
          accessControl.DocumentAccessType.UPDATE,
        ],
      }),
    );

    expect(
      status.throwIfError(
        await permissionedCollection.findOneAndUpdate(
          { value: 100 },
          { $set: { value: 200 } },
          { returnDocument: 'after' },
        ),
      ),
    ).toStrictEqual({
      ok: 1,
      document: status.fromValue({
        _id: 'foo',
        value: 200,
        allowedEventTypes: [
          accessControl.DocumentAccessType.READ,
          accessControl.DocumentAccessType.UPDATE,
        ],
      }),
      lastErrorObject: expect.anything(),
    });
  });

  test('Returns null when no document is found.', async () => {
    expect(
      status.throwIfError(
        await permissionedCollection.findOneAndUpdate(
          { value: 100 },
          { $set: { value: 200 } },
        ),
      ),
    ).toStrictEqual({
      ok: 1,
      document: status.fromValue(null),
    });
  });
});

describe('createIndex', () => {
  test('Returns OK when creating an index succeeds.', async () => {
    expect(await permissionedCollection.createIndex({ foo: 1 })).toStrictEqual(
      status.fromValue('foo_1'),
    );
  });
});
