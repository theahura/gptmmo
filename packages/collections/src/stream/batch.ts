import * as webStream from 'web-streams-polyfill';

export type BatchOptions = {
  maxBatchSize: number;
};

/**
 * Groups chunks of readable stream into batches of a specified size. It creates
 * batches by collecting chunks sequentially until reaching the maximum batch
 * size.
 *
 * @param stream - The stream to be batched.
 * @param options - Batching options.
 *
 * @returns A stream where each chunk is an array representing a batch of the
 *   original chunks.
 */
export const batch = <T>(
  stream: webStream.ReadableStream<T>,
  options: BatchOptions,
): webStream.ReadableStream<Array<T>> =>
  stream.pipeThrough(createBatchTransform<T>(options));

export const createBatchTransform = <T>(
  options: BatchOptions,
): webStream.TransformStream<T, Array<T>> => {
  let buffer: Array<T> = [];

  return new webStream.TransformStream<T, Array<T>>({
    transform(chunk, controller) {
      buffer.push(chunk);
      if (buffer.length >= options.maxBatchSize) {
        controller.enqueue(buffer);
        buffer = [];
      }
    },

    flush(controller) {
      if (buffer.length > 0) {
        controller.enqueue(buffer);
        buffer = [];
      }
    },
  });
};
