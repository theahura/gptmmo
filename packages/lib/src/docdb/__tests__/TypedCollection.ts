import '@shelf/jest-mongodb/lib/types';

import * as status from '@gptmmo/status';
import * as schema from '@gptmmo/validation';
import * as mongodb from 'mongodb';

import {
  TypedCollection,
  createTypedCollectionValidators,
} from '@/docdb/TypedCollection';

// Setup an in-memory MongoDB server + client.
//
// See https://github.com/shelfio/jest-mongodb

let mongoClient: mongodb.MongoClient;
let db: mongodb.Db;

type Document = { _id: string; value: number };
const SCHEMA: schema.Schema<Document> = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
    },
    value: {
      type: 'number',
    },
  },
  required: ['_id', 'value'],
  additionalProperties: false,
};

let untypedCollection: mongodb.Collection<any>;
let typedCollection: TypedCollection<Document>;

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
});

afterEach(async () => {
  await untypedCollection.deleteMany({});
});

afterAll(async () => {
  await mongoClient.close();
});

// Tests.

describe('insertOne', () => {
  test('Fails if schema validation fails.', async () => {
    expect(
      await typedCollection.insertOne({
        _id: 'foo',
        value: 100,
        unknownProperty: 200,
      } as Document),
    ).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Succeeds with a valid document.', async () => {
    expect(
      status.isOk(
        await typedCollection.insertOne({
          _id: 'foo',
          value: 100,
        }),
      ),
    ).toBe(true);
  });
});

describe('insertMany', () => {
  test('Fails if any document fails schema validation.', async () => {
    expect(
      await typedCollection.insertMany([
        {
          _id: 'foo',
          value: 100,
          unknownProperty: 200,
        } as Document,
        {
          _id: 'bar',
          value: 200,
        },
      ]),
    ).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Succeeds with valid documents.', async () => {
    expect(
      status.isOk(
        await typedCollection.insertMany([
          {
            _id: 'foo',
            value: 100,
          },
          {
            _id: 'bar',
            value: 200,
          },
        ]),
      ),
    ).toBe(true);
  });
});

describe('replaceOne', () => {
  test('Fails if the document fails schema validation.', async () => {
    await typedCollection.insertOne({
      _id: 'foo',
      value: 100,
    });

    expect(
      await typedCollection.replaceOne({ _id: 'foo' }, {
        value: 100,
        unknownProperty: 200,
      } as Omit<Document, '_id'>),
    ).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Succeeds with a valid document.', async () => {
    await typedCollection.insertOne({
      _id: 'foo',
      value: 100,
    });

    expect(
      status.isOk(
        await typedCollection.replaceOne(
          { _id: 'foo' },
          {
            value: 150,
          },
        ),
      ),
    ).toBe(true);
  });
});

describe('findOne', () => {
  test('Fails if schema validation fails.', async () => {
    await untypedCollection.insertOne({
      _id: 'foo',
      value: 100,
      unexpectedProperty: 200,
    });

    expect(await typedCollection.findOne({ _id: 'foo' })).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Succeeds with a valid document.', async () => {
    await typedCollection.insertOne({
      _id: 'foo',
      value: 100,
    });

    expect(await typedCollection.findOne({ _id: 'foo' })).toMatchObject(
      status.fromValue({
        _id: 'foo',
        value: 100,
      }),
    );
  });

  test('Returns null when a document is not found.', async () => {
    expect(await typedCollection.findOne({ _id: 'foo' })).toMatchObject(
      status.fromValue(null),
    );
  });
});

describe('find', () => {
  test('Cursor validates documents during iteration.', async () => {
    await untypedCollection.insertMany([
      {
        _id: 'foo',
        value: 100,
        unexpectedProperty: 200,
      },
      {
        _id: 'bar',
        value: 200,
      },
    ]);

    const cursor = await typedCollection.find({});

    expect(await cursor.next()).toMatchObject({
      error: expect.any(String),
    });
    expect(await cursor.next()).toMatchObject(
      status.fromValue({
        _id: 'bar',
        value: 200,
      }),
    );
  });
});

describe('findOneAndDelete', () => {
  test('Marks the found value as ErrorStatusOr when validation fails.', async () => {
    await untypedCollection.insertOne({
      _id: 'foo',
      value: 100,
      unexpectedProperty: 200,
    });

    expect(
      await typedCollection.findOneAndDelete({ _id: 'foo' }),
    ).toMatchObject(
      status.fromValue({
        ok: 1,
        document: {
          error: expect.any(String),
        },
      }),
    );
  });

  test('Returns the document when validation passes.', async () => {
    await typedCollection.insertOne({
      _id: 'foo',
      value: 100,
    });

    expect(
      await typedCollection.findOneAndDelete({ _id: 'foo' }),
    ).toMatchObject(
      status.fromValue({
        ok: 1,
        document: status.fromValue({
          _id: 'foo',
          value: 100,
        }),
      }),
    );
  });

  test('Returns null when no document is found.', async () => {
    expect(
      await typedCollection.findOneAndDelete({ _id: 'foo' }),
    ).toMatchObject(
      status.fromValue({
        ok: 1,
        document: status.fromValue(null),
      }),
    );
  });
});

describe('findOneAndReplace', () => {
  test('Returns ErrorStatusOr when replacement validation fails.', async () => {
    expect(
      await typedCollection.findOneAndReplace({ _id: 'foo' }, {
        value: 200,
        unexpectedProperty: 300,
      } as Omit<Document, '_id'>),
    ).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Marks the found value as ErrorStatusOr when on-read validation fails.', async () => {
    await untypedCollection.insertOne({
      _id: 'foo',
      value: 100,
      unexpectedProperty: 200,
    });

    expect(
      await typedCollection.findOneAndReplace(
        { _id: 'foo' },
        {
          value: 200,
        },
      ),
    ).toMatchObject(
      status.fromValue({
        ok: 1,
        document: {
          error: expect.any(String),
        },
      }),
    );
  });

  test('Returns the document when on-read validation passes.', async () => {
    await typedCollection.insertOne({
      _id: 'foo',
      value: 100,
    });

    expect(
      await typedCollection.findOneAndReplace(
        { _id: 'foo' },
        {
          value: 200,
        },
      ),
    ).toMatchObject(
      status.fromValue({
        ok: 1,
        document: status.fromValue({
          _id: 'foo',
          value: 100,
        }),
      }),
    );
  });

  test('Returns null when no document is found.', async () => {
    expect(
      await typedCollection.findOneAndReplace(
        { _id: 'foo' },
        {
          value: 200,
        },
      ),
    ).toMatchObject(
      status.fromValue({
        ok: 1,
        document: status.fromValue(null),
      }),
    );
  });
});

describe('findOneAndUpdate', () => {
  test('Marks the found value as ErrorStatusOr when on-read validation fails.', async () => {
    await untypedCollection.insertOne({
      _id: 'foo',
      value: 100,
      unexpectedProperty: 200,
    });

    expect(
      await typedCollection.findOneAndUpdate(
        { _id: 'foo' },
        {
          $set: { value: 200 },
        },
      ),
    ).toMatchObject(
      status.fromValue({
        ok: 1,
        document: {
          error: expect.any(String),
        },
      }),
    );
  });

  test('Returns the document when on-read validation passes.', async () => {
    await typedCollection.insertOne({
      _id: 'foo',
      value: 100,
    });

    expect(
      await typedCollection.findOneAndUpdate(
        { _id: 'foo' },
        {
          $set: { value: 200 },
        },
      ),
    ).toMatchObject(
      status.fromValue({
        ok: 1,
        document: status.fromValue({
          _id: 'foo',
          value: 100,
        }),
      }),
    );
  });

  test('Returns null when no document is found.', async () => {
    expect(
      await typedCollection.findOneAndUpdate(
        { _id: 'foo' },
        {
          $set: { value: 200 },
        },
      ),
    ).toMatchObject(
      status.fromValue({
        ok: 1,
        document: status.fromValue(null),
      }),
    );
  });
});

describe('createIndex', () => {
  test('Returns OK when creating an index succeeds.', async () => {
    expect(await typedCollection.createIndex({ foo: 1 })).toStrictEqual(
      status.fromValue('foo_1'),
    );
  });
});
