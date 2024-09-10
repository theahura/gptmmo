import * as status from '@gptmmo/status';
import * as webStream from 'web-streams-polyfill';

import * as concatenate from '@/stream/concatenate';
import * as toArray from '@/stream/toArray';

describe('concatenate', () => {
  it('Returns empty array for no streams.', async () => {
    expect(
      status.throwIfError(await toArray.toArray(concatenate.concatenate([]))),
    ).toStrictEqual([]);
  });

  it('Returns empty array for an empty stream.', async () => {
    const stream = new webStream.ReadableStream({
      start(controller) {
        controller.close();
      },
    });

    expect(
      status.throwIfError(
        await toArray.toArray(concatenate.concatenate([stream])),
      ),
    ).toStrictEqual([]);
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

    expect(
      status.throwIfError(
        await toArray.toArray(concatenate.concatenate([stream])),
      ),
    ).toStrictEqual([100, 200, 300]);
  });

  it('Collects all values from two non-error state streams.', async () => {
    const firstStream = new webStream.ReadableStream({
      start(controller) {
        controller.enqueue(100);
        controller.enqueue(200);
        controller.enqueue(300);
        controller.close();
      },
    });

    const secondStream = new webStream.ReadableStream({
      start(controller) {
        controller.enqueue(400);
        controller.enqueue(500);
        controller.enqueue(600);
        controller.close();
      },
    });

    expect(
      status.throwIfError(
        await toArray.toArray(
          concatenate.concatenate([firstStream, secondStream]),
        ),
      ),
    ).toStrictEqual([100, 200, 300, 400, 500, 600]);
  });

  it('Returns an error when the stream errors.', async () => {
    const stream = new webStream.ReadableStream({
      start(controller) {
        controller.enqueue(100);
        controller.enqueue(200);
        controller.error(status.fromError('Expected error.'));
      },
    });

    expect(
      await toArray.toArray(concatenate.concatenate([stream])),
    ).toMatchObject({
      error: expect.any(String),
    });
  });
});
