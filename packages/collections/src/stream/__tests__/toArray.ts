import * as status from '@gptmmo/status';
import * as webStream from 'web-streams-polyfill';

import * as toArray from '@/stream/toArray';

describe('toArray', () => {
  it('Returns empty array for an empty stream.', async () => {
    const stream = new webStream.ReadableStream({
      start(controller) {
        controller.close();
      },
    });

    expect(status.throwIfError(await toArray.toArray(stream))).toStrictEqual(
      [],
    );
  });

  it('Collects all values from a non-error state stream.', async () => {
    const stream = new webStream.ReadableStream({
      start(controller) {
        controller.enqueue(100);
        controller.enqueue(200);
        controller.enqueue(300);
        controller.close();
      },
    });

    expect(status.throwIfError(await toArray.toArray(stream))).toStrictEqual([
      100, 200, 300,
    ]);
  });

  it('Returns an error when the stream errors.', async () => {
    const stream = new webStream.ReadableStream({
      start(controller) {
        controller.enqueue(100);
        controller.enqueue(200);
        controller.error(status.fromError('Expected error.'));
      },
    });

    expect(await toArray.toArray(stream)).toMatchObject({
      error: expect.any(String),
    });
  });
});
