import * as status from '@gptmmo/status';
import * as webStream from 'web-streams-polyfill';

import * as limit from '@/stream/limit';
import * as toArray from '@/stream/toArray';

describe('limit', () => {
  it('drains the entire stream when the limit is not met.', async () => {
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
        await toArray.toArray(limit.limit(stream, { maxChunks: 100 })),
      ),
    ).toStrictEqual([100, 200, 300]);
  });

  it('closes the upstream when the limit is enforced.', async () => {
    let i = 0;
    const onPull = jest.fn(() => ++i * 100);
    const onCancel = jest.fn();

    const stream = new webStream.ReadableStream(
      {
        pull(controller) {
          controller.enqueue(onPull());
        },
        cancel: onCancel,
      },
      new webStream.CountQueuingStrategy({ highWaterMark: 0 }),
    );

    expect(
      status.throwIfError(
        await toArray.toArray(limit.limit(stream, { maxChunks: 2 })),
      ),
    ).toStrictEqual([100, 200]);

    expect(onPull).toHaveBeenCalledTimes(2);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
