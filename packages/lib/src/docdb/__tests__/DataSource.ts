import '@shelf/jest-mongodb/lib/types';

import * as collections from '@gptmmo/collections';
import * as status from '@gptmmo/status';
import * as mongodb from 'mongodb';

import { createDataSource } from '@/docdb/DataSource';

// Setup an in-memory MongoDB server + client.
//
// See https://github.com/shelfio/jest-mongodb

let mongoClient: mongodb.MongoClient;
let db: mongodb.Db;

beforeAll(async () => {
  mongoClient = await new mongodb.MongoClient(global.__MONGO_URI__).connect();
  db = await mongoClient.db(global.__MONGO_DB_NAME__);
});

afterEach(async () => {
  await db.dropDatabase();
});

afterAll(async () => {
  await mongoClient.close();
});

// Tests.

describe('findOneById', () => {
  test('Returns null for an unknown id.', async () => {
    type Document = { _id: string; value: number };
    const collection = db.collection<Document>('test');

    const dataSource = createDataSource(collection);
    expect(await dataSource.findOneById('foo')).toStrictEqual(
      status.fromValue(null),
    );
  });

  test('Returns the correct document for a known id.', async () => {
    type Document = { _id: string; value: number };
    const collection = db.collection<Document>('test');

    await collection.insertOne({
      _id: 'foo',
      value: 100,
    });

    const dataSource = createDataSource(collection);
    expect(await dataSource.findOneById('foo')).toStrictEqual(
      status.fromValue({
        _id: 'foo',
        value: 100,
      }),
    );
  });

  test('Serialized calls result in multiple network requests.', async () => {
    type Document = { _id: string; value: number };
    const collection = db.collection<Document>('test');
    jest.spyOn(collection, 'find');

    const dataSource = createDataSource(collection);
    await dataSource.findOneById('foo');
    await dataSource.findOneById('bar');
    await dataSource.findOneById('baz');

    expect(collection.find).toHaveBeenCalledTimes(3);
  });

  test('Batches parallel calls into a single network request.', async () => {
    type Document = { _id: string; value: number };
    const collection = db.collection<Document>('test');
    jest.spyOn(collection, 'find');

    await collection.insertMany([
      {
        _id: 'foo',
        value: 100,
      },
      {
        _id: 'baz',
        value: 300,
      },
    ]);

    const dataSource = createDataSource(collection);
    const results = await Promise.all([
      dataSource.findOneById('foo'),
      dataSource.findOneById('bar'),
      dataSource.findOneById('baz'),
    ]);

    expect(collection.find).toHaveBeenCalledTimes(1);

    expect(results).toStrictEqual([
      status.fromValue({
        _id: 'foo',
        value: 100,
      }),
      status.fromValue(null),
      status.fromValue({
        _id: 'baz',
        value: 300,
      }),
    ]);
  });

  test('Batches parallel cascaded calls into a single network request.', async () => {
    type Document = { _id: string; value: number };
    const collection = db.collection<Document>('test');
    jest.spyOn(collection, 'find');

    await collection.insertMany([
      {
        _id: 'foo',
        value: 100,
      },
      {
        _id: 'bar',
        value: 200,
      },
      {
        _id: 'baz',
        value: 300,
      },
      {
        _id: 'qux',
        value: 400,
      },
    ]);

    const createCascade = async (first: string, second: string) => {
      await dataSource.findOneById(first);
      await dataSource.findOneById(second);
    };

    const dataSource = createDataSource(collection);
    await Promise.all([
      createCascade('foo', 'baz'),
      createCascade('bar', 'qux'),
    ]);

    expect(collection.find).toHaveBeenCalledTimes(2);
    expect(collection.find).toHaveBeenNthCalledWith(1, {
      _id: { $in: ['foo', 'bar'] },
    });
    expect(collection.find).toHaveBeenNthCalledWith(2, {
      _id: { $in: ['baz', 'qux'] },
    });
  });

  // This test investigated the case where we internally batch requests into a
  // single network request and need to ensure that they get un-batched when
  // responding to clients. This could be naively done using ID equality between
  // the returned documents by MongoDB and the requested IDs, but this would
  // break for composite IDs which can't be trivially compared.
  test('Correctly orders batched documents with composite IDs.', async () => {
    type Document = { _id: { first: string; second: string }; value: number };
    const collection = db.collection<Document>('test');
    jest.spyOn(collection, 'find');

    await collection.insertMany([
      {
        _id: {
          first: 'foo',
          second: 'bar',
        },
        value: 100,
      },
      {
        _id: {
          first: 'baz',
          second: 'qux',
        },
        value: 200,
      },
    ]);

    const dataSource = createDataSource(collection);
    const results = await Promise.all([
      dataSource.findOneById({
        first: 'baz',
        second: 'qux',
      }),
      dataSource.findOneById({
        first: 'foo',
        second: 'bar',
      }),
    ]);

    expect(collection.find).toHaveBeenCalledTimes(1);

    expect(results).toStrictEqual([
      status.fromValue({
        _id: {
          first: 'baz',
          second: 'qux',
        },
        value: 200,
      }),
      status.fromValue({
        _id: {
          first: 'foo',
          second: 'bar',
        },
        value: 100,
      }),
    ]);
  });

  test("Is typesafe when templated document type doesn't include _id.", async () => {
    type Document = { value: number };
    const collection = db.collection<Document>('test');

    const insertionResult = await collection.insertOne({ value: 100 });

    const dataSource = createDataSource(collection);
    const findResult = await dataSource.findOneById(
      insertionResult.insertedId,
    );
    expect(findResult).toMatchObject(
      status.fromValue({
        _id: insertionResult.insertedId,
        value: 100,
      }),
    );
  });

  test('Debounces duplicate, serialized ID lookups.', async () => {
    type Document = { _id: string };
    const collection = db.collection<Document>('test');
    jest.spyOn(collection, 'find');

    await collection.insertOne({ _id: 'foo' });

    const dataSource = createDataSource(collection);
    await dataSource.findOneById('foo');
    await dataSource.findOneById('foo');
    await dataSource.findOneById('foo');
    expect(collection.find).toHaveBeenCalledTimes(1);
    expect(collection.find).toHaveBeenCalledWith({ _id: { $in: ['foo'] } });
  });

  test('Debounces duplicate, parallelized ID lookups.', async () => {
    type Document = { _id: string };
    const collection = db.collection<Document>('test');
    jest.spyOn(collection, 'find');

    await collection.insertOne({ _id: 'foo' });

    const dataSource = createDataSource(collection);
    await Promise.all([
      dataSource.findOneById('foo'),
      dataSource.findOneById('bar'),
      dataSource.findOneById('foo'),
    ]);
    expect(collection.find).toHaveBeenCalledTimes(1);
    expect(collection.find).toHaveBeenCalledWith({
      _id: { $in: ['foo', 'bar'] },
    });
  });

  test('Debounces against in-flight requests.', async () => {
    // This test ensures that in scenarios where the cache isn't populated with
    // data yet, but we have a request in-flight for an ID, subsequent fetches
    // of that ID defer to the in-flight request instead of creating duplicate
    // requests.

    type Document = { _id: string };
    const collection = db.collection<Document>('test');

    const DOCUMENT: Document = { _id: 'foo' };
    await collection.insertOne({ _id: 'foo' });

    /// We send a request for `_id: "foo"` and intentionally leave it
    /// unresolved until `resolveFirstFind` is called.

    let resolveFirstFind: (result: Array<Document>) => void;
    jest.spyOn(collection, 'find').mockImplementationOnce(() => {
      return {
        toArray: () =>
          new Promise<Array<Document>>((resolve) => {
            resolveFirstFind = resolve;
          }),
      } as mongodb.FindCursor<Document>;
    });

    const dataSource = createDataSource(collection);

    const firstFind = dataSource.findOneById('foo');
    await collections.duration.sleep({ seconds: 0.25 });

    /// After waiting a little bit (to ensure the async event loop has had time
    /// to issue the first request), we issue a second duplicate find.

    const secondFind = dataSource.findOneById('foo');
    await collections.duration.sleep({ seconds: 0.25 });

    /// Once both finds are in-flight we resolve the first.

    // TypeScript refuses to recognize that `resolveFirstFind` may have been
    // initialized, so we force it.
    //
    // @ts-ignore
    resolveFirstFind([DOCUMENT]);

    expect(await Promise.all([firstFind, secondFind])).toStrictEqual([
      status.fromValue(DOCUMENT),
      status.fromValue(DOCUMENT),
    ]);

    /// Finally we ensure that despite having used two finds, we only
    /// communicated with the database once.

    expect(collection.find).toHaveBeenCalledTimes(1);
  });
});

describe('findManyByIds', () => {
  test('Returns documents in the same order as the given ids.', async () => {
    type Document = { _id: string; value: number };
    const collection = db.collection<Document>('test');
    jest.spyOn(collection, 'find');

    const DOCUMENT_FOO = {
      _id: 'foo',
      value: 100,
    };
    const DOCUMENT_BAR = {
      _id: 'bar',
      value: 200,
    };
    const DOCUMENT_BAZ = {
      _id: 'baz',
      value: 300,
    };

    await collection.insertMany([DOCUMENT_FOO, DOCUMENT_BAR, DOCUMENT_BAZ]);

    const dataSource = createDataSource(collection);
    const results = await dataSource.findManyByIds([
      'baz',
      'foo',
      'qux',
      'bar',
    ]);

    expect(results).toStrictEqual([
      status.fromValue(DOCUMENT_BAZ),
      status.fromValue(DOCUMENT_FOO),
      status.fromValue(null),
      status.fromValue(DOCUMENT_BAR),
    ]);
  });

  test('Issues a single network request.', async () => {
    type Document = { _id: string; value: number };
    const collection = db.collection<Document>('test');
    jest.spyOn(collection, 'find');

    await collection.insertMany([
      {
        _id: 'foo',
        value: 100,
      },
      {
        _id: 'baz',
        value: 300,
      },
    ]);

    const dataSource = createDataSource(collection);
    await dataSource.findManyByIds(['baz', 'foo', 'bar']);

    expect(collection.find).toHaveBeenCalledTimes(1);
  });
});
