import '@shelf/jest-mongodb/lib/types';

import * as status from '@gptmmo/status';
import * as mongodb from 'mongodb';

import * as connection from '@/docdb/connection';

describe('connect', () => {
  test('Returns a valid client when connection succeeds.', async () => {
    const client = status.throwIfError(
      await connection.connect({
        url: global.__MONGO_URI__,
      }),
    );
    expect(client).toStrictEqual(expect.any(mongodb.MongoClient));
    await client.close();
  });

  test('Returns an error when connection fails.', async () => {
    const maybeClient = await connection.connect({ url: 'invalid_url' });
    expect(maybeClient).toMatchObject({
      error: expect.stringContaining('Failed to connect mongo client'),
    });
  });
});
