import * as webStream from 'web-streams-polyfill';

export type LimitOptions = {
  maxChunks: number;
};

/**
 * Limits the number of chunks which can be read from a stream.
 *
 * @param stream - The stream to be limited.
 * @param options - Limit options.
 *
 * @returns A stream which will return at most the configured number of chunks.
 */
export const limit = <T>(
  stream: webStream.ReadableStream<T>,
  options: LimitOptions,
): webStream.ReadableStream<T> =>
  stream.pipeThrough(createLimitTransform<T>(options));

export const createLimitTransform = <T>(
  options: LimitOptions,
): webStream.TransformStream<T, T> => {
  let observedChunks = 0;

  return new webStream.TransformStream<T, T>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      if (++observedChunks >= options.maxChunks) {
        controller.terminate();
      }
    },
  });
};
